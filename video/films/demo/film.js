/* Avorythm — product launch demo ("Watch it switch"). 42 s, 120 BPM. renderFrame(t) is a pure function of t.
   One travelling camera over a world of real product pages (extension popup + synchronized player, desktop app),
   kinetic headlines in screen space, all cue times from timeline.json (shared with the score and the mix). */
(async function () {
  const { clamp, lerp, E, seg, fade, kf, noise, rng, $, el, css, place } = V;
  try {
    const P = new URLSearchParams(location.search);
    const LANG = P.get('lang') || 'en';
    const [TL, COPY, LINES, UI, APPUI] = await Promise.all([
      V.getJSON('timeline.json'), V.getJSON(`copy/${LANG}.json`), V.getJSON('lines.json'), V.getJSON('/src/data/ui.json'), V.getJSON('/build/demo/app-ui.json'),
    ]);
    const C = TL.cues;
    C.montage0 = TL.montage[0];
    const RTL = COPY.dir === 'rtl';
    const SCR = V.script(LANG);
    const HL = V.htmlLang(LANG);
    document.documentElement.lang = HL;
    const stage = $('#stage');
    stage.classList.add('s-' + SCR);
    const UIL = { fa: 'fa', zh: 'zh-Hans' }[LANG] || 'en'; // the product's interface exists in fa / en / zh-Hans
    const SRC = LANG === 'ja' ? 'ko' : 'ja';
    const SRCCLS = SRC === 'ja' ? 'jp' : 'kr';
    const TARGET = { zh: 'zh-Hans', pt: 'pt-BR' }[LANG] || LANG;
    const MX = (x) => (RTL ? 1920 - x : x);
    const MR = (r) => (RTL ? -r : r);
    const LAPM = RTL && UIL === 'fa';
    const MXL = (x) => (LAPM ? 1920 - x : x);
    const MRL = (r) => (LAPM ? -r : r);
    const DUB = LINES.dub[LANG];
    const SRCL = LINES.src[SRC];
    const hostLang = (code) => code.split('-')[0];
    const vdur = {};
    await Promise.all(TL.voices.map(async (v) => {
      const id = v.clip.replace('{src}', SRC).replace('{lang}', LANG);
      const m = await V.getJSON(`/build/demo/voices/${id}.json`, true);
      vdur[v.id] = m ? m.seconds : 2.8;
    }));
    const film = { duration: TL.duration, fps: TL.fps, poster: TL.poster };
    window.__film = film;
    const LOGO = '/repo/extension/assets/avorythm-logo.png';
    // brand glyphs from the site's icon set (Simple Icons, CC0)
    const BRAND = {};
    await Promise.all(['googlechrome', 'github', 'windows', 'apple', 'linux'].map(async (n) => {
      const raw = await (await fetch(`/repo/site/src/icons/brands/${n}.svg`)).text();
      BRAND[n] = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/g, '').trim();
    }));
    const bsvg = (n, fill) => `<svg viewBox="0 0 24 24" fill="${fill}">${BRAND[n]}</svg>`;
    const COAST = '/films/demo/assets/coast.jpg';
    const COASTB = '/films/demo/assets/coast-blur.jpg';
    const fontLinks = ['inter', 'noto-sans-jp', 'noto-sans-sc', 'noto-sans-devanagari'].map((f) => `/node_modules/@fontsource-variable/${f}/index.css`);
    const EXTFONT = 'html{font-family:Vazirmatn,"Inter Variable","Noto Sans JP Variable","Noto Sans SC Variable","Noto Sans Devanagari Variable",sans-serif}';

    /* =============================================================== world: browser A (video page) */
    const rig = $('#rig');
    const A = { x: 0, y: 0, w: 1720, h: 1040 };
    const PLAYER = { x: 40, y: 172, w: 1200, h: 675 }; // world coords
    const ICON = { x: A.w - 160 + 17, y: 44 + 24 };     // centre of the Avorythm toolbar icon
    const icons = {
      back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', fwd: '<path d="M5 12h14M13 6l6 6-6 6"/>', reload: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>',
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
      puzzle: '<path d="M10 3a2 2 0 0 1 4 0v2h4a1 1 0 0 1 1 1v4h-2a2 2 0 0 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 0 0-4 0v2H6a1 1 0 0 1-1-1v-4h2a2 2 0 0 0 0-4H5V6a1 1 0 0 1 1-1h4z" fill="currentColor" stroke="none"/>',
      spk: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
    };
    const svg = (p, sz = 18, sw = 2.2) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    function browser(box, o) {
      const w = el('div', 'win', '', rig);
      css(w, { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });
      w.innerHTML = `<div class="tabs"><div class="lights"><i></i><i></i><i></i></div>${o.tabs.map((t, i) => `<div class="tab${t.on ? ' on' : ''}" style="left:${84 + i * 266}px"><span class="fav" style="${t.fav}"></span><span class="tt">${t.title}</span>${t.audio ? svg(icons.spk, 15) : ''}<span class="x">✕</span></div>`).join('')}<div class="a" style="left:${84 + o.tabs.length * 266 + 8}px;top:12px;font:400 22px var(--sans);color:#7d8396">+</div></div>
        <div class="toolbar"><span class="nav" style="left:20px">${svg(icons.back)}</span><span class="nav" style="left:52px;opacity:.45">${svg(icons.fwd)}</span><span class="nav" style="left:84px">${svg(icons.reload)}</span>
        <div class="omni" style="width:${box.w - 120 - 200}px">${o.omni}</div>
        <div class="ext avoicon" style="left:${box.w - 160}px"><img src="${LOGO}"><i class="live"></i></div>
        <div class="ext" style="left:${box.w - 120}px">${svg(icons.puzzle, 18)}</div>
        <div class="ext" style="left:${box.w - 80}px"><div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#f472b6,#8b5cf6)"></div></div>
        <div class="ext" style="left:${box.w - 44}px;font:700 18px var(--sans)">⋮</div></div>
        <div class="page"></div>`;
      return { root: w, page: $('.page', w), avo: $('.avoicon', w), live: $('.avoicon .live', w) };
    }
    const favSite = 'background:linear-gradient(135deg,#f59e0b,#ef4444)';
    const favAvo = `background-image:url(${LOGO})`;
    const BA = browser(A, {
      tabs: [{ title: 'Coastlines · Episode 3', fav: favSite, on: true, audio: true }, { title: 'Reading list', fav: 'background:linear-gradient(135deg,#334155,#64748b)' }],
      omni: `${svg(icons.lock, 14, 2.4)}<span>wander.example.com/<span class="dim">coastlines/episode-3</span></span>`,
    });
    // the video page
    const pageA = BA.page;
    pageA.classList.add('site');
    pageA.innerHTML = `<div class="sitehead"><div class="sitelogo"><i><svg width="12" height="12" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z" fill="#0b0d13"/></svg></i>wander</div><div class="search">Search</div><div class="avatar" style="left:1650px;top:14px"></div></div>
      <div class="player" id="playerA" style="left:${PLAYER.x}px;top:${PLAYER.y - 92}px;width:${PLAYER.w}px;height:${PLAYER.h}px">
        <div class="vid"><img id="vidA" src="${COAST}"><div class="sweep" id="sweepA"></div></div>
        <div class="vshade"></div><div class="vline"><b id="vlineA"></b></div>
      </div>
      <div class="vtitle" style="left:40px;top:780px">Coastlines — Episode 3: The Road to the Sea</div>
      <div class="vmeta" style="left:40px;top:828px"><div style="width:42px;height:42px;border-radius:50%;background:url(${COAST}) 30% 60%/400% no-repeat"></div><div><b>Wander Films</b>1.2M views · 2 days ago</div><span class="subbtn">Subscribe</span></div>
      <div class="upnext" style="left:1276px;top:80px">Up next</div>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<div class="thumb" style="left:1276px;top:${118 + i * 113}px"><img src="${COAST}" style="object-position:${[10, 80, 45, 95, 25, 60][i]}% ${[30, 70, 85, 20, 55, 40][i]}%;transform:scale(${[2.2, 1.8, 2.6, 2.0, 2.4, 1.6][i]})"></div><div class="skel" style="left:1468px;top:${128 + i * 113}px;width:${[190, 160, 200, 150, 180, 170][i]}px;background:rgba(255,255,255,.14)"></div><div class="skel" style="left:1468px;top:${154 + i * 113}px;width:${[120, 140, 100, 130, 110, 90][i]}px"></div><div class="skel" style="left:1468px;top:${178 + i * 113}px;width:80px"></div>`).join('')}
      <div class="pagedim" id="dimA"></div>`;
    const playerA = $('#playerA');
    const vidA = $('#vidA');
    // the real subtitle card (extension/content.js), dragged onto the video
    const card = el('section', 'avo-card', `<div class="frost"><img src="${COASTB}"><i class="tint"></i></div><div class="grip"></div><p class="source" dir="auto"></p><p class="translation" dir="auto" lang="${HL}"></p><i class="rz"></i><i class="scan"></i>`, playerA);
    card.style.setProperty('--opacity', '0.72');
    card.style.setProperty('--size', '30px');
    const CARDW = 760;
    const cardSrc = $('p.source', card);
    const cardTr = $('p.translation', card);
    const cardFrost = $('.frost img', card);
    const cardScan = $('.scan', card);
    const cardGlow = el('div', 'cardglow', '', playerA);
    const pill = el('div', 'lpill', `<img src="${LOGO}"><span class="${SRCCLS}">${SRCL.name}</span><span class="arr">→</span><span lang="${HL}">${COPY.labels.languageName}</span><i class="live"></i>`, playerA);
    cardSrc.classList.add(SRCCLS);
    const sentences = {
      1: { src: V.words(el('span'), SRCL.L1, SRC), tr: DUB.L1 },
      2: { src: V.words(el('span'), SRCL.L2, SRC), tr: DUB.L2 },
    };
    // pre-tokenize; the card is filled per frame
    const tok = (text, lang) => V.tokenize(text, lang);
    const S1 = { src: tok(SRCL.L1, SRC), tr: tok(DUB.L1, LANG) };
    const S2 = { src: tok(SRCL.L2, SRC), tr: tok(DUB.L2, LANG) };
    const S3 = { src: SRCL.L3, tr: DUB.L3 };
    void sentences;
    // measured height of the card in its two-line state (for the cursor's grip / corner targets)
    card.style.width = CARDW + 'px';
    cardSrc.textContent = SRCL.L2; cardTr.textContent = DUB.L2; cardTr.style.display = 'block'; cardSrc.style.fontSize = (30 * 0.68) + 'px'; cardTr.style.fontSize = '30px';
    const CARDH = card.offsetHeight;

    /* ---------------------------------------------------------------- popup (real extension page) */
    const POP = { x: A.w - 160 + 34 - 392, y: 98, w: 390, h: 640 };
    const popWrap = el('div', 'popwrap', '', rig);
    const pop = await V.embed({ url: '/repo/extension/popup.html', base: '/repo/extension/', dict: UI.popup[UIL] || UI.popup.en, locale: UIL, dir: UIL === 'fa' ? 'rtl' : 'ltr', width: POP.w, height: POP.h, parent: popWrap, fontLinks, css: EXTFONT });
    const langName = (code) => { try { const n = new Intl.DisplayNames([UIL], { type: 'language' }); return `${n.of(code) || code} · ${code}`; } catch { return code; } };
    const LIST = ['en', 'fa', 'ar', 'zh-Hans', 'zh-Hant', 'de', 'fr', 'it', 'es', 'ru', 'ja', 'ko', 'tr', 'pt-BR', 'pt-PT', 'nl', 'pl', 'uk', 'hi', 'ur', 'he', 'id', 'ms', 'vi', 'th', 'af', 'ak', 'sq', 'am', 'hy'];
    const INITIAL = TARGET === 'en' ? 'fa' : 'en';
    const dPop = UI.popup[UIL] || UI.popup.en;
    {
      const q = pop.q;
      q('#localeToggle').value = UIL;
      q('#setupNotice').hidden = true;
      q('#toggleButton').disabled = false; q('#toggleButton').removeAttribute('disabled');
      q('#outputChips').innerHTML = [dPop.originalAudio, dPop.dubbedAudio, dPop.sourceSubtitles, dPop.translatedSubtitles].map((s) => `<span class="output-chip">${s}</span>`).join('');
      q('#outputCount').textContent = dPop.selectedCount;
      q('#targetLanguage').innerHTML = `<option selected>${langName(INITIAL)}</option>`;
      q('input[value="synchronized"]').checked = true;
    }
    POP.h = Math.min(760, Math.ceil(pop.doc.documentElement.scrollHeight));
    pop.frame.style.height = POP.h + 'px';
    css(popWrap, { left: POP.x + 'px', top: POP.y + 'px', width: POP.w + 'px', height: POP.h + 'px' });
    const prect = (sel) => { const r = pop.q(sel).getBoundingClientRect(); return { x: POP.x + r.left, y: POP.y + r.top, w: r.width, h: r.height, cx: POP.x + r.left + r.width / 2, cy: POP.y + r.top + r.height / 2 }; };
    const R = { sel: prect('#targetLanguage'), low: prect('input[value="low-latency"]'), lowCard: prect('.mode-option'), start: prect('#toggleButton'), status: prect('.status-line') };
    let popState = '';
    function popupState(t) {
      const picked = t >= C.pick, low = t >= C.modeClick, live = t >= C.startClick;
      const key = `${picked}${low}${live}`;
      if (key === popState) return;
      popState = key;
      const q = pop.q;
      q('#targetLanguage').innerHTML = `<option selected>${langName(picked ? TARGET : INITIAL)}</option>`;
      q('#languageBadge').textContent = live ? `${SRC.toUpperCase()} → ${TARGET.toUpperCase()}` : `AUTO → ${(picked ? TARGET : INITIAL).toUpperCase()}`;
      q('input[value="low-latency"]').checked = low;
      q('input[value="synchronized"]').checked = !low;
      q('#statusText').textContent = live ? dPop.connected : dPop.ready;
      q('#statusDot').className = live ? 'status-dot active' : 'status-dot';
      const b = q('#toggleButton');
      b.classList.toggle('stopping', live);
      b.querySelector('b').textContent = live ? dPop.stop : dPop.start;
      q('#actionHint').textContent = live ? dPop.stopHint : dPop.startHint;
      q('#targetLanguage').disabled = live;
    }
    // dropdown list (the native <select> list is drawn by the OS, so it is drawn here in the same style)
    const dd = el('div', 'dd', '<div class="hi"></div><div class="rows"></div>', rig);
    dd.dir = UIL === 'fa' ? 'rtl' : 'ltr';
    const ddRows = $('.rows', dd);
    const ddHi = $('.hi', dd);
    LIST.forEach((code) => { const r = el('div', 'row', `<span>${langName(code)}</span>`, ddRows); r.dataset.code = code; if (code === INITIAL) r.innerHTML += '<b>✓</b>'; });
    const ROWH = 31, VIS = 8;
    // as wide as the longest name; aligned to the select's leading edge (right edge in the RTL interface)
    const ddW = Math.max(R.sel.w + 20, ...[...ddRows.children].map((r) => r.scrollWidth + 34));
    const DD = { x: UIL === 'fa' ? R.sel.x + R.sel.w - ddW : R.sel.x, y: R.sel.y + R.sel.h + 4, w: ddW };
    css(dd, { left: DD.x + 'px', top: DD.y + 'px', width: DD.w + 'px', height: (VIS * ROWH + 10) + 'px' });
    const iTarget = LIST.indexOf(TARGET), iInit = LIST.indexOf(INITIAL);
    const scroll0 = 0;
    const scroll1 = Math.max(0, Math.min(LIST.length - VIS, iTarget - 3));
    const rowWorld = (i, sc) => ({ x: DD.x + DD.w * 0.5, y: DD.y + 5 + (i - sc) * ROWH + ROWH / 2 });

    // sparks for Start
    const sparks = [...Array(16)].map((_, k) => el('div', 'spark', '', rig));
    sparks.forEach((s, k) => css(s, { background: k % 2 ? '#5cf4f4' : '#a48bff', boxShadow: `0 0 12px ${k % 2 ? '#3ff9f9' : '#8b6cff'}` }));

    /* =============================================================== world: browser B (synchronized player tab) */
    const B = { x: 2140, y: 0, w: 1720, h: 1040 };
    const BB = browser(B, {
      tabs: [{ title: 'Coastlines · Episode 3', fav: favSite }, { title: 'Avorythm · Synchronized player', fav: favAvo, on: true, audio: true }],
      omni: `<span class="chip"><img src="${LOGO}" style="width:18px;height:18px">Avorythm</span><span class="dim">chrome-extension://kbdbbedijheicmmnmoidamdaodjbhjje/player.html</span>`,
    });
    BB.live.style.opacity = 1;
    const dPl = UI.player[UIL] || UI.player.en;
    const pl = await V.embed({ url: '/repo/extension/player.html', base: '/repo/extension/', dict: dPl, locale: UIL, dir: UIL === 'fa' ? 'rtl' : 'ltr', width: B.w, height: B.h - 92, parent: BB.page, fontLinks,
      css: EXTFONT + `.xvid{position:absolute;inset:0;overflow:hidden;border-radius:14px}.xvid img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:50% 50%}#video{opacity:0}.caption-stack{z-index:2}.caption.source-caption{font-family:${SRC === 'ja' ? '"Noto Sans JP Variable"' : '"KR Local","Malgun Gothic"'},Vazirmatn,sans-serif}
      .seek-tip{position:absolute;top:-30px;padding:3px 8px;border-radius:7px;background:#1c2130;border:1px solid rgba(255,255,255,.14);font:600 12px/1.4 "JetBrains Mono",ui-monospace,monospace;color:#fff;transform:translateX(-50%);white-space:nowrap}` });
    {
      const q = pl.q;
      q('#localeToggle').value = UIL;
      q('#bufferOverlay').hidden = true;
      const stageEl = q('.video-stage');
      stageEl.insertAdjacentHTML('afterbegin', `<div class="xvid"><img src="${COAST}"></div>`);
      q('#liveBadge').classList.add('playing');
      q('#liveBadge span').textContent = dPl.playing;
      q('#delayBadge').textContent = '+20.4s';
      q('#sourceCaption').hidden = false; q('#translatedCaption').hidden = false;
      q('#sourceCaption').textContent = S3.src; q('#translatedCaption').textContent = S3.tr; q('#translatedCaption').lang = HL;
      for (const id of ['originalAudioEnabled', 'dubAudioEnabled', 'sourceSubtitlesEnabled', 'translatedSubtitlesEnabled']) q('#' + id).checked = true;
      q('#originalVolume').value = 1; q('#dubVolume').value = 1; q('#originalVolumeValue').textContent = '100%'; q('#dubVolumeValue').textContent = '100%';
      q('#originalValue').textContent = '100%'; q('#dubValue').textContent = '100%';
      q('#autoDuck').checked = false;
      q('#recordedValue').textContent = '2:41'; q('#leadValue').textContent = '20.4s'; q('#engineValue').textContent = 'Gemini Live';
      q('#downloadVideoButton').disabled = false;
      q('#seekRange').max = 161; q('#seekRange').value = 100;
      q('.timeline').insertAdjacentHTML('beforeend', '<span class="seek-tip" id="seekTip">1:40</span>');
      pl.q('#bufferTrack').style.width = '100%';
    }
    const plVid = pl.q('.xvid img');
    const brect = (sel) => { const r = pl.q(sel).getBoundingClientRect(); return { x: B.x + r.left, y: B.y + 92 + r.top, w: r.width, h: r.height, cx: B.x + r.left + r.width / 2, cy: B.y + 92 + r.top + r.height / 2 }; };
    // page scroll positions (measured at scroll 0)
    const yDock = pl.q('.control-dock').getBoundingClientRect().top;
    const SCROLL_DOCK = Math.max(0, Math.min(pl.doc.documentElement.scrollHeight - (B.h - 92), yDock - 140));

    /* =============================================================== cursor (world space) */
    const ripple = el('div', 'ripple', '', rig);
    const cursor = el('div', 'cursor', '<svg viewBox="0 0 30 30" width="30" height="30"><path d="M4 2L4 24L9.4 19L13.2 27.6L17.4 25.8L13.7 17.4L21 17.4Z" fill="#fff" stroke="#0b0d14" stroke-width="1.6" stroke-linejoin="round"/></svg>', rig);

    /* =============================================================== laptop layer (desktop app) */
    const lapCam = $('#lapCam');
    const lapDim = el('div', 'a', '', $('#lapLayer'));
    css(lapDim, { left: '0px', top: '0px', width: '1920px', height: '1080px', background: 'radial-gradient(ellipse 70% 70% at 60% 55%,rgba(4,5,12,.7),rgba(4,5,12,.95))', opacity: 0 });
    const lap = el('div', 'lap', `<div class="deck"><div class="a" style="left:170px;top:80px;width:1240px;height:470px;border-radius:16px;background:repeating-linear-gradient(90deg,transparent 0 73px,#0d0e12 73px 82.7px),repeating-linear-gradient(0deg,transparent 0 69px,#0d0e12 69px 78.3px),#2a2c34;box-shadow:inset 0 0 0 6px #0d0e12"></div><div class="a" style="left:530px;top:610px;width:520px;height:300px;border-radius:18px;background:#2c2f37;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)"></div></div><div class="front"></div>
      <div class="lid"><div class="lidB"><img src="${LOGO}" class="a" style="left:600px;top:340px;width:200px;height:200px;opacity:.3;filter:grayscale(1) brightness(1.8)"></div><div class="lidF"><div class="scr"><div class="desk"><div class="bar"></div></div></div></div></div>`, lapCam);
    const lid = $('.lid', lap);
    const scr = $('.scr', lap);
    const front = $('.front', lap);
    front.style.transform = 'translateZ(980px)';
    const AW = { x: 56, y: 48, w: 1080, h: 720 }; // desktop-app window on the laptop screen
    const awin = el('div', 'awin', `<div class="wt"><div class="lights"><i></i><i></i><i></i></div>Avorythm</div>`, scr);
    css(awin, { left: AW.x + 'px', top: AW.y + 'px', width: AW.w + 'px', height: AW.h + 'px' });
    const appHost = el('div', 'a', '', awin);
    css(appHost, { left: '0px', top: '32px', width: AW.w + 'px', height: (AW.h - 32) + 'px', overflow: 'hidden' });
    const appCss = (await (await fetch('/repo/src/avorythm/static/styles.css')).text()).replaceAll("url('/assets/", "url('/repo/src/avorythm/static/assets/");
    const dApp = APPUI.messages[UIL] || APPUI.messages.en;
    const app = await V.embed({ url: '/repo/src/avorythm/static/index.html', base: '/repo/src/avorythm/static/', dict: dApp, locale: UIL, dir: UIL === 'fa' ? 'rtl' : 'ltr', width: AW.w, height: AW.h - 32, parent: appHost, fontLinks,
      rewrite: (h) => h.replace(/<link rel="stylesheet"[^>]*>/, '').replaceAll('src="/assets/', 'src="/repo/src/avorythm/static/assets/'),
      css: appCss + `html{font-family:Vazirmatn,"Inter Variable","Noto Sans JP Variable","Noto Sans SC Variable",sans-serif}.xvid{position:absolute;inset:0;overflow:hidden}.xvid img{width:100%;height:100%;object-fit:cover}#mediaPlayer{opacity:0}.caption.source-caption{font-family:${SRC === 'ja' ? '"Noto Sans JP Variable"' : '"KR Local","Malgun Gothic"'},Vazirmatn,sans-serif}` });
    {
      const q = app.q;
      q('#localeToggle').value = UIL;
      const sel = q('#mediaTargetLanguage'); sel.innerHTML = `<option>${(APPUI.languageNames[UIL] || APPUI.languageNames.en)[TARGET] || TARGET}</option>`;
      q('#mediaVoice').innerHTML = '<option>Charon</option>';
      q('#playerReady .video-stage').insertAdjacentHTML('afterbegin', `<div class="xvid"><img src="${COAST}"></div>`);
      q('#sourceCaption').hidden = false; q('#translatedCaption').hidden = false;
      q('#sourceCaption').textContent = SRCL.L1; q('#translatedCaption').textContent = DUB.L1;
      q('#showSourceSubs').checked = true; q('#hearOriginal').checked = true;
    }
    const studioTop = app.q('#mediaStudio').getBoundingClientRect().top;
    app.win.scrollTo(0, Math.max(0, studioTop - 96));
    const APPSCROLL0 = Math.round(app.win.scrollY + app.q('.upload-card').getBoundingClientRect().top - 108);
    const APPSCROLL1 = APPSCROLL0 + 170; // the user scrolls down to watch the job progress
    app.win.scrollTo(0, APPSCROLL0);
    const arect = (sel) => { const r = app.q(sel).getBoundingClientRect(); return { x: AW.x + r.left, y: AW.y + 32 + r.top, w: r.width, h: r.height, cx: AW.x + r.left + r.width / 2, cy: AW.y + 32 + r.top + r.height / 2 }; };
    const DZ0 = arect('#dropZone'), BTN0 = arect('#processMediaButton'), ZIP0 = arect('#downloadMediaZip');
    // desktop file icon + drag ghost + cursor on the laptop screen
    const fileSvg = `<svg width="92" height="114" viewBox="0 0 92 114"><path d="M9 2h52l29 29v73a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7V9a7 7 0 0 1 7-7z" fill="#f2f3f8"/><path d="M61 2v22a7 7 0 0 0 7 7h22z" fill="#cfd3de"/><rect x="17" y="50" width="58" height="40" rx="7" fill="#6b3bff"/><path d="M40 60l14 10-14 10z" fill="#fff"/><text x="46" y="106" text-anchor="middle" font-family="Inter Variable" font-weight="800" font-size="12" fill="#6c7285">MP4</text></svg>`;
    const deskFile = el('div', 'fileic', fileSvg, scr);
    const deskLabel = el('div', 'flabel', 'coastlines.mp4', scr);
    const FILE0 = { x: AW.x + AW.w + 64, y: 520 };
    css(deskFile, { left: FILE0.x + 'px', top: FILE0.y + 'px' }); css(deskLabel, { left: (FILE0.x - 34) + 'px', top: (FILE0.y + 120) + 'px' });
    const ghost = el('div', 'fileic', fileSvg, scr);
    const lRipple = el('div', 'ripple', '', scr);
    const lCursor = el('div', 'cursor', $('svg', cursor).outerHTML, scr);
    // OS badges + zip fan (screen space, in front of the laptop)
    const over = $('#over');
    const fcIcon = {
      wave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10.5v3"/></svg>',
      cc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2.5" y="5" width="19" height="14" rx="3.5"/><path d="M6.5 11h4M12.5 11h5M6.5 15h7M15.5 15h2"/></svg>',
      zip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h9l4 4v14H6z"/><path d="M11 3v2h2v2h-2v2h2v2h-2v2"/><rect x="10" y="15" width="4" height="4" rx="1"/></svg>',
    };
    const files = [
      ['original.wav', dApp.originalAudioFile, fcIcon.wave, '#9d85ff'], ['dubbed.wav', dApp.dubbedAudioFile, fcIcon.wave, '#3ff9f9'],
      ['source.srt', dApp.sourceSubtitleFile, fcIcon.cc, '#b9a8ff'], ['translated.srt', dApp.translatedSubtitleFile, fcIcon.cc, '#7ff7f7'],
    ].map((f) => { const e = el('div', 'fcard', `<div class="ic" style="color:${f[3]};background:${f[3]}1f;box-shadow:inset 0 0 0 1px ${f[3]}44">${f[2]}</div><div class="fn">${f[0]}</div><div class="ft" dir="auto">${f[1]}</div>`, over); return e; });
    const zipCard = el('div', 'fcard', `<div class="ic" style="color:#fff;background:linear-gradient(135deg,#6b3bff,#26c6e0)">${fcIcon.zip}</div><div class="fn">all-outputs.zip</div><div class="ft" dir="auto">${dApp.allFourFiles}</div>`, over);
    const osRow = el('div', 'a', `<div style="display:flex;gap:14px">${[
      ['Windows', bsvg('windows', '#7dd3fc')], ['macOS', bsvg('apple', '#e9ebf2')], ['Linux', bsvg('linux', '#fcd34d')],
    ].map(([n, i]) => `<div class="osb">${i}${n}</div>`).join('')}</div>`, $('#hud'));

    /* =============================================================== HUD headlines */
    const hud = $('#hud');
    const scrimTop = el('div', 'a', '', hud);
    css(scrimTop, { left: '0px', top: '0px', width: '1920px', height: '420px', background: 'linear-gradient(rgba(5,6,15,.92),rgba(5,6,15,.72) 45%,rgba(5,6,15,0))', opacity: 0 });
    const scrimSide = el('div', 'scrimL', '', hud);
    css(scrimSide, { left: RTL ? '820px' : '0px', background: `linear-gradient(${RTL ? 'to left' : 'to right'},rgba(5,6,15,.94),rgba(5,6,15,.7) 55%,rgba(5,6,15,0))` });
    const SZ = { latin: 1, arab: 0.94, deva: 0.86, hans: 0.92, jpan: 0.9, kore: 0.9 }[SCR];
    // words grouped into phrases (sentences / highlighted runs) that only wrap when they cannot fit on one line
    function phraseWords(node, text) {
      const toks = V.tokenize(text, LANG);
      const phrases = []; const spans = [];
      let ph = null; let prev = null;
      toks.forEach((k, i) => {
        if (!ph || k.hl !== prev.hl || /[.!?。！？؟]$/.test(prev.w)) {
          if (ph && prev.space) node.appendChild(document.createTextNode(' '));
          ph = el('span', 'ph', null, node); phrases.push(ph);
        } else if (prev.space) ph.appendChild(document.createTextNode(' '));
        const sp = el('span', `w${k.hl ? ' hl' : ''}`, null, ph); sp.textContent = k.w; spans.push(sp);
        prev = k;
      });
      return { spans, toks, phrases };
    }
    function headline(h, o) {
      const b = el('div', 'hb', '', hud);
      b.dir = RTL ? 'rtl' : 'ltr';
      b.lang = HL;
      const mir = RTL && !o.noMirror;
      const left = o.align === 'center' ? (1920 - o.w) / 2 : (mir ? 1920 - o.x - o.w : o.x);
      css(b, { left: left + 'px', top: o.y + 'px', width: o.w + 'px', textAlign: o.align === 'center' ? 'center' : 'start' });
      let eyebrow = null;
      if (h.eyebrow) { eyebrow = el('div', 'eyebrow', `<img src="${LOGO}"><span dir="ltr">${h.eyebrow}</span>`, b); if (o.align === 'center') eyebrow.style.justifyContent = 'center'; }
      const title = el('div', 'title', '', b);
      const T = phraseWords(title, h.title);
      let sub = null; let Sw = null;
      if (h.sub) { sub = el('div', 'sub', '', b); Sw = V.words(sub, h.sub, LANG); }
      // auto-fit: largest size whose title fits in maxLines lines and whose longest word fits the width
      let fs = o.size * SZ;
      const lh = parseFloat(getComputedStyle(title).lineHeight) / parseFloat(getComputedStyle(title).fontSize) || 1.1;
      const minNoWrap = fs * (o.minShrink || 0.78);
      for (; fs > 40; fs -= 2) {
        title.style.fontSize = fs + 'px';
        T.phrases.forEach((ph) => ph.classList.remove('wrap'));
        const tooWide = T.phrases.some((ph) => ph.offsetWidth > o.w);
        if (tooWide && fs > minNoWrap) continue;
        T.phrases.forEach((ph) => { if (ph.offsetWidth > o.w) ph.classList.add('wrap'); });
        const lines = Math.round(title.scrollHeight / (fs * lh));
        const widest = Math.max(...T.spans.map((s) => s.offsetWidth));
        if (lines <= o.lines && widest <= o.w && title.scrollWidth <= o.w + 1) break;
      }
      let ss = (o.sub || 32) * (SCR === 'latin' ? 1 : SCR === 'arab' ? 0.96 : 0.92);
      if (sub) for (; ss > 20; ss -= 1) { sub.style.fontSize = ss + 'px'; const lines = Math.round(sub.scrollHeight / (ss * parseFloat(getComputedStyle(sub).lineHeight) / ss)); if (lines <= (o.subLines || 2)) break; }
      if (o.anchor === 'middle') b.style.top = (o.y - b.offsetHeight / 2) + 'px';
      return { b, eyebrow, title, T, sub, Sw, fs };
    }
    function hAnim(H, t, tin, tout, o = {}) {
      const vis = t > tin - 0.05 && t < tout + 0.5;
      H.b.style.display = vis ? 'block' : 'none';
      if (!vis) return;
      const st = o.stagger ?? 0.05;
      const q = E.in2(seg(t, tout, tout + 0.42));
      place(H.b, { y: -q * 34, o: 1 - q, blur: q * 12 });
      if (H.eyebrow) { const p = E.outExpo(seg(t, tin - 0.15, tin + 0.6)); place(H.eyebrow, { y: (1 - p) * 26, o: clamp(p * 1.6), blur: (1 - p) * 8 }); }
      H.T.spans.forEach((s, i) => {
        const a = tin + i * st; const p = E.outExpo(seg(t, a, a + 0.75));
        place(s, { y: (1 - p) * 0.55 * H.fs, o: clamp(seg(t, a, a + 0.28)), blur: (1 - p) * 10 });
      });
      if (H.sub) {
        const a = tin + Math.min(0.5, H.T.spans.length * st) + 0.18;
        H.Sw.spans.forEach((s, i) => { const b0 = a + i * 0.012; const p = E.outExpo(seg(t, b0, b0 + 0.7)); place(s, { y: (1 - p) * 18, o: clamp(seg(t, b0, b0 + 0.35)) }); });
      }
    }
    const H1 = headline(COPY.h1, { x: 116, y: 540, anchor: 'middle', w: 600, size: 92, lines: 3, sub: 32 });
    const H2 = headline(COPY.h2, { x: 116, y: 540, anchor: 'middle', w: LANG === 'fr' ? 600 : 640, minShrink: 0.66, size: 88, lines: 3, sub: 32 });
    const H3 = headline(COPY.h3, { align: 'center', y: 78, w: 1560, size: 76, lines: 1, sub: 30, subLines: 1 });
    const H5 = headline(COPY.h5, { align: 'center', y: 64, w: 1560, size: 76, lines: 1, sub: 30, subLines: 1 });
    const H6 = headline(COPY.h6, { align: 'center', y: 64, w: 1560, size: 76, lines: 1, sub: 30, subLines: 1 });
    const H7 = headline(COPY.h7, { x: 120, y: 470, anchor: 'middle', w: 620, size: 92, lines: 2, sub: 32, noMirror: RTL && !LAPM });
    css(osRow, { left: (LAPM ? 1920 - 120 - 620 : 120) + 'px', top: '0px', width: '620px', direction: 'ltr' });
    osRow.firstElementChild.style.justifyContent = RTL ? 'flex-end' : 'flex-start';
    // 79 languages: big number + word, centred above the card
    const H4 = (() => {
      const b = el('div', 'hb', '', hud);
      b.dir = RTL ? 'rtl' : 'ltr';
      css(b, { left: '0px', top: '58px', width: '1920px', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '28px' });
      const n = el('div', 'num79 hl', '79', b);
      n.dir = 'ltr';
      const w = el('div', 'title', COPY.h4.title, b);
      css(n, { fontSize: '200px' }); css(w, { fontSize: (96 * SZ) + 'px', fontWeight: 720 });
      if (SCR === 'arab') n.style.fontFamily = 'var(--fa)';
      return { b, n, w };
    })();

    /* callout labels for the card lines + language name during the montage */
    const calls = el('div', '', '', $('#hud')); calls.id = 'calls';
    const labO = el('div', 'clab', `<i style="background:#b9adff;box-shadow:0 0 10px #8f7cff"></i><span>${COPY.labels.original}</span>`, calls);
    const labY = el('div', 'clab', `<i style="background:#5ff3ee;box-shadow:0 0 10px #3ff9f9"></i><span class="nm">${COPY.labels.yours}</span>`, calls);
    labO.dir = labY.dir = RTL ? 'rtl' : 'ltr';
    const labYName = $('.nm', labY);
    const lineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    lineSvg.setAttribute('width', 1920); lineSvg.setAttribute('height', 1080); lineSvg.style.cssText = 'position:absolute;left:0;top:0';
    lineSvg.innerHTML = '<path id="lnO" stroke="rgba(255,255,255,.55)" stroke-width="2" fill="none"/><path id="lnY" stroke="rgba(255,255,255,.55)" stroke-width="2" fill="none"/><circle id="dO" r="5" fill="#b9adff"/><circle id="dY" r="5" fill="#5ff3ee"/>';
    calls.prepend(lineSvg);

    /* =============================================================== trust words + end card (screen space) */
    const endL = $('#endLayer');
    const tw = COPY.h8.words.map((w, i) => { const e = el('div', 'tword', '', endL); e.textContent = w; e.dir = RTL ? 'rtl' : 'ltr'; css(e, { fontSize: (150 * SZ) + 'px' }); if (i === 1) e.classList.add('hl'); return e; });
    const TICON = await Promise.all(['hand-heart', 'code-xml', 'shield-check'].map(async (n) => {
      const raw = await (await fetch(`/repo/site/src/icons/lucide/${n}.svg`)).text();
      return raw.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
    }));
    const ticons = TICON.map((inner, i) => el('div', 'ticon', `<svg viewBox="0 0 24 24" fill="none" stroke="${['#c9bdff', '#7ff0ea', '#e9ecf6'][i]}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`, endL));
    { let fs = 150 * SZ; const fit = () => tw.reduce((a, e) => a + e.offsetWidth, 0) + 92; tw.forEach((e) => (e.style.fontSize = fs + 'px')); while (fit() > 1640 && fs > 60) { fs -= 4; tw.forEach((e) => (e.style.fontSize = fs + 'px')); } }
    const tsub = el('div', 'tsub', '', endL); tsub.textContent = COPY.h8.sub; tsub.dir = RTL ? 'rtl' : 'ltr'; css(tsub, { fontSize: '36px', top: '0px', color: '#aeb7d0' });
    // logo parts (from the real logo, split into layers)
    const parts = await V.getJSON('/src/assets/logo/parts.json');
    const LOGOW = 420; const LOGOS = LOGOW / parts.width; // logo drawn 420 px wide
    const RINGS = [34.3, 35.0, 36.0, 37.0, 38.0, 39.0];
    const rings = RINGS.flatMap((tr, i) => ['p', 'c'].map((side) => { const r = el('div', 'ring', '', endL); r.dataset.t = tr; r.dataset.side = side; r.dataset.big = tr === 36.0 ? 1 : 0; return r; }));
    const logoBox = el('div', 'a', '', endL);
    const logoEls = parts.parts.map((p) => { const i = el('img', 'logoPart', null, logoBox); i.src = `/src/assets/logo/${p.f}`; css(i, { width: p.w * LOGOS + 'px', height: p.h * LOGOS + 'px' }); return { p, i }; });
    const endWord = el('div', 'endword', 'Avorythm', endL);
    const endTag = el('div', 'endtag', '', endL); endTag.dir = RTL ? 'rtl' : 'ltr'; endTag.lang = HL;
    const TagW = V.words(endTag, COPY.end.tagline, LANG);
    css(endTag, { fontSize: (84 * SZ) + 'px' });
    const tagWidth = () => { const r = document.createRange(); r.selectNodeContents(endTag); return r.getBoundingClientRect().width; };
    for (let fs = 84 * SZ; fs > 40 && tagWidth() > 1640; fs -= 2) endTag.style.fontSize = fs + 'px';
    TagW.spans.forEach((s) => (s.style.display = 'inline-block'));
    const btnRow = el('div', 'btnrow', '', endL);
    btnRow.style.direction = RTL ? 'rtl' : 'ltr';
    const btn1 = el('div', 'btn primary', `${bsvg('googlechrome', '#fff')}<span>${COPY.end.cta}</span><i class="shine"></i>`, btnRow);
    const btn2 = el('div', 'btn ghost', `${bsvg('github', '#fff')}<span>${COPY.end.github}</span>`, btnRow);
    const btn3 = el('div', 'btn ghost', `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg><span>${COPY.end.desktop}</span>`, btnRow);
    const endUrl = el('div', 'endurl', COPY.end.url, endL);
    const endPlat = el('div', 'endplat', COPY.end.platforms, endL);
    const shine = $('.shine', btn1);

    /* =============================================================== finale: a wall of the same video in 25 languages */
    const wallLayer = el('div', 'a', '', endL);
    css(wallLayer, { left: '0px', top: '0px', width: '1920px', height: '1080px', perspective: '2200px', perspectiveOrigin: '960px 540px' });
    const wallCam = el('div', 'a', '', wallLayer);
    const TW = 480, TH = 270, GAP = 44, NC = 5;
    const others = LINES.montage.filter(([code]) => hostLang(code) !== LANG && !(LANG === 'zh' && code === 'zh-Hans') && !(LANG === 'pt' && code === 'pt-BR'));
    const wallLangs = [];
    for (let i = 0, k = 0; i < NC * NC; i++) wallLangs.push(i === 12 ? [TARGET, COPY.labels.languageName, DUB.L1] : others[k++ % others.length]);
    const CROPS = [[50, 50, 1.0], [20, 60, 1.6], [80, 40, 1.5], [35, 30, 1.8], [65, 75, 1.7], [10, 80, 1.4], [90, 65, 1.9], [45, 85, 2.0], [55, 20, 1.6], [25, 45, 1.5]];
    const tiles = wallLangs.map(([code, name, line], i) => {
      const r = Math.floor(i / NC), c = i % NC;
      const tile = el('div', 'wtile', '', wallCam);
      const cr = CROPS[(i * 7) % CROPS.length];
      const lng = code === 'zh-Hans' ? 'zh' : hostLang(code);
      const rtlT = ['ar', 'fa'].includes(lng);
      const fam = { fa: 'var(--fa)', ar: 'var(--fa)', hi: 'var(--sans),var(--deva)', zh: 'var(--sans),var(--sc)', ja: 'var(--jp)', ko: 'var(--kr)' }[lng] || 'var(--sans)';
      tile.innerHTML = `<img src="${COAST}" style="object-position:${cr[0]}% ${cr[1]}%;transform:scale(${i === 12 ? 1 : cr[2]})"><i class="wshade"></i><span class="wlab" style="font-family:${fam}">${name}</span><div class="wcard"><p dir="${rtlT ? 'rtl' : 'ltr'}" lang="${V.htmlLang(lng)}" style="font-family:${fam}">${line}</p></div>`;
      css(tile, { left: (c - 2) * (TW + GAP) - TW / 2 + 'px', top: (r - 2) * (TH + GAP) - TH / 2 + 'px', width: TW + 'px', height: TH + 'px' });
      const pEl = $('.wcard p', tile);
      for (let fs = 21; fs > 12 && pEl.scrollWidth > TW - 64; fs -= 1) pEl.style.fontSize = fs + 'px';
      return { tile, r, c, d: Math.hypot(r - 2, c - 2) };
    });
    function wallFrame(t) {
      const on = t > C.wall - 0.05 && t < C.end + 0.45;
      wallLayer.style.display = on ? 'block' : 'none';
      if (!on) return;
      // camera: starts on the centre tile at full frame (an echo of the hook) and pulls back to reveal the wall
      const pb = E.outExpo(seg(t, C.wall, C.wall + 1.5));
      const s = lerp(1920 / TW * 1.04, 0.6, pb) * (1 - 0.06 * seg(t, C.wall + 1.5, C.wallOut));
      const rx = lerp(0, 9, pb), rz = lerp(0, -3, pb) + noise(t * 0.4) * 0.4;
      wallCam.style.transform = `translate(960px,540px) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`;
      wallLayer.style.opacity = (Math.min(1, seg(t, C.wall - 0.05, C.wall + 0.04)) * (1 - E.in2(seg(t, C.end + 0.05, C.end + 0.4)))).toFixed(3);
      const k = kb(t);
      tiles.forEach(({ tile, r, c, d }, i) => {
        // collapse into the centre, outer tiles last, becoming the logo
        const a0 = C.wallOut + d * 0.1;
        const q = E.in3(seg(t, a0, a0 + 0.45));
        const appear = i === 12 ? 1 : E.out3(seg(t, C.wall + 0.15 + d * 0.06, C.wall + 0.55 + d * 0.06));
        const x = -((c - 2) * (TW + GAP)) * q, y = -((r - 2) * (TH + GAP)) * q;
        place(tile, { x, y, z: Math.sin((i * 1.7) + t) * 12 * (1 - q), s: (1 - 0.75 * q) * lerp(0.92, 1, appear), r: (c - 2) * 18 * q, o: appear * (1 - q) });
        if (i === 12) $('img', tile).style.transform = `translate(${k.x.toFixed(2)}px,${k.y.toFixed(2)}px) scale(${k.s.toFixed(4)})`;
      });
    }

    /* =============================================================== background + grain */
    const bg = $('#bg').getContext('2d');
    const dust = (() => { const r = rng(7); return [...Array(90)].map(() => ({ x: r() * 2400, y: r() * 1400, z: 0.15 + r() * 0.85, a: 0.25 + r() * 0.55, s: 0.8 + r() * 1.8, ph: r() * 6.28 })); })();
    const grainTiles = [];
    { const r = rng(99); for (let k = 0; k < 8; k++) { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = (r() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); grainTiles.push(c.toDataURL()); } }

    /* =============================================================== fonts (fail the render on any fallback) */
    const sample = [COPY, LINES.dub[LANG]].map((o) => JSON.stringify(o)).join(' ');
    const fam = { latin: '"Inter Variable"', arab: '"Vazirmatn Variable"', deva: '"Noto Sans Devanagari Variable"', hans: '"Noto Sans SC Variable"', jpan: '"Noto Sans JP Variable"' }[SCR];
    await V.fontsReady(document, [
      ['700 40px "Inter Variable"', 'Avorythm ABCabc 0123 → —'], ['400 40px "JetBrains Mono Variable"', 'all-outputs.zip 0:00'],
      [`700 40px ${fam}`, sample.replace(/[{}"\[\]:,]/g, ' ').slice(0, 2000)],
      ['600 40px "Vazirmatn Variable"', 'هر مسیر تازه، داستان تازه‌ای دارد. فارسی العربية'],
      ['700 40px "Noto Sans JP Variable"', SRCL.L1 + SRCL.L2 + SRCL.L3 + '日本語'],
      ['700 40px "Noto Sans SC Variable"', '每一条新路，都有一个新故事。中文'],
      ['700 40px "Noto Sans Devanagari Variable"', 'हर नया रास्ता एक नई कहानी कहता है। हिन्दी'],
    ]);
    if (!document.fonts.check('700 30px "KR Local"', '새로운 길에는 새로운 이야기가 있다. 한국어')) await document.fonts.load('700 30px "KR Local"', '새로운 길에는 한국어');
    if (![...document.fonts].some((f) => f.family.replace(/"/g, '') === 'KR Local' && f.status === 'loaded')) throw new Error('Korean font (Malgun Gothic) not available');
    for (const fr of [pop, pl, app]) {
      await fr.doc.fonts.load('600 16px Vazirmatn', 'Avorythm آمادهٔ ترجمه');
      await fr.doc.fonts.load('600 16px "Noto Sans JP Variable"', SRCL.L1 + SRCL.L3);
      await fr.doc.fonts.ready;
      if (![...fr.doc.fonts].some((f) => f.family.replace(/"/g, '') === 'Vazirmatn' && f.status === 'loaded')) throw new Error('product font (Vazirmatn) not loaded in an embedded page');
    }

    /* =============================================================== camera */
    const card0 = { x: (PLAYER.w - CARDW) / 2, bottom: 64 }; // card position inside the player (px from left / from bottom)
    const cardWorld = () => ({ cx: PLAYER.x + card0.x + CARDW / 2, cy: PLAYER.y + PLAYER.h - card0.bottom - CARDH / 2 });
    const CW = cardWorld();
    const sHook = 1.86;
    const fyHook = (s) => PLAYER.y + PLAYER.h - 540 / s;
    const plStart = () => brect('#playButton');
    let BP = null; // B page rects at the time of measuring (scroll 0)
    const measureB = (scrollY) => { pl.win.scrollTo(0, scrollY); return { play: brect('#playButton'), seek: brect('#seekRange'), tl: brect('.transport'), dock: brect('.control-dock'), ch0: brect('.control-dock .channel'), vol: brect('#originalVolume'), duck: brect('#autoDuck'), stage: brect('.video-stage') }; };
    const B0 = measureB(0);
    const B1 = measureB(SCROLL_DOCK);
    pl.win.scrollTo(0, 0);
    BP = { B0, B1 };
    const CAM = [
      [0.0, [PLAYER.x + PLAYER.w / 2, fyHook(sHook), 960, 540, sHook, 0, 0]],
      [3.95, [PLAYER.x + PLAYER.w / 2, fyHook(1.97), 960, 540, 1.97, 0, 0], E.io2],
      [5.3, [A.w / 2, A.h / 2 + 10, 1300, 552, 0.56, 7, -15], E.outExpo],
      [6.3, [A.w / 2, A.h / 2 + 10, 1306, 548, 0.567, 6.4, -13.5], E.lin],
      [7.4, [ICON.x - 60, ICON.y + 90, 1290, 330, 1.38, 4, -6], E.io3],
      [8.15, [POP.x + POP.w / 2, POP.y + POP.h / 2 - 10, 1300, 545, 1.42, 3, -5], E.io3],
      [8.75, [R.sel.cx - 20, R.sel.cy + 90, 1330, 420, 2.05, 2, -3], E.io3],
      [9.6, [R.sel.cx - 20, R.sel.cy + 100, 1330, 420, 2.07, 2, -3], E.lin],
      [C.modeClick + 0.2, [R.lowCard.cx, R.lowCard.cy + 40, 1330, 480, 2.0, 2, -3], E.io3],
      [C.startClick - 0.12, [R.start.cx, R.start.cy - 10, 1330, 560, 2.08, 2, -3], E.io3],
      [C.toCard, [R.start.cx, R.start.cy - 10, 1330, 560, 2.1, 2, -3], E.lin],
      [C.toCard + 0.85, [CW.cx, CW.cy - 30, 960, 640, 1.52, 0, 0], E.io3],
      [C.labelsOut + 0.2, [CW.cx + 40, CW.cy - 70, 960, 650, 1.58, 0, 0], E.io2],
      [C.whip - 0.12, [CW.cx + 40, CW.cy - 70, 960, 660, 1.74, 0, 0], E.io2],
      [18.55, [B.x + B.w / 2, B.y + B.h / 2 + 20, 960, 696, 0.73, 5, -9], E.io4],
      [19.6, [B.x + B.w / 2, B.y + B.h / 2 + 20, 960, 694, 0.745, 4.5, -8], E.lin],
      [C.pause - 0.05, [B0.tl.cx, B0.tl.cy - 60, 960, 690, 1.46, 3, -3], E.io3],
      [C.toDock, [B0.tl.cx + 30, B0.tl.cy - 60, 960, 690, 1.48, 3, -3], E.lin],
      [C.origOff - 0.05, [(B1.ch0.cx + B1.vol.cx) / 2 + 60, (B1.ch0.cy + B1.duck.cy) / 2, 960, 690, 1.62, 3, -3], E.io3],
      [C.toLaptop - 0.1, [(B1.ch0.cx + B1.vol.cx) / 2 + 80, (B1.ch0.cy + B1.duck.cy) / 2, 960, 690, 1.66, 3, -3], E.lin],
      [24.6, [B1.dock.cx + 20, B1.dock.cy + 200, 960, 700, 0.42, 14, -10], E.in3],
    ];
    const camAt = (t) => {
      const c = kf(t, CAM).slice();
      // hand-held breathing
      c[5] += noise(t * 0.45 + 3) * 0.5; c[6] += noise(t * 0.4 + 9) * 0.7;
      c[2] += noise(t * 0.5 + 1) * 3; c[3] += noise(t * 0.5 + 5) * 2.5;
      // punch-in on the flip and on the Start click
      const punch = (a) => (t > a ? Math.exp(-(t - a) * 7) * Math.sin(Math.min(1, (t - a) * 9) * Math.PI / 2) : 0);
      c[4] *= 1 + 0.022 * punch(C.flip) + 0.018 * punch(C.startClick);
      c[2] = MX(c[2]); c[6] = MR(c[6]);
      return c;
    };
    const applyCam = (c) => {
      const [fx, fy, sx, sy, s, rx, ry] = c;
      rig.style.left = (sx - fx) + 'px'; rig.style.top = (sy - fy) + 'px';
      rig.style.transformOrigin = `${fx}px ${fy}px`;
      rig.style.transform = `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${s.toFixed(4)})`;
    };
    // screen position of a world point (ignores the small rotation; good enough for velocity + overlays)
    const w2s = (c, x, y) => [c[2] + (x - c[0]) * c[4], c[3] + (y - c[1]) * c[4]];

    /* =============================================================== cursor path (world space) */
    const P_A = [
      [6.9, ICON.x + 260, ICON.y + 430], [7.42, ICON.x + 2, ICON.y + 2, E.io3], [7.62, ICON.x + 2, ICON.y + 2],
      [8.42, R.sel.cx + 30, R.sel.cy + 2, E.io3], [8.62, R.sel.cx + 30, R.sel.cy + 2],
    ];
    const pickPos = rowWorld(iTarget, scroll1);
    P_A.push([9.1, pickPos.x + 70, pickPos.y + 40, E.io3], [9.42, pickPos.x, pickPos.y, E.io3], [9.62, pickPos.x, pickPos.y]);
    P_A.push([C.modeClick - 0.08, R.low.cx + 4, R.low.cy + 2, E.io3], [C.modeClick + 0.12, R.low.cx + 4, R.low.cy + 2], [C.startClick - 0.09, R.start.cx - 40, R.start.cy + 4, E.io3], [C.startClick + 0.15, R.start.cx - 40, R.start.cy + 4]);
    // then to the card's grip (card position is known in world space) and the resize corner
    const gripW = { x: PLAYER.x + card0.x + CARDW / 2, y: PLAYER.y + PLAYER.h - card0.bottom - CARDH + 9 };
    const DRAG = { dx: 60, dy: -84 };
    const RESIZE = { dw: 150 };
    P_A.push([C.grabDown - 0.45, gripW.x + 2, gripW.y + 3, E.io3], [C.grabDown, gripW.x + 2, gripW.y + 3], [C.grabUp, gripW.x + 2 + DRAG.dx, gripW.y + 3 + DRAG.dy, E.io3], [C.grabUp + 0.12, gripW.x + 2 + DRAG.dx, gripW.y + 3 + DRAG.dy]);
    const cornerAt = (dw) => ({ x: PLAYER.x + card0.x + DRAG.dx + CARDW + dw - 9, y: PLAYER.y + PLAYER.h - card0.bottom + DRAG.dy - 9 });
    const c0 = cornerAt(0);
    P_A.push([C.resizeDown - 0.12, c0.x - 4, c0.y, E.io3], [C.resizeDown, c0.x - 4, c0.y], [C.resizeUp, c0.x - 4 + RESIZE.dw, c0.y, E.io3], [C.resizeUp + 0.15, c0.x - 4 + RESIZE.dw, c0.y], [C.resizeUp + 0.7, c0.x + 300, c0.y + 260, E.io3]);
    const P_B = [
      [C.h5 + 0.5, B0.play.cx + 380, B0.play.cy + 260], [C.pause - 0.1, B0.play.cx + 2, B0.play.cy + 2, E.io3], [C.pause + 0.05, B0.play.cx + 2, B0.play.cy + 2],
      [C.seekDown - 0.04, B0.seek.x + B0.seek.w * (100 / 161), B0.seek.cy + 1, E.io3], [C.seekDown, B0.seek.x + B0.seek.w * (100 / 161), B0.seek.cy + 1],
      [C.seekUp, B0.seek.x + B0.seek.w * (88 / 161), B0.seek.cy + 1, E.io3], [C.play - 0.06, B0.play.cx + 2, B0.play.cy + 2, E.io3], [C.play + 0.05, B0.play.cx + 2, B0.play.cy + 2],
    ];
    const ch0c = { x: B1.ch0.x + 34, y: B1.ch0.cy };
    const volA = { x: B1.vol.x + B1.vol.w * (1 / 1.5), y: B1.vol.cy };
    const volB = { x: B1.vol.x + B1.vol.w * (0.25 / 1.5), y: B1.vol.cy };
    P_B.push([C.origOff - 0.1, ch0c.x, ch0c.y, E.io3], [C.origOff, ch0c.x, ch0c.y], [C.origOn, ch0c.x, ch0c.y], [C.volDown - 0.06, volA.x, volA.y, E.io3], [C.volDown, volA.x, volA.y], [C.volUp, volB.x, volB.y, E.io3], [C.duck - 0.08, B1.duck.cx, B1.duck.cy, E.io3], [C.duck + 0.05, B1.duck.cx, B1.duck.cy], [C.toLaptop + 0.2, B1.duck.cx + 200, B1.duck.cy + 200]);
    function cpath(t, Pth) {
      if (t <= Pth[0][0]) return [Pth[0][1], Pth[0][2]];
      for (let i = 1; i < Pth.length; i++) {
        const b = Pth[i];
        if (t <= b[0]) {
          const a = Pth[i - 1]; const e = (b[3] || E.io3)(clamp((t - a[0]) / (b[0] - a[0] || 1e-9)));
          let x = lerp(a[1], b[1], e), y = lerp(a[2], b[2], e);
          const dx = b[1] - a[1], dy = b[2] - a[2], d = Math.hypot(dx, dy), arc = 0.08 * d * Math.sin(Math.PI * e);
          if (d > 1) { x += (-dy / d) * arc; y += (dx / d) * arc; }
          return [x, y];
        }
      }
      const l = Pth[Pth.length - 1]; return [l[1], l[2]];
    }
    function drawCursor(cur, rip, t, Pth, clicks, drags, vis, k) {
      const [x, y] = cpath(t, Pth);
      let pr = 0;
      for (const c of clicks) pr = Math.max(pr, t < c ? E.out3(seg(t, c - 0.09, c)) : 1 - E.out3(seg(t, c, c + 0.15)));
      for (const [a, b] of drags) pr = Math.max(pr, Math.min(E.out3(seg(t, a - 0.09, a)), 1 - E.out3(seg(t, b, b + 0.15))));
      place(cur, { x: x - 4, y: y - 2, s: k * (1 - 0.18 * pr), o: vis });
      let lc = -9; for (const c of clicks.concat(drags.map((d) => d[0]))) if (c <= t && c > lc) lc = c;
      const rp = seg(t, lc, lc + 0.5);
      if (rp < 1 && vis > 0.01) { const [rx, ry] = cpath(lc, Pth); place(rip, { x: rx, y: ry, s: k * (0.25 + 0.95 * E.out3(rp)), o: (1 - rp) * 0.85 * vis }); } else place(rip, { o: 0 });
      return [x, y];
    }

    /* =============================================================== per-frame pieces */
    const kb = (t) => ({ s: 1.06 + 0.05 * (t / 42), x: -18 * Math.sin(t * 0.05), y: -10 * (t / 42) }); // ken burns of the "video"
    function vidTransform(img, t, extra = 1) { const k = kb(t); img.style.transform = `translate(${k.x.toFixed(2)}px,${k.y.toFixed(2)}px) scale(${(k.s * extra).toFixed(4)})`; }
    // card text: fill words and reveal them against a voice clip
    let cardKey = '';
    function setCardText(key, srcToks, trToks, trLang) {
      if (key === cardKey) return;
      cardKey = key;
      cardSrc.innerHTML = ''; cardTr.innerHTML = '';
      srcToks.forEach((k, i) => { const s = el('span', 'w', null, cardSrc); s.textContent = k.w; if (k.space && i < srcToks.length - 1) cardSrc.appendChild(document.createTextNode(' ')); });
      trToks.forEach((k, i) => { const s = el('span', 'w', null, cardTr); s.textContent = k.w; if (k.space && i < trToks.length - 1) cardTr.appendChild(document.createTextNode(' ')); });
      cardTr.lang = V.htmlLang(trLang);
      cardTr.dir = ['fa', 'ar'].includes(trLang) ? 'rtl' : 'ltr';
      cardSrc.dir = 'ltr';
      cardTr.classList.toggle('jp', trLang === 'ja'); cardTr.classList.toggle('kr', trLang === 'ko');
      cardTr.style.fontFamily = { fa: 'var(--fa)', ar: 'var(--fa)', hi: 'var(--sans),var(--deva)', zh: 'var(--sans),var(--sc)', 'zh-Hans': 'var(--sans),var(--sc)', ja: 'var(--jp)', ko: 'var(--kr)' }[trLang] || 'var(--fa),var(--sans)';
    }
    function revealWords(spans, t, t0, dur, inDur = 0.22) {
      spans = [...spans];
      const times = V.wordTimes([...spans].map((s) => ({ w: s.textContent })), t0, dur);
      spans.forEach((s, i) => { const p = seg(t, times[i] - 0.04, times[i] - 0.04 + inDur); s.style.opacity = E.out2(p).toFixed(3); s.style.transform = `translateY(${((1 - E.outExpo(p)) * 6).toFixed(2)}px)`; });
    }
    const montage = LINES.montage.filter(([code]) => code !== TARGET && code !== LANG && code !== SRC).slice(0, TL.montage.length);

    function sceneA(t, c) {
      const on = t < 18.75;
      BA.root.style.display = on ? 'block' : 'none'; popWrap.style.display = dd.style.display = on ? 'block' : 'none';
      if (!on) return;
      vidTransform(vidA, t);
      $('#sweepA').style.transform = `translateX(${(((t * 0.06) % 1) * 2600 - 1300).toFixed(1)}px)`;
      $('#vlineA').style.width = (1200 * (0.31 + t / 400)).toFixed(1) + 'px';
      // ----- card content per sentence
      let mode = 'none', srcT = S1.src, trT = S1.tr, trL = LANG, key = 's1';
      const dubEnd1 = C.vo_dub1 + vdur.dub1;
      const s2a = C.vo_src2 - 0.1;
      if (t < dubEnd1 + 0.9) mode = 's1';
      else if (t >= s2a) mode = 's2';
      if (mode === 's2') { srcT = S2.src; trT = S2.tr; key = 's2'; }
      // montage: the translation cycles through languages
      let mi = -1;
      if (t >= C.langs && t < C.land) { for (let i = 0; i < TL.montage.length; i++) if (t >= TL.montage[i]) mi = i; }
      if (mi >= 0) { const m = montage[mi % montage.length]; trT = tok(m[2], hostLang(m[0])); trL = m[0] === 'zh-Hans' ? 'zh' : hostLang(m[0]); key = 'm' + mi; }
      setCardText(key, srcT, trT, trL);
      const cardVis = mode === 's1' ? fade(t, C.vo_src1 - 0.1, C.vo_src1 + 0.12, dubEnd1 + 0.4, dubEnd1 + 0.9) : mode === 's2' ? fade(t, s2a, s2a + 0.25, 30, 31) : 0;
      // flip state: 0 = source only (big), 1 = dual
      const flipT = mode === 's1' ? C.flip : C.vo_dub2 - 0.05;
      const fp = E.io3(seg(t, flipT, flipT + 0.42));
      const size = 30;
      cardSrc.style.fontSize = (lerp(size, size * 0.68, fp)).toFixed(2) + 'px';
      cardSrc.style.fontWeight = Math.round(lerp(650, 500, fp));
      cardSrc.style.color = `rgba(${Math.round(lerp(255, 226, fp))},${Math.round(lerp(255, 232, fp))},${Math.round(lerp(255, 240, fp))},${lerp(1, 0.72, fp).toFixed(3)})`;
      cardTr.style.display = fp > 0.001 ? 'block' : 'none';
      cardTr.style.fontSize = size + 'px';
      // word reveals
      const srcSpans = cardSrc.children, trSpans = cardTr.children;
      if (mode === 's1') { revealWords(srcSpans, t, C.vo_src1, vdur.src1); revealWords(trSpans, t, C.vo_dub1 - 0.05, vdur.dub1); }
      else if (mode === 's2') {
        revealWords(srcSpans, t, C.vo_src2, vdur.src2);
        if (mi >= 0 || t >= C.land) [...trSpans].forEach((s) => { s.style.opacity = 1; s.style.transform = 'none'; });
        else revealWords(trSpans, t, C.vo_dub2 - 0.05, vdur.dub2);
      }
      // montage flash per language change
      const lastM = mi >= 0 ? TL.montage[mi] : t >= C.land ? C.land : -9;
      const mflash = t >= lastM ? Math.exp(-(t - lastM) * 9) : 0;
      if (mi >= 0 || (t >= C.land && t < C.land + 0.4)) [...trSpans].forEach((s) => { s.style.transform = `translateY(${(mflash * 7).toFixed(2)}px)`; s.style.opacity = (1 - mflash * 0.5).toFixed(3); });
      // geometry: drag + resize (card anchored by its bottom edge inside the player)
      const dg = E.io3(seg(t, C.grabDown, C.grabUp));
      const rs = E.io3(seg(t, C.resizeDown, C.resizeUp));
      const wpx = CARDW + RESIZE.dw * rs;
      const left = card0.x + DRAG.dx * dg;
      const bottom = card0.bottom - DRAG.dy * dg;
      css(card, { width: wpx.toFixed(1) + 'px', left: left.toFixed(1) + 'px', bottom: bottom.toFixed(1) + 'px', top: 'auto', opacity: cardVis.toFixed(3), visibility: cardVis > 0.003 ? 'visible' : 'hidden' });
      const grab = Math.min(E.out3(seg(t, C.grabDown - 0.08, C.grabDown + 0.05)), 1 - E.out3(seg(t, C.grabUp, C.grabUp + 0.2)));
      card.style.transform = `scale(${(1 + 0.012 * grab).toFixed(4)})`;
      card.style.boxShadow = `0 ${18 + 16 * grab}px ${60 + 30 * grab}px rgba(0,0,0,${0.38 + 0.2 * grab}),inset 0 1px 0 rgba(255,255,255,.14)`;
      // fake backdrop (the same frame of video, blurred) aligned under the card
      const ch = card.offsetHeight;
      const ctop = PLAYER.h - bottom - ch;
      const k = kb(t);
      css(cardFrost, { width: PLAYER.w + 'px', height: PLAYER.h + 'px', left: (-left).toFixed(1) + 'px', top: (-ctop).toFixed(1) + 'px', transform: `translate(${k.x.toFixed(2)}px,${k.y.toFixed(2)}px) scale(${k.s.toFixed(4)})` });
      // scan light on the flips + glow
      const scanP = seg(t, flipT - 0.05, flipT + 0.5);
      cardScan.style.opacity = scanP > 0 && scanP < 1 ? (Math.sin(Math.PI * scanP)).toFixed(3) : 0;
      cardScan.style.transform = `translateX(${(RTL && false ? 1 - scanP : scanP) * (wpx + 300) - 260}px)`;
      const gl = t > flipT ? Math.exp(-(t - flipT) * 3.2) : 0;
      css(cardGlow, { left: (left - 3) + 'px', top: (ctop - 3) + 'px', width: (wpx + 6) + 'px', height: (ch + 6) + 'px', opacity: (gl * cardVis * 0.9).toFixed(3) });
      // language pill (hook only)
      const pv = fade(t, C.flip - 0.05, C.flip + 0.3, 3.85, 4.2);
      place(pill, { x: left, y: ctop - 58 + (1 - E.outBack(seg(t, C.flip - 0.05, C.flip + 0.45))) * 14, o: pv * cardVis, s: 1 });
      // ----- popup
      popupState(t);
      const po = seg(t, C.iconClick + 0.02, C.iconClick + 0.4);
      const pc = seg(t, C.popClose, C.popClose + 0.3);
      const pvis = (t > C.iconClick ? E.out3(seg(t, C.iconClick + 0.02, C.iconClick + 0.16)) : 0) * (1 - E.in2(pc));
      place(popWrap, { x: POP.x, y: POP.y + (1 - E.outExpo(po)) * -14 - pc * 10, s: lerp(0.92, 1, E.outBackS(po)) * (1 - pc * 0.04), o: pvis });
      popWrap.style.left = '0px'; popWrap.style.top = '0px';
      BA.avo.style.background = `rgba(143,124,255,${(0.22 * fade(t, 7.0, 7.4, C.popClose, C.popClose + 0.3)).toFixed(3)})`;
      BA.live.style.opacity = (t < 4.3 ? 1 : clamp(seg(t, C.startClick, C.startClick + 0.2))).toFixed(3);
      // dropdown
      const ddo = Math.min(E.out3(seg(t, C.listOpen, C.listOpen + 0.14)), 1 - E.in2(seg(t, C.pick + 0.04, C.pick + 0.16)));
      place(dd, { x: 0, y: (1 - ddo) * -8, sy: 0.9 + 0.1 * ddo, sx: 1, o: ddo });
      css(dd, { left: DD.x + 'px', top: DD.y + 'px' });
      const sc = lerp(scroll0, scroll1, E.io3(seg(t, C.listOpen + 0.12, 9.05)));
      ddRows.style.transform = `translateY(${(-sc * ROWH).toFixed(2)}px)`;
      const [cx, cy] = cpath(t, P_A);
      let hi = Math.round((cy - DD.y - 5 - ROWH / 2) / ROWH + sc);
      if (t < 9.0) hi = iInit;
      hi = clamp(hi, 0, LIST.length - 1);
      ddHi.style.transform = `translateY(${((hi - sc) * ROWH).toFixed(2)}px)`;
      // sparks on Start
      sparks.forEach((s, k) => { const p = seg(t, C.startClick, C.startClick + 0.7); const a = (k / sparks.length) * Math.PI * 2 + 0.3; const r = 18 + 170 * E.out3(p); place(s, { x: R.start.cx + Math.cos(a) * r * 1.25, y: R.start.cy + Math.sin(a) * r * 0.62, s: 1.5 - p, o: p > 0 && p < 1 ? 1 - p : 0 }); });
      const btn = pop.q('#toggleButton');
      const press = Math.min(E.out3(seg(t, C.startClick - 0.08, C.startClick)), 1 - E.out3(seg(t, C.startClick, C.startClick + 0.18)));
      btn.style.transform = `scale(${(1 - 0.03 * press).toFixed(4)})`;
      btn.style.boxShadow = t > C.startClick ? `0 0 ${(40 * Math.exp(-(t - C.startClick) * 3)).toFixed(1)}px rgba(84,223,218,.8)` : '';
      // page dimming (focus on the popup / on the video)
      const dimPop = fade(t, 6.6, 7.4, C.popClose, C.popClose + 0.5) * 0.55;
      $('#dimA').style.opacity = dimPop.toFixed(3);
      // cursor
      const k2 = 1 / c[4];
      const visA = Math.max(fade(t, 6.95, 7.2, C.popClose, C.popClose + 0.2), fade(t, C.grabDown - 0.7, C.grabDown - 0.4, C.resizeUp + 0.4, C.resizeUp + 0.7));
      const pathT = t < 11.5 ? t : t;
      drawCursor(cursor, ripple, pathT, P_A, [C.iconClick, C.fieldClick, C.pick, C.modeClick, C.startClick], [[C.grabDown, C.grabUp], [C.resizeDown, C.resizeUp]], visA, k2 * 1.05);
    }

    function sceneB(t, c) {
      const on = t > 17.6 && t < 24.9;
      BB.root.style.display = on ? 'block' : 'none';
      if (!on) return null;
      const scrollY = SCROLL_DOCK * E.io3(seg(t, C.toDock, C.toDock + 0.55));
      pl.win.scrollTo(0, scrollY);
      // playback state: playing 18.5 -> pause -> seek -> play
      const paused = t >= C.pause && t < C.play;
      const vt = t < C.pause ? 100 + (t - 18) : t < C.seekDown ? 100 + (C.pause - 18) : t < C.play ? lerp(100 + (C.pause - 18), 88, E.io3(seg(t, C.seekDown, C.seekUp))) : 88 + (t - C.play);
      const q = pl.q;
      q('#seekRange').value = vt;
      const mm = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      q('#timeLabel').textContent = `${mm(vt)} / ${mm(161 + Math.max(0, t - 18))}`;
      q('#playButton').textContent = paused ? '▶' : '❚❚';
      q('#liveBadge span').textContent = paused ? dPl.paused : dPl.playing;
      q('#liveBadge').classList.toggle('playing', !paused);
      const tip = q('#seekTip');
      const sk = Math.min(E.out3(seg(t, C.seekDown - 0.05, C.seekDown + 0.1)), 1 - E.out3(seg(t, C.seekUp, C.seekUp + 0.2)));
      tip.style.opacity = sk.toFixed(3);
      tip.textContent = mm(vt);
      const tr = q('#seekRange').getBoundingClientRect(), tlr = q('.timeline').getBoundingClientRect();
      tip.style.left = ((tr.left - tlr.left) + tr.width * (vt / 161)).toFixed(1) + 'px';
      vidTransform(plVid, vt * 0.35, 1);
      // captions follow the playhead: the sentence starts at 100s (first play) and at 88s after the seek
      const capOn = !(t >= C.seekDown && t < C.play) || vt > 99;
      q('#captionStack').style.opacity = capOn ? 1 : 0;
      // output mix interactions
      const origOn = !(t >= C.origOff && t < C.origOn);
      q('#originalAudioEnabled').checked = origOn;
      const vol = lerp(1, 0.25, E.io3(seg(t, C.volDown, C.volUp)));
      q('#originalVolume').value = vol;
      q('#originalVolumeValue').textContent = `${Math.round(vol * 100)}%`;
      q('#originalValue').textContent = `${Math.round(vol * 100)}%`;
      q('#autoDuck').checked = t >= C.duck;
      // cursor
      const k2 = 1 / c[4];
      const vis = fade(t, C.h5 + 0.45, C.h5 + 0.8, C.toLaptop - 0.05, C.toLaptop + 0.2);
      drawCursor(cursor, ripple, t, P_B, [C.pause, C.play, C.origOff, C.origOn, C.duck], [[C.seekDown, C.seekUp], [C.volDown, C.volUp]], vis, k2 * 1.05);
      return { scrollY };
    }

    /* laptop camera + app states */
    const LAP = { s0: 0.62 };
    function sceneLap(t) {
      const on = t > 23.7 && t < 31.2;
      $('#lapLayer').style.visibility = 'visible'; $('#lapLayer').style.display = on ? 'block' : 'none';
      if (!on) return;
      const rise = E.outExpo(seg(t, 23.85, 25.0));
      const lidA = -86 * (1 - E.io3(seg(t, C.lidOpen - 0.25, C.lidOpen + 0.75)));
      lid.style.transform = `rotateX(${lidA.toFixed(2)}deg)`;
      // camera keys: [fx, fy (laptop coords), sx, sy, s, rx, ry]. rx stays negative: we always look down on the laptop, never
      // up at the underside of its base (a positive rx shows the base from below, keyboard and all).
      app.win.scrollTo(0, Math.round(lerp(APPSCROLL0, APPSCROLL1, E.io3(seg(t, C.process + 0.15, C.process + 0.7)))));
      const dz = arect('#dropZone');
      const LK = [
        [23.85, [700, 640, 1290, 1500, 0.4, -14, -20]],
        [25.0, [700, 470, 1290, 560, 0.66, -9, -12], E.outExpo],
        [25.6, [700, 462, 1292, 556, 0.67, -8, -11], E.lin],
        [C.drop - 0.05, [30 + DZ0.cx + 120, 28 + DZ0.cy + 40, 1290, 470, 1.04, -6, -8], E.io3],
        [C.process - 0.05, [30 + DZ0.cx + 120, 28 + DZ0.cy + 60, 1290, 470, 1.05, -6, -8], E.lin],
        [C.process + 0.65, [30 + BTN0.cx + 120, 28 + BTN0.cy - 170 + 60, 1290, 520, 1.1, -5, -7], E.io3],
        [C.ready - 0.45, [30 + BTN0.cx + 120, 28 + BTN0.cy - 170 + 60, 1290, 520, 1.12, -5, -7], E.lin],
        [C.ready + 0.1, [30 + AW.x + AW.w * 0.56, 28 + AW.y + AW.h * 0.5, 1290, 560, 0.74, -8, -10], E.io3],
        [30.1, [700, 470, 1100, 470, 0.52, -12, -8], E.in3],
      ];
      const k = kf(t, LK).slice();
      k[2] = MXL(k[2]); k[6] = MRL(k[6]);
      const [fx, fy, sx, sy, s, rx, ry] = k;
      lapCam.style.transformOrigin = `${fx}px ${fy}px`;
      lapCam.style.left = (sx - fx) + 'px'; lapCam.style.top = (sy - fy) + 'px';
      lapCam.style.transform = `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${s.toFixed(4)})`;
      const lo = fade(t, 23.85, 24.3, 29.95, 30.25);
      $('#lapLayer').style.opacity = lo.toFixed(3);
      const dimZ = fade(t, C.zip + 0.1, C.fan + 0.1, 40, 41);
      lapDim.style.opacity = (dimZ * 0.62).toFixed(3);
      { const p0 = kf(t - 1 / 120, LK), p1 = kf(t + 1 / 120, LK); const v = Math.hypot((p1[0] - p0[0]) * k[4], (p1[1] - p0[1]) * k[4]) + Math.abs(p1[4] - p0[4]) * 400;
        const bl = Math.min(26, Math.max(0, v - 22) * 0.4); if (bl > 0.6) { $('#mblurLG').setAttribute('stdDeviation', `${bl.toFixed(2)} ${(bl * 0.6).toFixed(2)}`); $('#lapLayer').style.filter = 'url(#mblurL)'; } else $('#lapLayer').style.filter = ''; }
      void rise;
      // the app: drag over -> file selected -> job stages -> ready
      const q = app.q;
      const over = t >= C.drop - 0.3 && t < C.drop;
      q('#dropZone').classList.toggle('dragging', over);
      const selected = t >= C.drop;
      q('#selectedFile').textContent = selected ? `${dApp.fileSelected}: coastlines.mp4 · 248.6 MB` : dApp.videoFormats;
      q('#processMediaButton').disabled = !selected;
      const st = TL.stages;
      const keys = ['stageExtracting', 'stageTranscribing', 'stageTranslating', 'stageNarrating', 'stageAligning'];
      let si = -1; for (let i = 0; i < st.length; i++) if (t >= st[i]) si = i;
      const ready = t >= C.ready;
      q('#jobPanel').hidden = si < 0 && !ready;
      if (si >= 0 || ready) {
        q('#jobFile').textContent = 'coastlines.mp4';
        q('#jobStage').textContent = ready ? dApp.stageReady : dApp[keys[si]];
        const pr = ready ? 1 : kf(t, [[st[0], 0.04], [st[1], 0.18], [st[2], 0.42], [st[3], 0.66], [st[4], 0.9], [C.ready, 1]]);
        q('#jobPercent').textContent = `${Math.round(pr * 100)}%`;
        q('#jobProgress').value = pr;
        q('#jobMessage').textContent = dApp.processingWarning;
        q('#cancelJobButton').hidden = ready;
      }
      q('#playerCard').classList.toggle('empty', !ready);
      q('#playerEmpty').hidden = ready;
      q('#playerReady').hidden = !ready;
      // cursor + dragged file (laptop screen coordinates)
      const pBtn = arect('#processMediaButton');
      const zc = arect('#downloadMediaZip');
      const PL = [[C.dragDown - 0.5, FILE0.x + 140, FILE0.y + 200], [C.dragDown - 0.05, FILE0.x + 46, FILE0.y + 50, E.io3], [C.dragDown, FILE0.x + 46, FILE0.y + 50], [C.drop, dz.cx, dz.cy, E.io3], [C.drop + 0.15, dz.cx, dz.cy], [C.process - 0.06, pBtn.cx, pBtn.cy, E.io3], [C.process + 0.1, pBtn.cx, pBtn.cy], [C.zip - 0.08, zc.cx, zc.cy, E.io3], [C.zip + 0.2, zc.cx, zc.cy]];
      const clickProcess = C.process;
      const [x, y] = drawCursor(lCursor, lRipple, t, PL, [clickProcess, C.zip], [[C.dragDown, C.drop]], fade(t, C.dragDown - 0.55, C.dragDown - 0.3, C.fan + 0.1, C.fan + 0.4), 1.35 / s);
      const dragging = t >= C.dragDown && t < C.drop + 0.2;
      const dp = seg(t, C.drop, C.drop + 0.2);
      place(ghost, { x: x - 46, y: y - 52, r: 8 * Math.min(1, (t - C.dragDown) * 5), s: 1.05 - 0.6 * E.in2(dp), o: dragging ? (t < C.drop ? 0.92 : 1 - dp) : 0 });
      deskFile.style.opacity = dragging ? 0.35 : 1;
      if (t >= clickProcess) q('#processMediaButton').style.transform = `scale(${(1 - 0.03 * Math.min(1, Math.exp(-(t - clickProcess) * 8))).toFixed(4)})`;
      // video in the ready player
      if (ready) vidTransform(q('#playerReady .xvid img'), t, 1);
    }

    function zipFan(t) {
      // all-outputs.zip pops from the ZIP chip and fans out into four files (screen space)
      const zp = E.outBack(seg(t, C.zip, C.zip + 0.4));
      const out = E.in2(seg(t, C.h7out - 0.05, C.h7out + 0.35));
      const zx = MXL(1250), zy = 600;
      place(zipCard, { x: zx - 115, y: zy + 130 - 125 + (1 - clamp(zp)) * 60, s: 0.55 + 0.6 * zp, o: clamp(seg(t, C.zip, C.zip + 0.12)) * (1 - out) * (t < C.fan + 0.05 ? 1 : 1 - seg(t, C.fan + 0.05, C.fan + 0.3)) });
      const FAN = [-30, -10, 10, 30];
      files.forEach((f, i) => {
        const a0 = C.fan + i * 0.07; const p = E.outBack(seg(t, a0, a0 + 0.5)); const r = (FAN[i] * Math.PI) / 180;
        const fx = zx + 640 * Math.sin(r), fy = zy + 540 - 600 * Math.cos(r);
        place(f, { x: lerp(zx, fx, p) - 115, y: lerp(zy + 130, fy, p) - 125 + Math.sin(t * 2 + i) * 3, r: FAN[i] * 0.5 * p, s: 0.4 + 0.66 * p, o: clamp(seg(t, a0, a0 + 0.1)) * (1 - out) });
      });
    }

    /* =============================================================== HUD per frame */
    let lastSpot = '';
    function hudFrame(t, c) {
      hAnim(H1, t, C.h1, C.h1out);
      hAnim(H2, t, C.h2, C.h2out);
      hAnim(H3, t, C.h3, C.h3out);
      hAnim(H5, t, C.h5, C.h5out);
      hAnim(H6, t, C.h6, C.h6out);
      hAnim(H7, t, C.h7, C.h7out);
      // OS badges under H7
      const ob = fade(t, C.h7 + 0.5, C.h7 + 0.9, C.h7out, C.h7out + 0.35);
      css(osRow, { top: (H7.b.offsetTop + H7.b.offsetHeight + 40) + 'px' });
      place(osRow, { y: (1 - E.outExpo(seg(t, C.h7 + 0.5, C.h7 + 1.1))) * 20, o: ob });
      // 79
      const v4 = t > C.langs - 0.1 && t < C.h4out + 0.5;
      H4.b.style.display = v4 ? 'flex' : 'none';
      if (v4) {
        const n = Math.round(lerp(1, 79, E.out3(seg(t, C.langs, C.land))));
        H4.n.textContent = SCR === 'arab' && LANG === 'fa' ? String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]) : String(n);
        const p = E.outExpo(seg(t, C.langs - 0.05, C.langs + 0.6));
        const q = E.in2(seg(t, C.h4out, C.h4out + 0.35));
        const land = t > C.land ? Math.exp(-(t - C.land) * 6) : 0;
        place(H4.b, { y: (1 - p) * 30 - q * 30, o: clamp(p * 1.5) * (1 - q), blur: (1 - p) * 10 + q * 10, s: 1 + 0.04 * land });
      }
      // scrims behind top headlines / side headlines
      const top = Math.max(fade(t, C.h3 - 0.2, C.h3 + 0.3, C.h4out, C.h4out + 0.4), fade(t, C.h5 - 0.2, C.h5 + 0.3, C.h6out, C.h6out + 0.4));
      scrimTop.style.opacity = top.toFixed(3);
      const side = Math.max(fade(t, C.h2 - 0.3, C.h2 + 0.3, C.h2out, C.h2out + 0.4) * 0.9);
      scrimSide.style.opacity = side.toFixed(3);
      // card labels (screen space, from real layout)
      const lv = Math.max(fade(t, C.labels, C.labels + 0.3, C.labelsOut, C.labelsOut + 0.3), fade(t, C.montage0, C.montage0 + 0.2, C.h4out, C.h4out + 0.3)) * (card.style.visibility === 'visible' ? 1 : 0);
      calls.style.display = lv > 0.003 ? 'block' : 'none';
      if (lv > 0.003) {
        const sr = cardSrc.getBoundingClientRect(), trr = cardTr.getBoundingClientRect(), cr = card.getBoundingClientRect();
        const lw = labO.offsetWidth, yw = labY.offsetWidth, lh = labO.offsetHeight;
        // "Original" sits above the card's top edge over the source line; "Your language" below the bottom edge
        const xO = clamp(RTL ? sr.right - lw * 0.15 - lw : sr.left + sr.width * 0.12, 40, 1880 - lw);
        const xY = clamp(RTL ? trr.left + trr.width * 0.12 : trr.right - trr.width * 0.12 - yw, 40, 1880 - yw);
        const yO = cr.top - 46 - lh, yY = cr.bottom + 46;
        const pO = E.outExpo(seg(t, C.labels, C.labels + 0.6)), pY = E.outExpo(seg(t, C.labels + 0.15, C.labels + 0.75));
        place(labO, { x: xO, y: yO - (1 - pO) * 16, o: lv });
        place(labY, { x: xY, y: yY + (1 - pY) * 16, o: lv });
        const ax = xO + lw / 2, ay = sr.top + 6, bxx = xY + yw / 2, by = trr.bottom - 6;
        $('#lnO', lineSvg).setAttribute('d', `M${ax} ${yO + lh} L${ax} ${ay - 4}`);
        $('#lnY', lineSvg).setAttribute('d', `M${bxx} ${by + 4} L${bxx} ${yY}`);
        const dO = $('#dO', lineSvg), dY = $('#dY', lineSvg);
        dO.setAttribute('cx', ax); dO.setAttribute('cy', ay); dY.setAttribute('cx', bxx); dY.setAttribute('cy', by);
        lineSvg.style.opacity = lv;
      }
      // language name in the label during the montage
      let nm = COPY.labels.yours;
      if (t >= C.montage0) { let mi = -1; for (let i = 0; i < TL.montage.length; i++) if (t >= TL.montage[i]) mi = i; nm = t >= C.land ? COPY.labels.languageName : montage[mi % montage.length][1]; }
      if (labYName.textContent !== nm) labYName.textContent = nm;
      void lastSpot; void c;
    }

    /* spotlight (focus dimming): darkens everything except an ellipse around a screen rect */
    function spotlight(t) {
      const sp = $('#spot');
      let r = null, a = 0;
      const cardOn = fade(t, C.toCard + 0.3, C.toCard + 0.9, C.whip - 0.15, C.whip + 0.05);
      if (cardOn > 0.003) { const cr = card.getBoundingClientRect(); r = cr; a = cardOn * 0.62; }
      const bOn = fade(t, C.pause - 0.15, C.pause + 0.25, C.toDock - 0.05, C.toDock + 0.15);
      if (bOn > 0.003) { const e = pl.q('.transport').getBoundingClientRect(); const f = pl.frame.getBoundingClientRect(); const sc = f.width / pl.frame.offsetWidth; r = { left: f.left + e.left * sc, top: f.top + (e.top - 40) * sc, width: e.width * sc, height: (e.height + 80) * sc }; a = bOn * 0.5; }
      const dOn = fade(t, C.toDock + 0.4, C.toDock + 0.8, C.toLaptop - 0.15, C.toLaptop + 0.1);
      if (dOn > 0.003) { const e = pl.q('.control-dock').getBoundingClientRect(); const f = pl.frame.getBoundingClientRect(); const sc = f.width / pl.frame.offsetWidth; r = { left: f.left + e.left * sc, top: f.top + e.top * sc, width: e.width * sc, height: e.height * sc }; a = dOn * 0.5; }
      if (!r || a < 0.003) { sp.style.opacity = 0; return; }
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      sp.style.opacity = 1;
      sp.style.background = `radial-gradient(ellipse ${(r.width * 0.68).toFixed(0)}px ${(r.height * 1.05 + 60).toFixed(0)}px at ${cx.toFixed(0)}px ${cy.toFixed(0)}px,rgba(3,4,10,0) 62%,rgba(3,4,10,${a.toFixed(3)}) 100%)`;
    }

    /* trust words + end card */
    function trust(t) {
      const on = t > C.free - 0.2 && t < C.end + 0.2;
      tw.forEach((e) => (e.style.display = on ? 'block' : 'none'));
      ticons.forEach((e) => (e.style.display = on ? 'flex' : 'none'));
      tsub.style.display = on ? 'block' : 'none';
      if (!on) return;
      const T0 = [C.free, C.open, C.private];
      const widths = tw.map((e) => e.offsetWidth);
      const gap = 70;
      const total = widths.reduce((a, b) => a + b, 0) + gap * 2;
      const order = RTL ? [2, 1, 0] : [0, 1, 2];
      const xs = [];
      let x = (1920 - total) / 2;
      for (const i of order) { xs[i] = x; x += widths[i] + gap; }
      const out = E.in3(seg(t, C.h8out, C.h8out + 0.3));
      tw.forEach((e, i) => {
        const p = E.outExpo(seg(t, T0[i], T0[i] + 0.55));
        place(e, { x: xs[i], y: 470 - e.offsetHeight / 2 + (1 - p) * 60 - out * 40, s: 1 + out * 0.12, o: clamp(seg(t, T0[i], T0[i] + 0.16)) * (1 - out), blur: (1 - p) * 16 + out * 16 });
        const ip = E.outBack(seg(t, T0[i] - 0.06, T0[i] + 0.4));
        place(ticons[i], { x: xs[i] + widths[i] / 2 - 46, y: 236 + (1 - clamp(ip)) * 24 - out * 40, s: 0.6 + 0.4 * ip, o: clamp(seg(t, T0[i] - 0.06, T0[i] + 0.1)) * (1 - out), blur: out * 12 });
      });
      const sp = E.outExpo(seg(t, C.private + 0.2, C.private + 0.9));
      place(tsub, { y: 600 + (1 - sp) * 18 - out * 30, o: clamp(seg(t, C.private + 0.2, C.private + 0.5)) * (1 - out) });
    }
    const LOGO_C = { x: 960, y: 380 };
    function endCard(t) {
      const on = t > C.end - 0.3;
      [logoBox, endWord, endTag, endUrl, endPlat].forEach((e) => (e.style.display = on ? 'block' : 'none')); btnRow.style.display = on ? 'flex' : 'none';
      if (!on) return;
      // logo build: every layer flies in from depth along its own direction, then the whole mark settles
      const settle = E.outExpo(seg(t, C.end, C.end + 1.1));
      const hit = t > C.chord ? Math.exp(-(t - C.chord) * 2.2) : 0;
      const drift = (t - C.end) * 0.6;
      const wordW = endWord.offsetWidth;
      const groupW = LOGOW * 0.6 + 18 + wordW;
      const mv = E.io3(seg(t, C.word - 0.05, C.word + 0.6));
      const logoS = lerp(1, 0.6, mv);
      const logoCX = lerp(960, 960 - groupW / 2 + LOGOW * 0.3, mv);
      const logoCY = lerp(470, 318, mv);
      logoEls.forEach(({ p, i }, k) => {
        const a0 = C.end + (p.c === 'navy' ? 0.0 : p.c === 'purple' ? 0.08 : 0.08) + (p.f.match(/_(\d)/) ? Number(p.f.match(/_(\d)/)[1]) * 0.045 : 0);
        const q = E.outExpo(seg(t, a0, a0 + 0.9));
        const dir = p.c === 'purple' ? -1 : p.c === 'cyan' ? 1 : 0;
        const ox = (p.x - parts.width / 2) * LOGOS, oy = (p.y - parts.height / 2) * LOGOS;
        const fx = dir * (380 + k * 30) * (1 - q), fy = (p.c === 'navy' ? 260 : 0) * (1 - q);
        place(i, { x: ox + fx, y: oy + fy, s: 1, o: clamp(seg(t, a0, a0 + 0.15)), blur: (1 - q) * 10 });
      });
      place(logoBox, { x: logoCX, y: logoCY + Math.sin(drift) * 3, s: logoS * (1 + 0.035 * hit) });
      rings.forEach((r) => {
        const t0 = Number(r.dataset.t), big = r.dataset.big === '1';
        const p = seg(t, t0, t0 + (big ? 2.2 : 1.7));
        const left = r.dataset.side === 'p';
        if (p <= 0 || p >= 1) { r.style.opacity = 0; r.style.visibility = 'hidden'; return; }
        const R0 = 120 * logoS;
        css(r, { left: (logoCX - R0) + 'px', top: (logoCY - R0) + 'px', width: 2 * R0 + 'px', height: 2 * R0 + 'px', clipPath: left ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)', borderColor: r.dataset.side === 'p' ? 'rgba(143,110,255,.9)' : 'rgba(63,249,249,.85)', borderWidth: (big ? 3 : 2) + 'px' });
        place(r, { s: 1 + E.out3(p) * (big ? 4.6 : 3.2), o: (1 - p) * (big ? 0.42 : 0.3) });
        r.style.left = (logoCX - R0) + 'px';
      });
      logoBox.style.filter = `drop-shadow(0 0 ${(18 + 30 * hit).toFixed(1)}px rgba(120,100,255,${(0.35 + 0.4 * hit).toFixed(2)}))`;
      const wp = E.outExpo(seg(t, C.word + 0.38, C.word + 1.1));
      const wordX = 960 - groupW / 2 + LOGOW * 0.6 + 18;
      endWord.style.left = '0px'; endWord.style.top = '0px';
      place(endWord, { x: wordX + (1 - wp) * 60, y: 318 - endWord.offsetHeight / 2, o: clamp(seg(t, C.word + 0.38, C.word + 0.66)), blur: (1 - wp) * 10 });
      endWord.style.letterSpacing = `${lerp(0.18, -0.035, wp)}em`;
      // tagline words
      TagW.spans.forEach((s, i) => { const a = C.tag + i * 0.07; const p = E.outExpo(seg(t, a, a + 0.8)); place(s, { y: (1 - p) * 36, o: clamp(seg(t, a, a + 0.3)), blur: (1 - p) * 10 }); });
      endTag.style.top = '452px';
      const bp = E.outBack(seg(t, C.cta, C.cta + 0.55));
      btnRow.style.top = '626px';
      place(btnRow, { y: (1 - clamp(bp)) * 40, o: clamp(seg(t, C.cta, C.cta + 0.2)), s: 0.94 + 0.06 * bp });
      shine.style.transform = `translateX(${(-140 + 760 * E.io3(seg(t, C.shine, C.shine + 0.9))).toFixed(1)}px) skewX(-20deg)`;
      const up = E.outExpo(seg(t, C.cta + 0.35, C.cta + 1.0));
      endUrl.style.top = '772px'; endPlat.style.top = '826px';
      place(endUrl, { y: (1 - up) * 14, o: up });
      place(endPlat, { y: (1 - up) * 14, o: up * 0.95 });
      const bl = E.in2(seg(t, C.fade, TL.duration));
      $('#black').style.opacity = bl.toFixed(3);
    }

    /* background */
    function background(t, c, mood) {
      const g = bg.createLinearGradient(0, 0, 0, 1080);
      g.addColorStop(0, '#04050d'); g.addColorStop(1, '#090b1d');
      bg.fillStyle = g; bg.fillRect(0, 0, 1920, 1080);
      const ox = c ? (c[2] - c[0] * c[4]) : 0, oy = c ? (c[3] - c[1] * c[4]) : 0;
      const px = (ox * 0.03) % 4000, py = (oy * 0.03) % 4000;
      const glow = (x, y, r, col, a) => { const rg = bg.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${col},${a})`); rg.addColorStop(1, `rgba(${col},0)`); bg.fillStyle = rg; bg.fillRect(0, 0, 1920, 1080); };
      glow(420 + Math.sin(t * 0.21) * 160 + px, 260 + Math.cos(t * 0.17) * 90 + py, 980, '101,42,251', 0.17 + 0.08 * mood);
      glow(1520 + Math.cos(t * 0.19) * 150 + px * 0.6, 860 + Math.sin(t * 0.23) * 80 + py * 0.6, 900, '63,249,249', 0.08 + 0.05 * mood);
      glow(960, 1180, 900, '30,40,120', 0.25);
      // dust in three depths (parallax with the camera)
      for (const d of dust) {
        const x = (((d.x + ox * d.z * 0.12 + t * 8 * d.z) % 2400) + 2400) % 2400 - 240;
        const y = (((d.y + oy * d.z * 0.12) % 1400) + 1400) % 1400 - 160;
        bg.globalAlpha = d.a * (0.55 + 0.45 * Math.sin(t * 1.3 + d.ph)) * 0.55;
        bg.fillStyle = d.z > 0.6 ? '#bfc8ff' : '#8fe9f0';
        const s = d.s * (0.6 + d.z);
        bg.fillRect(x, y, s, s);
      }
      bg.globalAlpha = 1;
    }

    /* motion blur from camera velocity (directional, in rig-local units) */
    function motionBlur(t, c) {
      const dt = 1 / 60;
      const p = camAt(t - dt * 0.5), q = camAt(t + dt * 0.5);
      // velocity of the screen centre's world point
      const wx = c[0] + (960 - c[2]) / c[4], wy = c[1] + (540 - c[3]) / c[4];
      const a = w2s(p, wx, wy), b = w2s(q, wx, wy);
      const vx = b[0] - a[0], vy = b[1] - a[1];
      const ds = Math.abs(q[4] - p[4]) / c[4] * 900; // zoom speed as an approximate radial streak
      const thr = (v) => Math.max(0, v - 22) * 0.5;
      const bx = Math.min(32, thr(Math.abs(vx) + ds * 0.05)), by = Math.min(32, thr(Math.abs(vy) + ds * 0.05));
      if (bx < 0.6 && by < 0.6) { rig.style.filter = ''; return 0; }
      $('#mblurG').setAttribute('stdDeviation', `${(bx / c[4]).toFixed(2)} ${(by / c[4]).toFixed(2)}`);
      rig.style.filter = 'url(#mblur)';
      return Math.hypot(bx, by);
    }

    /* =============================================================== frame */
    window.renderFrame = function (t) {
      const camOn = t < 24.9;
      const c = camAt(Math.min(t, 24.9));
      $('#world').style.display = camOn ? 'block' : 'none';
      if (camOn) {
        applyCam(c);
        sceneA(t, c);
        sceneB(t, c);
        motionBlur(t, c);
        const wo = 1 - E.in2(seg(t, C.toLaptop, C.toLaptop + 0.45));
        $('#world').style.opacity = wo.toFixed(3);
      }
      const mood = fade(t, 3.9, 4.6, 30, 31) * 0.6 + (t > C.end ? 0.6 : 0);
      background(t, camOn ? c : null, mood);
      sceneLap(t);
      zipFan(t);
      trust(t);
      wallFrame(t);
      endCard(t);
      hudFrame(t, c);
      spotlight(t);
      // flash on the drops
      const fl = Math.max(...[C.drop1, C.whip, C.wall, C.chord].map((a) => (t >= a ? Math.exp(-(t - a) * 5) : 0)));
      $('#flash').style.opacity = (fl * 0.32).toFixed(3);
      const f = Math.round(t * 60), h = (f * 2654435761) >>> 0;
      css($('#grain'), { backgroundImage: `url(${grainTiles[f % grainTiles.length]})`, backgroundPosition: `${h % 256}px ${(h >>> 8) % 256}px` });
    };
    // QC helper: for every visible run of word spans, consecutive words on one line must advance in the reading direction
    window.__bidiCheck = function (times) {
      const bad = [];
      for (const t of times) {
        window.renderFrame(t);
        const groups = [...document.querySelectorAll('.hb .title, .hb .sub, .endtag, .avo-card p')];
        for (const g of groups) {
          const spans = [...g.querySelectorAll('.w')].filter((x) => x.getBoundingClientRect().width > 0 && getComputedStyle(x).visibility !== 'hidden');
          const rtl = getComputedStyle(g).direction === 'rtl';
          for (let i = 1; i < spans.length; i++) {
            const a = spans[i - 1].getBoundingClientRect(), b = spans[i].getBoundingClientRect();
            if (Math.abs(a.top - b.top) > a.height * 0.5) continue; // new line
            const ok = rtl ? b.right <= a.left + 2 : b.left >= a.right - 2;
            if (!ok) { bad.push({ t, text: g.textContent.slice(0, 40), i }); break; }
          }
        }
      }
      return bad;
    };
    // QC helper: every visible headline / label / button must sit inside the 24 px safe area
    window.__fitCheck = function (times) {
      const bad = [];
      for (const t of times) {
        window.renderFrame(t);
        for (const e of document.querySelectorAll('.hb .w, .endtag .w, .tword, .tsub, .btn, .endurl, .clab, .lpill, .osb, .num79')) {
          let r = e.getBoundingClientRect();
          if (r.width >= 1900) { const rg = document.createRange(); rg.selectNodeContents(e); r = rg.getBoundingClientRect(); }
          if (!r.width || getComputedStyle(e).visibility === 'hidden' || +getComputedStyle(e).opacity === 0) continue;
          let p = e, hidden = false;
          while (p && p !== document.body) { const cs = getComputedStyle(p); if (cs.display === 'none' || +cs.opacity < 0.05) { hidden = true; break; } p = p.parentElement; }
          if (hidden) continue;
          if (r.left < 24 || r.right > 1896 || r.top < 8 || r.bottom > 1072) bad.push({ t, cls: e.className, text: e.textContent.slice(0, 30), l: Math.round(r.left), r: Math.round(r.right) });
        }
      }
      return bad;
    };
    window.renderFrame(0);
    window.__ready = true;
  } catch (e) {
    window.__err = String((e && e.stack) || e);
    console.error(window.__err);
  }
})();
