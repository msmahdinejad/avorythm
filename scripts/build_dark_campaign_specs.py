"""Build localized prompt specs for the product-led dark campaign."""

# Prompt text is intentionally kept verbatim and readable in the generated brief.
# ruff: noqa: E501

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CAMPAIGN = ROOT / "output/imagegen/product-2026-10-05"
COPY = json.loads((ROOT / "scripts/imagegen/copy.json").read_text(encoding="utf-8"))
LOCALES = tuple(COPY)

BASE = (
    "Use case: text-localization. Create the entire finished image through "
    "image_generation. This is Avorythm's approved dark product-led campaign: "
    "opaque deep graphite #0D1117, crisp white and cool-gray typography, muted "
    "violet accent #8B72FF and tiny cyan details taken from real UI. Mature, "
    "calm software design like an established browser extension. Preserve the "
    "exact existing Avorythm logo from input2, including A/audio arrows and "
    "purple/cyan colors. Use modern medium-weight sans type, native language "
    "letterforms and generous margins. Never invent a product control. The "
    "dark product screenshot from input1 is the main visual and must stay "
    "upright, accurate, crisp and readable. Keep actual product UI labels in "
    "their supplied language; translate only external marketing copy. Fully "
    "opaque edge to edge; no transparency. Avoid neon, glow, gradient type, "
    "sunset scenery outside the video, glass sculpture, ribbons, spheres, "
    "collage, hard split panels, tilted devices, decorative ornaments, fake "
    "ratings, badges or claims, and excessive display lettering. No watermark. "
)


def localized_ui(locale: str, index: int) -> list[str]:
    if locale in {"fa", "zh-CN"}:
        names = {1: "popup", 2: "settings", 3: "popup", 4: "player", 5: "subtitles"}
        return [f"docs/images/campaign/{names[index]}-{locale}.png"]
    names = {1: "popup", 2: "settings", 3: "popup", 4: "player", 5: "subtitles"}
    return [f"docs/images/campaign/{names[index]}-en.png"]


def feature_job(locale: str, index: int) -> dict:
    text, support = COPY[locale]["features"][index - 1]
    ui = localized_ui(locale, index)
    return {
        "name": f"store-{locale}-{index}-dark.png",
        "size": [1280, 800],
        "references": [
            f"store-assets/en/{index:02d}-{ {1: 'popup', 2: 'settings', 3: 'sync-settings', 4: 'player', 5: 'subtitles'}[index]}.png",
            "assets/branding/avorythm-logo.png",
            *ui,
        ],
        "prompt": (
            BASE + f"Replace ONLY the external copy with exact {locale} text. Heading: "
            f'"{text}". Supporting line: "{support}". '
            + (
                "Input3 is the localized UI reference; preserve its native labels and "
                "RTL or Chinese layout inside the product surface. "
                if locale in {"fa", "zh-CN"}
                else "Input3 is an English UI reference; keep the product controls in English. "
            )
            + "Keep the same feature, crop, control fidelity and composition as the dark English target. "
            + "Use native typography and natural line breaks without shrinking text. "
            + "Do not add a footer, slogan, or extra screen. Preserve 1280x800 framing."
        ),
    }


def general_job(locale: str, kind: str) -> dict:
    text = COPY[locale]
    if kind == "hero":
        headline, support, footer = text["hero"], text["tagline"], text["footer"]
        size = [1600, 900]
        source = "dark-hero-en.png"
        ui = [f"docs/images/campaign/player-{locale if locale in {'fa', 'zh-CN'} else 'en'}.png"]
        detail = "Keep the single large player, the small target-language crop and exact dark composition."
    elif kind == "social":
        headline, support, footer = text["hero"], text["tagline"], ""
        size = [1280, 640]
        source = "social-en-dark.png"
        ui = [f"docs/images/campaign/player-{locale if locale in {'fa', 'zh-CN'} else 'en'}.png"]
        detail = "Keep one large player and the restrained short social-preview hierarchy."
    elif kind == "poster":
        headline, support, footer = text["hero"], text["tagline"], text["footer"]
        size = [1080, 1350]
        source = "poster-en-dark.png"
        ui = [f"docs/images/campaign/player-{locale if locale in {'fa', 'zh-CN'} else 'en'}.png"]
        detail = "Keep the native portrait layout, one player, target selector crop and three quiet feature lines."
    elif kind == "desktop":
        headline, support, footer = text["desktop"], text["desktopSub"], text["desktopFooter"]
        size = [1600, 1000]
        source = "desktop-en-dark.png"
        ui = ["docs/images/app-fa.png" if locale == "fa" else "docs/images/app-en.png"]
        detail = "Keep the entire desktop UI in its supplied language; only external headline, subhead and footer are localized."
    elif kind == "promo-small":
        headline, support, footer = text["tile"], text["tileSub"], ""
        size = [440, 280]
        source = "dark-promo-small-en.png"
        ui = []
        detail = "Keep the tiny clean feature illustration and the calm small-tile spacing."
    elif kind == "promo-marquee":
        headline, support, footer = text["hero"], text["tagline"], text["footer"]
        size = [1400, 560]
        source = "dark-marquee-en.png"
        ui = [f"docs/images/campaign/player-{locale if locale in {'fa', 'zh-CN'} else 'en'}.png"]
        detail = "Keep the two-zone but cohesive marquee hierarchy: short copy left, one accurate player right, no divider."
    else:
        raise ValueError(kind)
    rtl = locale in {"fa", "ar"}
    typography = (
        "Use Vazirmatn-like Persian medium typography, true RTL joining and natural right alignment. "
        if locale == "fa"
        else "Use professional Arabic sans with correct joining and RTL flow. "
        if locale == "ar"
        else "Use clean native Simplified Chinese sans with correct glyphs. "
        if locale == "zh-CN"
        else "Use native accents, punctuation and professional medium-weight letterforms. "
    )
    return {
        "name": f"{kind}-{locale}-dark.png",
        "size": size,
        "generation_size": [1320, 840] if kind == "promo-small" else size,
        "references": [
            {
                "dark-hero-en.png": "assets/branding/readme-cover-en.png",
                "social-en-dark.png": "assets/branding/github-social.png",
                "poster-en-dark.png": "assets/marketing/launch-poster-en.png",
                "desktop-en-dark.png": "assets/marketing/desktop-cover-en.png",
                "dark-promo-small-en.png": "store-assets/promo-small.png",
                "dark-marquee-en.png": "store-assets/promo-marquee.png",
            }[source],
            "assets/branding/avorythm-logo.png",
            *ui,
        ],
        "prompt": (
            BASE
            + f"Edit the finished dark English target only by replacing external marketing text with exact {locale} copy. "
            f'Headline: "{headline}". Supporting line: "{support}". '
            + (f'Footer: "{footer}". ' if footer else "No footer or extra slogan. ")
            + typography
            + detail
            + " Keep logo spelling Avorythm unchanged. Keep all real UI text in supplied reference language. "
            + "Keep the same aspect ratio, composition, feature, spacing and visual weight as the target. "
            + (
                "Mirror outer alignment only when required by RTL; do not mirror the product UI controls. "
                if rtl
                else ""
            )
            + f"No added copy. Preserve complete {size[0]}x{size[1]} framing."
        ),
    }


def main() -> None:
    jobs: list[dict] = []
    for locale in LOCALES:
        if locale == "en":
            continue
        jobs.extend(feature_job(locale, index) for index in range(1, 6))
        jobs.extend(
            general_job(locale, kind)
            for kind in ("hero", "social", "poster", "desktop", "promo-small", "promo-marquee")
        )
    CAMPAIGN.mkdir(parents=True, exist_ok=True)
    destination = CAMPAIGN / "dark-localized.json"
    destination.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(jobs)} dark localized briefs to {destination}")


if __name__ == "__main__":
    main()
