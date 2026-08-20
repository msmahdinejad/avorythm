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
    send(payload){const message=JSON.parse(payload);socketPayloads.push(message);if(message.setup)queueMicrotask(()=>this.onmessage({data:JSON.stringify({setupComplete:{}})}));if(message.clientContent?.turns?.[0]?.parts?.[0]?.text){const pcm=Buffer.alloc(24000*2,1);queueMicrotask(()=>this.onmessage({data:JSON.stringify({serverContent:{modelTurn:{parts:[{inlineData:{data:pcm.toString('base64')}}]},turnComplete:true}})}));}}
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
  assert.equal(socketPayloads.find((message)=>message.clientContent)?.clientContent.turns[0].parts[0].text,'سلام دنیا.');
});

test('runs Whisper, the Gemini text pool, and Gemini 3.1 Live on one exact timeline', async () => {
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
      if (message.clientContent?.turns?.[0]?.parts?.[0]?.text) {
        const pcm = Buffer.alloc(24000 * 2); pcm.writeInt16LE(1200, 0); pcm.writeInt16LE(1200, pcm.length - 2);
        queueMicrotask(() => this.onmessage({data: JSON.stringify({serverContent: {modelTurn: {parts: [{inlineData: {data: pcm.toString('base64')}}]}, turnComplete: true}})}));
      }
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
  assert.equal(socketPayloads[1].clientContent.turnComplete, true);
  assert.equal(socketPayloads.some((message)=>message.setup?.model?.includes('3.5-live-translate')),false);
  const dub=channel.messages.find((message)=>message.type==='dub-chunk');
  assert.equal(dub.start,0);assert.equal(dub.duration,2);assert.equal(new Int16Array(dub.data).length,48000);
  const translated=channel.messages.find((message)=>message.type==='caption'&&message.translated);
  assert.deepEqual({text:translated.text,start:translated.start,end:translated.end},{text:'سلام.',start:0,end:2});
  assert.equal(channel.messages.some((message)=>message.type==='processing-frontier'&&message.seconds===12),true);

  mediaRecorder.ondataavailable({data:new Blob([Uint8Array.of(1)])});
  await new Promise((resolve)=>receive({target:'offscreen',type:'stop'},{},resolve));
});
