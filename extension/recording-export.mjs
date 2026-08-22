const RECORDER_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];

function once(target, type, timeoutMs = 0, timeoutCode = '') {
  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      target.removeEventListener?.(type, done);
      target.removeEventListener?.('error', failed);
      if (timer !== undefined) clearTimeout(timer);
    };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error(`mixed_export_${type}_failed`)); };
    target.addEventListener(type, done, {once: true});
    target.addEventListener('error', failed, {once: true});
    if (timeoutMs > 0) timer = setTimeout(() => {
      cleanup();
      reject(new Error(timeoutCode || `mixed_export_${type}_timeout`));
    }, timeoutMs);
  });
}

async function load(media) {
  if (media.readyState >= 3) return;
  await once(media, 'canplay', 15_000, 'mixed_export_load_timeout');
}

function selectedType(MediaRecorderClass) {
  return RECORDER_TYPES.find((type) => MediaRecorderClass.isTypeSupported?.(type)) || '';
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

function normalizedIntervals(intervals) {
  return intervals
    .map(({start, end}) => ({start: Number(start), end: Number(end)}))
    .filter(({start, end}) => Number.isFinite(start) && Number.isFinite(end) && end >= start)
    .sort((left, right) => left.start - right.start);
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
