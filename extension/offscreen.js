import {
  TTS_MODEL,
  audioMessage,
  base64ToBytes,
  interactionAudio,
  liveUrl,
  mergeTranscript,
  setupMessage,
  srt,
  wavHeader
} from './core.mjs';

let stream = null;
let context = null;
let source = null;
let captureNode = null;
let sourceGain = null;
let dubGain = null;
let socket = null;
let config = null;
let apiKey = '';
let liveReady = false;
let nextDubTime = 0;
let contextStartedAt = 0;
let sessionStartedAt = 0;
let recorder = null;
let stopping = false;
let ttsQueue = Promise.resolve();
let sourceTracker = {partial: '', started: 0};
let translatedTracker = {partial: '', started: 0};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function report(update) {
  return chrome.runtime.sendMessage({target: 'background', type: 'bridge-state', update});
}

function elapsed() {
  return (performance.now() - sessionStartedAt) / 1000;
}

function volumeFor(mode, channel) {
  if (mode === 'dub') return channel === 'dub' ? 1 : 0;
  if (mode === 'original') return channel === 'original' ? 1 : 0;
  return Number(channel === 'original' ? config.originalVolume : config.dubVolume);
}

function applyVolumes() {
  if (!context || !sourceGain || !dubGain) return;
  const now = context.currentTime;
  sourceGain.gain.setTargetAtTime(volumeFor(config.audioMode, 'original'), now, 0.02);
  dubGain.gain.setTargetAtTime(volumeFor(config.audioMode, 'dub'), now, 0.02);
}

class PcmWriter {
  constructor(root, handle, writable, sampleRate) {
    this.root = root;
    this.handle = handle;
    this.writable = writable;
    this.sampleRate = sampleRate;
    this.dataBytes = 0;
    this.pending = Promise.resolve();
  }

  static async create(root, name, sampleRate) {
    const handle = await root.getFileHandle(name, {create: true});
    const writable = await handle.createWritable();
    await writable.write(new Uint8Array(44));
    return new PcmWriter(root, handle, writable, sampleRate);
  }

  append(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    this.dataBytes += bytes.byteLength;
    this.pending = this.pending.then(() => this.writable.write(bytes));
  }

  appendAt(input, seconds) {
    const expected = Math.max(0, Math.round(seconds * this.sampleRate) * 2);
    let missing = Math.max(0, expected - this.dataBytes);
    while (missing) {
      const size = Math.min(missing, 65536);
      this.append(new Uint8Array(size));
      missing -= size;
    }
    this.append(input);
  }

  async finish() {
    await this.pending;
    await this.writable.seek(0);
    await this.writable.write(wavHeader(this.dataBytes, this.sampleRate));
    await this.writable.close();
    return this.handle.getFile();
  }
}

class SessionRecorder {
  static async create() {
    const root = await navigator.storage.getDirectory();
    const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
    const token = crypto.randomUUID();
    const originalName = `${token}-original.wav`;
    const dubbedName = `${token}-dubbed.wav`;
    const original = await PcmWriter.create(root, originalName, 16000);
    const dubbed = await PcmWriter.create(root, dubbedName, 24000);
    return new SessionRecorder(root, stamp, originalName, dubbedName, original, dubbed);
  }

  constructor(root, stamp, originalName, dubbedName, original, dubbed) {
    this.root = root;
    this.stamp = stamp;
    this.originalName = originalName;
    this.dubbedName = dubbedName;
    this.original = original;
    this.dubbed = dubbed;
    this.sourceEntries = [];
    this.translatedEntries = [];
  }

  addSubtitle(translated, entry) {
    if (!entry?.text.trim()) return;
    (translated ? this.translatedEntries : this.sourceEntries).push(entry);
  }

  async download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const response = await chrome.runtime.sendMessage({
      target: 'background',
      type: 'download',
      url,
      filename: `LingoDub/${this.stamp}/${filename}`
    });
    if (!response?.ok) throw new Error(response?.error || 'download_failed');
  }

  async finish() {
    const [original, dubbed] = await Promise.all([this.original.finish(), this.dubbed.finish()]);
    const sourceSubtitles = new Blob(['\ufeff', srt(this.sourceEntries)], {type: 'application/x-subrip'});
    const translatedSubtitles = new Blob(['\ufeff', srt(this.translatedEntries)], {type: 'application/x-subrip'});
    await Promise.all([
      this.download(original, 'original.wav'),
      this.download(sourceSubtitles, 'source.srt'),
      this.download(dubbed, 'dubbed.wav'),
      this.download(translatedSubtitles, 'translated.srt')
    ]);
    await wait(1000);
    await Promise.allSettled([
      this.root.removeEntry(this.originalName),
      this.root.removeEntry(this.dubbedName)
    ]);
  }
}

function playDubbed(pcm) {
  if (!context) return;
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  const begins = Math.max(context.currentTime + 0.03, nextDubTime);
  const duration = samples.length / 24000;
  nextDubTime = begins + duration;
  recorder?.dubbed.appendAt(pcm, begins - contextStartedAt);
  if (config.audioMode === 'original') return;

  const buffer = context.createBuffer(1, samples.length, 24000);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 32768;
  const player = context.createBufferSource();
  player.buffer = buffer;
  player.connect(dubGain);
  if (config.audioMode === 'mix' && config.autoDuck) {
    const base = volumeFor('mix', 'original');
    sourceGain.gain.cancelScheduledValues(begins);
    sourceGain.gain.setTargetAtTime(base * 0.12, begins, 0.025);
    sourceGain.gain.setTargetAtTime(base, nextDubTime, 0.08);
  }
  player.start(begins);
}

async function googleError(response) {
  try {
    const payload = await response.json();
    return payload.error?.message || `gemini_${response.status}`;
  } catch {
    return `gemini_${response.status}`;
  }
}

async function synthesize(text) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'x-goog-api-key': apiKey},
    body: JSON.stringify({
      model: TTS_MODEL,
      input: `Synthesize speech in this style: ${config.voiceStyle}.\nTranscript:\n${text}`,
      response_format: {type: 'audio'},
      generation_config: {speech_config: [{voice: config.voice}]}
    })
  });
  if (!response.ok) throw new Error(await googleError(response));
  return interactionAudio(await response.json());
}

function enqueueTts(text) {
  ttsQueue = ttsQueue.then(async () => playDubbed(await synthesize(text))).catch(async (error) => {
    await report({status: 'error', error: error.message});
  });
}

async function handleTranscript(translated, transcription) {
  const tracker = translated ? translatedTracker : sourceTracker;
  const completed = mergeTranscript(tracker, transcription.text || '', transcription.finished, elapsed());
  const text = completed?.text || tracker.partial;
  if (completed) {
    recorder?.addSubtitle(translated, completed);
    if (translated && config.voice !== 'Native') enqueueTts(completed.text);
  }
  if (!text) return;
  await report({
    [translated ? 'translatedText' : 'sourceText']: text,
    ...(!translated ? {sourceLanguage: transcription.languageCode || ''} : {})
  });
}

async function flushTranscripts() {
  const now = elapsed();
  for (const [translated, tracker] of [[false, sourceTracker], [true, translatedTracker]]) {
    if (!tracker.partial) continue;
    const completed = mergeTranscript(tracker, tracker.partial, true, now);
    recorder?.addSubtitle(translated, completed);
    if (translated && config.voice !== 'Native' && completed) enqueueTts(completed.text);
  }
}

async function handleLiveMessage(message) {
  if (message.error) throw new Error(message.error.message || 'gemini_live_error');
  if (message.setupComplete) {
    liveReady = true;
    await report({status: 'connected', active: true});
    return 'ready';
  }
  const content = message.serverContent;
  if (!content) return '';
  if (content.inputTranscription) await handleTranscript(false, content.inputTranscription);
  if (content.outputTranscription) await handleTranscript(true, content.outputTranscription);
  if (config.voice === 'Native') {
    for (const part of content.modelTurn?.parts || []) {
      const inline = part.inlineData || part.inline_data;
      if (inline?.data) playDubbed(base64ToBytes(inline.data));
    }
  }
  if (content.turnComplete) await flushTranscripts();
  return '';
}

function openSocket() {
  return new Promise((resolve, reject) => {
    let connected = false;
    const timeout = setTimeout(() => {
      if (!connected) reject(new Error('gemini_socket_timeout'));
    }, 15000);
    socket = new WebSocket(liveUrl(apiKey));
    socket.onopen = () => socket.send(JSON.stringify(setupMessage(config.targetLanguage)));
    socket.onmessage = async (event) => {
      try {
        if (await handleLiveMessage(JSON.parse(event.data)) === 'ready') {
          connected = true;
          clearTimeout(timeout);
          resolve();
        }
      } catch (error) {
        clearTimeout(timeout);
        await report({status: 'error', active: false, error: error.message});
        socket?.close();
        if (!connected) reject(error);
      }
    };
    socket.onerror = () => {
      clearTimeout(timeout);
      if (!connected) reject(new Error('gemini_socket_failed'));
    };
    socket.onclose = () => {
      clearTimeout(timeout);
      liveReady = false;
      if (!stopping) {
        report({active: false, status: 'error', error: 'gemini_socket_closed'});
        end(false).catch(() => {});
      }
      if (!connected) reject(new Error('gemini_socket_closed'));
    };
  });
}

async function begin(streamId, nextConfig, nextApiKey) {
  if (stream) throw new Error('capture_already_active');
  config = nextConfig;
  apiKey = nextApiKey;
  stopping = false;
  liveReady = false;
  sourceTracker = {partial: '', started: 0};
  translatedTracker = {partial: '', started: 0};
  ttsQueue = Promise.resolve();
  sessionStartedAt = performance.now();
  if (config.recording) recorder = await SessionRecorder.create();
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {mandatory: {chromeMediaSource: 'tab', chromeMediaSourceId: streamId}},
    video: false
  });
  context = new AudioContext({latencyHint: 'interactive'});
  await context.audioWorklet.addModule('pcm-worklet.js');
  source = context.createMediaStreamSource(stream);
  sourceGain = context.createGain();
  dubGain = context.createGain();
  captureNode = new AudioWorkletNode(context, 'lingodub-pcm-capture');
  const silent = context.createGain();
  silent.gain.value = 0;
  source.connect(sourceGain).connect(context.destination);
  source.connect(captureNode).connect(silent).connect(context.destination);
  dubGain.connect(context.destination);
  contextStartedAt = context.currentTime;
  nextDubTime = context.currentTime;
  applyVolumes();
  captureNode.port.onmessage = ({data}) => {
    recorder?.original.append(data);
    if (liveReady && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(audioMessage(data)));
  };
  await context.resume();
  await openSocket();
}

async function end(sendAudioEnd = true) {
  if (stopping) return;
  stopping = true;
  if (sendAudioEnd && socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({realtimeInput: {audioStreamEnd: true}}));
    await wait(700);
  }
  await flushTranscripts();
  await ttsQueue;
  socket?.close();
  stream?.getTracks().forEach((track) => track.stop());
  captureNode?.disconnect(); source?.disconnect(); sourceGain?.disconnect(); dubGain?.disconnect();
  await context?.close();
  if (recorder) {
    await recorder.finish();
    await report({recordingReady: true});
  }
  stream = context = source = captureNode = sourceGain = dubGain = socket = recorder = null;
  config = null;
  apiKey = '';
  nextDubTime = 0;
  liveReady = false;
  await report({active: false, status: 'idle'});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;
  (async () => {
    if (message.type === 'start') await begin(message.streamId, message.config, message.apiKey);
    else if (message.type === 'stop') await end();
    else if (message.type === 'audio') { config = {...config, ...message.config}; applyVolumes(); }
    sendResponse({ok: true});
  })().catch(async (error) => {
    await report({active: false, status: 'error', error: error.message});
    await end(false).catch(() => {});
    sendResponse({ok: false, error: error.message});
  });
  return true;
});
