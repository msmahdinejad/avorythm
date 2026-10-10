# Avorythm films — shared production rules

Three different films are produced, each by its own team (one agent per film, never mixed):

| kind       | folder                  | what it is                                                                 | length    |
|------------|-------------------------|-----------------------------------------------------------------------------|-----------|
| `film`     | `video/films/film/`     | cinematic brand film, the emotional "why" (reference: motion-film)          | 45–55 s   |
| `demo`     | `video/films/demo/`     | product launch demo, the "what" (reference: demo-video)                     | 40–50 s   |
| `tutorial` | `video/films/tutorial/` | narrated step-by-step guide, the "how", directed like the demo              | 90–120 s  |

Every film is delivered in 12 languages: `en fa ru ar zh hi es pt fr de tr ja` (RTL: `fa`, `ar`).

## The quality bar

The user's three reference projects (made entirely in code, like ours) are the bar to beat:

- `REF/motion-film/avorythm-motion-film/` — `avorythm.mp4`, `brief.md`, `src/` (canvas film, numpy score with a synthesized santur/daf)
- `REF/demo-video/avorythm-demo-video/` — `demo.mp4`, `README.md`, `demo.html` (HTML/CSS film with a hand-written 3D camera), `audio.mjs`
- `REF/explainer/avorythm-explainer/` — `explainer.mp4`, `explainer.html` (2D character animation), `audio.mjs`, `linkedin-post.txt`

`REF` = `C:/Users/SALEH/AppData/Local/Temp/claude/C--Users-SALEH-OneDrive-Desktop-Translator/af2adb1c-ff0c-4b1c-845c-de93383e34c9/scratchpad/ref`

Watch them properly before designing anything: extract frames densely (`ffmpeg -vf fps=4`), look at transitions frame by frame, read their source. The user called them "extremely attractive, professional and cool — clearly there is a scenario and direction behind them, the viewer is hooked at first sight". What makes them work:

- **A real idea and a script.** Each scene says one thing. Every second is planned on a timeline JSON that picture and sound both read.
- **Direction and camera.** Push-ins onto the one element that matters, 3D tilt/perspective, depth, parallax, rack-focus style dimming of everything else, motivated moves with expo/quint easing. Nothing just sits there.
- **Restraint.** Near-black indigo backgrounds with soft light, few elements per frame, large readable type, generous negative space, strong hierarchy (one headline + one subline).
- **Rhythm.** Cuts, pops and text land on the beat; the music builds, drops and resolves with the story; UI foley (clicks, ticks, whooshes, success chimes) on every action.
- **Craft details.** Real product UI and real strings, frosted glass, film grain, vignette, moving light, motion blur on fast moves, anticipation/overshoot/stagger, perfectly shaped Persian/Arabic RTL text.

An earlier attempt by us (`video/out/promo-en.mp4`, `video/out/tutorial-en.mp4`, sources in `video/src/films/`) was rejected as **not at that level**: purple background far too saturated, ribbons chaotic and thick, text lines colliding, cramped tiles and lonely UI panels floating in empty space, flat screencast-like tutorial (one static browser window for two minutes, tiny UI text, no camera, the same layout for every step). Do not repeat that; you may reuse its plumbing.

## Product facts (do not invent features)

Avorythm = free, open-source (MIT) Chrome/Edge extension + desktop app (Windows/macOS/Linux) that translates and **dubs** speech live: captures a tab (or, in the desktop app, any program / any audio-video file), transcribes, translates and speaks it in the viewer's language with AI voices (Gemini Live), and shows bilingual subtitles on a draggable frosted-glass card. 79 target languages. Four independent outputs (original audio, dubbed audio, source subtitles, translated subtitles) and a mixer between original and dub with smart ducking. Two playback modes: "On this page" (fastest) and the "Synchronized recorder & player" (records ahead, lets you pause/seek/fullscreen, exports WebM + SRT). Uses the user's own free Gemini API key (Google AI Studio; optional Groq key for Whisper in precise mode); keys stay in the browser; no ads, no analytics, no developer server. Chrome Web Store id `kbdbbedijheicmmnmoidamdaodjbhjje`. Site: `https://msmahdinejad.github.io/avorythm/`, repo `https://github.com/msmahdinejad/avorythm`.

Real UI to show: the extension pages in `extension/` (`popup.html`, `options.html`, `player.html` with their `.css/.js`) can be rendered for real; their strings are extracted per locale in `video/src/data/ui.json` (the extension UI exists in `en`, `fa`, `zh-Hans` only — other languages see the English UI). Screenshots: `docs/images/extension/*`, `docs/images/campaign/*`, `docs/images/app-en.png`, `app-fa.png`. Logo layers: `video/src/assets/logo/` (+ `parts.json`). Brand palette from the logo: violet `#652AFB`, cyan `#3FF9F9`, navy `#07105A`; product UI uses `#8f7cff` / `#54dfda` on `#080a13`. Site copy per language (approved terminology): `site/src/i18n/<lang>.json`; store listing titles: `store-assets/LISTING.<code>.md`.

## Infrastructure you may use (read-only — copy into your folder before changing anything)

- `video/tools/render.mjs` — headless Chrome over CDP, parallel workers, segment cache, ffmpeg encode, `--stills/--sheet/--video/--mux`.
- `video/tools/dsp.py` — numpy instruments (pads, FM plucks, drums, reverb, whooshes, risers).
- `video/tools/narrate.py` — Gemini Live narration with transcript verification; `video/tools/mix.py` — VO edit (silence squeeze, rubberband stretch), ducking, −14 LUFS master.
- `video/src/engine/lib.js` — easing, tokenizer (Intl.Segmenter), `embedExt()` (renders the real extension pages in iframes with the right locale), icons, fonts.
- Fonts: `video/node_modules/@fontsource-variable/{inter,vazirmatn,noto-sans-sc,noto-sans-jp,noto-sans-devanagari,jetbrains-mono}`. Fail the render if a font does not load.
- Whisper check: `faster-whisper` is installed for the system Python (run WITHOUT `-I`); see `video/tools/` scripts and the scratchpad `tools/whisper_check.py`.

## Voices

Narration and character voices: **Gemini 3.8 Live** (`gemini-3.8-live-extended-thinking`) over the v1beta Live WebSocket, exactly as `video/tools/narrate.py` does (system instruction "read exactly", `<script>` wrapping, `outputAudioTranscription` verification, retries). The key is read at run time from `REF/../ref/gemini-live/gemini-3-flash-live/.env` (`GEMINI_API_KEY`) — i.e. `C:/Users/SALEH/AppData/Local/Temp/claude/C--Users-SALEH-OneDrive-Desktop-Translator/af2adb1c-ff0c-4b1c-845c-de93383e34c9/scratchpad/ref/gemini-live/gemini-3-flash-live/.env`. **Never print, log or copy the key.** Google is reachable only through the local HTTP proxy `http://127.0.0.1:10808`. Run Python with `-I` and `sys.stdout.reconfigure(encoding="utf-8")`. Brand pronunciation: "Avorythm" = AH-voh-rith-um ("avo" + "rhythm"); keep it in Latin script in every language. Numbers in spoken text are written as words. Write translations yourself as a native copywriter would (transcreate, not translate), reuse the site's terminology, and fit every line into its time window.

## Sharing this machine (three teams run at the same time)

- Own only: `video/films/<kind>/`, `video/build/<kind>/`, `video/out/<kind>-*`, `video/out/<kind>.meta.json`. Do not modify anything else (no edits to `video/tools`, `video/src`, `site/`, `extension/`, git).
- Rendering: at most **8** Chrome workers per render (`--workers 8`). 32 cores / RTX 4060 / 30 GB RAM are shared.
- Gemini: at most **3** concurrent sessions; retry handshake timeouts with backoff.
- Do not commit, push or publish anything.

## Deliverables (per film kind, per language)

- `video/out/<kind>-<lang>-1080.mp4` — master: 1920×1080, H.264 High, yuv420p, BT.709, AAC 48 kHz stereo, −14 LUFS integrated, true peak ≤ −1 dBTP.
- `video/out/<kind>-<lang>.mp4` — web version: 1280×720 @ 30 fps, CRF ~24–26, `+faststart`, aim for ≤ 8 MB (film/demo) and ≤ 14 MB (tutorial).
- `video/out/<kind>-<lang>.jpg` — 1280×720 poster (a strong, representative frame, not a fade).
- `video/out/<kind>.meta.json` — `{ "kind", "duration", "fps", "langs": { "<lang>": { "title", "transcript": [ "line", … ] } } }` (transcript = what is said or, for music-only films, the on-screen text in order).
- `video/films/<kind>/README.md` — concept, storyboard table, how to rebuild.

## Quality control (mandatory, before you call anything done)

1. Storyboard + script first (`video/films/<kind>/brief.md`), then build English and Persian to final quality before any other language.
2. Contact sheets of every scene and every transition window; inspect at full resolution: no clipped/colliding/overflowing text in ANY language (long German/Russian/Hindi lines, RTL shaping, CJK line breaking), no font fallback, no empty dead frames, no jitter.
3. Audio: −14 LUFS / ≤ −1 dBTP measured with `ebur128`; narration intelligible over music (faster-whisper transcript matches the script in every language); A/V sync of clicks and cuts.
4. Watch the final MP4 itself (frames extracted from the encoded file), not only the source frames.
