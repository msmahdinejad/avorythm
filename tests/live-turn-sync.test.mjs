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

  const voiced = new Int16Array(32000).fill(5000);
  worklet.port.onmessage({data: new Uint8Array(voiced.buffer)});
  const dubbed = new Int16Array(26400);
  dubbed.fill(800, 2400, 24000);
  dubbed.fill(48, 24000); // quiet final phoneme: still part of Gemini's natural PCM
  socket.onmessage({data: JSON.stringify({serverContent: {modelTurn: {parts: [{inlineData: {data: Buffer.from(dubbed.buffer).toString('base64')}}]}}})});
  socket.onmessage({data: JSON.stringify({serverContent: {inputTranscription: {text: 'Hello there'}}})});
  socket.onmessage({data: JSON.stringify({serverContent: {outputTranscription: {text: 'سلام دنیا'}}})});
  // The real continuous Live Translate stream can return hundreds of audio and
  // transcript messages without either completion flag, even after audioStreamEnd.
  await new Promise((resolve) => setTimeout(resolve, 700));

  const dub = channel.messages.find((message) => message.type === 'dub-chunk');
  assert.ok(dub, 'an idle continuous Live stream must release dubbed PCM without waiting for turnComplete');
  assert.equal(
    new Int16Array(dub.data).length,
    dubbed.length,
    'the player must receive Gemini PCM unchanged instead of pitch-shifting it to the source interval'
  );
  assert.deepEqual(
    [...new Int16Array(dub.data).subarray(0, 2401)],
    [...dubbed.subarray(0, 2401)],
    'the synchronized bridge must preserve the original PCM samples'
  );
  assert.equal(dub.duration, dubbed.length / 24000);

  const caption = channel.messages.find((message) => message.type === 'caption' && message.translated);
  assert.ok(caption, 'idle flushing must include an unfinished transcript fragment with its audio');
  assert.equal(caption.text, 'سلام دنیا');
  assert.equal(caption.start, dub.start + 0.1, 'translated captions must begin with the first audible dubbed sample');
  assert.equal(caption.end, dub.start + dub.duration, 'translated captions must end with their natural dubbed audio');

  worklet.port.onmessage({data: new Uint8Array(voiced.buffer)});
  socket.onmessage({data: JSON.stringify({serverContent: {modelTurn: {parts: [{inlineData: {data: Buffer.from(dubbed.buffer).toString('base64')}}]}}})});
  socket.onmessage({data: JSON.stringify({serverContent: {inputTranscription: {text: 'Again.'}}})});
  socket.onmessage({data: JSON.stringify({serverContent: {outputTranscription: {text: 'دوباره.'}}})});
  await new Promise((resolve) => setTimeout(resolve, 700));
  const dubs = channel.messages.filter((message) => message.type === 'dub-chunk');
  assert.equal(dubs.length, 2, 'continuous speech must release every translated audio burst');
  assert.ok(
    dubs[1].start >= dubs[0].start + dubs[0].duration,
    'successive dubbed bursts must advance monotonically instead of being dropped as overlapping late audio'
  );

  socket.onmessage({data: JSON.stringify({serverContent: {generationComplete: true}})});
  socket.onmessage({data: JSON.stringify({serverContent: {turnComplete: true}})});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(
    channel.messages.filter((message) => message.type === 'dub-chunk').length,
    2,
    'turnComplete after generationComplete must not publish the same audio twice'
  );

  worklet.port.onmessage({data: new Uint8Array(voiced.buffer)});
  socket.onmessage({data: JSON.stringify({serverContent: {modelTurn: {parts: [{inlineData: {data: Buffer.from(dubbed.buffer).toString('base64')}}]}}})});
  for (let index = 0; index < 16; index += 1) {
    socket.onmessage({data: JSON.stringify({serverContent: {outputTranscription: {text: 'گفتار پیوسته بدون مکث'}}})});
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.equal(
    channel.messages.filter((message) => message.type === 'dub-chunk').length,
    3,
    'continuous server traffic must be released on a bounded deadline even when the idle timer never fires'
  );

  await new Promise((resolve) => receive({target: 'offscreen', type: 'stop'}, {}, resolve));
  assert.equal(
    channel.messages.filter((message) => message.type === 'caption' && message.text === 'گفتار پیوسته بدون مکث').length,
    1,
    'a bounded partial flush must not repeat a cumulative transcript at final shutdown'
  );
});
