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

1. Extract `LingoDub-Extension.zip` into a permanent folder.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable Developer mode.
4. Click **Load unpacked** and choose that folder.
5. Pin LingoDub.

The extension captures only the tab where you explicitly click Start. Capturing a tab disables its direct playback; LingoDub then recreates playback according to your selected mode. This is why **Dub only** does not overlap with source audio.

## Desktop programs: automatic setup

Unlike a browser tab, a normal Windows program sends audio directly to the selected Windows endpoint. To hear only dubbing, its audio must be isolated before LingoDub plays the translated stream.

1. Install a trusted virtual audio endpoint such as VB-CABLE or use an existing virtual device.
2. In LingoDub, select **Automatic audio setup**. It detects a virtual loopback when its device name contains “Virtual”.
3. Click **Open Windows volume mixer**.
4. Set VLC/the course player output to the virtual endpoint.
5. Keep your headphones as LingoDub's listening output.
6. Use Original 0% and Dubbed 100%.

Installing or silently changing an audio driver is intentionally not automated: Windows requires elevation and driver trust, and choosing a third-party driver is a user decision. LingoDub automates detection and app settings, then opens the one Windows screen that requires confirmation.

## Troubleshooting

- **Companion offline:** start `LingoDub.exe`; verify `http://127.0.0.1:8765/api/health` returns `{"status":"ok"...}`.
- **No translation:** verify the key, model access, quota, and proxy. Restart the session after changing language or voice.
- **No tab audio:** Chrome/Edge must be 116+, the tab must be active when Start is clicked, and protected DRM pages may block capture.
- **Echo/feedback on desktop:** never capture the same endpoint used for dubbed playback. Route the source app to a virtual endpoint and LingoDub to physical headphones.
- **Named voice is delayed:** named voices use a second Gemini TTS request. Select `Native` for the lowest latency.
