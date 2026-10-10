# Avorythm — narrated tutorial (`tutorial`)

A 110–120 s narrated how-to, directed like the launch demo: after one viewing a new user can install Avorythm, get a
free Gemini key, connect it, pick language and mode, start translating, tune the four outputs, use the synchronized
player and knows the desktop app exists. Delivered in 12 languages (`en fa ru ar zh hi es pt fr de tr ja`).

**Concept.** One warm voice, eight mini-scenes. Each step opens with its objective title over a rack-dimmed frame, the
camera travels in 3D to exactly the control that matters (labels ≥ 28 px on the 1080p frame), the cursor clicks with
anticipation and a ripple *on the spoken word*, the result is shown, and a one-line takeaway lands under the step chip.
Every step has its own staging (strong swing, overhead tilt-up, crane down a page, racing dropdown with a giant “79”,
split view, fullscreen beat, laptop), linked by whip pans, match cuts and a key capsule that travels from Google AI
Studio into the settings field. The real product UI is rendered live — `extension/popup.html`, `options.html`,
`player.html` and the desktop app's `index.html` with their own CSS and strings — in the viewer's language where the
product has it (en / fa / zh-Hans), English elsewhere.

See `brief.md` for the full script (English + Persian), shot list, music plan and sound list.

## Storyboard (English timing; every language is re-timed from its own narration)

| # | time (en) | step | staging | result → takeaway |
|---|-----------|------|---------|-------------------|
| 0 | 0.0–5.4 | intro | logo assembles from its colour parts, rings on the beat, title; push-through | — |
| 1 | 5.4–15.6 | Install | Chrome Web Store in a strong 3D swing → push to **Add to Chrome** → install bubble → toolbar ×2.5: Extensions menu → pin | Pinned, one click away · Edge too |
| 2 | 15.6–23.4 | Gemini key | whip into Google AI Studio, overhead tilt-up, **Create API key**, key row types in, copy; the key capsule lifts off | Free · Google AI Studio |
| 3 | 23.4–36.6 | Connect & consent | popup **Open settings** → real Settings page; capsule lands in the key field, **Save**; crane down to **Consent and privacy**, tick | Your key stays in your browser |
| 4 | 36.6–51.6 | Language & mode | video tab, popup springs open, dropdown races through all 79 languages, giant “79”; **On this page** vs **Synchronized recorder & player** | 79 languages · 2 modes |
| 5 | 51.6–58.2 | Start | **Start translating** → spark ring, *Live translation is active*; swing onto the video, violet original waveform morphs into the cyan dub | Live dub, right on the page |
| 6 | 58.2–77.4 | Make it yours | split view video ↔ real **On-page playback** card: four switches; frosted-glass card (drag, resize); mixer + smart ducking with an audio scope | 4 outputs · mixer · smart ducking |
| 7 | 77.4–88.8 | Synchronized player | match-cut into the real player: pause, seek, fullscreen beat; *Video file is ready* → **Build & download customized video** → WebM + SRT cards | Export WebM + SRT |
| 8 | 88.8–102.0 | Desktop app | laptop powers on with the real app, live translation of any program, OS badges; **File studio**: drop `lecture.mp4`, stages, ready, **ZIP · All four files** | Any program · any file · one ZIP |
| 9 | 102.0–109.8 | outro | recap constellation of the real UI, logo, “Free & open source”, ★ Star on GitHub, site URL, MIT | — |

## How it is built

```
films/tutorial/
  brief.md, README.md
  timeline.json          base timeline (English design): scenes, line anchors, cues (clicks anchored to spoken words)
  script/<lang>.json     narration ({id|UI label} chips, {id^anchor} click anchors), on-screen text, demo subtitles, voice
  page/                  film.html + film.css, lib.js (copy of video/src/engine/lib.js), core.js (warp, camera, cursor),
                         parts.js (browser, Chrome Web Store, AI Studio, video page, real extension/app embeds),
                         scenes*.js (the ten scenes), main.js (titles, takeaways, word-synced captions, frame loop)
  tools/
    narrate.py           Gemini 3.8 Live narration (+ transcript and clip-length verification)  [python -I]
    autotempo.py         per-language tempo (≤ 1.15) so the film lands near 118 s      [python -I]
    prep.py              VO edit: pause squeeze, tempo, EQ/comp                       [python -I]
    align.py             faster-whisper large-v3 word timing → per-character times    [system python]
    fit.py               re-times the base timeline to the language (lines, click-on-word cues, beat-snapped cuts)
    score.py             100 BPM synthesized score + UI foley from the fitted cues    [python -I]
    mix.py               ducking, plate, −14 LUFS / −1.5 dBTP                           [python -I]
    render.mjs           headless Chrome frame renderer (copy of video/tools/render.mjs, ≤ 8 workers)
    deliver.py           master, web MP4 (≤ 14 MB), poster, out/tutorial.meta.json
    qc.py                stream props, ebur128, frame count + freeze check, Whisper transcript vs script,
                         contact sheet from the final MP4
    build_audio.sh       autotempo → prep → align → fit → score → mix for one language
    queue.sh             align → fit → score → mix → render (resumes a failed render) → deliver → qc, per language
    summary.py           QC table of every language (--readme rewrites the table below)
    make_scripts.py      writes the ten transcreated scripts beyond en/fa
```

Text stays sharp under the 3D camera because every world is laid out inside a CSS-`zoom`ed container (the iframes
inherit the zoom), so the camera scale stays ≈ 1 at the closest push-ins.

## Rebuild one language

```bash
cd <repo>
python -I video/films/tutorial/tools/narrate.py --lang en          # Gemini Live (key read from the shared .env, never printed)
echo '{"*": 1.07}' > video/build/tutorial2/en/tempo.json             # optional per-language tempo (fa 1.15, …)
python -I video/films/tutorial/tools/prep.py  --lang en
python    video/films/tutorial/tools/align.py --lang en
python -I video/films/tutorial/tools/fit.py   --lang en             # (--design once for en to sync the base cue times)
python -I video/films/tutorial/tools/score.py --lang en
python -I video/films/tutorial/tools/mix.py   --lang en
node video/films/tutorial/tools/render.mjs --lang en --video --workers 8 --format jpeg
python -I video/films/tutorial/tools/deliver.py --lang en
python    video/films/tutorial/tools/qc.py --lang en
```

Everything after the narration, for any set of languages, one render at a time:
`bash video/films/tutorial/tools/queue.sh en fa ru` (`WORKERS=8` to override the default 6 Chrome workers).

Stills / sheets while designing: `node video/films/tutorial/tools/render.mjs --lang fa --sheet 12,30.5,44 --cols 3 --sw 640 --name check`.

## Delivered (QC measured on the encoded files)

| lang | duration | tempo | frames @ 60 fps | freezes | master MB | web MiB | LUFS | true peak | Whisper vs script |
|---|---|---|---|---|---|---|---|---|---|
| en | 109.8 s | ×1.07 | 6588/6588 | 0 | 260.8 | 11.14 | -14.0 | -1.5 dBTP | 0.961 |
| fa | 118.8 s | ×1.15 | 7128/7128 | 0 | 291.3 | 11.5 | -14.0 | -1.5 dBTP | 0.865 — reviewed: brand/UI names transliterated (Gemini → جمینای), spelling variants |
| ru | 117.6 s | ×1.15 | 7056/7056 | 0 | 285.9 | 11.97 | -14.0 | -1.5 dBTP | 0.963 |
| ar | 120.0 s | ×1.15 | 7200/7200 | 0 | 304.3 | 11.75 | -14.0 | -1.5 dBTP | 0.925 |
| zh | 117.6 s | ×1.07 | 7056/7056 | 0 | 282.1 | 11.56 | -14.0 | -1.5 dBTP | 0.926 |
| hi | 117.6 s | ×1.07 | 7056/7056 | 0 | 291.8 | 11.6 | -14.0 | -1.5 dBTP | 0.872 — reviewed: English UI labels and brand transliterated to Devanagari |
| es | 117.0 s | ×1.12 | 7020/7020 | 0 | 288.9 | 11.79 | -14.0 | -1.5 dBTP | 0.963 |
| pt | 117.6 s | ×1.08 | 7056/7056 | 0 | 286.0 | 11.84 | -14.0 | -1.5 dBTP | 0.961 |
| fr | 117.6 s | ×1.01 | 7056/7056 | 0 | 289.3 | 11.98 | -14.0 | -1.4 dBTP | 0.966 |
| de | 118.2 s | ×1.12 | 7092/7092 | 0 | 286.4 | 11.97 | -14.0 | -1.5 dBTP | 0.971 |
| tr | 117.0 s | ×1.10 | 7020/7020 | 0 | 287.5 | 11.79 | -14.0 | -1.5 dBTP | 0.976 |
| ja | 120.0 s | ×1.15 | 7200/7200 | 0 | 291.0 | 12.1 | -14.0 | -1.5 dBTP | 0.834 — reviewed: English UI labels and brand in katakana (Save → セーブ), kana/kanji variants; no missing words |

## QC notes

- Every number above is measured on the encoded master (`qc.py`): ffprobe stream checks (H.264 High, yuv420p, BT.709,
  AAC 48 kHz), `ebur128` loudness, frame count against duration × 60 and `freezedetect` (no stalls), faster-whisper
  large-v3 transcript of the final mix against the script. Web files are 1280×720 @ 30 fps, all ≤ 12.1 MiB.
- Pictures were checked from the encoded files: a 40-frame contact sheet per language (`build/tutorial2/<lang>/final_sheet.png`)
  and frames around every scene cut (whip pans keep a composed frame at every step).
- Captions: every page fits two lines at full size in all 12 languages (no shrink); pages break at sentence/phrase
  boundaries, never leave a lone word, never split a UI chip from its punctuation or a short term across lines; CJK lines
  wrap only after 、/。; RTL pages isolate Latin runs; Hindi pages break at the danda and keep postpositions with their noun.
- Narration: `narrate.py` also rejects clips whose audio is implausibly short for their text (the Live transcript can be
  complete while the audio stream is cut), which caught truncated takes in ja and pt.
