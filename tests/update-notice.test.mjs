import assert from 'node:assert/strict';
import test from 'node:test';

import {createUpdateNotice, isNewerVersion} from '../extension/update-notice.mjs';

function fakeChrome({version = '1.1.18', updateCheck = {status: 'no_update'}} = {}) {
  const store = {};
  const badges = [];
  return {
    store, badges,
    storage: {local: {
      async get(keys) { return Object.fromEntries([].concat(keys).map((key) => [key, store[key]])); },
      async set(update) { Object.assign(store, update); },
      async remove(key) { delete store[key]; }
    }},
    runtime: {getManifest: () => ({version}), requestUpdateCheck: async () => updateCheck},
    action: {
      async setBadgeText({text}) { badges.push(text); },
      async setBadgeBackgroundColor() {}
    }
  };
}

test('compares versions numerically', () => {
  assert.equal(isNewerVersion('1.1.19', '1.1.18'), true);
  assert.equal(isNewerVersion('1.1.18', '1.1.18'), false);
  assert.equal(isNewerVersion('1.2.0', '1.10.0'), false);
});

test('a downloaded update is remembered and shown on the toolbar badge', async () => {
  const chrome = fakeChrome();
  const updates = createUpdateNotice(chrome);
  await updates.onUpdateAvailable({version: '1.1.19'});
  assert.equal((await updates.status()).pending.version, '1.1.19');
  assert.equal(chrome.badges.at(-1), '↑');
});

test('ignores an update that is not newer than the running version', async () => {
  const chrome = fakeChrome({version: '1.1.19'});
  const updates = createUpdateNotice(chrome);
  await updates.onUpdateAvailable({version: '1.1.19'});
  await updates.onUpdateAvailable({});
  assert.equal((await updates.status()).pending, null);
  assert.equal(chrome.badges.length, 0);
});

test('a stale pending update disappears once that version is running', async () => {
  const chrome = fakeChrome({version: '1.1.19'});
  chrome.store.pendingUpdate = {version: '1.1.19', at: 1};
  assert.equal((await createUpdateNotice(chrome).status()).pending, null);
});

test('after an update the user sees what is new until they dismiss it', async () => {
  const chrome = fakeChrome({version: '1.1.19'});
  chrome.store.pendingUpdate = {version: '1.1.19', at: 1};
  const updates = createUpdateNotice(chrome, () => 1000);
  await updates.onInstalled({reason: 'install'});
  assert.equal((await updates.status()).whatsNew, null, 'a fresh install has nothing to announce');
  await updates.onInstalled({reason: 'update', previousVersion: '1.1.18'});
  const status = await updates.status();
  assert.equal(status.pending, null);
  assert.equal(status.whatsNew.version, '1.1.19');
  assert.equal(status.whatsNew.previousVersion, '1.1.18');
  assert.equal(chrome.badges.at(-1), 'NEW');
  await updates.dismiss();
  assert.equal((await updates.status()).whatsNew, null);
  assert.equal(chrome.badges.at(-1), '');
});

test('the what-is-new notice expires on its own', async () => {
  const chrome = fakeChrome({version: '1.1.19'});
  let clock = 0;
  const updates = createUpdateNotice(chrome, () => clock);
  await updates.onInstalled({reason: 'update', previousVersion: '1.1.18'});
  clock = 15 * 24 * 60 * 60 * 1000;
  assert.equal((await updates.status()).whatsNew, null);
});

test('update checks survive both Chrome result shapes and errors', async () => {
  assert.deepEqual(await createUpdateNotice(fakeChrome({updateCheck: {status: 'update_available', version: '1.1.19'}})).check(),
    {status: 'update_available', version: '1.1.19'});
  assert.deepEqual(await createUpdateNotice(fakeChrome({updateCheck: ['throttled', {}]})).check(), {status: 'throttled', version: ''});
  const failing = fakeChrome();
  failing.runtime.requestUpdateCheck = async () => { throw new Error('offline'); };
  assert.deepEqual(await createUpdateNotice(failing).check(), {status: 'error', version: ''});
});
