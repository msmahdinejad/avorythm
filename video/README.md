# Avorythm films

Three films, each made entirely in code (HTML/CSS/canvas frames captured by headless Chrome, synthesized music and sound design, Gemini Live voices) and delivered in 12 languages: `en fa ru ar zh hi es pt fr de tr ja`.

| kind | folder | what it is |
|---|---|---|
| `film` | [`films/film/`](films/film/) | cinematic brand film: the emotional "why" |
| `demo` | [`films/demo/`](films/demo/) | product launch demo: what Avorythm does, told through the real UI |
| `tutorial` | [`films/tutorial/`](films/tutorial/) | narrated step-by-step guide: how to install and use it |

Each film is self-contained in its folder: `brief.md` (concept, script, storyboard), `README.md` (how to rebuild), the film source, its score/sound design and its own render pipeline. [`films/PRODUCTION.md`](films/PRODUCTION.md) holds the shared rules: quality bar, product facts, voices, deliverables and QC.

## Outputs (not in git)

- `out/<kind>-<lang>-1080.mp4` — 1920×1080 master, −14 LUFS
- `out/<kind>-<lang>.mp4` — 1280×720 web version used by the site
- `out/<kind>-<lang>.jpg` — poster
- `out/<kind>.meta.json` — duration and per-language transcript

## Publishing to the site

```bash
node video/tools/publish-web.mjs --zip
```

copies the web versions, posters and a `manifest.json` into `site/public/video/` (git-ignored) and packs them into `video/out/site-video.zip`. The Pages workflow downloads that zip from the `site-media` release, so the repository stays small:

```bash
gh release create site-media video/out/site-video.zip --title "Site media" --notes "Videos for the website"
```

(to update later: `gh release upload site-media video/out/site-video.zip --clobber`, then re-run the Pages workflow).

## Other tools

- `tools/narrate_demo.py` (+ `tools/narrate.py`, the shared Gemini Live voice engine) — the hero demo voice clips on the website (`site/public/assets/audio/`).
- `tools/extract-ui.mjs` — extracts the extension's UI strings per locale into `src/data/ui.json`; `tools/logo-split.py` — splits the logo into the colour layers in `src/assets/logo/`. `src/engine/lib.js` is the small frame library the films share.

## Requirements

Node 22+, Python 3.12 with `numpy` and `websockets` (+ `faster-whisper` for the speech check), ffmpeg with `librubberband`, Google Chrome. `npm install` in this folder fetches the fonts. Voices need a Gemini API key in a local `.env` (`GEMINI_API_KEY`, never committed) and access to Google's Live API.
