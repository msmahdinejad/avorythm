# Avorythm — product launch demo ("Watch it switch")

40-second launch demo, 1920×1080 at 60 fps, in 12 languages (`en fa ru ar zh hi es pt fr de tr ja`). Everything is made
in code: the picture is a pure `renderFrame(t)` in HTML/CSS rendered by headless Chrome, the score and all sound design
are synthesized in numpy, and the only voice is the product's own kind of voice: Gemini 3.8 Live.

## Concept

The film opens on the payoff. A travel video (the product's own *Coastlines* campaign footage) speaks Japanese with a
Japanese caption in Avorythm's real subtitle card; on the downbeat of bar 2 the card flips to the viewer's language and the
same narrator is heard dubbed, with the original ducked underneath. Then one travelling camera explains how: out of the
video into the browser, into the toolbar icon and the real popup, down into the card, across to the synchronized player
tab, down its mixer, out into a laptop running the desktop app, through three words of trust, into a wall of the same video
in 25 languages that collapses into the logo.

Real interface: `extension/popup.html` and `extension/player.html` and the desktop app's `src/avorythm/static/index.html`
are rendered live in iframes with their own CSS and their own strings (fa / en / zh-Hans; other languages see the English
interface, exactly as in the product). The subtitle card uses the CSS of `extension/content.js`.

## Storyboard (120 BPM, bar = 2 s; every cue lives in `timeline.json`)

| Time (s) | Scene | Picture / interaction | Sound |
|---|---|---|---|
| 0.0–4.0 | Hook | full-bleed video, Japanese caption word-synced to the narrator; **2.0 the card flips** to the viewer's language, pill `日本語 → <language>` | Japanese narrator, sea, glass hit on the flip, Gemini Live dub (original ducked −15 dB) |
| 4.0–7.5 | Reveal | expo pull-back into a 3D browser; eyebrow *Avorythm* + "Any video. In your language." | drop A |
| 7.5–11.3 | One click | push into the toolbar icon → real popup; pick the language from the list, "On this page", **Start** → "Live translation is active" | clicks, list ticks, confirm pluck, chime + sparks |
| 11.3–16.0 | The card | travel onto the card; new sentence: original → flip → dub; labels; drag (13.6) and resize (14.6) | original + dub L2, glass grabs |
| 16.0–18.0 | 79 languages | the translation cycles through 7 languages on 8th/16th notes, counter 1→79, lands on the viewer's | rising ticks, build, pre-drop gap |
| 18.0–21.4 | Synchronized player | whip-pan to the real `player.html`; pause (20.0), seek drag, play (21.0) | drop B; original + dub L3 in sync, tape-stop on pause, scrub |
| 21.4–24.0 | Four outputs, your mix | the player's own mixer: Original audio off/on, volume 100→25 %, smart ducking on | the mix you hear follows the controls |
| 24.0–30.0 | Desktop app & files | a laptop opens on the real desktop app (File studio): drop `coastlines.mp4`, real job stages, ready player, ZIP → four files | hinge, drop pop, stage ticks, ready chime, zipper |
| 30.0–32.0 | Free · Open source · Private | three words with icons on the beat | break, three hits, riser |
| 32.0–34.3 | Wall of languages | the hook video again, then 25 tiles each captioned in another language; they collapse into the centre | final drop + a chorus of the same sentence in 14 voices |
| 34.3–40.0 | End card | logo assembles from its layers, wordmark, tagline, Add to Chrome / GitHub / Desktop app, URL; sonar rings, shine | final D major chord at 36.0, tail, fade 39.35–40 |

Headlines (EN / FA and all other languages): `copy/<lang>.json` (transcreated, site terminology from
`site/src/i18n/<lang>.json`). Spoken lines: `lines.json`.

## Files

- `index.html`, `film.css`, `film.js`, `engine.js` — the film (open `index.html?lang=fa` through the render server).
- `timeline.json` — BPM, cue times, voice placement; read by `film.js`, `tools/score.py` and `tools/mix.py`.
- `copy/<lang>.json` — on-screen text; `lines.json` — the three sentences (original + 12 dubs) and the language wall.
- `assets/coast.jpg` — the footage (cropped from `docs/images/campaign/subtitles-en.png`), `coast-blur.jpg` its frosted backdrop.
- `tools/voice.py` — Gemini 3.8 Live voices (key read at run time from the session `.env`, never printed; proxy 127.0.0.1:10808; ≤3 sessions).
- `tools/verify_voices.py` — Whisper check of every clip's actual audio (the Live stream can end early while its own transcript is complete).
- `tools/score.py` — music (`build/demo/music.wav`) + UI sound design (`build/demo/<lang>/sfx.wav`).
- `tools/mix.py` — voices + product behaviour (smart ducking, pause tape-stop, mixer), frequency-aware side-chain, master −14 LUFS / ≤ −1 dBTP.
- `tools/render.mjs` — headless Chrome renderer (≤ 8 workers), mux, web version, poster.
- `tools/qc.py` — loudness of the master, Whisper check of the dub lines in the final mix, contact sheets from the encoded files.
- `tools/meta.py` — writes `video/out/demo.meta.json`; `tools/build_all.sh` — the whole chain per language.

## Rebuild

Node 22+, Chrome, ffmpeg, Python 3.12 with numpy (and faster-whisper for QC). From the repository root:

```bash
node video/films/demo/tools/extract-app-ui.mjs          # desktop-app strings -> video/build/demo/app-ui.json
python -I video/films/demo/tools/voice.py               # 42 voice clips (cached)
python video/films/demo/tools/verify_voices.py          # ASR check of every clip
bash video/films/demo/tools/build_all.sh en fa ru ar zh hi es pt fr de tr ja
python video/films/demo/tools/qc.py --lang fa           # per language
python -I video/films/demo/tools/meta.py
```

Single frames / contact sheets while designing: `node video/films/demo/tools/render.mjs --lang de --sheet 2.9,9.2,14.5 --cols 3`.
RTL check: `--stills 0 --eval "window.__bidiCheck([3.4,9.2,14.5,37])"` must return `[]`.

Outputs: `video/out/demo-<lang>-1080.mp4` (master, H.264 High, BT.709, AAC 48 kHz), `video/out/demo-<lang>.mp4`
(1280×720 30 fps web), `video/out/demo-<lang>.jpg` (poster), `video/out/demo.meta.json`.
