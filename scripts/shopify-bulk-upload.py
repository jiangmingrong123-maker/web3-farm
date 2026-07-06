#!/usr/bin/env python3
"""
Bulk create Shopify products with local images via Admin API (GraphQL).

Prereqs (one-time, merchant):
  1. Shopify Admin → Settings → Apps → Develop apps → Create app
  2. Enable Admin API scopes: write_products, read_products, write_files
  3. Install app, copy Admin API access token

Env:
  SHOPIFY_STORE=zhang-hongming-zisha-studio
  SHOPIFY_ADMIN_TOKEN=shpat_...

Folder layout (same as 合集):
  root/
    800鸿运 紫泥 180毫升 精工半手 郁佳骅/
      1.jpg
      2.jpg
    7000仿古 本山绿 195毫升 全手 张洪明/
      ...

Usage:
  python3 scripts/shopify-bulk-upload.py /path/to/合集
  python3 scripts/shopify-bulk-upload.py /path/to/合集 --dry-run

On Cloud Agent: put 合集 zip in workspace, unzip, run with token in env.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

_gen_path = Path(__file__).resolve().parent / "generate-shopify-products-csv.py"
_spec = importlib.util.spec_from_file_location("shopify_gen", _gen_path)
shopify_gen = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(shopify_gen)
parse_folder = shopify_gen.parse_folder

API_VERSION = "2024-10"


def api_graphql(store: str, token: str, query: str, variables: dict) -> dict:
    url = f"https://{store}.myshopify.com/admin/api/{API_VERSION}/graphql.json"
    payload = json.dumps({"query": query, "variables": variables}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = json.loads(resp.read().decode())
    if body.get("errors"):
        raise RuntimeError(body["errors"])
    return body["data"]


def upload_image_and_attach(
    store: str, token: str, product_id: str, image_path: Path, position: int
) -> None:
    """REST product image upload (simpler than staged uploads for small batches)."""
    import base64

    url = f"https://{store}.myshopify.com/admin/api/{API_VERSION}/products/{product_id}/images.json"
    b64 = base64.b64encode(image_path.read_bytes()).decode()
    payload = json.dumps(
        {
            "image": {
                "attachment": b64,
                "filename": image_path.name,
                "position": position,
            }
        }
    ).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        json.loads(resp.read().decode())


def create_product(store: str, token: str, row: dict, location_id: str | None) -> str:
    mutation = """
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product { id legacyResourceId }
        userErrors { field message }
      }
    }
    """
    variants = [{
        "price": row["Variant Price"],
        "inventoryManagement": "SHOPIFY",
        "inventoryPolicy": "DENY",
        "weight": float(row["Variant Grams"]) / 1000,
        "weightUnit": "KILOGRAMS",
        "requiresShipping": True,
    }]
    variables = {
        "input": {
            "title": row["Title"],
            "descriptionHtml": row["Body (HTML)"],
            "vendor": row["Vendor"],
            "productType": row["Type"],
            "tags": row["Tags"].split(", "),
            "status": "ACTIVE",
            "variants": variants,
        }
    }
    data = api_graphql(store, token, mutation, variables)
    errors = data["productCreate"]["userErrors"]
    if errors:
        raise RuntimeError(errors)
    pid = data["productCreate"]["product"]["legacyResourceId"]
    return str(pid)


def image_files(folder: Path) -> list[Path]:
    exts = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    files = [p for p in sorted(folder.iterdir()) if p.suffix.lower() in exts]
    return files


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path, help="Path to 合集 folder")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    store = os.environ.get("SHOPIFY_STORE", "zhang-hongming-zisha-studio")
    token = os.environ.get("SHOPIFY_ADMIN_TOKEN", "")
    if not token and not args.dry_run:
        print("Set SHOPIFY_ADMIN_TOKEN env var.", file=sys.stderr)
        sys.exit(1)

    folders = sorted(p for p in args.root.iterdir() if p.is_dir())
    for folder in folders:
        row = parse_folder(folder.name)
        if not row:
            print(f"skip bad name: {folder.name}", file=sys.stderr)
            continue
        imgs = image_files(folder)
        print(f"{folder.name} -> {row['Handle']} ({len(imgs)} images)")
        if args.dry_run:
            continue
        try:
            pid = create_product(store, token, row, None)
            for i, img in enumerate(imgs, 1):
                upload_image_and_attach(store, token, pid, img, i)
                print(f"  uploaded {img.name}")
        except urllib.error.HTTPError as e:
            print(f"  ERROR: {e.read().decode()}", file=sys.stderr)


if __name__ == "__main__":
    main()
