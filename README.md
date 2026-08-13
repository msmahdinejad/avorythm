<p align="center">
  <img src="assets/branding/lingora-logo.png" width="148" alt="Lingora logo">
</p>

<h1 align="center">Lingora</h1>

<p align="center"><strong>Hear every voice—or just read it—in your language.</strong></p>

<p align="center">
  Translate desktop and browser audio live, show an always-on-top translated subtitle card,
  or turn uploaded audio/video into a synchronized dub and four downloadable outputs.
</p>

<p align="center">
  <a href="https://github.com/msmahdinejad/lingora/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/msmahdinejad/lingora/ci.yml?branch=main&label=CI"></a>
  <a href="https://github.com/msmahdinejad/lingora/releases"><img alt="Release" src="https://img.shields.io/github/v/release/msmahdinejad/lingora?label=Release"></a>
  <img alt="Python 3.12" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img alt="Node 20+" src="https://img.shields.io/badge/Node-20%2B-339933?logo=nodedotjs&logoColor=white">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-8B5CF6"></a>
</p>

<p align="center">
  <a href="README.fa.md">فارسی</a> ·
  <a href="docs/INSTALLATION.md">Installation</a> ·
  <a href="docs/CHROME_WEB_STORE.md">Chrome Web Store</a> ·
  <a href="PRIVACY.md">Privacy</a>
</p>

![Lingora English dashboard](docs/images/dashboard-en.png)

## What ships

- **Native desktop app for Windows, macOS, and Linux:** one pywebview shell around the local FastAPI service, with live translation, live dubbing, recording, and Media Studio.
- **Standalone Chrome/Edge extension:** captures only the tab explicitly started by the user and needs no desktop app, Python, FFmpeg, localhost, or virtual audio device.
- **Floating subtitles:** retain original audio while translation appears in a frosted-glass card. Adjust text size, width, opacity, and source-text visibility. The native app card is resizable, draggable, and always on top; the extension card lives in the selected page and can be dragged or resized.

Both products are independent, bilingual (English/Persian), use Vazirmatn, and render RTL/LTR content with automatic direction.

## Custom live output

The desktop app and extension expose the same four independent channels: original audio,
translated audio, source subtitles, and translated subtitles. Enable any combination. When
both audio channels are active, their volume sliders create the exact mix you want; subtitle
appearance stays available whenever either subtitle channel is active.

The subtitle window uses Document Picture-in-Picture in compatible browsers and a separate popup fallback. Native builds use a dedicated pywebview window with the operating system's always-on-top behavior.

## Uploaded-media pipeline

```text
Audio/video
  → local FFmpeg extraction and timeline
  → Groq Whisper Large v3 transcription with timestamps
  → strongest available Gemini/Gemma free-tier text model
  → Gemini 3.1 Flash Live translated speech
  → local alignment, movie-sized captions, synchronized player, ZIP
```

Every successful job provides `original.wav`, `source.srt`, `dubbed.wav`, `translated.srt`, and `all-outputs.zip`. The player uses the source media as its master clock, corrects dub drift above 120 ms, truly mutes source audio when its switch is off, and can show either or both subtitle tracks.

The default **Precise** mode uses `whisper-large-v3` and verifies generated-speech transcripts against each translated segment. **Fast** uses `whisper-large-v3-turbo`. Long media is sent as small 16 kHz mono FLAC chunks with timestamp overlap and deduplication.

### Translation model pool

Lingora falls back strongest-first when a free-tier text model is rate-limited or unavailable:

`gemini-3.6-flash` → `gemini-3.5-flash` → `gemini-3-flash-preview` → `gemini-2.5-flash` → `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → `gemini-2.5-flash-lite` → `gemma-4-31b-it` → `gemma-4-26b-a4b-it`

Only text-output models with an applicable free quota are candidates. A local governor reserves at most 15,000 estimated Gemini tokens per rolling 60 seconds, below the requested 20,000 TPM ceiling. AI Studio remains authoritative because quotas vary by account and model.

## Quick install

### Windows

1. Download `Lingora-Setup-x64.exe` from [Releases](https://github.com/msmahdinejad/lingora/releases).
2. Keep **Install FFmpeg** enabled for uploaded-media processing.
3. Save a [Gemini API key](https://aistudio.google.com/app/apikey); save a [Groq API key](https://console.groq.com/keys) for Media Studio.
4. Leave the proxy at `http://127.0.0.1:10808` when your connection needs it.

The Windows installer is unsigned until the maintainer adds an Authenticode certificate, so SmartScreen may show “Unknown publisher”. Only a trusted code-signing certificate and publisher reputation reliably remove that warning.

### macOS and Linux

Download the matching `Lingora-Darwin-*.zip` or `Lingora-Linux-*.zip` from Releases and launch Lingora. On Linux, the release uses Qt; on macOS it uses WKWebView. FFmpeg must be available on `PATH` for Media Studio.

Live desktop capture is platform-specific:

- **Windows:** route the source app to AMM/VB-Cable and select its loopback input in Lingora.
- **macOS:** select a loopback input such as BlackHole. macOS does not expose system-output capture as a normal input by default.
- **Linux:** select the PipeWire/PulseAudio monitor source for the output you want to translate.

Uploaded files do not need virtual audio routing on any platform.

### Chrome/Edge extension

1. Download and extract `Lingora-Extension.zip`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**, choose **Load unpacked**, and select the extracted folder.
4. Pin Lingora, enter the Gemini key for this browser session, open a normal web page with media, and press Start.

Chrome blocks injection into internal pages such as `chrome://`. One-click consumer installation is only available after a signed Chrome Web Store publication; GitHub cannot silently install an unpacked extension.

## Desktop audio routing (Windows)

Only live capture from another desktop program needs this route:

1. Source browser/app **Output** → `Speakers (AMM Virtual Audio Device)`.
2. Lingora **Input** → `Microphone (AMM Virtual Audio Device)`.
3. Lingora **Output** → `Default` or physical headphones/speakers.
4. Never route Lingora output back into AMM; that creates feedback.

See the [illustrated audio guide](docs/INSTALLATION.md#audio-routing-for-the-windows-app). The extension handles tab audio itself and does not need this setup.

## Development

Requirements: Python 3.12, Node.js 20+, and FFmpeg for Media Studio.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,build]"
python -m pytest -q
python -m ruff check src tests scripts
python -m mypy src
node --test tests\*.test.mjs
python -m lingora
```

Build the current platform and package the extension:

```powershell
python scripts/build.py
.\scripts\package-extension.ps1
```

CI runs tests, lint, type-checking, and extension validation on Windows, macOS, and Linux. Tagged releases build all three desktop artifacts plus the standalone extension and Windows installer.

## Privacy and limits

- The app binds only to `127.0.0.1`; uploads and generated files remain in the local Lingora data directory.
- Uploaded audio chunks go to Groq for transcription; text goes to Gemini for translation and speech generation.
- Live desktop/tab audio goes to Gemini only after an explicit Start action.
- Extension API keys stay in `chrome.storage.session` and disappear when the browser session ends. For Chrome Web Store production, replace long-lived BYOK with a small HTTPS service that mints Google ephemeral Live API tokens.
- Preview model accuracy, availability, voice stability, latency, and quota can change upstream.

See [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md), [CONTRIBUTING.md](CONTRIBUTING.md), [ARCHITECTURE.md](ARCHITECTURE.md), and the [Chrome Web Store checklist](docs/CHROME_WEB_STORE.md).

## License

[MIT](LICENSE) © Mohammad Saleh Mahdinejad
