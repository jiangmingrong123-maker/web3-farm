#!/usr/bin/env python3
"""
Generate Shopify product import CSV from folder names.

Folder name format:
  {price}{name} {clay} {capacity} {craft} {author}
Example:
  800鸿运 紫泥 180毫升 精工半手 郁佳骅
  7000掇球 底槽清 230毫升 全手 张洪明

Usage:
  python3 scripts/generate-shopify-products-csv.py "path/to/合集" > products.csv
  python3 scripts/generate-shopify-products-csv.py  # uses built-in sample list

HKD price = CNY price * 1.1 (same as first listing: 7000 -> 7800, 800 -> 880)
"""

from __future__ import annotations

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


def make_handle(price_cny: str, pot_name: str, clay: str, capacity: str, author: str) -> str:
    pot = POT_ROMAN.get(pot_name.strip(), "pot")
    clay_r = CLAY_ROMAN.get(clay, "clay")
    cap = capacity.replace("毫升", "ml")
    author_r = "zhang-hongming" if author == "张洪明" else "yu-jiahua"
    return f"{author_r}-{pot}-{clay_r}-{cap}-{price_cny}"


def parse_folder(name: str) -> dict | None:
    m = FOLDER_RE.match(name.strip())
    if not m:
        return None
    price_cny, pot_name, clay, capacity, craft, author = m.groups()
    capacity_ml = capacity.replace("毫升", "ml")
    author_en = AUTHOR_EN.get(author, author)
    craft_en = CRAFT_EN.get(craft, craft)
    price_hkd = round(int(price_cny) * HKD_RATE)

    title = (
        f"{author_en} Yixing Teapot – {pot_name.strip()} – "
        f"{clay} {capacity_ml}"
    )
    if author == "张洪明":
        title = (
            f"Zhang Hongming Handmade Yixing Teapot – {pot_name.strip()} – "
            f"{clay} {capacity_ml}"
        )

    body = f"""<p>Authentic Yixing zisha teapot from Yixing, China.</p>
<ul>
<li><strong>Style:</strong> {pot_name.strip()}</li>
<li><strong>Clay:</strong> {clay}</li>
<li><strong>Capacity:</strong> {capacity_ml}</li>
<li><strong>Craft:</strong> {craft_en} ({craft})</li>
<li><strong>Artisan:</strong> {author_en} ({author})</li>
<li><strong>Origin:</strong> Yixing, China</li>
</ul>
<p>Ships carefully packed from our Yixing warehouse to Hong Kong and worldwide.</p>
<p>宜兴紫砂壶，{author}制作。{clay}，{capacity}，{craft}。宜兴发货。</p>"""

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


def main() -> None:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    folders = collect_folders(root)

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

    writer = csv.DictWriter(sys.stdout, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()

    for folder in folders:
        row = parse_folder(folder)
        if not row:
            print(f"# skip (bad format): {folder}", file=sys.stderr)
            continue
        if row["Handle"] in SKIP_HANDLES:
            print(f"# skip (already listed): {folder}", file=sys.stderr)
            continue
        writer.writerow(row)


if __name__ == "__main__":
    main()
