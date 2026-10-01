# Security policy

## Supported versions

Security fixes are applied to the latest release.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's **Report a vulnerability** private advisory flow for this repository. Include the affected version, reproduction steps, impact, and any suggested mitigation. You should receive an acknowledgement within seven days.

## Desktop trust boundary

The Windows app listens only on `127.0.0.1:8765`. Do not expose or reverse-proxy this port to a network. The standalone browser extension never connects to that port. Keep downloaded builds and virtual audio drivers from trusted sources.

Gemini and Groq API keys are stored separately in the operating-system keyring. Never attach credentials, logs containing credentials, or private recordings to an issue.

Uploaded videos, extracted audio, subtitles, job manifests, and archives stay in the local Avorythm data directory. Media endpoints validate job IDs and allowlist filenames. After an explicit request, FLAC chunks go to Groq Whisper, transcript text to Gemini translation, and translated text to Gemini Live narration. Delete a Media Studio job to remove its local source and outputs.

## Extension trust boundary

The extension connects directly to `generativelanguage.googleapis.com` and optionally `api.groq.com`, and has no arbitrary-site or localhost host permission. User-provided keys are held in `chrome.storage.session` by default and clear when the browser fully exits or the extension is reloaded, disabled, or updated. Each provider's **Remember key on this device** option can explicitly persist a copy in `chrome.storage.local`. These copies are not encrypted by the extension and never use Chrome Sync; the UI discourages enabling this on shared devices. Both storage areas are restricted to `TRUSTED_CONTEXTS`, and only extension pages can change credential storage. Turning persistence off deletes the disk copy, clearing a key deletes both copies, and resetting settings deletes remembered copies.

The extension never embeds a maintainer-owned credential. Its bring-your-own-key flow is explicitly user-configured, session-only by default, and uses direct official provider endpoints. Extension content scripts cannot read the key storage or enable persistence. Local persistence does not protect a key from someone who can read the browser profile on disk. Users should restrict the Gemini key to the Gemini API, monitor usage, and rotate keys if exposure is suspected. Any future operator-managed credential flow must use an authenticated token broker and keep the long-lived credential server-side.
