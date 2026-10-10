#!/usr/bin/env node
// Reads the real UI dictionaries (en / fa / zh-Hans) out of the extension's popup, options and player scripts so the
// films can show the genuine interface in the viewer's language. Output: video/src/data/ui.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ext = join(root, 'extension');

function literalAfter(src, marker) {
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`marker not found: ${marker}`);
  let i = src.indexOf('{', start);
  const from = i;
  let depth = 0;
  let quote = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return src.slice(from, i + 1);
  }
  throw new Error('unterminated literal');
}

const out = {};
for (const name of ['popup', 'options', 'player']) {
  const src = readFileSync(join(ext, `${name}.js`), 'utf8');
  const dict = new Function(`return (${literalAfter(src, 'const copy = ')})`)();
  out[name] = {};
  for (const [locale, entries] of Object.entries(dict)) {
    out[name][locale] = {};
    for (const [key, value] of Object.entries(entries)) {
      if (typeof value === 'function') { try { out[name][locale][key] = String(value(4)); } catch { /* needs richer args */ } } else out[name][locale][key] = value;
    }
  }
}
mkdirSync(join(root, 'video', 'src', 'data'), { recursive: true });
writeFileSync(join(root, 'video', 'src', 'data', 'ui.json'), JSON.stringify(out, null, 1));
console.log(Object.entries(out).map(([n, d]) => `${n}: ${Object.entries(d).map(([l, e]) => `${l}=${Object.keys(e).length}`).join(' ')}`).join('\n'));
