# Installation and audio setup

[فارسی](INSTALLATION.fa.md)

## Requirements

- Windows 10 or 11 (64-bit)
- Chrome or Edge 116+ for the extension
- A Gemini API key with access to `gemini-3.5-live-translate-preview`
- Internet connectivity; if required, an HTTP proxy such as `http://127.0.0.1:10808`

## Companion

1. Download `LingoDub-Setup-x64.exe` from Releases.
2. Install without administrator privileges and launch LingoDub.
3. In the dashboard, open **Advanced settings**, paste the Gemini API key, and save it.
4. Set the proxy. Leave it blank for direct access.

The key is saved in Windows Credential Manager, not in `settings.json`. Developers may instead copy `.env.example` to `.env`; `.env` is ignored by Git.

## Extension

1. Install and start the LingoDub companion first.
2. Extract `LingoDub-Extension.zip` into a permanent folder. Do not select the ZIP itself.
3. Open `chrome://extensions` or `edge://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the folder that directly contains `manifest.json`.
6. Pin LingoDub, open the video tab, open the popup, and click **Start dubbing this tab**.

The extension captures only the tab where you explicitly click Start. Capturing a tab disables its direct playback; LingoDub then recreates playback according to your selected mode. This is why **Dub only** does not overlap with source audio.

The installer also adds **Set up browser extension** to the Start menu. It copies the extension to `%LOCALAPPDATA%\LingoDub\Extension`, opens the browser's extension page, and copies the folder path. Chrome still requires your final **Load unpacked** confirmation.

### Why there is no true one-click GitHub install

[Chrome on Windows and macOS only allows direct end-user installation for extensions hosted and signed by the Chrome Web Store](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions). A local CRX or GitHub download cannot silently install itself. A real one-click **Add to Chrome** flow therefore requires publishing LingoDub in the Chrome Web Store; Edge needs its own Microsoft Edge Add-ons listing. Enterprise administrators have separate policy-based deployment options.

## Desktop programs: manual audio setup

Unlike a browser tab, a normal Windows program sends audio directly to the selected Windows endpoint. To hear only dubbing, its audio must be isolated before LingoDub plays the translated stream.

> **Do this only for desktop applications. When using the extension, leave Chrome/Edge output unchanged and skip this entire section.**

### Correct signal path

```text
VLC / source app output → CABLE Input → LingoDub cable loopback capture
LingoDub listening output → physical headphones or speakers
```

### Step by step

1. Install a trusted virtual audio endpoint such as the [official VB-CABLE](https://vb-audio.com/Cable/) or use an existing equivalent. Restart Windows if its installer asks you to.
2. Open VLC, the course player, or the source app and play audio for a few seconds. Windows normally lists an app in Volume Mixer only after it starts an audio session.
3. Open **Settings → System → Sound → Volume mixer**. The dashboard's **Open Windows volume mixer** button opens this page directly. This is also [Microsoft's documented place for choosing an app-specific output device](https://support.microsoft.com/en-US/Windows/Hardware/audio/fix-app-audio-not-working-while-system-sounds-work-in-windows).
4. Under **Apps**, find the source app and change its **Output device** to `CABLE Input (VB-Audio Virtual Cable)` or the matching playback endpoint.
5. In LingoDub, set **Application audio input** to that cable's WASAPI loopback, commonly named `CABLE Input ... [Loopback]`.
6. Set **Listening output** to your physical headphones or speakers.
7. Set **Original** to 0% and **Dubbed** to 100%, save settings, then start dubbing.

![Desktop audio routing guide](images/audio-routing-guide.png)

### What you should hear

- Before LingoDub starts, the desktop source may become silent because its output now ends at the Virtual Cable.
- After LingoDub connects, translated speech plays through the physical output.
- If you choose a non-zero Original level, LingoDub mixes captured source audio back in deliberately.

Installing a driver or changing another application's preferred output is intentionally not advertised as automatic. Driver installation requires elevation and trust, and robust per-app routing is controlled by Windows Volume Mixer. LingoDub opens the correct page and keeps its own capture/output selectors manual and visible.

## Troubleshooting

- **Companion offline:** start `LingoDub.exe`; verify `http://127.0.0.1:8765/api/health` returns `{"status":"ok"...}`.
- **No translation:** verify the key, model access, quota, and proxy. Restart the session after changing language or voice.
- **No tab audio:** Chrome/Edge must be 116+, the tab must be active when Start is clicked, and protected DRM pages may block capture.
- **Desktop source app is missing from Volume Mixer:** start playback first, then reopen Volume Mixer.
- **Desktop source is still audible directly:** its Windows output is still the physical device; change that source app to `CABLE Input`.
- **No desktop input reaches LingoDub:** choose the Virtual Cable loopback, not your microphone, as Application audio input.
- **Echo/feedback on desktop:** never capture the same endpoint used for dubbed playback. Route the source app to a virtual endpoint and LingoDub to physical headphones.
- **Named voice is delayed:** named voices use a second Gemini TTS request. Select `Native` for the lowest latency.
