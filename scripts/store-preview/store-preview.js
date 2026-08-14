const previewParams = new URLSearchParams(location.search);
const previewLocale = previewParams.get('locale') === 'en' ? 'en' : 'fa';
document.title = `Lingora preview · ${previewLocale}`;
document.documentElement.lang = previewLocale;
document.documentElement.dir = previewLocale === 'fa' ? 'rtl' : 'ltr';

const reportPreviewError = (value) => {
  const output = document.createElement('pre');
  output.textContent = `Preview error: ${value?.message || value}`;
  output.style.cssText = 'position:fixed;inset:12px;z-index:99999;color:#fecdd3;background:#30101a;padding:12px;white-space:pre-wrap';
  document.body.append(output);
};
addEventListener('error', (event) => reportPreviewError(event.error || event.message));
addEventListener('unhandledrejection', (event) => reportPreviewError(event.reason));

let previewSettings = {
  locale: previewLocale,
  targetLanguage: 'fa',
  originalAudioEnabled: true,
  dubAudioEnabled: true,
  sourceSubtitlesEnabled: true,
  translatedSubtitlesEnabled: true,
  originalVolume: 0.35,
  dubVolume: 0.9,
  autoDuck: true,
  recording: false,
  subtitlePosition: 'bottom-center',
  subtitleFontSize: 30,
  subtitleWidth: 780,
  subtitleOpacity: 86,
  consentVersion: 1,
};

const previewState = {
  active: true,
  status: 'connected',
  error: '',
  sourceLanguage: 'en',
  sourceText: 'The brain filters background sounds without conscious effort.',
  translatedText: 'مغز بدون تلاش آگاهانه، صداهای پس‌زمینه را فیلتر می‌کند.',
  recordingReady: false,
};

globalThis.__previewChrome = {
  runtime: {
    sendMessage: async (message) => {
      if (message.type === 'bootstrap') {
        return {ok: true, data: {api_key_set: true, languages: ['fa', 'en', 'ar', 'de', 'es', 'fr', 'tr'], settings: previewSettings}};
      }
      if (message.type === 'state') return {ok: true, state: previewState};
      if (message.type === 'audio') return {ok: true};
      return {ok: true};
    },
  },
  storage: {
    local: {
      get: async () => ({settings: previewSettings}),
      set: async ({settings}) => { previewSettings = {...previewSettings, ...settings}; },
    },
  },
  permissions: {request: async () => true},
};

addEventListener('load', () => {
  if (previewParams.get('view') === 'mixer') {
    setTimeout(() => document.querySelector('.controls')?.scrollIntoView({block: 'start'}), 120);
  }
});
