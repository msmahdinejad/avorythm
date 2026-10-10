/* Share composer: native share sheet with the video file attached, or per-network links with text + link. */
(() => {
  const box = $('[data-composer]');
  if (!box) return;
  const textArea = $('[data-composer-text]', box);
  const langSelect = $('[data-composer-lang]', box);
  const posterEl = $('[data-composer-poster]', box);
  const kindBtns = $$('[data-composer-kind]', box);
  const nativeBtn = $('[data-composer-native]', box);
  const nativeLabel = $('[data-composer-native-label]', box);
  const downloadBtn = $('[data-composer-download]', box);
  const qrCanvas = $('[data-qr]', box);
  const state = { kind: Cinema.state.kind, lang: AVO.lang, edited: false };
  langSelect.value = state.lang;

  const enc = encodeURIComponent;
  const entry = () => {
    const m = AVO.manifest?.langs;
    return m?.[state.lang]?.[state.kind] || m?.en?.[state.kind] || null;
  };
  const link = () => `${langInfo(state.lang).url}?v=${state.kind}#videos`;
  const defaultText = () => {
    const t = AVO.shareTexts?.[state.lang] || AVO.share;
    // In right-to-left text a Latin hashtag's "#" drifts to the far side ("Avorythm#"); a left-to-right mark keeps it attached.
    const tags = langInfo(state.lang)?.dir === 'rtl' ? t.hashtags.replace(/(^|\s)#(?=[A-Za-z0-9])/g, '$1‎#') : t.hashtags;
    return `${t.text}\n${tags}`;
  };
  const fullText = () => `${textArea.value.trim()}\n${link()}`;

  function networkUrl(id) {
    const text = textArea.value.trim();
    const url = link();
    const title = (AVO.shareTexts?.[state.lang] || AVO.share).title;
    switch (id) {
      case 'telegram': return `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`;
      case 'whatsapp': return `https://wa.me/?text=${enc(`${text}\n${url}`)}`;
      case 'x': return `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`;
      case 'linkedin': return `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
      case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}`;
      case 'reddit': return `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`;
      case 'vk': return `https://vk.com/share.php?url=${enc(url)}&title=${enc(title)}&comment=${enc(text)}`;
      case 'sinaweibo': return `https://service.weibo.com/share/share.php?url=${enc(url)}&title=${enc(text)}`;
      case 'line': return `https://social-plugins.line.me/lineit/share?url=${enc(url)}&text=${enc(text)}`;
      case 'bluesky': return `https://bsky.app/intent/compose?text=${enc(`${text}\n${url}`)}`;
      case 'threads': return `https://www.threads.net/intent/post?text=${enc(`${text}\n${url}`)}`;
      case 'mastodon': return `https://mastodon.social/share?text=${enc(`${text}\n${url}`)}`;
      case 'gmail': return `mailto:?subject=${enc(title)}&body=${enc(`${text}\n\n${url}`)}`;
      default: return '#';
    }
  }

  function refresh() {
    const e = entry();
    if (!state.edited) textArea.value = defaultText();
    posterEl.style.backgroundImage = e ? `url("${AVO.base}${e.poster}")` : '';
    kindBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.composerKind === state.kind)));
    if (e) { downloadBtn.href = `${AVO.base}${e.src}`; downloadBtn.setAttribute('download', e.src.split('/').pop()); downloadBtn.hidden = false; }
    else downloadBtn.hidden = true;
    $$('[data-net]', box).forEach((a) => { a.href = networkUrl(a.dataset.net); });
    const canFiles = Boolean(e) && 'canShare' in navigator && navigator.canShare({ files: [new File([''], 'x.mp4', { type: 'video/mp4' })] });
    nativeBtn.hidden = !('share' in navigator);
    nativeLabel.textContent = canFiles ? AVO.msg.nativeFile : AVO.msg.native;
    drawQr();
  }

  async function drawQr() {
    if (!qrCanvas) return;
    const lib = await loadQr();
    if (!lib) return;
    const qr = lib(0, 'M');
    qr.addData(link());
    qr.make();
    const n = qr.getModuleCount();
    const ctx = qrCanvas.getContext('2d');
    const cell = Math.floor(qrCanvas.width / n);
    const off = Math.floor((qrCanvas.width - cell * n) / 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
    ctx.fillStyle = '#0b1124';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(off + c * cell, off + r * cell, cell, cell);
  }
  let qrPromise;
  function loadQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    qrPromise ||= new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = `${AVO.base}assets/qrcode.js`;
      s.onload = () => resolve(window.qrcode);
      s.onerror = () => resolve(null);
      document.head.append(s);
    });
    return qrPromise;
  }

  // Native share: attach the real video file when the browser/OS allows it
  nativeBtn.addEventListener('click', async () => {
    const e = entry();
    const text = fullText();
    try {
      if (e && 'canShare' in navigator) {
        toast(AVO.msg.preparing);
        const blob = await (await fetch(`${AVO.base}${e.src}`)).blob();
        const file = new File([blob], e.src.split('/').pop(), { type: 'video/mp4' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text, title: AVO.share.title });
          return;
        }
      }
      await navigator.share({ text: textArea.value.trim(), url: link(), title: AVO.share.title });
    } catch (err) {
      if (err?.name !== 'AbortError') toast(AVO.msg.shareFailed);
    }
  });
  $('[data-composer-copy-text]', box).addEventListener('click', async () => toast((await copyText(fullText())) ? AVO.msg.copiedShort : AVO.msg.copyFailed));
  $('[data-composer-copy-link]', box).addEventListener('click', async () => toast((await copyText(link())) ? AVO.msg.copiedShort : AVO.msg.copyFailed));
  textArea.addEventListener('input', () => { state.edited = true; $$('[data-net]', box).forEach((a) => { a.href = networkUrl(a.dataset.net); }); });
  kindBtns.forEach((b) => b.addEventListener('click', () => { state.kind = b.dataset.composerKind; refresh(); }));
  langSelect.addEventListener('change', () => { state.lang = langSelect.value; state.edited = false; refresh(); });
  Cinema.listeners.add((s) => { state.kind = s.kind; if (s.lang !== state.lang) { state.lang = s.lang; langSelect.value = s.lang; state.edited = false; } refresh(); });
  refresh();
})();
