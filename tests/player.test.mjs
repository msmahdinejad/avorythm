import assert from 'node:assert/strict';
import test from 'node:test';

test('buffers media, schedules dub speech, and controls the source tab', async () => {
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
  const video = element('#video');
  video.currentTime = 0;
  video.paused = true;
  video.volume = 1;
  video.muted = false;
  video.play = async () => { video.paused = false; };
  video.pause = () => { video.paused = true; };
  globalThis.document = {
    documentElement: {lang: 'en', dir: 'ltr'},
    querySelector: element,
    querySelectorAll: () => []
  };
  globalThis.window = {close() {}};
  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};

  let channel;
  globalThis.BroadcastChannel = class {
    constructor(name) { assert.equal(name, 'avorythm-sync'); channel = this; }
    postMessage() {}
  };

  let sourceBuffer;
  class FakeSourceBuffer {
    constructor() {
      this.updating = false;
      this.listeners = {};
      this.end = 0;
      this.appended = [];
      this.removed = [];
      this.buffered = {length: 0, start: () => 0, end: () => this.end};
    }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    appendBuffer(data) {
      this.appended.push(data);
      this.end = 5;
      this.buffered.length = 1;
      this.listeners.updateend?.();
    }
    remove(start, end) { this.removed.push({start, end}); }
  }
  globalThis.MediaSource = class {
    static isTypeSupported() { return true; }
    addEventListener(type, listener) { if (type === 'sourceopen') queueMicrotask(listener); }
    addSourceBuffer() { sourceBuffer = new FakeSourceBuffer(); return sourceBuffer; }
  };
  globalThis.URL.createObjectURL = () => 'blob:player';

  const starts = [];
  let suspended = false;
  class FakeAudioContext {
    constructor() { this.currentTime = 2; this.destination = {}; }
    createGain() { return {gain: {setTargetAtTime() {}}, connect() {}}; }
    createBuffer(channels, length, rate) {
      return {duration: length / rate, getChannelData: () => new Float32Array(length)};
    }
    createBufferSource() {
      return {connect() {}, start: (when, offset) => starts.push({when, offset}), stop() {}};
    }
    async resume() { suspended = false; }
    async suspend() { suspended = true; }
  }
  globalThis.AudioContext = FakeAudioContext;

  const mediaControls = [];
  globalThis.chrome = {
    storage: {local: {async get() { return {settings: {locale: 'en', playbackMode: 'synchronized', syncBufferSeconds: 4.5, originalAudioEnabled: true, dubAudioEnabled: true, sourceSubtitlesEnabled: true, translatedSubtitlesEnabled: true, originalVolume: .5, dubVolume: 1}}; }, async set() {}}},
    runtime: {
      async sendMessage(message) {
        if (message.type === 'state') return {ok: true, state: {sourceTitle: 'Test video'}};
        if (message.type === 'media-control') mediaControls.push(message.action);
        return {ok: true};
      },
      async openOptionsPage() {}
    }
  };

  await import('../extension/player.js');
  await new Promise((resolve) => setTimeout(resolve, 0));
  channel.onmessage({data: {type: 'media-init', mimeType: 'video/webm', bufferSeconds: 4.5}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  channel.onmessage({data: {type: 'media-chunk', data: new Blob([Uint8Array.from([1, 2, 3])])}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sourceBuffer.appended.length, 1);
  assert.equal(element('#activateButton').disabled, false);

  await element('#activateButton').listeners.click();
  channel.onmessage({data: {type: 'dub-chunk', data: new Int16Array(24000).buffer, start: 1}});
  assert.deepEqual(starts, [{when: 3, offset: 0}]);

  await element('#playButton').listeners.click();
  assert.equal(suspended, true);
  assert.equal(mediaControls.at(-1), 'pause');
  await element('#playButton').listeners.click();
  assert.equal(suspended, false);
  assert.equal(mediaControls.at(-1), 'play');

  video.currentTime = 2.5;
  channel.onmessage({data: {type: 'dub-chunk', data: new Int16Array(24000).buffer, start: 1}});
  assert.equal(starts.length, 1, 'fully late speech must be dropped instead of playing out of sync');
});
