const source = document.querySelector('#source');
const translation = document.querySelector('#translation');
const card = document.querySelector('.card');

async function refresh() {
  try {
    const response = await fetch('/api/state', {cache: 'no-store'});
    if (!response.ok) return;
    const state = await response.json();
    const settings = state.settings;
    document.documentElement.lang = settings.target_language;
    document.documentElement.dir = state.translated_dir || 'auto';
    card.style.setProperty('--size', `${settings.subtitle_font_size}px`);
    card.style.setProperty('--opacity', String(settings.subtitle_opacity / 100));
    source.textContent = state.source_text || '';
    source.hidden = !settings.source_subtitles_enabled || !state.source_text;
    translation.textContent = state.translated_text || (settings.target_language === 'fa' ? 'منتظر ترجمه…' : 'Waiting for translation…');
    translation.hidden = !settings.translated_subtitles_enabled;
    card.classList.toggle('source-only', settings.source_subtitles_enabled && !settings.translated_subtitles_enabled);
    source.dir = state.source_dir || 'auto';
    translation.dir = state.translated_dir || 'auto';
  } catch {}
}

document.querySelector('#closeButton').addEventListener('click', async () => {
  if (window.pywebview?.api?.hide_subtitles) await window.pywebview.api.hide_subtitles();
  else window.close();
});
setInterval(refresh, 350);
refresh();
