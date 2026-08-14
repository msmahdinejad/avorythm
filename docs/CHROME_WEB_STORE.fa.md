# راهنمای کامل انتشار Lingora در Chrome Web Store

این سند نسخهٔ فارسی و کامل [راهنمای انگلیسی](CHROME_WEB_STORE.md) است و برای نسخهٔ `1.0.0` اکستنشن مستقل Lingora نوشته شده است. در داشبورد، زبان اصلی را English نگه دار و سپس از بخش Store listing یک نسخهٔ محلی‌شده با زبان **Persian — فارسی** اضافه کن.

## بستهٔ آمادهٔ انتشار

از یک Checkout تمیز این دستور را اجرا کن:

```powershell
.\scripts\package-extension.ps1
```

فایل `dist/Lingora-Extension.zip` را بارگذاری کن. `manifest.json` در ریشهٔ ZIP قرار دارد. این بسته Manifest V3 است، کد اجرایی را از اینترنت دریافت نمی‌کند، به اپ دسکتاپ یا localhost وابسته نیست و دسترسی دامنه را فقط برای API رسمی Gemini می‌خواهد.

پیش از هر بار بارگذاری، نسخه‌ها را هماهنگ افزایش بده و این بررسی‌ها را اجرا کن:

```powershell
python -m pytest -q
node --test tests/extension.test.mjs tests/offscreen.test.mjs tests/background.test.mjs
node --check extension/background.js
node --check extension/offscreen.js
node --check extension/popup.js
```

## حساب ناشر

1. وارد [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) شو.
2. ثبت‌نام ناشر و هزینهٔ یک‌باره‌ای را که Google نشان می‌دهد کامل کن.
3. تأیید دومرحله‌ای حساب را روشن کن.
4. نام ناشر را `Mohammad Saleh Mahdinejad` یا نام واقعی سازمان ثبت‌شده قرار بده، ایمیل تماس را تأیید کن و وضعیت Trader/Non-Trader را مطابق واقعیت انتخاب کن.
5. ابتدا انتشار Private برای تست‌کنندگان مطمئن را انجام بده؛ پس از تأیید، Distribution را روی Public و All regions بگذار.

## متن آمادهٔ صفحهٔ فارسی فروشگاه

- **Name / نام:** `Lingora — ترجمهٔ زنده`
- **Summary / خلاصه:** `صدای همین تب را با Gemini زنده ترجمه کن؛ دوبله بشنو یا زیرنویس ببین.`
- **Category / دسته‌بندی:** `Tools`
- **Listing language / زبان صفحه:** `Persian — فارسی`
- **Homepage URL:** `https://github.com/msmahdinejad/lingora`
- **Support URL:** `https://github.com/msmahdinejad/lingora/issues`
- **Privacy Policy URL:** `https://github.com/msmahdinejad/lingora/blob/main/PRIVACY.md`
- **Mature content / محتوای بزرگسال:** `No`

توضیحات کامل:

```text
با Lingora صدای همان تبی را که خودت انتخاب کرده‌ای، همان لحظه ترجمه کن. می‌توانی دوبله را بشنوی، متن اصلی و ترجمه را داخل کادر شناور ببینی و میزان صدای اصلی و دوبله را جداگانه تنظیم کنی. اگر ذخیرهٔ خروجی را روشن کنی، صدای اصلی، صدای دوبله و هر دو فایل زیرنویس روی دستگاهت ذخیره می‌شوند.

پردازش صدا فقط پس از تأیید تو و زدن دکمهٔ «شروع» آغاز می‌شود. صدا و متن به‌دست‌آمده از همان تب، فقط برای ترجمه و دوبله به Google Gemini فرستاده می‌شوند. Lingora به تب‌های دیگر دسترسی نمی‌گیرد، تبلیغ و سامانهٔ تحلیل رفتار ندارد و محتوایت را برای تیم پروژه نمی‌فرستد. ذخیرهٔ خروجی نیز به‌طور پیش‌فرض خاموش است.

این اکستنشن کاملاً مستقل است؛ برای استفاده از آن لازم نیست اپ دسکتاپ Lingora، Python، FFmpeg یا کابل صوتی مجازی نصب باشد. کلید Gemini فقط تا پایان همان نشست مرورگر نگه داشته می‌شود و اکستنشن آن را مستقیماً برای دریافت توکن کوتاه‌عمر و یک‌بارمصرف به Google می‌فرستد. هیچ کلید متعلق به توسعه‌دهنده داخل بسته قرار نگرفته است.
```

متن آمادهٔ صفحهٔ انگلیسی و فیلدهای اصلی داشبورد در [CHROME_WEB_STORE.md](CHROME_WEB_STORE.md) قرار دارند.

## تصاویر واقعی و محلی‌شده

برای صفحهٔ فارسی این فایل‌ها را بارگذاری کن:

- `docs/store-assets/icon-128.png` — آیکون مشترک ۱۲۸×۱۲۸.
- `docs/store-assets/fa/screenshot-01-live-extension.jpg` — نمای واقعی ترجمهٔ زنده، ۶۴۰×۴۰۰.
- `docs/store-assets/fa/screenshot-02-output-mixer.jpg` — نمای واقعی ترکیب خروجی، ۶۴۰×۴۰۰.
- `docs/store-assets/fa/screenshot-03-floating-captions.jpg` — کادر واقعی زیرنویس، ۶۴۰×۴۰۰.
- `docs/store-assets/fa/small-promo-440x280.jpg` — تصویر تبلیغاتی کوچک فارسی.
- `docs/store-assets/fa/marquee-1400x560.jpg` — تصویر Marquee فارسی.

نسخهٔ انگلیسی هرکدام در `docs/store-assets/en/` قرار دارد. اسکرین‌شات‌ها از رابط تولیدی خود اکستنشن گرفته شده‌اند؛ فقط Chrome API با دادهٔ نمایشی و بدون کلید خصوصی جایگزین شده است. تصویر زیرنویس نیز `content.js` واقعی بسته را روی نمای واقعی اپ اجرا می‌کند. برای بازسازی پیش‌نمایش‌ها اجرا کن:

```powershell
node scripts/prepare-store-preview.mjs
node scripts/validate-store-assets.mjs
```

## Privacy practices / رویه‌های حریم خصوصی

### هدف واحد اکستنشن

نسخهٔ فارسی:

```text
Lingora صدای همان تب مرورگری را که کاربر به‌طور مشخص انتخاب کرده است ترجمه می‌کند و نتیجه را به‌شکل زیرنویس ترجمه‌شده، صدای دوبله یا هر دو نمایش می‌دهد.
```

متنی که در Dashboard وارد می‌کنی:

```text
Lingora translates audio from the browser tab explicitly selected by the user and presents the result as translated captions and/or dubbed audio.
```

### Remote code / کد راه دور

گزینهٔ `No, I am not using remote code.` را انتخاب کن.

توضیح فارسی:

```text
تمام JavaScript اجرایی و AudioWorklet داخل فایل ZIP اکستنشن قرار دارند. پاسخ‌های Gemini فقط به‌عنوان دادهٔ متن و صدا پردازش می‌شوند و هیچ‌وقت به‌صورت کد اجرا نمی‌شوند.
```

متن انگلیسی Dashboard:

```text
All executable JavaScript and AudioWorklet code is included in the extension ZIP. Gemini responses are handled only as text and audio data and are never evaluated as executable code.
```

### دلیل هر دسترسی

| دسترسی | توضیح فارسی |
|---|---|
| `activeTab` | فقط به تبی دسترسی موقت می‌دهد که کاربر Lingora را روی آن اجرا کرده است؛ برای نمایش کادر زیرنویس استفاده می‌شود و دسترسی دائمی به همهٔ سایت‌ها نمی‌دهد. |
| `tabCapture` | تنها پس از رضایت صریح و زدن «شروع»، صدای تب انتخاب‌شده را برای ترجمه و دوبله دریافت می‌کند. |
| `offscreen` | پردازش Web Audio، پخش و ضبط اختیاری را انجام می‌دهد؛ چون Service Worker در Manifest V3 به DOM و AudioContext دسترسی ندارد. |
| `storage` | زبان، ترکیب صدا، ظاهر زیرنویس، زبان رابط، نسخهٔ رضایت و تنظیم ضبط را محلی نگه می‌دارد. کلید و وضعیت نشست در `chrome.storage.session` می‌مانند و Sync نمی‌شوند. |
| `scripting` | رابط بسته‌بندی‌شدهٔ زیرنویس را فقط داخل همان تب فعال‌شده از سوی کاربر و با دسترسی موقت `activeTab` تزریق می‌کند. |
| `downloads` (اختیاری) | فقط وقتی کاربر ذخیرهٔ خروجی را روشن کند درخواست می‌شود و دو WAV و دو SRT را در Downloads ذخیره می‌کند. |
| `https://generativelanguage.googleapis.com/*` | صدای تب انتخاب‌شده را به Google Gemini می‌فرستد، ترجمه و صدای تولیدشده را دریافت می‌کند و کلید نشست کاربر را با توکن کوتاه‌عمر و یک‌بارمصرف معاوضه می‌کند. |

برای فیلدهای قابل Paste داشبورد، نسخهٔ انگلیسی همین جدول را از [راهنمای انگلیسی](CHROME_WEB_STORE.md#privacy-practices) بردار.

### اعلام نوع داده‌ها

- **Website content:** بله؛ چون صدای تب انتخاب‌شده پردازش و ارسال می‌شود.
- **Authentication information:** بله؛ چون کلید Gemini کاربر و توکن کوتاه‌عمر در همان نشست پردازش می‌شوند.
- **User-generated content:** بله؛ رسانهٔ انتخاب‌شده یا متن استخراج‌شده ممکن است محتوای ساخته‌شدهٔ کاربر باشد.
- **Personal communications:** بله؛ رسانهٔ انتخاب‌شده ممکن است شامل گفت‌وگو باشد.
- **Web browsing activity:** خیر؛ Lingora نشانی صفحه یا تاریخچهٔ مرور را جمع‌آوری و ارسال نمی‌کند.
- هویت شخصی، سلامت، امور مالی و موقعیت مکانی جزو داده‌های هدف محصول نیستند؛ در سیاست حریم خصوصی توضیح داده شده که محتوای انتخابی ممکن است به‌طور اتفاقی اطلاعات حساس داشته باشد.

همهٔ تعهدهای Limited Use را تأیید کن. Lingora داده را فقط برای ترجمه‌ای که کاربر شروع کرده به Google می‌فرستد، تبلیغ و فروش داده ندارد و تیم پروژه به محتوای کاربر دسترسی پیدا نمی‌کند.

## متن رضایت برجسته داخل اکستنشن

نسخهٔ فارسی رابط:

```text
با زدن «شروع»، صدای همین تب و متن‌های به‌دست‌آمده برای ترجمه و دوبله به Google Gemini فرستاده می‌شوند. تیم Lingora به این محتوا دسترسی ندارد و ضبط نیز به‌طور پیش‌فرض خاموش است.
```

نسخهٔ انگلیسی:

```text
When you press Start, only audio and transcripts from the selected tab go to Google Gemini for translation and dubbing. Lingora maintainers cannot access this content, and recording is off by default.
```

این تأیید را حذف یا ضعیف نکن؛ هر تغییر اساسی در نوع پردازش باید هم‌زمان در سیاست حریم خصوصی ثبت شود و با افزایش نسخهٔ رضایت، دوباره از کاربر اجازه گرفته شود.

## دستور تست برای بازبین Google

کلید Gemini مخصوص بازبینی را فقط در قسمت خصوصی Test instructions قرار بده؛ آن را داخل ZIP، مخزن، تصویر یا متن عمومی فروشگاه نگذار و پس از پایان بازبینی باطل کن.

راهنمای فارسی مراحل:

1. یک صفحهٔ عادی HTTPS با نمونهٔ گفتار انگلیسیِ مجاز باز شود.
2. Lingora باز، کلید بازبین وارد و Save زده شود.
3. Persian به‌عنوان زبان مقصد انتخاب، رضایت پردازش همان تب تأیید و درحالی‌که ضبط خاموش است Start زده شود.
4. پخش دوبله و نمایش زیرنویس ترجمه بررسی شود. هر چهار کانال صدای اصلی، دوبله، زیرنویس اصلی و زیرنویس ترجمه جداگانه روشن و خاموش شوند.
5. اندازه و جای کادر زیرنویس تغییر کند و نتیجه داخل صفحه بررسی شود.
6. Stop زده و پایان Capture تأیید شود.
7. ذخیرهٔ خروجی روشن، دسترسی اختیاری Downloads تأیید و پس از یک اجرای کوتاه وجود چهار فایل `original.wav`، `dubbed.wav`، `source.srt` و `translated.srt` بررسی شود. پیام تکمیل فقط پس از ساخت موفق فایل‌ها باید ظاهر شود.
8. کلید نشست پاک شود و شروع دوباره بدون کلید ممکن نباشد.

متن انگلیسی آمادهٔ Paste در [بخش Test instructions راهنمای انگلیسی](CHROME_WEB_STORE.md#test-instructions-for-google-reviewers) قرار دارد.

## ترتیب ارسال

1. `dist/Lingora-Extension.zip` را در یک Profile تازهٔ Chrome Stable با Load unpacked آزمایش کن.
2. فایل را به‌عنوان آیتم جدید بارگذاری کن.
3. متن انگلیسی Listing، Privacy، Permission و Test instructions را وارد کن.
4. نسخهٔ محلی‌شدهٔ Persian را بساز و متن طبیعی فارسی بالا را قرار بده.
5. تصاویر پوشهٔ `en` را برای صفحهٔ انگلیسی و تصاویر پوشهٔ `fa` را برای صفحهٔ فارسی بارگذاری کن.
6. ابتدا با دسترسی Private برای تست‌کنندگان مطمئن ارسال کن.
7. پس از تست نهایی، در صورت هر تغییر نسخه را افزایش بده، Distribution را روی Public / All regions بگذار و دوباره Submit کن.

منابع رسمی در پایان [راهنمای انگلیسی](CHROME_WEB_STORE.md#official-sources) فهرست شده‌اند.
