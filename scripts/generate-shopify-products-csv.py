#!/usr/bin/env python3
"""
Generate Shopify product import CSV from folder names.

Folder name examples:
  800鸿运 紫泥 180毫升 精工半手 郁佳骅
  12000传炉 190毫升 底槽清 精工半手 张洪明
  1200仿古 底槽清 120毫升 杨俊英

Usage:
  python3 scripts/generate-shopify-products-csv.py "path/to/合集" --out products.csv
  python3 scripts/generate-shopify-products-csv.py  # uses built-in sample list

HKD price = CNY price * 1.1 (same as first listing: 7000 -> 7800, 800 -> 880)
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

HKD_RATE = 1.1
WEIGHT_GRAMS = 800
SKIP_HANDLES = {
    "zhang-hongming-handmade-yixing-teapot-duoqiu-di-cao-qing-clay-230ml",
    "zhang-hongming-duoqiu-dicaoqing-230ml-7000",
}

# From user's 合集 folder listing
SAMPLE_FOLDERS = [
    "800鸿运 紫泥 180毫升 精工半手 郁佳骅",
    "800龙蛋 紫泥 270毫升 精工半手 郁佳骅",
    "800璧瑜壶 紫泥 260毫升 精工半手 郁佳骅",
    "800汉铎 紫泥 370毫升 精工半手 郁佳骅",
    "800华颖 紫泥 330毫升 精工半手 郁佳骅",
    "800简瓢 紫泥 160毫升 精工半手 郁佳骅",
    "800乳鼎 紫泥 390毫升 精工半手 郁佳骅",
    "800石瓢 紫泥 150毫升 精工半手 郁佳骅",
    "800玉如意 紫泥 130毫升 精工半手 郁佳骅",
    "800周盘 紫泥 200毫升 精工半手 郁佳骅",
    "7000掇球 底槽清 230毫升 全手 张洪明",
    "7000仿古 本山绿 195毫升 全手 张洪明",
    "7000仿古 本山绿泥 185毫升 全手 张洪明",
]

FOLDER_RE = re.compile(
    r"^(\d+)(.+?)\s+(\S+)\s+(\d+毫升)\s+(\S+)\s+(\S+)$"
)

AUTHOR_EN = {
    "张洪明": "Zhang Hongming",
    "郁佳骅": "Yu Jiahua",
    "杨俊英": "Yang Junying",
}

POT_ROMAN = {
    "鸿运": "hongyun",
    "龙蛋": "longdan",
    "璧瑜壶": "biyuhu",
    "汉铎": "handuo",
    "华颖": "huaying",
    "简瓢": "jianpiao",
    "乳鼎": "ruding",
    "石瓢": "shipiao",
    "玉如意": "yuruyi",
    "周盘": "zhoupan",
    "掇球": "duoqiu",
    "仿古": "fanggu",
    "莲子": "lianzi",
    "雪华壶": "xuehua",
    "秦权": "qinquan",
    "笑樱": "xiaoying",
    "传炉": "chuanlu",
}

CLAY_ROMAN = {
    "紫泥": "zini",
    "底槽清": "dicaoqing",
    "本山绿": "benshanlu",
    "本山绿泥": "benshanluni",
}

CRAFT_EN = {
    "全手": "Fully handmade",
    "精工半手": "Semi-handmade (fine craft)",
    "半手": "Semi-handmade",
}

CRAFT_KEYWORDS = ("精工半手", "全手", "半手", "机车", "注浆")
PRICE_NAME_RE = re.compile(r"^(\d+)(.+?)\s+(.+)$")


def slugify_part(text: str) -> str:
    """ASCII slug or short hash for unknown Chinese labels (unique handles)."""
    import hashlib

    text = text.strip()
    ascii_slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    if ascii_slug:
        return ascii_slug[:24]
    return "cn" + hashlib.md5(text.encode()).hexdigest()[:8]


def make_handle(price_cny: str, pot_name: str, clay: str, capacity: str, author: str) -> str:
    pot = POT_ROMAN.get(pot_name.strip()) or slugify_part(pot_name)
    clay_r = CLAY_ROMAN.get(clay) or slugify_part(clay)
    cap = capacity.replace("毫升", "ml")
    if author == "张洪明":
        author_r = "zhang-hongming"
    elif author == "杨俊英":
        author_r = "yang-junying"
    else:
        author_r = "yu-jiahua"
    return f"{author_r}-{pot}-{clay_r}-{cap}-{price_cny}"


def _parse_folder_fields(name: str) -> tuple[str, str, str, str, str, str] | None:
    """Parse folder name; supports clay/capacity order variants."""
    m = PRICE_NAME_RE.match(name.strip())
    if not m:
        return None
    price_cny, pot_name, rest = m.groups()
    parts = rest.split()
    if len(parts) < 2:
        return None

    author = parts[-1]
    capacity = next((p for p in parts if "毫升" in p), None)
    if not capacity:
        return None

    middle = [p for p in parts if p not in (author, capacity)]
    craft = next((p for p in middle if any(k in p for k in CRAFT_KEYWORDS)), "")
    if craft:
        middle = [p for p in middle if p != craft]

    clay = " ".join(middle) if middle else "紫砂"
    return price_cny, pot_name.strip(), clay, capacity, craft, author


def parse_folder(name: str) -> dict | None:
    parsed = _parse_folder_fields(name)
    if not parsed:
        return None
    price_cny, pot_name, clay, capacity, craft, author = parsed
    capacity_ml = capacity.replace("毫升", "ml")
    author_en = AUTHOR_EN.get(author, author)
    craft_en = CRAFT_EN.get(craft, craft) if craft else "Handcrafted"
    price_hkd = round(int(price_cny) * HKD_RATE)

    if author == "张洪明":
        title = (
            f"Zhang Hongming Handmade Yixing Teapot – {pot_name} – "
            f"{clay} {capacity_ml}"
        )
    else:
        title = f"{author_en} Yixing Teapot – {pot_name} – {clay} {capacity_ml}"

    craft_cn = f"，{craft}" if craft else ""
    craft_line_html = (
        f"<li><strong>Craft:</strong> {craft_en} ({craft})</li>"
        if craft
        else ""
    )
    # Single-line HTML so CSV rows are not split across lines (Shopify requires Title).
    body = (
        f"<p>Authentic Yixing zisha teapot from Yixing, China.</p>"
        f"<ul>"
        f"<li><strong>Style:</strong> {pot_name}</li>"
        f"<li><strong>Clay:</strong> {clay}</li>"
        f"<li><strong>Capacity:</strong> {capacity_ml}</li>"
        f"{craft_line_html}"
        f"<li><strong>Artisan:</strong> {author_en} ({author})</li>"
        f"<li><strong>Origin:</strong> Yixing, China</li>"
        f"</ul>"
        f"<p>Ships carefully packed from our Yixing warehouse to Hong Kong and worldwide.</p>"
        f"<p>宜兴紫砂壶，{author}制作。{clay}，{capacity}{craft_cn}。宜兴发货。</p>"
    )

    handle_base = make_handle(price_cny, pot_name, clay, capacity, author)
    tags = f"zisha, yixing, teapot, handmade, {author_en}"

    return {
        "Handle": handle_base,
        "Title": title,
        "Body (HTML)": body,
        "Vendor": author_en,
        "Type": "Teapot",
        "Tags": tags,
        "Published": "TRUE",
        "Option1 Name": "Title",
        "Option1 Value": "Default Title",
        "Variant Grams": str(WEIGHT_GRAMS),
        "Variant Inventory Tracker": "shopify",
        "Variant Inventory Qty": "1",
        "Variant Inventory Policy": "deny",
        "Variant Fulfillment Service": "manual",
        "Variant Price": str(price_hkd),
        "Variant Requires Shipping": "TRUE",
        "Variant Taxable": "TRUE",
        "Image Src": "",
        "Image Position": "",
        "Status": "active",
        "_folder": name,
    }


def collect_folders(path: Path | None) -> list[str]:
    if path and path.is_dir():
        return sorted(p.name for p in path.iterdir() if p.is_dir())
    return SAMPLE_FOLDERS


def write_csv(rows: list[dict], out: Path | None) -> None:
    fieldnames = [
        "Handle",
        "Title",
        "Body (HTML)",
        "Vendor",
        "Type",
        "Tags",
        "Published",
        "Option1 Name",
        "Option1 Value",
        "Variant Grams",
        "Variant Inventory Tracker",
        "Variant Inventory Qty",
        "Variant Inventory Policy",
        "Variant Fulfillment Service",
        "Variant Price",
        "Variant Requires Shipping",
        "Variant Taxable",
        "Image Src",
        "Image Position",
        "Status",
    ]

    if out:
        out.parent.mkdir(parents=True, exist_ok=True)
        fh = out.open("w", encoding="utf-8", newline="")
    else:
        fh = sys.stdout

    try:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            if not row.get("Title", "").strip():
                raise ValueError(f"Missing Title for handle: {row.get('Handle')}")
            writer.writerow(row)
    finally:
        if out:
            fh.close()


def build_rows(folders: list[str]) -> list[dict]:
    rows: list[dict] = []
    for folder in folders:
        row = parse_folder(folder)
        if not row:
            print(f"# skip (bad format): {folder}", file=sys.stderr)
            continue
        if "掇球" in folder and "张洪明" in folder:
            print(f"# skip (already listed): {folder}", file=sys.stderr)
            continue
        if row["Handle"] in SKIP_HANDLES:
            print(f"# skip (already listed): {folder}", file=sys.stderr)
            continue
        rows.append(row)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Shopify product import CSV")
    parser.add_argument(
        "folder",
        nargs="?",
        help="Path to 合集 folder containing product subfolders",
    )
    parser.add_argument(
        "--out",
        "-o",
        type=Path,
        help="Write UTF-8 CSV to this file (recommended on Windows)",
    )
    args = parser.parse_args()

    root = Path(args.folder) if args.folder else None
    folders = collect_folders(root)
    rows = build_rows(folders)
    write_csv(rows, args.out)

    print(f"# wrote {len(rows)} products", file=sys.stderr)


if __name__ == "__main__":
    main()
