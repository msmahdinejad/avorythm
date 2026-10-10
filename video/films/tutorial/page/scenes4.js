/* Avorythm tutorial — scenes 8 (desktop app) and 9 (outro). */
(function () {
  const { clamp, lerp, inv, E, fade, bump, pulse, kf, st, show, blur, h, esc, cam } = T;
  const sc = (def) => { SC.push(def); return def; };
  const fontFor = (lang) => ({ zh: '"Noto Sans SC Variable"', ja: '"Noto Sans JP Variable"', hi: '"Noto Sans Devanagari Variable"', fa: '"Vazirmatn Variable"', ar: '"Vazirmatn Variable"' }[lang] || '"Inter Variable"');
  const tcode = (D) => (D.target === 'zh' ? 'zh-Hans' : D.target === 'pt' ? 'pt-BR' : D.target);

  /* ======================================================================= 8 · desktop app */
  sc({
    id: 'desktop', pre: 0.45, post: 0.45,
    async build(D) {
      const K = 2.2, SW = 1280, SH = 800;
      const W = (this.W = T.world('desktop', K, 1600, 1150, 3400));
      W.zw.style.transformStyle = 'preserve-3d';
      const LX = 138, LY = 60;
      const lid = (this.lid = h('div', 'a', null, W.zw, `left:${LX}px;top:${LY}px;width:${SW + 44}px;height:${SH + 46}px;transform-origin:50% 100%;transform-style:preserve-3d`));
      h('div', 'a', `<img src="${P.LOGO}" style="position:absolute;left:50%;top:50%;width:190px;height:190px;margin:-95px 0 0 -95px;opacity:.45;filter:grayscale(1) brightness(1.9)">`, lid, 'inset:0;border-radius:28px 28px 10px 10px;background:linear-gradient(160deg,#7a7a86,#4a4a54 55%,#33333b);box-shadow:inset 0 0 0 2px rgba(255,255,255,.08);transform:rotateY(180deg);backface-visibility:hidden');
      const face = h('div', 'a', null, lid, 'inset:0;border-radius:28px 28px 10px 10px;background:#0b0b0e;box-shadow:inset 0 0 0 2px #2c2c33,inset 0 0 0 4px #0a0a0c;backface-visibility:hidden');
      const scr = (this.scr = h('div', 'a', null, face, `left:22px;top:22px;width:${SW}px;height:${SH}px;overflow:hidden;border-radius:6px;background:#000`));
      const win = h('div', 'a', null, scr, `left:0;top:0;width:${SW}px;height:${SH}px;background:#070912`);
      h('div', 'a', `<div class="lights" style="top:9px;left:12px;gap:7px"><i style="width:11px;height:11px"></i><i style="width:11px;height:11px"></i><i style="width:11px;height:11px"></i></div><span style="font:600 13px 'Inter Variable';color:#a1a1aa">Avorythm</span>`, win, 'left:0;top:0;right:0;height:30px;background:#16161c;border-bottom:1px solid rgba(255,255,255,.06);text-align:center;line-height:30px;z-index:2');
      const view = (this.view = h('div', 'a', null, win, `left:0;top:30px;width:${SW}px;height:${SH - 30}px;overflow:hidden`));
      const app = (this.app = await P.embedApp(D.ui, view, SW, SH - 30));
      const q = app.q, d = app.dict;
      const tname = P.langName(tcode(D), D.ui);
      q('#targetLanguage').innerHTML = `<option>${esc(tname)}</option>`;
      q('#localeToggle').value = D.ui;  // the real page defaults to its first option (fa)
      q('#captureDevice').innerHTML = '<option>Microphone (AMM Virtual Audio Device) [Loopback]</option>';
      q('#outputDevice').innerHTML = `<option>${esc(d.selectDefault)}</option>`;
      q('#mediaTargetLanguage').innerHTML = `<option>${esc(tname)}</option>`;
      q('#mediaVoice').innerHTML = '<option>Kore</option>';
      ['originalAudioEnabled', 'dubAudioEnabled', 'sourceSubtitlesEnabled', 'translatedSubtitlesEnabled'].forEach((id, i) => { q('#' + id).checked = [false, true, true, true][i]; });
      q('#targetCode').textContent = tcode(D).toUpperCase();
      q('#sourceCode').textContent = 'AUTO';
      q('#jobPanel').hidden = true;
      q('#recentJobsList').innerHTML = `<p>${esc(d.noJobs)}</p>`;
      const defs = document.querySelector('svg defs').outerHTML;
      const stg = q('#playerReady .video-stage');
      const vw = app.doc.createElement('div');
      vw.style.cssText = 'position:absolute;inset:0;overflow:hidden';
      vw.innerHTML = `<svg width="0" height="0" style="position:absolute">${defs}</svg>` + P.VID;
      stg.insertBefore(vw, stg.firstChild);
      this.vw = vw;
      stg.style.position = 'relative'; stg.style.aspectRatio = '16/9';
      q('#mediaPlayer').style.display = 'none';
      const trc = q('#translatedCaption');
      trc.hidden = false; trc.textContent = D.demo.translated[0]; trc.style.fontFamily = fontFor(D.lang) + ',Vazirmatn,sans-serif';
      this.SX0 = LX + 22; this.SY0 = LY + 22 + 30;
      const r = (s) => { const x = app.rect(s); return { x: this.SX0 + x.x, y: this.SY0 + x.y, w: x.w, h: x.h, cx: this.SX0 + x.cx, cy: this.SY0 + x.cy }; };
      this.m = { hero: r('.hero h1'), start: r('#startButton'), src: r('#sourceText'), nav: r('.product-nav a[href="#mediaStudio"]'), studio: r('#mediaStudio'), drop: r('#dropZone'), process: r('#processMediaButton') };
      this.m.scroll2 = this.m.studio.y - this.SY0 - 24;
      q('#playerEmpty').hidden = true; q('#playerReady').hidden = false; q('#playerCard').classList.remove('empty');
      this.m.zip = r('#downloadMediaZip');
      q('#playerEmpty').hidden = false; q('#playerReady').hidden = true; q('#playerCard').classList.add('empty');
      // laptop base (the camera always looks at it from above, so the keyboard and trackpad are never seen through the base)
      const deck = h('div', 'a', null, W.zw, `left:${LX - 90}px;top:${LY + SH + 46}px;width:${SW + 224}px;height:880px;transform-origin:50% 0;transform:rotateX(90deg);border-radius:0 0 34px 34px;background:linear-gradient(180deg,#26262c,#3c3c43 70%,#46464e)`);
      h('div', 'a', null, deck, `left:150px;top:70px;width:${SW - 76}px;height:430px;border-radius:14px;background:repeating-linear-gradient(90deg,transparent 0 71px,#0e0e12 71px 80.2px),repeating-linear-gradient(0deg,transparent 0 63px,#0e0e12 63px 71.6px),#2b2b32;box-shadow:inset 0 0 0 6px #0e0e12`);
      h('div', 'a', null, deck, `left:${(SW + 224) / 2 - 240}px;top:560px;width:480px;height:270px;border-radius:16px;background:#2e2e35;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)`);
      h('div', 'a', null, W.zw, `left:${LX - 90}px;top:${LY + SH + 46}px;width:${SW + 224}px;height:22px;transform-origin:50% 0;transform:translateZ(880px);border-radius:0 0 16px 16px;background:linear-gradient(#55555e,#1d1d22)`);
      this.off = h('div', 'a', null, scr, 'inset:0;background:#000;z-index:5');
      const docIco = `<svg width="72" height="90" viewBox="0 0 84 104"><path d="M8 2h48l26 26v68a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" fill="#f4f4f5"/><path d="M56 2v20a6 6 0 0 0 6 6h20z" fill="#d4d4d8"/><rect x="16" y="46" width="52" height="36" rx="6" fill="#6b3bff"/><path d="M36 55l12 9-12 9z" fill="#fff"/><text x="42" y="97" text-anchor="middle" font-family="Inter Variable" font-weight="800" font-size="11" fill="#71717a">MP4</text></svg><div style="margin-top:4px;font:600 13px 'Inter Variable';color:#fff;text-shadow:0 1px 4px #000;text-align:center">lecture.mp4</div>`;
      this.ghost = h('div', 'a', docIco, W.zw, 'left:0;top:0;width:100px;opacity:0;text-align:center;filter:drop-shadow(0 14px 24px rgba(0,0,0,.6))');
      const badge = (ic, txt, col) => { const e = h('div', 'a', `${P.ico(ic, '', 2)}<span>${txt}</span>`, W.top, 'left:0;top:0;display:flex;align-items:center;gap:12px;padding:12px 22px;border-radius:16px;background:rgba(14,15,28,.86);border:1px solid rgba(255,255,255,.14);font:600 26px "Inter Variable";color:#f4f4f7;box-shadow:0 16px 40px rgba(0,0,0,.45);opacity:0'); e.querySelector('svg').style.cssText = `width:26px;height:26px;color:${col}`; return e; };
      this.os = [badge('win', 'Windows', '#7dd3fc'), badge('apple', 'macOS', '#e4e4e7'), badge('tux', 'Linux', '#fcd34d')];
      this.callAny = h('div', 'pill', `<span class="dt"></span>${esc(D.text.anyProgram)}`, W.zw, 'opacity:0;font-size:15px;padding:7px 16px;gap:9px');
      this.zip = h('div', 'a', `<div style="width:120px;height:146px;border-radius:20px;background:linear-gradient(160deg,#34343f,#1b1b22);border:1px solid rgba(255,255,255,.16);box-shadow:0 30px 60px -10px rgba(0,0,0,.8);position:relative"><div style="position:absolute;left:51px;top:0;width:18px;height:96px;background:repeating-linear-gradient(180deg,#8b8b96 0 5px,#44444d 5px 10px);opacity:.85"></div><div style="position:absolute;left:24px;top:104px;width:72px;height:28px;border-radius:8px;background:linear-gradient(90deg,#6b3bff,#26c6e0);font:800 15px/28px 'Inter Variable';text-align:center;letter-spacing:.08em;color:#fff">ZIP</div></div>`, W.zw, 'left:0;top:0;opacity:0');
      this.C = T.makeCursor(W.zw);
      Object.assign(this, { D, LX, LY, SW, SH });
    },
    render(u, t) {
      const W = this.W, m = this.m, c = (n) => T.C('desktop', n), app = this.app, q = app.q, d = app.dict;
      show(W.sec, true);
      const any = c('any'), os = c('os'), stu = c('studio'), dr = c('drop'), rd = c('ready'), zp = c('zip'), Dn = c('end'), D0 = T.D('desktop');
      const sp = E.quint(inv(stu, stu + 0.9, u));
      const scroll = lerp(0, m.scroll2, sp);
      app.doc.scrollingElement.scrollTop = scroll;
      const wy = (y) => y - scroll;
      const LC = [this.LX + 662, this.LY + 423];
      const drop = [m.drop.cx, wy(m.drop.cy)];
      const pcr = q('#playerCard').getBoundingClientRect();
      const zc = [m.zip.cx, wy(m.zip.cy)];
      const play = [this.SX0 + pcr.left + pcr.width / 2, this.SY0 + pcr.top + pcr.height / 2];
      // camera keys: [x, y, fx, fy, scale, rx, ry, rz, z]. rx stays negative: we always look down on the laptop, never up at
      // the underside of its base.
      const K = [
        [0, [980, 470, LC[0], LC[1] + 40, 0.5, -9, -16, 0, 0]],
        [1.8, [920, 500, LC[0], LC[1] + 20, 0.68, -6, -13, 0, 0], E.sine],
        [any - 0.3, [860, 500, (m.hero.cx + m.start.cx) / 2, m.start.cy + 40, 1.32, -3.8, -9, 0, 0], E.quint],
        [os + 0.2, [800, 500, (m.hero.cx + m.start.cx) / 2, m.start.cy + 90, 1.3, -3, -8, 0, 0], E.sine],
        [stu + 0.2, [760, 540, LC[0], LC[1], 0.95, -4.5, -10, 0, 0], E.io],
        [dr - 0.6, [880, 540, drop[0] + T.dx(120), drop[1] + 40, 1.85, -3, -6, 0, 0], E.quint],
        [dr + 0.55, [900, 470, m.process.cx + T.dx(60), wy(m.process.cy) + 60, 1.95, -3, -5, 0, 0], E.io],
        [rd - 0.1, [900, 470, m.process.cx + T.dx(70), wy(m.process.cy) + 70, 2.0, -3, -4.6, 0, 0], E.sine],
        [rd + 0.5, [940, 470, play[0] - 40, play[1] + 40, 1.6, -3, -4, 0, 0], E.quint],
        [zp - 0.35, [980, 520, zc[0] - T.dx(220), zc[1] - 70, 2.05, -3, -3, 0, 0], E.quint],
        [zp + 0.9, [980, 560, zc[0] - T.dx(200), zc[1] - 120, 1.9, -3, -3, 0, 0], E.sine],
        [D0 - 0.6, [980, 560, zc[0] - T.dx(200), zc[1] - 120, 1.85, -3, -3, 0, 0], E.sine],
      ];
      const cmr = kf(u, K).slice();
      const [dx, dy] = T.drift(u + 19, 0.8);
      cmr[5] += dx; cmr[6] += dy;
      if (u < 0.45) cmr[1] += 1050 * (1 - T.whip(u).s);
      if (u > D0 - 0.45) cmr[1] -= 1050 * T.whip(u - D0).s;
      cam(W.rig, cmr, W.K);
      st(W.sec, { opacity: 1, filter: u < 0.45 ? T.mb(T.whip(u).b, 1) : u > D0 - 0.45 ? T.mb(T.whip(u - D0).b, 1) : 'none' });
      const la = -16 * (1 - E.io(inv(0.0, 0.95, u)));
      this.lid.style.transform = `rotateX(${la.toFixed(2)}deg)`;
      this.off.style.opacity = (1 - E.o(inv(-0.45, 0.05, u))).toFixed(3);
      // live translation of any program
      const live = u > any;
      q('#runtimeStatus').textContent = live ? d.connected : d.idle;
      q('#startButton [data-i18n]').textContent = live ? d.stop : d.start;
      const L = this.D.demo;
      const nS = Math.round(L.source[1].length * clamp(inv(any + 0.3, any + 1.6, u))), nT = Math.round(L.translated[1].length * clamp(inv(any + 0.7, any + 2.2, u)));
      q('#sourceText').textContent = live && nS ? L.source[1].slice(0, nS) : d.waitingSource;
      q('#translatedText').textContent = live && nT ? L.translated[1].slice(0, nT) : d.waitingTranslation;
      q('#detectedLanguage').textContent = live ? (L.sourceLang || 'en').toUpperCase() : '—';
      q('#startButton').style.transform = `scale(${(1 - 0.05 * T.press(u, any - 0.05)).toFixed(3)})`;
      const ca = fade(u, any, any + 0.25, stu - 0.4, stu - 0.1), cae = E.back(inv(any, any + 0.5, u));
      st(this.callAny, { opacity: ca.toFixed(3), transform: `translate(${(T.RTLUI ? m.start.x + m.start.w - this.callAny.offsetWidth + 10 : m.start.x - 10).toFixed(1)}px,${(m.start.y - 50).toFixed(1)}px) scale(${(0.85 + 0.15 * clamp(cae, 0, 1.1)).toFixed(3)})` });
      // RTL app (fa UI): the camera frames the mirrored app further left and its headline ends on the right edge: badges sit a bit further out
      this.os.forEach((b, i) => { const a = os + i * 0.14, p = E.back(inv(a, a + 0.45, u)); const bx = this.app.doc.documentElement.dir === 'rtl' ? 1560 : 1360; st(b, { opacity: fade(u, a, a + 0.2, stu - 0.2, stu + 0.15).toFixed(3), transform: `translate(${bx}px,${(300 + i * 92).toFixed(1)}px) translateY(${((1 - clamp(p)) * 26).toFixed(1)}px) scale(${(0.8 + 0.2 * clamp(p, 0, 1.15)).toFixed(3)})` }); });
      // file studio: drop -> process -> stages -> ready
      const dragA = dr - 0.75;
      const fileHome = [this.SX0 + this.SW - 130, this.SY0 + this.SH - 250];
      const gp = E.io(inv(dragA, dr, u));
      const gx = lerp(fileHome[0], drop[0] - 50, gp), gy = lerp(fileHome[1], drop[1] - 50, gp) - Math.sin(Math.PI * gp) * 60;
      st(this.ghost, { opacity: (clamp(inv(stu + 0.6, stu + 0.9, u)) * (1 - E.i(inv(dr + 0.02, dr + 0.2, u)))).toFixed(3), transform: `translate(${gx.toFixed(1)}px,${gy.toFixed(1)}px) rotate(${(8 * Math.sin(Math.PI * gp)).toFixed(2)}deg) scale(${(1 - 0.5 * E.i(inv(dr, dr + 0.2, u))).toFixed(3)})` });
      const dz = q('#dropZone');
      const over = fade(u, dr - 0.25, dr - 0.1, dr + 0.1, dr + 0.3);
      dz.style.borderColor = over > 0.05 ? `rgba(143,125,255,${(0.5 + 0.5 * over).toFixed(2)})` : '';
      dz.style.background = over > 0.05 ? `rgba(107,59,255,${(0.14 * over).toFixed(3)})` : '';
      q('#selectedFile').textContent = u > dr ? `lecture.mp4 · ${d.fileSelected}` : d.videoFormats;
      const proc = dr + 0.45;
      const pb = q('#processMediaButton');
      pb.disabled = u < dr;
      pb.style.transform = `scale(${(1 - 0.05 * T.press(u, proc)).toFixed(3)})`;
      q('#jobPanel').hidden = u < proc + 0.05;
      const prog = clamp(inv(proc + 0.1, rd, u));
      const stages = ['stageExtracting', 'stageTranscribing', 'stageTranslating', 'stageNarrating', 'stageAligning'];
      q('#jobStage').textContent = u > rd ? d.stageReady : d[stages[Math.min(4, Math.floor(prog * 5))]];
      q('#jobFile').textContent = 'lecture.mp4';
      q('#jobPercent').textContent = Math.round(prog * 100) + '%';
      q('#jobProgress').value = prog;
      const ready = u > rd;
      q('#playerEmpty').hidden = ready; q('#playerReady').hidden = !ready; q('#playerCard').classList.toggle('empty', !ready);
      P.setVid(this.vw, 4 + Math.max(0, u - c('ready')) * 0.5);
      // ZIP: the four files fold into one archive
      const zipChip = q('#downloadMediaZip');
      const zr = zipChip.getBoundingClientRect();
      zipChip.style.transform = `scale(${(1 - 0.06 * T.press(u, zp) + 0.04 * T.hover(u, zp, 0.5, 0.2)).toFixed(3)})`;
      zipChip.style.boxShadow = `0 0 ${(30 * T.hover(u, zp, 0.5, 0.2)).toFixed(1)}px rgba(143,125,255,.6)`;
      const zpp = E.back(inv(zp + 0.05, zp + 0.5, u));
      st(this.zip, { opacity: fade(u, zp + 0.05, zp + 0.2, 98, 99).toFixed(3), transform: `translate(${(zc[0] - 60).toFixed(1)}px,${(zc[1] - 230 - 30 * clamp(zpp)).toFixed(1)}px) scale(${(0.4 + 0.6 * zpp).toFixed(3)})` });
      ['#downloadOriginal', '#downloadDubbed', '#downloadSourceSrt', '#downloadTranslatedSrt'].forEach((s, i) => {
        const e = q(s), a = zp + 0.1 + i * 0.07, p = E.io(inv(a, a + 0.4, u));
        e.style.transform = '';
        const er = e.getBoundingClientRect();
        e.style.transform = p > 0 ? `translate(${((zr.left - er.left) * p).toFixed(1)}px,${((zr.top - er.top - 200) * p).toFixed(1)}px) scale(${(1 - 0.6 * p).toFixed(3)})` : '';
        e.style.opacity = (1 - clamp(inv(a + 0.25, a + 0.4, u))).toFixed(3);
      });
      const PATH = [[any - 1.2, m.start.cx + T.dx(300), m.start.cy + 260], [any - 0.05, m.start.cx, m.start.cy, E.soft, 0.1], [stu - 0.6, m.start.cx + T.dx(120), m.start.cy + 180],
        [dragA - 0.4, fileHome[0] + 40, fileHome[1] + 30], [dragA, fileHome[0] + 50, fileHome[1] + 40, E.soft], [dr, drop[0], drop[1], E.io, 0.06], [proc, m.process.cx, wy(m.process.cy), E.soft, 0.1], [zp, zc[0], zc[1], E.soft, 0.1], [zp + 0.8, zc[0] + T.dx(70), zc[1] + 80]];
      T.cursor(this.C, u, PATH, [any - 0.05, proc, zp], [[dragA, dr]], Math.max(fade(u, any - 1.0, any - 0.6, any + 0.3, any + 0.6), fade(u, dragA - 0.7, dragA - 0.4, zp + 0.5, zp + 0.9)), cmr[4]);
    },
    hide() { show(this.W.sec, false); this.os.forEach((b) => (b.style.opacity = 0)); },
  });

  /* ======================================================================= 9 · outro */
  sc({
    id: 'outro', pre: 0.45, post: 0.2,
    async build(D) {
      const sec = (this.sec = h('section', 'scene', null, T.$('scenes')));
      sec.id = 'sc-outro';
      sec.style.display = 'block';
      const deep = (this.deep = h('div', 'a', null, sec, 'left:0;top:0;width:1920px;height:1080px;perspective:1800px;perspective-origin:960px 480px'));
      const loc = D.ui === 'fa' ? 'fa' : D.ui === 'zh-Hans' ? 'zh-CN' : 'en';
      const cards = [
        [`/repo/docs/images/extension/popup-${loc}.png`, 230, 140, 300, null, 24, -6, -520],
        [`/repo/docs/images/extension/player-${loc}.png`, 1390, 120, 470, null, -22, 4, -560],
        [`/repo/docs/images/app-${D.ui === 'fa' ? 'fa' : 'en'}.png`, 110, 640, 560, null, 18, 10, -640],
        [`/repo/docs/images/extension/subtitles-${loc}.png`, 1290, 660, 560, null, -18, -8, -600],
      ];
      this.cards = cards.map(([src, x, y, w, _h, ry, rx, z]) => {
        const e = h('img', 'a', null, deep, `left:${x}px;top:${y}px;width:${w}px;border-radius:14px;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 40px 90px rgba(0,0,0,.7);opacity:0`);
        e.src = src;
        return { e, ry, rx, z };
      });
      const g = (this.g = h('div', 'a', null, sec, 'left:0;top:0;width:1920px;height:1080px;transform-origin:960px 420px'));
      this.glow = h('div', 'a', null, g, 'left:610px;top:-60px;width:700px;height:700px;border-radius:50%;background:radial-gradient(closest-side,rgba(107,59,255,.32),rgba(63,249,249,.08) 55%,transparent)');
      this.logo = h('img', 'a', null, g, 'left:860px;top:140px;width:200px;height:200px');
      this.logo.src = '/src/assets/logo/logo-full.png';
      this.word = h('div', 'a', 'Avorythm', g, 'left:0;top:342px;width:1920px;text-align:center;font:700 72px "Inter Variable";letter-spacing:-.02em;color:#fff');
      this.title = h('div', 'a', null, g, `left:0;top:446px;width:1920px;text-align:center;font:750 50px/1.3 var(--ui);direction:${D.dir}`);
      T.splitWords(this.title, D.text.outroTitle, D.lang);
      this.title._w.forEach((w) => w.classList.add('g'));
      const row = h('div', 'a', null, g, 'left:0;top:556px;width:1920px;display:flex;justify-content:center;gap:22px;direction:ltr');
      this.star = h('div', null, `<span class="gh">${P.ico('github', '', 2)}</span><span style="font:650 30px var(--ui)">${esc(D.text.outroStar)}</span><span class="st">${P.ico('star', '', 2)}</span>`, row,
        'position:relative;display:flex;align-items:center;gap:16px;height:84px;padding:0 34px;border-radius:22px;background:linear-gradient(90deg,#6b3bff,#2bc4e3);box-shadow:0 18px 50px -12px rgba(107,59,255,.8),inset 0 1px 0 rgba(255,255,255,.25);color:#fff;white-space:nowrap');
      this.star.querySelector('.gh svg').style.cssText = 'width:32px;height:32px;display:block';
      this.starIco = this.star.querySelector('.st svg');
      this.starIco.style.cssText = 'width:34px;height:34px;display:block';
      this.cws = h('div', null, `${P.ico('bag', '', 2.2)}<span style="font:600 26px 'Inter Variable'">Chrome Web Store</span>`, row, 'display:flex;align-items:center;gap:14px;height:84px;padding:0 30px;border-radius:22px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);color:#fff;white-space:nowrap');
      this.cws.querySelector('svg').style.cssText = 'width:28px;height:28px';
      this.url = h('div', 'a', '', g, 'left:0;top:684px;width:1920px;text-align:center;font:600 32px "JetBrains Mono Variable";color:#9ff6f2;letter-spacing:.01em;direction:ltr');
      this.mit = h('div', 'a', `<span style="width:10px;height:10px;border-radius:50%;background:#4ade80;box-shadow:0 0 10px #4ade80"></span>${esc(D.text.outroMit)}`, g, `left:960px;top:748px;display:flex;align-items:center;gap:12px;padding:9px 22px;border-radius:999px;border:1px solid rgba(74,222,128,.4);background:rgba(74,222,128,.08);font:700 22px var(--ui);color:#bbf7d0;white-space:nowrap;direction:${D.dir}`);
      this.sparks = [...Array(16)].map((_, k) => h('div', 'a', null, g, `width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:${k % 2 ? '#ffd36e' : '#7cf0ec'};box-shadow:0 0 12px ${k % 2 ? '#ffb347' : '#3ff9f9'};opacity:0`));
      this.C = T.makeCursor(g);
      const R = this.title._w.map((e) => e.getBoundingClientRect()), l = Math.min(...R.map((r) => r.left)), rr = Math.max(...R.map((r) => r.right));
      this.title._w.forEach((e, i) => { e.style.backgroundSize = `${rr - l}px 100%`; e.style.backgroundPosition = `${l - R[i].left}px 0`; });
      const ir = this.starIco.getBoundingClientRect();
      this.sc = [ir.left + ir.width / 2, ir.top + ir.height / 2];
      this.mitW = this.mit.offsetWidth;
    },
    render(u, t) {
      const c = (n) => T.C('outro', n);
      show(this.sec, true);
      const lg = c('logo'), fr = c('free'), sr = c('star'), ur = c('url'), Dn = c('end');
      const wi = T.whip(u), rise = u < 0.45 ? 1050 * (1 - wi.s) : 0;
      this.sec.style.opacity = 1;
      st(this.g, { transform: `translateY(${rise.toFixed(1)}px) scale(${(1.08 - 0.08 * E.expo(inv(-0.45, 1.2, u)) + 0.025 * inv(1.2, Dn, u)).toFixed(4)})`, filter: u < 0.45 ? T.mb(wi.b, 1) : 'none' });
      this.deep.style.transform = `translateY(${(rise * 0.6).toFixed(1)}px)`;
      this.cards.forEach((k, i) => {
        const a = -0.45 + i * 0.08, p = E.expo(inv(a, a + 1.4, u));
        st(k.e, { opacity: ((0.32 + 0.2 * (1 - clamp(inv(0, 1.2, u)))) * clamp(inv(a, a + 0.3, u))).toFixed(3), filter: 'blur(1.2px) saturate(.8)',
          transform: `translateZ(${(k.z - 300 * (1 - p) + 40 * Math.sin(u * 0.5 + i)).toFixed(1)}px) rotateY(${(k.ry + Math.sin(u * 0.4 + i) * 2).toFixed(2)}deg) rotateX(${k.rx.toFixed(2)}deg)` });
      });
      const lp = E.back(inv(lg - 0.4, lg + 0.4, u)), hit = u > lg ? Math.exp(-(u - lg) * 2.5) : 0;
      st(this.logo, { opacity: clamp(inv(lg - 0.4, lg - 0.1, u)).toFixed(3), transform: `scale(${(0.5 + 0.5 * lp + 0.05 * hit).toFixed(4)}) rotate(${((1 - clamp(lp)) * -24).toFixed(2)}deg)`, filter: `drop-shadow(0 0 ${(14 + 34 * hit).toFixed(1)}px rgba(139,108,255,.8))` });
      this.glow.style.opacity = (0.85 * E.o(inv(-0.45, lg + 0.6, u))).toFixed(3);
      const wp = E.expo(inv(lg, lg + 0.8, u));
      st(this.word, { opacity: clamp(inv(lg, lg + 0.3, u)).toFixed(3), letterSpacing: `${lerp(0.22, -0.02, wp).toFixed(3)}em` });
      T.words(this.title, u, fr - 0.2, { s: 0.08, d: 0.7 });
      const ps = T.press(u, sr);
      [[this.star, fr + 0.35, 1 - 0.04 * ps], [this.cws, fr + 0.5, 1]].forEach(([e, a, k]) => { const p = E.back(inv(a, a + 0.5, u)); e.style.opacity = clamp(inv(a, a + 0.2, u)).toFixed(3); e.style.transform = `translateY(${((1 - clamp(p)) * 26).toFixed(1)}px) scale(${((0.9 + 0.1 * p) * k).toFixed(4)})`; });
      { const a = fr + 0.9, p = E.back(inv(a, a + 0.5, u)); this.mit.style.opacity = clamp(inv(a, a + 0.2, u)).toFixed(3); this.mit.style.transform = `translateX(${(-this.mitW / 2).toFixed(1)}px) translateY(${((1 - clamp(p)) * 20).toFixed(1)}px)`; }
      const filled = u > sr;
      this.starIco.querySelector('path').setAttribute('fill', filled ? '#ffd36e' : 'none');
      this.starIco.style.color = filled ? '#ffd36e' : '#fff';
      this.starIco.style.transform = `scale(${(1 + 0.5 * pulse(u, sr, 0.6)).toFixed(3)}) rotate(${(72 * E.o(inv(sr, sr + 0.5, u))).toFixed(1)}deg)`;
      this.sparks.forEach((s, k) => { const p = inv(sr, sr + 0.8, u), a = (k / 16) * Math.PI * 2, r = 16 + 120 * E.o(p); st(s, { opacity: (p > 0 && p < 1 ? 1 - p : 0).toFixed(3), transform: `translate(${(this.sc[0] + Math.cos(a) * r).toFixed(1)}px,${(this.sc[1] + Math.sin(a) * r).toFixed(1)}px) scale(${(1.3 - p).toFixed(3)})` }); });
      const full = 'msmahdinejad.github.io/avorythm', n = Math.round(full.length * clamp(inv(ur, ur + 0.9, u)));
      this.url.textContent = full.slice(0, n) + (u > ur && u < ur + 1.6 && Math.floor(u * 3) % 2 === 0 ? '▍' : '');
      const PATH = [[sr - 1.2, 1500, 900], [sr, this.sc[0], this.sc[1], E.soft, 0.12], [sr + 1.0, this.sc[0] + 90, this.sc[1] + 110]];
      T.cursor(this.C, u, PATH, [sr], [], fade(u, sr - 1.0, sr - 0.7, sr + 0.6, sr + 1.0), 1);
    },
    hide() { show(this.sec, false); },
  });
})();
