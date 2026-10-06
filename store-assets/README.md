# Chrome Web Store visuals / تصاویر فروشگاه کروم / Chrome 网上应用店图片

These are **listing assets**, not extension-package files. In each localized listing, upload the matching language set. The current campaign is the dark, product-led set generated on 2026-10-05; it uses a deep graphite canvas, restrained violet/cyan accents, and the real Avorythm UI as the visual anchor. The default/global promos are English. If the Web Store editor exposes only one global promo slot, keep the English image there and localize the screenshots and text.

## Ready-to-paste listing text

**[All 79 languages — complete index / متن تمام ۷۹ زبان](ALL-LANGUAGES.md)**

Every destination-language entry has a localized name, short description, full description, and release notes for version 1.1.16. The complete index maps language codes to files and to officially supported Chrome Web Store locales. Some translation targets have no independent store locale; their copy is provided for reuse but cannot be published under a nonexistent language option.

Copy only the text under the relevant heading into the Web Store form; do not paste the file heading or upload instructions as part of the description. Listing languages do not imply additional interface languages: the current extension UI is English, Persian, and Simplified Chinese. The following eight languages have matching artwork; other listings can use the verified English product captures without claiming a localized UI.

| Listing language | Copy | Feature artwork |
| --- | --- | --- |
| English | [LISTING.en.md](LISTING.en.md) | `en/` |
| فارسی | [LISTING.fa.md](LISTING.fa.md) | `fa/` |
| 简体中文 | [LISTING.zh-CN.md](LISTING.zh-CN.md) | `zh-CN/` |
| العربية | [LISTING.ar.md](LISTING.ar.md) | `ar/` |
| Deutsch | [LISTING.de.md](LISTING.de.md) | `de/` |
| Français | [LISTING.fr.md](LISTING.fr.md) | `fr/` |
| Italiano | [LISTING.it.md](LISTING.it.md) | `it/` |
| Русский | [LISTING.ru.md](LISTING.ru.md) | `ru/` |

The short descriptions stay within 132 characters. All localized descriptions retain the same consent, provider-processing, key-storage, recording, and service-limit disclosures.

## Upload images

| Field | English | فارسی | 简体中文 | العربية | Deutsch | Français | Italiano | Русский |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Small promo tile · 440×280 | `promo-small.png` | `promo-small-fa.png` | `promo-small-zh-CN.png` | `promo-small-ar.png` | `promo-small-de.png` | `promo-small-fr.png` | `promo-small-it.png` | `promo-small-ru.png` |
| Marquee · 1400×560 | `promo-marquee.png` | `promo-marquee-fa.png` | `promo-marquee-zh-CN.png` | `promo-marquee-ar.png` | `promo-marquee-de.png` | `promo-marquee-fr.png` | `promo-marquee-it.png` | `promo-marquee-ru.png` |
| 1. First screen · 1280×800 | `en/01-popup.png` | `fa/01-popup.png` | `zh-CN/01-popup.png` | `ar/01-popup.png` | `de/01-popup.png` | `fr/01-popup.png` | `it/01-popup.png` | `ru/01-popup.png` |
| 2. Four output controls · 1280×800 | `en/02-settings.png` | `fa/02-settings.png` | `zh-CN/02-settings.png` | `ar/02-settings.png` | `de/02-settings.png` | `fr/02-settings.png` | `it/02-settings.png` | `ru/02-settings.png` |
| 3. Synchronized setup · 1280×800 | `en/03-sync-settings.png` | `fa/03-sync-settings.png` | `zh-CN/03-sync-settings.png` | `ar/03-sync-settings.png` | `de/03-sync-settings.png` | `fr/03-sync-settings.png` | `it/03-sync-settings.png` | `ru/03-sync-settings.png` |
| 4. Player · 1280×800 | `en/04-player.png` | `fa/04-player.png` | `zh-CN/04-player.png` | `ar/04-player.png` | `de/04-player.png` | `fr/04-player.png` | `it/04-player.png` | `ru/04-player.png` |
| 5. Subtitle overlay · 1280×800 | `en/05-subtitles.png` | `fa/05-subtitles.png` | `zh-CN/05-subtitles.png` | `ar/05-subtitles.png` | `de/05-subtitles.png` | `fr/05-subtitles.png` | `it/05-subtitles.png` | `ru/05-subtitles.png` |

The promo tiles explain AI dubbing, live subtitles, and synchronized playback at a glance. The five feature images are **AI-generated promotional artwork based on current product captures**, not untouched screenshots. The dark campaign was generated with `gpt-image-2.5-sunburst` through Codex-LB; only whole-image resizing and PNG encoding were applied afterward. They use synthetic demo content, not private media or real user data. The existing logo is preserved. The tracked `campaign.json` records the approved dimensions, content hashes and generation provenance for every deliverable; run `python scripts/validate_dark_campaign.py` to verify this checkout.

For **actual, unedited UI screenshots**, use `docs/images/extension/`. Those guide images are separate from the promotional campaign and have not been replaced by AI artwork. Regenerate the promotional images and re-capture the real screenshots when the UI changes materially. Do not add listing artwork to `extension/` or the extension installation ZIP.

For artwork maintenance, install the optional tools with `python -m pip install -e ".[artwork]"`. Build localized briefs with `python scripts/build_dark_campaign_specs.py`; all input references and localized copy are tracked in this repository. Run `python scripts/generate_ai_campaign.py --spec output/imagegen/product-2026-10-05/dark-localized.json --out-dir output/imagegen/product-2026-10-05` only when intentionally regenerating artwork with your locally configured Codex-LB. Original model outputs remain in the ignored output folder. Retired code-composited campaign renderers have been removed so they cannot overwrite the approved images.

Additional localized artwork is available in `ar/`, `de/`, `fr/`, `it/`, and `ru/` with matching `promo-small-<locale>.png` and `promo-marquee-<locale>.png` files. Their external marketing captions are localized while the illustrated product interface remains English; use them only when publishing a matching localized listing. Do not present these as proof of additional interface languages.

برای فهرست فارسی، تصاویر ستون فارسی را بارگذاری کن؛ تصاویر این پوشه داخل فایل نصب اکستنشن قرار نمی‌گیرند. اگر فروشگاه برای پرومو فقط یک تصویر سراسری می‌پذیرد، نسخهٔ انگلیسی را نگه دار و متن و اسکرین‌شات‌های فارسی را جداگانه ثبت کن.

تصاویر این مجموعه طرح‌های تبلیغاتی ساخته‌شده با هوش مصنوعی هستن که از ظاهر واقعی محصول مرجع گرفتن؛ اسکرین‌شات خام نیستن. عکس‌های واقعی و بدون ویرایش رابط کاربری در `docs/images/extension/` قرار دارن. بعد از تولید با هوش مصنوعی، فقط اندازهٔ تصویر برای جایگاه موردنظر تنظیم شده و متن یا چیدمان با کد به تصویر اضافه نشده.

简体中文列表请使用中文列的图片；若宣传图只能全局上传一套，就保留英文宣传图，并单独上传中文文案与截图。

这些图片是以实际产品界面为参考的 AI 宣传设计，并非原始截图。未经编辑的真实界面截图位于 `docs/images/extension/`。生成后仅调整了整张图片的尺寸与 PNG 编码，未使用代码添加文字或排版。
