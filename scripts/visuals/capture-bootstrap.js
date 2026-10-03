// Marketing-only adapter: actual shipped HTML/CSS/JS, synthetic demo state.
// No API keys, provider requests, user tabs, or personal media are accessed.
(() => {
  const locale = new URLSearchParams(location.search).get('locale') || 'en';
  const target = locale === 'fa' ? 'fa' : locale === 'zh-Hans' ? 'zh-Hans' : 'es';
  const settings = {
    locale, targetLanguage: target, consentVersion: 1, groqAudioConsentVersion: 1,
    playbackMode: 'synchronized', syncBufferSeconds: 8, syncCaptionEngine: 'gemini',
    onPageOutput: {originalAudioEnabled: true, dubAudioEnabled: true,
      sourceSubtitlesEnabled: true, translatedSubtitlesEnabled: true,
      originalVolume: .25, dubVolume: 1, autoDuck: true},
    synchronizedOutput: {originalAudioEnabled: false, dubAudioEnabled: true,
      sourceSubtitlesEnabled: true, translatedSubtitlesEnabled: true,
      originalVolume: .25, dubVolume: 1, autoDuck: true},
    subtitlePosition: 'bottom-center', subtitleWidth: 760,
    subtitleFontSize: 30, subtitleOpacity: 88, recording: false,
  };
  const translation = locale === 'fa' ? 'هر مسیر تازه، داستان تازه‌ای دارد.'
    : locale === 'zh-Hans' ? '每一段新的旅程，都有新的故事。'
    : 'Cada nuevo camino cuenta una historia.';
  const listeners = [];
  globalThis.chrome = {
    storage: {
      local: {async get() { return {settings}; }, async set() {}},
      session: {async get() { return {}; }, async set() {}},
    },
    permissions: {async contains() { return true; }, async request() { return true; }},
    runtime: {
      getURL: path => new URL('/extension/' + path, location.origin).href,
      onMessage: {addListener: fn => listeners.push(fn)},
      async openOptionsPage() {},
      async sendMessage(message) {
        if (message.type === 'bootstrap') {
          const {LANGUAGES} = await import('/extension/core.mjs');
          return {ok: true, data: {settings, languages: LANGUAGES,
            api_key_set: true, groq_api_key_set: false, groq_permission_granted: true,
            key_persistence: {gemini: false, groq: false}}};
        }
        return {ok: true, state: {active: false, status: 'idle', error: '',
          sourceLanguage: 'en', sourceTitle: 'Coastlines · A new perspective',
          recordingReady: false}};
      },
    },
  };
  globalThis.marketingDemo = {settings, translation,
    source: 'Every new path tells a new story.',
    send: message => listeners.forEach(fn => fn(message, {}, () => {}))};
  localStorage.setItem('avorythm.locale', locale);
})();
