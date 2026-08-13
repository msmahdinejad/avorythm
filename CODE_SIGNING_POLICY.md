# Code signing policy

Free code signing provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

Lingora's official Windows installer is built from this public repository on GitHub-hosted runners. After SignPath Foundation accepts the project and provisions its signing configuration, GitHub Actions will submit the installer to SignPath for origin verification and manual approval before publication. Until that approval is complete, a release asset must not be described as SignPath-signed.

## Roles

- Committer and reviewer: [Mohammad Saleh Mahdinejad](https://github.com/msmahdinejad)
- Release signing approver: [Mohammad Saleh Mahdinejad](https://github.com/msmahdinejad)

The maintainer must use multi-factor authentication for both GitHub and SignPath. Every signing request requires manual approval.

## Artifact and origin rules

- Only `Lingora-Setup-x64.exe` built by the repository's tag-triggered GitHub Actions workflow is eligible.
- The signed file must identify the product as `Lingora Live Translator` (brand: Lingora) and use the release version consistently for file and product metadata.
- Bundled third-party binaries are not signed as Lingora-owned code.
- The release workflow publishes the Windows installer only after the SignPath request succeeds; unsigned artifacts remain CI-only.
- Release checksums are generated from the final signed artifact.

## Privacy

See the [Lingora privacy policy](PRIVACY.md). Network processing occurs only after an explicit user action. The installer displays the privacy policy before installation, and no API credential is bundled with Lingora.

Google Gemini and Groq process user-requested API traffic under their own policies:

- [Google Privacy Policy](https://policies.google.com/privacy)
- [Groq Privacy Policy](https://groq.com/privacy-policy/)

## Verification

After a signed release is published, verify the installer in PowerShell:

```powershell
Get-AuthenticodeSignature .\Lingora-Setup-x64.exe | Format-List Status,StatusMessage,SignerCertificate,TimeStamperCertificate
```

The expected status is `Valid`; the signer certificate is issued to SignPath Foundation. Also compare the file's SHA-256 digest with `SHA256SUMS.txt` from the same GitHub Release.
