# Security policy

## Supported versions

Security fixes are applied to the latest release.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's **Report a vulnerability** private advisory flow for this repository. Include the affected version, reproduction steps, impact, and any suggested mitigation. You should receive an acknowledgement within seven days.

## Desktop trust boundary

The Windows app listens only on `127.0.0.1:8765`. Do not expose or reverse-proxy this port to a network. The standalone browser extension never connects to that port. Keep downloaded builds and virtual audio drivers from trusted sources.

API keys are stored by the Windows keyring or loaded from a private `.env`. Never attach `.env`, logs containing credentials, or private recordings to an issue.

## Extension trust boundary

The extension connects directly to `generativelanguage.googleapis.com` and has no arbitrary-site or localhost host permission. A user-provided Gemini key is held in `chrome.storage.session`, is not synced, and clears when the browser fully exits. It is sent only to Google's Gemini endpoints.

Google recommends short-lived ephemeral tokens for production client-to-server Live API applications. Before a public Web Store launch at scale, replace direct BYOK with an authenticated token broker; see [the Chrome Web Store checklist](docs/CHROME_WEB_STORE.md).
