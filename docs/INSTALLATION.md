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

The normal launcher opens Avorythm in its own native window. Chrome is neither opened nor required.

1. Download `Avorythm-Setup-x64-unsigned.exe` from Releases while SignPath approval is pending. Verify it against `SHA256SUMS.txt`; Windows may show an unrecognized-publisher warning.
2. Install without administrator privileges.
3. Finish setup. The Windows build already includes FFmpeg for uploaded audio/video processing.
4. Launch Avorythm and open **Advanced settings**.
5. Save both the Gemini and Groq API keys. Set `http://127.0.0.1:10808` when that proxy is required.

Both keys are stored separately in the operating-system keyring, not `settings.json`.

No separate FFmpeg or WinGet step is required on Windows.

## macOS and Linux desktop builds

Download and extract the matching `Avorythm-Darwin-*.zip` or `Avorythm-Linux-*.zip`. macOS live system audio needs a loopback input such as BlackHole. Linux users select the relevant PipeWire/PulseAudio monitor source. Install FFmpeg through Homebrew or the distribution package manager for uploaded-media processing. The file studio itself never needs virtual routing.

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

1. Download `Avorythm-Extension.zip` and extract it into a permanent folder. Do not select the ZIP itself.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the folder that directly contains `manifest.json`.
5. Pin Avorythm and open its popup.
6. Open **Settings**, enter the Gemini API key for the current browser session, configure **On-page playback** and **Synchronized playback & export** independently, and confirm the one-time processing consent.
7. Return to the popup, choose **On this page** or **Synchronized recorder & player**, then start from a normal media tab.

The extension needs no Windows app, localhost, Python, FFmpeg, or virtual cable. `chrome.tabCapture` suppresses direct tab playback; Avorythm recreates the exact original/dub mix for the selected mode. On-page controls never modify synchronized playback or its customized export.

**On this page** is the shortest path for live listening. **Synchronized recorder & player** keeps capture 8–60 seconds ahead (20 seconds by default) and feeds an independent, seekable player. Pausing, seeking, switching tabs, or fullscreening the Avorythm player does not stop the source producer. A temporary underrun pauses only the consumer until its safety lead is rebuilt. The source media ending finalizes the local capture automatically. The player then renders the selected synchronized audio mix—dubbed-only by default—into a new seekable WebM and downloads enabled captions as SRT files. Literal zero delay is impossible because translation must receive speech before it can generate output; the recording lead trades a later start for much tighter relative sync. Protected DRM streams can reject video capture, so use on-page mode for those sites.

The extension's faster synchronized engine uses Gemini 3.5 Live Translate directly. Its precise engine uses Groq Whisper for complete-utterance timestamps, the free Gemini text pool for translation, and Gemini 3.1 Flash Live for the selected voice; audio and both subtitle tracks are fitted to one recorded timeline. Chrome asks for the optional `api.groq.com` permission and keeps the Groq key only for the browser session.

The key lives only in `chrome.storage.session` and must be entered again after the browser fully exits. Record mode creates `original.wav`, `source.srt`, `dubbed.wav`, and `translated.srt` under Downloads. Long Live connections are renewed automatically with bounded backoff.

### Floating subtitles

Enable **Source subtitles**, **Translated subtitles**, or both in **Settings → On-page playback**. Audio remains independently configurable, so captions can accompany original audio, dubbed audio, both, or neither. Avorythm injects the frosted-glass card only into the selected page. Drag its top handle to move it and use the browser resize grip to resize it. Text size, initial position, width, and opacity are configurable on the separate Settings page. Chrome internal pages, the Web Store, and some protected pages do not allow injection.

### Proxy

If the proxy listens on `127.0.0.1:10808`, enable it for Chrome/Edge in the proxy client or Windows system proxy. The desktop app's proxy field has no effect on the independent extension.

### Why GitHub cannot provide one-click install

[Chrome on Windows and macOS only allows direct end-user installation for extensions hosted and signed by the Chrome Web Store](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions). GitHub cannot silently install a local CRX or unpacked folder. A real **Add to Chrome** button requires publishing Avorythm in the Chrome Web Store; Edge needs a separate Microsoft Edge Add-ons listing. Enterprise policy deployment is a separate administrator workflow.

Read the [privacy policy](../PRIVACY.md) to understand how browser audio and credentials are handled.

## Live desktop audio: exact AMM route

> Skip this entire section for the extension and uploaded-media studio.

Play source audio first so Windows shows both apps under **Settings → System → Sound → Volume mixer**. Then match the supplied reference screenshot:

1. Under **Google Chrome** (or the source app), set **Output device** to `Speakers (AMM Virtual Audio Device)`.
2. Under **Avorythm.exe**, leave **Output device** on `Default` or a physical headset.
3. Under **Avorythm.exe**, set **Input device** to `Microphone (AMM Virtual Audio Device)`.
4. In the Avorythm dashboard, select the matching AMM loopback as **Application audio input**.
5. Set Original to 0% and Dubbed to 100%.

![Exact Windows Volume Mixer routing](images/audio-routing-guide.png)

Do not route Avorythm output to AMM Virtual. That feeds dubbed speech back into capture and creates echo/feedback.

## Troubleshooting

- **Extension shows a Blob/JSON error:** remove the older unpacked build, load the current `Avorythm-Extension.zip` contents, and reload the target tab.
- **Extension cannot connect:** verify model access/quota and confirm Chrome/Edge itself uses the required proxy.
- **Extension asks for the key again:** expected after a full browser exit because the key is session-only.
- **No tab audio:** use Chrome/Edge 116+, keep the target tab active when Start is clicked, and note that protected DRM pages may block capture.
- **Synchronized player does not open or shows an unsupported-media message:** the page did not expose a capturable video track or uses protected media. Stop the session and choose **On this page**.
- **Synchronized player waits on Buffering:** keep the source media playing and let the safety lead rebuild. Increase Recording lead when the source or network stalls often.
- **Media Studio says FFmpeg is required:** reinstall the current Windows release. Source and macOS/Linux builds still require FFmpeg on `PATH`.
- **The original track is still audible in the player:** leave **Original audio** unchecked. The switch enforces mute and zero volume even if the browser's native video controls try to unmute it.
- **Close Avorythm completely:** use **Quit app** in the dashboard top bar or close the native main window.
- **Floating subtitles do not appear:** start from a normal `http`/`https` page. Chrome blocks scripts on `chrome://`, the Web Store, and other restricted pages.
- **Media Studio asks for a Groq key:** create one at `console.groq.com/keys` and save it beside the Gemini key in Advanced settings.
- **Uploaded job takes several times the media duration:** Gemini Live produces speech sequentially and Precise mode can retry a segment whose output transcript disagrees with its translation.
- **Low speech-match warning:** Gemini Live still read one segment differently after retry; listen to that output before final use or run it again.
- **Long translated dialogue sounds fast:** it exceeded its media window and was time-compressed without clipping the sentence ending.
- **Desktop source remains audible:** its Windows output is still the physical device; change the source app to AMM Virtual.
- **No desktop capture:** select AMM's matching loopback/input, not a physical microphone.
- **Echo:** Avorythm output and capture must not use the same virtual endpoint.
- **Voice selection changes files but not live translation:** Gemini 3.1 Flash Live supports the selected file voice; Gemini 3.5 Live Translate reproduces its live voice automatically.
