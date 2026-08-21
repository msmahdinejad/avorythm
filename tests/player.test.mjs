import assert from 'node:assert/strict';
import test from 'node:test';

test('buffers media and keeps player controls independent from the source producer', async () => {
  const elements = new Map();
  class FakeElement {
    constructor() {
      this.hidden = false;
      this.disabled = false;
      this.checked = false;
      this.value = 1;
      this.textContent = '';
      this.dataset = {};
      this.listeners = {};
      this.style = {setProperty() {}};
      this.classList = {add() {}, remove() {}, toggle() {}};
    }
    addEventListener(type, listener) { this.listeners[type] = listener; }
  }
  const element = (selector) => {
    if (!elements.has(selector)) elements.set(selector, new FakeElement());
    return elements.get(selector);
  };
  element('#stageError').hidden = true;
  const video = element('#video');
  video.currentTime = 0;
  video.paused = true;
  video.volume = 1;
  video.muted = false;
  video.play = async () => { video.paused = false; };
  video.pause = () => { video.paused = true; };
  const stageCard = element('.stage-card');
  let fullscreen = false;
  stageCard.requestFullscreen = async () => { fullscreen = true; };
  globalThis.document = {
    documentElement: {lang: 'en', dir: 'ltr'},
    fullscreenElement: null,
    hidden: false,
    listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    exitFullscreen: async () => { fullscreen = false; },
    querySelector: element,
    querySelectorAll: () => []
  };
  globalThis.window = {close() {}};
  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};

  let channel;
  const playerMessages = [];
  globalThis.BroadcastChannel = class {
    constructor(name) { assert.equal(name, 'avorythm-sync'); channel = this; }
    postMessage(message) { playerMessages.push(message); }
  };

  let sourceBuffer;
  class FakeSourceBuffer {
    constructor() {
      this.updating = false;
      this.listeners = {};
      this.startValue = 0;
      this.end = 0;
      this.appended = [];
      this.removed = [];
      this.buffered = {length: 0, start: () => this.startValue, end: () => this.end};
    }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    appendBuffer(data) {
      this.appended.push(data);
      this.end += 5;
      this.buffered.length = 1;
      this.listeners.updateend?.();
    }
    remove(start, end) { this.removed.push({start, end}); this.startValue = Math.max(this.startValue, end); }
  }
  globalThis.MediaSource = class {
    static isTypeSupported() { return true; }
    readyState = 'open';
    ended = false;
    addEventListener(type, listener) { if (type === 'sourceopen') queueMicrotask(listener); }
    addSourceBuffer() { sourceBuffer = new FakeSourceBuffer(); return sourceBuffer; }
    endOfStream() { this.ended = true; }
  };
  globalThis.URL.createObjectURL = () => 'blob:player';

  const starts = [];
  let stoppedDubSources = 0;
  let suspended = false;
  class FakeAudioContext {
    constructor() { this.currentTime = 2; this.destination = {}; }
    createGain() { return {gain: {setTargetAtTime() {}}, connect() {}}; }
    createBuffer(channels, length, rate) {
      return {duration: length / rate, getChannelData: () => new Float32Array(length)};
    }
    createBufferSource() {
      return {connect() {}, start: (when, offset) => starts.push({when, offset}), stop() { stoppedDubSources += 1; }};
    }
    async resume() { suspended = false; }
    async suspend() { suspended = true; }
  }
  globalThis.AudioContext = FakeAudioContext;

  const mediaControls = [];
  globalThis.chrome = {
    storage: {
      local: {async get() { return {settings: {locale: 'en', playbackMode: 'synchronized', syncBufferSeconds: 4.5, originalAudioEnabled: false, dubAudioEnabled: true, sourceSubtitlesEnabled: true, translatedSubtitlesEnabled: true, originalVolume: .5, dubVolume: 1}}; }, async set() {}},
      session: {async get() { return {playerSession: {currentTime: 221.4, wantedPlaying: false, started: true}}; }, async set() {}}
    },
    runtime: {
      async sendMessage(message) {
        if (message.type === 'state') return {ok: true, state: {active: true, sourceTitle: 'Test video'}};
        if (message.type === 'media-control') mediaControls.push(message.action);
        return {ok: true};
      },
      async openOptionsPage() {}
    }
  };

  await import('../extension/player.js');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(
    playerMessages.find((message) => message.type === 'ready'),
    {type: 'ready', position: 221.4},
    'refresh must request an OPFS replay at the persisted player position'
  );
  channel.onmessage({data: {type: 'media-init', mimeType: 'video/webm', bufferSeconds: 4.5}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (let index = 0; index < 50; index += 1) {
    channel.onmessage({data: {type: 'media-chunk', data: new Blob([Uint8Array.from([index])])}});
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.equal(sourceBuffer.appended.length, 50);
  assert.ok(sourceBuffer.removed.length > 0, 'a far-forward restore may evict replay bytes while it catches up');
  assert.equal(video.currentTime, 221.4, 'refresh must restore the exact persisted timeline position');
  assert.equal(element('#seekRange').min, '0', 'the user-facing timeline must still expose the full local recording');
  assert.equal(
    element('#activateButton').disabled,
    false,
    'video playback must never be blocked by a delayed or unavailable Gemini dub cue'
  );
  await element('#activateButton').listeners.click();
  assert.equal(video.paused, false, 'the buffered video must start even while dubbed audio is still pending');
  assert.equal(video.muted, true, 'dub-only mode must not leak original audio while the dub is pending');
  await element('#playButton').listeners.click();

  element('#seekRange').value = '0.5';
  await element('#seekRange').listeners.change();
  assert.deepEqual(
    playerMessages.at(-1),
    {type: 'ready', position: 0.5, replay: true},
    'seeking outside the in-memory range must rebuild that position from the OPFS recording'
  );
  channel.onmessage({data: {type: 'session-reset', position: 0.5, duration: 250}});
  channel.onmessage({data: {type: 'media-init', mimeType: 'video/webm', bufferSeconds: 4.5}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  channel.onmessage({data: {type: 'media-chunk', data: new Blob([Uint8Array.from([1, 2, 3])])}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(video.currentTime, 0.5, 'recorded media must remain seekable to the beginning after refresh');

  channel.onmessage({data: {type: 'dub-chunk', data: new Int16Array(24000).buffer, start: 1}});
  assert.equal(element('#activateButton').disabled, false, 'dub arrival must not change the video readiness gate');
  await element('#activateButton').listeners.click();
  assert.deepEqual(starts, [{when: 2.5, offset: 0}]);

  const scheduledBeforeFarFuture = starts.length;
  channel.onmessage({data: {type: 'dub-chunk', data: new Int16Array(24000).buffer, start: 30}});
  assert.equal(
    starts.length,
    scheduledBeforeFarFuture,
    'dub audio must be scheduled only in a short video-clock horizon so background suspension cannot scramble it'
  );
  assert.equal(typeof document.listeners.visibilitychange, 'function', 'tab visibility changes must trigger a clock resync');
  document.hidden = true;
  document.listeners.visibilitychange();
  assert.ok(stoppedDubSources >= 1, 'moving the player to the background must cancel stale dub scheduling');

  const producerControlCount = mediaControls.length;
  await element('#playButton').listeners.click();
  assert.equal(suspended, true);
  await element('#playButton').listeners.click();
  assert.equal(suspended, false);
  assert.equal(mediaControls.length, producerControlCount, 'player controls must not control the recording producer');

  assert.equal(typeof element('#seekRange').listeners.input, 'function');
  assert.equal(typeof element('#fullscreenButton').listeners.click, 'function');
  await element('#fullscreenButton').listeners.click();
  assert.equal(fullscreen, true);

  video.paused = false;
  video.listeners.waiting();
  assert.equal(video.paused, true, 'a stalled consumer must pause until its safety buffer is rebuilt');
  channel.onmessage({data: {type: 'media-chunk', data: new Blob([Uint8Array.from([4, 5, 6])])}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(video.paused, false, 'playback must resume after the safety buffer is rebuilt');

  video.play = async () => {
    throw new DOMException('The play() request was interrupted by a call to pause().', 'AbortError');
  };
  video.paused = false;
  await video.listeners.waiting();
  channel.onmessage({data: {type: 'media-chunk', data: new Blob([Uint8Array.from([7, 8, 9])])}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(
    element('#stageError').hidden,
    true,
    'an interrupted play request is recoverable and must never leave a blocking error overlay'
  );
  video.play = async () => { video.paused = false; };

  channel.onmessage({data: {type: 'media-final', fileName: 'capture.webm'}});
  assert.equal(element('#downloadVideoButton').disabled, true, 'custom export waits for finalized dub and timeline artifacts');

  video.currentTime = 2.5;
  const scheduledBeforeLateChunk = starts.length;
  channel.onmessage({data: {type: 'dub-chunk', data: new Int16Array(24000).buffer, start: 1}});
  assert.equal(starts.length, scheduledBeforeLateChunk, 'fully late speech must be dropped instead of playing out of sync');
});
