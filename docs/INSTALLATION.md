# Installation and audio setup

[فارسی](INSTALLATION.fa.md)

## Choose the product

| Use case | Install | Virtual audio needed? |
|---|---|---|
| Dub a Chrome/Edge tab | standalone extension | No |
| Process an uploaded audio/video file | desktop app + FFmpeg | No |
| Translate VLC or another desktop app live | desktop app + platform loopback/monitor input | Usually |

Live translation requires a Gemini key and access to `gemini-3.5-live-translate-preview`. Uploaded-media processing additionally requires a Groq key for Whisper. The desktop app has its own HTTP proxy field. The extension follows the browser/system proxy because JavaScript WebSockets cannot select a per-request proxy.

## Windows app

The normal launcher opens Lingora in its own native window. Chrome is neither opened nor required; browser mode is available only to developers through the explicit `--browser` flag.

1. Download `Lingora-Setup-x64.exe` from Releases.
2. Install without administrator privileges.
3. Keep **Install FFmpeg for uploaded audio/video processing** checked unless you only need live desktop audio.
4. Launch Lingora and open **Advanced settings**.
5. Save both the Gemini and Groq API keys. Set `http://127.0.0.1:10808` when that proxy is required.

Both keys are stored separately in the operating-system keyring, not `settings.json`. A developer can copy `.env.example` to `.env`; `.env` is ignored by Git.

If WinGet was unavailable during setup, install FFmpeg manually:

```powershell
winget install --id Gyan.FFmpeg --exact --scope user
```

Restart Lingora after installing FFmpeg.

## macOS and Linux desktop builds

Download and extract the matching `Lingora-Darwin-*.zip` or `Lingora-Linux-*.zip`. macOS live system audio needs a loopback input such as BlackHole. Linux users select the relevant PipeWire/PulseAudio monitor source. Install FFmpeg through Homebrew or the distribution package manager for uploaded-media processing. The file studio itself never needs virtual routing.

## Uploaded-media studio

1. Open **Media Studio** in the dashboard.
2. Select or drop supported audio or video (up to the local 8 GB limit).
3. Choose the target language.
4. Keep **Precise** for `whisper-large-v3` plus generated-speech transcript checks, or select **Fast** for `whisper-large-v3-turbo`.
5. Choose the file voice and start processing. The source file stays local; small 16 kHz FLAC chunks go to Groq, transcript text goes through the strongest-available free-tier Gemini/Gemma text pool, and translated text goes to Gemini 3.1 Flash Live.
6. When ready, use the synchronized player or download the four files/ZIP.

Original audio, dubbed audio, source subtitles, and translated subtitles can be toggled independently. Audio files use an audio player; video files use the synchronized video player. Processing survives app restarts by re-queuing an interrupted job. Cancel stops the current network/FFmpeg work; Delete removes the local source and all generated files.

The local rolling governor reserves at most 15,000 estimated tokens per minute. It may pause a queued segment to remain below that ceiling.

## Standalone extension

1. Download `Lingora-Extension.zip` and extract it into a permanent folder. Do not select the ZIP itself.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the folder that directly contains `manifest.json`.
5. Pin Lingora and open its popup.
6. Enter the Gemini API key for the current browser session.
7. Open a normal web page with audio and click **Start translating this tab**.

The extension needs no Windows app, localhost, Python, FFmpeg, or virtual cable. `chrome.tabCapture` suppresses direct tab playback; Lingora recreates the exact original/dub mix selected by the two independent audio switches and volume sliders.

The key lives only in `chrome.storage.session` and must be entered again after the browser fully exits. Record mode creates `original.wav`, `source.srt`, `dubbed.wav`, and `translated.srt` under Downloads. Long Live connections are renewed automatically with bounded backoff.

### Floating subtitles

Enable **Source subtitles**, **Translated subtitles**, or both in **My output mix**. Audio remains independently configurable, so captions can accompany original audio, dubbed audio, both, or neither. Lingora injects the frosted-glass card only into the selected page. Drag its top handle to move it and use the browser resize grip to resize it. Text size, initial position, width, and opacity are configurable in the popup. Chrome internal pages, the Web Store, and some protected pages do not allow injection.

### Proxy

If the proxy listens on `127.0.0.1:10808`, enable it for Chrome/Edge in the proxy client or Windows system proxy. The desktop app's proxy field has no effect on the independent extension.

### Why GitHub cannot provide one-click install

[Chrome on Windows and macOS only allows direct end-user installation for extensions hosted and signed by the Chrome Web Store](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions). GitHub cannot silently install a local CRX or unpacked folder. A real **Add to Chrome** button requires publishing Lingora in the Chrome Web Store; Edge needs a separate Microsoft Edge Add-ons listing. Enterprise policy deployment is a separate administrator workflow.

See [CHROME_WEB_STORE.md](CHROME_WEB_STORE.md) and [PRIVACY.md](../PRIVACY.md) before submission.

## Live desktop audio: exact AMM route

> Skip this entire section for the extension and uploaded-media studio.

Play source audio first so Windows shows both apps under **Settings → System → Sound → Volume mixer**. Then match the supplied reference screenshot:

1. Under **Google Chrome** (or the source app), set **Output device** to `Speakers (AMM Virtual Audio Device)`.
2. Under **Lingora.exe**, leave **Output device** on `Default` or a physical headset.
3. Under **Lingora.exe**, set **Input device** to `Microphone (AMM Virtual Audio Device)`.
4. In the Lingora dashboard, select the matching AMM loopback as **Application audio input**.
5. Set Original to 0% and Dubbed to 100%.

![Exact Windows Volume Mixer routing](images/audio-routing-guide.png)

Do not route Lingora output to AMM Virtual. That feeds dubbed speech back into capture and creates echo/feedback.

## Troubleshooting

- **Extension shows a Blob/JSON error:** remove the older unpacked build, load the current `Lingora-Extension.zip` contents, and reload the target tab.
- **Extension cannot connect:** verify model access/quota and confirm Chrome/Edge itself uses the required proxy.
- **Extension asks for the key again:** expected after a full browser exit because the key is session-only.
- **No tab audio:** use Chrome/Edge 116+, keep the target tab active when Start is clicked, and note that protected DRM pages may block capture.
- **Media Studio says FFmpeg is required:** install it with the WinGet command above and restart Lingora.
- **The original track is still audible in the player:** leave **Original audio** unchecked. The switch enforces mute and zero volume even if the browser's native video controls try to unmute it.
- **Close Lingora completely:** use **Quit app** in the dashboard top bar or close the native main window.
- **Floating subtitles do not appear:** start from a normal `http`/`https` page. Chrome blocks scripts on `chrome://`, the Web Store, and other restricted pages.
- **Media Studio asks for a Groq key:** create one at `console.groq.com/keys` and save it beside the Gemini key in Advanced settings.
- **Uploaded job takes several times the media duration:** Gemini Live produces speech sequentially and Precise mode can retry a segment whose output transcript disagrees with its translation.
- **Low speech-match warning:** Gemini Live still read one segment differently after retry; listen to that output before final use or run it again.
- **Long translated dialogue sounds fast:** it exceeded its media window and was time-compressed without clipping the sentence ending.
- **Desktop source remains audible:** its Windows output is still the physical device; change the source app to AMM Virtual.
- **No desktop capture:** select AMM's matching loopback/input, not a physical microphone.
- **Echo:** Lingora output and capture must not use the same virtual endpoint.
- **Voice selection changes files but not live translation:** Gemini 3.1 Flash Live supports the selected file voice; Gemini 3.5 Live Translate reproduces its live voice automatically.
