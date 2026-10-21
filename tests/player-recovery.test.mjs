import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {captionReadingSeconds, clampOffset, normalizeSettings, outputMix, shiftSrt, updateOutputMix} from '../extension/core.mjs';

const playerSource = readFileSync(new URL('../extension/player.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '');
const flush = () => new Promise((resolve) => setImmediate(resolve));

// Real player code and handlers; each test owns its browser state and fake clock.
async function createPlayer(config = {}) {
  const elements = new Map();
  class Element {
    hidden = false; disabled = false; checked = false; value = 0; textContent = '';
    dataset = {}; style = {setProperty() {}};
    classList = {add() {}, remove() {}, toggle() {}};
    listeners = new Map();
    paused = true; ended = false; currentTime = 0; duration = 180;
    readyState = 4; playbackRate = 1; src = '';
    addEventListener(type, callback) {
      const callbacks = this.listeners.get(type) || [];
      callbacks.push(callback); this.listeners.set(type, callbacks);
    }
    async emit(type) { for (const callback of this.listeners.get(type) || []) await callback({type}); }
    async play() { this.paused = false; }
    pause() { this.paused = true; }
    load() {} focus() {} setAttribute() {}
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }
  const element = (selector) => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  for (const selector of ['#stageError', '#playerWarning', '#rebufferNotice']) element(selector).hidden = true;
  const video = element('#video');
  const timers = new Map();
  let nextTimer = 0;
  let clock = 0;
  const messages = [];
  const buffers = [];
  const sources = [];
  const audioSources = [];
  const contexts = [];
  let channel;
  class SourceBuffer extends Element {
    updating = false; appendError = null;
    buffered = {length: 1, start: () => 0, end: () => 180};
    appendBuffer() {
      if (this.appendError) throw this.appendError;
      queueMicrotask(() => this.emit('updateend'));
    }
    remove() {}
  }
  class MediaSource extends Element {
    static isTypeSupported() { return true; }
    readyState = 'open';
    constructor() { super(); sources.push(this); queueMicrotask(() => this.emit('sourceopen')); }
    addSourceBuffer() { const buffer = new SourceBuffer(); buffers.push(buffer); return buffer; }
    endOfStream() { this.readyState = 'ended'; }
  }
  class AudioContext {
    state = 'running'; currentTime = 0; destination = {};
    constructor() { contexts.push(this); }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    createGain() { return {gain: {setTargetAtTime() {}}, connect() {}}; }
    createBuffer(channels, length, rate) { return {duration: length / rate, getChannelData: () => new Float32Array(length)}; }
    createBufferSource() {
      const source = {connect() {}, start(...args) { this.started = args; }, stop() { this.stopped = true; }};
      audioSources.push(source); return source;
    }
  }
  const document = Object.assign(new Element(), {
    documentElement: {}, hidden: false, querySelector: element, querySelectorAll: () => []
  });
  const chrome = {
    storage: {
      local: {get: async () => ({settings: {locale: 'en', syncBufferSeconds: 20, ...config}}), set: async () => {}},
      session: {get: async () => ({}), set: async () => {}}
    },
    runtime: {sendMessage: async () => ({ok: true, state: {active: true}}), openOptionsPage: async () => {}}
  };
  const context = vm.createContext({
    captionReadingSeconds, clampOffset, normalizeSettings, outputMix, shiftSrt, updateOutputMix, console, Blob, ArrayBuffer, Int16Array, Float32Array,
    DOMException, queueMicrotask, MediaSource, AudioContext, document, window: {close() {}}, chrome,
    performance: {now: () => clock}, URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}},
    setTimeout(callback, delay) { timers.set(++nextTimer, {callback, at: clock + delay}); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback, delay) { timers.set(++nextTimer, {callback, at: clock + delay, interval: delay}); return nextTimer; },
    clearInterval(id) { timers.delete(id); },
    BroadcastChannel: class {
      constructor() { channel = this; }
      postMessage(message) { messages.push(message); }
    }
  });
  vm.runInContext(playerSource, context, {filename: 'player.js'});
  await flush();
  const send = async (data) => { channel.onmessage({data}); await flush(); };
  await send({type: 'media-init', mimeType: 'video/webm', bufferSeconds: 20});
  await send({type: 'media-chunk', data: new Blob(['fixture'])});
  if (config.syncCaptionEngine === 'whisper') await send({type: 'processing-frontier', seconds: 120});
  await element('#activateButton').emit('click');
  return {element, video, buffers, sources, send, messages, audioSources, contexts, document, chrome, context,
    async tick(milliseconds) {
      clock += milliseconds;
      for (const [id, timer] of [...timers]) {
        if (!timers.has(id) || timer.at > clock) continue;
        if (!timer.interval) timers.delete(id);
        else timer.at = clock + timer.interval;
        await timer.callback();
      }
      await flush();
    }
  };
}

test('a recovered video clears the error card when its playback clock advances', async () => {
  const p = await createPlayer();
  p.video.currentTime = 120;
  p.buffers[0].appendError = new Error('decode failed');
  await p.send({type: 'media-chunk', data: new Blob(['bad packet'])});
  assert.equal(p.element('#stageError').hidden, false, 'first expose a real player error');
  p.buffers[0].appendError = null;
  p.video.currentTime = 121;
  await p.video.emit('timeupdate');
  assert.equal(p.element('#stageError').hidden, true, 'recovered playback must clear the old error');
});

test('player errors and pipeline warnings have working acknowledgement buttons', async () => {
  const p = await createPlayer();
  p.buffers[0].appendError = new Error('decode failed');
  await p.send({type: 'media-chunk', data: new Blob(['bad packet'])});
  await p.element('#dismissStageError').emit('click');
  assert.equal(p.element('#stageError').hidden, true);
  await p.send({type: 'warning', error: 'groq_timeout'});
  await p.element('#dismissPlayerWarning').emit('click');
  assert.equal(p.element('#playerWarning').hidden, true);
});

test('dismissed repeated errors stay dismissed and new warnings expire', async () => {
  const p = await createPlayer();
  await p.send({type: 'warning', error: 'groq_timeout'});
  await p.element('#dismissPlayerWarning').emit('click');
  await p.send({type: 'warning', error: 'groq_timeout'});
  assert.equal(p.element('#playerWarning').hidden, true);
  await p.send({type: 'warning', error: 'groq_auth_failed'});
  assert.equal(p.element('#playerWarning').hidden, false);
  await p.tick(15_000);
  assert.equal(p.element('#playerWarning').hidden, true);
});

test('an obsolete play promise cannot pause a newer successful seek', async () => {
  const p = await createPlayer();
  let completeOldPlay;
  p.video.play = () => new Promise((resolve) => { completeOldPlay = resolve; });
  p.element('#seekRange').value = 10;
  const oldSeek = p.element('#seekRange').emit('change');
  await flush();
  p.video.play = async () => { p.video.paused = false; };
  p.element('#seekRange').value = 40;
  await p.element('#seekRange').emit('change');
  completeOldPlay(); await oldSeek;
  assert.equal(p.video.paused, false);
  assert.equal(p.video.currentTime, 40);
});

test('errors from a detached SourceBuffer cannot restart the new stream', async () => {
  const p = await createPlayer();
  const previous = p.buffers[0];
  await p.send({type: 'session-reset', position: 20, duration: 180});
  await p.send({type: 'media-init', mimeType: 'video/webm', bufferSeconds: 20});
  const count = p.messages.length;
  await previous.emit('error');
  assert.equal(p.messages.length, count);
});

test('an ended stale dub source cannot delete its replacement after resync', async () => {
  const p = await createPlayer();
  await p.send({type: 'dub-chunk', id: 'speech', start: 0, data: new Int16Array(24000 * 5).buffer});
  const original = p.audioSources.at(-1);
  await p.document.emit('visibilitychange'); await flush();
  const count = p.audioSources.length;
  original.onended(); await p.video.emit('timeupdate');
  assert.equal(p.audioSources.length, count, 'stale onended must not allow duplicate speech');
});

test('precise playback waits at the processed frontier and resumes after translation', async () => {
  const p = await createPlayer({syncCaptionEngine: 'whisper'});
  p.video.currentTime = 119.95;
  await p.video.emit('timeupdate'); await flush();
  assert.equal(p.video.paused, true);
  await p.send({type: 'processing-frontier', seconds: 145});
  assert.equal(p.video.paused, false);
});

test('paused buffering can be cancelled without automatic restart', async () => {
  const p = await createPlayer();
  p.buffers[0].buffered = {length: 1, start: () => 0, end: () => .5};
  await p.video.emit('waiting');
  await p.element('#playButton').emit('click');
  p.buffers[0].buffered = {length: 1, start: () => 0, end: () => 180};
  await p.send({type: 'media-progress', duration: 180});
  assert.equal(p.video.paused, true);
});

test('a small encoder timestamp offset does not prevent initial playback', async () => {
  const p = await createPlayer();
  await p.element('#playButton').emit('click');
  await p.send({type: 'session-reset', position: 0, duration: 180});
  await p.send({type: 'media-init', mimeType: 'video/webm', bufferSeconds: 20});
  p.buffers.at(-1).buffered = {length: 1, start: () => .067, end: () => 180};
  await p.send({type: 'media-chunk', data: new Blob(['fixture'])});
  await p.element('#activateButton').emit('click');
  assert.ok(p.video.currentTime >= .067 && p.video.currentTime < .1);
  assert.equal(p.video.paused, false);
});

test('repeated decoder failures have bounded automatic retries and a working retry button', async () => {
  const p = await createPlayer();
  p.video.currentTime = 30;
  for (let attempt = 0; attempt < 3; attempt++) {
    await p.buffers.at(-1).emit('error');
    await p.send({type: 'session-reset', position: 30, duration: 180});
    await p.send({type: 'media-init', mimeType: 'video/webm', bufferSeconds: 20});
    await p.send({type: 'media-chunk', data: new Blob(['fixture'])});
  }
  const count = p.messages.length;
  await p.buffers.at(-1).emit('error');
  assert.equal(p.messages.length, count);
  assert.equal(p.element('#stageError').hidden, false);
  await p.element('#dismissStageError').emit('click');
  await p.buffers.at(-1).emit('error');
  assert.equal(p.element('#stageError').hidden, true, 'same fault must not reappear after acknowledgement');
  await p.element('#retryPlayback').emit('click');
  assert.equal(p.messages.length, count + 1);
});

test('restoring a paused seek completes without leaving a buffering notice', async () => {
  const p = await createPlayer();
  await p.element('#playButton').emit('click');
  p.buffers[0].buffered = {length: 1, start: () => 90, end: () => 180};
  p.element('#seekRange').value = 20;
  await p.element('#seekRange').emit('change');
  await p.send({type: 'session-reset', position: 20, duration: 180});
  await p.send({type: 'media-init', mimeType: 'video/webm', bufferSeconds: 20});
  await p.send({type: 'media-chunk', data: new Blob(['fixture'])});
  assert.equal(p.video.paused, true);
  assert.equal(p.element('#rebufferNotice').hidden, true);
});

test('a failed finish-recording request leaves the button retryable', async () => {
  const p = await createPlayer();
  p.chrome.runtime.sendMessage = async () => { throw new Error('worker disconnected'); };
  await p.element('#stopButton').emit('click');
  assert.equal(p.element('#stopButton').hidden, false);
  assert.equal(p.element('#stopButton').disabled, false);
  assert.match(p.element('#warningText').textContent, /finish recording/i);
});

test('a frozen decode clock is nudged first and only rebuilt after repeated failures', async () => {
  const p = await createPlayer();
  await p.tick(5000);
  await p.tick(5000);
  assert.equal(p.messages.filter((message) => message.replay).length, 0, 'buffered media must survive the first stalls');
  assert.equal(p.element('#rebufferNotice').hidden, true);
  await p.tick(5000);
  assert.equal(p.messages.filter((message) => message.replay).length, 1);
  assert.equal(p.video.paused, true, 'audio and video must wait together during recovery');
  await p.tick(10000);
  assert.equal(p.element('#rebufferNotice').hidden, true);
  assert.match(p.element('#stageErrorText').textContent, /too long/);
});

test('Play retries a timed-out replay after its error was acknowledged', async () => {
  const p = await createPlayer();
  await p.buffers[0].emit('error');
  await p.tick(10000);
  await p.element('#dismissStageError').emit('click');
  const count = p.messages.length;
  await p.element('#playButton').emit('click');
  assert.equal(p.messages.length, count + 1);
  assert.equal(p.messages.at(-1).replay, true);
});

test('recovery still times out when the producer resets but sends no usable media', async () => {
  const p = await createPlayer();
  await p.buffers[0].emit('error');
  await p.send({type: 'session-reset', position: 10, duration: 180});
  await p.send({type: 'media-init', mimeType: 'video/webm', bufferSeconds: 20});
  await p.tick(10000);
  assert.equal(p.element('#rebufferNotice').hidden, true);
  assert.equal(p.element('#stageError').hidden, false);
  assert.match(p.element('#stageErrorText').textContent, /too long/);
});

test('late suspend completion cannot undo a user Pause during rebuffering', async () => {
  const p = await createPlayer();
  p.buffers[0].buffered = {length: 1, start: () => 0, end: () => .5};
  let finishSuspend;
  p.contexts[0].suspend = () => new Promise((resolve) => { finishSuspend = resolve; });
  const waiting = p.video.emit('waiting');
  await flush();
  p.contexts[0].suspend = async () => {};
  await p.element('#playButton').emit('click');
  finishSuspend(); await waiting;
  assert.equal(p.element('#rebufferNotice').hidden, true);
  assert.equal(p.element('#playButton').textContent, '▶');
  assert.equal(p.video.paused, true);
});

test('automatic stalled-clock rebuilds stop after three unsuccessful attempts', async () => {
  const p = await createPlayer();
  for (let attempt = 0; attempt < 4; attempt++) {
    await p.tick(5000); await p.tick(5000); await p.tick(5000);
    if (attempt < 3) {
      await p.send({type: 'session-reset', position: 0, duration: 180});
      await p.send({type: 'media-init', mimeType: 'video/webm', bufferSeconds: 20});
      await p.send({type: 'media-chunk', data: new Blob(['fixture'])});
    }
  }
  assert.equal(p.messages.filter((message) => message.replay).length, 3);
  assert.equal(p.element('#rebufferNotice').hidden, true);
  assert.equal(p.element('#stageError').hidden, false);
});

test('a newer seek target wins over an older replay response', async () => {
  const p = await createPlayer();
  p.video.currentTime = 120;
  p.buffers[0].buffered = {length: 1, start: () => 0, end: () => 10};
  p.element('#seekRange').value = 20;
  await p.element('#seekRange').emit('change');
  p.element('#seekRange').value = 140;
  await p.element('#seekRange').emit('change');
  await p.send({type: 'session-reset', position: 20, replayId: 1, duration: 180});
  await p.send({type: 'session-reset', position: 140, replayId: 2, duration: 180});
  await p.send({type: 'media-init', mimeType: 'video/webm', bufferSeconds: 20});
  await p.send({type: 'media-chunk', data: new Blob(['fixture'])});
  assert.equal(p.video.currentTime, 140);
});

test('waiting events with plenty of buffered media never pause, rebuild or flash the buffering notice', async () => {
  const p = await createPlayer();
  p.video.paused = false;
  const before = p.messages.length;
  for (let index = 0; index < 5; index++) await p.video.emit(index % 2 ? 'stalled' : 'waiting');
  assert.equal(p.messages.length, before, 'no replay request');
  assert.equal(p.video.paused, false);
  assert.equal(p.element('#rebufferNotice').hidden, true);
});

test('a hole in the live buffer is skipped instead of waited out', async () => {
  const p = await createPlayer();
  p.buffers[0].buffered = {length: 2, start: (index) => [0, 14][index], end: (index) => [10, 60][index]};
  p.video.currentTime = 10;
  p.video.paused = false;
  const before = p.messages.length;
  await p.video.emit('waiting');
  assert.ok(p.video.currentTime >= 14, 'playback continues after the missing frames');
  assert.equal(p.messages.length, before);
  assert.equal(p.video.paused, false);
});

test('manual subtitle timing shifts both caption tracks and survives a persist', async () => {
  const p = await createPlayer({synchronizedOutput: {translatedSubtitlesEnabled: true, sourceSubtitlesEnabled: true}});
  await p.send({type: 'caption', id: 's1', translated: false, start: 10, end: 12, text: 'Hello there'});
  await p.send({type: 'caption', id: 't1', translated: true, start: 10, end: 12, text: 'سلام'});
  p.video.currentTime = 11;
  await p.video.emit('timeupdate');
  assert.equal(p.element('#sourceCaption').textContent, 'Hello there');
  assert.equal(p.element('#translatedCaption').textContent, 'سلام');
  p.element('#subtitleOffset').value = 3;
  await p.element('#subtitleOffset').emit('input');
  assert.equal(p.element('#translatedCaption').textContent, '', 'a later offset must delay the cue');
  assert.equal(p.element('#subtitleOffsetValue').textContent, '+3.0s');
  p.video.currentTime = 14;
  await p.video.emit('timeupdate');
  assert.equal(p.element('#translatedCaption').textContent, 'سلام');
  await p.element('#subtitleOffset').emit('change');
  const saved = (await p.chrome.storage.local.get('settings')).settings;
  assert.ok(saved);
});

test('a short cue stays on screen long enough to read until the next one replaces it', async () => {
  const p = await createPlayer({synchronizedOutput: {translatedSubtitlesEnabled: true}});
  await p.send({type: 'caption', id: 't1', translated: true, start: 10, end: 10.4, text: 'یک جملهٔ نسبتاً بلند برای خواندن'});
  p.video.currentTime = 11.2;
  await p.video.emit('timeupdate');
  assert.equal(p.element('#translatedCaption').hidden, false);
  await p.send({type: 'caption', id: 't2', translated: true, start: 11, end: 12, text: 'جملهٔ بعدی'});
  await p.video.emit('timeupdate');
  assert.equal(p.element('#translatedCaption').textContent, 'جملهٔ بعدی');
});
