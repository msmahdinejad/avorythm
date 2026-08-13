import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  audioChannelVolume,
  audioMessage,
  base64ToBytes,
  liveUrl,
  mergeTranscript,
  setupMessage,
  srt,
  wavHeader
} from '../extension/core.mjs';

test('subtitle mode preserves source audio and mutes generated speech', () => {
  const settings = {originalVolume: 0.2, dubVolume: 1};
  assert.equal(audioChannelVolume('subtitles', 'original', settings), 1);
  assert.equal(audioChannelVolume('subtitles', 'dub', settings), 0);
});

test('builds the documented Gemini Live Translate protocol', () => {
  assert.match(liveUrl('key + value'), /key=key%20%2B%20value$/);
  const setup = setupMessage('fa').setup;
  assert.equal(setup.model, 'models/gemini-3.5-live-translate-preview');
  assert.equal(setup.generationConfig.translationConfig.targetLanguageCode, 'fa');
  assert.deepEqual(setup.inputAudioTranscription, {});
  assert.deepEqual(setup.outputAudioTranscription, {});
  assert.equal('inputAudioTranscription' in setup.generationConfig, false);
  assert.deepEqual(setup.generationConfig.responseModalities, ['AUDIO']);
  assert.equal(audioMessage(Uint8Array.from([0, 1, 255])).realtimeInput.audio.data, 'AAH/');
});

test('hidden popup notices stay hidden', () => {
  const css = readFileSync(new URL('../extension/popup.css', import.meta.url), 'utf8');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});

test('merges cumulative and delta transcripts', () => {
  const tracker = {partial: '', started: 0};
  assert.equal(mergeTranscript(tracker, 'Hello', false, 1), null);
  assert.deepEqual(mergeTranscript(tracker, 'Hello world', true, 2), {text: 'Hello world', start: 1, end: 2});
  assert.deepEqual(base64ToBytes('AAH/'), Uint8Array.from([0, 1, 255]));
});

test('starts a fresh live subtitle after sentence punctuation', () => {
  const tracker = {partial: '', started: 0};
  assert.deepEqual(mergeTranscript(tracker, 'Hello world.', false, 1), {text: 'Hello world.', start: 1, end: 1});
  assert.deepEqual(mergeTranscript(tracker, 'How are you?', false, 2), {text: 'How are you?', start: 2, end: 2});
  assert.equal(tracker.partial, '');
});

test('drops a committed prefix from cumulative transcript updates', () => {
  const tracker = {partial: '', started: 0};
  assert.deepEqual(mergeTranscript(tracker, 'Hello world.', false, 1), {text: 'Hello world.', start: 1, end: 1});
  assert.equal(mergeTranscript(tracker, 'Hello world. How', false, 2), null);
  assert.equal(tracker.partial, 'How');
});

test('subtitle surfaces remain scrollable', () => {
  const overlay = readFileSync(new URL('../extension/content.js', import.meta.url), 'utf8');
  const popup = readFileSync(new URL('../extension/popup.css', import.meta.url), 'utf8');
  const native = readFileSync(new URL('../src/dubira/static/subtitle-window.css', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('../src/dubira/static/styles.css', import.meta.url), 'utf8');
  const browserPopup = readFileSync(new URL('../src/dubira/static/app.js', import.meta.url), 'utf8');
  assert.match(overlay, /overflow:\s*auto/);
  assert.match(popup, /\.transcripts>div\{[^}]*overflow-y:\s*auto/);
  assert.match(native, /overflow-y:\s*auto/);
  assert.match(dashboard, /\.transcript\{[^}]*overflow-y:\s*auto/);
  assert.match(browserPopup, /\.card\{[^}]*overflow-y:\s*auto/s);
});

test('creates valid WAV and SRT outputs', () => {
  const header = wavHeader(32000, 16000);
  assert.equal(new TextDecoder().decode(header.subarray(0, 4)), 'RIFF');
  assert.equal(new DataView(header.buffer).getUint32(40, true), 32000);
  assert.match(srt([{start: 1.25, end: 2, text: 'سلام'}]), /00:00:01,250 --> 00:00:02,000/);
});
