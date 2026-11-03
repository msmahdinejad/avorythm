import assert from 'node:assert/strict';
import test from 'node:test';

import {fitNarrationDuration, PreciseDubbingPipeline} from '../extension/precise-pipeline.mjs';
import {installCaptureWorker} from './fake-capture-worker.mjs';

const isVoice = (url) => /-tts:generateContent/u.test(String(url));
const wav = (pcm) => {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24); header.writeUInt32LE(48000, 28); header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
};
// A Gemini TTS response carrying `bytes` as the WAV the real API returns.
const voiceResponse = (bytes) => ({ok: true, async json() {
  return {candidates: [{content: {parts: [{inlineData: {mimeType: 'audio/wav', data: wav(bytes).toString('base64')}}]}}]};
}});
const pcmOf = (samples, value = 1000) => {
  const bytes = Buffer.alloc(samples * 2);
  for (let index = 0; index < samples; index += 1) bytes.writeInt16LE(value, index * 2);
  return bytes;
};

test('invokes an injected native fetch without binding it to the pipeline', async () => {
  const fetchReceivers = [];
  const requests = [];
  async function nativeFetchLike(url) {
    fetchReceivers.push(this === undefined ? 'undefined' : this?.constructor?.name || typeof this);
    requests.push(String(url));
    if (String(url).includes('api.groq.com')) {
      return {ok: true, async json() { return {segments: [{start: 0, end: 1, text: 'Hello.'}]}; }};
    }
    if (isVoice(url)) return voiceResponse(pcmOf(24000));
    return {ok: true, async json() {
      return {candidates: [{content: {parts: [{text: '[{"id":0,"text":"سلام."}]'}]}}]};
    }};
  }
  const dubs = [];
  const pipeline = new PreciseDubbingPipeline({
    geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Kore',
    fetchImpl: nativeFetchLike,
    onCaption() {}, onDub: (chunk) => dubs.push(chunk), onFrontier() {}, onSourceText: async () => {},
    onWarning: (error) => { throw error; }
  });

  pipeline.push(new Uint8Array(12 * 16000 * 2));
  await pipeline.busy;

  assert.match(requests[0], /api\.groq\.com/u);
  assert.match(requests[1], /generativelanguage\.googleapis\.com/u);
  assert.match(requests[2], /models\/gemini-3\.8-flash-tts:generateContent/u);
  assert.equal(dubs.length, 1, 'the successful mock path must reach Gemini 3.8 narration');
  assert.deepEqual(
    fetchReceivers,
    ['undefined', 'undefined', 'undefined'],
    'browser native fetch throws Illegal invocation when called with the pipeline as this'
  );
});

test('holds an unfinished utterance across Whisper windows instead of dubbing a broken sentence', async () => {
  let groqCall = 0;
  const sourceCaptions = [];
  const voiceBodies = [];
  const fetchImpl = async (url, options) => {
    if (String(url).includes('api.groq.com')) {
      groqCall += 1;
      return {ok:true,async json(){return {segments:groqCall===1
        ? [{start:8,end:11,text:'Hello'}]
        : [{start:.5,end:2,text:'world.'}]};}};
    }
    if (isVoice(url)) { voiceBodies.push(JSON.parse(options.body)); return voiceResponse(pcmOf(24000)); }
    return {ok:true,async json(){return {candidates:[{content:{parts:[{text:'[{"id":0,"text":"سلام دنیا."}]'}]}}]};}};
  };
  const pipeline=new PreciseDubbingPipeline({
    geminiKey:'gemini',groqKey:'groq',targetLanguage:'fa',voiceName:'Kore',fetchImpl,
    onCaption:(translated,cue)=>{if(!translated)sourceCaptions.push(cue);},onDub(){},onFrontier(){},onSourceText:async()=>{},onWarning:(error)=>{throw error;}
  });
  pipeline.push(new Uint8Array(12*16000*2));
  await pipeline.busy;
  assert.equal(voiceBodies.length,0,'an unfinished sentence must wait for the next overlapping window');
  pipeline.push(new Uint8Array(10.5*16000*2));
  await pipeline.busy;
  assert.equal(sourceCaptions.map((cue)=>cue.text).join(' '),'Hello world.');
  assert.equal(voiceBodies[0].contents[0].parts[0].text,'سلام دنیا.');
});

test('emits an utterance crossing the Whisper overlap exactly once', async () => {
  let groqCall = 0;
  const sourceCaptions = [];
  const dubs = [];
  const pipeline = new PreciseDubbingPipeline({
    geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Kore',
    fetchImpl: async (url) => {
      if (String(url).includes('api.groq.com')) {
        groqCall += 1;
        return {ok: true, async json() { return {segments: groqCall === 1
          ? [{start: 10.4, end: 11.8, text: 'Overlap sentence.'}]
          : [{start: 0, end: 1.4, text: 'Overlap sentence.'}]
        }; }};
      }
      if (isVoice(url)) return voiceResponse(pcmOf(2400));
      return {ok: true, async json() { return {candidates: [{content: {parts: [{text:
        '[{"id":0,"text":"جمله مشترک."}]'
      }]}}]}; }};
    },
    onCaption: (translated, cue) => { if (!translated) sourceCaptions.push(cue.text); },
    onDub: (chunk) => dubs.push(chunk), onFrontier() {}, onSourceText: async () => {},
    onWarning: (error) => { throw error; }
  });

  pipeline.push(new Uint8Array(12 * 16000 * 2));
  await pipeline.busy;
  pipeline.push(new Uint8Array(10.5 * 16000 * 2));
  await pipeline.busy;

  assert.deepEqual(sourceCaptions, ['Overlap sentence.']);
  assert.equal(dubs.length, 1, 'the overlap must not spend a second translation/narration request');
});

test('narrates each translated utterance with one Gemini 3.8 TTS request using the chosen voice', async () => {
  const bodies = [];
  const urls = [];
  const dubs = [];
  const fetchImpl = async (url, options) => {
    if (String(url).includes('api.groq.com')) {
      return {ok: true, async json() { return {segments: [
        {start: 0, end: 1, text: 'Hello.'},
        {start: 1, end: 2, text: 'Welcome.'}
      ]}; }};
    }
    if (isVoice(url)) { urls.push(String(url)); bodies.push(JSON.parse(options.body)); return voiceResponse(pcmOf(24000)); }
    return {ok: true, async json() { return {candidates: [{content: {parts: [{text: '[{"id":0,"text":"سلام."},{"id":1,"text":"خوش آمدید."}]'}]}}]}; }};
  };
  const pipeline = new PreciseDubbingPipeline({
    geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Puck', voiceModel: 'gemini-3.8-flash-lite-tts',
    fetchImpl,
    onCaption() {}, onDub: (chunk) => dubs.push(chunk), onFrontier() {}, onSourceText: async () => {},
    onWarning: (error) => { throw error; }
  });
  pipeline.push(new Uint8Array(12 * 16000 * 2));
  await pipeline.busy;
  assert.deepEqual(bodies.map((body) => body.contents[0].parts[0].text), ['سلام.', 'خوش آمدید.']);
  assert.ok(urls.every((url) => /models\/gemini-3\.8-flash-lite-tts:generateContent\?key=gemini$/u.test(url)));
  assert.deepEqual(bodies[0].generationConfig, {
    responseModalities: ['AUDIO'],
    speechConfig: {voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Puck'}}}
  });
  assert.equal(dubs.length, 2);
});

test('strips the WAV header and ignores unknown voice models', async () => {
  const urls = [];
  const dubs = [];
  const pipeline = new PreciseDubbingPipeline({
    geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Kore', voiceModel: 'gemini-3.8-flash-tts',
    fetchImpl: async (url) => {
      if (String(url).includes('api.groq.com')) return {ok: true, async json() { return {segments: [{start: 0, end: 1, text: 'One.'}]}; }};
      if (isVoice(url)) { urls.push(String(url)); return voiceResponse(pcmOf(2400, 777)); }
      return {ok: true, async json() { return {candidates: [{content: {parts: [{text: '[{"id":0,"text":"یک."}]'}]}}]}; }};
    },
    onCaption() {}, onDub: (chunk) => dubs.push(chunk), onFrontier() {}, onSourceText: async () => {},
    onWarning: (error) => { throw error; }
  });
  pipeline.push(new Uint8Array(12 * 16000 * 2));
  await pipeline.busy;
  assert.match(urls[0], /models\/gemini-3\.8-flash-tts:generateContent/u, 'a retired model id falls back to the default');
  const samples = new Int16Array(dubs[0].data);
  assert.equal(samples[0], 777, 'the 44-byte WAV header must not leak into the audio');
  assert.equal(samples.length, 2400, 'exactly the PCM payload, nothing from the container');
});

test('retries a failed narration once, then reports auth and quota errors by code', async () => {
  const run = async (statuses) => {
    const warnings = [];
    const dubs = [];
    let calls = 0;
    const pipeline = new PreciseDubbingPipeline({
      geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Kore', timeouts: {retryDelayMs: 0},
      fetchImpl: async (url) => {
        if (String(url).includes('api.groq.com')) return {ok: true, async json() { return {segments: [{start: 0, end: 1, text: 'One.'}]}; }};
        if (isVoice(url)) {
          const status = statuses[Math.min(calls++, statuses.length - 1)];
          return status === 200 ? voiceResponse(pcmOf(2400)) : {ok: false, status};
        }
        return {ok: true, async json() { return {candidates: [{content: {parts: [{text: '[{"id":0,"text":"یک."}]'}]}}]}; }};
      },
      onCaption() {}, onDub: (chunk) => dubs.push(chunk), onFrontier() {}, onSourceText: async () => {},
      onWarning: (error) => warnings.push(error.message)
    });
    pipeline.push(new Uint8Array(12 * 16000 * 2));
    await pipeline.busy;
    return {warnings, dubs: dubs.length, calls};
  };
  assert.deepEqual(await run([500, 200]), {warnings: [], dubs: 1, calls: 2});
  assert.deepEqual(await run([401]), {warnings: ['gemini_voice_auth_failed'], dubs: 0, calls: 1});
  assert.deepEqual(await run([429]), {warnings: ['gemini_voice_quota_exceeded'], dubs: 0, calls: 1});
  assert.deepEqual(await run([500, 500]), {warnings: ['gemini_voice_failed'], dubs: 0, calls: 2});
});

test('never advances the playable frontier beyond a failed precise window', async () => {
  let groqCalls = 0;
  const warnings = [];
  const frontiers = [];
  const pipeline = new PreciseDubbingPipeline({
    geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Kore',
    fetchImpl: async (url) => {
      if (String(url).includes('api.groq.com')) {
        groqCalls += 1;
        return groqCalls === 1
          ? {ok: false, status: 400}
          : {ok: true, async json() { return {segments: []}; }};
      }
      throw new Error('translation should not run');
    },
    onCaption() {}, onDub() {},
    onFrontier: (seconds) => frontiers.push(seconds), onSourceText: async () => {},
    onWarning: (error) => warnings.push(error.message)
  });
  pipeline.push(new Uint8Array(12 * 16000 * 2));
  await pipeline.busy;
  pipeline.push(new Uint8Array(12 * 16000 * 2));
  await pipeline.busy;
  assert.deepEqual(warnings, ['groq_transcription_failed']);
  assert.equal(groqCalls, 1, 'later windows must remain blocked behind the failed timeline gap');
  assert.deepEqual(frontiers, [], 'a failed gap must never be advertised as playable');
  await assert.rejects(
    pipeline.flush(),
    /groq_transcription_failed/u,
    'finalization must report that the precise dub is incomplete'
  );
});

test('bounds stalled Groq transcription requests with a stable timeout error', async () => {
  let groqCalls = 0;
  const warnings = [];
  const pipeline = new PreciseDubbingPipeline({
    geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Kore',
    timeouts: {groqRequestMs: 5, retryDelayMs: 0},
    fetchImpl: async (url, options) => {
      assert.match(String(url), /api\.groq\.com/u);
      groqCalls += 1;
      return new Promise((resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new Error('aborted')), {once: true});
      });
    },
    onCaption() {}, onDub() {}, onFrontier() {}, onSourceText: async () => {},
    onWarning: (error) => warnings.push(error.message)
  });

  pipeline.push(new Uint8Array(12 * 16000 * 2));
  const outcome = await Promise.race([
    pipeline.busy.then(() => 'settled'),
    new Promise((resolve) => setTimeout(() => resolve('deadline'), 250))
  ]);

  assert.equal(outcome, 'settled', 'a stalled provider must never leave finalization waiting forever');
  assert.equal(groqCalls, 3, 'transient Groq timeouts retain the bounded retry policy');
  assert.deepEqual(warnings, ['groq_timeout']);
  await assert.rejects(pipeline.flush(), /groq_timeout/u);
});

test('bounds a stalled Gemini translation request without exhausting the model pool', async () => {
  let translationCalls = 0;
  const warnings = [];
  const pipeline = new PreciseDubbingPipeline({
    geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Kore',
    timeouts: {translationRequestMs: 5, retryDelayMs: 0},
    fetchImpl: async (url, options) => {
      if (String(url).includes('api.groq.com')) {
        return {ok: true, async json() { return {segments: [{start: 0, end: 1, text: 'Hello.'}]}; }};
      }
      translationCalls += 1;
      return new Promise((resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new Error('aborted')), {once: true});
      });
    },
    onCaption() {}, onDub() {}, onFrontier() {}, onSourceText: async () => {},
    onWarning: (error) => warnings.push(error.message)
  });

  pipeline.push(new Uint8Array(12 * 16000 * 2));
  const outcome = await Promise.race([
    pipeline.busy.then(() => 'settled'),
    new Promise((resolve) => setTimeout(() => resolve('deadline'), 80))
  ]);

  assert.equal(outcome, 'settled');
  assert.equal(translationCalls, 1, 'a network timeout is provider-wide and must not burn every model quota');
  assert.deepEqual(warnings, ['gemini_translation_timeout']);
  await assert.rejects(pipeline.flush(), /gemini_translation_timeout/u);
});

test('narrates a translated segment once and keeps every caption inside its PCM interval', async () => {
  const dubs = [];
  const translatedCaptions = [];
  let voiceTurns = 0;
  const pipeline = new PreciseDubbingPipeline({
    geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Kore',
    fetchImpl: async (url) => {
      if (String(url).includes('api.groq.com')) return {ok: true, async json() { return {segments: [{start: 0, end: 2, text: 'First. Second.'}]}; }};
      if (isVoice(url)) return voiceResponse(pcmOf(++voiceTurns === 1 ? 38400 : 9600));
      return {ok: true, async json() { return {candidates: [{content: {parts: [{text: '[{"id":0,"text":"اول. دوم."}]'}]}}]}; }};
    },
    onCaption: (translated, cue) => { if (translated) translatedCaptions.push(cue); },
    onDub: (chunk) => dubs.push(chunk), onFrontier() {}, onSourceText: async () => {},
    onWarning: (error) => { throw error; }
  });
  pipeline.push(new Uint8Array(12 * 16000 * 2));
  await pipeline.busy;
  assert.equal(voiceTurns, 1, 'caption wrapping must not spend an extra narration request');
  assert.deepEqual(dubs.map(({start, duration}) => ({start, duration})), [{start: 0, duration: 1.6}]);
  assert.deepEqual(translatedCaptions.map(({text, start, end}) => ({text, start, end})), [
    {text: 'اول.', start: 0, end: 0.8},
    {text: 'دوم.', start: 0.8, end: 1.6}
  ]);
});

test('compresses overlong narration to the Whisper interval without doubling pitch', () => {
  const sampleRate = 24000;
  const input = new Int16Array(sampleRate * 2);
  for (let index = 0; index < input.length; index += 1) {
    input[index] = Math.round(Math.sin(index / sampleRate * 440 * Math.PI * 2) * 12000);
  }

  const fitted = fitNarrationDuration(input, sampleRate);
  let positiveCrossings = 0;
  for (let index = 1; index < fitted.length; index += 1) {
    if (fitted[index - 1] <= 0 && fitted[index] > 0) positiveCrossings += 1;
  }

  assert.equal(fitted.length, sampleRate);
  assert.ok(positiveCrossings >= 400 && positiveCrossings <= 480, `unexpected pitch: ${positiveCrossings} Hz`);
});

test('runs Whisper, the Gemini text pool, and natural Gemini 3.8 TTS PCM on an audible timeline', async () => {
  const nativeSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback, milliseconds, ...args) => nativeSetTimeout(
    callback,
    milliseconds >= 30000 ? 2000 : milliseconds >= 12000 ? 1500 : milliseconds,
    ...args
  );
  let receive;
  let worklet;
  let channel;
  let mediaRecorder;
  const requests = [];
  const files = new Map();
  installCaptureWorker(files);
  globalThis.chrome = {runtime: {onMessage: {addListener(listener) { receive = listener; }}, async sendMessage() { return {ok: true}; }}};
  class AudioNode { connect() { return this; } disconnect() {} }
  globalThis.AudioContext = class {
    currentTime = 0; destination = {}; audioWorklet = {addModule: async () => {}};
    createMediaStreamSource() { return new AudioNode(); }
    createGain() { const node = new AudioNode(); node.gain = {value: 1, setTargetAtTime() {}, cancelScheduledValues() {}}; return node; }
    async resume() {} async close() {}
  };
  globalThis.AudioWorkletNode = class extends AudioNode { constructor() { super(); this.port = {}; worklet = this; } };
  const root = {
    async *entries() {}, async removeEntry(name) { files.delete(name); },
    async getFileHandle(name) {
      const chunks = files.get(name) || []; files.set(name, chunks);
      return {async createWritable() { return {async write(value) { chunks.push(value); }, async close() {}, async seek() {}}; }, async getFile() { return new Blob(chunks); }};
    }
  };
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
    mediaDevices: {async getUserMedia() { return {getVideoTracks: () => [{}], getTracks: () => []}; }},
    storage: {async getDirectory() { return root; }}
  }});
  globalThis.BroadcastChannel = class { constructor() { this.messages = []; channel = this; } postMessage(message) { this.messages.push(message); } close() {} };
  globalThis.MediaRecorder = class {
    static isTypeSupported() { return true; } state = 'recording'; mimeType = 'video/webm';
    constructor() { mediaRecorder = this; } start() {} requestData() {} stop() { this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); }
  };
  let groqCalls = 0;
  globalThis.fetch = async (url, options) => {
    requests.push({url: String(url), body: options?.body});
    if (String(url).includes('api.groq.com')) {
      groqCalls += 1;
      return {ok: true, async json() { return {segments: groqCalls === 1 ? [{start: 0, end: 2, text: 'Hello.'}] : []}; }};
    }
    if (isVoice(url)) {
      const pcm = Buffer.alloc(24000 * 2); pcm.writeInt16LE(1200, 0); pcm.writeInt16LE(1200, pcm.length - 2);
      return voiceResponse(pcm);
    }
    return {ok: true, async json() { return {candidates: [{content: {parts: [{text: '[{"id":0,"text":"سلام."}]'}]}}]}; }};
  };

  await import(`../extension/offscreen.js?precise=${Date.now()}`);
  const started = await new Promise((resolve) => receive({
    target:'offscreen',type:'start',streamId:'stream',apiKey:'gemini-key',groqApiKey:'groq-key',
    config:{playbackMode:'synchronized',syncBufferSeconds:20,syncCaptionEngine:'whisper',syncVoiceName:'Kore',targetLanguage:'fa',recording:false}
  },{},resolve));
  assert.deepEqual(started,{ok:true});
  await channel.onmessage({data:{type:'ready',position:0}});
  worklet.port.onmessage({data:new Uint8Array(12*16000*2)});
  for(let attempt=0;attempt<100&&!channel.messages.some((message)=>message.type==='dub-chunk');attempt+=1) await new Promise((resolve)=>setTimeout(resolve,10));

  assert.match(requests[0].url,/api\.groq\.com/);
  assert.match(requests[1].url,/models\/gemini-3\.8-flash:generateContent/);
  assert.match(requests[2].url,/models\/gemini-3\.8-flash-tts:generateContent/);
  assert.equal(JSON.parse(requests[2].body).contents[0].parts[0].text, 'سلام.');
  const dub=channel.messages.find((message)=>message.type==='dub-chunk');
  assert.ok(dub, 'Gemini 3.8 TTS PCM must be published to the synchronized player');
  assert.equal(dub.start,0);assert.equal(dub.duration,1);assert.equal(new Int16Array(dub.data).length,24000);
  assert.equal(new Int16Array(dub.data).some((sample)=>sample!==0),true,'the precise bridge must publish audible PCM');
  const translated=channel.messages.find((message)=>message.type==='caption'&&message.translated);
  assert.deepEqual({text:translated.text,start:translated.start,end:translated.end},{text:'سلام.',start:0,end:1});
  assert.equal(channel.messages.some((message)=>message.type==='processing-frontier'&&message.seconds===11.25),true);

  mediaRecorder.ondataavailable({data:new Blob([Uint8Array.of(1)])});
  await new Promise((resolve)=>receive({target:'offscreen',type:'stop'},{},resolve));
  globalThis.setTimeout = nativeSetTimeout;
});
