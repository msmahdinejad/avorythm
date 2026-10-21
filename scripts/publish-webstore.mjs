#!/usr/bin/env node
// Upload an extension ZIP to the Chrome Web Store and submit it for review using
// the Chrome Web Store API v2. No dependencies; Node 22+.
//
//   node scripts/publish-webstore.mjs dist/Avorythm-Extension.zip [--dry-run] [--no-publish] [--cancel-pending]
//
// Required environment (store them as GitHub Actions secrets, never in the repo):
//   CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, CWS_PUBLISHER_ID, CWS_EXTENSION_ID
// Optional:
//   CWS_PUBLISH_TYPE  DEFAULT_PUBLISH (default) | STAGED_PUBLISH
//   CWS_API_BASE, CWS_TOKEN_URL  override the Google endpoints (used by tests)
//
// Docs: https://developer.chrome.com/docs/webstore/using-api
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const DEFAULT_API = 'https://chromewebstore.googleapis.com';
const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REQUEST_TIMEOUT_MS = 180_000;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class StoreError extends Error {}

async function call(url, options = {}) {
  const response = await fetch(url, {...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {raw: text.slice(0, 300)}; }
  if (!response.ok) {
    const detail = body?.error?.message || body?.error_description || body?.error || body?.raw || response.statusText;
    throw new StoreError(`${options.method || 'GET'} ${new URL(url).pathname} failed (${response.status}): ${detail}`);
  }
  return body;
}

export function versionParts(version) {
  return String(version || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
}

export function isNewer(candidate, current) {
  const left = versionParts(candidate);
  const right = versionParts(current);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference) return difference > 0;
  }
  return false;
}

export function loadConfig(environment = process.env) {
  const missing = ['CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN', 'CWS_PUBLISHER_ID', 'CWS_EXTENSION_ID']
    .filter((name) => !environment[name]);
  if (missing.length) throw new StoreError(`Missing environment: ${missing.join(', ')}`);
  const publishType = environment.CWS_PUBLISH_TYPE || 'DEFAULT_PUBLISH';
  if (!['DEFAULT_PUBLISH', 'STAGED_PUBLISH'].includes(publishType)) {
    throw new StoreError('CWS_PUBLISH_TYPE must be DEFAULT_PUBLISH or STAGED_PUBLISH');
  }
  const api = (environment.CWS_API_BASE || DEFAULT_API).replace(/\/$/u, '');
  const item = `publishers/${encodeURIComponent(environment.CWS_PUBLISHER_ID)}/items/${encodeURIComponent(environment.CWS_EXTENSION_ID)}`;
  return {
    clientId: environment.CWS_CLIENT_ID,
    clientSecret: environment.CWS_CLIENT_SECRET,
    refreshToken: environment.CWS_REFRESH_TOKEN,
    tokenUrl: environment.CWS_TOKEN_URL || DEFAULT_TOKEN_URL,
    publishType,
    urls: {
      upload: `${api}/upload/v2/${item}:upload`,
      status: `${api}/v2/${item}:fetchStatus`,
      publish: `${api}/v2/${item}:publish`,
      cancel: `${api}/v2/${item}:cancelSubmission`
    }
  };
}

export async function accessToken(config) {
  const body = await call(config.tokenUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token'
    })
  });
  if (!body.access_token) throw new StoreError('Google did not return an access token');
  return body.access_token;
}

const authorized = (token, extra = {}) => ({headers: {Authorization: `Bearer ${token}`, ...extra.headers}, ...extra});

export const fetchStatus = (config, token) => call(config.urls.status, authorized(token));

export async function publishPackage({config, token, zip, version, dryRun = false, publish = true, cancelPending = false,
  pollMs = 5000, maxPolls = 120, log = console.log}) {
  const status = await fetchStatus(config, token);
  const published = status.publishedItemRevisionStatus?.distributionChannels?.[0]?.crxVersion || '';
  const submitted = status.submittedItemRevisionStatus;
  log(`Store state: published ${published || 'none'}, submitted ${submitted?.state || 'none'}`);
  if (status.takenDown) throw new StoreError('The item is taken down; resolve it in the dashboard first.');
  if (version && published && !isNewer(version, published)) {
    throw new StoreError(`Manifest version ${version} is not newer than the published ${published}; bump it before uploading.`);
  }
  if (submitted?.state === 'PENDING_REVIEW') {
    if (!cancelPending) {
      throw new StoreError('A submission is already pending review. Wait for it, or rerun with --cancel-pending.');
    }
    if (!dryRun) await call(config.urls.cancel, authorized(token, {method: 'POST'}));
    log('Cancelled the pending submission.');
  }
  if (dryRun) {
    log(`Dry run: would upload ${zip.byteLength} bytes${publish ? ` and ${config.publishType}` : ''}.`);
    return {dryRun: true};
  }

  const upload = await call(config.urls.upload, authorized(token, {method: 'POST', body: zip}));
  log(`Upload: ${upload.uploadState || 'unknown'}${upload.crxVersion ? ` (version ${upload.crxVersion})` : ''}`);
  let state = String(upload.uploadState || '');
  for (let poll = 0; /IN_PROGRESS/u.test(state); poll += 1) {
    if (poll >= maxPolls) throw new StoreError('The upload is still processing; check the dashboard.');
    await sleep(pollMs);
    state = String((await fetchStatus(config, token)).lastAsyncUploadState || '');
    log(`Upload: ${state || 'unknown'}`);
  }
  if (state !== 'SUCCEEDED') throw new StoreError(`Upload did not succeed (${state || 'no state'}).`);
  if (!publish) return {uploaded: true};

  const result = await call(config.urls.publish, authorized(token, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({publishType: config.publishType})
  }));
  for (const warning of result.warningInfo?.warnings || []) log(`Warning: ${warning.reason} ${warning.description || ''}`);
  log(`Publish (${config.publishType}): ${result.state || 'submitted'}`);
  return {uploaded: true, published: true, state: result.state};
}

async function main(argv) {
  const flags = new Set(argv.filter((argument) => argument.startsWith('--')));
  const [file] = argv.filter((argument) => !argument.startsWith('--'));
  if (!file) throw new StoreError('Usage: publish-webstore.mjs <extension.zip> [--dry-run] [--no-publish] [--cancel-pending]');
  const [zip, manifest] = await Promise.all([
    readFile(file),
    readFile(new URL('../extension/manifest.json', import.meta.url), 'utf8')
  ]);
  const version = JSON.parse(manifest).version;
  const config = loadConfig();
  const token = await accessToken(config);
  console.log(`Publishing ${file} (manifest ${version})`);
  await publishPackage({
    config, token, zip, version,
    dryRun: flags.has('--dry-run'), publish: !flags.has('--no-publish'), cancelPending: flags.has('--cancel-pending')
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof StoreError ? `Error: ${error.message}` : error);
    process.exitCode = 1;
  });
}
