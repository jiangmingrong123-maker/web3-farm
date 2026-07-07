#!/usr/bin/env python3
"""
Attach local images to existing Shopify products (matched by handle).

Use this after CSV import. Each subfolder in 合集 is parsed to a product
handle (same logic as generate-shopify-products-csv.py).

Prereqs (one-time, 2026 Dev Dashboard flow):
  Store admin → Settings → Apps → App development
  → Build an app in the development control panel
  Create app → set scopes read_products, write_products → install on store
  Copy Client ID and Client secret from app Settings

Env (pick one):
  # Legacy custom app (if you still have shpat_ token):
  SHOPIFY_ADMIN_TOKEN=shpat_...

  # Dev Dashboard app (2026+):
  SHOPIFY_CLIENT_ID=...
  SHOPIFY_CLIENT_SECRET=...

Usage:
  python scripts/shopify-bulk-upload-images.py "path/to/合集" --dry-run
  python scripts/shopify-bulk-upload-images.py "path/to/合集"
  python scripts/shopify-bulk-upload-images.py "path/to/合集" --limit 5
  python scripts/shopify-bulk-upload-images.py "path/to/合集" --force
  python scripts/shopify-bulk-upload-images.py "path/to/合集" --only "莲子" "雪华壶"
  python scripts/shopify-bulk-upload-images.py "path/to/合集" --missing-four --create-if-missing
"""

from __future__ import annotations

import argparse
import base64
import importlib.util
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from shopify_auth import get_access_token

_gen_path = Path(__file__).resolve().parent / "generate-shopify-products-csv.py"
_spec = importlib.util.spec_from_file_location("shopify_gen", _gen_path)
shopify_gen = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(shopify_gen)
parse_folder = shopify_gen.parse_folder
SKIP_HANDLES = shopify_gen.SKIP_HANDLES

MISSING_FOUR_FOLDERS = (
    "1200莲子 老紫泥 230毫升 杨俊英",
    "1200莲子 降坡泥 230毫升 精工半手 杨俊英",
    "19800雪华壶 天青泥 290毫升 全手 张洪明",
    "19800雪华壶 老青段 290毫升 全手 张洪明",
)
API_VERSION = "2024-10"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
REQUEST_DELAY_SEC = 0.55


def api_request(
    store: str,
    token: str,
    method: str,
    path: str,
    payload: dict | None = None,
) -> tuple[dict, dict[str, str]]:
    url = f"https://{store}.myshopify.com/admin/api/{API_VERSION}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
        },
        method=method,
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read().decode()
        body = json.loads(raw) if raw else {}
        headers = {k: v for k, v in resp.headers.items()}
    return body, headers


def parse_next_link(link_header: str) -> str | None:
    if not link_header:
        return None
    for part in link_header.split(","):
        if 'rel="next"' in part:
            m = re.search(r"<([^>]+)>", part)
            return m.group(1) if m else None
    return None


def fetch_products_index(store: str, token: str) -> tuple[dict[str, dict], dict[str, dict]]:
    """handle -> product, normalized_title -> product"""
    by_handle: dict[str, dict] = {}
    by_title: dict[str, dict] = {}
    path = "/products.json?limit=250&fields=id,handle,title,images"
    while path:
        body, headers = api_request(store, token, "GET", path)
        for product in body.get("products", []):
            images = product.get("images") or []
            entry = {
                "id": str(product["id"]),
                "handle": product["handle"],
                "title": product.get("title", ""),
                "image_count": len(images),
            }
            by_handle[product["handle"]] = entry
            title_key = normalize_title(entry["title"])
            if title_key:
                by_title[title_key] = entry
        next_url = parse_next_link(headers.get("Link", ""))
        if next_url:
            prefix = f"https://{store}.myshopify.com/admin/api/{API_VERSION}"
            path = next_url.replace(prefix, "")
        else:
            path = ""
        time.sleep(REQUEST_DELAY_SEC)
    return by_handle, by_title


def normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", title.strip().lower())


def find_product(
    by_handle: dict[str, dict],
    by_title: dict[str, dict],
    handle: str,
    title: str,
) -> tuple[dict | None, str]:
    product = by_handle.get(handle)
    if product:
        return product, "handle"
    product = by_title.get(normalize_title(title))
    if product:
        return product, f"title:{product['handle']}"
    return None, ""


def create_shopify_product(store: str, token: str, row: dict) -> dict:
    payload = {
        "product": {
            "title": row["Title"],
            "body_html": row["Body (HTML)"],
            "vendor": row["Vendor"],
            "product_type": row["Type"],
            "tags": row["Tags"],
            "status": "active",
            "handle": row["Handle"],
            "variants": [
                {
                    "price": row["Variant Price"],
                    "grams": int(row["Variant Grams"]),
                    "inventory_management": "shopify",
                    "inventory_policy": "deny",
                    "requires_shipping": True,
                    "taxable": True,
                }
            ],
        }
    }
    body, _ = api_request(store, token, "POST", "/products.json", payload)
    product = body.get("product")
    if not product:
        raise RuntimeError(f"create product failed: {body}")
    return {
        "id": str(product["id"]),
        "handle": product["handle"],
        "title": product.get("title", row["Title"]),
        "image_count": 0,
    }


def upload_image(
    store: str, token: str, product_id: str, image_path: Path, position: int
) -> None:
    body, _ = api_request(
        store,
        token,
        "POST",
        f"/products/{product_id}/images.json",
        {
            "image": {
                "attachment": base64.b64encode(image_path.read_bytes()).decode(),
                "filename": image_path.name,
                "position": position,
            }
        },
    )
    if "image" not in body:
        raise RuntimeError(f"upload failed for {image_path.name}: {body}")


def image_files(folder: Path) -> list[Path]:
    return sorted(
        p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )


def should_skip_folder(folder_name: str) -> bool:
    if "掇球" in folder_name and "张洪明" in folder_name:
        return True
    row = parse_folder(folder_name)
    return bool(row and row["Handle"] in SKIP_HANDLES)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Upload 合集 folder images to existing Shopify products"
    )
    parser.add_argument("root", type=Path, help="Path to 合集 folder")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List matches only; do not upload",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max folders to process (0 = all)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Upload even if product already has images",
    )
    parser.add_argument(
        "--only",
        nargs="*",
        metavar="KEYWORD",
        help="Only folders whose name contains any keyword (e.g. 莲子 雪华壶)",
    )
    parser.add_argument(
        "--folders",
        nargs="*",
        metavar="NAME",
        help="Only these exact folder names",
    )
    parser.add_argument(
        "--missing-four",
        action="store_true",
        help="Process the 4 folders that failed CSV import (莲子 x2, 雪华壶 x2)",
    )
    parser.add_argument(
        "--create-if-missing",
        action="store_true",
        help="Create Shopify product when not found, then upload images",
    )
    args = parser.parse_args()

    if args.missing_four:
        args.folders = list(MISSING_FOUR_FOLDERS)

    if not args.root.is_dir():
        print(f"Not a directory: {args.root}", file=sys.stderr)
        sys.exit(1)

    store = os.environ.get("SHOPIFY_STORE", "zhang-hongming-zisha-studio")
    token = ""
    if not args.dry_run:
        try:
            token = get_access_token(store)
        except RuntimeError as exc:
            print(str(exc), file=sys.stderr)
            sys.exit(1)

    print(f"Store: {store}.myshopify.com")
    by_handle: dict[str, dict] = {}
    by_title: dict[str, dict] = {}
    if not args.dry_run:
        by_handle, by_title = fetch_products_index(store, token)
        print(f"Loaded {len(by_handle)} products from Shopify")

    folders = sorted(p for p in args.root.iterdir() if p.is_dir())
    stats = {
        "uploaded": 0,
        "skipped_has_images": 0,
        "skipped_no_images": 0,
        "skipped_listed": 0,
        "skipped_bad_name": 0,
        "created": 0,
        "not_found": 0,
        "errors": 0,
    }
    not_found: list[str] = []
    processed = 0

    for folder in folders:
        if args.limit and processed >= args.limit:
            break

        name = folder.name
        if args.folders and name not in args.folders:
            continue
        if args.only and not any(k in name for k in args.only):
            continue
        if should_skip_folder(name):
            print(f"skip (manual listing): {name}")
            stats["skipped_listed"] += 1
            continue

        row = parse_folder(name)
        if not row:
            print(f"skip (bad folder name): {name}", file=sys.stderr)
            stats["skipped_bad_name"] += 1
            continue

        handle = row["Handle"]
        imgs = image_files(folder)
        if not imgs:
            print(f"skip (no images in folder): {name}")
            stats["skipped_no_images"] += 1
            continue

        if args.dry_run:
            note = " (would create)" if args.create_if_missing else ""
            print(
                f"[dry-run] {name} -> {handle} | {row['Title']}{note} "
                f"({len(imgs)} images)"
            )
            processed += 1
            continue

        product, matched_via = find_product(by_handle, by_title, handle, row["Title"])
        if not product and args.create_if_missing:
            try:
                print(f"creating product: {row['Title']}")
                product = create_shopify_product(store, token, row)
                by_handle[product["handle"]] = product
                by_title[normalize_title(product["title"])] = product
                stats["created"] += 1
                matched_via = "created"
            except (urllib.error.HTTPError, RuntimeError) as exc:
                detail = (
                    exc.read().decode()
                    if isinstance(exc, urllib.error.HTTPError)
                    else str(exc)
                )
                print(f"  CREATE ERROR: {detail}", file=sys.stderr)
                stats["errors"] += 1
                continue

        if not product:
            print(
                f"NOT FOUND in Shopify: {handle} | {row['Title']}  ({name})",
                file=sys.stderr,
            )
            not_found.append(f"{name} -> {handle} | {row['Title']}")
            stats["not_found"] += 1
            continue

        if matched_via != "handle":
            print(f"matched by {matched_via} for {name}")

        if product["image_count"] > 0 and not args.force:
            print(f"skip (already has images): {product['handle']}")
            stats["skipped_has_images"] += 1
            continue

        product_id = product["id"]
        start_pos = product["image_count"] + 1
        print(f"uploading {name} -> {product['handle']} ({len(imgs)} images)")
        try:
            for i, img in enumerate(imgs):
                upload_image(store, token, product_id, img, start_pos + i)
                print(f"  + {img.name}")
                time.sleep(REQUEST_DELAY_SEC)
            stats["uploaded"] += 1
            processed += 1
        except (urllib.error.HTTPError, RuntimeError) as exc:
            detail = exc.read().decode() if isinstance(exc, urllib.error.HTTPError) else str(exc)
            print(f"  ERROR: {detail}", file=sys.stderr)
            stats["errors"] += 1

    print("\n--- summary ---")
    for key, value in stats.items():
        print(f"{key}: {value}")
    if not_found:
        print("\nHandles not found in Shopify (check CSV import handles):")
        for line in not_found[:20]:
            print(f"  {line}")
        if len(not_found) > 20:
            print(f"  ... and {len(not_found) - 20} more")


if __name__ == "__main__":
    main()
