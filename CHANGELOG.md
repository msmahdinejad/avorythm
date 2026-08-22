# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and semantic versioning.

## [1.1.9] - 2026-08-22

### Changed

- Apply a measured 2.5-second presentation delay to translated captions in the synchronized player and exported translated SRT while keeping source captions on the video clock.
- Verify Groq reachability before precise-mode capture starts and distinguish invalid keys, blocked routes, connection failures, and exhausted quota.
- Show percentage and estimated remaining time while the customized WebM is rendered locally.

### Fixed

- Cross short MediaSource gaps automatically and rebuild playback from the local recording after a repeated no-progress stall, removing the need for a manual seek.
- Always use the standards-based Web Audio export path after the generated-track path was proven to produce a nominal VP9 track with zero decodable video frames in Chrome.
- Bound media loading and recording finalization so a damaged or incomplete local capture cannot leave export waiting forever.
- Preserve actionable Groq connection errors when the browser route fails during a precise session.

## [1.1.8] - 2026-08-22

### Changed

- Reuse one serialized Gemini 3.1 Flash Live session across precise-mode utterances instead of opening a quota-consuming connection for every sentence.
- Show synchronized capture progress immediately and allow precise playback after its first safe processed window instead of waiting for a second full buffer.
- Follow the audible dub clock for translated captions while source captions remain on the video clock.
- Report actionable Groq, Gemini voice, local-artifact, export, and download failures in the synchronized player.

### Fixed

- Guard every buffered-range read and retire stale MediaSource objects before finalized playback, preventing a detached `SourceBuffer` from breaking finalization, seeking, and output readiness.
- Build mixed WebM output through a standards-based Web Audio fallback when WebCodecs track generation is unavailable, and finish exports from the authoritative recorded duration when WebM omits `ended` or exposes an infinite duration.
- Keep translated cues visible through the complete natural PCM response, including quiet final phonemes, instead of advancing at an amplitude threshold.
- Dispose and replace the selected-tab media bridge across stop, reload, extension update, and reinjection so an invalidated extension context cannot leak an uncaught page error.
- Recover the precise pipeline from transient narrator failures without marking unfinished work as successfully processed.
- Discard incomplete synchronized video and four-file artifacts when the precise Whisper pipeline fails instead of presenting partial output as ready.

## [1.1.7] - 2026-08-22

### Changed

- Preserve Gemini 3.5 Live Translate and Gemini 3.1 Live PCM at its native 24 kHz sample count instead of resampling every response to the source-speech duration, which could vary pitch and speaking speed between cues.
- Keep source captions on the detected source-speech interval while timing translated captions from the first audible dubbed sample through the natural dub duration.
- Serialize natural-duration precise narrations without overlapping adjacent Gemini 3.1 speech.

### Fixed

- Release Gemini 3.1 narration on `generationComplete`, WebSocket close with valid PCM, or 600 ms of output inactivity; audio no longer disappears when the server omits `turnComplete`.
- Bound incomplete Gemini 3.1 narration output to twelve seconds while retaining the existing thirty-second request timeout.

## [1.1.6] - 2026-08-22

### Fixed

- Release synchronized Gemini 3.5 Live Translate audio and transcripts after output becomes idle or a three-second streaming deadline expires; the continuous API can emit hundreds of valid media messages without either `generationComplete` or `turnComplete`.
- Flush punctuation-free incremental transcript fragments with the exact dubbed-audio interval, so both subtitle tracks reach the player instead of remaining trapped in a partial-text buffer.
- Preserve the committed prefix across bounded partial flushes so cumulative Live transcription updates do not duplicate subtitles.
- Advance successive live dubbed intervals monotonically during continuous speech, preventing later PCM bursts from being discarded as overlapping late audio.
- Send precise-pipeline narration through Gemini 3.1 Live's supported `realtimeInput.text` update and use its current `thinkingLevel` setup field.
- Cover the full offscreen-to-player bridge with a regression test that receives audible PCM and both subtitle tracks without relying on completion flags.

## [1.1.5] - 2026-08-21

### Fixed

- Resume the synchronized player's Web Audio context when a dubbed cue arrives after Chrome has automatically suspended the initially silent background player.
- Cover both synchronized engines through their shared playback boundary and verify that non-silent Gemini PCM reaches an audible 100% dubbed-output gain.

## [1.1.4] - 2026-08-21

### Added

- Separate, persistent output mixes for on-page playback and synchronized playback/export, including independent audio, subtitle, volume, and smart-duck controls.
- A local WebCodecs export pipeline that renders the selected synchronized audio mix into a seekable WebM and downloads enabled subtitle tracks as SRT files.
- Real-browser media export coverage for dubbed-only and original-plus-dubbed output, including audible audio, video/audio tracks, and seeking.

### Changed

- Start buffered video as soon as the safety lead is ready; a slow Gemini response no longer blocks Play while the first dubbed cue is pending.
- Default synchronized playback and export to dubbed audio while preserving explicit user customization.
- Validate and migrate legacy output settings into the two new independent scopes.

### Fixed

- Replace the unreliable captured-`audio` export path that could create a silent or empty WebM with a paced PCM track on the video clock.
- Stop and clean up recorders, generated tracks, and pending audio writes after interrupted playback instead of leaving a stalled export behind.
- Keep finalized artifacts attached to the restored player session so customized export remains available after refresh.

## [1.1.3] - 2026-08-21

### Changed

- Dub-only synchronized playback now waits for its first translated audio cue instead of starting the buffered video silently.
- The Web Audio scheduling window expands with the configured safety lead so translated speech continues when Chrome throttles a background player tab.
- The player and bilingual guides state that only the latest synchronized capture is retained in Chrome private storage and downloaded files remain under `Downloads/Avorythm`.

### Fixed

- Publish completed Gemini audio at `generationComplete`; Google may delay `turnComplete` while waiting for assumed real-time playback, which previously made every translated cue arrive too late for the synchronized player.
- Preserve one timing interval for late transcription messages without publishing the same audio twice.
- Clear the previous player timeline and publish the new active recording state before opening the player tab, preventing a new session from restoring stale artifacts.

## [1.1.2] - 2026-08-20

### Changed

- Synchronized recording now uses an isolated OPFS worker and an atomic release/read/reopen snapshot cycle, so an active recording can be replayed after refresh without loading the complete file into worker memory.
- Live synchronized dubbing uses a short scheduling horizon and resynchronizes its audio clock when player-tab visibility changes.
- Finalized WebM playback uses the persisted capture duration when Chrome reports an infinite media duration.
- Windows release builds use the checksum-verified FFmpeg 9.0.1 essentials package; it contains the codecs Avorythm needs without the much larger full-build-only libraries.

### Fixed

- Send precise-mode narration text through Gemini Live `clientContent` turns instead of the unsupported realtime text payload, restoring the Whisper → Gemini text pool → Gemini 3.1 Live path.
- Place every Gemini Live translated caption on the exact fitted dubbed-audio interval instead of timing text and speech independently.
- Preserve the complete recorded timeline across MediaSource eviction, refresh, backward seek, and finalized playback while defaulting the output mix to dubbed audio.
- Move manual recording finalization into the Recorder & playback card and suppress recoverable background `play()` races without leaving a blocking error overlay.
- Disable automatic function calling for text-only file translation requests to avoid irrelevant SDK tool-calling behavior.

## [1.1.1] - 2026-08-19

### Added

- A precise synchronized extension engine: Groq Whisper utterances, the strongest-first free Gemini text pool, and Gemini 3.1 Flash Live speech share one recorded timeline and a selectable voice.
- Refresh recovery for active OPFS recordings and finalized local video, dub-audio, and subtitle timelines.
- Manual recording finalization plus same-element YouTube/SPA autoplay-end detection.

### Changed

- Incomplete Whisper utterances now stay pending across overlapping windows so translation and narration receive complete sentences.
- Synchronized capture and playback remain independent while the source tab changes visibility or fullscreen state.
- Player and privacy/help documentation now describe both synchronized engines and their direct Google/Groq data flows.
- Windows packages now use the bundled FFmpeg executable for media probing as well as processing, removing a redundant FFprobe binary and excluding development-only modules from release builds.

### Fixed

- Treat expected `play()` `AbortError` races as recoverable and clear the blocking stage overlay after playback recovers.
- Prevent stale append/play promises from corrupting a rebuilt MediaSource after refresh, seek, fullscreen, or rebuffer transitions.
- Freeze visible captions while playback is paused, then select the correct recorded cue on resume or seek.
- Preserve bounded memory during long refresh replays by chunking OPFS snapshots and pruning pre-restore MediaSource ranges.
- Always close capture resources and leave a recoverable stopped state when finalization or offscreen messaging fails.

## [1.1.0] - 2026-08-19

### Added

- Independent producer/consumer synchronized capture: the source tab records ahead while the player can pause, seek, switch tabs, and fullscreen without controlling the producer.
- Automatic media-end finalization and local WebM export from the synchronized player.
- Optional session-only Groq Whisper segment timing with an optional host permission and automatic Gemini timing fallback.
- Complete illustrated English and Persian guides in the desktop app and repository.
- Full player transport controls, recording/safety-lead status, and a dedicated recovery state for temporary buffer underruns.

### Changed

- Increased the default synchronized recording lead to 20 seconds and separated recorder/player status from dubbing-output settings.
- Defaulted new extension installations to English and made the required selected-tab audio consent more prominent.
- Kept the complete synchronized capture in OPFS until the next session so users can seek and download it.

### Fixed

- Prevented player Pause and Seek controls from pausing or seeking the source producer.
- Rebuilt playback safely after buffer underruns instead of remaining stuck on Buffering.
- Preserved the complete video frame in fullscreen with `object-fit: contain`.
- Aligned translated captions with the emitted dubbed-audio timeline and dropped late audio chunks after seeking.
- Read both Gemini and Groq session-key states correctly in extension settings.

## [1.0.0] - 2026-08-18

### Added

- Complete Avorythm identity across the desktop apps, browser extension, packages, installer, documentation, and release artifacts.
- A simplified extension popup plus a dedicated bilingual Settings page with four independent output channels, volume mixing, captions, recording, consent, and session-only key management.
- A dedicated synchronized extension player that locally buffers captured audio/video and schedules generated speech and short captions on one timeline.
- Low-latency on-page playback with continuous 100 ms PCM input, pause-aware reconnect buffering, automatic ducking, and a movable caption overlay.
- Release-ready English and Persian metadata, first-capture consent, project/privacy links, and a new minimal Avorythm visual identity.
- Public code-signing policy and an explicit unsigned-installer path while SignPath review is pending.

### Changed

- Moved configuration out of the popup so starting or stopping a session stays fast and uncluttered.
- Recording downloads use an optional permission requested only when the user enables recording.
- Windows installer metadata exposes a consistent product/file version and displays the license and privacy policy before installation.

### Fixed

- Extension authentication uses Google's current v1beta WebSocket and the setup schema accepted by the Live Translate service, with the user's session-only key sent directly to Google.
- Original audio is muted in synchronized mode unless its channel is explicitly enabled; dub playback suspends whenever buffered video stalls.

## [0.9.1] - 2026-08-13

### Fixed

- Normal desktop launches never open Chrome when Avorythm's local service is already running.
- Desktop builds now require and explicitly bundle the native pywebview shell.

## [0.9.0] - 2026-08-13

### Added

- One unified live-output mixer with independent original audio, dubbed audio, source subtitle, and translated subtitle channels in both apps.

### Changed

- Replaced live-output presets with direct channel switches and contextual audio/subtitle controls.
- Migrated legacy subtitle presets without silently carrying their old zero-volume mixer value.

## [0.8.1] - 2026-08-13

### Fixed

- Completed live-subtitle sentences now start a fresh line instead of accumulating indefinitely.

## [0.8.0] - 2026-08-13

### Added

- Floating subtitle-only mode for the desktop app and standalone browser extension.
- Draggable/resizable frosted-glass subtitle cards with source-line, size, width, and opacity controls.
- Native pywebview desktop shell and release builds for Windows, macOS, and Linux.
- Cross-platform PortAudio input/output support for macOS loopback devices and Linux monitor sources.

### Changed

- Introduced a native cross-platform desktop shell and a unified product identity.
- Reworked both interfaces around a translucent glass visual system.
- Expanded CI and release validation to all three desktop operating systems.

### Fixed

- Subtitle-only mode now forces original audio on and generated speech off at the audio mixer, not only in the UI.
- Extension overlay access is temporary and limited to the tab explicitly activated by the user.

## [0.7.1] - 2026-08-13

### Fixed

- Place Live API transcription options at the WebSocket setup level accepted by the current v1beta endpoint, preventing immediate Gemini close code 1007.
- Keep the output-download notice hidden until a recorded session actually finishes.

## [0.7.0] - 2026-08-13

### Added

- Strongest-first translation pool across every non-zero-quota free text-output Gemini/Gemma model, with local RPM/RPD claims and provider-error fallback.
- Full desktop-app shutdown endpoint and bilingual top-bar control.

### Changed

- Consolidated package, executable, installer, extension, and artifact naming.
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
- A generated visual identity, English README dashboard, and bilingual documentation.

### Changed

- Replaced uploaded-media Gemini Live Translate speech-to-speech processing with a three-stage transcription, translation, and narration pipeline.
- Consolidated package, executable, installer, extension, artifact, and documentation naming.

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
- Bilingual privacy policy.

### Changed

- Split the Windows app and browser extension into independent products and packages.
- Keep the extension API key in browser-session storage instead of requiring the Windows keyring.
- Route extension traffic through the browser/system proxy rather than the desktop app proxy.

### Removed

- Localhost ExtensionBridge WebSocket and extension status coupling from the desktop app.
- Extension files and setup helper from the Windows app installer.

## [0.2.0] - 2026-08-11

### Added

- Added a generated brand mark across the app, installer, extension, and documentation.
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

[Unreleased]: https://github.com/msmahdinejad/avorythm/compare/v1.1.9...HEAD
[1.1.9]: https://github.com/msmahdinejad/avorythm/compare/v1.1.8...v1.1.9
[1.1.8]: https://github.com/msmahdinejad/avorythm/compare/v1.1.7...v1.1.8
[1.1.7]: https://github.com/msmahdinejad/avorythm/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/msmahdinejad/avorythm/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/msmahdinejad/avorythm/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/msmahdinejad/avorythm/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/msmahdinejad/avorythm/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/msmahdinejad/avorythm/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/msmahdinejad/avorythm/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/msmahdinejad/avorythm/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/msmahdinejad/avorythm/compare/v0.9.1...v1.0.0
[0.9.1]: https://github.com/msmahdinejad/avorythm/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/msmahdinejad/avorythm/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/msmahdinejad/avorythm/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/msmahdinejad/avorythm/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/msmahdinejad/avorythm/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/msmahdinejad/avorythm/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/msmahdinejad/avorythm/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/msmahdinejad/avorythm/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/msmahdinejad/avorythm/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/msmahdinejad/avorythm/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/msmahdinejad/avorythm/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/msmahdinejad/avorythm/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/msmahdinejad/avorythm/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/msmahdinejad/avorythm/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/msmahdinejad/avorythm/releases/tag/v0.1.0
