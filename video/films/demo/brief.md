# Avorythm — product launch demo · brief

**Kind:** `demo` (the "what") · **Length:** 40.0 s · 1920×1080 · 60 fps · 12 languages (`en fa ru ar zh hi es pt fr de tr ja`)
**Reference to beat:** `REF/demo-video/avorythm-demo-video/demo.mp4` (40 s, 96 BPM, cut scenes, screenshot popup, no voice).

## Concept — "Watch it switch"

The film opens on the payoff instead of the explanation. Frame 0 is a beautiful travel video (the product's own
*Coastlines* campaign footage) with a narrator speaking **Japanese** and a Japanese caption in Avorythm's real subtitle
card. On the downbeat of bar 2 the card **flips**: the Japanese line shrinks into the grey source line, the sentence
rises in the viewer's language, and the same narrator is heard **dubbed in the viewer's language** while the original
ducks underneath. Two seconds, no explanation needed — that is the product.

Then the camera pulls back and *keeps travelling*: out of the video into the browser, into the toolbar icon, into the
real popup, down into the card, across to the synchronized player tab, down its mixer, out into a laptop running the
desktop app, through three words of trust, into a wall of the same video in 25 languages that collapses into the logo.
One continuous camera, one beat grid, one sentence per scene.

- **Muted:** every scene has one short headline (+ one subline) in the viewer's language; the subtitle card itself tells
  the hook. **Sound on:** the hook is a real Gemini Live dub; every UI action has foley; the mix you see in the mixer is
  the mix you hear (original/dub/ducking audibly change).
- **Real UI only:** the extension's `popup.html` and `player.html` and the desktop app's `index.html` are rendered live
  in iframes with their real CSS and real strings (en / fa / zh-Hans UI; other languages see the English UI, as in the
  product). The subtitle card uses the exact CSS of `extension/content.js`.
- **Beat the reference:** continuous travelling camera instead of cuts between isolated scenes; push-ins onto the exact
  control that is used; 3D yaw/pitch with parallax light; spotlight dimming; directional motion blur on every fast move;
  a hook in the first 2 s; a spoken dub; more real interactions (select a language from the real list, Start → Stop
  state, drag + resize the card, pause/seek, uncheck an output, drag a volume slider, drop a file and watch the real
  job stages); cleaner hierarchy (eyebrow · headline · one subline, nothing else); a built logo end card with a beat-locked final chord.

## Look

Near-black indigo stage (`#05060f → #0a0c1f`) with two slow light pools (violet `#652AFB` top-left, cyan `#3FF9F9`
bottom-right, both ≤ 18 % alpha), film grain 6 %, vignette. Product UI keeps its own palette (`#8f7cff / #54dfda` on
`#080a13`). Type: Inter (Latin/Cyrillic/Greek), Vazirmatn (fa/ar), Noto Sans SC / JP / Devanagari; headline 92 px/700,
tracking −0.035 em, keyword in a violet→cyan gradient; subline 32 px/450 `#9aa4c0`; eyebrow 22 px/600 cyan, tracked.
Headlines sit in the negative space the camera leaves free (left third for LTR, right third for RTL); they never overlap
UI. Long languages (de/ru/hi) are auto-fitted, never clipped.

## Music

120 BPM (beat 0.5 s, bar 2 s), B minor → D major, progression **Bm – G – D – A**, all numpy-synthesized (`tools/score.py`).

| Bars | Time | Section | Content |
|---|---|---|---|
| 0–1 | 0–4 | Intro | Bm(add9) pad, ocean bed (the video's own sound), heartbeat sub; 2.0 reverse swell → glass hit on the flip; muffled beat under the dub; riser + snare roll 3–4 |
| 2–7 | 4–16 | Drop A | four-on-the-floor, off-beat hats, claps 2/4, side-chained sub bass on roots, 16th FM-pluck arp, pad |
| 8 | 16–18 | Build | kick out, pitched ticks on every language change (rising scale), snare roll, filter riser, reverse cymbal |
| 9–14 | 18–30 | Drop B | full groove + lead motif (FM bell), bass octaves; half-time feel 21.5–24 so the audible mix changes read |
| 15 | 30–32 | Break | drums out, pad + bells, three hits on 30.0 / 30.5 / 31.0, riser |
| 16–17 | 32–36 | Final drop | wall of languages (a chorus of the same sentence in 14 voices) → logo build, groove for two bars |
| 18–19 | 36–40 | Resolve | final **D major (add9)** chord on 36.0 with the CTA, shimmer tail, fade 39.35–40.0 |

Voice: Gemini 3.8 Live (`gemini-3.8-live-extended-thinking`), one narrator voice for the "original" (Japanese; Korean
for Japanese viewers) and for the dub in the viewer's language. Three sentences:
L1 "Every new path tells a new story." (hook) · L2 "This road runs all the way to the sea." (card) ·
L3 "Listen — you can hear the waves from here." (synchronized player). Original ducks −12 dB under the dub (smart ducking).

## Shot list (exact cue times live in `timeline.json`; picture and sound both read it)

| # | Time (s) | Scene | Camera | Picture & interaction | Headline EN / FA | Sound |
|---|---|---|---|---|---|---|
| 1 | 0.00–4.00 | **Hook** | tight on the playing video (full-bleed), slow push-in, micro punch-in on the flip | JP caption word-synced to the voice in the real card; **2.00 flip** → dual subtitles; pill "日本語 → English" | — (the card carries it) | JP narrator 0.12; ocean bed; 2.00 swell→glass hit; dub L1 2.25; riser 3–4 |
| 2 | 4.00–8.00 | **Reveal** | 4.00 expo pull-back from the video to a 3D browser (yaw −16°), parallax light; 6.4 dolly to the toolbar, page dims | browser with tab "Coastlines · Episode 3", Avorythm icon live | eyebrow **Avorythm** · "Any video. In your language." · "Live AI dubbing and bilingual subtitles, right in your browser." / «هر ویدیویی، به زبان خودت.» · «دوبلهٔ زنده با هوش مصنوعی و زیرنویس دوزبانه، همین‌جا در مرورگر.» | DROP A 4.00; pull-back whoosh |
| 3 | 7.50–11.30 | **One click** | push into the icon → popup; push into the language field; tilt to modes; push onto Start | icon click 7.50 → real popup opens; field click 8.50 → list of real language names scrolls → pick 9.50; mode 10.25; **Start 11.00** → "Live translation is active", Stop state | "Pick a language. Press Start." · "One click, in Chrome or Edge." / «زبانت را انتخاب کن و «شروع» را بزن.» · «فقط یک کلیک، در Chrome یا Edge.» | clicks, list ticks, confirm pluck, Start chime + sparkle |
| 4 | 11.30–16.00 | **The card** | travel down-left with motion blur onto the card; spotlight dims the page | L2 source words with the JP voice (11.35); flip + dub L2 12.9; line labels 13.2; card dragged (13.6–14.2) and resized (14.6–15.2) | "Hear the dub. Read both languages." · "On a frosted-glass card you can drag, resize and fade." / «دوبله را بشنو، هر دو زبان را بخوان.» · «روی کادری شیشه‌مات که می‌توانی بکشی، بزرگ و کوچکش کنی و کم‌رنگش کنی.» | JP L2 ducked, dub L2, grab/release, glass stretch |
| 5 | 16.00–18.00 | **79 languages** | slow push into the card | translation cycles through 7 languages on 8th/16th notes (16.25–17.375), counter 1→79, lands on the viewer's language at 17.5 | "79 languages." / «۷۹ زبان.» | rising pitched ticks, snare roll, riser, land hit |
| 6 | 18.00–21.40 | **Synchronized player** | whip-pan right (motion blur) to the second tab: real `player.html`; push onto the transport | captions L3 + synced dub (18.5); pause 20.00; seek drag 20.25–20.85; play 21.00 | "Pause. Seek. Stay in sync." · "The synchronized player records ahead — export WebM + SRT." / «مکث، عقب و جلو، همیشه همگام.» · «پلیر هماهنگ جلوتر ضبط می‌کند؛ خروجی WebM و SRT بگیر.» | DROP B 18.00; JP L3 + dub L3 together; tape-stop on pause; scrub; play |
| 7 | 21.40–24.00 | **Four outputs, your mix** | tilt down to the "Output mix" dock | uncheck Original audio 22.00 (it vanishes from the mix) → check 22.50; drag Original volume 100→25 % 22.75–23.35; smart ducking on 23.50 | "Four outputs. Your mix." · "Original audio, dub and both subtitles — each on or off, with smart ducking." / «چهار خروجی، ترکیب دلخواه تو.» · «صدای اصلی، دوبله و هر دو زیرنویس، هر کدام جدا؛ با کاهش هوشمند صدای اصلی.» | checkbox clicks; slider ticks; audible mix change |
| 8 | 24.00–30.00 | **Desktop app & files** | pull far back, windows recede; laptop rises and opens (3D), push into the real app's File studio | `coastlines.mp4` dragged into the drop zone (25.75→26.5); Process file 27.0; real job stages 27.1–28.65; Ready 29.0; ZIP chip 29.25 → `all-outputs.zip` fans into original.wav · dubbed.wav · source.srt · translated.srt | "Any app. Any file." · "The desktop app for Windows, macOS and Linux." / «هر برنامه‌ای، هر فایلی.» · «اپ دسکتاپ برای Windows، macOS و Linux.» | lid hinge, drag, drop pop, stage ticks, ready chime, zipper, file ticks |
| 9 | 30.00–32.00 | **Free · Open source · Private** | camera flies through the words | three words land on 30.0 / 30.5 / 31.0; subline | "Free. Open source. Private." · "Your own free Gemini key. No ads, no analytics, no servers." / «رایگان. اوپن‌سورس. خصوصی.» · «با کلید رایگان Gemini خودت؛ بدون تبلیغ، بدون آنالیتیکس، بدون سرور.» | break, three hits, riser |
| 10 | 32.00–34.30 | **Wall of languages** | starts full-frame on the hook video, expo pull-back to a 3D wall of 25 tiles, collapse into the centre | each tile captioned in another language; the viewer's in the centre | — | final drop, chorus of 14 voices, suction into the logo |
| 11 | 34.30–40.00 | **End card** | logo layers fly in from depth, sonar rings on the beat | logo 34.3, wordmark 34.8, tagline 35.2, CTA 36.0, shine 36.6, fade 39.35–40.0 | "Hear every voice in your language." · [Add to Chrome — it's free] [GitHub] [Desktop app] · msmahdinejad.github.io/avorythm / «هر صدایی را به زبان خودت بشنو.» | final chord 36.0, shimmer tail |

## Sound design (every action has a sound)

UI click (two-layer transient + body), hover tick, dropdown open (soft pop), list scroll ticks (pitch follows speed),
confirm pluck, radio click, Start chime + sparkle, camera whooshes scaled by speed, whip-pan whoosh, card grab/release
(glassy), resize stretch (filtered noise swell), language ticks on a rising scale, pause = tape-stop of the video's audio,
seek scrub (granular), play click, checkbox clicks, slider tick stream, laptop hinge, file drag + drop pop, job-stage
ticks, ready chime, zipper, file-card ticks, three trust hits, logo whoosh-ins + impact, CTA shine sparkle.

## Copy rules

Headlines are transcreated per language (not translated word for word), reuse the site's terminology
(`site/src/i18n/<lang>.json`: "79 languages", "Dual subtitles", "Synchronized player", "Free & open source", hero tagline),
keep "Avorythm", "Chrome", "Edge", "Gemini", "WebM", "SRT" in Latin script, Persian digits in `fa`, and fit their windows.
