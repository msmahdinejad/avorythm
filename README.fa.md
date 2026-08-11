<div dir="rtl" align="center">
  <img src="extension/icons/icon128.png" width="92" alt="نشان LingoDub">
  <h1>LingoDub</h1>
  <p><strong>صدای هر تب مرورگر یا برنامهٔ ویندوز را زنده به زبان خودت بشنو.</strong></p>
  <p><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>
</div>

<div dir="rtl">

LingoDub یک برنامهٔ همراه ویندوز و اکستنشن متن‌باز برای ترجمه و دوبلهٔ زنده است. موتور اصلی آن `gemini-3.5-live-translate-preview` است، بیش از ۷۰ زبان را پشتیبانی می‌کند، متن فارسی و انگلیسی را با جهت درست نشان می‌دهد و چهار خروجی هماهنگ تحویل می‌دهد.

![داشبورد LingoDub](docs/images/dashboard.png)

## امکانات اصلی

- در مرورگر صدای اصلی مستقیم قطع و مسیر صدا توسط اکستنشن بازسازی می‌شود؛ بنابراین حالت «فقط دوبله» واقعاً فقط دوبله پخش می‌کند.
- سه حالت شنیداری: فقط دوبله، فقط اصلی، یا میکس هوشمند با Auto‑duck.
- پشتیبانی از صدای برنامه‌های ویندوز با WASAPI Loopback و مسیر صوتی مجازی.
- متن زندهٔ اصلی و ترجمه با تشخیص خودکار راست‌چین/چپ‌چین.
- صدای بومی کم‌تأخیر Gemini یا ۳۰ گویندهٔ TTS با کنترل سبک اجرا.
- ضبط `original.wav`، `source.srt`، `dubbed.wav` و `translated.srt` در یک فایل ZIP.
- نگه‌داری API Key در Windows Credential Manager؛ اکستنشن هرگز کلید را دریافت نمی‌کند.
- رابط فارسی/انگلیسی با فونت محلی وزیرمتن.

## نصب سریع

### برنامهٔ همراه

فایل `LingoDub-Setup-x64.exe` را از [آخرین نسخه](https://github.com/msmahdinejad/lingodub/releases/latest) بگیر و نصب کن. بعد از اجرا، پنل در `http://127.0.0.1:8765` باز می‌شود. نسخهٔ Portable هم با نام `LingoDub-Windows-x64.zip` موجود است.

### اکستنشن Chrome یا Edge

1. فایل `LingoDub-Extension.zip` را از Release دانلود و Extract کن.
2. آدرس `chrome://extensions` یا `edge://extensions` را باز کن.
3. Developer mode را روشن کن، **Load unpacked** را بزن و پوشهٔ `extension` را انتخاب کن.
4. اکستنشن را Pin کن؛ روی تب ویدیو برو و «شروع دوبلهٔ این تب» را بزن.

اگر پروژه را Clone کرده‌ای، کافی است [`install-extension.cmd`](install-extension.cmd) را اجرا کنی. مسیر مناسب ساخته و در Clipboard کپی می‌شود. مرورگر به‌دلایل امنیتی اجازه نمی‌دهد مرحلهٔ نهایی Load unpacked به‌شکل مخفی یا خودکار انجام شود.

## استفاده

1. از [Google AI Studio](https://aistudio.google.com/app/apikey) کلید بگیر و در داشبورد ذخیره کن.
2. پروکسی پیش‌فرض `http://127.0.0.1:10808` است و از تنظیمات پیشرفته قابل تغییر است.
3. برای فیلم‌های مرورگر از اکستنشن استفاده کن؛ حالت پیش‌فرض «فقط دوبله» است.
4. برای VLC و برنامه‌های ویندوز، «راه‌اندازی خودکار صدا» را بزن و مرحلهٔ Windows Volume Mixer را انجام بده.
5. برای دریافت چهار خروجی، قبل از شروع گزینهٔ ضبط را فعال کن.

راهنمای کامل در [docs/INSTALLATION.fa.md](docs/INSTALLATION.fa.md) قرار دارد.

## حریم خصوصی و محدودیت‌ها

برنامه فقط روی `127.0.0.1` گوش می‌دهد. کلید API از API محلی برگردانده نمی‌شود و صدا فقط هنگام فعال بودن دوبله برای Google ارسال می‌شود. فایل‌های ضبط‌شده روی لپ‌تاپ باقی می‌مانند.

مدل‌های Live Translate و TTS در وضعیت Preview هستند؛ هیچ کلاینتی نمی‌تواند کیفیت ترجمه، تأخیر شبکه، سهمیه، دسترسی همیشگی یا ثبات صدای سرویس ابری را ۱۰۰٪ تضمین کند. جداسازی صدای برنامه‌های دسکتاپ فعلاً به Virtual Audio Device نیاز دارد؛ اکستنشن مرورگر بدون آن کار می‌کند.

پیاده‌سازی بر اساس مستندات به‌روز Google برای [Live Translate](https://ai.google.dev/gemini-api/docs/live-api/live-translate) و [Speech Generation](https://ai.google.dev/gemini-api/docs/speech-generation) است.

برای مشارکت، [CONTRIBUTING.md](CONTRIBUTING.md) و [ROADMAP.md](ROADMAP.md) را ببین. پروژه تحت [مجوز MIT](LICENSE) منتشر می‌شود.

</div>
