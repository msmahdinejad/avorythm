// Inline SVG icons. Lucide (ISC) for UI glyphs and Simple Icons (CC0) for brand marks live as plain files in ./icons;
// every icon used on a page is emitted once into an SVG sprite and referenced with <use>.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), 'icons');

// Marks Simple Icons no longer ships (trademark requests), drawn by hand.
const EXTRA = {
  linkedin: '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/>',
  windows: '<path d="M3 3h8.4v8.4H3zM12.6 3H21v8.4h-8.4zM3 12.6h8.4V21H3zM12.6 12.6H21V21h-8.4z"/>',
};

const sources = new Map();
function load(name) {
  if (sources.has(name)) return sources.get(name);
  let entry = null;
  if (EXTRA[name]) entry = { kind: 'brand', body: EXTRA[name] };
  else {
    for (const kind of ['lucide', 'brands']) {
      const file = join(root, kind, `${name}.svg`);
      if (!existsSync(file)) continue;
      const svg = readFileSync(file, 'utf8');
      const body = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/g, '').trim();
      entry = { kind: kind === 'lucide' ? 'ui' : 'brand', body };
      break;
    }
  }
  if (!entry) throw new Error(`Unknown icon "${name}"`);
  sources.set(name, entry);
  return entry;
}

export function createIcons() {
  const used = new Set();
  const icon = (name, cls = '') => {
    load(name);
    used.add(name);
    return `<svg class="i ${load(name).kind === 'brand' ? 'i-brand' : 'i-ui'}${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
  };
  const sprite = () => `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${
    [...used].sort().map((name) => `<symbol id="i-${name}" viewBox="0 0 24 24">${load(name).body}</symbol>`).join('')
  }</svg>`;
  return { icon, sprite };
}
