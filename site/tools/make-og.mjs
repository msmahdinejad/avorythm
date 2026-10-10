#!/usr/bin/env node
// Social preview images (1200x630) for every site language: node site/tools/make-og.mjs
// Renders an HTML card per language with headless Chrome and writes site/public/assets/og/og-<lang>.jpg.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LANGUAGES } from '../src/languages.mjs';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(site, 'public', 'assets', 'og');
mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome or Edge not found (set CHROME)');
const url = (p) => pathToFileURL(join(site, 'src', p)).href;
const en = JSON.parse(readFileSync(join(site, 'src/i18n/en.json'), 'utf8'));
const only = process.argv.slice(2);

const fonts = `
@font-face{font-family:"Inter Variable";font-weight:100 900;src:url("${url('fonts/inter-latin-wght-normal.woff2')}") format("woff2-variations");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Inter Variable";font-weight:100 900;src:url("${url('fonts/inter-latin-ext-wght-normal.woff2')}") format("woff2-variations");unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"Inter Variable";font-weight:100 900;src:url("${url('fonts/inter-cyrillic-wght-normal.woff2')}") format("woff2-variations");unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"Inter Variable";font-weight:100 900;src:url("${url('fonts/inter-cyrillic-ext-wght-normal.woff2')}") format("woff2-variations");unicode-range:U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F}
@font-face{font-family:"Vazirmatn Variable";font-weight:100 900;src:url("${url('fonts/vazirmatn-arabic-wght-normal.woff2')}") format("woff2-variations");unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}
@font-face{font-family:"Noto Sans Devanagari Variable";font-weight:100 900;src:url("${url('fonts/noto-sans-devanagari-devanagari-wght-normal.woff2')}") format("woff2-variations");unicode-range:U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF}`;

const STACK = {
  fa: '"Inter Variable","Vazirmatn Variable",Tahoma,sans-serif', ar: '"Inter Variable","Vazirmatn Variable",Tahoma,sans-serif',
  hi: '"Inter Variable","Noto Sans Devanagari Variable","Nirmala UI",sans-serif',
  zh: '"Inter Variable","Microsoft YaHei UI","Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif',
  ja: '"Inter Variable","Yu Gothic UI","Yu Gothic","Hiragino Sans",Meiryo,"Noto Sans CJK JP",sans-serif',
};
const stack = (code) => STACK[code] || '"Inter Variable","Segoe UI",system-ui,sans-serif';
const strip = (s) => s.replace(/<(?!\/?em\b)[^>]+>/g, '');

function card(l) {
  const dict = l.code === 'en' ? en : JSON.parse(readFileSync(join(site, `src/i18n/${l.code}.json`), 'utf8'));
  const g = (path) => path.split('.').reduce((o, k) => o?.[k], dict) ?? path.split('.').reduce((o, k) => o?.[k], en);
  const title = strip(g('hero.title'));
  const plain = title.replace(/<[^>]+>/g, '');
  const len = [...plain].length;
  const cjk = ['zh', 'ja'].includes(l.code);
  const size = cjk ? (len > 22 ? 60 : 72) : len > 44 ? 54 : len > 34 ? 60 : len > 26 ? 66 : 74;
  const shot = { fa: 'fa', zh: 'zh-CN' }[l.code] || 'en';
  const rtl = l.dir === 'rtl';
  const badge = g('hero.badge');
  const langs = g('hero.trustLangs');
  return `<!doctype html><html lang="${l.html}" dir="${l.dir}"><meta charset="utf-8"><style>${fonts}
*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#060913}
body{position:relative;font-family:${stack(l.code)};color:#f2f5ff;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:radial-gradient(900px 520px at 12% -10%,rgba(124,104,255,.5),transparent 60%),radial-gradient(760px 480px at 100% 110%,rgba(46,214,206,.38),transparent 60%),linear-gradient(180deg,#070a1c,#050818)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse at 40% 40%,#000,transparent 75%)}
.wrap{position:absolute;inset:0;display:flex;align-items:center;padding:0 72px;gap:40px}
.left{flex:1;display:flex;flex-direction:column;gap:30px;align-items:flex-start;text-align:start}
.brand{display:flex;align-items:center;gap:16px;font:800 34px/1 "Inter Variable",sans-serif;letter-spacing:-.02em}
.brand img{width:64px;height:64px;border-radius:16px}
h1{margin:0;font-size:${size}px;line-height:${cjk ? 1.22 : rtl ? 1.3 : 1.06};font-weight:${rtl ? 800 : 820};letter-spacing:${rtl || cjk || l.code === 'hi' ? '0' : '-.03em'};max-width:640px}
h1 em{font-style:normal;background:linear-gradient(100deg,#b9adff,#5ef0ea);-webkit-background-clip:text;background-clip:text;color:transparent}
.chips{display:flex;gap:12px;flex-wrap:wrap}
.chip{padding:10px 20px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);font-weight:650;font-size:23px;color:#dfe5ff}
.chip.g{background:linear-gradient(135deg,rgba(143,124,255,.5),rgba(84,223,218,.32));border-color:rgba(255,255,255,.3)}
.url{position:absolute;bottom:34px;${rtl ? 'right' : 'left'}:72px;font:600 22px "Cascadia Mono",Consolas,monospace;color:#7fe3de;direction:ltr;letter-spacing:.01em}
.right{position:relative;width:360px;height:560px;flex:none}
.right svg{position:absolute;left:-210px;top:150px;width:700px;height:260px;opacity:.9}
.shot{position:absolute;left:34px;top:46px;width:300px;border-radius:22px;border:1px solid rgba(255,255,255,.18);box-shadow:0 40px 90px -20px rgba(0,0,0,.8),0 0 70px rgba(124,104,255,.35);transform:rotate(${rtl ? 5 : -5}deg)}
</style><body><div class="bg"></div><div class="grid"></div>
<div class="wrap"><div class="left"><div class="brand"><img src="${url('img/logo-256.webp')}" alt=""><span>Avorythm</span></div>
<h1>${title}</h1><div class="chips"><span class="chip g">${badge}</span><span class="chip">${langs}</span></div></div>
<div class="right"><svg viewBox="0 0 700 260" fill="none"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#8f7cff"/><stop offset="1" stop-color="#54dfda"/></linearGradient></defs>
${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M0 130 C 90 ${40 + k * 8}, 150 ${220 - k * 9}, 240 130 S 400 ${30 + k * 10}, 470 130 S 610 ${210 - k * 8}, 700 130" stroke="url(#g)" stroke-width="${1.4 + (k % 3)}" opacity="${0.8 - k * 0.1}"/>`).join('')}</svg>
<img class="shot" src="${url(`img/shot-popup-${shot}.webp`)}" alt=""></div></div>
<div class="url">msmahdinejad.github.io/avorythm</div></body></html>`;
}

const tmp = mkdtempSync(join(tmpdir(), 'avo-og-'));
let made = 0;
for (const l of LANGUAGES) {
  if (only.length && !only.includes(l.code)) continue;
  const html = join(tmp, `${l.code}.html`);
  const png = join(tmp, `${l.code}.png`);
  writeFileSync(html, card(l));
  const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=4000', `--screenshot=${png}`, pathToFileURL(html).href], { stdio: 'ignore' });
  if (r.status !== 0 || !existsSync(png)) { console.error(`${l.code}: Chrome failed`); continue; }
  const j = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', join(out, `og-${l.code}.jpg`)]);
  if (j.status !== 0) { console.error(`${l.code}: ffmpeg failed`); continue; }
  made += 1;
}
rmSync(tmp, { recursive: true, force: true });
console.log(`${made} social images -> ${out}`);
