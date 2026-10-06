# All language listing copy / متن تمام زبان‌ها

Every one of the 79 destination-language entries in the app/extension catalog has a localized listing file. Each includes a name, short description, full description and release notes. The current interface remains English, Persian and Simplified Chinese; these are translations of the store description, not a claim of new interface locales.

The extension package includes the 51 supported store locales represented below. Packaged names and summaries are synchronized with these files. Full descriptions and screenshots must still be entered separately in the Web Store dashboard. Run `node scripts/sync_store_metadata.mjs --write` after editing a listing name or short description, then review the generated metadata; package creation rejects missing or stale metadata.

برای تمام ۷۹ گزینهٔ زبان مقصد، متن نام، توضیح کوتاه، توضیح کامل و تغییرات نسخه آماده شده است. روی فایل زبان موردنظر کلیک کن و فقط متن زیر عنوان همان فیلد را کپی کن؛ عنوان‌ها و راهنمای این صفحه نباید داخل توضیحات فروشگاه کپی شوند.

## Which can be published in Chrome Web Store?

The third column uses Chrome's official supported store-locale list, checked on 2026-10-01. A dash means that the translation is provided but Chrome Web Store currently has **no separate locale** for that language; keep your default English listing, or choose an appropriate supported locale in the console. Do not add unsupported `_locales` folders or assume that every dubbing language is a store language. Norwegian Bokmål (`nb`) shares the store's `no` entry; choose one of the two texts, not two separate listings.

علامت «—» یعنی متن ترجمه آماده است، ولی وب استور برای آن زبان گزینهٔ مستقل ندارد. متن اصلی انگلیسی را نگه دار یا در پنل از یک زبان پشتیبانی‌شدهٔ مناسب استفاده کن. نروژی و نروژی بوکمول یک گزینهٔ مشترک `no` دارند.

Source: [Chrome i18n — supported Web Store locales](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales).

| Language / زبان | Target code | Chrome Web Store locale | Ready-to-paste text |
| --- | --- | --- | --- |
| English · انگلیسی | `en` | `en` | [LISTING.en.md](LISTING.en.md) |
| Persian · فارسی | `fa` | `fa` | [LISTING.fa.md](LISTING.fa.md) |
| Arabic · عربی | `ar` | `ar` | [LISTING.ar.md](LISTING.ar.md) |
| Simplified Chinese · چینی ساده‌شده | `zh-Hans` | `zh_CN` | [LISTING.zh-CN.md](LISTING.zh-CN.md) |
| Traditional Chinese · چینی سنتی | `zh-Hant` | `zh_TW` | [LISTING.zh-TW.md](LISTING.zh-TW.md) |
| German · آلمانی | `de` | `de` | [LISTING.de.md](LISTING.de.md) |
| French · فرانسوی | `fr` | `fr` | [LISTING.fr.md](LISTING.fr.md) |
| Italian · ایتالیایی | `it` | `it` | [LISTING.it.md](LISTING.it.md) |
| Spanish · اسپانیایی | `es` | `es` | [LISTING.es.md](LISTING.es.md) |
| Russian · روسی | `ru` | `ru` | [LISTING.ru.md](LISTING.ru.md) |
| Japanese · ژاپنی | `ja` | `ja` | [LISTING.ja.md](LISTING.ja.md) |
| Korean · کره‌ای | `ko` | `ko` | [LISTING.ko.md](LISTING.ko.md) |
| Turkish · ترکی استانبولی | `tr` | `tr` | [LISTING.tr.md](LISTING.tr.md) |
| Brazilian Portuguese · پرتغالی برزیل | `pt-BR` | `pt_BR` | [LISTING.pt-BR.md](LISTING.pt-BR.md) |
| European Portuguese · پرتغالی اروپا | `pt-PT` | `pt_PT` | [LISTING.pt-PT.md](LISTING.pt-PT.md) |
| Dutch · هلندی | `nl` | `nl` | [LISTING.nl.md](LISTING.nl.md) |
| Polish · لهستانی | `pl` | `pl` | [LISTING.pl.md](LISTING.pl.md) |
| Ukrainian · اوکراینی | `uk` | `uk` | [LISTING.uk.md](LISTING.uk.md) |
| Hindi · هندی | `hi` | `hi` | [LISTING.hi.md](LISTING.hi.md) |
| Urdu · اردو | `ur` | — | [LISTING.ur.md](LISTING.ur.md) |
| Hebrew · عبری | `he` | `he` | [LISTING.he.md](LISTING.he.md) |
| Indonesian · اندونزیایی | `id` | `id` | [LISTING.id.md](LISTING.id.md) |
| Malay · مالایی | `ms` | `ms` | [LISTING.ms.md](LISTING.ms.md) |
| Vietnamese · ویتنامی | `vi` | `vi` | [LISTING.vi.md](LISTING.vi.md) |
| Thai · تایلندی | `th` | `th` | [LISTING.th.md](LISTING.th.md) |
| Afrikaans · آفریکانس | `af` | — | [LISTING.af.md](LISTING.af.md) |
| Akan · آکان | `ak` | — | [LISTING.ak.md](LISTING.ak.md) |
| Albanian · آلبانیایی | `sq` | — | [LISTING.sq.md](LISTING.sq.md) |
| Amharic · امهری | `am` | `am` | [LISTING.am.md](LISTING.am.md) |
| Armenian · ارمنی | `hy` | — | [LISTING.hy.md](LISTING.hy.md) |
| Azerbaijani · ترکی آذربایجانی | `az` | — | [LISTING.az.md](LISTING.az.md) |
| Basque · باسکی | `eu` | — | [LISTING.eu.md](LISTING.eu.md) |
| Belarusian · بلاروسی | `be` | — | [LISTING.be.md](LISTING.be.md) |
| Bangla · بنگالی | `bn` | `bn` | [LISTING.bn.md](LISTING.bn.md) |
| Bulgarian · بلغاری | `bg` | `bg` | [LISTING.bg.md](LISTING.bg.md) |
| Burmese · برمه‌ای | `my` | — | [LISTING.my.md](LISTING.my.md) |
| Catalan · کاتالان | `ca` | `ca` | [LISTING.ca.md](LISTING.ca.md) |
| Croatian · کروات | `hr` | `hr` | [LISTING.hr.md](LISTING.hr.md) |
| Czech · چکی | `cs` | `cs` | [LISTING.cs.md](LISTING.cs.md) |
| Danish · دانمارکی | `da` | `da` | [LISTING.da.md](LISTING.da.md) |
| Estonian · استونیایی | `et` | `et` | [LISTING.et.md](LISTING.et.md) |
| Filipino · فیلیپینی | `fil` | `fil` | [LISTING.fil.md](LISTING.fil.md) |
| Finnish · فنلاندی | `fi` | `fi` | [LISTING.fi.md](LISTING.fi.md) |
| Galician · گالیسیایی | `gl` | — | [LISTING.gl.md](LISTING.gl.md) |
| Georgian · گرجی | `ka` | — | [LISTING.ka.md](LISTING.ka.md) |
| Greek · یونانی | `el` | `el` | [LISTING.el.md](LISTING.el.md) |
| Gujarati · گجراتی | `gu` | `gu` | [LISTING.gu.md](LISTING.gu.md) |
| Hausa · هوسایی | `ha` | — | [LISTING.ha.md](LISTING.ha.md) |
| Hungarian · مجاری | `hu` | `hu` | [LISTING.hu.md](LISTING.hu.md) |
| Icelandic · ایسلندی | `is` | — | [LISTING.is.md](LISTING.is.md) |
| Javanese · جاوه‌ای | `jv` | — | [LISTING.jv.md](LISTING.jv.md) |
| Kannada · کانارا | `kn` | `kn` | [LISTING.kn.md](LISTING.kn.md) |
| Kazakh · قزاقی | `kk` | — | [LISTING.kk.md](LISTING.kk.md) |
| Khmer · خمری | `km` | — | [LISTING.km.md](LISTING.km.md) |
| Kinyarwanda · کینیارواندایی | `rw` | — | [LISTING.rw.md](LISTING.rw.md) |
| Lao · لائوسی | `lo` | — | [LISTING.lo.md](LISTING.lo.md) |
| Latvian · لتونیایی | `lv` | `lv` | [LISTING.lv.md](LISTING.lv.md) |
| Lithuanian · لیتوانیایی | `lt` | `lt` | [LISTING.lt.md](LISTING.lt.md) |
| Macedonian · مقدونی | `mk` | — | [LISTING.mk.md](LISTING.mk.md) |
| Malayalam · مالایالامی | `ml` | `ml` | [LISTING.ml.md](LISTING.ml.md) |
| Marathi · مراتی | `mr` | `mr` | [LISTING.mr.md](LISTING.mr.md) |
| Mongolian · مغولی | `mn` | — | [LISTING.mn.md](LISTING.mn.md) |
| Nepali · نپالی | `ne` | — | [LISTING.ne.md](LISTING.ne.md) |
| Norwegian · نروژی | `no` | `no` | [LISTING.no.md](LISTING.no.md) |
| Norwegian Bokmål · نروژی بوک‌مُل | `nb` | `no` | [LISTING.nb.md](LISTING.nb.md) |
| Punjabi · پنجابی | `pa` | — | [LISTING.pa.md](LISTING.pa.md) |
| Romanian · رومانیایی | `ro` | `ro` | [LISTING.ro.md](LISTING.ro.md) |
| Serbian · صربی | `sr` | `sr` | [LISTING.sr.md](LISTING.sr.md) |
| Sindhi · سندی | `sd` | — | [LISTING.sd.md](LISTING.sd.md) |
| Sinhala · سینهالی | `si` | — | [LISTING.si.md](LISTING.si.md) |
| Slovak · اسلواکی | `sk` | `sk` | [LISTING.sk.md](LISTING.sk.md) |
| Slovenian · اسلوونیایی | `sl` | `sl` | [LISTING.sl.md](LISTING.sl.md) |
| Sundanese · سوندایی | `su` | — | [LISTING.su.md](LISTING.su.md) |
| Swahili · سواحیلی | `sw` | `sw` | [LISTING.sw.md](LISTING.sw.md) |
| Swedish · سوئدی | `sv` | `sv` | [LISTING.sv.md](LISTING.sv.md) |
| Tamil · تامیلی | `ta` | `ta` | [LISTING.ta.md](LISTING.ta.md) |
| Telugu · تلوگویی | `te` | `te` | [LISTING.te.md](LISTING.te.md) |
| Uzbek · ازبکی | `uz` | — | [LISTING.uz.md](LISTING.uz.md) |
| Zulu · زولویی | `zu` | — | [LISTING.zu.md](LISTING.zu.md) |

## Verification and updates

Run `node scripts/check_store_listings.mjs` before publishing. It reads the live destination catalog from `extension/core.mjs`, checks that no listing is missing, validates field lengths and required product/provider names, checks help/privacy links, and requires current-version release notes. Do not publish translations as an accuracy guarantee; independent native-language review remains valuable, especially for less widely used languages.
