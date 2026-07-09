"""Shared Shopify Admin REST helpers."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

API_VERSION = "2024-10"
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


def graphql_request(store: str, token: str, query: str, variables: dict | None = None) -> dict:
    payload: dict = {"query": query}
    if variables:
        payload["variables"] = variables
    body, _ = api_request(store, token, "POST", "/graphql.json", payload)
    if body.get("errors"):
        raise RuntimeError(f"GraphQL errors: {body['errors']}")
    return body.get("data") or {}


def parse_next_link(link_header: str) -> str | None:
    if not link_header:
        return None
    for part in link_header.split(","):
        if 'rel="next"' in part:
            match = re.search(r"<([^>]+)>", part)
            return match.group(1) if match else None
    return None
