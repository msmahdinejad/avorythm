# Publishing to the Chrome Web Store automatically

Pushing a `v*` tag already builds and publishes the GitHub release. With the one-time setup below the same run also uploads `Avorythm-Extension.zip` to the Chrome Web Store and submits it for review, using the [Chrome Web Store API v2](https://developer.chrome.com/docs/webstore/using-api).

What it automates: upload the package, wait for processing, submit for review. What it cannot: create the item, or edit the description, screenshots and privacy answers — those stay in the [dashboard](https://chrome.google.com/webstore/devconsole/). Google still reviews every submission (usually a few days).

## One-time setup

1. Turn on 2-step verification for the Google account that owns the extension.
2. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable **Chrome Web Store API**.
3. **OAuth consent screen** → External. Fill in the app name and contacts, skip scopes, and add your own email under **Test users**.
4. **Credentials → Create credentials → OAuth client ID** → *Web application*. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI. Note the client ID and secret.
5. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground), click the gear, tick **Use your own OAuth credentials**, and enter the client ID and secret. Authorize the scope `https://www.googleapis.com/auth/chromewebstore` with the account that owns the extension, then **Exchange authorization code for tokens** and copy the **refresh token**.
6. In the dashboard, copy the **publisher ID** (Publisher → Settings). The **extension ID** is the 32-character ID in the item's URL / store link.
7. In the GitHub repository → Settings → *Secrets and variables → Actions*, add these **secrets**: `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_PUBLISHER_ID`, `CWS_EXTENSION_ID`.
8. Add the **variable** `CWS_AUTO_PUBLISH` = `true`. Optionally add `CWS_PUBLISH_TYPE`:
   - `DEFAULT_PUBLISH` (default): goes live right after Google approves it.
   - `STAGED_PUBLISH`: waits after approval until you press publish in the dashboard (valid for 30 days).

The upload job runs in the `chrome-web-store` environment. In Settings → Environments you can require a reviewer there if you want a manual gate before anything is sent.

A refresh token created while the OAuth app is in *Testing* expires after 7 days. Either publish the consent screen to *In production* (Google will show an "unverified app" warning when you authorize; that is expected for your own account) or repeat step 5 when the job reports `invalid_grant`.

## Release flow

```bash
# 1. bump the version everywhere (manifest.json, pyproject.toml, installer.iss, src/avorythm/__init__.py, …) and update CHANGELOG.md
# 2. merge to main, then tag
git tag v1.2.3 && git push origin v1.2.3
```

The release workflow builds the installers and the extension ZIP, publishes the GitHub release, then the `webstore` job uploads and submits the ZIP.

## Run it by hand

```bash
export CWS_CLIENT_ID=… CWS_CLIENT_SECRET=… CWS_REFRESH_TOKEN=… CWS_PUBLISHER_ID=… CWS_EXTENSION_ID=…
node scripts/publish-webstore.mjs dist/Avorythm-Extension.zip --dry-run      # checks credentials and version only
node scripts/publish-webstore.mjs dist/Avorythm-Extension.zip --no-publish   # upload only, review it in the dashboard
node scripts/publish-webstore.mjs dist/Avorythm-Extension.zip                # upload and submit
```

The script refuses to upload when the manifest version is not newer than the published one, or when a submission is already pending review (add `--cancel-pending` to replace it). Credentials are only read from the environment and never printed.

---

## خلاصه به فارسی

با هر تگ `v*` می‌شود بستهٔ اکستنشن به‌طور خودکار در Chrome Web Store آپلود و برای بررسی ارسال شود. فقط یک‌بار باید Chrome Web Store API را در Google Cloud فعال کنی، یک OAuth client از نوع Web application بسازی، با OAuth Playground یک refresh token بگیری و پنج secret با نام‌های `CWS_CLIENT_ID`، `CWS_CLIENT_SECRET`، `CWS_REFRESH_TOKEN`، `CWS_PUBLISHER_ID` و `CWS_EXTENSION_ID` به GitHub اضافه کنی؛ سپس متغیر `CWS_AUTO_PUBLISH=true` را بگذار. ساخت آیتم، ویرایش توضیحات و اسکرین‌شات‌ها همچنان فقط از داشبورد ممکن است و بررسی گوگل هم حذف نمی‌شود. اگر می‌خواهی انتشار نهایی را خودت تأیید کنی، `CWS_PUBLISH_TYPE=STAGED_PUBLISH` را تنظیم کن.
