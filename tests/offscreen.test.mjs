import assert from 'node:assert/strict';
import test from 'node:test';

test('serializes consecutive Blob-framed Gemini messages', async () => {
  let receive;
  const reports = [];
  let sourceReported;
  const sourceReport = new Promise((resolve) => { sourceReported = resolve; });
  globalThis.chrome = {
    runtime: {
      onMessage: {addListener(listener) { receive = listener; }},
      async sendMessage(message) {
        reports.push(message);
        if (message.update?.sourceText) sourceReported();
        return {ok: true};
      }
    }
  };

  class AudioNode {
    connect() { return this; }
    disconnect() {}
  }
  class FakeAudioContext {
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
  }
  globalThis.AudioContext = FakeAudioContext;
  globalThis.AudioWorkletNode = class extends AudioNode { port = {}; };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {mediaDevices: {async getUserMedia() { return {getTracks: () => []}; }}}
  });

  globalThis.WebSocket = class {
    static OPEN = 1;
    readyState = 0;
    constructor() {
      queueMicrotask(() => {
        this.readyState = WebSocket.OPEN;
        this.onopen();
      });
    }
    send(payload) {
      if (!JSON.parse(payload).setup) return;
      class DelayedBlob extends Blob {
        async text() {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return super.text();
        }
      }
      queueMicrotask(() => {
        this.onmessage({data: new DelayedBlob([JSON.stringify({setupComplete: {}})])});
        this.onmessage({data: new Blob([JSON.stringify({
          serverContent: {inputTranscription: {text: 'Hello', finished: false}}
        })])});
      });
    }
    close() { this.readyState = 3; }
  };

  await import('../extension/offscreen.js');
  const response = await new Promise((resolve) => receive({
    target: 'offscreen',
    type: 'start',
    streamId: 'test-stream',
    apiKey: 'test-key',
    config: {
      targetLanguage: 'fa',
      voice: 'Native',
      audioMode: 'dub',
      originalVolume: 0,
      dubVolume: 1,
      autoDuck: true,
      recording: false
    }
  }, {}, resolve));

  assert.deepEqual(response, {ok: true});
  await sourceReport;
  assert.deepEqual(reports.map(({update}) => update.status || update.sourceText).filter(Boolean), [
    'connected',
    'Hello'
  ]);
});
