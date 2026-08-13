# Chrome Web Store release readiness for Lingora

> Historical audit snapshot: this report records the gaps found before the `1.0.0` release hardening. Implemented submission values and current status are maintained in [`docs/CHROME_WEB_STORE.md`](../CHROME_WEB_STORE.md).

Policy review date: **2026-08-13**

Scope: the standalone Chrome extension in `extension/`, its packaged ZIP, the
public repository documentation, and the fields required in the Chrome Web
Store Developer Dashboard. Only first-party Google and Chrome documentation is
used below.

## Executive decision

**Lingora is not yet ready for a public Chrome Web Store submission.** Its core
extension architecture is sound—Manifest V3, local readable code, narrow Google
host access, explicit user-started tab capture, and no desktop-app dependency—
but public submission should wait until the following blockers are closed:

1. Replace the production client-side Gemini API key flow with backend-minted,
   constrained ephemeral tokens. The current BYOK key is better protected than
   a hard-coded key because it stays in `chrome.storage.session`, but Google
   explicitly says not to expose ordinary API keys in production client apps
   and directs direct-to-Live clients to ephemeral tokens.
2. Add an unmistakable first-run/pre-capture consent gate covering selected-tab
   audio, derived transcripts, transfer to Google Gemini, optional local
   recording, and the credential used for the request. The existing short text
   next to Start is a useful disclosure, but the stricter policy enforced from
   **2026-08-01** requires prominent disclosure for *all* data collection and
   affirmative informed consent.
3. Produce the mandatory Store assets: a compliant `1280×800` or `640×400`
   extension screenshot and a `440×280` small promo tile. The current repository
   contains neither. Validate the 128 px icon's recommended transparent padding.
4. Publish a final, unconditional privacy policy for the shipping extension and
   make the Dashboard declarations match it exactly. The current combined
   desktop/extension policy exists and includes Limited Use language, but its
   statement that production “should use” ephemeral tokens documents a future
   state rather than a release-ready implementation.
5. Prepare reviewer test instructions and a reliable way for Google reviewers
   to exercise Gemini Live without using a maintainer's long-lived secret.

These are release-readiness conclusions, not legal advice. Trader classification
and applicable privacy law remain the publisher's responsibility.

## August 2026 policy delta

Chrome announced on 2026-07-01 that enforcement would begin on 2026-08-01 for
three changes directly relevant to Lingora: any collected user data must be
strictly necessary for the disclosed single purpose; *all* collection must be
prominently disclosed; and changes in data practices must be proactively
disclosed. The same update explicitly forbids extensions intended to circumvent
AI-service safety guardrails or usage restrictions. Lingora should neither claim
nor implement quota, safety, DRM, or model-policy bypasses. [Official July 2026
policy update](https://developer.chrome.com/blog/cws-policy-updates-2026)

Manifest V2 is no longer an option: it is disabled in Chrome 139+, and remaining
Manifest V2 Store items are scheduled for removal on 2026-08-31. Lingora already
uses Manifest V3. [Manifest V2 support timeline](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline)

## Repository audit

### Already compliant or structurally strong

| Area | Evidence in the repository | Result |
|---|---|---|
| Manifest platform | `extension/manifest.json` declares `manifest_version: 3` and a service worker | Pass. Manifest V3 is required for new submissions. [Best practices](https://developer.chrome.com/docs/webstore/best-practices#manifest-version-3) |
| Single purpose | Tab audio is captured for live translation, captions, dubbing, mixing, and user-requested exports | Pass if listing copy stays focused on one purpose: translating the user-selected tab's audio. Chrome permits related functions within one narrow focus. [Quality guidelines](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines) |
| Independence | No localhost bridge, native messaging, or desktop-app host permission is present | Pass. The extension provides its own browser functionality and is not merely a launcher. [Minimum functionality](https://developer.chrome.com/docs/webstore/program-policies/minimum-functionality) |
| Capture scope | `activeTab` plus `tabCapture`; capture starts only after the user opens the action popup and presses Start | Good narrow pattern. `activeTab` grants temporary access after invocation, and `tabCapture` can only start after a user invokes the extension. [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [tabCapture](https://developer.chrome.com/docs/extensions/reference/api/tabCapture) |
| Host access | Only `https://generativelanguage.googleapis.com/*` | Pass for the present architecture; do not add broad all-site host permissions. |
| Remote executable code | All JS, worklet code, CSS, fonts, and images are packaged locally; no `eval`, `new Function`, CDN script, or remotely imported executable code was found | Answer **No, I am not using remote code** in the Dashboard, provided the final ZIP passes the same scan. Server-returned text/audio is data, not executable code. [MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements), [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) |
| Code readability | Authored JavaScript is shipped readable and unobfuscated | Pass. Ordinary minification is allowed, concealment/obfuscation is not. [Code readability](https://developer.chrome.com/docs/webstore/program-policies/code-readability) |
| CSP | Extension pages use `script-src 'self'; object-src 'self'` | Pass; retain it. |
| Secure transport | Gemini traffic uses WSS | Pass for transport. Chrome requires modern cryptography for user-data transmission. [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) |
| Package layout | `dist/Lingora-Extension.zip` has `manifest.json` at archive root and is far below 2 GB | Pass. [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare), [Publish](https://developer.chrome.com/docs/webstore/publish) |
| Manifest metadata | Name is below 75 characters, description below 132 characters, version is valid, and 16/32/48/128 icons exist | Pass for the current package; increment the version for every later upload. [Manifest reference](https://developer.chrome.com/docs/extensions/reference/manifest), [Prepare](https://developer.chrome.com/docs/webstore/prepare) |
| Limited Use statement | `PRIVACY.md` states compliance with the Chrome Web Store User Data Policy and Limited Use requirements; README links to it | Pass in principle. Chrome requires this statement on the extension website or one click away. [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use/) |

### Gaps and recommended disposition

| Priority | Gap | Required action before public submission |
|---|---|---|
| Blocker | Ordinary Gemini key is entered in the popup, stored in `chrome.storage.session`, and placed in the Live WebSocket URL | Use an extension-independent HTTPS token service. Keep the long-lived Gemini credential server-side and return a single-use, short-lived, constrained ephemeral token. Google's Live Translate guide says client-to-server apps can use ephemeral tokens to avoid exposing the key; its general key guidance says never expose keys client-side in production. [Live Translate tokens](https://ai.google.dev/gemini-api/docs/live-api/live-translate#use-ephemeral-tokens-in-client-side-applications), [Ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens), [API-key security](https://ai.google.dev/gemini-api/docs/api-key#security_and_secret_management) |
| Blocker | Existing disclosure is a short paragraph below Start and key handling is disclosed separately | Add a first-run or first-capture modal immediately before collection. Name the data, purpose, recipient, retention/recording behavior, and require a clear Agree/Start action. Do not rely only on Store copy or the privacy policy. [Disclosure requirements](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements), [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) |
| Blocker | No Store-sized screenshot exists (`docs/images/dashboard-en.png` is `1265×712` and depicts the desktop dashboard) | Capture the *extension's* real current experience at exactly `1280×800` or `640×400`; provide at least one, preferably 3–5, and localize screenshots if localized listings are created. [Images](https://developer.chrome.com/docs/webstore/images) |
| Blocker | No `440×280` small promo tile exists | Create the mandatory tile. Avoid dense text, fill the canvas, and keep branding consistent. A `1400×560` marquee is optional. [Images](https://developer.chrome.com/docs/webstore/images#promotional-images) |
| Blocker | Privacy policy describes both products and says production “should” adopt a safer future credential design | Publish the policy describing only behavior that is actually shipping, or clearly separate Desktop and Extension sections. Include data types, purposes, Google as recipient, local/third-party retention, deletion, security, recording, and Limited Use. Use a stable public URL in Dashboard. [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) |
| Blocker | Full operation needs Gemini model access, but reviewer instructions/access are not packaged | Add concise Test instructions. With the recommended token service, provide a temporary reviewer route/account that can exercise the full flow and revoke it after review. Test instructions are optional generally but appropriate when full access is restricted. [Test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions) |
| High | `downloads` is required at install time although recording/export is optional | Consider moving it to `optional_permissions` and requesting it from the recording/export user gesture. This is not automatically a violation because the feature exists, but optional permission improves least privilege and consent. [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), [Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions) |
| High | No `_locales/en` and `_locales/fa` manifest localization exists | Add `_locales` and use `__MSG_*__` manifest strings if English and Persian Store listings are required. Dashboard localization becomes available only for locales present in the package. [Localize listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#localize-your-listing) |
| High | Data-use declarations do not yet exist outside prose docs | Complete Dashboard checkboxes conservatively; recommended selections appear below. Declarations, policy, listing, and runtime behavior must agree. [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [Listing requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements) |
| Medium | Current 128 px icon fills most of its canvas; recommended Store padding has not been visually validated | QA a Store-specific `128×128` PNG with approximately `96×96` square artwork plus 16 px transparent padding per side, on light and dark surfaces. [Extension icon guidance](https://developer.chrome.com/docs/webstore/images#extension-icon) |
| Medium | ZIP includes unused `icons/Lingora.ico` and a large source logo | Exclude files the extension does not use. This is not prohibited, but a smaller, purpose-built review package is easier to audit. |
| Medium | Automated protocol/unit tests exist, but no packaged-extension end-to-end browser test is evident | Run a clean-profile Chrome Stable test and add an end-to-end capture lifecycle test when feasible. Chrome recommends E2E and manual testing across browser/network conditions. [Best practices](https://developer.chrome.com/docs/webstore/best-practices#performance-and-functionality) |
| Account | Publisher account state cannot be verified from the repository | Register, pay the one-time fee shown by Google, enable 2-Step Verification, verify email, select Trader/Non-Trader, and complete any trader verification before submission. |

## Dashboard-ready submission content

The following copy is intentionally narrow and avoids accuracy, latency, or
“best” claims that cannot be substantiated.

### Identity and listing

- **Name:** `Lingora — Live Translation`
- **Manifest summary:** `Translate, dub, or caption the current tab live with Gemini.`
- **Primary language:** English
- **Localized language:** Persian (`fa`), after `_locales/fa` is added
- **Category:** `Tools`. Use `Accessibility` only if the final positioning is
  specifically centered on hearing/accessibility needs; Chrome defines both
  categories in its official category list. [Store categories](https://developer.chrome.com/docs/webstore/best-practices#choose-your-extensions-category-well)
- **Homepage URL:** `https://github.com/msmahdinejad/lingora`
- **Support URL:** `https://github.com/msmahdinejad/lingora/issues`
- **Privacy Policy URL:** `https://github.com/msmahdinejad/lingora/blob/main/PRIVACY.md`
  after the policy blocker above is resolved. A dedicated stable HTTPS page on
  a maintainer-controlled domain would also enable Search Console verification
  and verified-publisher display. [Listing URLs and verified publisher](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#additional-fields)
- **Mature content:** No, assuming listing screenshots/sample media are suitable
  for general audiences.
- **Distribution:** Start as Private for trusted testers, then Public after QA.
  Public, Unlisted, and Private items all receive the same policy review.
  [Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)

Suggested detailed description:

> Lingora translates audio from the browser tab you explicitly select. Hear
> translated speech, view source and translated captions in a movable overlay,
> and independently mix original and dubbed audio. Optional recording exports
> original audio, dubbed audio, and both subtitle tracks to your device.
>
> Capture starts only when you press Start. Audio from that selected tab is sent
> securely to Google Gemini to provide live translation. Lingora does not capture
> other tabs, contains no advertising or analytics, and does not send data to the
> Lingora maintainers. Recording is off unless you enable it.

Do not claim “100% accurate,” “zero latency,” “unlimited,” “official Google
extension,” or guaranteed support for content/services that cannot be tested.
Store metadata must be current, comprehensive, and non-misleading. [Listing
requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements)

### Single-purpose field

> Lingora translates audio from the browser tab explicitly selected by the user
> and presents the result as translated captions and/or dubbed audio.

Caption styling, source/dub mixing, language selection, and optional exports are
all subordinate to this purpose.

### Permission justifications

| Dashboard permission | Suggested justification |
|---|---|
| `activeTab` | Accesses only the tab the user invokes Lingora on. It supplies temporary tab access for the user-started subtitle overlay and does not grant persistent access to every website. |
| `tabCapture` | Captures audio from the selected active tab only after the user presses Start so Lingora can translate and dub that audio. |
| `offscreen` | Runs the Web Audio capture, playback, and optional recording pipeline because a Manifest V3 service worker has no DOM or `AudioContext`. |
| `storage` | Stores non-secret language, audio-mix, caption-layout, locale, and recording preferences locally. Session-scoped authentication state is kept in in-memory `chrome.storage.session`, not sync storage. |
| `downloads` | Saves WAV and SRT files only when the user enables recording/export. If changed to an optional permission, say that it is requested only when the user enables that feature. |
| `scripting` | Injects Lingora's packaged floating-caption UI into the user-activated tab. It runs only with temporary `activeTab` access and does not use a persistent all-sites content script. |
| `https://generativelanguage.googleapis.com/*` | Connects only to Google's Gemini API to send user-selected tab audio and receive translated audio and transcripts. In the production design, authentication is a short-lived constrained token. |

Chrome requires the narrowest presently needed permissions and a justification
for every manifest permission. [Permissions policy](https://developer.chrome.com/docs/webstore/program-policies/permissions), [Privacy tab](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy#list-and-justify-any-permissions)

### Remote-code field

- Select: **No, I am not using remote code.**
- Reviewer note: `All executable JavaScript and AudioWorklet code is included in
  the extension ZIP. Remote Gemini responses are treated only as text and audio
  data and are never evaluated as executable code.`

Re-run a final-package scan for external script tags, dynamic remote imports,
`eval`, `new Function`, and fetched-string interpreters before upload. [MV3
requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)

### Data-use checkboxes and certification

Do **not** select “does not collect user data.” Chrome defines handling broadly,
including local processing and third-party transmission. It also requires local-
only data practices to be disclosed. [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

Recommended conservative declarations for the current behavior:

| Data type | Declare? | Why |
|---|---:|---|
| Website content | Yes | The selected tab's audio/media content is captured and transmitted for translation. |
| Authentication information | Yes | The extension handles the user's Gemini credential or the replacement ephemeral authentication token. |
| User-generated content | Yes, conservatively | User-selected media/audio and derived transcripts may contain user-generated material. Confirm against the exact checkbox definitions shown in the live Dashboard. |
| Personal communications | Yes, conservatively | A selected tab may contain speech or communications. If the release technically prevents such content or Dashboard guidance excludes it, document that determination before changing this answer. |
| Web browsing activity | Likely No | Lingora does not retain or transmit URL/history data; it processes content only after explicit selection. The listing and UI must prominently describe that selected-tab processing. |
| Personally identifiable, health, financial, location | No as product-intended categories | Lingora does not seek these categories, but selected audio can incidentally contain them; the privacy policy should state that it processes the content selected by the user without using it for profiling. |

Certify every Limited Use statement only after verifying that runtime behavior,
token service logs, retention, and any observability are consistent. The token
service must not log audio, transcripts, credentials, or token values by default.
User data may be transferred to Google only as necessary for the disclosed live-
translation purpose and never for advertising/data brokerage. [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use/)

### Prominent disclosure and consent copy

Recommended first-capture disclosure:

> To translate this tab, Lingora will capture audio from only the tab you selected
> and send it securely to Google Gemini. Gemini returns translated speech and
> transcripts. Lingora's maintainers do not receive this content. Recording is
> off unless you enable it; when enabled, audio and subtitle files are created on
> your device. You can stop capture at any time.

Buttons: **Cancel** and **Agree & Start**. Save the consent version locally so a
material data-practice change can trigger a new disclosure and consent. This is
especially important under the policy enforced from August 2026. [Disclosure
requirements](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements), [2026 policy update](https://developer.chrome.com/blog/cws-policy-updates-2026)

### Reviewer test instructions

Suggested text, updated after the token architecture is implemented:

1. Open a normal HTTPS tab playing the supplied, rights-cleared English sample.
2. Open Lingora from the toolbar and select Persian as the target language.
3. Accept the first-capture disclosure, leave recording disabled, and press Start.
4. Confirm that translated captions appear and dubbed audio plays. Toggle original
   audio, dubbed audio, source captions, and translated captions independently.
5. Change caption size/position and confirm the floating card updates.
6. Stop translation; verify capture and the Gemini connection stop.
7. Enable recording, repeat a short session, stop, and verify two WAV plus two SRT
   downloads. Recording must remain opt-in and the completion message must appear
   only after successful export.
8. Test Clear/Delete for session credentials and verify the next session requires
   new authorization.

Provide Google reviewers with temporary restricted test access when the feature
cannot be exercised otherwise; revoke it after review. Never place a permanent
API key in the ZIP, repository, screenshots, listing, or public test instructions.

## Mandatory listing assets

| Asset | Official requirement | Lingora status |
|---|---|---|
| Store icon | PNG `128×128`; Chrome recommends `96×96` artwork plus 16 px transparent padding on all sides for square art | File exists; padding/contrast QA remains |
| Screenshots | 1–5, exactly `1280×800` (preferred) or `640×400`, square corners, full bleed, showing the actual current extension | Missing |
| Small promo tile | PNG/JPEG `440×280` | Missing |
| Marquee | PNG/JPEG `1400×560` | Optional, missing |

Google's listing page also shows a YouTube promotional-video field among graphic
assets, while its dedicated image guide says only the icon, small promo image,
and screenshot are mandatory. Follow the live Dashboard validator at upload time;
a short, truthful product video reduces ambiguity. [Store listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#graphic-assets), [Image requirements](https://developer.chrome.com/docs/webstore/images)

Promo images are not locale-specific, so avoid text or use language-neutral
branding. Screenshots and video can be localized after `_locales` is included.

## Publisher account and publication sequence

1. Register a durable, actively monitored developer Google Account, accept the
   agreement/policies, and pay the **one-time fee shown in the registration UI**.
   Google's durable documentation does not promise a fixed dollar amount. The
   account email cannot later be changed without creating a new account and
   transferring items. [Registration](https://developer.chrome.com/docs/webstore/register/)
2. Enable 2-Step Verification; it is mandatory before publishing or updating.
   [2-Step Verification](https://developer.chrome.com/docs/webstore/program-policies/two-step-verification)
3. Set the required publisher name and verify the contact email. A physical
   address is required if the extension offers purchases, paid features, or
   subscriptions. [Account setup](https://developer.chrome.com/docs/webstore/set-up-account)
4. Declare **Trader** or **Non-Trader**. All publishers must decide. A trader must
   verify legal name, phone, and address; those details may be shown publicly.
   [Trader FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq)
5. Load the exact release directory unpacked into a fresh Chrome Stable profile
   and complete the test matrix below.
6. Build the ZIP with `manifest.json` at the root. Ensure the version is higher
   than every prior Dashboard upload. [Prepare](https://developer.chrome.com/docs/webstore/prepare)
7. Developer Dashboard → **Add new item** → upload ZIP.
8. Complete **Store listing**, **Privacy practices**, **Distribution**, and the
   recommended **Test instructions**.
9. Submit first to Private trusted testers, resolve defects, then upload a higher
   version for Public distribution. Every visibility level receives the same
   policy review. [Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
10. Select **Submit for Review**. Deferred publishing is available; after approval
    the staged item must be published within 30 days or it returns to draft and
    needs review again. [Publishing flow](https://developer.chrome.com/docs/webstore/publish)

Chrome reports an elevated submission-review backlog as of April 2026. Reviews
often complete in days but can take weeks; its current guidance is to contact
support when a review remains pending for more than three weeks. [Review process](https://developer.chrome.com/docs/webstore/review-process)

## Final clean-profile release test

- Fresh install and first-run consent; no Lingora Desktop installed.
- English and Persian popup directionality and strings.
- Start only after explicit action; only the selected tab is captured.
- Original-only, dub-only, both mixed, captions-only, and all four channels off.
- Caption placement, resizing, opacity, scrolling, sentence replacement, and
  behavior across same-origin navigation.
- Stop, tab close, browser sleep/wake, network loss/recovery, Gemini quota/auth
  failure, unsupported `chrome://` page, and model/session renewal.
- Recording disabled by default; successful four-file export and truthful status;
  interrupted/failed export never reports success.
- Clear session authorization, extension disable/re-enable, browser restart, and
  uninstall/deletion behavior.
- Final ZIP scan: no secrets, source maps with secrets, remote executable code,
  unused binaries, development endpoints, or absolute local paths.
- Listing screenshots and text match the exact submitted build.

## Updates, enforcement, and appeals

Each update needs a higher manifest version, a complete new ZIP, updated listing/
privacy metadata where relevant, and a new review. Adding required permissions
can disable the extension until users approve them. Optional **Verified CRX
Uploads** can protect package updates with an RSA key; keep its private key out of
Git and the Google Account. [Update guide](https://developer.chrome.com/docs/webstore/update)

Published items can be re-reviewed. Google sends rejection, warning, takedown,
and account notices to the publisher email, so it must be monitored. Appeals are
available through the Dashboard; the policy allows one appeal per violation and
forbids frivolous appeals or enforcement circumvention. [Review and enforcement](https://developer.chrome.com/docs/webstore/review-process), [Program policies](https://developer.chrome.com/docs/webstore/program-policies/policies)

## Official source index

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [July 2026 privacy and platform-integrity update](https://developer.chrome.com/blog/cws-policy-updates-2026)
- [Developer registration](https://developer.chrome.com/docs/webstore/register/)
- [Developer account setup](https://developer.chrome.com/docs/webstore/set-up-account)
- [Trader verification FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq)
- [Prepare extension package](https://developer.chrome.com/docs/webstore/prepare)
- [Store listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Privacy practices fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- [Test instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions)
- [Image requirements](https://developer.chrome.com/docs/webstore/images)
- [Publishing flow](https://developer.chrome.com/docs/webstore/publish)
- [Review process](https://developer.chrome.com/docs/webstore/review-process)
- [Update guide](https://developer.chrome.com/docs/webstore/update)
- [Gemini Live Translate client authentication](https://ai.google.dev/gemini-api/docs/live-api/live-translate#use-ephemeral-tokens-in-client-side-applications)
- [Gemini ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)
- [Gemini API-key security](https://ai.google.dev/gemini-api/docs/api-key#security_and_secret_management)
