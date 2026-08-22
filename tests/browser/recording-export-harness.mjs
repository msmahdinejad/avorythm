import {wavHeader} from '../../extension/core.mjs';
import {buildMixedRecording} from '../../extension/recording-export.mjs';

const result = document.querySelector('#result');
result.textContent = 'READY-MODULE';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const once = (target, type) => new Promise((resolve, reject) => {
  target.addEventListener(type, resolve, {once: true});
  target.addEventListener('error', reject, {once: true});
});

function toneWav(duration, frequency = 660) {
  const sampleRate = 24000;
  const samples = new Int16Array(Math.round(duration * sampleRate));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.round(Math.sin(index / sampleRate * frequency * Math.PI * 2) * 9000);
  }
  return new Blob([wavHeader(samples.byteLength, sampleRate), samples], {type: 'audio/wav'});
}

async function sourceVideo(duration = 1.5) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const context = canvas.getContext('2d');
  let frame = 0;
  const timer = setInterval(() => {
    frame += 1;
    context.fillStyle = `hsl(${frame * 5 % 360} 65% 38%)`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.font = '42px sans-serif';
    context.fillText(`Avorythm ${frame}`, 38, 78);
  }, 33);
  const canvasStream = canvas.captureStream(30);
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = 220;
  gain.gain.value = 0.18;
  oscillator.connect(gain).connect(destination);
  oscillator.start();
  await audioContext.resume();
  const stream = new MediaStream([...canvasStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
  const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find((candidate) => MediaRecorder.isTypeSupported(candidate));
  const chunks = [];
  const recorder = new MediaRecorder(stream, {mimeType: type, videoBitsPerSecond: 900000});
  recorder.addEventListener('dataavailable', ({data}) => { if (data.size) chunks.push(data); });
  recorder.start(200);
  await wait(duration * 1000);
  const stopped = once(recorder, 'stop');
  recorder.stop();
  await stopped;
  clearInterval(timer);
  oscillator.stop();
  stream.getTracks().forEach((track) => track.stop());
  await audioContext.close();
  return new Blob(chunks, {type});
}

async function inspectExport(exported) {
  const decodeContext = new AudioContext();
  const decoded = await decodeContext.decodeAudioData(await exported.arrayBuffer());
  const channel = decoded.getChannelData(0);
  let energy = 0;
  for (let index = 0; index < channel.length; index += 32) energy += channel[index] ** 2;
  const rms = Math.sqrt(energy / Math.max(1, Math.ceil(channel.length / 32)));
  await decodeContext.close();
  if (rms < 0.01) throw new Error(`silent_audio_${rms}`);
  const playback = document.createElement('video');
  playback.src = URL.createObjectURL(exported);
  await once(playback, 'loadedmetadata');
  const tracks = playback.captureStream().getTracks().map(({kind}) => kind).sort();
  if (!tracks.includes('video') || !tracks.includes('audio')) throw new Error(`missing_tracks_${tracks.join('_')}`);
  const seeked = once(playback, 'seeked');
  playback.currentTime = 1;
  await seeked;
  if (Math.abs(playback.currentTime - 1) > 0.15) throw new Error(`seek_failed_${playback.currentTime}`);
  return {size: exported.size, duration: playback.duration, decodedDuration: decoded.duration, rms, seek: playback.currentTime, tracks};
}

document.querySelector('#run').addEventListener('click', async () => {
  result.textContent = 'RUNNING';
  let stage = 'source-video';
  try {
    const videoBlob = await sourceVideo();
    const dubbedBlob = toneWav(1.5);
    stage = `mixed-export source=${videoBlob.size}`;
    const exported = await buildMixedRecording({
      videoBlob,
      dubbedBlob,
      durationSeconds: 1.5,
      mix: {
        originalAudioEnabled: false,
        dubAudioEnabled: true,
        originalVolume: 1,
        dubVolume: 1,
        autoDuck: true
      }
    });
    stage = `dubbed-output size=${exported.size}`;
    const dubbed = await inspectExport(exported);
    const mixedExport = await buildMixedRecording({
      videoBlob,
      dubbedBlob,
      durationSeconds: 1.5,
      duckIntervals: [{start: 0.2, end: 0.9}],
      mix: {
        originalAudioEnabled: true,
        dubAudioEnabled: true,
        originalVolume: 0.35,
        dubVolume: 0.8,
        autoDuck: true
      }
    });
    stage = `mixed-output size=${mixedExport.size}`;
    const mixed = await inspectExport(mixedExport);
    const fallbackEnvironment = {
      document,
      MediaRecorder,
      MediaStream,
      AudioContext,
      URL,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      setInterval: globalThis.setInterval.bind(globalThis),
      clearInterval: globalThis.clearInterval.bind(globalThis),
      MediaStreamTrackGenerator: null,
      AudioData: null
    };
    const fallbackExport = await buildMixedRecording({
      videoBlob,
      dubbedBlob,
      durationSeconds: 1.5,
      mix: {
        originalAudioEnabled: false,
        dubAudioEnabled: true,
        originalVolume: 1,
        dubVolume: 1,
        autoDuck: false
      },
      environment: fallbackEnvironment
    });
    stage = `fallback-output size=${fallbackExport.size}`;
    const fallback = await inspectExport(fallbackExport);
    result.textContent = `PASS ${JSON.stringify({type: exported.type, dubbed, mixed, fallback})}`;
  } catch (error) {
    const details = error instanceof Event
      ? `${error.type} target=${error.target?.constructor?.name} mediaError=${error.target?.error?.code || ''}`
      : error?.stack || error;
    result.textContent = `FAIL stage=${stage} ${details}`;
  }
});
