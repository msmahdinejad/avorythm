# SignPath Foundation application — Lingora

This worksheet contains ready-to-paste application values and the post-approval configuration for Lingora.

## Application values

| Field | Value |
|---|---|
| **Project Name*** | `Lingora Live Translator` |
| **Repository URL*** | `https://github.com/msmahdinejad/lingora` |
| **Homepage URL*** | `https://github.com/msmahdinejad/lingora` |
| **Download URL** | `https://github.com/msmahdinejad/lingora/releases/latest` |
| **Privacy Policy URL** | `https://github.com/msmahdinejad/lingora/blob/main/PRIVACY.md` |
| **Wikipedia URL** | Leave blank. |
| **Tagline*** | `Live AI translation, dubbing, and subtitles for desktop audio, browser tabs, and uploaded media.` |
| **Maintainer Type** | `Individual maintainer(s)` |
| **Build System** | `GitHub Actions` |
| **First Name*** | `Mohammad Saleh` |
| **Last Name*** | `Mahdinejad` |
| **Email*** | `msmahdinejad@gmail.com` |
| **Company Name** | `University of Isfahan` only if this is a current, accurate affiliation that the applicant wants to disclose; otherwise leave blank. |
| **Primary Discovery Channel*** | `AI/LLM tools` |
| **Exact source** | `OpenAI ChatGPT / Codex` |

Use this description:

```text
Lingora is an open-source desktop application and browser extension that translates live audio and uploaded media, presents synchronized original and translated subtitles, and can generate translated speech. Processing starts only when the user selects a source, and users provide their own supported AI-service credentials.
```

Use this reputation answer now; do not invent adoption:

```text
Lingora is a newly released open-source project. Its public repository includes tagged releases, reproducible GitHub Actions builds for Windows, macOS and Linux, automated tests, a security policy, a privacy policy, contribution guidelines and published SHA-256 checksums.

Release history: https://github.com/msmahdinejad/lingora/releases
CI history: https://github.com/msmahdinejad/lingora/actions
Commit history: https://github.com/msmahdinejad/lingora/commits/main
Security policy: https://github.com/msmahdinejad/lingora/security/policy
Code signing policy: https://github.com/msmahdinejad/lingora/blob/main/CODE_SIGNING_POLICY.md
```

## Important eligibility notes

- SignPath asks for a project name that a Google search clearly identifies. `Lingora` has unrelated existing results, so the application value uses the more specific `Lingora Live Translator` while keeping the product brand Lingora.
- The repository is new and currently has little independent reputation evidence. SignPath requires a certain verifiable reputation for downloadable executables but publishes no numeric threshold; acceptance is discretionary. The technical application is ready, but genuine users, downloads, stars, community discussions, or independent mentions will materially improve acceptance.
- Confirm that GitHub and SignPath MFA are enabled before applying.
- Confirm the personal/account values above before submitting. Company is optional and must not imply that the university maintains or endorses Lingora unless that is true.

## Public policy requirements completed in the repository

The repository homepage and release workflow use the heading **Code signing policy** and the required sentence:

> Free code signing provided by SignPath.io, certificate by SignPath Foundation

The canonical policy is [CODE_SIGNING_POLICY.md](../CODE_SIGNING_POLICY.md). It lists the committer/reviewer, release approver, privacy policy, origin rules, manual approval requirement, and verification command. The Windows installer displays `PRIVACY.md` before installation and has a normal uninstaller.

## After SignPath accepts the project

1. Install/authorize the SignPath GitHub App for `msmahdinejad/lingora` if SignPath requests it.
2. Add GitHub.com as the Trusted Build System and link this repository.
3. Create the SignPath project and release signing policy with origin verification and mandatory manual approval.
4. Upload a real unsigned `Lingora-Setup-x64.exe`, create/validate the artifact configuration, and use [`.signpath/artifact-configuration.xml`](../.signpath/artifact-configuration.xml) as the reviewed starting point.
5. Create a dedicated SignPath submitter token.
6. Add repository secret `SIGNPATH_API_TOKEN`.
7. Add repository variables:
   - `SIGNPATH_ENABLED=true`
   - `SIGNPATH_ORGANIZATION_ID=<assigned organization id>`
   - `SIGNPATH_PROJECT_SLUG=<assigned project slug>`
   - `SIGNPATH_SIGNING_POLICY_SLUG=<assigned release policy slug>`
   - `SIGNPATH_ARTIFACT_CONFIGURATION_SLUG=<assigned artifact configuration slug>`
8. Push a reviewed `vMAJOR.MINOR.PATCH` tag. The workflow uploads the unsigned installer only as an internal Actions artifact, waits for SignPath, validates the returned Authenticode signature, and publishes only the signed installer.
9. Verify the GitHub Release installer on a clean Windows system:

```powershell
Get-AuthenticodeSignature .\Lingora-Setup-x64.exe | Format-List Status,StatusMessage,SignerCertificate,TimeStamperCertificate
Get-FileHash .\Lingora-Setup-x64.exe -Algorithm SHA256
```

Without `SIGNPATH_ENABLED=true`, the workflow deliberately removes the unsigned installer before publishing. Cross-platform ZIP builds and the extension ZIP can still be released, but no unsigned Windows installer is exposed as a final release asset.

## Official sources

- [SignPath Foundation application](https://signpath.org/apply.html)
- [Foundation conditions](https://signpath.org/terms.html)
- [GitHub Trusted Build System](https://docs.signpath.io/trusted-build-systems/github)
- [Artifact configuration](https://docs.signpath.io/artifact-configuration/)
- [Artifact reference](https://docs.signpath.io/artifact-configuration/reference)
