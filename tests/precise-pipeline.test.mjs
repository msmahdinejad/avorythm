import assert from 'node:assert/strict';
import test from 'node:test';

import {PreciseDubbingPipeline} from '../extension/precise-pipeline.mjs';
import {installCaptureWorker} from './fake-capture-worker.mjs';

test('holds an unfinished utterance across Whisper windows instead of dubbing a broken sentence', async () => {
  let groqCall = 0;
  const sourceCaptions = [];
  const socketPayloads = [];
  const fetchImpl = async (url) => {
    if (String(url).includes('api.groq.com')) {
      groqCall += 1;
      return {ok:true,async json(){return {segments:groqCall===1
        ? [{start:8,end:11,text:'Hello'}]
        : [{start:.5,end:2,text:'world.'}]};}};
    }
    return {ok:true,async json(){return {candidates:[{content:{parts:[{text:'[{"id":0,"text":"سلام دنیا."}]'}]}}]};}};
  };
  class VoiceSocket {
    static OPEN=1;readyState=0;
    constructor(){queueMicrotask(()=>{this.readyState=1;this.onopen();});}
    send(payload){const message=JSON.parse(payload);socketPayloads.push(message);if(message.setup)queueMicrotask(()=>this.onmessage({data:JSON.stringify({setupComplete:{}})}));if(message.realtimeInput?.text){const pcm=Buffer.alloc(24000*2,1);queueMicrotask(()=>this.onmessage({data:JSON.stringify({serverContent:{modelTurn:{parts:[{inlineData:{data:pcm.toString('base64')}}]},turnComplete:true}})}));}else if(message.clientContent)queueMicrotask(()=>this.onmessage({data:JSON.stringify({error:{message:'clientContent is unsupported for Gemini 3.1 Live'}})}));}
    close(){this.readyState=3;}
  }
  const pipeline=new PreciseDubbingPipeline({
    geminiKey:'gemini',groqKey:'groq',targetLanguage:'fa',voiceName:'Kore',fetchImpl,WebSocketImpl:VoiceSocket,
    onCaption:(translated,cue)=>{if(!translated)sourceCaptions.push(cue);},onDub(){},onFrontier(){},onSourceText:async()=>{},onWarning:(error)=>{throw error;}
  });
  pipeline.push(new Uint8Array(12*16000*2));
  await pipeline.busy;
  assert.equal(socketPayloads.length,0,'an unfinished sentence must wait for the next overlapping window');
  pipeline.push(new Uint8Array(10.5*16000*2));
  await pipeline.busy;
  assert.equal(sourceCaptions.map((cue)=>cue.text).join(' '),'Hello world.');
  assert.equal(socketPayloads.find((message)=>message.realtimeInput?.text)?.realtimeInput.text,'سلام دنیا.');
});

test('reuses one Gemini 3.1 Live session for consecutive translated utterances', async () => {
  let socketCount = 0;
  const sentTexts = [];
  const dubs = [];
  const fetchImpl = async (url) => {
    if (String(url).includes('api.groq.com')) {
      return {ok: true, async json() { return {segments: [
        {start: 0, end: 1, text: 'Hello.'},
        {start: 1, end: 2, text: 'Welcome.'}
      ]}; }};
    }
    return {ok: true, async json() { return {candidates: [{content: {parts: [{text: '[{"id":0,"text":"سلام."},{"id":1,"text":"خوش آمدید."}]'}]}}]}; }};
  };
  class PersistentVoiceSocket {
    static OPEN = 1;
    readyState = 0;
    constructor() {
      socketCount += 1;
      queueMicrotask(() => { this.readyState = 1; this.onopen(); });
    }
    send(payload) {
      const message = JSON.parse(payload);
      if (message.setup) {
        queueMicrotask(() => this.onmessage({data: JSON.stringify({setupComplete: {}})}));
        return;
      }
      if (message.realtimeInput?.text) {
        sentTexts.push(message.realtimeInput.text);
        const pcm = Buffer.alloc(24000 * 2, 1);
        queueMicrotask(() => this.onmessage({data: JSON.stringify({serverContent: {
          modelTurn: {parts: [{inlineData: {data: pcm.toString('base64')}}]}
        }})}));
      }
    }
    close() { this.readyState = 3; }
  }
  const pipeline = new PreciseDubbingPipeline({
    geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Kore',
    fetchImpl, WebSocketImpl: PersistentVoiceSocket,
    onCaption() {}, onDub: (chunk) => dubs.push(chunk), onFrontier() {}, onSourceText: async () => {},
    onWarning: (error) => { throw error; }
  });
  pipeline.push(new Uint8Array(12 * 16000 * 2));
  await pipeline.busy;
  assert.equal(socketCount, 1, 'the precise engine must not spend one Live session/quota request per sentence');
  assert.deepEqual(sentTexts, ['سلام.', 'خوش آمدید.']);
  assert.equal(dubs.length, 2);
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
    WebSocketImpl: class {}, onCaption() {}, onDub() {},
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

test('times every translated caption piece from its own generated PCM', async () => {
  const dubs = [];
  const translatedCaptions = [];
  let voiceTurns = 0;
  const pipeline = new PreciseDubbingPipeline({
    geminiKey: 'gemini', groqKey: 'groq', targetLanguage: 'fa', voiceName: 'Kore',
    fetchImpl: async (url) => String(url).includes('api.groq.com')
      ? {ok: true, async json() { return {segments: [{start: 0, end: 2, text: 'First. Second.'}]}; }}
      : {ok: true, async json() { return {candidates: [{content: {parts: [{text: '[{"id":0,"text":"اول. دوم."}]'}]}}]}; }},
    WebSocketImpl: class {
      static OPEN = 1;
      readyState = 0;
      constructor() { queueMicrotask(() => { this.readyState = 1; this.onopen(); }); }
      send(payload) {
        const message = JSON.parse(payload);
        if (message.setup) {
          queueMicrotask(() => this.onmessage({data: JSON.stringify({setupComplete: {}})}));
          return;
        }
        if (message.realtimeInput?.text) {
          const sampleCount = ++voiceTurns === 1 ? 38400 : 9600;
          const pcm = Buffer.alloc(sampleCount * 2, 1);
          queueMicrotask(() => this.onmessage({data: JSON.stringify({serverContent: {
            modelTurn: {parts: [{inlineData: {data: pcm.toString('base64')}}]}, turnComplete: true
          }})}));
        }
      }
      close() { this.readyState = 3; }
    },
    onCaption: (translated, cue) => { if (translated) translatedCaptions.push(cue); },
    onDub: (chunk) => dubs.push(chunk), onFrontier() {}, onSourceText: async () => {},
    onWarning: (error) => { throw error; }
  });
  pipeline.push(new Uint8Array(12 * 16000 * 2));
  await pipeline.busy;
  assert.deepEqual(dubs.map(({start, duration}) => ({start, duration})), [
    {start: 0, duration: 1.6},
    {start: 1.6, duration: 0.4}
  ]);
  assert.deepEqual(translatedCaptions.map(({text, start, end}) => ({text, start, end})), [
    {text: 'اول.', start: 0, end: 1.6},
    {text: 'دوم.', start: 1.6, end: 2}
  ]);
});

test('runs Whisper, the Gemini text pool, and natural Gemini 3.1 PCM on an audible timeline', async () => {
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
  const socketPayloads = [];
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
    return {ok: true, async json() { return {candidates: [{content: {parts: [{text: '[{"id":0,"text":"سلام."}]'}]}}]}; }};
  };
  globalThis.WebSocket = class {
    static OPEN = 1; readyState = 0;
    constructor() { queueMicrotask(() => { this.readyState = 1; this.onopen(); }); }
    send(payload) {
      const message = JSON.parse(payload); socketPayloads.push(message);
      if (message.setup) queueMicrotask(() => this.onmessage({data: JSON.stringify({setupComplete: {}})}));
      if (message.realtimeInput?.text) {
        const pcm = Buffer.alloc(24000 * 2); pcm.writeInt16LE(1200, 0); pcm.writeInt16LE(1200, pcm.length - 2);
        queueMicrotask(() => this.onmessage({data: JSON.stringify({serverContent: {modelTurn: {parts: [{inlineData: {data: pcm.toString('base64')}}]}}})}));
      } else if (message.clientContent) queueMicrotask(() => this.onmessage({data: JSON.stringify({error: {message: 'clientContent is unsupported for Gemini 3.1 Live'}})}));
    }
    close() { this.readyState = 3; }
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
  assert.match(requests[1].url,/models\/gemini-3\.6-flash:generateContent/);
  assert.equal(socketPayloads[0].setup.model,'models/gemini-3.1-flash-live-preview');
  assert.equal(socketPayloads[1].realtimeInput.text, 'سلام.');
  assert.equal(socketPayloads.some((message)=>message.setup?.model?.includes('3.5-live-translate')),false);
  const dub=channel.messages.find((message)=>message.type==='dub-chunk');
  assert.ok(dub, 'Gemini 3.1 PCM must be published after output becomes idle even without turnComplete');
  assert.equal(dub.start,0);assert.equal(dub.duration,1);assert.equal(new Int16Array(dub.data).length,24000);
  assert.equal(new Int16Array(dub.data).some((sample)=>sample!==0),true,'the precise bridge must publish audible PCM');
  const translated=channel.messages.find((message)=>message.type==='caption'&&message.translated);
  assert.deepEqual({text:translated.text,start:translated.start,end:translated.end},{text:'سلام.',start:0,end:1});
  assert.equal(channel.messages.some((message)=>message.type==='processing-frontier'&&message.seconds===12),true);

  mediaRecorder.ondataavailable({data:new Blob([Uint8Array.of(1)])});
  await new Promise((resolve)=>receive({target:'offscreen',type:'stop'},{},resolve));
  globalThis.setTimeout = nativeSetTimeout;
});
