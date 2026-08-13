# Gemini 3.5 Live Translate for Uploaded Media

> Historical research retained for context. Lingora 0.6.0 uses Groq Whisper for file transcription, Gemini 3.1 Flash Lite for translation, and Gemini 3.1 Flash Live for speech.

Research checked against official Google documentation on 2026-08-11.

## Findings

- `gemini-3.5-live-translate-preview` accepts audio and returns translated audio plus
  input/output transcription. It is Live-only: Batch API and structured output are not
  supported.
- Live Translate is continuous audio translation, not a deterministic uploaded-file
  API. Lingora must stream extracted PCM and create file/timeline semantics locally.
- Google recommends 20–100 ms realtime audio chunks and 16 kHz input.
- Audio-only sessions are limited to roughly 15 minutes without context compression;
  a WebSocket connection lasts roughly 10 minutes. GoAway, session resumption, and
  reconnect handling are required for long media.
- Live context is billed repeatedly as it grows. Short rotating sessions are therefore
  safer than one movie-length context.
- `LiveServerMessage.usage_metadata` exposes prompt, response, and total token counts.
  A governor can reconcile local estimates with reported usage, but cannot control
  calls made by another application using the same Google project.
- Gemini quotas are applied per project rather than per API key and vary by model/tier.
  Google does not publish a contract that permits a strict project-wide guarantee from
  one independent client.
- Live transcription has no documented word- or cue-timestamp accuracy contract.
  Cue-level synchronization must use local audio windows and duration fitting.

## Consequences for Lingora

- All AI work stays on `gemini-3.5-live-translate-preview`.
- FFmpeg locally extracts PCM, detects silence, measures duration, fits audio, and
  produces WAV/SRT files.
- Precise mode sends known speech windows sequentially and assigns returned audio and
  transcripts to those windows.
- Fast mode streams continuously and applies global delay/drift correction.
- Sessions rotate frequently and all desktop Gemini traffic passes through a shared
  rolling token governor with a 15,000-token local ceiling below the requested 20,000.
- The full video stays local; only extracted audio is transmitted to Google.

## Official Sources

- <https://ai.google.dev/gemini-api/docs/models/gemini-3.5-live-translate-preview>
- <https://ai.google.dev/gemini-api/docs/live-api/live-translate>
- <https://ai.google.dev/gemini-api/docs/live-api/capabilities>
- <https://ai.google.dev/gemini-api/docs/live-api/session-management>
- <https://ai.google.dev/gemini-api/docs/live-api/best-practices>
- <https://ai.google.dev/api/live>
- <https://ai.google.dev/gemini-api/docs/rate-limits>
