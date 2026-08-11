import assert from 'node:assert/strict';
import test from 'node:test';

test('keeps the key session-only and starts tab capture without the desktop app', async () => {
  let installed;
  let receive;
  let offscreen = false;
  let capturedTab = 0;
  const local = {};
  const session = {};

  const storageArea = (state) => ({
    async get(key) {
      if (typeof key === 'string') return {[key]: state[key]};
      return {...state};
    },
    async set(update) { Object.assign(state, update); },
    async remove(key) { delete state[key]; }
  });

  globalThis.chrome = {
    storage: {local: storageArea(local), session: storageArea(session)},
    runtime: {
      onInstalled: {addListener(listener) { installed = listener; }},
      onMessage: {addListener(listener) { receive = listener; }},
      getURL: (path) => `chrome-extension://test/${path}`,
      async getContexts() { return offscreen ? [{}] : []; },
      async sendMessage(message) {
        assert.equal(message.target, 'offscreen');
        return {ok: true};
      }
    },
    offscreen: {
      async createDocument() { offscreen = true; },
      async closeDocument() { offscreen = false; }
    },
    tabs: {async query() { return [{id: 42}]; }},
    tabCapture: {
      async getMediaStreamId({targetTabId}) {
        capturedTab = targetTabId;
        return 'stream-42';
      }
    },
    downloads: {async download() { return 1; }}
  };

  await import('../extension/background.js');
  await installed();

  const message = (payload) => new Promise((resolve) => {
    assert.equal(receive(payload, {}, resolve), true);
  });

  let response = await message({type: 'bootstrap'});
  assert.equal(response.data.api_key_set, false);
  assert.equal(local.settings.audioMode, 'dub');

  response = await message({type: 'set-key', apiKey: 'test-api-key-123'});
  assert.equal(response.ok, true);
  assert.equal(session.apiKey, 'test-api-key-123');
  assert.equal('apiKey' in local, false);

  response = await message({type: 'start', config: local.settings});
  assert.equal(response.ok, true);
  assert.equal(capturedTab, 42);
  assert.equal(offscreen, true);
  assert.equal(response.state.status, 'connecting');
  assert.equal(response.state.active, true);

  response = await message({type: 'clear-key'});
  assert.equal(response.ok, true);
  assert.equal('apiKey' in session, false);
  assert.equal(offscreen, false);
});
