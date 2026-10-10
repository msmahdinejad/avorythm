// Extracts the desktop app's real interface strings (src/avorythm/static/app.js `messages`) into
// video/build/demo/app-ui.json so the film can render the real desktop page with its own words.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..', '..', '..');
const src = readFileSync(resolve(repo, 'src/avorythm/static/app.js'), 'utf8');
function grab(name) {
  const i = src.indexOf(`const ${name} = {`);
  if (i < 0) throw new Error(`${name} not found`);
  let depth = 0; let j = src.indexOf('{', i); const start = j;
  let inStr = null;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (inStr) { if (ch === '\\') { j++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
  }
  return new Function(`return (${src.slice(start, j + 1)});`)();
}
const out = { messages: grab('messages'), languageNames: grab('languageNames') };
const dest = resolve(repo, 'video/build/demo/app-ui.json');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(out, null, 1));
console.log('app-ui.json:', Object.keys(out.messages).map((k) => `${k} ${Object.keys(out.messages[k]).length}`).join(', '));
