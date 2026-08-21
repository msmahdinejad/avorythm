import assert from 'node:assert/strict';
import test from 'node:test';

import {installCaptureWorker} from './fake-capture-worker.mjs';

test('delivers Gemini Live dubbed PCM and both transcripts through the real player bridge', async () => {
  const intervalCallbacks = [];
  globalThis.setInterval = (callback) => { intervalCallbacks.push(callback); return intervalCallbacks.length; };
  globalThis.clearInterval = () => {};

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
  element('#stageError').hidden = true;
  const video = element('#video');
  globalThis.document = {
    documentElement: {lang: 'en', dir: 'ltr'},
    fullscreenElement: null,
    addEventListener() {},
    querySelector: element,
    querySelectorAll: () => []
  };
  globalThis.window = {close() {}};

  const channels = new Set();
  globalThis.BroadcastChannel = class {
    constructor(name) { this.name = name; channels.add(this); }
    postMessage(data) {
      for (const peer of channels) {
        if (peer !== this && peer.name === this.name) queueMicrotask(() => peer.onmessage?.({data: structuredClone(data)}));
      }
    }
    close() { channels.delete(this); }
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
      queueMicrotask(() => this.listeners.updateend?.());
    }
    remove() {}
  }
  globalThis.MediaSource = class {
    static isTypeSupported() { return true; }
    readyState = 'open';
    addEventListener(type, listener) { if (type === 'sourceopen') queueMicrotask(listener); }
    addSourceBuffer() { return new FakeSourceBuffer(); }
    endOfStream() {}
  };
  globalThis.URL.createObjectURL = () => 'blob:player';
  globalThis.URL.revokeObjectURL = () => {};

  let worklet;
  const startedDubBuffers = [];
  class AudioNode { connect() { return this; } disconnect() {} }
  globalThis.AudioContext = class {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
      this.state = 'suspended';
      this.audioWorklet = {addModule: async () => {}};
    }
    createMediaStreamSource() { return new AudioNode(); }
    createGain() {
      const node = new AudioNode();
      node.gain = {value: 1, setTargetAtTime() {}, cancelScheduledValues() {}};
      return node;
    }
    createBuffer(channelsCount, length, rate) {
      const samples = new Float32Array(length);
      return {duration: length / rate, samples, getChannelData: () => samples};
    }
    createBufferSource() {
      const source = new AudioNode();
      source.start = () => startedDubBuffers.push(source.buffer.samples.slice());
      source.stop = () => {};
      return source;
    }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
  };
  globalThis.AudioWorkletNode = class extends AudioNode {
    constructor() { super(); this.port = {}; worklet = this; }
  };

  const files = new Map();
  installCaptureWorker(files);
  const root = {
    async *entries() {},
    async removeEntry(name) { files.delete(name); },
    async getFileHandle(name) {
      const chunks = files.get(name) || [];
      files.set(name, chunks);
      return {
        async createWritable() { return {async write(value) { chunks.push(value); }, async close() {}, async seek() {}}; },
        async getFile() { return new Blob(chunks); }
      };
    }
  };
  const stream = {getVideoTracks: () => [{}], getTracks: () => []};
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
    mediaDevices: {async getUserMedia() { return stream; }},
    storage: {async getDirectory() { return root; }}
  }});

  let mediaRecorder;
  globalThis.MediaRecorder = class {
    static isTypeSupported() { return true; }
    state = 'recording';
    mimeType = 'video/webm';
    constructor() { mediaRecorder = this; }
    start() {}
    requestData() {}
    stop() { this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); }
  };

  let socket;
  let audioMessages = 0;
  globalThis.WebSocket = class {
    static OPEN = 1;
    readyState = 0;
    constructor() { socket = this; queueMicrotask(() => { this.readyState = 1; this.onopen(); }); }
    send(payload) {
      const message = JSON.parse(payload);
      if (message.setup) {
        queueMicrotask(() => this.onmessage({data: JSON.stringify({setupComplete: {}})}));
        return;
      }
      if (!message.realtimeInput?.audio || ++audioMessages !== 2) return;
      const dubbed = new Int16Array(24000).fill(1200);
      const events = [
        {serverContent: {modelTurn: {parts: [{inlineData: {data: Buffer.from(dubbed.buffer).toString('base64')}}]}}},
        {serverContent: {inputTranscription: {text: 'Hello there'}}},
        {serverContent: {outputTranscription: {text: 'سلام دنیا'}}}
      ];
      for (const event of events) queueMicrotask(() => this.onmessage({data: JSON.stringify(event)}));
    }
    close() { this.readyState = 3; }
  };

  let receiveOffscreen;
  const settings = {
    locale: 'en',
    playbackMode: 'synchronized',
    syncBufferSeconds: 8,
    syncCaptionEngine: 'gemini',
    synchronizedOutput: {
      originalAudioEnabled: false,
      dubAudioEnabled: true,
      sourceSubtitlesEnabled: true,
      translatedSubtitlesEnabled: true,
      originalVolume: 1,
      dubVolume: 1,
      autoDuck: true
    }
  };
  globalThis.chrome = {
    storage: {
      local: {async get() { return {settings}; }, async set() {}},
      session: {async get() { return {}; }, async set() {}}
    },
    runtime: {
      onMessage: {addListener(listener) { receiveOffscreen = listener; }},
      async sendMessage(message) {
        if (message.type === 'state') return {ok: true, state: {active: true, sourceTitle: 'Integration video'}};
        return {ok: true};
      },
      async openOptionsPage() {}
    }
  };

  await import(`../extension/player.js?bridge-e2e=${Date.now()}`);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await import(`../extension/offscreen.js?bridge-e2e=${Date.now()}`);
  const response = await new Promise((resolve) => receiveOffscreen({
    target: 'offscreen', type: 'start', streamId: 'stream', apiKey: 'key', groqApiKey: '', config: settings
  }, {}, resolve));
  assert.deepEqual(response, {ok: true});

  for (const callback of intervalCallbacks) callback();
  await new Promise((resolve) => setTimeout(resolve, 0));
  mediaRecorder.ondataavailable({data: new Blob([Uint8Array.of(1)])});
  mediaRecorder.ondataavailable({data: new Blob([Uint8Array.of(2)])});
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element('#activateButton').listeners.click();

  worklet.port.onmessage({data: new Uint8Array(new Int16Array(16000).fill(5000).buffer)});
  worklet.port.onmessage({data: new Uint8Array(new Int16Array(8000).buffer)});
  for (let attempt = 0; attempt < 160 && (!startedDubBuffers.length || !element('#translatedCaption').textContent); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  assert.equal(socket.readyState, 1);
  assert.equal(element('#sourceCaption').textContent, 'Hello there');
  assert.equal(element('#translatedCaption').textContent, 'سلام دنیا');
  assert.equal(element('#sourceCaption').hidden, false);
  assert.equal(element('#translatedCaption').hidden, false);
  assert.equal(startedDubBuffers.length, 1);
  assert.equal(startedDubBuffers[0].some((sample) => sample !== 0), true);
});
