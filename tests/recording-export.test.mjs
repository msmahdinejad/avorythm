import assert from 'node:assert/strict';
import test from 'node:test';

import {wavHeader} from '../extension/core.mjs';
import {buildMixedRecording} from '../extension/recording-export.mjs';

class FakeTarget {
  listeners = new Map();
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of [...(this.listeners.get(type) || [])]) listener(event); }
}

test('exports a dubbed-by-default WebM instead of downloading the raw tab capture', async () => {
  const media = [];
  const dubbedStarts = [];
  let exportedStream;

  class FakeMedia extends FakeTarget {
    style = {};
    readyState = 3;
    currentTime = 0;
    duration = 2;
    ended = false;
    load() {}
    pause() {}
    remove() {}
    captureStream() {
      return {
        getVideoTracks: () => [{kind: 'video'}],
        getAudioTracks: () => [{kind: 'audio'}]
      };
    }
    async play() {
      queueMicrotask(() => {
        this.currentTime = 1;
        this.emit('timeupdate');
        this.currentTime = 2;
        this.ended = true;
        this.emit('ended');
      });
    }
  }

  class FakeNode {
    connect() { return this; }
    disconnect() {}
  }
  class FakeAudioContext {
    currentTime = 0;
    async decodeAudioData() {
      return {duration: 2, sampleRate: 24000, numberOfChannels: 1, length: 48000, getChannelData: () => new Float32Array(48000)};
    }
    createMediaElementSource() { return new FakeNode(); }
    createMediaStreamDestination() {
      const node = new FakeNode();
      node.stream = {getAudioTracks: () => [{kind: 'audio'}]};
      return node;
    }
    createGain() {
      const node = new FakeNode();
      node.gain = {value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}};
      return node;
    }
    createBufferSource() {
      const node = new FakeNode();
      node.start = (...args) => dubbedStarts.push(args);
      node.stop = () => {};
      return node;
    }
    async resume() {}
    async close() {}
  }
  class FakeMediaStream {
    constructor(tracks) { this.tracks = tracks; exportedStream = this; }
  }
  class FakeMediaRecorder extends FakeTarget {
    static isTypeSupported(type) { return type.includes('vp9'); }
    state = 'inactive';
    mimeType = 'video/webm;codecs=vp9,opus';
    constructor(stream) { super(); this.stream = stream; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.emit('dataavailable', {data: new Blob(['mixed'])});
      this.emit('stop');
    }
  }

  const environment = {
    document: {body: {append() {}}, createElement() { const element = new FakeMedia(); media.push(element); return element; }},
    AudioContext: FakeAudioContext,
    MediaRecorder: FakeMediaRecorder,
    MediaStream: FakeMediaStream,
    URL: {createObjectURL: (_, index = media.length) => `blob:${index}`, revokeObjectURL() {}},
    setInterval() { return 1; },
    setTimeout(callback) { callback(); return 1; },
    clearInterval() {}
  };
  const samples = new Int16Array(24000).fill(6000);
  const progress = [];
  const result = await buildMixedRecording({
    videoBlob: new Blob(['video']),
    dubbedBlob: new Blob([wavHeader(samples.byteLength, 24000), samples]),
    mix: {
      originalAudioEnabled: false,
      dubAudioEnabled: true,
      originalVolume: 1,
      dubVolume: 1,
      autoDuck: true
    },
    onProgress: (value) => progress.push(value),
    environment
  });

  assert.equal(result.type, 'video/webm;codecs=vp9,opus');
  assert.equal(await result.text(), 'mixed');
  assert.deepEqual(exportedStream.tracks.map(({kind}) => kind), ['video', 'audio']);
  assert.ok(dubbedStarts.length > 0, 'dubbed audio must start on the same clock as video playback');
  assert.equal(progress.at(-1), 1);

  const silent = await buildMixedRecording({
    videoBlob: new Blob(['video']),
    dubbedBlob: new Blob(),
    mix: {
      originalAudioEnabled: false,
      dubAudioEnabled: false,
      originalVolume: 1,
      dubVolume: 1,
      autoDuck: false
    },
    environment
  });
  assert.equal(await silent.text(), 'mixed');
  assert.deepEqual(exportedStream.tracks.map(({kind}) => kind), ['video']);
});

test('falls back to standard Web Audio when TrackGenerator is unavailable', async () => {
  let exportedStream;
  class FakeMedia extends FakeTarget {
    style = {};
    readyState = 3;
    currentTime = 0;
    duration = 1;
    ended = false;
    load() {}
    pause() {}
    remove() {}
    captureStream() { return {getVideoTracks: () => [{kind: 'video'}]}; }
    async play() {
      queueMicrotask(() => {
        this.currentTime = 1;
        this.ended = true;
        this.emit('timeupdate');
        this.emit('ended');
      });
    }
  }
  class FakeNode {
    connect() { return this; }
    disconnect() {}
  }
  class FakeAudioContext {
    currentTime = 0;
    destination = {};
    async decodeAudioData() {
      return {duration: 1, sampleRate: 24000, numberOfChannels: 1, length: 24000, getChannelData: () => new Float32Array(24000)};
    }
    createMediaElementSource() { return new FakeNode(); }
    createMediaStreamDestination() {
      const node = new FakeNode();
      node.stream = {getAudioTracks: () => [{kind: 'audio'}]};
      return node;
    }
    createGain() {
      const node = new FakeNode();
      node.gain = {value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}};
      return node;
    }
    createBufferSource() {
      const node = new FakeNode();
      node.start = () => {};
      node.stop = () => {};
      return node;
    }
    async resume() {}
    async close() {}
  }
  class FakeMediaStream {
    constructor(tracks) { this.tracks = tracks; exportedStream = this; }
  }
  class FakeMediaRecorder extends FakeTarget {
    static isTypeSupported() { return true; }
    state = 'inactive';
    mimeType = 'video/webm';
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.emit('dataavailable', {data: new Blob(['fallback'])});
      this.emit('stop');
    }
  }
  const environment = {
    document: {body: {append() {}}, createElement: () => new FakeMedia()},
    AudioContext: FakeAudioContext,
    MediaRecorder: FakeMediaRecorder,
    MediaStream: FakeMediaStream,
    URL: {createObjectURL: () => 'blob:fallback', revokeObjectURL() {}},
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {}
  };
  const samples = new Int16Array(24000).fill(1000);
  const result = await buildMixedRecording({
    videoBlob: new Blob(['video']),
    dubbedBlob: new Blob([wavHeader(samples.byteLength, 24000), samples]),
    mix: {originalAudioEnabled: false, dubAudioEnabled: true, originalVolume: 1, dubVolume: 1, autoDuck: false},
    durationSeconds: 1,
    environment
  });
  assert.equal(await result.text(), 'fallback');
  assert.deepEqual(exportedStream.tracks.map(({kind}) => kind), ['video', 'audio']);
});
