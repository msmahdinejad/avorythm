import assert from 'node:assert/strict';
import test from 'node:test';
import {installCaptureWorker} from './fake-capture-worker.mjs';

test('Gemini Live publishes translated captions on the exact dubbed-audio interval', async () => {
  let receive;
  let worklet;
  let channel;
  let socket;
  const files = new Map();
  installCaptureWorker(files);
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
    createGain() {
      const node = new AudioNode();
      node.gain = {value: 1, setTargetAtTime() {}, cancelScheduledValues() {}};
      return node;
    }
    async resume() {}
    async close() {}
  };
  globalThis.AudioWorkletNode = class extends AudioNode {
    constructor() { super(); this.port = {}; worklet = this; }
  };
  const root = {
    async *entries() {},
    async removeEntry(name) { files.delete(name); },
    async getFileHandle(name) {
      const chunks = files.get(name) || [];
      files.set(name, chunks);
      return {
        async createWritable() {
          return {async write(value) { chunks.push(value); }, async close() {}, async seek() {}};
        },
        async getFile() { return new Blob(chunks); }
      };
    }
  };
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
    mediaDevices: {async getUserMedia() { return {getVideoTracks: () => [{}], getTracks: () => []}; }},
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
    mimeType = 'video/webm';
    start() {}
    requestData() {}
    stop() { this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); }
  };
  globalThis.WebSocket = class {
    static OPEN = 1;
    readyState = 0;
    constructor() {
      socket = this;
      queueMicrotask(() => { this.readyState = 1; this.onopen(); });
    }
    send(payload) {
      if (JSON.parse(payload).setup) queueMicrotask(() => this.onmessage({data: JSON.stringify({setupComplete: {}})}));
    }
    close() { this.readyState = 3; }
  };

  await import(`../extension/offscreen.js?turn-sync=${Date.now()}`);
  const started = await new Promise((resolve) => receive({
    target: 'offscreen', type: 'start', streamId: 'stream', apiKey: 'gemini-key', groqApiKey: '',
    config: {playbackMode: 'synchronized', syncBufferSeconds: 20, syncCaptionEngine: 'gemini', targetLanguage: 'fa', recording: false}
  }, {}, resolve));
  assert.deepEqual(started, {ok: true});
  await channel.onmessage({data: {type: 'ready', position: 0}});

  const voiced = new Int16Array(16000).fill(5000);
  const silence = new Int16Array(8000);
  worklet.port.onmessage({data: new Uint8Array(voiced.buffer)});
  worklet.port.onmessage({data: new Uint8Array(silence.buffer)});
  const dubbed = new Int16Array(24000).fill(800);
  socket.onmessage({data: JSON.stringify({serverContent: {modelTurn: {parts: [{inlineData: {data: Buffer.from(dubbed.buffer).toString('base64')}}]}}})});
  socket.onmessage({data: JSON.stringify({serverContent: {outputTranscription: {text: 'سلام.', finished: true}}})});
  socket.onmessage({data: JSON.stringify({serverContent: {turnComplete: true}})});
  await new Promise((resolve) => setTimeout(resolve, 0));

  const dub = channel.messages.find((message) => message.type === 'dub-chunk');
  const caption = channel.messages.find((message) => message.type === 'caption' && message.translated);
  assert.ok(dub, 'the Live turn must publish dubbed PCM');
  assert.ok(caption, 'the same Live turn must publish its translated caption');
  assert.deepEqual(
    {start: caption.start, end: caption.end},
    {start: dub.start, end: dub.start + dub.duration},
    'translated text and translated speech must share one timeline interval'
  );

  await new Promise((resolve) => receive({target: 'offscreen', type: 'stop'}, {}, resolve));
});
