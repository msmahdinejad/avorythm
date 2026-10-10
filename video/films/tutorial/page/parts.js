/* Avorythm tutorial — reusable set pieces (nominal pixel sizes; scenes place them inside zoomed worlds). */
(function () {
  const { h, esc } = T;
  const P = (window.P = {});
  const LOGO = '/repo/assets/branding/avorythm-logo.png';
  P.LOGO = LOGO;

  /* ------------------------------------------------------------- icons (Lucide-style strokes) */
  const I = {
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    fwd: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    reload: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    puzzle: '<path d="M10 3a2 2 0 0 1 4 0v2h4a1 1 0 0 1 1 1v4h-2a2 2 0 0 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 0 0-4 0v2H6a1 1 0 0 1-1-1v-4h2a2 2 0 0 0 0-4H5V6a1 1 0 0 1 1-1h4z" fill="currentColor" stroke="none"/>',
    pin: '<path d="M12 17v5M9 10.8V6h6v4.8l2 2.2v2H7v-2z"/>',
    pinf: '<path d="M12 17v5" /><path d="M9 10.8V6h6v4.8l2 2.2v2H7v-2z" fill="currentColor"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L20 3M16 7l3 3M14 9l2 2"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
    code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    bag: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    star: '<path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/>',
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.3l4.8 2.7-4.8 2.7z" fill="currentColor"/>',
    wave: '<path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10.5v3"/>',
    cc: '<rect x="2.5" y="5" width="19" height="14" rx="3.5"/><path d="M6.5 11h4M12.5 11h5M6.5 15h7M15.5 15h2"/>',
    zip: '<path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M11 4h2M11 7h2M11 10h2M11 13h2"/><rect x="10" y="15" width="4" height="4" rx="1"/>',
    down: '<path d="M12 4v12M6 11l6 6 6-6M4 21h16"/>',
    win: '<rect x="3" y="3" width="8.5" height="8.5" rx="1"/><rect x="12.5" y="3" width="8.5" height="8.5" rx="1"/><rect x="3" y="12.5" width="8.5" height="8.5" rx="1"/><rect x="12.5" y="12.5" width="8.5" height="8.5" rx="1"/>',
    apple: '<path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.9-.9-3.1-.8a4.6 4.6 0 0 0-3.9 2.4c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4s1.6-.8 3-.8 1.8.8 3 .7 2-1.1 2.8-2.3a9.6 9.6 0 0 0 1.2-2.6 4 4 0 0 1-2.2-4zM14.2 5.6A3.9 3.9 0 0 0 15.1 2.8a4 4 0 0 0-2.6 1.4 3.7 3.7 0 0 0-.9 2.7 3.3 3.3 0 0 0 2.6-1.3z" fill="currentColor" stroke="none"/>',
    tux: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7.5 9.5l3 2.5-3 2.5M12.5 15h4"/>',
    lightning: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    sync: '<path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8M18 2v4h-4M6 22v-4h4"/>',
  };
  P.ico = (n, cls = '', sw = 2) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;

  /* --------------------------------------------------------------- the moonlit "short film" (from REF demo-video) */
  const r0 = T.rng(11);
  let stars = '';
  for (let i = 0; i < 46; i++) stars += `<circle cx="${(r0() * 1600) | 0}" cy="${(r0() * 360) | 0}" r="${(0.8 + r0() * 1.6).toFixed(1)}" fill="#fff" opacity="${(0.2 + r0() * 0.5).toFixed(2)}"/>`;
  P.VID = `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><rect width="1600" height="900" fill="url(#gSky)"/>${stars}<g class="moon"><circle r="190" fill="url(#gMoon)"/><circle r="76" fill="#ebd8aa"/><circle cx="-20" cy="14" r="11" fill="#d9c492" opacity=".5"/><circle cx="24" cy="-18" r="7" fill="#d9c492" opacity=".45"/></g>
<path class="L" fill="#415d73" d="M-400 900V560C-100 530 150 480 400 440C620 405 800 300 960 258C1080 228 1180 310 1290 390C1420 485 1640 520 2000 540V900Z"/>
<path class="L" fill="#305669" d="M-400 900V600C-150 590 60 480 260 470C430 462 590 560 760 578C940 596 1090 560 1210 538C1350 512 1480 462 1620 478C1760 494 1880 520 2000 530V900Z"/>
<path class="L" fill="#234b5e" d="M-400 900V700C-200 690 0 570 200 560C390 552 520 700 670 760C780 800 870 760 980 700C1110 628 1210 552 1340 560C1480 568 1640 650 2000 700V900Z"/>
<rect y="620" width="1600" height="280" fill="url(#gMist)"/>
<path class="L" fill="#183f51" d="M-400 900V830C-150 800 150 770 380 800C560 822 650 702 790 690C930 678 1060 762 1210 772C1370 782 1510 702 1660 692C1800 684 1900 700 2000 706V900Z"/>
<path class="L" fill="#0f3141" d="M-400 900V868C-100 836 250 846 520 870C760 890 950 858 1150 850C1380 842 1640 872 2000 862V900Z"/></svg>`;
  P.setVid = function (el, vt, mx = 1080) {
    const L = el._L || (el._L = [...el.querySelectorAll('.L')]), m = el._m || (el._m = el.querySelector('.moon'));
    m.setAttribute('transform', `translate(${(mx + vt * 4).toFixed(1)} ${(250 - vt * 1.1).toFixed(1)})`);
    const sp = [4, 8, 13, 19, 27];
    L.forEach((p, i) => p.setAttribute('transform', `translate(${(-vt * sp[i]).toFixed(1)} 0)`));
  };

  /* ---------------------------------------------------------------- browser window */
  P.browser = function (parent, o) {
    const W = o.w, H = o.h;
    const el = h('div', 'browser', null, parent, `left:${o.x || 0}px;top:${o.y || 0}px;width:${W}px;height:${H}px;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 0 0 1px rgba(143,124,255,.08),0 60px 140px -30px rgba(0,0,0,.85),0 0 160px -20px rgba(107,59,255,.28)`);
    const ts = h('div', 'tabstrip', '<div class="lights"><i></i><i></i><i></i></div>', el);
    const tabs = (o.tabs || []).map((tb, i) => {
      const t = h('div', 'tab' + (tb.on ? ' on' : ''), `${tb.img ? `<img class="fav" src="${tb.img}">` : `<span class="fav" style="background:${tb.fav || '#666'}"></span>`}<span class="tt">${esc(tb.title)}</span><span class="x">✕</span>`, ts);
      t.style.left = 84 + i * 254 + 'px';
      return t;
    });
    const tb = h('div', 'toolbar', null, el);
    tb.innerHTML = `<svg class="nav" style="left:20px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${I.back}</svg>
      <svg class="nav" style="left:52px;opacity:.45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${I.fwd}</svg>
      <svg class="nav" style="left:84px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">${I.reload}</svg>`;
    const omni = h('div', 'omni', `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2.4">${I.lock}</svg><span class="u"></span>`, tb, `width:${W - 118 - 190}px`);
    const setUrl = (host, path) => { omni.querySelector('.u').innerHTML = `${esc(host)}<span class="dim">${esc(path || '')}</span>`; };
    setUrl(o.host || '', o.path || '');
    const icon = (x, html) => { const e = h('div', 'exti', html, tb); e.style.left = x + 'px'; return e; };
    const av = icon(W - 152, `<img src="${LOGO}">`);
    const puzzle = icon(W - 114, `<svg width="18" height="18" viewBox="0 0 24 24">${I.puzzle}</svg>`);
    puzzle.style.color = '#b4b4bd';
    const avatar = icon(W - 76, '<div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#f472b6,#8b5cf6)"></div>');
    icon(W - 40, '<span style="font:700 18px Inter">⋮</span>');
    const page = h('div', 'page', null, el, o.pageBg ? `background:${o.pageBg}` : '');
    return { el, page, tabs, omni, setUrl, av, puzzle, avatar, W, H,
      // nominal centre of a toolbar icon, relative to the browser's top-left
      at: { av: [W - 135, 67], puzzle: [W - 97, 67], omni: [300, 67] } };
  };

  /* ---------------------------------------------------------------- Chrome Web Store listing (dark) */
  const CWS = {
    en: { store: 'chrome web store', search: 'Search extensions and themes', add: 'Add to Chrome', kind: 'Extension', cat: 'Tools', tabs: ['Overview', 'Privacy practices', 'Support', 'Related'], ask: (n) => `Add “${n}”?`, can: 'It can:', perm: 'Read and change your data on generativelanguage.googleapis.com', cancel: 'Cancel', addExt: 'Add extension', added: 'Added to Chrome', use: 'Use it from the Extensions menu, or pin it to the toolbar.', menu: 'Extensions', access: 'No access needed', dir: 'ltr' },
    fa: { store: 'chrome web store', search: 'جستجوی افزونه‌ها و طرح‌های زمینه', add: 'افزودن به Chrome', kind: 'افزونه', cat: 'ابزارها', tabs: ['نمای کلی', 'رویه‌های حریم خصوصی', 'پشتیبانی', 'مرتبط'], ask: (n) => `«${n}» افزوده شود؟`, can: 'می‌تواند:', perm: 'داده‌های شما را در generativelanguage.googleapis.com بخواند و تغییر دهد', cancel: 'لغو', addExt: 'افزودن افزونه', added: 'به Chrome افزوده شد', use: 'از منوی افزونه‌ها استفاده کنید یا آن را به نوار ابزار سنجاق کنید.', menu: 'افزونه‌ها', access: 'نیازی به دسترسی ندارد', dir: 'rtl' },
    'zh-Hans': { store: 'chrome web store', search: '搜索扩展程序和主题', add: '添加至 Chrome', kind: '扩展程序', cat: '工具', tabs: ['概述', '隐私权规范', '支持', '相关'], ask: (n) => `要添加“${n}”吗？`, can: '它可以：', perm: '读取和更改您在 generativelanguage.googleapis.com 上的数据', cancel: '取消', addExt: '添加扩展程序', added: '已添加至 Chrome', use: '可从扩展程序菜单中使用，或将其固定到工具栏。', menu: '扩展程序', access: '无需访问权限', dir: 'ltr' },
  };
  P.CWS = CWS;
  P.cwsPage = function (page, loc, name, shots) {
    const L = CWS[loc] || CWS.en;
    const rtl = L.dir === 'rtl';
    const f = loc === 'fa' ? '"Vazirmatn Variable","Inter Variable"' : loc === 'zh-Hans' ? '"Inter Variable","Noto Sans SC Variable"' : '"Inter Variable"';
    page.style.background = '#131316';
    const root = h('div', 'a', null, page, `inset:0;direction:${L.dir};font-family:${f};color:#e3e3e6`);
    const side = (x, w) => (rtl ? `right:${x}px` : `left:${x}px`);
    h('div', 'a', null, root, `left:0;right:0;top:0;height:64px;border-bottom:1px solid rgba(255,255,255,.07);background:#18181b`);
    h('div', 'a', `<span style="width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#3b3b44,#26262c);display:inline-flex;align-items:center;justify-content:center;color:#c8c8d0">${P.ico('bag', '', 2)}</span><span style="font:500 19px 'Inter Variable';letter-spacing:.01em;color:#d8d8de">${L.store}</span>`, root, `${side(28)};top:17px;display:flex;align-items:center;gap:12px`);
    root.lastChild.querySelector('svg').style.cssText = 'width:17px;height:17px';
    h('div', 'a', `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9a9aa3" stroke-width="2.2">${I.search}</svg><span>${esc(L.search)}</span>`, root, `left:430px;top:11px;width:580px;height:42px;border-radius:21px;background:#232328;display:flex;align-items:center;gap:12px;padding:0 18px;font-size:15px;color:#8b8b94`);
    // listing header
    h('div', 'a', `<img src="${LOGO}" style="width:92px;height:92px">`, root, `${side(120)};top:104px;width:128px;height:128px;border-radius:28px;background:#0d0d14;border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center`);
    h('div', 'a', esc(name), root, `${side(278)};top:116px;font-size:${loc === 'en' ? 31 : 29}px;font-weight:600;letter-spacing:-.01em;color:#f1f1f4;white-space:nowrap`);
    h('div', 'a', `<span style="color:#a8c7fa">msmahdinejad.github.io</span><span style="opacity:.4"> · </span>${esc(L.kind)}<span style="opacity:.4"> · </span>${esc(L.cat)}`, root, `${side(278)};top:168px;font-size:15px;color:#a3a3ad;white-space:nowrap`);
    h('div', 'a', `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:8px;background:rgba(74,222,128,.1);color:#86efac;font-size:13px;font-weight:600">MIT · Open source</span>`, root, `${side(278)};top:200px`);
    const add = h('div', 'a', esc(L.add), root, `${rtl ? 'left' : 'right'}:120px;top:128px;height:48px;padding:0 30px;border-radius:24px;background:#a8c7fa;color:#062e6f;font-size:16px;font-weight:600;display:flex;align-items:center;white-space:nowrap`);
    // tabs
    h('div', 'a', L.tabs.map((x, i) => `<span style="padding:14px 4px;${i ? 'color:#9a9aa3' : 'color:#e3e3e6;border-bottom:3px solid #a8c7fa'}">${esc(x)}</span>`).join(''), root, `${side(120)};top:262px;display:flex;gap:40px;font-size:15px;font-weight:500`);
    h('div', 'a', null, root, `left:120px;right:120px;top:312px;height:1px;background:rgba(255,255,255,.08)`);
    // screenshots carousel
    shots.forEach((s, i) => h('div', 'a', `<img src="${s}" style="width:100%;height:100%;object-fit:cover;display:block">`, root, `left:${120 + i * 412}px;top:342px;width:392px;height:245px;border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.08)`));
    h('div', 'a', [0, 1, 2].map((i) => `<i style="display:inline-block;width:${i ? 8 : 22}px;height:8px;border-radius:4px;background:${i ? '#4a4a52' : '#a8c7fa'};margin:0 4px"></i>`).join(''), root, `left:0;right:0;top:604px;text-align:center`);
    for (let k = 0; k < 4; k++) h('div', 'skel', null, root, `${side(120)};top:${650 + k * 34}px;width:${[760, 980, 640, 820][k]}px;height:11px`);
    return { add, root, L };
  };

  /* Chrome's install bubble, "added" bubble and Extensions menu */
  P.cwsDialog = function (parent, L, name, x, y) {
    const rtl = L.dir === 'rtl';
    const el = h('div', 'cbubble', null, parent, `left:${x}px;top:${y}px;width:452px;padding:22px 24px 20px;direction:${L.dir}`);
    el.innerHTML = `<div style="display:flex;gap:14px;align-items:flex-start"><img src="${LOGO}" style="width:36px;height:36px;flex:none"><div style="font-size:17px;font-weight:600;line-height:1.35;color:#f1f1f4">${esc(L.ask(name))}</div></div>
      <div style="margin:14px 0 0 ${rtl ? 0 : 50}px;margin-${rtl ? 'right' : 'left'}:50px;font-size:13.5px;color:#b9b9c2">${esc(L.can)}</div>
      <div style="margin-${rtl ? 'right' : 'left'}:50px;margin-top:6px;font-size:13.5px;color:#b9b9c2;line-height:1.45">• ${esc(L.perm)}</div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px"><span class="cbtn sec">${esc(L.cancel)}</span><span class="cbtn pri" data-k="ok">${esc(L.addExt)}</span></div>`;
    return { el, ok: el.querySelector('[data-k=ok]') };
  };
  P.addedBubble = function (parent, L, name, x, y) {
    const el = h('div', 'cbubble', null, parent, `left:${x}px;top:${y}px;width:380px;padding:18px 20px;direction:${L.dir}`);
    el.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><img src="${LOGO}" style="width:30px;height:30px"><div style="font-size:15px;font-weight:600;color:#f1f1f4">${esc(L.added)}</div></div><div style="margin-top:8px;font-size:13px;color:#b9b9c2;line-height:1.45">${esc(L.use)}</div>`;
    return el;
  };
  P.extMenu = function (parent, L, name, x, y) {
    const el = h('div', 'cbubble', null, parent, `left:${x}px;top:${y}px;width:340px;padding:14px 0 10px;direction:${L.dir}`);
    el.innerHTML = `<div style="padding:0 18px 10px;font-size:15px;font-weight:600;color:#f1f1f4">${esc(L.menu)}</div>
      <div style="padding:2px 18px 6px;font-size:12px;color:#9a9aa3">${esc(L.access)}</div>
      <div class="row" style="display:flex;align-items:center;gap:12px;height:44px;padding:0 14px 0 18px;background:rgba(255,255,255,.06)"><img src="${LOGO}" style="width:22px;height:22px"><span style="flex:1;font-size:13.5px;color:#e8e8ec;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(name)}</span><span data-k="pin" style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#c4c4cc">${P.ico('pin', '', 2)}</span></div>`;
    el.querySelector('[data-k=pin] svg').style.cssText = 'width:17px;height:17px';
    return { el, pin: el.querySelector('[data-k=pin]') };
  };

  /* ---------------------------------------------------------------- Google AI Studio (stylised, dark) */
  P.studioPage = function (page) {
    page.style.background = '#131314';
    const root = h('div', 'a', null, page, 'inset:0;font-family:"Inter Variable";color:#e3e3e6');
    const rail = h('div', 'a', null, root, 'left:0;top:0;bottom:0;width:250px;background:#1b1c1f;border-right:1px solid rgba(255,255,255,.06)');
    h('div', 'a', '<span style="font-weight:500">Google</span> <span style="font-weight:600">AI Studio</span>', rail, 'left:24px;top:22px;font-size:18px;color:#e9e9ee;white-space:nowrap');
    const items = [['home', 'Home'], ['chat', 'Playground'], ['code', 'Build'], [null, 'Dashboard'], ['key', 'API keys', 1], ['folder', 'Projects'], ['chart', 'Usage and billing']];
    items.forEach(([ic, label, on], i) => {
      const y = 82 + i * 46;
      if (!ic) { h('div', 'a', label.toUpperCase(), rail, `left:24px;top:${y + 14}px;font:600 11px 'Inter Variable';letter-spacing:.12em;color:#7b7b85`); return; }
      h('div', 'a', `${P.ico(ic, '', 2)}<span>${label}</span>`, rail, `left:12px;right:12px;top:${y}px;height:40px;border-radius:20px;display:flex;align-items:center;gap:12px;padding:0 14px;font-size:14.5px;${on ? 'background:rgba(168,199,250,.16);color:#d3e3fd;font-weight:600' : 'color:#c4c4cc'}`).querySelector('svg').style.cssText = 'width:18px;height:18px;flex:none';
    });
    h('div', 'a', 'API Keys', root, 'left:300px;top:44px;font-size:30px;font-weight:500;color:#f1f1f4');
    h('div', 'a', 'Create and manage keys for the Gemini API.', root, 'left:300px;top:92px;font-size:15px;color:#9a9aa3');
    const create = h('div', 'a', `${P.ico('key', '', 2.2)}<span>Create API key</span>`, root, 'left:1166px;top:52px;height:46px;padding:0 24px 0 20px;border-radius:23px;background:#a8c7fa;color:#062e6f;font-size:15px;font-weight:600;display:flex;align-items:center;gap:10px;white-space:nowrap');
    create.querySelector('svg').style.cssText = 'width:18px;height:18px';
    const table = h('div', 'a', null, root, 'left:300px;top:150px;width:1090px;height:280px;border-radius:16px;border:1px solid rgba(255,255,255,.09);background:#18181b;overflow:hidden');
    h('div', 'a', ['API key', 'Project', 'Created', 'Quota tier'].map((x, i) => `<span class="a" style="left:${[24, 470, 700, 880][i]}px">${x}</span>`).join(''), table, 'left:0;right:0;top:0;height:46px;line-height:46px;font-size:13px;font-weight:600;color:#9a9aa3;border-bottom:1px solid rgba(255,255,255,.07)');
    const empty = h('div', 'a', 'No API keys yet', table, 'left:0;right:0;top:120px;text-align:center;font-size:15px;color:#7b7b85');
    const row = h('div', 'a', null, table, 'left:0;right:0;top:46px;height:68px;border-bottom:1px solid rgba(255,255,255,.06)');
    row.innerHTML = `<div class="a" style="left:24px;top:12px;font-size:14px;font-weight:600;color:#ececf1">Gemini API Key</div>
      <div class="a mono kstr" style="left:24px;top:36px;font-size:14px;color:#a8c7fa;white-space:nowrap">AIza…</div>
      <div class="a" style="left:470px;top:24px;font-size:14px;color:#c4c4cc">Default Gemini Project</div>
      <div class="a" style="left:700px;top:24px;font-size:14px;color:#c4c4cc">Today</div>
      <div class="a" style="left:880px;top:20px;padding:4px 10px;border-radius:8px;background:rgba(74,222,128,.1);color:#86efac;font-size:13px;font-weight:600">Free tier</div>`;
    const copy = h('div', 'a', P.ico('copy', '', 2), row, 'left:1020px;top:14px;width:40px;height:40px;border-radius:20px;display:flex;align-items:center;justify-content:center;color:#c4c4cc;background:rgba(255,255,255,.06)');
    copy.querySelector('svg').style.cssText = 'width:18px;height:18px';
    const toast = h('div', 'a', `${P.ico('check', '', 2.6)}<span>Copied</span>`, root, 'left:640px;top:740px;height:44px;padding:0 20px;border-radius:12px;background:#e3e3e6;color:#1b1c1f;font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px');
    toast.querySelector('svg').style.cssText = 'width:18px;height:18px;color:#16a34a';
    return { root, create, table, empty, row, copy, toast, kstr: row.querySelector('.kstr') };
  };

  /* ---------------------------------------------------------------- video site page */
  P.watchPage = function (page) {
    page.style.background = '#0f0f13';
    const root = h('div', 'a', null, page, 'inset:0;font-family:"Inter Variable"');
    root.innerHTML = `<div class="a" style="left:0;right:0;top:0;height:56px;border-bottom:1px solid rgba(255,255,255,.05)">
      <div class="a" style="left:32px;top:14px;display:flex;align-items:center;gap:10px;font:700 20px 'Inter Variable'"><div style="width:34px;height:26px;border-radius:8px;background:#f5f5f7;display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z" fill="#0f0f13"/></svg></div>watch</div>
      <div class="a" style="left:430px;top:11px;width:560px;height:34px;border-radius:17px;background:#1b1b21;border:1px solid rgba(255,255,255,.06);font:400 15px/32px 'Inter Variable';color:#71717a;padding-left:18px">Search</div></div>
      <div class="a" style="left:32px;top:652px;font:600 23px 'Inter Variable';color:#f4f4f6">Every New Path — Short film</div>
      <div class="a" style="left:32px;top:696px;display:flex;align-items:center;gap:12px"><div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#3a667c,#112442)"></div><div><div style="font:600 16px 'Inter Variable';color:#ececf1">Lumen Films</div><div style="font:400 14px 'Inter Variable';color:#8b8b94">Short film · 12:40</div></div><div style="margin-left:18px;padding:9px 18px;border-radius:18px;background:#f5f5f7;color:#0f0f13;font:600 14px 'Inter Variable'">Subscribe</div></div>
      <div class="a" style="left:1060px;top:68px;font:600 17px 'Inter Variable';color:#ececf1">Up next</div>` +
      [0, 1, 2, 3, 4].map((i) => `<div class="a" style="left:1060px;top:${104 + i * 104}px;width:350px;height:94px"><div class="a" style="left:0;top:0;width:168px;height:94px;border-radius:10px;background:linear-gradient(135deg,${['#27496d,#0f3141', '#3b2a78,#132b3a', '#5f3b1f,#1e1e24', '#1b4d3e,#0f172a', '#4a1d4f,#101820'][i]})"></div><div class="skel" style="left:184px;top:10px;width:150px;background:rgba(255,255,255,.14)"></div><div class="skel" style="left:184px;top:34px;width:120px"></div><div class="skel" style="left:184px;top:58px;width:90px"></div></div>`).join('');
    const player = h('div', 'a', null, root, 'left:32px;top:68px;width:1000px;height:562.5px;border-radius:16px;overflow:hidden;background:#000');
    const vid = h('div', 'a', P.VID, player, 'inset:0');
    const ctrl = h('div', 'a', null, player, 'left:0;right:0;bottom:0;height:78px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.65))');
    ctrl.innerHTML = `<div class="a" style="left:20px;right:20px;bottom:50px;height:4px;border-radius:2px;background:rgba(255,255,255,.25)"></div><div class="a vp" style="left:20px;bottom:50px;height:4px;border-radius:2px;background:#f5f5f7;width:100px"></div>
      <svg class="a" style="left:22px;bottom:14px" width="22" height="22" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
      <div class="a vt" style="left:62px;bottom:16px;font:500 15px 'Inter Variable';color:#e4e4e7">1:24 / 12:40</div>`;
    return { root, player, vid, ctrl, vp: ctrl.querySelector('.vp'), vt: ctrl.querySelector('.vt') };
  };

  /* ---------------------------------------------------------------- extension pages (real, via V.embedExt) */
  P.extCss = function (loc) {
    let css = 'html{scrollbar-width:none;scroll-behavior:auto!important}body{overflow:hidden!important}*{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}';
    if (loc === 'zh-Hans') css += '@import url("/node_modules/@fontsource-variable/noto-sans-sc/index.css");html{font-family:Vazirmatn,"Noto Sans SC Variable",Inter,sans-serif!important}';
    return css;
  };
  P.embed = async function (name, loc, parent, w, hgt, extra = '') {
    const r = await V.embedExt(name, loc, { width: w, height: hgt, parent, css: P.extCss(loc) + extra });
    r.frame.style.position = 'absolute'; r.frame.style.left = '0'; r.frame.style.top = '0';
    r.q = (s) => r.doc.querySelector(s);
    r.qa = (s) => [...r.doc.querySelectorAll(s)];
    // nominal rect of an element inside the frame (frame-local coords)
    r.rect = (s) => { const e = typeof s === 'string' ? r.doc.querySelector(s) : s; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, cx: b.left + b.width / 2, cy: b.top + b.height / 2 }; };
    return r;
  };
  P.langName = function (code, loc) {
    try { const n = new Intl.DisplayNames([loc], { type: 'language' }); return `${n.of(code) || n.of(code.split('-')[0]) || code} · ${code}`; } catch { return code; }
  };
  P.LANGS = ['en', 'fa', 'ar', 'zh-Hans', 'zh-Hant', 'de', 'fr', 'it', 'es', 'ru', 'ja', 'ko', 'tr', 'pt-BR', 'pt-PT', 'nl', 'pl', 'uk', 'hi', 'ur', 'he', 'id', 'ms', 'vi', 'th',
    'af', 'ak', 'sq', 'am', 'hy', 'az', 'eu', 'be', 'bn', 'bg', 'my', 'ca', 'hr', 'cs', 'da', 'et', 'fil', 'fi', 'gl', 'ka', 'el', 'gu', 'ha', 'hu', 'is', 'jv', 'kn', 'kk', 'km', 'rw', 'lo', 'lv', 'lt', 'mk', 'ml', 'mr', 'mn', 'ne', 'no', 'nb', 'pa', 'ro', 'sr', 'sd', 'si', 'sk', 'sl', 'su', 'sw', 'sv', 'ta', 'te', 'uz', 'zu'];

  /* ---------------------------------------------------------------- desktop app (real index.html + styles.css + app.js strings) */
  P.embedApp = async function (loc, parent, w, hgt) {
    const base = '/repo/src/avorythm/static/';
    const [html, css, js] = await Promise.all(['index.html', 'styles.css', 'app.js'].map((f) => fetch(base + f).then((r) => r.text())));
    const i0 = js.indexOf('const messages = {');
    let depth = 0, i = js.indexOf('{', i0), j = i;
    for (; j < js.length; j++) { const c = js[j]; if (c === "'" || c === '"' || c === '`') { const q = c; j++; while (j < js.length && js[j] !== q) { if (js[j] === '\\') j++; j++; } continue; } if (c === '{') depth++; else if (c === '}') { depth--; if (!depth) break; } }
    const messages = new Function('return ' + js.slice(i, j + 1))();
    const dict = messages[loc] || messages.en;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,link[rel=stylesheet],link[rel=icon]').forEach((s) => s.remove());
    doc.querySelectorAll('[data-i18n]').forEach((n) => { const v = dict[n.dataset.i18n]; if (typeof v === 'string') n.textContent = v; });
    doc.documentElement.lang = loc; doc.documentElement.dir = loc === 'fa' ? 'rtl' : 'ltr';
    doc.querySelectorAll('img[src^="/"]').forEach((im) => im.setAttribute('src', base + im.getAttribute('src').slice(1)));
    const style = doc.createElement('style');
    style.textContent = css.replace(/url\('\/assets\//g, `url('${base}assets/`) + '*{animation:none!important;transition:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}html{scrollbar-width:none;scroll-behavior:auto!important}body{overflow:hidden!important}' +
      (loc === 'zh-Hans' ? '@import url("/node_modules/@fontsource-variable/noto-sans-sc/index.css");html{font-family:Vazirmatn,"Noto Sans SC Variable",Inter,sans-serif!important}' : '');
    doc.head.append(style);
    const frame = document.createElement('iframe');
    frame.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${hgt}px;border:0;background:#070912`;
    frame.srcdoc = '<!doctype html>' + doc.documentElement.outerHTML;
    parent.appendChild(frame);
    await new Promise((res) => { frame.onload = res; });
    try { await frame.contentDocument.fonts.ready; } catch { /* ignore */ }
    const d = frame.contentDocument;
    return { frame, doc: d, dict, q: (s) => d.querySelector(s), qa: (s) => [...d.querySelectorAll(s)],
      rect: (s) => { const e = typeof s === 'string' ? d.querySelector(s) : s; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, cx: b.left + b.width / 2, cy: b.top + b.height / 2 }; } };
  };
})();
