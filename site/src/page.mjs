// Page templates. Every visible string comes from the language JSON (falling back to English);
// the markup is the same for all languages so the stylesheet only needs logical (RTL-safe) properties.
import { createIcons } from './icons.mjs';
import { LANGUAGES, TARGET_LANGUAGES, DEMO_SOURCES, REPO, REPO_URL, STORE_URL, SITE_URL, endonym } from './languages.mjs';

const ALLOWED_INLINE = /<\/?(em|strong|br|code|kbd)\s*\/?>/gi;
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const attr = (s) => esc(String(s).replace(/<[^>]*>/g, ''));
const fmt = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
// Strings may carry a tiny set of inline tags; anything else is escaped.
const rich = (s) => {
  const keep = [];
  const masked = String(s).replace(ALLOWED_INLINE, (m) => `\u0000${keep.push(m) - 1}\u0000`);
  return esc(masked).replace(/\u0000(\d+)\u0000/g, (m, i) => keep[Number(i)]);
};

const SHOT_LOCALE = { fa: 'fa', zh: 'zh-CN' };
const RELEASE = `${REPO_URL}/releases/latest/download`;

export function pageUrl(code) {
  return code === 'en' ? SITE_URL : `${SITE_URL}${code}/`;
}

// The three films, in playlist order (each one is produced separately under video/films/<kind>/).
export const VIDEO_KINDS = ['film', 'demo', 'tutorial'];

export function renderPage({ lang, t, tl, ta, manifest, assetHash, version, shareTexts }) {
  const { icon, sprite } = createIcons();
  const L = LANGUAGES.find((l) => l.code === lang);
  const base = lang === 'en' ? '' : '../';
  const toLang = (code) => `${base}${code === 'en' ? '' : code + '/'}` || './';
  const shot = SHOT_LOCALE[lang] || 'en';
  const img = (name) => `${base}assets/img/${name}`;
  const T = (key, vars) => rich(fmt(t(key), vars));
  // Like T, but the substituted values are trusted HTML (links) and are inserted after the template is escaped.
  const TH = (key, html) => fmt(rich(t(key)), html);
  const A = (key, vars) => attr(fmt(t(key), vars));
  const list = (key) => ta(key);

  const canonical = pageUrl(lang);
  const ogImage = `${SITE_URL}assets/og/og-${lang}.jpg`;
  const filmForLang = manifest?.langs?.[lang]?.film;
  const ogVideo = filmForLang ? `${SITE_URL}${filmForLang.src}` : '';

  const alternates = [
    ...LANGUAGES.map((l) => `<link rel="alternate" hreflang="${l.html}" href="${pageUrl(l.code)}">`),
    `<link rel="alternate" hreflang="x-default" href="${SITE_URL}">`,
  ].join('\n');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Avorythm',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Windows, macOS, Linux, ChromeOS, Chrome, Edge',
        description: tl('meta.description'),
        inLanguage: L.html,
        url: canonical,
        image: ogImage,
        license: 'https://opensource.org/licenses/MIT',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        downloadUrl: STORE_URL,
        softwareVersion: version,
        codeRepository: REPO_URL,
        author: { '@type': 'Person', name: 'Mohammad Saleh Mahdinejad', url: 'https://github.com/msmahdinejad' },
      },
      ...(filmForLang
        ? [{
          '@type': 'VideoObject',
          name: tl('meta.ogTitle'),
          description: tl('meta.ogDescription'),
          thumbnailUrl: `${SITE_URL}${filmForLang.poster}`,
          contentUrl: ogVideo,
          uploadDate: manifest.published || '2026-10-09',
          duration: `PT${Math.round(filmForLang.duration)}S`,
          inLanguage: L.html,
        }]
        : []),
    ],
  });

  /* ------------------------------------------------------------------ head */
  const head = `<!doctype html>
<html lang="${L.html}" dir="${L.dir}" data-theme="dark" data-lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t('meta.title'))}</title>
<meta name="description" content="${A('meta.description')}">
<link rel="canonical" href="${canonical}">
${alternates}
<meta name="theme-color" content="#060913" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f5f6fc" media="(prefers-color-scheme: light)">
<meta name="color-scheme" content="dark light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Avorythm">
<meta property="og:title" content="${A('meta.ogTitle')}">
<meta property="og:description" content="${A('meta.ogDescription')}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${L.locale}">
${LANGUAGES.filter((l) => l.code !== lang).map((l) => `<meta property="og:locale:alternate" content="${l.locale}">`).join('\n')}
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${A('meta.imageAlt')}">
${ogVideo ? `<meta property="og:video" content="${ogVideo}">
<meta property="og:video:secure_url" content="${ogVideo}">
<meta property="og:video:type" content="video/mp4">
<meta property="og:video:width" content="1920">
<meta property="og:video:height" content="1080">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${A('meta.ogTitle')}">
<meta name="twitter:description" content="${A('meta.ogDescription')}">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:image:alt" content="${A('meta.imageAlt')}">
<link rel="icon" type="image/svg+xml" href="${img('favicon.svg')}">
<link rel="icon" type="image/png" sizes="32x32" href="${img('favicon-32.png')}">
<link rel="apple-touch-icon" href="${img('apple-touch-icon.png')}">
<link rel="manifest" href="${base}manifest.webmanifest">
${fontPreloads(lang, base)}
<link rel="stylesheet" href="${base}assets/site.css?v=${assetHash.css}">
<script>document.documentElement.classList.add('js');try{var d=document.documentElement,s=localStorage.getItem('avorythm.theme');d.dataset.theme=s||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}catch(e){}</script>
<script type="application/ld+json">${jsonLd.replace(/</g, '\\u003c')}</script>
</head>`;

  /* ---------------------------------------------------------------- header */
  const navLinks = [['features', 'nav.features'], ['how', 'nav.how'], ['videos', 'nav.videos'], ['guide', 'nav.guide'], ['download', 'nav.download'], ['faq', 'nav.faq']];
  const langMenu = `<details class="langmenu" data-langmenu>
    <summary class="icon-btn langmenu-btn" aria-label="${A('a11y.language')}">${icon('globe')}<span class="langmenu-current">${esc(L.native)}</span>${icon('chevron-down', 'chev')}</summary>
    <ul class="langmenu-list" role="list">
      ${LANGUAGES.map((l) => `<li><a href="${toLang(l.code)}" hreflang="${l.html}" lang="${l.html}" data-switch-lang="${l.code}"${l.code === lang ? ' aria-current="true"' : ''}><span>${esc(l.native)}</span>${l.code === lang ? icon('check') : ''}</a></li>`).join('\n      ')}
    </ul>
  </details>`;

  const header = `<a class="skip" href="#main">${T('a11y.skip')}</a>
<div class="scroll-progress" aria-hidden="true"><i></i></div>
<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="brand" href="#top" aria-label="${A('a11y.home')}"><img src="${img('logo-128.webp')}" width="34" height="34" alt=""><span>Avorythm</span></a>
    <nav class="nav" id="site-nav" aria-label="${A('a11y.primaryNav')}">
      ${navLinks.map(([id, key]) => `<a href="#${id}">${T(key)}</a>`).join('\n      ')}
      <button class="nav-theme theme-btn" type="button" data-theme-toggle>${icon('sun', 'i-sun')}${icon('moon', 'i-moon')}<span>${T('a11y.theme')}</span></button>
    </nav>
    <div class="header-actions">
      ${langMenu}
      <button class="icon-btn theme-btn" type="button" data-theme-toggle aria-label="${A('a11y.theme')}">${icon('sun', 'i-sun')}${icon('moon', 'i-moon')}</button>
      <a class="star-pill" href="${REPO_URL}" target="_blank" rel="noopener" data-star-open aria-label="${A('header.starAria')}">${icon('star')}<span>${T('header.star')}</span><b data-star-count>—</b></a>
      <button class="icon-btn menu-btn" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-nav" aria-label="${A('a11y.menu')}">${icon('menu', 'i-menu')}${icon('x', 'i-close')}</button>
    </div>
  </div>
</header>`;

  const englishNames = new Intl.DisplayNames(['en'], { type: 'language' });
  const popupLangName = (code) => (code === 'zh' ? 'Chinese (Simplified) · zh-Hans' : code === 'pt' ? 'Portuguese (Brazil) · pt-BR' : `${englishNames.of(code)} · ${code}`);
  const badgeCode = (code) => ({ zh: 'ZH-HANS', pt: 'PT-BR' }[code] || code.toUpperCase());
  // The mini extension popup. `live` adds the hooks the hero demo drives; the step visual uses the static copy.
  const popup = (live) => `<header><img src="${img('logo-64.webp')}" width="26" height="26" alt=""><div><b>Avorythm</b><small>${esc(tl('ui.tagline'))}</small></div></header>
            <div class="pp-status"><i class="dot"${live ? ' data-popup-dot' : ''}></i><b${live ? ' data-popup-status' : ''}>${esc(tl('ui.ready'))}</b><small${live ? ' data-popup-badge' : ''}>AUTO → ${badgeCode(live ? 'es' : lang)}</small></div>
            <div class="pp-field"><span>${esc(tl('ui.language'))}</span><div class="pp-select"${live ? ' data-popup-lang' : ''}>${esc(popupLangName(live ? 'es' : lang))}</div></div>
            <div class="pp-mode"><i></i><div><b>${esc(tl('ui.lowLatency'))}</b><small>${esc(tl('ui.lowLatencyHelp'))}</small></div></div>
            ${live ? '' : `<div class="pp-mode off"><i></i><div><b>${esc(tl('ui.synchronized'))}</b></div></div>`}
            <div class="pp-start"${live ? ' data-popup-start' : ''}><span class="play">▶</span><b${live ? ' data-popup-start-text' : ''}>${esc(tl('ui.start'))}</b>${live ? '<i class="cursor" aria-hidden="true"></i>' : ''}</div>`;
  const srcDemo = lang === 'ja' ? DEMO_SOURCES.ko : DEMO_SOURCES.ja;
  const stepVisual = (i) => {
    if (i === 0) {
      return `<figure class="step-visual sv-key" aria-hidden="true"><div class="sv-card">
        <div class="sv-title"><span class="sv-badge">01</span><b>${esc(tl('ui.connection'))}</b></div>
        <span class="sv-label">Gemini API Key</span>
        <div class="sv-input"><span dir="ltr">AIza••••••••••••••••••</span><em>${esc(tl('ui.saveKey'))}</em></div>
        <div class="sv-check"><i></i><span>${esc(tl('ui.consentTitle'))}</span></div>
      </div></figure>`;
    }
    if (i === 1) return `<figure class="step-visual sv-pop" aria-hidden="true"><aside class="demo-popup sv-popup">${popup(false)}</aside></figure>`;
    return `<figure class="step-visual sv-subs" aria-hidden="true">${scene().replace('demo-scene', 'sv-scene')}
      <div class="viz-eq mini">${Array.from({ length: 30 }, (_, k) => `<i style="--i:${k}"></i>`).join('')}</div>
      <div class="demo-sub"><p class="sub-src" lang="${srcDemo.name}" dir="ltr">${esc(srcDemo.text)}</p><p class="sub-dst" lang="${L.html}" dir="${L.dir}">${esc(L.demo)}</p></div></figure>`;
  };


  /* ------------------------------------------------------------------ hero */
  const demoChips = LANGUAGES.filter((l) => l.code !== 'ja').concat(LANGUAGES.filter((l) => l.code === 'ja'))
    .map((l) => `<button type="button" role="radio" aria-checked="false" data-demo-lang="${l.code}" lang="${l.html}" dir="${l.dir}">${esc(l.native)}</button>`).join('');

  const hero = `<section class="hero" id="top">
  <div class="hero-bg" aria-hidden="true"><i class="aurora a1"></i><i class="aurora a2"></i><i class="aurora a3"></i><canvas data-ambient></canvas><i class="grid"></i></div>
  <div class="container hero-inner">
    <a class="badge reveal" href="#download"><span class="badge-dot"></span>${T('hero.badge')}<span class="badge-sep"></span><span data-version>v${esc(version)}</span></a>
    <h1 class="reveal" style="--d:60ms">${T('hero.title')}</h1>
    <p class="lead reveal" style="--d:120ms">${T('hero.lead')}</p>
    <div class="cta-row reveal" style="--d:180ms">
      <a class="btn btn-primary btn-lg" href="${STORE_URL}" target="_blank" rel="noopener">${icon('googlechrome')}<span>${T('hero.ctaChrome')}</span></a>
      <a class="btn btn-glass btn-lg" href="#download">${icon('download')}<span>${T('hero.ctaDesktop')}</span></a>
      <a class="btn btn-ghost btn-lg" href="#videos" data-play-film>${icon('circle-play')}<span>${T('hero.ctaFilm')}</span></a>
    </div>
    <ul class="trust reveal" style="--d:240ms">
      <li>${icon('eye-off')}${T('hero.trustNoTracking')}</li>
      <li>${icon('key-round')}${T('hero.trustKeys')}</li>
      <li>${icon('languages')}${T('hero.trustLangs')}</li>
      <li>${icon('laptop')}${T('hero.trustPlatforms')}</li>
    </ul>

    <div class="demo reveal" id="demo" data-demo style="--d:300ms" role="group" aria-label="${A('demo.label')}">
      <div class="demo-halo" aria-hidden="true"></div>
      <div class="demo-frame">
        <div class="demo-chrome" aria-hidden="true">
          <span class="dots"><i></i><i></i><i></i></span>
          <span class="demo-url">${icon('lock')}${esc(t('demo.url'))}</span>
          <span class="demo-ext"><img src="${img('logo-64.webp')}" width="22" height="22" alt=""><i class="ping"></i></span>
        </div>
        <div class="demo-screen">
          ${scene()}
          <span class="demo-pill" data-demo-pill><i></i><b data-demo-pill-text>${T('demo.original')}</b></span>
          <canvas class="demo-wave" data-demo-wave aria-hidden="true"></canvas>
          <div class="demo-sub" aria-live="polite" aria-atomic="true">
            <p class="sub-src" lang="ja" dir="ltr" data-sub-src></p>
            <p class="sub-dst" data-sub-dst>${T('demo.waiting')}</p>
          </div>
          <aside class="demo-popup" aria-hidden="true">${popup(true)}</aside>
        </div>
        <div class="demo-controls">
          <button type="button" class="icon-btn" data-demo-replay aria-label="${A('demo.replay')}">${icon('refresh-cw')}</button>
          <div class="demo-progress" aria-hidden="true"><i data-demo-progress></i></div>
          <span class="demo-speaking" data-demo-speaking></span>
          <button type="button" class="btn btn-glass btn-sm" data-demo-sound aria-pressed="false"><span class="on">${icon('volume-2')}${T('demo.soundOn')}</span><span class="off">${icon('volume-x')}${T('demo.soundOff')}</span></button>
        </div>
      </div>
      <div class="demo-pick">
        <span class="demo-pick-label">${T('demo.chips')}</span>
        <div class="demo-chips" role="radiogroup" aria-label="${A('demo.chips')}">${demoChips}</div>
        <p class="demo-hint">${T('demo.hint')}</p>
      </div>
    </div>
  </div>
</section>`;

  /* ------------------------------------------------------------------ uses */
  const useIcons = ['graduation-cap', 'clapperboard', 'podcast', 'book-open', 'radio-tower', 'film', 'file-audio'];
  const uses = `<section class="uses" aria-label="${A('uses.label')}">
  <div class="container">
    <p class="uses-label">${T('uses.label')}</p>
    <ul class="uses-list">${list('uses.items').map((s, i) => `<li>${icon(useIcons[i % useIcons.length])}${rich(s)}</li>`).join('')}</ul>
  </div>
</section>`;

  /* -------------------------------------------------------------- features */
  const sec = (id, eyebrow, title, lead, body, cls = '') => `<section class="section ${cls}" id="${id}">
  <div class="container">
    <header class="section-head reveal">
      <p class="eyebrow">${eyebrow}</p>
      <h2>${title}</h2>
      ${lead ? `<p class="section-lead">${lead}</p>` : ''}
    </header>
    ${body}
  </div>
</section>`;


  const cap = LANGUAGES.filter((l) => l.code !== 'ja');
  const features = sec('features', T('features.eyebrow'), T('features.title'), T('features.lead'), `
    <div class="bento">
      <article class="card bento-dubbing reveal" data-spot>
        <div class="card-icon">${icon('audio-lines')}</div>
        <h3>${T('features.dubbing.title')}</h3><p>${T('features.dubbing.text')}</p>
        <div class="viz-eq" aria-hidden="true">${Array.from({ length: 36 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
      </article>
      <article class="card bento-captions reveal" style="--d:80ms" data-spot>
        <div class="card-icon">${icon('captions')}</div>
        <h3>${T('features.captions.title')}</h3><p>${T('features.captions.text')}</p>
        <div class="viz-caps" aria-hidden="true">
          ${cap.slice(0, 4).map((l, i) => `<div class="cap-pair" style="--i:${i}"><span class="cs" lang="ja" dir="ltr">ねえ、聞こえる？</span><span class="cd" lang="${l.html}" dir="${l.dir}">${esc(l.demo.split(/[?？؟。.!！]/)[0].trim())}</span></div>`).join('')}
        </div>
      </article>
      <article class="card bento-outputs reveal" data-spot>
        <div class="card-icon">${icon('layers')}</div>
        <h3>${T('features.outputs.title')}</h3><p>${T('features.outputs.text')}</p>
        <ul class="viz-outputs" aria-hidden="true">${list('features.outputs.labels').map((s, i) => `<li style="--i:${i}"><span>${rich(s)}</span><i class="switch"></i></li>`).join('')}</ul>
      </article>
      <article class="card bento-mixer reveal" style="--d:80ms" data-spot>
        <div class="card-icon">${icon('sliders-horizontal')}</div>
        <h3>${T('features.mixer.title')}</h3><p>${T('features.mixer.text')}</p>
        <div class="viz-mixer" aria-hidden="true">
          <div class="mix-row"><span>${T('features.mixer.original')}</span><i class="track"><b class="a"></b></i></div>
          <div class="mix-row"><span>${T('features.mixer.dub')}</span><i class="track"><b class="b"></b></i></div>
          <svg class="duck" viewBox="0 0 240 64" preserveAspectRatio="none"><path class="d-orig" d="M0 22 C30 22 40 22 52 40 S78 48 100 40 S126 22 160 22 S210 22 240 22"/><path class="d-dub" d="M0 52 C30 52 40 52 52 30 S78 18 100 28 S126 52 160 52 S210 52 240 52"/></svg>
        </div>
      </article>
      <article class="card bento-sync reveal" style="--d:160ms" data-spot>
        <div class="card-icon">${icon('square-play')}</div>
        <h3>${T('features.sync.title')}</h3><p>${T('features.sync.text')}</p>
        <div class="viz-sync" aria-hidden="true"><div class="sync-frame"><i class="sf-sun"></i><i class="sf-hill"></i><b class="sf-sub"></b><b class="sf-sub two"></b></div><div class="sync-bar"><i class="played"></i><i class="ahead"></i><i class="head"></i><span class="tag">${T('features.sync.ahead')}</span></div></div>
      </article>
      <article class="card bento-desktop reveal" data-spot>
        <div class="card-icon">${icon('monitor-play')}</div>
        <h3>${T('features.desktop.title')}</h3><p>${T('features.desktop.text')}</p>
        <div class="viz-os" aria-hidden="true"><div class="os-row">${icon('windows')}${icon('apple')}${icon('linux')}</div><ul class="out-files" dir="ltr"><li>${icon('file-audio')}original.wav</li><li>${icon('file-audio')}dubbed.wav</li><li>${icon('subtitles')}source.srt</li><li>${icon('subtitles')}translated.srt</li><li class="zip">${icon('file-archive')}all-outputs.zip</li></ul></div>
      </article>
      <article class="card bento-languages reveal" style="--d:80ms" data-spot>
        <div class="card-icon">${icon('languages')}</div>
        <h3>${T('features.languages.title')}</h3><p>${T('features.languages.text')}</p>
        <div class="viz-chips" aria-hidden="true">${['English', 'فارسی', 'العربية', '中文', 'Español', 'Русский', 'हिन्दी', '日本語', 'Türkçe', 'Français', 'Deutsch', '한국어', 'Português', 'Kiswahili'].map((s, i) => `<span style="--i:${i}">${s}</span>`).join('')}</div>
      </article>
      <article class="card bento-private reveal" data-spot>
        <div class="card-icon">${icon('shield-check')}</div>
        <h3>${T('features.private.title')}</h3><p>${T('features.private.text')}</p>
        <div class="viz-private" aria-hidden="true"><i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i><span>${icon('lock')}</span></div>
      </article>
      <article class="card bento-open reveal" style="--d:80ms" data-spot>
        <div class="card-icon">${icon('code-xml')}</div>
        <h3>${T('features.open.title')}</h3><p>${T('features.open.text')}</p>
        <div class="viz-code" aria-hidden="true"><code dir="ltr"><span class="k">MIT</span> License<br><span class="c">// read every line</span></code></div>
      </article>
    </div>`);

  /* ------------------------------------------------------------------- how */
  const how = sec('how', T('how.eyebrow'), T('how.title'), '', `
    <ol class="steps">
      ${list('how.steps').map((st, i) => `<li class="step reveal" style="--d:${i * 90}ms">
        <span class="step-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <h3>${rich(st.title)}</h3>
        <p>${rich(st.text)}</p>
        ${stepVisual(i)}
      </li>`).join('')}
    </ol>`);

  /* ---------------------------------------------------------------- videos */
  const videos = sec('videos', T('videos.eyebrow'), T('videos.title'), T('videos.lead'), `
    <div class="cinema reveal">
      <div class="cinema-main">
        <div class="player" data-player>
          <video playsinline preload="none" data-video></video>
          <div class="player-poster" data-poster></div>
          <button class="player-play" type="button" data-video-play aria-label="${A('videos.play')}"><span>${icon('play')}</span></button>
          <p class="player-soon" data-video-soon hidden>${T('videos.soon')}</p>
        </div>
        <div class="cinema-tools">
          <button type="button" class="btn btn-glass btn-sm" data-share-video>${icon('share-2')}${T('videos.share')}</button>
          <a class="btn btn-glass btn-sm" data-video-download href="#" download>${icon('download')}${T('videos.download')}</a>
          <span class="cinema-meta" data-video-meta></span>
        </div>
        <details class="transcript"><summary>${icon('scan-text')}${T('videos.transcript')}${icon('chevron-down', 'chev')}</summary><ol data-transcript></ol></details>
      </div>
      <div class="cinema-side">
        <div class="playlist" role="tablist" aria-label="${A('videos.eyebrow')}">
          ${VIDEO_KINDS.map((k, i) => `<button type="button" role="tab" class="pl-item" data-kind="${k}" aria-selected="${i === 0}"><span class="pl-thumb" data-thumb="${k}"></span><span class="pl-text"><b>${T(`videos.${k}`)}</b><small data-meta="${k}">${T(`videos.${k}Text`, { duration: '—' })}</small></span></button>`).join('')}
        </div>
        <div class="watch-in">
          <p>${T('videos.watchIn')}</p>
          <div class="pills" role="group" aria-label="${A('videos.watchIn')}">${LANGUAGES.map((l) => `<button type="button" class="pill" data-video-lang="${l.code}" lang="${l.html}" dir="${l.dir}" aria-pressed="false">${esc(l.native)}</button>`).join('')}</div>
        </div>
      </div>
    </div>`, 'videos');

  /* -------------------------------------------------------------- products */
  const products = sec('products', T('products.eyebrow'), T('products.title'), T('products.lead'), `
    <div class="duo">
      <article class="card product reveal" data-spot>
        <p class="tag">${icon('puzzle')}${T('products.extension.tag')}</p>
        <h3>${T('products.extension.title')}</h3>
        <p>${T('products.extension.text')}</p>
        <ul class="ticks">${list('products.extension.bullets').map((b) => `<li>${icon('check')}${rich(b)}</li>`).join('')}</ul>
        <a class="btn btn-primary" href="${STORE_URL}" target="_blank" rel="noopener">${icon('googlechrome')}${T('products.extension.cta')}</a>
        <figure class="product-shot ps-ext"><img src="${img(`shot-popup-${shot}.webp`)}" alt="" loading="lazy" decoding="async"></figure>
      </article>
      <article class="card product reveal" style="--d:100ms" data-spot>
        <p class="tag">${icon('monitor')}${T('products.desktop.tag')}</p>
        <h3>${T('products.desktop.title')}</h3>
        <p>${T('products.desktop.text')}</p>
        <ul class="ticks">${list('products.desktop.bullets').map((b) => `<li>${icon('check')}${rich(b)}</li>`).join('')}</ul>
        <a class="btn btn-glass" href="#download">${icon('download')}${T('products.desktop.cta')}</a>
        <figure class="product-shot ps-app"><img src="${img(`shot-app-${lang === 'fa' ? 'fa' : 'en'}.webp`)}" alt="" loading="lazy" decoding="async"></figure>
      </article>
    </div>`);

  /* ----------------------------------------------------------------- guide */
  const guideShots = {
    extension: [null, `settings-${shot}`, `popup-${shot}`, `subtitles-${shot}`, `outputs-${shot}`],
    desktop: [`app-${lang === 'fa' ? 'fa' : 'en'}`, `app-${lang === 'fa' ? 'fa' : 'en'}`, 'audio-routing', `app-${lang === 'fa' ? 'fa' : 'en'}`],
    files: [`app-${lang === 'fa' ? 'fa' : 'en'}`, `app-${lang === 'fa' ? 'fa' : 'en'}`, `app-${lang === 'fa' ? 'fa' : 'en'}`, `app-${lang === 'fa' ? 'fa' : 'en'}`],
  };
  const guideCode = { extension: [null, null, null, null, null], desktop: [null, null, null, null], files: [null, null, null, null] };
  const guidePane = (kind, active) => `<div class="guide-pane" role="tabpanel" id="guide-${kind}" data-guide-pane="${kind}"${active ? '' : ' hidden'}>
      <ol class="guide-steps">${list(`guide.${kind}`).map((s, i) => `<li class="gstep${i === 0 ? ' active' : ''}" data-shot="${guideShots[kind][i] || ''}">
        <button type="button" class="gstep-head" aria-expanded="${i === 0}"><span class="gnum">${i + 1}</span><b>${rich(s.title)}</b></button>
        <div class="gstep-body"><p>${rich(s.text)}</p>${guideCode[kind][i] ? `<button type="button" class="copy-chip" data-copy="${guideCode[kind][i]}"><code dir="ltr">${guideCode[kind][i]}</code>${icon('copy')}<span>${T('guide.copy')}</span></button>` : ''}</div>
      </li>`).join('')}</ol>
      <div class="guide-preview" aria-hidden="true"><div class="preview-frame" data-preview></div></div>
    </div>`;
  const guideDocs = `${REPO_URL}/blob/main/docs/${L.guide}`;
  const guide = sec('guide', T('guide.eyebrow'), T('guide.title'), T('guide.lead'), `
    <div class="guide reveal" data-guide>
      <div class="tabs" role="tablist">
        ${['extension', 'desktop', 'files'].map((k, i) => `<button type="button" role="tab" id="tab-${k}" aria-controls="guide-${k}" aria-selected="${i === 0}" data-guide-tab="${k}">${icon(['puzzle', 'monitor', 'file-video'][i])}${T(`guide.tabs.${k}`)}</button>`).join('')}
      </div>
      ${['extension', 'desktop', 'files'].map((k, i) => guidePane(k, i === 0)).join('')}
      <p class="guide-links"><a href="${guideDocs}" target="_blank" rel="noopener">${icon('book-open')}${T('guide.fullGuide')}</a><a href="${REPO_URL}/blob/main/docs/INSTALLATION.md" target="_blank" rel="noopener">${icon('terminal')}${T('guide.installGuide')}</a></p>
    </div>`, 'guide-section');

  /* ------------------------------------------------------------- languages */
  const names = TARGET_LANGUAGES.map((c) => ({ c, n: endonym(c === 'zh-Hans' ? 'zh-Hans' : c) }));
  const half = Math.ceil(names.length / 2);
  const chipRow = (arr) => arr.map(({ c, n }) => `<li lang="${c}"><span>${esc(n)}</span><small>${c}</small></li>`).join('');
  const languages = `<section class="section languages" id="languages">
  <div class="container">
    <header class="section-head reveal">
      <p class="eyebrow">${T('languages.eyebrow')}</p>
      <h2>${T('languages.title')}</h2>
      <p class="section-lead">${T('languages.lead')}</p>
    </header>
  </div>
  <div class="marquee reveal" aria-hidden="true">
    <ul class="marquee-row">${chipRow(names.slice(0, half))}${chipRow(names.slice(0, half))}</ul>
    <ul class="marquee-row rev">${chipRow(names.slice(half))}${chipRow(names.slice(half))}</ul>
  </div>
  <ul class="sr-only">${names.map(({ n }) => `<li>${esc(n)}</li>`).join('')}</ul>
  <div class="container"><p class="languages-note">${T('languages.ui')}</p></div>
</section>`;

  /* --------------------------------------------------------------- privacy */
  const privacyIcons = ['eye-off', 'key-round', 'send', 'badge-check', 'code-xml'];
  const privacy = sec('privacy', T('privacy.eyebrow'), T('privacy.title'), T('privacy.lead'), `
    <div class="privacy">
      <ul class="privacy-list">${list('privacy.items').map((it, i) => `<li class="reveal" style="--d:${i * 60}ms"><span class="pi">${icon(privacyIcons[i])}</span><div><h3>${rich(it.title)}</h3><p>${rich(it.text)}</p></div></li>`).join('')}</ul>
      <div class="flow card reveal" aria-hidden="true">
        <div class="flow-node"><span>${icon('laptop')}</span><b>${T('privacy.diagram.you')}</b></div>
        <div class="flow-line"><i></i><i></i><i></i><em>${T('privacy.diagram.audio')}</em></div>
        <div class="flow-node accent"><span>${icon('sparkles')}</span><b>${T('privacy.diagram.provider')}</b></div>
        <div class="flow-ours"><span>${icon('server-off')}</span><b>${T('privacy.diagram.ours')}</b><small>${T('privacy.diagram.none')}</small></div>
      </div>
    </div>
    <p class="note reveal">${icon('triangle-alert')}<span>${T('privacy.note')} <a href="${REPO_URL}/blob/main/PRIVACY.md" target="_blank" rel="noopener">${T('privacy.policy')}</a></span></p>`);

  /* -------------------------------------------------------------- download */
  const dl = (name) => `${RELEASE}/${name}`;
  const download = sec('download', T('download.eyebrow'), T('download.title'), T('download.lead'), `
    <div class="downloads">
      <article class="card dl dl-chrome reveal" data-os="chrome" data-spot>
        <div class="dl-icon">${icon('googlechrome')}</div>
        <div class="dl-text"><h3>${T('download.chrome.title')}</h3><p>${T('download.chrome.text')}</p></div>
        <a class="btn btn-primary btn-lg" href="${STORE_URL}" target="_blank" rel="noopener">${icon('googlechrome')}${T('download.chrome.cta')}</a>
      </article>
      <article class="card dl reveal" style="--d:60ms" data-os="windows" data-spot>
        <div class="dl-icon">${icon('windows')}</div>
        <h3>${T('download.windows.title')}</h3><p>${T('download.windows.text')}</p>
        <div class="dl-btns"><a class="btn btn-glass" href="${dl('Avorythm-Setup-x64-unsigned.exe')}" rel="noopener">${icon('download')}${T('download.windows.cta')}<small data-size="Avorythm-Setup-x64-unsigned.exe"></small></a>
        <a class="btn btn-ghost btn-sm" href="${dl('Avorythm-Windows-x64.zip')}" rel="noopener">${T('download.windows.ctaZip')}<small data-size="Avorythm-Windows-x64.zip"></small></a></div>
      </article>
      <article class="card dl reveal" style="--d:120ms" data-os="mac" data-spot>
        <div class="dl-icon">${icon('apple')}</div>
        <h3>${T('download.mac.title')}</h3><p>${T('download.mac.text')}</p>
        <div class="dl-btns"><a class="btn btn-glass" href="${dl('Avorythm-Darwin-arm64.zip')}" rel="noopener">${icon('download')}${T('download.mac.ctaArm')}<small data-size="Avorythm-Darwin-arm64.zip"></small></a>
        <a class="btn btn-ghost btn-sm" href="${dl('Avorythm-Darwin-x64.zip')}" rel="noopener">${T('download.mac.ctaIntel')}<small data-size="Avorythm-Darwin-x64.zip"></small></a></div>
      </article>
      <article class="card dl reveal" style="--d:180ms" data-os="linux" data-spot>
        <div class="dl-icon">${icon('linux')}</div>
        <h3>${T('download.linux.title')}</h3><p>${T('download.linux.text')}</p>
        <div class="dl-btns"><a class="btn btn-glass" href="${dl('Avorythm-Linux-x64.zip')}" rel="noopener">${icon('download')}${T('download.linux.cta')}<small data-size="Avorythm-Linux-x64.zip"></small></a></div>
      </article>
      <article class="card dl reveal" style="--d:240ms" data-os="zip" data-spot>
        <div class="dl-icon">${icon('package-open')}</div>
        <h3>${T('download.zip.title')}</h3><p>${T('download.zip.text')}</p>
        <div class="dl-btns"><a class="btn btn-glass" href="${dl('Avorythm-Extension.zip')}" rel="noopener">${icon('download')}${T('download.zip.cta')}<small data-size="Avorythm-Extension.zip"></small></a></div>
      </article>
    </div>
    <p class="note reveal">${icon('info')}<span>${T('download.unsigned')}</span></p>
    <p class="dl-links reveal"><span data-release-label>${T('download.version', { version: esc(version) })}</span><a href="${dl('SHA256SUMS.txt')}" rel="noopener">${icon('fingerprint')}${T('download.checksums')}</a><a href="${REPO_URL}/releases" target="_blank" rel="noopener">${icon('git-fork')}${T('download.all')}</a><a href="${REPO_URL}/blob/main/CHANGELOG.md" target="_blank" rel="noopener">${icon('clock')}${T('download.changelog')}</a></p>`);

  /* ------------------------------------------------------------------- faq */
  const faq = sec('faq', T('faq.eyebrow'), T('faq.title'), '', `
    <div class="faq">${list('faq.items').map((it, i) => `<details class="reveal" style="--d:${(i % 2) * 70}ms"${i === 0 ? ' open' : ''}><summary><span>${rich(it.q)}</span>${icon('plus', 'plus')}</summary><p>${rich(it.a)}</p></details>`).join('')}</div>`);

  /* ----------------------------------------------------------------- share */
  const networks = [
    ['telegram', 'Telegram'], ['whatsapp', 'WhatsApp'], ['x', 'X'], ['linkedin', 'LinkedIn'], ['facebook', 'Facebook'], ['reddit', 'Reddit'],
    ['vk', 'VK'], ['sinaweibo', 'Weibo'], ['line', 'LINE'], ['bluesky', 'Bluesky'], ['threads', 'Threads'], ['mastodon', 'Mastodon'], ['gmail', 'Email'],
  ];
  const share = sec('share', T('share.eyebrow'), T('share.title'), T('share.lead'), `
    <div class="share-grid">
      <article class="card starcard reveal" data-spot>
        <div class="starburst" aria-hidden="true">${icon('star')}<i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="starcard-text"><h3>${T('share.star.title')}</h3><p>${T('share.star.text')}</p></div>
        <div class="starstats"><div><b data-star-count>—</b><span>${T('share.star.stars')}</span></div><div><b data-fork-count>—</b><span>${T('share.star.forks')}</span></div></div>
        <a class="btn btn-primary btn-lg" href="${REPO_URL}" target="_blank" rel="noopener" data-star-open>${icon('star')}${T('share.star.cta')}</a>
      </article>
      <article class="card composer reveal" style="--d:100ms" data-spot data-composer>
        <div class="composer-left">
          <h3>${T('share.post.title')}</h3>
          <p>${T('share.post.text')}</p>
          <div class="composer-video">
            <div class="composer-poster" data-composer-poster></div>
            <div class="composer-pick">
              <label>${T('share.post.video')}</label>
              <div class="seg" role="group">${VIDEO_KINDS.map((k, i) => `<button type="button" class="seg-btn" data-composer-kind="${k}" aria-pressed="${i === 0}">${T(`videos.${k}`)}</button>`).join('')}</div>
              <label for="composer-lang">${T('videos.watchIn')}</label>
              <select id="composer-lang" class="select" data-composer-lang>${LANGUAGES.map((l) => `<option value="${l.code}" lang="${l.html}">${esc(l.native)}</option>`).join('')}</select>
            </div>
          </div>
          <label for="composer-text" class="composer-label">${T('share.post.message')}</label>
          <textarea id="composer-text" rows="4" data-composer-text spellcheck="true"></textarea>
          <div class="composer-main">
            <button type="button" class="btn btn-primary" data-composer-native>${icon('share-2')}<span data-composer-native-label>${T('share.post.native')}</span></button>
            <a class="btn btn-glass" data-composer-download href="#" download>${icon('download')}${T('share.post.download')}</a>
            <button type="button" class="btn btn-glass" data-composer-copy-text>${icon('copy')}${T('share.post.copyText')}</button>
            <button type="button" class="btn btn-glass" data-composer-copy-link>${icon('link')}${T('share.post.copyLink')}</button>
          </div>
        </div>
        <div class="composer-right">
          <p class="composer-or">${T('share.post.networks')}</p>
          <ul class="networks">${networks.map(([id, label]) => `<li><a class="net net-${id}" href="#" target="_blank" rel="noopener" data-net="${id}" aria-label="${attr(label)}" title="${attr(label)}">${icon(id)}<span>${esc(label)}</span></a></li>`).join('')}</ul>
          <p class="composer-tip">${icon('info')}<span>${T('share.post.tip')}</span></p>
          <div class="composer-qr"><canvas width="120" height="120" data-qr aria-label="${A('share.post.qr')}"></canvas><span>${T('share.post.qr')}</span></div>
        </div>
      </article>
    </div>
    <div class="star-modal" data-star-modal hidden role="dialog" aria-modal="true" aria-labelledby="star-modal-title">
      <div class="star-modal-card">
        <button type="button" class="icon-btn modal-close" data-star-close aria-label="${A('a11y.closeMenu')}">${icon('x')}</button>
        <div class="starburst big" aria-hidden="true">${icon('star')}<i></i><i></i><i></i><i></i><i></i><i></i></div>
        <h3 id="star-modal-title">${T('share.star.modalTitle')}</h3>
        <ol><li>${T('share.star.modalStep1')}</li><li>${T('share.star.modalStep2')}</li></ol>
        <div class="gh-mock" aria-hidden="true"><span class="gh-repo">msmahdinejad / <b>avorythm</b></span><span class="gh-btn">${icon('star')} Star <em data-star-count>—</em></span></div>
        <p class="thanks">${T('share.star.modalThanks')}</p>
        <div class="modal-actions"><a class="btn btn-glass" href="${REPO_URL}" target="_blank" rel="noopener">${icon('external-link')}${T('share.star.modalOpen')}</a><button type="button" class="btn btn-primary" data-star-close>${T('share.star.modalClose')}</button></div>
      </div>
    </div>`, 'share-section');

  /* ---------------------------------------------------------------- footer */
  const footerLink = (url, key, ic) => `<li><a href="${url}" target="_blank" rel="noopener">${ic ? icon(ic) : ''}${T(key)}</a></li>`;
  const footer = `<footer class="site-footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <a class="brand" href="#top"><img src="${img('logo-128.webp')}" width="38" height="38" alt=""><span>Avorythm</span></a>
        <p>${T('footer.tagline')}</p>
        <a class="star-pill" href="${REPO_URL}" target="_blank" rel="noopener" data-star-open>${icon('star')}<span>${T('header.star')}</span><b data-star-count>—</b></a>
      </div>
      <nav class="footer-col" aria-label="${A('footer.product')}"><h4>${T('footer.product')}</h4><ul>
        <li><a href="#features">${T('nav.features')}</a></li><li><a href="#videos">${T('nav.videos')}</a></li><li><a href="#guide">${T('nav.guide')}</a></li><li><a href="#download">${T('nav.download')}</a></li><li><a href="#faq">${T('nav.faq')}</a></li></ul></nav>
      <nav class="footer-col" aria-label="${A('footer.resources')}"><h4>${T('footer.resources')}</h4><ul>
        ${footerLink(`${REPO_URL}/blob/main/docs/${L.guide}`, 'footer.links.guide')}
        ${footerLink(`${REPO_URL}/blob/main/docs/INSTALLATION.md`, 'footer.links.install')}
        ${footerLink(`${REPO_URL}/blob/main/PRIVACY.md`, 'footer.links.privacy')}
        ${footerLink(`${REPO_URL}/blob/main/SECURITY.md`, 'footer.links.security')}
        ${footerLink(`${REPO_URL}/releases`, 'footer.links.releases')}</ul></nav>
      <nav class="footer-col" aria-label="${A('footer.project')}"><h4>${T('footer.project')}</h4><ul>
        ${footerLink(REPO_URL, 'footer.links.github')}
        ${footerLink(`${REPO_URL}/issues`, 'footer.links.issues')}
        ${footerLink(`${REPO_URL}/blob/main/CONTRIBUTING.md`, 'footer.links.contributing')}
        ${footerLink(`${REPO_URL}/blob/main/ROADMAP.md`, 'footer.links.roadmap')}
        ${footerLink(`${REPO_URL}/blob/main/LICENSE`, 'footer.links.license')}</ul></nav>
    </div>
    <ul class="footer-langs" aria-label="${A('a11y.language')}">${LANGUAGES.map((l) => `<li><a href="${toLang(l.code)}" hreflang="${l.html}" lang="${l.html}" data-switch-lang="${l.code}"${l.code === lang ? ' aria-current="true"' : ''}>${esc(l.native)}</a></li>`).join('')}</ul>
    <div class="footer-bottom">
      <p>${T('footer.legal')}</p>
      <p>${TH('footer.made', { author: '<a href="https://github.com/msmahdinejad" target="_blank" rel="noopener">Mohammad Saleh Mahdinejad</a>' })} · ${T('footer.noTracking')}</p>
    </div>
  </div>
</footer>
<button class="to-top" type="button" data-to-top aria-label="${A('a11y.up')}">${icon('arrow-up')}</button>
<div class="toast" data-toast role="status" aria-live="polite" hidden></div>
<div class="lang-banner" data-lang-banner hidden><span data-lang-banner-text></span><a class="btn btn-primary btn-sm" data-lang-banner-link href="#">${T('client.switch')}</a><button type="button" class="icon-btn" data-lang-banner-close aria-label="${A('client.dismiss')}">${icon('x')}</button></div>`;

  /* ------------------------------------------------------------ client data */
  const appData = {
    lang,
    dir: L.dir,
    base,
    repo: REPO,
    site: SITE_URL,
    store: STORE_URL,
    version,
    languages: LANGUAGES.map((l) => ({ code: l.code, html: l.html, native: l.native, dir: l.dir, demo: l.demo, url: pageUrl(l.code) })),
    demoSources: DEMO_SOURCES,
    manifest: manifest || null,
    msg: {
      copied: tl('client.copied'),
      copyFailed: tl('client.copyFailed'),
      langSwitch: tl('client.langSwitch'),
      starsLabel: tl('client.starsLabel'),
      latest: tl('client.latest'),
      version: tl('download.version'),
      filmText: tl('videos.filmText'),
      demoText: tl('videos.demoText'),
      tutorialText: tl('videos.tutorialText'),
      english: tl('videos.english'),
      soon: tl('videos.soon'),
      recommended: tl('download.recommended'),
      preparing: tl('share.post.preparing'),
      shareFailed: tl('share.post.failed'),
      native: tl('share.post.native'),
      nativeFile: tl('share.post.nativeFile'),
      copiedShort: tl('share.post.copied'),
      spokenIn: tl('demo.spokenIn'),
      ready: tl('ui.ready'),
      connected: tl('ui.connected'),
      start: tl('ui.start'),
      stop: tl('ui.stop'),
      original: tl('demo.original'),
      dubbed: tl('demo.dubbed'),
    },
    share: { text: tl('share.text'), hashtags: tl('share.hashtags'), title: tl('meta.ogTitle') },
    shareTexts,
  };

  const body = `<body>
${header}
<main id="main">
${hero}
${uses}
${features}
${how}
${videos}
${products}
${guide}
${languages}
${privacy}
${download}
${faq}
${share}
</main>
${footer}
${sprite()}
<script type="application/json" id="avo-data">${JSON.stringify(appData).replace(/</g, '\\u003c')}</script>
<script src="${base}assets/app.js?v=${assetHash.js}" defer></script>
</body>
</html>
`;
  return head + '\n' + body;
}

function fontPreloads(lang, base) {
  const f = (file) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${base}assets/fonts/${file}">`;
  const out = [f('inter-latin-wght-normal.woff2')];
  if (lang === 'ru') out.push(f('inter-cyrillic-wght-normal.woff2'));
  if (lang === 'fa' || lang === 'ar') out.push(f('vazirmatn-arabic-wght-normal.woff2'));
  if (lang === 'hi') out.push(f('noto-sans-devanagari-devanagari-wght-normal.woff2'));
  return out.join('\n');
}

function scene() {
  return `<svg class="demo-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f2a4a"/><stop offset=".55" stop-color="#2f5d7c"/><stop offset="1" stop-color="#5b8fa3"/></linearGradient>
      <radialGradient id="moonGlow"><stop offset="0" stop-color="#f3e3b8" stop-opacity=".55"/><stop offset="1" stop-color="#f3e3b8" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#sky)"/>
    <circle cx="1240" cy="230" r="220" fill="url(#moonGlow)"/>
    <circle cx="1240" cy="230" r="86" fill="#ead8ab"/>
    <path d="M0 540C190 450 380 410 620 500S990 530 1190 420 1480 450 1600 500V900H0Z" fill="#3d5f77"/>
    <path d="M0 650C180 560 360 600 520 640S860 700 1040 620 1400 560 1600 640V900H0Z" fill="#285468"/>
    <path d="M0 745C220 665 420 705 640 765S1020 800 1220 720 1500 700 1600 745V900H0Z" fill="#164459"/>
    <path d="M0 835C300 795 700 865 1000 825S1450 805 1600 835V900H0Z" fill="#0b2f40"/>
  </svg>`;
}

export function renderNotFound({ t, tl, assetHash, version }) {
  const { icon, sprite } = createIcons();
  return `<!doctype html>
<html lang="en" dir="ltr" data-theme="dark">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t('notFound.title'))} · Avorythm</title>
<meta name="robots" content="noindex">
<link rel="icon" type="image/svg+xml" href="${SITE_URL}assets/img/favicon.svg">
<link rel="stylesheet" href="${SITE_URL}assets/site.css?v=${assetHash.css}">
<script>try{var d=document.documentElement,s=localStorage.getItem('avorythm.theme');d.dataset.theme=s||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}catch(e){}</script>
</head>
<body class="notfound">
<div class="hero-bg" aria-hidden="true"><i class="aurora a1"></i><i class="aurora a2"></i><i class="grid"></i></div>
<main class="nf">
  <img src="${SITE_URL}assets/img/logo-256.webp" width="96" height="96" alt="Avorythm">
  <p class="nf-code">404</p>
  <h1>${esc(t('notFound.title'))}</h1>
  <p>${esc(t('notFound.text'))}</p>
  <a class="btn btn-primary btn-lg" href="${SITE_URL}">${icon('arrow-right')}${esc(t('notFound.home'))}</a>
</main>
${sprite()}
</body>
</html>
`;
}
