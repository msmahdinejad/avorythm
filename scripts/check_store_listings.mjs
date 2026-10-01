// Validate the copy/paste fields shipped with the localized Web Store assets.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const headings = {
  en: ['Name', 'Short description', 'Detailed description'],
  fa: ['نام', 'توضیح کوتاه', 'توضیح کامل'],
  'zh-CN': ['名称', '简短说明', '详细说明'],
  ar: ['الاسم', 'الوصف المختصر', 'الوصف الكامل'],
  de: ['Name', 'Kurzbeschreibung', 'Ausführliche Beschreibung'],
  fr: ['Nom', 'Description courte', 'Description détaillée'],
  it: ['Nome', 'Descrizione breve', 'Descrizione completa'],
  ru: ['Название', 'Краткое описание', 'Подробное описание']
};
const guidePaths = {
  en: 'docs/HELP.md', fa: 'docs/HELP.fa.md', 'zh-CN': 'docs/HELP.zh-CN.md',
  ar: 'docs/HELP.ar.md', de: 'docs/HELP.md', fr: 'docs/HELP.md',
  it: 'docs/HELP.it.md', ru: 'docs/HELP.ru.md'
};

const manifest = JSON.parse(await readFile(new URL('extension/manifest.json', root), 'utf8'));
const index = await readFile(new URL('store-assets/README.md', root), 'utf8');

for (const [locale, [nameHeading, shortHeading, longHeading]] of Object.entries(headings)) {
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
  const name = field(nameHeading);
  const short = field(shortHeading);
  const description = field(longHeading);
  assert(name.length <= 75 && !name.includes('\n'), `${filename}: title exceeds 75 characters`);
  assert(short.length <= 132 && !short.includes('\n'), `${filename}: short exceeds 132 characters`);
  assert(description.length <= 16000, `${filename}: description exceeds 16,000 characters`);
  for (const term of ['Avorythm', 'Google', 'Gemini', 'Groq', 'Whisper', 'WebM', 'SRT', 'DRM', 'Downloads/Avorythm']) {
    assert(description.includes(term), `${filename}: missing ${term}`);
  }
  const guide = guidePaths[locale];
  assert(description.includes(`/blob/main/${guide}`), `${filename}: missing guide link`);
  await readFile(new URL(guide, root), 'utf8');
  assert(description.includes('/blob/main/PRIVACY.md'), `${filename}: missing privacy link`);
  assert(text.includes(manifest.version), `${filename}: missing current release notes`);
  assert(index.includes(`LISTING.${locale}.md`), `${filename}: not linked in asset index`);
  console.log(`${locale}: name ${name.length}/75; short ${short.length}/132; description ${description.length}/16000`);
}

console.log('All eight localized Web Store listings passed.');
