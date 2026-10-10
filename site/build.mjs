#!/usr/bin/env node
// Static site generator for the Avorythm GitHub Pages site (zero dependencies).
//   node site/build.mjs                build into site/_site
//   node site/build.mjs --strict       fail on missing translations or broken local links (used by CI)
//   node site/build.mjs --out <dir>    choose the output directory
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGES, SITE_URL, REPO_URL } from './src/languages.mjs';
import { renderPage, renderNotFound, pageUrl } from './src/page.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const outArg = args.indexOf('--out');
const out = resolve(outArg >= 0 ? args[outArg + 1] : join(here, '_site'));
const warn = (message) => { warnings.push(message); console.warn(`warning: ${message}`); };
const warnings = [];

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/* ---------------------------------------------------------------- strings */
const en = readJson(join(here, 'src/i18n/en.json'));
const dictionaries = new Map();
for (const l of LANGUAGES) {
  const file = join(here, `src/i18n/${l.code}.json`);
  if (l.code === 'en') dictionaries.set('en', en);
  else if (existsSync(file)) dictionaries.set(l.code, readJson(file));
  else warn(`no translation file for "${l.code}" – falling back to English`);
}

// Leaf paths of the English file define the full key set; "ui.*" mirrors the real extension UI and may stay English.
function leaves(value, prefix = '', acc = []) {
  if (Array.isArray(value)) value.forEach((v, i) => leaves(v, `${prefix}.${i}`, acc));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k, acc));
  else acc.push(prefix);
  return acc;
}
const enKeys = leaves(en);
for (const [code, dict] of dictionaries) {
  if (code === 'en') continue;
  const missing = enKeys.filter((k) => !k.startsWith('ui.') && get(dict, k) === undefined);
  if (missing.length) warn(`${code}: ${missing.length} missing keys (${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', …' : ''})`);
  const extra = leaves(dict).filter((k) => get(en, k) === undefined);
  if (extra.length) warn(`${code}: ${extra.length} unknown keys (${extra.slice(0, 5).join(', ')})`);
  for (const key of enKeys) {
    const a = get(en, key);
    const b = get(dict, key);
    if (typeof a === 'string' && typeof b === 'string') {
      const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
      if (ph(a) !== ph(b)) warn(`${code}: placeholders differ in "${key}"`);
      const bad = b.match(/<(?!\/?(em|strong|br|code|kbd)\b)[^>]*>/gi);
      if (bad) warn(`${code}: disallowed markup in "${key}": ${bad.join(' ')}`);
    }
  }
}

function makeLookup(code) {
  const dict = dictionaries.get(code) || en;
  const t = (key) => {
    const value = get(dict, key) ?? get(en, key);
    if (value === undefined) { warn(`missing string "${key}"`); return `[[${key}]]`; }
    return typeof value === 'string' ? value : JSON.stringify(value);
  };
  const ta = (key) => get(dict, key) ?? get(en, key) ?? [];
  const tl = (key) => t(key); // value for client-side use
  return { t, ta, tl };
}

/* ------------------------------------------------------------------ assets */
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
const css = ['base', 'layout', 'components'].map((n) => strip(readFileSync(join(here, `src/css/${n}.css`), 'utf8'))).join('\n').replace(/@keyframes none\{\}\n?/g, '');
const jsFiles = readdirSync(join(here, 'src/js')).filter((f) => f.endsWith('.js')).sort();
const js = `(() => {\n'use strict';\n${jsFiles.map((f) => readFileSync(join(here, 'src/js', f), 'utf8')).join('\n')}\n})();\n`;
const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 10);
const assetHash = { css: hash(css), js: hash(js) };

const qrSource = existsSync(join(here, 'src/vendor/qrcode.js'))
  ? readFileSync(join(here, 'src/vendor/qrcode.js'), 'utf8').replace(/\(function \(factory\)[\s\S]*$/, '')
  : '';

/* ---------------------------------------------------------------- manifest */
const manifestFile = join(here, 'public/video/manifest.json');
const manifest = existsSync(manifestFile) ? readJson(manifestFile) : null;
const version = (() => { try { return readJson(join(here, '../extension/manifest.json')).version; } catch { return '1.1.17'; } })();

/* -------------------------------------------------------------------- build */
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'assets'), { recursive: true });

const shareTexts = Object.fromEntries(LANGUAGES.map((l) => {
  const { t } = makeLookup(l.code);
  return [l.code, { text: t('share.text'), hashtags: t('share.hashtags'), title: t('meta.ogTitle') }];
}));

for (const l of LANGUAGES) {
  const { t, ta, tl } = makeLookup(l.code);
  const html = renderPage({ lang: l.code, t, ta, tl, manifest, assetHash, version, shareTexts });
  const dir = l.code === 'en' ? out : join(out, l.code);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}
{
  const { t, tl } = makeLookup('en');
  writeFileSync(join(out, '404.html'), renderNotFound({ t, tl, assetHash, version }));
}

writeFileSync(join(out, 'assets/site.css'), css);
writeFileSync(join(out, 'assets/app.js'), js);
if (qrSource) writeFileSync(join(out, 'assets/qrcode.js'), `${qrSource}\nwindow.qrcode=qrcode;\n`);
else warn('src/vendor/qrcode.js is missing – the share QR code is disabled');
for (const [from, to] of [['src/fonts', 'assets/fonts'], ['src/img', 'assets/img']]) {
  if (existsSync(join(here, from))) cpSync(join(here, from), join(out, to), { recursive: true });
}
if (existsSync(join(here, 'public'))) cpSync(join(here, 'public'), out, { recursive: true });

writeFileSync(join(out, '.nojekyll'), '');
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);
writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGUAGES.map((l) => `  <url>
    <loc>${pageUrl(l.code)}</loc>
${LANGUAGES.map((o) => `    <xhtml:link rel="alternate" hreflang="${o.html}" href="${pageUrl(o.code)}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}"/>
  </url>`).join('\n')}
</urlset>
`);
writeFileSync(join(out, 'manifest.webmanifest'), JSON.stringify({
  name: 'Avorythm', short_name: 'Avorythm', description: en.meta.description, start_url: './', scope: './', display: 'browser',
  background_color: '#060913', theme_color: '#060913',
  icons: [{ src: 'assets/img/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'assets/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
}, null, 2));

/* ------------------------------------------------------------ link checking */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file, acc); else acc.push(file);
  }
  return acc;
}
let broken = 0;
for (const file of walk(out).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/(?:href|src|poster)="([^"#?][^"]*)"/g)) {
    const ref = m[1].split('#')[0].split('?')[0];
    if (!ref || /^(https?:|mailto:|data:|tel:|javascript:)/i.test(ref)) continue;
    if (ref === './' || ref === '../') continue;
    const target = resolve(dirname(file), ref);
    const exists = existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
    if (!exists) { broken += 1; warn(`${relative(out, file)} → missing ${ref}`); }
  }
}

const size = walk(out).reduce((n, f) => n + statSync(f).size, 0);
console.log(`built ${LANGUAGES.length} pages → ${out}  (${(size / 1e6).toFixed(1)} MB, css ${css.length >> 10} KB, js ${js.length >> 10} KB, ${warnings.length} warnings)`);
if (strict && warnings.length) { console.error(`strict mode: ${warnings.length} warning(s)`); process.exit(1); }
