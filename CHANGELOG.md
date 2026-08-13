# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and semantic versioning.

## [Unreleased]

## [0.7.1] - 2026-08-13

### Fixed

- Place Live API transcription options at the WebSocket setup level accepted by the current v1beta endpoint, preventing immediate Gemini close code 1007.
- Keep the output-download notice hidden until a recorded session actually finishes.

## [0.7.0] - 2026-08-13

### Added

- Strongest-first translation pool across every non-zero-quota free text-output Gemini/Gemma model, with local RPM/RPD claims and provider-error fallback.
- Full desktop-app shutdown endpoint and bilingual top-bar control.

### Changed

- Renamed the product, package, executable, installer, extension, repository, and artifacts to Dubira.
- Moved file-voice selection into Media Studio and persisted it per media job.
- Reworked the dashboard into a compact broadcast-console interface.

### Fixed

- Enforce source mute and zero volume whenever the player's Original audio switch is off.
- Split long source and translated subtitles into short, naturally timed movie cues.
- Hide the empty-player illustration as soon as processed media is ready.

## [0.6.0] - 2026-08-13

### Added

- Groq Whisper Large v3/turbo transcription with timestamp-preserving FLAC chunking.
- Structured Gemini 3.1 Flash Lite translation and Gemini 3.1 Flash Live file narration.
- Separate Groq/Gemini key management and a selectable file-dubbing voice.
- New Voxilyra brand, generated logo, English README dashboard, and bilingual documentation.

### Changed

- Replaced uploaded-media Gemini Live Translate speech-to-speech processing with a three-stage transcription, translation, and narration pipeline.
- Renamed the package, executable, installer, extension, artifacts, and user-facing documentation.

### Fixed

- Preserve Whisper timestamps across overlapped long-file chunks without duplicate boundary segments.
- Retry only mismatched Gemini Live narration segments and keep traffic below the local rolling ceiling.

## [0.5.1] - 2026-08-12

### Fixed

- Recover uploaded-media Live sessions from proxy keepalive timeouts and transient connection resets.
- Retry no-response segments three times and preserve isolated non-speech or unavailable intervals as synchronized silence instead of failing the entire job.
- Keep valid Precise output when an optional quality retry disconnects.
- Wait for translated audio/transcripts instead of treating an earlier source transcript or silent audio tail as completion.
- Add explicit leading/trailing silence boundaries so the first and final words of file segments are not clipped.
- Reject abnormally short Live output and drain receiver tasks cleanly after send failures.

### Changed

- Detect short speech pauses through background music and create sentence-friendlier uploaded-media windows.
- Compare up to three Precise samples while retaining the 15,000-token rolling reservation ceiling.

## [0.5.0] - 2026-08-12

### Added

- Uploaded MP3, WAV, M4A, FLAC, OGG, AAC, Opus, AIFF, and WMA processing alongside video files.
- Dedicated synchronized audio-player presentation with independent original/dub audio and both subtitle tracks.
- Precise-mode semantic back-check of the actual fitted dub, one bounded retry, confidence score, and visible low-confidence warning.

### Fixed

- Continue the Python Live receiver across SDK model turns instead of silently stopping live dubbing after the first turn.
- Preserve transcriptions delivered after `generationComplete`, as required by Google's unordered transcription event contract.
- Remove continuous silent padding from file-session output before time fitting; the old behavior could compress a complete sentence into the first seconds and make speech unintelligible.
- Preserve complete Fast-mode dialogue with chained `atempo` filters instead of clipping sentence endings.

### Changed

- Use manual activity boundaries for uploaded-file windows and cap silent Live output locally.
- Split Precise jobs into shorter, silence-aware windows and keep the rolling local reservation ceiling at 15,000 estimated tokens per minute.
- Rename file-processing copy and installer options from video-only to audio/video media.

## [0.4.1] - 2026-08-11

### Fixed

- Discover WinGet-installed FFmpeg/FFprobe directly from the package directory when WinGet does not create PATH aliases.

## [0.4.0] - 2026-08-11

### Added

- Local uploaded-video Media Studio with precise/fast processing modes.
- Four synchronized outputs, ZIP archive, VTT tracks, and a dual-audio HTML5 player.
- Rolling 15,000-token-per-minute governor, persisted job recovery, and real cancellation.
- Automatic Live-session renewal in the desktop app and standalone extension.
- Real AMM Volume Mixer screenshot and exact bilingual routing guide.
- Automated background-service, reconnect, quota, media, job, and gateway tests.

### Fixed

- Use the official camelCase Live Translate WebSocket setup contract in the extension.
- Preserve final transcripts marked `finished=true` during file processing.
- Decode Blob-framed WebSocket messages serially before JSON parsing.
- Keep long and short speech in processable windows instead of opening a Live session for tiny utterances.

### Changed

- Use only `gemini-3.5-live-translate-preview` across every workflow.
- Remove the unsupported named-voice and separate TTS pipeline.
- Make FFmpeg an optional recommended WinGet component in the Windows installer.

## [0.3.1] - 2026-08-11

### Fixed

- Decode Blob-framed Gemini Live WebSocket messages before parsing their JSON payload.

## [0.3.0] - 2026-08-11

### Added

- Standalone extension authentication, direct Gemini Live connections, and browser-local recording.
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

- New generated Dubira brand mark across the app, installer, extension, and documentation.
- Bilingual in-app audio-routing guide with a Windows Volume Mixer illustration.
- Post-install helper that prepares the unpacked extension folder and opens the browser setup page.

### Changed

- Replaced the misleading automatic desktop-audio setup with explicit manual device controls.
- Expanded Persian and English installation, routing, troubleshooting, and extension-distribution docs.

## [0.1.0] - 2026-08-11

### Added

- Windows companion with a bilingual responsive dashboard.
- Gemini 3.5 Live Translate streaming and automatic native translated speech.
- Manifest V3 Chrome/Edge extension with AudioWorklet tab capture.
- Dub-only, original-only, and auto-ducked smart-mix playback.
- Secure keyring-backed API key management and configurable proxy.
- Four synchronized WAV/SRT recording artifacts and ZIP download.
- Automatic audio-device detection and Windows Volume Mixer handoff.
- Tests, static analysis, release packaging, security policy, and contributor templates.

[Unreleased]: https://github.com/msmahdinejad/dubira/compare/v0.7.1...HEAD
[0.7.1]: https://github.com/msmahdinejad/dubira/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/msmahdinejad/dubira/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/msmahdinejad/dubira/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/msmahdinejad/dubira/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/msmahdinejad/dubira/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/msmahdinejad/dubira/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/msmahdinejad/dubira/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/msmahdinejad/dubira/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/msmahdinejad/dubira/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/msmahdinejad/dubira/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/msmahdinejad/dubira/releases/tag/v0.1.0
