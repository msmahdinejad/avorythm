/* Avorythm demo film engine (global `V`). Adapted from video/src/engine/lib.js; everything is a pure function of t. */
(function () {
  const V = (window.V = {});
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const E = {
    lin: (t) => t,
    in2: (t) => t * t,
    out2: (t) => 1 - (1 - t) * (1 - t),
    io2: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    in3: (t) => t * t * t,
    out3: (t) => 1 - Math.pow(1 - t, 3),
    io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out4: (t) => 1 - Math.pow(1 - t, 4),
    io4: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
    out5: (t) => 1 - Math.pow(1 - t, 5),
    io5: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    ioExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    outBack: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outBackS: (t) => { const c = 0.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    smooth: (t) => t * t * (3 - 2 * t),
    sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  };
  const seg = (t, a, b, e) => { const p = clamp((t - a) / (b - a || 1e-9)); return e ? e(p) : p; };
  // fade window: in over [a0,a1], out over [b0,b1]
  const fade = (t, a0, a1, b0, b1, ei = E.out3, eo = E.in2) => Math.min(ei(seg(t, a0, a1)), 1 - eo(seg(t, b0, b1)));
  // keyframes [[t, value(number|array), easeIntoThisKey?], ...]
  function kf(t, K) {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) {
      const k = K[i];
      if (t <= k[0]) {
        const a = K[i - 1];
        const p = (k[2] || E.io3)(clamp((t - a[0]) / (k[0] - a[0] || 1e-9)));
        return Array.isArray(a[1]) ? a[1].map((v, j) => lerp(v, k[1][j], p)) : lerp(a[1], k[1], p);
      }
    }
    return K[K.length - 1][1];
  }
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };
  const noise = (x) => { const i = Math.floor(x); const f = x - i; const u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  Object.assign(V, { clamp, lerp, E, seg, fade, kf, hash, noise, rng });

  const $ = (s, r = document) => r.querySelector(s);
  function el(tag, cls, html, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
  function css(e, o) { for (const k in o) e.style[k] = o[k]; }
  // transform from numbers; opacity ~0 hides the element (no paint cost)
  function place(e, o) {
    let tr = `translate3d(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px,${(o.z || 0).toFixed(2)}px)`;
    if (o.rx) tr += ` rotateX(${o.rx.toFixed(3)}deg)`;
    if (o.ry) tr += ` rotateY(${o.ry.toFixed(3)}deg)`;
    if (o.r) tr += ` rotate(${o.r.toFixed(3)}deg)`;
    const s = o.s == null ? 1 : o.s;
    if (o.sx != null || o.sy != null) tr += ` scale(${(o.sx ?? s).toFixed(4)},${(o.sy ?? s).toFixed(4)})`;
    else if (s !== 1) tr += ` scale(${s.toFixed(4)})`;
    e.style.transform = tr;
    const op = o.o == null ? 1 : o.o;
    e.style.opacity = op.toFixed(3);
    e.style.visibility = op <= 0.003 ? 'hidden' : 'visible';
    e.style.filter = o.blur > 0.05 ? `blur(${o.blur.toFixed(2)}px)` : (o.filter || '');
  }
  const show = (e, on) => { e.style.visibility = on ? 'visible' : 'hidden'; return on; };
  Object.assign(V, { $, el, css, place, show });

  /* ---------------------------------------------------------------- text */
  const SCRIPT = { fa: 'arab', ar: 'arab', hi: 'deva', zh: 'hans', ja: 'jpan', ko: 'kore' };
  V.script = (lang) => SCRIPT[lang] || 'latin';
  V.htmlLang = (lang) => ({ zh: 'zh-Hans', pt: 'pt-BR' }[lang] || lang);
  // Words (CJK-aware, punctuation glued to the previous word). `*...*` marks highlighted words.
  V.tokenize = function (text, lang) {
    const parts = [];
    let hl = false;
    for (const chunk of text.split('*')) { if (chunk) parts.push({ s: chunk, hl }); hl = !hl; }
    const out = [];
    let pending = '';
    let seg2;
    try { seg2 = new Intl.Segmenter(V.htmlLang(lang), { granularity: 'word' }); } catch { seg2 = null; }
    for (const p of parts) {
      const segs = seg2 ? Array.from(seg2.segment(p.s)) : p.s.split(/(\s+)/).map((s) => ({ segment: s, isWordLike: /\S/.test(s) }));
      for (const g of segs) {
        if (/^\s+$/.test(g.segment)) { if (out.length) out[out.length - 1].space = true; continue; }
        if (g.isWordLike || /^[0-9٠-٩۰-۹]+$/.test(g.segment)) { out.push({ w: pending + g.segment, space: false, hl: p.hl }); pending = ''; }
        else if (/^[«“‘(¿¡「『]/.test(g.segment)) pending += g.segment;
        else if (out.length && out[out.length - 1].space && /^[—–\-+·/&|]/.test(g.segment)) out.push({ w: g.segment, space: false, hl: p.hl }); // a free-standing dash keeps its spaces
        else if (out.length) out[out.length - 1].w += g.segment;
        else pending += g.segment;
      }
    }
    if (pending && out.length) out[out.length - 1].w += pending;
    // Japanese: never break inside a katakana compound, and keep particles with the word before them
    if (lang === 'ja') {
      const kata = /^[゠-ヿー・]+[、。！？]?$/, particle = /^[のをはがにでとへやもか][、。]?$/;
      const merged = [];
      for (const k of out) {
        const last = merged[merged.length - 1];
        if (last && !last.space && last.hl === k.hl && ((kata.test(k.w) && /[゠-ヿー]$/.test(last.w)) || particle.test(k.w))) last.w += k.w;
        else merged.push({ ...k });
      }
      return merged;
    }
    // Latin/Cyrillic words split by the segmenter at hyphens/apostrophes would break visually; glue tokens without spaces
    // only for scripts that use spaces.
    if (!['zh', 'ja', 'ko'].includes(lang)) {
      const merged = [];
      for (const k of out) { const last = merged[merged.length - 1]; if (last && !last.space) { last.w += k.w; last.space = k.space; last.hl = last.hl || k.hl; } else merged.push({ ...k }); }
      return merged;
    }
    return out;
  };
  // reading weight for pacing word reveals against a voice clip
  V.weight = function (word) {
    let w = 0;
    for (const ch of word) {
      if (/[぀-ヿ㐀-鿿豈-﫿가-힯]/.test(ch)) w += 1.1;
      else if (/[.!?…؟。！？]/.test(ch)) w += 0.9;
      else if (/[,;:،、，；：—–]/.test(ch)) w += 0.6;
      else w += 0.62;
    }
    return Math.max(w, 0.8);
  };
  V.wordTimes = function (tokens, t0, dur) {
    const total = tokens.reduce((s, k) => s + V.weight(k.w), 0);
    let acc = 0;
    return tokens.map((k) => { const a = (acc / total) * dur * 0.92; acc += V.weight(k.w); return a + t0; });
  };
  // Builds <span class="w"> words into an element; returns the spans
  V.words = function (node, text, lang, cls = 'w') {
    node.innerHTML = '';
    const toks = V.tokenize(text, lang);
    const spans = toks.map((k, i) => {
      const s = el('span', `${cls}${k.hl ? ' hl' : ''}`, null, node);
      s.textContent = k.w;
      if (k.space && i < toks.length - 1) node.appendChild(document.createTextNode(' '));
      return s;
    });
    return { spans, toks };
  };

  /* --------------------------------------------------------------- fonts */
  V.fontsReady = async function (doc, specs) {
    await Promise.all(specs.map(([f, sample]) => doc.fonts.load(f, sample)));
    await doc.fonts.ready;
    for (const [f, sample] of specs) if (!doc.fonts.check(f, sample)) throw new Error(`font not available: ${f}`);
    const fams = new Set(specs.map(([f]) => f.replace(/^[\d\s]+px\s+|^\d+\s+\d+px\s+/, '').replace(/^.*?px\s+/, '').replace(/"/g, '').split(',')[0].trim()));
    for (const fam of fams) if (![...doc.fonts].some((ff) => ff.family.replace(/"/g, '') === fam && ff.status === 'loaded')) throw new Error(`font not loaded: ${fam}`);
  };
  V.getJSON = async (url, optional) => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) { if (optional) return null; throw new Error(`${url} -> ${r.status}`); } return r.json(); };

  /* ----------------------------------------------------- real product pages */
  // Renders a real page of the product (extension popup/player, desktop app) in a same-origin iframe:
  // scripts removed, the given strings applied to [data-i18n], base URL rewritten, extra CSS appended.
  V.embed = async function ({ url, base, dict, locale, dir, width, height, parent, css: extra = '', rewrite, fontLinks = [] }) {
    let html = await (await fetch(url)).text();
    if (rewrite) html = rewrite(html);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script').forEach((s) => s.remove());
    doc.querySelectorAll('[data-i18n]').forEach((n) => { const v = dict[n.dataset.i18n]; if (typeof v === 'string') n.textContent = v; });
    doc.querySelectorAll('[data-i18n-aria]').forEach((n) => { const v = dict[n.dataset.i18nAria]; if (typeof v === 'string') n.setAttribute('aria-label', v); });
    doc.documentElement.lang = locale;
    doc.documentElement.dir = dir;
    const b = doc.createElement('base'); b.href = base; doc.head.prepend(b);
    for (const href of fontLinks) { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = href; doc.head.append(l); }
    const style = doc.createElement('style');
    style.textContent = '*{animation:none!important;transition:none!important;caret-color:transparent!important}html{scrollbar-width:none;scroll-behavior:auto!important}::-webkit-scrollbar{display:none}' + extra;
    doc.head.append(style);
    const frame = document.createElement('iframe');
    frame.className = 'ext-frame';
    frame.style.cssText = `width:${width}px;height:${height}px;border:0;display:block;background:#080a13`;
    frame.srcdoc = '<!doctype html>' + doc.documentElement.outerHTML;
    parent.appendChild(frame);
    await new Promise((res) => { frame.onload = res; });
    const d = frame.contentDocument;
    await Promise.all([...d.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
    await d.fonts.ready;
    return { frame, doc: d, win: frame.contentWindow, q: (s) => d.querySelector(s), qa: (s) => [...d.querySelectorAll(s)] };
  };
})();
