#!/usr/bin/env python3
"""Render Douyin ep01 with multi-scene kinetic cards + Ken Burns + xfade."""

from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path("/opt/cursor/artifacts/douyin-ai-short-drama-course")
OUT_DIR = ROOT / "slides" / "01"
WORK = ROOT / "build" / "01"
AUDIO = ROOT / "audio" / "01.mp3"
SRT = ROOT / "srt" / "01.srt"
FINAL = ROOT / "videos" / "01-27块 vs 1360块-动画版.mp4"
SILENT = ROOT / "videos-silent" / "01-27块 vs 1360块-动画版-无声.mp4"
BG_COST = ROOT / "assets" / "bg-cost.jpg"
BG_SOLO = ROOT / "assets" / "bg-solo.jpg"

W, H = 1080, 1920
FPS = 30
ACCENT = (255, 59, 92)  # coral red
TEAL = (56, 189, 180)
WHITE = (245, 246, 248)
MUTED = (168, 176, 190)
DARK = (8, 10, 14)


def font(size: int) -> ImageFont.FreeTypeFont:
    path = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
    return ImageFont.truetype(path, size)


def fit_cover(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    scale = max(W / im.width, H / im.height)
    im = im.resize((math.ceil(im.width * scale), math.ceil(im.height * scale)), Image.Resampling.LANCZOS)
    left = (im.width - W) // 2
    top = (im.height - H) // 2
    im = im.crop((left, top, left + W, top + H))
    # Darken for text readability
    im = ImageEnhance.Brightness(im).enhance(0.42)
    im = ImageEnhance.Contrast(im).enhance(1.15)
    return im.filter(ImageFilter.GaussianBlur(radius=0.6))


def solid_bg(color=DARK) -> Image.Image:
    return Image.new("RGB", (W, H), color)


def draw_footer(draw: ImageDraw.ImageDraw, text: str = "AI短剧免费教学 · 01") -> None:
    f = font(28)
    bbox = draw.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, H - 120), text, font=f, fill=MUTED)


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


def wrap_center(draw, text, y, size, fill=WHITE, max_width=900, gap=12):
    f = font(size)
    lines = []
    cur = ""
    for ch in text:
        test = cur + ch
        if draw.textbbox((0, 0), test, font=f)[2] <= max_width:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = ch
    if cur:
        lines.append(cur)
    yy = y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=f)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text(((W - tw) / 2, yy), line, font=f, fill=fill)
        yy += th + gap
    return yy


def slide_hook(bg: Image.Image) -> Image.Image:
    im = bg.copy()
    draw = ImageDraw.Draw(im)
    draw_pill(draw, "成本反差", 220)
    wrap_center(draw, "同样拍一集", 380, 48, MUTED)
    wrap_center(draw, "5 分钟", 470, 120, WHITE)
    wrap_center(draw, "角色会开口说话", 640, 72, WHITE)
    draw.rounded_rectangle([300, 760, 780, 772], radius=6, fill=ACCENT)
    wrap_center(draw, "的 AI 短剧", 820, 56, MUTED)
    draw_footer(draw)
    return im


def slide_cost_expensive(bg: Image.Image) -> Image.Image:
    im = bg.copy()
    draw = ImageDraw.Draw(im)
    draw_pill(draw, "有人这样做", 240)
    wrap_center(draw, "视频这一步", 420, 48, MUTED)
    wrap_center(draw, "1360 块", 540, 140, (255, 120, 130))
    wrap_center(draw, "贵在模型和跑法", 760, 48, WHITE)
    draw.rounded_rectangle([220, 900, 860, 980], radius=24, fill=(40, 24, 28))
    wrap_center(draw, "常见高成本路径", 920, 36, MUTED)
    draw_footer(draw)
    return im


def slide_cost(bg: Image.Image) -> Image.Image:
    im = bg.copy()
    draw = ImageDraw.Draw(im)
    draw_pill(draw, "我这边算下来", 180)
    # left expensive card
    draw.rounded_rectangle([70, 360, 500, 980], radius=36, fill=(22, 24, 30))
    draw.rounded_rectangle([70, 360, 500, 980], radius=36, outline=(70, 74, 84), width=3)
    wrap = ImageDraw.Draw(im)
    f_small = font(34)
    wrap.text((150, 420), "常见做法", font=f_small, fill=MUTED)
    f_big = font(110)
    wrap.text((120, 520), "1360", font=f_big, fill=(255, 120, 130))
    wrap.text((160, 670), "块左右", font=font(44), fill=WHITE)
    wrap.text((130, 820), "贵在模型和跑法", font=font(30), fill=MUTED)

    # right cheap card
    draw.rounded_rectangle([580, 360, 1010, 980], radius=36, fill=(18, 34, 36))
    draw.rounded_rectangle([580, 360, 1010, 980], radius=36, outline=TEAL, width=4)
    wrap.text((690, 420), "这套跑法", font=f_small, fill=TEAL)
    wrap.text((650, 520), "27", font=f_big, fill=TEAL)
    wrap.text((690, 670), "块左右", font=font(44), fill=WHITE)
    wrap.text((650, 820), "一人也能做出来", font=font(30), fill=MUTED)

    # VS badge
    draw.ellipse([480, 620, 600, 740], fill=ACCENT)
    bbox = draw.textbbox((0, 0), "VS", font=font(42))
    tw = bbox[2] - bbox[0]
    draw.text((540 - tw / 2, 655), "VS", font=font(42), fill=WHITE)

    wrap_center(draw, "差距不是运气，是跑法", 1120, 40, WHITE)
    draw_footer(draw)
    return im


def slide_why(bg: Image.Image) -> Image.Image:
    im = bg.copy()
    draw = ImageDraw.Draw(im)
    draw_pill(draw, "关键差别", 240, fill=TEAL)
    wrap_center(draw, "差别在哪？", 420, 92, WHITE)
    wrap_center(draw, "不是偷工减料", 620, 56, MUTED)
    wrap_center(draw, "是选对模型和跑法", 740, 64, WHITE)
    # three chips
    chips = ["选对模型", "控制时长", "先测再出片"]
    x = 120
    for i, c in enumerate(chips):
        f = font(32)
        bbox = draw.textbbox((0, 0), c, font=f)
        tw = bbox[2] - bbox[0]
        x0 = x
        y0 = 980
        draw.rounded_rectangle([x0, y0, x0 + tw + 48, y0 + 70], radius=20, fill=(28, 32, 40))
        draw.text((x0 + 24, y0 + 16), c, font=f, fill=WHITE if i else ACCENT)
        x = x0 + tw + 72
    draw_footer(draw)
    return im


def slide_solo(bg: Image.Image) -> Image.Image:
    im = bg.copy()
    draw = ImageDraw.Draw(im)
    draw_pill(draw, "一人剧组", 220)
    wrap_center(draw, "一个人", 400, 100, WHITE)
    wrap_center(draw, "不用买显卡", 560, 72, TEAL)
    wrap_center(draw, "也能做出会说话的短剧", 700, 56, WHITE)
    # fake progress / checklist
    items = [("编剧分镜", True), ("人物场景", True), ("开口表演", True), ("剪映导出", True)]
    y = 920
    for label, ok in items:
        draw.rounded_rectangle([180, y, 900, y + 88], radius=22, fill=(20, 24, 30))
        draw.ellipse([210, y + 24, 250, y + 64], fill=TEAL if ok else MUTED)
        draw.text((280, y + 22), label, font=font(40), fill=WHITE)
        y += 110
    draw_footer(draw)
    return im


def slide_cta(bg: Image.Image) -> Image.Image:
    im = bg.copy()
    draw = ImageDraw.Draw(im)
    draw_pill(draw, "下一集预告", 280)
    wrap_center(draw, "关注我", 480, 110, WHITE)
    wrap_center(draw, "下一集把工具分工讲清楚", 660, 48, MUTED)
    wrap_center(draw, "编剧 · 美术 · 演员 · 剪辑", 820, 42, TEAL)
    draw.rounded_rectangle([290, 980, 790, 1100], radius=28, fill=ACCENT)
    bbox = draw.textbbox((0, 0), "点关注，别走丢", font=font(48))
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, 1012), "点关注，别走丢", font=font(48), fill=WHITE)
    draw_footer(draw, "AI短剧免费教学 · 合集连更")
    return im


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def make_ken_burns(image: Path, out_mp4: Path, seconds: float, zoom_end: float = 1.12) -> None:
    frames = max(int(seconds * FPS), 2)
    # Start slightly wider crop via zoompan from 1.0 -> zoom_end
    vf = (
        f"scale=8000:-1,"
        f"zoompan=z='min(1+({zoom_end}-1)*on/{frames}, {zoom_end})':"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d={frames}:s={W}x{H}:fps={FPS},"
        f"fps={FPS},format=yuv420p"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(image),
            "-vf",
            vf,
            "-t",
            f"{seconds:.3f}",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            str(out_mp4),
        ]
    )


def xfade_concat(clips: list[Path], durations: list[float], out: Path, overlap: float = 0.35) -> None:
    if len(clips) == 1:
        shutil.copy(clips[0], out)
        return
    # Build filter_complex for sequential xfade
    inputs: list[str] = []
    for c in clips:
        inputs.extend(["-i", str(c)])
    filter_parts = []
    current = "[0:v]"
    offset = durations[0] - overlap
    for i in range(1, len(clips)):
        out_label = f"[v{i}]" if i < len(clips) - 1 else "[vout]"
        filter_parts.append(
            f"{current}[{i}:v]xfade=transition=fade:duration={overlap}:offset={offset:.3f}{out_label}"
        )
        current = out_label
        if i < len(clips) - 1:
            offset += durations[i] - overlap
    fc = ";".join(filter_parts)
    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", fc, "-map", "[vout]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", str(out)]
    run(cmd)


def mux_audio(video: Path, audio: Path, srt: Path, out: Path) -> None:
    # Kinetic cards already carry the message; skip burned subtitles to avoid double text.
    del srt
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video),
            "-i",
            str(audio),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "19",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)

    bg_cost = fit_cover(BG_COST)
    bg_solo = fit_cover(BG_SOLO)
    bg_dark = solid_bg()

    # More cuts = stronger short-video rhythm (matches voice beats)
    slides = [
        ("01-hook.png", slide_hook(bg_cost), 5.10, 1.12),
        ("02-expensive.png", slide_cost_expensive(bg_cost), 3.10, 1.10),
        ("03-cost.png", slide_cost(bg_cost), 3.50, 1.16),
        ("04-why.png", slide_why(bg_dark), 4.70, 1.10),
        ("05-solo.png", slide_solo(bg_solo), 4.90, 1.14),
        ("06-cta.png", slide_cta(bg_solo), 4.20, 1.12),
    ]

    clip_paths: list[Path] = []
    durations: list[float] = []
    for name, img, seconds, zoom in slides:
        png = OUT_DIR / name
        img.save(png, quality=95)
        mp4 = WORK / f"{name}.mp4"
        make_ken_burns(png, mp4, seconds, zoom_end=zoom)
        clip_paths.append(mp4)
        durations.append(seconds)
        print(f"clip {name} {seconds}s")

    video_only = WORK / "video_xfade.mp4"
    xfade_concat(clip_paths, durations, video_only, overlap=0.30)

    FINAL.parent.mkdir(parents=True, exist_ok=True)
    mux_audio(video_only, AUDIO, SRT, FINAL)

    # silent copy for local dub
    SILENT.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-i", str(FINAL), "-c:v", "copy", "-an", str(SILENT)])

    # preview frames
    preview_dir = Path("/opt/cursor/artifacts/douyin-ai-short-drama-course/previews")
    preview_dir.mkdir(parents=True, exist_ok=True)
    for t, name in [
        (0.8, "ep01-anim-01.jpg"),
        (7.5, "ep01-anim-02.jpg"),
        (14.0, "ep01-anim-03.jpg"),
        (19.0, "ep01-anim-04.jpg"),
        (23.0, "ep01-anim-05.jpg"),
    ]:
        run(
            [
                "ffmpeg",
                "-y",
                "-ss",
                str(t),
                "-i",
                str(FINAL),
                "-frames:v",
                "1",
                "-update",
                "1",
                str(preview_dir / name),
            ]
        )
    print("FINAL", FINAL)
    print("SILENT", SILENT)


if __name__ == "__main__":
    main()
