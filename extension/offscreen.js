const SOCKET_URL = 'ws://127.0.0.1:8765/ws/extension';
let stream = null;
let context = null;
let source = null;
let captureNode = null;
let sourceGain = null;
let dubGain = null;
let socket = null;
let config = null;
let nextDubTime = 0;
let stopResolver = null;

function report(update) {
  return chrome.runtime.sendMessage({target: 'background', type: 'bridge-state', update});
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

function playDubbed(pcm) {
  if (!context || config.audioMode === 'original') return;
  const samples = new Int16Array(pcm);
  const buffer = context.createBuffer(1, samples.length, 24000);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 32768;
  const player = context.createBufferSource();
  player.buffer = buffer;
  player.connect(dubGain);
  const begins = Math.max(context.currentTime + 0.03, nextDubTime);
  nextDubTime = begins + buffer.duration;
  if (config.audioMode === 'mix' && config.autoDuck) {
    const base = volumeFor('mix', 'original');
    sourceGain.gain.cancelScheduledValues(begins);
    sourceGain.gain.setTargetAtTime(base * 0.12, begins, 0.025);
    sourceGain.gain.setTargetAtTime(base, nextDubTime, 0.08);
  }
  player.start(begins);
}

function openSocket() {
  return new Promise((resolve, reject) => {
    let connected = false;
    const timeout = setTimeout(() => {
      if (!connected) reject(new Error('companion_socket_timeout'));
    }, 15000);
    socket = new WebSocket(SOCKET_URL);
    socket.binaryType = 'arraybuffer';
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'start', target_language: config.targetLanguage,
        voice: config.voice, voice_style: config.voiceStyle, recording: config.recording
      }));
    };
    socket.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        playDubbed(event.data);
        return;
      }
      const message = JSON.parse(event.data);
      if (message.type === 'status') {
        await report({status: message.status, active: message.status === 'connected'});
        if (message.status === 'connected') {
          connected = true;
          clearTimeout(timeout);
          resolve();
        }
        if (message.status === 'stopped') stopResolver?.();
      } else if (message.type === 'transcript') {
        await report({
          [message.channel === 'source' ? 'sourceText' : 'translatedText']: message.text,
          ...(message.channel === 'source' ? {sourceLanguage: message.language || ''} : {})
        });
      } else if (message.type === 'recording') {
        await report({recordingUrl: `http://127.0.0.1:8765${message.download_url}`});
      } else if (message.type === 'error') {
        const error = message.message || 'translation_failed';
        await report({status: 'error', active: false, error});
        clearTimeout(timeout);
        reject(new Error(error));
      }
    };
    socket.onerror = () => {
      clearTimeout(timeout);
      if (!connected) reject(new Error('companion_socket_failed'));
    };
    socket.onclose = () => {
      clearTimeout(timeout);
      report({active: false});
      if (!connected) reject(new Error('companion_socket_closed'));
      stopResolver?.();
    };
  });
}

async function begin(streamId, nextConfig) {
  if (stream) throw new Error('capture_already_active');
  config = nextConfig;
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
  applyVolumes();
  captureNode.port.onmessage = ({data}) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(data);
  };
  await context.resume();
  await openSocket();
}

async function end() {
  if (socket?.readyState === WebSocket.OPEN) {
    const stopped = new Promise((resolve) => { stopResolver = resolve; });
    socket.send(JSON.stringify({type: 'stop'}));
    await Promise.race([
      stopped,
      new Promise((resolve) => setTimeout(resolve, 3500))
    ]);
  }
  socket?.close();
  stream?.getTracks().forEach((track) => track.stop());
  captureNode?.disconnect(); source?.disconnect(); sourceGain?.disconnect(); dubGain?.disconnect();
  await context?.close();
  stream = context = source = captureNode = sourceGain = dubGain = socket = stopResolver = null;
  nextDubTime = 0;
  await report({active: false, status: 'idle'});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;
  (async () => {
    if (message.type === 'start') await begin(message.streamId, message.config);
    else if (message.type === 'stop') await end();
    else if (message.type === 'audio') { config = {...config, ...message.config}; applyVolumes(); }
    sendResponse({ok: true});
  })().catch(async (error) => {
    await end().catch(() => {});
    await report({active: false, status: 'error', error: error.message});
    sendResponse({ok: false, error: error.message});
  });
  return true;
});
