# Chrome Web Store submission — Lingora

This is the release worksheet for the standalone Lingora extension. It reflects version `1.0.0` and the Chrome Web Store policies enforced from 2026-08-01.

## Release package

Build from a clean checkout:

```powershell
.\scripts\package-extension.ps1
```

Upload `dist/Lingora-Extension.zip`. `manifest.json` is at the ZIP root. The extension is Manifest V3, contains no remote executable code, does not connect to the desktop app or localhost, and requests host access only to Google's Gemini API.

Before every upload, increment all aligned versions and run:

```powershell
python -m pytest -q
node --test tests/extension.test.mjs tests/offscreen.test.mjs tests/background.test.mjs
node --check extension/background.js
node --check extension/offscreen.js
node --check extension/popup.js
```

## Account

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Register and pay the one-time fee shown by Google.
3. Enable 2-Step Verification.
4. Set publisher name to `Mohammad Saleh Mahdinejad` (or a real registered organization), verify the contact email, and choose the truthful Trader/Non-Trader status.
5. Use Private/trusted testers first; then change Distribution to Public / All regions.

## Store listing — English

- **Name:** `Lingora — Live Translation`
- **Summary:** `Translate, dub, or caption audio from the current tab live with Gemini.`
- **Category:** `Tools`
- **Primary language:** `English`
- **Homepage URL:** `https://github.com/msmahdinejad/lingora`
- **Support URL:** `https://github.com/msmahdinejad/lingora/issues`
- **Privacy Policy URL:** `https://github.com/msmahdinejad/lingora/blob/main/PRIVACY.md`
- **Mature content:** `No`

Detailed description:

```text
Lingora translates audio from the browser tab you explicitly select. Hear translated speech, view source and translated captions in a movable overlay, and independently mix original and dubbed audio. Optional recording exports original audio, dubbed audio, and both subtitle tracks to your device.

Capture starts only after you consent and press Start. Audio and transcripts from that selected tab are sent securely to Google Gemini solely to provide live translation. Lingora does not capture other tabs, contains no advertising or analytics, and does not send content to the Lingora maintainer. Recording is off unless you enable it.

The extension is standalone: the Lingora desktop app, Python, FFmpeg, localhost, and virtual audio devices are not required. A user-provided Gemini credential is kept only for the browser session. Lingora exchanges it directly with Google for a short-lived, single-use Live API token and never embeds a developer API key.
```

## Store listing — فارسی

- **Name:** `Lingora — ترجمهٔ زنده`
- **Summary:** `صدای همین تب را با Gemini زنده ترجمه، دوبله یا زیرنویس کن.`

Detailed description:

```text
Lingora صدای همان تبی را که کاربر صریحاً انتخاب می‌کند ترجمه می‌کند. صدای دوبله را بشنوید، زیرنویس اصلی و ترجمه را در کادر شناور ببینید و صدای اصلی و دوبله را مستقل ترکیب کنید. ضبط اختیاری دو فایل WAV و دو فایل SRT را روی دستگاه شما ذخیره می‌کند.

Capture فقط پس از تأیید کاربر و فشردن Start آغاز می‌شود. صدا و متن همان تب فقط برای ترجمهٔ زنده به‌صورت امن به Google Gemini فرستاده می‌شود. Lingora تب‌های دیگر را Capture نمی‌کند، تبلیغ یا Analytics ندارد و محتوا را برای توسعه‌دهنده نمی‌فرستد. ضبط پیش‌فرض خاموش است.

اکستنشن مستقل است و به اپ دسکتاپ Lingora، Python، FFmpeg، localhost یا دستگاه صوتی مجازی نیاز ندارد. کلید Gemini خود کاربر فقط در Session مرورگر می‌ماند و برای گرفتن توکن کوتاه‌عمر و یک‌بارمصرف مستقیم به Google فرستاده می‌شود؛ هیچ کلید توسعه‌دهنده داخل اکستنشن نیست.
```

## Graphic assets

Upload the files in `docs/store-assets/`:

- `icon-128.png` — 128×128 Store icon.
- `screenshot-01-live-translation.png` — 1280×800.
- `screenshot-02-output-mixer.png` — 1280×800.
- `screenshot-03-floating-captions.png` — 1280×800.
- `small-promo-440x280.png` — mandatory small promo tile.
- `marquee-1400x560.png` — optional marquee tile.

Screenshots must match the submitted build and must not contain an API key or private content.

## Privacy practices

**Single purpose:**

```text
Lingora translates audio from the browser tab explicitly selected by the user and presents the result as translated captions and/or dubbed audio.
```

**Remote code:** select `No, I am not using remote code.`

Reviewer note:

```text
All executable JavaScript and AudioWorklet code is included in the extension ZIP. Gemini responses are handled only as text and audio data and are never evaluated as executable code.
```

Permission justifications:

| Permission | Paste into Dashboard |
|---|---|
| `activeTab` | Accesses only the tab on which the user invokes Lingora. It provides temporary access for the user-started subtitle overlay and never grants persistent access to all sites. |
| `tabCapture` | Captures audio from the selected active tab only after consent and an explicit Start action so Lingora can translate and dub it. |
| `offscreen` | Runs Web Audio capture, playback, and optional recording because a Manifest V3 service worker has no DOM or AudioContext. |
| `storage` | Stores non-secret language, mixer, caption-layout, locale, consent-version, and recording preferences locally. The user credential and session state remain in `chrome.storage.session`, not sync storage. |
| `scripting` | Injects Lingora's packaged floating-caption UI only into the user-activated tab using temporary `activeTab` access. |
| `downloads` (optional) | Requested only when the user explicitly enables recording; saves two WAV and two SRT outputs to Downloads. |
| `https://generativelanguage.googleapis.com/*` | Sends selected-tab audio to Google Gemini and receives translated audio/transcripts. It also exchanges the user's session-only credential for a constrained, single-use ephemeral token. |

Conservative data declarations:

- **Website content:** Yes — selected-tab audio/content is processed and transmitted.
- **Authentication information:** Yes — the user-provided Gemini credential and ephemeral token are handled.
- **User-generated content:** Yes — selected audio and derived transcripts may contain it.
- **Personal communications:** Yes — selected media can contain speech or communications.
- **Web browsing activity:** No — Lingora does not collect or transmit URLs or history.
- PII, health, financial, location: No as intended product categories; the policy explains that selected content may incidentally contain sensitive material.

Certify all Limited Use statements. Lingora uses data only for the disclosed translation feature, sends it only to Google when necessary, has no ads or data brokerage, and does not permit maintainer access.

## Prominent disclosure

The checkbox shown before Start is part of the release. It says:

```text
When you press Start, only audio and transcripts from the selected tab go to Google Gemini for translation and dubbing. Lingora maintainers cannot access this content, and recording is off by default.
```

Do not remove or weaken this gate without updating the privacy policy and requesting consent again with a new consent version.

## Test instructions for Google reviewers

The maintainer must create a dedicated Gemini key restricted to the Gemini API and place it only in the private Test instructions credential field—not in the ZIP, screenshots, repository, or listing. Revoke it after review.

```text
1. Open a normal HTTPS tab playing a rights-cleared English speech sample.
2. Open Lingora, enter the reviewer Gemini key supplied in the private credential field, and press Save.
3. Select Persian as target language, accept the selected-tab disclosure, leave recording disabled, and press Start.
4. Confirm that translated captions appear and dubbed audio plays. Toggle original audio, dubbed audio, source subtitles, and translated subtitles independently.
5. Change caption size/position and confirm the floating card updates.
6. Stop translation and verify capture ends.
7. Enable recording, approve the optional Downloads permission, run a short session, stop it, and verify original.wav, dubbed.wav, source.srt, and translated.srt are downloaded. The completion message must appear only after successful export.
8. Clear the session key and confirm another start requires a key.

The extension works without the desktop application, Python, FFmpeg, localhost, or a virtual audio device. Chrome internal pages cannot be captured; use a normal HTTPS page.
```

## Submission sequence

1. Test `dist/Lingora-Extension.zip` in a fresh Chrome Stable profile.
2. Upload it as a new item.
3. Paste the listing, privacy, permission, and test values above.
4. Upload the Store assets.
5. Set Private visibility for trusted testing and submit for review.
6. After clean testing, upload a higher version if anything changed, switch to Public / All regions, and submit again. Use deferred publishing if you want final control; approved staged submissions must be published within 30 days.

## Official sources

- [Register](https://developer.chrome.com/docs/webstore/register/)
- [Publish](https://developer.chrome.com/docs/webstore/publish/)
- [Store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/)
- [Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/)
- [Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution/)
- [Test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions/)
- [User Data and Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use/)
- [2026 disclosure update](https://developer.chrome.com/blog/cws-policy-updates-2026)
- [Gemini Live Translate](https://ai.google.dev/gemini-api/docs/live-api/live-translate)
- [Gemini ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)
