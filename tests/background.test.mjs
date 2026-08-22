import assert from 'node:assert/strict';
import test from 'node:test';

test('keeps the key session-only and starts tab capture without the desktop app', async () => {
  let installed;
  let receive;
  let offscreen = false;
  let capturedTab = 0;
  let captureCalls = 0;
  let injectedTab = 0;
  let sourceBridgeTab = 0;
  const sourceControls = [];
  let createdTab = 0;
  let activatedTab = 0;
  const removedTabs = [];
  let lastOffscreenMessage = null;
  let offscreenResponse = {ok: true};
  let rejectOffscreenStop = false;
  const overlayMessages = [];
  const local = {};
  const session = {};

  const storageArea = (state) => ({
    async get(key) {
      if (typeof key === 'string') return {[key]: state[key]};
      return {...state};
    },
    permissions: {
      async contains() { return true; },
      async request() { return true; }
    },
    async set(update) { Object.assign(state, update); },
    async remove(key) { delete state[key]; }
  });

  globalThis.chrome = {
    storage: {local: storageArea(local), session: storageArea(session)},
    permissions: {
      async contains() { return true; },
      async request() { return true; },
      async remove() { return true; }
    },
    runtime: {
      onInstalled: {addListener(listener) { installed = listener; }},
      onMessage: {addListener(listener) { receive = listener; }},
      getURL: (path) => `chrome-extension://test/${path}`,
      async getContexts() { return offscreen ? [{}] : []; },
      async sendMessage(message) {
        assert.equal(message.target, 'offscreen');
        lastOffscreenMessage = message;
        if (rejectOffscreenStop && message.type === 'stop') throw new Error('offscreen_stop_failed');
        return offscreenResponse;
      }
    },
    offscreen: {
      async createDocument() { offscreen = true; },
      async closeDocument() { offscreen = false; }
    },
    tabs: {
      onRemoved: {addListener() {}},
      async query() { return [{id: 42, title: 'Test video'}]; },
      async create(options) {
        createdTab = 84;
        assert.equal(options.active, false);
        assert.equal('playerSession' in session, false, 'stale player state must be gone before the new player loads');
        assert.equal(session.state?.active, true, 'the new recording state must be visible before the player page loads');
        assert.equal(session.state?.syncArtifacts, null, 'the player must not restore artifacts from the previous recording');
        return {id: 84};
      },
      async update(tabId, options) { if (options.active) activatedTab = tabId; return {id: tabId}; },
      async remove(tabId) { removedTabs.push(tabId); },
      async sendMessage(tabId, message) { overlayMessages.push({tabId, message}); }
    },
    scripting: {
      async executeScript({target, files, func, args}) {
        if (func) {
          sourceControls.push(args[0]);
          return [{result: {ok: true, wasPaused: args[0] !== 'pause'}}];
        }
        if (files?.[0] === 'source-bridge.js') sourceBridgeTab = target.tabId;
        else {
          injectedTab = target.tabId;
          assert.deepEqual(files, ['content.js']);
        }
      }
    },
    tabCapture: {
      async getMediaStreamId({targetTabId}) {
        captureCalls += 1;
        capturedTab = targetTabId;
        return 'stream-42';
      }
    },
    downloads: {async download() { return 1; }}
  };
  let groqStatus = 200;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/models');
    assert.equal(options.headers.Authorization, 'Bearer test-groq-key-123');
    return {ok: groqStatus === 200, status: groqStatus};
  };

  await import('../extension/background.js');
  await installed();

  const message = (payload, sender = {}) => new Promise((resolve) => {
    assert.equal(receive(payload, sender, resolve), true);
  });

  let response = await message({type: 'bootstrap'});
  assert.equal(response.data.api_key_set, false);
  assert.equal(local.settings.onPageOutput.dubAudioEnabled, true);
  assert.equal(local.settings.onPageOutput.originalAudioEnabled, false);
  assert.equal(local.settings.synchronizedOutput.dubAudioEnabled, true);
  assert.equal(local.settings.synchronizedOutput.originalAudioEnabled, false);
  assert.equal(local.settings.locale, 'en');

  response = await message({type: 'set-key', apiKey: 'test-api-key-123'});
  assert.equal(response.ok, true);
  assert.equal(session.apiKey, 'test-api-key-123');
  assert.equal('apiKey' in local, false);

  const subtitleSettings = {
    ...local.settings,
    consentVersion: 1,
    onPageOutput: {
      ...local.settings.onPageOutput,
      dubAudioEnabled: false,
      originalAudioEnabled: true,
      translatedSubtitlesEnabled: true
    }
  };
  response = await message({type: 'start', config: subtitleSettings});
  assert.equal(response.ok, true);
  assert.equal(capturedTab, 42);
  assert.equal(offscreen, true);
  assert.equal(response.state.status, 'connecting');
  assert.equal(response.state.active, true);
  assert.equal(injectedTab, 42);
  assert.equal(overlayMessages.at(-1).message.output.translatedSubtitlesEnabled, true);

  response = await message({type: 'clear-key'});
  assert.equal(response.ok, true);
  assert.equal('apiKey' in session, false);
  assert.equal(offscreen, false);

  await message({type: 'set-key', apiKey: 'test-api-key-123'});
  await message({type: 'set-groq-key', apiKey: 'test-groq-key-123'});
  response = await message({type: 'bootstrap'});
  assert.equal(response.data.api_key_set, true);
  assert.equal(response.data.groq_api_key_set, true);
  offscreenResponse = {ok: false, error: 'gemini_closed'};
  response = await message({type: 'start', config: subtitleSettings});
  assert.equal(response.ok, false);
  assert.equal(response.error, 'gemini_closed');
  assert.equal(overlayMessages.at(-1).message.active, false);
  response = await message({type: 'state'});
  assert.equal(response.state.captureTabId, null);
  assert.equal(offscreen, false);

  offscreenResponse = {ok: true};
  const synchronizedSettings = {
    ...subtitleSettings,
    playbackMode: 'synchronized',
    syncBufferSeconds: 5,
    syncCaptionEngine: 'whisper',
    synchronizedOutput: {
      ...subtitleSettings.synchronizedOutput,
      originalAudioEnabled: false,
      dubAudioEnabled: true
    }
  };
  session.playerSession = {currentTime: 221.4, recordedDuration: 300, started: true};
  response = await message({type: 'start', config: synchronizedSettings});
  assert.equal(response.ok, true);
  assert.equal('playerSession' in session, false, 'a new recording must not inherit the previous player timeline');
  assert.equal(createdTab, 84);
  assert.equal(activatedTab, 84);
  assert.equal(sourceBridgeTab, 42);
  assert.equal(response.state.playerTabId, 84);
  assert.equal(lastOffscreenMessage.config.playbackMode, 'synchronized');
  assert.equal(lastOffscreenMessage.config.syncBufferSeconds, 8);
  assert.equal(lastOffscreenMessage.config.syncCaptionEngine, 'whisper');
  assert.equal(lastOffscreenMessage.groqApiKey, 'test-groq-key-123');
  assert.deepEqual(sourceControls, ['pause', 'play']);
  response = await message({type: 'source-media-state', state: {completed: true, completionReason: 'media-transition'}}, {tab: {id: 42}});
  assert.equal(response.ok, true);
  assert.equal(response.state.completionReason, 'media-transition');
  assert.equal(response.state.active, false);
  assert.deepEqual(removedTabs, []);

  groqStatus = 403;
  const capturesBeforeBlockedGroq = captureCalls;
  response = await message({type: 'start', config: synchronizedSettings});
  assert.equal(response.ok, false);
  assert.equal(response.error, 'groq_access_forbidden');
  assert.equal(captureCalls, capturesBeforeBlockedGroq, 'a blocked Groq route must fail before tab capture starts');
  assert.equal(offscreen, false, 'a failed Groq preflight must not create a recording document');
  groqStatus = 200;

  response = await message({type: 'start', config: synchronizedSettings});
  assert.equal(response.ok, true);
  rejectOffscreenStop = true;
  response = await message({type: 'stop'}, {tab: {id: 84}});
  assert.equal(response.ok, false);
  assert.equal(response.error, 'offscreen_stop_failed');
  assert.equal(offscreen, false, 'the offscreen document must close even when finalization fails');
  response = await message({type: 'state'});
  assert.equal(response.state.active, false);
  assert.equal(response.state.status, 'error');
  assert.equal(response.state.captureTabId, null);

  assert.deepEqual(removedTabs, []);
});
