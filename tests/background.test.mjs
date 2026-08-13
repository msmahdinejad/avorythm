import assert from 'node:assert/strict';
import test from 'node:test';

test('keeps the key session-only and starts tab capture without the desktop app', async () => {
  let installed;
  let receive;
  let offscreen = false;
  let capturedTab = 0;
  let injectedTab = 0;
  let offscreenResponse = {ok: true};
  const overlayMessages = [];
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
        return offscreenResponse;
      }
    },
    offscreen: {
      async createDocument() { offscreen = true; },
      async closeDocument() { offscreen = false; }
    },
    tabs: {
      async query() { return [{id: 42}]; },
      async sendMessage(tabId, message) { overlayMessages.push({tabId, message}); }
    },
    scripting: {
      async executeScript({target, files}) {
        injectedTab = target.tabId;
        assert.deepEqual(files, ['content.js']);
      }
    },
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

  const subtitleSettings = {...local.settings, audioMode: 'subtitles'};
  response = await message({type: 'start', config: subtitleSettings});
  assert.equal(response.ok, true);
  assert.equal(capturedTab, 42);
  assert.equal(offscreen, true);
  assert.equal(response.state.status, 'connecting');
  assert.equal(response.state.active, true);
  assert.equal(injectedTab, 42);
  assert.equal(overlayMessages.at(-1).message.settings.audioMode, 'subtitles');

  response = await message({type: 'clear-key'});
  assert.equal(response.ok, true);
  assert.equal('apiKey' in session, false);
  assert.equal(offscreen, false);

  await message({type: 'set-key', apiKey: 'test-api-key-123'});
  offscreenResponse = {ok: false, error: 'gemini_closed'};
  response = await message({type: 'start', config: subtitleSettings});
  assert.equal(response.ok, false);
  assert.equal(response.error, 'gemini_closed');
  assert.equal(overlayMessages.at(-1).message.active, false);
  response = await message({type: 'state'});
  assert.equal(response.state.captureTabId, null);
  assert.equal(offscreen, false);
});
