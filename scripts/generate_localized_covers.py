"""Generate localized README/marketing covers from the verified English capture."""
# Marketing copy is intentionally kept verbatim for image rendering.
# ruff: noqa: E501

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BG = Image.open(ROOT / "assets/branding/marketing-background-v2.png").convert("RGBA")
LOGO = Image.open(ROOT / "assets/branding/avorythm-logo.png").convert("RGBA")
CAPTURE = Image.open(ROOT / "docs/images/extension/player-en.png").convert("RGBA")
FONT_DIR = Path("C:/Windows/Fonts")
FONT = ImageFont.truetype(FONT_DIR / "NotoSans-Bold.ttf", 42)
SMALL = ImageFont.truetype(FONT_DIR / "NotoSans-Regular.ttf", 22)
COPY = {
    "ar": ("ترجمة بالذكاء الاصطناعي", "شاهد بلغتك · دبلجة مباشرة · ترجمة فورية"),
    "de": ("KI-Übersetzung für jedes Video", "Live-Dubbing · Untertitel · 20+ Sprachen"),
    "fr": ("Traduisez chaque vidéo avec l’IA", "Doublage en direct · sous-titres · 20+ langues"),
    "it": ("Traduci ogni video con l’IA", "Doppiaggio live · sottotitoli · 20+ lingue"),
    "ru": ("Перевод любого видео с ИИ", "Живая озвучка · субтитры · 20+ языков"),
}

def fit(im, size):
    return ImageOps.contain(im, size, Image.Resampling.LANCZOS)

def make(locale, size):
    title, subtitle = COPY[locale]
    canvas = ImageOps.fit(BG, size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(Image.new("RGBA", size, (1, 7, 21, 76)))
    canvas.alpha_composite(fit(LOGO, (72, 72)), (58, 44))
    draw = ImageDraw.Draw(canvas)
    heading_font = ImageFont.truetype(FONT_DIR / "tahomabd.ttf", 42) if locale == "ar" else FONT
    small_font = ImageFont.truetype(FONT_DIR / "tahoma.ttf", 22) if locale == "ar" else SMALL
    draw.text((150, 48), "Avorythm", font=heading_font, fill=(249, 251, 255))
    draw.text((150, 100), title, font=small_font, fill=(105, 235, 224))
    panel = fit(CAPTURE, (size[0] - 220, int(size[1] * 0.66)))
    x, y = (size[0] - panel.width) // 2, int(size[1] * 0.24)
    shadow = Image.new("RGBA", size)
    shadow.alpha_composite(Image.new("RGBA", panel.size, (0, 0, 0, 180)).filter(ImageFilter.GaussianBlur(24)), (x, y + 14))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(panel, (x, y))
    draw = ImageDraw.Draw(canvas)
    draw.text((58, size[1] - 56), subtitle, font=small_font, fill=(229, 235, 255))
    return canvas.convert("RGB")

for locale in COPY:
    make(locale, (1600, 900)).save(ROOT / "assets/branding" / f"readme-cover-{locale}.png")
    make(locale, (1280, 640)).save(ROOT / "assets/branding" / f"github-social-{locale}.png")
    make(locale, (1600, 1000)).save(ROOT / "assets/marketing" / f"desktop-cover-{locale}.png")
