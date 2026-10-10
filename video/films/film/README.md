# Avorythm brand film — «Do you understand me now?»

The emotional "why" of Avorythm in 53 seconds, 1920×1080 at 60 fps, in twelve languages
(`en fa ru ar zh hi es pt fr de tr ja`). Everything is made in code: the picture is a canvas `renderFrame(t)`, the voices
are Gemini Live, the score is synthesized in numpy.

## Concept

A woman has been talking to you since the first frame — softly, in a language you do not speak — while the whole world
talks around her: a lecture, a podcast, the news, a documentary, a stream. You hear every word and understand none.
One click. Silence. She speaks again, in your language and in her own voice, and the first thing she says is what she
was saying all along: *"I've been talking to you this whole time… Do you understand me now?"* Then every other voice
turns into your language, one by one — and the music crosses over too: the cold electronic drone of the first act turns
into your own musical world.

Grammar: purple light = a voice you cannot understand, cyan light = a voice in your language (the two halves of the
logo). The hero object is the product's real frosted subtitle card, rendered exactly as the extension draws it
(source-only before the click, dual subtitles after it). The popup and the desktop app are the real product UI, rendered
from `extension/popup.html` and `src/avorythm/static/index.html` in the viewer's UI language.

## Storyboard

| time (s) | beat | picture | sound |
|---|---|---|---|
| 0.0 – 2.4 | hook | macro of a purple voice ribbon; the camera eases back to the subtitle card, Japanese words appear as she speaks | intimate hero voice (Japanese; Arabic in the zh/ja versions), cold drone |
| 2.4 – 4.3 | the card | the real subtitle card in source-only mode, moonlit film behind the glass | the line ends on 「……ねえ、わかる？」 |
| 4.3 – 5.7 | the world | whip back into a 3D field of nine "videos", rack focus follows each new voice | nine voices enter, panned by position |
| 5.6 – 9.4 | headlines | "So many voices." / "Not one you **understand**." — the last word scrambles through ten languages | heartbeat, accelerating clock, riser |
| 8.6 – 9.65 | the wall | camera rushes through the field, glitch | the voices fragment into a wall, stutter, hard cut |
| 9.65 – 10.15 | silence | black | silence |
| 10.15 – 11.9 | one click | the real popup rises in 3D; push-in on the target language, then Start translating | UI swell, tick, swish, click |
| 11.9 – 17.3 | she speaks your language | dual subtitles (her original above, the translation word-synced below), purple → cyan | the first note of the "translated" music, hero dub over the ducked original |
| 17.3 – 21.4 | cascade + build | every card flips to dual subtitles and glides into a curved wall seen at three-quarters; push into the light | one note per flip, a dub of the podcast host, tremolo + riser, 0.2 s breath |
| 21.6 – 26.4 | drop | "Now the whole world / speaks **your language**." | full groove |
| 26.4 – 31.2 | browser | browser in 3D playing a German lecture, real subtitle card, dub badge; push into the dual subtitles | the lecturer dubbed |
| 31.2 – 36.0 | desktop | the real desktop app; a video file drops in, its live transcript fills in both panels; Windows · macOS · Linux | a documentary narrator dubbed |
| 36.0 – 38.4 | 79 languages | huge 79 and a slot roll of language names that lands on the viewer's | decelerating ticks |
| 38.4 – 43.2 | free | "Free. Open source." + "No ads, no tracking — your keys stay with you." + MIT · GitHub | two impacts, groove peak |
| 43.2 – 46.2 | tagline | the hero voice says the brand line; the words light up as she speaks | break: lead instrument + pad |
| 46.2 – 53.2 | logo | the two ribbons fold into the real logo layers; the tagline glides into the end card; Chrome Web Store + GitHub + URL | final cadence, boom, shimmer, fade |

The score per version: santur + daf in Chahargah (fa), oud + darbuka in Bayati (ar), bağlama in Hicaz 9/8 (tr),
sitar + tanpura + tabla in Yaman (hi), koto + taiko in Miyako-bushi (ja), guzheng + tanggu in the gong pentatonic (zh),
flamenco guitar + palmas in bulería (es), bossa nova (pt), piano + strings (en, fr, de, ru). 100 BPM, one 2.4 s
hyper-bar for every culture so all cut points are shared.

## Files

```
brief.md            concept, script (en + fa), storyboard, music plan, sound design
data/cast.json      roles, Gemini voices, the original lines of the voices of the world
data/copy/<lang>.json   every spoken and on-screen string of a version (transcreated)
voices.py           Gemini Live voices (transcript-verified takes)            -> build/film/voices/
capture_ui.mjs      renders the real popup + desktop app per language         -> build/film/ui/
prep.py             voice edit, cue plan, faster-whisper word timings         -> build/film/<lang>/plan.json, vox/
audio/              dsp.py, instruments.py (physical models), score.py, mix.py, QC helpers
web/                film.html, lib.js (camera, glass, ribbons, text), art.js, scenes.js
render.mjs          headless Chrome frames -> ffmpeg (stills, sheets, video, mux)
qc_video.py         format / loudness / frame-sheet QC on the encoded files      -> build/film/<lang>/qc.json, qc_sheet.png
audio/qc_whisper.py faster-whisper on the master, one window per spoken line    -> build/film/<lang>/whisper.json
qc_sync.py          A/V sync of the click, the drop and the logo lock on the master
qc_summary.py       one table of every delivered version (duration, sizes, LUFS, true peak, Whisper)
make.py             end-to-end build of one or more versions
batch_audio.py      prep (sequential) + score/mix (3 in parallel) for many versions
render_all.py       video -> mux -> qc -> whisper for many versions, one after the other (8 Chrome workers)
write_meta.py       video/out/film.meta.json (title + transcript of every version)
sheet.py            labelled contact sheets
```

## Rebuild

Requirements: Node 22+, Python 3.12 with numpy and websockets (and faster-whisper for alignment/QC), ffmpeg with
rubberband, Google Chrome, the fonts in `video/node_modules/@fontsource-variable/`.

```bash
python -I video/films/film/voices.py --shared --lang en,fa      # Gemini Live (key read from the reference .env, proxy 127.0.0.1:10808)
python video/films/film/make.py --lang en,fa                    # ui -> prep -> score -> mix -> video -> mux -> qc
python video/films/film/make.py --lang fa --from score          # e.g. after changing the music
node video/films/film/render.mjs --lang fa --sheet 0:53:2 --cols 6 --gpu   # quick contact sheet
python video/films/film/batch_audio.py ru,ar,zh --no-prep       # score + mix of many versions
python video/films/film/render_all.py ru,ar,zh                  # picture + delivery + QC of many versions (~6 min each)
python video/films/film/qc_summary.py                           # the QC table below
python video/films/film/write_meta.py                           # video/out/film.meta.json
```

## Delivered versions (QC on the encoded masters)

All twelve versions: `video/out/film-<lang>-1080.mp4` (1920×1080 60 fps H.264 High, BT.709, AAC 48 kHz stereo),
`film-<lang>.mp4` (720p30 web), `film-<lang>.jpg` (poster), plus `video/out/film.meta.json`.

| lang | dur | web | LUFS | TP master / web | Whisper min | score |
|---|---|---|---|---|---|---|
| en | 53.2 s | 6.78 MB | −14.0 | −1.6 / −1.8 | 1.00 | piano + strings |
| fa | 53.2 s | 6.67 MB | −14.1 | −1.9 / −1.8 | 0.88 ¹ | santur + daf |
| ru | 53.2 s | 6.75 MB | −14.0 | −2.1 / −2.1 | 0.96 | piano + strings |
| ar | 53.2 s | 6.57 MB | −14.0 | −2.2 / −1.1 | 1.00 | oud + darbuka |
| zh | 53.2 s | 6.67 MB | −14.0 | −2.2 / −1.8 | 0.97 | guzheng + tanggu |
| hi | 53.2 s | 6.64 MB | −14.0 | −2.4 / −1.6 | 0.92 ¹ | sitar + tabla |
| es | 53.2 s | 6.80 MB | −14.0 | −1.8 / −1.5 | 0.98 | flamenco |
| pt | 53.2 s | 6.76 MB | −14.0 | −2.5 / −2.1 | 1.00 | bossa nova |
| fr | 53.2 s | 6.72 MB | −14.0 | −2.2 / −1.8 | 0.97 | piano + strings |
| de | 53.2 s | 6.76 MB | −14.0 | −2.4 / −2.1 | 1.00 | piano + strings |
| tr | 53.2 s | 6.75 MB | −14.0 | −2.1 / −1.7 | 1.00 | bağlama |
| ja | 53.2 s | 6.67 MB | −14.1 | −1.9 / −1.5 | 0.88 ¹ | koto + taiko |

¹ spelling only, the words are right: Persian ASR spellings, Hindi «आवाज़/भाषा» without nukta/with श, Japanese 全く for まったく.
A/V sync (click, drop, logo lock) is within one frame in every version (`qc_sync.py`; the es drop detector locks onto a
palmas hit 0.22 s later, the drop itself is at 21.600 s in the master).

Per-language fixes made while finishing the set: headline B («Not one you *understand*») keeps one size for the whole
beat, fitted to the widest passing word (Hindi's short «समझ» let "verstehen" push the line to the frame edges), and the
viewer's own word lands at full size (Turkish «anlamıyorsunuz» was shrunk to ~70 %); the popup's language select fits
"Brazilian Portuguese · pt-BR" (it was cut at the push-in); the bossa build sat 1.4 LU above the drop (−5 dB strums);
ja lecture line re-scripted to what the voice says («これから、…»); fr lecture and ar podcast dubs re-taken (Whisper heard
"À l'ordi" / «للجميع»). `audio/qc_whisper.py` now transcribes each line in its own window (a single 53 s pass dropped
whole lines and reported false failures).

Open `video/films/film/web/film.html?lang=fa&t=13.5` through any static server rooted at `video/` to inspect a frame
(`&play` plays it back).
