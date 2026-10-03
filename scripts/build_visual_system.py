"""Build the final visual system from real product captures and generated art.

The captures come from the shipped extension HTML/CSS/JS with synthetic local
demo media. This script only composes local files; it never contacts a provider.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CAP = ROOT / "docs/images/campaign"
STORE = ROOT / "store-assets"
BRAND = ROOT / "assets/branding"
MARKETING = ROOT / "assets/marketing"
ART = ROOT / "assets/branding/signal-sculpture-v4.png"
if not ART.exists():
    ART = ROOT / "assets/branding/signal-sculpture-v3.png"
COAST = ROOT / "assets/marketing/source-demo-v3.png"
LOGO = ROOT / "assets/branding/avorythm-logo.png"

NAVY = (7, 10, 22, 255)
INK = (239, 243, 252, 255)
MUTED = (164, 175, 198, 255)
AQUA = (78, 225, 216, 255)
VIOLET = (139, 115, 255, 255)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = {
        "latin": ["C:/Windows/Fonts/NotoSans-Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"],
        "regular": ["C:/Windows/Fonts/NotoSans-Regular.ttf", "C:/Windows/Fonts/arial.ttf"],
        "rtl": ["C:/Windows/Fonts/tahoma.ttf", "C:/Windows/Fonts/arial.ttf"],
        "cjk": ["C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/NotoSans-Regular.ttf"],
    }
    for path in candidates[name]:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


TEXT = {
    "en": {
        "title": "Watch in your language.",
        "sub": "AI live dubbing for any tab",
        "bullets": [
            "Live translated speech",
            "Source + translated captions",
            "Synchronized playback & export",
        ],
        "labels": [
            "Start translation",
            "Control every channel",
            "Tune synchronized playback",
            "Play with a stable buffer",
            "Keep both caption tracks",
        ],
        "subtitle_source": "Every new path tells a new story.",
        "subtitle_translated": "Every new path tells a new story.",
        "promo": "Live dubbing · captions · synchronized playback",
        "cover": "Hear every voice—or just read it—in your language.",
    },
    "fa": {
        "title": "هر چیزی را به زبان خودت ببین.",
        "sub": "دوبلهٔ زنده با هوش مصنوعی برای هر تب",
        "bullets": ["صدای ترجمه‌شدهٔ زنده", "زیرنویس اصلی و ترجمه‌شده", "پخش هماهنگ و خروجی گرفتن"],
        "labels": [
            "شروع ترجمه",
            "کنترل کامل صداها",
            "تنظیم پلیر هماهنگ",
            "پخش با بافر پایدار",
            "نمایش هر دو زیرنویس",
        ],
        "subtitle_source": "Every new path tells a new story.",
        "subtitle_translated": "هر مسیر تازه، داستان تازه‌ای آغاز می‌کند.",
        "promo": "دوبلهٔ زنده · زیرنویس · پخش هماهنگ",
        "cover": "هر صدایی را به زبان خودت بشنو؛ یا فقط آن را بخوان.",
    },
    "zh-CN": {
        "title": "用你的语言观看。",
        "sub": "为任意标签页提供 AI 实时配音",
        "bullets": ["实时翻译语音", "原文与译文字幕", "同步播放与导出"],
        "labels": [
            "开始翻译",
            "独立控制每个频道",
            "调整同步播放器",
            "使用稳定缓冲播放",
            "保留两种字幕",
        ],
        "subtitle_source": "Every new path tells a new story.",
        "subtitle_translated": "每一条新路，都讲述一个新的故事。",
        "promo": "实时配音 · 字幕 · 同步播放",
        "cover": "用你的语言听懂每一种声音，也可以只阅读字幕。",
    },
    "ar": {
        "title": "شاهد بلغتك.",
        "sub": "دبلجة مباشرة بالذكاء الاصطناعي لأي تبويب",
        "bullets": ["صوت مترجم مباشر", "ترجمة أصلية ومترجمة", "تشغيل متزامن وتصدير"],
        "labels": [
            "بدء الترجمة",
            "تحكم بكل قناة",
            "ضبط المشغل المتزامن",
            "تشغيل بذاكرة مؤقتة مستقرة",
            "الاحتفاظ بمساري الترجمة",
        ],
        "promo": "دبلجة مباشرة · ترجمات · تشغيل متزامن",
        "cover": "اسمع كل صوت بلغتك، أو اكتفِ بقراءة الترجمة.",
        "subtitle_source": "Every new path tells a new story.",
        "subtitle_translated": "كل طريق جديد يروي قصة جديدة.",
    },
    "de": {
        "title": "In deiner Sprache ansehen.",
        "sub": "KI-Live-Dubbing für jeden Tab",
        "bullets": [
            "Live übersetzte Sprache",
            "Original- und übersetzte Untertitel",
            "Synchronisierte Wiedergabe und Export",
        ],
        "labels": [
            "Übersetzung starten",
            "Jeden Kanal steuern",
            "Synchronisierten Player abstimmen",
            "Mit stabilem Puffer abspielen",
            "Beide Untertitelspuren behalten",
        ],
        "promo": "Live-Dubbing · Untertitel · Synchronisierte Wiedergabe",
        "cover": "Höre jede Stimme in deiner Sprache – oder lies einfach mit.",
        "subtitle_source": "Every new path tells a new story.",
        "subtitle_translated": "Jeder neue Weg erzählt eine neue Geschichte.",
    },
    "fr": {
        "title": "Regardez dans votre langue.",
        "sub": "Doublage IA en direct pour chaque onglet",
        "bullets": [
            "Voix traduite en direct",
            "Sous-titres source et traduits",
            "Lecture synchronisée et export",
        ],
        "labels": [
            "Démarrer la traduction",
            "Contrôler chaque canal",
            "Régler le lecteur synchronisé",
            "Lire avec un tampon stable",
            "Garder les deux pistes de sous-titres",
        ],
        "promo": "Doublage en direct · sous-titres · lecture synchronisée",
        "cover": "Écoutez chaque voix dans votre langue, ou lisez simplement.",
        "subtitle_source": "Every new path tells a new story.",
        "subtitle_translated": "Chaque nouveau chemin raconte une nouvelle histoire.",
    },
    "it": {
        "title": "Guarda nella tua lingua.",
        "sub": "Doppiaggio IA live per ogni scheda",
        "bullets": [
            "Voce tradotta in diretta",
            "Sottotitoli originali e tradotti",
            "Riproduzione sincronizzata ed export",
        ],
        "labels": [
            "Avvia traduzione",
            "Controlla ogni canale",
            "Regola il player sincronizzato",
            "Riproduci con buffer stabile",
            "Mantieni entrambe le tracce",
        ],
        "promo": "Doppiaggio live · sottotitoli · riproduzione sincronizzata",
        "cover": "Ascolta ogni voce nella tua lingua, oppure limitati a leggere.",
        "subtitle_source": "Every new path tells a new story.",
        "subtitle_translated": "Ogni nuovo percorso racconta una nuova storia.",
    },
    "ru": {
        "title": "Смотрите на своём языке.",
        "sub": "Живая озвучка с ИИ для любой вкладки",
        "bullets": [
            "Перевод речи в реальном времени",
            "Оригинальные и переведённые субтитры",
            "Синхронное воспроизведение и экспорт",
        ],
        "labels": [
            "Начать перевод",
            "Управлять каждым каналом",
            "Настроить синхронный плеер",
            "Воспроизводить со стабильным буфером",
            "Сохранить обе дорожки субтитров",
        ],
        "promo": "Живая озвучка · субтитры · синхронное воспроизведение",
        "cover": "Слушайте любой голос на своём языке или просто читайте.",
        "subtitle_source": "Every new path tells a new story.",
        "subtitle_translated": "Каждый новый путь рассказывает новую историю.",
    },
}

LOCALIZED_PROMO = {
    "ar": ("شاهد بلغتك.", "دبلجة مباشرة بالذكاء الاصطناعي"),
    "de": ("In deiner Sprache ansehen.", "KI-Live-Dubbing für jeden Tab"),
    "fr": ("Regardez dans votre langue.", "Doublage IA en direct pour chaque onglet"),
    "it": ("Guarda nella tua lingua.", "Doppiaggio IA live per ogni scheda"),
    "ru": ("Смотрите на своём языке.", "Живая озвучка с ИИ для любой вкладки"),
}


def canvas(size: tuple[int, int], art: bool = True) -> Image.Image:
    result = Image.new("RGBA", size, NAVY)
    gradient = ImageDraw.Draw(result)
    end = (15, 21, 43)
    for y in range(size[1]):
        t = y / max(1, size[1] - 1)
        color = tuple(round(NAVY[i] * (1 - t) + end[i] * t) for i in range(3)) + (255,)
        gradient.line((0, y, size[0], y), fill=color)
    if art and ART.exists():
        shape = ImageOps.fit(Image.open(ART).convert("RGBA"), size, Image.Resampling.LANCZOS)
        shape.putalpha(shape.getchannel("A").point(lambda value: value * 0.08))
        result.alpha_composite(shape)
    return result


def logo_and_brand(image: Image.Image, locale: str, x: int, y: int, scale: int = 1) -> None:
    mark = ImageOps.contain(
        Image.open(LOGO).convert("RGBA"), (54 * scale, 54 * scale), Image.Resampling.LANCZOS
    )
    image.alpha_composite(mark, (x, y))
    draw = ImageDraw.Draw(image)
    title_font = font(
        "rtl" if locale in {"fa", "ar"} else "cjk" if locale == "zh-CN" else "latin", 30 * scale
    )
    draw.text((x + 70 * scale, y + 6 * scale), "Avorythm", font=title_font, fill=INK)


def fit_panel(source: Path, box: tuple[int, int], radius: int = 24) -> Image.Image:
    panel = ImageOps.contain(Image.open(source).convert("RGBA"), box, Image.Resampling.LANCZOS)
    background = Image.new("RGBA", panel.size, (10, 14, 28, 255))
    background.alpha_composite(panel)
    mask = Image.new("L", background.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, background.width - 1, background.height - 1), radius, fill=255
    )
    background.putalpha(mask)
    return background


def shadowed(image: Image.Image, panel: Image.Image, xy: tuple[int, int]) -> None:
    x, y = xy
    shadow = Image.new("RGBA", panel.size, (0, 0, 0, 155))
    shadow.putalpha(panel.getchannel("A"))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    image.alpha_composite(shadow, (x, y + 18))
    image.alpha_composite(panel, xy)


def contained_on_canvas(source: Image.Image, size: tuple[int, int], fill=NAVY) -> Image.Image:
    """Resize without cropping important product UI or logo edges."""
    result = Image.new("RGBA", size, fill)
    panel = ImageOps.contain(source.convert("RGBA"), size, Image.Resampling.LANCZOS)
    result.alpha_composite(panel, ((size[0] - panel.width) // 2, (size[1] - panel.height) // 2))
    return result


def localized_font(locale: str, size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    if locale in {"fa", "ar"}:
        return font("rtl", size)
    if locale == "zh-CN":
        return font("cjk", size)
    return font("latin" if bold else "regular", size)


def capture_path(locale: str, name: str) -> Path:
    """Use the localized real capture when available, otherwise the verified English UI."""
    localized = CAP / f"{name}-{locale}.png"
    return localized if localized.exists() else CAP / f"{name}-en.png"


def store_image(locale: str, number: int) -> Image.Image:
    text = TEXT[locale]
    image = canvas((1280, 800), art=number != 4)
    draw = ImageDraw.Draw(image)
    if number == 1:
        logo_and_brand(image, locale, 52, 46)
        draw.text((52, 145), text["title"], font=localized_font(locale, 48), fill=INK)
        draw.text((52, 210), text["sub"], font=localized_font(locale, 23, False), fill=AQUA)
        for index, value in enumerate(text["bullets"]):
            y = 315 + index * 64
            draw.ellipse((54, y + 5, 66, y + 17), fill=AQUA)
            draw.text((88, y - 4), value, font=localized_font(locale, 24), fill=INK)
        panel = fit_panel(capture_path(locale, "popup"), (440, 720), 22)
        shadowed(image, panel, (770, 42))
    elif number == 2:
        logo_and_brand(image, locale, 44, 32)
        draw.text((44, 120), text["labels"][1], font=localized_font(locale, 35), fill=INK)
        draw.text(
            (44, 168),
            text["bullets"][0] + "  ·  " + text["bullets"][1],
            font=localized_font(locale, 18, False),
            fill=AQUA,
        )
        panel = fit_panel(capture_path(locale, "settings"), (1160, 570), 22)
        shadowed(image, panel, ((1280 - panel.width) // 2, 224))
    elif number == 3:
        logo_and_brand(image, locale, 44, 30)
        draw.text((44, 116), text["labels"][2], font=localized_font(locale, 35), fill=INK)
        draw.text((44, 164), text["bullets"][2], font=localized_font(locale, 18, False), fill=AQUA)
        panel = fit_panel(capture_path(locale, "sync-settings"), (1160, 550), 22)
        shadowed(image, panel, ((1280 - panel.width) // 2, 224))
    elif number == 4:
        # The player is the hero: no split-screen or decorative inset.
        source = Image.open(capture_path(locale, "player")).convert("RGBA")
        image = ImageOps.fit(source, (1280, 800), Image.Resampling.LANCZOS)
        draw = ImageDraw.Draw(image)
        draw.rectangle((0, 0, 1280, 64), fill=(5, 8, 18, 230))
        logo_and_brand(image, locale, 34, 8, scale=1)
    else:
        source = ImageOps.fit(
            Image.open(COAST).convert("RGBA"), (1280, 800), Image.Resampling.LANCZOS
        )
        image = source
        image.alpha_composite(Image.new("RGBA", image.size, (0, 5, 15, 34)))
        # Match the real frosted subtitle card from the shipped overlay.
        card = Image.new("RGBA", (850, 164), (8, 13, 25, 235))
        mask = Image.new("L", card.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 849, 163), 24, fill=255)
        card.putalpha(mask)
        card_draw = ImageDraw.Draw(card)
        card_draw.text(
            (425, 32),
            text["subtitle_source"],
            anchor="ma",
            font=localized_font(locale, 21, False),
            fill=(184, 194, 211, 255),
        )
        card_draw.text(
            (425, 88),
            text["subtitle_translated"],
            anchor="ma",
            font=localized_font(locale, 28),
            fill=INK,
        )
        shadowed(image, card, (215, 550))
        logo_and_brand(image, locale, 38, 26)
        draw = ImageDraw.Draw(image)
        draw.text((38, 93), text["labels"][4], font=localized_font(locale, 28), fill=INK)
    return image.convert("RGB")


def promo(locale: str, size: tuple[int, int], marquee: bool = False) -> Image.Image:
    image = canvas(size, art=False)
    sculpture = ImageOps.fit(Image.open(ART).convert("RGBA"), size, Image.Resampling.LANCZOS)
    sculpture.putalpha(sculpture.getchannel("A").point(lambda value: value * 0.98))
    image.alpha_composite(sculpture, (0, 0))
    copy = TEXT.get(locale, TEXT["en"])
    left = 34 if not marquee else 58
    top = 120 if not marquee else 185
    title_size = 25 if not marquee else 48
    sub_size = 14 if not marquee else 24
    title = copy["title"] if locale in TEXT else LOCALIZED_PROMO[locale][0]
    sub = copy["promo"] if locale in TEXT else LOCALIZED_PROMO[locale][1]
    # A quiet translucent panel keeps the marketing copy readable over any art.
    panel_right = int(size[0] * (0.59 if not marquee else 0.47))
    image.alpha_composite(Image.new("RGBA", (panel_right, size[1]), (3, 8, 22, 220)), (0, 0))
    logo_and_brand(
        image,
        locale if locale in TEXT else "en",
        left,
        28 if not marquee else 46,
        1 if not marquee else 2,
    )
    draw = ImageDraw.Draw(image)
    draw.text(
        (left, top),
        title,
        font=localized_font(locale if locale in TEXT else "en", title_size),
        fill=INK,
    )
    draw.text(
        (left, top + title_size + 11),
        sub,
        font=localized_font(locale if locale in TEXT else "en", sub_size, False),
        fill=AQUA,
    )
    if marquee:
        for index, label in enumerate(copy["bullets"]):
            x = left + index * 205
            y = size[1] - 106
            draw.rounded_rectangle(
                (x, y, x + 200, y + 40),
                20,
                fill=(18, 27, 52, 245),
                outline=(78, 225, 216, 150),
                width=1,
            )
            draw.ellipse((x + 13, y + 15, x + 21, y + 23), fill=AQUA)
            draw.text(
                (x + 32, y + 10),
                label,
                font=localized_font(locale if locale in TEXT else "en", 10, False),
                fill=INK,
            )
    else:
        draw.rounded_rectangle(
            (left, size[1] - 58, min(size[0] - 20, left + 290), size[1] - 22),
            18,
            fill=(18, 27, 52, 245),
            outline=(78, 225, 216, 180),
            width=1,
        )
        draw.text(
            (left + 18, size[1] - 49), "Open source · Gemini AI", font=font("regular", 12), fill=INK
        )
    return image.convert("RGB")


def poster(locale: str) -> Image.Image:
    """Build a portrait launch poster without cropping the product UI or copy."""
    size = (1080, 1350)
    image = canvas(size, art=False)
    art = ImageOps.fit(Image.open(ART).convert("RGBA"), (1080, 720), Image.Resampling.LANCZOS)
    image.alpha_composite(art, (0, 0))
    image.alpha_composite(Image.new("RGBA", (1080, 760), (3, 8, 22, 238)), (0, 590))
    core = TEXT.get(locale, TEXT["en"])
    title = core["title"] if locale in TEXT else LOCALIZED_PROMO[locale][0]
    sub = core["sub"] if locale in TEXT else LOCALIZED_PROMO[locale][1]
    labels = core["bullets"] if locale in TEXT else TEXT["en"]["bullets"]
    logo_and_brand(image, locale if locale in TEXT else "en", 58, 635, scale=1)
    draw = ImageDraw.Draw(image)
    draw.text(
        (58, 735), title, font=localized_font(locale if locale in TEXT else "en", 46), fill=INK
    )
    draw.text(
        (58, 805),
        sub,
        font=localized_font(locale if locale in TEXT else "en", 21, False),
        fill=AQUA,
    )
    for index, label in enumerate(labels):
        y = 930 + index * 75
        draw.ellipse((62, y + 8, 76, y + 22), fill=AQUA)
        draw.text(
            (102, y),
            label,
            font=localized_font(locale if locale in TEXT else "en", 25, False),
            fill=INK,
        )
    draw.text((58, 1280), "Open source · Gemini AI", font=font("regular", 18), fill=MUTED)
    return image.convert("RGB")


def main() -> None:
    names = {1: "popup", 2: "settings", 3: "sync-settings", 4: "player", 5: "subtitles"}
    for locale in TEXT:
        directory = STORE / locale
        directory.mkdir(parents=True, exist_ok=True)
        for number in range(1, 6):
            store_image(locale, number).save(
                directory / f"0{number}-{names[number]}.png",
                optimize=True,
            )
        promo(locale, (440, 280)).save(
            STORE / f"promo-small{'-' + locale if locale != 'en' else ''}.png", optimize=True
        )
        promo(locale, (1400, 560), marquee=True).save(
            STORE / f"promo-marquee{'-' + locale if locale != 'en' else ''}.png", optimize=True
        )
        # README / social / campaign variants use the same coherent visual system.
        hero = contained_on_canvas(store_image(locale, 4), (1600, 900))
        hero.save(
            BRAND / f"readme-cover{'-' + locale if locale != 'en' else ''}.png", optimize=True
        )
        if locale == "en":
            # Keep the explicit locale filename used by the public README stable.
            hero.save(BRAND / "readme-cover-en.png", optimize=True)
        # Render at GitHub's final 2:1 canvas so no logo or headline is cropped.
        promo(locale, (1280, 640), marquee=True).save(
            BRAND / f"github-social{'-' + locale if locale != 'en' else ''}.png", optimize=True
        )
        ImageOps.fit(store_image(locale, 1), (1600, 1000), Image.Resampling.LANCZOS).save(
            MARKETING / f"desktop-cover{'-' + locale if locale != 'en' else ''}.png", optimize=True
        )
        poster(locale).save(
            MARKETING / f"launch-poster{'-' + locale if locale != 'en' else ''}.png", optimize=True
        )
    # Existing localized artwork uses English UI captures with localized marketing copy.
    for locale in LOCALIZED_PROMO:
        promo(locale, (440, 280)).save(STORE / f"promo-small-{locale}.png", optimize=True)
        promo(locale, (1400, 560), marquee=True).save(
            STORE / f"promo-marquee-{locale}.png", optimize=True
        )
    print("Built the Avorythm visual system from current product captures.")


if __name__ == "__main__":
    main()
