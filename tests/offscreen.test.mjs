import assert from 'node:assert/strict';
import test from 'node:test';

test('serializes consecutive Blob-framed Gemini messages', async () => {
  let receive;
  let worklet;
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
  let tokenNumber = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens');
    assert.equal(options.headers['x-goog-api-key'], 'test-key');
    const request = JSON.parse(options.body);
    assert.equal(request.bidiGenerateContentSetup.model, 'models/gemini-3.5-live-translate-preview');
    tokenNumber += 1;
    return {ok: true, async json() { return {name: `auth_tokens/test-${tokenNumber}`}; }};
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
  globalThis.AudioWorkletNode = class extends AudioNode {
    constructor() {
      super();
      this.port = {};
      worklet = this;
    }
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {mediaDevices: {async getUserMedia() { return {getTracks: () => []}; }}}
  });

  globalThis.WebSocket = class {
    static OPEN = 1;
    static instances = [];
    readyState = 0;
    sent = [];
    constructor(url) {
      assert.match(url, /v1alpha\.GenerativeService\.BidiGenerateContentConstrained\?access_token=auth_tokens%2Ftest-/);
      WebSocket.instances.push(this);
      queueMicrotask(() => {
        this.readyState = WebSocket.OPEN;
        this.onopen();
      });
    }
    send(payload) {
      this.sent.push(JSON.parse(payload));
      if (!this.sent.at(-1).setup) return;
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
    close() {
      if (this.readyState === 3) return;
      this.readyState = 3;
      queueMicrotask(() => this.onclose?.());
    }
  };

  await import('../extension/offscreen.js');
  const response = await new Promise((resolve) => receive({
    target: 'offscreen',
    type: 'start',
    streamId: 'test-stream',
    apiKey: 'test-key',
    config: {
      targetLanguage: 'fa',
      originalAudioEnabled: false,
      dubAudioEnabled: true,
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

  worklet.port.onmessage({data: Uint8Array.from([0, 1])});
  assert.equal(WebSocket.instances[0].sent.at(-1).realtimeInput.audio.data, 'AAE=');

  WebSocket.instances[0].onmessage({data: new Blob([JSON.stringify({goAway: {timeLeft: '10s'}})])});
  await new Promise((resolve) => setTimeout(resolve, 700));
  assert.equal(WebSocket.instances.length, 2);
  assert.equal(WebSocket.instances[1].sent[0].setup.model, 'models/gemini-3.5-live-translate-preview');

  const stopped = await new Promise((resolve) => receive({
    target: 'offscreen',
    type: 'stop'
  }, {}, resolve));
  assert.deepEqual(stopped, {ok: true});
  assert.equal(reports.some((message) => message.type === 'download'), false);
  assert.equal(reports.some((message) => message.update?.recordingReady), false);
});
