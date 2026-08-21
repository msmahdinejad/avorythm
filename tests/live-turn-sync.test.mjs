import assert from 'node:assert/strict';
import test from 'node:test';
import {installCaptureWorker} from './fake-capture-worker.mjs';

test('Gemini Live publishes translated captions on the exact dubbed-audio interval', async () => {
  let receive;
  let worklet;
  let channel;
  let socket;
  const files = new Map([
    ['avorythm-capture-stale.webm', [Uint8Array.of(1)]],
    ['avorythm-sync-artifact-stale-timeline.json', [Uint8Array.of(2)]],
    ['unrelated-user-file.bin', [Uint8Array.of(3)]]
  ]);
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
    async *entries() { yield* files.entries(); },
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
  assert.equal(files.has('avorythm-capture-stale.webm'), false);
  assert.equal(files.has('avorythm-sync-artifact-stale-timeline.json'), false);
  assert.equal(files.has('unrelated-user-file.bin'), true, 'cleanup must stay inside Avorythm-owned files');
  assert.equal(
    [...files.keys()].filter((name) => name.startsWith('avorythm-capture-')).length,
    1,
    'only the current synchronized capture is retained'
  );
  await channel.onmessage({data: {type: 'ready', position: 0}});

  const voiced = new Int16Array(16000).fill(5000);
  const silence = new Int16Array(8000);
  worklet.port.onmessage({data: new Uint8Array(voiced.buffer)});
  worklet.port.onmessage({data: new Uint8Array(silence.buffer)});
  const dubbed = new Int16Array(24000).fill(800);
  socket.onmessage({data: JSON.stringify({serverContent: {modelTurn: {parts: [{inlineData: {data: Buffer.from(dubbed.buffer).toString('base64')}}]}}})});
  // Google can emit generationComplete noticeably before turnComplete while it
  // waits for assumed real-time playback. The synchronized player must not keep
  // the finished audio trapped during that gap or playback reaches the cue in
  // silence and subsequently drops it as late.
  socket.onmessage({data: JSON.stringify({serverContent: {generationComplete: true}})});
  await new Promise((resolve) => setTimeout(resolve, 0));

  const dub = channel.messages.find((message) => message.type === 'dub-chunk');
  assert.ok(dub, 'the Live turn must publish dubbed PCM');

  // Transcription messages are independent incremental updates and can land
  // after generationComplete. Keep the interval open until turnComplete so the
  // late text still receives the exact audio timing.
  socket.onmessage({data: JSON.stringify({serverContent: {outputTranscription: {text: 'سلام.', finished: true}}})});
  socket.onmessage({data: JSON.stringify({serverContent: {turnComplete: true}})});
  await new Promise((resolve) => setTimeout(resolve, 0));
  const caption = channel.messages.find((message) => message.type === 'caption' && message.translated);
  assert.ok(caption, 'the same Live turn must publish its translated caption');
  assert.deepEqual(
    {start: caption.start, end: caption.end},
    {start: dub.start, end: dub.start + dub.duration},
    'translated text and translated speech must share one timeline interval'
  );

  assert.equal(
    channel.messages.filter((message) => message.type === 'dub-chunk').length,
    1,
    'turnComplete after generationComplete must not publish the same audio twice'
  );

  await new Promise((resolve) => receive({target: 'offscreen', type: 'stop'}, {}, resolve));
});
