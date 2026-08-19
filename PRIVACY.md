# Avorythm privacy policy / سیاست حریم خصوصی Avorythm

Effective date: 2026-08-19

## English

Avorythm processes only content the user explicitly selects: a started browser tab, a configured desktop audio input, or a locally uploaded audio/video file.

- **Live audio and transcripts:** sent from the selected product to Google Gemini solely to provide translation and dubbing. They are not sent to the Avorythm developer.
- **Uploaded media:** remains on the user's computer. The Windows app extracts small audio chunks locally with FFmpeg and sends them to Groq Whisper for transcription. Transcript text is sent to Google Gemini for translation, and translated text is sent to Gemini Live for speech generation. Jobs, source files, WAV/SRT/VTT outputs, and ZIP archives remain in the local Avorythm data directory until the user deletes them.
- **Desktop API keys:** Gemini and Groq keys are stored separately in the operating-system keyring.
- **Extension Gemini API key:** supplied by the user, stored only in Chrome session storage, not synced, and cleared when the browser fully exits. It is sent only to Google's official Gemini Live WebSocket when the user starts translation. Websites and the Avorythm project cannot read it.
- **Optional extension Groq API key:** requested only when the user chooses Whisper caption timing. Chrome asks for the optional `api.groq.com` host permission, the key stays only in session storage, and short audio windows are sent directly to Groq for timestamps. If this path fails, Avorythm falls back to Gemini caption timing.
- **Preferences:** language, file voice, audio mix, floating-caption size/position/opacity, locale, recording choice, devices, and proxy settings are stored locally. The extension's Live Translate voice remains automatic.
- **Recordings:** the desktop app writes local files. The extension temporarily writes PCM to the browser's Origin Private File System, exports two WAV and two SRT files to Downloads, then removes the temporary audio files.
- **Synchronized extension player:** after the user chooses this mode and presses Start, captured audio/video is recorded incrementally into Chrome's Origin Private File System so the independent player can pause, seek, fullscreen, recover its safety lead, and export a WebM. The recording is not uploaded to Avorythm infrastructure. It remains until it is replaced by the next synchronized session or the user clears extension data/uninstalls; choosing Download creates a copy in Downloads. The audio stream still goes directly to Google Gemini for the requested translation. Separately enabling **Save four outputs** creates the two WAV and two SRT downloads and removes their temporary PCM files after finalization.
- **Analytics and advertising:** Avorythm contains no analytics, advertising, tracking, sale of data, developer telemetry, or unrelated use of captured content.

Users can stop processing at any time, clear the extension session key, delete a Media Studio job, clear extension storage, or uninstall either product. Google and Groq process API traffic under their applicable terms and privacy policies. Only process or record media you are authorized to use.

Avorythm's use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including Limited Use requirements. Avorythm uses this information only to provide or improve the user-requested translation feature, transfers it only to Google as necessary for that purpose, never uses it for advertising or data brokerage, and does not allow the maintainer or other humans to read it. The extension prominently discloses this transfer and requires consent before the first capture.

The public extension does not embed a developer-owned Gemini credential or operate a credential server. In its current bring-your-own-key mode, a user deliberately supplies their own Gemini credential; it remains in Chrome session storage and connects directly to Google. Users should restrict the key to the Gemini API, monitor its usage, and rotate it if they suspect exposure. Any future managed-credential service must keep the operator credential server-side and return only short-lived tokens.

Questions and privacy requests can be submitted through [GitHub Issues](https://github.com/msmahdinejad/avorythm/issues). Security reports should use the private GitHub vulnerability-reporting flow in [SECURITY.md](SECURITY.md).

## فارسی

Avorythm فقط محتوایی را پردازش می‌کند که کاربر صریحاً انتخاب کرده باشد: تب مرورگری که Start شده، ورودی صدای دسکتاپ تنظیم‌شده، یا فایل صوتی/ویدئویی محلی.

- **صدا و متن زنده:** فقط برای ترجمه و دوبله از محصول انتخاب‌شده به Google Gemini فرستاده می‌شوند و برای توسعه‌دهندهٔ Avorythm ارسال نمی‌شوند.
- **رسانهٔ آپلودشده:** روی رایانهٔ کاربر می‌ماند. اپ قطعه‌های کوچک صوتی را با FFmpeg محلی استخراج و برای تبدیل به متن به Groq Whisper می‌فرستد؛ متن برای ترجمه و ساخت صدا به Gemini می‌رود. Job، فایل منبع و همهٔ خروجی‌ها تا زمان حذف کاربر محلی می‌مانند.
- **کلیدهای API اپ:** کلیدهای Gemini و Groq جداگانه در فضای امن سیستم‌عامل ذخیره می‌شوند.
- **Gemini API Key اکستنشن:** توسط کاربر وارد می‌شود، فقط در Session Storage کروم می‌ماند، Sync نمی‌شود و با بسته‌شدن کامل مرورگر پاک می‌شود. کلید فقط بعد از شروع ترجمه به WebSocket رسمی Gemini فرستاده می‌شود؛ وب‌سایت‌ها و پروژهٔ Avorythm به آن دسترسی ندارند.
- **کلید اختیاری Groq در اکستنشن:** فقط وقتی کاربر زمان‌بندی Whisper را انتخاب کند لازم است. Chrome همان موقع اجازهٔ اختیاری اتصال به `api.groq.com` را می‌خواهد؛ کلید فقط در Session Storage می‌ماند و پنجره‌های کوتاه صوتی برای timestamp مستقیم به Groq می‌روند. اگر این مسیر خطا بدهد، زمان‌بندی به Gemini برمی‌گردد.
- **تنظیمات:** زبان، گویندهٔ فایل، میکس صدا، زبان رابط، ضبط، دستگاه‌ها و پروکسی فقط محلی هستند. صدای Live Translate اکستنشن خودکار است.
- **ضبط:** اپ فایل محلی می‌نویسد. اکستنشن PCM را موقتاً در OPFS نگه می‌دارد، دو WAV و دو SRT را در Downloads خروجی می‌دهد و سپس فایل صوتی موقت را حذف می‌کند.
- **پلیر هماهنگ اکستنشن:** وقتی کاربر این حالت را انتخاب و Start را می‌زند، صوت و تصویر تب به‌تدریج در Origin Private File System کروم ضبط می‌شود تا پلیر مستقل بتواند Pause، Seek، Fullscreen، بازسازی فاصلهٔ امن و خروجی WebM داشته باشد. این ضبط به زیرساخت Avorythm آپلود نمی‌شود و تا شروع نشست هماهنگ بعدی، پاک‌کردن داده‌های اکستنشن یا Uninstall باقی می‌ماند؛ Download یک کپی در Downloads می‌سازد. صدای لازم برای ترجمه همچنان مستقیم به Google Gemini می‌رود. گزینهٔ جداگانهٔ **ذخیرهٔ چهار خروجی** دو WAV و دو SRT می‌سازد و PCM موقت آن‌ها پس از نهایی‌شدن حذف می‌شود.
- **ردیابی و تبلیغات:** هیچ Analytics، تبلیغ، Tracking، فروش داده، Telemetry توسعه‌دهنده یا استفادهٔ نامرتبط از محتوا وجود ندارد.

کاربر هر زمان می‌تواند پردازش را متوقف، کلید Session اکستنشن را پاک، Job رسانه را حذف، Storage اکستنشن را پاک یا محصول را Uninstall کند. پردازش API توسط Google و Groq تابع قوانین و سیاست‌های حریم خصوصی خودشان است. فقط محتوایی را پردازش یا ضبط کنید که اجازهٔ آن را دارید.

استفادهٔ Avorythm از داده‌های Google API با Chrome Web Store User Data Policy و Limited Use مطابقت دارد. این داده فقط برای قابلیت ترجمهٔ درخواستی کاربر استفاده و فقط به‌اندازهٔ لازم به Google منتقل می‌شود؛ برای تبلیغات، فروش داده یا خواندن توسط توسعه‌دهنده و انسان‌های دیگر استفاده نمی‌شود. اکستنشن قبل از اولین Capture این انتقال را واضح توضیح می‌دهد و رضایت کاربر را می‌گیرد.

اکستنشن هیچ کلید متعلق به توسعه‌دهنده را داخل بسته قرار نمی‌دهد و سرور واسط Credential هم ندارد. در حالت فعلی BYOK، کاربر آگاهانه کلید Gemini خودش را وارد می‌کند؛ کلید فقط در Session Storage کروم می‌ماند و مستقیم به Google متصل می‌شود. بهتر است کاربر کلید را به Gemini API محدود کند، مصرفش را زیر نظر بگیرد و در صورت احتمال افشا آن را عوض کند. هر سرویس Credential مدیریت‌شدهٔ آینده باید کلید اپراتور را سمت سرور نگه دارد و فقط توکن کوتاه‌عمر را برگرداند.

پرسش‌های حریم خصوصی را در [GitHub Issues](https://github.com/msmahdinejad/avorythm/issues) ثبت کنید. گزارش امنیتی خصوصی طبق [SECURITY.md](SECURITY.md) ارسال شود.
