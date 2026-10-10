'use strict';
/* The "videos of the world": low-key cinematic stills drawn in a 1600 x 900 design space, animated by t.
   They sit behind the frosted subtitle card, so they stay dark, soft and calm. */
function lgv(c, y0, y1, stops) { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function ridge(c, yb, amp, fq, ph, col, seed = 0) {
  c.beginPath(); c.moveTo(-10, 910);
  for (let x = -10; x <= 1610; x += 16) c.lineTo(x, yb - amp * (0.55 * Math.sin(x * fq + ph + seed) + 0.3 * Math.sin(x * fq * 2.3 + seed * 2) + 0.15 * Math.sin(x * fq * 5.1 + seed * 3)));
  c.lineTo(1610, 910); c.closePath(); c.fillStyle = col; c.fill();
}
function bokeh(c, seed, n, x0, y0, w, h, cols, rmin, rmax, a, t = 0) {
  const r = rng(seed);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w + 8 * Math.sin(t * 0.3 + i), y = y0 + r() * h, rad = rmin + r() * (rmax - rmin), col = cols[Math.floor(r() * cols.length)];
    const tw = 0.7 + 0.3 * Math.sin(t * (0.6 + r()) + i);
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba(col, a * tw)); g.addColorStop(0.75, rgba(col, a * 0.7 * tw)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  c.restore();
}
function silhouettePerson(c, x, y, s, col, o = {}) {      // head + shoulders, seen from behind/front
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col;
  c.beginPath(); c.ellipse(0, -150, 42, 50, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(-26, -104); c.lineTo(26, -104); c.quadraticCurveTo(110, -86, 128, 0); c.lineTo(-128, 0); c.quadraticCurveTo(-110, -86, -26, -104); c.fill();
  if (o.rim) { c.strokeStyle = o.rim; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -150, 42, 50, 0, -1.2, 0.6); c.stroke(); c.beginPath(); c.moveTo(30, -102); c.quadraticCurveTo(110, -86, 128, 0); c.stroke(); }
  c.restore();
}

const ART = {
  film(c, t) {                                             // moonlit hills, someone sitting alone looking at the moon
    c.fillStyle = lgv(c, 0, 900, [[0, '#070a1f'], [0.45, '#151a43'], [0.72, '#2c2a5c'], [1, '#3b3263']]); c.fillRect(0, 0, 1600, 900);
    const r = rng(7);
    c.save();
    for (let i = 0; i < 140; i++) { const x = r() * 1600, y = r() * 520, s = 0.6 + r() * 1.6, a = (0.25 + 0.6 * r()) * (0.6 + 0.4 * Math.sin(t * (1 + r() * 2) + i)); c.fillStyle = `rgba(230,236,255,${a})`; c.fillRect(x, y, s, s); }
    c.restore();
    softLight(c, 1150, 230, 420, [180, 170, 255], 0.16);
    glowDot(c, 1150, 230, 230, [255, 236, 210], 0.22);
    circle(c, 1150, 230, 82); c.fillStyle = '#efe4cf'; c.fill();
    c.fillStyle = 'rgba(190,175,160,0.35)'; circle(c, 1124, 212, 15); c.fill(); circle(c, 1172, 256, 10); c.fill(); circle(c, 1180, 205, 7); c.fill();
    ridge(c, 600, 70, 0.0035, t * 0.02, '#232a55', 1);
    c.fillStyle = 'rgba(160,150,220,0.06)'; c.fillRect(0, 560 + 8 * Math.sin(t * 0.4), 1600, 70);
    ridge(c, 680, 55, 0.005, t * 0.03, '#171d40', 4);
    ridge(c, 770, 45, 0.004, 0, '#0d1129', 9);
    // the figure on the near hill
    c.fillStyle = '#080a1a';
    c.beginPath(); c.moveTo(380, 760); c.quadraticCurveTo(470, 706, 560, 760); c.lineTo(560, 800); c.lineTo(380, 800); c.fill();
    c.beginPath(); c.ellipse(470, 668, 17, 20, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(452, 684); c.quadraticCurveTo(470, 678, 488, 684); c.lineTo(500, 742); c.lineTo(440, 742); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(488, 724); c.lineTo(536, 744); c.lineTo(530, 752); c.lineTo(484, 742); c.fill();
    ridge(c, 845, 22, 0.006, 0, '#05071a', 13);
  },
  lecture(c, t, o = {}) {
    c.fillStyle = lgv(c, 0, 900, [[0, '#121a1f'], [1, '#090d11']]); c.fillRect(0, 0, 1600, 900);
    softLight(c, 640, 380, 620, [120, 160, 150], 0.08);
    rr(c, 150, 110, 1000, 560, 10); c.fillStyle = '#18241f'; c.fill(); c.lineWidth = 14; c.strokeStyle = '#2b2620'; c.stroke();
    const chalk = 'rgba(232,238,226,0.62)';
    if (o.title) txt(c, o.title, 200, 175, { size: 46, weight: 300, color: [232, 238, 226], alpha: 0.7, align: 'left', lang: o.lang || 'de' });
    const L = [[330, [290, 380, 470, 560]], [640, [250, 335, 420, 505, 590]], [950, [330, 430, 530]]];
    c.lineWidth = 2;
    for (let l = 0; l < 2; l++) for (const ya of L[l][1]) for (const yb of L[l + 1][1]) { c.strokeStyle = 'rgba(232,238,226,0.16)'; c.beginPath(); c.moveTo(L[l][0], ya); c.lineTo(L[l + 1][0], yb); c.stroke(); }
    for (let k = 0; k < 10; k++) {
      const l = k % 2, a = L[l][1][k % L[l][1].length], b = L[l + 1][1][(k * 3) % L[l + 1][1].length], u = (t * 0.55 + hash(k)) % 1;
      glowDot(c, lerp(L[l][0], L[l + 1][0], u), lerp(a, b, u), 16, [150, 230, 210], 0.55);
    }
    for (const [x, ys] of L) for (const y of ys) { circle(c, x, y, 18); c.fillStyle = '#18241f'; c.fill(); c.strokeStyle = chalk; c.lineWidth = 3; c.stroke(); }
    c.fillStyle = 'rgba(30,26,22,1)'; c.fillRect(150, 670, 1000, 14);
    silhouettePerson(c, 1330, 900, 1.9, '#06080a', { rim: 'rgba(255,200,150,0.35)' });
  },
  podcast(c, t) {
    c.fillStyle = lgv(c, 0, 900, [[0, '#1f0f12'], [1, '#0b0607']]); c.fillRect(0, 0, 1600, 900);
    bokeh(c, 21, 26, 700, 60, 900, 520, [[255, 150, 80], [255, 90, 120], [255, 200, 140]], 18, 60, 0.12, t);
    softLight(c, 520, 420, 560, [255, 130, 80], 0.12);
    rr(c, 1120, 120, 260, 84, 14); c.fillStyle = 'rgba(40,8,12,0.9)'; c.fill();
    c.save(); c.shadowColor = 'rgba(255,40,60,0.9)'; c.shadowBlur = 30; txt(c, 'ON AIR', 1250, 164, { size: 42, weight: 800, color: [255, 70, 90], lang: 'en', ls: 4 }); c.restore();
    c.strokeStyle = '#26181a'; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.moveTo(-40, 120); c.lineTo(330, 260); c.lineTo(470, 300); c.stroke();
    rr(c, 400, 250, 210, 360, 105); c.fillStyle = lgv(c, 250, 610, [[0, '#3c3236'], [0.5, '#221b1d'], [1, '#141011']]); c.fill();
    c.strokeStyle = 'rgba(255,220,200,0.12)'; c.lineWidth = 2; for (let y = 280; y < 580; y += 18) { c.beginPath(); c.moveTo(420, y); c.lineTo(590, y); c.stroke(); }
    c.strokeStyle = 'rgba(255,170,120,0.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(605, 300); c.quadraticCurveTo(612, 420, 604, 560); c.stroke();
    c.strokeStyle = '#1a1214'; c.lineWidth = 16; c.beginPath(); c.arc(505, 470, 160, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    c.fillStyle = '#120c0d'; rr(c, 485, 610, 40, 180, 10); c.fill(); rr(c, 380, 780, 250, 40, 16); c.fill();
  },
  news(c, t) {
    c.fillStyle = lgv(c, 0, 900, [[0, '#061128'], [1, '#0b2050']]); c.fillRect(0, 0, 1600, 900);
    const gx = 1080, gy = 360, R = 230;
    softLight(c, gx, gy, 520, [70, 140, 255], 0.16);
    c.strokeStyle = 'rgba(140,190,255,0.4)'; c.lineWidth = 2;
    circle(c, gx, gy, R); c.stroke();
    for (let i = 0; i < 6; i++) { const ph = (t * 0.12 + i / 6) % 1, w = Math.abs(Math.cos(ph * Math.PI)) * R; c.beginPath(); c.ellipse(gx, gy, Math.max(1, w), R, 0, 0, 7); c.stroke(); }
    for (const k of [-0.6, -0.3, 0, 0.3, 0.6]) { const y = gy + k * R, w = Math.sqrt(1 - k * k) * R; c.beginPath(); c.ellipse(gx, y, w, w * 0.1, 0, 0, 7); c.stroke(); }
    c.fillStyle = '#081430'; c.beginPath(); c.moveTo(0, 700); c.quadraticCurveTo(800, 640, 1600, 700); c.lineTo(1600, 900); c.lineTo(0, 900); c.fill();
    silhouettePerson(c, 470, 720, 1.4, '#050b1c', { rim: 'rgba(140,190,255,0.45)' });
    c.fillStyle = '#b81c30'; c.fillRect(110, 600, 860, 70); c.fillStyle = 'rgba(240,244,255,0.92)'; c.fillRect(110, 670, 860, 46);
    c.fillStyle = 'rgba(255,255,255,0.85)'; rr(c, 140, 622, 420, 24, 12); c.fill();
    c.fillStyle = 'rgba(20,30,60,0.5)'; rr(c, 140, 683, 640, 18, 9); c.fill();
    circle(c, 150, 110, 12); c.fillStyle = `rgba(255,60,80,${0.6 + 0.4 * Math.sin(t * 4)})`; c.fill();
  },
  tutorial(c, t) {
    c.fillStyle = '#0c0f16'; c.fillRect(0, 0, 1600, 900);
    c.fillStyle = '#121624'; c.fillRect(0, 0, 1600, 56); c.fillRect(0, 56, 90, 844);
    rr(c, 110, 12, 220, 44, 8); c.fillStyle = '#0c0f16'; c.fill();
    const cols = ['#b39dff', '#7fb2ff', '#ff9f7a', '#a5e3a0', '#7fe0e8', '#ffd479'];
    const typed = (t * 4) % 22;
    for (let i = 0; i < 15; i++) {
      const y = 96 + i * 46; c.fillStyle = 'rgba(140,150,170,0.3)'; rr(c, 34, y + 6, 32, 12, 6); c.fill();
      let x = 130 + Math.floor(hash(i + 1) * 4) * 46; const segs = 2 + Math.floor(hash(i + 20) * 3), vis = clamp(typed - i);
      if (vis <= 0) continue;
      for (let s = 0; s < segs; s++) { const w = (40 + hash(i * 7 + s) * 170) * (s === segs - 1 ? vis : 1); c.fillStyle = cols[(i + s * 2) % 6]; c.globalAlpha = 0.75; rr(c, x, y, w, 22, 7); c.fill(); c.globalAlpha = 1; x += w + 16; }
    }
    circle(c, 1400, 720, 130); c.fillStyle = '#1b2033'; c.fill(); c.save(); circle(c, 1400, 720, 130); c.clip(); silhouettePerson(c, 1400, 860, 0.9, '#0b0e18', { rim: 'rgba(255,210,170,0.4)' }); c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 3; circle(c, 1400, 720, 130); c.stroke();
  },
  documentary(c, t) {
    c.fillStyle = lgv(c, 0, 900, [[0, '#0b4a66'], [0.4, '#06263f'], [1, '#020814']]); c.fillRect(0, 0, 1600, 900);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const x = 180 + i * 250 + 50 * Math.sin(t * 0.25 + i), w = 50 + 40 * hash(i);
      c.beginPath(); c.moveTo(x - w, 0); c.lineTo(x + w, 0); c.lineTo(x + w * 3 + 160, 900); c.lineTo(x - w * 2 + 160, 900); c.closePath();
      c.fillStyle = lgv(c, 0, 900, [[0, 'rgba(150,225,255,0.12)'], [1, 'rgba(150,225,255,0)']]); c.fill();
    }
    c.restore();
    const wx = ((t * 40) % 2200) - 300;
    c.save(); c.translate(wx, 480 + 10 * Math.sin(t * 0.6)); c.fillStyle = 'rgba(2,12,26,0.85)';
    c.beginPath(); c.moveTo(-260, 0); c.quadraticCurveTo(-120, -80, 140, -40); c.quadraticCurveTo(260, -20, 300, 10); c.quadraticCurveTo(200, 50, 0, 50); c.quadraticCurveTo(-180, 40, -260, 0); c.fill();
    c.beginPath(); c.moveTo(-250, 0); c.lineTo(-360, -60); c.lineTo(-330, 10); c.lineTo(-370, 60); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = 'rgba(210,240,255,0.5)';
    for (let i = 0; i < 70; i++) { const x = hash(i + 30) * 1600 + 8 * Math.sin(t + i), y = (hash(i + 60) * 900 + t * (10 + 14 * hash(i))) % 900, s = 1 + 2 * hash(i + 2); c.fillRect(x, y, s, s); }
  },
  stream(c, t) {
    c.fillStyle = lgv(c, 0, 900, [[0, '#120a2a'], [0.55, '#3a1747'], [1, '#12081c']]); c.fillRect(0, 0, 1600, 900);
    softLight(c, 600, 470, 520, [255, 110, 160], 0.14);
    c.save(); c.strokeStyle = 'rgba(255,120,200,0.35)'; c.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const y = 520 + Math.pow(i / 14, 2) * 380 + ((t * 30) % 30) * (i / 14); c.beginPath(); c.moveTo(0, y); c.lineTo(1200, y); c.stroke(); }
    for (let i = -10; i <= 10; i++) { c.beginPath(); c.moveTo(600 + i * 30, 520); c.lineTo(600 + i * 150, 900); c.stroke(); }
    c.restore();
    c.fillStyle = '#1a0c26'; ridge(c, 525, 60, 0.008, 0, '#1d0d2b', 3);
    c.fillStyle = '#0a0612'; c.beginPath(); c.moveTo(540, 900); c.lineTo(560, 700); c.quadraticCurveTo(600, 650, 640, 700); c.lineTo(660, 900); c.fill(); circle(c, 600, 640, 34); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(1230, 0, 370, 900);
    for (let i = 0; i < 9; i++) { const y = 860 - ((t * 60 + i * 95) % 860); c.fillStyle = ['#ff8fb3', '#8fd3ff', '#ffd27f', '#b9a4ff'][i % 4]; c.globalAlpha = 0.55; rr(c, 1260, y, 60 + hash(i) * 40, 14, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.4)'; rr(c, 1340, y, 120 + hash(i + 3) * 120, 14, 7); c.fill(); c.globalAlpha = 1; }
    rr(c, 50, 40, 300, 30, 15); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fill(); rr(c, 56, 46, 200, 18, 9); c.fillStyle = '#ff5c8a'; c.fill();
  },
  talkshow(c, t) {
    c.fillStyle = lgv(c, 0, 900, [[0, '#1a0f1a'], [1, '#0c070c']]); c.fillRect(0, 0, 1600, 900);
    bokeh(c, 5, 30, 100, 80, 1400, 360, [[255, 190, 120], [180, 120, 255], [255, 140, 170]], 14, 44, 0.13, t);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const [x, col] of [[480, [255, 210, 160]], [1120, [255, 200, 170]]]) { c.beginPath(); c.moveTo(x - 30, 0); c.lineTo(x + 30, 0); c.lineTo(x + 260, 820); c.lineTo(x - 260, 820); c.closePath(); c.fillStyle = lgv(c, 0, 820, [[0, rgba(col, 0.14)], [1, rgba(col, 0.02)]]); c.fill(); }
    c.restore();
    c.fillStyle = '#140b12'; c.fillRect(0, 760, 1600, 140);
    for (const x of [480, 1120]) { c.fillStyle = '#080508'; rr(c, x - 120, 600, 240, 170, 40); c.fill(); rr(c, x - 140, 690, 280, 90, 30); c.fill(); }
    silhouettePerson(c, 1120, 700, 1.0, '#050305', { rim: 'rgba(255,200,160,0.4)' });
  },
  cooking(c, t) {
    c.fillStyle = lgv(c, 0, 900, [[0, '#24150c'], [1, '#0f0805']]); c.fillRect(0, 0, 1600, 900);
    rr(c, 1080, 90, 380, 300, 12); c.fillStyle = 'rgba(255,220,170,0.08)'; c.fill();
    softLight(c, 800, 760, 520, [255, 120, 40], 0.22);
    c.fillStyle = '#1a0f09'; c.fillRect(0, 700, 1600, 200);
    c.fillStyle = '#0d0907'; c.beginPath(); c.ellipse(800, 640, 330, 60, 0, 0, 7); c.fill();
    c.fillStyle = lgv(c, 600, 660, [[0, '#4a4f58'], [1, '#22252c']]); c.beginPath(); c.ellipse(800, 600, 300, 54, 0, 0, 7); c.fill();
    c.fillStyle = '#b45d25'; c.beginPath(); c.ellipse(800, 596, 262, 40, 0, 0, 7); c.fill();
    c.fillStyle = '#2a2d33'; rr(c, 1080, 588, 260, 22, 11); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 14; c.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const x0 = 690 + k * 110, ph = (t * 0.45 + k * 0.33) % 1; c.globalAlpha = Math.sin(ph * Math.PI) * 0.8; c.beginPath(); for (let y = 0; y < 240; y += 10) c.lineTo(x0 + 22 * Math.sin(y * 0.03 + t * 1.6 + k), 560 - y - ph * 50); c.stroke(); c.globalAlpha = 1; }
    for (let i = 0; i < 5; i++) { circle(c, 300 + i * 60, 760, 26); c.fillStyle = ['#c0392b', '#e67e22', '#27ae60', '#d35400', '#8e44ad'][i]; c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1; }
  },
  football(c, t) {
    c.fillStyle = lgv(c, 0, 900, [[0, '#070b1c'], [0.33, '#131c38'], [0.34, '#164a29'], [1, '#1f6a38']]); c.fillRect(0, 0, 1600, 900);
    bokeh(c, 9, 60, 0, 120, 1600, 160, [[255, 255, 255], [255, 210, 120], [160, 200, 255]], 3, 9, 0.35, t * 3);
    glowDot(c, 200, 60, 260, [230, 240, 255], 0.3); glowDot(c, 1400, 60, 260, [230, 240, 255], 0.3);
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)'; const y0 = 306 + Math.pow(i / 8, 1.5) * 594, y1 = 306 + Math.pow((i + 1) / 8, 1.5) * 594; c.fillRect(0, y0, 1600, y1 - y0); }
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 6; c.beginPath(); c.moveTo(1150, 640); c.lineTo(1150, 400); c.lineTo(1500, 370); c.lineTo(1500, 610); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 2;
    for (let i = 0; i <= 10; i++) { c.beginPath(); c.moveTo(1150 + i * 35, 400 - i * 3); c.lineTo(1150 + i * 35, 640 - i * 3); c.stroke(); }
    const u = (t * 0.35) % 1, bx = lerp(260, 1300, E.outCubic(u)), by = 640 - 230 * Math.sin(u * Math.PI) * (1 - u * 0.4);
    circle(c, bx, by, 24); c.fillStyle = '#f0f0f0'; c.fill(); c.fillStyle = '#222'; circle(c, bx + 4, by - 3, 7); c.fill();
  },
  talk(c, t) {
    c.fillStyle = lgv(c, 0, 900, [[0, '#0a0a12'], [1, '#050508']]); c.fillRect(0, 0, 1600, 900);
    c.save(); c.globalCompositeOperation = 'lighter';
    c.beginPath(); c.moveTo(770, 0); c.lineTo(830, 0); c.lineTo(1000, 700); c.lineTo(600, 700); c.closePath(); c.fillStyle = lgv(c, 0, 700, [[0, 'rgba(255,220,180,0.12)'], [1, 'rgba(255,220,180,0.03)']]); c.fill();
    c.restore();
    c.fillStyle = 'rgba(255,190,120,0.16)'; c.beginPath(); c.ellipse(800, 700, 260, 46, 0, 0, 7); c.fill();
    silhouettePerson(c, 800, 690, 1.05, '#060606', { rim: 'rgba(255,215,170,0.5)' });
    c.fillStyle = '#030305'; for (let i = 0; i < 14; i++) { c.beginPath(); c.ellipse(60 + i * 118, 880, 46, 56, 0, 0, 7); c.fill(); }
  },
};
