#!/usr/bin/env python3
"""
Set inventory quantity for all Shopify product variants (default: 1 each).

Enables inventory tracking and sets available quantity at the primary location.

Usage:
  python scripts/shopify-set-inventory.py --dry-run
  python scripts/shopify-set-inventory.py
  python scripts/shopify-set-inventory.py --quantity 1 --limit 5

Env: SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN (or CLIENT_ID + CLIENT_SECRET)
Optional: SHOPIFY_LOCATION_ID (if read_locations scope is missing)
App scopes: read_products, write_products, read_inventory, write_inventory, read_locations
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
import time
import urllib.error
from pathlib import Path

from shopify_auth import get_access_token

_up = Path(__file__).resolve().parent / "shopify-bulk-upload-images.py"
_spec = importlib.util.spec_from_file_location("shopify_up", _up)
shopify_up = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(shopify_up)

api_request = shopify_up.api_request
parse_next_link = shopify_up.parse_next_link
API_VERSION = shopify_up.API_VERSION
DELAY = shopify_up.REQUEST_DELAY_SEC


def graphql_request(store: str, token: str, query: str) -> dict:
    body, _ = api_request(
        store,
        token,
        "POST",
        "/graphql.json",
        {"query": query},
    )
    if body.get("errors"):
        raise RuntimeError(f"GraphQL errors: {body['errors']}")
    return body.get("data") or {}


def gid_to_id(gid: str) -> str:
    return gid.rsplit("/", 1)[-1]


def fetch_primary_location(store: str, token: str) -> dict:
    body, _ = api_request(store, token, "GET", "/locations.json")
    locations = body.get("locations") or []
    if not locations:
        raise RuntimeError("No locations found in store.")
    active = [loc for loc in locations if loc.get("active")]
    loc = active[0] if active else locations[0]
    return {"id": str(loc["id"]), "name": loc.get("name", "")}


def fetch_location_graphql(store: str, token: str) -> dict:
    data = graphql_request(store, token, "{ location { id name } }")
    loc = data.get("location") or {}
    gid = loc.get("id", "")
    if not gid:
        raise RuntimeError("GraphQL location query returned no location.")
    return {"id": gid_to_id(gid), "name": loc.get("name", "")}


def resolve_location(store: str, token: str, variants: list[dict]) -> dict:
    override = os.environ.get("SHOPIFY_LOCATION_ID", "").strip()
    if override:
        return {"id": override, "name": "(SHOPIFY_LOCATION_ID)"}

    try:
        return fetch_primary_location(store, token)
    except urllib.error.HTTPError as exc:
        if exc.code != 403:
            raise

    try:
        return fetch_location_graphql(store, token)
    except (urllib.error.HTTPError, RuntimeError):
        pass

    for v in variants[:20]:
        item_id = v["inventory_item_id"]
        try:
            body, _ = api_request(
                store,
                token,
                "GET",
                f"/inventory_levels.json?inventory_item_ids={item_id}",
            )
        except urllib.error.HTTPError as exc:
            if exc.code == 403:
                continue
            raise
        levels = body.get("inventory_levels") or []
        if levels:
            loc_id = str(levels[0]["location_id"])
            return {"id": loc_id, "name": "(from inventory_levels)"}

    raise RuntimeError(
        "403 Forbidden — app token is missing inventory/location scopes.\n"
        "1) Dev Dashboard → 版本 → scopes must include:\n"
        "   read_products,write_products,read_inventory,write_inventory,read_locations\n"
        "2) Publish the version, then 總覽 → 安裝 app → reinstall on your store.\n"
        "3) Re-run in a NEW PowerShell window with CLIENT_ID + CLIENT_SECRET set.\n"
        "Or set SHOPIFY_LOCATION_ID manually (Settings → Locations → ID in URL)."
    )


def fetch_variants(store: str, token: str) -> list[dict]:
    variants: list[dict] = []
    path = "/products.json?limit=250&fields=id,title,handle,variants"
    while path:
        body, headers = api_request(store, token, "GET", path)
        for product in body.get("products", []):
            for variant in product.get("variants") or []:
                inv_item_id = variant.get("inventory_item_id")
                if not inv_item_id:
                    continue
                variants.append(
                    {
                        "product_title": product.get("title", ""),
                        "handle": product.get("handle", ""),
                        "variant_id": str(variant["id"]),
                        "inventory_item_id": str(inv_item_id),
                        "sku": variant.get("sku") or "",
                        "tracked": variant.get("inventory_management") == "shopify",
                    }
                )
        nxt = parse_next_link(headers.get("Link", ""))
        if nxt:
            prefix = f"https://{store}.myshopify.com/admin/api/{API_VERSION}"
            path = nxt.replace(prefix, "")
        else:
            path = ""
        time.sleep(DELAY)
    return variants


def enable_tracking(store: str, token: str, variant_id: str) -> None:
    api_request(
        store,
        token,
        "PUT",
        f"/variants/{variant_id}.json",
        {
            "variant": {
                "id": int(variant_id),
                "inventory_management": "shopify",
                "inventory_policy": "deny",
            }
        },
    )


def connect_inventory(store: str, token: str, location_id: str, inventory_item_id: str) -> None:
    try:
        api_request(
            store,
            token,
            "POST",
            "/inventory_levels/connect.json",
            {
                "location_id": int(location_id),
                "inventory_item_id": int(inventory_item_id),
            },
        )
    except Exception:
        # Already connected at this location.
        pass


def set_available(
    store: str,
    token: str,
    location_id: str,
    inventory_item_id: str,
    quantity: int,
) -> int:
    body, _ = api_request(
        store,
        token,
        "POST",
        "/inventory_levels/set.json",
        {
            "location_id": int(location_id),
            "inventory_item_id": int(inventory_item_id),
            "available": quantity,
        },
    )
    level = body.get("inventory_level") or {}
    return int(level.get("available", quantity))


def main() -> int:
    parser = argparse.ArgumentParser(description="Set Shopify inventory for all variants.")
    parser.add_argument("--quantity", type=int, default=1, help="Available quantity (default: 1)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--limit", type=int, default=0, help="Process only first N variants")
    parser.add_argument("--location-id", default="", help="Shopify location ID (or SHOPIFY_LOCATION_ID)")
    args = parser.parse_args()

    if args.location_id:
        os.environ["SHOPIFY_LOCATION_ID"] = args.location_id.strip()

    store = os.environ.get("SHOPIFY_STORE", "zhang-hongming-zisha-studio").strip()

    legacy = os.environ.get("SHOPIFY_ADMIN_TOKEN", "").strip()
    has_client = bool(
        os.environ.get("SHOPIFY_CLIENT_ID", "").strip()
        and os.environ.get("SHOPIFY_CLIENT_SECRET", "").strip()
    )
    if legacy and has_client:
        print(
            "Note: SHOPIFY_ADMIN_TOKEN is set — using old token (may lack inventory scopes).\n"
            "Run: Remove-Item Env:SHOPIFY_ADMIN_TOKEN -ErrorAction SilentlyContinue\n"
            "Then use CLIENT_ID + CLIENT_SECRET only.\n",
            file=sys.stderr,
        )
    elif legacy:
        print("Auth: SHOPIFY_ADMIN_TOKEN (legacy)", file=sys.stderr)
    elif has_client:
        print("Auth: client_credentials (CLIENT_ID + CLIENT_SECRET)", file=sys.stderr)
    else:
        raise RuntimeError(
            "Set SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET, or SHOPIFY_ADMIN_TOKEN."
        )

    token = get_access_token(store)

    variants = fetch_variants(store, token)
    if args.limit:
        variants = variants[: args.limit]

    location = resolve_location(store, token, variants)

    print(f"Store: {store}")
    print(f"Location: {location['name']} ({location['id']})")
    print(f"Variants: {len(variants)}")
    print(f"Target quantity: {args.quantity}")
    if args.dry_run:
        print("DRY RUN — no changes will be made\n")

    updated = 0
    skipped = 0
    failed = 0

    for i, v in enumerate(variants, 1):
        label = v["product_title"][:60]
        try:
            if args.dry_run:
                print(f"[{i}/{len(variants)}] would set {label} -> {args.quantity}")
                updated += 1
                continue

            if not v["tracked"]:
                enable_tracking(store, token, v["variant_id"])
                time.sleep(DELAY)

            connect_inventory(store, token, location["id"], v["inventory_item_id"])
            time.sleep(DELAY)

            available = set_available(
                store,
                token,
                location["id"],
                v["inventory_item_id"],
                args.quantity,
            )
            print(f"[{i}/{len(variants)}] {label} -> {available}")
            updated += 1
            time.sleep(DELAY)
        except Exception as exc:
            print(f"[{i}/{len(variants)}] FAILED {label}: {exc}", file=sys.stderr)
            failed += 1

    print(
        f"\nDone. updated={updated} skipped={skipped} failed={failed} "
        f"(dry_run={args.dry_run})"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
