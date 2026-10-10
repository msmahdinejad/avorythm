/* Avorythm tutorial — boot, overlays (objective titles, takeaways, word-synced captions), frame loop. */
(function () {
  const { clamp, lerp, inv, E, fade, st, h, esc } = T;
  const qs = new URLSearchParams(location.search);
  const LANG = qs.get('lang') || 'en';
  const SCRIPT = { fa: 'arab', ar: 'arab', hi: 'deva', zh: 'hans', ja: 'jpan' }[LANG] || 'latin';
  const STEPS = ['install', 'key', 'settings', 'lang', 'start', 'outputs', 'player', 'desktop'];
  const MARK = /\{([a-z0-9_]+)([|^])([^}]*)\}/g;
  const plainOf = (text) => text.replace(MARK, (_, a, b, c) => c);
  const anchorsOf = (text) => { const out = {}; let plain = '', pos = 0; for (const m of text.matchAll(MARK)) { plain += text.slice(pos, m.index); out[m[1]] = { c0: plain.length, c1: plain.length + m[3].length, label: m[2] === '|' }; plain += m[3]; pos = m.index + m[0].length; } return out; };
  const D = (window.D = {});
  T.digits = (s) => digits(s);
  const digits = (s) => (LANG === 'fa' ? String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]) : String(s));

  /* ---------------------------------------------------------------- timeline (fitted, or estimated from the base for previews) */
  function estimateTimeline(base, script) {
    const beat = 60 / base.bpm; let t0 = 0; const scenes = [], lines = {}, cues = {};
    for (const s of base.scenes) {
      let prev = -1e9;
      for (const [lid, a] of s.lines) {
        const text = plainOf(script.lines[lid]);
        const dur = Math.max(1, V.tokenize(text, LANG).reduce((x, k) => x + V.weight(k.w), 0) * 0.075);
        const start = Math.max(a, prev + base.gap);
        const chars = [...text].map((_, i) => (i / text.length) * dur * 0.95);
        lines[lid] = { scene: s.id, start: t0 + start, dur, text, t: chars, anchors: anchorsOf(script.lines[lid]) };
        prev = start + dur;
      }
      const R = Math.ceil(Math.max(s.dur, prev + (s.tail || 0.8)) / beat - 1e-6) * beat;
      scenes.push({ id: s.id, start: t0, end: t0 + R, base: s.dur, dur: R, map: [[0, 0], [s.dur, R]] });
      t0 += R;
    }
    return { fps: base.fps, bpm: base.bpm, duration: t0, scenes, lines, cues };
  }

  /* ---------------------------------------------------------------- overlays */
  const OV = {};
  // In RTL captions every word is its own inline-block, so runs of Latin words ("Chrome Web Store", "Connect to Gemini")
  // would be laid out right-to-left. Wrap each Latin run (and Latin chips) in an LTR isolate.
  const RTL_CH = /[֐-ࣿיִ-﷿ﹰ-﻿]/, LTR_CH = /[A-Za-z0-9]/;
  const isLtr = (s) => LTR_CH.test(s) && !RTL_CH.test(s);
  function isolateLtr(el) {
    el.querySelectorAll('.chipw').forEach((c) => { if (isLtr(c.textContent)) { c.dir = 'ltr'; c.style.unicodeBidi = 'isolate'; } });
    el.querySelectorAll('.nw').forEach((w) => isolateRuns(w));
    isolateRuns(el);
  }
  function isolateRuns(el) {
    const kids = [...el.childNodes];
    let run = [];
    const flushRun = () => {
      const words = run.filter((n) => n.nodeType === 1);
      if (words.length > 1) {
        while (run.length && run[run.length - 1].nodeType !== 1) run.pop();
        const wrap = document.createElement('span');
        wrap.dir = 'ltr'; wrap.style.cssText = 'display:inline-block;unicode-bidi:isolate';
        run[0].parentNode.insertBefore(wrap, run[0]);
        run.forEach((n) => wrap.appendChild(n));
      }
      run = [];
    };
    for (const n of kids) {
      if (n.nodeType === 3 && !n.textContent.trim()) { if (run.length) run.push(n); continue; }
      if (n.nodeType === 1 && n.classList.contains('cw') && isLtr(n.textContent)) { run.push(n); continue; }
      flushRun();
    }
    flushRun();
  }
  function buildOverlays() {
    const ov = T.$('overlay');
    const rtl = D.dir === 'rtl';
    OV.topScrim = h('div', null, null, ov); OV.topScrim.id = 'topScrim';
    OV.chipbg = h('div', 'chipbg', null, ov, 'opacity:0');
    OV.ttl = h('div', 'ttl', '<div class="badge"><span class="n"></span></div><div class="txt"><div class="eye"></div><div class="tt"></div></div>', ov);
    if (rtl) OV.ttl.style.flexDirection = 'row-reverse';
    OV.take = h('div', 'take', `<span class="ck">${P.ico('check', '', 3.2)}</span><span class="tx"></span>`, ov, 'opacity:0');
    OV.take.querySelector('svg').style.cssText = 'width:20px;height:20px;color:#04201d';
    if (rtl) { OV.take.style.flexDirection = 'row-reverse'; OV.take.style.direction = 'rtl'; }
    OV.capScrim = h('div', null, null, ov); OV.capScrim.id = 'capScrim';
    OV.cap = h('div', null, null, ov); OV.cap.id = 'cap';
    // per-step measurements of the title in its big state (for the collapse)
    OV.steps = STEPS.map((id, i) => ({ id, n: i + 1, title: D.text.titles[i], take: D.text.takeaways[i] }));
    // captions: one page per sentence chunk, built once
    OV.pages = [];
    const lines = Object.entries(T.TL.lines).sort((a, b) => a[1].start - b[1].start);
    for (const [lid, L] of lines) {
      const toks = T.tokens(L.text, LANG);
      let cpos = 0;
      toks.forEach((k) => { const at = L.text.indexOf(k.w, cpos); k.c0 = at < 0 ? cpos : at; cpos = k.c0 + k.w.length; k.t0 = L.start + (L.t[k.c0] ?? 0); });
      toks.forEach((k, i) => { k.t1 = i + 1 < toks.length ? toks[i + 1].t0 : L.start + L.dur; });
      // pages: whole sentences when they fit two caption lines; long sentences split at the best phrase boundary
      // near the middle; never a page under MIN characters (no orphans like a lone "ZIP."); never split a UI label.
      const cjk = SCRIPT === 'hans' || SCRIPT === 'jpan';
      const MAX = cjk ? 40 : SCRIPT === 'deva' ? 76 : 80, MIN = cjk ? 10 : SCRIPT === 'deva' ? 20 : 28;
      const NOAFTER = SCRIPT === 'deva' ? /^(एक|इस|उस|अपनी|अपना|अपने|किसी|हर|कोई|दोनों|चारों|का|की|के)$/ : null;  // determiners stay with their noun
      const SENT = /[.!?…。！？؟।]$/, PHRASE = /[,،、，;؛:：—–]$/;
      // CJK: never start a page with a particle / auxiliary / okurigana (ja: any hiragana-initial token) or closing
      // punctuation; a whole clause ending in punctuation may be as short as 8 characters.
      const NOBRK = SCRIPT === 'jpan' ? /^[ぁ-ゟーァィゥェォッャュョ、。，．！？）」』】]/
        : SCRIPT === 'hans' ? /^[的了地得着过吗呢吧啊和与，。、！？：；）」』】]/
        : SCRIPT === 'deva' ? /^(है|हैं|करें|करता|करती|करते|का|की|के|को|में|से|पर|ने|था|थी|थे|हो|रहा|रही|रहे|सकते|सकता|सकती|दें|लगेगा|देती|देता)[।,]?$/ : null;
      const len = (a) => a.reduce((s, x, i) => s + x.w.length + (x.space && i < a.length - 1 ? 1 : 0), 0);
      const labs = Object.values(L.anchors).filter((a) => a.label);
      const inside = (a, b) => labs.some((r) => a.c0 >= r.c0 && a.c0 < r.c1 && b.c0 >= r.c0 && b.c0 < r.c1);
      const sents = [];
      let cur = [];
      toks.forEach((k) => { cur.push(k); if (SENT.test(k.w)) { sents.push(cur); cur = []; } });
      if (cur.length) sents.push(cur);
      for (let i = 0; i < sents.length; i++) {  // merge short sentences into a neighbour
        if (len(sents[i]) >= MIN || sents.length === 1) continue;
        if (i + 1 < sents.length && (len(sents[i]) + len(sents[i + 1]) <= MAX * 1.6 || i === 0)) { sents[i + 1] = sents[i].concat(sents[i + 1]); sents.splice(i, 1); i--; }
        else if (i > 0) { sents[i - 1] = sents[i - 1].concat(sents[i]); sents.splice(i, 1); i--; }
      }
      const split = (a) => {
        if (len(a) <= MAX) return [a];
        const total = len(a);
        let best = -1, score = 1e9;
        for (let i = 0; i < a.length - 1; i++) {
          if (inside(a[i], a[i + 1])) continue;
          if (NOBRK && NOBRK.test(a[i + 1].w)) continue;
          if (NOAFTER && NOAFTER.test(a[i].w)) continue;
          // CJK breaks only at punctuation, a space or a Latin/CJK script boundary (Chrome's word dictionary splits words like 点|击)
          // (ja also after a case particle before kanji/katakana: a bunsetsu boundary)
          const jaB = SCRIPT === 'jpan' && /[でをにはがとへもや]$/.test(a[i].w) && /^[㐀-鿿゠-ヿA-Za-z]/.test(a[i + 1].w);
          if (cjk && !(jaB || a[i].space || SENT.test(a[i].w) || PHRASE.test(a[i].w) || /[A-Za-z0-9]$/.test(a[i].w) !== /^[A-Za-z0-9]/.test(a[i + 1].w))) continue;
          const left = len(a.slice(0, i + 1)), right = len(a.slice(i + 1));
          const mn = cjk && (SENT.test(a[i].w) || PHRASE.test(a[i].w)) ? 8 : MIN;
          if (left < mn || right < (cjk && SENT.test(a[a.length - 1].w) ? 8 : MIN)) continue;
          const sc = Math.abs(left - right) - (SENT.test(a[i].w) ? total * 0.6 : PHRASE.test(a[i].w) ? total * 0.3 : 0) + (Math.min(left, right) < MIN ? 12 : 0);
          if (sc < score) { score = sc; best = i; }
        }
        if (best < 0) return [a];
        return [...split(a.slice(0, best + 1)), ...split(a.slice(best + 1))];
      };
      sents.forEach((s) => split(s).forEach((pg) => OV.pages.push({ lid, toks: pg, L })));
    }
    for (const pg of OV.pages) {
      const el = h('div', 'cpage', null, OV.cap);
      el.style.direction = D.dir;
      const an = Object.values(pg.L.anchors).filter((a) => a.label);
      let html = '';
      // short multi-word terms that are not chips ("smart ducking", "کاهش هوشمند") stay on one caption line
      const terms = Object.values(pg.L.anchors).filter((a) => !a.label && a.c1 - a.c0 <= 24 && /\s/.test(pg.L.text.slice(a.c0, a.c1).trim()));
      const inTerm = (k) => terms.find((a) => k && k.c0 >= a.c0 && k.c0 < a.c1);
      // CJK: each phrase between punctuation marks stays on one line (Chrome would otherwise break 一時|停止)
      const phrOpen = new Set(), phrClose = new Set();
      if (SCRIPT === 'hans' || SCRIPT === 'jpan') {
        const groups = an.concat(terms).map((g) => pg.toks.map((k, i) => (k.c0 >= g.c0 && k.c0 < g.c1 ? i : -1)).filter((i) => i >= 0));
        let s0 = 0;
        pg.toks.forEach((k, i) => {
          if (!/[、。，！？：；,.!?]$/.test(k.w) && i < pg.toks.length - 1) return;
          const len = pg.toks.slice(s0, i + 1).reduce((n, x) => n + x.w.length, 0);
          const crosses = groups.some((g) => g.some((j) => j >= s0 && j <= i) && g.some((j) => j < s0 || j > i));
          if (i > s0 && len <= 24 && !crosses) { phrOpen.add(s0); phrClose.add(i); }
          s0 = i + 1;
        });
      }
      pg.toks.forEach((k, i) => {
        if (phrOpen.has(i)) html += '<span class="nw">';
        const tm = inTerm(k);
        if (tm && inTerm(pg.toks[i - 1]) !== tm) html += '<span class="nw">';
        const inLab = an.find((a) => k.c0 >= a.c0 && k.c0 < a.c1);
        const startLab = inLab && (i === 0 || !(pg.toks[i - 1].c0 >= inLab.c0 && pg.toks[i - 1].c0 < inLab.c1));
        const endLab = inLab && (i === pg.toks.length - 1 || !(pg.toks[i + 1].c0 >= inLab.c0 && pg.toks[i + 1].c0 < inLab.c1));
        if (startLab) {
          // a chip and the punctuation glued to its end ("Gemini," / "Chrome，") never wrap apart
          let j = i;
          while (j + 1 < pg.toks.length && pg.toks[j + 1].c0 >= inLab.c0 && pg.toks[j + 1].c0 < inLab.c1) j++;
          const tail = inLab.c1 - pg.toks[j].c0 < pg.toks[j].w.length;
          html += (tail ? '<span class="nw">' : '') + '<span class="chipw">';
        }
        const cut = endLab ? inLab.c1 - k.c0 : k.w.length;
        if (endLab && cut > 0 && cut < k.w.length) html += `<span class="cw"><span class="ci" data-i="${i}">${esc(k.w.slice(0, cut))}</span></span></span><span class="cw"><span class="ci" data-i="${i}">${esc(k.w.slice(cut))}</span></span></span>`;
        else { html += `<span class="cw"><span class="ci" data-i="${i}">${esc(k.w)}</span></span>`; if (endLab) html += '</span>'; }
        if (tm && inTerm(pg.toks[i + 1]) !== tm) html += '</span>';
        if (phrClose.has(i)) html += '</span>';
        if (k.space && i < pg.toks.length - 1) html += ' ';
      });
      el.innerHTML = html;
      if (D.dir === 'rtl') isolateLtr(el);
      pg.el = el;
      pg.words = pg.toks.map((_, i) => [...el.querySelectorAll(`.ci[data-i="${i}"]`)]);
      pg.chips = [...el.querySelectorAll('.chipw')];
      pg.t0 = pg.toks[0].t0; pg.t1 = pg.toks[pg.toks.length - 1].t1;
    }
    OV.pages.forEach((p, i) => { const n = OV.pages[i + 1]; p.show0 = p.t0 - 0.16; p.show1 = n && n.t0 - p.t1 < 0.9 ? n.t0 - 0.2 : p.t1 + 0.55; });
    // measure overflow (max two lines)
    OV.pages.forEach((p) => {
      p.el.style.opacity = 1;
      let fs = parseFloat(getComputedStyle(p.el).fontSize);
      const lines = () => Math.round(p.el.offsetHeight / parseFloat(getComputedStyle(p.el).lineHeight));
      while (lines() > 2 && fs > 32) { fs -= 2; p.el.style.fontSize = fs + 'px'; }
      p.lines = lines();
      if (p.lines > 2) console.warn('caption over two lines:', p.toks.map((k) => k.w).join(' '));
      p.el.style.opacity = 0;
    });
  }
  function renderOverlays(t) {
    const rtl = D.dir === 'rtl';
    // -------- objective title + takeaway
    let active = null;
    for (const s of OV.steps) { const sc = T.scene(s.id); if (t >= sc.start - 0.35 && t < sc.end + 0.1) { active = { s, sc }; break; } }
    if (active) {
      const { s, sc } = active;
      const first = Object.values(T.TL.lines).filter((l) => l.scene === s.id).sort((a, b) => a.start - b.start)[0];
      const a0 = sc.start - 0.3;
      const tc = Math.max(sc.start + 1.25, Math.min(sc.start + 2.1, first.start + 1.05));
      if (OV.cur !== s.id) {
        OV.cur = s.id;
        OV.ttl.querySelector('.n').textContent = digits(s.n);
        OV.ttl.querySelector('.eye').textContent = D.text.step.replace('{n}', digits(s.n)) + '  ·  ' + D.text.of.replace('{n}', digits(s.n));
        const tt = OV.ttl.querySelector('.tt');
        T.splitWords(tt, s.title, LANG);
        OV.take.querySelector('.tx').textContent = s.take;
        st(OV.ttl, { transform: 'none', left: '0px', top: '0px' });
        const r = OV.ttl.getBoundingClientRect(), rb = OV.ttl.querySelector('.badge').getBoundingClientRect(), rt = tt.getBoundingClientRect();
        OV.big = { w: r.width, h: r.height };
        OV.tw = rt.width; OV.bw = rb.width;
      }
      const big = OV.big, k = 0.42;
      const p = E.quint(inv(tc, tc + 0.6, t));
      const bx = rtl ? 1920 - 150 - big.w : 150, by = 520 - big.h / 2;
      const chipH = big.h * k;
      const cx = rtl ? 1920 - 52 - big.w * k : 52, cy = 46;
      const x = lerp(bx, cx, p), y = lerp(by, cy, p), sc2 = lerp(1, k, p);
      const vis = Math.min(clamp(inv(a0, a0 + 0.3, t)), 1 - clamp(inv(sc.end - 0.25, sc.end + 0.05, t)));
      st(OV.ttl, { left: '0px', top: '0px', opacity: vis.toFixed(3), transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc2.toFixed(4)})`, transformOrigin: '0 0' });
      const badge = OV.ttl.querySelector('.badge');
      const bp = E.back(inv(a0, a0 + 0.5, t));
      badge.style.transform = `scale(${clamp(bp, 0, 1.2).toFixed(3)}) rotate(${((1 - clamp(bp)) * -60).toFixed(1)}deg)`;
      T.words(OV.ttl.querySelector('.tt'), t, a0 + 0.12, { s: 0.06, d: 0.6, y: 30, b: 12 });
      OV.ttl.querySelector('.eye').style.opacity = (fade(t, a0 + 0.1, a0 + 0.45, tc, tc + 0.25)).toFixed(3);
      // chip background behind the collapsed title
      const cw = (OV.bw + 26 + OV.tw) * k + 36, ch = Math.max(chipH, OV.bw * k) + 20;
      const chipX = rtl ? 1920 - 52 - (OV.bw + 26 + OV.tw) * k - 18 : cx - 18;
      const cv = clamp(inv(tc + 0.25, tc + 0.6, t)) * vis;
      OV.topScrim.style.opacity = cv.toFixed(3);
      st(OV.chipbg, { opacity: cv.toFixed(3), left: chipX.toFixed(1) + 'px', top: (cy + (big.h * k - ch) / 2).toFixed(1) + 'px', width: cw.toFixed(1) + 'px', height: ch.toFixed(1) + 'px' });
      T.$('dim').style.opacity = Math.min(clamp(inv(sc.start - 0.1, sc.start + 0.3, t)), 1 - E.io(inv(tc - 0.05, tc + 0.5, t))).toFixed(3);
      // takeaway under the chip
      const tk = T.TL.cues[s.id + '.take'] ?? sc.end - 2;
      const tv = Math.min(clamp(inv(tk, tk + 0.3, t)), 1 - clamp(inv(sc.end - 0.25, sc.end + 0.05, t)));
      const tp = E.expo(inv(tk, tk + 0.7, t));
      const tw2 = OV.take.offsetWidth;
      const tX = rtl ? 1920 - 52 - tw2 + (1 - tp) * 30 : 52 - (1 - tp) * 30;
      st(OV.take, { opacity: tv.toFixed(3), transform: `translate(${tX.toFixed(1)}px,${(cy + ch + 16).toFixed(1)}px)` });
      OV.take.querySelector('.ck').style.transform = `scale(${clamp(E.back(inv(tk + 0.1, tk + 0.5, t)), 0, 1.3).toFixed(3)})`;
    } else {
      OV.cur = null;
      OV.ttl.style.opacity = 0; OV.chipbg.style.opacity = 0; OV.topScrim.style.opacity = 0; OV.take.style.opacity = 0; T.$('dim').style.opacity = 0;
    }
    // -------- captions
    let any = 0;
    for (const p of OV.pages) {
      const v = Math.min(clamp(inv(p.show0, p.show0 + 0.2, t)), 1 - clamp(inv(p.show1 - 0.14, p.show1, t)));
      if (v <= 0.002) { if (p.el.style.opacity !== '0') p.el.style.opacity = 0; continue; }
      any = Math.max(any, v);
      const up = (1 - E.expo(inv(p.show0, p.show0 + 0.5, t))) * 16 - E.i(inv(p.show1 - 0.14, p.show1, t)) * 10;
      st(p.el, { opacity: v.toFixed(3), transform: `translateY(${up.toFixed(1)}px)` });
      p.toks.forEach((k, i) => {
        const said = clamp(inv(k.t0 - 0.06, k.t0 + 0.1, t));
        const cur = t >= k.t0 - 0.04 && t < k.t1 + 0.02;
        for (const w of p.words[i]) { w.style.color = `rgba(255,255,255,${(0.42 + 0.58 * said).toFixed(3)})`; w.className = cur ? 'ci cg' : 'ci'; }
      });
      p.chips.forEach((c) => {
        const idx = [...c.querySelectorAll('.ci')].map((w) => +w.dataset.i);
        const k0 = p.toks[idx[0]], k1 = p.toks[idx[idx.length - 1]];
        const on = fade(t, k0.t0 - 0.05, k0.t0 + 0.15, k1.t1 + 0.4, k1.t1 + 0.9);
        c.style.background = `rgba(143,124,255,${(0.12 + 0.2 * on).toFixed(3)})`;
        c.style.borderColor = `rgba(${Math.round(lerp(143, 124, on))},${Math.round(lerp(124, 240, on))},${Math.round(lerp(255, 236, on))},${(0.5 + 0.4 * on).toFixed(3)})`;
        c.style.boxShadow = `0 0 ${(22 * on).toFixed(1)}px rgba(124,240,236,${(0.35 * on).toFixed(3)})`;
      });
    }
    OV.capScrim.style.opacity = (any * 0.95).toFixed(3);
  }

  /* ---------------------------------------------------------------- background + grain */
  let grainTiles = [];
  function renderBg(t) {
    st(T.$('aur1'), { transform: `translate(${(560 + Math.sin(t * 0.21) * 170).toFixed(1)}px,${(300 + Math.cos(t * 0.17) * 90).toFixed(1)}px)` });
    st(T.$('aur2'), { transform: `translate(${(1420 + Math.cos(t * 0.19) * 150).toFixed(1)}px,${(820 + Math.sin(t * 0.23) * 80).toFixed(1)}px)` });
    st(T.$('aur3'), { transform: `translate(${(960 + Math.sin(t * 0.13 + 1) * 260).toFixed(1)}px,${(560 + Math.cos(t * 0.11) * 120).toFixed(1)}px)` });
    const f = Math.round(t * 60), hh = (f * 2654435761) >>> 0;
    st(T.$('grain'), { backgroundImage: `url(${grainTiles[f % grainTiles.length]})`, backgroundPosition: `${hh % 256}px ${(hh >>> 8) % 256}px` });
  }

  /* ---------------------------------------------------------------- frame */
  window.renderFrame = function (t) {
    renderBg(t);
    const act = SC.map((s) => { const ts = T.scene(s.id); return t >= ts.start - (s.pre || 0) && t < ts.end + (s.post || 0); });
    SC.forEach((s, i) => { if (!act[i]) s.hide(); });
    SC.forEach((s, i) => { if (act[i]) { const ts = T.scene(s.id); s.render(T.warpInv(ts.map, t - ts.start), t); } });
    renderOverlays(t);
  };

  /* ---------------------------------------------------------------- boot */
  async function init() {
    const html = document.documentElement;
    const script = await V.getJSON(`/films/tutorial/script/${LANG}.json`);
    Object.assign(D, { lang: LANG, script, text: script.text, dir: script.dir, ui: script.ui, target: script.target, demo: script.demo });
    html.lang = V.htmlLang(LANG); html.dir = script.dir; html.dataset.script = SCRIPT;
    const [base, fitted, ui, parts] = await Promise.all([
      V.getJSON('/films/tutorial/timeline.json'), V.getJSON(`/build/tutorial2/${LANG}/timeline.json`, true), V.getJSON('/src/data/ui.json'), V.getJSON('/src/assets/logo/parts.json')]);
    T.BASE = base;
    T.TL = fitted && !qs.get('estimate') ? fitted : estimateTimeline(base, script);
    V.ui = ui;
    T.RTLUI = script.ui === 'fa';
    D.logoParts = parts;
    const msgLoc = { fa: 'fa', 'zh-Hans': 'zh_CN' }[script.ui] || 'en';
    D.extName = (await V.getJSON(`/repo/extension/_locales/${msgLoc}/messages.json`)).appName.message;
    // fonts first (fail loudly instead of rendering fallbacks)
    const sample = Object.values(script.lines).join(' ') + Object.values(script.text).flat().join(' ') + ' Avorythm 0123456789';
    const fams = ['Inter Variable', 'JetBrains Mono Variable', 'Vazirmatn Variable'].concat(SCRIPT === 'hans' ? ['Noto Sans SC Variable'] : SCRIPT === 'jpan' ? ['Noto Sans JP Variable'] : SCRIPT === 'deva' ? ['Noto Sans Devanagari Variable'] : []);
    await Promise.all(fams.flatMap((f) => [400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 40px "${f}"`, sample))));
    await document.fonts.ready;
    for (const f of fams) if (![...document.fonts].some((x) => x.family.replace(/"/g, '') === f && x.status === 'loaded')) throw new Error('font not loaded: ' + f);
    for (const s of SC) await s.build(D);
    SC.forEach((s) => s.hide());
    buildOverlays();
    const r = T.rng(99);
    for (let k = 0; k < 8; k++) {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), d = x.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = (r() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0); grainTiles.push(c.toDataURL());
    }
    await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
    window.__film = { duration: T.TL.duration, fps: T.TL.fps };
    window.renderFrame(0);
    window.__ready = true;
  }
  init().catch((e) => { window.__err = String((e && e.stack) || e); console.error(e); });
})();
