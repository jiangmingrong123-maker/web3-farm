#!/usr/bin/env python3
"""
One-time OAuth helper for Dev Dashboard apps (Shopify 2026).

Use when install count stays 0 or client_credentials fails.

Steps:
  1. Set env vars below, run this script.
  2. Open the printed URL in browser, approve the app.
  3. Browser redirects to http://localhost/?code=... (page may error — that's OK).
  4. Copy the FULL address bar URL and paste back here.
  5. Script prints SHOPIFY_ADMIN_TOKEN — use it for bulk image upload.

Env:
  SHOPIFY_STORE=zhang-hongming-zisha-studio
  SHOPIFY_CLIENT_ID=...
  SHOPIFY_CLIENT_SECRET=...
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request

SCOPES = "read_products,write_products,read_inventory,write_inventory,read_locations"
REDIRECT_URI = "http://localhost"


def main() -> None:
    store = os.environ.get("SHOPIFY_STORE", "zhang-hongming-zisha-studio").strip()
    client_id = os.environ.get("SHOPIFY_CLIENT_ID", "").strip()
    client_secret = os.environ.get("SHOPIFY_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        print("Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET.", file=sys.stderr)
        sys.exit(1)

    params = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "scope": SCOPES,
            "redirect_uri": REDIRECT_URI,
        }
    )
    auth_url = f"https://{store}.myshopify.com/admin/oauth/authorize?{params}"

    print("=== Step 1: Open this URL in your browser ===\n")
    print(auth_url)
    print("\n=== Step 2: Approve the app ===")
    print("After approving, the browser goes to http://localhost/?code=...")
    print("The page may show 'cannot connect' — that's normal.")
    print("\n=== Step 3: Paste the FULL redirect URL here ===")
    redirect = input("Paste URL: ").strip()
    if "code=" not in redirect:
        print("No code= in URL. Did you approve the app?", file=sys.stderr)
        sys.exit(1)

    parsed = urllib.parse.urlparse(redirect)
    code = urllib.parse.parse_qs(parsed.query).get("code", [""])[0]
    if not code:
        print("Could not parse code from URL.", file=sys.stderr)
        sys.exit(1)

    body = json.dumps(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
        }
    ).encode()
    req = urllib.request.Request(
        f"https://{store}.myshopify.com/admin/oauth/access_token",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode())

    token = data.get("access_token", "")
    if not token:
        print(f"Token exchange failed: {data}", file=sys.stderr)
        sys.exit(1)

    print("\n=== Success ===\n")
    print("Run these commands in PowerShell (same window):\n")
    print(f'$env:SHOPIFY_ADMIN_TOKEN = "{token}"')
    print(
        'python scripts/shopify-bulk-upload-images.py '
        '"D:\\mygame\\web3-farm\\张赵阳紫砂文件1\\合集" --dry-run'
    )
    print("\n(Token is long-lived until you uninstall the app. Keep it secret.)")


if __name__ == "__main__":
    main()
