// Validate the copy/paste fields shipped with the localized Web Store assets.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LANGUAGES} from '../extension/core.mjs';

const root = new URL('../', import.meta.url);
const guidePaths = {
  en: 'docs/HELP.md', fa: 'docs/HELP.fa.md', 'zh-CN': 'docs/HELP.zh-CN.md',
  ar: 'docs/HELP.ar.md', de: 'docs/HELP.md', fr: 'docs/HELP.md',
  it: 'docs/HELP.it.md', ru: 'docs/HELP.ru.md'
};

const manifest = JSON.parse(await readFile(new URL('extension/manifest.json', root), 'utf8'));
const index = await readFile(new URL('store-assets/README.md', root), 'utf8');
const allLanguages = await readFile(new URL('store-assets/ALL-LANGUAGES.md', root), 'utf8');
assert(index.includes('ALL-LANGUAGES.md'), 'Asset index must link the complete language catalog.');

for (const targetLanguage of LANGUAGES) {
  const locale = {'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW'}[targetLanguage] || targetLanguage;
  const filename = `store-assets/LISTING.${locale}.md`;
  const text = await readFile(new URL(filename, root), 'utf8');
  const sections = new Map();
  let heading = null;
  for (const line of text.split(/\r?\n/u)) {
    if (line.startsWith('## ')) {
      heading = line.slice(3);
      assert(!sections.has(heading), `${filename}: duplicate heading ${heading}`);
      sections.set(heading, []);
    } else if (heading) {
      sections.get(heading).push(line);
    }
  }
  const field = (key) => {
    assert(sections.has(key), `${filename}: missing ${key}`);
    const value = sections.get(key).join('\n').trim();
    assert(value && !value.includes('\uFFFD'), `${filename}: empty or corrupt ${key}`);
    return value;
  };
  const keys = [...sections.keys()];
  assert(keys.length >= 4, `${filename}: expected name, short, full and release notes`);
  const name = field(keys[0]);
  const short = field(keys[1]);
  const description = field(keys[2]);
  const releaseNotes = field(keys[3]);
  assert(name.length <= 75 && !name.includes('\n'), `${filename}: title exceeds 75 characters`);
  assert(short.length <= 132 && !short.includes('\n'), `${filename}: short exceeds 132 characters`);
  assert(description.length <= 16000, `${filename}: description exceeds 16,000 characters`);
  for (const term of ['Avorythm', 'Google', 'Gemini', 'Groq', 'Whisper', 'WebM', 'WAV', 'SRT', 'DRM', 'Downloads/Avorythm']) {
    assert(description.includes(term), `${filename}: missing ${term}`);
  }
  const guide = guidePaths[locale] || 'docs/HELP.md';
  assert(description.includes(`/blob/main/${guide}`), `${filename}: missing guide link`);
  await readFile(new URL(guide, root), 'utf8');
  assert(description.includes('/blob/main/PRIVACY.md'), `${filename}: missing privacy link`);
  assert(keys[3].includes(manifest.version), `${filename}: missing current release notes`);
  assert(releaseNotes.startsWith('- '), `${filename}: release notes must contain a change list`);
  assert(allLanguages.includes(`LISTING.${locale}.md`), `${filename}: not linked in complete language index`);
  console.log(`${locale}: name ${name.length}/75; short ${short.length}/132; description ${description.length}/16000`);
}

console.log(`All ${LANGUAGES.length} target-language listings passed.`);
