<div dir="rtl" align="center">
  <img src="extension/icons/icon128.png" width="92" alt="نشان LingoDub">
  <h1>LingoDub</h1>
  <p><strong>صدای هر تب مرورگر یا برنامهٔ ویندوز را زنده به زبان خودت بشنو.</strong></p>
  <p><a href="README.md">English</a> · <a href="README.fa.md">فارسی</a></p>
</div>

<div dir="rtl">

LingoDub شامل یک اپ ویندوز و یک اکستنشن مستقل متن‌باز برای ترجمه و دوبلهٔ زنده است. این دو هیچ وابستگی اجرایی به هم ندارند: برای تب مرورگر فقط اکستنشن و برای Player دسکتاپ فقط اپ را نصب می‌کنی. موتور هر دو `gemini-3.5-live-translate-preview` است و چهار خروجی هماهنگ می‌سازند.

![داشبورد LingoDub](docs/images/dashboard.png)

## امکانات اصلی

- در مرورگر صدای اصلی مستقیم قطع و مسیر صدا توسط اکستنشن بازسازی می‌شود؛ بنابراین حالت «فقط دوبله» واقعاً فقط دوبله پخش می‌کند.
- سه حالت شنیداری: فقط دوبله، فقط اصلی، یا میکس هوشمند با Auto‑duck.
- پشتیبانی از صدای برنامه‌های ویندوز با WASAPI Loopback و مسیر صوتی مجازی.
- متن زندهٔ اصلی و ترجمه با تشخیص خودکار راست‌چین/چپ‌چین.
- صدای بومی کم‌تأخیر Gemini یا ۳۰ گویندهٔ TTS با کنترل سبک اجرا.
- ضبط `original.wav`، `source.srt`، `dubbed.wav` و `translated.srt` در یک فایل ZIP.
- مدیریت مستقل Key: Windows Credential Manager در اپ و Session Storage موقت در اکستنشن.
- رابط فارسی/انگلیسی با فونت محلی وزیرمتن.

## نصب سریع

### اپ ویندوز برای برنامه‌های دسکتاپ

فایل `LingoDub-Setup-x64.exe` را از [آخرین نسخه](https://github.com/msmahdinejad/lingodub/releases/latest) بگیر و نصب کن. بعد از اجرا، پنل در `http://127.0.0.1:8765` باز می‌شود. نسخهٔ Portable هم با نام `LingoDub-Windows-x64.zip` موجود است.

### اکستنشن مستقل برای تب مرورگر

1. فایل `LingoDub-Extension.zip` را از Release دانلود و Extract کن.
2. آدرس `chrome://extensions` یا `edge://extensions` را باز کن.
3. Developer mode را روشن کن، **Load unpacked** را بزن و پوشهٔ `extension` را انتخاب کن.
4. اکستنشن را Pin کن، API Key را داخل Popup وارد کن، روی تب ویدیو برو و «شروع دوبلهٔ این تب» را بزن.

اکستنشن مستقیم به Gemini وصل می‌شود و هیچ نیازی به اپ ویندوز، localhost، Virtual Cable یا Python ندارد. Key فقط تا پایان نشست مرورگر نگه‌داری و با بسته‌شدن کامل Chrome/Edge پاک می‌شود.

اگر پروژه را Clone کرده‌ای، کافی است [`install-extension.cmd`](install-extension.cmd) را اجرا کنی. مسیر مناسب ساخته و در Clipboard کپی می‌شود. مرورگر به‌دلایل امنیتی اجازه نمی‌دهد مرحلهٔ نهایی Load unpacked به‌شکل مخفی یا خودکار انجام شود.

> **نصب یک‌کلیکی ممکن است؟** بله؛ بعد از بررسی و انتشار LingoDub در Chrome Web Store و به‌صورت جداگانه Microsoft Edge Add-ons. [Chrome در Windows نصب مستقیم فایل CRX محلی را مسدود می‌کند](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions). تا قبل از انتشار در Store، Developer mode و Load unpacked کوتاه‌ترین روش عمومی مورد پشتیبانی است.

## استفاده

1. از [Google AI Studio](https://aistudio.google.com/app/apikey) کلید بگیر.
2. برای فیلم مرورگر، Key را داخل Popup اکستنشن وارد کن؛ اکستنشن از Proxy مرورگر/سیستم استفاده می‌کند.
3. برای VLC و برنامه‌های ویندوز، Key و Proxy جداگانه را در داشبورد اپ ذخیره و آموزش تصویری صدا را دنبال کن.
4. برای چهار خروجی، قبل از Start ضبط را روشن کن؛ اکستنشن چهار فایل را در Downloads می‌گذارد و اپ یک ZIP هم می‌سازد.

راهنمای کامل در [docs/INSTALLATION.fa.md](docs/INSTALLATION.fa.md) قرار دارد.

## تفاوت مهم اپ دسکتاپ و اکستنشن

| روش استفاده | نیاز به Virtual Cable | تنظیم لازم |
| --- | --- | --- |
| **اکستنشن** Chrome/Edge | ندارد | خروجی مرورگر را تغییر نده؛ اکستنشن صدای همان تب را مستقیم Capture و بازپخش می‌کند. |
| VLC، پخش‌کنندهٔ دسکتاپ یا مرورگر **بدون اکستنشن** | دارد | خروجی همان برنامهٔ منبع را روی Virtual Cable بگذار؛ LingoDub کابل را Capture و دوبله را از هدفون واقعی پخش کند. |

در حالت دسکتاپ مسیر صحیح این است:

```text
خروجی VLC یا برنامهٔ منبع → CABLE Input → ورودی Loopback داخل LingoDub
خروجی شنیداری LingoDub → هدفون یا اسپیکر واقعی
```

خروجی خود LingoDub را به Virtual Cable برنگردان؛ این کار اکو و حلقهٔ صوتی می‌سازد. راهنمای داخل برنامه در `http://127.0.0.1:8765/audio-guide.html` قرار دارد.

![راهنمای مسیر صدای دسکتاپ LingoDub](docs/images/audio-routing-guide.png)

## حریم خصوصی و محدودیت‌ها

اپ فقط روی `127.0.0.1` گوش می‌دهد و Key خودش را در Keyring نگه می‌دارد. اکستنشن هیچ دسترسی localhost ندارد، Key کاربر را فقط در `chrome.storage.session` نگه می‌دارد و مستقیم به Google وصل می‌شود. صدا فقط هنگام دوبله ارسال و ضبط‌ها محلی باقی می‌مانند. جزئیات در [PRIVACY.md](PRIVACY.md) است.

مدل‌های Live Translate و TTS در وضعیت Preview هستند؛ هیچ کلاینتی نمی‌تواند کیفیت ترجمه، تأخیر شبکه، سهمیه، دسترسی همیشگی یا ثبات صدای سرویس ابری را ۱۰۰٪ تضمین کند. جداسازی صدای برنامه‌های دسکتاپ فعلاً به Virtual Audio Device نیاز دارد؛ اکستنشن مرورگر بدون آن کار می‌کند.

اکستنشن Proxy را از Chrome/Edge یا سیستم می‌گیرد؛ فیلد Proxy اپ روی آن اثری ندارد. Google برای محصول Client-side در مقیاس Production، توکن موقت صادرشده از Backend را توصیه می‌کند؛ قبل از انتشار عمومی [چک‌لیست Web Store](docs/CHROME_WEB_STORE.md) را ببین.

تغییر خروجی هر برنامه در Windows عمداً دستی است. LingoDub صفحهٔ درست Volume Mixer را باز می‌کند، اما دیگر ادعا نمی‌کند خروجی برنامه‌های دیگر را خودکار تغییر می‌دهد.

پیاده‌سازی بر اساس مستندات به‌روز Google برای [Live Translate](https://ai.google.dev/gemini-api/docs/live-api/live-translate) و [Speech Generation](https://ai.google.dev/gemini-api/docs/speech-generation) است.

برای مشارکت، [CONTRIBUTING.md](CONTRIBUTING.md) و [ROADMAP.md](ROADMAP.md) را ببین. پروژه تحت [مجوز MIT](LICENSE) منتشر می‌شود.

</div>
