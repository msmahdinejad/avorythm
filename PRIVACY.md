# LingoDub privacy policy / سیاست حریم خصوصی LingoDub

Effective date: 2026-08-11

## English

LingoDub processes only content the user explicitly selects: a started browser tab, a configured desktop audio input, or a locally uploaded audio/video file.

- **Live audio and transcripts:** sent from the selected product to Google Gemini solely to provide translation and dubbing. They are not sent to the LingoDub developer.
- **Uploaded media:** remains on the user's computer. The Windows app extracts PCM locally with FFmpeg; only that audio is sent to Gemini. In Precise mode, generated dubbed PCM is also sent back to the same Gemini Live Translate model for a semantic back-check. Jobs, source files, WAV/SRT/VTT outputs, and ZIP archives remain in the local LingoDub data directory until the user deletes them.
- **Desktop Gemini API key:** stored in Windows Credential Manager. Developers may opt into a private, Git-ignored `.env` file.
- **Extension Gemini API key:** supplied by the user, stored only in Chrome session storage, not synced, and cleared when the browser fully exits. It is sent only to Google's Gemini WebSocket endpoint for user-requested calls.
- **Preferences:** language, audio mix, locale, recording choice, devices, and proxy settings are stored locally. The extension does not offer or store a named voice because Live Translate generates its voice automatically.
- **Recordings:** the desktop app writes local files. The extension temporarily writes PCM to the browser's Origin Private File System, exports two WAV and two SRT files to Downloads, then removes the temporary audio files.
- **Analytics and advertising:** LingoDub contains no analytics, advertising, tracking, sale of data, developer telemetry, or unrelated use of captured content.

Users can stop processing at any time, clear the extension session key, delete a Media Studio job, clear extension storage, or uninstall either product. Google processes API traffic under its own applicable terms and privacy policy. Only process or record media you are authorized to use.

LingoDub's use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including Limited Use requirements. A public production extension should use Google-recommended short-lived ephemeral tokens rather than a long-lived client-side key.

Questions and privacy requests can be submitted through [GitHub Issues](https://github.com/msmahdinejad/lingodub/issues). Security reports should use the private GitHub vulnerability-reporting flow in [SECURITY.md](SECURITY.md).

## فارسی

LingoDub فقط محتوایی را پردازش می‌کند که کاربر صریحاً انتخاب کرده باشد: تب مرورگری که Start شده، ورودی صدای دسکتاپ تنظیم‌شده، یا فایل صوتی/ویدئویی محلی.

- **صدا و متن زنده:** فقط برای ترجمه و دوبله از محصول انتخاب‌شده به Google Gemini فرستاده می‌شوند و برای توسعه‌دهندهٔ LingoDub ارسال نمی‌شوند.
- **رسانهٔ آپلودشده:** روی رایانهٔ کاربر می‌ماند. اپ ویندوز PCM را با FFmpeg محلی استخراج می‌کند و فقط همان صدا را به Gemini می‌فرستد. در حالت دقیق، PCM دوبلهٔ تولیدشده برای کنترل معنایی دوباره به همان مدل Gemini Live Translate ارسال می‌شود. Job، فایل منبع، WAV/SRT/VTT و ZIP تا زمان حذف توسط کاربر در پوشهٔ دادهٔ محلی LingoDub باقی می‌مانند.
- **Gemini API Key اپ:** در Windows Credential Manager ذخیره می‌شود. توسعه‌دهنده می‌تواند از فایل خصوصی و Git-ignored `.env` استفاده کند.
- **Gemini API Key اکستنشن:** توسط کاربر وارد می‌شود، فقط در Session Storage کروم می‌ماند، Sync نمی‌شود و با بسته‌شدن کامل مرورگر پاک می‌شود. کلید فقط برای درخواست انتخاب‌شدهٔ کاربر به WebSocket گوگل می‌رود.
- **تنظیمات:** زبان، میکس صدا، زبان رابط، ضبط، دستگاه‌ها و پروکسی فقط محلی هستند. named voice ذخیره نمی‌شود چون خود Live Translate صدا را خودکار می‌سازد.
- **ضبط:** اپ فایل محلی می‌نویسد. اکستنشن PCM را موقتاً در OPFS نگه می‌دارد، دو WAV و دو SRT را در Downloads خروجی می‌دهد و سپس فایل صوتی موقت را حذف می‌کند.
- **ردیابی و تبلیغات:** هیچ Analytics، تبلیغ، Tracking، فروش داده، Telemetry توسعه‌دهنده یا استفادهٔ نامرتبط از محتوا وجود ندارد.

کاربر هر زمان می‌تواند پردازش را متوقف، کلید Session اکستنشن را پاک، Job رسانه را حذف، Storage اکستنشن را پاک یا محصول را Uninstall کند. پردازش API توسط Google تابع قوانین و سیاست حریم خصوصی خودش است. فقط محتوایی را پردازش یا ضبط کنید که اجازهٔ آن را دارید.

استفادهٔ LingoDub از داده‌های Google API با Chrome Web Store User Data Policy و Limited Use مطابقت دارد. نسخهٔ production عمومی بهتر است به‌جای کلید بلندمدت سمت کلاینت از ephemeral token کوتاه‌عمر پیشنهادی Google استفاده کند.

پرسش‌های حریم خصوصی را در [GitHub Issues](https://github.com/msmahdinejad/lingodub/issues) ثبت کنید. گزارش امنیتی خصوصی طبق [SECURITY.md](SECURITY.md) ارسال شود.
