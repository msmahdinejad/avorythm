import assert from 'node:assert/strict';
import test from 'node:test';

test('replays the recorded OPFS snapshot when the synchronized player refreshes', async () => {
  let receive;
  let channel;
  let mediaRecorder;
  const files = new Map();
  globalThis.chrome = {
    runtime: {
      onMessage: {addListener(listener) { receive = listener; }},
      async sendMessage() { return {ok: true}; }
    }
  };
  class AudioNode { connect() { return this; } disconnect() {} }
  globalThis.AudioContext = class {
    currentTime = 0;
    destination = {};
    audioWorklet = {addModule: async () => {}};
    createMediaStreamSource() { return new AudioNode(); }
    createGain() { const node = new AudioNode(); node.gain = {value: 1, setTargetAtTime() {}, cancelScheduledValues() {}}; return node; }
    async resume() {}
    async close() {}
  };
  globalThis.AudioWorkletNode = class extends AudioNode { constructor() { super(); this.port = {}; } };
  const stream = {getVideoTracks: () => [{}], getTracks: () => []};
  const root = {
    async *entries() {},
    async removeEntry(name) { files.delete(name); },
    async getFileHandle(name) {
      const chunks = files.get(name) || [];
      files.set(name, chunks);
      return {
        async createWritable() {
          return {
            async write(value) { chunks.push(value); },
            async close() {},
            async seek() {}
          };
        },
        async getFile() { return new Blob(chunks); }
      };
    }
  };
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
    mediaDevices: {async getUserMedia() { return stream; }},
    storage: {async getDirectory() { return root; }}
  }});
  globalThis.BroadcastChannel = class {
    constructor() { this.messages = []; channel = this; }
    postMessage(message) { this.messages.push(message); }
    close() {}
  };
  globalThis.MediaRecorder = class {
    static isTypeSupported() { return true; }
    state = 'recording';
    mimeType = 'video/webm;codecs=vp9,opus';
    constructor() { mediaRecorder = this; }
    start() {}
    requestData() {}
    stop() { this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); }
  };
  globalThis.WebSocket = class {
    static OPEN = 1;
    readyState = 0;
    constructor() { queueMicrotask(() => { this.readyState = 1; this.onopen(); }); }
    send(payload) {
      if (!JSON.parse(payload).setup) return;
      queueMicrotask(() => this.onmessage({data: JSON.stringify({setupComplete: {}})}));
    }
    close() { this.readyState = 3; }
  };

  await import(`../extension/offscreen.js?replay=${Date.now()}`);
  const response = await new Promise((resolve) => receive({
    target: 'offscreen', type: 'start', streamId: 'stream', apiKey: 'test-key', groqApiKey: '',
    config: {playbackMode: 'synchronized', syncBufferSeconds: 20, syncCaptionEngine: 'gemini', targetLanguage: 'fa', recording: false}
  }, {}, resolve));
  assert.deepEqual(response, {ok: true});
  mediaRecorder.ondataavailable({data: new Blob([Uint8Array.from([1, 2, 3, 4])])});
  await new Promise((resolve) => setTimeout(resolve, 0));

  channel.messages.length = 0;
  await channel.onmessage({data: {type: 'ready', position: 3.4}});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(channel.messages[0]?.type, 'session-reset');
  assert.equal(channel.messages[0]?.position, 3.4);
  assert.equal(channel.messages.some((message) => message.type === 'media-init'), true);
  const replay = channel.messages.find((message) => message.type === 'media-chunk');
  assert.equal(replay?.data?.size, 4, 'refresh must replay bytes already recorded before it resumes live chunks');

  await new Promise((resolve) => receive({target: 'offscreen', type: 'stop'}, {}, resolve));
});
