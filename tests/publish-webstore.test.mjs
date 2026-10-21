import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import test from 'node:test';

import {isNewer, loadConfig, accessToken, publishPackage, StoreError} from '../scripts/publish-webstore.mjs';

async function fakeStore(handlers) {
  const requests = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const body = Buffer.concat(chunks);
      requests.push({method: request.method, url: request.url, headers: request.headers, body});
      const handler = handlers[`${request.method} ${request.url.split('?')[0]}`];
      if (!handler) { response.writeHead(404).end('{}'); return; }
      const {status = 200, json} = handler(requests.length, body);
      response.writeHead(status, {'Content-Type': 'application/json'}).end(JSON.stringify(json));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const environment = {
    CWS_CLIENT_ID: 'id', CWS_CLIENT_SECRET: 'secret', CWS_REFRESH_TOKEN: 'refresh',
    CWS_PUBLISHER_ID: 'pub', CWS_EXTENSION_ID: 'ext', CWS_API_BASE: base, CWS_TOKEN_URL: `${base}/token`
  };
  return {requests, environment, close: () => new Promise((resolve) => server.close(resolve))};
}

const ITEM = '/v2/publishers/pub/items/ext';
const quiet = () => {};

test('compares extension versions numerically', () => {
  assert.equal(isNewer('1.1.10', '1.1.9'), true);
  assert.equal(isNewer('1.1.18', '1.1.18'), false);
  assert.equal(isNewer('1.2', '1.10'), false);
  assert.equal(isNewer('2.0.0', '1.99.99'), true);
});

test('refuses incomplete configuration and unknown publish types', () => {
  assert.throws(() => loadConfig({CWS_CLIENT_ID: 'x'}), /CWS_CLIENT_SECRET/u);
  assert.throws(() => loadConfig({
    CWS_CLIENT_ID: 'a', CWS_CLIENT_SECRET: 'b', CWS_REFRESH_TOKEN: 'c', CWS_PUBLISHER_ID: 'd', CWS_EXTENSION_ID: 'e', CWS_PUBLISH_TYPE: 'NOW'
  }), /CWS_PUBLISH_TYPE/u);
});

test('uploads the zip, waits for processing and submits it for review', async () => {
  let statusCalls = 0;
  const store = await fakeStore({
    'POST /token': () => ({json: {access_token: 'token-1'}}),
    [`GET ${ITEM}:fetchStatus`]: () => {
      statusCalls += 1;
      return {json: statusCalls === 1
        ? {publishedItemRevisionStatus: {state: 'PUBLISHED', distributionChannels: [{crxVersion: '1.1.17'}]}}
        : {lastAsyncUploadState: 'SUCCEEDED'}};
    },
    [`POST /upload${ITEM}:upload`]: () => ({json: {uploadState: 'IN_PROGRESS'}}),
    [`POST ${ITEM}:publish`]: () => ({json: {state: 'PENDING_REVIEW'}})
  });
  try {
    const config = loadConfig(store.environment);
    const token = await accessToken(config);
    assert.equal(token, 'token-1');
    const zip = Buffer.from('PK-fake-zip');
    const result = await publishPackage({config, token, zip, version: '1.1.18', pollMs: 1, log: quiet});
    assert.deepEqual(result, {uploaded: true, published: true, state: 'PENDING_REVIEW'});
    const upload = store.requests.find((request) => request.url.includes(':upload'));
    assert.equal(upload.headers.authorization, 'Bearer token-1');
    assert.deepEqual(upload.body, zip, 'the zip is sent as the raw request body');
    const publish = store.requests.find((request) => request.url.includes(':publish'));
    assert.deepEqual(JSON.parse(publish.body), {publishType: 'DEFAULT_PUBLISH'});
    const token0 = store.requests[0];
    assert.match(token0.body.toString(), /grant_type=refresh_token/u);
  } finally { await store.close(); }
});

test('stops before uploading when the version was not increased', async () => {
  const store = await fakeStore({
    [`GET ${ITEM}:fetchStatus`]: () => ({json: {publishedItemRevisionStatus: {distributionChannels: [{crxVersion: '1.1.18'}]}}})
  });
  try {
    const config = loadConfig(store.environment);
    await assert.rejects(
      publishPackage({config, token: 't', zip: Buffer.alloc(1), version: '1.1.18', log: quiet}),
      /not newer than the published 1\.1\.18/u
    );
    assert.equal(store.requests.some((request) => request.method === 'POST'), false);
  } finally { await store.close(); }
});

test('does not clobber a submission that is pending review unless asked', async () => {
  const store = await fakeStore({
    [`GET ${ITEM}:fetchStatus`]: () => ({json: {submittedItemRevisionStatus: {state: 'PENDING_REVIEW'}}}),
    [`POST ${ITEM}:cancelSubmission`]: () => ({json: {}}),
    [`POST /upload${ITEM}:upload`]: () => ({json: {uploadState: 'SUCCEEDED'}}),
    [`POST ${ITEM}:publish`]: () => ({json: {state: 'PENDING_REVIEW'}})
  });
  try {
    const config = loadConfig(store.environment);
    await assert.rejects(publishPackage({config, token: 't', zip: Buffer.alloc(1), log: quiet}), /already pending review/u);
    const result = await publishPackage({config, token: 't', zip: Buffer.alloc(1), cancelPending: true, log: quiet});
    assert.equal(result.published, true);
    assert.equal(store.requests.some((request) => request.url.includes(':cancelSubmission')), true);
  } finally { await store.close(); }
});

test('dry run and no-publish never submit', async () => {
  const store = await fakeStore({
    [`GET ${ITEM}:fetchStatus`]: () => ({json: {}}),
    [`POST /upload${ITEM}:upload`]: () => ({json: {uploadState: 'SUCCEEDED'}}),
    [`POST ${ITEM}:publish`]: () => ({json: {state: 'PENDING_REVIEW'}})
  });
  try {
    const config = loadConfig(store.environment);
    assert.deepEqual(await publishPackage({config, token: 't', zip: Buffer.alloc(1), dryRun: true, log: quiet}), {dryRun: true});
    assert.equal(store.requests.some((request) => request.method === 'POST'), false);
    assert.deepEqual(await publishPackage({config, token: 't', zip: Buffer.alloc(1), publish: false, log: quiet}), {uploaded: true});
    assert.equal(store.requests.some((request) => request.url.includes(':publish')), false);
  } finally { await store.close(); }
});

test('reports a failed upload and API errors without leaking credentials', async () => {
  const store = await fakeStore({
    [`GET ${ITEM}:fetchStatus`]: () => ({json: {}}),
    [`POST /upload${ITEM}:upload`]: () => ({status: 400, json: {error: {message: 'The manifest version was not increased'}}})
  });
  try {
    const config = loadConfig(store.environment);
    await assert.rejects(
      publishPackage({config, token: 'secret-token', zip: Buffer.alloc(1), log: quiet}),
      (error) => error instanceof StoreError && /not increased/u.test(error.message) && !/secret-token/u.test(error.message)
    );
  } finally { await store.close(); }
});
