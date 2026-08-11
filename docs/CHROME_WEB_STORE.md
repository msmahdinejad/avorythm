# Chrome Web Store publication guide / راهنمای انتشار در Chrome Web Store

> Policy snapshot: 2026-08-11. Chrome Web Store policies change over time; re-check the linked official pages immediately before every submission.

## راهنمای فارسی

### نتیجهٔ کوتاه

- برای نصب عمومی و یک‌کلیکی روی Windows و macOS باید اکستنشن در Chrome Web Store منتشر شود. `Load unpacked` فقط برای توسعه است و self-hosting روی این دو سیستم‌عامل فقط در محیط‌های مدیریت‌شدهٔ سازمانی پشتیبانی می‌شود. [روش‌های رسمی توزیع Chrome](https://developer.chrome.com/docs/extensions/how-to/distribute) و [روش‌های نصب جایگزین](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions)
- اکستنشن جدید باید Manifest V3 باشد؛ Manifest V3 نسخهٔ لازم برای ارسال آیتم جدید است و Manifest V2 دیگر پذیرفته یا اجرا نمی‌شود. [Best practices رسمی Web Store](https://developer.chrome.com/docs/webstore/best-practices) و [خط زمانی حذف Manifest V2](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline)
- مستقل‌بودن از برنامهٔ دسکتاپ ممکن است و نسخهٔ `0.4.1` مستقل است. بااین‌حال، BYOK فعلی که کلید خام را فقط در `chrome.storage.session` نگه می‌دارد یک راه‌حل self-hosted/prototype است، نه معماری production ترجیحی Store. Google صریحاً می‌گوید کلید Gemini نباید در client تولیدی قرار بگیرد و برای اتصال مستقیم Live API از مرورگر باید توکن کوتاه‌عمر از backend صادر شود. [امنیت Gemini API Key](https://ai.google.dev/gemini-api/docs/api-key) و [Ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)

معماری پیشنهادی برای نسخهٔ قابل انتشار:

```text
Chrome extension
  ├─ captures only the user-selected tab
  ├─ asks a small HTTPS service for a short-lived token
  └─ connects directly to Gemini Live over WSS with that token

Token service
  └─ keeps the long-lived Gemini credential server-side
```

این معماری به نصب LingoDub Desktop نیاز ندارد؛ backend فقط توکن کوتاه‌عمر می‌سازد و صدای زنده می‌تواند مستقیم از مرورگر به Gemini برود. Google می‌گوید توکن‌های ephemeral برای client-to-server Live API طراحی شده‌اند، قابل محدودسازی‌اند و ریسک افشای credential را کم می‌کنند. [راهنمای رسمی توکن‌های موقت](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)

### قوانین فنی و محتوایی اصلی

#### ۱. یک هدف واضح

اکستنشن باید یک هدف محدود، قابل‌فهم و منسجم داشته باشد. قابلیت‌های نامرتبط باید اکستنشن جداگانه باشند. [Chrome Web Store Quality Guidelines](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines)

متن پیشنهادی برای فیلد **Single purpose**:

> LingoDub captures audio from the browser tab explicitly selected by the user, sends it to Google Gemini for real-time translation, and plays the translated speech and transcripts in that tab session.

کنترل صدای اصلی/دوبله، انتخاب زبان، زیرنویس و ضبط خروجی همگی زیرمجموعهٔ همین هدف «ترجمه و دوبلهٔ زندهٔ تب انتخاب‌شده» هستند.

#### ۲. حداقل permission

فقط باریک‌ترین permissionهای لازم را درخواست کنید؛ permission برای قابلیت آینده یا «شاید بعداً لازم شود» مجاز نیست. درخواست بیش‌ازحد می‌تواند باعث ردشدن شود. [Use of Permissions policy](https://developer.chrome.com/docs/webstore/program-policies/permissions) و [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)

توجیه‌های پیشنهادی برای permissionهای LingoDub:

| Permission | متن پیشنهادی برای reviewer |
|---|---|
| `activeTab` | Identifies only the tab chosen by the user after an explicit extension action; the extension does not read every open website in the background. |
| `tabCapture` | Captures the selected tab's audio only after the user presses Start so it can be translated and dubbed. Chrome restricts tab capture to a user invocation. |
| `offscreen` | Hosts the Web Audio pipeline required for tab audio capture and playback because a Manifest V3 service worker has no DOM or AudioContext. |
| `storage` | Stores language, audio mix, volume, locale, and recording preferences. It must not be used to persist a long-lived production Gemini secret. |
| `downloads` | Saves the user-requested local WAV/SRT exports after recording; it is not used for automatic or unrelated downloads. |
| Gemini host permission | Connects only to Google's Gemini WSS endpoint to stream selected-tab audio and receive translated audio/transcripts. Scope this to the exact required origin. After auth hardening, mention that Live WSS uses a short-lived token. |

رفتار `tabCapture` و نیاز آن به اقدام کاربر و همچنین استفاده از stream ID در offscreen document از Chrome 116 مستند است. [tabCapture API](https://developer.chrome.com/docs/extensions/reference/api/tabCapture) و [offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen)

#### ۳. کد remote ممنوع

در Manifest V3 همهٔ JavaScript/WASM اجرایی باید داخل ZIP باشد. script خارجی، `eval()` روی متن دریافت‌شده، یا interpreter برای دستورهای remote تخلف است. گرفتن «داده» یا اجرای پردازش server-side مجاز است، به شرط آنکه منطق اکستنشن در بسته قابل بررسی باشد. [Manifest V3 remote-code requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)

در Privacy tab باید گزینهٔ **No, I am not using remote code** فقط زمانی انتخاب شود که هیچ کد خارجی اجرا نمی‌شود. پاسخ‌های Gemini، فایل پیکربندی ساده و audio data کد remote محسوب نمی‌شوند؛ نباید به کد تبدیل یا اجرا شوند.

کد نباید obfuscate یا عمداً مبهم شود. Minification معمول مجاز است، ولی reviewer باید عملکرد را بفهمد. [Code Readability Requirements](https://developer.chrome.com/docs/webstore/program-policies/code-readability)

#### ۴. حریم خصوصی و رضایت روشن

صدای تب و transcript مشتق‌شده «user data» و معمولاً **Website content** هستند؛ اگر اکستنشن برای تماس یا محتوای خصوصی هم قابل استفاده باشد، **Personal communications** نیز باید اعلام شود. API Key یا token هم **Authentication information** است. پردازش محلی نیز باید اعلام شود. [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

قبل از اولین capture، کنار دکمهٔ Start یک disclosure واضح نمایش دهید؛ نه فقط داخل Privacy Policy:

> By starting live dubbing, audio from the selected tab is sent to Google Gemini for translation. LingoDub does not capture other tabs. Recording is off unless you enable it.

کاربر باید با یک اقدام مثبت مثل **Start dubbing** رضایت بدهد. نوع داده، هدف استفاده و گیرندهٔ داده باید قبل از جمع‌آوری روشن باشد. [Disclosure Requirements](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements) و [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

یک Privacy Policy عمومی با URL پایدار لازم است و باید حداقل این موارد را دقیق بگوید:

- چه داده‌ای گرفته می‌شود: صدای تب انتخاب‌شده، transcript، زبان/صدا/volume، وضعیت ضبط و authentication token.
- capture دقیقاً چه زمانی آغاز و متوقف می‌شود.
- چه داده‌ای به Google Gemini ارسال می‌شود و چرا.
- آیا توسعه‌دهنده server log دارد؛ اگر دارد، چه چیزی و برای چه مدت.
- فایل ضبط‌شده کجا ذخیره می‌شود و چگونه حذف می‌شود.
- در build فعلی، BYOK فقط در `chrome.storage.session` و حافظهٔ offscreen تا پایان session نگه‌داری و مستقیم به Google ارسال می‌شود؛ در نسخهٔ broker، کلید بلندمدت server-side می‌ماند و اکستنشن فقط توکن کوتاه‌عمر می‌گیرد.
- هنگام ضبط، PCM موقت در Origin Private File System نوشته، به چهار فایل محلی تبدیل و ورودی‌های موقت بعد از download حذف می‌شوند.
- داده برای تبلیغات شخصی، فروش یا استفادهٔ نامرتبط منتقل نمی‌شود.
- روش تماس، درخواست حذف داده و تاریخ آخرین تغییر policy.

Privacy tab، Store listing، UI و Privacy Policy نباید با هم تناقض داشته باشند. Chrome می‌تواند آیتمی را که privacy declaration آن نادرست است حذف کند. [Listing Requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements) و [Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)

اگر داده‌ای از Google APIs دریافت می‌شود، متن Limited Use پیشنهادی Google را هم در Privacy Policy قرار دهید:

> The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

[Chrome Web Store User Data policy](https://developer.chrome.com/docs/webstore/program-policies/policies)

#### ۵. عملکرد واقعی و قابل تست

اکستنشن ناقص، دارای دکمهٔ خراب، وابسته به سایت مرده، یا صرفاً launcher یک برنامه/صفحه مجاز نیست. [Minimum Functionality policy](https://developer.chrome.com/docs/webstore/program-policies/minimum-functionality)

قبل از ارسال، جریان کامل را روی Chrome Stable و یک پروفایل تازه تست کنید:

1. نصب تازه و onboarding.
2. دریافت رضایت و توکن.
3. capture تنها پس از click کاربر.
4. پخش صدای اصلی، فقط دوبله و smart mix.
5. توقف capture، بسته‌شدن WebSocket و خاموش‌شدن recording indicator.
6. خطاهای key/quota/network/unsupported page با پیام قابل‌فهم.
7. عدم capture روی صفحات محدود Chrome و مدیریت مناسب آن.
8. RTL فارسی و LTR انگلیسی.
9. پاک‌کردن تنظیمات/داده و uninstall.

اگر قابلیت کامل به حساب، API access یا credential محدود نیاز دارد، در تب **Test instructions** مراحل دقیق و credential آزمایشی reviewer را وارد کنید. این تب اجباری نیست، اما برای قابلیت محدود یا پولی توصیهٔ رسمی Chrome است. [Test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)

### دارایی‌های Store listing

حداقل فایل‌های تصویری رسمی:

| دارایی | الزام |
|---|---|
| Store icon | PNG، دقیقاً `128×128`؛ برای آیکن مربعی artwork پیشنهادی `96×96` با ۱۶ پیکسل padding شفاف در هر طرف |
| Screenshot | حداقل ۱ و حداکثر ۵؛ دقیقاً `1280×800` یا `640×400`، گوشهٔ مربع و full-bleed |
| Small promo tile | PNG/JPEG، دقیقاً `440×280`، الزامی |
| Marquee | PNG/JPEG، دقیقاً `1400×560`، اختیاری ولی لازم برای شانس نمایش marquee |

ابعاد و الزامی‌بودن این فایل‌ها در [Supplying Images](https://developer.chrome.com/docs/webstore/images) آمده است. Screenshot باید تجربهٔ واقعی نسخهٔ جاری را نشان دهد، گمراه‌کننده یا پر از متن نباشد. [Creating a great listing](https://developer.chrome.com/docs/webstore/best-listing)

نکته: صفحهٔ رسمی Store Listing، YouTube promo video را در فهرست دارایی‌ها می‌آورد، ولی راهنمای رسمی Images فقط icon، small tile و حداقل یک screenshot را mandatory می‌داند. برای کم‌کردن ریسک، یک ویدیوی کوتاه واقعی آماده کنید یا validation فعلی Dashboard را ملاک نهایی قرار دهید. [Store Listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) و [Supplying Images](https://developer.chrome.com/docs/webstore/images)

Store Listing همچنین به description دقیق، category، زبان اصلی و ترجیحاً Homepage و Support URL نیاز دارد. Description خالی، icon یا screenshot مفقود و metadata گمراه‌کننده باعث ردشدن می‌شوند. [Listing Requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements)

برای listing دوزبانهٔ واقعی، رشته‌های manifest را با `_locales/en/messages.json` و `_locales/fa/messages.json` محلی‌سازی کنید؛ بعد Dashboard اجازه می‌دهد description و screenshot جدا برای هر locale وارد شود. [Localize your listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#localize_your_listing)

### ساخت حساب ناشر

1. با یک Google Account پایدار وارد [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) شوید.
2. Developer Agreement و policies را بپذیرید و registration fee یک‌باره را بپردازید. مستند رسمی مبلغ ثابتی اعلام نمی‌کند؛ مبلغی که Dashboard نشان می‌دهد مرجع همان روز است. [Register your developer account](https://developer.chrome.com/docs/webstore/register/)
3. **2-Step Verification** را فعال کنید؛ برای publish و update الزامی است. [Program Policies — 2-Step Verification](https://developer.chrome.com/docs/webstore/program-policies/policies#2-step-verification)
4. Publisher name و contact email را ثبت و email را verify کنید. آدرس فیزیکی برای محصولی که خرید، subscription یا قابلیت پولی دارد لازم می‌شود. [Set up your developer account](https://developer.chrome.com/docs/webstore/set-up-account)
5. همهٔ ناشران باید وضعیت **Trader / Non-Trader** را اعلام کنند. Trader باید نام قانونی، تلفن و آدرس بدهد و این اطلاعات در listing عمومی نمایش داده می‌شود. [Trader Verification FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq)
6. در صورت داشتن دامنه، مالکیت آن را در Search Console تأیید کنید تا Official URL/verified publisher نمایش داده شود؛ اجباری نیست ولی اعتماد را بیشتر می‌کند. [Store listing — verified publisher](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#display_your_verified_publisher_status)

### مراحل دقیق ارسال

1. اکستنشن را با Developer mode و **Load unpacked** روی یک پروفایل تمیز تست کنید.
2. `manifest.json` را بررسی کنید: `manifest_version: 3`، name، version، description حداکثر ۱۳۲ کاراکتر و iconها. [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)
3. یک ZIP بسازید که `manifest.json` مستقیم در ریشهٔ ZIP باشد، نه داخل یک پوشهٔ اضافی. حداکثر اندازهٔ بسته ۲ GB است. [Prepare](https://developer.chrome.com/docs/webstore/prepare) و [Publish](https://developer.chrome.com/docs/webstore/publish/)
4. Dashboard → **Add new item** → انتخاب ZIP → **Upload**.
5. تب **Store listing**: description، category، زبان، icon، screenshotها، small promo tile، لینک Homepage/Support و در صورت استفاده video/marquee.
6. تب **Privacy practices**: single purpose، justification تک‌تک permissionها، remote code = No، data-use checkboxes، Limited Use certification و Privacy Policy URL. [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
7. تب **Distribution**: Public، Unlisted یا Private و regionها. هر سه حالت دقیقاً همان policy review را طی می‌کنند؛ Private برای trusted testers مناسب است. [Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution/)
8. تب **Test instructions**: اگر Gemini access محدود است، راه‌اندازی و credential آزمایشی reviewer را وارد کنید.
9. **Submit for Review** را بزنید. برای کنترل زمان انتشار، deferred publishing را انتخاب کنید؛ بعد از تأیید حداکثر ۳۰ روز برای publish دستی فرصت دارید. [Publish flow](https://developer.chrome.com/docs/webstore/publish/)
10. وضعیت Pending/Rejected/Published را در Dashboard و email ناشر پیگیری کنید. اکثر reviewها چند روز طول می‌کشند، اما ممکن است چند هفته شوند؛ permission گسترده، کد زیاد یا سخت‌خوان و developer/extension جدید review را طولانی‌تر می‌کند. [Review process](https://developer.chrome.com/docs/webstore/review-process)

### به‌روزرسانی بعد از انتشار

- `version` در manifest را افزایش دهید، ZIP کامل جدید را upload کنید، metadata/privacy تغییرکرده را به‌روز کنید و دوباره Submit for Review بزنید. [Update your item](https://developer.chrome.com/docs/webstore/update/)
- اضافه‌کردن permission جدید به update می‌تواند باعث prompt مجدد و غیرفعال‌شدن اکستنشن تا تأیید کاربر شود؛ permissionها را ثابت و حداقلی نگه دارید. [Update your item](https://developer.chrome.com/docs/webstore/update/)
- برای امنیت supply chain می‌توان Verified CRX Uploads را با کلید RSA فعال کرد؛ private key هرگز نباید در repo یا Google Account ذخیره شود. [Verified CRX uploads](https://developer.chrome.com/docs/webstore/update/#protect_package_updates)

### ممیزی وضعیت فعلی repository

این جدول باید درست پیش از بسته‌بندی نهایی دوباره اجرا/بازبینی شود:

| مورد | وضعیت فعلی | اقدام لازم پیش از submission |
|---|---|---|
| Manifest و metadata | ✅ Manifest V3، نسخهٔ `0.4.1` و description کمتر از سقف ۱۳۲ کاراکتر | قبل از هر upload نسخه افزایش یابد و متن با build یکسان بماند |
| Service worker / offscreen | ✅ الگوی MV3 و فایل‌های local | justification دقیق در Privacy tab |
| Remote executable code | ✅ `eval`، `new Function`، CDN script یا remote JS دیده نشد | در Dashboard گزینهٔ No انتخاب و package نهایی دوباره scan شود |
| CSP | ✅ فقط `script-src 'self'` | حفظ شود |
| استقلال از Desktop app | ✅ هیچ localhost/Companion bridge یا host permission محلی باقی نمانده؛ Live WSS مستقیم به `generativelanguage.googleapis.com` می‌رود | تست عملی build بسته‌بندی‌شده روی پروفایلی که Desktop app نصب نیست |
| Permissions | ⚠️ `activeTab`, `tabCapture`, `offscreen`, `storage`, `downloads` همگی در کد جاری استفاده می‌شوند | justification بالا ثبت شود؛ چون recording اختیاری است، انتقال `downloads` به `optional_permissions` قبل از Store ارزش بررسی دارد. [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) |
| Host permission | ✅ فقط `https://generativelanguage.googleapis.com/*` است؛ `<all_urls>` وجود ندارد | بعد از افزودن broker فقط origin دقیق broker هم اضافه شود؛ scope گسترده اضافه نشود |
| API credential | ⚠️ کلید خام persist نمی‌شود و فقط در `chrome.storage.session` تا پایان browser session می‌ماند؛ این از `storage.local` بهتر است، ولی کلید همچنان client-side و در Live WSS URL قابل استخراج است | برای Store production از token service + Gemini ephemeral token استفاده شود؛ key بلندمدت فقط server-side |
| Data disclosure/consent | ⚠️ disclosure دوزبانه کنار Start پیاده شده و صریح می‌گوید صدای همین تب به Google Gemini می‌رود و recording پیش‌فرض خاموش است؛ خود Start اقدام مثبت کاربر است | Privacy Policy عمومی و declarationهای Dashboard هنوز لازم‌اند؛ Website content، authentication information و در صورت کاربرد personal communications اعلام شود |
| Listing localization | ⚠️ popup فارسی/انگلیسی است، ولی Store localization به `_locales` نیاز دارد | `_locales/fa` و `_locales/en` و listingهای متناظر اضافه شوند |
| 128 icon | ⚠️ `extension/icons/icon128.png` دقیقاً `128×128` است، اما محتوای غیرشفاف تقریباً از پیکسل ۴ تا ۱۲۴ را پر می‌کند | یک Store icon جدا با visual weight و padding نزدیک راهنمای ۱۶px Chrome روی زمینهٔ روشن/تیره QA شود |
| Store screenshots | ❌ تصویر README اکنون `1265×712` است و ابعاد Store را ندارد | حداقل یک تصویر واقعی `1280×800`؛ بهتر است ۳ تا ۵ تصویر فارسی/انگلیسی |
| Small promo tile | ❌ وجود ندارد | `440×280` بسازید |
| Marquee | اختیاری | در صورت نیاز `1400×560` بسازید |
| Test instructions | ❌ آماده نشده | مسیر Start/Stop و credential یا test access محدود برای reviewer |
| Automated extension tests | ⚠️ تست‌های Node برای protocol، transcript، WAV/SRT و parsing صوت وجود دارند؛ browser E2E هنوز دیده نشد | حداقل یک end-to-end test برای capture lifecycle، consent، session-key clear و چهار download |
| ZIP layout | ✅ script بسته‌بندی وجود دارد | باز کنید و وجود `manifest.json` در root را در CI assert کنید |

### ریسک‌های ردشدن مخصوص LingoDub

1. ذخیرهٔ API Key بلندمدت در client برخلاف راهنمای امنیتی جاری Gemini.
2. نبود disclosure صریح قبل از ارسال صدای تب به Google.
3. معرفی ضبط چهار خروجی در listing درحالی‌که یکی از مسیرها در نسخهٔ ارسالی ناقص باشد؛ metadata باید دقیقاً با build یکسان باشد.
4. ناتوانی reviewer در تست به‌علت نیاز به key/model access یا محدودیت جغرافیایی؛ Test instructions و credential آزمایشی لازم است.
5. screenshot با ابعاد اشتباه یا تصویر dashboard دسکتاپ به‌جای تجربهٔ خود اکستنشن.
6. host permission گسترده‌تر از endpointهای واقعی Gemini.
7. ادعاهای مطلق مانند «۱۰۰٪ دقیق»، «بدون تأخیر» یا «بهترین» که قابل اثبات نیستند؛ listing باید دقیق و غیرگمراه‌کننده باشد. [Listing Requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements)
8. ارسال هم‌زمان build عمومی و testing با نام/description تقریباً یکسان؛ نسخهٔ تست باید صریحاً `BETA` یا `DEVELOPMENT BUILD` باشد. [Distribution testing guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution/#publish_a_test_version)
9. ادعای دورزدن DRM، paywall یا دانلود/دسترسی غیرمجاز به رسانهٔ دارای کپی‌رایت. قابلیت ضبط باید فقط برای محتوایی معرفی شود که کاربر حق پردازش و ذخیرهٔ آن را دارد. [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)

---

## English guide

### Bottom line

- Public one-click installation on Windows and macOS requires a Chrome Web Store listing. Unpacked loading is for development, and self-hosting on those platforms is limited to managed enterprise environments. [Official distribution methods](https://developer.chrome.com/docs/extensions/how-to/distribute)
- New submissions must use Manifest V3. [Chrome Web Store best practices](https://developer.chrome.com/docs/webstore/best-practices)
- A standalone extension does not need the Windows app, but a production extension must not embed or persist a long-lived Gemini API key in the client. Google directs client-side Live API implementations to use backend-minted ephemeral tokens. [Gemini key security](https://ai.google.dev/gemini-api/docs/api-key) and [Ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)

### Policy checklist

- **Single purpose:** capture the user-selected tab, translate/dub its audio, and present the associated playback/transcripts. Keep every feature within that narrow purpose. [Quality Guidelines](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines)
- **Minimum permissions:** retain only permissions used by the shipping build and justify each one in the Privacy practices tab. [Permissions policy](https://developer.chrome.com/docs/webstore/program-policies/permissions)
- **No remote code:** bundle all executable JavaScript/WASM; do not load remote scripts, evaluate fetched strings, or execute remotely supplied commands. Server responses may be data/audio only. [MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- **Readable code:** ordinary minification is allowed; obfuscation or concealed behavior is not. [Code Readability](https://developer.chrome.com/docs/webstore/program-policies/code-readability)
- **Privacy:** disclose selected-tab audio, derived transcripts, settings, tokens, recipients, retention, recording behavior, and deletion. The UI, Dashboard declarations, listing, and public privacy policy must agree. [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) and [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- **Affirmative consent:** immediately before capture, say that selected-tab audio is sent to Google Gemini and recording is opt-in, then require the Start action. [Disclosure Requirements](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements)
- **Working product:** the submitted build must provide useful in-extension functionality and must not be a broken launcher for another app or site. [Minimum Functionality](https://developer.chrome.com/docs/webstore/program-policies/minimum-functionality)
- **Copyright/DRM:** do not market or implement bypassing DRM, paywalls, or unauthorized access/downloads; tell users to record only content they are entitled to process. [Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)

Suggested single-purpose statement:

> LingoDub captures audio from the browser tab explicitly selected by the user, sends it to Google Gemini for real-time translation, and plays the translated speech and transcripts in that tab session.

Suggested pre-capture disclosure:

> By starting live dubbing, audio from the selected tab is sent to Google Gemini for translation. LingoDub does not capture other tabs. Recording is off unless you enable it.

### Required listing package and assets

- ZIP with `manifest.json` at the archive root; maximum package size 2 GB. The manifest description is limited to 132 characters. [Prepare](https://developer.chrome.com/docs/webstore/prepare) and [Publish](https://developer.chrome.com/docs/webstore/publish/)
- PNG store icon: `128×128`; for a square icon, Chrome recommends `96×96` artwork with 16 px transparent padding on each side.
- One to five screenshots: exactly `1280×800` or `640×400`, square corners, full bleed.
- Required small promo tile: `440×280` PNG/JPEG.
- Optional marquee: `1400×560` PNG/JPEG. [Official image requirements](https://developer.chrome.com/docs/webstore/images)
- Accurate detailed description, category, primary language, support path, and preferably homepage. Missing/misleading descriptions, icons, screenshots, or privacy metadata are rejection grounds. [Listing Requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements)

The official listing page includes a YouTube promo-video field in its asset list, while the official image guide names icon, small tile, and screenshot as the mandatory image set. Prepare a real short video or follow the current Dashboard validator at submission time. [Store Listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) and [Images](https://developer.chrome.com/docs/webstore/images)

### Account and submission steps

1. Register in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), accept the agreement, and pay the one-time fee shown by the Dashboard. The official documentation does not promise a fixed fee amount. [Registration](https://developer.chrome.com/docs/webstore/register/)
2. Enable 2-Step Verification, set a publisher name, and verify the contact email. [Account setup](https://developer.chrome.com/docs/webstore/set-up-account) and [2-Step Verification policy](https://developer.chrome.com/docs/webstore/program-policies/policies#2-step-verification)
3. Declare Trader or Non-Trader status. Traders provide verified legal/contact details that appear publicly. [Trader FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq)
4. Test the production ZIP on a clean Chrome profile.
5. Dashboard → **Add new item** → upload the ZIP.
6. Complete **Store listing**, **Privacy practices**, and **Distribution**. Public, Unlisted, and Private submissions all receive the same policy review. [Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution/)
7. Add **Test instructions** and reviewer credentials/access when full functionality is restricted. [Test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)
8. Click **Submit for Review**. Deferred publishing is available; after approval, a staged submission must be published within 30 days. [Publishing flow](https://developer.chrome.com/docs/webstore/publish/)
9. Monitor Dashboard and publisher email. Typical reviews finish within days but can take weeks; broad permissions, hard-to-review code, and new developers/extensions can take longer. [Review process](https://developer.chrome.com/docs/webstore/review-process)

As of April 2026, Chrome's review page reports a submission surge and extended review times. If a review remains pending for more than three weeks, the official guidance is to contact developer support. [Review process](https://developer.chrome.com/docs/webstore/review-process)

### Updates and installation

For every code/asset update, increment the manifest version, upload a complete new package, update changed listing/privacy metadata, and submit it for review. Added permissions may require users to approve the update. [Update guide](https://developer.chrome.com/docs/webstore/update/)

Once approved and public, users install with **Add to Chrome** and receive Store-managed updates. A GitHub-hosted CRX cannot provide the equivalent public one-click flow on Windows/macOS; only Web Store distribution or managed enterprise policy is supported. [Alternative installation methods](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions)
