# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and semantic versioning.

## [Unreleased]

## [0.3.1] - 2026-08-11

### Fixed

- Decode Blob-framed Gemini Live WebSocket messages before parsing their JSON payload.

## [0.3.0] - 2026-08-11

### Added

- Standalone extension authentication, direct Gemini Live/TTS connections, and browser-local recording.
- Four independent WAV/SRT downloads backed by temporary Origin Private File System storage.
- Chrome Web Store publication checklist and bilingual privacy policy.

### Changed

- Split the Windows app and browser extension into independent products and packages.
- Keep the extension API key in browser-session storage instead of requiring the Windows keyring.
- Route extension traffic through the browser/system proxy rather than the desktop app proxy.

### Removed

- Localhost ExtensionBridge WebSocket and extension status coupling from the desktop app.
- Extension files and setup helper from the Windows app installer.

## [0.2.0] - 2026-08-11

### Added

- New generated LingoDub brand mark across the app, installer, extension, and documentation.
- Bilingual in-app audio-routing guide with a Windows Volume Mixer illustration.
- Post-install helper that prepares the unpacked extension folder and opens the browser setup page.

### Changed

- Replaced the misleading automatic desktop-audio setup with explicit manual device controls.
- Expanded Persian and English installation, routing, troubleshooting, and extension-distribution docs.

## [0.1.0] - 2026-08-11

### Added

- Windows companion with a bilingual responsive dashboard.
- Gemini 3.5 Live Translate streaming and optional Gemini 3.1 TTS voices.
- Manifest V3 Chrome/Edge extension with AudioWorklet tab capture.
- Dub-only, original-only, and auto-ducked smart-mix playback.
- Secure keyring-backed API key management and configurable proxy.
- Four synchronized WAV/SRT recording artifacts and ZIP download.
- Automatic audio-device detection and Windows Volume Mixer handoff.
- Tests, static analysis, release packaging, security policy, and contributor templates.

[Unreleased]: https://github.com/msmahdinejad/lingodub/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/msmahdinejad/lingodub/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/msmahdinejad/lingodub/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/msmahdinejad/lingodub/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/msmahdinejad/lingodub/releases/tag/v0.1.0
