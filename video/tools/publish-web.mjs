#!/usr/bin/env node
// Collects the finished web videos of the three films for the site.
//   node video/tools/publish-web.mjs            copy video/out/<kind>-<lang>.{mp4,jpg} -> site/public/video and write manifest.json
//   node video/tools/publish-web.mjs --zip      also pack site/public/video into video/out/site-video.zip (the "site-media" release asset)
// Each film team writes video/out/<kind>.meta.json: { kind, duration, fps, langs: { <lang>: { title, transcript[] } } }.
// The manifest drives the site's cinema section: { published, langs: { <lang>: { <kind>: { src, poster, duration, transcript[] } } } }
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(root, '..', 'site');
const out = join(root, 'out');
const dest = join(site, 'public', 'video');
const LANGS = ['en', 'fa', 'ru', 'ar', 'zh', 'hi', 'es', 'pt', 'fr', 'de', 'tr', 'ja'];
const KINDS = ['film', 'demo', 'tutorial'];
const json = (f) => JSON.parse(readFileSync(f, 'utf8'));

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
const manifest = { published: new Date().toISOString().slice(0, 10), langs: {} };
let bytes = 0;
const missing = [];
for (const kind of KINDS) {
  const metaFile = join(out, `${kind}.meta.json`);
  const meta = existsSync(metaFile) ? json(metaFile) : null;
  for (const lang of LANGS) {
    const mp4 = join(out, `${kind}-${lang}.mp4`);
    const jpg = join(out, `${kind}-${lang}.jpg`);
    if (!meta || !existsSync(mp4) || !existsSync(jpg)) { missing.push(`${kind}-${lang}`); continue; }
    copyFileSync(mp4, join(dest, `${kind}-${lang}.mp4`));
    copyFileSync(jpg, join(dest, `${kind}-${lang}.jpg`));
    bytes += statSync(mp4).size;
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' });
    const duration = Number(probe.stdout.trim()) || meta.duration;
    (manifest.langs[lang] ||= {})[kind] = {
      src: `video/${kind}-${lang}.mp4`, poster: `video/${kind}-${lang}.jpg`, duration: Math.round(duration * 10) / 10,
      transcript: meta.langs?.[lang]?.transcript || [],
    };
  }
}
if (!Object.keys(manifest.langs).length) { console.error('no finished videos found in video/out'); process.exit(1); }
writeFileSync(join(dest, 'manifest.json'), JSON.stringify(manifest, null, 1));
const n = readdirSync(dest).filter((f) => f.endsWith('.mp4')).length;
console.log(`${n} videos, ${(bytes / 1e6).toFixed(1)} MB -> ${dest}${missing.length ? `\nmissing: ${missing.join(' ')}` : ''}`);

if (process.argv.includes('--zip')) {
  const zip = join(out, 'site-video.zip');
  rmSync(zip, { force: true });
  const py = 'import shutil,sys;shutil.make_archive(sys.argv[1][:-4],"zip",sys.argv[2])';
  const r = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-I', '-c', py, zip, dest], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
  console.log(`${zip}  ${(statSync(zip).size / 1e6).toFixed(1)} MB`);
}
