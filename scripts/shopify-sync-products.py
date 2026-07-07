#!/usr/bin/env python3
"""
Sync Shopify products from 合集 folders: unique titles, prices, and images.

Fixes CSV handle-collision fallout by matching vendor + price + pot + capacity,
then updating title/body/price/handle and replacing images from each folder.

Usage:
  python scripts/shopify-sync-products.py "path/to/合集" --dry-run
  python scripts/shopify-sync-products.py "path/to/合集"
  python scripts/shopify-sync-products.py "path/to/合集" --limit 5

Env: SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN
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
from pathlib import Path

from shopify_auth import get_access_token

_gen = Path(__file__).resolve().parent / "generate-shopify-products-csv.py"
_spec = importlib.util.spec_from_file_location("shopify_gen", _gen)
shopify_gen = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(shopify_gen)
parse_folder = shopify_gen.parse_folder

_up = Path(__file__).resolve().parent / "shopify-bulk-upload-images.py"
_up_spec = importlib.util.spec_from_file_location("shopify_up", _up)
shopify_up = importlib.util.module_from_spec(_up_spec)
assert _up_spec.loader
_up_spec.loader.exec_module(shopify_up)

api_request = shopify_up.api_request
parse_next_link = shopify_up.parse_next_link
should_skip_folder = shopify_up.should_skip_folder
image_files = shopify_up.image_files
create_shopify_product = shopify_up.create_shopify_product
normalize_title = shopify_up.normalize_title
API_VERSION = shopify_up.API_VERSION
DELAY = shopify_up.REQUEST_DELAY_SEC


def fetch_products(store: str, token: str) -> list[dict]:
    products: list[dict] = []
    path = "/products.json?limit=250&fields=id,handle,title,vendor,images,variants"
    while path:
        body, headers = api_request(store, token, "GET", path)
        for p in body.get("products", []):
            v = (p.get("variants") or [{}])[0]
            imgs = p.get("images") or []
            products.append(
                {
                    "id": str(p["id"]),
                    "variant_id": str(v.get("id", "")),
                    "handle": p["handle"],
                    "title": p.get("title", ""),
                    "vendor": p.get("vendor", ""),
                    "price": v.get("price", ""),
                    "image_ids": [str(i["id"]) for i in imgs],
                    "image_count": len(imgs),
                }
            )
        nxt = parse_next_link(headers.get("Link", ""))
        if nxt:
            prefix = f"https://{store}.myshopify.com/admin/api/{API_VERSION}"
            path = nxt.replace(prefix, "")
        else:
            path = ""
        time.sleep(DELAY)
    return products


def price_equal(a: str, b: str) -> bool:
    try:
        return float(a) == float(b)
    except (TypeError, ValueError):
        return str(a) == str(b)


def pot_name_from_row(row: dict) -> str:
    m = re.search(r"– ([^–]+) –", row["Title"])
    return m.group(1).strip() if m else ""


def capacity_from_row(row: dict) -> str:
    m = re.search(r"(\d+ml)", row["Title"])
    return m.group(1) if m else ""


def clay_capacity_from_row(row: dict) -> str:
    parts = [p.strip() for p in row["Title"].split("–")]
    return parts[2] if len(parts) >= 3 else ""


def find_best(
    products: list[dict], row: dict, claimed: set[str]
) -> dict | None:
    pot = pot_name_from_row(row)
    cap = capacity_from_row(row)
    clay_cap = clay_capacity_from_row(row)
    vendor = row["Vendor"]
    price = row["Variant Price"]
    want_title = normalize_title(row["Title"])

    for p in products:
        if p["id"] in claimed:
            continue
        if normalize_title(p["title"]) == want_title:
            return p

    scored: list[tuple[int, dict]] = []
    for p in products:
        if p["id"] in claimed:
            continue
        if p["vendor"] != vendor:
            continue
        if not price_equal(p["price"], price):
            continue
        if clay_cap and clay_cap not in p["title"]:
            continue
        score = 10
        if pot and pot in p["title"]:
            score += 5
        if cap and cap in p["title"]:
            score += 3
        scored.append((score, p))

    if not scored:
        return None
    scored.sort(key=lambda x: -x[0])
    return scored[0][1]


def update_product(store: str, token: str, product: dict, row: dict) -> None:
    payload = {
        "product": {
            "id": int(product["id"]),
            "title": row["Title"],
            "body_html": row["Body (HTML)"],
            "vendor": row["Vendor"],
            "product_type": row["Type"],
            "tags": row["Tags"],
            "handle": row["Handle"],
            "variants": [
                {
                    "id": int(product["variant_id"]),
                    "price": row["Variant Price"],
                    "grams": int(row["Variant Grams"]),
                }
            ],
        }
    }
    api_request(store, token, "PUT", f"/products/{product['id']}.json", payload)


def delete_images(store: str, token: str, product: dict) -> None:
    for img_id in product["image_ids"]:
        api_request(store, token, "DELETE", f"/products/{product['id']}/images/{img_id}.json")
        time.sleep(DELAY)


def upload_images(store: str, token: str, product_id: str, folder: Path) -> int:
    imgs = image_files(folder)
    for i, img in enumerate(imgs, 1):
        api_request(
            store,
            token,
            "POST",
            f"/products/{product_id}/images.json",
            {
                "image": {
                    "attachment": base64.b64encode(img.read_bytes()).decode(),
                    "filename": img.name,
                    "position": i,
                }
            },
        )
        time.sleep(DELAY)
    return len(imgs)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync Shopify products from 合集")
    parser.add_argument("root", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--skip-images", action="store_true")
    args = parser.parse_args()

    store = os.environ.get("SHOPIFY_STORE", "zhang-hongming-zisha-studio")
    token = get_access_token(store)

    products = fetch_products(store, token)
    print(f"Loaded {len(products)} Shopify products")

    claimed: set[str] = set()
    stats = {"synced": 0, "created": 0, "images": 0, "skipped": 0, "failed": 0}
    n = 0

    for folder in sorted(p for p in args.root.iterdir() if p.is_dir()):
        name = folder.name
        if should_skip_folder(name):
            stats["skipped"] += 1
            continue
        row = parse_folder(name)
        if not row:
            stats["skipped"] += 1
            continue
        if args.limit and n >= args.limit:
            break

        match = find_best(products, row, claimed)
        imgs = len(image_files(folder))

        if args.dry_run:
            action = "create" if not match else "update"
            print(f"[dry-run] {action}: {name}")
            print(f"          -> {row['Title']}")
            if match:
                print(f"          match: {match['handle']} ({match['title'][:60]})")
                claimed.add(match["id"])
            n += 1
            continue

        try:
            if not match:
                print(f"CREATE {name}")
                created = create_shopify_product(store, token, row)
                pid = created["id"]
                stats["created"] += 1
                claimed.add(pid)
            else:
                print(f"SYNC {name} -> {match['handle']}")
                update_product(store, token, match, row)
                pid = match["id"]
                claimed.add(pid)
                stats["synced"] += 1

            if not args.skip_images and imgs:
                prod = match or {"id": pid, "image_ids": []}
                if match and match.get("image_ids"):
                    delete_images(store, token, match)
                uploaded = upload_images(store, token, pid, folder)
                stats["images"] += uploaded
                print(f"  images: {uploaded}")

            n += 1
        except (urllib.error.HTTPError, RuntimeError) as exc:
            detail = exc.read().decode() if isinstance(exc, urllib.error.HTTPError) else str(exc)
            print(f"  ERROR: {detail}", file=sys.stderr)
            stats["failed"] += 1

    print("\n--- summary ---")
    for k, v in stats.items():
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()
