# LingoDub privacy policy / سیاست حریم خصوصی

Effective date: 2026-08-11

## English

The LingoDub browser extension processes only the browser tab whose audio the user explicitly starts capturing.

- **Tab audio and transcripts:** streamed directly from the extension to the Google Gemini API to provide live translation and dubbing. They are not sent to the LingoDub developer or the Windows app.
- **Gemini API key:** supplied by the user, stored only in Chrome session storage, not synced, and cleared when the browser fully exits. It is sent only to Google's Gemini endpoints for user-requested API calls.
- **Preferences:** language, voice, audio mix, locale, and recording choice are stored locally in the browser profile.
- **Recordings:** when enabled, PCM audio is written temporarily to the browser's Origin Private File System, exported as two WAV and two SRT files to Downloads, then the temporary audio files are removed.
- **Analytics and advertising:** LingoDub contains no analytics, advertising, tracking, sale of data, or unrelated use of captured content.

Users can stop processing at any time, clear the session key in the popup, clear extension storage in Chrome, or uninstall the extension. Google processes API traffic under its own applicable terms and privacy policy. Only process or record audio you are authorized to use.

LingoDub's use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

Questions and privacy requests can be submitted through [GitHub Issues](https://github.com/msmahdinejad/lingodub/issues). Security reports should use the repository's private GitHub vulnerability-reporting flow described in [SECURITY.md](SECURITY.md).

## فارسی

اکستنشن LingoDub فقط صدای تبی را پردازش می‌کند که کاربر صریحاً Capture آن را شروع کرده باشد.

- **صدای تب و متن‌ها:** برای ترجمه و دوبلهٔ زنده مستقیماً از اکستنشن به Gemini API گوگل فرستاده می‌شوند و به توسعه‌دهندهٔ LingoDub یا اپ ویندوز ارسال نمی‌شوند.
- **Gemini API Key:** توسط خود کاربر وارد می‌شود، فقط در Session Storage کروم می‌ماند، Sync نمی‌شود و با بسته‌شدن کامل مرورگر پاک می‌شود. کلید فقط برای درخواست‌های انتخاب‌شدهٔ کاربر به endpointهای Gemini گوگل ارسال می‌شود.
- **تنظیمات:** زبان، گوینده، میکس صدا، زبان رابط و انتخاب ضبط فقط در پروفایل محلی مرورگر ذخیره می‌شوند.
- **ضبط:** در صورت فعال‌سازی، PCM موقتاً در OPFS مرورگر نوشته، به دو WAV و دو SRT در Downloads تبدیل و سپس فایل‌های صوتی موقت حذف می‌شوند.
- **ردیابی و تبلیغات:** هیچ Analytics، تبلیغ، Tracking، فروش داده یا استفادهٔ نامرتبط از محتوای Captureشده وجود ندارد.

کاربر هر زمان می‌تواند پردازش را متوقف، کلید نشست را از Popup حذف، Storage اکستنشن را پاک یا اکستنشن را Uninstall کند. پردازش ترافیک API توسط گوگل تابع شرایط و سیاست حریم خصوصی خود گوگل است. فقط صدایی را پردازش یا ضبط کنید که اجازهٔ آن را دارید.

استفادهٔ LingoDub از اطلاعات دریافتی از APIهای گوگل با Chrome Web Store User Data Policy، از جمله الزامات Limited Use، مطابقت دارد.

پرسش‌ها و درخواست‌های حریم خصوصی را می‌توان در [GitHub Issues](https://github.com/msmahdinejad/lingodub/issues) ثبت کرد. گزارش امنیتی باید از مسیر خصوصی GitHub که در [SECURITY.md](SECURITY.md) توضیح داده شده ارسال شود.
