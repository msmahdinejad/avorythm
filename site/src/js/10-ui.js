/* Theme, header, menus, reveal-on-scroll, spotlight cards, guide tabs, language suggestion. */
(() => {
  const root = document.documentElement;

  // Theme
  $$('[data-theme-toggle]').forEach((btn) => btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    store.set('avorythm.theme', next);
  }));

  // Header state, scroll progress, back-to-top
  const header = $('[data-header]');
  const progress = $('.scroll-progress');
  const toTop = $('[data-to-top]');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY;
    if (y > 8) header.setAttribute('data-scrolled', ''); else header.removeAttribute('data-scrolled');
    const max = document.documentElement.scrollHeight - innerHeight;
    progress?.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    toTop?.classList.toggle('show', y > 900);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  // Mobile menu
  const menuBtn = $('[data-menu-toggle]');
  const setMenu = (open) => {
    header.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn?.addEventListener('click', () => setMenu(!header.classList.contains('nav-open')));
  $$('.nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // Language menu: close on outside click / Escape; remember explicit choices
  const langmenu = $('[data-langmenu]');
  document.addEventListener('click', (e) => { if (langmenu?.open && !langmenu.contains(e.target)) langmenu.open = false; });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (langmenu?.open) { langmenu.open = false; langmenu.querySelector('summary')?.focus(); }
    if (header.classList.contains('nav-open')) setMenu(false);
  });
  $$('[data-switch-lang]').forEach((a) => a.addEventListener('click', () => store.set('avorythm.lang', a.dataset.switchLang)));

  // Reveal on scroll
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  // Spotlight on cards
  $$('[data-spot]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // Active section in the nav
  const links = new Map($$('.nav a').map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => entries.forEach((entry) => {
      const link = links.get(entry.target.id);
      if (link) link.classList.toggle('active', entry.isIntersecting);
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((_, id) => { const el = document.getElementById(id); if (el) so.observe(el); });
  }

  // Copy chips
  $$('[data-copy]').forEach((chip) => chip.addEventListener('click', async () => {
    const ok = await copyText(chip.dataset.copy);
    toast(ok ? AVO.msg.copied : AVO.msg.copyFailed);
  }));

  // Guide: tabs, accordion steps, preview
  const guide = $('[data-guide]');
  if (guide) {
    const img = (name) => `${AVO.base}assets/img/shot-${name}.webp`;
    const showPreview = (pane, step) => {
      const frame = $('[data-preview]', pane);
      const shot = step?.dataset.shot;
      if (shot) frame.innerHTML = `<img src="${img(shot)}" alt="" decoding="async">`;
      else frame.innerHTML = `<div class="fake-store"><img src="${AVO.base}assets/img/logo-256.webp" alt=""><b>Avorythm — AI Live Dubbing &amp; Subtitles</b><span>Add to Chrome</span></div>`;
    };
    $$('[data-guide-pane]', guide).forEach((pane) => {
      const steps = $$('.gstep', pane);
      steps.forEach((step) => $('.gstep-head', step).addEventListener('click', () => {
        steps.forEach((s) => { s.classList.toggle('active', s === step); $('.gstep-head', s).setAttribute('aria-expanded', String(s === step)); });
        showPreview(pane, step);
      }));
      showPreview(pane, steps[0]);
    });
    const tabs = $$('[data-guide-tab]', guide);
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      $$('[data-guide-pane]', guide).forEach((pane) => { pane.hidden = pane.dataset.guidePane !== tab.dataset.guideTab; });
    }));
  }

  // Subtle tilt on the hero demo (fine pointers only)
  const demo = $('.demo-frame');
  if (demo && !reduceMotion && matchMedia('(pointer: fine)').matches) {
    const host = demo.parentElement;
    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      demo.style.setProperty('--ry', `${(x * 3.2).toFixed(2)}deg`);
      demo.style.setProperty('--rx', `${(-y * 2.4).toFixed(2)}deg`);
    });
    host.addEventListener('pointerleave', () => { demo.style.setProperty('--ry', '0deg'); demo.style.setProperty('--rx', '0deg'); });
  }

  // Suggest the visitor's own language once, never forcing a redirect
  if (!store.get('avorythm.lang')) {
    const wanted = (navigator.languages || [navigator.language || 'en'])
      .map((tag) => tag.toLowerCase())
      .map((tag) => (tag.startsWith('zh') ? 'zh' : tag.split('-')[0]))
      .find((code) => langInfo(code));
    if (wanted && wanted !== AVO.lang) {
      const target = langInfo(wanted);
      const banner = $('[data-lang-banner]');
      $('[data-lang-banner-text]', banner).textContent = fmt(AVO.msg.langSwitch, { language: target.native });
      const link = $('[data-lang-banner-link]', banner);
      link.href = `${AVO.base}${wanted === 'en' ? '' : wanted + '/'}` || './';
      link.addEventListener('click', () => store.set('avorythm.lang', wanted));
      $('[data-lang-banner-close]', banner).addEventListener('click', () => { banner.hidden = true; store.set('avorythm.lang', AVO.lang); });
      setTimeout(() => { banner.hidden = false; }, 1800);
    }
  }
})();
