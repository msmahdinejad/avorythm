import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  audioMessage,
  base64ToBytes,
  liveUrl,
  mergeTranscript,
  setupMessage,
  srt,
  wavHeader
} from '../extension/core.mjs';

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

test('creates valid WAV and SRT outputs', () => {
  const header = wavHeader(32000, 16000);
  assert.equal(new TextDecoder().decode(header.subarray(0, 4)), 'RIFF');
  assert.equal(new DataView(header.buffer).getUint32(40, true), 32000);
  assert.match(srt([{start: 1.25, end: 2, text: 'سلام'}]), /00:00:01,250 --> 00:00:02,000/);
});
