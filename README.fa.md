<p align="center">
  <img src="assets/branding/dubira-logo.png" width="148" alt="لوگوی Dubira">
</p>

<h1 align="center">Dubira</h1>

<p align="center"><strong>هر صدایی را به زبان خودت بشنو.</strong></p>

<p align="center">
  صدای دسکتاپ یا مرورگر را زنده ترجمه کن، یا از فایل صوتی و ویدئویی یک دوبلهٔ سینک، متن اصلی، ترجمه و صدای اصلی تحویل بگیر.
</p>

<p align="center">
  <a href="https://github.com/msmahdinejad/dubira/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/msmahdinejad/dubira/ci.yml?branch=main&label=CI"></a>
  <a href="https://github.com/msmahdinejad/dubira/releases"><img alt="Release" src="https://img.shields.io/github/v/release/msmahdinejad/dubira?label=Release"></a>
  <img alt="Python 3.12" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img alt="Node 20+" src="https://img.shields.io/badge/Node-20%2B-339933?logo=nodedotjs&logoColor=white">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-8B5CF6"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="docs/INSTALLATION.fa.md">نصب</a> · <a href="PRIVACY.md">حریم خصوصی</a></p>

![داشبورد انگلیسی Dubira](docs/images/dashboard-en.png)

## دو محصول مستقل

- **اپ ویندوز:** دوبلهٔ زندهٔ صدای دسکتاپ و استودیوی فایل صوتی/ویدئویی.
- **اکستنشن Chrome/Edge:** دوبلهٔ زندهٔ تب، بدون نیاز به اپ، Python، FFmpeg، localhost یا کابل مجازی.

## معماری پردازش فایل

```text
صوت/ویدئو
  ← استخراج و زمان‌بندی محلی با FFmpeg
  ← تبدیل به متن زمان‌دار با Groq Whisper Large v3
  ← ترجمه با قوی‌ترین مدل در دسترس از مخزن رایگان Gemini/Gemma
  ← ساخت گفتار ترجمه‌شده با Gemini 3.1 Flash Live
  ← هماهنگ‌سازی، زیرنویس، پلیر و ZIP روی لپ‌تاپ
```

حالت پیش‌فرض **دقیق** از `whisper-large-v3` استفاده می‌کند، متن صدای تولیدی Live را با ترجمه می‌سنجد و فقط قطعهٔ ناسازگار را دوباره می‌سازد. حالت **سریع** از `whisper-large-v3-turbo` استفاده می‌کند.

چهار خروجی اصلی `original.wav`، `source.srt`، `dubbed.wav` و `translated.srt` هستند و همگی در `all-outputs.zip` نیز قرار می‌گیرند. پلیر داخلی ویدئو/صوت را ساعت مرجع قرار می‌دهد، اختلاف بیشتر از ۱۲۰ میلی‌ثانیه را اصلاح می‌کند، با خاموش‌شدن گزینهٔ صدای اصلی آن را واقعاً mute می‌کند و متن‌های بلند را به زیرنویس‌های کوتاه و طبیعی فیلمی می‌شکند. گوینده هم برای هر پروژه داخل Media Studio انتخاب می‌شود.

مدل‌های ترجمه به‌ترتیب قدرت استفاده می‌شوند: `gemini-3.6-flash`، `gemini-3.5-flash`، `gemini-3-flash-preview`، `gemini-2.5-flash`، مدل‌های Flash-Lite دارای سهمیه، سپس Gemma 4 31B و 26B. در 429 یا عدم دسترسی، مدل بعدی خودکار امتحان می‌شود. مدل‌های تصویر، TTS، Live، Embedding و مدل‌های با سهمیهٔ صفر وارد pool ترجمه نشده‌اند.

## نصب سریع اپ

1. `Dubira-Setup-x64.exe` را از [Releases](https://github.com/msmahdinejad/dubira/releases) بگیر.
2. گزینهٔ **Install FFmpeg** را برای پردازش فایل روشن نگه دار.
3. در تنظیمات پیشرفته، [کلید Gemini](https://aistudio.google.com/app/apikey) و [کلید Groq](https://console.groq.com/keys) را ذخیره کن.
4. در صورت نیاز Proxy را روی `http://127.0.0.1:10808` بگذار.

برای توقف کامل پردازش محلی از دکمهٔ **خروج کامل** در نوار بالای اپ استفاده کن؛ بستن تب کافی نیست.

کلیدها در Windows Credential Manager ذخیره می‌شوند و داخل `settings.json` نیستند. پلن رایگان هر سرویس سهمیه و قوانین خودش را دارد و دائمی‌بودن رایگان‌بودن آن تحت کنترل Dubira نیست.

اگر نصب FFmpeg در Installer موفق نشد:

```powershell
winget install --id Gyan.FFmpeg --exact --scope user
```

## نصب اکستنشن

1. `Dubira-Extension.zip` را Extract کن.
2. `chrome://extensions` یا `edge://extensions` را باز کن.
3. **Developer mode** را روشن و **Load unpacked** را بزن.
4. پوشهٔ Extractشده را انتخاب کن، اکستنشن را Pin کن و کلید Gemini را برای همان نشست وارد کن.

اکستنشن کاملاً مستقل است. نصب واقعاً یک‌کلیکی در Chrome فقط بعد از انتشار در Chrome Web Store ممکن می‌شود.

## مسیر صدای اپ دسکتاپ

پردازش فایل و اکستنشن به دستگاه مجازی نیاز ندارند. فقط دوبلهٔ زندهٔ اپ:

1. خروجی مرورگر/برنامه → `Speakers (AMM Virtual Audio Device)`
2. ورودی Dubira → `Microphone (AMM Virtual Audio Device)`
3. خروجی Dubira → `Default` یا هدفون/اسپیکر واقعی
4. برای شنیدن فقط دوبله، صدای اصلی را روی صفر بگذار.

خروجی Dubira را روی AMM Virtual نگذار؛ حلقهٔ اکو می‌سازد. راهنمای تصویری در [آموزش نصب فارسی](docs/INSTALLATION.fa.md) است.

## توسعه و تست

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,build]"
python -m pytest -q
python -m ruff check src tests scripts
python -m mypy src
node --test tests\*.test.mjs
.\scripts\dev.ps1
```

## حریم خصوصی و محدودیت‌ها

- فایل اصلی و خروجی‌ها محلی می‌مانند؛ قطعه‌های صوتی برای Whisper به Groq ارسال می‌شوند.
- متن برای ترجمه و ساخت صوت به Gemini می‌رود.
- سقف محلی ترافیک Gemini برابر ۱۵ هزار توکن در هر ۶۰ ثانیه است؛ پایین‌تر از حد ۲۰ هزار درخواستی.
- مدل‌های Live در وضعیت Preview هستند و دقت، صدا، تأخیر، سهمیه و دسترس‌پذیری تضمین صددرصدی ندارند.
- حذف مطمئن هشدار SmartScreen نیازمند امضای کد معتبر و ساخت reputation ناشر است.

مجوز: [MIT](LICENSE)
