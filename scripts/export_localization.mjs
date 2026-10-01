// Export the existing, reviewed English strings as a source for localization.
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(root + path, 'utf8');
const dictionaries = [
  ['app', 'src/avorythm/static/app.js', 'messages', 'function t(key)'],
  ['popup', 'extension/popup.js', 'copy', 'function t(key)'],
  ['options', 'extension/options.js', 'copy', 'function t(key)'],
  ['player', 'extension/player.js', 'copy', 'function t(key)']
];
const all = {};
for (const [scope, path, variable, end] of dictionaries) {
  const source = read(path);
  const start = source.indexOf(`const ${variable} = {`);
  const portion = source.slice(start, source.indexOf(end, start));
  const data = runInNewContext(`${portion}; ${variable};`, {});
  all[scope] = Object.fromEntries(Object.entries(data.en).map(([key, value]) => [key,
    typeof value === 'function' ? value('{count}') : value]));
}
for (const [scope, path] of [['help', 'src/avorythm/static/help.html'], ['audioGuide', 'src/avorythm/static/audio-guide.html']]) {
  all[scope] = [...read(path).matchAll(/\bdata-en="([^"]*)"/gu)].map((match) => match[1]);
}
all.extra = {
  waiting: 'Waiting for translation…',
  languageSelector: 'Interface language',
  mixerFailed: 'Could not open Volume Mixer.'
};
all.manifest = {
  appName: 'Avorythm — Live Translation',
  appDescription: 'Translate, dub, and caption a selected tab live with Gemini AI, plus an optional synchronized player.',
  actionTitle: 'Open Avorythm live translation'
};
all.store = {
  short: 'AI dubbing and live captions for the tab you choose, with an optional synchronized player.',
  introduction: 'Watch videos, courses, or podcasts in your language. Avorythm uses AI to translate audio from the browser tab you explicitly select, with translated speech and source or translated captions.',
  modes: 'Choose low-latency playback on the original page or a buffered recorder and player with pause, seek, fullscreen, and customized WebM and SRT export. Original audio, dubbed audio, source captions, and translated captions can be controlled independently.',
  setup: 'The extension runs independently, without the desktop app, Python, FFmpeg, localhost, or a virtual audio device. Add your own Google AI Studio Gemini key and confirm audio processing in Settings. Optional precise mode also requires a Groq key, host permission, and separate audio consent. Provider free tiers, availability, and quotas can change.',
  privacy: 'Processing starts only after consent and Start. Selected-tab audio and transcripts go directly to Google Gemini and, in precise mode, Groq for the requested transcription, translation, and voice generation. No advertising, analytics, or maintainer-operated relay server. Keys are session-only by default; remembering each key on this device is optional, not synced, and not encrypted by the extension. Ordinary four-output recording is off by default; synchronized mode records locally for playback and export.',
  limitations: 'DRM-protected media and internal browser pages may block capture. Live AI processing cannot guarantee zero delay or perfect translations; review important content.'
};
mkdirSync(root + 'localization', {recursive: true});
writeFileSync(root + 'localization/en.json', JSON.stringify(all, null, 2) + '\n');
console.log(Object.fromEntries(Object.entries(all).map(([key, value]) => [key, Object.keys(value).length])));
