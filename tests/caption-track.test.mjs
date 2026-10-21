import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';

import {captionSegments, clampOffset, normalizeSettings, shiftSrt} from '../extension/core.mjs';

const CaptionTrack = createRequire(import.meta.url)('../extension/caption-track.js');

function track(options = {}) {
  const clock = {t: 0};
  const instance = new CaptionTrack({now: () => clock.t, ...options});
  return {clock, track: instance, texts: () => instance.visible().map((line) => line.text)};
}

test('keeps the latest lines on screen instead of replacing them with each fragment', () => {
  const {clock, track: captions, texts} = track({mode: 'scroll', lines: 2, holdMs: 6000});
  captions.push('The first sentence is spoken.', 1);
  clock.t = 300;
  captions.push('Now a second', 2);
  clock.t = 600;
  captions.push('Now a second sentence arrives.', 3);
  assert.deepEqual(texts(), ['The first sentence is spoken.', 'Now a second sentence arrives.']);
});

test('a growing partial updates in place and does not add lines', () => {
  const {clock, track: captions, texts} = track({lines: 4});
  for (const [index, text] of ['Hel', 'Hello wor', 'Hello world', 'Hello world.'].entries()) {
    clock.t = index * 100;
    captions.push(text, index);
  }
  assert.deepEqual(texts(), ['Hello world.']);
});

test('lines leave only after the hold time since their last update', () => {
  const {clock, track: captions, texts} = track({holdMs: 5000});
  captions.push('Readable sentence.', 1);
  clock.t = 4900;
  assert.deepEqual(texts(), ['Readable sentence.']);
  clock.t = 5100;
  assert.deepEqual(texts(), []);
  assert.equal(captions.idle, true);
  assert.equal(captions.spoken, true, 'the overlay must know a caption already played so it can fade the card');
});

test('a repeated terminal sentence is shown again, a re-broadcast is not', () => {
  const {clock, track: captions, texts} = track({lines: 3});
  captions.push('Yes.', 1);
  captions.push('Yes.', 1);
  assert.deepEqual(texts(), ['Yes.']);
  clock.t = 500;
  captions.push('Yes.', 2);
  assert.deepEqual(texts(), ['Yes.', 'Yes.']);
});

test('sentence mode holds the current sentence until it was readable, then advances', () => {
  const {clock, track: captions, texts} = track({mode: 'sentence', holdMs: 8000});
  captions.push('First sentence of the talk.', 1);
  clock.t = 200;
  captions.push('Second sentence follows right away.', 2);
  clock.t = 400;
  assert.deepEqual(texts(), ['First sentence of the talk.'], 'the next sentence must wait its turn');
  clock.t = 3000;
  assert.deepEqual(texts(), ['Second sentence follows right away.']);
});

test('sentence mode speeds up when a backlog builds', () => {
  const {clock, track: captions, texts} = track({mode: 'sentence', holdMs: 8000});
  const sentences = ['One is here.', 'Two is here.', 'Three is here.', 'Four is here.', 'Five is here.'];
  sentences.forEach((text, index) => { clock.t = index * 50; captions.push(text, index + 1); });
  clock.t = 1300;
  assert.notDeepEqual(texts(), ['One is here.'], 'a long queue is not allowed to fall far behind speech');
});

test('long text is shown as the latest wrapped lines only', () => {
  const {track: captions, texts} = track({lines: 2});
  captions.push('word '.repeat(60).trim() + '.', 1);
  const lines = texts();
  assert.equal(lines.length, 2);
  assert.ok(lines.every((line) => line.length <= 84));
});

test('classic-script segmentation matches the module implementation', () => {
  for (const sample of [
    'One. Two! Three?', 'سلام دنیا. حال شما چطور است؟', 'a '.repeat(120), '你好。再见。', ''
  ]) {
    assert.deepEqual(CaptionTrack.segments(sample), captionSegments(sample));
  }
});

test('subtitle and sync settings are clamped', () => {
  const settings = normalizeSettings({
    subtitleMode: 'weird', subtitleLines: 99, subtitleHoldSeconds: 0.2, syncSubtitleOffset: 42, syncDubOffset: '-1.26'
  });
  assert.equal(settings.subtitleMode, 'scroll');
  assert.equal(settings.subtitleLines, 6);
  assert.equal(settings.subtitleHoldSeconds, 2);
  assert.equal(settings.syncSubtitleOffset, 10);
  assert.equal(settings.syncDubOffset, -1.3);
  assert.equal(clampOffset('nope'), 0);
});

test('shiftSrt moves every cue and never goes below zero', () => {
  const source = '1\n00:00:01,250 --> 00:00:02,000\nhi\n\n2\n00:01:00,000 --> 00:01:01,500\nbye\n';
  assert.equal(shiftSrt(source, 0), source);
  assert.equal(
    shiftSrt(source, 1.5),
    '1\n00:00:02,750 --> 00:00:03,500\nhi\n\n2\n00:01:01,500 --> 00:01:03,000\nbye\n'
  );
  assert.match(shiftSrt(source, -5), /^1\n00:00:00,000 --> 00:00:00,000\nhi/u);
  assert.match(shiftSrt(source, -5), /00:00:55,000 --> 00:00:56,500/u);
});
