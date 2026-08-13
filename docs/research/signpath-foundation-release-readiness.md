# SignPath Foundation release-readiness research

> Historical audit snapshot: this report records the gaps found before the `1.0.0` release hardening. Current application values and post-approval steps are maintained in [`docs/SIGNPATH_APPLICATION.md`](../SIGNPATH_APPLICATION.md).

**Research date:** 2026-08-13  
**Scope:** SignPath Foundation eligibility, application data, mandatory public wording, signing configuration, and GitHub Actions integration for Lingora.  
**Source policy:** Requirements below come only from official SignPath Foundation and SignPath documentation. Lingora-specific facts come from this repository and its public GitHub metadata.

## Executive conclusion

Lingora is technically close to being integrable with SignPath, but it is **not yet a strong Foundation application**. The release is public, MIT-licensed, documented, built on GitHub-hosted runners, and has a privacy policy and uninstaller. The remaining hard gaps are:

1. **Reputation:** SignPath requires verifiable reputation for downloadable executables but publishes no numeric threshold. As of this review the repository is only two days old, has 0 stars and 0 forks, and its release assets have very few downloads. Acceptance is discretionary; these facts make an immediate application high risk.
2. **Discoverability/name collision:** the application says a Google search for the project name should clearly identify it. Searching `Lingora` currently returns established, unrelated language-learning products before this repository. Use a distinct application name such as **“Lingora Live Translator”** and wait until the repository/project page is indexed, or reconsider the brand before applying.
3. **Stale homepage metadata:** the GitHub repository homepage currently points to `https://github.com/msmahdinejad/dubira`, not Lingora.
4. **Missing public code-signing policy:** the homepage and every download/release page need the required SignPath wording, named roles, and privacy link.
5. **Installer metadata:** the published `Lingora-Setup-x64.exe` has `ProductName=Lingora` and `ProductVersion=0.9.1`, but its Windows `FileVersion` is blank. SignPath Foundation requires signed-binary product-name metadata and consistent product-version metadata to be set and enforced.
6. **Signing workflow:** the current release workflow publishes the unsigned installer directly. It needs a SignPath request between building and publishing, and the release job must consume only the returned signed installer.
7. **Human-only application data:** legal first name, last name, email, exact discovery source, team-role membership, and MFA status cannot be inferred and must be supplied or confirmed by the maintainer.

These gaps should be fixed before submission. Even after technical completion, approval is not guaranteed because SignPath explicitly reserves final acceptance discretion and requires a certain verifiable reputation for executable projects. [Foundation conditions and common misunderstandings](https://signpath.org/terms.html)

## 1. Official eligibility requirements

### Base free OSS subscription

The project must:

- contain no malware or potentially unwanted programs;
- use an OSI-approved license, without commercial dual licensing, for all components;
- contain no proprietary project components (system libraries are allowed);
- be actively maintained;
- already be released in the form that will be signed; and
- document its functionality on the download page or platform app-store entry.

Source: [SignPath Foundation conditions for Open Source projects](https://signpath.org/terms.html).

### Additional Foundation-certificate conditions

When the certificate is supplied by SignPath Foundation:

- the certificate and publisher identity belong to **SignPath Foundation**, not the maintainer or project;
- the team that owns and maintains the source repository and build scripts must be the signing team;
- only binaries built from that team's source may be signed;
- unsigned upstream OSS binaries may be included in the package, but must not be signed as if they were Lingora's own binaries;
- hacking, vulnerability-exploitation, and security-circumvention tools are excluded;
- system changes must be announced and installation must have an uninstall path;
- all team members must use MFA for both SignPath and the source-code host;
- the project must define Authors/committers, Reviewers, and signing Approvers;
- every release signing request needs manual approval;
- signed artifacts must be verifiably built from repository source; build scripts and CI configuration are part of that reviewed source; and
- all signed-binary product-name metadata must identify the project, while product-version metadata must use the same value within a build.

SignPath may pause service or revoke a certificate for policy violations. Sources: [Foundation conditions](https://signpath.org/terms.html), [SignPath project and signing-policy setup](https://docs.signpath.io/projects), and [origin verification](https://docs.signpath.io/origin-verification/).

### Privacy obligations

If software collects user data and transfers it to systems not specified by the user, the Foundation requires the behavior to be described in a privacy policy, the policy to be displayed during installation, and an installation option to disable those functions. Relevant third-party service privacy policies must also be disclosed when users are affected. [Foundation conditions: end-user interactions and website policy](https://signpath.org/terms.html)

Lingora explicitly transfers user-selected audio/text to Google Gemini and, for uploaded media, Groq. Its public `PRIVACY.md` describes that flow. For the strongest review posture, the installer should visibly link or display the privacy policy before installation, and the application should continue to require an explicit user action before any transfer.

## 2. Required public acknowledgement and code-signing policy

The project homepage and download/release pages must use the exact heading or link text **“Code signing policy”** and include:

> Free code signing provided by SignPath.io, certificate by SignPath Foundation

They must also identify the team roles and members and link the privacy policy. This is not merely a badge requirement; the policy must be visible from both the homepage and download/release experience. [Official Foundation website/repository conditions](https://signpath.org/terms.html)

Recommended dedicated policy content:

```markdown
## Code signing policy

Free code signing provided by [SignPath.io](https://signpath.io/),
certificate by [SignPath Foundation](https://signpath.org/).

- Committer and reviewer: Mohammad Saleh Mahdinejad
- Release signing approver: Mohammad Saleh Mahdinejad
- Privacy policy: [PRIVACY.md](../../PRIVACY.md)

Release artifacts are built from the public repository by GitHub Actions.
SignPath verifies their source and build origin before code signing. Each
release signing request requires manual approval.
```

Use the real membership/role links if a GitHub organization or team is created. A single maintainer may fill more than one role only if SignPath accepts that structure; do not invent additional members.

Recommended placement:

- `CODE_SIGNING_POLICY.md` as the canonical policy;
- a visible **Code signing policy** section/link in `README.md`;
- the same heading/link and official sentence in every signed GitHub Release body; and
- the application Download URL should point to a stable download page that already contains this wording, not to an unannotated releases listing.

## 3. Application form: required fields and Lingora draft

The live [SignPath Foundation application](https://signpath.org/apply.html) currently requests the following. Fields marked `*` are required by the form.

| Field | Required | Lingora draft / action |
|---|---:|---|
| Project Name | Yes | **Lingora Live Translator** is more search-distinct than `Lingora`, but submit only after it clearly finds the project in Google. Keep product branding consistent if SignPath requests it. |
| Repository URL | Yes | `https://github.com/msmahdinejad/lingora` |
| Homepage URL | Yes | Use `https://github.com/msmahdinejad/lingora` until a dedicated official page exists. First correct the repository's stale Homepage field. |
| Download URL | No, but expected | `https://github.com/msmahdinejad/lingora/releases/latest` only after release bodies include the mandatory policy wording; otherwise use a README download anchor that does. |
| Privacy Policy URL | Required when data is collected | `https://github.com/msmahdinejad/lingora/blob/main/PRIVACY.md` |
| Wikipedia URL | No | Leave blank; no English Wikipedia article is known. |
| Tagline | Yes | `Live AI translation, dubbing, and subtitles for desktop audio, browser tabs, and uploaded media.` |
| Description | Yes | `Lingora is an open-source desktop application and browser extension that translates live audio and uploaded media, presents synchronized original and translated subtitles, and can generate translated speech. Processing starts only when the user selects a source, and users provide their own supported AI-service credentials.` |
| Reputation | Yes | Be candid: link the public repository, release history, CI runs, security policy, and any real third-party coverage or community discussion. Do **not** claim wide adoption without evidence. Current stars/forks/downloads are weak evidence, so build reputation before applying. |
| Maintainer Type | Form choice | Likely `Individual maintainer(s)` based on the current personal GitHub repository; maintainer must confirm. |
| Build System | Form choice | `GitHub Actions` |
| First Name | Yes | Maintainer must provide legal/desired account first name. |
| Last Name | Yes | Maintainer must provide legal/desired account last name. |
| Email | Yes | Maintainer must provide an actively monitored address for the SignPath account and approvals. |
| Company Name | No | Leave blank unless a real organization/employer is submitting the project. |
| Primary Discovery Channel | Yes | Maintainer must choose truthfully. Current choices include Organic search, AI/LLM tools, Developer platforms, Community platforms, Social media, Events, Referral, Direct contact, and Other. |
| Exact discovery source | No | Supply the exact truthful source, e.g. `ChatGPT`, a Google query, GitHub page, or referral. |

The live form also requires acceptance of the Code of Conduct/conditions and consent to personal-data processing. The applicant acknowledges that the certificate is issued in SignPath Foundation's name and can be revoked for violations. [Application](https://signpath.org/apply.html) and [Foundation conditions](https://signpath.org/terms.html)

### Reputation answer: safe current wording

Until genuine external evidence exists, use a factual answer rather than overstating adoption:

```text
Lingora is a newly released open-source project. Its public repository includes
tagged releases, reproducible GitHub Actions builds for Windows, macOS and Linux,
automated tests, a security policy, a privacy policy, contribution guidelines and
published SHA-256 checksums. Release history:
https://github.com/msmahdinejad/lingora/releases
CI history:
https://github.com/msmahdinejad/lingora/actions
Security policy:
https://github.com/msmahdinejad/lingora/security/policy
```

This answer is truthful but probably insufficient by itself. The official terms say executable projects need a certain verifiable reputation, provide no public threshold, and leave acceptance to the Foundation. Obtain legitimate users, stars, downloads, issue/discussion activity, independent mentions, or community references before applying. [Official reputation statement](https://signpath.org/terms.html#common-misunderstandings)

## 4. Required SignPath project configuration after approval

1. In SignPath, create/link the project with repository URL `https://github.com/msmahdinejad/lingora`.
2. Add the predefined **GitHub.com** Trusted Build System to the SignPath organization and link it to the project.
3. Configure a release-signing policy with:
   - trusted-build-system verification;
   - origin verification (required for Open Source Code Signing);
   - allowed release origin restricted to `main` and tag-driven builds as accepted by SignPath;
   - an Approver and manual approval for every release; and
   - the Foundation certificate assigned by SignPath.
4. Create a versioned artifact configuration and reference its explicit slug from version-controlled CI.
5. Create a dedicated SignPath CI user/token with submitter permission and store the token as GitHub secret `SIGNPATH_API_TOKEN`.
6. Enable MFA on both GitHub and SignPath for every involved human account.

GitHub origin verification checks repository URL, branch, commit, CI job URL, and whether the build is determined by source-controlled configuration. It also considers critical manual overrides and unverified build caches. Sources: [GitHub Trusted Build System](https://docs.signpath.io/trusted-build-systems/github), [project setup](https://docs.signpath.io/projects), and [origin verification](https://docs.signpath.io/origin-verification/).

The optional `.signpath/policies/<project>/<policy>.yml` source/build-policy feature is documented for Advanced Code Signing and Code Signing Gateway, not Open Source Code Signing. It should not be presented as a Foundation prerequisite. [GitHub source/build policies](https://docs.signpath.io/trusted-build-systems/github#define-policies-for-source-code-and-builds)

## 5. Lingora artifact configuration

The GitHub signing action requires the unsigned file to be uploaded as a GitHub Actions artifact first. `actions/upload-artifact` creates a ZIP by default, so the SignPath artifact configuration needs `<zip-file>` at its root. [Official GitHub integration](https://docs.signpath.io/trusted-build-systems/github)

After fixing the installer's blank `FileVersion`, the starting configuration should be similar to:

```xml
<artifact-configuration xmlns="http://signpath.io/artifact-configuration/v1">
  <parameters>
    <parameter name="version" required="true" />
  </parameters>
  <zip-file>
    <pe-file path="Lingora-Setup-x64.exe"
             product-name="Lingora"
             product-version="${version}"
             file-version="${version}">
      <authenticode-sign
        description="Lingora live translator"
        description-url="https://github.com/msmahdinejad/lingora" />
    </pe-file>
  </zip-file>
</artifact-configuration>
```

Upload a real release installer to SignPath and generate/validate the configuration there before treating this XML as final. SignPath recommends excluding third-party files from project signing, verifying upstream signatures where relevant, using metadata constraints, and parameterizing changing versions. Sources: [artifact configuration overview](https://docs.signpath.io/artifact-configuration/), [syntax](https://docs.signpath.io/artifact-configuration/syntax), [examples and metadata restrictions](https://docs.signpath.io/artifact-configuration/examples), and [Authenticode reference](https://docs.signpath.io/artifact-configuration/reference).

Signing only the outer Inno Setup executable is the smallest configuration that addresses installer trust. If Lingora later intends the installed `Lingora.exe` itself to carry a Foundation signature, discuss a two-stage signing/build flow with SignPath: sign the application executable, build the installer from the signed payload, then sign the installer. Do not sign bundled third-party runtimes or libraries as Lingora-owned binaries.

## 6. GitHub Actions integration pattern

Official minimum sequence:

1. Build `Lingora-Setup-x64.exe` on a GitHub-hosted Windows runner.
2. Upload that unsigned installer with `actions/upload-artifact` v4 or newer and retain the step's `artifact-id` output.
3. Submit the artifact using `signpath/github-action-submit-signing-request@v2`.
4. Wait for manual approval/completion and download the signed result to a clean directory.
5. Upload/publish **only the signed installer** as the release asset.

For OSS projects, every job leading to the signing request must run on GitHub-hosted runners. The SignPath action requires `api-token`, `organization-id`, `project-slug`, `signing-policy-slug`, and `github-artifact-id`; explicitly pinning `artifact-configuration-slug` is recommended for reproducibility. The token used by the action must be able to read GitHub Actions job/artifact data, so Lingora's explicit workflow permissions should include `actions: read` in addition to the existing release permissions. [Official SignPath GitHub action documentation](https://docs.signpath.io/trusted-build-systems/github)

Illustrative step block (placeholders become available only after SignPath approval/configuration):

```yaml
permissions:
  actions: read
  contents: write

steps:
  # Build app and installer first.
  - name: Upload unsigned installer for SignPath
    id: upload-unsigned-installer
    uses: actions/upload-artifact@v7
    with:
      name: signpath-unsigned-installer
      path: dist/Lingora-Setup-x64.exe

  - name: Submit installer to SignPath
    uses: signpath/github-action-submit-signing-request@v2
    with:
      api-token: ${{ secrets.SIGNPATH_API_TOKEN }}
      organization-id: ${{ vars.SIGNPATH_ORGANIZATION_ID }}
      project-slug: lingora
      signing-policy-slug: release-signing
      artifact-configuration-slug: windows-installer-v1
      github-artifact-id: ${{ steps.upload-unsigned-installer.outputs.artifact-id }}
      wait-for-completion: true
      output-artifact-directory: dist/signed
      parameters: |
        version: ${{ toJSON(steps.version.outputs.version) }}
```

The current 35-minute release-job timeout and the action's default 600-second completion timeout may be too short for a human approval. Set a deliberate approval SLA and compatible timeouts after SignPath confirms the intended workflow. Keep the unsigned upload distinct from the final release artifact so the publish job cannot accidentally distribute it.

## 7. Lingora readiness matrix

| Requirement | Current state | Verdict / required action |
|---|---|---|
| Public OSS repository | Public GitHub repository | Pass |
| OSI-approved license | MIT | Pass |
| Already released | Tagged desktop/extension releases exist | Pass |
| Functionality documented | README, installation docs, release assets | Pass |
| Active maintenance | Recent commits/releases | Pass now; ongoing obligation |
| No proprietary project components | Source is public; dependencies need final license/SBOM audit | Verify before application |
| Installer/uninstaller | Inno Setup provides uninstall; optional FFmpeg system change is announced | Pass, subject to manual install QA |
| Privacy policy | Public policy describes Gemini/Groq and local storage | Pass for documentation; add visible installer link/display |
| Required Code signing policy | Not present | Blocker |
| Download-page SignPath wording | Not present | Blocker |
| Named signing roles | Not present | Blocker |
| MFA | Cannot be inspected | Maintainer confirmation required |
| Verifiable reputation | New project, minimal public adoption | Major acceptance risk |
| Search-distinct project name | `Lingora` collides with existing products | Major application risk |
| Correct official homepage metadata | Points to old `dubira` repository | Blocker |
| GitHub-hosted CI | `windows-latest`, `macos-latest`, `ubuntu-latest` | Pass |
| Origin-verifiable signing flow | No SignPath step yet | Required after approval |
| Manual signing approval | Not configured | Required after approval |
| Signed-file metadata | App EXE is complete; installer `FileVersion` is blank | Fix before artifact configuration |
| Signed release publication | Current workflow publishes unsigned installer | Replace with signed-output-only path |

## 8. Submission sequence

1. Correct GitHub Homepage metadata and decide whether `Lingora` is sufficiently distinct or the application should use a consistent, more searchable project name.
2. Add and link a canonical Code signing policy from README and all download/release pages.
3. Add privacy-policy visibility to the installer and re-run installation/uninstallation QA.
4. Set installer `FileVersion` equal to the product/release version and verify Windows version metadata in CI.
5. Audit all shipped dependencies/licenses and retain third-party notices; consider an SBOM even though SignPath describes future SBOM enforcement rather than a current universal requirement.
6. Build genuine external reputation and collect truthful evidence links.
7. Confirm MFA and identify the real committer/reviewer/approver account(s).
8. Submit the Foundation application with the form data above and the maintainer's personal fields.
9. After approval, configure the GitHub.com trusted build system, SignPath project, release policy, manual approver, and artifact configuration.
10. Add the signing request to GitHub Actions, prove that only the returned signed installer reaches GitHub Releases, verify the Authenticode chain/timestamp on a clean Windows machine, and update public wording from “applying” to the exact official provided wording.

## Official sources

- [SignPath Foundation application](https://signpath.org/apply.html)
- [SignPath Foundation conditions for Open Source projects](https://signpath.org/terms.html)
- [SignPath Foundation service overview](https://signpath.org/)
- [SignPath project and signing-policy setup](https://docs.signpath.io/projects)
- [GitHub Trusted Build System and official action](https://docs.signpath.io/trusted-build-systems/github)
- [Origin verification](https://docs.signpath.io/origin-verification/)
- [Artifact configuration overview](https://docs.signpath.io/artifact-configuration/)
- [Artifact configuration syntax](https://docs.signpath.io/artifact-configuration/syntax)
- [Artifact examples and metadata restrictions](https://docs.signpath.io/artifact-configuration/examples)
- [Artifact reference and Authenticode signing](https://docs.signpath.io/artifact-configuration/reference)
- [Official SignPath GitHub action repository](https://github.com/SignPath/github-action-submit-signing-request)
