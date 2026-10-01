"""Build polished, single-scene marketing assets from the real product captures."""
# Marketing copy is intentionally kept verbatim for image rendering.
# ruff: noqa: E501
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BG = Image.open(ROOT / "assets/branding/marketing-background-v2.png").convert("RGBA")
LOGO = Image.open(ROOT / "assets/branding/avorythm-logo.png").convert("RGBA")
STORE = ROOT / "store-assets"
DOCS = ROOT / "docs/images/extension"

FONT_DIR = Path("C:/Windows/Fonts")
FONT = ImageFont.truetype(FONT_DIR / "NotoSans-Bold.ttf", 30)
FONT_SMALL = ImageFont.truetype(FONT_DIR / "NotoSans-Regular.ttf", 17)
FONT_PROMO = ImageFont.truetype(FONT_DIR / "NotoSans-Bold.ttf", 26)

COPY = {
    "en": {
        "brand": "Avorythm", "eyebrow": "AI TRANSLATION · REAL PRODUCT UI",
        "labels": ["Live dubbing for any tab", "Secure settings · your key", "Buffered playback · stable timing", "Pause · seek · fullscreen · export", "Original + translated captions"],
        "promo_title": "Watch in your language", "promo_subtitle": "Live dubbing · captions · 20+ languages", "cover": "One workspace for every language",
    },
    "fa": {
        "brand": "Avorythm", "eyebrow": "ترجمه با هوش مصنوعی · رابط واقعی محصول",
        "labels": ["دوبلهٔ زنده برای هر تب", "تنظیمات امن · کلید شما", "پخش با بافر · زمان‌بندی پایدار", "توقف · جابه‌جایی · تمام‌صفحه · خروجی", "زیرنویس اصلی و ترجمه‌شده"],
        "promo_title": "هر چیزی را به زبان خودت ببین", "promo_subtitle": "دوبلهٔ زنده · زیرنویس · بیش از ۲۰ زبان", "cover": "یک فضای کاری برای همهٔ زبان‌ها",
    },
    "zh-CN": {
        "brand": "Avorythm", "eyebrow": "AI 翻译 · 真实产品界面",
        "labels": ["为任意标签页实时配音", "安全设置 · 使用你的密钥", "缓冲播放 · 稳定同步", "暂停 · 拖动 · 全屏 · 导出", "原文与译文字幕"],
        "promo_title": "用你的语言观看", "promo_subtitle": "实时配音 · 字幕 · 20+ 种语言", "cover": "一个工作区，覆盖所有语言",
    },
    # The current product UI ships in English, Persian and Simplified Chinese.
    # These localized marketing captions keep the translated README artwork
    # useful without pretending that the whole UI has been translated.
    "ar": {
        "brand": "Avorythm", "eyebrow": "ترجمة بالذكاء الاصطناعي · واجهة المنتج الحقيقية", "capture": "en",
        "labels": ["دبلجة مباشرة لأي تبويب", "إعدادات آمنة · مفتاحك", "تشغيل مع تخزين مؤقت · مزامنة مستقرة", "إيقاف · بحث · ملء الشاشة · تصدير", "ترجمة أصلية ومترجمة"],
        "promo_title": "شاهد بلغتك", "promo_subtitle": "دبلجة مباشرة · ترجمات · أكثر من ٢٠ لغة", "cover": "مساحة واحدة لكل اللغات",
    },
    "de": {
        "brand": "Avorythm", "eyebrow": "KI-ÜBERSETZUNG · ECHTE PRODUKT-UI", "capture": "en",
        "labels": ["Live-Dubbing für jeden Tab", "Sichere Einstellungen · dein Schlüssel", "Pufferwiedergabe · stabile Synchronisation", "Pause · Suche · Vollbild · Export", "Original- und übersetzte Untertitel"],
        "promo_title": "In deiner Sprache ansehen", "promo_subtitle": "Live-Dubbing · Untertitel · 20+ Sprachen", "cover": "Ein Arbeitsbereich für jede Sprache",
    },
    "fr": {
        "brand": "Avorythm", "eyebrow": "TRADUCTION IA · INTERFACE RÉELLE", "capture": "en",
        "labels": ["Doublage en direct pour chaque onglet", "Réglages sécurisés · votre clé", "Lecture avec tampon · synchro stable", "Pause · recherche · plein écran · export", "Sous-titres originaux et traduits"],
        "promo_title": "Regardez dans votre langue", "promo_subtitle": "Doublage en direct · sous-titres · 20+ langues", "cover": "Un espace pour toutes les langues",
    },
    "it": {
        "brand": "Avorythm", "eyebrow": "TRADUZIONE IA · UI REALE DEL PRODOTTO", "capture": "en",
        "labels": ["Doppiaggio live per ogni scheda", "Impostazioni sicure · la tua chiave", "Riproduzione bufferizzata · sync stabile", "Pausa · ricerca · schermo intero · export", "Sottotitoli originali e tradotti"],
        "promo_title": "Guarda nella tua lingua", "promo_subtitle": "Doppiaggio live · sottotitoli · 20+ lingue", "cover": "Un unico spazio per ogni lingua",
    },
    "ru": {
        "brand": "Avorythm", "eyebrow": "ПЕРЕВОД С ИИ · НАСТОЯЩИЙ ИНТЕРФЕЙС", "capture": "en",
        "labels": ["Живая озвучка любой вкладки", "Безопасные настройки · ваш ключ", "Буферное воспроизведение · стабильная синхронизация", "Пауза · поиск · полный экран · экспорт", "Оригинальные и переводные субтитры"],
        "promo_title": "Смотрите на своём языке", "promo_subtitle": "Живая озвучка · субтитры · 20+ языков", "cover": "Одно рабочее пространство для всех языков",
    },
}


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.contain(image.convert("RGBA"), size, Image.Resampling.LANCZOS)


def round_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def place_capture(canvas: Image.Image, capture: Image.Image, max_size: tuple[int, int], y: int) -> None:
    """Place a complete capture in one floating frame; never crop its UI."""
    image = fit(capture, max_size)
    x = (canvas.width - image.width) // 2
    frame = Image.new("RGBA", image.size, (10, 15, 31, 255))
    frame.alpha_composite(image, (0, 0))
    frame.putalpha(round_mask(frame.size, 24))
    shadow = Image.new("RGBA", canvas.size)
    shadow_box = Image.new("RGBA", frame.size, (0, 0, 0, 170))
    shadow_box.putalpha(round_mask(frame.size, 24))
    shadow.alpha_composite(shadow_box.filter(ImageFilter.GaussianBlur(20)), (x, y + 14))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(frame, (x, y))
    ImageDraw.Draw(canvas).rounded_rectangle((x, y, x + frame.width - 1, y + frame.height - 1), 24, outline=(145, 165, 230, 120), width=2)


def base(size: tuple[int, int], locale: str) -> Image.Image:
    canvas = ImageOps.fit(BG, size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(Image.new("RGBA", size, (1, 7, 21, 82)))
    copy = COPY[locale]
    canvas.alpha_composite(fit(LOGO, (56, 56)), (42, 28))
    draw = ImageDraw.Draw(canvas)
    draw.text((112, 29), copy["brand"], font=FONT, fill=(249, 251, 255))
    draw.text((112, 70), copy["eyebrow"], font=FONT_SMALL, fill=(102, 235, 224))
    return canvas


def store_screenshot(locale: str, source: str, label: str) -> Image.Image:
    canvas = base((1280, 800), locale)
    captures = {
        "popup": (DOCS / f"popup-{locale}.png", (390, 680), 102),
        "settings": (DOCS / f"settings-{locale}.png", (990, 360), 196),
        "sync-settings": (DOCS / f"sync-settings-{locale}.png", (590, 650), 108),
        "player": (DOCS / f"player-{locale}.png", (990, 600), 112),
        "subtitles": (DOCS / f"subtitles-{locale}.png", (1040, 585), 112),
    }
    path, max_size, y = captures[source]
    if not path.exists():
        path = DOCS / f"{source}-{COPY[locale].get('capture', 'en')}.png"
    place_capture(canvas, Image.open(path), max_size, y)
    ImageDraw.Draw(canvas).text((42, 750), label, font=FONT_SMALL, fill=(231, 237, 255))
    return canvas.convert("RGB")


def promo(locale: str, size: tuple[int, int]) -> Image.Image:
    copy = COPY[locale]
    canvas = base(size, locale)
    draw = ImageDraw.Draw(canvas)
    draw.text((42, 104), copy["promo_title"], font=FONT_PROMO, fill=(249, 251, 255))
    draw.text((42, 139), copy["promo_subtitle"], font=FONT_SMALL, fill=(150, 235, 232))
    capture_locale = COPY[locale].get("capture", locale)
    place_capture(canvas, Image.open(DOCS / f"subtitles-{capture_locale}.png"), (size[0] - 72, 112), 166)
    ImageDraw.Draw(canvas).text((42, size[1] - 30), copy["cover"], font=FONT_SMALL, fill=(229, 235, 255))
    return canvas.convert("RGB")


for locale, copy in COPY.items():
    for index, source in enumerate(("popup", "settings", "sync-settings", "player", "subtitles"), 1):
        out = STORE / locale / f"{index:02d}-{source}.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        store_screenshot(locale, source, copy["labels"][index - 1]).save(out, optimize=True)
    suffix = "" if locale == "en" else f"-{locale}"
    promo(locale, (440, 280)).save(STORE / f"promo-small{suffix}.png", optimize=True)

promo("en", (1400, 560)).save(STORE / "promo-marquee.png", optimize=True)
promo("en", (440, 280)).save(STORE / "promo-small.png", optimize=True)

for locale in COPY:
    suffix = "" if locale == "en" else f"-{locale}"
    store_screenshot(locale, "player", COPY[locale]["cover"]).resize((1600, 900), Image.Resampling.LANCZOS).save(ROOT / "assets/branding" / f"readme-cover{suffix}.png", optimize=True)
    store_screenshot(locale, "player", COPY[locale]["cover"]).resize((1280, 640), Image.Resampling.LANCZOS).save(ROOT / "assets/branding" / f"github-social{suffix}.png", optimize=True)
    store_screenshot(locale, "popup", COPY[locale]["cover"]).resize((1600, 1000), Image.Resampling.LANCZOS).save(ROOT / "assets/marketing" / f"desktop-cover{suffix}.png", optimize=True)
    store_screenshot(locale, "player", COPY[locale]["cover"]).resize((1080, 1350), Image.Resampling.LANCZOS).save(ROOT / "assets/marketing" / f"launch-poster{suffix}.png", optimize=True)
