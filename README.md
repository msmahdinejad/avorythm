<p align="center">
  <img src="assets/branding/voxilyra-logo.png" width="148" alt="Voxilyra logo">
</p>

<h1 align="center">Voxilyra</h1>

<p align="center"><strong>Hear every voice in your language.</strong></p>

<p align="center">
  Translate desktop or browser audio live, or turn uploaded audio and video into a synchronized dub, source transcript, translated transcript, and original soundtrack.
</p>

<p align="center">
  <a href="https://github.com/msmahdinejad/voxilyra/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/msmahdinejad/voxilyra/ci.yml?branch=main&label=CI"></a>
  <a href="https://github.com/msmahdinejad/voxilyra/releases"><img alt="Release" src="https://img.shields.io/github/v/release/msmahdinejad/voxilyra?label=Release"></a>
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

![Voxilyra English dashboard](docs/images/dashboard-en.png)

## Two independent products

- **Windows app:** live desktop dubbing plus a media studio for uploaded audio/video.
- **Chrome/Edge extension:** live tab dubbing with no desktop app, Python, FFmpeg, localhost, or virtual audio device.

Both interfaces support Persian and English, use Vazirmatn, render RTL/LTR transcripts correctly, and independently control original and dubbed audio.

## Uploaded-media pipeline

```text
Audio/video
  → local FFmpeg extraction and timeline
  → Groq Whisper Large v3 transcription with timestamps
  → Gemini 3.1 Flash Lite text translation
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

The built-in audio/video player uses the source media as its master clock. The dub is corrected when drift exceeds 120 ms, and both subtitle tracks can be enabled together.

## Quick install

### Windows app

1. Download `Voxilyra-Setup-x64.exe` from [Releases](https://github.com/msmahdinejad/voxilyra/releases).
2. Keep **Install FFmpeg** enabled when you want uploaded-media processing.
3. In Advanced settings, save a [Gemini API key](https://aistudio.google.com/app/apikey) and a [Groq API key](https://console.groq.com/keys).
4. Leave the proxy at `http://127.0.0.1:10808` when your connection requires it.

Keys are stored in Windows Credential Manager, never in `settings.json`. Groq and Gemini free tiers are subject to each provider's current account quotas; Voxilyra cannot guarantee ongoing free availability.

If WinGet could not install FFmpeg during setup, run:

```powershell
winget install --id Gyan.FFmpeg --exact --scope user
```

### Chrome/Edge extension

1. Download and extract `Voxilyra-Extension.zip`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**, choose **Load unpacked**, and select the extracted folder.
4. Pin Voxilyra, enter the Gemini key for this browser session, open a media tab, and press Start.

The extension is fully independent from the Windows app. Chrome only offers true one-click consumer installation after publication in the Chrome Web Store; GitHub-hosted unpacked extensions require the steps above.

## Desktop live audio routing

Uploaded files and the extension need no virtual device. Only **live desktop-app capture** needs this route:

1. Source browser/app **Output** → `Speakers (AMM Virtual Audio Device)`.
2. Voxilyra **Input** → `Microphone (AMM Virtual Audio Device)`.
3. Voxilyra **Output** → `Default` or physical headphones/speakers.
4. Keep Original volume at `0%` for dub-only listening.

Never route Voxilyra's output back to AMM Virtual; that creates echo and feedback. See the [illustrated audio guide](docs/INSTALLATION.md#audio-routing-for-the-windows-app).

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

- The app binds only to `127.0.0.1`; original uploads and generated files remain under the local Voxilyra data directory.
- Uploaded audio chunks are sent to Groq for transcription; transcript text is sent to Gemini for translation and speech generation.
- Live desktop/tab audio is sent to Gemini Live only after the user starts dubbing.
- A local rolling governor reserves at most 15,000 Gemini tokens per 60 seconds, below the requested 20,000-token ceiling.
- `gemini-3.5-live-translate-preview` and `gemini-3.1-flash-live-preview` are preview services. Accuracy, voice stability, availability, latency, and quotas can change.
- Windows SmartScreen warnings disappear reliably only after signing the installer with a trusted code-signing certificate and building publisher reputation.

See [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [ARCHITECTURE.md](ARCHITECTURE.md).

## License

[MIT](LICENSE) © Mohammad Saleh Mahdinejad
