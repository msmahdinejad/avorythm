# Security policy

## Supported versions

Security fixes are applied to the latest release.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's **Report a vulnerability** private advisory flow for this repository. Include the affected version, reproduction steps, impact, and any suggested mitigation. You should receive an acknowledgement within seven days.

## Desktop trust boundary

The Windows app listens only on `127.0.0.1:8765`. Do not expose or reverse-proxy this port to a network. The standalone browser extension never connects to that port. Keep downloaded builds and virtual audio drivers from trusted sources.

Gemini and Groq API keys are stored separately in the operating-system keyring. Never attach credentials, logs containing credentials, or private recordings to an issue.

Uploaded videos, extracted audio, subtitles, job manifests, and archives stay in the local Lingora data directory. Media endpoints validate job IDs and allowlist filenames. After an explicit request, FLAC chunks go to Groq Whisper, transcript text to Gemini translation, and translated text to Gemini Live narration. Delete a Media Studio job to remove its local source and outputs.

## Extension trust boundary

The extension connects directly to `generativelanguage.googleapis.com` and has no arbitrary-site or localhost host permission. A user-provided Gemini key is held in `chrome.storage.session`, is not synced, and clears when the browser fully exits. It is sent only to Google's Gemini endpoints.

The extension never embeds a maintainer-owned credential. Its current bring-your-own-key flow is explicitly user-configured and session-only; it exchanges the key directly with Google's token endpoint for a constrained, single-use ephemeral Live API token. Any future operator-managed credential flow must use an authenticated token broker and keep the long-lived credential server-side.
