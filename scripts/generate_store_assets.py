from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "store-assets"
LOGO = ROOT / "assets" / "branding" / "lingora-logo.png"
REGULAR = "C:/Windows/Fonts/segoeui.ttf"
BOLD = "C:/Windows/Fonts/segoeuib.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(BOLD if bold else REGULAR, size)


def gradient(
    size: tuple[int, int], start: tuple[int, int, int], end: tuple[int, int, int]
) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            ratio = (x / width * 0.62) + (y / height * 0.38)
            pixels[x, y] = tuple(
                round(a + (b - a) * ratio) for a, b in zip(start, end, strict=True)
            )
    return image


def glass(
    image: Image.Image,
    box: tuple[int, int, int, int],
    radius: int = 26,
    fill=(13, 19, 36, 220),
    outline=(125, 140, 181, 60),
) -> None:
    overlay = Image.new("RGBA", image.size)
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle(box, radius, fill=fill, outline=outline, width=2)
    overlay = overlay.filter(ImageFilter.GaussianBlur(0.3))
    image.alpha_composite(overlay)


def paste_logo(image: Image.Image, xy: tuple[int, int], size: int) -> None:
    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((size, size), Image.Resampling.LANCZOS)
    image.alpha_composite(logo, xy)


def label(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    size: int,
    color=(245, 247, 255),
    bold=False,
) -> None:
    draw.text(xy, text, font=font(size, bold), fill=color)


def brand(image: Image.Image, x: int, y: int, compact: bool = False) -> None:
    paste_logo(image, (x, y), 64 if compact else 78)
    draw = ImageDraw.Draw(image)
    label(draw, (x + (74 if compact else 92), y + 7), "Lingora", 28 if compact else 34, bold=True)
    if not compact:
        label(draw, (x + 92, y + 49), "Live translation for every tab", 15, (160, 173, 201))


def popup_panel(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    glass(image, box, 30, (10, 14, 29, 238), (141, 117, 255, 110))
    draw = ImageDraw.Draw(image)
    paste_logo(image, (x1 + 26, y1 + 22), 58)
    label(draw, (x1 + 96, y1 + 26), "Lingora", 23, bold=True)
    label(draw, (x1 + 96, y1 + 55), "Translate this tab live", 13, (145, 157, 183))
    draw.rounded_rectangle(
        (x2 - 74, y1 + 28, x2 - 26, y1 + 60), 10, fill=(39, 46, 69), outline=(93, 105, 140)
    )
    label(draw, (x2 - 63, y1 + 34), "FA", 13, (225, 232, 250), bold=True)

    glass(image, (x1 + 24, y1 + 104, x2 - 24, y1 + 188), 17, (17, 50, 60, 185), (76, 226, 217, 90))
    draw.ellipse((x1 + 42, y1 + 127, x1 + 60, y1 + 145), fill=(87, 229, 224))
    label(draw, (x1 + 76, y1 + 117), "Selected-tab consent", 15, bold=True)
    label(draw, (x1 + 76, y1 + 143), "Audio goes only to Google Gemini", 12, (163, 187, 194))

    glass(image, (x1 + 24, y1 + 207, x2 - 24, y1 + 263), 15, (18, 24, 42, 210), (100, 114, 151, 60))
    draw.ellipse((x1 + 43, y1 + 228, x1 + 55, y1 + 240), fill=(55, 211, 153))
    label(draw, (x1 + 70, y1 + 220), "Ready to translate", 14, bold=True)
    label(draw, (x2 - 131, y1 + 221), "AUTO → FA", 13, (87, 229, 224), bold=True)

    glass(image, (x1 + 24, y1 + 284, x2 - 24, y1 + 405), 17, (23, 26, 52, 215), (139, 92, 246, 90))
    label(draw, (x1 + 42, y1 + 302), "TRANSLATION", 11, (87, 229, 224), bold=True)
    label(draw, (x1 + 42, y1 + 337), "Every voice, in your language.", 19, bold=True)
    label(draw, (x1 + 42, y1 + 371), "Sentence-sized captions stay readable.", 13, (174, 180, 201))

    label(draw, (x1 + 26, y1 + 432), "MY OUTPUT MIX", 11, (139, 154, 187), bold=True)
    channels = [
        ("Original audio", False),
        ("Dubbed audio", True),
        ("Source captions", False),
        ("Translated captions", True),
    ]
    channel_gap = 16
    channel_width = (x2 - x1 - 48 - channel_gap) // 2
    for index, (name, enabled) in enumerate(channels):
        column, row = index % 2, index // 2
        bx = x1 + 24 + column * (channel_width + channel_gap)
        by = y1 + 459 + row * 61
        draw.rounded_rectangle(
            (bx, by, bx + channel_width, by + 47),
            12,
            fill=(38, 31, 72) if enabled else (19, 25, 41),
            outline=(139, 92, 246) if enabled else (75, 84, 111),
            width=2,
        )
        draw.rounded_rectangle(
            (bx + 12, by + 14, bx + 31, by + 33),
            5,
            fill=(139, 92, 246) if enabled else (42, 48, 65),
            outline=(176, 151, 255),
        )
        if enabled:
            draw.line((bx + 17, by + 23, bx + 21, by + 28, bx + 28, by + 18), fill="white", width=2)
        label(draw, (bx + 42, by + 13), name, 12, (232, 235, 246))

    draw.rounded_rectangle(
        (x1 + 24, y2 - 74, x2 - 24, y2 - 24),
        15,
        fill=(116, 78, 240),
        outline=(181, 160, 255),
        width=2,
    )
    label(draw, (x1 + 142, y2 - 61), "Start translation", 17, bold=True)


def screenshot_live() -> Image.Image:
    image = gradient((1280, 800), (6, 10, 24), (14, 35, 47)).convert("RGBA")
    draw = ImageDraw.Draw(image)
    brand(image, 70, 55)
    label(draw, (72, 188), "Hear every tab", 61, bold=True)
    label(draw, (72, 257), "in your language.", 61, (111, 238, 226), bold=True)
    label(
        draw,
        (75, 348),
        "Live dubbed audio and captions—without the desktop app.",
        22,
        (174, 183, 208),
    )
    for index, text in enumerate(
        ("Selected-tab capture", "Four independent channels", "English + Persian UI")
    ):
        y = 428 + index * 67
        draw.rounded_rectangle(
            (76, y, 470, y + 48), 18, fill=(20, 30, 51), outline=(68, 82, 112), width=2
        )
        draw.ellipse((96, y + 16, 112, y + 32), fill=(87, 229, 224))
        label(draw, (128, y + 11), text, 17, bold=True)
    popup_panel(image, (720, 38, 1208, 766))
    return image


def screenshot_captions() -> Image.Image:
    image = gradient((1280, 800), (7, 12, 27), (23, 18, 47)).convert("RGBA")
    draw = ImageDraw.Draw(image)
    brand(image, 54, 35, compact=True)
    glass(image, (54, 121, 1226, 728), 34, (7, 12, 23, 238), (106, 121, 153, 75))
    # Abstract rights-clear media scene.
    draw.rounded_rectangle((82, 150, 1198, 690), 24, fill=(17, 30, 45))
    draw.ellipse((830, 174, 1145, 489), fill=(34, 63, 72))
    draw.polygon([(120, 580), (420, 270), (690, 580)], fill=(35, 54, 72))
    draw.polygon([(397, 580), (713, 223), (1040, 580)], fill=(28, 45, 62))
    draw.ellipse((575, 315, 690, 430), fill=(116, 78, 240))
    draw.polygon([(620, 345), (620, 403), (670, 374)], fill="white")
    draw.rounded_rectangle(
        (905, 174, 1164, 220), 17, fill=(11, 18, 31), outline=(87, 229, 224), width=2
    )
    draw.ellipse((925, 190, 940, 205), fill=(55, 211, 153))
    label(draw, (954, 184), "Lingora translating live", 14, bold=True)
    glass(image, (192, 494, 1088, 632), 24, (4, 7, 15, 225), (159, 122, 255, 100))
    label(draw, (340, 519), "Source: Make every lesson easier to follow.", 17, (172, 181, 205))
    label(
        draw,
        (265, 558),
        "Translation: هر درس را راحت‌تر دنبال کنید.",
        28,
        (242, 233, 255),
        bold=True,
    )
    label(
        draw,
        (84, 748),
        "Move • Resize • Scroll • Choose either subtitle track",
        18,
        (151, 163, 192),
    )
    return image


def screenshot_mixer() -> Image.Image:
    image = gradient((1280, 800), (8, 12, 28), (13, 42, 48)).convert("RGBA")
    draw = ImageDraw.Draw(image)
    brand(image, 62, 44)
    label(draw, (62, 166), "Your translation. Your mix.", 49, bold=True)
    label(
        draw,
        (64, 228),
        "Combine any audio and subtitle channels independently.",
        20,
        (163, 176, 205),
    )
    names = [
        ("Original audio", "Keep context"),
        ("Dubbed audio", "Hear the translation"),
        ("Source captions", "Follow every word"),
        ("Translated captions", "Read in your language"),
    ]
    for index, (title, subtitle) in enumerate(names):
        column, row = index % 2, index // 2
        x, y = 64 + column * 390, 317 + row * 158
        glass(image, (x, y, x + 356, y + 126), 22, (15, 24, 41, 220), (102, 86, 163, 90))
        draw.rounded_rectangle(
            (x + 24, y + 25, x + 62, y + 63), 10, fill=(139, 92, 246), outline=(189, 170, 255)
        )
        draw.line((x + 34, y + 43, x + 42, y + 52, x + 55, y + 34), fill="white", width=4)
        label(draw, (x + 82, y + 22), title, 19, bold=True)
        label(draw, (x + 82, y + 56), subtitle, 14, (158, 170, 197))
        draw.line((x + 24, y + 99, x + 328, y + 99), fill=(86, 96, 123), width=5)
        draw.line((x + 24, y + 99, x + 245, y + 99), fill=(87, 229, 224), width=5)
        draw.ellipse((x + 234, y + 88, x + 256, y + 110), fill=(139, 92, 246))
    popup_panel(image, (850, 46, 1220, 754))
    return image


def promo(size: tuple[int, int], marquee: bool = False) -> Image.Image:
    image = gradient(size, (7, 11, 25), (16, 48, 54)).convert("RGBA")
    draw = ImageDraw.Draw(image)
    height = size[1]
    logo_size = 116 if marquee else 84
    paste_logo(image, (50 if marquee else 28, (height - logo_size) // 2), logo_size)
    text_x = 190 if marquee else 128
    label(
        draw,
        (text_x, height // 2 - (62 if marquee else 43)),
        "Lingora",
        54 if marquee else 34,
        bold=True,
    )
    label(
        draw,
        (text_x, height // 2 + (4 if marquee else 5)),
        "Live translation. Your way.",
        25 if marquee else 15,
        (108, 233, 225),
        bold=True,
    )
    if marquee:
        glass(image, (845, 130, 1335, 430), 30, (12, 17, 34, 220), (139, 92, 246, 100))
        label(draw, (900, 180), "Original audio", 17, (171, 179, 202))
        label(draw, (900, 222), "Dubbed audio", 22, bold=True)
        label(draw, (900, 274), "Source captions", 17, (171, 179, 202))
        label(draw, (900, 316), "Translated captions", 22, (87, 229, 224), bold=True)
    return image


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    icon = Image.new("RGBA", (128, 128))
    paste_logo(icon, (16, 16), 96)
    icon.save(OUTPUT / "icon-128.png", optimize=True)
    screenshot_live().convert("RGB").save(
        OUTPUT / "screenshot-01-live-translation.png", optimize=True
    )
    screenshot_mixer().convert("RGB").save(OUTPUT / "screenshot-02-output-mixer.png", optimize=True)
    screenshot_captions().convert("RGB").save(
        OUTPUT / "screenshot-03-floating-captions.png", optimize=True
    )
    promo((440, 280)).convert("RGB").save(OUTPUT / "small-promo-440x280.png", optimize=True)
    promo((1400, 560), marquee=True).convert("RGB").save(
        OUTPUT / "marquee-1400x560.png", optimize=True
    )


if __name__ == "__main__":
    main()
