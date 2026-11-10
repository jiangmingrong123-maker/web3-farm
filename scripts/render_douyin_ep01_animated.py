#!/usr/bin/env python3
"""Punchier Douyin ep01: rapid cuts, count-up numbers, B-roll flashes, hard transitions."""

from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path("/opt/cursor/artifacts/douyin-ai-short-drama-course")
OUT_DIR = ROOT / "slides" / "01v2"
WORK = ROOT / "build" / "01v2"
AUDIO = ROOT / "audio" / "01.mp3"
FINAL = ROOT / "videos" / "01-27块 vs 1360块-动画版.mp4"
SILENT = ROOT / "videos-silent" / "01-27块 vs 1360块-动画版-无声.mp4"
BG_COST = ROOT / "assets" / "bg-cost.jpg"
BG_SOLO = ROOT / "assets" / "bg-solo.jpg"
BROLL = Path("/opt/cursor/artifacts/x-article-ai-short-drama/media")

W, H = 1080, 1920
FPS = 30
ACCENT = (255, 59, 92)
TEAL = (56, 189, 180)
WHITE = (245, 246, 248)
MUTED = (168, 176, 190)
DARK = (8, 10, 14)


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc", size)


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def fit_cover(path: Path, darken: float = 0.40) -> Image.Image:
    im = Image.open(path).convert("RGB")
    scale = max(W / im.width, H / im.height)
    im = im.resize((math.ceil(im.width * scale), math.ceil(im.height * scale)), Image.Resampling.LANCZOS)
    left = (im.width - W) // 2
    top = (im.height - H) // 2
    im = im.crop((left, top, left + W, top + H))
    im = ImageEnhance.Brightness(im).enhance(darken)
    im = ImageEnhance.Contrast(im).enhance(1.2)
    return im.filter(ImageFilter.GaussianBlur(radius=0.4))


def solid(color=DARK) -> Image.Image:
    return Image.new("RGB", (W, H), color)


def draw_footer(draw: ImageDraw.ImageDraw, text: str = "AI短剧免费教学 · 01") -> None:
    f = font(28)
    bbox = draw.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, H - 110), text, font=f, fill=MUTED)


def draw_pill(draw: ImageDraw.ImageDraw, text: str, y: int, fill=ACCENT) -> None:
    f = font(30)
    pad_x, pad_y = 28, 14
    bbox = draw.textbbox((0, 0), text, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x0 = (W - tw) / 2 - pad_x
    y0 = y
    x1 = x0 + tw + pad_x * 2
    y1 = y0 + th + pad_y * 2
    draw.rounded_rectangle([x0, y0, x1, y1], radius=999, fill=fill)
    draw.text((x0 + pad_x, y0 + pad_y - 2), text, font=f, fill=WHITE)


def center_text(draw, text, y, size, fill=WHITE):
    f = font(size)
    bbox = draw.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, y), text, font=f, fill=fill)
    return bbox[3] - bbox[1]


def flash_frame(color=(255, 255, 255), alpha_bg=DARK) -> Image.Image:
    im = solid(alpha_bg)
    overlay = Image.new("RGB", (W, H), color)
    return Image.blend(im, overlay, 0.35)


def slide_hook1(bg):
    im = bg.copy()
    d = ImageDraw.Draw(im)
    draw_pill(d, "成本反差", 260)
    center_text(d, "同样拍一集", 460, 52, MUTED)
    center_text(d, "5 分钟", 580, 140, WHITE)
    draw_footer(d)
    return im


def slide_hook2(bg):
    im = bg.copy()
    d = ImageDraw.Draw(im)
    draw_pill(d, "而且角色会说话", 260)
    center_text(d, "开口说话", 520, 120, WHITE)
    d.rounded_rectangle([320, 700, 760, 714], radius=8, fill=ACCENT)
    center_text(d, "的 AI 短剧", 780, 56, MUTED)
    draw_footer(d)
    return im


def slide_num(bg, n: str, label: str, color, pill: str):
    im = bg.copy()
    d = ImageDraw.Draw(im)
    draw_pill(d, pill, 240, fill=color if color != (255, 120, 130) else ACCENT)
    center_text(d, "视频这一步", 420, 44, MUTED)
    center_text(d, f"{n}", 540, 160, color)
    center_text(d, "块", 740, 72, WHITE)
    center_text(d, label, 900, 40, MUTED)
    draw_footer(d)
    return im


def slide_vs(bg):
    im = bg.copy()
    d = ImageDraw.Draw(im)
    draw_pill(d, "我这边算下来", 170)
    d.rounded_rectangle([70, 340, 500, 980], radius=36, fill=(22, 24, 30))
    d.rounded_rectangle([70, 340, 500, 980], radius=36, outline=(70, 74, 84), width=3)
    d.text((150, 400), "常见做法", font=font(34), fill=MUTED)
    d.text((110, 500), "1360", font=font(110), fill=(255, 120, 130))
    d.text((160, 650), "块左右", font=font(44), fill=WHITE)
    d.text((120, 800), "贵在模型跑法", font=font(30), fill=MUTED)

    d.rounded_rectangle([580, 340, 1010, 980], radius=36, fill=(18, 34, 36))
    d.rounded_rectangle([580, 340, 1010, 980], radius=36, outline=TEAL, width=5)
    d.text((690, 400), "这套跑法", font=font(34), fill=TEAL)
    d.text((650, 500), "27", font=font(110), fill=TEAL)
    d.text((690, 650), "块左右", font=font(44), fill=WHITE)
    d.text((640, 800), "一人也能做", font=font(30), fill=MUTED)

    d.ellipse([480, 600, 600, 720], fill=ACCENT)
    bbox = d.textbbox((0, 0), "VS", font=font(42))
    tw = bbox[2] - bbox[0]
    d.text((540 - tw / 2, 635), "VS", font=font(42), fill=WHITE)
    center_text(d, "差距不是运气，是跑法", 1100, 40, WHITE)
    draw_footer(d)
    return im


def slide_why(bg, stage: int):
    im = bg.copy()
    d = ImageDraw.Draw(im)
    draw_pill(d, "关键差别", 220, fill=TEAL)
    if stage == 0:
        center_text(d, "差别在哪？", 520, 110, WHITE)
    elif stage == 1:
        center_text(d, "不是偷工减料", 480, 72, MUTED)
        center_text(d, "是选对模型和跑法", 620, 64, WHITE)
    else:
        center_text(d, "记住三件事", 380, 56, MUTED)
        chips = [("选对模型", ACCENT), ("控制时长", WHITE), ("先测再出片", WHITE)]
        y = 520
        for text, color in chips:
            d.rounded_rectangle([180, y, 900, y + 120], radius=28, fill=(24, 28, 36))
            d.ellipse([220, y + 35, 270, y + 85], fill=color if color != WHITE else TEAL)
            d.text((310, y + 32), text, font=font(48), fill=WHITE)
            y += 150
    draw_footer(d)
    return im


def slide_solo(bg, stage: int):
    im = bg.copy()
    d = ImageDraw.Draw(im)
    draw_pill(d, "一人剧组", 200)
    if stage == 0:
        center_text(d, "一个人", 520, 130, WHITE)
        center_text(d, "不用买显卡", 720, 64, TEAL)
    else:
        center_text(d, "也能做出会说话的短剧", 320, 52, WHITE)
        items = ["编剧分镜", "人物场景", "开口表演", "剪映导出"]
        y = 460
        for i, label in enumerate(items):
            active = i <= stage - 1
            d.rounded_rectangle([160, y, 920, y + 110], radius=24, fill=(20, 24, 30) if active else (14, 16, 20))
            d.ellipse([200, y + 30, 250, y + 80], fill=TEAL if active else (60, 64, 72))
            d.text((290, y + 28), label, font=font(46), fill=WHITE if active else MUTED)
            y += 130
    draw_footer(d)
    return im


def slide_cta(bg, stage: int):
    im = bg.copy()
    d = ImageDraw.Draw(im)
    if stage == 0:
        draw_pill(d, "下一集", 280)
        center_text(d, "工具分工表", 520, 100, WHITE)
        center_text(d, "编剧 · 美术 · 演员 · 剪辑", 700, 42, TEAL)
    else:
        draw_pill(d, "先点关注", 280)
        center_text(d, "关注我", 500, 130, WHITE)
        d.rounded_rectangle([250, 760, 830, 900], radius=32, fill=ACCENT)
        bbox = d.textbbox((0, 0), "别走丢下一集", font=font(52))
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) / 2, 800), "别走丢下一集", font=font(52), fill=WHITE)
    draw_footer(d, "AI短剧免费教学 · 合集连更")
    return im


def broll_card(path: Path, caption: str) -> Image.Image:
    im = fit_cover(path, darken=0.55)
    d = ImageDraw.Draw(im)
    # top gradient bar
    d.rectangle([0, 0, W, 160], fill=(0, 0, 0))
    draw_pill(d, "成片闪一下", 40)
    d.rectangle([0, H - 280, W, H], fill=(0, 0, 0))
    center_text(d, caption, H - 200, 44, WHITE)
    draw_footer(d)
    return im


def make_clip(image: Path, out_mp4: Path, seconds: float, zoom_end: float = 1.18, pan: str = "center") -> None:
    frames = max(int(seconds * FPS), 2)
    if pan == "left":
        x_expr = f"'iw/2-(iw/zoom/2)-({frames}-on)*0.15'"
    elif pan == "right":
        x_expr = f"'iw/2-(iw/zoom/2)+({frames}-on)*0.15'"
    else:
        x_expr = "'iw/2-(iw/zoom/2)'"
    vf = (
        f"scale=9000:-1,"
        f"zoompan=z='min(1+({zoom_end}-1)*on/{frames},{zoom_end})':"
        f"x={x_expr}:y='ih/2-(ih/zoom/2)':"
        f"d={frames}:s={W}x{H}:fps={FPS},"
        f"fps={FPS},format=yuv420p"
    )
    run(
        [
            "ffmpeg", "-y", "-loop", "1", "-i", str(image),
            "-vf", vf, "-t", f"{seconds:.3f}", "-an",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
            "-pix_fmt", "yuv420p", str(out_mp4),
        ]
    )


def chain_xfade(clips: list[Path], durations: list[float], transitions: list[str], out: Path, overlap: float = 0.18) -> None:
    inputs: list[str] = []
    for c in clips:
        inputs.extend(["-i", str(c)])
    parts = []
    current = "[0:v]"
    offset = durations[0] - overlap
    for i in range(1, len(clips)):
        label = f"[v{i}]" if i < len(clips) - 1 else "[vout]"
        tr = transitions[i - 1]
        parts.append(
            f"{current}[{i}:v]xfade=transition={tr}:duration={overlap}:offset={max(offset, 0):.3f}{label}"
        )
        current = label
        if i < len(clips) - 1:
            offset += durations[i] - overlap
    run(
        [
            "ffmpeg", "-y", *inputs,
            "-filter_complex", ";".join(parts),
            "-map", "[vout]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
            "-pix_fmt", "yuv420p", str(out),
        ]
    )


def mux(video: Path, audio: Path, out: Path) -> None:
    run(
        [
            "ffmpeg", "-y", "-i", str(video), "-i", str(audio),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k", "-shortest",
            "-movflags", "+faststart", str(out),
        ]
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)

    bg_cost = fit_cover(BG_COST, 0.38)
    bg_solo = fit_cover(BG_SOLO, 0.42)
    bg_dark = solid()

    broll_files = sorted(BROLL.glob("*.jpg"))
    b1 = broll_files[2] if len(broll_files) > 2 else broll_files[0]
    b2 = broll_files[5] if len(broll_files) > 5 else broll_files[-1]

    # count-up style: 400 -> 800 -> 1360, then snap to 27
    story = [
        ("01-hook1.png", slide_hook1(bg_cost), 1.70, 1.14, "center", "slideup"),
        ("02-hook2.png", slide_hook2(bg_cost), 2.00, 1.16, "right", "fade"),
        ("03-broll1.png", broll_card(b1, "角色开口说话 · 成片感"), 1.20, 1.22, "left", "circlecrop"),
        ("04-n400.png", slide_num(bg_cost, "400", "还在涨…", (255, 140, 150), "有人这样做"), 0.55, 1.08, "center", "fade"),
        ("05-n800.png", slide_num(bg_cost, "800", "还在涨…", (255, 120, 130), "有人这样做"), 0.55, 1.10, "center", "fade"),
        ("06-n1360.png", slide_num(bg_cost, "1360", "常见高成本路径", (255, 100, 120), "有人这样做"), 1.40, 1.18, "center", "distance"),
        ("07-flash.png", flash_frame(ACCENT), 0.18, 1.0, "center", "fade"),
        ("08-n27.png", slide_num(bg_cost, "27", "这套跑法", TEAL, "我这边"), 1.50, 1.20, "center", "smoothleft"),
        ("09-vs.png", slide_vs(bg_cost), 2.40, 1.14, "left", "fade"),
        ("10-why0.png", slide_why(bg_dark, 0), 1.20, 1.12, "center", "slidedown"),
        ("11-why1.png", slide_why(bg_dark, 1), 1.80, 1.10, "center", "fade"),
        ("12-why2.png", slide_why(bg_dark, 2), 1.80, 1.12, "right", "slideleft"),
        ("13-broll2.png", broll_card(b2, "一人也能拍出来"), 1.10, 1.20, "left", "circlecrop"),
        ("14-solo0.png", slide_solo(bg_solo, 0), 1.50, 1.16, "center", "fade"),
        ("15-solo1.png", slide_solo(bg_solo, 1), 1.00, 1.10, "center", "fade"),
        ("16-solo2.png", slide_solo(bg_solo, 2), 1.00, 1.10, "center", "fade"),
        ("17-solo3.png", slide_solo(bg_solo, 3), 1.00, 1.12, "center", "fade"),
        ("18-solo4.png", slide_solo(bg_solo, 4), 1.20, 1.14, "center", "fade"),
        ("19-cta0.png", slide_cta(bg_solo, 0), 1.70, 1.12, "right", "slideright"),
        ("20-cta1.png", slide_cta(bg_solo, 1), 2.20, 1.18, "center", "fade"),
    ]

    clips: list[Path] = []
    durs: list[float] = []
    transitions: list[str] = []
    for i, (name, img, sec, zoom, pan, tr) in enumerate(story):
        png = OUT_DIR / name
        img.save(png, quality=95)
        mp4 = WORK / f"{name}.mp4"
        make_clip(png, mp4, sec, zoom_end=zoom, pan=pan)
        clips.append(mp4)
        durs.append(sec)
        if i > 0:
            transitions.append(tr)
        print(f"clip {name} {sec}s {tr if i else '-'}")

    video_only = WORK / "video_xfade.mp4"
    chain_xfade(clips, durs, transitions, video_only, overlap=0.16)

    FINAL.parent.mkdir(parents=True, exist_ok=True)
    mux(video_only, AUDIO, FINAL)
    SILENT.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-i", str(FINAL), "-c:v", "copy", "-an", str(SILENT)])

    preview = ROOT / "previews"
    preview.mkdir(parents=True, exist_ok=True)
    for t, name in [(0.6, "v2-01.jpg"), (4.5, "v2-02.jpg"), (7.2, "v2-03.jpg"), (10.5, "v2-04.jpg"), (16.5, "v2-05.jpg"), (21.5, "v2-06.jpg")]:
        run(["ffmpeg", "-y", "-ss", str(t), "-i", str(FINAL), "-frames:v", "1", "-update", "1", str(preview / name)])
    print("FINAL", FINAL)
    print("total planned", sum(durs))


if __name__ == "__main__":
    main()
