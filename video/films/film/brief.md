# Avorythm — brand film: «Do you understand me now?»

**Kind:** `film` (the emotional "why") · **Format:** 1920×1080, 60 fps, 53.2 s · **Languages:** en fa ru ar zh hi es pt fr de tr ja

## Concept

A woman has been talking to you since the first frame — softly, close to the microphone, in a language you do not speak.
Around her the whole world is talking too: a lecture, a podcast, the news, a documentary, a stream… you hear every word and
understand none. One click. Silence. She speaks again — in *your* language, in her own voice — and the first thing she says
is the line she was saying all along: *"I've been talking to you this whole time… do you understand me now?"*
Then every other voice turns, one by one, into your language, and even the music crosses over: the cold electronic drone
of the first act becomes your own musical world (santur and daf for Persian, oud and darbuka for Arabic, sitar and tabla
for Hindi, koto and taiko for Japanese, guzheng for Chinese, flamenco guitar and palmas for Spanish, bossa nova for
Portuguese, bağlama in 9/8 for Turkish, piano and strings for English/French/German/Russian).

**What it improves over the reference motion film:** one protagonist and one emotional question instead of a montage;
one hero object (the product's real frosted subtitle card, with its real *source-only → dual subtitles* behaviour) instead
of eleven fake video windows; a real 3D camera (perspective, depth of field, parallax, breathing drift) instead of flat
layers; three clean product beats instead of seven feature cards; and a bookended ending in which the same voice speaks
the brand promise.

### Visual grammar — "sound as light"
- **Purple light = a voice you cannot understand. Cyan light = a voice in your language.** (The two halves of the logo.)
- Space: near-black indigo (`#05060e`), soft volumetric light at low alpha, drifting dust/bokeh, film grain, vignette.
  Never a saturated purple field.
- Voices are thin luminous ribbons (4 strands, 1.3–1.8 px, soft glow) driven by the real audio envelope of each clip.
- The hero object is the **real Avorythm subtitle card** (radius 20, 1 px white/20 % border, `rgba(11,15,28,.88)`,
  24 px backdrop blur, grip bar, source line 0.68× / 500 / 72 % white, translation line 650 / white) — rendered exactly as
  the extension draws it. Before the click it is in *source-only* mode (the foreign line big); after the click the foreign
  line shrinks to the source slot and the translation appears below, word-synced to the dub.
- Typography as performance: Inter / Vazirmatn / Noto Sans SC, JP, Devanagari at extreme weights (200 for whispers, 800–900
  for slams); a word that scrambles through ten languages before landing in yours; kashida stretch in Persian/Arabic.
- Camera: true perspective projection (cards live at x, y, z), focus distance + aperture → per-card depth-of-field blur,
  slow breathing drift everywhere, expo/quint easing on motivated moves, motion-blur smear on whips.
- Restraint: one headline + one subline at most; nothing smaller than 22 px at 1080p except ornamental UI chrome.

## Script (English master + Persian)

| id | who / where | English | Persian |
|---|---|---|---|
| `hero_src` | hero voice, Japanese (Arabic in the zh/ja versions) | 「ずっと、あなたに話しかけてたの。……ねえ、わかる？」 (*I've been talking to you all this time… hey, do you understand?*) | (same original) |
| `card_hero` | label pill on the hero card | Film · 日本語 | فیلم · 日本語 |
| `a` | headline | So many voices. | این‌همه صدا. |
| `b` | headline (the last word scrambles through ten languages) | Not one you **understand**. | و هیچ‌کدام را **نمی‌فهمی**. |
| popup | real extension popup (UI locale en/fa/zh, target = viewer language) | Target language · Start translating | زبان مقصد · شروع ترجمه |
| `hero1` | hero voice, dubbed (same voice) | I've been talking to you this whole time… | این همه مدت داشتم باهات حرف می‌زدم… |
| `hero2` | hero voice, dubbed | Do you understand me now? | حالا می‌فهمی چی می‌گم؟ |
| `dub_pod` | Spanish podcast host, dubbed | Hi everyone, and welcome to a new episode! | سلام به همه! به یه قسمت تازه خوش اومدین. |
| `dub_doc` | French documentary narrator, dubbed | In the depths of the ocean, light never arrives. | در اعماق اقیانوس، نور هیچ‌وقت نمی‌رسد. |
| `drop` | title (two lines) | Now the whole world / **speaks your language.** | حالا همهٔ دنیا / **به زبان تو حرف می‌زند.** |
| `dub_lec` | German lecturer, dubbed (browser scene) | Today we'll finally see how neural networks really learn. | امروز بالاخره می‌بینیم شبکه‌های عصبی واقعاً چطور یاد می‌گیرن. |
| `browser` | headline + sub | Live dubbing. Dual subtitles. / For any video in Chrome and Edge. | دوبلهٔ زنده. زیرنویس دوزبانه. / برای هر ویدیویی در Chrome و Edge. |
| `desktop` | headline + sub | On your desktop, too. / Any app. Any audio or video file. | روی دسکتاپ هم. / هر برنامه‌ای، هر فایل صوتی و تصویری. |
| `langs` | number + word | 79 languages | ۷۹ زبان |
| `free` | two slams + one line | Free. Open source. / No ads, no tracking — your keys stay with you. | رایگان. اوپن‌سورس. / بدون تبلیغ و ردیابی؛ کلیدهایت پیش خودت می‌ماند. |
| `tagline` | hero voice, spoken + on screen | Hear every voice in your language. | هر صدایی را به زبان خودت بشنو. |
| end card | logo, wordmark, CTA | Avorythm · Add to Chrome — it's free · Desktop app: Windows · macOS · Linux · msmahdinejad.github.io/avorythm | Avorythm · افزودن به Chrome — رایگان · اپ دسکتاپ: Windows · macOS · Linux · msmahdinejad.github.io/avorythm |

Voices of the world (originals, spoken once, shared by every version; the viewer's own language and the hero language are
left out of each version's crowd): German lecture, Spanish podcast, Russian news, Hindi tutorial, French documentary,
Chinese game stream, Arabic talk show, Turkish cooking show, Portuguese football commentary, English talk, Japanese anime
(only when the hero is Arabic). Every card's caption is transcreated into each film language for the cascade.

## Storyboard (exact times, seconds)

| time | beat | picture | sound |
|---|---|---|---|
| 0.00–2.40 | **Hook: the voice** | Frame 1 is already alive: an extreme macro of a purple voice ribbon, shallow focus, bokeh. The camera eases back; the hero's Japanese words light up one by one. | A breath; the hero voice (close, intimate) starts at 0.20; a cold low drone in D. |
| 2.40–4.30 | **The card** | The pull-back reveals the real subtitle card in source-only mode: the Japanese line big and white, the label pill "Film · 日本語". Moonlit film still behind the glass, out of focus. | Hero continues: 「……ねえ、わかる？」 (ends ≈ 3.8). |
| 4.30–5.70 | **The world** | Whip pull-back (expo, motion smear) into a deep 3D field: nine more cards (lecture, podcast, news, tutorial, documentary, stream, talk show, cooking, football) at different depths, softly tilted, each with its own foreign caption and purple ribbon. Rack focus wanders. | Whoosh; voices enter one after another, panned by screen position. |
| 5.60–7.20 | **A** | "So many voices." — kinetic, word stagger, "voices" leaves echo copies behind it. Dark scrim under the type. | Babel thickens; ticking clock starts to accelerate. |
| 7.30–9.40 | **B** | "Not one you **understand**." The last word scrambles through ten languages/scripts (12 Hz), lands in yours at 8.60 with a purple glitch glow. | Riser + Shepard tone; voices fragment into a wall. |
| 8.60–9.65 | **The wall** | Camera accelerates forward through the cards, shake builds, RGB-split glitch. | Stutter-glitch 9.35–9.65. |
| 9.65 | **Cut** | Hard cut to black. | **Total silence** (0.5 s). |
| 10.15–11.90 | **One click** | The real Avorythm popup rises out of the dark in 3D (rendered from `extension/popup.html` in the viewer's UI locale). Push-in: the target-language field (viewer's language) pulses; the cursor glides to **Start translating**. | Soft UI swell, a tick on the language, cursor swish. |
| 11.90 | **Click** | Press, cyan shockwave, the frame flips back to the hero card. | Click + sub boom + **the first note of the "translated" music** (santur / oud / sitar / koto / guzheng / guitar / piano…). |
| 12.20–≈17.5 | **She speaks your language** | The Japanese shrinks into the source slot; the translation appears below, word by word with the dub (active word glows cyan). The ribbon turns from purple to cyan, the background warms with a cyan glow. | Hero dub `hero1` 12.55 → `hero2` 0.42 s after it ends (same voice; the Japanese original ducked −17 dB underneath, as in the product). Free-rhythm intro of the lead instrument answers between the phrases. |
| ≈17.5–19.6 | **Cascade** | Camera pulls back; a cyan wave travels outward: every card flips to dual subtitles in your language and glides from chaos into a calm, ordered arc. | One lead-instrument note per flip (ascending run in the mode); `dub_pod` 0.25 s after the cascade starts (the cascade start follows the length of the dub in each language). |
| ≈19.6–21.40 | **Build** | The arc brightens on the tremolo, slow push-in to the centre. | Tremolo/roll + riser; 0.2 s breath of silence at 21.40. |
| 21.60–26.40 | **DROP: thesis** | "Now the whole world / **speaks your language.**" Thin line + black line, "your language" in cyan gradient; cyan ribbons breathe under it on the kick. | Full groove in the viewer's musical world (100 BPM, 2.4 s hyper-bar). |
| 26.40–31.20 | **Browser** | A browser window in 3D (address `lecture.example.com/neural-networks`, Avorythm icon lit in the toolbar) playing the German lecture; the real subtitle card shows German above, the viewer's language below; dub badge. Headline: "Live dubbing. Dual subtitles." / "For any video in Chrome and Edge." | `dub_lec` 26.85 (original German ducked under it); groove pulls back under the voice. |
| 31.20–36.00 | **Desktop** | The real desktop app (screenshot `docs/images/app-en/fa.png`) on a monitor in 3D, its transcript panels filling with text; a video file drops in; Windows/macOS/Linux marks. "On your desktop, too." / "Any app. Any audio or video file." | Groove; file "drop" foley. |
| 36.00–38.40 | **79 languages** | Huge "79" and a slot-roll of language names in their own scripts that lands on the viewer's language. | Decelerating ticks, lift. |
| 38.40–43.20 | **Free & open source** | "Free." then "Open source." slam on beats; one quiet line: "No ads, no tracking — your keys stay with you." GitHub mark. | Groove peak, two impacts. |
| 43.20–46.20 | **Tagline** | Break. On a cyan ribbon the hero voice says the tagline; words light up as she speaks them. | Music drops to the lead instrument + pad; `tagline` 43.40. |
| 46.20–53.20 | **Logo** | The purple and the cyan ribbon fold into the logo's arcs; the real logo layers lock (purple arcs ← , → cyan arcs, navy A), wordmark "Avorythm", the tagline under it, then two pills (Chrome Web Store · GitHub) and the URL. Holds ≥ 5 s, slow push-in, light sweep. | Final cadence + boom on the lock (46.20), shimmer, fade 52.5–53.2. |

## Music plan

- **Act I (0–9.65):** shared by all versions. D pedal drone (additive, cold, slowly brightening), a minor-second cluster
  (D/Eb/Ab) creeping in from 4 s, a clock tick that accelerates from 0.9 s, noise riser + Shepard tone from 5 s, babel
  voices, stutter-glitch, hard cut. No beat.
- **Click (11.90):** the lead instrument of the viewer's culture plays its first note (D) — the music changes language.
- **Free-rhythm intro (11.9 → cascade):** the culture's improvisatory form — avaz (santur), taqsim (oud), alap (sitar over
  tanpura), koto free phrase, guzheng glissandi, flamenco falseta, bossa chord melody, piano motif — playing only in the
  gaps between the hero's phrases, over a warm drone in the mode.
- **Cascade (≈17.5–19.6):** one note per card flip, an ascending run through the mode; **build** (≈19.6–21.4) on the culture's
  tremolo (riz, oud tremolo, sitar jhala, koto/guzheng tremolo, rasgueado, piano/strings swell) + riser; 0.2 s gap.
- **Groove (21.6–43.2):** tempo 100 BPM, **hyper-bar 2.4 s** (one 4/4 bar = two 6/8 bars = one 12/8 bulería compás = one
  9/8 karşılama bar), so every culture lands on the same cut points: 21.6 (drop), 26.4, 31.2, 36.0, 38.4, 40.8, 43.2.
  Intensity: drop 1.0 → browser 0.7 (under the voice) → desktop 0.85 → 79 0.9 → free 1.0.
- **Tagline break (43.2–46.2):** groove out, lead + pad only. **Logo lock (46.2):** cadence on D, sub boom, shimmer, 7 s tail.

| version | lead / percussion | mode on D | groove |
|---|---|---|---|
| fa | santur (4-course Karplus-Strong) / daf | Chahargah (E♭ and B♭ koron) | 6/8 |
| ar | oud (plectrum KS, body resonance) / darbuka + riq | Bayati (E half-flat) | maqsum 4/4 |
| tr | bağlama (bright KS, drone course) / darbuka | Hicaz | karşılama 9/8 (2+2+2+3) |
| hi | sitar (KS + jawari buzz) + tanpura / tabla | Yaman (Lydian) | keherwa, 8 mātrā per hyper-bar |
| ja | koto (KS, oshide bends) / taiko + shime | Miyako-bushi (D E♭ G A B♭) | 4/4, sparse (ma) |
| zh | guzheng (KS, glissandi, vibrato) / tanggu + muyu | gong pentatonic (D E F♯ A B) | 4/4 |
| es | flamenco guitar (rasgueado) / cajón + palmas | D Phrygian dominant, Andalusian cadence | bulería 12/8 |
| pt | nylon guitar (bossa comping) / shaker + rim | D major (maj9 / m9 / 13) | bossa nova 4/4 |
| en fr de ru | felt piano + string ensemble / cinematic drums | D major / Lydian colour | 4/4 pulse |

All instruments are synthesized in numpy (no samples). A version keeps its culture's score only if it passes the same
checks as the others (tuning by pitch tracking, clean transients, spectral balance, no clipping); otherwise it falls back
to the cinematic score.

## Sound design

breath (0.0) · cold drone + cluster (from 4.3) · accelerating clock ticks · heartbeat under the babel (from 5.7) · whoosh on
the whip (4.2) · babel voices panned by card position · riser + Shepard (from 5.6) · stutter-glitch (9.35) · hard silence
(9.65–10.1) · popup swell + glass ping (10.1) · language tick (10.95) · cursor swish (11.3) · **click + sub boom + shimmer +
first note** (11.9) · original voices ducked −16.5 dB and low-passed under every dub · one note per card flip + a long
whoosh (cascade) · reverse cymbal into the drop · breath gap (21.4) · boom + crash on the drop (21.6) · scene whooshes
(26.4, 31.2, 36.0, 38.4) · file drop thump + ping (32.5) · slot ticks (36.1–37.25) + landing ping · two impacts (38.4,
39.6) · reverse swell into the break (43.2) · logo part ticks + lock boom + shimmer (46.2) · tail fade.

Mix: voices levelled per clip, music ducked ≈ −9 dB under speech (smart ducking, like the product), master −14 LUFS
integrated, true peak ≤ −1 dBTP after AAC (4× oversampled true-peak limiter at −2.5 dBTP, verified on the encoded file).

## Production pipeline (everything in `video/films/film/`)

1. `voices.py` — Gemini Live voices (shared originals once + per-language dubs), transcript-verified.
2. `align.py` — faster-whisper word timings for every dubbed line (drives the subtitle word highlight).
3. `score.py` — per-culture score + shared sound design → `build/film/score/<culture>.wav`, notes/beats.
4. `mix.py` — voices + score + sfx → `build/film/<lang>/mix.wav` and `build/film/<lang>/timeline.json` (cues, clips,
   word timings, audio envelopes, notes, beats) — the single timeline that the picture reads.
5. `web/film.html` — canvas film, `renderFrame(t)` pure function of `t` + timeline.
6. `render.mjs` — headless Chrome (≤ 8 workers) → ffmpeg; master, web MP4, poster.
7. `qc.py` — contact sheets, loudness, Whisper transcript check.
