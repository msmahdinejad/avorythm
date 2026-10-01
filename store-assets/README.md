# Chrome Web Store visuals / تصاویر فروشگاه کروم / Chrome 网上应用店图片

These are **listing assets**, not extension-package files. In each localized listing, upload the matching language set. The default/global promos are English. If the Web Store editor exposes only one global promo slot, keep the English image there and localize the screenshots and text. Chinese copy is in [LISTING.zh-CN.md](LISTING.zh-CN.md).

## Ready-to-paste listing text

Each file contains a localized name, short description, full description, and release notes for version 1.1.15. Copy only the text under the relevant heading into the Web Store form; do not paste the file heading or upload instructions as part of the description. Listing languages do not imply additional interface languages: the current extension UI is English, Persian, and Simplified Chinese.

| Listing language | Copy | Screenshots |
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

| Field | English | فارسی | 简体中文 |
| --- | --- | --- | --- |
| Small promo tile · 440×280 | `promo-small.png` | `promo-small-fa.png` | `promo-small-zh-CN.png` |
| Marquee · 1400×560 | `promo-marquee.png` | `promo-marquee-fa.png` | `promo-marquee-zh-CN.png` |
| 1. First screen · 1280×800 | `en/01-popup.png` | `fa/01-popup.png` | `zh-CN/01-popup.png` |
| 2. Four output controls · 1280×800 | `en/02-settings.png` | `fa/02-settings.png` | `zh-CN/02-settings.png` |
| 3. Synchronized setup · 1280×800 | `en/03-sync-settings.png` | `fa/03-sync-settings.png` | `zh-CN/03-sync-settings.png` |
| 4. Player · 1280×800 | `en/04-player.png` | `fa/04-player.png` | `zh-CN/04-player.png` |
| 5. Subtitle overlay · 1280×800 | `en/05-subtitles.png` | `fa/05-subtitles.png` | `zh-CN/05-subtitles.png` |

The promo tiles explain AI dubbing, live subtitles, and synchronized playback at a glance. Screenshots contain the actual extension UI with locally generated demo content—no real media or user data. The guides use separate, uncomposited captures in `docs/images/extension/`. Re-capture both sets when the UI changes materially. Do not add these listing images to `extension/` or the uploaded ZIP.

Additional localized artwork is available in `ar/`, `de/`, `fr/`, `it/`, and `ru/` with matching `promo-small-<locale>.png` files. Their marketing captions are localized while the embedded product capture remains the verified English UI; use them only when publishing a matching localized listing.

برای فهرست فارسی، تصاویر ستون فارسی را بارگذاری کن؛ تصاویر این پوشه داخل فایل نصب اکستنشن قرار نمی‌گیرند. اگر فروشگاه برای پرومو فقط یک تصویر سراسری می‌پذیرد، نسخهٔ انگلیسی را نگه دار و متن و اسکرین‌شات‌های فارسی را جداگانه ثبت کن.

简体中文列表请使用中文列的图片；若宣传图只能全局上传一套，就保留英文宣传图，并单独上传中文文案与截图。
