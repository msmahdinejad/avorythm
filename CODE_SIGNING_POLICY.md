# Code signing policy

Free code signing provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

Avorythm's official Windows installer is built from this public repository on GitHub-hosted runners. After SignPath Foundation accepts the project and provisions its signing configuration, GitHub Actions will submit the installer to SignPath for origin verification and manual approval before publication. Until that approval is complete, a release asset must not be described as SignPath-signed.

## Roles

- Committer and reviewer: [Mohammad Saleh Mahdinejad](https://github.com/msmahdinejad)
- Release signing approver: [Mohammad Saleh Mahdinejad](https://github.com/msmahdinejad)

The maintainer must use multi-factor authentication for both GitHub and SignPath. Every signing request requires manual approval.

## Artifact and origin rules

- Only `Avorythm-Setup-x64.exe` built by the repository's tag-triggered GitHub Actions workflow is eligible.
- The signed file must identify the product as `Avorythm Live Translator` (brand: Avorythm) and use the release version consistently for file and product metadata.
- Bundled third-party binaries are not signed as Avorythm-owned code.
- While the Foundation application is pending, an installer may be published only with the explicit `-unsigned.exe` suffix and an unrecognized-publisher warning in the release notes.
- After SignPath is enabled, the workflow publishes `Avorythm-Setup-x64.exe` only after signing succeeds; it never substitutes an unsigned file under that name.
- Release checksums are generated from the final public artifacts.

## Privacy

See the [Avorythm privacy policy](PRIVACY.md). Network processing occurs only after an explicit user action. The installer displays the privacy policy before installation, and no API credential is bundled with Avorythm.

Google Gemini and Groq process user-requested API traffic under their own policies:

- [Google Privacy Policy](https://policies.google.com/privacy)
- [Groq Privacy Policy](https://groq.com/privacy-policy/)

## Verification

After a signed release is published, verify the installer in PowerShell:

```powershell
Get-AuthenticodeSignature .\Avorythm-Setup-x64.exe | Format-List Status,StatusMessage,SignerCertificate,TimeStamperCertificate
```

The expected status is `Valid`; the signer certificate is issued to SignPath Foundation. Also compare the file's SHA-256 digest with `SHA256SUMS.txt` from the same GitHub Release.
