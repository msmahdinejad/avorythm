#!/usr/bin/env node
// Avorythm product demo: frame renderer (adapted copy of video/tools/render.mjs; writes only to build/demo and out/demo-*).
// Serves video/ over HTTP (+ the repository under /repo/), drives headless Chrome over the raw DevTools protocol and
// pipes frames of window.renderFrame(t) into ffmpeg.
//
//   node video/films/demo/tools/render.mjs --lang en --stills 2,9.5          full-res frames -> build/demo/en/stills/
//   node video/films/demo/tools/render.mjs --lang en --sheet 1,2,3 --cols 4   labelled contact sheet -> build/demo/en/sheet-<name>.png
//   node video/films/demo/tools/render.mjs --lang en --video                  picture only -> build/demo/en/picture.mp4
//   node video/films/demo/tools/render.mjs --lang en --mux                    picture + mix.wav -> out/demo-en-1080.mp4, demo-en.mp4, demo-en.jpg
//
// Options: --workers N (max 8, shared machine)  --format png|jpeg  --segment SECONDS  --fresh  --name NAME (sheet file name)
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..'); // video/
const repo = resolve(root, '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };

const lang = opt('lang', 'en');
const W = 1920, H = 1080;
const FORMAT = opt('format', 'jpeg');
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p));
const buildDir = join(root, 'build', 'demo', lang);
const outDir = join(root, 'out');
mkdirSync(buildDir, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const isRepo = pathname.startsWith('/repo/');
  const base = isRepo ? repo : root;
  const file = normalize(join(base, isRepo ? pathname.slice(6) : pathname));
  if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const procs = new Set();
process.on('exit', () => procs.forEach((p) => { try { p.kill(); } catch { /* gone */ } }));

async function launchWorker(n) {
  const profile = mkdtempSync(join(tmpdir(), `avo-demo-${n}-`));
  const flags = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--force-color-profile=srgb',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--font-render-hinting=none', `--window-size=${W},${H}`, '--disable-gpu'];
  const chrome = spawn(CHROME, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  procs.add(chrome);
  const wsUrl = await new Promise((ok, fail) => {
    let buf = '';
    chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); });
    chrome.on('exit', () => fail(new Error('chrome exited early')));
    setTimeout(() => fail(new Error('chrome did not start')), 30000);
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
    else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  };
  const cdp = (method, params = {}) => new Promise((ok, fail) => {
    const id = ++seq;
    waiting.set(id, { res: ok, rej: fail });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => waiting.delete(id) && fail(new Error(`CDP ${method} timed out`)), 120000);
  });
  const js = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: `${base}/films/demo/${opt('page', 'index.html')}?lang=${lang}&render=1` });
  for (let i = 0; ; i++) {
    const state = await js('window.__err ? "ERR:" + window.__err : (window.__ready === true ? "ok" : "")').catch(() => '');
    if (state === 'ok') break;
    if (state.startsWith('ERR:')) throw new Error(`page failed: ${state.slice(4)}`);
    if (i > 1200) throw new Error(`page not ready after 120 s ${errors.join(' | ')}`);
    await sleep(100);
  }
  const prof = { frame: 0, capture: 0, n: 0 };
  const shot = async (t, fmt = FORMAT) => {
    const a = performance.now();
    await js(`window.renderFrame(${t})`);
    const b = performance.now();
    const params = fmt === 'jpeg' ? { format: 'jpeg', quality: 95 } : { format: 'png', optimizeForSpeed: fmt !== 'png-best' };
    const data = Buffer.from((await cdp('Page.captureScreenshot', params)).data, 'base64');
    prof.frame += b - a; prof.capture += performance.now() - b; prof.n += 1;
    return data;
  };
  const close = async () => { try { ws.close(); chrome.kill(); } catch { /* ignore */ } procs.delete(chrome); await sleep(200); try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* ignore */ } };
  return { shot, js, errors, close, prof };
}

const run = (cmd, a) => new Promise((ok, fail) => {
  const p = spawn(cmd, a, { stdio: 'inherit' });
  p.on('close', (c) => (c ? fail(new Error(`${cmd} exited ${c}`)) : ok()));
});

// ------------------------------------------------------------------ stills / contact sheet
const stillList = opt('stills') || opt('sheet') || '';
const stillTimes = stillList.split(',').filter(Boolean).map(Number);
if (stillTimes.length) {
  const w = await launchWorker(0);
  const dir = join(buildDir, 'stills');
  mkdirSync(dir, { recursive: true });
  const files = [];
  const t0 = Date.now();
  for (const t of stillTimes) {
    const file = join(dir, `t${t.toFixed(3).padStart(7, '0')}.png`);
    writeFileSync(file, await w.shot(t, 'png'));
    files.push([t, file]);
    if (opt('eval')) console.log(`t=${t}:`, JSON.stringify(await w.js(opt('eval'))));
  }
  console.log(`${files.length} frames, ${((Date.now() - t0) / files.length).toFixed(0)} ms/frame (renderFrame ${(w.prof.frame / w.prof.n).toFixed(0)} ms, capture ${(w.prof.capture / w.prof.n).toFixed(0)} ms)${w.errors.length ? '\npage errors:\n  ' + [...new Set(w.errors)].join('\n  ') : ''}`);
  if (opt('sheet')) {
    const cols = Number(opt('cols', 4));
    const tw = Number(opt('tw', 640));
    const list = join(dir, 'list.txt');
    writeFileSync(list, files.map(([, f]) => `file '${f.replaceAll('\\', '/')}'\nduration 1`).join('\n'));
    const name = opt('name', 'sheet');
    const labelled = join(dir, 'labelled');
    mkdirSync(labelled, { recursive: true });
    const lab = [];
    for (const [t, f] of files) {
      const o = join(labelled, `${t.toFixed(3)}.png`);
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-vf', `scale=${tw}:-1,drawtext=text='${t.toFixed(2)}':x=8:y=8:fontsize=${Math.round(tw / 26)}:fontcolor=yellow:box=1:boxcolor=black@0.6`, o]);
      lab.push(o);
    }
    writeFileSync(list, lab.map((f) => `file '${f.replaceAll('\\', '/')}'\nduration 1`).join('\n'));
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', `tile=${cols}x${Math.ceil(lab.length / cols)}:padding=6:color=0x333333`, '-frames:v', '1', join(buildDir, `${name}.png`)]);
    console.log('sheet ->', join(buildDir, `${name}.png`));
  }
  await w.close();
  server.close();
  process.exit(0);
}

// ------------------------------------------------------------------ full picture
const meta = await (async () => {
  const w = await launchWorker(99);
  const m = await w.js('JSON.stringify(window.__film)');
  await w.close();
  return JSON.parse(m);
})();
const FPS = meta.fps;
const DUR = meta.duration;
const total = Math.round(Number(opt('until', DUR)) * FPS);

if (flag('video')) {
  const workers = Math.min(8, Number(opt('workers', 8)));
  const segFrames = Math.round(Number(opt('segment', 2)) * FPS);
  const segDir = join(buildDir, 'seg');
  mkdirSync(segDir, { recursive: true });
  if (flag('fresh')) for (const f of readdirSync(segDir)) rmSync(join(segDir, f), { force: true });
  const nSeg = Math.ceil(total / segFrames);
  const only = opt('segs') ? new Set(opt('segs').split(',').map(Number)) : null;
  if (only) for (const s of only) { rmSync(join(segDir, `${String(s).padStart(4, '0')}.done`), { force: true }); }
  const queue = [...Array(nSeg).keys()].filter((s) => !existsSync(join(segDir, `${String(s).padStart(4, '0')}.done`)));
  console.log(`demo/${lang}: ${total} frames @ ${FPS} fps, ${nSeg} segments (${nSeg - queue.length} cached), ${workers} workers`);
  const t0 = Date.now();
  let done = nSeg - queue.length;
  const errs = [];
  await Promise.all([...Array(Math.min(workers, queue.length || 1))].map(async (_, n) => {
    const w = await launchWorker(n + 1);
    while (queue.length) {
      const s = queue.shift();
      const name = join(segDir, `${String(s).padStart(4, '0')}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', FORMAT === 'jpeg' ? 'mjpeg' : 'png', '-i', '-',
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-g', String(FPS), '-bf', '2',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-threads', '3', name], { stdio: ['pipe', 'inherit', 'inherit'] });
      const finished = new Promise((ok, fail) => ff.on('close', (c) => (c ? fail(new Error(`ffmpeg exited ${c}`)) : ok())));
      for (let f = s * segFrames; f < Math.min(total, (s + 1) * segFrames); f++) {
        const img = await w.shot(f / FPS);
        if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      await finished;
      writeFileSync(join(segDir, `${String(s).padStart(4, '0')}.done`), '');
      done += 1;
      process.stdout.write(`\r  ${done}/${nSeg} segments  ${((Date.now() - t0) / 1000).toFixed(0)} s   `);
    }
    if (w.errors.length) errs.push(...w.errors);
    await w.close();
  }));
  if (errs.length) console.warn('\npage errors:\n  ' + [...new Set(errs)].slice(0, 8).join('\n  '));
  writeFileSync(join(segDir, 'list.txt'), [...Array(nSeg).keys()].map((s) => `file '${String(s).padStart(4, '0')}.mp4'`).join('\n'));
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(segDir, 'list.txt'), '-c', 'copy', join(buildDir, 'picture.mp4')]);
  console.log(`\npicture.mp4 written in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

// ------------------------------------------------------------------ mux, web version, poster
if (flag('mux')) {
  mkdirSync(outDir, { recursive: true });
  const picture = join(buildDir, 'picture.mp4');
  const audio = join(buildDir, 'mix.wav');
  if (!existsSync(picture) || !existsSync(audio)) throw new Error('need build/demo/<lang>/picture.mp4 and mix.wav');
  const master = join(outDir, `demo-${lang}-1080.mp4`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', picture, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', '-metadata', `title=Avorythm — product demo (${lang})`, '-shortest', master]);
  const web = join(outDir, `demo-${lang}.mp4`);
  const crf = opt('crf', '25');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, '-vf', 'fps=30,scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slower', '-crf', crf, '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', web]);
  const posterAt = opt('poster', String(meta.poster));
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', posterAt, '-i', master, '-frames:v', '1', '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '2', join(outDir, `demo-${lang}.jpg`)]);
  console.log(`web ${(statSync(web).size / 1e6).toFixed(2)} MB   master ${(statSync(master).size / 1e6).toFixed(1)} MB   poster @ ${posterAt}s`);
}
server.close();
process.exit(0);
