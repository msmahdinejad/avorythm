// Languages the site is published in. `code` is the URL segment (English lives at the site root).
// `demo` is the line the hero demo "dubs" into this language; the same sentence is spoken in the intro film.
export const LANGUAGES = [
  { code: 'en', html: 'en', dir: 'ltr', native: 'English', locale: 'en_US', guide: 'HELP.md', readme: 'README.md',
    demo: 'Hey, can you hear me? Do you understand what I’m saying?' },
  { code: 'fa', html: 'fa', dir: 'rtl', native: 'فارسی', locale: 'fa_IR', guide: 'HELP.fa.md', readme: 'README.fa.md',
    demo: 'هی، صدای منو می‌شنوی؟ می‌فهمی چی می‌گم؟' },
  { code: 'ru', html: 'ru', dir: 'ltr', native: 'Русский', locale: 'ru_RU', guide: 'HELP.ru.md', readme: 'README.ru.md',
    demo: 'Эй, ты меня слышишь? Ты понимаешь, что я говорю?' },
  { code: 'ar', html: 'ar', dir: 'rtl', native: 'العربية', locale: 'ar_AR', guide: 'HELP.ar.md', readme: 'README.ar.md',
    demo: 'هل تسمعني؟ هل تفهم ما أقوله لك؟' },
  { code: 'zh', html: 'zh-Hans', dir: 'ltr', native: '简体中文', locale: 'zh_CN', guide: 'HELP.zh-CN.md', readme: 'README.zh-CN.md',
    demo: '喂，你听得见我吗？你听得懂我在说什么吗？' },
  { code: 'hi', html: 'hi', dir: 'ltr', native: 'हिन्दी', locale: 'hi_IN', guide: 'HELP.md', readme: 'README.md',
    demo: 'अरे, क्या तुम मुझे सुन सकते हो? क्या तुम समझ रहे हो कि मैं क्या कह रहा हूँ?' },
  { code: 'es', html: 'es', dir: 'ltr', native: 'Español', locale: 'es_ES', guide: 'HELP.md', readme: 'README.md',
    demo: 'Oye, ¿me escuchas? ¿Entiendes lo que te estoy diciendo?' },
  { code: 'pt', html: 'pt-BR', dir: 'ltr', native: 'Português', locale: 'pt_BR', guide: 'HELP.md', readme: 'README.md',
    demo: 'Ei, você está me ouvindo? Você entende o que estou dizendo?' },
  { code: 'fr', html: 'fr', dir: 'ltr', native: 'Français', locale: 'fr_FR', guide: 'HELP.md', readme: 'README.fr.md',
    demo: 'Dis, tu m’entends ? Tu comprends ce que je te dis ?' },
  { code: 'de', html: 'de', dir: 'ltr', native: 'Deutsch', locale: 'de_DE', guide: 'HELP.md', readme: 'README.de.md',
    demo: 'Hey, hörst du mich? Verstehst du, was ich sage?' },
  { code: 'tr', html: 'tr', dir: 'ltr', native: 'Türkçe', locale: 'tr_TR', guide: 'HELP.md', readme: 'README.md',
    demo: 'Hey, beni duyuyor musun? Ne dediğimi anlıyor musun?' },
  { code: 'ja', html: 'ja', dir: 'ltr', native: '日本語', locale: 'ja_JP', guide: 'HELP.md', readme: 'README.md',
    demo: 'ねえ、聞こえる？ 私の言ってること、わかる？' },
];

// The voice that "speaks" in the demo before translation starts. Japanese by default; Korean when the target is Japanese.
export const DEMO_SOURCES = {
  ja: { name: 'ja', text: 'ねえ、聞こえる？ 私の言ってること、わかる？' },
  ko: { name: 'ko', text: '저기, 내 말 들려? 내가 하는 말 알아들어?' },
};

// All 79 destination languages the extension and desktop app offer (extension/core.mjs).
export const TARGET_LANGUAGES = [
  'en', 'fa', 'ar', 'zh-Hans', 'zh-Hant', 'de', 'fr', 'it', 'es', 'ru', 'ja', 'ko', 'tr', 'pt-BR', 'pt-PT', 'nl', 'pl', 'uk', 'hi', 'ur', 'he', 'id', 'ms', 'vi', 'th',
  'af', 'ak', 'sq', 'am', 'hy', 'az', 'eu', 'be', 'bn', 'bg', 'my', 'ca', 'hr', 'cs', 'da', 'et', 'fil', 'fi', 'gl', 'ka', 'el', 'gu', 'ha', 'hu', 'is', 'jv', 'kn', 'kk', 'km', 'rw', 'lo', 'lv', 'lt', 'mk', 'ml', 'mr', 'mn', 'ne', 'no', 'nb', 'pa', 'ro', 'sr', 'sd', 'si', 'sk', 'sl', 'su', 'sw', 'sv', 'ta', 'te', 'uz', 'zu',
];

export const REPO = 'msmahdinejad/avorythm';
export const REPO_URL = `https://github.com/${REPO}`;
export const STORE_URL = 'https://chromewebstore.google.com/detail/avorythm-live-translation/kbdbbedijheicmmnmoidamdaodjbhjje';
export const SITE_URL = (process.env.SITE_URL || 'https://msmahdinejad.github.io/avorythm/').replace(/\/?$/, '/');

export function endonym(code) {
  try {
    const bcp = code === 'fil' ? 'fil' : code;
    const name = new Intl.DisplayNames([bcp], { type: 'language' }).of(bcp);
    return name ? name.charAt(0).toLocaleUpperCase(bcp) + name.slice(1) : code;
  } catch {
    return code;
  }
}
