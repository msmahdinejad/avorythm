import assert from 'node:assert/strict';
import test from 'node:test';

test('keeps the key session-only and starts tab capture without the desktop app', async () => {
  const deferred = () => {
    let resolve;
    const promise = new Promise((next) => { resolve = next; });
    return {promise, resolve};
  };
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
  const offscreenStartResponses = [];
  let rejectOffscreenStop = false;
  let groqPermissionGranted = true;
  let captureGate = null;
  let delayedStateRead = null;
  const overlayMessages = [];
  const stalePlayerTabs = new Set();
  const local = {};
  const session = {};

  const storageArea = (state) => ({
    async get(key) {
      if (state === session && key === 'state' && delayedStateRead) {
        const gate = delayedStateRead;
        delayedStateRead = null;
        const snapshot = structuredClone(state[key]);
        gate.started.resolve();
        await gate.release.promise;
        return {[key]: snapshot};
      }
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
      async contains(request) { return request?.origins ? groqPermissionGranted : true; },
      async request(request) {
        if (request?.origins) groqPermissionGranted = true;
        return true;
      },
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
        if (message.type === 'start' && offscreenStartResponses.length) return offscreenStartResponses.shift();
        return offscreenResponse;
      }
    },
    offscreen: {
      async createDocument() { offscreen = true; },
      async closeDocument() { offscreen = false; }
    },
    tabs: {
      onRemoved: {addListener() {}},
      async query(queryInfo) {
        if (queryInfo?.url) {
          return [...stalePlayerTabs].map((id) => ({id, url: 'chrome-extension://test/player.html'}));
        }
        return [{id: 42, title: 'Test video'}];
      },
      async create(options) {
        createdTab = 84;
        assert.equal(options.active, false);
        assert.equal(stalePlayerTabs.size, 0, 'old extension players must close before the new player is created');
        assert.equal(removedTabs.includes(84), false, 'stale cleanup must not remove the newly created player');
        assert.equal('playerSession' in session, false, 'stale player state must be gone before the new player loads');
        assert.equal(session.state?.active, true, 'the new recording state must be visible before the player page loads');
        assert.equal(session.state?.syncArtifacts, null, 'the player must not restore artifacts from the previous recording');
        return {id: 84};
      },
      async update(tabId, options) { if (options.active) activatedTab = tabId; return {id: tabId}; },
      async remove(tabId) { stalePlayerTabs.delete(tabId); removedTabs.push(tabId); },
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
        if (captureGate) {
          const gate = captureGate;
          captureGate = null;
          gate.started.resolve();
          await gate.release.promise;
        }
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
  assert.equal(response.data.groq_permission_granted, true);
  assert.equal(response.data.groq_audio_consent_granted, false);
  assert.equal(response.data.groq_ready, false);
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
  const duplicateStartGate = {started: deferred(), release: deferred()};
  captureGate = duplicateStartGate;
  const capturesBeforeDuplicateStart = captureCalls;
  const firstStart = message({type: 'start', config: subtitleSettings});
  await duplicateStartGate.started.promise;
  const duplicateStart = message({type: 'start', config: subtitleSettings});
  duplicateStartGate.release.resolve();
  const [firstStartResponse, duplicateStartResponse] = await Promise.all([firstStart, duplicateStart]);
  response = firstStartResponse;
  assert.equal(response.ok, true);
  assert.equal(duplicateStartResponse.ok, true);
  assert.equal(duplicateStartResponse.state.active, true);
  assert.equal(captureCalls, capturesBeforeDuplicateStart + 1, 'concurrent Start requests must share one capture');
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

  const stateReadGate = {started: deferred(), release: deferred()};
  delayedStateRead = stateReadGate;
  const sourcePatch = message({target: 'background', type: 'bridge-state', update: {sourceText: 'concurrent source'}});
  await stateReadGate.started.promise;
  const translationPatch = message({target: 'background', type: 'bridge-state', update: {translatedText: 'concurrent translation'}});
  stateReadGate.release.resolve();
  await Promise.all([sourcePatch, translationPatch]);
  response = await message({type: 'state'});
  assert.equal(response.state.sourceText, 'concurrent source');
  assert.equal(response.state.translatedText, 'concurrent translation', 'concurrent disjoint state patches must not overwrite each other');

  await message({type: 'set-key', apiKey: 'test-api-key-123'});
  await message({type: 'set-groq-key', apiKey: 'test-groq-key-123'});
  response = await message({type: 'bootstrap'});
  assert.equal(response.data.api_key_set, true);
  assert.equal(response.data.groq_api_key_set, true);
  offscreenStartResponses.push({ok: false, error: 'gemini_closed'}, {ok: true});
  const failedStart = message({type: 'start', config: subtitleSettings});
  const recoveringStart = message({type: 'start', config: subtitleSettings});
  const [failedStartResponse, recoveringStartResponse] = await Promise.all([failedStart, recoveringStart]);
  assert.equal(failedStartResponse.ok, false);
  assert.equal(failedStartResponse.error, 'gemini_closed');
  assert.equal(recoveringStartResponse.ok, true);
  assert.equal(recoveringStartResponse.state.active, true, 'failure cleanup must finish before a later Start becomes active');
  assert.equal(offscreen, true, 'the failed Start must not tear down the successful successor');
  await message({type: 'stop'});
  response = await message({type: 'state'});
  assert.equal(response.state.captureTabId, null);
  assert.equal(offscreen, false);

  const startStopGate = {started: deferred(), release: deferred()};
  captureGate = startStopGate;
  const racingStart = message({type: 'start', config: subtitleSettings});
  await startStopGate.started.promise;
  const racingStop = message({type: 'stop'});
  startStopGate.release.resolve();
  const [racingStartResponse, racingStopResponse] = await Promise.all([racingStart, racingStop]);
  assert.equal(racingStartResponse.ok, true);
  assert.equal(racingStopResponse.ok, true);
  response = await message({type: 'state'});
  assert.equal(response.state.active, false, 'a Stop queued after Start must win without leaving a half-started capture');
  assert.equal(offscreen, false);

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
  const capturesBeforeMissingConsent = captureCalls;
  response = await message({type: 'start', config: synchronizedSettings});
  assert.equal(response.ok, false);
  assert.equal(response.error, 'groq_consent_required');
  assert.equal(captureCalls, capturesBeforeMissingConsent, 'Groq consent must be checked before capture');

  synchronizedSettings.groqAudioConsentVersion = 1;
  groqPermissionGranted = false;
  response = await message({type: 'start', config: synchronizedSettings});
  assert.equal(response.ok, false);
  assert.equal(response.error, 'groq_permission_missing');
  assert.equal(captureCalls, capturesBeforeMissingConsent, 'Groq host permission must be checked before capture');

  groqPermissionGranted = true;
  local.settings = synchronizedSettings;
  response = await message({type: 'bootstrap'});
  assert.equal(response.data.groq_audio_consent_granted, true);
  assert.equal(response.data.groq_ready, true);
  stalePlayerTabs.add(73);
  session.playerSession = {currentTime: 221.4, recordedDuration: 300, started: true};
  response = await message({type: 'start', config: synchronizedSettings});
  assert.equal(response.ok, true);
  assert.equal('playerSession' in session, false, 'a new recording must not inherit the previous player timeline');
  assert.equal(createdTab, 84);
  assert.equal(activatedTab, 84);
  assert.equal(sourceBridgeTab, 42);
  assert.equal(response.state.playerTabId, 84);
  assert.equal(removedTabs.includes(73), true, 'a stale synchronized player must close before a new session');
  assert.equal(removedTabs.includes(84), false, 'the newly created synchronized player must remain open');
  assert.equal(lastOffscreenMessage.config.playbackMode, 'synchronized');
  assert.equal(lastOffscreenMessage.config.syncBufferSeconds, 8);
  assert.equal(lastOffscreenMessage.config.syncCaptionEngine, 'whisper');
  assert.equal(lastOffscreenMessage.groqApiKey, 'test-groq-key-123');
  assert.deepEqual(sourceControls, ['pause', 'play']);
  response = await message({type: 'source-media-state', state: {completed: true, completionReason: 'media-transition'}}, {tab: {id: 42}});
  assert.equal(response.ok, true);
  assert.equal(response.state.completionReason, 'media-transition');
  assert.equal(response.state.active, false);
  assert.deepEqual(removedTabs, [73]);

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

  assert.deepEqual(removedTabs, [73]);
});
