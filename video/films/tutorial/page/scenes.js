/* Avorythm tutorial — the ten scenes. Each scene works in its own BASE local time u (seconds, English design);
   T.C(scene, cue) gives base cue times from timeline.json, so the fitted per-language warp moves every click onto
   the spoken word. Worlds are authored in nominal UI pixels inside a CSS-zoomed container (crisp under 3D). */
(function () {
  const { clamp, lerp, inv, E, fade, bump, pulse, kf, st, show, blur, h, esc, cam } = T;
  const S = (window.SC = []);
  const sc = (def) => { S.push(def); return def; };
  const measure = (W, el) => { // nominal rect of a DOM element inside a world (world must be laid out untransformed)
    const r = el.getBoundingClientRect(), R = W.zw.getBoundingClientRect();
    const k = R.width / W.w;
    return { x: (r.left - R.left) / k, y: (r.top - R.top) / k, w: r.width / k, h: r.height / k, get cx() { return this.x + this.w / 2; }, get cy() { return this.y + this.h / 2; } };
  };
  const layout = (W, fn) => { const d = W.sec.style.display; W.sec.style.display = 'block'; W.rig.style.transform = 'none'; W.rig.style.left = '0px'; W.rig.style.top = '0px'; const r = fn(); W.sec.style.display = d; return r; };
  const frect = (fr, r) => ({ x: fr.x + r.x, y: fr.y + r.y, w: r.w, h: r.h, cx: fr.x + r.cx, cy: fr.y + r.cy });
  T.measure = measure; T.layout = layout;

  /* ======================================================================= 0 · intro */
  sc({
    id: 'intro', pre: 0, post: 0.9,
    async build(D) {
      const sec = h('section', 'scene', null, T.$('scenes'));
      sec.id = 'sc-intro';
      const g = h('div', 'a', null, sec, 'left:0;top:0;width:1920px;height:1080px;transform-origin:960px 380px');
      const glow = h('div', 'a', null, g, 'left:560px;top:-20px;width:800px;height:800px;border-radius:50%;background:radial-gradient(closest-side,rgba(107,59,255,.34),rgba(63,249,249,.08) 55%,transparent)');
      const rings = [0, 1, 2].map(() => h('div', 'a', null, g, 'left:830px;top:250px;width:260px;height:260px;border-radius:50%;border:2px solid rgba(157,133,255,.6);opacity:0'));
      const logo = h('div', 'a', null, g, 'left:830px;top:250px;width:260px;height:260px');
      const parts = D.logoParts.parts.map((p) => {
        const im = h('img', 'a', null, logo, `left:${(p.x / 1254) * 260}px;top:${(p.y / 1254) * 260}px;width:${(p.w / 1254) * 260}px;height:${(p.h / 1254) * 260}px`);
        im.src = '/src/assets/logo/' + p.f;
        return { im, p };
      });
      const word = h('div', 'a', 'Avorythm', g, 'left:0;top:535px;width:1920px;text-align:center;font:700 76px "Inter Variable";letter-spacing:-.02em;color:#fff');
      const latin = !['fa', 'ar', 'hi', 'zh', 'ja'].includes(D.lang);
      const eye = h('div', 'a', esc(D.text.eyebrow), g, latin ? 'left:0;top:650px;width:1920px;text-align:center;font:600 21px "JetBrains Mono Variable";letter-spacing:.32em;text-transform:uppercase;color:#7ff3ee' : 'left:0;top:646px;width:1920px;text-align:center;font:700 24px var(--ui);color:#7ff3ee');
      this.latin = latin;
      const title = h('div', 'a', null, g, `left:0;top:688px;width:1920px;text-align:center;font:750 56px/1.3 var(--ui);direction:${D.dir}`);
      T.splitWords(title, D.text.introTitle, D.lang);
      title._w.forEach((w) => w.classList.add('g'));
      const sub = h('div', 'a', esc(D.text.introSub), g, `left:0;top:770px;width:1920px;text-align:center;font:500 27px var(--ui);color:#a9abc0;direction:${D.dir}`);
      Object.assign(this, { sec, g, glow, rings, logo, parts, word, eye, title, sub });
      // gradient continuity across the title words
      this.sec.style.display = 'block';
      const R = title._w.map((e) => e.getBoundingClientRect()), l = Math.min(...R.map((r) => r.left)), r = Math.max(...R.map((r) => r.right));
      title._w.forEach((e, i) => { e.style.backgroundSize = `${r - l}px 100%`; e.style.backgroundPosition = `${l - R[i].left}px 0`; });
      this.sec.style.display = 'none';
    },
    render(u) {
      const c = (n) => T.C('intro', n);
      show(this.sec, true);
      const out = E.i(inv(c('out'), c('out') + 0.95, u));
      st(this.g, { opacity: (1 - out).toFixed(3), transform: `scale(${(1 + out * 1.6).toFixed(4)})`, filter: blur(out * 14) });
      const lock = c('logo');
      this.parts.forEach(({ im, p }, i) => {
        const order = { navy: 0, purple: 1, cyan: 2 }[p.c] * 0.16 + (i % 5) * 0.035;
        const a = 0.1 + order, q = E.expo(inv(a, lock - 0.05 + order * 0.25, u));
        const dx = (p.cx - 627) / 1254, dy = (p.cy - 627) / 1254;
        const fly = (1 - q) * 300;
        st(im, { opacity: clamp(inv(a, a + 0.25, u)).toFixed(3), transform: `translate(${(dx * fly).toFixed(1)}px,${(dy * fly).toFixed(1)}px) rotate(${((1 - q) * (p.c === 'cyan' ? 30 : -24)).toFixed(2)}deg) scale(${(0.6 + 0.4 * q).toFixed(3)})`, filter: blur((1 - q) * 8) });
      });
      const hit = u > lock ? Math.exp(-(u - lock) * 3) : 0;
      st(this.logo, { transform: `scale(${(1 + 0.06 * hit).toFixed(4)})`, filter: `drop-shadow(0 0 ${(10 + 40 * hit).toFixed(1)}px rgba(139,108,255,${(0.35 + 0.5 * hit).toFixed(2)}))` });
      st(this.glow, { opacity: (E.o(inv(0, 1.4, u)) * (0.8 + 0.2 * Math.sin(u * 2.4))).toFixed(3), transform: `scale(${(0.75 + 0.25 * E.o(inv(0, 1.8, u)) + 0.08 * hit).toFixed(4)})` });
      this.rings.forEach((r, k) => { const p = inv(lock + k * 0.42, lock + 2.2 + k * 0.42, u); st(r, { opacity: (p > 0 && p < 1 ? (1 - p) * 0.55 : 0).toFixed(3), transform: `scale(${(0.9 + 2.4 * E.o(p)).toFixed(4)})` }); });
      const wp = E.expo(inv(c('word'), c('word') + 0.9, u));
      st(this.word, { opacity: clamp(inv(c('word'), c('word') + 0.35, u)).toFixed(3), transform: `translateY(${((1 - wp) * 24).toFixed(1)}px)`, letterSpacing: `${lerp(0.24, -0.02, wp).toFixed(3)}em` });
      st(this.eye, { opacity: fade(u, c('title') - 0.2, c('title') + 0.3, 99, 100).toFixed(3), letterSpacing: this.latin ? `${lerp(0.6, 0.32, E.expo(inv(c('title') - 0.2, c('title') + 0.8, u))).toFixed(3)}em` : '0' });
      T.words(this.title, u, c('title'), { s: 0.07, d: 0.75 });
      st(this.sub, { opacity: fade(u, c('title') + 0.6, c('title') + 1.1, 99, 100).toFixed(3), transform: `translateY(${((1 - E.expo(inv(c('title') + 0.6, c('title') + 1.3, u))) * 14).toFixed(1)}px)` });
    },
    hide() { show(this.sec, false); },
  });

  /* ======================================================================= 1 · install (Chrome Web Store) */
  sc({
    id: 'install', pre: 0.9, post: 0.45,
    async build(D) {
      const W = (this.W = T.world('install', 2.2, 1440, 900));
      const B = (this.B = P.browser(W.zw, { w: 1440, h: 900, host: 'chromewebstore.google.com', path: '/detail/avorythm/kbdbbedijheicmmnmoidamdaodjbhjje',
        tabs: [{ title: 'Chrome Web Store', fav: 'linear-gradient(135deg,#4b4b55,#2a2a31)', on: 1 }] }));
      const loc = D.ui;
      const shots = ['01-popup', '04-player', '05-subtitles'].map((s) => `/repo/store-assets/${loc === 'fa' ? 'fa' : loc === 'zh-Hans' ? 'zh-CN' : 'en'}/${s}.png`);
      const cws = (this.cws = P.cwsPage(B.page, loc, D.extName, shots));
      const L = cws.L;
      const dlgX = 494, dlgY = 98;
      this.dlg = P.cwsDialog(W.zw, L, D.extName, dlgX, dlgY);
      this.added = P.addedBubble(W.zw, L, D.extName, 1440 - 400, 98);
      this.menu = P.extMenu(W.zw, L, D.extName, 1440 - 380, 98);
      this.dim = h('div', 'a', null, B.page, 'inset:0;background:rgba(0,0,0,.45);opacity:0');
      this.glowRing = h('div', 'a', null, W.zw, `left:${B.at.av[0] - 26}px;top:${B.at.av[1] - 26}px;width:52px;height:52px;border-radius:50%;border:2px solid #7cf0ec;box-shadow:0 0 18px #3ff9f9;opacity:0`);
      this.C = T.makeCursor(W.zw);
      const m = layout(W, () => ({ add: measure(W, cws.add), ok: measure(W, this.dlg.ok), dlg: measure(W, this.dlg.el), pin: measure(W, this.menu.pin) }));
      this.m = m;
      B.av.style.opacity = 0;
    },
    render(u, t) {
      const W = this.W, B = this.B, c = (n) => T.C('install', n), m = this.m;
      show(W.sec, true);
      const add = c('add'), ok = c('ok'), puz = c('puzzle'), pin = c('pin'), Dn = c('end'), D0 = T.D('install');
      const pz = B.at.puzzle, avp = B.at.av;
      const K = [
        [-0.9, [960, 600, 720, 450, 0.42, 22, -38, 0, -1100]],
        [0, [960, 560, 720, 450, 0.56, 12, -26, 0, -380], E.expo],
        [1.5, [960, 545, 720, 450, 0.66, 7, -15, 0, 0], E.sine],
        [add - 0.75, [1010, 470, m.add.cx, m.add.cy, 1.95, 3, -7, 0, 0], E.quint],
        [add + 0.35, [1000, 470, m.add.cx, m.add.cy, 2.0, 2.4, -6, 0, 0], E.lin],
        [ok - 0.45, [990, 470, m.dlg.cx, m.dlg.cy, 1.85, 1.5, -3, 0, 0], E.quint],
        [ok + 0.2, [985, 470, m.dlg.cx, m.dlg.cy, 1.88, 1.4, -3, 0, 0], E.lin],
        [puz - 0.25, [1180, 330, pz[0] - 140, pz[1] + 70, 2.45, 1, 3, 0, 0], E.quint],
        [pin + 0.5, [1170, 340, pz[0] - 140, pz[1] + 70, 2.5, 0.8, 4, 0, 0], E.lin],
        [D0 - 0.5, [960, 520, 760, 420, 0.92, 5, 13, 0, 0], E.quint],
      ];
      const cmr = kf(u, K).slice();
      const [dx, dy] = T.drift(u, 1 - clamp(inv(1.5, 2.2, u)) * 0.6);
      cmr[5] += dx; cmr[6] += dy;
      const wo = T.whip(u - D0);
      if (u > D0 - 0.45) { cmr[0] -= 1750 * wo.s; cmr[6] += 12 * wo.s; }
      cam(W.rig, cmr, W.K);
      st(W.sec, { opacity: clamp(inv(-0.9, -0.4, u)).toFixed(3), filter: u > D0 - 0.45 ? T.mb(wo.b) : 'none' });
      // Add to Chrome press + dialog + added bubble + menu
      const pa = T.press(u, add), hv = T.hover(u, add, 0.6, 0.2);
      st(this.cws.add, { transform: `scale(${(1 - 0.05 * pa + 0.02 * hv).toFixed(4)})`, background: `rgb(${Math.round(168 + 30 * hv)},${Math.round(199 + 20 * hv)},250)`, boxShadow: `0 0 ${(30 * hv).toFixed(1)}px rgba(168,199,250,${(0.5 * hv).toFixed(2)})` });
      const dIn = E.back(inv(add + 0.12, add + 0.5, u)), dOut = E.i(inv(ok + 0.12, ok + 0.32, u));
      st(this.dlg.el, { opacity: (clamp(inv(add + 0.1, add + 0.25, u)) * (1 - dOut)).toFixed(3), transform: `translateY(${((1 - dIn) * -16).toFixed(1)}px) scale(${(0.94 + 0.06 * clamp(dIn, 0, 1.1)).toFixed(4)})`, transformOrigin: '50% 0', visibility: u > add && u < ok + 0.35 ? 'visible' : 'hidden' });
      const po = T.press(u, ok);
      st(this.dlg.ok, { transform: `scale(${(1 - 0.06 * po).toFixed(4)})`, filter: `brightness(${(1 + 0.25 * T.hover(u, ok, 0.5, 0.1)).toFixed(3)})` });
      this.dim.style.opacity = (0.9 * fade(u, add + 0.1, add + 0.3, ok + 0.1, ok + 0.35)).toFixed(3);
      const ab = fade(u, ok + 0.25, ok + 0.5, puz - 0.15, puz + 0.05);
      st(this.added, { opacity: ab.toFixed(3), transform: `translateY(${((1 - E.expo(inv(ok + 0.25, ok + 0.7, u))) * -12).toFixed(1)}px)`, visibility: ab > 0.01 ? 'visible' : 'hidden' });
      const mn = fade(u, puz + 0.05, puz + 0.25, pin + 0.35, pin + 0.6);
      st(this.menu.el, { opacity: mn.toFixed(3), transform: `translateY(${((1 - E.expo(inv(puz + 0.05, puz + 0.4, u))) * -10).toFixed(1)}px)`, visibility: mn > 0.01 ? 'visible' : 'hidden' });
      const pp = T.press(u, pin);
      st(this.menu.pin, { background: u > pin ? 'rgba(124,240,236,.18)' : `rgba(255,255,255,${(0.1 * T.hover(u, pin, 0.5, 0.1)).toFixed(3)})`, color: u > pin ? '#7cf0ec' : '#c4c4cc', transform: `scale(${(1 - 0.1 * pp).toFixed(3)})` });
      // the pinned icon lands in the toolbar
      const ip = E.spring(inv(pin + 0.08, pin + 0.85, u));
      st(B.av, { opacity: clamp(inv(pin + 0.05, pin + 0.18, u)).toFixed(3), transform: `scale(${(ip).toFixed(4)}) rotate(${((1 - ip) * -40).toFixed(1)}deg)` });
      const gr = inv(pin + 0.2, pin + 1.3, u);
      st(this.glowRing, { opacity: (gr > 0 && gr < 1 ? (1 - gr) : 0).toFixed(3), transform: `scale(${(0.7 + 1.6 * E.o(gr)).toFixed(3)})` });
      st(B.puzzle, { background: `rgba(255,255,255,${(0.14 * fade(u, puz - 0.1, puz, pin + 0.3, pin + 0.6)).toFixed(3)})` });
      // cursor
      const okp = [m.ok.cx, m.ok.cy];
      const PATH = [[add - 1.6, 1500, 760], [add, m.add.cx + 8, m.add.cy + 4, E.soft, 0.12], [ok - 0.55, m.add.cx, m.add.cy + 30], [ok, okp[0], okp[1], E.soft, -0.1],
        [puz - 0.05, pz[0], pz[1] + 2, E.soft, 0.12], [pin, m.pin.cx, m.pin.cy, E.soft, -0.12], [pin + 0.6, m.pin.cx - 30, m.pin.cy + 70]];
      const cmS = cmr[4];
      T.cursor(this.C, u, PATH, [add, ok, puz, pin], [], fade(u, add - 1.4, add - 1.0, pin + 0.4, pin + 0.7), cmS);
      this.cam = cmr;
    },
    hide() { show(this.W.sec, false); },
  });

  /* ======================================================================= 2 · Gemini key (Google AI Studio) */
  sc({
    id: 'key', pre: 0.45, post: 0.45,
    async build(D) {
      const W = (this.W = T.world('key', 2.2, 1440, 900));
      const B = (this.B = P.browser(W.zw, { w: 1440, h: 900, host: 'aistudio.google.com', path: '/apikey',
        tabs: [{ title: 'Chrome Web Store', fav: 'linear-gradient(135deg,#4b4b55,#2a2a31)' }, { title: 'API Keys | Google AI Studio', fav: 'linear-gradient(135deg,#8ab4f8,#4f7fe0)', on: 1 }] }));
      B.av.style.opacity = 1;
      const S2 = (this.S2 = P.studioPage(B.page));
      this.C = T.makeCursor(W.zw);
      // the key capsule (screen layer) that lifts off and carries into step 3
      this.cap = h('div', 'a', `<span style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6b3bff,#26c6e0);display:flex;align-items:center;justify-content:center">${P.ico('key', '', 2.2)}</span><span class="mono" style="font:600 30px 'JetBrains Mono Variable';letter-spacing:.02em">AIza••••••••••••7Qk</span>`, W.top,
        'left:0;top:0;display:flex;align-items:center;gap:16px;padding:12px 26px 12px 14px;border-radius:20px;background:rgba(16,18,40,.9);border:1px solid rgba(143,124,255,.6);box-shadow:0 0 40px rgba(107,59,255,.45),0 20px 50px rgba(0,0,0,.5);color:#e9e6ff;white-space:nowrap;opacity:0');
      T.$('overlay').prepend(this.cap);
      this.cap.querySelector('svg').style.cssText = 'width:22px;height:22px;color:#fff';
      this.m = layout(W, () => ({ create: measure(W, S2.create), copy: measure(W, S2.copy), kstr: measure(W, S2.kstr) }));
    },
    render(u) {
      const W = this.W, c = (n) => T.C('key', n), m = this.m, S2 = this.S2;
      show(W.sec, true);
      const cr = c('create'), cp = c('copy'), lift = c('lift'), Dn = c('end'), D0 = T.D('key');
      const tab = [m.kstr.x + 470, m.kstr.cy - 10];
      const K = [
        [0, [960, 600, 720, 450, 0.66, 36, -4, 0, -60]],
        [1.5, [960, 560, 720, 450, 0.72, 22, -2, 0, 0], E.sine],
        [cr - 0.7, [1060, 470, m.create.cx, m.create.cy, 1.95, 4, -3, 0, 0], E.quint],
        [cr + 0.3, [1050, 470, m.create.cx, m.create.cy, 2.0, 3.4, -2.6, 0, 0], E.lin],
        [cr + 1.0, [960, 470, tab[0], tab[1], 1.68, 3, -1, 0, 0], E.quint],
        [lift, [960, 470, tab[0] + 20, tab[1], 1.74, 2, 1, 0, 0], E.sine],
        [D0 - 0.45, [960, 500, tab[0] + 20, tab[1], 1.6, 6, 1, 0, -60], E.io],
      ];
      const cmr = kf(u, K).slice();
      const [dx, dy] = T.drift(u + 3, 0.8);
      cmr[5] += dx; cmr[6] += dy;
      if (u < 0.45) cmr[0] += 1750 * (1 - T.whip(u).s);
      if (u > D0 - 0.45) cmr[1] += 1050 * T.whip(u - D0).s;
      cam(W.rig, cmr, W.K);
      st(W.sec, { opacity: 1, filter: u < 0.45 ? T.mb(T.whip(u).b) : u > D0 - 0.45 ? T.mb(T.whip(u - D0).b, 1) : 'none' });
      st(W.rig, { opacity: 1 });
      const pc = T.press(u, cr), hv = T.hover(u, cr, 0.6, 0.15);
      st(S2.create, { transform: `scale(${(1 - 0.05 * pc + 0.02 * hv).toFixed(4)})`, boxShadow: `0 0 ${(28 * hv).toFixed(1)}px rgba(168,199,250,${(0.5 * hv).toFixed(2)})` });
      const rowp = E.expo(inv(cr + 0.25, cr + 0.85, u));
      st(S2.row, { opacity: clamp(inv(cr + 0.25, cr + 0.45, u)).toFixed(3), transform: `translateY(${((1 - rowp) * 14).toFixed(1)}px)`, background: `rgba(168,199,250,${(0.12 * pulse(u, cr + 0.3, 1.2)).toFixed(3)})` });
      S2.empty.style.opacity = (1 - clamp(inv(cr + 0.1, cr + 0.3, u))).toFixed(3);
      // the key string types itself in
      const full = 'AIza•••••••••••••••••7Qk', n = Math.round(full.length * clamp(inv(cr + 0.4, cr + 1.1, u)));
      S2.kstr.textContent = full.slice(0, Math.max(4, n));
      const pk = T.press(u, cp);
      st(S2.copy, { transform: `scale(${(1 - 0.12 * pk).toFixed(3)})`, background: u > cp ? 'rgba(124,240,236,.2)' : `rgba(255,255,255,${(0.06 + 0.1 * T.hover(u, cp, 0.5, 0.1)).toFixed(3)})`, color: u > cp ? '#7cf0ec' : '#c4c4cc' });
      const tp = fade(u, cp + 0.1, cp + 0.3, D0 - 0.5, D0 - 0.2);
      st(S2.toast, { opacity: tp.toFixed(3), transform: `translateY(${((1 - E.expo(inv(cp + 0.1, cp + 0.6, u))) * 20).toFixed(1)}px)` });
      // capsule lifts off from the key string toward the lens
      const lp = E.io(inv(lift, D0, u));
      if (u > lift - 0.05) {
        const kr = S2.kstr.getBoundingClientRect();
        const s0 = Math.max(0.3, kr.height / 46);
        T.capAt(this.cap, lerp(kr.left - 52 * s0, 960 - 260 * 1.35, lp), lerp(kr.top + kr.height / 2, 300, lp), lerp(s0, 1.35, lp), clamp(inv(lift - 0.05, lift + 0.12, u)));
      } else this.cap.style.opacity = 0;
      const PATH = [[cr - 1.5, 1500, 760], [cr, m.create.cx + 6, m.create.cy + 4, E.soft, 0.12], [cp, m.copy.cx, m.copy.cy, E.soft, 0.1], [cp + 0.7, m.copy.cx + 60, m.copy.cy + 90]];
      T.cursor(this.C, u, PATH, [cr, cp], [], fade(u, cr - 1.3, cr - 0.9, cp + 0.4, cp + 0.7), cmr[4]);
    },
    hide() { show(this.W.sec, false); this.cap.style.opacity = 0; },
  });
})();
