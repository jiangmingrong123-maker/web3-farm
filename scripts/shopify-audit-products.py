#!/usr/bin/env python3
"""
Audit Shopify products against local 合集 folders.

Checks: missing products, duplicate handles, wrong/missing images, price/title drift.

Usage:
  python scripts/shopify-audit-products.py "path/to/合集" --out audit-report.csv
  python scripts/shopify-audit-products.py "path/to/合集"  # prints summary only

Env: SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN (or CLIENT_ID + CLIENT_SECRET)
"""

from __future__ import annotations

import argparse
import csv
import importlib.util
import sys
import time
from collections import defaultdict
from pathlib import Path

from shopify_auth import get_access_token

_gen_path = Path(__file__).resolve().parent / "generate-shopify-products-csv.py"
_spec = importlib.util.spec_from_file_location("shopify_gen", _gen_path)
shopify_gen = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(shopify_gen)
parse_folder = shopify_gen.parse_folder
SKIP_HANDLES = shopify_gen.SKIP_HANDLES

# Reuse API helpers from upload script
_upload_path = Path(__file__).resolve().parent / "shopify-bulk-upload-images.py"
_upload_spec = importlib.util.spec_from_file_location("shopify_upload", _upload_path)
shopify_upload = importlib.util.module_from_spec(_upload_spec)
assert _upload_spec.loader
_upload_spec.loader.exec_module(shopify_upload)

api_request = shopify_upload.api_request
normalize_title = shopify_upload.normalize_title
parse_next_link = shopify_upload.parse_next_link
find_product = shopify_upload.find_product
image_files = shopify_upload.image_files
should_skip_folder = shopify_upload.should_skip_folder

API_VERSION = getattr(shopify_upload, "API_VERSION", "2024-10")
REQUEST_DELAY = getattr(shopify_upload, "REQUEST_DELAY_SEC", 0.55)


def fetch_all_products(store: str, token: str) -> tuple[dict[str, dict], dict[str, dict], list[dict]]:
    by_handle: dict[str, dict] = {}
    by_title: dict[str, dict] = {}
    all_products: list[dict] = []
    path = "/products.json?limit=250&fields=id,handle,title,vendor,images,variants"
    while path:
        body, headers = api_request(store, token, "GET", path)
        for p in body.get("products", []):
            variant = (p.get("variants") or [{}])[0]
            entry = {
                "id": str(p["id"]),
                "handle": p["handle"],
                "title": p.get("title", ""),
                "vendor": p.get("vendor", ""),
                "image_count": len(p.get("images") or []),
                "price": variant.get("price", ""),
            }
            all_products.append(entry)
            by_handle[entry["handle"]] = entry
            key = normalize_title(entry["title"])
            if key:
                by_title[key] = entry
        next_url = parse_next_link(headers.get("Link", ""))
        if next_url:
            prefix = f"https://{store}.myshopify.com/admin/api/{API_VERSION}"
            path = next_url.replace(prefix, "")
        else:
            path = ""
        time.sleep(REQUEST_DELAY)
    return by_handle, by_title, all_products


def price_equal(shopify_price: str, expected: str) -> bool:
    try:
        return float(shopify_price) == float(expected)
    except (TypeError, ValueError):
        return str(shopify_price) == str(expected)


def audit(root: Path, store: str, token: str) -> list[dict]:
    by_handle, by_title, shopify_products = fetch_all_products(store, token)
    rows: list[dict] = []
    matched_shopify_handles: set[str] = set()

    handle_to_folders: dict[str, list[str]] = defaultdict(list)
    folders = sorted(p for p in root.iterdir() if p.is_dir())

    for folder in folders:
        name = folder.name
        if should_skip_folder(name):
            rows.append(
                {
                    "folder": name,
                    "status": "SKIP_MANUAL",
                    "issue": "manual listing (掇球等)",
                    "expected_title": "",
                    "shopify_title": "",
                    "expected_price_hkd": "",
                    "shopify_price_hkd": "",
                    "local_images": len(image_files(folder)),
                    "shopify_images": "",
                    "shopify_handle": "",
                    "match_via": "",
                }
            )
            continue

        row = parse_folder(name)
        if not row:
            rows.append(
                {
                    "folder": name,
                    "status": "BAD_FOLDER_NAME",
                    "issue": "cannot parse folder name",
                    "expected_title": "",
                    "shopify_title": "",
                    "expected_price_hkd": "",
                    "shopify_price_hkd": "",
                    "local_images": len(image_files(folder)),
                    "shopify_images": "",
                    "shopify_handle": "",
                    "match_via": "",
                }
            )
            continue

        handle = row["Handle"]
        handle_to_folders[handle].append(name)
        local_imgs = len(image_files(folder))
        product, via = find_product(by_handle, by_title, handle, row["Title"])

        if not product:
            rows.append(
                {
                    "folder": name,
                    "status": "MISSING",
                    "issue": "no matching Shopify product",
                    "expected_title": row["Title"],
                    "shopify_title": "",
                    "expected_price_hkd": row["Variant Price"],
                    "shopify_price_hkd": "",
                    "local_images": local_imgs,
                    "shopify_images": 0,
                    "shopify_handle": handle,
                    "match_via": "",
                }
            )
            continue

        matched_shopify_handles.add(product["handle"])
        issues: list[str] = []
        if normalize_title(product["title"]) != normalize_title(row["Title"]):
            issues.append("title mismatch")
        if str(product["price"]) != str(row["Variant Price"]):
            issues.append(
                f"price mismatch (shopify {product['price']} vs expected {row['Variant Price']})"
            )
        if product["image_count"] == 0 and local_imgs > 0:
            issues.append("no images on Shopify")
        if via != "handle":
            issues.append(f"matched by {via} not handle")

        status = "OK" if not issues else "WARN"
        rows.append(
            {
                "folder": name,
                "status": status,
                "issue": "; ".join(issues) if issues else "",
                "expected_title": row["Title"],
                "shopify_title": product["title"],
                "expected_price_hkd": row["Variant Price"],
                "shopify_price_hkd": product["price"],
                "local_images": local_imgs,
                "shopify_images": product["image_count"],
                "shopify_handle": product["handle"],
                "match_via": via,
            }
        )

    for handle, names in handle_to_folders.items():
        if len(names) > 1:
            for name in names:
                for r in rows:
                    if r["folder"] == name and r["status"] in ("OK", "WARN", "MISSING"):
                        dup = f"duplicate handle {handle} shared with {len(names)} folders"
                        r["status"] = "WARN"
                        r["issue"] = (
                            f"{r['issue']}; {dup}".strip("; ")
                            if r["issue"]
                            else dup
                        )

    folder_set = {f.name for f in folders}
    for p in shopify_products:
        if p["handle"] in matched_shopify_handles:
            continue
        if p["handle"] in SKIP_HANDLES:
            continue
        rows.append(
            {
                "folder": "",
                "status": "ORPHAN",
                "issue": "Shopify product has no 合集 folder match",
                "expected_title": "",
                "shopify_title": p["title"],
                "expected_price_hkd": "",
                "shopify_price_hkd": p["price"],
                "local_images": "",
                "shopify_images": p["image_count"],
                "shopify_handle": p["handle"],
                "match_via": "",
            }
        )

    return rows


def print_summary(rows: list[dict]) -> None:
    counts: dict[str, int] = defaultdict(int)
    for r in rows:
        counts[r["status"]] += 1

    print("\n=== Audit summary ===")
    for status in ("OK", "WARN", "MISSING", "ORPHAN", "SKIP_MANUAL", "BAD_FOLDER_NAME"):
        if counts[status]:
            print(f"  {status}: {counts[status]}")

    no_img = [
        r
        for r in rows
        if r["status"] in ("OK", "WARN", "MISSING")
        and r.get("shopify_images") == 0
        and r.get("local_images", 0) > 0
    ]
    if no_img:
        print(f"\n  Folders with local images but 0 on Shopify: {len(no_img)}")
        for r in no_img[:10]:
            print(f"    - {r['folder']}")
        if len(no_img) > 10:
            print(f"    ... +{len(no_img) - 10} more")

    warns = [r for r in rows if r["status"] == "WARN"]
    if warns:
        print(f"\n  Warnings (first 10):")
        for r in warns[:10]:
            print(f"    - {r['folder']}: {r['issue']}")

    missing = [r for r in rows if r["status"] == "MISSING"]
    if missing:
        print(f"\n  Missing products (first 10):")
        for r in missing[:10]:
            print(f"    - {r['folder']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit Shopify vs 合集 folders")
    parser.add_argument("root", type=Path, help="Path to 合集")
    parser.add_argument(
        "--out",
        "-o",
        type=Path,
        help="Write full CSV report (open in Excel)",
    )
    args = parser.parse_args()

    import os

    store = os.environ.get("SHOPIFY_STORE", "zhang-hongming-zisha-studio")
    try:
        token = get_access_token(store)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)

    if not args.root.is_dir():
        print(f"Not a directory: {args.root}", file=sys.stderr)
        sys.exit(1)

    print(f"Auditing {store}.myshopify.com vs {args.root}")
    rows = audit(args.root, store, token)
    print_summary(rows)

    if args.out:
        fieldnames = list(rows[0].keys()) if rows else []
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(rows)
        print(f"\nFull report: {args.out}")
        print("Open in Excel, filter status column for WARN / MISSING / ORPHAN")


if __name__ == "__main__":
    main()
