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
      p { margin: 5px 0 0; text-align:center; line-height:1.65; font-size:var(--size,24px);
        font-weight:650; text-wrap:balance; unicode-bidi:plaintext; }
      .source { color:rgba(226,232,240,.72); font-size:calc(var(--size,24px) * .68); font-weight:500; }
      .source-only .source { color:#fff; font-size:var(--size,24px); font-weight:650; }
      .translation { color:#fff; text-shadow:0 2px 12px rgba(0,0,0,.75); }
      [hidden] { display:none !important; }
    </style>
    <section class="card" role="status" aria-live="polite">
      <div class="grip" title="Drag subtitles"></div>
      <p class="source" dir="auto" hidden></p>
      <p class="translation" dir="auto"></p>
    </section>`;
  document.documentElement.append(host);

  const card = shadow.querySelector('.card');
  const grip = shadow.querySelector('.grip');
  const source = shadow.querySelector('.source');
  const translation = shadow.querySelector('.translation');
  let dragged = false;
  let lastPosition = '';

  function position(name) {
    if (dragged) return;
    host.style.inset = 'auto';
    host.style.transform = '';
    if (name.startsWith('top')) host.style.top = '24px'; else host.style.bottom = '24px';
    if (name.endsWith('left')) host.style.left = '24px';
    else if (name.endsWith('right')) host.style.right = '24px';
    else { host.style.left = '50%'; host.style.transform = 'translateX(-50%)'; }
  }

  function render(message) {
    const settings = message.settings || {};
    const output = message.output || settings.onPageOutput || settings;
    const sourceEnabled = Boolean(output.sourceSubtitlesEnabled);
    const translatedEnabled = Boolean(output.translatedSubtitlesEnabled);
    host.style.display = message.active && (sourceEnabled || translatedEnabled) ? 'block' : 'none';
    card.classList.toggle('source-only', sourceEnabled && !translatedEnabled);
    card.style.width = `${Math.max(280, Math.min(1200, Number(settings.subtitleWidth) || 680))}px`;
    card.style.setProperty('--size', `${Math.max(14, Math.min(52, Number(settings.subtitleFontSize) || 24))}px`);
    card.style.setProperty('--opacity', String(Math.max(.45, Math.min(.98, Number(settings.subtitleOpacity || 88) / 100))));
    source.textContent = message.sourceText || '';
    source.hidden = !sourceEnabled || !source.textContent;
    translation.textContent = message.translatedText || (settings.locale === 'fa' ? 'منتظر ترجمه…' : 'Waiting for translation…');
    translation.hidden = !translatedEnabled;
    const nextPosition = settings.subtitlePosition || 'bottom-center';
    if (nextPosition !== lastPosition) { dragged = false; lastPosition = nextPosition; }
    position(nextPosition);
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
