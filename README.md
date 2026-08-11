# LingoDub

Real-time and synchronized AI dubbing with **Gemini 3.5 Live Translate**. LingoDub ships as two independent products:

- a Windows app for desktop audio and uploaded video files;
- a standalone Manifest V3 extension for Chrome/Edge tabs.

[فارسی](README.fa.md) · [Installation](docs/INSTALLATION.md) · [Chrome Web Store checklist](docs/CHROME_WEB_STORE.md) · [Privacy](PRIVACY.md)

![LingoDub dashboard](docs/images/dashboard.png)

## What it does

- Streams 16 kHz PCM to `gemini-3.5-live-translate-preview` and plays its native 24 kHz translated speech.
- Separately controls original and dubbed audio; **Dub only** is the default.
- Shows source and translated transcripts with correct RTL/LTR direction.
- Records `original.wav`, `source.srt`, `dubbed.wav`, and `translated.srt`.
- Automatically reconnects long Live sessions when Google rotates the connection.
- Supports 70+ official Live Translate languages.
- Uses one Live Translate model only—no secondary TTS, STT, batch, or Files API.

### Uploaded-video Media Studio

Drop an MP4, MKV, WebM, MOV, AVI, WMV, MPEG, or 3GP into the Windows app. LingoDub keeps the video local, extracts PCM with FFmpeg, and provides:

- **Precise sync** (default): cuts long media near silence and time-fits translated speech;
- **Fast**: fixed windows and lighter alignment;
- a local HTML5 player with independent original/dub audio;
- simultaneous source and translated subtitles;
- the four individual files plus `all-outputs.zip`.

The player uses the video as the master clock, corrects small drift with playback-rate nudges, and hard-seeks only when drift exceeds 120 ms. A rolling governor reserves at most 15,000 estimated tokens per minute—below the requested 20,000-token ceiling. Because the Live model accepts real-time audio only, processing takes roughly the speech duration or longer.

## Quick install

### Windows app

1. Download `LingoDub-Setup-x64.exe` from GitHub Releases.
2. Keep the recommended **Install FFmpeg** component selected if you want uploaded-video processing.
3. Launch LingoDub, open Advanced settings, save your Gemini API key, and set the proxy to `http://127.0.0.1:10808` when required.

The key is stored in Windows Credential Manager. The installer uses WinGet for FFmpeg rather than redistributing an untracked binary. If WinGet is unavailable, install it later with:

```powershell
winget install --id Gyan.FFmpeg --exact --scope user
```

### Standalone extension

1. Download and extract `LingoDub-Extension.zip` to a permanent folder.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**, click **Load unpacked**, and select the folder containing `manifest.json`.
4. Pin LingoDub, open a video tab, enter the key in the popup, and start dubbing.

The extension needs no Windows app, Python, localhost service, FFmpeg, or virtual audio device. Chrome does not permit one-click installation of an unpacked GitHub extension; a true **Add to Chrome** button requires a Chrome Web Store listing.

The extension intentionally stores a BYOK key only in `chrome.storage.session`, so it clears when the browser fully exits. It sends the key and selected-tab audio directly to Google's endpoint. For a public production deployment, Google recommends a small HTTPS token service and short-lived ephemeral tokens instead of client-side long-lived keys.

## Desktop live-audio routing

Virtual routing is needed **only** when the Windows app dubs another desktop program live. It is not needed for the extension or uploaded-video Media Studio.

Use the exact route shown below:

1. Chrome/source program **Output** → `Speakers (AMM Virtual Audio Device)`.
2. LingoDub **Input** → `Microphone (AMM Virtual Audio Device)` / matching loopback.
3. LingoDub **Output** → `Default` or physical headphones.
4. Original 0%, Dubbed 100%.

Never send LingoDub output back to AMM; that creates an audio feedback loop.

![Correct AMM routing](docs/images/audio-routing-guide.png)

The bilingual visual walkthrough is also available inside the app at `/audio-guide.html`.

## Development

Requirements: Windows 10/11 x64, Python 3.11–3.13, Node.js for extension tests, and FFmpeg/FFprobe for Media Studio.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,build]"
python -m pytest -q
python -m ruff check src tests scripts
python -m mypy src
node --test tests\extension.test.mjs tests\offscreen.test.mjs tests\background.test.mjs
```

Run the app:

```powershell
$env:HTTP_PROXY='http://127.0.0.1:10808'
$env:HTTPS_PROXY='http://127.0.0.1:10808'
python -m lingodub
```

Build release artifacts:

```powershell
.\scripts\build.ps1
.\scripts\package-extension.ps1
iscc .\installer.iss
```

An optional paid Live smoke test accepts a short 16 kHz mono 16-bit PCM WAV:

```powershell
python .\scripts\smoke_gemini.py --wav .\sample.wav
```

## Security and privacy

- The app binds only to `127.0.0.1`; uploaded videos and outputs remain under the local LingoDub data directory.
- Only extracted PCM is sent to Gemini for a requested translation.
- The extension captures only the tab explicitly started by the user.
- No analytics, ads, remote code, or developer telemetry are included.
- Do not process or record media you are not authorized to use.

See [SECURITY.md](SECURITY.md), [PRIVACY.md](PRIVACY.md), and [ARCHITECTURE.md](ARCHITECTURE.md).

## Model limitations

Gemini 3.5 Live Translate is a preview service. Voice replication, speaker identity, accent detection, latency, quotas, and translation accuracy can vary. The model does not expose a named-voice selector; LingoDub therefore labels the voice as automatic rather than pretending a separate TTS voice can be chosen. Very long translated dialogue may be time-compressed or trimmed to preserve video synchronization.

Implementation follows Google's current [Live Translation guide](https://ai.google.dev/gemini-api/docs/live-api/live-translate), [model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-live-translate-preview), and [ephemeral-token guidance](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens).

## License

MIT. Vazirmatn and other third-party notices are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
