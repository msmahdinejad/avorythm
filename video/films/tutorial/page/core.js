/* Avorythm tutorial — core runtime: math, timeline warp, camera, cursor, captions, overlays.
   Every frame is a pure function of t (renderFrame(t)); nothing is carried between frames. */
(function () {
  const T = (window.T = {});
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, p) => a + (b - a) * p;
  const inv = (a, b, v) => (b === a ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a)));
  const E = {
    lin: (x) => x,
    io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    o: (x) => 1 - Math.pow(1 - x, 3),
    i: (x) => x * x * x,
    o2: (x) => 1 - (1 - x) * (1 - x),
    expo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    expoIn: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    quint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
    quintO: (x) => 1 - Math.pow(1 - x, 5),
    sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    back: (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
    soft: (x) => { const c = 0.8; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
    spring: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6.5 * x) * Math.cos(9 * x)),
  };
  const fade = (t, a0, a1, b0, b1) => Math.min(E.o(inv(a0, a1, t)), 1 - E.i(inv(b0, b1, t)));
  const bump = (t, a, b, c) => (t < b ? E.o(inv(a, b, t)) : 1 - E.io(inv(b, c, t)));
  const pulse = (t, at, dur = 0.5) => (t >= at && t < at + dur ? Math.exp(-((t - at) / dur) * 4) : 0);
  // keyframes [[t, value(s), ease?], ...]; value may be a number or an array
  function kf(t, K) {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) {
      const k = K[i];
      if (t <= k[0]) {
        const a = K[i - 1], p = (k[2] || E.io)(inv(a[0], k[0], t));
        return Array.isArray(a[1]) ? a[1].map((v, j) => lerp(v, k[1][j], p)) : lerp(a[1], k[1], p);
      }
    }
    return K[K.length - 1][1];
  }
  function st(el, o) { for (const k in o) el.style[k] = o[k]; }
  function show(el, on) { const v = on ? 'block' : 'none'; if (el.style.display !== v) el.style.display = v; return on; }
  const blur = (v) => (v > 0.05 ? `blur(${v.toFixed(2)}px)` : 'none');
  const $ = (id) => document.getElementById(id);
  function rng(s) { return () => ((s = Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5 | 0, ((s ^ (s >>> 7)) >>> 0) % 100000) / 100000); }
  function h(tag, cls, html, parent, style) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (style) e.style.cssText = style;
    if (parent) parent.appendChild(e);
    return e;
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  Object.assign(T, { clamp, lerp, inv, E, fade, bump, pulse, kf, st, show, blur, $, rng, h, esc });

  /* ---------------------------------------------------------------- timeline
     T.TL = fitted (or base) timeline: scenes [{id, start, end, base, map:[[b, r]...], pre, post}], lines, cues.
     Scene code works in BASE local seconds u (the English design); the warp maps real time to it. */
  function warpInv(map, r) { // real local -> base local (piecewise linear, slope-1 extrapolation)
    if (r <= map[0][1]) return map[0][0] + (r - map[0][1]);
    for (let i = 1; i < map.length; i++) {
      if (r <= map[i][1]) { const a = map[i - 1], b = map[i]; return a[0] + (b[0] - a[0]) * ((r - a[1]) / Math.max(1e-6, b[1] - a[1])); }
    }
    const l = map[map.length - 1]; return l[0] + (r - l[1]);
  }
  function warp(map, b) { // base local -> real local
    if (b <= map[0][0]) return map[0][1] + (b - map[0][0]);
    for (let i = 1; i < map.length; i++) {
      if (b <= map[i][0]) { const a = map[i - 1], c = map[i]; return a[1] + (c[1] - a[1]) * ((b - a[0]) / Math.max(1e-6, c[0] - a[0])); }
    }
    const l = map[map.length - 1]; return l[1] + (b - l[0]);
  }
  T.warp = warp; T.warpInv = warpInv;
  T.scene = (id) => T.TL.scenes.find((s) => s.id === id);
  // base-local cue time of a scene
  T.C = (sid, name) => { const c = T.BASE.scenes.find((s) => s.id === sid).cues[name]; if (!c) throw new Error(`cue ${sid}.${name}`); return typeof c === 'number' ? c : c.t; };
  // absolute real time of a cue
  T.R = (sid, name) => { const s = T.scene(sid); return s.start + warp(s.map, T.C(sid, name)); };
  T.capAt = (el, x, y, s, o) => { el.style.opacity = o.toFixed(3); el.style.transformOrigin = '0 0'; el.style.transform = `translate(${x.toFixed(1)}px,${(y - 32 * s).toFixed(1)}px) scale(${s.toFixed(4)})`; };
  T.dx = (v) => (T.RTLUI ? -v : v);
  // x of a fraction along a range/seek bar (RTL bars run right-to-left)
  T.along = (r, f) => (T.RTLUI ? r.x + r.w * (1 - f) : r.x + r.w * f);
  T.whip = (tc) => { const s = E.io(inv(-0.45, 0.45, tc)); return { s, b: 4 * s * (1 - s), on: tc > -0.45 && tc < 0.45 }; };
  T.D = (sid) => T.BASE.scenes.find((s) => s.id === sid).dur;
  // motion-blur filter for a whip of strength p (0..1); v = vertical
  T.mb = (p, v) => (p > 0.08 ? `url(#m${v ? 'v' : 'b'}${p < 0.4 ? 1 : p < 0.75 ? 2 : 3})` : 'none');
  T.local = (sid, t) => { const s = T.scene(sid); return warpInv(s.map, t - s.start); };

  /* ------------------------------------------------------------------ camera
     A rig holds a zoom container (CSS zoom K) so its content is laid out — and rasterised — at K x its nominal size;
     the camera scale S is nominal (S = 2 means "twice the UI's natural size on screen").
     c = [x, y, fx, fy, S, rx, ry, rz, z]: put nominal point (fx, fy) at screen (x, y). */
  function cam(rig, c, K) {
    const [x, y, fx, fy, S, rx = 0, ry = 0, rz = 0, z = 0] = c;
    rig.style.left = (x - fx * K).toFixed(2) + 'px';
    rig.style.top = (y - fy * K).toFixed(2) + 'px';
    rig.style.transformOrigin = `${(fx * K).toFixed(2)}px ${(fy * K).toFixed(2)}px`;
    rig.style.transform = `translateZ(${z.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${(S / K).toFixed(5)})`;
  }
  // a gentle handheld drift so nothing is ever perfectly still
  T.drift = (t, amt = 1) => [Math.sin(t * 0.61) * 0.35 * amt, Math.sin(t * 0.47 + 1.3) * 0.45 * amt];
  T.cam = cam;
  // build a scene: section > rig > zoom container (nominal world)
  T.world = function (id, K, w, h, persp = 2200) {
    const sec = h_('section', 'scene', null, $('scenes'));
    sec.id = 'sc-' + id;
    sec.style.perspective = persp + 'px';
    sec.style.display = 'block'; // visible while building so iframes lay out; main hides it afterwards
    const rig = h_('div', 'rig', null, sec);
    rig.style.width = w * K + 'px'; rig.style.height = h * K + 'px';
    const zw = h_('div', 'zw', null, rig);
    zw.style.zoom = K; zw.style.width = w + 'px'; zw.style.height = h + 'px';
    const top = h_('div', 'stop', null, sec); // screen-space layer above the rig
    return { sec, rig, zw, top, K, w, h };
  };
  const h_ = h;

  /* ------------------------------------------------------------------ cursor
     path: [[t, x, y, ease?, arc?]...] in nominal world coords; clicks: [t]; drags: [[down, up]]. */
  function cpos(t, P) {
    for (let i = P.length - 1; i > 0; i--) if (P[i - 1][0] > P[i][0] - 0.05) P[i - 1][0] = P[i][0] - 0.05;
    if (t <= P[0][0]) return [P[0][1], P[0][2]];
    for (let i = 1; i < P.length; i++) {
      const b = P[i];
      if (t <= b[0]) {
        const a = P[i - 1], e = (b[3] || E.io)(inv(a[0], b[0], t));
        let x = lerp(a[1], b[1], e), y = lerp(a[2], b[2], e);
        const dx = b[1] - a[1], dy = b[2] - a[2], d = Math.hypot(dx, dy), arc = (b[4] == null ? 0.1 : b[4]) * d * Math.sin(Math.PI * clamp(e));
        if (d > 1) { x += (-dy / d) * arc; y += (dx / d) * arc; }
        return [x, y];
      }
    }
    const l = P[P.length - 1]; return [l[1], l[2]];
  }
  T.cpos = cpos;
  const CUR_SVG = '<svg viewBox="0 0 34 34"><path d="M5 3L5 26L10.6 20.8L14.4 29.6L18.6 27.8L14.9 19.2L22.6 19.2Z" fill="#fff" stroke="#0b0b12" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  T.makeCursor = function (parent) {
    const rip = h('div', 'rip', null, parent);
    const rip2 = h('div', 'rip rip2', null, parent);
    const cur = h('div', 'cur', CUR_SVG, parent);
    return { cur, rip, rip2 };
  };
  // S = nominal camera scale (keeps the cursor ~34 px on screen); returns [x, y, press]
  T.cursor = function (C, t, P, clicks, drags, vis, S) {
    const [x, y] = cpos(t, P);
    let pr = 0;
    for (const c of clicks) pr = Math.max(pr, t < c ? E.o(inv(c - 0.12, c, t)) : 1 - E.o(inv(c, c + 0.18, t)));
    for (const [a, b] of drags) pr = Math.max(pr, Math.min(E.o(inv(a - 0.12, a, t)), 1 - E.o(inv(b, b + 0.18, t))));
    const k = 1 / Math.max(0.05, S);
    C.cur.style.opacity = vis.toFixed(3);
    C.cur.style.visibility = vis > 0.01 ? 'visible' : 'hidden';
    C.cur.style.transform = `translate(${(x - 5 * k).toFixed(2)}px,${(y - 3 * k).toFixed(2)}px) scale(${(k * (1 - 0.18 * pr)).toFixed(4)})`;
    let lc = -99;
    for (const c of clicks.concat(drags.map((d) => d[0]))) if (c <= t && c > lc) lc = c;
    const rp = inv(lc, lc + 0.6, t);
    if (rp < 1 && vis > 0.01) {
      const [rx, ry] = cpos(lc, P);
      C.rip.style.opacity = ((1 - rp) * 0.9 * vis).toFixed(3);
      C.rip.style.transform = `translate(${rx.toFixed(2)}px,${ry.toFixed(2)}px) scale(${(k * (0.25 + 1.0 * E.o(rp))).toFixed(4)})`;
      const rp2 = inv(lc + 0.08, lc + 0.75, t);
      C.rip2.style.opacity = ((1 - rp2) * 0.5 * vis * (rp2 > 0 ? 1 : 0)).toFixed(3);
      C.rip2.style.transform = `translate(${rx.toFixed(2)}px,${ry.toFixed(2)}px) scale(${(k * (0.3 + 1.7 * E.o(rp2))).toFixed(4)})`;
    } else { C.rip.style.opacity = 0; C.rip2.style.opacity = 0; }
    return [x, y, pr];
  };
  // press state of a target clicked at c (0..1 over ~0.3 s)
  T.press = (t, c) => (t < c - 0.1 ? 0 : t < c ? E.o(inv(c - 0.1, c, t)) : 1 - E.o(inv(c, c + 0.22, t)));
  // hover glow as the cursor approaches a click (anticipation)
  T.hover = (t, c, lead = 0.55, hold = 0.35) => fade(t, c - lead, c - 0.12, c + hold, c + hold + 0.3);

  /* ------------------------------------------------------------- word reveal */
  // words for display: whitespace split (keeps "&", "·", "—" as their own words); CJK via Intl.Segmenter
  T.tokens = function (text, lang) {
    if (lang === 'zh' || lang === 'ja') {
      // Intl.Segmenter words; punctuation glues to the previous word unless a space separates them ("recorder & player")
      const seg = new Intl.Segmenter(lang === 'zh' ? 'zh-Hans' : 'ja', { granularity: 'word' });
      const out = []; let pending = '';
      for (const p of seg.segment(text)) {
        if (/^\s+$/.test(p.segment)) { if (out.length) out[out.length - 1].space = true; continue; }
        const last = out[out.length - 1];
        if (p.isWordLike) { out.push({ w: pending + p.segment, space: false }); pending = ''; }
        else if (last && !last.space) last.w += p.segment;
        else if (last) out.push({ w: p.segment, space: false });
        else pending += p.segment;
      }
      if (pending) out.push({ w: pending, space: false });
      return out;
    }
    const out = []; const re = /\S+/g; let m;
    while ((m = re.exec(text))) out.push({ w: m[0], space: /\s/.test(text[m.index + m[0].length] || '') });
    return out;
  };
  T.splitWords = function (el, text, lang) {
    const toks = T.tokens(text, lang);
    el.innerHTML = toks.map((k, i) => `<span class="w">${esc(k.w)}</span>` + (k.space && i < toks.length - 1 ? ' ' : '')).join('');
    el._w = [...el.querySelectorAll('.w')];
  };
  T.words = function (el, t, t0, o = {}) {
    const W = el._w || (el._w = [...el.querySelectorAll('.w')]);
    const s = o.s ?? 0.06, d = o.d ?? 0.7, y = o.y ?? 26, b = o.b ?? 10;
    W.forEach((w, i) => {
      const p = inv(t0 + i * s, t0 + i * s + d, t), e = E.expo(p);
      w.style.opacity = clamp(p * 2.2).toFixed(3);
      w.style.transform = `translateY(${((1 - e) * y).toFixed(2)}px)`;
      w.style.filter = blur((1 - e) * b);
    });
  };
})();
