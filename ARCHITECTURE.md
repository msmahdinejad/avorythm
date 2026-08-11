# Architecture

LingoDub is a local-first Windows application. A small companion process owns credentials, cloud traffic, desktop audio, recordings, and the dashboard. A Manifest V3 extension owns browser-tab capture and playback.

## Module boundaries

| Module | Owns | Does not own |
|---|---|---|
| `ConfigStore` | Settings, `.env` fallback, OS keyring, proxy environment | HTTP or Gemini calls |
| `AudioEngine` | WASAPI loopback capture, PCM conversion, mixed playback | Translation policy |
| `GeminiGateway` | Google SDK types and Live/TTS protocol | Devices, persistence, UI |
| `DubRuntime` | Desktop session lifecycle and coordination | SDK or PortAudio internals |
| `ExtensionBridge` | Local WebSocket sessions for captured tabs | Browser capture APIs |
| `SessionRecorder` | Aligned WAV/SRT files and ZIP archive | Playback or translation |
| FastAPI app | Local HTTP contract and static dashboard | Business loops |

## Browser-tab sequence

```mermaid
sequenceDiagram
    actor User
    participant Popup as Extension popup
    participant SW as Service worker
    participant Offscreen as Offscreen AudioWorklet
    participant Companion as Local companion
    participant Gemini as Gemini Live Translate
    User->>Popup: Start dubbing
    Popup->>SW: Start with target/voice/mix
    SW->>Offscreen: Tab stream ID
    Offscreen->>Offscreen: Capture tab; replace direct playback
    Offscreen->>Companion: 16 kHz mono PCM / WebSocket
    Companion->>Gemini: Live PCM stream
    Gemini-->>Companion: 24 kHz PCM + transcripts
    Companion-->>Offscreen: Dubbed PCM
    Offscreen->>Offscreen: Dub-only, original-only, or auto-duck mix
    Companion-->>Popup: Transcript/status updates
```

## Security model

- The server binds to the fixed loopback endpoint `127.0.0.1:8765`.
- WebSocket capture accepts extension origins only.
- The API key is read from Windows Credential Manager or `GEMINI_API_KEY`; it is never serialized in settings or returned to clients.
- Recording download paths use an allowlist and single-component session IDs.
- The extension has no arbitrary-site content script and requests only `activeTab`, `tabCapture`, `offscreen`, `storage`, and localhost access.

## Audio contracts

- Input: signed 16-bit little-endian PCM, mono, 16 kHz, 100 ms chunks.
- Output: signed 16-bit little-endian PCM, mono, 24 kHz.
- Browser capture uses an AudioWorklet for real-time downsampling off the UI thread.
- Desktop capture uses callback queues so PortAudio callbacks never block on network work.

## Intentional constraints

The browser extension targets Chrome and Edge 116+. Desktop capture targets Windows 10/11. No frontend framework or JavaScript build pipeline is used: the UI is small, CSP-safe, and directly loadable as an unpacked extension.
