# Security policy

## Supported versions

Security fixes are applied to the latest release.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's **Report a vulnerability** private advisory flow for this repository. Include the affected version, reproduction steps, impact, and any suggested mitigation. You should receive an acknowledgement within seven days.

## Local trust boundary

LingoDub listens only on `127.0.0.1:8765`. Do not expose or reverse-proxy this port to a network. The browser extension may connect only to this loopback endpoint. Keep downloaded builds and virtual audio drivers from trusted sources.

API keys are stored by the Windows keyring or loaded from a private `.env`. Never attach `.env`, logs containing credentials, or private recordings to an issue.
