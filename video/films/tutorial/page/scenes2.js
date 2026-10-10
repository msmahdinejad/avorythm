/* Avorythm tutorial — scenes 3 (connect & consent), 4 (language & mode), 5 (start). */
(function () {
  const { clamp, lerp, inv, E, fade, bump, pulse, kf, st, show, blur, h, esc, cam } = T;
  const sc = (def) => { SC.push(def); return def; };
  const SEL_COUNT = { en: (n) => `${n} enabled`, fa: (n) => `${n} مورد فعال`, 'zh-Hans': (n) => `${n} 项已启用` };
  const APIMISS = { en: 'Add your Gemini key in Settings.', fa: 'کلید Gemini را در تنظیمات وارد کن.', 'zh-Hans': '请在设置中填入 Gemini 密钥。' };

  // real popup state (mirrors popup.js renderSettings/renderState)
  T.popupState = function (pop, o) {
    const q = pop.q, d = pop.dict, loc = o.loc;
    q('#targetLanguage').innerHTML = `<option selected>${esc(P.langName(o.lang || 'fa', loc))}</option>`;
    q('#languageBadge').textContent = `AUTO → ${(o.lang || 'fa').toUpperCase()}`;
    q('#setupNotice').hidden = !o.setup;
    if (o.setup) q('#setupMessage').textContent = APIMISS[loc] || APIMISS.en;
    q('#toggleButton').disabled = !!o.setup;
    q('input[value="low-latency"]').checked = o.mode !== 'synchronized';
    q('input[value="synchronized"]').checked = o.mode === 'synchronized';
    q('#actionHint').textContent = d[o.active ? 'stopHint' : o.mode === 'synchronized' ? 'syncHint' : 'startHint'];
    q('#outputCount').textContent = (SEL_COUNT[loc] || SEL_COUNT.en)(1);
    q('#outputChips').innerHTML = `<span class="output-chip">${esc(d.dubbedAudio)}</span>`;
    q('#privacyText').textContent = d.privacyGoogle;
    q('#statusText').textContent = d[o.status || 'ready'];
    q('#statusDot').className = `status-dot ${o.active ? 'active' : ''} ${o.status || 'ready'}`;
    q('#toggleButton').classList.toggle('stopping', !!o.active);
    q('#toggleButton .action-icon').textContent = o.active ? '■' : '▶';
    q('#toggleButton b').textContent = d[o.active ? 'stop' : 'start'];
    q('#localeToggle').value = loc;
  };
  // real options state (defaults from extension/core.mjs DEFAULT_SETTINGS)
  T.optionsState = function (opt, o = {}) {
    const q = opt.q, d = opt.dict;
    q('#localeToggle').value = o.loc;
    q('#keyStatus').textContent = d.keyMissing;
    q('#consentTip').hidden = false;
    q('#helpPageLink') && (q('#helpPageLink').href = '#');
    const set = (id, v) => { const e = q('#' + id); if (e) e.checked = v; };
    set('pageOriginalAudioEnabled', false); set('pageDubAudioEnabled', true); set('pageSourceSubtitlesEnabled', false); set('pageTranslatedSubtitlesEnabled', false);
    set('pageAutoDuck', true); set('recording', false);
    set('syncOriginalAudioEnabled', false); set('syncDubAudioEnabled', true); set('syncSourceSubtitlesEnabled', false); set('syncTranslatedSubtitlesEnabled', false); set('syncAutoDuck', true);
    set('rememberGeminiKey', false); set('rememberGroqKey', false); set('dataConsent', false); set('groqAudioConsent', false);
    const val = (id, v, out) => { const e = q('#' + id); if (e) e.value = v; const oo = q('#' + id + 'Value'); if (oo) oo.textContent = out; };
    val('pageOriginalVolume', 1, '100%'); val('pageDubVolume', 1, '100%'); val('syncOriginalVolume', 1, '100%'); val('syncDubVolume', 1, '100%');
    val('subtitleFontSize', 24, '24px'); val('subtitleWidth', 680, '680px'); val('subtitleOpacity', 88, '88%'); val('syncBufferSeconds', 20, '20s');
    q('#groqKeyStatus').textContent = d.groqKeyMissing; q('#groqPermissionStatus').textContent = d.groqPermissionMissing;
  };

  /* ======================================================================= 3 · connect & consent */
  sc({
    id: 'settings', pre: 0.45, post: 0.45,
    async build(D) {
      const K = 2.6;
      const W = (this.W = T.world('settings', K, 1440, 900));
      const B = (this.B = P.browser(W.zw, { w: 1440, h: 900, host: 'aistudio.google.com', path: '/apikey',
        tabs: [{ title: 'API Keys | Google AI Studio', fav: 'linear-gradient(135deg,#8ab4f8,#4f7fe0)', on: 1 }] }));
      B.av.style.opacity = 1;
      const S2 = P.studioPage(B.page);
      S2.empty.style.opacity = 0; S2.toast.style.opacity = 0; S2.kstr.textContent = 'AIza•••••••••••••••••7Qk';
      this.studio = S2.root;
      this.tab2 = h('div', 'tab', `<img class="fav" src="${P.LOGO}"><span class="tt">Avorythm · Settings</span><span class="x">✕</span>`, B.el.querySelector('.tabstrip'), 'left:338px;opacity:0');
      // options page (real) in a scrolling container
      const oc = (this.oc = h('div', 'a', null, B.page, 'inset:0;overflow:hidden;background:#070912;opacity:0'));
      const opt = (this.opt = await P.embed('options', D.ui, oc, 1440, 810));
      T.optionsState(opt, { loc: D.ui });
      const fullH = opt.doc.documentElement.scrollHeight;
      this.marker = h('div', 'a', null, oc, 'width:2px;height:2px');
      // popup (setup required)
      const PX = 1440 - 20 - 390, PY = 92;
      const pc = (this.pc = h('div', 'a', null, W.zw, `left:${PX}px;top:${PY}px;width:390px;height:600px;transform-origin:300px 0;border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 30px 80px rgba(0,0,0,.65)`));
      const pop = (this.pop = await P.embed('popup', D.ui, pc, 390, 600));
      T.popupState(pop, { loc: D.ui, setup: true, lang: 'fa' });
      const ph = pop.doc.documentElement.scrollHeight;
      pop.frame.style.height = ph + 'px'; pc.style.height = ph + 'px';
      this.C = T.makeCursor(W.zw);
      this.cap = h('div', 'a', `<span style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6b3bff,#26c6e0);display:flex;align-items:center;justify-content:center">${P.ico('key', '', 2.2)}</span><span class="mono" style="font:600 30px 'JetBrains Mono Variable';letter-spacing:.02em">AIza••••••••••••7Qk</span>`, W.top,
        'left:0;top:0;display:flex;align-items:center;gap:16px;padding:12px 26px 12px 14px;border-radius:20px;background:rgba(16,18,40,.9);border:1px solid rgba(143,124,255,.6);box-shadow:0 0 40px rgba(107,59,255,.45),0 20px 50px rgba(0,0,0,.5);color:#e9e6ff;white-space:nowrap;opacity:0');
      T.$('overlay').prepend(this.cap);
      this.cap.querySelector('svg').style.cssText = 'width:22px;height:22px;color:#fff';
      const r = (s) => opt.rect(s);
      this.m = {
        setup: (() => { const x = pop.rect('#setupButton'); return { cx: PX + x.cx, cy: PY + x.cy, w: x.w, h: x.h }; })(),
        notice: (() => { const x = pop.rect('#setupNotice'); return { cx: PX + x.cx, cy: PY + x.cy }; })(),
        key: r('#apiKey'), save: r('#saveKeyButton'), status: r('#keyStatus'), conn: r('#connection'),
        consent: r('#dataConsent'), crow: r('#privacy .consent-row'), priv: r('#privacy'),
      };
      this.m.scroll2 = Math.min(fullH - 810, this.m.priv.y - 150);
      this.markerY = this.m.key.cy;
      st(this.marker, { left: this.m.key.x + 16 + 'px', top: this.m.key.cy + 'px' });
      this.keyVal = 'AIzaSyB4' + 'x'.repeat(31);
    },
    render(u, t) {
      const W = this.W, B = this.B, m = this.m, c = (n) => T.C('settings', n), opt = this.opt;
      show(W.sec, true);
      const ic = c('icon'), op = c('opens'), pg = c('page'), pa = c('paste'), sv = c('save'), cr = c('crane'), tk = c('tick'), Dn = c('end'), D0 = T.D('settings');
      // page scroll (crane)
      const sp = E.quint(inv(cr, cr + 1.15, u));
      const scroll = lerp(0, m.scroll2, sp);
      opt.doc.scrollingElement.scrollTop = scroll;
      const wy = (y) => 90 + y - scroll; // world y of an options-page element
      const av = B.at.av;
      const keyF = [m.key.x + 380, wy(m.key.cy) - 40];
      const K = [
        [0, [960, 540, 1150, 360, 0.86, 7, 11, 0, 0]],
        [ic - 0.35, [1060, 470, 1200, 300, 1.15, 4, 8, 0, 0], E.sine],
        [op - 0.45, [1060, 470, m.setup.cx - T.dx(40), m.setup.cy + 30, 2.25, 2, 5, 0, 0], E.quint],
        [pg - 0.05, [1060, 470, m.setup.cx - T.dx(40), m.setup.cy + 30, 2.3, 1.6, 4, 0, 0], E.lin],
        [pg + 0.7, [960, 470, keyF[0], keyF[1], 2.05, 3, -6, 0, 0], E.quint],
        [sv - 0.5, [940, 470, keyF[0] + 160, keyF[1] + 10, 2.3, 2, -4, 0, 0], E.sine],
        [sv + 0.5, [920, 480, keyF[0] + 240, keyF[1] + 20, 2.4, 1.6, -3, 0, 0], E.sine],
        [cr, [960, 520, m.conn.cx, wy(m.conn.cy), 1.55, 2, -2, 0, 0], E.io],
      ];
      // after the crane starts, frame the consent row (world coords follow the scroll)
      const crow = [T.RTLUI ? m.crow.x + m.crow.w - 330 : m.crow.x + 330, wy(m.crow.cy)];
      const K2 = [
        [cr, [960, 520, m.conn.cx, wy(m.conn.cy), 1.55, 2, -2, 0, 0]],
        [cr + 1.1, [930, 500, crow[0], crow[1], 2.25, -5, 3, 0, 0], E.quint],
        [tk + 0.3, [930, 500, crow[0] + 10, crow[1], 2.4, -2, 2, 0, 0], E.sine],
        [D0 - 0.5, [960, 500, crow[0] + 40, crow[1], 2.55, 0, 1, 0, 0], E.sine],
      ];
      const cmr = (u < cr ? kf(u, K) : kf(u, K2)).slice();
      const [dx, dy] = T.drift(u + 7, 0.8);
      cmr[5] += dx; cmr[6] += dy;
      if (u < 0.45) cmr[1] -= 1050 * (1 - T.whip(u).s);
      if (u > D0 - 0.45) cmr[1] -= 1050 * T.whip(u - D0).s;
      cam(W.rig, cmr, W.K);
      st(W.sec, { opacity: 1, filter: u < 0.45 ? T.mb(T.whip(u).b, 1) : u > D0 - 0.45 ? T.mb(T.whip(u - D0).b, 1) : 'none' });
      // popup open/close
      const po = E.back(inv(ic + 0.05, ic + 0.45, u)), pcl = E.i(inv(op + 0.15, op + 0.4, u));
      st(this.pc, { visibility: u > ic && pcl < 1 ? 'visible' : 'hidden', opacity: (clamp(inv(ic + 0.05, ic + 0.18, u)) * (1 - pcl)).toFixed(3), transform: `translateY(${((1 - E.expo(inv(ic, ic + 0.4, u))) * -14).toFixed(1)}px) scale(${(lerp(0.88, 1, clamp(po, 0, 1.1)) * (1 - 0.04 * pcl)).toFixed(4)})` });
      const sb = this.pop.q('#setupButton'), ps = T.press(u, op), hs = T.hover(u, op, 0.5, 0.1);
      sb.style.transform = `scale(${(1 - 0.06 * ps).toFixed(3)})`;
      sb.style.boxShadow = `0 0 ${(26 * hs).toFixed(1)}px rgba(244,189,109,${(0.55 * hs).toFixed(2)})`;
      B.av.style.background = `rgba(255,255,255,${(0.16 * fade(u, ic - 0.1, ic, op + 0.2, op + 0.4)).toFixed(3)})`;
      // new tab + options page
      const pgp = E.expo(inv(pg, pg + 0.6, u));
      this.tab2.style.opacity = clamp(inv(pg - 0.05, pg + 0.15, u)).toFixed(3);
      this.tab2.classList.toggle('on', u > pg);
      B.tabs[0].classList.toggle('on', u <= pg);
      B.setUrl(u > pg ? 'chrome-extension://kbdbbedijheicmmnmoidamdaodjbhjje' : 'aistudio.google.com', u > pg ? '/options.html' : '/apikey');
      st(this.oc, { opacity: clamp(inv(pg, pg + 0.25, u)).toFixed(3), transform: `translateY(${((1 - pgp) * 50).toFixed(1)}px)` });
      this.studio.style.opacity = (1 - clamp(inv(pg + 0.1, pg + 0.4, u))).toFixed(3);
      // key field: capsule lands, dots type in
      const q = opt.q;
      const typed = clamp(inv(pa, pa + 0.35, u));
      q('#apiKey').value = this.keyVal.slice(0, Math.round(typed * this.keyVal.length));
      q('#apiKey').style.boxShadow = `0 0 0 ${(2 * fade(u, pa - 0.1, pa + 0.1, sv + 0.4, sv + 0.9)).toFixed(2)}px rgba(143,124,255,.85), 0 0 ${(24 * pulse(u, pa, 0.9)).toFixed(1)}px rgba(143,124,255,.6)`;
      const saved = u > sv + 0.08;
      q('#keyStatus').textContent = saved ? opt.dict.keySaved : opt.dict.keyMissing;
      q('#keyStatus').style.color = saved ? '#45d6a1' : '';
      const psv = T.press(u, sv);
      q('#saveKeyButton').style.transform = `scale(${(1 - 0.06 * psv).toFixed(3)})`;
      q('#saveKeyButton').style.background = `rgba(${Math.round(36 + 70 * T.hover(u, sv, 0.5, 0.25))},${Math.round(43 + 50 * T.hover(u, sv, 0.5, 0.25))},${Math.round(69 + 120 * T.hover(u, sv, 0.5, 0.25))},1)`;
      // consent tick
      q('#dataConsent').checked = u > tk;
      q('#consentTip').hidden = u > tk;
      const crw = q('#privacy .consent-row');
      const gl = pulse(u, tk, 1.4);
      crw.style.boxShadow = `0 0 ${(40 * gl).toFixed(1)}px rgba(80,221,215,${(0.45 * gl).toFixed(3)}), inset 0 0 0 ${(u > tk ? 1.5 : 0)}px rgba(80,221,215,.6)`;
      // capsule: screen-space flight into the key field
      const lp = E.io(inv(pa - 0.75, pa, u));
      if (u < pa + 0.1) {
        const mr = this.marker.getBoundingClientRect();
        const park = [1520, 118, 0.5];
        const hold = E.io(inv(0.15, ic - 0.1, u));
        const x0 = lerp(960 - 260 * 1.35, park[0], hold), y0 = lerp(300, park[1], hold), s0 = lerp(1.35, park[2], hold);
        const bob = Math.sin(u * 2.2) * 4 * hold;
        T.capAt(this.cap, lerp(x0, mr.left - 30, lp), lerp(y0 + bob, mr.top, lp), lerp(s0, 0.5, lp), 1 - E.i(inv(pa - 0.1, pa + 0.1, u)));
      } else this.cap.style.opacity = 0;
      // cursor
      const keyRow = [m.key.x + 300, wy(m.key.cy)];
      const save = [m.save.cx, wy(m.save.cy)], box = [m.consent.cx, wy(m.consent.cy)];
      const PATH = [[ic - 1.1, 1500, 640], [ic, av[0] + 2, av[1] + 2, E.soft, 0.12], [op, m.setup.cx, m.setup.cy, E.soft, -0.1], [pg + 0.3, m.setup.cx - 120, m.setup.cy + 200],
        [pa + 0.6, keyRow[0], keyRow[1] + 60], [sv, save[0], save[1], E.soft, 0.1], [cr + 0.2, save[0] - 100, save[1] + 80], [cr + 1.2, box[0] + 80, box[1] + 120], [tk, box[0], box[1], E.soft, 0.1], [tk + 0.8, box[0] + 70, box[1] + 90]];
      const vis = Math.max(fade(u, ic - 1.0, ic - 0.6, op + 0.25, pg + 0.2), fade(u, pa + 0.35, pa + 0.7, tk + 0.6, tk + 1.0));
      T.cursor(this.C, u, PATH, [ic, op, sv, tk], [], vis, cmr[4]);
    },
    hide() { show(this.W.sec, false); this.cap.style.opacity = 0; },
  });

  /* ======================================================================= 4 + 5 · language & mode, start (one world) */
  let LW = null; // shared world
  async function buildLangWorld(D) {
    const K = 2.25;
    const W = T.world('lang', K, 1440, 900);
    const B = P.browser(W.zw, { w: 1440, h: 900, host: 'watch.example.com', path: '/every-new-path',
      tabs: [{ title: 'Every New Path · Short film', fav: 'linear-gradient(135deg,#1e3a5f,#5f8f9d)', on: 1 }] });
    B.av.style.opacity = 1;
    const wp = P.watchPage(B.page);
    const PX = 1440 - 20 - 390, PY = 92;
    const pc = h('div', 'a', null, W.zw, `left:${PX}px;top:${PY}px;width:390px;height:600px;transform-origin:300px 0;border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 30px 80px rgba(0,0,0,.65),0 10px 30px rgba(0,0,0,.4)`);
    const pop = await P.embed('popup', D.ui, pc, 390, 600);
    T.popupState(pop, { loc: D.ui, setup: false, lang: 'fa' });
    const ph = pop.doc.documentElement.scrollHeight;
    pop.frame.style.height = ph + 'px'; pc.style.height = ph + 'px';
    const pr = (s) => { const x = pop.rect(s); return { x: PX + x.x, y: PY + x.y, w: x.w, h: x.h, cx: PX + x.cx, cy: PY + x.cy }; };
    const m = { sel: pr('#targetLanguage'), modes: pop.qa('.mode-option').map((e) => pr(e)), start: pr('#toggleButton'), status: pr('.status-line'), radio: pr('input[value="low-latency"]'), pop: { x: PX, y: PY, w: 390, h: ph } };
    m.video = { x: 32, y: 90 + 68, w: 1000, h: 562.5, cx: 532, cy: 90 + 68 + 281 };
    // dropdown (Chrome's native select list, dark)
    const ROW = 30, VIS = 9;
    const dd = h('div', 'a', null, W.zw, `left:${m.sel.x - 2}px;top:${m.sel.y + m.sel.h + 4}px;width:${m.sel.w + 4}px;height:${ROW * VIS + 8}px;border-radius:10px;background:#1a1c26;border:1px solid rgba(255,255,255,.16);box-shadow:0 22px 50px rgba(0,0,0,.65);overflow:hidden;opacity:0;transform-origin:50% 0`);
    const list = h('div', 'a', null, dd, 'left:4px;right:4px;top:4px');
    const names = P.LANGS.map((c) => P.langName(c, D.ui));
    list.innerHTML = names.map((n, i) => `<div style="position:absolute;left:0;right:0;top:${i * ROW}px;height:${ROW - 2}px;border-radius:6px;padding:0 10px;display:flex;align-items:center;font:500 14px var(--ui);color:#e4e4ea;white-space:nowrap;direction:${D.ui === 'fa' ? 'rtl' : 'ltr'}">${esc(n)}</div>`).join('');
    const rows = [...list.children];
    const targetIdx = P.LANGS.indexOf(D.target === 'zh' ? 'zh-Hans' : D.target === 'pt' ? 'pt-BR' : D.target);
    // dub waveform + language badge over the video
    const wave = h('div', 'a', null, wp.player, 'left:0;right:0;bottom:0;height:150px;opacity:0');
    wave.innerHTML = '<svg width="1000" height="150" viewBox="0 0 1000 150" style="position:absolute;left:0;top:0"><defs><linearGradient id="gDub" x1="0" x2="1"><stop offset="0" stop-color="#3ff9f9" stop-opacity="0"/><stop offset=".2" stop-color="#3ff9f9"/><stop offset=".8" stop-color="#7cf0ec"/><stop offset="1" stop-color="#3ff9f9" stop-opacity="0"/></linearGradient><linearGradient id="gOrig" x1="0" x2="1"><stop offset="0" stop-color="#9d85ff" stop-opacity="0"/><stop offset=".2" stop-color="#9d85ff"/><stop offset=".8" stop-color="#b9a8ff"/><stop offset="1" stop-color="#9d85ff" stop-opacity="0"/></linearGradient></defs><path class="wo" stroke="url(#gOrig)" stroke-width="3.5" stroke-linecap="round" fill="none"/><path class="wd" stroke="url(#gDub)" stroke-width="4.5" stroke-linecap="round" fill="none" style="filter:drop-shadow(0 0 8px rgba(63,249,249,.7))"/></svg>';
    const badge = h('div', 'a', `<span style="width:9px;height:9px;border-radius:50%;background:#45d6a1;box-shadow:0 0 10px #45d6a1"></span><span class="mono">${(D.demo.sourceLang || 'en').toUpperCase()} → ${(D.target === 'zh' ? 'zh-Hans' : D.target === 'pt' ? 'pt-BR' : D.target).toUpperCase()}</span>`, wp.player,
      'right:18px;top:18px;display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:999px;background:rgba(8,10,18,.66);border:1px solid rgba(124,240,236,.45);font:700 15px "JetBrains Mono Variable";color:#bff9f6;backdrop-filter:blur(8px);opacity:0');
    const C = T.makeCursor(W.zw);
    // screen-space "79"
    const big = h('div', 'a', `<div class="num">79</div><div class="lab">${esc(D.text.languages)}</div>`, W.top, `left:40px;top:230px;width:560px;text-align:center;opacity:0;direction:${D.dir}`);
    st(big.querySelector('.num'), { font: `800 300px/1 ${T.digits('7') !== '7' ? '"Vazirmatn Variable",' : ''}"Inter Variable"`, letterSpacing: '-.04em', background: 'linear-gradient(180deg,#ffffff,#b6a6ff 60%,#7cf0ec)', webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 20px 60px rgba(107,59,255,.45))' });
    st(big.querySelector('.lab'), { font: '700 44px var(--ui)', color: '#dcd6ff', marginTop: '-10px', letterSpacing: '.02em' });
    // callouts next to the mode cards
    const call = (txt, icon, col) => { const e = h('div', 'pill', `<span style="width:30px;height:30px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center">${P.ico(icon, '', 2.4)}</span>${esc(txt)}`, W.zw, 'opacity:0;font-size:13px;padding:6px 14px 6px 6px;gap:8px'); e.querySelector('svg').style.cssText = 'width:16px;height:16px;color:#0a0b14'; return e; };
    const c1 = call(D.text.fastest, 'lightning', 'linear-gradient(135deg,#ffd36e,#ffb347)');
    const c2 = call(D.text.pauseSeekExport, 'sync', 'linear-gradient(135deg,#a48bff,#7cf0ec)');
    const sparks = [...Array(14)].map((_, k) => h('div', 'a', null, W.zw, `width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:${k % 2 ? '#5cf4f4' : '#a48bff'};box-shadow:0 0 10px ${k % 2 ? '#3ff9f9' : '#8b6cff'};opacity:0`));
    LW = { W, B, wp, pc, pop, m, dd, list, rows, ROW, VIS, targetIdx, wave, badge, C, big, c1, c2, sparks, names, D };
    LW.measure = () => T.layout(W, () => ({ c1: T.measure(W, c1), c2: T.measure(W, c2) }));
    return LW;
  }
  function waveD(t, amp, seed, N = 90, Wd = 1000, H = 150) {
    let d = '';
    for (let i = 0; i < N; i++) {
      const x = 10 + (i * (Wd - 20)) / (N - 1), uu = i * 0.11 + t * 2.6 + seed * 7.3;
      const env = 0.15 + 0.85 * Math.pow(Math.abs(Math.sin(uu * 1.3) * Math.sin(uu * 0.47 + seed) * 0.9 + 0.1 * Math.sin(uu * 5.1)), 0.8);
      const a = Math.max(1.5, (H / 2 - 12) * env * amp);
      d += `M${x.toFixed(1)} ${(H / 2 - a).toFixed(1)}V${(H / 2 + a).toFixed(1)}`;
    }
    return d;
  }
  T.waveD = waveD;

  sc({
    id: 'lang', pre: 0.45, post: 0,
    async build(D) { const L = LW || (await buildLangWorld(D)); this.L = L; },
    render(u, t) {
      const L = this.L, W = L.W, m = L.m, c = (n) => T.C('lang', n);
      show(W.sec, true);
      const ic = c('icon'), pk = c('pick'), ch = c('choose'), n79 = c('n79'), on = c('onpage'), sy = c('sync'), rd = c('radio'), Dn = T.BASE.scenes.find((s) => s.id === 'lang').dur;
      const av = L.B.at.av, md = m.modes;
      const modeF = [(md[0].cx + md[1].cx) / 2, (md[0].cy + md[1].cy) / 2];
      const K = [
        [0, [960, 545, 720, 450, 0.72, 6, -9, 0, 0]],
        [ic - 0.6, [1000, 520, 980, 380, 0.98, 4, -6, 0, 0], E.sine],
        [pk - 0.45, [1240, 430, T.RTLUI ? m.pop.x + 250 : m.sel.cx - 40, m.sel.cy + 60, 2.2, 3, -7, 0, 0], E.quint],
        [ch + 0.15, [1250, 400, T.RTLUI ? m.pop.x + 250 : m.sel.cx - 40, m.sel.cy + 60, 2.25, 2.5, -6.5, 0, 0], E.lin],
        [on - 0.15, [1180, 520, modeF[0], modeF[1], 2.05, 6, -8, 0, 0], E.quint],
        [sy + 1.2, [1180, 520, modeF[0], modeF[1] + 10, 2.12, 4, -6, 0, 0], E.sine],
        [Dn, [1120, 500, m.radio.cx + T.dx(120), m.radio.cy + 40, 2.2, 3, -4, 0, 0], E.io],
      ];
      const cmr = kf(u, K).slice();
      const [dx, dy] = T.drift(u + 11, 0.8);
      cmr[5] += dx; cmr[6] += dy;
      if (u < 0.45) cmr[1] += 1050 * (1 - T.whip(u).s);
      cam(W.rig, cmr, W.K);
      st(W.sec, { opacity: 1, filter: u < 0.45 ? T.mb(T.whip(u).b, 1) : 'none' });
      P.setVid(L.wp.vid, 3 + u * 0.4);
      L.wp.vp.style.width = (120 + t * 2).toFixed(1) + 'px';
      // popup
      const po = E.back(inv(ic + 0.05, ic + 0.45, u));
      st(L.pc, { visibility: u > ic ? 'visible' : 'hidden', opacity: clamp(inv(ic + 0.05, ic + 0.18, u)).toFixed(3), transform: `translateY(${((1 - E.expo(inv(ic, ic + 0.4, u))) * -14).toFixed(1)}px) scale(${lerp(0.88, 1, clamp(po, 0, 1.1)).toFixed(4)})` });
      L.B.av.style.background = `rgba(255,255,255,${(0.16 * fade(u, ic - 0.1, ic, 99, 100)).toFixed(3)})`;
      const pop = L.pop, q = pop.q;
      // select + dropdown race
      const selFocus = fade(u, pk - 0.1, pk, ch + 0.2, ch + 0.5);
      q('#targetLanguage').style.boxShadow = `0 0 0 ${(2.5 * selFocus).toFixed(2)}px #8f7dff, 0 0 ${(20 * selFocus).toFixed(1)}px rgba(143,125,255,.55)`;
      const chosen = u > ch;
      const tcode = P.LANGS[L.targetIdx];
      const curName = chosen ? L.names[L.targetIdx] : P.langName('fa', L.D.ui);
      if (L._sel !== curName) { L._sel = curName; q('#targetLanguage').innerHTML = `<option selected>${esc(curName)}</option>`; q('#languageBadge').textContent = `AUTO → ${(chosen ? tcode : 'fa').toUpperCase()}`; }
      const ddv = Math.min(E.o(inv(pk + 0.02, pk + 0.15, u)), 1 - E.i(inv(ch + 0.05, ch + 0.18, u)));
      st(L.dd, { opacity: ddv.toFixed(3), visibility: ddv > 0.01 ? 'visible' : 'hidden', transform: `scaleY(${(0.92 + 0.08 * ddv).toFixed(3)})` });
      if (ddv > 0.01) {
        // race to the end of the list (all 79) and settle back on the target
        const total = P.LANGS.length, tgt = Math.max(0, L.targetIdx - 3);
        const p1 = inv(pk + 0.12, lerp(pk, ch, 0.62), u), p2 = inv(lerp(pk, ch, 0.62), ch - 0.08, u);
        const pos = u < lerp(pk, ch, 0.62) ? (total - L.VIS) * E.io(p1) : lerp(total - L.VIS, tgt, E.quintO(p2));
        L.list.style.transform = `translateY(${(-pos * L.ROW).toFixed(2)}px)`;
        const speed = Math.abs(u < lerp(pk, ch, 0.62) ? Math.sin(Math.PI * p1) : Math.sin(Math.PI * p2) * 0.6);
        L.list.style.filter = speed > 0.25 ? `url(#mv${speed > 0.7 ? 2 : 1})` : 'none';
        const hl = u > ch - 0.3 ? L.targetIdx : -1;
        L.rows.forEach((r, i) => { const on2 = i === hl; r.style.background = on2 ? 'rgba(143,125,255,.5)' : 'transparent'; });
      }
      // the 79
      const bp = fade(u, n79 - 0.15, n79 + 0.2, Math.min(n79 + 1.4, on - 0.45), Math.min(n79 + 1.9, on - 0.1)), bpe = E.expo(inv(n79 - 0.15, n79 + 0.6, u));
      st(L.big, { opacity: bp.toFixed(3), transform: `translateY(${((1 - bpe) * 40).toFixed(1)}px) scale(${lerp(0.82, 1, bpe).toFixed(3)})`, filter: blur((1 - bpe) * 10) });
      const cnt = Math.round(lerp(1, 79, E.o(inv(n79 - 0.15, n79 + 0.45, u))));
      L.big.querySelector('.num').textContent = T.digits(cnt);
      // mode cards: highlight + callouts
      const cards = pop.qa('.mode-option');
      const h1 = fade(u, on - 0.1, on + 0.2, sy - 0.2, sy + 0.1), h2 = fade(u, sy - 0.1, sy + 0.2, rd - 0.4, rd - 0.1);
      cards[0].style.boxShadow = `0 0 0 ${(2 * h1).toFixed(2)}px rgba(255,211,110,${(0.9 * h1).toFixed(2)}), 0 0 ${(34 * h1).toFixed(1)}px rgba(255,190,90,${(0.35 * h1).toFixed(2)})`;
      cards[1].style.boxShadow = `0 0 0 ${(2 * h2).toFixed(2)}px rgba(124,240,236,${(0.9 * h2).toFixed(2)}), 0 0 ${(34 * h2).toFixed(1)}px rgba(124,240,236,${(0.3 * h2).toFixed(2)})`;
      const rtlUi = L.D.ui === 'fa';
      [[L.c1, md[0], on, sy], [L.c2, md[1], sy, rd]].forEach(([el, r, a, b]) => {
        const v = fade(u, a, a + 0.25, b - 0.1, b + 0.15), e = E.back(inv(a, a + 0.45, u));
        const w = el.offsetWidth;
        const x = rtlUi ? r.x + r.w + 16 : r.x - w - 16;
        st(el, { opacity: v.toFixed(3), transform: `translate(${(x + (1 - clamp(e)) * (rtlUi ? 24 : -24)).toFixed(1)}px,${(r.cy - 21).toFixed(1)}px) scale(${(0.85 + 0.15 * clamp(e, 0, 1.1)).toFixed(3)})` });
      });
      // cursor
      const lastPick = [m.sel.cx + T.dx(30), m.sel.y + m.sel.h + 4 + 4 + (L.targetIdx - Math.max(0, L.targetIdx - 3)) * L.ROW + 15];
      const PATH = [[ic - 1.2, 1500, 700], [ic, av[0] + 2, av[1] + 2, E.soft, 0.12], [pk, m.sel.cx + 20, m.sel.cy, E.soft, -0.1], [ch - 0.35, lastPick[0] + 10, lastPick[1] + 6], [ch, lastPick[0], lastPick[1], E.soft],
        [on - 0.2, md[0].cx + T.dx(60), md[0].cy + 18], [sy - 0.2, md[1].cx + T.dx(60), md[1].cy + 22], [rd, m.radio.cx, m.radio.cy, E.soft, 0.12], [Dn, m.radio.cx + T.dx(70), m.radio.cy + 60]];
      T.cursor(L.C, u, PATH, [ic, pk, ch, rd], [], fade(u, ic - 1.0, ic - 0.6, 99, 100), cmr[4]);
      L.lastCam = cmr;
    },
    hide() { show(this.L.W.sec, false); this.L.big.style.opacity = 0; },
  });

  sc({
    id: 'start', pre: 0, post: 0.5,
    async build(D) { this.L = LW; },
    render(u, t) {
      const L = this.L, W = L.W, m = L.m, c = (n) => T.C('start', n);
      show(W.sec, true);
      L.big.style.opacity = 0; L.dd.style.opacity = 0; L.c1.style.opacity = 0; L.c2.style.opacity = 0;
      const s0 = c('start'), lv = c('live'), sw = c('swing'), spk = c('speaks'), Dn = c('end');
      const md = m.modes;
      const startF = [m.start.cx, m.start.cy];
      const K = [
        [0, [1120, 500, m.radio.cx + T.dx(120), m.radio.cy + 40, 2.2, 3, -4, 0, 0]],
        [s0 - 0.35, [1060, 520, startF[0], startF[1] - 10, 2.45, 2, -3, 0, 0], E.quint],
        [lv + 0.15, [1040, 560, startF[0], startF[1] - 50, 2.2, 1.5, -2.5, 0, 0], E.io],
        [sw + 0.15, [1040, 560, startF[0], startF[1] - 60, 2.15, 1.4, -2.4, 0, 0], E.lin],
        [sw + 1.0, [960, 470, m.video.cx, m.video.cy, 1.3, 1, 5, 0, 0], E.quint],
        [Dn + 0.5, [960, 470, m.video.cx, m.video.cy, 1.3, 0, 0, 0, 0], E.sine],
      ];
      const cmr = kf(u, K).slice();
      const dr = T.drift(u + 5, 1 - clamp(inv(Dn - 1, Dn, u)));
      cmr[5] += dr[0]; cmr[6] += dr[1];
      cam(W.rig, cmr, W.K);
      st(W.sec, { opacity: (1 - clamp(inv(Dn + 0.1, Dn + 0.5, u))).toFixed(3), filter: 'none' });
      P.setVid(L.wp.vid, 3 + (T.D('lang') + u) * 0.4);
      L.wp.vp.style.width = (120 + t * 2).toFixed(1) + 'px';
      const pop = L.pop;
      const active = u > s0 + 0.05;
      const status = !active ? 'ready' : u < lv ? 'connecting' : 'connected';
      if (L._st !== status) { L._st = status; T.popupState(pop, { loc: L.D.ui, setup: false, lang: P.LANGS[L.targetIdx], active, status }); L._sel = null; }
      const btn = pop.q('#toggleButton'), ps = T.press(u, s0), hv = T.hover(u, s0, 0.6, 0.2);
      btn.style.transform = `scale(${(1 - 0.05 * ps + 0.015 * hv).toFixed(4)})`;
      const flash = u > s0 ? Math.exp(-(u - s0) * 3.5) : 0;
      btn.style.boxShadow = `0 0 ${(30 * hv + 60 * flash).toFixed(1)}px rgba(143,125,255,${(0.4 * hv + 0.6 * flash).toFixed(2)})`;
      btn.style.filter = `brightness(${(1 + 0.25 * hv + 0.5 * flash).toFixed(3)})`;
      pop.q('#statusDot').style.boxShadow = status === 'connected' ? `0 0 0 ${(4 + 4 * Math.abs(Math.sin(u * 4))).toFixed(1)}px rgba(69,214,161,.22)` : '';
      L.sparks.forEach((s, k) => { const p = inv(s0, s0 + 0.7, u), a = (k / 14) * Math.PI * 2, r = 20 + 150 * E.o(p); st(s, { opacity: (p > 0 && p < 1 ? 1 - p : 0).toFixed(3), transform: `translate(${(startF[0] + Math.cos(a) * r * 1.4).toFixed(1)}px,${(startF[1] + Math.sin(a) * r * 0.6).toFixed(1)}px) scale(${(1.4 - p).toFixed(3)})` }); });
      // popup folds away toward the toolbar icon
      const fo = E.io(inv(sw, sw + 0.45, u));
      st(L.pc, { visibility: fo < 1 ? 'visible' : 'hidden', opacity: (1 - fo).toFixed(3), transform: `translateY(${(-30 * fo).toFixed(1)}px) scale(${(1 - 0.12 * fo).toFixed(4)})` });
      // the video speaks: original (violet) morphs into the dub (cyan)
      const wv = clamp(inv(spk - 0.6, spk, u));
      L.wave.style.opacity = wv.toFixed(3);
      const morph = E.io(inv(spk - 0.3, spk + 0.5, u));
      L.wave.querySelector('.wo').setAttribute('d', waveD(t, 0.55 * (1 - morph) + 0.12, 2));
      L.wave.querySelector('.wo').style.opacity = (1 - 0.75 * morph).toFixed(3);
      L.wave.querySelector('.wd').setAttribute('d', waveD(t * 1.15, 0.9 * morph, 5));
      st(L.badge, { opacity: clamp(inv(spk, spk + 0.3, u)).toFixed(3), transform: `translateY(${((1 - E.expo(inv(spk, spk + 0.6, u))) * -12).toFixed(1)}px)` });
      const PATH = [[0, m.radio.cx + T.dx(70), m.radio.cy + 60], [s0, startF[0] - T.dx(30), startF[1] + 4, E.soft, 0.1], [sw, startF[0] + 40, startF[1] + 90], [sw + 0.8, startF[0] + 120, startF[1] + 200]];
      T.cursor(L.C, u, PATH, [s0], [], fade(u, -1, -0.5, sw, sw + 0.4), cmr[4]);
    },
    hide() { show(this.L.W.sec, false); },
  });
})();
