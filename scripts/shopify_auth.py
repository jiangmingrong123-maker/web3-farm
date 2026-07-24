"""Shopify Admin API auth: legacy token or Dev Dashboard client credentials."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

_token_cache: dict[str, object] = {"value": "", "expires_at": 0.0}


def get_access_token(store: str) -> str:
    legacy = os.environ.get("SHOPIFY_ADMIN_TOKEN", "").strip()
    if legacy:
        return legacy

    client_id = os.environ.get("SHOPIFY_CLIENT_ID", "").strip()
    client_secret = os.environ.get("SHOPIFY_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise RuntimeError(
            "Set SHOPIFY_ADMIN_TOKEN (legacy) or SHOPIFY_CLIENT_ID + "
            "SHOPIFY_CLIENT_SECRET (Dev Dashboard app)."
        )

    now = time.time()
    cached = _token_cache.get("value", "")
    expires_at = float(_token_cache.get("expires_at", 0))
    if cached and now < expires_at - 60:
        return str(cached)

    body = urllib.parse.urlencode(
        {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        }
    ).encode()
    req = urllib.request.Request(
        f"https://{store}.myshopify.com/admin/oauth/access_token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        raise RuntimeError(
            f"Token request failed ({exc.code}): {detail}\n"
            "If you see shop_not_permitted, install the app on this store "
            "from Dev Dashboard first."
        ) from exc

    token = data.get("access_token", "")
    if not token:
        raise RuntimeError(f"No access_token in response: {data}")

    _token_cache["value"] = token
    _token_cache["expires_at"] = now + int(data.get("expires_in", 86399))
    return token
