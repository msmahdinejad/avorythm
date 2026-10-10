/* Avorythm film engine: tiny helpers shared by every film (global `V`).
   A film is a pure function renderFrame(t): nothing is stored between frames, so any frame can be rendered by any worker. */
(function () {
  const V = (window.V = {});

  /* ------------------------------------------------------------------ math */
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b, e) => { const p = clamp((t - a) / (b - a)); return e ? e(p) : p; };
  const mixc = (c1, c2, t) => [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  // alpha of a window [a, b] with fade-in / fade-out seconds
  const win = (t, a, b, fi = 0.25, fo = 0.25) => clamp((t - a) / Math.max(fi, 1e-6)) * clamp((b - t) / Math.max(fo, 1e-6));
  const E = {
    lin: (t) => t,
    in2: (t) => t * t,
    out2: (t) => 1 - (1 - t) * (1 - t),
    io2: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    in3: (t) => t * t * t,
    out3: (t) => 1 - Math.pow(1 - t, 3),
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out4: (t) => 1 - Math.pow(1 - t, 4),
    io4: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    ioExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    outBack: (t) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    inBack: (t) => { const c1 = 1.70158; const c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
    outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1),
    smooth: (t) => t * t * (3 - 2 * t),
    // overshooting spring settle, k = stiffness-ish
    spring: (t, k = 7) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-k * t) * Math.cos(k * 0.9 * t)),
  };
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };
  const noise = (x) => { const i = Math.floor(x); const f = x - i; const u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  Object.assign(V, { clamp, lerp, seg, mixc, rgba, win, E, hash, noise, rng });

  /* ------------------------------------------------------------------- dom */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function el(tag, cls, html, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  // Positions an element with a transform built from plain numbers; opacity ~0 hides it entirely.
  function place(e, o) {
    const s = o.s == null ? 1 : o.s;
    let tr = `translate3d(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px,${(o.z || 0).toFixed(2)}px)`;
    if (o.rx) tr += ` rotateX(${o.rx.toFixed(3)}deg)`;
    if (o.ry) tr += ` rotateY(${o.ry.toFixed(3)}deg)`;
    if (o.r) tr += ` rotate(${o.r.toFixed(3)}deg)`;
    if (o.sx != null || o.sy != null) tr += ` scale(${(o.sx == null ? s : o.sx).toFixed(4)},${(o.sy == null ? s : o.sy).toFixed(4)})`;
    else if (s !== 1) tr += ` scale(${s.toFixed(4)})`;
    e.style.transform = tr;
    const op = o.o == null ? 1 : o.o;
    e.style.opacity = op.toFixed(3);
    e.style.visibility = op <= 0.003 ? 'hidden' : 'visible';
    let f = '';
    if (o.blur > 0.05) f += `blur(${o.blur.toFixed(2)}px) `;
    if (o.filter) f += o.filter;
    e.style.filter = f;
  }
  Object.assign(V, { $, $$, el, place });

  /* ------------------------------------------------------------------ text */
  // Splits a line into words (CJK-aware); punctuation sticks to the previous word.
  function tokenize(text, lang) {
    const out = [];
    let pending = '';
    let seg2;
    try { seg2 = new Intl.Segmenter(lang, { granularity: 'word' }); } catch { seg2 = null; }
    const parts = seg2 ? Array.from(seg2.segment(text)) : text.split(/(\s+)/).map((s) => ({ segment: s, isWordLike: /\S/.test(s) }));
    for (const p of parts) {
      if (/^\s+$/.test(p.segment)) { if (out.length) out[out.length - 1].space = true; continue; }
      if (p.isWordLike) { out.push({ w: pending + p.segment, space: false }); pending = ''; }
      else if (out.length) out[out.length - 1].w += p.segment;
      else pending += p.segment;
    }
    return out;
  }
  // Reading-time weight of a word: CJK characters count one each, punctuation adds a small pause.
  function weight(word) {
    let w = 0;
    for (const ch of word) {
      if (/[぀-ヿ㐀-鿿豈-﫿가-힯]/.test(ch)) w += 1.1;
      else if (/[.!?…؟。！？]/.test(ch)) w += 1.4;
      else if (/[,;:،、，；：—–-]/.test(ch)) w += 0.7;
      else if (/\s/.test(ch)) w += 0;
      else w += 0.62;
    }
    return Math.max(w, 0.8);
  }
  // Start/end time of every word of a line spoken between t0 and t0 + dur (aligned if real word timings exist)
  function wordTimes(tokens, t0, dur, aligned) {
    if (aligned && aligned.length === tokens.length) return aligned.map((a) => ({ t0: t0 + a.t, t1: t0 + a.t + a.d }));
    const total = tokens.reduce((s, k) => s + weight(k.w), 0);
    let acc = 0;
    const usable = dur * 0.96;
    return tokens.map((k) => { const a = (acc / total) * usable; acc += weight(k.w); return { t0: t0 + a, t1: t0 + (acc / total) * usable }; });
  }
  Object.assign(V, { tokenize, weight, wordTimes });

  /* ----------------------------------------------------------- fonts / data */
  const SCRIPT = { fa: 'arab', ar: 'arab', hi: 'deva', zh: 'hans', ja: 'jpan' };
  V.script = (lang) => SCRIPT[lang] || 'latin';
  V.htmlLang = (lang) => ({ zh: 'zh-Hans', pt: 'pt-BR' }[lang] || lang);
  V.ensureFonts = async function (texts) {
    const families = ['"Inter Variable"', '"Vazirmatn Variable"', '"Noto Sans Devanagari Variable"', '"Noto Sans SC Variable"', '"Noto Sans JP Variable"', '"JetBrains Mono Variable"'];
    const sample = texts.join(' ');
    await Promise.all(families.flatMap((f) => [400, 600, 800].map((w) => document.fonts.load(`${w} 48px ${f}`, sample).catch(() => null))));
    await document.fonts.ready;
  };
  V.getJSON = async (url, optional) => {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) { if (optional) return null; throw new Error(`${url} -> ${r.status}`); }
    return r.json();
  };
  V.loadFilm = async (film, lang) => {
    const [slots, copy, ui, sources, timing, env] = await Promise.all([
      V.getJSON(`/src/data/${film}.slots.json`),
      V.getJSON(`/src/data/${film}.${lang}.json`),
      V.getJSON('/src/data/ui.json'),
      V.getJSON('/src/data/sources.json'),
      V.getJSON(`/build/${film}/${lang}/timing.json`, true),
      V.getJSON(`/build/${film}/${lang}/env.json`, true),
    ]);
    return { film, lang, slots, copy, ui, sources, timing, env };
  };
  // Duration of a narration line: real clip length when known, otherwise an estimate from the text (preview only).
  V.lineTiming = (D, id) => {
    const slot = D.slots.slots[id] || (D.slots.dubs || []).find((d) => d.id === id);
    const real = D.timing && D.timing.lines && D.timing.lines[id];
    if (real) return { t: real.start, dur: real.dur, words: real.words };
    const text = (D.copy.lines[id] || {}).text || '';
    const est = Math.min(slot.max, Math.max(0.8, V.tokenize(text, D.lang).reduce((s, k) => s + V.weight(k.w), 0) * 0.075));
    return { t: slot.t, dur: est, words: null };
  };
  // Audio envelope (0..1) of a voice or the music at time t; synthetic when no audio has been mixed yet.
  V.env = (D, id, t, fallback) => {
    const e = D.env && D.env[id];
    if (!e) return fallback == null ? 0 : fallback;
    const f = t * D.env.fps;
    const i = Math.floor(f);
    if (i < 0 || i >= e.length - 1) return 0;
    return lerp(e[i], e[i + 1], f - i);
  };

  /* --------------------------------------------------------------- canvases */
  // One luminous voice ribbon: several strands, additive light, two glow passes and a bright core.
  V.ribbon = function (ctx, o) {
    const step = o.step || 6;
    const w = o.x1 - o.x0;
    const n = Math.ceil(w / step);
    const strands = o.strands || 5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const ys = new Float32Array(n + 1);
    for (let k = 0; k < strands; k++) {
      const kk = strands > 1 ? k / (strands - 1) : 0;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const env = o.env ? o.env(u) : Math.pow(Math.sin(Math.PI * u), 1.3);
        const f1 = Math.sin(u * (7 + kk * 3) * (o.freq || 1) * 2.5 + o.t * (1.1 + kk * 0.4) * (o.speed || 1) + (o.phase || 0) + k * 0.9);
        const f2 = Math.sin(u * (17 + kk * 5) * (o.freq || 1) * 2.5 + o.t * 1.9 * (o.speed || 1) - k * 1.3) * 0.5;
        const f3 = Math.sin(u * 31 * (o.freq || 1) * 2.5 + o.t * 2.7 * (o.speed || 1) + k) * 0.22;
        const j = o.jitter ? noise(u * 22 + o.t * 7 + k * 9) * o.jitter * 0.8 + noise(u * 58 - o.t * 12 + k) * o.jitter * 0.3 : 0;
        ys[i] = o.y + o.amp * Math.tanh(env * (f1 + f2 + f3 + j) * (0.7 + kk * 0.55) * 0.95);
      }
      const g = ctx.createLinearGradient(o.x0, 0, o.x1, 0);
      g.addColorStop(0, rgba(o.cA, 0));
      g.addColorStop(0.18, rgba(o.cA, 1));
      g.addColorStop(0.82, rgba(o.cB, 1));
      g.addColorStop(1, rgba(o.cB, 0));
      ctx.strokeStyle = g;
      for (const pass of [[(o.width || 2) * (7 + k), 0.05], [(o.width || 2) * (2.6 + kk), 0.2], [(o.width || 2) * 0.9, 0.95]]) {
        ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * pass[1] * (0.55 + 0.45 * (1 - Math.abs(kk - 0.5) * 1.2));
        ctx.lineWidth = pass[0];
        ctx.beginPath();
        for (let i = 0; i <= n; i++) { const x = o.x0 + (i / n) * w; if (i === 0) ctx.moveTo(x, ys[i]); else ctx.lineTo(x, ys[i]); }
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  // Deterministic drifting dust.
  V.stars = function (ctx, t, o) {
    const r = rng(o.seed || 11);
    ctx.save();
    for (let i = 0; i < o.n; i++) {
      const x = r() * o.w; const y = r() * o.h; const z = 0.25 + r() * 0.75; const tw = 0.45 + 0.55 * Math.sin(t * (0.5 + r() * 2.2) + r() * 6.28);
      const px = (((x + t * (o.speed || 6) * z) % o.w) + o.w) % o.w;
      ctx.globalAlpha = (o.alpha == null ? 0.6 : o.alpha) * tw * z;
      ctx.fillStyle = rgba(o.tint || [190, 200, 255]);
      const s = (o.size || 2.2) * z;
      ctx.fillRect(px, y, s, s);
    }
    ctx.restore();
  };

  /* ------------------------------------------------------ extension pages */
  // Renders one of the real extension pages (popup / options / player) with its real CSS inside an iframe, in the
  // viewer's language when the extension has that interface (fa, zh-Hans), English otherwise.
  V.embedExt = async function (name, locale, o) {
    const html = await (await fetch(`/repo/extension/${name}.html`)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script').forEach((s) => s.remove());
    const dict = (V.ui && V.ui[name] && (V.ui[name][locale] || V.ui[name].en)) || {};
    doc.querySelectorAll('[data-i18n]').forEach((n) => { const v = dict[n.dataset.i18n]; if (typeof v === 'string') n.textContent = v; });
    doc.querySelectorAll('[data-i18n-aria]').forEach((n) => { const v = dict[n.dataset.i18nAria]; if (typeof v === 'string') n.setAttribute('aria-label', v); });
    doc.documentElement.lang = locale;
    doc.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
    const base = doc.createElement('base');
    base.href = '/repo/extension/';
    doc.head.prepend(base);
    const style = doc.createElement('style');
    style.textContent = '*{animation:none!important;transition:none!important;caret-color:transparent!important}html{scrollbar-width:none}::-webkit-scrollbar{display:none}' + (o.css || '');
    doc.head.append(style);
    const frame = document.createElement('iframe');
    frame.className = 'ext-frame';
    frame.style.cssText = `width:${o.width}px;height:${o.height}px;border:0;background:#080a13;border-radius:${o.radius || 0}px`;
    frame.srcdoc = '<!doctype html>' + doc.documentElement.outerHTML;
    (o.parent || document.body).appendChild(frame);
    await new Promise((res) => { frame.onload = res; });
    try { await frame.contentDocument.fonts.ready; } catch { /* ignore */ }
    return { frame, doc: frame.contentDocument, win: frame.contentWindow, dict };
  };


  /* ----------------------------------------------------------------- icons */
  // Lucide (ISC) / Simple Icons (CC0) glyphs from the site's icon folder, inlined as SVG strings.
  V.icons = {};
  V.loadIcons = async function (names) {
    await Promise.all(names.map(async (name) => {
      for (const kind of ['lucide', 'brands']) {
        const r = await fetch(`/repo/site/src/icons/${kind}/${name}.svg`);
        if (!r.ok) continue;
        const raw = await r.text();
        const inner = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/g, '').trim();
        V.icons[name] = kind === 'lucide'
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
          : `<svg viewBox="0 0 24 24" fill="currentColor">${inner}</svg>`;
        return;
      }
      throw new Error(`icon not found: ${name}`);
    }));
  };
  V.icon = (name, cls) => (V.icons[name] || '').replace('<svg', `<svg class="${cls || 'ic'}"`);

  /* -------------------------------------------------------------- preview */
  // ?preview=1 : fit the stage to the window, add a scrubber (handy while designing a film)
  V.mount = function (film) {
    const stage = $('#stage');
    const params = new URLSearchParams(location.search);
    const fit = () => {
      if (params.get('render')) { stage.style.transformOrigin = '0 0'; return; }
      const s = Math.min(innerWidth / 1920, (innerHeight - (params.get('preview') ? 56 : 0)) / 1080);
      stage.style.transformOrigin = '0 0';
      stage.style.transform = `scale(${s})`;
    };
    fit();
    addEventListener('resize', fit);
    if (params.get('render')) { document.documentElement.classList.add('render'); return; }
    if (!params.get('preview')) return;
    const bar = el('div', 'scrub', '', document.body);
    const play = el('button', '', '▶', bar);
    const range = el('input', '', null, bar);
    range.type = 'range'; range.min = 0; range.max = film.duration; range.step = 1 / film.fps; range.value = 0;
    const out = el('span', '', '0.00', bar);
    let playing = false; let t0 = 0; let base = 0;
    const loop = (now) => {
      if (playing) { const t = base + (now - t0) / 1000; range.value = t % film.duration; window.renderFrame(+range.value); out.textContent = (+range.value).toFixed(2); }
      requestAnimationFrame(loop);
    };
    play.onclick = () => { playing = !playing; play.textContent = playing ? '❚❚' : '▶'; t0 = performance.now(); base = +range.value; };
    range.oninput = () => { window.renderFrame(+range.value); out.textContent = (+range.value).toFixed(2); };
    requestAnimationFrame(loop);
  };
})();
