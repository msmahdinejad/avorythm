const RECORDER_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];

function once(target, type) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener?.(type, done);
      target.removeEventListener?.('error', failed);
    };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error(`mixed_export_${type}_failed`)); };
    target.addEventListener(type, done, {once: true});
    target.addEventListener('error', failed, {once: true});
  });
}

async function load(media) {
  if (media.readyState >= 3) return;
  await once(media, 'canplay');
}

function selectedType(MediaRecorderClass) {
  return RECORDER_TYPES.find((type) => MediaRecorderClass.isTypeSupported?.(type)) || '';
}

async function readPcmWav(blob) {
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);
  const label = (offset) => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
  if (buffer.byteLength < 44 || label(0) !== 'RIFF' || label(8) !== 'WAVE') {
    throw new Error('mixed_export_invalid_wav');
  }
  let sampleRate = 0;
  let channels = 0;
  let bits = 0;
  let dataOffset = 0;
  let dataBytes = 0;
  for (let offset = 12; offset + 8 <= buffer.byteLength;) {
    const type = label(offset);
    const size = view.getUint32(offset + 4, true);
    if (type === 'fmt ' && size >= 16) {
      if (view.getUint16(offset + 8, true) !== 1) throw new Error('mixed_export_invalid_wav');
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bits = view.getUint16(offset + 22, true);
    } else if (type === 'data') {
      dataOffset = offset + 8;
      dataBytes = Math.min(size, buffer.byteLength - dataOffset);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (!dataOffset || channels !== 1 || bits !== 16 || !sampleRate) {
    throw new Error('mixed_export_invalid_wav');
  }
  return {sampleRate, samples: new Int16Array(buffer.slice(dataOffset, dataOffset + dataBytes))};
}

function clampedVolume(value) {
  return Math.max(0, Math.min(1.5, Number(value) || 0));
}

function finiteDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function exportDuration(authoritative, ...fallbacks) {
  return finiteDuration(authoritative) || Math.max(0.01, ...fallbacks.map(finiteDuration));
}

function interpolatedSample(samples, position) {
  const left = Math.floor(position);
  if (left < 0 || left >= samples.length) return 0;
  const right = Math.min(samples.length - 1, left + 1);
  const fraction = position - left;
  return samples[left] + (samples[right] - samples[left]) * fraction;
}

function originalSample(buffer, time) {
  if (!buffer || time < 0 || time >= buffer.duration) return 0;
  const position = time * buffer.sampleRate;
  let sample = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    sample += interpolatedSample(buffer.getChannelData(channel), position);
  }
  return sample / Math.max(1, buffer.numberOfChannels);
}

function normalizedIntervals(intervals) {
  return intervals
    .map(({start, end}) => ({start: Number(start), end: Number(end)}))
    .filter(({start, end}) => Number.isFinite(start) && Number.isFinite(end) && end >= start)
    .sort((left, right) => left.start - right.start);
}

async function decodeOriginalAudio(videoBlob, environment) {
  const AudioContextClass = environment.AudioContext;
  if (!AudioContextClass) throw new Error('mixed_export_unsupported');
  const context = new AudioContextClass();
  try {
    const buffer = await context.decodeAudioData(await videoBlob.arrayBuffer());
    if (!buffer?.numberOfChannels || !buffer.length) throw new Error('mixed_export_original_track_missing');
    return buffer;
  } catch (error) {
    if (error?.message?.startsWith('mixed_export_')) throw error;
    throw new Error('mixed_export_original_track_missing', {cause: error});
  } finally {
    await Promise.resolve(context.close?.()).catch(() => {});
  }
}

async function writeMixedPcmTrack({
  writer,
  AudioDataClass,
  original,
  dubbed,
  originalVolume,
  dubbedVolume,
  autoDuck,
  duckIntervals,
  duration,
  sampleRate,
  video,
  cancellation,
  environment
}) {
  const framesPerChunk = Math.max(1, Math.round(sampleRate / 10));
  const totalFrames = Math.max(1, Math.ceil(duration * sampleRate));
  const intervals = normalizedIntervals(duckIntervals);
  let intervalIndex = 0;
  try {
    for (let offset = 0; offset < totalFrames; offset += framesPerChunk) {
      const beginsAt = offset / sampleRate;
      while (!cancellation.cancelled && !video.ended && beginsAt > video.currentTime + 0.25) {
        await new Promise((resolve) => (environment.setTimeout || setTimeout)(resolve, 20));
      }
      if (cancellation.cancelled || video.ended) break;
      const frameCount = Math.min(framesPerChunk, totalFrames - offset);
      const pcm = new Int16Array(frameCount);
      for (let index = 0; index < frameCount; index += 1) {
        const time = (offset + index) / sampleRate;
        while (intervalIndex < intervals.length && intervals[intervalIndex].end < time) intervalIndex += 1;
        const dubbedActive = intervalIndex < intervals.length
          && intervals[intervalIndex].start <= time
          && intervals[intervalIndex].end >= time;
        const originalGain = autoDuck && dubbedVolume > 0 && dubbedActive
          ? originalVolume * 0.12
          : originalVolume;
        const source = originalSample(original, time) * originalGain;
        const dub = dubbed
          ? interpolatedSample(dubbed.samples, time * dubbed.sampleRate) / 32768 * dubbedVolume
          : 0;
        pcm[index] = Math.round(Math.max(-1, Math.min(1, source + dub)) * 32767);
      }
      const frame = new AudioDataClass({
        format: 's16',
        sampleRate,
        numberOfFrames: pcm.length,
        numberOfChannels: 1,
        timestamp: Math.round(offset / sampleRate * 1_000_000),
        data: pcm
      });
      await writer.write(frame);
      frame.close();
    }
    await writer.close();
  } catch (error) {
    await Promise.resolve(writer.abort?.(error)).catch(() => {});
    throw error;
  }
}

function createExportVideo(videoBlob, environment) {
  const video = environment.document.createElement('video');
  const url = environment.URL.createObjectURL(videoBlob);
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.style.cssText = 'position:fixed;width:2px;height:2px;left:-10px;top:-10px;opacity:.01;pointer-events:none';
  environment.document.body?.append?.(video);
  return {video, url};
}

function playbackCompletion(video, durationSeconds, environment) {
  const duration = finiteDuration(durationSeconds) || finiteDuration(video.duration);
  const startedAt = Date.now();
  const deadline = startedAt + Math.max(30_000, (duration + 30) * 1000);
  const setTimer = environment.setInterval || setInterval;
  const clearTimer = environment.clearInterval || clearInterval;
  let interval;
  let settled = false;
  let resolvePromise;
  let rejectPromise;
  const cleanup = () => {
    video.removeEventListener?.('ended', check);
    video.removeEventListener?.('timeupdate', check);
    video.removeEventListener?.('error', failed);
    if (interval !== undefined) clearTimer(interval);
  };
  const finish = (error) => {
    if (settled) return;
    settled = true;
    cleanup();
    if (error) rejectPromise(error);
    else resolvePromise();
  };
  const check = () => {
    if (video.ended || duration > 0 && Number(video.currentTime) >= duration - 0.075) {
      finish();
    } else if (Date.now() >= deadline) {
      finish(new Error('mixed_export_playback_timeout'));
    }
  };
  const failed = () => finish(new Error('mixed_export_playback_failed'));
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  video.addEventListener('ended', check);
  video.addEventListener('timeupdate', check);
  video.addEventListener('error', failed, {once: true});
  interval = setTimer(check, 250);
  check();
  return {promise, cancel: () => finish()};
}

function bounded(promise, timeoutMs, code) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(code)), timeoutMs);
    })
  ]);
}

async function recordPlayback({video, tracks, durationSeconds = 0, beforePlay, afterPlay, onProgress, environment}) {
  const output = new environment.MediaStream(tracks);
  const mimeType = selectedType(environment.MediaRecorder);
  const recorder = new environment.MediaRecorder(output, mimeType ? {mimeType} : undefined);
  const chunks = [];
  recorder.addEventListener('dataavailable', ({data}) => { if (data?.size) chunks.push(data); });
  const duration = finiteDuration(durationSeconds) || finiteDuration(video.duration);
  const reportProgress = () => {
    onProgress(duration ? Math.min(1, video.currentTime / duration) : 0);
  };
  video.addEventListener('timeupdate', reportProgress);
  const stopped = once(recorder, 'stop');
  const completion = playbackCompletion(video, duration, environment);
  let failure = null;
  let started = false;
  try {
    recorder.start(200);
    started = true;
    await beforePlay?.();
    await video.play();
    await afterPlay?.();
    await completion.promise;
  } catch (error) {
    failure = error;
  } finally {
    completion.cancel();
    video.removeEventListener('timeupdate', reportProgress);
    if (recorder.state !== 'inactive') recorder.stop();
    if (started) {
      try {
        await bounded(stopped, 5_000, 'mixed_export_recorder_stop_timeout');
      } catch (error) {
        failure ||= error;
      }
    }
    output.getTracks?.().forEach((track) => track.stop?.());
  }
  if (failure) throw new Error('mixed_export_playback_failed', {cause: failure});
  if (!chunks.length) throw new Error('mixed_export_empty');
  onProgress(1);
  return new Blob(chunks, {type: recorder.mimeType || mimeType || 'video/webm'});
}

async function buildGeneratedRecording({videoBlob, dubbedBlob, mix, duckIntervals, durationSeconds, onProgress, environment}) {
  if (!environment.MediaStreamTrackGenerator || !environment.AudioData) {
    throw new Error('mixed_export_unsupported');
  }
  const {video, url} = createExportVideo(videoBlob, environment);
  let generatedTrack;
  let writer;
  let audioWritten;
  const cancellation = {cancelled: false};
  try {
    const originalVolume = mix.originalAudioEnabled ? clampedVolume(mix.originalVolume) : 0;
    const dubbedVolume = mix.dubAudioEnabled ? clampedVolume(mix.dubVolume) : 0;
    const [original, dubbed] = await Promise.all([
      originalVolume > 0 ? decodeOriginalAudio(videoBlob, environment) : null,
      dubbedVolume > 0 ? readPcmWav(dubbedBlob) : null,
      load(video)
    ]);
    const videoTrack = video.captureStream?.()?.getVideoTracks?.()[0];
    if (!videoTrack) throw new Error('mixed_export_video_track_missing');
    generatedTrack = new environment.MediaStreamTrackGenerator({kind: 'audio'});
    writer = generatedTrack.writable.getWriter();
    const duration = exportDuration(
      durationSeconds,
      video.duration,
      original?.duration,
      dubbed ? dubbed.samples.length / dubbed.sampleRate : 0
    );
    const sampleRate = original?.sampleRate || dubbed?.sampleRate || 24000;
    audioWritten = writeMixedPcmTrack({
      writer,
      AudioDataClass: environment.AudioData,
      original,
      dubbed,
      originalVolume,
      dubbedVolume,
      autoDuck: Boolean(mix.autoDuck),
      duckIntervals,
      duration,
      sampleRate,
      video,
      cancellation,
      environment
    });
    const rendered = await recordPlayback({
      video,
      tracks: [videoTrack, generatedTrack],
      durationSeconds: duration,
      onProgress,
      environment
    });
    await audioWritten;
    return rendered;
  } finally {
    cancellation.cancelled = true;
    video.pause?.();
    await Promise.resolve(writer?.abort?.()).catch(() => {});
    await Promise.resolve(audioWritten).catch(() => {});
    generatedTrack?.stop?.();
    video.remove?.();
    environment.URL.revokeObjectURL(url);
  }
}

function mergedIntervals(intervals) {
  const merged = [];
  for (const interval of normalizedIntervals(intervals)) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end + 0.02) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      merged.push({...interval});
    }
  }
  return merged;
}

function scheduleDuck(gain, {baseTime, volume, duration, intervals}) {
  gain.cancelScheduledValues?.(baseTime);
  gain.setValueAtTime(volume, baseTime);
  for (const interval of mergedIntervals(intervals)) {
    const start = baseTime + Math.max(0, Math.min(duration, interval.start));
    const end = baseTime + Math.max(0, Math.min(duration, interval.end));
    if (end <= start) continue;
    const attackEnd = Math.min(end, start + 0.025);
    const releaseEnd = Math.min(baseTime + duration, end + 0.06);
    gain.setValueAtTime(volume, start);
    gain.linearRampToValueAtTime(volume * 0.12, attackEnd);
    gain.setValueAtTime(volume * 0.12, end);
    gain.linearRampToValueAtTime(volume, releaseEnd);
  }
}

async function buildWebAudioRecording({videoBlob, dubbedBlob, mix, duckIntervals, durationSeconds, onProgress, environment}) {
  if (!environment.AudioContext) throw new Error('mixed_export_unsupported');
  const {video, url} = createExportVideo(videoBlob, environment);
  const context = new environment.AudioContext();
  const nodes = [];
  let dubbedSource;
  let originalGain;
  try {
    await load(video);
    const videoTrack = video.captureStream?.()?.getVideoTracks?.()[0];
    if (!videoTrack) throw new Error('mixed_export_video_track_missing');
    const destination = context.createMediaStreamDestination?.();
    const audioTrack = destination?.stream?.getAudioTracks?.()[0];
    if (!destination || !audioTrack) throw new Error('mixed_export_audio_track_missing');

    const originalVolume = mix.originalAudioEnabled ? clampedVolume(mix.originalVolume) : 0;
    const dubbedVolume = mix.dubAudioEnabled ? clampedVolume(mix.dubVolume) : 0;
    let dubbedBuffer = null;
    if (dubbedVolume > 0) {
      try {
        dubbedBuffer = await context.decodeAudioData(await dubbedBlob.arrayBuffer());
      } catch (error) {
        throw new Error('mixed_export_invalid_wav', {cause: error});
      }
      if (!dubbedBuffer?.length) throw new Error('mixed_export_invalid_wav');
    }
    const duration = exportDuration(durationSeconds, video.duration, dubbedBuffer?.duration);

    if (originalVolume > 0) {
      const originalSource = context.createMediaElementSource(video);
      originalGain = context.createGain();
      nodes.push(originalSource, originalGain);
      originalSource.connect(originalGain);
      originalGain.connect(destination);
      originalGain.gain.value = originalVolume;
      video.volume = 1;
      video.muted = false;
    }

    if (dubbedBuffer && dubbedVolume > 0) {
      dubbedSource = context.createBufferSource();
      dubbedSource.buffer = dubbedBuffer;
      const dubbedGain = context.createGain();
      dubbedGain.gain.value = dubbedVolume;
      nodes.push(dubbedSource, dubbedGain);
      dubbedSource.connect(dubbedGain);
      dubbedGain.connect(destination);
    }

    return await recordPlayback({
      video,
      tracks: [videoTrack, audioTrack],
      durationSeconds: duration,
      beforePlay: () => context.resume?.(),
      afterPlay: () => {
        const now = Number(context.currentTime) || 0;
        const playbackOffset = Math.max(0, Number(video.currentTime) || 0);
        const timelineOrigin = now - playbackOffset;
        if (originalGain && mix.autoDuck && dubbedVolume > 0) {
          scheduleDuck(originalGain.gain, {
            baseTime: timelineOrigin,
            volume: originalVolume,
            duration,
            intervals: duckIntervals
          });
        }
        const dubbedOffset = Math.min(
          playbackOffset,
          Math.max(0, Number(dubbedBuffer?.duration) - 0.001)
        );
        dubbedSource?.start?.(now, dubbedOffset);
      },
      onProgress,
      environment
    });
  } finally {
    video.pause?.();
    try { dubbedSource?.stop?.(); } catch {}
    for (const node of nodes) {
      try { node.disconnect?.(); } catch {}
    }
    await Promise.resolve(context.close?.()).catch(() => {});
    video.remove?.();
    environment.URL.revokeObjectURL(url);
  }
}

async function buildSilentRecording({videoBlob, durationSeconds, onProgress, environment}) {
  const {video, url} = createExportVideo(videoBlob, environment);
  try {
    await load(video);
    const videoTrack = video.captureStream?.()?.getVideoTracks?.()[0];
    if (!videoTrack) throw new Error('mixed_export_video_track_missing');
    return await recordPlayback({video, tracks: [videoTrack], durationSeconds, onProgress, environment});
  } finally {
    video.pause?.();
    video.remove?.();
    environment.URL.revokeObjectURL(url);
  }
}

/**
 * Replays the finalized local recording once and records a seekable WebM with
 * the synchronized-player mix. It never reads the on-page playback settings.
 */
export async function buildMixedRecording({
  videoBlob,
  dubbedBlob,
  mix,
  duckIntervals = [],
  durationSeconds = 0,
  onProgress = () => {},
  environment = globalThis
}) {
  if (!environment.document || !environment.MediaRecorder || !environment.MediaStream) {
    throw new Error('mixed_export_unsupported');
  }
  const originalVolume = mix.originalAudioEnabled ? clampedVolume(mix.originalVolume) : 0;
  const dubbedVolume = mix.dubAudioEnabled ? clampedVolume(mix.dubVolume) : 0;
  if (originalVolume === 0 && dubbedVolume === 0) {
    return buildSilentRecording({videoBlob, durationSeconds, onProgress, environment});
  }
  if (!environment.MediaStreamTrackGenerator || !environment.AudioData) {
    return buildWebAudioRecording({
      videoBlob,
      dubbedBlob,
      mix: {...mix, originalVolume, dubbedVolume},
      duckIntervals,
      durationSeconds,
      onProgress,
      environment
    });
  }
  return buildGeneratedRecording({
    videoBlob,
    dubbedBlob,
    mix: {...mix, originalVolume, dubbedVolume},
    duckIntervals,
    durationSeconds,
    onProgress,
    environment
  });
}
