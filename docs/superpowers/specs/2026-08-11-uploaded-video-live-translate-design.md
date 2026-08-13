# Uploaded Video Dubbing with Gemini 3.5 Live Translate

> Historical design, superseded by the Groq Whisper → Gemini text → Gemini Live file pipeline in Dubira 0.6.0. See `ARCHITECTURE.md` for the current implementation.

**Date:** 2026-08-11
**Status:** Awaiting written-spec review
**Scope:** Windows desktop application; the browser extension remains standalone

## Objective

Add local video import, two processing modes, four downloadable outputs, and a
synchronized in-app player. Every AI operation must use only
`gemini-3.5-live-translate-preview`. FFmpeg and local signal processing may extract,
measure, align, and mux media, but they must not replace Gemini translation,
transcription, or voice generation.

The four required outputs are:

1. Original audio (`original.wav`)
2. Source-language subtitles (`source.srt`)
3. Dubbed audio (`dubbed.wav`)
4. Target-language subtitles (`translated.srt`)

The imported video remains local. The application must not upload the video file;
it streams only extracted PCM audio to Gemini Live.

## Product Decisions

- **Precise mode** is the default.
- **Fast mode** is optional and begins producing a preview sooner.
- Precise synchronization means cue-level alignment with the source timeline and no
  cumulative drift. It does not promise phoneme-level lip sync.
- Original audio is muted and dubbed audio is enabled by default in the player.
- Both subtitle tracks and both audio tracks are independently controllable.
- Uploaded-media processing belongs to the desktop app. The extension continues to
  capture and dub a browser tab without requiring the desktop app.
- No Gemini batch, Files, speech-to-text, or TTS model is allowed in this workflow.

## Architecture

Reuse the existing FastAPI application, Gemini Live client, static HTML/CSS/JS UI,
configuration store, recorder utilities, and FFmpeg installed or bundled with the
desktop app. Do not introduce a frontend framework, database, task broker, or remote
service.

Add four focused modules:

- `media.py`: FFmpeg probing, extraction, silence detection, fitting, and muxing.
- `jobs.py`: one in-process media job, cancellation, progress, and persisted manifest.
- `quota.py`: the shared rolling token budget and retry reservations.
- `file_dubbing.py`: orchestration between media segments and Gemini Live.

The existing `gemini.py` remains the only Gemini protocol boundary. It gains a
file-segment operation and usage reporting rather than a second Gemini client.

Each imported video gets a job directory under the existing Dubira data directory:

```text
media-jobs/<job-id>/
  source.<original-extension>
  manifest.json
  original.wav
  dubbed.wav
  source.srt
  translated.srt
  preview/
```

`manifest.json` is the single persisted state record. It contains sanitized file
metadata, processing mode, language settings, progress, cue metadata, output
paths, failure details, and resumable segment indexes. Writes use a temporary sibling
and atomic rename to survive power loss.

Only one uploaded-media job may actively use Gemini at a time. This keeps quota
accounting and cancellation deterministic. More jobs may remain queued.

## Processing Modes

### Precise mode (default)

1. Validate the file extension, MIME type, size, and FFprobe result.
2. Copy the selected file into the private job directory using a randomized job ID.
3. Extract the original audio as mono 16 kHz PCM/WAV for Gemini and preserve a
   full-duration WAV as the original-audio output.
4. Use FFmpeg `silencedetect` to derive speech islands. Merge tiny gaps and split
   segments at conservative maximum durations.
5. Stream each speech island to Gemini Live in 20–100 ms PCM chunks at real-time speed.
6. Enable input and output transcription. Collect source transcript, translated
   transcript, translated PCM, usage metadata, and generation-complete signals.
7. Associate the completed response with the known source segment window. Live does
   not provide a timestamp contract, so the local source window is authoritative.
8. Measure translated audio duration. Trim leading/trailing silence, then fit it into
   the source window with this order:
   - add silence when shorter;
   - use FFmpeg `atempo` within a configurable safe range when moderately longer;
   - split on detected pauses and fit subparts when substantially longer;
   - as a last resort, cap to the window with a short fade and record a warning.
9. Place the fitted PCM at the segment start in a full-duration dubbed WAV. All gaps
   remain silence, so the dubbed file shares the video's timeline exactly.
10. Write source and translated SRT cues using the authoritative segment windows.

To avoid compounding Live context, rotate the WebSocket after either 45 seconds of
source speech, five completed activities, a GoAway notification, or a quota-triggered
pause. A job resumes from the last committed segment after reconnecting.

### Fast mode

1. Extract and stream the entire audio continuously at real-time speed.
2. Display translated audio and transcripts as soon as they arrive.
3. Record the input clock, output clock, VAD events, and observed first-audio latency.
4. After streaming ends, remove the global initial delay and correct gradual drift.
5. Generate the same four outputs, but do not perform per-cue duration fitting.

Fast mode is suitable for early preview. It may have less accurate dialogue boundaries,
and the UI must state that clearly.

## Gemini Live Protocol

Use `gemini-3.5-live-translate-preview` with:

- audio response modality;
- input audio transcription;
- output audio transcription;
- `TranslationConfig.target_language_code`;
- automatic native Live Translate voice replication;
- explicit source language when the user selects it, otherwise automatic detection;
- 16 kHz signed 16-bit little-endian mono input;
- 24 kHz signed 16-bit little-endian mono output;
- realtime input chunks between 20 and 100 ms;
- generation-complete, interruption, GoAway, and close/error handling.

The worker must serialize WebSocket frames and accept text, bytes, and Blob-equivalent
payloads consistently. The extension's existing Blob regression test remains required.

## Token Budget

The user's ceiling is 20,000 tokens per minute. Google evaluates quotas at project
level and does not publish a contract that lets a client guarantee project-wide usage
when other applications use the same project. Dubira therefore guarantees a lower
local dispatch ceiling for its own traffic and clearly documents the external-traffic
exception.

Rules:

- Use a central rolling 60-second ledger for all desktop Live sessions.
- The local hard ceiling is 15,000 accounted tokens per rolling minute.
- Reserve input audio, expected output audio, transcription text, retained context,
  and retry cost before starting an activity.
- Never send media faster than real time.
- Read `LiveServerMessage.usage_metadata`; reconcile reservations using deltas from
  cumulative usage rather than summing cumulative totals.
- Pause before the next segment when the next reservation would cross the ceiling.
- Route SDK retries and reconnect replays through the same reservation path.
- Rotate short sessions to bound context reprocessing.
- Display `processing`, `quota wait`, and the estimated resume time in the UI.
- File processing and live desktop dubbing are mutually exclusive by default. This is
  simpler and prevents two independent desktop streams from sharing the budget.
- The independent extension maintains its own conservative session meter. The docs
  warn that simultaneous use of the extension and desktop app with the same Google
  project cannot be coordinated without a shared backend.

The quota unit tests use a fake monotonic clock and cover window expiration,
reservation rejection, retries, usage reconciliation, and cancellation during a wait.

## API and Job State

Add these endpoints:

- `POST /api/media/jobs` — multipart upload plus settings; returns the job snapshot.
- `GET /api/media/jobs/{id}` — state, progress, warnings, and output availability.
- `POST /api/media/jobs/{id}/cancel` — cooperative cancellation.
- `DELETE /api/media/jobs/{id}` — delete a completed/cancelled local job.
- `GET /api/media/jobs/{id}/video` — range-capable local video response.
- `GET /api/media/jobs/{id}/outputs/{name}` — allowlisted output download.
- `GET /api/media/jobs/{id}/subtitles/{track}.vtt` — generated WebVTT for the player.

Job states are:

```text
queued -> probing -> extracting -> translating -> aligning -> ready
                              \-> quota_wait
any active state -> cancelling -> cancelled
any active state -> failed
```

The HTTP layer validates job IDs and allowlists filenames. It never accepts arbitrary
paths. Uploads use streaming writes and a configurable maximum size; partial files are
removed on validation failure or cancellation.

## User Interface

Extend the existing bilingual dashboard rather than adding a second application.

### Media workspace

- Drag-and-drop/file picker with supported-format and size guidance.
- Target language and mode selectors, an automatic-voice explanation, and an explicit
  “Precise (recommended)” default.
- Progress stages, elapsed time, estimated remaining time, quota-wait countdown,
  cancel button, retry button, and concise recoverable errors.
- Four individual download actions plus one ZIP download.
- Recent local jobs with resume/open/delete actions.

### Player

Use native `<video>`, one synchronized `<audio>` element for the dub, and native text
tracks generated from VTT. The video clock is authoritative.

- Original sound toggle and volume.
- Dubbed sound toggle and volume.
- Source subtitle toggle.
- Translated subtitle toggle.
- Both subtitles may be shown simultaneously in separate styled regions.
- Seeking updates both elements immediately.
- During playback, drift below 40 ms is ignored, medium drift receives a temporary
  0.98–1.02 playback-rate correction, and larger drift triggers a hard seek.
- Pause, play, seeking, speed changes, and ended events remain mirrored.
- Original audio off/dub on is the initial state to prevent overlapping speech.

All Persian text is RTL and all English/source-Latin text is LTR. The UI uses the
existing local Vazirmatn font files and keeps accessible labels, focus states, keyboard
operation, and reduced-motion behavior.

## Audio Setup Guide

Replace the fake Volume Mixer illustration with the supplied Windows screenshot,
copied into `docs/images` and the packaged static assets with an optimized derivative.
The bilingual guide must annotate this exact route:

- Google Chrome output: `Speakers (AMM Virtual Audio Device)`
- Dubira input: `Microphone (AMM Virtual Audio Device)`
- Dubira output: `Default` or physical headphones/speakers
- Never route Dubira output back to the AMM virtual device.
- Desktop live dubbing needs the virtual route.
- Uploaded-video processing does not need the virtual route.
- The independent extension does not need the virtual route.

README and both installation guides repeat the same distinction and link to the visual
guide.

## Failure Handling

- Invalid/unsupported/corrupt files fail before a Gemini connection is opened.
- Missing FFmpeg shows a direct installation/bundling error and does not start a job.
- API authentication and location errors reuse the existing user-facing handling.
- `429`, `408`, and `5xx` retries use bounded exponential backoff with jitter and quota
  reservation; other 4xx responses fail immediately.
- Connection loss commits only completed segments and resumes at the next segment.
- Empty transcripts or audio receive a bounded retry, then a per-segment warning.
- Cancelling closes Gemini, terminates the exact FFmpeg child process, preserves
  completed outputs for inspection, and marks the manifest cancelled.
- Application restart changes interrupted active jobs to paused/recoverable rather
  than failed.

## Security and Privacy

- The API key remains in the existing desktop key store or environment configuration.
- The full video never leaves the computer.
- Extracted PCM is sent directly to Google's Live API through the configured proxy.
- Uploaded filenames are never used as directory names.
- API responses and exception messages are sanitized before persistence or display.
- Media endpoints bind to localhost and apply strict allowlists and path containment.
- Job deletion removes only a verified child directory of the media-job root.

## Testing and Acceptance

### Automated

- Unit tests for silence-window normalization, subtitle generation, duration fitting,
  range parsing, manifest recovery, job state transitions, quota accounting, and path
  containment.
- Gemini protocol tests with recorded fake Live messages, including transcript deltas,
  PCM output, usage metadata, GoAway, reconnect, empty output, and Blob frames.
- API tests for upload validation, status, cancellation, downloads, range responses,
  traversal rejection, and cleanup.
- Browser tests for bilingual labels, RTL/LTR, mode default, audio/subtitle toggles,
  seeking, drift correction, and job-progress states.
- Existing desktop and extension tests must remain green.

### Manual

Use a generated, redistributable test video containing speech, silence, and a visible
timecode. Run both modes and verify:

- all four outputs are non-empty and match the video duration;
- SRT files parse and contain monotonic cues within duration;
- original and dubbed WAV files have valid headers/sample rates;
- player play/pause/seek/rate changes keep dub drift within the documented threshold;
- original/dubbed audio and both subtitles toggle independently;
- Persian/English UI direction remains correct at desktop and narrow widths;
- cancellation, proxy failure, invalid key, network loss, and restart recovery;
- the token ledger never dispatches beyond its 15,000-token local rolling limit;
- the supplied Windows screenshot and exact AMM route are legible in both languages;
- the standalone extension still starts, translates, records, downloads four files,
  and reports errors without the desktop app installed.

The final handoff reports automated commands, manual scenarios, observed limitations,
and any step that requires the user to interact with Chrome permission UI.

## Explicit Non-goals

- Phoneme-level lip sync or face/lip generation.
- Cloud job storage, accounts, collaboration, or remote queues.
- More output formats until WAV/SRT and the local player are proven reliable.
- A fifth pre-muxed video output; the requested four files and player cover playback.
- Using any Gemini model other than `gemini-3.5-live-translate-preview` for AI work.

## Official References

- Gemini 3.5 Live Translate model: <https://ai.google.dev/gemini-api/docs/models/gemini-3.5-live-translate-preview>
- Live Translate guide: <https://ai.google.dev/gemini-api/docs/live-api/live-translate>
- Live API capabilities: <https://ai.google.dev/gemini-api/docs/live-api/capabilities>
- Live session management: <https://ai.google.dev/gemini-api/docs/live-api/session-management>
- Live API best practices: <https://ai.google.dev/gemini-api/docs/live-api/best-practices>
- Live WebSocket reference: <https://ai.google.dev/api/live>
- Gemini rate limits: <https://ai.google.dev/gemini-api/docs/rate-limits>
