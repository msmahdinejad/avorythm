# Avorythm — narrated tutorial (kind `tutorial`) · brief

**The idea.** One calm voice walks a brand-new user from "never heard of it" to "my video speaks my language" in eight steps,
and the camera does what a good teacher's finger does: it goes exactly where you have to look, waits for the click,
shows the result, and moves on. Directed like the launch demo (`REF/demo-video`): near-black indigo space, real product UI in
3D, push-ins onto the one control that matters, anticipation + ripple on every click, foley on every action, a music bed
that breathes under the voice. Not a screen recording: every step has its own staging, linked by continuous camera moves.

**Viewer promise.** After one viewing you can install, get the key, connect, pick language + mode, start, tune the outputs,
use the synchronized player, and know the desktop app exists.

## Rules this film follows

- **Narration drives the timing.** Every scene has a base choreography (English). For each language the voice clips are
  measured and aligned word by word (faster-whisper); each scene is re-timed so that clicks land on the spoken label
  ("…press **Save**" → the click on Save happens on the word), lines never overlap, and voices are stretched by at most
  ×1.12. Scene lengths are snapped to the 100 BPM grid so cuts land on beats in every language.
- **One timeline JSON** (`timeline.json`, base) → `build/tutorial2/<lang>/timeline.json` (fitted) is read by the picture
  (`page/film.js`), the score/foley (`tools/score.py`) and the mixer (`tools/mix.py`).
- **Real UI.** The extension's own `popup.html`, `options.html`, `player.html` and the desktop app's `index.html` are
  rendered live (with their real CSS and real strings from `video/src/data/ui.json` / `app.js`) inside zoomed containers so
  text stays razor sharp under the 3D camera. Interface language: `en`, `fa`, `zh-Hans` where the product has it; every
  other language sees the English UI, and the narration names buttons by their English labels.
- **Readable on a phone.** Every push-in brings the control's label to ≥ 28 px on the 1080p frame.
- **Captions.** Word-synced, centred at the bottom, the current word lit in the brand gradient; UI labels inside a line
  are drawn as small "UI chips" in the product's button style. RTL and CJK aware.

## Script (English · Persian)

Labels in `{id|…}` are UI labels (chips in captions, click anchors); `{id^…}` are click anchors without a chip.

| id | English | فارسی |
|----|---------|-------|
| l0 | Here’s how to set up Avorythm, in eight quick steps. | بیا Avorythm را در هشت قدمِ کوتاه راه بیندازیم. |
| l1 | Step one. On the Chrome Web Store, click **Add to Chrome**, then pin it to your toolbar. Edge works too. | قدم اول: در Chrome Web Store روی **افزودن به Chrome** بزن و آن را در نوار ابزار پین کن. روی Edge هم کار می‌کند. |
| l2 | Step two. In Google AI Studio, create a free API key, and copy it. | قدم دوم: در Google AI Studio یک کلید API رایگان بساز و کپی‌اش کن. |
| l3a | Step three. Open Avorythm’s settings. | قدم سوم: تنظیمات Avorythm را باز کن. |
| l3b | Paste the key under **Connect to Gemini**, and press **Save**. It stays in your browser. | کلید را در **اتصال به Gemini** بچسبان و **ذخیره** را بزن؛ فقط در مرورگرت می‌ماند. |
| l3c | Then tick the consent box for Google Gemini. | بعد تیک اجازهٔ ارسال به Google Gemini را بزن. |
| l4a | Step four. On any video, click the Avorythm icon and pick your language. There are seventy-nine. | قدم چهارم: روی هر ویدیو آیکون Avorythm را بزن و زبانت را انتخاب کن؛ هفتاد و نه زبان هست. |
| l4b | **On this page** is the fastest. The **Synchronized recorder & player** adds pause, seek and export. | **داخل همین صفحه** سریع‌ترین است؛ **ضبط و پلیر هماهنگ** مکث، جابه‌جایی و خروجی هم دارد. |
| l5 | Step five. Press **Start translating**, and the video speaks your language. | قدم پنجم: **شروع ترجمه** را بزن؛ حالا ویدیو به زبان تو حرف می‌زند. |
| l6a | Step six. Switch each output on or off: original audio, dubbed audio, and both subtitles. | قدم ششم: هر خروجی را جدا روشن یا خاموش کن: صدای اصلی، صدای دوبله و هر دو زیرنویس. |
| l6b | Subtitles sit on a frosted-glass card. Drag it anywhere, and resize it. | زیرنویس‌ها روی یک کارت شیشه‌مات می‌آیند؛ جابه‌جایش کن و اندازه‌اش را تغییر بده. |
| l6c | Balance the original against the dub, and smart ducking lowers it while the dub speaks. | صدای اصلی و دوبله را میزان کن؛ کاهش هوشمند هنگام دوبله، صدای اصلی را کم می‌کند. |
| l7a | Step seven. The synchronized player lets you pause, seek, and go fullscreen. | قدم هفتم: پلیر هماهنگ امکان مکث، جابه‌جایی و تمام‌صفحه می‌دهد. |
| l7b | Then export a WebM video with SRT subtitles. | بعد ویدیو را با فرمت WebM و زیرنویس SRT خروجی بگیر. |
| l8a | Step eight. The desktop app translates any program, on Windows, macOS and Linux. | قدم هشتم: اپ دسکتاپ صدای هر برنامه‌ای را ترجمه می‌کند؛ روی Windows، macOS و Linux. |
| l8b | In **File studio**, drop in a file, and get all four outputs in one ZIP. | در **استودیوی فایل** یک فایل رها کن و هر چهار خروجی را در یک ZIP بگیر. |
| l9 | Avorythm is free and open source. If it helps you, give it a star on GitHub. | Avorythm رایگان و اوپن‌سورس است. اگر به کارت آمد، در GitHub به آن ستاره بده. |

Exact UI labels verified against `extension/*.html`, `video/src/data/ui.json`, `src/avorythm/static/app.js`:
Open settings / بازکردن تنظیمات · Connect to Gemini / اتصال به Gemini · Save / ذخیره · I allow audio from my selected tab to be
sent to Google Gemini / ارسال صدای تب انتخاب‌شده به Google Gemini را تأیید می‌کنم · Target language / زبان مقصد · On this page /
داخل همین صفحه · Synchronized recorder & player / ضبط و پلیر هماهنگ · Start translating / شروع ترجمه · Live translation is active /
ترجمهٔ زنده فعال است · On-page playback / پخش داخل تب · Original audio, Dubbed audio, Source subtitles, Translated subtitles ·
Original volume / Dubbed volume · Smart original-audio ducking / کاهش هوشمند صدای اصلی · Jump to latest / رفتن به آخرین بخش ·
Finish recording / پایان ضبط · Build & download customized video / ساخت و دریافت ویدیوی شخصی‌سازی‌شده · File studio /
استودیوی فایل · All four files / هر چهار فایل. Defaults respected: on-page output starts as *dubbed audio only*, smart ducking is
on by default, keys are session-only by default, synchronized export = WebM + one SRT per enabled subtitle track.

## Shot list (English base timing, 100 BPM; every language is re-timed from its own voice)

| # | time | step | staging & camera | action / result | takeaway |
|---|------|------|------------------|-----------------|----------|
| 0 | 0.0–5.4 | intro | Logo assembles from its 15 colour parts in deep space, rings pulse on the beat; wordmark + "Set up Avorythm in 8 steps". Push-through: the logo blooms toward camera, the browser arrives from depth. | — | — |
| 1 | 5.4–16.8 | Install | Browser in a strong 3D swing (ry −24°) settles while the objective title holds over a rack-focused frame, then a push to **Add to Chrome** (×2). Chrome's install bubble drops; pan up to **Add extension**. Whip to the toolbar at ×2.6: puzzle → Extensions menu → pin; the Avorythm icon lands with a spring and a glow ring. Pull back with a counter-swing. | add → dialog → added → pinned | Pinned, one click away · Edge too |
| 2 | 16.8–25.2 | Gemini key | Whip-pan right into a new tab. **Overhead** start (rx 40°) tilting up to frontal while pushing into **Create API key**. New key row writes itself in; copy → "Copied". The key capsule lifts off the page toward the lens (z+). | create → copy | Free · Google AI Studio |
| 3 | 25.2–40.0 | Connect & consent | Match-cut on the capsule. Popup opens from the pinned icon: **Quick setup required → Open settings** (close-up). New tab slides in: real Settings page. Capsule lands in the **Gemini API Key** field (dots), click **Save** → green status, lock badge. **Crane down** the page (scroll + tilt) to **Consent and privacy**; the box ticks in macro close-up. | open → paste → save → consent | Your key stays in your browser |
| 4 | 40.0–54.0 | Language & mode | Video tab (moonlit short film playing). Click the pinned icon → popup springs open. Push into **Target language**; the dropdown races through 79 entries with motion blur and lands on the viewer's language while a giant **79** fills the negative space. Tilt down to the two mode cards: side-light on **On this page** ("Fastest"), then **Synchronized recorder & player** ("Pause · seek · export"). | language set | 79 languages · 2 modes |
| 5 | 54.0–61.0 | Start | Continuous move to **Start translating** (×2.3). Click: spark ring, status flips to **Live translation is active**, button becomes **Stop translation**. The popup folds away; camera swings onto the video: the violet original waveform morphs into the cyan dub waveform, "JA → EN". | dub plays | Live dub, right on the page |
| 6 | 61.0–78.0 | Make it yours | **Split view**: the video left, the real **On-page playback** settings card right, both in 3D facing each other. Four switches tick in time with the voice; each one lights up its effect on the video (waveforms, then the frosted-glass card with both lines). Push into the card: drag by its handle, resize from the grip (callouts). Swing back: **Original volume** slider down, **Smart original-audio ducking** glows; the waveform dips whenever the dub speaks. | outputs, card, mixer | 4 outputs · mixer · smart ducking |
| 7 | 78.0–88.5 | Synchronized player | Match-cut through the video into the real **Synchronized player**. Low-angle push to the transport: pause, seek-drag (time tooltip), fullscreen (the frame itself goes fullscreen for a beat). Pan to the recorder dock: **Finish recording → Build & download customized video**; file cards fly out: `video.webm`, `source.srt`, `translated.srt`. | export | Export WebM + SRT |
| 8 | 88.5–100.8 | Desktop app | Camera pulls back; a laptop lid swings open in 3D with the real desktop app ("Hear anything in your language."), OS badges pop on "Windows, macOS and Linux". Push into **File studio**: `lecture.mp4` is dragged in, stages run (Groq Whisper → Gemini → Gemini Live → aligning), download chips appear, click **ZIP · All four files**: the four files fold into one ZIP. | ZIP | Any program · any file · one ZIP |
| 9 | 100.8–108 | Outro | Rise above the laptop into the logo; "Free & open source", **★ Star on GitHub** clicked (star fills, sparkle burst), site URL types out, MIT chip. Final chord on the downbeat. | star | — |

Overlays (all scenes): the **objective title** (step number badge + title, large, over a dimmed/rack-focused frame for
≈1.2 s, then it shrinks into the top-start corner as the step chip) → the **takeaway** slides in under the chip at the
result moment → word-synced **captions** at the bottom. Vignette, film grain, drifting aurora light.

## Music plan (synthesized, numpy — `tools/score.py`)

100 BPM, D major / B minor colour (D – A/C# – Bm – G, with a lift to Em – A before the outro), built from the base
progression per scene so every scene starts on a downbeat.
- Intro: airy pad swell + rising shimmer, logo hit (sub boom + bell chord) when the logo locks.
- Steps 1–3: soft felt-pluck arpeggio (FM), warm pad, round sub bass, light shaker — *setup* energy, sparse.
- Steps 4–6: adds a gentle kick/clap pulse and offbeat hats — *momentum*; a short riser into step 5's Start click,
  a bright bell chord on "the video speaks your language".
- Steps 7–8: groove continues, plucks open up an octave.
- Outro: drums drop, pad + bells resolve on D on the final downbeat, tail with reverb.
- The bed is side-chained to the narration (≈ −8 dB under the voice, fast attack, 450 ms release) and breathes back up in
  the gaps between lines and on transitions.

## Sound design list (all synthesized; cue times come from the fitted timeline)

| action | sound |
|--------|-------|
| every click / tick | short mouse click (noise tick + 2.3 kHz body + low thump) |
| hover / anticipation | very soft air tick |
| scene transition / camera whip | band-passed noise whoosh, panned with the move |
| push-in | low swell (filtered noise + sub) |
| Chrome bubble / popup open | soft "pop" (pitch sweep) |
| icon pinned / key copied / Save / consent | two-note glass chime (rising) |
| key capsule lifts / lands | airy shimmer up / soft thud |
| dropdown racing through 79 | accelerating then decelerating tick train (one tick per passing row) + whoosh |
| Start translating | riser into a bright 4-note bell chord + spark burst |
| toggles | toggle click with a pitched blip, pitch rising per switch |
| card drag / resize | grab + release |
| slider | soft continuous friction tied to slider speed |
| pause / seek / fullscreen | click, scrub texture, fullscreen swoosh |
| export / files fly out | ticks per file card |
| laptop lid | hinge creak-free soft whoosh + low thump when it settles |
| file drop | drop thud + stage blips while processing, ready chime |
| ZIP | zipper |
| GitHub star | sparkle burst (6 bell partials) |
