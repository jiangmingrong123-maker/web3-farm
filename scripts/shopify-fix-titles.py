#!/usr/bin/env python3
"""
Remove " – CNY XXXX" from Shopify product titles (customer-facing cleanup).

Matches products to 合集 folders (same logic as shopify-sync-products.py)
and sets title to the clean format without CNY suffix. Price stays in variant.

Usage:
  python scripts/shopify-fix-titles.py "path/to/合集" --dry-run
  python scripts/shopify-fix-titles.py "path/to/合集"

Env: SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import re
import sys
import time
from pathlib import Path

from shopify_auth import get_access_token

_gen = Path(__file__).resolve().parent / "generate-shopify-products-csv.py"
_spec = importlib.util.spec_from_file_location("shopify_gen", _gen)
shopify_gen = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(shopify_gen)
parse_folder = shopify_gen.parse_folder

_sync = Path(__file__).resolve().parent / "shopify-sync-products.py"
_sync_spec = importlib.util.spec_from_file_location("shopify_sync", _sync)
shopify_sync = importlib.util.module_from_spec(_sync_spec)
assert _sync_spec.loader
_sync_spec.loader.exec_module(shopify_sync)

fetch_products = shopify_sync.fetch_products
find_best = shopify_sync.find_best
should_skip_folder = shopify_sync.should_skip_folder
api_request = shopify_sync.api_request
DELAY = shopify_sync.DELAY

CNY_SUFFIX_RE = re.compile(r"\s*–\s*CNY\s+\d+\s*$")


def strip_cny_suffix(title: str) -> str:
    return CNY_SUFFIX_RE.sub("", title).strip()


def update_title_only(store: str, token: str, product_id: str, title: str) -> None:
    api_request(
        store,
        token,
        "PUT",
        f"/products/{product_id}.json",
        {"product": {"id": int(product_id), "title": title}},
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Fix Shopify titles (remove CNY suffix)")
    parser.add_argument("root", type=Path, help="Path to 合集")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument(
        "--strip-all",
        action="store_true",
        help="Also fix unmatched products by stripping CNY suffix only",
    )
    args = parser.parse_args()

    if not args.root.is_dir():
        print(f"Not a directory: {args.root}", file=sys.stderr)
        return 1

    store = os.environ.get("SHOPIFY_STORE", "zhang-hongming-zisha-studio").strip()
    token = get_access_token(store)
    products = fetch_products(store, token)
    print(f"Loaded {len(products)} Shopify products")

    claimed: set[str] = set()
    updated = 0
    skipped = 0
    failed = 0
    n = 0

    for folder in sorted(p for p in args.root.iterdir() if p.is_dir()):
        name = folder.name
        if should_skip_folder(name):
            print(f"SKIP {name}")
            skipped += 1
            continue
        row = parse_folder(name)
        if not row:
            print(f"BAD  {name}", file=sys.stderr)
            failed += 1
            continue

        n += 1
        if args.limit and n > args.limit:
            break

        match = find_best(products, row, claimed)
        if not match:
            print(f"NOT FOUND {name} -> {row['Title']}", file=sys.stderr)
            failed += 1
            continue

        claimed.add(match["id"])
        new_title = row["Title"]
        old_title = match["title"]
        if old_title == new_title:
            skipped += 1
            continue

        label = new_title[:65]
        try:
            if args.dry_run:
                print(f"would update: {old_title[:50]}... -> {label}")
            else:
                update_title_only(store, token, match["id"], new_title)
                print(f"updated: {label}")
            updated += 1
            time.sleep(DELAY)
        except Exception as exc:
            print(f"FAILED {name}: {exc}", file=sys.stderr)
            failed += 1

    if args.strip_all:
        for p in products:
            if p["id"] in claimed:
                continue
            old = p["title"]
            new = strip_cny_suffix(old)
            if new == old:
                continue
            try:
                if args.dry_run:
                    print(f"would strip: {old[:55]}... -> {new[:55]}...")
                else:
                    update_title_only(store, token, p["id"], new)
                    print(f"stripped: {new[:65]}")
                updated += 1
                time.sleep(DELAY)
            except Exception as exc:
                print(f"FAILED strip {p['handle']}: {exc}", file=sys.stderr)
                failed += 1

    print(f"\nDone. updated={updated} skipped={skipped} failed={failed} dry_run={args.dry_run}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
