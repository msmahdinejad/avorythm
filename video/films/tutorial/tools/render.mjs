#!/usr/bin/env node
// Frame renderer: serves video/ over HTTP, drives headless Chrome (raw DevTools protocol, no npm deps) and
// pipes PNG frames of renderFrame(t) into ffmpeg.
//
// (copied from video/tools/render.mjs and adapted to the tutorial: page films/tutorial/page/film.html, build dir build/tutorial2/<lang>)
//   node video/films/tutorial/tools/render.mjs --lang en --stills 2,9.5,12      single frames  -> build/tutorial2/en/stills/
//   node video/films/tutorial/tools/render.mjs --lang en --sheet 1,3,5,7,9       contact sheet  -> build/tutorial2/en/sheet.png
//   node video/films/tutorial/tools/render.mjs --lang en --video --workers 8     picture only   -> build/tutorial2/en/picture.mp4
//
// Options: --workers N  --fps N  --width W --height H  --format png|jpeg  --gpu  --segment SECONDS
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');  // video/
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };

const film = 'tutorial';
const page = opt('page', 'film');
const lang = opt('lang', 'en');
const W = Number(opt('width', 1920));
const H = Number(opt('height', 1080));
const FORMAT = opt('format', 'png');
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));
const buildDir = join(root, 'build', 'tutorial2', lang);
const outDir = join(root, 'out');
mkdirSync(buildDir, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
// The film pages may also read the site's screenshots and brand art, so serve the repository root too.
const repo = resolve(root, '..');
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const base = pathname.startsWith('/repo/') ? repo : root;
  const rel = pathname.startsWith('/repo/') ? pathname.slice(6) : pathname;
  const file = normalize(join(base, rel));
  if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const procs = new Set();
process.on('exit', () => procs.forEach((p) => { try { p.kill(); } catch { /* already gone */ } }));

async function launchWorker(n) {
  const profile = mkdtempSync(join(tmpdir(), `avo-film-${n}-`));
  const flags = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--force-color-profile=srgb',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--font-render-hinting=none', `--window-size=${W},${H}`];
  if (flag('gpu')) flags.push('--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-zero-copy'); else flags.push('--disable-gpu');
  const chrome = spawn(CHROME, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  procs.add(chrome);
  const wsUrl = await new Promise((res, rej) => {
    let buf = '';
    chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); });
    chrome.on('exit', () => rej(new Error('chrome exited early')));
    setTimeout(() => rej(new Error('chrome did not start')), 30000);
  });
  const port = new URL(wsUrl).port;
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let seq = 0;
  const waiting = new Map();
  const errors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { const w = waiting.get(m.id); waiting.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  };
  const cdp = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq;
    waiting.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => waiting.delete(id) && rej(new Error(`CDP ${method} timed out`)), 60000);
  });
  const js = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: `${base}/films/tutorial/page/${page}.html?lang=${lang}&render=1` });
  for (let i = 0; ; i++) {
    const state = await js('window.__err ? "ERR:" + window.__err : (window.__ready === true ? "ok" : "")').catch(() => '');
    if (state === 'ok') break;
    if (state.startsWith('ERR:')) throw new Error(`page failed: ${state.slice(4)}`);
    if (i > 900) throw new Error(`page not ready after 90 s ${errors.join(' | ')}`);
    await sleep(100);
  }
  const prof = { frame: 0, capture: 0, n: 0 };
  const shot = async (t) => {
    const a = performance.now();
    await js(`window.renderFrame(${t})`);
    const b = performance.now();
    const params = FORMAT === 'jpeg' ? { format: 'jpeg', quality: 96 } : { format: 'png', optimizeForSpeed: true };
    const data = Buffer.from((await cdp('Page.captureScreenshot', params)).data, 'base64');
    prof.frame += b - a; prof.capture += performance.now() - b; prof.n += 1;
    return data;
  };
  const close = async () => { try { ws.close(); chrome.kill(); } catch { /* ignore */ } procs.delete(chrome); await sleep(200); try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* ignore */ } };
  return { shot, js, errors, close, prof };
}

const run = (cmd, a, opts = {}) => new Promise((ok, fail) => {
  const p = spawn(cmd, a, { stdio: opts.quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit' });
  p.on('close', (c) => (c ? fail(new Error(`${cmd} exited ${c}`)) : ok()));
});

// ------------------------------------------------------------------ stills / contact sheet
const stillTimes = (opt('stills') || opt('sheet') || '').split(',').filter(Boolean).map(Number);
if (stillTimes.length) {
  const w = await launchWorker(0);
  if (opt('css')) await w.js(`document.head.insertAdjacentHTML('beforeend', ${JSON.stringify('<style>' + opt('css') + '</style>')})`);
  const dir = join(buildDir, 'stills');
  mkdirSync(dir, { recursive: true });
  const files = [];
  const t0 = Date.now();
  for (const t of stillTimes) {
    const file = join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
    writeFileSync(file, await w.shot(t));
    files.push(file);
  }
  console.log(`${files.length} frames, ${((Date.now() - t0) / files.length).toFixed(0)} ms/frame (renderFrame ${(w.prof.frame / w.prof.n).toFixed(0)} ms, capture ${(w.prof.capture / w.prof.n).toFixed(0)} ms)${w.errors.length ? '\npage errors:\n  ' + [...new Set(w.errors)].join('\n  ') : ''}`);
  if (opt('eval')) console.log('EVAL:', await w.js(opt('eval')));
  if (opt('sheet')) {
    const cols = Number(opt('cols', 4));
    const list = join(dir, 'list.txt');
    writeFileSync(list, files.map((f) => `file '${f.replaceAll('\\', '/')}'\nduration 1`).join('\n'));
    const sw = Number(opt('sw', 640));
    const sheetName = opt('name', 'sheet') + '.png';
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', `scale=${sw}:-1,tile=${cols}x${Math.ceil(files.length / cols)}:padding=6:color=0x222222`, '-frames:v', '1', join(buildDir, sheetName)]);
    console.log('sheet ->', join(buildDir, sheetName));
  }
  await w.close();
  server.close();
  process.exit(0);
}

// ------------------------------------------------------------------ full picture
const meta = await (async () => {
  const w = await launchWorker(99);
  const m = await w.js('JSON.stringify({ duration: window.__film.duration, fps: window.__film.fps })');
  await w.close();
  return JSON.parse(m);
})();
const FPS = Number(opt('fps', meta.fps));
const DUR = meta.duration;
const total = Math.round(Number(opt('until', DUR)) * FPS);

if (flag('video')) {
  const workers = Number(opt('workers', Math.max(2, Math.min(12, cpus().length >> 1))));
  const segFrames = Math.round(Number(opt('segment', 2)) * FPS);
  const segDir = join(buildDir, 'seg');
  mkdirSync(segDir, { recursive: true });
  if (flag('fresh')) for (const f of readdirSync(segDir)) rmSync(join(segDir, f), { force: true });
  const nSeg = Math.ceil(total / segFrames);
  const queue = [...Array(nSeg).keys()].filter((s) => !existsSync(join(segDir, `${String(s).padStart(4, '0')}.done`)));
  console.log(`${film}/${lang}: ${total} frames @ ${FPS} fps, ${nSeg} segments (${nSeg - queue.length} cached), ${workers} workers`);
  const t0 = Date.now();
  let done = nSeg - queue.length;
  await Promise.all([...Array(Math.min(workers, queue.length || 1))].map(async (_, n) => {
    const w = await launchWorker(n + 1);
    while (queue.length) {
      const s = queue.shift();
      const name = join(segDir, `${String(s).padStart(4, '0')}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', FORMAT === 'jpeg' ? 'mjpeg' : 'png', '-i', '-',
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-profile:v', 'high', '-g', String(FPS * 2), '-bf', '2',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-threads', '2', name], { stdio: ['pipe', 'inherit', 'inherit'] });
      const finished = new Promise((ok, fail) => ff.on('close', (c) => (c ? fail(new Error(`ffmpeg exited ${c}`)) : ok())));
      for (let f = s * segFrames; f < Math.min(total, (s + 1) * segFrames); f++) {
        const png = await w.shot(f / FPS);
        if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      await finished;
      writeFileSync(join(segDir, `${String(s).padStart(4, '0')}.done`), '');
      done += 1;
      const elapsed = (Date.now() - t0) / 1000;
      process.stdout.write(`\r  ${done}/${nSeg} segments  ${elapsed.toFixed(0)} s  ${(done - (nSeg - queue.length - (nSeg - queue.length - done))) ? '' : ''}`);
    }
    if (w.errors.length) console.warn(`\nworker ${n} page errors:\n  ` + [...new Set(w.errors)].slice(0, 6).join('\n  '));
    await w.close();
  }));
  writeFileSync(join(segDir, 'list.txt'), [...Array(nSeg).keys()].map((s) => `file '${String(s).padStart(4, '0')}.mp4'`).join('\n'));
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(segDir, 'list.txt'), '-c', 'copy', join(buildDir, 'picture.mp4')]);
  console.log(`\npicture.mp4 written in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

// ------------------------------------------------------------------ mux, web version, poster
if (flag('mux')) {
  mkdirSync(outDir, { recursive: true });
  const picture = join(buildDir, 'picture.mp4');
  const audio = join(buildDir, 'mix.wav');
  if (!existsSync(picture) || !existsSync(audio)) throw new Error('need build/<film>/<lang>/picture.mp4 and mix.wav');
  const master = join(outDir, `${film}-${lang}-1080.mp4`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', picture, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '224k', '-movflags', '+faststart', '-shortest', master]);
  // Web version: 1280x720, 30 fps, small enough to live in the repository / on Pages.
  const web = join(outDir, `${film}-${lang}.mp4`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, '-vf', 'fps=30,scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opt('crf', 26)), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '112k', '-ac', '2', '-movflags', '+faststart', web]);
  const posterAt = opt('poster', String(Math.min(DUR - 0.5, Number(meta.poster ?? DUR * 0.55))));
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', posterAt, '-i', master, '-frames:v', '1', '-vf', 'scale=1280:720', '-q:v', '3', join(outDir, `${film}-${lang}.jpg`)]);
  console.log(`web  ${(statSync(web).size / 1e6).toFixed(1)} MB   master ${(statSync(master).size / 1e6).toFixed(1)} MB`);
}
server.close();
process.exit(0);
