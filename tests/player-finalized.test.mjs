import assert from 'node:assert/strict';
import test from 'node:test';

test('restores an Infinity-duration WebM on the persisted timeline with dubbed audio enabled', async () => {
  const elements = new Map();
  class FakeElement {
    constructor() {
      this.hidden = false;
      this.disabled = false;
      this.checked = false;
      this.value = 0;
      this.textContent = '';
      this.dataset = {};
      this.listeners = {};
      this.style = {setProperty() {}};
      this.classList = {add() {}, remove() {}, toggle() {}};
      this.paused = true;
      this.currentTime = 0;
      this.duration = 0;
      this.readyState = 1;
      this.volume = 1;
      this.muted = false;
      this.src = '';
    }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    async play() { this.paused = false; }
    pause() { this.paused = true; }
    load() {}
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }
  const element = (selector) => {
    if (!elements.has(selector)) elements.set(selector, new FakeElement());
    return elements.get(selector);
  };
  const video = element('#video');
  video.duration = Infinity;
  globalThis.document = {
    documentElement: {lang: 'en', dir: 'ltr'},
    fullscreenElement: null,
    addEventListener() {},
    querySelector: element,
    querySelectorAll: () => []
  };
  globalThis.window = {close() {}};
  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};
  globalThis.BroadcastChannel = class { postMessage() {} };
  globalThis.MediaSource = class { static isTypeSupported() { return true; } };
  globalThis.URL.createObjectURL = (() => { let id = 0; return () => `blob:artifact-${++id}`; })();
  globalThis.URL.revokeObjectURL = () => {};
  globalThis.AudioContext = class {
    currentTime = 0;
    destination = {};
    createGain() { return {gain: {setTargetAtTime() {}}, connect() {}}; }
    async resume() {}
    async suspend() {}
  };

  const metadata = new Blob([JSON.stringify({
    version: 2,
    duration: 125,
    source: [{id: 'source-1', text: 'Hello.', start: 5, end: 6}],
    translated: [
      {id: 'translated-1', text: 'سلام.', start: 7.5, end: 8.5},
      {id: 'translated-2', text: 'خوش آمدید.', start: 8.5, end: 12.5}
    ]
  })]);
  const files = new Map([
    ['capture.webm', new Blob([Uint8Array.of(1)], {type: 'video/webm'})],
    ['dubbed.wav', new Blob([Uint8Array.of(2)], {type: 'audio/wav'})],
    ['timeline.json', metadata]
  ]);
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
    storage: {async getDirectory() { return {async getFileHandle(name) { return {async getFile() { return files.get(name); }}; }}; }}
  }});
  globalThis.chrome = {
    permissions: {async request() { return true; }},
    storage: {
      local: {async get() { return {settings: {playbackMode: 'synchronized'}}; }, async set() {}},
      session: {async get() { return {playerSession: {currentTime: 60, recordedDuration: 125, wantedPlaying: false, started: true}}; }, async set() {}}
    },
    runtime: {
      async sendMessage(message) {
        if (message.type === 'state') return {ok: true, state: {active: false, syncArtifacts: {
          videoFileName: 'capture.webm', dubbedFileName: 'dubbed.wav', metadataFileName: 'timeline.json', duration: 125
        }}};
        return {ok: true};
      },
      async openOptionsPage() {}
    }
  };

  await import(`../extension/player.js?finalized=${Date.now()}`);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(element('#seekRange').max, '125');
  assert.equal(video.currentTime, 60);
  assert.equal(video.muted, true, 'recorded video defaults to original audio off');
  assert.equal(element('#dubbedTrack').muted, false, 'recorded video defaults to dubbed audio on');

  element('#seekRange').value = '10';
  await element('#seekRange').listeners.change();
  assert.equal(video.currentTime, 10);
  assert.equal(element('#dubbedTrack').currentTime, 10);

  video.paused = false;
  video.currentTime = 8.1;
  element('#dubbedTrack').currentTime = 7.9;
  video.listeners.timeupdate();
  assert.equal(
    element('#translatedCaption').textContent,
    'سلام.',
    'translated captions must follow the audible dubbed track instead of advancing with the video clock'
  );

  video.currentTime = 8.4;
  element('#dubbedTrack').currentTime = 8.4;
  video.listeners.timeupdate();
  assert.equal(
    element('#translatedCaption').textContent,
    'سلام.',
    'the player must consume the persisted presentation timeline without applying another delay'
  );

  navigator.storage.getDirectory = async () => { throw new DOMException('missing', 'NotFoundError'); };
  await element('#downloadVideoButton').listeners.click();
  assert.equal(element('#downloadVideoButton').disabled, false, 'a missing OPFS artifact must leave export retryable');
  assert.equal(
    element('#warningText').textContent,
    'The temporary recording is no longer available; start a new synchronized recording.'
  );
});
