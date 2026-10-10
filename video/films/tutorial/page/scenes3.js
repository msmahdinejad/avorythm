/* Avorythm tutorial — scenes 6 (make it yours), 7 (synchronized player), 8 (desktop app), 9 (outro). */
(function () {
  const { clamp, lerp, inv, E, fade, bump, pulse, kf, st, show, blur, h, esc, cam } = T;
  const sc = (def) => { SC.push(def); return def; };
  const ISO = '.topbar,.intro,.notice,.consent-tip,.section-nav,.reset-button,#connection,#captions,#sync,#privacy{display:none!important}' +
    'html,body{background:transparent!important;min-height:0!important}.ambient{display:none!important}' +
    '.shell{padding:0!important;max-width:none!important;margin:0!important}.settings-layout,.settings-stack{display:block!important}';
  const lines = (D) => ({ src: D.demo.source[0], tr: D.demo.translated[0], src2: D.demo.source[1], tr2: D.demo.translated[1] });
  const fontFor = (lang) => ({ zh: '"Noto Sans SC Variable"', ja: '"Noto Sans JP Variable"', hi: '"Noto Sans Devanagari Variable"', fa: '"Vazirmatn Variable"', ar: '"Vazirmatn Variable"' }[lang] || '"Inter Variable"');
  const dirFor = (lang) => (lang === 'fa' || lang === 'ar' ? 'rtl' : 'ltr');

  // the frosted subtitle card (styles from extension/content.js)
  function subCard(parent, D, o) {
    const L = lines(D);
    const card = h('div', 'subcard', `<div class="grip"></div><p class="src"></p><p class="tr"></p><div class="rz"></div>`, parent, `left:${o.x}px;top:${o.y}px;width:${o.w}px;--size:${o.size || 24}px;--op:.8`);
    const src = card.querySelector('.src'), tr = card.querySelector('.tr');
    src.style.fontFamily = fontFor(D.demo.sourceLang) + ',"Inter Variable",sans-serif'; src.dir = dirFor(D.demo.sourceLang);
    tr.style.fontFamily = fontFor(D.lang) + ',"Inter Variable",sans-serif'; tr.dir = dirFor(D.lang);
    T.splitWords(src, L.src, D.demo.sourceLang); T.splitWords(tr, L.tr, D.lang);
    return { card, src, tr };
  }

  /* ======================================================================= 6 · make it yours (split view) */
  sc({
    id: 'outputs', pre: 0.45, post: 0.5,
    async build(D) {
      const K = 2.4;
      const W = (this.W = T.world('outputs', K, 1900, 1100));
      W.zw.style.transformStyle = 'preserve-3d';
      // left: the video with its live outputs
      const vp = (this.vp = h('div', 'a', null, W.zw, 'left:40px;top:250px;width:1000px;height:562.5px;border-radius:18px;overflow:hidden;background:#000;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 60px 120px -30px rgba(0,0,0,.85);transform-origin:100% 50%'));
      this.vid = h('div', 'a', P.VID, vp, 'inset:0');
      this.wave = h('div', 'a', null, vp, 'left:0;right:0;bottom:0;height:150px');
      this.wave.innerHTML = '<svg width="1000" height="150" viewBox="0 0 1000 150" style="position:absolute;left:0;top:0"><path class="wo" stroke="url(#gOrig6)" stroke-width="3.5" stroke-linecap="round" fill="none"/><path class="wd" stroke="url(#gDub6)" stroke-width="4.5" stroke-linecap="round" fill="none" style="filter:drop-shadow(0 0 8px rgba(63,249,249,.7))"/><defs><linearGradient id="gDub6" x1="0" x2="1"><stop offset="0" stop-color="#3ff9f9" stop-opacity="0"/><stop offset=".2" stop-color="#3ff9f9"/><stop offset=".8" stop-color="#7cf0ec"/><stop offset="1" stop-color="#3ff9f9" stop-opacity="0"/></linearGradient><linearGradient id="gOrig6" x1="0" x2="1"><stop offset="0" stop-color="#9d85ff" stop-opacity="0"/><stop offset=".2" stop-color="#9d85ff"/><stop offset=".8" stop-color="#b9a8ff"/><stop offset="1" stop-color="#9d85ff" stop-opacity="0"/></linearGradient></defs></svg>';
      this.sub = subCard(vp, D, { x: 190, y: 378, w: 620, size: 24 });
      this.dragTag = h('div', 'pill', `<span class="dt"></span>${esc(D.text.drag)}`, vp, 'opacity:0;font-size:15px;padding:6px 14px;gap:8px');
      this.rzTag = h('div', 'pill', `<span class="dt"></span>${esc(D.text.resize)}`, vp, 'opacity:0;font-size:15px;padding:6px 14px;gap:8px');
      // right: the real "On-page playback" settings card
      const cw = 760;
      const cc = (this.cc = h('div', 'a', null, W.zw, `left:1100px;top:150px;width:${cw}px;height:800px;transform-origin:0 50%`));
      const opt = (this.opt = await P.embed('options', D.ui, cc, cw, 800, ISO));
      opt.frame.style.background = 'transparent';
      T.optionsState(opt, { loc: D.ui });
      const ch = Math.ceil(opt.q('#output').getBoundingClientRect().bottom) + 4;
      opt.frame.style.height = ch + 'px'; cc.style.height = ch + 'px';
      const r = (s) => { const x = opt.rect(s); return { x: 1100 + x.x, y: 150 + x.y, w: x.w, h: x.h, cx: 1100 + x.cx, cy: 150 + x.cy }; };
      const ids = ['pageOriginalAudioEnabled', 'pageDubAudioEnabled', 'pageSourceSubtitlesEnabled', 'pageTranslatedSubtitlesEnabled'];
      this.m = { boxes: ids.map((i) => r('#' + i)), opts: ids.map((i) => r(opt.q('#' + i).closest('label'))), grid: r('#output .channel-grid'), range: r('#output .range-grid'), ovol: r('#pageOriginalVolume'), duck: r(opt.q('#pageAutoDuck').closest('label')), card: { x: 1100, y: 150, w: cw, h: ch } };
      this.ids = ids;
      // the audio scope (explains the mixer + ducking)
      const sco = (this.scope = h('div', 'a', null, W.zw, `left:${this.m.range.x - 300}px;top:${this.m.range.y - 6}px;width:270px;height:190px;border-radius:18px;background:rgba(12,14,28,.92);border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 70px rgba(0,0,0,.6);opacity:0;transform:translateZ(60px)`));
      sco.innerHTML = `<div class="a" style="left:18px;top:14px;font:650 13px var(--ui);color:#c4b6ff">${esc(opt.dict.originalAudio)}</div>
        <svg class="a" style="left:10px;top:34px" width="250" height="54" viewBox="0 0 250 54"><path class="so" stroke="#9d85ff" stroke-width="3" stroke-linecap="round" fill="none"/></svg>
        <div class="a" style="left:18px;top:102px;font:650 13px var(--ui);color:#8ff3ef">${esc(opt.dict.dubbedAudio)}</div>
        <svg class="a" style="left:10px;top:122px" width="250" height="54" viewBox="0 0 250 54"><path class="sd" stroke="#3ff9f9" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`;
      this.duckTag = h('div', 'pill', `<span class="dt"></span>${esc(D.text.ducking)}`, W.zw, 'opacity:0;font-size:14px;padding:6px 14px;gap:8px');
      this.C = T.makeCursor(W.zw);
      this.D = D;
    },
    render(u, t) {
      const W = this.W, m = this.m, c = (n) => T.C('outputs', n), opt = this.opt, q = opt.q;
      show(W.sec, true);
      const o1 = c('o1'), o2 = c('o2'), o3 = c('o3'), o4 = c('o4'), cd = c('card'), dg = c('drag'), dgE = c('dragEnd'), rz = c('resize'), rzE = c('resizeEnd'), bl = c('balance'), blE = c('balanceEnd'), dk = c('duck'), Dn = c('end');
      const vc = [540, 531];
      // card drag/resize geometry (in video-local px)
      const dgp = E.io(inv(dg + 0.05, dgE, u)), rzp = E.io(inv(rz + 0.05, rzE, u));
      const cx0 = 190, cy0 = 378, cW = 620 + 170 * rzp;
      const cX = cx0 - 120 * dgp - 85 * rzp * 0, cY = cy0 - 290 * dgp;
      const cardW = [40 + cX + cW / 2, 250 + cY + 60];
      const grid = [m.grid.cx, m.grid.cy], rng = [m.ovol.cx + T.dx(60), m.ovol.cy + 30];
      const K = [
        [-0.45, [960, 470, vc[0], vc[1], 1.3, 0, 0, 0, 0]],
        [0, [960, 470, vc[0], vc[1], 1.3, 0, 0, 0, 0]],
        [1.7, [960, 540, 950, 560, 0.86, 6, -2, 0, 0], E.quint],
        [o1 - 0.7, [1000, 470, grid[0] - T.dx(40), grid[1], 2.25, 3, -6, 0, 0], E.quint],
        [o4 + 0.25, [1000, 470, grid[0] - T.dx(20), grid[1], 2.32, 2.5, -5, 0, 0], E.lin],
        [cd + 0.35, [960, 480, cardW[0], 250 + cy0 + 60, 2.05, 2, 6, 0, 0], E.quint],
        [dg - 0.05, [960, 500, 40 + cx0 + 310, 250 + cy0 + 40, 1.7, 2, 4, 0, 0], E.io],
        [rzE + 0.1, [960, 500, 40 + cx0 + 280, 250 + cy0 - 140, 1.55, 2, 3, 0, 0], E.io],
        [bl - 0.25, [960, 600, m.range.x + 40, m.range.y + 60, 2.05, 3, -5, 0, 0], E.quint],
        [dk - 0.3, [960, 590, m.range.x + 60, m.range.y + 80, 2.1, 2.5, -4, 0, 0], E.sine],
        [dk + 0.5, [960, 560, m.range.x + 60, m.duck.cy - 60, 2.1, 2, -3, 0, 0], E.io],
        [Dn - 0.2, [960, 560, m.range.x + 40, m.duck.cy - 70, 1.95, 2, -2, 0, 0], E.sine],
        [Dn + 0.5, [960, 540, vc[0] + 160, vc[1] - 80, 3.4, 0, 0, 0, 0], E.expoIn],
      ];
      const cmr = kf(u, K).slice();
      const [dx, dy] = T.drift(u + 13, 0.7 * clamp(inv(0.5, 1.7, u)));
      cmr[5] += dx; cmr[6] += dy;
      cam(W.rig, cmr, W.K);
      const out = E.i(inv(Dn + 0.15, Dn + 0.5, u));
      st(W.sec, { opacity: Math.min(clamp(inv(-0.45, -0.05, u)), 1 - out).toFixed(3), filter: blur(out * 8) });
      // split-view 3D: the two panels turn toward each other in the overview, flatten for close-ups
      const tilt = bump(u, 0.6, 1.7, o1 - 0.7) * 1 + fade(u, Dn - 0.4, Dn, 99, 100) * 0;
      this.vp.style.transform = `rotateY(${(12 * tilt).toFixed(2)}deg)`;
      this.cc.style.transform = `rotateY(${(-12 * tilt).toFixed(2)}deg)`;
      P.setVid(this.vid, Math.min(14, 3 + (T.D('lang') + T.D('start')) * 0.4 + Math.max(0, u) * 0.08));
      // outputs state
      const on = [u > o1, true, u > o3, u > o4];
      this.ids.forEach((id, i) => { q('#' + id).checked = on[i]; });
      const hl2 = fade(u, o2 - 0.2, o2, o2 + 0.6, o2 + 0.9);
      opt.q('#pageDubAudioEnabled').closest('label').style.boxShadow = `0 0 0 ${(2 * hl2).toFixed(2)}px rgba(124,240,236,.9), 0 0 ${(26 * hl2).toFixed(1)}px rgba(124,240,236,.35)`;
      [o1, o3, o4].forEach((cc0, k) => { const lb = q('#' + this.ids[[0, 2, 3][k]]).closest('label'); const g = pulse(u, cc0, 0.8); lb.style.boxShadow = g > 0.01 ? `0 0 ${(30 * g).toFixed(1)}px rgba(143,125,255,${(0.6 * g).toFixed(2)})` : ''; });
      // mixer + ducking
      const vol = lerp(1, 0.4, E.io(inv(bl + 0.05, blE, u)));
      q('#pageOriginalVolume').value = vol;
      q('#pageOriginalVolumeValue').textContent = Math.round(vol * 100) + '%';
      const dh = fade(u, dk - 0.1, dk + 0.2, Dn - 0.6, Dn - 0.2);
      q('#pageAutoDuck').closest('label').style.boxShadow = `0 0 ${(34 * dh).toFixed(1)}px rgba(124,240,236,${(0.4 * dh).toFixed(2)})`;
      q('#pageAutoDuck').closest('label').style.background = `rgba(124,240,236,${(0.08 * dh).toFixed(3)})`;
      // speech envelope of the dub (bursts) and ducking of the original
      const speech = 0.5 + 0.5 * Math.sin(t * 2.1) * Math.sin(t * 0.9 + 1);
      const duckAmt = u > dk ? clamp(inv(dk, dk + 0.4, u)) * clamp(speech * 1.6) : 0;
      const origAmp = (on[0] ? 0.55 : 0.04) * vol * (1 - 0.7 * duckAmt);
      const dubAmp = 0.85 * (u > dk ? 0.35 + 0.65 * clamp(speech * 1.6) : 1);
      this.wave.querySelector('.wo').setAttribute('d', T.waveD(t, origAmp * 0.7 + 0.03, 2));
      this.wave.querySelector('.wd').setAttribute('d', T.waveD(t * 1.15, dubAmp * 0.75, 5));
      this.wave.querySelector('.wo').setAttribute('transform', 'translate(0,-34)');
      this.wave.querySelector('.wd').setAttribute('transform', 'translate(0,22)');
      this.wave.querySelector('.wo').style.opacity = (0.25 + 0.75 * clamp(inv(o1, o1 + 0.3, u))).toFixed(3);
      const sv = fade(u, bl - 0.3, bl + 0.1, Dn - 0.3, Dn);
      st(this.scope, { opacity: sv.toFixed(3), transform: `translateZ(60px) translateX(${((1 - E.expo(inv(bl - 0.3, bl + 0.4, u))) * 30).toFixed(1)}px)` });
      this.scope.querySelector('.so').setAttribute('d', T.waveD(t, origAmp * 1.1 + 0.03, 2, 46, 250, 54));
      this.scope.querySelector('.sd').setAttribute('d', T.waveD(t * 1.15, dubAmp, 5, 46, 250, 54));
      const dtv = fade(u, dk, dk + 0.25, Dn - 0.5, Dn - 0.2), dte = E.back(inv(dk, dk + 0.45, u));
      st(this.duckTag, { opacity: dtv.toFixed(3), transform: `translate(${(T.RTLUI ? m.duck.x + m.duck.w - 300 - this.duckTag.offsetWidth : m.duck.x + 300).toFixed(1)}px,${(m.duck.y - 6).toFixed(1)}px) scale(${(0.85 + 0.15 * clamp(dte, 0, 1.1)).toFixed(3)})` });
      // the subtitle card on the video
      const s = this.sub;
      const cv = Math.max(clamp(inv(o3, o3 + 0.25, u)), 0);
      st(s.card, { opacity: cv.toFixed(3), left: cX.toFixed(1) + 'px', top: cY.toFixed(1) + 'px', width: cW.toFixed(1) + 'px', transform: `translateY(${((1 - E.expo(inv(o3, o3 + 0.6, u))) * 14).toFixed(1)}px)` });
      const trOn = u > o4;
      s.src.style.cssText += trOn ? ';color:rgba(226,232,240,.72);font-size:calc(var(--size,24px)*.68);font-weight:500' : ';color:#fff;font-size:var(--size,24px);font-weight:650';
      s.tr.style.display = trOn ? 'block' : 'none';
      T.words(s.src, u, o3 + 0.1, { s: 0.09, d: 0.35, y: 6, b: 3 });
      T.words(s.tr, u, o4 + 0.1, { s: 0.11, d: 0.4, y: 8, b: 4 });
      s.card.querySelector('.grip').style.background = `rgba(255,255,255,${(0.28 + 0.5 * fade(u, dg - 0.3, dg, dgE, dgE + 0.3)).toFixed(3)})`;
      const tg1 = fade(u, dg - 0.2, dg + 0.1, dgE + 0.2, dgE + 0.5), tg2 = fade(u, rz - 0.2, rz + 0.1, rzE + 0.2, rzE + 0.5);
      st(this.dragTag, { opacity: tg1.toFixed(3), transform: `translate(${(cX + cW / 2 - 40).toFixed(1)}px,${(cY - 46).toFixed(1)}px)` });
      st(this.rzTag, { opacity: tg2.toFixed(3), transform: `translate(${(cX + cW + 14).toFixed(1)}px,${(cY + 60).toFixed(1)}px)` });
      // cursor
      const B = m.boxes;
      const grip0 = [40 + cx0 + 310, 250 + cy0 + 9], grip1 = [40 + cx0 - 120 + 310, 250 + cy0 - 290 + 9];
      const rz0 = [40 + cX + 620 - 8, 250 + cY + 112], hand = cY;
      const rzStart = [40 + (cx0 - 120) + 620 - 8, 250 + (cy0 - 290) + 110], rzEnd = [rzStart[0] + 170, rzStart[1]];
      const PATH = [[o1 - 0.9, 1700, 900], [o1, B[0].cx, B[0].cy, E.soft, 0.1], [o2 - 0.05, B[1].cx + 30, B[1].cy + 20, E.io, 0.05], [o3, B[2].cx, B[2].cy, E.soft, 0.1], [o4, B[3].cx, B[3].cy, E.soft, -0.1],
        [dg - 0.5, grip0[0] + 40, grip0[1] + 60], [dg, grip0[0], grip0[1], E.soft, 0.08], [dgE, grip1[0], grip1[1], E.io, 0.05], [rz - 0.1, rzStart[0], rzStart[1], E.soft, 0.1], [rz + 0.05, rzStart[0], rzStart[1]], [rzE, rzEnd[0], rzEnd[1], E.io, 0],
        [bl, T.along(m.ovol, 1 / 1.5), m.ovol.cy, E.soft, 0.1], [blE, T.along(m.ovol, 0.4 / 1.5), m.ovol.cy, E.io, 0], [dk + 0.4, T.along(m.ovol, 0.2), m.ovol.cy + 60]];
      const vis = Math.max(fade(u, o1 - 0.8, o1 - 0.5, dk + 0.3, dk + 0.6), 0);
      T.cursor(this.C, u, PATH, [o1, o3, o4], [[dg, dgE], [rz, rzE], [bl, blE]], vis, cmr[4]);
    },
    hide() { show(this.W.sec, false); },
  });

  /* ======================================================================= 7 · synchronized player */
  sc({
    id: 'player', pre: 0.5, post: 0.45,
    async build(D) {
      const K = 2.3;
      const W = (this.W = T.world('player', K, 1440, 900));
      const B = (this.B = P.browser(W.zw, { w: 1440, h: 900, host: 'chrome-extension://kbdbbedijheicmmnmoidamdaodjbhjje', path: '/player.html',
        tabs: [{ title: 'Every New Path · Short film', fav: 'linear-gradient(135deg,#1e3a5f,#5f8f9d)' }, { title: 'Avorythm · Synchronized Player', img: P.LOGO, on: 1 }] }));
      B.av.style.opacity = 1;
      const pl = (this.pl = await P.embed('player', D.ui, B.page, 1440, 810));
      const doc = pl.doc, q = pl.q, d = pl.dict;
      // the recorded short film inside the real player stage (same SVG gradients as the film page)
      const defs = document.querySelector('svg defs').outerHTML;
      const stage = q('.video-stage');
      const vwrap = doc.createElement('div');
      vwrap.style.cssText = 'position:absolute;inset:0;overflow:hidden;border-radius:inherit';
      vwrap.innerHTML = `<svg width="0" height="0" style="position:absolute">${defs}</svg>` + P.VID;
      stage.insertBefore(vwrap, stage.firstChild);
      this.vwrap = vwrap;
      q('#bufferOverlay').hidden = true; q('#rebufferNotice').hidden = true; q('#stageError').hidden = true;
      const L = lines(D);
      const sc1 = q('#sourceCaption'), tc1 = q('#translatedCaption');
      sc1.hidden = false; tc1.hidden = false; sc1.textContent = L.src; tc1.textContent = L.tr;
      sc1.style.fontFamily = fontFor(D.demo.sourceLang) + ',Vazirmatn,sans-serif'; tc1.style.fontFamily = fontFor(D.lang) + ',Vazirmatn,sans-serif';
      q('#liveBadge').classList.add('playing'); q('#liveBadge span').textContent = d.playing;
      q('#delayBadge').textContent = '+20.0s';
      q('#recordedValue').textContent = '1:24'; q('#leadValue').textContent = '20.0s'; q('#engineValue').textContent = d.gemini;
      q('#downloadState').textContent = d.recording;
      q('#downloadVideoButton').disabled = true;
      ['originalAudioEnabled', 'dubAudioEnabled', 'sourceSubtitlesEnabled', 'translatedSubtitlesEnabled', 'autoDuck'].forEach((id, i) => { q('#' + id).checked = [false, true, true, true, true][i]; });
      q('#originalVolume').value = 1; q('#dubVolume').value = 1; q('#originalVolumeValue').textContent = '100%'; q('#dubVolumeValue').textContent = '100%';
      q('#seekRange').max = 84; q('#seekRange').value = 30; q('#localeToggle').value = D.ui;
      const r = (s) => { const x = pl.rect(s); return { x: x.x, y: 90 + x.y, w: x.w, h: x.h, cx: x.cx, cy: 90 + x.cy }; };
      this.m = { stage: r('.video-stage'), play: r('#playButton'), seek: r('#seekRange'), full: r('#fullscreenButton'), time: r('#timeLabel'), dl: r('#downloadVideoButton'), dock: r('.sync-dock'), state: r('#downloadState'), transport: r('.transport') };
      this.m.scroll2 = Math.max(0, this.m.dock.y - 90 - 300);
      // download cards that fly out on export
      const files = [['WebM', D.text.fileVideo, 'film', '#e4e4e7'], ['SRT', d.sourceSubtitles, 'cc', '#b9a8ff'], ['SRT', d.translatedSubtitles, 'cc', '#7ff7f7']];
      this.files = files.map(([ext, lab, ic, col], i) => {
        const e = h('div', 'a', `<div style="width:64px;height:64px;border-radius:18px;margin:18px auto 0;display:flex;align-items:center;justify-content:center;color:${col};background:${col}22;box-shadow:inset 0 0 0 1px ${col}55">${P.ico(ic, '', 2)}</div><div style="margin-top:12px;font:800 22px 'Inter Variable';letter-spacing:.06em;color:#fff">${ext}</div><div style="margin-top:4px;font:500 13px var(--ui);color:#a9abc0;padding:0 10px">${esc(lab)}</div>`, W.zw,
          'left:0;top:0;width:170px;height:186px;margin:-93px 0 0 -85px;border-radius:22px;text-align:center;background:linear-gradient(180deg,rgba(38,38,52,.97),rgba(20,20,30,.98));border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 60px -20px rgba(0,0,0,.85);opacity:0');
        e.querySelector('svg').style.cssText = 'width:30px;height:30px';
        return e;
      });
      this.shade = h('div', 'a', null, B.page, 'inset:0;background:rgba(5,6,14,.72);opacity:0;z-index:5');
      this.C = T.makeCursor(W.zw);
      this.D = D;
    },
    render(u, t) {
      const W = this.W, m = this.m, c = (n) => T.C('player', n), pl = this.pl, q = pl.q, d = pl.dict;
      show(W.sec, true);
      const pa = c('pause'), sk = c('seek'), skE = c('seekEnd'), fu = c('full'), fuE = c('fullEnd'), cp = c('complete'), bd = c('build'), fl = c('files'), Dn = c('end'), D0 = T.D('player');
      const sp = E.quint(inv(cp + 0.05, cp + 0.9, u));
      const scroll = lerp(0, m.scroll2, sp);
      pl.doc.scrollingElement.scrollTop = scroll;
      const wy = (y) => y - scroll;
      const st0 = m.stage, fillS = 1920 / st0.w * 1.04;
      const fsp = bump(u, fu + 0.05, fu + 0.4, fuE);
      const K = [
        [-0.5, [960, 540, st0.cx, st0.cy, fillS * 1.15, 0, 0, 0, 0]],
        [0.1, [960, 540, st0.cx, st0.cy, fillS, 0, 0, 0, 0], E.o],
        [1.6, [960, 560, 720, 470, 0.82, 9, -12, 0, 0], E.quint],
        [pa - 0.6, [960, 560, m.play.cx + T.dx(470), m.play.cy - 70, 1.9, 6, -5, 0, 0], E.quint],
        [skE + 0.05, [960, 560, m.play.cx + T.dx(520), m.play.cy - 70, 1.95, 5, -4, 0, 0], E.sine],
        [fu - 0.35, [960, 520, m.full.cx - T.dx(380), m.full.cy - 50, 2.2, 4, -3, 0, 0], E.quint],
        [fu + 0.05, [960, 520, m.full.cx - T.dx(380), m.full.cy - 50, 2.25, 3.6, -2.8, 0, 0], E.lin],
        [cp + 0.9, [960, 470, m.dl.cx - T.dx(320), wy(m.dl.cy) - 120, 1.85, 3, -3, 0, 0], E.quint],
        [bd + 0.2, [960, 470, m.dl.cx - T.dx(220), wy(m.dl.cy) - 100, 2.0, 2.5, -2.5, 0, 0], E.sine],
        [fl + 0.9, [960, 500, 720, wy(m.dl.cy) - 260, 1.22, 6, -6, 0, 0], E.quint],
        [D0 - 0.5, [960, 500, 720, wy(m.dl.cy) - 260, 1.28, 5, -5, 0, 0], E.sine],
      ];
      let cmr = kf(u, K).slice();
      // fullscreen: the player stage fills the frame for a beat
      if (fsp > 0) { const F = [960, 540, st0.cx, st0.cy, fillS * 0.98, 0, 0, 0, 0]; cmr = cmr.map((v, i) => lerp(v, F[i], E.io(fsp))); }
      const [dx, dy] = T.drift(u + 17, 0.8 * (1 - fsp));
      cmr[5] += dx; cmr[6] += dy;
      if (u > D0 - 0.45) cmr[1] -= 1050 * T.whip(u - D0).s;
      cam(W.rig, cmr, W.K);
      const inn = clamp(inv(-0.5, -0.1, u));
      st(W.sec, { opacity: inn.toFixed(3), filter: u > D0 - 0.45 ? T.mb(T.whip(u - D0).b, 1) : 'none' });
      // playback state
      const paused = u > pa && u < fu - 0.1;
      const vt = u < pa ? 30 + u : u < sk ? 30 + pa : u < skE ? lerp(30 + pa, 58, E.io(inv(sk, skE, u))) : 58 + (u - skE);
      P.setVid(this.vwrap, 6 + (vt - 30) * 0.12, 1180);
      q('#playButton').textContent = paused ? '▶' : '❚❚';
      q('#liveBadge').classList.toggle('playing', !paused);
      q('#liveBadge span').textContent = paused ? d.paused : d.playing;
      q('#seekRange').value = Math.min(84, vt);
      const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      q('#timeLabel').textContent = `${fmt(vt)} / 1:24`;
      const L = lines(this.D);
      const second = vt > 52;
      if (this._cap !== second) { this._cap = second; q('#sourceCaption').textContent = second ? L.src2 : L.src; q('#translatedCaption').textContent = second ? L.tr2 : L.tr; }
      [['#playButton', pa], ['#fullscreenButton', fu]].forEach(([s0, cc]) => { const e = q(s0), p = T.press(u, cc), hv = T.hover(u, cc, 0.5, 0.15); e.style.transform = `scale(${(1 - 0.1 * p).toFixed(3)})`; e.style.boxShadow = `0 0 ${(22 * hv).toFixed(1)}px rgba(143,125,255,${(0.6 * hv).toFixed(2)})`; });
      // recording complete -> build & download
      const done = u > cp;
      q('#downloadState').textContent = u > fl + 0.6 ? d.exportComplete : u > bd ? `${d.exporting} · ${Math.round(100 * clamp(inv(bd, fl + 0.5, u)))}%` : done ? d.downloadReady : d.recording;
      q('#downloadState').style.color = u > fl + 0.6 ? '#45d6a1' : '';
      q('#stopButton').hidden = done; q('#closeButton').hidden = !done;
      const btn = q('#downloadVideoButton');
      btn.disabled = !done || (u > bd && u < fl + 0.6);
      const pb = T.press(u, bd), hb = T.hover(u, bd, 0.55, 0.2);
      btn.style.transform = `scale(${(1 - 0.05 * pb).toFixed(3)})`;
      btn.style.boxShadow = `0 0 ${(30 * hb + 40 * pulse(u, cp + 0.2, 1)).toFixed(1)}px rgba(143,125,255,${(0.5 * hb + 0.4 * pulse(u, cp + 0.2, 1)).toFixed(2)})`;
      // files fly out of the button
      const fan = [-1, 0, 1];
      this.shade.style.opacity = (0.95 * fade(u, fl - 0.1, fl + 0.4, 99, 100)).toFixed(3);
      this.files.forEach((e, i) => {
        const a = fl + i * 0.12, p = E.back(inv(a, a + 0.6, u));
        const x0 = m.dl.cx, y0 = wy(m.dl.cy);
        const x1 = 720 + fan[i] * 230, y1 = wy(m.dl.cy) - 300 + Math.abs(fan[i]) * 14;
        st(e, { opacity: clamp(inv(a, a + 0.15, u)).toFixed(3), transform: `translate(${lerp(x0, x1, p).toFixed(1)}px,${lerp(y0, y1, p).toFixed(1)}px) rotate(${(fan[i] * 6 * clamp(p)).toFixed(2)}deg) scale(${(0.3 + 0.8 * p).toFixed(3)})`, zIndex: 20 });
      });
      // cursor
      const sk0 = [T.along(m.seek, (30 + pa) / 84), m.seek.cy], sk1 = [T.along(m.seek, 58 / 84), m.seek.cy];
      const PATH = [[pa - 0.9, m.play.cx + T.dx(300), m.play.cy + 160], [pa, m.play.cx, m.play.cy, E.soft, 0.1], [sk, sk0[0], sk0[1], E.soft, -0.1], [skE, sk1[0], sk1[1], E.io, 0], [fu, m.full.cx, m.full.cy, E.soft, 0.1], [fuE + 0.1, m.full.cx - T.dx(60), m.full.cy + 80],
        [cp + 0.8, m.dl.cx + T.dx(80), wy(m.dl.cy) + 70], [bd, m.dl.cx, wy(m.dl.cy), E.soft, 0.1], [bd + 0.8, m.dl.cx + T.dx(60), wy(m.dl.cy) + 90]];
      T.cursor(this.C, u, PATH, [pa, fu, bd], [[sk, skE]], Math.max(fade(u, pa - 0.8, pa - 0.5, fu + 0.15, fu + 0.3), fade(u, fuE, fuE + 0.3, bd + 0.6, bd + 0.9)), cmr[4]);
    },
    hide() { show(this.W.sec, false); },
  });
})();
