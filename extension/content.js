(() => {
  if (window.__avorythmSubtitleOverlay) return;

  const host = document.createElement('div');
  const arabicFont = chrome.runtime.getURL('assets/vazirmatn-arabic.woff2');
  const latinFont = chrome.runtime.getURL('assets/vazirmatn-latin.woff2');
  host.id = 'avorythm-subtitle-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;inset:auto;pointer-events:none;display:none;';
  const shadow = host.attachShadow({mode: 'open'});
  shadow.innerHTML = `
    <style>
      @font-face { font-family:Vazirmatn; src:url('${arabicFont}') format('woff2'); font-weight:100 900; unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF; }
      @font-face { font-family:Vazirmatn; src:url('${latinFont}') format('woff2'); font-weight:100 900; unicode-range:U+0000-05FF; }
      :host { all: initial; }
      .card {
        box-sizing: border-box; position: relative; min-width: 280px; min-height: 74px;
        max-width: calc(100vw - 32px); max-height: 45vh; resize: both; overflow: auto;
        padding: 16px 22px 14px; border: 1px solid rgba(255,255,255,.2); border-radius: 20px;
        color: #fff; background: rgba(11,15,28,var(--opacity,.88));
        box-shadow: 0 18px 60px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.14);
        backdrop-filter: blur(24px) saturate(150%); -webkit-backdrop-filter: blur(24px) saturate(150%);
        font-family: Vazirmatn, Inter, system-ui, sans-serif; pointer-events: auto;
      }
      .grip { position:absolute; inset-inline-start:50%; top:6px; translate:-50% 0; width:44px; height:5px;
        border-radius:9px; background:rgba(255,255,255,.28); cursor:move; touch-action:none; }
      .lines { margin: 5px 0 0; }
      .lines p { margin: 0; text-align:center; line-height:1.65; font-size:var(--size,24px);
        font-weight:650; text-wrap:balance; unicode-bidi:plaintext; transition:opacity .25s ease; }
      .lines p.older { opacity:.55; }
      .source p { color:rgba(226,232,240,.72); font-size:calc(var(--size,24px) * .68); font-weight:500; }
      .source-only .source p { color:#fff; font-size:var(--size,24px); font-weight:650; }
      .translation p { color:#fff; text-shadow:0 2px 12px rgba(0,0,0,.75); }
      .translation p.placeholder { opacity:.6; }
      .card.quiet { opacity:0; pointer-events:none; transition:opacity .35s ease; }
      [hidden] { display:none !important; }
    </style>
    <section class="card" role="status" aria-live="polite">
      <div class="grip" title="Drag subtitles"></div>
      <div class="lines source" dir="auto" hidden></div>
      <div class="lines translation" dir="auto"></div>
    </section>`;
  document.documentElement.append(host);

  const card = shadow.querySelector('.card');
  const grip = shadow.querySelector('.grip');
  const source = shadow.querySelector('.source');
  const translation = shadow.querySelector('.translation');
  const Track = window.AvorythmCaptionTrack;
  const tracks = {source: new Track(), translated: new Track()};
  let dragged = false;
  let lastPosition = '';
  let timer = null;
  let current = {active: false, sourceEnabled: false, translatedEnabled: false, placeholder: ''};

  function position(name) {
    if (dragged) return;
    host.style.inset = 'auto';
    host.style.transform = '';
    if (name.startsWith('top')) host.style.top = '24px'; else host.style.bottom = '24px';
    if (name.endsWith('left')) host.style.left = '24px';
    else if (name.endsWith('right')) host.style.right = '24px';
    else { host.style.left = '50%'; host.style.transform = 'translateX(-50%)'; }
  }

  function paint(container, lines, placeholder = '') {
    const signature = lines.map((line) => `${line.current ? '*' : ''}${line.text}`).join('|') || `?${placeholder}`;
    if (container.dataset.signature === signature) return;
    container.dataset.signature = signature;
    container.replaceChildren(...(lines.length ? lines : [{text: placeholder, current: true, placeholder: true}]).map((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line.text;
      if (!line.current) paragraph.className = 'older';
      if (line.placeholder) paragraph.className = 'placeholder';
      return paragraph;
    }));
  }

  // Runs on a timer so captions expire and queued sentences advance even when
  // the extension sends no new text.
  function refresh() {
    const sourceLines = current.sourceEnabled ? tracks.source.visible() : [];
    const translatedLines = current.translatedEnabled ? tracks.translated.visible() : [];
    const empty = !sourceLines.length && !translatedLines.length;
    const everSpoken = tracks.source.spoken || tracks.translated.spoken;
    source.hidden = !current.sourceEnabled || !sourceLines.length;
    paint(source, sourceLines);
    translation.hidden = !current.translatedEnabled;
    paint(translation, translatedLines, current.placeholder);
    // Before the first caption the card shows a hint; afterwards it fades away
    // while nothing is being said instead of leaving stale text behind.
    card.classList.toggle('quiet', empty && everSpoken);
    if (!current.active && timer !== null) { clearInterval(timer); timer = null; }
  }

  function render(message) {
    const settings = message.settings || {};
    const output = message.output || settings.onPageOutput || settings;
    const sourceEnabled = Boolean(output.sourceSubtitlesEnabled);
    const translatedEnabled = Boolean(output.translatedSubtitlesEnabled);
    const active = Boolean(message.active);
    host.style.display = active && (sourceEnabled || translatedEnabled) ? 'block' : 'none';
    card.classList.toggle('source-only', sourceEnabled && !translatedEnabled);
    card.style.width = `${Math.max(280, Math.min(1200, Number(settings.subtitleWidth) || 680))}px`;
    card.style.setProperty('--size', `${Math.max(14, Math.min(52, Number(settings.subtitleFontSize) || 24))}px`);
    card.style.setProperty('--opacity', String(Math.max(.45, Math.min(.98, Number(settings.subtitleOpacity || 88) / 100))));
    const options = {
      mode: settings.subtitleMode,
      lines: settings.subtitleLines,
      holdMs: (Number(settings.subtitleHoldSeconds) || 6) * 1000
    };
    for (const track of Object.values(tracks)) track.configure(options);
    if (!active) { for (const track of Object.values(tracks)) track.clear(); }
    else {
      tracks.source.push(message.sourceText, message.sourceSeq ?? null);
      tracks.translated.push(message.translatedText, message.translatedSeq ?? null);
    }
    current = {
      active, sourceEnabled, translatedEnabled,
      placeholder: settings.locale === 'fa' ? 'منتظر ترجمه…' : settings.locale === 'zh-Hans' ? '等待翻译…' : 'Waiting for translation…'
    };
    const nextPosition = settings.subtitlePosition || 'bottom-center';
    if (nextPosition !== lastPosition) { dragged = false; lastPosition = nextPosition; }
    position(nextPosition);
    if (active && timer === null) timer = setInterval(refresh, 250);
    refresh();
  }

  grip.addEventListener('pointerdown', (event) => {
    const rect = host.getBoundingClientRect();
    const startX = event.clientX; const startY = event.clientY;
    const startLeft = rect.left; const startTop = rect.top;
    dragged = true; grip.setPointerCapture(event.pointerId);
    const move = (next) => {
      host.style.inset = 'auto'; host.style.transform = '';
      host.style.left = `${Math.max(8, Math.min(innerWidth - rect.width - 8, startLeft + next.clientX - startX))}px`;
      host.style.top = `${Math.max(8, Math.min(innerHeight - rect.height - 8, startTop + next.clientY - startY))}px`;
    };
    const end = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', end); };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', end);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'avorythm-overlay') render(message);
  });
  window.__avorythmSubtitleOverlay = {render};
})();
