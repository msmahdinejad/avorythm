/* Cinema section: film / tutorial in any language, lazy-loaded, deep-linkable (?v=film&vl=fa). */
const Cinema = (() => {
  const section = $('#videos');
  const manifest = AVO.manifest;
  const KINDS = ['film', 'demo', 'tutorial'];
  const state = { kind: 'film', lang: AVO.lang };
  const api = { state, entry: () => entryFor(state.kind, state.lang), listeners: new Set() };
  if (!section) return api;

  const player = $('[data-player]', section);
  const video = $('[data-video]', section);
  const poster = $('[data-poster]', section);
  const playBtn = $('[data-video-play]', section);
  const soon = $('[data-video-soon]', section);
  const downloadLink = $('[data-video-download]', section);
  const meta = $('[data-video-meta]', section);
  const transcript = $('[data-transcript]', section);
  const pills = $$('[data-video-lang]', section);
  const items = $$('.pl-item', section);

  function entryFor(kind, lang) {
    const own = manifest?.langs?.[lang]?.[kind];
    if (own) return { ...own, lang, fallback: false };
    const en = manifest?.langs?.en?.[kind];
    return en ? { ...en, lang: 'en', fallback: true } : null;
  }
  const duration = (seconds) => {
    const s = Math.round(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const url = (path) => `${AVO.base}${path}`;

  function render() {
    const entry = entryFor(state.kind, state.lang);
    pills.forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.videoLang === state.lang)));
    items.forEach((it) => it.setAttribute('aria-selected', String(it.dataset.kind === state.kind)));
    KINDS.forEach((kind) => {
      const e = entryFor(kind, state.lang);
      const small = $(`[data-meta="${kind}"]`, section);
      const thumb = $(`[data-thumb="${kind}"]`, section);
      if (e) {
        small.textContent = fmt(AVO.msg[`${kind}Text`], { duration: duration(e.duration) });
        thumb.style.backgroundImage = `url("${url(e.poster)}")`;
      }
    });
    video.pause();
    player.classList.remove('playing');
    video.removeAttribute('src');
    video.controls = false;
    video.load();
    transcript.closest('details').hidden = !entry?.transcript?.length;
    if (entry) {
      poster.style.backgroundImage = `url("${url(entry.poster)}")`;
      video.poster = url(entry.poster);
      downloadLink.href = url(entry.src);
      downloadLink.setAttribute('download', entry.src.split('/').pop());
      downloadLink.hidden = false;
      meta.textContent = entry.fallback ? AVO.msg.english : '';
      transcript.innerHTML = (entry.transcript || []).map((line) => `<li>${line.replace(/</g, '&lt;')}</li>`).join('');
      playBtn.hidden = false;
      soon.hidden = true;
    } else {
      poster.style.backgroundImage = '';
      downloadLink.hidden = true;
      transcript.innerHTML = '';
      meta.textContent = '';
      playBtn.hidden = true;
      soon.hidden = false;
    }
    api.listeners.forEach((fn) => fn(state));
  }

  function play() {
    const entry = entryFor(state.kind, state.lang);
    if (!entry) return;
    if (!video.getAttribute('src')) { video.src = url(entry.src); video.preload = 'auto'; }
    video.controls = true;
    video.play().catch(() => { /* needs a tap: controls are visible */ });
  }

  video.addEventListener('playing', () => player.classList.add('playing'));
  video.addEventListener('ended', () => { player.classList.remove('playing'); video.controls = false; });
  playBtn.addEventListener('click', play);
  pills.forEach((p) => p.addEventListener('click', () => { state.lang = p.dataset.videoLang; render(); }));
  items.forEach((it) => it.addEventListener('click', () => { state.kind = it.dataset.kind; render(); }));
  $('[data-share-video]', section)?.addEventListener('click', () => {
    $('#share')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  // Hero "Watch the film" link plays right away
  $$('[data-play-film]').forEach((a) => a.addEventListener('click', () => { state.kind = 'film'; state.lang = AVO.lang; render(); play(); }));

  // Deep link from a shared URL
  const params = new URLSearchParams(location.search);
  if (KINDS.includes(params.get('v'))) state.kind = params.get('v');
  if (params.get('vl') && langInfo(params.get('vl'))) state.lang = params.get('vl');
  render();
  return api;
})();
