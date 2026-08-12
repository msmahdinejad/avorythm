# Installation and audio setup

[فارسی](INSTALLATION.fa.md)

## Choose the product

| Use case | Install | Virtual audio needed? |
|---|---|---|
| Dub a Chrome/Edge tab | standalone extension | No |
| Process an uploaded audio/video file | Windows app + FFmpeg | No |
| Dub VLC, SpotPlayer, or another desktop app live | Windows app + virtual audio device | Yes |

Live dubbing requires a Gemini key and access to `gemini-3.5-live-translate-preview`. Uploaded-media processing additionally requires a Groq key for Whisper. The Windows app has its own HTTP proxy field. The extension follows the browser/Windows proxy because JavaScript WebSockets cannot select a per-request proxy.

## Windows app

1. Download `Voxilyra-Setup-x64.exe` from Releases.
2. Install without administrator privileges.
3. Keep **Install FFmpeg for uploaded audio/video processing** checked unless you only need live desktop audio.
4. Launch Voxilyra and open **Advanced settings**.
5. Save both the Gemini and Groq API keys. Set `http://127.0.0.1:10808` when that proxy is required.

Both keys are stored separately in Windows Credential Manager, not `settings.json`. A developer can copy `.env.example` to `.env`; `.env` is ignored by Git.

If WinGet was unavailable during setup, install FFmpeg manually:

```powershell
winget install --id Gyan.FFmpeg --exact --scope user
```

Restart Voxilyra after installing FFmpeg.

## Uploaded-media studio

1. Open **Media Studio** in the dashboard.
2. Select or drop supported audio or video (up to the local 8 GB limit).
3. Choose the target language.
4. Keep **Precise** for `whisper-large-v3` plus generated-speech transcript checks, or select **Fast** for `whisper-large-v3-turbo`.
5. Start processing. The source file stays local; small 16 kHz FLAC chunks go to Groq, transcript text to Gemini 3.1 Flash Lite, and translated text to Gemini 3.1 Flash Live.
6. When ready, use the synchronized player or download the four files/ZIP.

Original audio, dubbed audio, source subtitles, and translated subtitles can be toggled independently. Audio files use an audio player; video files use the synchronized video player. Processing survives app restarts by re-queuing an interrupted job. Cancel stops the current network/FFmpeg work; Delete removes the local source and all generated files.

The local rolling governor reserves at most 15,000 estimated tokens per minute. It may pause a queued segment to remain below that ceiling.

## Standalone extension

1. Download `Voxilyra-Extension.zip` and extract it into a permanent folder. Do not select the ZIP itself.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the folder that directly contains `manifest.json`.
5. Pin Voxilyra and open its popup.
6. Enter the Gemini API key for the current browser session.
7. Open the video tab and click **Start dubbing this tab**.

The extension needs no Windows app, localhost, Python, FFmpeg, or virtual cable. `chrome.tabCapture` suppresses direct tab playback; Voxilyra recreates only the selected original/dub mix. This prevents the two voices from overlapping in **Dubbed audio only** mode.

The key lives only in `chrome.storage.session` and must be entered again after the browser fully exits. Record mode creates `original.wav`, `source.srt`, `dubbed.wav`, and `translated.srt` under Downloads. Long Live connections are renewed automatically with bounded backoff.

### Proxy

If the proxy listens on `127.0.0.1:10808`, enable it for Chrome/Edge in the proxy client or Windows system proxy. The desktop app's proxy field has no effect on the independent extension.

### Why GitHub cannot provide one-click install

[Chrome on Windows and macOS only allows direct end-user installation for extensions hosted and signed by the Chrome Web Store](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions). GitHub cannot silently install a local CRX or unpacked folder. A real **Add to Chrome** button requires publishing Voxilyra in the Chrome Web Store; Edge needs a separate Microsoft Edge Add-ons listing. Enterprise policy deployment is a separate administrator workflow.

See [CHROME_WEB_STORE.md](CHROME_WEB_STORE.md) and [PRIVACY.md](../PRIVACY.md) before submission.

## Live desktop audio: exact AMM route

> Skip this entire section for the extension and uploaded-media studio.

Play source audio first so Windows shows both apps under **Settings → System → Sound → Volume mixer**. Then match the supplied reference screenshot:

1. Under **Google Chrome** (or the source app), set **Output device** to `Speakers (AMM Virtual Audio Device)`.
2. Under **Voxilyra.exe**, leave **Output device** on `Default` or a physical headset.
3. Under **Voxilyra.exe**, set **Input device** to `Microphone (AMM Virtual Audio Device)`.
4. In the Voxilyra dashboard, select the matching AMM loopback as **Application audio input**.
5. Set Original to 0% and Dubbed to 100%.

![Exact Windows Volume Mixer routing](images/audio-routing-guide.png)

Do not route Voxilyra output to AMM Virtual. That feeds dubbed speech back into capture and creates echo/feedback.

## Troubleshooting

- **Extension shows a Blob/JSON error:** reload the unpacked `0.5.0` or newer folder; older builds parsed WebSocket Blob objects as JSON directly.
- **Extension cannot connect:** verify model access/quota and confirm Chrome/Edge itself uses the required proxy.
- **Extension asks for the key again:** expected after a full browser exit because the key is session-only.
- **No tab audio:** use Chrome/Edge 116+, keep the target tab active when Start is clicked, and note that protected DRM pages may block capture.
- **Media Studio says FFmpeg is required:** install it with the WinGet command above and restart Voxilyra.
- **Media Studio asks for a Groq key:** create one at `console.groq.com/keys` and save it beside the Gemini key in Advanced settings.
- **Uploaded job takes several times the media duration:** Gemini Live produces speech sequentially and Precise mode can retry a segment whose output transcript disagrees with its translation.
- **Low speech-match warning:** Gemini Live still read one segment differently after retry; listen to that output before final use or run it again.
- **Long translated dialogue sounds fast:** it exceeded its media window and was time-compressed without clipping the sentence ending.
- **Desktop source remains audible:** its Windows output is still the physical device; change the source app to AMM Virtual.
- **No desktop capture:** select AMM's matching loopback/input, not a physical microphone.
- **Echo:** Voxilyra output and capture must not use the same virtual endpoint.
- **Voice selection changes files but not live translation:** Gemini 3.1 Flash Live supports the selected file voice; Gemini 3.5 Live Translate reproduces its live voice automatically.
