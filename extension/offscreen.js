import {
  audioChannelVolume,
  audioMessage,
  base64ToBytes,
  captionSegments,
  liveUrl,
  latestCaption,
  mergeTranscript,
  setupMessage,
  srt,
  wavHeader
} from './core.mjs';
import {PreciseDubbingPipeline} from './precise-pipeline.mjs';

let stream = null;
let context = null;
let source = null;
let captureNode = null;
let sourceGain = null;
let dubGain = null;
let socket = null;
let config = null;
let apiKey = '';
let groqApiKey = '';
let liveReady = false;
let nextDubTime = 0;
let contextStartedAt = 0;
let sessionStartedAt = 0;
let recorder = null;
let stopping = false;
let reconnecting = false;
let sourceTracker = {partial: '', started: 0};
let translatedTracker = {partial: '', started: 0};
let audioBacklog = [];
let mediaRecorder = null;
let mediaStopPromise = null;
let capturedVideo = null;
let syncChannel = null;
let syncReady = false;
let syncQueue = [];
let currentDubStart = null;
let currentDubOffset = 0;
let players = new Set();
let speech = {active: false, started: 0, silentFor: 0, completed: []};
let translatedCue = {id: 0, text: ''};
let lastDubEnd = 0;
let syncInit = null;
let syncFinal = null;
let syncFrontier = null;
let syncReplay = Promise.resolve();
let syncDubSequence = 0;
let syncDubHistory = [];
let syncCaptionHistory = new Map();
let syncReplayPending = false;
let precisePipeline = null;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const RECORDING_PREFIX = 'avorythm-recording-';
const CAPTURE_PREFIX = 'avorythm-capture-';
const SYNC_ARTIFACT_PREFIX = 'avorythm-sync-artifact-';
const RECONNECT_BUFFER_CHUNKS = 1200;

function report(update) {
  return chrome.runtime.sendMessage({target: 'background', type: 'bridge-state', update});
}

function elapsed() {
  return (performance.now() - sessionStartedAt) / 1000;
}

function applyVolumes() {
  if (!context || !sourceGain || !dubGain) return;
  const now = context.currentTime;
  const synchronized = config?.playbackMode === 'synchronized';
  sourceGain.gain.setTargetAtTime(synchronized ? 0 : audioChannelVolume('original', config), now, 0.02);
  dubGain.gain.setTargetAtTime(synchronized ? 0 : audioChannelVolume('dub', config), now, 0.02);
}

function postSync(message) {
  if (!syncChannel) return;
  if (message.type === 'media-init') syncInit = message;
  else if (message.type === 'media-final') syncFinal = message;
  else if (message.type === 'processing-frontier') syncFrontier = message;
  else if (message.type === 'dub-chunk') {
    if (!message.id) message.id = `dub-${++syncDubSequence}`;
    syncDubHistory.push(message);
  } else if (message.type === 'caption') {
    syncCaptionHistory.set(`${Boolean(message.translated)}:${message.id}`, message);
  }
  if (syncReady) syncChannel.postMessage(message);
  else {
    syncQueue.push(message);
    if (syncQueue.length > 240) syncQueue.shift();
  }
}

async function replaySyncSession(position = 0) {
  if (!syncChannel || !syncInit) return;
  syncReady = false;
  syncQueue.splice(0);
  const init = syncInit;
  const final = syncFinal;
  const frontier = syncFrontier;
  const dubs = syncDubHistory.slice();
  const captionSnapshot = [...syncCaptionHistory.values()];
  const media = await capturedVideo?.snapshot();
  syncChannel.postMessage({type: 'session-reset', position: Math.max(0, Number(position) || 0)});
  syncChannel.postMessage(init);
  if (media?.size) {
    const sliceBytes=1024*1024;
    for(let offset=0;offset<media.size;offset+=sliceBytes) syncChannel.postMessage({type:'media-chunk',data:media.slice(offset,Math.min(media.size,offset+sliceBytes),media.type)});
  }
  for (const message of dubs) syncChannel.postMessage(message);
  for (const message of captionSnapshot) syncChannel.postMessage(message);
  if (frontier) syncChannel.postMessage(frontier);
  if (final) syncChannel.postMessage(final);
  syncReady = true;
  for (const message of syncQueue.splice(0)) syncChannel.postMessage(message);
}

function openSyncBridge() {
  if (typeof BroadcastChannel !== 'function') throw new Error('synchronized_player_unavailable');
  syncChannel = new BroadcastChannel('avorythm-sync');
  syncChannel.onmessage = ({data}) => {
    if (data?.type !== 'ready') return;
    if (syncReplayPending) return syncReplay;
    syncReplayPending = true;
    syncReplay = syncReplay.then(() => replaySyncSession(data.position)).catch(async (error) => {
      await report({status: 'error', error: error.message});
    }).finally(()=>{syncReplayPending=false;});
    return syncReplay;
  };
  syncChannel.postMessage({type: 'bridge-ready'});
}

async function startMediaBridge() {
  if (!stream?.getVideoTracks().length || typeof MediaRecorder !== 'function') {
    throw new Error('synchronized_player_unavailable');
  }
  openSyncBridge();
  capturedVideo = await CapturedVideo.create();
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  mediaRecorder = new MediaRecorder(stream, mimeType ? {mimeType, videoBitsPerSecond: 4_000_000} : undefined);
  const resolvedType = mediaRecorder.mimeType || mimeType || 'video/webm';
  postSync({type: 'media-init', mimeType: resolvedType, bufferSeconds: config.syncBufferSeconds});
  mediaRecorder.ondataavailable = ({data}) => {
    if (!data?.size) return;
    capturedVideo.append(data);
    postSync({type: 'media-chunk', data});
  };
  mediaRecorder.onerror = () => report({status: 'error', error: 'synchronized_player_failed'});
  mediaStopPromise = new Promise((resolve) => { mediaRecorder.onstop = resolve; });
  mediaRecorder.start(250);
}

async function stopMediaBridge() {
  if (!mediaRecorder || !capturedVideo) return;
  if (mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.requestData(); } catch {}
    mediaRecorder.stop();
  }
  await mediaStopPromise;
  const result = await capturedVideo.finish();
  const artifacts = await persistSyncArtifacts(result);
  postSync({type: 'media-final', ...result, artifacts});
  await report({videoRecordingReady: true, syncArtifacts: artifacts});
  await wait(250);
}

async function writeOpfsFile(root, name, value) {
  const handle=await root.getFileHandle(name,{create:true});const writable=await handle.createWritable();await writable.write(value);await writable.close();return name;
}

async function persistSyncArtifacts(video) {
  const root=await navigator.storage.getDirectory();const token=`${SYNC_ARTIFACT_PREFIX}${crypto.randomUUID()}`;
  const dubbedName=`${token}-dubbed.wav`;const writer=await PcmWriter.create(root,dubbedName,24000);
  for(const chunk of [...syncDubHistory].sort((left,right)=>left.start-right.start)) writer.appendAt(new Uint8Array(chunk.data),chunk.start);
  await writer.finish();
  const source=[...syncCaptionHistory.values()].filter((cue)=>!cue.translated).sort((left,right)=>left.start-right.start);
  const translated=[...syncCaptionHistory.values()].filter((cue)=>cue.translated).sort((left,right)=>left.start-right.start);
  const sourceName=await writeOpfsFile(root,`${token}-source.srt`,new Blob(['\ufeff',srt(source)],{type:'application/x-subrip'}));
  const translatedName=await writeOpfsFile(root,`${token}-translated.srt`,new Blob(['\ufeff',srt(translated)],{type:'application/x-subrip'}));
  const metadataName=`${token}-timeline.json`;
  const artifacts={videoFileName:video.fileName,dubbedFileName:dubbedName,sourceSubtitleFileName:sourceName,translatedSubtitleFileName:translatedName,metadataFileName:metadataName,mimeType:syncInit?.mimeType||'video/webm'};
  await writeOpfsFile(root,metadataName,new Blob([JSON.stringify({version:1,artifacts,source,translated})],{type:'application/json'}));
  return artifacts;
}

function trackSpeech(pcm, at) {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  let energy = 0;
  for (let index = 0; index < samples.length; index += 8) {
    const sample = samples[index] / 32768;
    energy += sample * sample;
  }
  const voiced = Math.sqrt(energy / Math.max(1, Math.ceil(samples.length / 8))) >= 0.012;
  if (voiced) {
    if (!speech.active) {
      speech.active = true;
      speech.started = Math.max(0, at - 0.18);
    }
    speech.silentFor = 0;
  } else if (speech.active) {
    speech.silentFor += samples.length / 16000;
    if (speech.silentFor >= 0.45) {
      speech.completed.push({start: speech.started, end: Math.max(speech.started + 0.2, at - speech.silentFor)});
      if (speech.completed.length > 8) speech.completed.shift();
      speech.active = false;
      speech.silentFor = 0;
    }
  }
}

function nextSpeechStart(now) {
  return speech.completed.shift()?.start ?? (speech.active ? speech.started : Math.max(0, now - 1.2));
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

class CapturedVideo {
  static async create() {
    const root = await navigator.storage.getDirectory();
    if (typeof root.entries === 'function') {
      for await (const [name] of root.entries()) {
        if (name.startsWith(CAPTURE_PREFIX)||name.startsWith(SYNC_ARTIFACT_PREFIX)) await root.removeEntry(name).catch(() => {});
      }
    }
    const fileName = `${CAPTURE_PREFIX}${crypto.randomUUID()}.webm`;
    const handle = await root.getFileHandle(fileName, {create: true});
    const writable = await handle.createWritable();
    return new CapturedVideo(fileName, handle, writable);
  }

  constructor(fileName, handle, writable) {
    this.fileName = fileName;
    this.handle = handle;
    this.writable = writable;
    this.pending = Promise.resolve();
    this.bytes = 0;
  }

  append(blob) {
    this.bytes += blob.size;
    this.pending = this.pending.then(() => this.writable.write(blob));
  }

  async finish() {
    await this.pending;
    await this.writable.close();
    return {fileName: this.fileName, bytes: this.bytes};
  }

  async snapshot() {
    const bytes = this.bytes;
    const pending = this.pending;
    await pending;
    const file = await this.handle.getFile();
    return file.slice(0, bytes, file.type || 'video/webm');
  }
}

class SessionRecorder {
  static async create() {
    const root = await navigator.storage.getDirectory();
    if (typeof root.entries === 'function') {
      for await (const [name] of root.entries()) {
        if (name.startsWith(RECORDING_PREFIX)) await root.removeEntry(name).catch(() => {});
      }
    }
    const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
    const token = `${RECORDING_PREFIX}${crypto.randomUUID()}`;
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
    const segments = captionSegments(entry.text);
    const duration = Math.max(0.6 * segments.length, entry.end - entry.start);
    const slice = duration / segments.length;
    const target = translated ? this.translatedEntries : this.sourceEntries;
    segments.forEach((text, index) => target.push({
      text,
      start: entry.start + slice * index,
      end: entry.start + slice * (index + 1)
    }));
  }

  async download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const response = await chrome.runtime.sendMessage({
      target: 'background',
      type: 'download',
      url,
      filename: `Avorythm/${this.stamp}/${filename}`
    });
    if (!response?.ok) throw new Error(response?.error || 'download_failed');
  }

  async finish() {
    try {
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
    } finally {
      await Promise.allSettled([
        this.root.removeEntry(this.originalName),
        this.root.removeEntry(this.dubbedName)
      ]);
    }
  }
}

function playDubbed(pcm) {
  if (!context) return;
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  const duration = samples.length / 24000;
  if (config.playbackMode === 'synchronized') {
    if (currentDubStart === null) currentDubStart = Math.max(nextSpeechStart(elapsed()), lastDubEnd);
    const start = currentDubStart + currentDubOffset;
    currentDubOffset += duration;
    lastDubEnd = Math.max(lastDubEnd, start + duration);
    recorder?.dubbed.appendAt(pcm, start);
    postSync({type: 'dub-chunk', data: pcm.slice().buffer, start, duration});
    if (translatedCue.text) postSync({type: 'caption', translated: true, id: `translated-${translatedCue.id}`, text: translatedCue.text, start: currentDubStart, end: lastDubEnd + 0.35});
    return;
  }
  const begins = Math.max(context.currentTime + 0.03, nextDubTime);
  nextDubTime = begins + duration;
  recorder?.dubbed.appendAt(pcm, begins - contextStartedAt);
  if (!config.dubAudioEnabled) return;

  const buffer = context.createBuffer(1, samples.length, 24000);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 32768;
  const player = context.createBufferSource();
  player.buffer = buffer;
  player.connect(dubGain);
  players.add(player);
  player.onended = () => players.delete(player);
  if (config.originalAudioEnabled && config.autoDuck) {
    const base = audioChannelVolume('original', config);
    sourceGain.gain.cancelScheduledValues(begins);
    sourceGain.gain.setTargetAtTime(base * 0.12, begins, 0.025);
    sourceGain.gain.setTargetAtTime(base, nextDubTime, 0.08);
  }
  player.start(begins);
}

function clearDubPlayback() {
  for (const player of players) {
    try { player.stop(); } catch {}
  }
  players.clear();
  if (context) nextDubTime = context.currentTime;
  currentDubStart = null;
  currentDubOffset = 0;
  translatedCue = {id: translatedCue.id + 1, text: ''};
  if (config?.playbackMode === 'synchronized') postSync({type: 'dub-interrupted'});
}

async function handleTranscript(translated, transcription) {
  const tracker = translated ? translatedTracker : sourceTracker;
  const completed = mergeTranscript(tracker, transcription.text || '', transcription.finished, elapsed());
  const text = latestCaption(completed?.text || tracker.partial);
  if (completed && !(config.playbackMode === 'synchronized' && (translated || config.syncCaptionEngine === 'whisper'))) {
    recorder?.addSubtitle(translated, completed);
  }
  if (!text) return;
  if (config.playbackMode === 'synchronized' && translated) {
    translatedCue.text = text;
    if (currentDubStart !== null) postSync({type: 'caption', translated: true, id: `translated-${translatedCue.id}`, text, start: currentDubStart, end: Math.max(currentDubStart + 0.8, lastDubEnd + 0.35)});
  } else if (config.playbackMode === 'synchronized' && config.syncCaptionEngine !== 'whisper') {
    postSync({
      type: 'caption',
      translated,
      id: `${translated ? 'translated' : 'source'}-${(completed?.start ?? elapsed()).toFixed(2)}`,
      text,
      start: completed?.start ?? (speech.active ? speech.started : Math.max(0, elapsed() - 1)),
      end: completed?.end ?? elapsed() + 0.8
    });
  }
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
    if (socket?.readyState === WebSocket.OPEN) {
      for (const pcm of audioBacklog.splice(0)) socket.send(JSON.stringify(audioMessage(pcm)));
    }
    await report({status: 'connected', active: true});
    return 'ready';
  }
  const content = message.serverContent;
  if (!content) return '';
  if (content.interrupted) clearDubPlayback();
  if (content.inputTranscription) await handleTranscript(false, content.inputTranscription);
  if (content.outputTranscription) await handleTranscript(true, content.outputTranscription);
  for (const part of content.modelTurn?.parts || []) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) playDubbed(base64ToBytes(inline.data));
  }
  if (content.turnComplete) {
    await flushTranscripts();
    if (config.playbackMode === 'synchronized' && translatedCue.text && currentDubStart !== null) {
      const cue = {text: translatedCue.text, start: currentDubStart, end: Math.max(currentDubStart + 0.8, lastDubEnd + 0.35)};
      postSync({type: 'caption', translated: true, id: `translated-${translatedCue.id}`, ...cue});
      recorder?.addSubtitle(true, cue);
      translatedCue = {id: translatedCue.id + 1, text: ''};
    }
    currentDubStart = null;
    currentDubOffset = 0;
  }
  return '';
}

async function openSocket() {
  return new Promise((resolve, reject) => {
    let connected = false;
    let messages = Promise.resolve();
    const timeout = setTimeout(() => {
      if (!connected) {
        current.close();
        reject(new Error('gemini_socket_timeout'));
      }
    }, 15000);
    const current = new WebSocket(liveUrl(apiKey));
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

async function begin(streamId, nextConfig, nextApiKey, nextGroqApiKey) {
  if (stream) throw new Error('capture_already_active');
  config = nextConfig;
  apiKey = nextApiKey;
  groqApiKey = nextGroqApiKey || '';
  stopping = false;
  reconnecting = false;
  liveReady = false;
  sourceTracker = {partial: '', started: 0};
  translatedTracker = {partial: '', started: 0};
  audioBacklog = [];
  speech = {active: false, started: 0, silentFor: 0, completed: []};
  currentDubStart = null;
  currentDubOffset = 0;
  lastDubEnd = 0;
  translatedCue = {id: 0, text: ''};
  precisePipeline = null;
  syncInit = null;
  syncFinal = null;
  syncFrontier = null;
  syncReplay = Promise.resolve();
  syncReplayPending = false;
  syncDubSequence = 0;
  syncDubHistory = [];
  syncCaptionHistory = new Map();
  if (config.recording) recorder = await SessionRecorder.create();
  const synchronized = config.playbackMode === 'synchronized';
  const precise = synchronized && config.syncCaptionEngine === 'whisper';
  if (!precise) await openSocket();
  else {
    precisePipeline = new PreciseDubbingPipeline({
      geminiKey:apiKey,
      groqKey:groqApiKey,
      targetLanguage:config.targetLanguage,
      voiceName:config.syncVoiceName,
      onCaption:(translated,cue)=>{postSync({type:'caption',translated,...cue});recorder?.addSubtitle(translated,cue);},
      onDub:(chunk)=>{recorder?.dubbed.appendAt(new Uint8Array(chunk.data),chunk.start);postSync({type:'dub-chunk',...chunk});},
      onFrontier:(seconds)=>postSync({type:'processing-frontier',seconds}),
      onSourceText:(text)=>report({sourceText:text}),
      onWarning:(error)=>postSync({type:'warning',error:error.message})
    });
    await report({status:'connected',active:true,error:''});
  }
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {mandatory: {chromeMediaSource: 'tab', chromeMediaSourceId: streamId}},
    video: synchronized ? {mandatory: {chromeMediaSource: 'tab', chromeMediaSourceId: streamId}} : false
  });
  sessionStartedAt = performance.now();
  context = new AudioContext({latencyHint: 'interactive'});
  await context.audioWorklet.addModule('pcm-worklet.js');
  source = context.createMediaStreamSource(stream);
  sourceGain = context.createGain();
  dubGain = context.createGain();
  captureNode = new AudioWorkletNode(context, 'avorythm-pcm-capture');
  const silent = context.createGain();
  silent.gain.value = 0;
  source.connect(sourceGain).connect(context.destination);
  source.connect(captureNode).connect(silent).connect(context.destination);
  dubGain.connect(context.destination);
  if (synchronized) await startMediaBridge();
  contextStartedAt = context.currentTime;
  nextDubTime = context.currentTime;
  applyVolumes();
  captureNode.port.onmessage = ({data}) => {
    recorder?.original.append(data);
    const pcm = data instanceof Uint8Array ? data : new Uint8Array(data);
    trackSpeech(pcm, elapsed());
    precisePipeline?.push(pcm);
    if (precise) return;
    if (liveReady && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(audioMessage(pcm)));
    } else {
      audioBacklog.push(pcm.slice());
      if (audioBacklog.length > RECONNECT_BUFFER_CHUNKS) audioBacklog.shift();
    }
  };
  await context.resume();
}

async function end(sendAudioEnd = true) {
  if (stopping) return;
  stopping = true;
  let failure = null;
  const attempt = async (action) => {
    try { await action(); }
    catch (error) { failure ||= error; }
  };
  if (sendAudioEnd && socket?.readyState === WebSocket.OPEN) {
    await attempt(async () => {
      socket.send(JSON.stringify({realtimeInput: {audioStreamEnd: true}}));
      await wait(700);
    });
  }
  await attempt(flushTranscripts);
  await attempt(async () => precisePipeline?.flush());
  await attempt(stopMediaBridge);
  await attempt(async () => socket?.close());
  for (const track of stream?.getTracks() || []) await attempt(async () => track.stop());
  for (const node of [captureNode, source, sourceGain, dubGain]) await attempt(async () => node?.disconnect());
  await attempt(async () => context?.close());
  if (recorder) await attempt(async () => {
    await recorder.finish();
    await report({recordingReady: true});
  });
  await attempt(async () => syncChannel?.close());
  stream = context = source = captureNode = sourceGain = dubGain = socket = recorder = null;
  mediaRecorder = syncChannel = null;
  mediaStopPromise = capturedVideo = null;
  syncReady = false;
  syncQueue = [];
  syncInit = syncFinal = syncFrontier = null;
  syncReplayPending = false;
  syncDubHistory = [];
  syncCaptionHistory = new Map();
  precisePipeline = null;
  audioBacklog = [];
  players.clear();
  config = null;
  apiKey = '';
  groqApiKey = '';
  nextDubTime = 0;
  liveReady = false;
  reconnecting = false;
  await attempt(async () => report({active: false, status: 'idle'}));
  if (failure) throw failure;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;
  (async () => {
    if (message.type === 'start') await begin(message.streamId, message.config, message.apiKey, message.groqApiKey);
    else if (message.type === 'stop') await end();
    else if (message.type === 'audio') { config = {...config, ...message.config}; applyVolumes(); }
    sendResponse({ok: true});
  })().catch(async (error) => {
    await end(false).catch(() => {});
    await report({active: false, status: 'error', error: error.message});
    sendResponse({ok: false, error: error.message});
  });
  return true;
});
