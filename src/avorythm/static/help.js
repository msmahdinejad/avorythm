let locale = localStorage.getItem('avorythm.locale') || 'en';
const render = () => {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-en]').forEach((node) => { node.textContent = node.dataset[locale]; });
  document.querySelectorAll('[data-en-src]').forEach((node) => { node.src = node.dataset[`${locale}Src`]; });
  document.querySelector('#localeToggle').textContent = locale === 'fa' ? 'EN' : 'فا';
};
document.querySelector('#localeToggle').addEventListener('click', () => {
  locale = locale === 'fa' ? 'en' : 'fa';
  localStorage.setItem('avorythm.locale', locale);
  render();
});
render();
