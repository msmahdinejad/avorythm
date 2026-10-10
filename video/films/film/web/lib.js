'use strict';
/* Avorythm brand film — shared helpers: math, timeline access, multi-script text, glass, voice ribbons,
   a perspective camera with depth of field, and post effects. Every frame is a pure function of t. */
const W = 1920, H = 1080;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
ctx.imageSmoothingQuality = 'high';

const COL = {
  bg: [5, 6, 14], ink: [7, 8, 20], white: [244, 246, 255], muted: [154, 163, 199], dim: [96, 104, 140],
  violet: [101, 42, 251], purple: [123, 92, 255], purpleL: [190, 170, 255], magenta: [190, 80, 255],
  cyan: [63, 249, 249], cyanD: [84, 223, 218], cyanL: [190, 255, 252], navy: [7, 16, 90], red: [255, 72, 96], green: [69, 214, 161],
};
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* ------------------------------------------------------------------ math */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3), inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5), inQuint: (t) => Math.pow(t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)), inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2, outSine: (t) => Math.sin((t * Math.PI) / 2),
  outBack: (t, s = 1.6) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  spring: (t, k = 8) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-k * t) * Math.cos(k * 0.85 * t)),
};
const ease = (t, a, b, e = E.inOutCubic) => e(prog(t, a, b));
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
function fbm(x) { return noise1(x) * 0.6 + noise1(x * 2.13 + 7.1) * 0.3 + noise1(x * 4.7 + 1.3) * 0.1; }
function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function life(t, a, b, fi = 0.3, fo = 0.3) { if (t < a || t > b) return 0; return Math.min(fi ? prog(t, a, a + fi) : 1, fo ? 1 - prog(t, b - fo, b) : 1); }
const smooth = (t) => t * t * (3 - 2 * t);

/* ------------------------------------------------------------------ timeline */
let TL = null, COPY = null, CAST = null, LANG = 'en', RTL = false;
const C = new Proxy({}, { get: (_, k) => (TL.cues[k] === undefined ? (console.error('missing cue ' + String(k)), 0) : TL.cues[k]) });
function clip(id) { return TL.clips[id] || null; }
function env(id, t, sm = 3) {
  const c = TL.clips[id]; if (!c || !c.env) return 0;
  const f = (t - c.t) * TL.envFps, n = c.env.length;
  if (f < -sm || f > n + sm) return 0;
  let s = 0, k = 0;
  for (let i = Math.floor(f) - sm; i <= Math.floor(f) + sm; i++) { s += i >= 0 && i < n ? c.env[i] : 0; k++; }
  return s / k;
}
function musicEnv(t) { const e = TL.music; if (!e) return 0; const i = clamp(Math.round(t * TL.envFps), 0, e.length - 1); return e[i]; }
function words(id) {
  const c = TL.clips[id];
  if (!c || !c.words) return [];
  const ws = c.words.map((w) => ({ w: w.w, t: c.t + w.t, d: w.d }));
  return isCJK(c.lang) ? groupCJK(ws, c.lang) : ws;
}
/* CJK clips are timed per character; regroup them into words (Intl.Segmenter) so lines break between words */
const CJK_CACHE = new Map();
function groupCJK(ws, lang) {
  const key = lang + ws.map((w) => w.w).join('') + ws[0].t;
  if (CJK_CACHE.has(key)) return CJK_CACHE.get(key);
  const text = ws.map((w) => w.w).join('');
  const owner = []; ws.forEach((w, i) => { for (const _ of w.w) owner.push(i); });
  const toks = tokenize(text, lang);
  const out = []; let pos = 0;
  for (const tk of toks) {
    const n = [...tk.w].length, i0 = owner[pos], i1 = owner[Math.min(owner.length - 1, pos + n - 1)];
    out.push({ w: tk.w, t: ws[i0].t, d: ws[i1].t + ws[i1].d - ws[i0].t });
    pos += n;
  }
  CJK_CACHE.set(key, out);
  return out;
}
function bsearch(arr, t) { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m].t <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
function pulse(t, kinds, decay = 0.12, win = 1.0) {
  let s = 0; const B = TL.beats || [];
  for (let i = bsearch(B, t); i >= 0 && B[i].t > t - win; i--) { const b = B[i]; if (!kinds || kinds.includes(b.k)) s += b.v * Math.exp(-(t - b.t) / decay); }
  return s;
}
function notePulse(t, decay = 0.25, win = 1.2) {
  let s = 0; const N = TL.notes || [];
  for (let i = bsearch(N, t); i >= 0 && N[i].t > t - win; i--) s += N[i].v * Math.exp(-(t - N[i].t) / decay);
  return s;
}

/* ------------------------------------------------------------------ text (all scripts, shaped by the browser) */
const FAM = { latin: '"Inter Variable"', arab: '"Vazirmatn Variable"', deva: '"Noto Sans Devanagari Variable"', sc: '"Noto Sans SC Variable"', jp: '"Noto Sans JP Variable"', mono: '"JetBrains Mono Variable"' };
function stack(lang) {
  const L = FAM.latin, A = FAM.arab, D = FAM.deva, S = FAM.sc, J = FAM.jp;
  if (lang === 'ja') return [L, J, S, A, D].join(',');
  if (lang === 'zh') return [L, S, J, A, D].join(',');
  if (lang === 'hi') return [L, D, A, S, J].join(',');
  if (lang === 'mono') return [FAM.mono, L].join(',');
  return [L, A, D, S, J].join(',');
}
const isRTL = (lang) => lang === 'fa' || lang === 'ar';
const hasRTL = (s) => /[֐-ࣿיִ-﷿ﹰ-﻿]/.test(s);
const isCJK = (lang) => lang === 'zh' || lang === 'ja';
function font(weight, size, lang) { return `${weight} ${size}px ${stack(lang)}`; }
const MEASURE = new Map();
function tw(s, size, weight = 700, lang = LANG, ls = 0) {
  const k = `${s}|${size}|${weight}|${lang}|${ls}`;
  let v = MEASURE.get(k);
  if (v === undefined) {
    ctx.save(); ctx.font = font(weight, size, lang); ctx.direction = isRTL(lang) || hasRTL(s) ? 'rtl' : 'ltr'; ctx.letterSpacing = `${ls}px`;
    v = ctx.measureText(s).width; ctx.restore(); MEASURE.set(k, v);
  }
  return v;
}
/* draw one string. align: 'center' | 'start' | 'end' (logical, follows the direction) | 'left' | 'right' */
function txt(c, s, x, y, o = {}) {
  const { size = 48, weight = 700, color = COL.white, alpha = 1, align = 'center', glow = 0, glowColor = null, blur = 0, base = 'middle',
    fill = null, lang = LANG, ls = 0, stroke = 0, strokeColor = null } = o;
  if (alpha <= 0.003 || !s) return;
  c.save();
  c.font = font(weight, size, lang);
  const rtl = o.dir ? o.dir === 'rtl' : (isRTL(lang) || hasRTL(s));
  c.direction = rtl ? 'rtl' : 'ltr';
  c.textAlign = align; c.textBaseline = base; c.letterSpacing = `${ls}px`;
  c.globalAlpha *= alpha;
  if (blur > 0.35) c.filter = `blur(${blur.toFixed(2)}px)`;
  if (glow > 0) { c.shadowColor = rgba(glowColor || color, 0.9); c.shadowBlur = glow; }
  if (stroke > 0) { c.lineWidth = stroke; c.strokeStyle = rgba(strokeColor || COL.ink, 1); c.lineJoin = 'round'; c.strokeText(s, x, y); }
  c.fillStyle = fill || rgba(color);
  c.fillText(s, x, y);
  c.restore();
}
/* tokens of a line: words (CJK by Intl.Segmenter); punctuation sticks to its word; LTR runs inside RTL lines stay one token */
function tokenize(s, lang = LANG) {
  const out = [];
  let seg = null;
  try { seg = new Intl.Segmenter(lang === 'zh' ? 'zh-Hans' : lang, { granularity: 'word' }); } catch { seg = null; }
  const parts = seg ? Array.from(seg.segment(s)) : s.split(/(\s+)/).map((p) => ({ segment: p, isWordLike: /\S/.test(p) }));
  let pending = '';
  for (const p of parts) {
    if (/^\s+$/.test(p.segment)) { if (out.length) out[out.length - 1].sp = true; continue; }
    if (p.isWordLike || !out.length) {
      if (!isCJK(lang) && out.length && !out[out.length - 1].sp) out[out.length - 1].w += pending + p.segment;   // glue (e.g. "we'll", "می‌شنوی")
      else out.push({ w: pending + p.segment, sp: false });
      pending = '';
    } else out[out.length - 1].w += p.segment;
  }
  if (pending && out.length) out[out.length - 1].w += pending;
  if (isRTL(lang)) {                                   // merge consecutive LTR tokens into one run (keeps their order under bidi)
    const merged = [];
    for (const k of out) {
      const prev = merged[merged.length - 1];
      if (prev && !hasRTL(prev.w) && !hasRTL(k.w) && /[A-Za-z0-9]/.test(k.w)) { prev.w += (prev.sp ? ' ' : '') + k.w; prev.sp = k.sp; } else merged.push({ ...k });
    }
    return merged;
  }
  return out;
}
/* lay tokens out in lines (wrapping at maxW); returns {lines:[{items:[{w,x0,x1,cx,i}], width}], lh} relative to cx */
function layout(toks, size, weight, lang, cx, maxW = 1e9, ls = 0) {
  const rtl = isRTL(lang), cjk = isCJK(lang);
  const sp = cjk ? 0 : tw(' ', size, weight, lang);
  const ws = toks.map((k) => tw(k.w, size, weight, lang, ls));
  const lines = []; let cur = [], curW = 0;
  toks.forEach((k, i) => {
    const add = (cur.length ? (toks[cur[cur.length - 1]].sp || !cjk ? sp : 0) : 0) + ws[i];
    if (cur.length && curW + add > maxW) { lines.push({ idx: cur, width: curW }); cur = [i]; curW = ws[i]; } else { cur.push(i); curW += add; }
  });
  if (cur.length) lines.push({ idx: cur, width: curW });
  return {
    lines: lines.map((L) => {
      let pos = rtl ? cx + L.width / 2 : cx - L.width / 2;
      const items = L.idx.map((i, j) => {
        if (j) pos += (rtl ? -1 : 1) * (toks[L.idx[j - 1]].sp || !cjk ? sp : 0);
        const x0 = rtl ? pos - ws[i] : pos, x1 = rtl ? pos : pos + ws[i];
        pos += (rtl ? -1 : 1) * ws[i];
        return { w: toks[i].w, i, x0, x1, cx: (x0 + x1) / 2, width: ws[i] };
      });
      return { items, width: L.width };
    }),
  };
}
/* balanced wrap: pick the narrowest maxW that keeps the same number of lines */
function balancedLayout(toks, size, weight, lang, cx, maxW, ls = 0) {
  let L = layout(toks, size, weight, lang, cx, maxW, ls);
  const n = L.lines.length;
  if (n < 2) return L;
  let lo = maxW * 0.5, hi = maxW;
  for (let k = 0; k < 12; k++) { const mid = (lo + hi) / 2; const T = layout(toks, size, weight, lang, cx, mid, ls); if (T.lines.length > n) lo = mid; else hi = mid; }
  return layout(toks, size, weight, lang, cx, hi + 1, ls);
}
/* fit a single line into maxW by reducing the size */
function fitSize(s, size, weight, lang, maxW, ls = 0) { const w = tw(s, size, weight, lang, ls); return w > maxW ? size * maxW / w : size; }
const DIGITS = { fa: '۰۱۲۳۴۵۶۷۸۹' };
const localDigits = (s, lang) => (DIGITS[lang] ? String(s).replace(/[0-9]/g, (d) => DIGITS[lang][d]) : String(s));

/* ------------------------------------------------------------------ shapes */
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
function glowDot(c, x, y, r, col, a = 1) {
  if (a <= 0.002 || r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(mixc(col, [255, 255, 255], 0.35), a)); g.addColorStop(0.22, rgba(col, a * 0.5)); g.addColorStop(0.6, rgba(col, a * 0.12)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
}
function softLight(c, x, y, r, col, a) {          // very soft volumetric light (no hot core)
  if (a <= 0.002) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(0.5, rgba(col, a * 0.35)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
}
/* frosted glass: blurs what is already drawn in `src` under the rectangle (c and src share coordinates) */
function glass(c, src, x, y, w, h, r, o = {}) {
  const { blur = 24, tint = [11, 15, 28], tintA = 0.88, border = 0.2, alpha = 1, edge = null, edgeA = 0, sat = 1.5, shadow = 0.38 } = o;
  if (alpha <= 0.003 || w < 2 || h < 2) return;
  c.save();
  c.globalAlpha *= alpha;
  if (shadow > 0) { c.save(); c.shadowColor = `rgba(0,0,0,${shadow})`; c.shadowBlur = h * 0.5; c.shadowOffsetY = h * 0.14; rr(c, x, y, w, h, r); c.fillStyle = 'rgba(0,0,0,0.6)'; c.fill(); c.restore(); }
  rr(c, x, y, w, h, r); c.save(); c.clip();
  if (blur > 0 && src) {
    const M = c.getTransform();
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => [M.a * px + M.c * py + M.e, M.b * px + M.d * py + M.f]);
    const pad = blur * 2;
    const bx0 = clamp(Math.min(...pts.map((p) => p[0])) - pad, 0, src.width), by0 = clamp(Math.min(...pts.map((p) => p[1])) - pad, 0, src.height);
    const bx1 = clamp(Math.max(...pts.map((p) => p[0])) + pad, 0, src.width), by1 = clamp(Math.max(...pts.map((p) => p[1])) + pad, 0, src.height);
    if (bx1 - bx0 > 2 && by1 - by0 > 2) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.filter = `blur(${(blur * Math.hypot(M.a, M.b)).toFixed(1)}px) saturate(${sat})`;
      c.drawImage(src, bx0, by0, bx1 - bx0, by1 - by0, bx0, by0, bx1 - bx0, by1 - by0);
      c.filter = 'none';
      c.setTransform(M);
    }
  }
  c.fillStyle = rgba(tint, tintA); c.fillRect(x, y, w, h);
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.075)'); g.addColorStop(0.35, 'rgba(255,255,255,0.015)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.restore();
  rr(c, x + 0.5, y + 0.5, w - 1, h - 1, r);
  c.lineWidth = Math.max(1, h * 0.008);
  c.strokeStyle = `rgba(255,255,255,${border})`; c.stroke();
  if (edge && edgeA > 0) { c.strokeStyle = rgba(edge, edgeA); c.lineWidth = Math.max(1.5, h * 0.014); c.shadowColor = rgba(edge, edgeA); c.shadowBlur = h * 0.18; c.stroke(); }
  // inset top highlight (the product card's inset 0 1px 0 rgba(255,255,255,.14))
  c.beginPath(); c.moveTo(x + r, y + 1.2); c.lineTo(x + w - r, y + 1.2); c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1; c.stroke();
  c.restore();
}

/* ------------------------------------------------------------------ the voice ribbon (thin, elegant) */
function ribbon(c, cx, cy, width, amp, t, o = {}) {
  const { hue = 0, strands = 4, seed = 0, alpha = 1, lw = 1.5, speed = 1, jitter = 0, freq = 1, glowMul = 1, core = 1 } = o;
  if (alpha <= 0.003 || width < 4) return;
  const col = mixc(COL.purple, COL.cyan, hue), colL = mixc(mixc(COL.purpleL, COL.cyanL, hue), [255, 255, 255], 0.15);
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round'; c.lineCap = 'round';
  const step = Math.max(2.5, width / 260);
  const gEdge = (a) => { const g = c.createLinearGradient(cx - width / 2, 0, cx + width / 2, 0); g.addColorStop(0, rgba(colL, 0)); g.addColorStop(0.2, rgba(colL, a)); g.addColorStop(0.8, rgba(colL, a)); g.addColorStop(1, rgba(colL, 0)); return g; };
  const gGlow = (a) => { const g = c.createLinearGradient(cx - width / 2, 0, cx + width / 2, 0); g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.25, rgba(col, a)); g.addColorStop(0.75, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); return g; };
  for (let j = 0; j < strands; j++) {
    const ph = seed * 2.31 + j * 1.73;
    const k = (2.2 + 0.9 * j) * freq * Math.PI * 2 / width;
    const sp = (1.9 + 0.7 * j) * speed;
    const aj = amp * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(ph + t * 1.3)));
    c.beginPath();
    for (let x = -width / 2; x <= width / 2 + 0.01; x += step) {
      const u = x / width + 0.5, win = Math.pow(Math.sin(Math.PI * u), 2.2);
      const jit = jitter ? 1 + jitter * noise1(u * 40 + t * 13 + j * 7) : 1;
      const y = cy + aj * win * jit * (Math.sin(x * k + t * sp + ph) * 0.8 + 0.2 * Math.sin(x * k * 2.7 - t * sp * 1.3 + ph * 2));
      if (x === -width / 2) c.moveTo(cx + x, y); else c.lineTo(cx + x, y);
    }
    c.globalAlpha = alpha * 0.07 * glowMul; c.strokeStyle = gGlow(1); c.lineWidth = lw * 7; c.stroke();
    c.globalAlpha = alpha * 0.25; c.strokeStyle = gGlow(1); c.lineWidth = lw * 2.4; c.stroke();
    c.globalAlpha = alpha * 0.9; c.strokeStyle = gEdge(1); c.lineWidth = lw; c.stroke();
  }
  if (core > 0) {
    const g = c.createLinearGradient(cx - width / 2, 0, cx + width / 2, 0);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(colL, 0.8 * core)); g.addColorStop(1, rgba(col, 0));
    c.globalAlpha = alpha; c.fillStyle = g; c.fillRect(cx - width / 2, cy - lw * 0.5, width, lw);
  }
  c.restore();
}

/* ------------------------------------------------------------------ camera + planes */
const F = 1600;                                   // focal length in px: a plane at distance F is drawn 1:1
function project(cam, x, y, z) {
  const d = z - cam.z;
  if (d <= 1) return null;
  const s = (cam.f || F) / d;
  let X = (x - cam.x) * s, Y = (y - cam.y) * s;
  if (cam.roll) { const cr = Math.cos(cam.roll), sr = Math.sin(cam.roll); const X2 = X * cr - Y * sr; Y = X * sr + Y * cr; X = X2; }
  return { x: W / 2 + X, y: H / 2 + Y, s, d };
}
/* circle of confusion in px for a plane at distance d with the camera focused at cam.focus */
function coc(cam, d) { if (!cam.aperture) return 0; return clamp(cam.aperture * Math.abs(d - cam.focus) / d, 0, 40); }
const SCRATCH = document.createElement('canvas'); SCRATCH.width = W; SCRATCH.height = H; const sctx = SCRATCH.getContext('2d');
/* draw image region (sx,sy,sw,sh) as a plane centred at P=(x,y,z), size P.w x P.h world units, rotated P.ry around its vertical axis */
function drawPlane(c, img, sx, sy, sw, sh, P, cam, o = {}) {
  const { alpha = 1, blur = null, strips = 48 } = o;
  if (alpha <= 0.003) return null;
  const ry = P.ry || 0, cosr = Math.cos(ry), sinr = Math.sin(ry);
  const corners = [-1, 1].map((sxn) => {
    const lx = sxn * P.w / 2;
    return { top: project(cam, P.x + lx * cosr, P.y - P.h / 2, P.z + lx * sinr), bot: project(cam, P.x + lx * cosr, P.y + P.h / 2, P.z + lx * sinr) };
  });
  if (!corners[0].top || !corners[1].top) return null;
  const xs = [corners[0].top.x, corners[1].top.x, corners[0].bot.x, corners[1].bot.x], ys = [corners[0].top.y, corners[1].top.y, corners[0].bot.y, corners[1].bot.y];
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
  if (bx1 < -200 || bx0 > W + 200 || by1 < -200 || by0 > H + 200) return null;
  const centre = project(cam, P.x, P.y, P.z);
  const bl = blur === null ? coc(cam, centre ? centre.d : 1e9) : blur;
  const flat = Math.abs(ry) < 0.004 && !cam.roll;
  const viaScratch = bl > 0.6 || (alpha < 0.999 && !flat);
  const target = viaScratch ? sctx : c;
  if (viaScratch) { sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, W, H); sctx.imageSmoothingQuality = 'high'; }
  target.save();
  if (target === c) target.globalAlpha *= alpha;
  if (flat) {
    target.drawImage(img, sx, sy, sw, sh, corners[0].top.x, corners[0].top.y, corners[1].top.x - corners[0].top.x, corners[0].bot.y - corners[0].top.y);
  } else {
    const n = Math.max(8, Math.min(strips, Math.ceil((bx1 - bx0) / 12)));
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const pa = stripEdge(cam, P, cosr, sinr, u0), pb = stripEdge(cam, P, cosr, sinr, u1);
      if (!pa || !pb) continue;
      // affine map of the source strip onto the trapezoid edge pair (top-left, top-right, bottom-left)
      const ax = pa.t.x, ay = pa.t.y, bxx = pb.t.x, byy = pb.t.y, cx_ = pa.b.x, cy_ = pa.b.y;
      const ssw = sw / n;
      target.save();
      target.setTransform((bxx - ax) / ssw, (byy - ay) / ssw, (cx_ - ax) / sh, (cy_ - ay) / sh, ax, ay);
      target.drawImage(img, sx + i * ssw, sy, ssw + (i < n - 1 ? 0.8 : 0), sh, 0, 0, ssw + (i < n - 1 ? 0.8 : 0), sh);
      target.restore();
    }
  }
  target.restore();
  if (viaScratch) {
    c.save(); c.globalAlpha *= alpha; if (bl > 0.6) c.filter = `blur(${bl.toFixed(1)}px)`;
    const m = bl * 3, x0 = clamp(bx0 - m, 0, W), y0 = clamp(by0 - m, 0, H), x1 = clamp(bx1 + m, 0, W), y1 = clamp(by1 + m, 0, H);
    if (x1 - x0 > 1 && y1 - y0 > 1) c.drawImage(SCRATCH, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    c.restore();
  }
  return { x0: bx0, y0: by0, x1: bx1, y1: by1, s: centre ? centre.s : 0, d: centre ? centre.d : 0, blur: bl, cx: centre ? centre.x : 0, cy: centre ? centre.y : 0 };
}
function stripEdge(cam, P, cosr, sinr, u) {
  const lx = (u - 0.5) * P.w;
  const t = project(cam, P.x + lx * cosr, P.y - P.h / 2, P.z + lx * sinr), b = project(cam, P.x + lx * cosr, P.y + P.h / 2, P.z + lx * sinr);
  return t && b ? { t, b } : null;
}

/* ------------------------------------------------------------------ images */
const IMG = {};
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image failed: ' + src)); i.src = src; }); }
async function loadSvgIcon(name, color, kind) {
  const r = await fetch(`/repo/site/src/icons/${kind}/${name}.svg`);
  if (!r.ok) throw new Error('icon missing ' + name);
  let s = await r.text();
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<title>[\s\S]*?<\/title>/g, '');
  s = s.replace(/currentColor/g, color);
  if (kind === 'brands') s = s.replace('<svg', `<svg fill="${color}"`);
  if (!/width=/.test(s.slice(0, s.indexOf('>')))) s = s.replace('<svg', '<svg width="96" height="96"');
  return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
}

/* ------------------------------------------------------------------ post */
const GRAIN = [];
function makeGrain() {
  for (let k = 0; k < 6; k++) {
    const g = document.createElement('canvas'); g.width = 960; g.height = 540;
    const gx = g.getContext('2d'), id = gx.createImageData(960, 540), r = rng(k * 97 + 13);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 110; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gx.putImageData(id, 0, 0); GRAIN.push(g);
  }
}
function grain(t, a = 0.06) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = a; ctx.drawImage(GRAIN[Math.floor(t * 60) % GRAIN.length], 0, 0, W, H); ctx.restore(); }
function vignette(a = 0.55, r0 = 0.42) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * r0, W / 2, H / 2, H * 1.08);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
const TMP = document.createElement('canvas'); TMP.width = W; TMP.height = H; const tctx = TMP.getContext('2d');
const TMP2 = document.createElement('canvas'); TMP2.width = W; TMP2.height = H; const t2ctx = TMP2.getContext('2d');
function snapshot() { tctx.globalCompositeOperation = 'copy'; tctx.globalAlpha = 1; tctx.filter = 'none'; tctx.drawImage(cv, 0, 0); }
/* radial zoom blur (camera push/pull): copies of the frame scaled about (cx, cy) */
function zoomBlur(amount, cx = W / 2, cy = H / 2, n = 6) {
  if (amount < 0.002) return;
  snapshot();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 1; i <= n; i++) {
    const s = 1 + amount * i / n;
    ctx.globalAlpha = 0.5 / (i + 0.6);
    ctx.drawImage(TMP, cx - cx * s, cy - cy * s, W * s, H * s);
  }
  ctx.restore();
}
/* directional smear for fast lateral moves */
function dirBlur(dx, dy, n = 6) {
  if (Math.hypot(dx, dy) < 1) return;
  snapshot();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 1; i <= n; i++) { ctx.globalAlpha = 0.45 / (i + 0.5); ctx.drawImage(TMP, -dx * i / n, -dy * i / n); }
  ctx.restore();
}
function chroma(amt) {                          // subtle lens chromatic aberration at the edges
  if (amt < 0.05) return;
  snapshot();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
  for (const [tint, s] of [[[255, 0, 40], 1 + amt * 0.004], [[0, 200, 255], 1 - amt * 0.004]]) {
    t2ctx.globalCompositeOperation = 'copy'; t2ctx.drawImage(TMP, 0, 0);
    t2ctx.globalCompositeOperation = 'multiply'; t2ctx.fillStyle = rgba(tint); t2ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.22 * Math.min(1, amt);
    ctx.drawImage(TMP2, W / 2 - W * s / 2, H / 2 - H * s / 2, W * s, H * s);
  }
  ctx.restore();
}
function glitch(t, amt) {
  if (amt <= 0.01) return;
  snapshot();
  const r = rng(Math.floor(t * 60) * 7919 + 17);
  const n = Math.floor(3 + amt * 14);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) { const y = r() * H, h = 2 + r() * 60 * amt, dx = (r() - 0.5) * 180 * amt; ctx.drawImage(TMP, 0, y, W, h, dx, y, W, h); }
  for (const [tint, dx] of [[[255, 0, 70], -12 * amt], [[0, 255, 255], 12 * amt]]) {
    t2ctx.globalCompositeOperation = 'copy'; t2ctx.drawImage(TMP, 0, 0);
    t2ctx.globalCompositeOperation = 'multiply'; t2ctx.fillStyle = rgba(tint); t2ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 * amt; ctx.drawImage(TMP2, dx, 0);
  }
  ctx.restore();
}
function flash(a, col = [255, 255, 255]) {
  if (a <= 0.003) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, a * 0.2));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function fadeBlack(a) { if (a <= 0.002) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(0,0,0,${clamp(a)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
