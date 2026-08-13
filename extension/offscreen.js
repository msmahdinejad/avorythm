import {
  audioChannelVolume,
  audioMessage,
  base64ToBytes,
  ephemeralLiveUrl,
  ephemeralTokenRequest,
  mergeTranscript,
  setupMessage,
  srt,
  TOKEN_ENDPOINT,
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
let reconnecting = false;
let sourceTracker = {partial: '', started: 0};
let translatedTracker = {partial: '', started: 0};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function report(update) {
  return chrome.runtime.sendMessage({target: 'background', type: 'bridge-state', update});
}

function elapsed() {
  return (performance.now() - sessionStartedAt) / 1000;
}

function applyVolumes() {
  if (!context || !sourceGain || !dubGain) return;
  const now = context.currentTime;
  sourceGain.gain.setTargetAtTime(audioChannelVolume('original', config), now, 0.02);
  dubGain.gain.setTargetAtTime(audioChannelVolume('dub', config), now, 0.02);
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
      filename: `Lingora/${this.stamp}/${filename}`
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
  if (!config.dubAudioEnabled) return;

  const buffer = context.createBuffer(1, samples.length, 24000);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 32768;
  const player = context.createBufferSource();
  player.buffer = buffer;
  player.connect(dubGain);
  if (config.originalAudioEnabled && config.autoDuck) {
    const base = audioChannelVolume('original', config);
    sourceGain.gain.cancelScheduledValues(begins);
    sourceGain.gain.setTargetAtTime(base * 0.12, begins, 0.025);
    sourceGain.gain.setTargetAtTime(base, nextDubTime, 0.08);
  }
  player.start(begins);
}

async function handleTranscript(translated, transcription) {
  const tracker = translated ? translatedTracker : sourceTracker;
  const completed = mergeTranscript(tracker, transcription.text || '', transcription.finished, elapsed());
  const text = completed?.text || tracker.partial;
  if (completed) {
    recorder?.addSubtitle(translated, completed);
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
    if (!tracker.partial) {
      tracker.committedPrefix = '';
      continue;
    }
    const completed = mergeTranscript(tracker, tracker.partial, true, now);
    recorder?.addSubtitle(translated, completed);
  }
}

async function handleLiveMessage(message) {
  if (message.error) throw new Error(message.error.message || 'gemini_live_error');
  if (message.goAway) {
    liveReady = false;
    socket?.close(1000, 'renew');
    return 'renewing';
  }
  if (message.setupComplete) {
    liveReady = true;
    await report({status: 'connected', active: true});
    return 'ready';
  }
  const content = message.serverContent;
  if (!content) return '';
  if (content.inputTranscription) await handleTranscript(false, content.inputTranscription);
  if (content.outputTranscription) await handleTranscript(true, content.outputTranscription);
  for (const part of content.modelTurn?.parts || []) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) playDubbed(base64ToBytes(inline.data));
  }
  if (content.turnComplete) await flushTranscripts();
  return '';
}

async function createEphemeralToken() {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {'content-type': 'application/json', 'x-goog-api-key': apiKey},
    body: JSON.stringify(ephemeralTokenRequest(config.targetLanguage))
  });
  if (!response.ok) {
    if ([401, 403].includes(response.status)) throw new Error('api_key_invalid');
    if (response.status === 429) throw new Error('gemini_quota_exceeded');
    throw new Error('gemini_token_failed');
  }
  const token = await response.json();
  if (typeof token.name !== 'string' || !token.name) throw new Error('gemini_token_failed');
  return token.name;
}

async function openSocket() {
  const ephemeralToken = await createEphemeralToken();
  return new Promise((resolve, reject) => {
    let connected = false;
    let messages = Promise.resolve();
    const timeout = setTimeout(() => {
      if (!connected) reject(new Error('gemini_socket_timeout'));
    }, 15000);
    const current = new WebSocket(ephemeralLiveUrl(ephemeralToken));
    socket = current;
    current.onopen = () => current.send(JSON.stringify(setupMessage(config.targetLanguage)));
    current.onmessage = (event) => {
      messages = messages.then(async () => {
        try {
          const payload = event.data instanceof Blob ? await event.data.text() : event.data;
          if (await handleLiveMessage(JSON.parse(payload)) === 'ready') {
            connected = true;
            clearTimeout(timeout);
            resolve();
          }
        } catch (error) {
          clearTimeout(timeout);
          await report({status: 'error', active: false, error: error.message});
          current.close();
          if (!connected) reject(error);
        }
      });
    };
    current.onerror = () => {
      clearTimeout(timeout);
      if (!connected) reject(new Error('gemini_socket_failed'));
    };
    current.onclose = () => {
      clearTimeout(timeout);
      if (socket === current) {
        socket = null;
        liveReady = false;
      }
      if (!connected) reject(new Error('gemini_socket_closed'));
      else if (!stopping) reconnectSocket().catch(() => {});
    };
  });
}

async function reconnectSocket() {
  if (reconnecting || stopping) return;
  reconnecting = true;
  await report({status: 'connecting', active: true, error: ''});
  let lastError = new Error('gemini_socket_closed');
  try {
    for (let attempt = 0; attempt < 5 && !stopping; attempt += 1) {
      await wait(Math.min(500 * (2 ** attempt), 4000));
      try {
        await openSocket();
        return;
      } catch (error) {
        lastError = error;
      }
    }
    if (!stopping) {
      await report({active: false, status: 'error', error: lastError.message});
      await end(false);
    }
  } finally {
    reconnecting = false;
  }
}

async function begin(streamId, nextConfig, nextApiKey) {
  if (stream) throw new Error('capture_already_active');
  config = nextConfig;
  apiKey = nextApiKey;
  stopping = false;
  reconnecting = false;
  liveReady = false;
  sourceTracker = {partial: '', started: 0};
  translatedTracker = {partial: '', started: 0};
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
  captureNode = new AudioWorkletNode(context, 'lingora-pcm-capture');
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
  reconnecting = false;
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
