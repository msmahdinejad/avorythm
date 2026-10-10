/* Shared helpers. Every file in this folder is concatenated into one IIFE by build.mjs. */
const AVO = JSON.parse(document.getElementById('avo-data').textContent);
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage may be blocked */ } },
};
const fmt = (text, vars = {}) => String(text).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const langInfo = (code) => AVO.languages.find((l) => l.code === code);
const numberFormat = new Intl.NumberFormat(AVO.lang === 'zh' ? 'zh-CN' : AVO.lang);
const displayName = (() => {
  try { return new Intl.DisplayNames([AVO.lang === 'zh' ? 'zh-Hans' : AVO.lang], { type: 'language' }); } catch { return null; }
})();

let toastTimer;
function toast(message) {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0;inset-block-start:0';
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

function onVisible(el, callback, options = { threshold: 0.12 }) {
  if (!('IntersectionObserver' in window)) { callback(true); return; }
  new IntersectionObserver((entries) => entries.forEach((entry) => callback(entry.isIntersecting)), options).observe(el);
}
