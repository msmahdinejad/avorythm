/* Live GitHub numbers (stars, forks, latest release), OS-aware download highlight, and the Star guide. */
(() => {
  const CACHE_KEY = 'avorythm.gh.v2';
  const api = (path) => fetch(`https://api.github.com/repos/${AVO.repo}${path}`, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });

  function countUp(el, to) {
    if (reduceMotion || !Number.isFinite(to)) { el.textContent = numberFormat.format(to); return; }
    const from = 0;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 1100);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = numberFormat.format(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const size = (bytes) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`);

  function apply(info) {
    $$('[data-star-count]').forEach((el) => countUp(el, info.stars));
    $$('[data-fork-count]').forEach((el) => countUp(el, info.forks));
    if (info.tag) {
      const v = info.tag.replace(/^v/, '');
      $$('[data-version]').forEach((el) => { el.textContent = `v${v}`; });
      $$('[data-release-label]').forEach((el) => { el.textContent = fmt(AVO.msg.version, { version: v }); });
    }
    (info.assets || []).forEach((asset) => $$(`[data-size="${asset.name}"]`).forEach((el) => { el.textContent = size(asset.size); }));
  }

  async function load() {
    let cached = null;
    try { cached = JSON.parse(store.get(CACHE_KEY) || 'null'); } catch { cached = null; }
    if (cached) apply(cached.v);
    if (cached && Date.now() - cached.t < 30 * 60 * 1000) return;
    try {
      const [repo, release] = await Promise.all([api(''), api('/releases/latest')]);
      const info = { stars: repo.stargazers_count, forks: repo.forks_count, tag: release.tag_name, assets: release.assets.map((a) => ({ name: a.name, size: a.size })) };
      store.set(CACHE_KEY, JSON.stringify({ t: Date.now(), v: info }));
      apply(info);
    } catch { /* offline or rate limited: keep the static fallback */ }
  }
  load();

  // Recommend the right download for this device
  const uaData = navigator.userAgentData;
  const platform = `${uaData?.platform || ''} ${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
  const os = /android|iphone|ipad|ipod/.test(platform) ? 'mobile' : /win/.test(platform) ? 'windows' : /mac/.test(platform) ? 'mac' : /linux|cros|x11/.test(platform) ? 'linux' : '';
  if (os && os !== 'mobile') {
    const card = $(`.dl[data-os="${os}"]`);
    if (card) { card.classList.add('recommended'); card.dataset.reco = AVO.msg.recommended; }
  }

  // Star: GitHub cannot be starred from another site without OAuth, so open the repo and guide the last click
  const modal = $('[data-star-modal]');
  if (modal) {
    let lastFocus = null;
    const close = () => { modal.hidden = true; document.body.style.overflow = ''; lastFocus?.focus?.(); };
    $$('[data-star-open]').forEach((link) => link.addEventListener('click', () => {
      lastFocus = link;
      setTimeout(() => { modal.hidden = false; document.body.style.overflow = 'hidden'; $('[data-star-close]', modal)?.focus(); }, 650);
    }));
    $$('[data-star-close]', modal).forEach((btn) => btn.addEventListener('click', close));
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
  }
})();
