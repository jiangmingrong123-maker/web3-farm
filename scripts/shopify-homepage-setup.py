#!/usr/bin/env python3
"""
Apply Zhang Hongming Zisha Studio homepage layout to the live Dawn theme.

Creates artisan smart collections, About Us page, navigation menu, and
updates templates/index.json on the published theme.

Usage:
  python scripts/shopify-homepage-setup.py --dry-run
  python scripts/shopify-homepage-setup.py
  python scripts/shopify-homepage-setup.py --skip-theme   # pages/collections/menu only
  python scripts/shopify-homepage-setup.py --banner-product "Duoqiu"

Env:
  SHOPIFY_STORE=zhang-hongming-zisha-studio
  SHOPIFY_ADMIN_TOKEN=shpat_...   OR   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET

Required app scopes (add in Dev Dashboard, then reinstall app):
  read_products, write_products
  read_content, write_content
  read_themes, write_themes
  read_online_store_navigation, write_online_store_navigation
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import sys
import time
import urllib.error
import urllib.parse
from pathlib import Path

from shopify_api import REQUEST_DELAY_SEC, api_request, graphql_request
from shopify_auth import get_access_token

ROOT = Path(__file__).resolve().parent.parent
CONTENT_PATH = ROOT / "data" / "shopify-homepage" / "content.json"
INDEX_PATH = ROOT / "data" / "shopify-homepage" / "index.json"
DEFAULT_STORE = "zhang-hongming-zisha-studio"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def pause() -> None:
    time.sleep(REQUEST_DELAY_SEC)


def fetch_main_theme(store: str, token: str) -> dict:
    body, _ = api_request(store, token, "GET", "/themes.json")
    themes = body.get("themes") or []
    main = next((t for t in themes if t.get("role") == "main"), None)
    if not main:
        raise RuntimeError("No published (main) theme found.")
    return main


def find_collection_by_handle(store: str, token: str, handle: str) -> dict | None:
    try:
        body, _ = api_request(store, token, "GET", f"/smart_collections.json?handle={handle}")
    except urllib.error.HTTPError:
        body, _ = api_request(store, token, "GET", f"/custom_collections.json?handle={handle}")
    collections = body.get("smart_collections") or body.get("custom_collections") or []
    return collections[0] if collections else None


def create_smart_collection(
    store: str,
    token: str,
    spec: dict,
    *,
    dry_run: bool,
) -> str:
    handle = spec["handle"]
    existing = find_collection_by_handle(store, token, handle)
    if existing:
        print(f"  collection exists: {handle} (id={existing['id']})")
        return str(existing["id"])

    payload = {
        "smart_collection": {
            "title": spec["title"],
            "handle": handle,
            "body_html": spec.get("body_html", ""),
            "published": True,
            "rules": spec["rules"],
            "disjunctive": False,
        }
    }
    if dry_run:
        print(f"  [dry-run] create smart collection: {handle}")
        return "dry-run"

    body, _ = api_request(store, token, "POST", "/smart_collections.json", payload)
    pause()
    coll_id = str(body["smart_collection"]["id"])
    print(f"  created collection: {handle} (id={coll_id})")
    return coll_id


def find_page_by_handle(store: str, token: str, handle: str) -> dict | None:
    body, _ = api_request(store, token, "GET", f"/pages.json?handle={handle}")
    pages = body.get("pages") or []
    return pages[0] if pages else None


def create_about_page(
    store: str,
    token: str,
    spec: dict,
    *,
    dry_run: bool,
) -> str:
    handle = spec["handle"]
    existing = find_page_by_handle(store, token, handle)
    if existing:
        if existing.get("body_html") != spec["body_html"]:
            if dry_run:
                print(f"  [dry-run] update page: {handle}")
            else:
                api_request(
                    store,
                    token,
                    "PUT",
                    f"/pages/{existing['id']}.json",
                    {"page": {"id": existing["id"], "body_html": spec["body_html"]}},
                )
                pause()
                print(f"  updated page body: {handle}")
        else:
            print(f"  page exists: {handle} (id={existing['id']})")
        return str(existing["id"])

    payload = {
        "page": {
            "title": spec["title"],
            "handle": handle,
            "body_html": spec["body_html"],
            "published": True,
        }
    }
    if dry_run:
        print(f"  [dry-run] create page: {handle}")
        return "dry-run"

    body, _ = api_request(store, token, "POST", "/pages.json", payload)
    pause()
    page_id = str(body["page"]["id"])
    print(f"  created page: {handle} (id={page_id})")
    return page_id


def find_product_image_for_banner(
    store: str,
    token: str,
    query: str,
) -> str | None:
    """Return shopify://shop_images/... reference if a product image is found."""
    body, _ = api_request(
        store,
        token,
        "GET",
        f"/products.json?limit=10&title={urllib.parse.quote(query)}",
    )
    products = body.get("products") or []
    if not products:
        body, _ = api_request(store, token, "GET", "/products.json?limit=50")
        products = [
            p
            for p in body.get("products") or []
            if query.lower() in (p.get("title") or "").lower()
        ]
    for product in products:
        images = product.get("images") or []
        if images:
            src = images[0].get("src", "")
            if src:
                # Theme image_picker accepts full CDN URL in some themes; Dawn uses file refs.
                # REST asset update can embed image via shop image id in settings after upload.
                return src
    return None


def build_index_template(
    template: dict,
    *,
    banner_image_src: str | None,
) -> dict:
    data = copy.deepcopy(template)
    if banner_image_src:
        # Dawn accepts image as URL string in some API versions when pushed via assets.
        data["sections"]["hero_banner"]["settings"]["image"] = banner_image_src
    return data


def update_theme_index(
    store: str,
    token: str,
    theme_id: int,
    index_template: dict,
    *,
    dry_run: bool,
) -> None:
    value = json.dumps(index_template, ensure_ascii=False, indent=2)
    if dry_run:
        print(f"  [dry-run] update theme {theme_id} templates/index.json ({len(value)} bytes)")
        return

    try:
        api_request(
            store,
            token,
            "PUT",
            f"/themes/{theme_id}/assets.json",
            {"asset": {"key": "templates/index.json", "value": value}},
        )
        pause()
        print(f"  updated templates/index.json on theme {theme_id}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        raise RuntimeError(
            f"Theme update failed ({exc.code}): {detail}\n"
            "Your app may need read_themes + write_themes scopes (reinstall after adding).\n"
            "Fallback: paste data/shopify-homepage/index.json manually in "
            "線上商店 → 編輯器 → 首页 → 编辑代码."
        ) from exc


def update_main_menu(
    store: str,
    token: str,
    nav_spec: dict,
    *,
    dry_run: bool,
) -> None:
    query = """
    query Menus($handle: String!) {
      menu(handle: $handle) { id handle title items { id title url type } }
    }
    """
    data = graphql_request(store, token, query, {"handle": nav_spec["handle"]})
    menu = data.get("menu")
    if not menu:
        print(f"  menu not found: {nav_spec['handle']} (skip navigation update)")
        return

    items = []
    for item in nav_spec["items"]:
        entry: dict = {"title": item["title"], "url": item["url"], "type": "HTTP"}
        items.append(entry)

    mutation = """
    mutation MenuUpdate($id: ID!, $title: String!, $items: [MenuItemUpdateInput!]!) {
      menuUpdate(id: $id, title: $title, items: $items) {
        menu { id handle }
        userErrors { field message }
      }
    }
    """
    variables = {"id": menu["id"], "title": nav_spec["title"], "items": items}
    if dry_run:
        print(f"  [dry-run] update menu {nav_spec['handle']} ({len(items)} items)")
        return

    try:
        result = graphql_request(store, token, mutation, variables)
        errors = (result.get("menuUpdate") or {}).get("userErrors") or []
        if errors:
            raise RuntimeError(f"menuUpdate errors: {errors}")
        pause()
        print(f"  updated menu: {nav_spec['handle']}")
    except (urllib.error.HTTPError, RuntimeError) as exc:
        print(f"  menu update skipped: {exc}")
        print("  Manual: 線上商店 → 導覽 → Main menu")


def main() -> None:
    parser = argparse.ArgumentParser(description="Set up Shopify homepage for Zisha studio")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without writing")
    parser.add_argument("--skip-theme", action="store_true", help="Skip templates/index.json update")
    parser.add_argument(
        "--banner-product",
        default="Zhang Hongming",
        help="Product title keyword for hero banner image (default: Zhang Hongming)",
    )
    parser.add_argument("--store", default=os.environ.get("SHOPIFY_STORE", DEFAULT_STORE))
    args = parser.parse_args()

    content = load_json(CONTENT_PATH)
    index_template = load_json(INDEX_PATH)

    print(f"Store: {args.store}")
    print(f"Content: {CONTENT_PATH.relative_to(ROOT)}")

    try:
        token = get_access_token(args.store)
    except RuntimeError as exc:
        print(f"Auth error: {exc}", file=sys.stderr)
        sys.exit(1)

    print("\n=== Theme ===")
    try:
        theme = fetch_main_theme(args.store, token)
        print(f"  main theme: {theme.get('name')} (id={theme['id']}, role={theme.get('role')})")
    except (urllib.error.HTTPError, RuntimeError) as exc:
        print(f"  theme lookup failed: {exc}")
        theme = None

    print("\n=== Smart collections ===")
    for coll in content["collections"]:
        create_smart_collection(args.store, token, coll, dry_run=args.dry_run)

    print("\n=== About page ===")
    create_about_page(args.store, token, content["about_page"], dry_run=args.dry_run)

    print("\n=== Navigation ===")
    update_main_menu(args.store, token, content["navigation"], dry_run=args.dry_run)

    if not args.skip_theme and theme:
        print("\n=== Homepage template ===")
        banner_src = None
        if args.banner_product:
            banner_src = find_product_image_for_banner(args.store, token, args.banner_product)
            if banner_src:
                print(f"  banner image from product match: {args.banner_product}")
            else:
                print(
                    "  no banner image found — hero will use theme placeholder until you "
                    "upload a photo in 編輯器 → 图片横幅 → 图片"
                )
        index_data = build_index_template(index_template, banner_image_src=banner_src)
        update_theme_index(
            args.store,
            token,
            int(theme["id"]),
            index_data,
            dry_run=args.dry_run,
        )

    print("\nDone.")
    if args.dry_run:
        print("Re-run without --dry-run to apply changes.")
    else:
        print(f"Preview: https://{args.store}.myshopify.com")
        print("Admin editor: https://admin.shopify.com/store/" + args.store + "/themes/current/editor")


if __name__ == "__main__":
    main()
