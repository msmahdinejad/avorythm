import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  audioChannelVolume,
  audioMessage,
  base64ToBytes,
  captionSegments,
  latestCaption,
  liveUrl,
  mergeTranscript,
  normalizeSettings,
  setupMessage,
  srt,
  subtitlesEnabled,
  LIVE_ENDPOINT,
  wavHeader
} from '../extension/core.mjs';

test('mixes four output channels independently', () => {
  const settings = normalizeSettings({
    originalAudioEnabled: true,
    dubAudioEnabled: false,
    sourceSubtitlesEnabled: true,
    translatedSubtitlesEnabled: false,
    originalVolume: 0.35,
    dubVolume: 1
  });
  assert.equal(audioChannelVolume('original', settings), 0.35);
  assert.equal(audioChannelVolume('dub', settings), 0);
  assert.equal(subtitlesEnabled(settings), true);
});

test('migrates legacy subtitle preset without muting its original audio', () => {
  assert.deepEqual(
    normalizeSettings({audioMode: 'subtitles', subtitleShowSource: true, originalVolume: 0}),
    {
      ...normalizeSettings(),
      originalAudioEnabled: true,
      dubAudioEnabled: false,
      sourceSubtitlesEnabled: true,
      translatedSubtitlesEnabled: true
    }
  );
});

test('app and extension expose the same four output controls', () => {
  const app = readFileSync(new URL('../src/avorythm/static/index.html', import.meta.url), 'utf8');
  const options = readFileSync(new URL('../extension/options.html', import.meta.url), 'utf8');
  for (const id of ['originalAudioEnabled', 'dubAudioEnabled', 'sourceSubtitlesEnabled', 'translatedSubtitlesEnabled']) {
    assert.match(app, new RegExp(`id="${id}"`));
    assert.match(options, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(app, /id="liveMode"/);
  assert.doesNotMatch(options, /id="audioMode"/);
});

test('public surfaces link to the canonical project and privacy policy', () => {
  const app = readFileSync(new URL('../src/avorythm/static/index.html', import.meta.url), 'utf8');
  const popup = readFileSync(new URL('../extension/popup.html', import.meta.url), 'utf8');
  const options = readFileSync(new URL('../extension/options.html', import.meta.url), 'utf8');
  const manifest = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  const homepage = 'https://github.com/msmahdinejad/avorythm';
  assert.equal(manifest.homepage_url, homepage);
  assert.match(app, new RegExp(homepage));
  assert.match(popup, new RegExp(homepage));
  assert.match(options, /PRIVACY\.md/);
  assert.equal(manifest.default_locale, 'en');
  assert.deepEqual(manifest.optional_permissions, ['downloads']);
});

test('extension requires explicit first-capture consent', () => {
  const options = readFileSync(new URL('../extension/options.html', import.meta.url), 'utf8');
  const script = readFileSync(new URL('../extension/options.js', import.meta.url), 'utf8');
  const background = readFileSync(new URL('../extension/background.js', import.meta.url), 'utf8');
  assert.match(options, /id="dataConsent"/);
  assert.match(script, /CONSENT_VERSION = 1/);
  assert.match(background, /nextConfig\.consentVersion !== 1/);
});

test('builds the documented Gemini Live Translate protocol', () => {
  const setup = setupMessage('fa').setup;
  assert.equal(setup.model, 'models/gemini-3.5-live-translate-preview');
  assert.equal(setup.generationConfig.translationConfig.targetLanguageCode, 'fa');
  assert.deepEqual(setup.inputAudioTranscription, {});
  assert.deepEqual(setup.outputAudioTranscription, {});
  assert.deepEqual(setup.generationConfig.responseModalities, ['AUDIO']);
  assert.equal(audioMessage(Uint8Array.from([0, 1, 255])).realtimeInput.audio.data, 'AAH/');
  assert.match(LIVE_ENDPOINT, /v1beta\.GenerativeService\.BidiGenerateContent$/);
  assert.match(liveUrl('AIza/a+b'), /\?key=AIza%2Fa%2Bb$/);
});

test('keeps live captions sentence-sized', () => {
  assert.deepEqual(captionSegments('First sentence. Second sentence?'), ['First sentence.', 'Second sentence?']);
  assert.equal(latestCaption('First sentence. Second sentence?'), 'Second sentence?');
  assert.ok(captionSegments('word '.repeat(60), 42).every((part) => part.length <= 42));
});

test('ships a dedicated synchronized player and separate settings page', () => {
  const manifest = JSON.parse(readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  const popup = readFileSync(new URL('../extension/popup.html', import.meta.url), 'utf8');
  const player = readFileSync(new URL('../extension/player.js', import.meta.url), 'utf8');
  assert.equal(manifest.options_ui.page, 'options.html');
  assert.match(popup, /value="synchronized"/);
  assert.match(player, /MediaSource/);
  assert.match(player, /avorythm-sync/);
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
  const native = readFileSync(new URL('../src/avorythm/static/subtitle-window.css', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('../src/avorythm/static/styles.css', import.meta.url), 'utf8');
  const browserPopup = readFileSync(new URL('../src/avorythm/static/app.js', import.meta.url), 'utf8');
  assert.match(overlay, /overflow:\s*auto/);
  assert.doesNotMatch(popup, /\.live-copy/);
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
