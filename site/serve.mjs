#!/usr/bin/env node
// Tiny static server for previewing site/_site locally (HTTP range requests included so videos can seek).
//   node site/serve.mjs [--port 4173] [--dir site/_site]
import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { join, extname, resolve, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const port = Number(opt('--port', 4173));
const root = resolve(opt('--dir', join(here, '_site')));
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg', '.vtt': 'text/vtt; charset=utf-8', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    const nf = join(root, '404.html');
    res.writeHead(404, { 'content-type': types['.html'] });
    if (existsSync(nf)) createReadStream(nf).pipe(res); else res.end('Not found');
    return;
  }
  const { size } = statSync(file);
  const type = types[extname(file)] || 'application/octet-stream';
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range) {
    const start = range[1] ? Number(range[1]) : size - Number(range[2]);
    const end = range[1] && range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' });
    createReadStream(file).pipe(res);
  }
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
