<div dir="rtl">

<p align="center">
  <img src="assets/branding/avorythm-logo.png" width="148" alt="لوگوی Avorythm">
</p>

<h1 align="center">Avorythm</h1>

<p align="center"><strong>هر صدایی را به زبان خودت بشنو—یا فقط ترجمه‌اش را بخوان.</strong></p>

<p align="center">
  ترجمه و دوبلهٔ زندهٔ صدای دسکتاپ و مرورگر، همراه با پردازش هماهنگ فایل‌های صوتی و ویدئویی.
</p>

<p align="center">
  <a href="https://github.com/msmahdinejad/avorythm/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/msmahdinejad/avorythm/ci.yml?branch=main&label=CI"></a>
  <a href="https://github.com/msmahdinejad/avorythm/releases"><img alt="Release" src="https://img.shields.io/github/v/release/msmahdinejad/avorythm?label=Release"></a>
  <img alt="Python 3.12" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img alt="Node 20+" src="https://img.shields.io/badge/Node-20%2B-339933?logo=nodedotjs&logoColor=white">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-8B5CF6"></a>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="docs/HELP.fa.md">راهنمای کامل</a> ·
  <a href="docs/INSTALLATION.fa.md">نصب و تنظیم صدا</a> ·
  <a href="PRIVACY.md">حریم خصوصی</a> ·
  <a href="SUPPORT.md">پشتیبانی</a> ·
  <a href="CONTRIBUTING.md">مشارکت</a>
</p>

![محیط اپ دسکتاپ Avorythm](docs/images/app-fa.png)

## کدام نسخه برای من مناسب است؟

| کاربرد | چیزهایی که لازم است | دستگاه صوتی مجازی |
|---|---|---|
| ترجمهٔ یک تب Chrome یا Edge | فقط اکستنشن مستقل | خیر |
| پردازش فایل صوتی یا ویدئویی | اپ دسکتاپ و FFmpeg | خیر |
| ترجمهٔ زندهٔ VLC، پخش‌کنندهٔ دوره یا برنامهٔ دسکتاپ | اپ و یک ورودی Loopback/Monitor | معمولاً بله |

اپ دسکتاپ و اکستنشن کاملاً مستقل‌اند. اکستنشن برای کارکردن به اپ، Python، FFmpeg،
localhost یا کابل صوتی مجازی نیاز ندارد.

## امکانات

- پخش صدای ترجمه‌شده همراه متن زبان اصلی و ترجمه.
- چهار خروجی مستقل: صدای اصلی، صدای دوبله، زیرنویس زبان اصلی و زیرنویس ترجمه‌شده.
- دو روش پخش در اکستنشن: حالت کم‌تأخیر داخل همان صفحه و پلیر اختصاصی بافرشده که ویدئو، دوبله و هر دو زیرنویس را روی یک خط زمانی نگه می‌دارد.
- کادر زیرنویس شیشه‌مات، قابل‌جابه‌جایی و تغییر اندازه با تنظیم اندازهٔ متن، عرض و شفافیت.
- ذخیرهٔ اختیاری چهار فایل `original.wav`، `dubbed.wav`، `source.srt` و `translated.srt`.
- پردازش فایل صوتی و ویدئویی با متن زمان‌بندی‌شده، ترجمه، ساخت صدا و پخش هماهنگ.
- دانلود همهٔ خروجی‌ها در یک فایل ZIP.
- رابط فارسی و انگلیسی با تشخیص خودکار جهت راست‌چین و چپ‌چین.
- پنجرهٔ مستقل دسکتاپ برای Windows، macOS و Linux.

![اکستنشن مستقل Avorythm](store-assets/fa/01-popup.png)

## شروع سریع

### اپ دسکتاپ

نسخهٔ مناسب سیستم‌عاملت را از [Releases](https://github.com/msmahdinejad/avorythm/releases) دانلود کن.
تا زمان تأیید SignPath، در Windows فایل مشخصاً نام‌گذاری‌شدهٔ
`Avorythm-Setup-x64-unsigned.exe` را نصب کن؛ در macOS و Linux فایل ZIP مربوط را باز کن.
نسخهٔ ویندوز FFmpeg را برای پردازش فایل‌های صوتی و ویدئویی داخل خودش دارد.

اپ به کلید Gemini نیاز دارد. برای استودیوی فایل باید کلید Groq را هم وارد کنی.
کلیدها در Keyring سیستم‌عامل نگه داشته می‌شوند.

### اکستنشن مرورگر

برای نصب دستی از GitHub Release:

1. فایل `Avorythm-Extension.zip` را در یک پوشهٔ ثابت از حالت فشرده خارج کن.
2. `chrome://extensions` یا `edge://extensions` را باز کن.
3. **Developer mode** را روشن کن، **Load unpacked** را بزن و پوشهٔ اکستنشن را انتخاب کن.
4. Avorythm را Pin کن، راه‌اندازی اولیه را در صفحهٔ جداگانهٔ تنظیمات انجام بده و ترجمه را روی یک تب عادی دارای صدا شروع کن.

برای کمترین تأخیر عملی، حالت **داخل همین صفحه** را انتخاب کن. اگر هماهنگی صدا و تصویر مهم‌تر است،
**ضبط و پلیر هماهنگ** ضبط را حدود ۲۰ ثانیه جلوتر از یک پلیر مستقل و قابل Seek نگه می‌دارد و دوبله را روی همان خط زمانی می‌گذارد.
محتوای DRM ممکن است اجازهٔ دریافت تصویر ندهد؛ در این حالت خود اکستنشن موضوع را اعلام می‌کند و حالت کم‌تأخیر همچنان قابل استفاده است.

کلید اکستنشن فقط در `chrome.storage.session` می‌ماند و با خروج کامل از مرورگر پاک می‌شود.

برای آموزش تصویری اپ و اکستنشن [راهنمای کامل](docs/HELP.fa.md) و برای تنظیم AMM در Windows، ورودی Loopback در macOS، Monitor در Linux و پروکسی،
[راهنمای کامل نصب و تنظیم صدا](docs/INSTALLATION.fa.md) را ببین.

## پردازش داده‌ها

- صدای زندهٔ دسکتاپ یا تب انتخاب‌شده فقط پس از شروع ترجمه از سوی کاربر به Google Gemini فرستاده می‌شود.
- فایل آپلودشده روی رایانه می‌ماند؛ قطعه‌های صوتی استخراج‌شده برای تبدیل گفتار به متن به Groq Whisper و متن و درخواست ساخت صدا به Gemini می‌روند.
- تنظیمات و فایل‌های خروجی محلی می‌مانند. Avorythm تبلیغ، ردیابی یا آمارگیری برای توسعه‌دهنده ندارد.
- ذخیرهٔ چهار خروجی اختیاری و پیش‌فرض خاموش است. پلیر هماهنگ برای Seek و خروجی WebM، تب انتخاب‌شده را محلی ضبط می‌کند.

پیش از پردازش رسانهٔ خصوصی یا دارای حق نشر، [سیاست حریم خصوصی دوزبانه](PRIVACY.md) را بخوان.

## توسعه و مشارکت

پیش‌نیازها: Python 3.12، Node.js 20 یا جدیدتر و FFmpeg برای استودیوی فایل.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,build]"
python -m pytest -q
python -m ruff check src tests scripts
python -m mypy src
node --test tests/background.test.mjs tests/extension.test.mjs tests/offscreen.test.mjs tests/player.test.mjs
python -m avorythm
```

ساخت اپ و بسته‌بندی اکستنشن:

```powershell
python scripts/build.py
.\scripts\package-extension.ps1
```

اسناد مشارکت‌کنندگان: [معماری](ARCHITECTURE.md)، [راهنمای مشارکت](CONTRIBUTING.md)،
[سیاست امنیت](SECURITY.md)، [پشتیبانی](SUPPORT.md) و [تغییرات نسخه‌ها](CHANGELOG.md).

## اطمینان از فایل انتشار

فایل دانلودشده را با `SHA256SUMS.txt` همان Release بررسی کن. تا وقتی درخواست SignPath Foundation
تأیید نشده، نصب‌کنندهٔ Windows با پسوند `-unsigned.exe` منتشر می‌شود و ممکن است SmartScreen پیام
ناشناخته‌بودن ناشر را نشان بدهد. قواعد امضا و اعتبارسنجی در [سیاست امضای کد](CODE_SIGNING_POLICY.md) آمده است.

## وضعیت پروژه

Avorythm در حال توسعه است و از سرویس‌های آزمایشی هوش مصنوعی استفاده می‌کند. دقت ترجمه، صدا،
تأخیر، دسترس‌پذیری و سهمیه‌ها ممکن است تغییر کنند؛ نتیجه‌های مهم را پیش از استفاده بررسی کن.

## مجوز

[MIT](LICENSE) © Mohammad Saleh Mahdinejad. نسخهٔ ویندوز FFmpeg را با مجوز GPLv3 همراه دارد؛
[اطلاعیه‌های نرم‌افزارهای شخص ثالث](THIRD_PARTY_NOTICES.md) را ببین.

</div>
