<p align="center">
  <img src="assets/branding/dubira-logo.png" width="148" alt="Dubira logo">
</p>

<h1 align="center">Dubira</h1>

<p align="center"><strong>Hear every voice in your language.</strong></p>

<p align="center">
  Translate desktop or browser audio live, or turn uploaded audio and video into a synchronized dub, source transcript, translated transcript, and original soundtrack.
</p>

<p align="center">
  <a href="https://github.com/msmahdinejad/dubira/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/msmahdinejad/dubira/ci.yml?branch=main&label=CI"></a>
  <a href="https://github.com/msmahdinejad/dubira/releases"><img alt="Release" src="https://img.shields.io/github/v/release/msmahdinejad/dubira?label=Release"></a>
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

![Dubira English dashboard](docs/images/dashboard-en.png)

## Two independent products

- **Windows app:** live desktop dubbing plus a media studio for uploaded audio/video.
- **Chrome/Edge extension:** live tab dubbing with no desktop app, Python, FFmpeg, localhost, or virtual audio device.

Both interfaces support Persian and English, use Vazirmatn, render RTL/LTR transcripts correctly, and independently control original and dubbed audio.

## Uploaded-media pipeline

```text
Audio/video
  → local FFmpeg extraction and timeline
  → Groq Whisper Large v3 transcription with timestamps
  → strongest-available Gemini/Gemma free-tier text model
  → Gemini 3.1 Flash Live translated speech
  → local alignment, subtitles, player, and ZIP
```

The default **Precise** mode uses `whisper-large-v3` and verifies Gemini Live's output transcript against each translated segment, retrying a mismatched segment. **Fast** uses `whisper-large-v3-turbo` for quicker previews. Long media is encoded to small 16 kHz mono FLAC chunks with overlap; only the non-overlapping core timestamps are retained.

Every successful job provides:

- `original.wav`
- `source.srt`
- `dubbed.wav`
- `translated.srt`
- `all-outputs.zip`

The built-in audio/video player uses the source media as its master clock. The dub is corrected when drift exceeds 120 ms, original audio is truly silent while its switch is off, and both subtitle tracks can be enabled together. Long speech is split into short, movie-sized subtitle cues instead of one screen-blocking paragraph. The file voice is selected per Media Studio job.

### Translation model pool

Text translation falls back in this strongest-first order when a model is rate-limited or temporarily unavailable:

`gemini-3.6-flash` → `gemini-3.5-flash` → `gemini-3-flash-preview` → `gemini-2.5-flash` → `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → `gemini-2.5-flash-lite` → `gemma-4-31b-it` → `gemma-4-26b-a4b-it`

Only text-output models with a non-zero free quota in the active AI Studio project are included. Image, TTS, Live, embedding, agent, robotics, and zero-quota models are excluded. Local per-model RPM/RPD guards reduce avoidable 429s; [AI Studio remains authoritative](https://ai.google.dev/gemini-api/docs/rate-limits) because quotas vary by project and can change. Model IDs follow Google's current [Gemini](https://ai.google.dev/gemini-api/docs/models) and [Gemma API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) documentation.

## Quick install

### Windows app

1. Download `Dubira-Setup-x64.exe` from [Releases](https://github.com/msmahdinejad/dubira/releases).
2. Keep **Install FFmpeg** enabled when you want uploaded-media processing.
3. In Advanced settings, save a [Gemini API key](https://aistudio.google.com/app/apikey) and a [Groq API key](https://console.groq.com/keys).
4. Leave the proxy at `http://127.0.0.1:10808` when your connection requires it.

Use **Quit app** in the top bar to stop Dubira's local server completely, not only close the browser tab.

Keys are stored in Windows Credential Manager, never in `settings.json`. Groq and Gemini free tiers are subject to each provider's current account quotas; Dubira cannot guarantee ongoing free availability.

If WinGet could not install FFmpeg during setup, run:

```powershell
winget install --id Gyan.FFmpeg --exact --scope user
```

### Chrome/Edge extension

1. Download and extract `Dubira-Extension.zip`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**, choose **Load unpacked**, and select the extracted folder.
4. Pin Dubira, enter the Gemini key for this browser session, open a media tab, and press Start.

The extension is fully independent from the Windows app. Chrome only offers true one-click consumer installation after publication in the Chrome Web Store; GitHub-hosted unpacked extensions require the steps above.

## Desktop live audio routing

Uploaded files and the extension need no virtual device. Only **live desktop-app capture** needs this route:

1. Source browser/app **Output** → `Speakers (AMM Virtual Audio Device)`.
2. Dubira **Input** → `Microphone (AMM Virtual Audio Device)`.
3. Dubira **Output** → `Default` or physical headphones/speakers.
4. Keep Original volume at `0%` for dub-only listening.

Never route Dubira's output back to AMM Virtual; that creates echo and feedback. See the [illustrated audio guide](docs/INSTALLATION.md#audio-routing-for-the-windows-app).

## Development

Requirements: Windows 10/11, Python 3.12, Node.js 20+, FFmpeg, and Inno Setup 6 for the installer.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,build]"
python -m pytest -q
python -m ruff check src tests scripts
python -m mypy src
node --test tests\*.test.mjs
.\scripts\dev.ps1
```

Build release artifacts:

```powershell
.\scripts\build.ps1
.\scripts\package-extension.ps1
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

## Privacy and limits

- The app binds only to `127.0.0.1`; original uploads and generated files remain under the local Dubira data directory.
- Uploaded audio chunks are sent to Groq for transcription; transcript text is sent to Gemini for translation and speech generation.
- Live desktop/tab audio is sent to Gemini Live only after the user starts dubbing.
- A local rolling governor reserves at most 15,000 Gemini tokens per 60 seconds, below the requested 20,000-token ceiling.
- `gemini-3.5-live-translate-preview` and `gemini-3.1-flash-live-preview` are preview services. Accuracy, voice stability, availability, latency, and quotas can change.
- Windows SmartScreen warnings disappear reliably only after signing the installer with a trusted code-signing certificate and building publisher reputation.

See [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [ARCHITECTURE.md](ARCHITECTURE.md).

## License

[MIT](LICENSE) © Mohammad Saleh Mahdinejad
