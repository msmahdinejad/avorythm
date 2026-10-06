// Keep Chrome's packaged listing metadata aligned with the reviewed store copy.
import assert from 'node:assert/strict';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = new URL('../', import.meta.url);

// Supported by Chrome Web Store, with a corresponding translated listing.
// Regional English and es_419 use their generic language; nb shares no.
// https://developer.chrome.com/docs/extensions/reference/api/i18n#locales
export const STORE_LOCALES = Object.freeze([
  'am', 'ar', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'et',
  'fa', 'fi', 'fil', 'fr', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'it', 'ja',
  'kn', 'ko', 'lt', 'lv', 'ml', 'mr', 'ms', 'nl', 'no', 'pl', 'pt_BR',
  'pt_PT', 'ro', 'ru', 'sk', 'sl', 'sr', 'sv', 'sw', 'ta', 'te', 'th',
  'tr', 'uk', 'vi', 'zh_CN', 'zh_TW'
]);

export async function expectedStoreMessages(locale, repository = root) {
  assert(STORE_LOCALES.includes(locale), `Unsupported store locale: ${locale}`);
  const filename = `store-assets/LISTING.${locale.replace('_', '-')}.md`;
  const text = await readFile(new URL(filename, repository), 'utf8');
  const fields = text.split(/^## .+$/mu).slice(1).map((part) => part.trim());
  const [name, summary] = fields;
  assert(name && !name.includes('\n') && name.length <= 75, `${filename}: invalid name`);
  assert(summary && !summary.includes('\n') && summary.length <= 132,
    `${filename}: invalid short description`);
  return {
    appName: {message: name},
    appDescription: {message: summary},
    actionTitle: {message: name}
  };
}

export async function syncStoreMetadata({write = false, repository = root} = {}) {
  const directory = new URL('extension/_locales/', repository);
  const failures = [];
  for (const locale of STORE_LOCALES) {
    const expected = await expectedStoreMessages(locale, repository);
    const folder = new URL(`${locale}/`, directory);
    const file = new URL('messages.json', folder);
    if (write) {
      await mkdir(folder, {recursive: true});
      await writeFile(file, JSON.stringify(expected, null, 2) + '\n', 'utf8');
    } else {
      try {
        const actual = JSON.parse(await readFile(file, 'utf8'));
        assert.deepEqual(actual, expected);
      } catch (error) {
        if (error.code === 'ENOENT') failures.push(`${locale}: missing packaged locale`);
        else if (error instanceof SyntaxError || error.code === 'ERR_ASSERTION') {
          failures.push(`${locale}: packaged title/summary differs from the reviewed listing`);
        } else throw error;
      }
    }
  }
  const entries = await readdir(directory, {withFileTypes: true});
  for (const entry of entries) {
    if (entry.isDirectory() && !STORE_LOCALES.includes(entry.name)) {
      failures.push(`${entry.name}: unexpected or unsupported store locale`);
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'));
  console.log(`${STORE_LOCALES.length} packaged store locales ${write ? 'updated' : 'verified'} against listing titles and summaries.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await syncStoreMetadata({write: process.argv.includes('--write')});
}
