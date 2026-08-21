import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import test from 'node:test';

import {
  audioChannelVolume,
  audioMessage,
  base64ToBytes,
  captionSegments,
  fileVoiceSetupMessage,
  fitPcm,
  latestCaption,
  liveUrl,
  mergeTranscript,
  normalizeSettings,
  outputMix,
  setupMessage,
  srt,
  subtitlesEnabled,
  updateOutputMix,
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

test('keeps on-page and synchronized-player output settings independent', () => {
  let settings = normalizeSettings();
  settings = updateOutputMix(settings, 'low-latency', {
    originalAudioEnabled: true,
    dubAudioEnabled: false,
    originalVolume: 0.4
  });
  settings = updateOutputMix(settings, 'synchronized', {
    originalAudioEnabled: false,
    dubAudioEnabled: true,
    dubVolume: 1.2,
    translatedSubtitlesEnabled: true
  });

  assert.deepEqual(outputMix(settings, 'low-latency'), {
    ...outputMix(normalizeSettings(), 'low-latency'),
    originalAudioEnabled: true,
    dubAudioEnabled: false,
    originalVolume: 0.4
  });
  assert.equal(audioChannelVolume('original', settings, 'low-latency'), 0.4);
  assert.equal(audioChannelVolume('original', settings, 'synchronized'), 0);
  assert.equal(audioChannelVolume('dub', settings, 'synchronized'), 1.2);
  assert.equal(subtitlesEnabled(settings, 'low-latency'), false);
  assert.equal(subtitlesEnabled(settings, 'synchronized'), true);
});

test('migrates legacy subtitle preset without muting its original audio', () => {
  assert.deepEqual(
    normalizeSettings({audioMode: 'subtitles', subtitleShowSource: true, originalVolume: 0}),
    {
      ...normalizeSettings(),
      onPageOutput: {
        ...outputMix(normalizeSettings(), 'low-latency'),
        originalAudioEnabled: true,
        dubAudioEnabled: false,
        sourceSubtitlesEnabled: true,
        translatedSubtitlesEnabled: true
      },
      synchronizedOutput: {
        ...outputMix(normalizeSettings(), 'synchronized'),
        originalAudioEnabled: true,
        dubAudioEnabled: false,
        sourceSubtitlesEnabled: true,
        translatedSubtitlesEnabled: true
      }
    }
  );
});

test('app and extension expose the same four output controls', () => {
  const app = readFileSync(new URL('../src/avorythm/static/index.html', import.meta.url), 'utf8');
  const options = readFileSync(new URL('../extension/options.html', import.meta.url), 'utf8');
  for (const id of ['originalAudioEnabled', 'dubAudioEnabled', 'sourceSubtitlesEnabled', 'translatedSubtitlesEnabled']) {
    assert.match(app, new RegExp(`id="${id}"`));
    assert.match(options, new RegExp(`id="page${id[0].toUpperCase()}${id.slice(1)}"`));
    assert.match(options, new RegExp(`id="sync${id[0].toUpperCase()}${id.slice(1)}"`));
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
  assert.deepEqual(manifest.optional_host_permissions, ['https://api.groq.com/*']);
  assert.deepEqual(manifest.host_permissions, ['https://generativelanguage.googleapis.com/*']);
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

test('builds the Gemini 3.1 Live speech renderer used by the precise sync pipeline', () => {
  const setup = fileVoiceSetupMessage('fa', 'Kore').setup;
  assert.equal(setup.model, 'models/gemini-3.1-flash-live-preview');
  assert.deepEqual(setup.generationConfig.responseModalities, ['AUDIO']);
  assert.equal(setup.generationConfig.speechConfig.languageCode, 'fa');
  assert.equal(setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Kore');
  assert.equal(setup.generationConfig.thinkingConfig.thinkingLevel, 'minimal');
  assert.equal(setup.generationConfig.thinkingConfig.thinkingBudget, undefined);
  assert.match(setup.systemInstruction.parts[0].text, /exactly the supplied text/i);

  const fitted = fitPcm(Int16Array.from([0, 1000, 2000, 3000]), 8);
  assert.equal(fitted.length, 8);
  assert.equal(fitted[0], 0);
  assert.equal(fitted.at(-1), 3000);
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
  const playerPage = readFileSync(new URL('../extension/player.html', import.meta.url), 'utf8');
  const offscreen = readFileSync(new URL('../extension/offscreen.js', import.meta.url), 'utf8');
  const sourceBridge = readFileSync(new URL('../extension/source-bridge.js', import.meta.url), 'utf8');
  assert.equal(manifest.options_ui.page, 'options.html');
  assert.match(popup, /value="synchronized"/);
  assert.match(player, /MediaSource/);
  assert.match(player, /avorythm-sync/);
  assert.match(playerPage, /id="seekRange"/);
  assert.match(playerPage, /id="fullscreenButton"/);
  assert.match(playerPage, /id="downloadVideoButton"/);
  assert.match(playerPage, /data-i18n="storageNote"/);
  assert.match(
    playerPage,
    /class="sync-dock"[\s\S]*id="stopButton"/,
    'Finish recording belongs with recorder state and exports, not in the global header'
  );
  assert.match(offscreen, /class CapturedVideo/);
  assert.match(sourceBridge, /source-media-state/);
});

test('defaults new extension installs to English with a twenty-second recording lead', () => {
  const settings = normalizeSettings();
  assert.equal(settings.locale, 'en');
  assert.equal(settings.syncBufferSeconds, 20);
  assert.equal(settings.syncCaptionEngine, 'gemini');
});

test('ships bilingual illustrated user guides and locale-aware extension links', () => {
  const english = readFileSync(new URL('../docs/HELP.md', import.meta.url), 'utf8');
  const persian = readFileSync(new URL('../docs/HELP.fa.md', import.meta.url), 'utf8');
  const options = readFileSync(new URL('../extension/options.js', import.meta.url), 'utf8');
  const popup = readFileSync(new URL('../extension/popup.js', import.meta.url), 'utf8');
  assert.match(english, /Synchronized recorder & player/);
  assert.match(persian, /ضبط و پلیر هماهنگ/);
  assert.match(options, /helpPageLink/);
  assert.match(popup, /helpLink/);
});

test('ships the exact localized Chrome Web Store image set', () => {
  const dimensions = (path) => {
    const png = readFileSync(path);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };
  const expected = ['01-popup.png', '02-settings.png', '03-sync-settings.png', '04-player.png', '05-subtitles.png'];
  for (const locale of ['en', 'fa']) {
    const directory = new URL(`../store-assets/${locale}/`, import.meta.url);
    assert.deepEqual(readdirSync(directory).filter((name) => name.endsWith('.png')).sort(), expected);
    for (const name of expected) assert.deepEqual(dimensions(new URL(name, directory)), [1280, 800]);
  }
  assert.deepEqual(dimensions(new URL('../store-assets/promo-small.png', import.meta.url)), [440, 280]);
  assert.deepEqual(dimensions(new URL('../store-assets/promo-marquee.png', import.meta.url)), [1400, 560]);
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
