#!/usr/bin/env python3
"""
Delete Shopify products listed as ORPHAN in an audit-report CSV.

Usage:
  python scripts/shopify-delete-orphans.py audit-report-new.csv --dry-run
  python scripts/shopify-delete-orphans.py audit-report-new.csv

Env: SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN
App scope: write_products
"""

from __future__ import annotations

import argparse
import csv
import importlib.util
import os
import sys
import time
from pathlib import Path

from shopify_auth import get_access_token

_up = Path(__file__).resolve().parent / "shopify-bulk-upload-images.py"
_spec = importlib.util.spec_from_file_location("shopify_up", _up)
shopify_up = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(shopify_up)

api_request = shopify_up.api_request
DELAY = shopify_up.REQUEST_DELAY_SEC


def load_orphans(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            if row.get("status", "").strip().upper() == "ORPHAN":
                handle = row.get("shopify_handle", "").strip()
                title = row.get("shopify_title", "").strip()
                if handle:
                    rows.append({"handle": handle, "title": title})
    return rows


def product_id_by_handle(store: str, token: str, handle: str) -> str | None:
    body, _ = api_request(
        store,
        token,
        "GET",
        f"/products.json?handle={handle}&fields=id,title,handle",
    )
    products = body.get("products") or []
    if not products:
        return None
    return str(products[0]["id"])


def delete_product(store: str, token: str, product_id: str) -> None:
    api_request(store, token, "DELETE", f"/products/{product_id}.json")


def main() -> int:
    parser = argparse.ArgumentParser(description="Delete ORPHAN products from audit CSV")
    parser.add_argument("report", type=Path, help="audit-report CSV from shopify-audit-products.py")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    args = parser.parse_args()

    if not args.report.is_file():
        print(f"File not found: {args.report}", file=sys.stderr)
        return 1

    orphans = load_orphans(args.report)
    if not orphans:
        print("No ORPHAN rows in report.")
        return 0

    store = os.environ.get("SHOPIFY_STORE", "zhang-hongming-zisha-studio").strip()
    token = get_access_token(store)

    print(f"Store: {store}")
    print(f"ORPHAN products to delete: {len(orphans)}")
    if args.dry_run:
        print("DRY RUN — no deletions\n")

    deleted = 0
    failed = 0

    for i, item in enumerate(orphans, 1):
        handle = item["handle"]
        title = item["title"][:70]
        try:
            pid = product_id_by_handle(store, token, handle)
            if not pid:
                print(f"[{i}/{len(orphans)}] NOT FOUND {handle} ({title})", file=sys.stderr)
                failed += 1
                continue
            if args.dry_run:
                print(f"[{i}/{len(orphans)}] would delete {handle} | {title}")
            else:
                delete_product(store, token, pid)
                print(f"[{i}/{len(orphans)}] deleted {handle} | {title}")
            deleted += 1
            time.sleep(DELAY)
        except Exception as exc:
            print(f"[{i}/{len(orphans)}] FAILED {handle}: {exc}", file=sys.stderr)
            failed += 1

    print(f"\nDone. deleted={deleted} failed={failed} (dry_run={args.dry_run})")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
