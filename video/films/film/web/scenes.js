'use strict';
/* Avorythm brand film — «Do you understand me now?». render(t) draws one frame; everything is a pure function of t. */
const DW = 1600, DH = 900;                                   // design space of a "video" card
const HERO_W = 1180, HERO_H = 664, CROWD_W = 900, CROWD_H = 506, GRID_W = 1000, GRID_H = 563, GAP = 70;
const OFF = {};
function off(id, w, h) {
  let o = OFF[id];
  if (!o || o.c.width < w || o.c.height < h) { const c = document.createElement('canvas'); c.width = Math.max(w, o ? o.c.width : 0); c.height = Math.max(h, o ? o.c.height : 0); o = OFF[id] = { c, x: c.getContext('2d') }; o.x.imageSmoothingQuality = 'high'; }
  return o;
}
let CARDS = [];
const CHAOS = [   // crowd card positions in act I (world units; hero at the origin), ry/roll in degrees
  { x: -1380, y: -560, z: 300, ry: 16, roll: -2 }, { x: 1500, y: -600, z: 700, ry: -14, roll: 2 }, { x: -1700, y: 600, z: 900, ry: 12, roll: 1 },
  { x: 1450, y: 640, z: 200, ry: -18, roll: -2 }, { x: -200, y: -1250, z: 2200, ry: 6, roll: 0 }, { x: 350, y: 1300, z: 2000, ry: -6, roll: 2 },
  { x: -2900, y: -100, z: 2800, ry: 22, roll: 0 }, { x: 3000, y: 100, z: 3000, ry: -22, roll: 0 }, { x: 1100, y: -1500, z: 3800, ry: 8, roll: 0 },
];
// grid cells (col, row) around the hero (centre cell); flips propagate from the centre outwards
const CELLS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1], [2, 0]];
const deg = (d) => d * Math.PI / 180;

function gridPos(col, row) {                                  // a curved wall (cylinder): side columns turn towards the axis
  const ang = col * deg(23), R = 3200;
  return { x: Math.sin(ang) * R, y: row * (GRID_H + GAP), z: (1 - Math.cos(ang)) * R, ry: -ang };
}
function wallYaw(t) {                                          // the whole wall turns so the camera sees it at three-quarters
  return deg(-15) * E.inOutCubic(prog(t, C.cascade, C.cascade + 1.9)) * (1 - 0.6 * E.inOutSine(prog(t, C.build - 0.2, C.gap - 0.45))) * (1 - E.inOutCubic(prog(t, C.gap - 0.45, C.gap)));
}
function yawed(P, phi) {
  if (!phi) return P;
  const c = Math.cos(phi), s = Math.sin(phi);
  return { ...P, x: P.x * c - P.z * s, z: P.x * s + P.z * c, ry: (P.ry || 0) + phi };
}

/* ======================================================================= card (one "video" with its voice and subtitles) */
function cardState(card, t) {
  const s = { hue: 0, mode: 'src', amp: 0, under: 0, srcWords: null, srcText: card.text, trWords: null, trText: null, badge: 0, edge: 0, reveal: true, dim: 0.0 };
  const flip = card.flipT;
  if (card.hero) {
    s.srcWords = words('hero_src');
    s.amp = env('hero_src', t) * 1.05;
    if (t >= C.click) {
      s.mode = 'dual'; s.hue = ease(t, C.click + 0.35, C.dub1 + 0.3, E.inOutSine);
      const second = t >= C.dub2 - 0.12;
      s.srcText = card.parts[second ? 1 : 0]; s.srcWords = null;
      s.trWords = words(second ? 'hero2' : 'hero1');
      s.trText = second ? COPY.say.hero2 : COPY.say.hero1;
      s.amp = env('hero1', t) + env('hero2', t);
      s.under = env('under_hero1', t);
      s.badge = prog(t, C.dub1 - 0.1, C.dub1 + 0.35);
      if (t < C.dub1 - 0.05) s.trWords = [];               // the card waits for the voice
      if (t > C.cascade + 0.5) { s.trWords = null; s.trText = COPY.say.hero2; s.srcText = card.parts[1]; }
    }
  } else {
    s.srcWords = words(card.clip);
    s.amp = env(card.clip, t) * 1.2;
    if (t >= C.click) { s.amp = 0.06; s.srcWords = null; s.dim = 0.25; }
    if (flip && t >= flip) {
      s.mode = 'dual'; s.hue = ease(t, flip, flip + 0.45, E.outCubic); s.dim = 0;
      s.trText = card.caption; s.badge = prog(t, flip + 0.1, flip + 0.5);
      s.edge = Math.exp(-Math.max(0, t - flip) / 0.35);
      s.amp = 0.16 + 0.55 * musicEnv(t);
      if (card.role === 'podcast') { s.trWords = words('dub_pod'); s.amp = env('dub_pod', t) + 0.12; s.under = env('under_pod', t); }
    }
  }
  return s;
}

/* draw a card in design units into context c (already transformed); src = canvas sampled for the frosted glass */
function drawCard(c, card, t, s, o = {}) {
  const { artBlur = 0, px = 1, label = 1 } = o;              // px = screen pixels per design unit (keeps lines thin)
  c.save();
  rr(c, 0, 0, DW, DH, 30); c.save(); c.clip();
  c.fillStyle = '#05060f'; c.fillRect(0, 0, DW, DH);
  if (artBlur > 0.5) c.filter = `blur(${artBlur.toFixed(1)}px)`;
  ART[card.kind](c, t + card.seed * 7, { title: card.title, lang: card.lang });
  c.filter = 'none';
  // grade: dark, slightly desaturated, purple before / cyan after translation
  c.fillStyle = `rgba(4,5,16,${(card.hero ? 0.3 : 0.22) + s.dim})`; c.fillRect(0, 0, DW, DH);
  c.globalCompositeOperation = 'saturation'; c.fillStyle = 'rgba(128,128,128,0.25)'; c.fillRect(0, 0, DW, DH);
  c.globalCompositeOperation = 'soft-light';
  c.fillStyle = rgba(mixc([110, 70, 255], [40, 230, 230], s.hue), 0.3); c.fillRect(0, 0, DW, DH);
  c.globalCompositeOperation = 'source-over';
  const gb = c.createLinearGradient(0, DH * 0.5, 0, DH); gb.addColorStop(0, 'rgba(3,4,14,0)'); gb.addColorStop(1, 'rgba(3,4,14,0.72)');
  c.fillStyle = gb; c.fillRect(0, 0, DW, DH);
  const gt = c.createLinearGradient(0, 0, 0, 140); gt.addColorStop(0, 'rgba(3,4,14,0.55)'); gt.addColorStop(1, 'rgba(3,4,14,0)');
  c.fillStyle = gt; c.fillRect(0, 0, DW, 140);
  if (o.dark > 0.003) { c.fillStyle = `rgba(2,2,8,${o.dark})`; c.fillRect(0, 0, DW, DH); }
  // the voice
  const lw = Math.max(1.3, 2.0 * Math.pow(px, 0.45)) / px;
  const amp = (14 + 150 * clamp(s.amp, 0, 1.4)) * (card.hero ? 1 : 0.9);
  if (s.under > 0.01) ribbon(c, DW / 2, DH * 0.42, 1150, (10 + 90 * s.under), t * 0.9, { hue: 0, strands: 3, seed: card.seed + 5, lw: lw * 0.9, alpha: 0.5 * s.hue });
  ribbon(c, DW / 2, DH * 0.42, 1150 * (o.ribbonW == null ? 1 : o.ribbonW), amp, t, { hue: s.hue, strands: 4, seed: card.seed, lw, alpha: 0.95, jitter: o.jitter || 0 });
  // playback bar
  const pp = (0.18 + card.seed * 0.53 + t * 0.006) % 1;
  c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(0, DH - 7, DW, 7);
  c.fillStyle = rgba(mixc([170, 120, 255], COL.cyan, s.hue), 0.95); c.fillRect(RTL ? DW * (1 - pp) : 0, DH - 7, DW * pp, 7);
  c.restore();
  // label pill: what it is · which language
  if (label > 0.01) {
    const L = `${COPY.kinds[card.kind]}  ·  ${CAST.nativeNames[card.lang]}`, fs = 30;
    const w = tw(L, fs, 600, LANG) + 78, x = RTL ? DW - 34 - w : 34;
    c.save(); c.globalAlpha *= label;
    rr(c, x, 30, w, 58, 29); c.fillStyle = 'rgba(6,8,22,0.62)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1.5; c.stroke();
    circle(c, RTL ? x + w - 30 : x + 30, 59, 7); c.fillStyle = rgba(mixc([255, 72, 96], COL.cyan, s.hue)); c.fill();
    txt(c, L, RTL ? x + w - 50 : x + 50, 61, { size: fs, weight: 600, color: [228, 232, 250], align: RTL ? 'right' : 'left', lang: LANG, dir: RTL ? 'rtl' : 'ltr' });
    c.restore();
  }
  if (s.badge > 0.01) {                                      // the dubbed badge
    const B = COPY.screen.dubbed, fs = 30, w = tw(B, fs, 700, LANG) + 98, x = RTL ? 34 : DW - 34 - w;
    c.save(); c.globalAlpha *= s.badge;
    rr(c, x, 30, w, 58, 29); c.fillStyle = 'rgba(20,70,80,0.55)'; c.fill(); c.strokeStyle = rgba(COL.cyan, 0.75); c.lineWidth = 2; c.stroke();
    const ix = RTL ? x + w - 38 : x + 34;
    for (let i = 0; i < 4; i++) { const h = [12, 24, 18, 10][i] * (0.6 + 0.6 * clamp(s.amp)); c.fillStyle = rgba(COL.cyan); rr(c, ix - 12 + i * 8, 59 - h / 2, 4.5, h, 2); c.fill(); }
    txt(c, B, RTL ? x + w - 64 : x + 62, 61, { size: fs, weight: 700, color: COL.cyanL, align: RTL ? 'right' : 'left', lang: LANG, dir: RTL ? 'rtl' : 'ltr' });
    c.restore();
  }
  subtitleCard(c, t, s, card, o);
  rr(c, 0.75, 0.75, DW - 1.5, DH - 1.5, 30);
  c.strokeStyle = rgba(mixc([200, 190, 255], COL.cyan, s.hue), 0.14 + 0.5 * s.edge); c.lineWidth = 2.5 + 4 * s.edge;
  if (s.edge > 0.02) { c.shadowColor = rgba(COL.cyan, s.edge); c.shadowBlur = 40 * s.edge; }
  c.stroke();
  c.restore();
}

/* the product's frosted subtitle card: source-only (foreign line big) or dual (source small + translation big) */
function subtitleCard(c, t, s, card, o) {
  const base = card.hero ? lerp(56, 80, card.gridT || 0) : 80;
  const srcLang = card.lang, trLang = LANG;
  const srcSize = s.mode === 'src' ? base : base * 0.68, srcW = s.mode === 'src' ? 650 : 500;
  const maxW = card.wide ? 1480 : card.hero ? 1240 : 1380;
  // what is visible
  let srcToks, srcVis;
  if (s.srcWords) { srcToks = s.srcWords.map((w) => ({ w: w.w, sp: !isCJK(srcLang) })); srcVis = s.srcWords.map((w) => clamp((t - w.t + 0.05) / 0.14)); }
  else { srcToks = tokenize(s.srcText.replace('|', ' '), srcLang); srcVis = srcToks.map(() => 1); }
  if (s.srcWords && !srcVis.some((v) => v > 0)) return;
  let trToks = null, trVis = null, trAct = null;
  if (s.mode === 'dual') {
    if (s.trWords) { trToks = s.trWords.map((w) => ({ w: w.w, sp: !isCJK(trLang) })); trVis = s.trWords.map((w) => clamp((t - w.t + 0.04) / 0.12)); trAct = s.trWords.map((w) => (t >= w.t - 0.02 && t <= w.t + w.d + 0.06 ? 1 : 0)); }
    else if (s.trText) { trToks = tokenize(s.trText, trLang); trVis = trToks.map(() => 1); trAct = trToks.map(() => 0); }
  }
  const k = base / 24;                                         // product card metrics scale with the font size
  const padT = 16 * k, padX = 22 * k, padB = 14 * k;
  let srcL;
  if (card.parts && s.mode === 'src' && s.srcWords) {          // the hero's two sentences sit on their own lines
    const n0 = tokenize(card.parts[0], srcLang).length;
    const cut = (() => { let acc = '', i = 0; const target = card.parts[0].replace(/\s/g, ''); while (i < srcToks.length && acc.length < target.length) { acc += srcToks[i].w.replace(/\s/g, ''); i++; } return i; })();
    const A = balancedLayout(srcToks.slice(0, cut), srcSize, srcW, srcLang, DW / 2, maxW - padX * 2);
    const B = balancedLayout(srcToks.slice(cut), srcSize, srcW, srcLang, DW / 2, maxW - padX * 2);
    B.lines.forEach((ln) => ln.items.forEach((it) => { it.i += cut; }));
    srcL = { lines: [...A.lines, ...B.lines] };
    void n0;
  } else srcL = balancedLayout(srcToks, srcSize, srcW, srcLang, DW / 2, maxW - padX * 2);
  const srcLH = srcSize * 1.5;
  const trSize = base, trL = trToks && trToks.length ? balancedLayout(trToks, trSize, 650, trLang, DW / 2, maxW - padX * 2) : null;
  const trLH = trSize * 1.55;
  const trLines = trL ? trL.lines.length : (s.mode === 'dual' ? 1 : 0);
  const textW = Math.max(...srcL.lines.map((l) => l.width), ...(trL ? trL.lines.map((l) => l.width) : [0]), 280 * k * 0.6);
  const w = Math.min(maxW, textW + padX * 2), h = padT + srcL.lines.length * srcLH + trLines * trLH + padB + (s.mode === 'dual' ? 4 * k : 0);
  const cx = DW / 2, y = DH - 52 - h, x = cx - w / 2;
  const appear = card.hero ? 1 : 1;
  glass(c, c.canvas, x, y, w, h, 20 * k, { blur: 24 * (o.px || 1) > 0 ? 24 : 24, alpha: appear, tintA: 0.84, border: 0.2, shadow: 0.38 });
  c.save();
  rr(c, cx - 22 * k, y + 6 * k, 44 * k, 5 * k, 9 * k); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fill();
  let yy = y + padT + srcLH / 2 + 2 * k;
  const srcCol = s.mode === 'src' ? [255, 255, 255] : [226, 232, 240];
  const srcA = s.mode === 'src' ? 1 : 0.72;
  srcL.lines.forEach((ln) => {
    ln.items.forEach((it) => {
      const v = srcVis[it.i]; if (v <= 0) return;
      txt(c, it.w, it.cx, yy + (1 - v) * 6, { size: srcSize, weight: srcW, color: srcCol, alpha: v * srcA, lang: srcLang });
    });
    yy += srcLH;
  });
  if (trL) {
    yy += 4 * k + (trLH - srcLH) / 2;
    trL.lines.forEach((ln) => {
      ln.items.forEach((it) => {
        const v = trVis[it.i]; if (v <= 0) return;
        const a = trAct[it.i];
        txt(c, it.w, it.cx, yy + (1 - v) * 8, { size: trSize, weight: 650, color: a ? mixc([255, 255, 255], COL.cyanL, 0.8) : [255, 255, 255], alpha: v, lang: trLang, glow: a ? 26 : 0, glowColor: COL.cyan });
      });
      yy += trLH;
    });
  }
  c.restore();
}

/* draw a card at plane P with the camera (offscreen + perspective + depth of field), or directly when it is big and flat */
function placeCard(card, P, cam, t, s, o = {}) {
  const pr = project(cam, P.x, P.y, P.z);
  if (!pr) return;
  const pxPerWorld = pr.s, worldPerDesign = P.w / DW, px = pxPerWorld * worldPerDesign;
  const bl = o.blur != null ? o.blur : coc(cam, pr.d);
  const flat = Math.abs(P.ry || 0) < 0.003 && !cam.roll;
  const alpha = o.alpha == null ? 1 : o.alpha;
  if (alpha <= 0.003) return;
  if (flat && (px > 0.62 || o.direct) && bl < 0.8) {       // big on screen: vector-draw straight into the frame (sharp at any scale)
    spill(card, s, pr, P, alpha);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(pr.x - DW / 2 * px, pr.y - DH / 2 * px); ctx.scale(px, px);
    drawCard(ctx, card, t, s, { ...o, px });
    ctx.restore();
    return;
  }
  spill(card, s, pr, P, alpha);
  const res = clamp(px * 1.15, 0.12, 1);                     // offscreen resolution (design -> pixels)
  const pw = Math.ceil(DW * res), ph = Math.ceil(DH * res);
  const O = off(card.id, pw, ph);
  O.x.setTransform(1, 0, 0, 1, 0, 0); O.x.clearRect(0, 0, O.c.width, O.c.height);
  O.x.setTransform(res, 0, 0, res, 0, 0);
  drawCard(O.x, card, t, s, { ...o, px: res });
  O.x.setTransform(1, 0, 0, 1, 0, 0);
  drawPlane(ctx, O.c, 0, 0, pw, ph, P, cam, { alpha, blur: bl });
}

const TICK0 = 0.3, TICK_DWELL = [0.22, 0.22, 0.24, 0.27, 0.32];
const TINT = { film: [110, 90, 230], lecture: [90, 160, 150], podcast: [255, 130, 90], news: [70, 130, 255], tutorial: [130, 120, 255], documentary: [60, 170, 230],
  stream: [230, 90, 190], talkshow: [255, 170, 120], cooking: [255, 140, 60], football: [90, 200, 120], talk: [255, 200, 150] };
function spill(card, s, pr, P, alpha) {                        // the screen's light falling into the dark around it
  const col = mixc(TINT[card.kind] || [120, 120, 255], COL.cyan, s.hue * 0.75);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  softLight(ctx, pr.x, pr.y, P.w * pr.s * 0.95, col, 0.075 * alpha * (0.7 + 0.6 * clamp(s.amp)));
  ctx.restore();
}

/* ======================================================================= background */
function background(t, cyan, purple, cam) {
  ctx.fillStyle = '#04050d'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(10,11,32,0.9)'); g.addColorStop(1, 'rgba(3,3,12,0.9)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const react = TL.music ? 0.82 + 0.3 * musicEnv(t) + 0.12 * clamp(pulse(t, ['kick', 'boom', 'dum', 'doum', 'taiko', 'ge', 'tanggu'], 0.18)) : 1;
  purple *= react; cyan *= react;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  softLight(ctx, 330 + 80 * Math.sin(t * 0.21), 700 + 50 * Math.sin(t * 0.17), 900, [80, 46, 210], 0.13 * purple);
  softLight(ctx, 1640 + 70 * Math.sin(t * 0.19 + 1), 330 + 60 * Math.sin(t * 0.23), 820, [30, 180, 200], 0.11 * cyan);
  softLight(ctx, 960, 540, 760, mixc([70, 40, 190], [20, 140, 160], cyan / (cyan + purple + 1e-6)), 0.05 * (cyan + purple));
  ctx.restore();
  dust(t, cam, 0.5 + 0.5 * Math.max(cyan, purple));
}
function dust(t, cam, a) {                                    // floating motes with parallax (they live in the 3D world)
  const r = rng(41);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 9000, y = (r() - 0.5) * 5000, z = -1200 + r() * 9000, sz = 2 + r() * 5, ph = r() * 6.28;
    const p = project(cam || { x: 0, y: 0, z: -1600 }, x + 60 * Math.sin(t * 0.13 + ph), y - t * 14 * (0.5 + r()), z);
    if (!p || p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80) continue;
    const rad = clamp(sz * p.s * 1.6, 0.8, 26), al = a * 0.32 * clamp(1.4 - p.d / 7000) * (0.6 + 0.4 * Math.sin(t * 0.8 + ph));
    softLight(ctx, p.x, p.y, rad * 3, [170, 170, 255], al * 0.5);
  }
  ctx.restore();
}

/* ======================================================================= ACT I + III: the world of voices */
function worldCam(t) {
  const cam = { x: 0, y: 0, z: -1600, roll: 0, focus: 1600, aperture: 26 };
  if (t < C.click) {
    // macro on the ribbon -> the card -> whip back -> drift -> rush forward
    const e0 = E.inOutSine(prog(t, 0, C.reveal + 0.5));
    cam.z = lerp(-330, -1750, e0) + 170 * E.inOutSine(prog(t, C.reveal + 0.3, C.whip + 0.2)); cam.y = lerp(-55, 0, e0);
    const w = E.inOutQuint(prog(t, C.whip, C.whip_end));
    cam.z = lerp(cam.z, -2750, w); cam.x = lerp(0, 60, w); cam.roll = deg(-1.2) * Math.sin(Math.PI * w);
    const drift = prog(t, C.whip_end, C.wall);
    cam.z += 300 * E.inOutSine(drift); cam.x += 120 * E.inOutSine(drift); cam.y += -50 * E.inOutSine(drift);
    const rush = E.inExpo(prog(t, C.wall, C.cut));
    cam.z = lerp(cam.z, 2600, rush); cam.x = lerp(cam.x, 60, rush);
    // focus: the card that started speaking most recently pulls focus
    let f = -cam.z;
    for (const card of CARDS.slice(1)) { const st = TL.clips[card.clip] ? TL.clips[card.clip].t : 99; const A = CHAOS[card.slot]; f = lerp(f, A.z - cam.z, smooth(prog(t, st - 0.1, st + 0.35))); }
    cam.focus = t < C.whip ? -cam.z : lerp(-cam.z, f, prog(t, C.whip, C.whip_end));
    cam.aperture = lerp(60, 18, prog(t, 0.2, 2.4)) * (1 - rush * 0.5) + 14 * (life(t, C.a, C.b, 0.4, 0.2) + life(t, C.b, C.cut, 0.3, 0.01));
    const sh = 18 * Math.pow(prog(t, 8.2, C.cut), 2);
    cam.x += sh * noise1(t * 13); cam.y += sh * noise1(t * 11 + 4); cam.roll += deg(0.6) * sh / 18 * noise1(t * 7);
  } else {
    // the hero card close, then the pull back into the ordered wall, the build and the push into the drop
    cam.z = lerp(-1520, -1330, E.inOutSine(prog(t, C.click, C.cascade)));
    const pull = E.inOutCubic(prog(t, C.cascade - 0.05, C.cascade + 1.9));
    cam.z = lerp(cam.z, -3350, pull); cam.x = lerp(0, 520, pull); cam.y = lerp(0, -60, pull);
    const glide = E.inOutSine(prog(t, C.cascade + 1.9, C.gap - 0.42));
    cam.z = lerp(cam.z, -3000, glide); cam.x = lerp(cam.x, -160, glide);
    const push = E.inExpo(prog(t, C.gap - 0.45, C.gap));
    cam.z = lerp(cam.z, -650, push); cam.x = lerp(cam.x, 0, push); cam.y = lerp(cam.y, 0, push);
    cam.focus = -cam.z; cam.aperture = lerp(20, 6, pull);
  }
  cam.x += 14 * Math.sin(t * 0.37) + 8 * Math.sin(t * 0.83); cam.y += 9 * Math.sin(t * 0.29 + 1); cam.roll += deg(0.25) * Math.sin(t * 0.21);
  return cam;
}

function heroPlane(t) {
  let P = { x: 0, y: 0, z: 0, w: HERO_W, h: HERO_H, ry: 0 };
  if (t >= C.click) {
    const g = E.inOutCubic(prog(t, C.cascade - 0.1, C.cascade + 1.5));
    P.w = lerp(HERO_W, GRID_W, g); P.h = lerp(HERO_H, GRID_H, g);
    const enter = E.outExpo(prog(t, C.click, C.click + 0.6));
    P.z = lerp(420, 0, enter);
    P = yawed(P, wallYaw(t));
  }
  return P;
}
function crowdPlane(card, t) {
  const A = CHAOS[card.slot], G = gridPos(...CELLS[card.slot]);
  const drift = t * 9;
  let P = { x: A.x + drift * Math.sign(A.x), y: A.y + drift * 0.4 * Math.sign(A.y), z: A.z, w: CROWD_W, h: CROWD_H, ry: deg(A.ry + 2.5 * Math.sin(t * 0.5 + card.slot)) };
  if (t >= C.click) {
    const g = E.inOutCubic(prog(t, card.flipT - 0.5, card.flipT + 0.55));
    const Gy = yawed(G, wallYaw(t));
    P = { x: lerp(P.x, Gy.x, g), y: lerp(P.y, Gy.y, g), z: lerp(P.z, Gy.z, g), w: lerp(CROWD_W, GRID_W, g), h: lerp(CROWD_H, GRID_H, g), ry: lerp(P.ry, Gy.ry, g) };
  }
  return P;
}

function sceneWorld(t) {
  const cam = worldCam(t);
  const cyan = t < C.click ? 0 : 0.6 + 0.4 * prog(t, C.cascade, C.build);
  const purple = t < C.click ? 0.6 + 0.6 * prog(t, C.whip, C.cut) : 0.35;
  background(t, cyan, purple, cam);
  const items = [];
  const heroCard = CARDS[0];
  items.push({ card: heroCard, P: heroPlane(t) });
  for (const card of CARDS.slice(1)) {
    const vis = t < C.click ? prog(t, C.whip - 0.1 + card.slot * 0.06, C.whip + 0.5 + card.slot * 0.06) : 1;
    if (vis <= 0) continue;
    const gone = card.slot >= 8 && t >= C.click ? 1 - prog(t, C.click, C.cascade) : 1;   // the ninth voice has no place on the wall
    if (gone <= 0) continue;
    items.push({ card, P: crowdPlane(card, t), alpha: vis * gone });
  }
  items.sort((a, b) => b.P.z - a.P.z);
  CARDS[0].gridT = t >= C.click ? E.inOutCubic(prog(t, C.cascade - 0.1, C.cascade + 1.5)) : 0;
  for (const it of items) {
    const s = cardState(it.card, t);
    const pr = project(cam, it.P.x, it.P.y, it.P.z);
    if (!pr || pr.d < 60) continue;
    let alpha = it.alpha == null ? 1 : it.alpha;
    alpha *= clamp((pr.d - 60) / 260);                           // fade when the camera flies through
    const o = { alpha, label: 1, jitter: t < C.click ? 0.25 * prog(t, 7, C.cut) : 0 };
    if (it.card.hero && t < C.whip + 0.6) { o.artBlur = lerp(14, 0, prog(t, 0.3, C.reveal)); o.label = prog(t, 1.5, 2.2); o.ribbonW = 0.3 + 0.7 * E.outCubic(prog(t, 0, 1.2)); o.dark = 0.78 * (1 - E.inOutSine(prog(t, 0.4, C.reveal))); }
    if (t >= C.click && t < C.cascade + 1.6 && !it.card.hero) o.alpha *= 0.55 + 0.45 * prog(t, it.card.flipT - 0.4, it.card.flipT);
    placeCard(it.card, it.P, cam, t, s, o);
  }
  // a cyan wave rolls out of the hero card when the translation reaches the wall
  if (t > C.cascade && t < C.build + 0.6) {
    const u = prog(t, C.cascade + 0.1, C.cascade + 1.8), hp = heroPlane(t), p = project(cam, hp.x, hp.y, hp.z);
    if (p && u > 0 && u < 1) { const r0 = Math.hypot(hp.w, hp.h) / 2 * p.s; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r0 + 1700 * E.outCubic(u), (r0 + 1700 * E.outCubic(u)) * 0.62, 0, 0, 7); ctx.strokeStyle = rgba(COL.cyan, 0.3 * (1 - u)); ctx.lineWidth = 2 + 8 * (1 - u); ctx.stroke(); ctx.restore(); }
  }
  // build: the wall breathes with the tremolo, then the push into light
  if (t > C.build) { const b = prog(t, C.build, C.gap); flash(0.1 * b * b + 0.06 * notePulse(t, 0.12) * b, [120, 255, 250]); }
  if (t > C.gap - 0.3 && t < C.gap) flash(E.inExpo(prog(t, C.gap - 0.3, C.gap)) * 0.9, [200, 255, 252]);
  // camera motion blur on the whips
  const wv = t > C.whip && t < C.whip_end ? Math.sin(Math.PI * prog(t, C.whip, C.whip_end)) : 0;
  if (wv > 0.05) zoomBlur(-0.08 * wv);
  if (t > C.wall && t < C.cut) zoomBlur(0.16 * E.inExpo(prog(t, C.wall, C.cut)));
  if (t > C.cascade && t < C.cascade + 1.9) zoomBlur(-0.03 * Math.sin(Math.PI * prog(t, C.cascade - 0.05, C.cascade + 1.9)));
  if (t > C.gap - 0.4) zoomBlur(0.2 * E.inExpo(prog(t, C.gap - 0.4, C.gap)));
}

/* headlines over the babel */
function headlines(t) {
  const aA = life(t, C.a, C.b - 0.05, 0.35, 0.25), bA = life(t, C.b, C.cut + 0.01, 0.3, 0.001);
  const sc = Math.max(aA, bA);
  if (sc <= 0) return;
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900);
  g.addColorStop(0, `rgba(3,3,12,${0.82 * sc})`); g.addColorStop(0.55, `rgba(3,3,12,${0.5 * sc})`); g.addColorStop(1, 'rgba(3,3,12,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (aA > 0) {                                                // "So many voices." — the last word echoes like a crowd
    const toks = tokenize(COPY.screen.a, LANG);
    const size = fitSize(COPY.screen.a, 132, 800, LANG, 1500);
    const L = layout(toks, size, 800, LANG, W / 2);
    L.lines[0].items.forEach((it, i) => {
      const e = E.outExpo(prog(t, C.a + i * 0.12, C.a + i * 0.12 + 0.6));
      const last = i === L.lines[0].items.length - 1;
      if (last) for (let k = 4; k >= 1; k--) {
        const ek = E.outCubic(prog(t, C.a + i * 0.12 + 0.15 + k * 0.07, C.a + 1.6 + k * 0.1));
        txt(ctx, it.w, it.cx + (RTL ? -1 : 1) * k * 26 * ek, H / 2 + k * 3 * ek, { size, weight: 800, lang: LANG, alpha: aA * e * 0.16 * (5 - k) / 4 * ek, color: COL.purpleL, blur: 1 + k * 1.5 });
      }
      txt(ctx, it.w, it.cx, H / 2 + (1 - e) * 46, { size, weight: 800, lang: LANG, alpha: aA * e, blur: (1 - e) * 12 });
    });
  }
  if (bA > 0) headlineB(t, bA);
}
/* "Not one you [understand]." — the word passes through other languages, one legible word at a time, then lands in yours */
function headlineB(t, bA) {
  const raw = COPY.screen.b, i0 = raw.indexOf('{'), i1 = raw.indexOf('}');
  const before = raw.slice(0, i0), key = raw.slice(i0 + 1, i1), after = raw.slice(i1 + 1);
  const plain = before + key + after;
  const items = tokenize(before.trim(), LANG).map((k) => ({ w: k.w, lang: LANG, key: false }));
  const seqW = SCRAMBLE_SEQ.concat([{ w: key, lang: LANG }]);
  // one size for the whole beat: the line must keep its margins with the WIDEST passing word too (short native words, e.g.
  // Hindi «समझ», otherwise let "verstehen" push the line to the frame edges)
  const lineAt = (s, w) => {
    const spS = isCJK(LANG) ? 0 : tw(' ', s, 800, LANG);
    const kS = w.lang === LANG ? s : Math.min(s, s * 640 / Math.max(1, tw(w.w, s, 800, w.lang)));
    return items.reduce((x, it) => x + tw(it.w, s, 800, it.lang), 0) + spS * Math.max(0, items.length - 1) + (items.length && before.endsWith(' ') ? spS : 0)
      + tw(w.w, kS, 800, w.lang) + (after ? tw(after, s, 800, LANG) : 0);
  };
  const size0 = fitSize(plain, 128, 800, LANG, 1560);
  const widest = Math.max(...seqW.map((w) => lineAt(size0, w)));
  const size = widest > 1600 ? size0 * 1600 / widest : size0;
  const t0 = C.b + 0.2, dwell = (C.settle - t0) / SCRAMBLE_SEQ.length;
  const idx = Math.max(0, Math.min(seqW.length - 1, Math.floor((t - t0) / dwell)));
  const tIn = t0 + idx * dwell;
  const f = idx === 0 ? 1 : E.outCubic(prog(t, tIn, tIn + 0.12));
  const cur = seqW[idx], prev = idx > 0 ? seqW[idx - 1] : null;
  // passing foreign words are capped at 640 px so the slot never balloons; the viewer's own word lands at the full line size
  // (the whole line already fits: size0 is fitted on the native sentence)
  const keySize = (w) => (w.lang === LANG ? size : Math.min(size, size * 640 / Math.max(1, tw(w.w, size, 800, w.lang))));
  const wOf = (w) => tw(w.w, keySize(w), 800, w.lang);
  const keyW = prev ? lerp(wOf(prev), wOf(cur), f) : wOf(cur);
  const sp = isCJK(LANG) ? 0 : tw(' ', size, 800, LANG);
  const widths = items.map((it) => tw(it.w, size, 800, it.lang));
  const gapKey = before.endsWith(' ') ? sp : 0;
  const afterW = after ? tw(after, size, 800, LANG) : 0;
  const total = widths.reduce((x, y) => x + y, 0) + sp * Math.max(0, items.length - 1) + (items.length ? gapKey : 0) + keyW + afterW;
  let pos = RTL ? W / 2 + total / 2 : W / 2 - total / 2;
  const sh = 4 * prog(t, 8.8, C.cut);
  const yB = H / 2;
  items.forEach((it, i) => {
    const cx = RTL ? pos - widths[i] / 2 : pos + widths[i] / 2;
    const e = E.outExpo(prog(t, C.b + i * 0.1, C.b + i * 0.1 + 0.5));
    txt(ctx, it.w, cx + sh * noise1(t * 31 + i * 3), yB + (1 - e) * 46 + sh * noise1(t * 27 + i * 5) * 0.6, { size, weight: 800, lang: it.lang, alpha: bA * e, blur: (1 - e) * 10 });
    pos += (RTL ? -1 : 1) * (widths[i] + (i < items.length - 1 ? sp : gapKey));
  });
  const k0 = pos;                                              // each word hangs from the leading edge of its slot, so a wider
  const eK = E.outExpo(prog(t, C.b + items.length * 0.1, C.b + items.length * 0.1 + 0.5));   // incoming word never runs into "you"
  const settled = idx === seqW.length - 1;
  const drawKey = (w, a, dy) => txt(ctx, w.w, (RTL ? k0 - wOf(w) / 2 : k0 + wOf(w) / 2) + sh * noise1(t * 29), yB + dy + (1 - eK) * 46, { size: keySize(w), weight: 800, lang: w.lang, alpha: bA * eK * a, color: COL.purpleL, glow: settled ? 34 : 22, glowColor: COL.magenta });
  if (prev && f < 1) drawKey(prev, 1 - f, -18 * f);
  drawKey(cur, f, 18 * (1 - f));
  pos += (RTL ? -1 : 1) * keyW;
  if (after) {
    const e = E.outExpo(prog(t, C.b + (items.length + 1) * 0.1, C.b + (items.length + 1) * 0.1 + 0.5));
    txt(ctx, after, pos, yB + (1 - e) * 46, { size, weight: 800, lang: LANG, alpha: bA * e, align: RTL ? 'right' : 'left', dir: RTL ? 'rtl' : 'ltr' });
  }
}

/* ======================================================================= ACT II: one click (the real popup) */
function scenePopup(t) {
  background(t, 0.15, 0.25, null);
  const P = IMG.popup, M = POPUP;
  const k = 920 / P.height * M.scale;                            // css px -> world units at the start (popup 920 px tall on screen)
  const inP = E.outExpo(prog(t, C.popup, C.popup + 0.7));
  const plane = { x: 0, y: 0, z: 0, w: P.width / M.scale * k, h: P.height / M.scale * k, ry: deg(lerp(-24, -5, inP)) };
  const toWorld = (r) => ({ x: (r.x + r.w / 2 - P.width / M.scale / 2) * k, y: (r.y + r.h / 2 - P.height / M.scale / 2) * k });
  const field = toWorld(M.select), btn = toWorld(M.button);
  const cam = { x: 0, y: 0, z: -1600, roll: 0, focus: 1600, aperture: 0 };
  const p1 = E.inOutCubic(prog(t, C.field - 0.2, C.field + 0.45)), p2 = E.inOutCubic(prog(t, C.toButton - 0.15, C.toButton + 0.5));
  cam.x = lerp(lerp(0, field.x * 0.55, p1), btn.x * 0.2, p2); cam.y = lerp(lerp(0, field.y, p1), btn.y, p2);
  cam.z = lerp(lerp(-1600, -760, p1), -900, p2);
  plane.ry = lerp(plane.ry, deg(-2), p1);
  const press = Math.exp(-Math.pow((t - C.click - 0.03) / 0.07, 2));
  const out = E.inCubic(prog(t, C.click + 0.06, C.click + 0.38));
  cam.z = lerp(cam.z, -260, out);
  cam.x += 6 * Math.sin(t * 0.7); cam.y += 4 * Math.sin(t * 0.9);
  const a = inP * (1 - out);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const cp = project(cam, 0, 0, 30);
  if (cp) softLight(ctx, cp.x, cp.y, 900 * cp.s, [100, 70, 255], 0.22 * a);
  ctx.restore();
  // shadow + the popup itself
  const box = drawPlane(ctx, P, 0, 0, P.width, P.height, plane, cam, { alpha: a, blur: 0, strips: 64 });
  // the language field pulses (the viewer's language is already chosen)
  const fp = project(cam, field.x, field.y, plane.z + Math.sin(plane.ry) * field.x);
  const pulseA = Math.exp(-Math.max(0, t - C.field - 0.25) / 0.45) * (t > C.field + 0.25 ? 1 : 0);
  if (fp && pulseA > 0.02) {
    const fw = M.select.w * k * fp.s, fh = M.select.h * k * fp.s;
    ctx.save(); rr(ctx, fp.x - fw / 2, fp.y - fh / 2, fw, fh, 11 * k * fp.s);
    ctx.strokeStyle = rgba(COL.cyan, 0.9 * pulseA * a); ctx.lineWidth = 3; ctx.shadowColor = rgba(COL.cyan, pulseA); ctx.shadowBlur = 30; ctx.stroke(); ctx.restore();
  }
  // press feedback on the real button
  const bp = project(cam, btn.x, btn.y, plane.z + Math.sin(plane.ry) * btn.x);
  if (bp) {
    const bw = M.button.w * k * bp.s, bh = M.button.h * k * bp.s;
    const hover = prog(t, C.click - 0.3, C.click - 0.1);
    ctx.save(); ctx.globalAlpha = a;
    rr(ctx, bp.x - bw / 2, bp.y - bh / 2, bw, bh, 14 * k * bp.s);
    ctx.fillStyle = `rgba(255,255,255,${0.06 * hover + 0.12 * press})`; ctx.fill();
    if (t > C.click) { ctx.fillStyle = rgba(COL.cyan, 0.55 * Math.exp(-(t - C.click) / 0.16)); ctx.fill(); }
    ctx.restore();
    // cursor
    const cpos = E.inOutCubic(prog(t, C.toButton, C.click - 0.12));
    const cx = lerp(W + 140, bp.x + bw * 0.18, cpos), cy = lerp(H + 120, bp.y + bh * 0.1, cpos);
    const ca = prog(t, C.toButton, C.toButton + 0.2) * (1 - prog(t, C.click + 0.1, C.click + 0.3));
    if (ca > 0) { ctx.save(); ctx.globalAlpha = ca; cursor(cx, cy, 1.5 * (1 - 0.14 * press)); ctx.restore(); }
    if (t > C.click) {                                         // shockwave
      const u = prog(t, C.click, C.click + 0.8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      circle(ctx, bp.x, bp.y, 40 + 2000 * E.outExpo(u)); ctx.strokeStyle = rgba(COL.cyanL, 0.6 * (1 - u)); ctx.lineWidth = 1.5 + 4 * (1 - u); ctx.stroke();
      glowDot(ctx, bp.x, bp.y, 520, COL.cyan, 0.85 * Math.exp(-(t - C.click) / 0.18));
      ctx.restore();
    }
  }
  if (out > 0.02) zoomBlur(0.12 * out);
}
function cursor(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(7.5, 23.5); ctx.lineTo(12.5, 35); ctx.lineTo(18, 32.6); ctx.lineTo(13, 21.5); ctx.lineTo(22.5, 21.5); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4; ctx.fillStyle = '#fff'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
}

/* ======================================================================= the drop: thesis */
function beatGlow(t) { return pulse(t, ['kick', 'boom', 'dum', 'doum', 'taiko', 'bass'], 0.16); }
function wideRibbons(t, y, a, w = 2000) {
  const k = clamp(beatGlow(t), 0, 1.5), m = musicEnv(t);
  ribbon(ctx, W / 2, y, w, (40 + 70 * m + 50 * k) * a, t * 1.2, { hue: 0.15, strands: 3, seed: 3, alpha: 0.35 * a, lw: 1.5, glowMul: 1.2 });
  ribbon(ctx, W / 2, y, w, (40 + 70 * m + 55 * k) * a, t * 1.2 + 2, { hue: 1, strands: 4, seed: 7, alpha: 0.75 * a, lw: 1.6, glowMul: 1.2 });
}
function sceneDrop(t) {
  background(t, 1, 0.45, null);
  const T0 = C.drop, out = E.inCubic(prog(t, C.browser - 0.35, C.browser + 0.05));
  flash(0.42 * Math.exp(-(t - T0) / 0.16), [150, 245, 245]);
  const push = 1 + 0.05 * prog(t, T0, C.browser) + 0.25 * out;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  wideRibbons(t, lerp(600, 880, E.outExpo(prog(t, T0, T0 + 0.9))), 0.85 * (1 - out));
  ctx.globalAlpha = 1 - out;
  const l1 = COPY.screen.drop1, raw2 = COPY.screen.drop2, key = raw2.match(/\{(.+?)\}/)[1], l2 = raw2.replace(/[{}]/g, '');
  const s1 = fitSize(l1, 92, 250, LANG, 1500), s2 = fitSize(l2, 156, 800, LANG, 1700);
  const y1 = 400, y2 = 400 + s1 * 0.62 + s2 * 0.72;
  const T1 = tokenize(l1, LANG), L1 = layout(T1, s1, 250, LANG, W / 2);
  L1.lines[0].items.forEach((it, i) => { const e = E.outExpo(prog(t, T0 + 0.05 + i * 0.09, T0 + 0.6 + i * 0.09)); txt(ctx, it.w, it.cx, y1 + (1 - e) * 30, { size: s1, weight: 250, lang: LANG, alpha: e, blur: (1 - e) * 10 }); });
  const T2 = tokenize(l2, LANG), L2 = layout(T2, s2, 800, LANG, W / 2);
  const keyset = tokenize(key, LANG).map((k) => k.w);
  const beat = TL.bar / 4;
  // gradient across the key words
  const keyItems = L2.lines[0].items.filter((it) => keyset.includes(it.w) || keyset.includes(it.w.replace(/[.。!،]$/, '')));
  const kx0 = Math.min(...keyItems.map((i) => i.x0)), kx1 = Math.max(...keyItems.map((i) => i.x1));
  L2.lines[0].items.forEach((it, i) => {
    const t0 = T0 + 2 * beat + i * 0.09;
    const e = E.outExpo(prog(t, t0, t0 + 0.5));
    const isKey = keyItems.includes(it);
    let fill = null;
    if (isKey) { const g = ctx.createLinearGradient(kx0, 0, kx1, 0); g.addColorStop(RTL ? 1 : 0, rgba(COL.cyan)); g.addColorStop(RTL ? 0 : 1, rgba([170, 150, 255])); fill = g; }
    const sc = lerp(1.25, 1, e);
    ctx.save(); ctx.translate(it.cx, y2); ctx.scale(sc, sc);
    txt(ctx, it.w, 0, (1 - e) * 20, { size: s2, weight: 800, lang: LANG, alpha: e, fill, blur: (1 - e) * 14, glow: isKey ? 36 * (0.6 + 0.4 * clamp(beatGlow(t))) : 0, glowColor: COL.cyan });
    ctx.restore();
  });
  // a slow specular sweep across the title
  const sw = prog(t, T0 + 2.0, T0 + 3.0);
  if (sw > 0 && sw < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const x = lerp(-200, W + 200, sw); const g = ctx.createLinearGradient(x - 160, 0, x + 160, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, y1 - 100, W, y2 - y1 + 220); ctx.restore(); }
  ctx.restore();
  if (out > 0.02) zoomBlur(0.18 * out);
}

/* ======================================================================= browser: live dubbing + dual subtitles */
const BROWSER = { w: 1600, h: 1012 };
function drawBrowser(c, t, s) {
  const Wd = BROWSER.w, Hd = BROWSER.h, top = 112;
  c.save();
  rr(c, 0, 0, Wd, Hd, 22); c.save(); c.clip();
  c.fillStyle = '#0d1020'; c.fillRect(0, 0, Wd, Hd);
  c.fillStyle = '#141831'; c.fillRect(0, 0, Wd, 56); c.fillStyle = '#1a1f3c'; c.fillRect(0, 56, Wd, 56);
  [['#ff5f57', 0], ['#febc2e', 1], ['#28c840', 2]].forEach(([col, i]) => { circle(c, 28 + i * 22, 28, 7); c.fillStyle = col; c.fill(); });
  rr(c, 104, 10, 360, 46, [12, 12, 0, 0]); c.fillStyle = '#1a1f3c'; c.fill();
  circle(c, 128, 33, 9); c.fillStyle = '#ff3d5a'; c.fill();
  txt(c, BROWSER_TAB, 148, 34, { size: 19, weight: 500, color: [220, 224, 240], align: 'left', lang: TL.roleLang.lecture });
  // speaker icon on the active tab (audio is playing)
  c.strokeStyle = rgba(COL.cyan); c.lineWidth = 2; c.beginPath(); c.arc(436, 33, 6, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(436, 33, 11, -0.9, 0.9); c.stroke();
  rr(c, 104, 66, Wd - 330, 36, 18); c.fillStyle = 'rgba(255,255,255,0.06)'; c.fill();
  txt(c, 'lecture.example.com/neural-networks', 136, 85, { size: 18, weight: 450, color: [170, 178, 205], align: 'left', lang: 'en' });
  // toolbar: the Avorythm extension, lit
  const lit = s.ext;
  if (IMG.logo) { c.save(); c.globalAlpha = 0.6 + 0.4 * lit; glowDot(c, Wd - 172, 84, 46, COL.cyan, 0.5 * lit); c.drawImage(IMG.logo, Wd - 190, 66, 36, 36); c.restore(); }
  circle(c, Wd - 157, 98, 5); c.fillStyle = rgba(COL.cyan, lit); c.fill();
  for (let i = 0; i < 2; i++) { circle(c, Wd - 110 + i * 40, 84, 13); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fill(); }
  // the video
  c.save(); c.translate(0, top); c.beginPath(); c.rect(0, 0, DW, DH); c.clip();
  ART.lecture(c, t, { title: LECTURE_TITLE[TL.roleLang.lecture], lang: TL.roleLang.lecture });
  c.fillStyle = 'rgba(4,5,16,0.18)'; c.fillRect(0, 0, DW, DH);
  const gb = c.createLinearGradient(0, DH * 0.55, 0, DH); gb.addColorStop(0, 'rgba(3,4,14,0)'); gb.addColorStop(1, 'rgba(3,4,14,0.6)'); c.fillStyle = gb; c.fillRect(0, 0, DW, DH);
  // player controls
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(30, DH - 34, DW - 60, 5);
  c.fillStyle = '#ff3d5a'; c.fillRect(30, DH - 34, (DW - 60) * (0.31 + (t - C.browser) * 0.004), 5);
  c.restore();
  c.restore();
  rr(c, 0.75, 0.75, Wd - 1.5, Hd - 1.5, 22); c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 2; c.stroke();
  c.restore();
}
function sceneBrowser(t) {
  background(t, 0.85, 0.35, null);
  const T0 = C.browser, inP = E.outExpo(prog(t, T0 - 0.25, T0 + 0.7)), out = E.inCubic(prog(t, C.desktop - 0.4, C.desktop + 0.02));
  const hOut = E.inOutCubic(prog(t, C.lec + 1.5, C.lec + 2.1));
  headline(t, COPY.screen.browserH, COPY.screen.browserS, T0 + 0.1, Math.max(out, hOut));
  // camera: the browser rises in at an angle, then we push into the dual subtitles
  const push = E.inOutCubic(prog(t, C.lec + 1.3, C.desktop - 0.2));
  const P = { x: 0, y: 150, z: 0, w: 1100, h: 1100 * BROWSER.h / BROWSER.w, ry: deg(lerp(-17, -5, E.outCubic(prog(t, T0, C.lec + 1.6)))) };
  P.ry = lerp(P.ry, 0, push);
  const subY = P.y + P.h * ((112 + DH - 150) / BROWSER.h - 0.5);           // where the subtitle card sits on the plane
  const cam = { x: lerp(-280, 0, inP) + 640 * out + 6 * Math.sin(t * 0.6), y: lerp(0, subY - 40, push), z: lerp(-1600, -760, push), roll: 0 };
  const O = off('browser', BROWSER.w, BROWSER.h);
  O.x.setTransform(1, 0, 0, 1, 0, 0); O.x.clearRect(0, 0, BROWSER.w, BROWSER.h);
  drawBrowser(O.x, t, { ext: prog(t, T0 + 0.3, T0 + 0.6) });
  O.x.save(); O.x.translate(0, 112);
  const s = { hue: 1, mode: 'dual', srcText: CAST.originals[`lecture.${TL.roleLang.lecture}`], srcWords: null, trWords: words('dub_lec'), trText: null, badge: 0, edge: 0 };
  if (t < C.lec - 0.05) s.trWords = [];
  subtitleCard(O.x, t, s, { hero: true, lang: TL.roleLang.lecture, wide: true }, { px: 1 });
  const B = COPY.screen.dubbed, fs = 30, bw = tw(B, fs, 700, LANG) + 98, bx = RTL ? 34 : DW - 34 - bw, ba = prog(t, C.lec - 0.2, C.lec + 0.2);
  O.x.globalAlpha = ba; rr(O.x, bx, 30, bw, 58, 29); O.x.fillStyle = 'rgba(20,70,80,0.6)'; O.x.fill(); O.x.strokeStyle = rgba(COL.cyan, 0.75); O.x.lineWidth = 2; O.x.stroke();
  const am = env('dub_lec', t), ix = RTL ? bx + bw - 38 : bx + 34;
  for (let i = 0; i < 4; i++) { const h = [12, 24, 18, 10][i] * (0.6 + 0.8 * am); O.x.fillStyle = rgba(COL.cyan); rr(O.x, ix - 12 + i * 8, 59 - h / 2, 4.5, h, 2); O.x.fill(); }
  txt(O.x, B, RTL ? bx + bw - 64 : bx + 62, 61, { size: fs, weight: 700, color: COL.cyanL, align: RTL ? 'right' : 'left', lang: LANG, dir: RTL ? 'rtl' : 'ltr' });
  O.x.restore();
  ctx.save(); ctx.globalAlpha = inP * (1 - out);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const cp = project(cam, 0, P.y, 0); if (cp) softLight(ctx, cp.x, cp.y, 1100, [40, 160, 200], 0.12); ctx.restore();
  drawPlane(ctx, O.c, 0, 0, BROWSER.w, BROWSER.h, P, cam, { alpha: 1, blur: 0, strips: 72 });
  ctx.restore();
  if (inP < 1) dirBlur(140 * (1 - inP), 0);
  if (out > 0.02) dirBlur(-260 * out, 0);
}
function headline(t, h, sub, t0, out = 0, y = 128) {
  const hs = fitSize(h, 66, 760, LANG, 1600), ss = fitSize(sub, 36, 420, LANG, 1600);
  const toks = tokenize(h, LANG), L = layout(toks, hs, 760, LANG, W / 2);
  L.lines[0].items.forEach((it, i) => { const e = E.outExpo(prog(t, t0 + i * 0.06, t0 + 0.55 + i * 0.06)); txt(ctx, it.w, it.cx, y + (1 - e) * 24 - out * 30, { size: hs, weight: 760, lang: LANG, alpha: e * (1 - out), blur: (1 - e) * 8 }); });
  const e2 = E.outExpo(prog(t, t0 + 0.45, t0 + 1.0));
  txt(ctx, sub, W / 2, y + hs * 0.5 + 40 + (1 - e2) * 16 - out * 30, { size: ss, weight: 420, color: [180, 188, 222], lang: LANG, alpha: e2 * (1 - out) });
}

/* ======================================================================= desktop: any app, any file */
function sceneDesktop(t) {
  background(t, 0.8, 0.45, null);
  const T0 = C.desktop, inP = E.outExpo(prog(t, T0 - 0.25, T0 + 0.75)), out = E.inCubic(prog(t, C.langs - 0.38, C.langs + 0.02));
  const hOut = E.inOutCubic(prog(t, T0 + 0.95, T0 + 1.4));
  headline(t, COPY.screen.desktopH, COPY.screen.desktopS, T0 + 0.05, Math.max(out, hOut));
  // the platforms, right under the headline
  const plats = [['windows', 'Windows'], ['apple', 'macOS'], ['linux', 'Linux']];
  const pw = plats.map(([, n]) => tw(n, 26, 600, 'en') + 46), ptot = pw.reduce((a, b) => a + b, 0) + 2 * 40;
  let px = W / 2 - ptot / 2;
  plats.forEach(([ic, name], i) => {
    const e = E.outExpo(prog(t, T0 + 0.35 + i * 0.1, T0 + 0.85 + i * 0.1)) * (1 - Math.max(out, hOut));
    if (e > 0) {
      const y = 262 + (1 - e) * 14;
      if (IMG['os_' + ic]) { ctx.save(); ctx.globalAlpha = e * 0.9; ctx.drawImage(IMG['os_' + ic], px, y - 14, 28, 28); ctx.restore(); }
      txt(ctx, name, px + 40, y + 1, { size: 26, weight: 600, color: [200, 207, 232], alpha: e, align: 'left', lang: 'en', dir: 'ltr' });
    }
    px += pw[i] + 40;
  });
  const A = IMG.app, M = APP;
  const O = off('monitor', A.width + 88, A.height + 88);
  const ox = O.x; ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, O.c.width, O.c.height);
  rr(ox, 0, 0, A.width + 88, A.height + 88, 40); ox.fillStyle = '#0b0c12'; ox.fill(); ox.strokeStyle = 'rgba(255,255,255,0.16)'; ox.lineWidth = 3; ox.stroke();
  ox.save(); rr(ox, 44, 44, A.width, A.height, 12); ox.clip(); ox.drawImage(A, 44, 44);
  const k = M.scale, lang0 = TL.roleLang.documentary;
  const srcW = words('under_doc'), dubW = words('dub_doc');
  const box = (r) => ({ x: 44 + r.x * k + 6 * k, y: 44 + r.y * k + 4 * k, w: r.w * k - 12 * k, h: r.h * k });
  transcriptText(ox, srcW, lang0, box(M.source), t, 17 * k, false);
  transcriptText(ox, dubW, LANG, box(M.translated), t, 17 * k, true);
  ox.restore();
  // plane + camera: the whole app under the headline, then push in so its UI reads: first the live status, then the transcript
  const mw = 1180, scale = mw / A.width;
  const P = { x: 0, y: 150, z: 0, w: (A.width + 88) * scale, h: (A.height + 88) * scale, ry: 0 };
  const css = (cx, cy) => ({ x: (cx * k + 44 - (A.width + 88) / 2) * scale, y: P.y + (cy * k + 44 - (A.height + 88) / 2) * scale });
  const u0 = Math.min(M.source.x, M.translated.x), u1 = Math.max(M.source.x + M.source.w, M.translated.x + M.translated.w);
  const K0 = { x: 0, y: P.y - P.h / 2 + 171, z: -1300 };
  const k1 = css(720, 330), K1 = { x: k1.x, y: k1.y, z: -800 };
  const k2 = css((u0 + u1) / 2, M.source.y + M.source.h / 2 - 8), K2 = { x: k2.x, y: k2.y, z: -690 };
  const m1 = E.inOutCubic(prog(t, T0 + 1.0, T0 + 1.95)), m2 = E.inOutCubic(prog(t, T0 + 2.15, T0 + 3.25));
  const cam = { x: lerp(lerp(K0.x, K1.x, m1), K2.x, m2) + 260 * (1 - inP) - 500 * out, y: lerp(lerp(K0.y, K1.y, m1), K2.y, m2), z: lerp(lerp(K0.z, K1.z, m1), K2.z, m2) + 40 * Math.sin(t * 0.5), roll: 0 };
  P.ry = deg(lerp(11, 0, E.outCubic(prog(t, T0 - 0.2, T0 + 1.9))));
  ctx.save(); ctx.globalAlpha = inP * (1 - out);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const cp = project(cam, 0, P.y, 0); if (cp) softLight(ctx, cp.x, cp.y, 1100, [90, 70, 230], 0.12); ctx.restore();
  const box2 = drawPlane(ctx, O.c, 0, 0, O.c.width, O.c.height, P, cam, { alpha: 1, blur: 0, strips: 72 });
  ctx.restore();
  // a video file drops into the app
  const fp = prog(t, C.file, C.file + 0.8);
  if (fp > 0 && fp < 1 && box2) {
    const e = E.outCubic(fp), x = lerp(W + 160, (box2.x0 + box2.x1) / 2 + (RTL ? -1 : 1) * 120, e), y = lerp(300, box2.y0 + (box2.y1 - box2.y0) * 0.55, e) - 120 * Math.sin(Math.PI * e);
    fileChip(x, y, 1 - 0.3 * e, (1 - prog(fp, 0.86, 1)) * (1 - out), t);
    if (fp > 0.86) { const r = prog(fp, 0.86, 1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.ellipse(x, y, 160 + 220 * r, 60 + 90 * r, 0, 0, 7); ctx.strokeStyle = rgba([170, 150, 255], 0.45 * (1 - r)); ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
  }
  if (inP < 1) dirBlur(-120 * (1 - inP), 0);
  if (out > 0.02) zoomBlur(-0.1 * out);
}
function transcriptText(c, ws, lang, b, t, size, cyan) {
  const toks = ws.map((w) => ({ w: w.w, sp: !isCJK(lang) }));
  const rtl = isRTL(lang);
  const L = layout(toks, size, 500, lang, b.x + b.w / 2, b.w);
  let y = b.y + size * 1.2;
  L.lines.forEach((ln) => {
    const shift = rtl ? (b.x + b.w) - Math.max(...ln.items.map((i) => i.x1)) : b.x - Math.min(...ln.items.map((i) => i.x0));
    ln.items.forEach((it) => {
      const w = ws[it.i], v = clamp((t - w.t + 0.05) / 0.14);
      if (v <= 0) return;
      const act = cyan && t >= w.t && t <= w.t + w.d + 0.05;
      txt(c, it.w, it.cx + shift, y, { size, weight: 500, color: act ? COL.cyanL : cyan ? [240, 242, 255] : [190, 196, 214], alpha: v, lang, glow: act ? 12 : 0, glowColor: COL.cyan });
    });
    y += size * 1.65;
  });
}
function fileChip(x, y, s, a, t) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  rr(ctx, -150, -46, 300, 92, 20); ctx.fillStyle = 'rgba(22,26,48,0.96)'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(160,140,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  if (IMG.fileVideo) ctx.drawImage(IMG.fileVideo, -130, -24, 48, 48);
  txt(ctx, 'ocean.mp4', -66, -8, { size: 26, weight: 650, color: COL.white, align: 'left', lang: 'en', dir: 'ltr' });
  txt(ctx, '1.2 GB', -66, 22, { size: 20, weight: 450, color: COL.muted, align: 'left', lang: 'en', dir: 'ltr' });
  ctx.restore();
}

/* ======================================================================= 79 languages */
function sceneLangs(t) {
  background(t, 0.9, 0.55, null);
  const T0 = C.langs, out = E.inCubic(prog(t, C.free - 0.3, C.free + 0.02));
  const e = E.outExpo(prog(t, T0 - 0.22, T0 + 0.45));
  const n = COPY.screen.langsN, word = COPY.screen.langsW;
  const ns = 380, ws_ = fitSize(word, 92, 300, LANG, 700);
  const nw = tw(n, ns, 800, LANG);
  const dir = RTL ? -1 : 1;
  const colW = Math.max(tw(word, ws_, 300, LANG), Math.min(520, Math.max(...TICKER.map((e2) => tw(e2.name, 64, 750, e2.lang))))), gtot = nw + 60 + colW;
  const nx = W / 2 - dir * (gtot / 2 - nw / 2), gx = nx + dir * (nw / 2 + 60);
  ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate(W / 2, H / 2); const sc = lerp(1.18, 1, e) + 0.6 * out; ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
  const g = ctx.createLinearGradient(nx - nw / 2, 300, nx + nw / 2, 760); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, rgba(COL.cyanL)); g.addColorStop(1, rgba(COL.cyan));
  txt(ctx, n, nx, H / 2 + 10, { size: ns, weight: 800, lang: LANG, fill: g, alpha: e, blur: (1 - e) * 16, glow: 40, glowColor: [40, 200, 210] });
  txt(ctx, word, gx, H / 2 - 120, { size: ws_, weight: 300, lang: LANG, align: RTL ? 'right' : 'left', alpha: E.outExpo(prog(t, T0 + 0.2, T0 + 0.8)) });
  // a ticker of language names (each fully readable, one at a time) that lands on the viewer's language
  const seq = TICKER, y0 = H / 2 + 50;
  let tt = T0 + TICK0;
  seq.forEach((L_, i) => {
    const last = i === seq.length - 1, t0 = tt, t1 = last ? 1e9 : tt + TICK_DWELL[i];
    tt = t1;
    const fin = E.outCubic(prog(t, t0, t0 + 0.08)), fout = last ? 0 : E.inCubic(prog(t, t1 - 0.07, t1));
    const a = fin * (1 - fout);
    if (a <= 0.003) return;
    const dy = (1 - fin) * 24 - fout * 24;
    const pop = last ? lerp(1.12, 1, E.outBack(prog(t, t0, t0 + 0.35))) : 1;
    const sz = Math.min(64, 64 * 520 / Math.max(1, tw(L_.name, 64, last ? 750 : 500, L_.lang)));
    ctx.save(); ctx.translate(gx, y0 + dy); ctx.scale(pop, pop);
    txt(ctx, L_.name, 0, 0, { size: sz, weight: last ? 750 : 500, lang: L_.lang, align: RTL ? 'right' : 'left', color: last ? COL.cyanL : [214, 220, 240], alpha: a * (last ? 1 : 0.85), glow: last ? 26 : 0, glowColor: COL.cyan, dir: RTL ? 'rtl' : 'ltr' });
    ctx.restore();
  });
  ctx.restore();
  if (out > 0.02) zoomBlur(0.14 * out);
}

/* ======================================================================= free + open source */
function sceneFree(t) {
  background(t, 1, 0.6, null);
  const T0 = C.free, out = E.inCubic(prog(t, C.brk - 0.5, C.brk));
  wideRibbons(t, 830, 0.55 * (1 - out));
  ctx.save(); ctx.globalAlpha = 1 - out;
  const a = E.outExpo(prog(t, T0, T0 + 0.45)), b = E.outExpo(prog(t, C.free2, C.free2 + 0.45));
  flash(0.3 * Math.exp(-Math.max(0, t - T0) / 0.12) * (t >= T0 ? 1 : 0) + 0.25 * Math.exp(-Math.max(0, t - C.free2) / 0.12) * (t >= C.free2 ? 1 : 0), [210, 220, 255]);
  const f1 = COPY.screen.free1, f2 = COPY.screen.free2;
  const s = Math.min(fitSize(f1 + '  ' + f2, 150, 800, LANG, 1600), 150);
  const w1 = tw(f1, s, 800, LANG), w2 = tw(f2, s, 800, LANG), gap = s * 0.55, tot = w1 + w2 + gap;
  const dir = RTL ? -1 : 1;
  const c1 = W / 2 - dir * (tot / 2 - w1 / 2), c2 = W / 2 + dir * (tot / 2 - w2 / 2);
  txt(ctx, f1, c1, 470, { size: s * lerp(1.35, 1, a), weight: 800, lang: LANG, alpha: a, blur: (1 - a) * 16 });
  txt(ctx, f2, c2, 470, { size: s * lerp(1.35, 1, b), weight: 800, lang: LANG, alpha: b, blur: (1 - b) * 16, glow: 36 * b, glowColor: COL.cyan, color: mixc(COL.white, COL.cyanL, 0.35) });
  const e3 = E.outExpo(prog(t, C.freeS, C.freeS + 0.6));
  const ss = fitSize(COPY.screen.freeS, 40, 420, LANG, 1500);
  txt(ctx, COPY.screen.freeS, W / 2, 620 + (1 - e3) * 18, { size: ss, weight: 420, color: [190, 198, 228], lang: LANG, alpha: e3 });
  const e4 = E.outExpo(prog(t, C.freeS + 0.35, C.freeS + 0.9));
  if (e4 > 0 && IMG.github) {
    const label = 'MIT · GitHub', lw = tw(label, 30, 600, 'en') + 110, x = W / 2 - lw / 2, y = 700 + (1 - e4) * 16;
    ctx.save(); ctx.globalAlpha = e4; rr(ctx, x, y, lw, 64, 32); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.drawImage(IMG.github, x + 26, y + 16, 32, 32); ctx.restore();
    txt(ctx, label, x + 74, y + 33, { size: 30, weight: 600, color: [225, 230, 248], alpha: e4, align: 'left', lang: 'en', dir: 'ltr' });
  }
  ctx.restore();
}

/* ======================================================================= tagline + logo */
function sceneTag(t) {
  const lockBg = prog(t, C.lock - 0.6, C.lock);
  background(t, 0.55 * (1 - lockBg) + 0.25, 0.35 + 0.2 * lockBg, null);
  const T0 = C.brk, amp = env('tagline', t);
  const split = E.inOutCubic(prog(t, C.lock - 0.65, C.lock));
  const ribY = 640;
  if (split < 1) ribbon(ctx, W / 2, ribY, 1500 * (1 - split * 0.6), 8 + amp * 150, t, { hue: 1, strands: 4, seed: 12, alpha: prog(t, T0, T0 + 0.5) * (1 - split), lw: 1.7 });
  if (split > 0 && split < 1) {
    const lp = LOGO_POS();
    ribbon(ctx, lerp(W / 2 - 420, lp.x - 150, split), lerp(ribY, lp.y, split), 700 * (1 - split * 0.9), 10 * (1 - split), t, { hue: 0, strands: 3, seed: 1, alpha: 1 - split * 0.6, lw: 1.6 });
    ribbon(ctx, lerp(W / 2 + 420, lp.x + 150, split), lerp(ribY, lp.y, split), 700 * (1 - split * 0.9), 10 * (1 - split), t, { hue: 1, strands: 3, seed: 2, alpha: 1 - split * 0.6, lw: 1.6 });
  }
}
/* the spoken tagline: big while she says it, then it glides down and becomes the end card's tagline */
function taglineText(t) {
  const ws = words('tagline');
  if (!ws.length) return;
  const m = E.inOutCubic(prog(t, C.lock - 0.35, C.lock + 0.55));
  const fade = 1 - prog(t, C.fade, C.end);
  const big = fitSize(COPY.say.tagline, 92, 700, LANG, 1640), small = fitSize(COPY.screen.tagline, 40, 450, LANG, 1300);
  const size = lerp(big, small, m), weight = Math.round(lerp(700, 450, m));
  const toks = ws.map((w) => ({ w: w.w, sp: !isCJK(LANG) }));
  const L = layout(toks, size, weight, LANG, W / 2, lerp(1700, 1300, m));
  let y = lerp(520 - (L.lines.length - 1) * big * 0.65, 772 - (L.lines.length - 1) * small * 0.65, m);
  ctx.save(); ctx.globalAlpha = fade;
  L.lines.forEach((ln) => {
    ln.items.forEach((it) => {
      const w = ws[it.i], e = E.outExpo(prog(t, w.t - 0.06, w.t + 0.35)), act = (t >= w.t - 0.02 && t <= w.t + w.d + 0.1) ? 1 - m : 0;
      const col = mixc(mixc(COL.white, COL.cyanL, act), [205, 211, 236], m);
      txt(ctx, it.w, it.cx, y + (1 - e) * 26, { size, weight, lang: LANG, alpha: e, blur: (1 - e) * 8, color: col, glow: act ? 34 : 0, glowColor: COL.cyan });
    });
    y += size * 1.3;
  });
  ctx.restore();
}
function LOGO_POS() { return { x: W / 2, y: 380, size: 380 }; }
function sceneLogo(t) {
  const L = LOGO_POS(), S = L.size, k = S / 1254, X0 = L.x - S / 2, Y0 = L.y - S / 2, ocx = 627, ocy = 617;
  const lock = C.lock;
  const fade = 1 - prog(t, C.fade, C.end);
  const push = 1 + 0.035 * prog(t, lock, C.end);
  ctx.save(); ctx.globalAlpha = fade;
  ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  const lk = Math.exp(-Math.max(0, t - lock) / 0.6) * (t >= lock ? 1 : 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  softLight(ctx, X0 + 320 * k, L.y, 640, [90, 50, 240], 0.2 * prog(t, lock - 0.6, lock) + 0.18 * lk);
  softLight(ctx, X0 + 940 * k, L.y, 640, [30, 200, 210], 0.17 * prog(t, lock - 0.3, lock + 0.3) + 0.18 * lk);
  ctx.restore();
  const seq = {
    purple_4: lock - 0.42, purple_3: lock - 0.33, purple_2: lock - 0.24, purple_1: lock - 0.15, purple_0: lock - 0.06,
    cyan_4: lock - 0.42, cyan_3: lock - 0.33, cyan_2: lock - 0.24, cyan_1: lock - 0.15, cyan_0: lock - 0.06,
    navy_0: lock, navy_1: lock, navy_2: lock, navy_3: lock, navy_4: lock,
  };
  const breathe = 1 + 0.008 * Math.sin((t - lock) * 1.8);
  for (const p of LOGO) {
    const key = p.f.replace('.png', ''), t0 = seq[key];
    const isSwoosh = key.endsWith('_0') && !key.startsWith('navy'), isNavy = key.startsWith('navy');
    const pp = prog(t, t0, t0 + (isNavy ? 0.45 : 0.55));
    if (pp <= 0 || !IMG[key]) continue;
    const side = key.startsWith('purple') ? -1 : key.startsWith('cyan') ? 1 : 0;
    const e = E.outExpo(pp);
    const pcx = X0 + (p.x + p.w / 2) * k, pcy = Y0 + (p.y + p.h / 2) * k;
    ctx.save();
    ctx.globalAlpha *= clamp(pp * 3);
    ctx.translate(X0 + ocx * k, Y0 + ocy * k); ctx.scale(breathe, breathe); ctx.translate(-(X0 + ocx * k), -(Y0 + ocy * k));
    const dx = side * 260 * (1 - e) * (isSwoosh ? 0.5 : 1);
    ctx.translate(pcx + dx, pcy);
    const sc = isNavy ? lerp(0.6, 1, E.outBack(pp, 2.2)) : lerp(0.85, 1, e);
    ctx.rotate(isSwoosh ? side * (1 - e) * 0.5 : 0);
    ctx.scale(sc, sc); ctx.translate(-pcx, -pcy);
    ctx.drawImage(IMG[key], X0 + p.x * k, Y0 + p.y * k, p.w * k, p.h * k);
    ctx.restore();
  }
  if (t > lock) {
    const u = prog(t, lock, lock + 1.0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    circle(ctx, L.x, Y0 + ocy * k, 140 + 820 * E.outCubic(u)); ctx.strokeStyle = rgba(COL.cyanL, 0.45 * (1 - u)); ctx.lineWidth = 2 + 6 * (1 - u); ctx.stroke();
    glowDot(ctx, L.x, Y0 + ocy * k, 420, [160, 170, 255], 0.35 * lk);
    ctx.restore();
  }
  // wordmark, tagline, where to get it
  const wm = E.outExpo(prog(t, C.wordmark, C.wordmark + 0.8));
  if (wm > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(W / 2 - 420, 600, 840 * wm, 150); ctx.clip();
    txt(ctx, 'Avorythm', W / 2, 668 + (1 - wm) * 14, { size: 116, weight: 760, lang: 'en', dir: 'ltr', ls: 1, color: [246, 247, 255], glow: 18, glowColor: [100, 70, 230] });
    const sw = prog(t, C.wordmark + 1.6, C.wordmark + 2.6);
    if (sw > 0 && sw < 1) {
      ctx.globalCompositeOperation = 'lighter';
      const x = lerp(W / 2 - 520, W / 2 + 520, E.inOutSine(sw)), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
      g.addColorStop(0, 'rgba(160,255,250,0)'); g.addColorStop(0.5, 'rgba(160,255,250,0.6)'); g.addColorStop(1, 'rgba(160,255,250,0)');
      txt(ctx, 'Avorythm', W / 2, 668, { size: 116, weight: 760, lang: 'en', dir: 'ltr', ls: 1, fill: g });
    }
    ctx.restore();
  }
  const pe = E.outExpo(prog(t, C.pills, C.pills + 0.7));
  if (pe > 0) {
    const pills = [['chrome', COPY.screen.cta, true], ['github', COPY.screen.gh, false]];
    const fs = 30, pad = 32, icon = 34;
    const widths = pills.map(([, s]) => tw(s, fs, 650, LANG) + pad * 2 + icon + 14);
    const total = widths.reduce((a, b) => a + b, 0) + 24;
    let x = W / 2 - total / 2;
    const order = RTL ? [1, 0] : [0, 1];
    order.forEach((idx) => {
      const [ic, s, primary] = pills[idx], w = widths[idx], y = 852 + (1 - pe) * 16;
      ctx.save(); ctx.globalAlpha = pe;
      rr(ctx, x, y, w, 66, 33);
      if (primary) { const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#6f5af0'); g.addColorStop(1, '#5a4fe0'); ctx.fillStyle = g; ctx.shadowColor = 'rgba(100,80,255,0.5)'; ctx.shadowBlur = 30; }
      else ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = primary ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5; ctx.stroke();
      const img = IMG[ic === 'chrome' ? 'chromeW' : 'github'];
      const ix = RTL ? x + w - pad - icon : x + pad;
      if (img) ctx.drawImage(img, ix, y + 17, icon, icon);
      ctx.restore();
      txt(ctx, s, RTL ? x + w - pad - icon - 14 : x + pad + icon + 14, y + 34, { size: fs, weight: 650, color: COL.white, alpha: pe, align: RTL ? 'right' : 'left', lang: LANG, dir: RTL ? 'rtl' : 'ltr' });
      x += w + 24;
    });
  }
  const ul = E.outExpo(prog(t, C.url, C.url + 0.7));
  txt(ctx, 'msmahdinejad.github.io/avorythm', W / 2, 968 + (1 - ul) * 10, { size: 27, weight: 500, lang: 'mono', dir: 'ltr', color: [140, 230, 226], alpha: ul * 0.95, ls: 0.5 });
  ctx.restore();
}

/* ======================================================================= master */
let DEBUG = new URLSearchParams(location.search).has('debug');
const XF = document.createElement('canvas'); XF.width = W; XF.height = H; const xctx = XF.getContext('2d');
/* draw scene A, then B on top with a crossfade between t0 and t1 (both scenes paint full frames) */
function xfade(t, A, B, t0, t1, ease_ = E.inOutSine) {
  if (t < t0) return A(t);
  if (t >= t1) return B(t);
  B(t);
  xctx.globalCompositeOperation = 'copy'; xctx.drawImage(cv, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  A(t);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ease_(prog(t, t0, t1)); ctx.drawImage(XF, 0, 0); ctx.restore();
}
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const actOne = (u) => { sceneWorld(u); headlines(u); glitch(u, u > C.stutter ? 0.35 + 0.65 * prog(u, C.stutter, C.cut) * (0.6 + 0.4 * hash(Math.floor(u * 60))) : u > 8.9 ? 0.15 * hash(Math.floor(u * 30)) * prog(u, 8.9, C.stutter) : 0); };
  if (t < C.cut) actOne(t);
  else if (t < C.popup) { /* silence: black */ }
  else if (t < C.click + 0.34) {
    xfade(t, scenePopup, sceneWorld, C.click + 0.1, C.click + 0.34, E.outCubic);
    if (t < C.popup + 0.5) fadeBlack(1 - E.inOutSine(prog(t, C.popup, C.popup + 0.5)));
    if (t > C.click) flash(0.55 * Math.exp(-(t - C.click - 0.08) * (t - C.click - 0.08) / 0.006), [190, 255, 252]);
  }
  else if (t < C.gap) sceneWorld(t);
  else if (t < C.drop) { /* the breath before the drop */ }
  else if (t < C.browser + 0.1) xfade(t, sceneDrop, sceneBrowser, C.browser - 0.22, C.browser + 0.1);
  else if (t < C.desktop + 0.1) xfade(t, sceneBrowser, sceneDesktop, C.desktop - 0.22, C.desktop + 0.1);
  else if (t < C.langs + 0.05) xfade(t, sceneDesktop, sceneLangs, C.langs - 0.2, C.langs + 0.05);
  else if (t < C.free) sceneLangs(t);
  else if (t < C.brk) sceneFree(t);
  else { sceneTag(t); if (t >= C.lock - 0.45) sceneLogo(t); taglineText(t); }
  if (t >= C.drop || t < C.cut || (t > C.popup && t < C.gap)) vignette(0.5);
  chroma(0.6);
  grain(t, 0.055);
  if (DEBUG) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, 200, 44); ctx.fillStyle = '#0f0'; ctx.font = '26px monospace'; ctx.fillText(t.toFixed(2) + 's', 12, 31); ctx.restore(); }
}

/* ======================================================================= boot */
let SCRAMBLE = [], SCRAMBLE_SEQ = [], TICKER = [], ENDONYMS = [], LOGO = [], POPUP = null, APP = null, BROWSER_TAB = '', LECTURE_TITLE = {};
(async () => {
  try {
    const q = new URLSearchParams(location.search);
    LANG = q.get('lang') || 'en'; RTL = isRTL(LANG);
    const get = async (u) => { const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
    TL = await get(`/build/film/${LANG}/timeline.json`).catch(async () => { const p = await get(`/build/film/${LANG}/plan.json`); p.envFps = 100; p.beats = []; p.notes = []; return p; });
    TL.envFps = TL.envFps || 100;
    COPY = await get(`/films/film/data/copy/${LANG}.json`);
    CAST = await get('/films/film/data/cast.json');
    SCRAMBLE = (await get('/films/film/data/scramble.json')).words;
    ENDONYMS = (await get('/films/film/data/endonyms.json')).list.filter((e) => e.code !== LANG).slice(0, 26);
    ENDONYMS.push((await get('/films/film/data/endonyms.json')).list.find((e) => e.code === LANG));
    const ex = new Set([LANG, ...(LANG === 'fa' ? ['ar'] : LANG === 'ar' ? ['fa'] : [])]);
    SCRAMBLE_SEQ = SCRAMBLE.filter((w) => !ex.has(w.lang)).slice(0, 4);
    const endo = (await get('/films/film/data/endonyms.json')).list;
    TICKER = endo.filter((e2) => e2.code !== LANG && !ex.has(e2.code)).slice(0, TICK_DWELL.length).concat([endo.find((e2) => e2.code === LANG)]);
    BROWSER_TAB = { de: 'Neuronale Netze — Vorlesung 7', ru: 'Нейросети — лекция 7' }[TL.roleLang.lecture] || 'Lecture 7';
    LECTURE_TITLE = { de: 'Neuronale Netze', ru: 'Нейросети' };
    LOGO = (await get('/src/assets/logo/parts.json')).parts;
    for (const p of LOGO) IMG[p.f.replace('.png', '')] = await loadImg('/src/assets/logo/' + p.f);
    IMG.logo = await loadImg('/src/assets/logo/logo-full.png');
    IMG.popup = await loadImg(`/build/film/ui/popup-${LANG}.png`); POPUP = await get(`/build/film/ui/popup-${LANG}.json`);
    IMG.app = await loadImg(`/build/film/ui/app-${LANG}.png`); APP = await get(`/build/film/ui/app-${LANG}.json`);
    IMG.github = await loadSvgIcon('github', '#e8eaf6', 'brands');
    IMG.chromeW = await loadSvgIcon('googlechrome', '#ffffff', 'brands');
    IMG.os_windows = await loadSvgIcon('windows', '#dfe4f6', 'brands');
    IMG.os_apple = await loadSvgIcon('apple', '#dfe4f6', 'brands');
    IMG.os_linux = await loadSvgIcon('linux', '#dfe4f6', 'brands');
    IMG.fileVideo = await loadSvgIcon('file-video', '#b7a6ff', 'lucide');
    // the cards
    const hero = TL.hero;
    const orig = CAST.originals[`film.${hero}`];
    CARDS = [{ id: 'hero', hero: true, kind: 'film', lang: hero, text: orig, parts: orig.split('|'), clip: 'hero_src', seed: 0.37 }];
    TL.crowd.forEach((c, i) => {
      CARDS.push({ id: 'c' + i, slot: i, role: c.role, kind: CAST.roles[c.role].kind, lang: c.lang, text: CAST.originals[`${c.role}.${c.lang}`], caption: COPY.cards[c.role], clip: 'crowd_' + c.role, seed: 0.11 + i * 0.173, title: LECTURE_TITLE[c.lang] });
    });
    // flip order: centre-adjacent cells first
    CARDS.slice(1).forEach((card) => { const [cx, cy] = CELLS[card.slot]; const r = Math.abs(cx) + Math.abs(cy) + (Math.abs(cx) > 1 ? 1 : 0); card.flipT = C.cascade + 0.25 + (r - 1) * 0.42 + card.slot * 0.05; });
    // fonts: load every face with the real text of this version, then verify none falls back
    const texts = [JSON.stringify(COPY), JSON.stringify(CAST.originals), JSON.stringify(CAST.nativeNames), SCRAMBLE.map((s) => s.w).join(' '), ENDONYMS.map((e) => e.name).join(' '), 'Avorythm msmahdinejad.github.io/avorythm 0123456789 ON AIR MIT GitHub Windows macOS Linux ocean.mp4 1.2 GB lecture.example.com/neural-networks Neuronale Netze Vorlesung Нейросети лекция'];
    const all = texts.join(' ');
    const fams = Object.values(FAM);
    await Promise.all(fams.flatMap((f) => [250, 450, 650, 800].map((w) => document.fonts.load(`${w} 40px ${f}`, all).catch(() => null))));
    await document.fonts.ready;
    const need = [['"Inter Variable"', 'Avorythm'], ['"JetBrains Mono Variable"', 'github.io']];
    if (/[؀-ۿ]/.test(all)) need.push(['"Vazirmatn Variable"', 'سلام']);
    if (/[ऀ-ॿ]/.test(all)) need.push(['"Noto Sans Devanagari Variable"', 'हिन्दी']);
    if (/[一-鿿]/.test(all)) need.push(['"Noto Sans SC Variable"', '中文'], ['"Noto Sans JP Variable"', '日本語']);
    for (const [f, s] of need) if (!document.fonts.check(`400 40px ${f}`, s)) throw new Error('font failed to load: ' + f);
    makeGrain();
    window.__film = { duration: TL.duration || C.end, fps: 60, poster: C.build + 0.35 };
    window.renderFrame = (t) => render(t);
    window.__ready = true;
    if (!q.has('render')) { let t0 = performance.now(); const start = parseFloat(q.get('t') || '0'); const loop = () => { const t = start + (performance.now() - t0) / 1000; render(t % (TL.duration || 53)); requestAnimationFrame(loop); }; if (q.has('play')) loop(); else render(start); }
  } catch (e) { window.__err = String(e && e.stack || e); console.error(e); }
})();
