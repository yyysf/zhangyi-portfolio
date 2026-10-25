"""生成品牌小图：favicon、apple-touch-icon、社交分享封面。

用法：
    python scripts/make-brand-assets.py

需要 Pillow。字体使用 source-assets 中的霞鹜文楷原始字体，
输出到 dist/assets/brand/，不参与页面运行时。
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "source-assets" / "LXGWWenKai-Regular.ttf"
OUT = ROOT / "dist" / "assets" / "brand"
ART = ROOT / "dist" / "assets" / "images" / "meadow.webp"

PAPER = (252, 253, 252, 255)
INK = (46, 66, 64, 255)
MUTED = (90, 110, 107, 255)
GREEN = (63, 111, 103, 255)
ACCENT = (165, 133, 78, 255)
LINE = (220, 231, 226, 255)


def rounded_icon(size: int) -> Image.Image:
    """青绿圆角方底 + 纸白“艺”字。"""
    scale = 4
    side = size * scale
    icon = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    radius = round(side * 0.22)
    draw.rounded_rectangle((0, 0, side - 1, side - 1), radius=radius, fill=GREEN)

    font = ImageFont.truetype(str(FONT), round(side * 0.62))
    left, top, right, bottom = draw.textbbox((0, 0), "艺", font=font)
    draw.text(
        ((side - (right - left)) / 2 - left, (side - (bottom - top)) / 2 - top),
        "艺",
        font=font,
        fill=PAPER,
    )
    return icon.resize((size, size), Image.LANCZOS)


def cover() -> Image.Image:
    """1200 × 630 分享封面：左侧文字，右侧水彩。"""
    width, height = 1200, 630
    card = Image.new("RGB", (width, height), PAPER)
    draw = ImageDraw.Draw(card)

    art_w = 520
    art = Image.open(ART).convert("RGB")
    art = art.resize((art_w, round(art_w * art.height / art.width)), Image.LANCZOS)
    art_x, art_y = width - art_w - 80, (height - art.height) // 2
    draw.rectangle(
        (art_x - 1, art_y - 1, art_x + art_w, art_y + art.height),
        outline=LINE,
        width=1,
    )
    card.paste(art, (art_x, art_y))

    title_font = ImageFont.truetype(str(FONT), 62)
    sub_font = ImageFont.truetype(str(FONT), 26)
    label_font = ImageFont.truetype(str(FONT), 20)

    x = 88
    draw.text((x, 176), "个人作品集", font=label_font, fill=MUTED)
    draw.line((x, 224, x + 48, 224), fill=ACCENT, width=2)
    draw.text((x, 252), "张艺的作品集", font=title_font, fill=INK)
    draw.text(
        (x, 352),
        "原创剧本 · 影评随笔 · 影像成片",
        font=sub_font,
        fill=MUTED,
    )
    draw.text((x, 394), "舞台实践 · 声音时间", font=sub_font, fill=MUTED)
    return card


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if not FONT.is_file():
        raise SystemExit(f"找不到字体：{FONT}")

    rounded_icon(32).save(OUT / "favicon-32.png", optimize=True)
    rounded_icon(180).save(OUT / "apple-touch-icon.png", optimize=True)
    cover().save(OUT / "og-cover.jpg", quality=90, optimize=True, progressive=True)

    for name in ("favicon-32.png", "apple-touch-icon.png", "og-cover.jpg"):
        path = OUT / name
        print(f"{name}  {path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
