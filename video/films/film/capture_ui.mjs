#!/usr/bin/env node
// Renders the REAL product UI (extension popup, desktop app) with headless Chrome for the brand film, one image per film
// language, plus the rectangles of the elements the camera pushes into.
//   node video/films/film/capture_ui.mjs --lang en,fa
// Output: video/build/film/ui/popup-<lang>.png|json, app-<lang>.png|json
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const video = resolve(here, '..', '..');
const repo = resolve(video, '..');
const out = join(video, 'build', 'film', 'ui');
mkdirSync(out, { recursive: true });
const args = process.argv.slice(2);
const opt = (n, f) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : f; };
const LANGS = opt('lang', 'en,fa').split(',');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

function serve(root) {
  const s = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = normalize(join(root, p));
    if (!f.startsWith(root) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  }).listen(0, '127.0.0.1');
  return new Promise((ok) => s.once('listening', () => ok({ s, url: `http://127.0.0.1:${s.address().port}` })));
}

async function browser() {
  const profile = mkdtempSync(join(tmpdir(), 'avo-film-ui-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--force-color-profile=srgb', '--no-first-run', '--disable-gpu', '--font-render-hinting=none', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((res, rej) => { let b = ''; chrome.stderr.on('data', (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); setTimeout(() => rej(new Error('no chrome')), 30000); });
  const port = new URL(wsUrl).port;
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((p) => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let seq = 0; const wait = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); } };
  const cdp = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; wait.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const js = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const close = () => { try { ws.close(); chrome.kill(); } catch { /* */ } setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* */ } }, 400); };
  await cdp('Runtime.enable'); await cdp('Page.enable');
  return { cdp, js, close };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGET = { en: 'en', fa: 'fa', ar: 'ar', zh: 'zh-Hans', de: 'de', fr: 'fr', es: 'es', ru: 'ru', ja: 'ja', tr: 'tr', pt: 'pt-BR', hi: 'hi' };
const UI = (l) => (l === 'fa' ? 'fa' : l === 'zh' ? 'zh-Hans' : 'en');

const repoSrv = await serve(repo);
const appSrv = await serve(join(repo, 'src', 'avorythm', 'static'));
const ui = JSON.parse(readFileSync(join(video, 'src', 'data', 'ui.json'), 'utf8'));
const appJs = readFileSync(join(repo, 'src', 'avorythm', 'static', 'app.js'), 'utf8').split('\n');
const msgSrc = appJs.slice(appJs.findIndex((l) => l.startsWith('const messages = {')), appJs.findIndex((l) => l.startsWith('function t(key)'))).join('\n');

const b = await browser();
for (const lang of LANGS) {
  const loc = UI(lang);
  // ------------------------------------------------------------ popup
  await b.cdp('Emulation.setScriptExecutionDisabled', { value: true });
  await b.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 3, mobile: false });
  await b.cdp('Page.navigate', { url: `${repoSrv.url}/extension/popup.html` });
  await sleep(900);
  const dict = ui.popup[loc] || ui.popup.en;
  const popupRects = await b.js(`(async () => {
    const dict = ${JSON.stringify(dict)}, loc = ${JSON.stringify(loc)}, code = ${JSON.stringify(TARGET[lang])};
    document.documentElement.lang = loc; document.documentElement.dir = loc === 'fa' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((n) => { const v = dict[n.dataset.i18n]; if (typeof v === 'string') n.textContent = v; });
    document.querySelector('#localeToggle').value = loc;
    const names = new Intl.DisplayNames([loc], { type: 'language' });
    const sel = document.querySelector('#targetLanguage');
    const o = document.createElement('option'); o.value = code; o.textContent = (names.of(code) || code) + ' · ' + code; o.selected = true; sel.replaceChildren(o);
    {   // the camera pushes into this field: a long name ("Brazilian Portuguese · pt-BR") must not be cut by the 225 px select
      await document.fonts.ready;
      const cs = getComputedStyle(sel), cv = document.createElement('canvas').getContext('2d'), fs = parseFloat(cs.fontSize);
      cv.font = cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
      const need = cv.measureText(o.textContent).width, avail = sel.getBoundingClientRect().width - 20 - 24;
      if (need > avail) sel.style.fontSize = Math.max(11, Math.floor(fs * avail / need * 10) / 10) + 'px';
    }
    document.querySelector('#languageBadge').textContent = 'AUTO → ' + code.split('-')[0].toUpperCase();
    document.querySelector('#setupNotice').hidden = true;
    document.querySelector('input[value="low-latency"]').checked = true;
    document.querySelector('#actionHint').textContent = dict.startHint;
    const btn = document.querySelector('#toggleButton'); btn.disabled = false;
    document.querySelector('#outputCount').textContent = dict.selectedCount;
    document.querySelector('#outputChips').replaceChildren(...['originalAudio', 'dubbedAudio', 'sourceSubtitles', 'translatedSubtitles'].map((k) => Object.assign(document.createElement('span'), { className: 'output-chip', textContent: dict[k] })));
    document.querySelector('#statusDot').className = 'status-dot';
    document.body.style.minHeight = '0';
    await document.fonts.ready;
    const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    return { body: { w: 390, h: Math.ceil(document.querySelector('footer').getBoundingClientRect().bottom + 4) }, field: r('.language-field'), select: r('#targetLanguage'), button: r('#toggleButton'), card: r('.launch-card'), status: r('.status-line'), label: names.of(code) };
  })()`);
  await sleep(300);
  const pshot = await b.cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 390, height: popupRects.body.h, scale: 1 }, captureBeyondViewport: true });
  writeFileSync(join(out, `popup-${lang}.png`), Buffer.from(pshot.data, 'base64'));
  writeFileSync(join(out, `popup-${lang}.json`), JSON.stringify({ scale: 3, ...popupRects }, null, 1));
  // ------------------------------------------------------------ desktop app
  await b.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false });
  await b.cdp('Page.navigate', { url: `${appSrv.url}/index.html` });
  await sleep(1200);
  const appRects = await b.js(`(async () => {
    ${msgSrc}
    const locale = ${JSON.stringify(loc)}, code = ${JSON.stringify(TARGET[lang])};
    const t = (k) => (messages[locale] && messages[locale][k]) || messages.en[k] || k;
    document.documentElement.lang = locale; document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    document.querySelector('#localeToggle').value = locale;
    document.querySelector('#targetCode').textContent = code.split('-')[0].toUpperCase();
    document.querySelector('#sourceCode').textContent = 'AUTO';
    document.querySelector('#runtimeStatus').textContent = t('connected');
    document.querySelector('#detectedLanguage').textContent = new Intl.DisplayNames([locale], { type: 'language' }).of(${JSON.stringify(lang === 'fr' ? 'ru' : 'fr')});
    document.querySelector('#startButton span[data-i18n]').textContent = t('stop');
    document.querySelector('#sourceText').textContent = '';
    document.querySelector('#translatedText').textContent = '';
    const names = new Intl.DisplayNames([locale], { type: 'language' });
    const sel = document.querySelector('#targetLanguage');
    const o = document.createElement('option'); o.textContent = (names.of(code) || code) + ' · ' + code; o.selected = true; sel.replaceChildren(o);
    await document.fonts.ready;
    const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    return { view: { w: 1440, h: 1000 }, source: r('#sourceText'), translated: r('#translatedText'), start: r('#startButton'), title: r('.hero h1'), detected: r('#detectedLanguage'), status: r('#runtimeStatus'), dir: document.documentElement.dir };
  })()`);
  await sleep(300);
  const ashot = await b.cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: 1000, scale: 1 } });
  writeFileSync(join(out, `app-${lang}.png`), Buffer.from(ashot.data, 'base64'));
  writeFileSync(join(out, `app-${lang}.json`), JSON.stringify({ scale: 2, ...appRects }, null, 1));
  console.log(lang, 'popup', popupRects.body, 'label', popupRects.label, '| app ok');
}
b.close(); repoSrv.s.close(); appSrv.s.close();
setTimeout(() => process.exit(0), 600);
