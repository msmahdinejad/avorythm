#!/usr/bin/env node
// Brand-film renderer (adapted from video/tools/render.mjs): serves video/ over HTTP, drives headless Chrome over the raw
// DevTools protocol and pipes PNG frames of renderFrame(t) into ffmpeg.
//
//   node video/films/film/render.mjs --lang en --stills 2,9.5,12            -> build/film/en/stills/
//   node video/films/film/render.mjs --lang en --sheet 0:10:0.5 --cols 5    -> build/film/en/sheet-<tag>.png (labelled)
//   node video/films/film/render.mjs --lang en --video [--workers 8]        -> build/film/en/picture.mp4 (segment cache)
//   node video/films/film/render.mjs --lang en --mux                        -> out/film-en-1080.mp4, out/film-en.mp4, out/film-en.jpg
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');                         // video/
const repo = resolve(root, '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, f) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : f; };
const lang = opt('lang', 'en');
const W = 1920, H = 1080;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const buildDir = join(root, 'build', 'film', lang);
const outDir = join(root, 'out');
mkdirSync(buildDir, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const base = p.startsWith('/repo/') ? repo : root;
  const rel = p.startsWith('/repo/') ? p.slice(6) : p;
  const f = normalize(join(base, rel));
  if (!f.startsWith(base) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const procs = new Set();
process.on('exit', () => procs.forEach((p) => { try { p.kill(); } catch { /* gone */ } }));

async function launch(n) {
  const profile = mkdtempSync(join(tmpdir(), `avo-brand-${n}-`));
  const flags = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--force-color-profile=srgb',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--font-render-hinting=none', `--window-size=${W},${H}`];
  if (flag('gpu')) flags.push('--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'); else flags.push('--disable-gpu');
  const chrome = spawn(CHROME, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  procs.add(chrome);
  const wsUrl = await new Promise((res, rej) => {
    let b = ''; chrome.stderr.on('data', (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); });
    chrome.on('exit', () => rej(new Error('chrome exited'))); setTimeout(() => rej(new Error('chrome did not start')), 30000);
  });
  const port = new URL(wsUrl).port;
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((p) => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let seq = 0; const wait = new Map(); const errors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); clearTimeout(w.timer); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  };
  const cdp = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; const timer = setTimeout(() => wait.delete(id) && rej(new Error(`CDP ${method} timed out`)), 120000); wait.set(id, { res, rej, timer }); ws.send(JSON.stringify({ id, method, params })); });
  const js = async (expression) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: `${base}/films/film/web/film.html?lang=${lang}&render=1` });
  for (let i = 0; ; i++) {
    const st = await js('window.__err ? "ERR:" + window.__err : (window.__ready === true ? "ok" : "")').catch(() => '');
    if (st === 'ok') break;
    if (st.startsWith('ERR:')) throw new Error(`page failed: ${st.slice(4)}`);
    if (i > 1200) throw new Error(`page not ready after 120 s ${errors.join(' | ')}`);
    await sleep(100);
  }
  const prof = { frame: 0, cap: 0, n: 0 };
  const shot = async (t) => {
    const a = performance.now();
    await js(`window.renderFrame(${t})`);
    const b = performance.now();
    const data = Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64');
    prof.frame += b - a; prof.cap += performance.now() - b; prof.n++;
    return data;
  };
  const close = async () => { try { ws.close(); chrome.kill(); } catch { /* */ } procs.delete(chrome); await sleep(250); try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* */ } };
  return { shot, js, errors, close, prof };
}
const run = (cmd, a) => new Promise((ok, fail) => { const p = spawn(cmd, a, { stdio: ['ignore', 'inherit', 'inherit'] }); p.on('close', (c) => (c ? fail(new Error(`${cmd} exited ${c}`)) : ok())); });
const parseTimes = (s) => s.split(',').flatMap((part) => { if (part.includes(':')) { const [a, b, st] = part.split(':').map(Number); const out = []; for (let t = a; t <= b + 1e-6; t += st) out.push(+t.toFixed(3)); return out; } return [Number(part)]; });

// ------------------------------------------------------------ stills / labelled contact sheet
const stillSpec = opt('stills') || opt('sheet');
if (stillSpec) {
  const times = parseTimes(stillSpec);
  const nw = Math.min(Number(opt('workers', 4)), 8, times.length);
  const dir = join(buildDir, 'stills'); mkdirSync(dir, { recursive: true });
  const files = new Array(times.length);
  const queue = times.map((t, i) => [t, i]);
  const t0 = Date.now();
  const errs = new Set();
  let ms = 0, n = 0;
  await Promise.all([...Array(nw)].map(async (_, k) => {
    const w = await launch(k);
    while (queue.length) { const [t, i] = queue.shift(); const f = join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`); writeFileSync(f, await w.shot(t)); files[i] = f; }
    w.errors.forEach((e) => errs.add(e)); ms += w.prof.frame; n += w.prof.n;
    await w.close();
  }));
  console.log(`${times.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s, renderFrame avg ${(ms / Math.max(1, n)).toFixed(0)} ms${errs.size ? '\npage errors:\n  ' + [...errs].join('\n  ') : ''}`);
  if (opt('sheet')) {
    const cols = Number(opt('cols', 4)), scale = Number(opt('thumb', 640));
    const tag = opt('tag', 'sheet');
    const out = join(buildDir, `${tag}.png`);
    await run('python', [join(here, 'sheet.py'), out, String(cols), String(scale), ...files]);
    console.log('sheet ->', out);
  }
  await Promise.resolve(); server.close(); process.exit(0);
}

// ------------------------------------------------------------ full picture
const meta = await (async () => { const w = await launch(99); const m = JSON.parse(await w.js('JSON.stringify(window.__film)')); await w.close(); return m; })();
const FPS = Number(opt('fps', meta.fps));
const total = Math.round(Number(opt('until', meta.duration)) * FPS);
if (flag('video')) {
  const workers = Math.min(8, Number(opt('workers', 8)));
  const segFrames = Math.round(Number(opt('segment', 1)) * FPS);
  const segDir = join(buildDir, 'seg'); mkdirSync(segDir, { recursive: true });
  if (flag('fresh')) for (const f of readdirSync(segDir)) rmSync(join(segDir, f), { force: true });
  const nSeg = Math.ceil(total / segFrames);
  const from = Number(opt('from', 0)), to = Number(opt('to', 1e9));
  const queue = [...Array(nSeg).keys()].filter((s) => s * segFrames / FPS >= from - 1e-6 && s * segFrames / FPS < to).filter((s) => flag('force') || !existsSync(join(segDir, `${String(s).padStart(4, '0')}.done`)));
  if (flag('force')) for (const s of queue) rmSync(join(segDir, `${String(s).padStart(4, '0')}.done`), { force: true });
  console.log(`film/${lang}: ${total} frames @ ${FPS} fps, ${nSeg} segments, ${queue.length} to render, ${workers} workers`);
  const t0 = Date.now(); let done = 0; const todo = queue.length;
  await Promise.all([...Array(Math.min(workers, queue.length || 1))].map(async (_, n) => {
    if (!queue.length) return;
    const w = await launch(n + 1);
    while (queue.length) {
      const s = queue.shift();
      const name = join(segDir, `${String(s).padStart(4, '0')}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-profile:v', 'high', '-g', String(FPS), '-bf', '2',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-threads', '2', name], { stdio: ['pipe', 'inherit', 'inherit'] });
      const fin = new Promise((ok, fail) => ff.on('close', (c) => (c ? fail(new Error(`ffmpeg ${c}`)) : ok())));
      for (let f = s * segFrames; f < Math.min(total, (s + 1) * segFrames); f++) { const png = await w.shot(f / FPS); if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r)); }
      ff.stdin.end(); await fin;
      writeFileSync(join(segDir, `${String(s).padStart(4, '0')}.done`), '');
      done++;
      process.stdout.write(`\r  ${done}/${todo} segments  ${((Date.now() - t0) / 1000).toFixed(0)} s   `);
    }
    if (w.errors.length) console.warn(`\nworker ${n} page errors:\n  ` + [...new Set(w.errors)].slice(0, 6).join('\n  '));
    await w.close();
  }));
  const missing = [...Array(nSeg).keys()].filter((s) => !existsSync(join(segDir, `${String(s).padStart(4, '0')}.done`)));
  if (missing.length) { console.log(`\n${missing.length} segments still missing; picture.mp4 not assembled`); }
  else {
    writeFileSync(join(segDir, 'list.txt'), [...Array(nSeg).keys()].map((s) => `file '${String(s).padStart(4, '0')}.mp4'`).join('\n'));
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(segDir, 'list.txt'), '-c', 'copy', join(buildDir, 'picture.mp4')]);
    console.log(`\npicture.mp4 in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}
if (flag('mux')) {
  mkdirSync(outDir, { recursive: true });
  const picture = join(buildDir, 'picture.mp4'), audio = join(buildDir, 'mix.wav');
  if (!existsSync(picture) || !existsSync(audio)) throw new Error('need picture.mp4 and mix.wav');
  const master = join(outDir, `film-${lang}-1080.mp4`);
  const truePeak = (f) => { const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }); const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:')); return { I: parseFloat(s.split('I:')[1]), TP: parseFloat(s.split('Peak:')[1]) }; };
  let trim = 0;
  for (let k = 0; k < 4; k++) {                                   // AAC can overshoot: verify the encoded true peak, trim if needed
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', picture, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0', '-af', `volume=${trim.toFixed(2)}dB`, '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-shortest', master]);
    const m = truePeak(master);
    console.log(`master: ${m.I} LUFS, true peak ${m.TP} dBTP (trim ${trim.toFixed(2)} dB)`);
    if (m.TP <= -1.05) break;
    trim -= m.TP + 1.15;
  }
  const web = join(outDir, `film-${lang}.mp4`);
  const crf = opt('crf', '25');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, '-vf', 'fps=30,scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart', web]);
  const posterAt = opt('poster', String(meta.poster));
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', posterAt, '-i', master, '-frames:v', '1', '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '2', join(outDir, `film-${lang}.jpg`)]);
  console.log(`web ${(statSync(web).size / 1e6).toFixed(2)} MB   master ${(statSync(master).size / 1e6).toFixed(1)} MB`);
}
server.close();
process.exit(0);
