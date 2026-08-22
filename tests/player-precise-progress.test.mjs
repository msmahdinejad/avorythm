import assert from 'node:assert/strict';
import test from 'node:test';

test('precise playback shows captured lead immediately and starts from its first processed window', async () => {
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
    fullscreenElement: null,
    hidden: false,
    addEventListener() {},
    exitFullscreen: async () => {},
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

  class FakeSourceBuffer {
    constructor() {
      this.updating = false;
      this.listeners = {};
      this.endValue = 0;
      this.buffered = {length: 0, start: () => 0, end: () => this.endValue};
    }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    appendBuffer() {
      this.endValue += 5;
      this.buffered.length = 1;
      this.listeners.updateend?.();
    }
  }
  globalThis.MediaSource = class {
    static isTypeSupported() { return true; }
    readyState = 'open';
    addEventListener(type, listener) { if (type === 'sourceopen') queueMicrotask(listener); }
    addSourceBuffer() { return new FakeSourceBuffer(); }
    endOfStream() {}
  };
  globalThis.URL.createObjectURL = () => 'blob:precise-progress';
  globalThis.URL.revokeObjectURL = () => {};

  globalThis.chrome = {
    storage: {
      local: {
        async get() {
          return {settings: {
            locale: 'en',
            playbackMode: 'synchronized',
            syncCaptionEngine: 'whisper',
            syncBufferSeconds: 20
          }};
        },
        async set() {}
      },
      session: {async get() { return {}; }, async set() {}}
    },
    runtime: {
      async sendMessage(message) {
        if (message.type === 'state') return {ok: true, state: {active: true}};
        return {ok: true};
      },
      async openOptionsPage() {}
    }
  };

  await import('../extension/player.js?precise-progress-regression');
  await new Promise((resolve) => setTimeout(resolve, 0));
  channel.onmessage({data: {type: 'media-init', mimeType: 'video/webm', bufferSeconds: 20}});
  await new Promise((resolve) => setTimeout(resolve, 0));

  channel.onmessage({data: {type: 'media-chunk', data: new Blob([Uint8Array.of(1)])}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  const progressAfterFiveCapturedSeconds = element('#bufferPercent').textContent;
  const captureMetricAfterFiveSeconds = element('#captureProgress').textContent;
  const processedMetricBeforeWhisper = element('#processedProgress').textContent;

  for (const value of [2, 3]) {
    channel.onmessage({data: {type: 'media-chunk', data: new Blob([Uint8Array.of(value)])}});
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  channel.onmessage({data: {type: 'processing-frontier', seconds: 12}});

  assert.deepEqual(
    {
      progressAfterFiveCapturedSeconds,
      captureMetricAfterFiveSeconds,
      processedMetricBeforeWhisper,
      processedMetricAfterFirstWindow: element('#processedProgress').textContent,
      activateDisabledAfterFirstProcessedWindow: element('#activateButton').disabled
    },
    {
      progressAfterFiveCapturedSeconds: '25%',
      captureMetricAfterFiveSeconds: '25%',
      processedMetricBeforeWhisper: '0%',
      processedMetricAfterFirstWindow: '100%',
      activateDisabledAfterFirstProcessedWindow: false
    },
    'capture progress should not wait for Whisper, and the first safe processed window should be playable'
  );
});
