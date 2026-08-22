import {groqReadinessError, normalizeSettings, outputMix, usesGroqAudio} from './core.mjs';

const $ = (selector) => document.querySelector(selector);
const CONSENT_VERSION = 1;
let settings = normalizeSettings();
let bootstrap = null;
let timer = null;

const copy = {
  fa: {
    tagline: 'ترجمهٔ زندهٔ همین تب', ready: 'آمادهٔ ترجمه', connecting: 'در حال اتصال…', connected: 'ترجمهٔ زنده فعال است', error: 'خطا در اتصال',
    setupNeeded: 'راه‌اندازی کوتاه لازم است', setupMessage: 'کلید Gemini را وارد کن و حتماً اجازهٔ ارسال صدای تب به Google Gemini را تأیید کن.', openSettings: 'بازکردن تنظیمات',
    language: 'زبان مقصد', playbackMode: 'روش پخش', lowLatency: 'داخل همین صفحه', lowLatencyHelp: 'سریع‌ترین حالت برای صدا و زیرنویس زنده', synchronized: 'ضبط و پلیر هماهنگ', synchronizedHelp: 'ضبط جلوتر ادامه دارد؛ پلیر مستقل Seek و Fullscreen دارد', bestSync: 'سینک پایدار',
    start: 'شروع ترجمه', stop: 'توقف ترجمه', startHint: 'صدای همین تب ترجمه می‌شود', syncHint: 'ضبط و پلیر هماهنگ در تب تازه باز می‌شود', stopHint: 'جلسه و دریافت صدا متوقف می‌شود',
    yourOutput: 'خروجی انتخاب‌شده', edit: 'ویرایش', selectedCount: (count) => `${count} مورد فعال`, noOutput: 'هیچ خروجی‌ای فعال نیست',
    originalAudio: 'صدای اصلی', dubbedAudio: 'صدای دوبله', sourceSubtitles: 'زیرنویس اصلی', translatedSubtitles: 'زیرنویس ترجمه',
    source: 'گفتار اصلی', translated: 'ترجمهٔ زنده', waiting: 'منتظر صدا…', waitingTranslation: 'ترجمه اینجا نمایش داده می‌شود…',
    downloadReady: 'چهار فایل در Downloads ذخیره شدند.', privacyGoogle: 'پس از زدن «شروع»، صدای تب انتخاب‌شده فقط به Google Gemini فرستاده می‌شود.', privacyPrecise: 'در حالت دقیق، بازه‌های کوتاه صدای تب مستقیماً به Groq Whisper می‌روند؛ سپس متن برای ترجمه و ساخت صدا به Google Gemini فرستاده می‌شود.', help:'راهنما ↗', project: 'پروژه ↗',
    api_key_missing: 'کلید Gemini را در تنظیمات وارد کن.', api_key_invalid: 'کلید Gemini معتبر نیست.', consent_required: 'اجازهٔ پردازش صدا را در تنظیمات تأیید کن.',
    gemini_socket_failed: 'اتصال مستقیم به Gemini برقرار نشد؛ پروکسی مرورگر را بررسی کن.', gemini_socket_closed: 'اتصال Gemini بسته شد.', gemini_socket_timeout: 'پاسخی از Gemini دریافت نشد.', gemini_token_failed: 'Google توکن کوتاه‌عمر صادر نکرد؛ کلید و اتصال را بررسی کن.', gemini_quota_exceeded: 'سهمیهٔ Gemini تمام شده است؛ کمی بعد دوباره امتحان کن.', groq_key_missing:'برای زمان‌بندی Whisper، کلید Groq را در تنظیمات وارد کن.', groq_consent_required:'برای حالت دقیق، اجازهٔ ارسال بازه‌های کوتاه صدا به Groq Whisper را در تنظیمات تأیید کن.', groq_permission_missing:'برای حالت دقیق، در تنظیمات دسترسی Chrome به Groq را فعال کن.', groq_auth_failed:'کلید Groq معتبر نیست.', groq_access_forbidden:'Chrome به Groq دسترسی ندارد؛ api.groq.com را از پروکسی سیستم یا مرورگر عبور بده.', groq_connection_failed:'اتصال Chrome به Groq برقرار نشد؛ پروکسی را بررسی کن.', groq_quota_exceeded:'سهمیهٔ Groq فعلاً تمام شده است.', capture_store_write_failed:'ذخیرهٔ محلی ضبط متوقف شد؛ فضای دیسک و دسترسی ذخیره‌سازی را بررسی کن.',
    active_tab_missing: 'تب فعالی پیدا نشد.', capture_failed: 'دریافت صدا از این تب ممکن نشد.', source_resume_failed:'ویدیوی تب منبع خودکار پخش نشد؛ پخش را یک‌بار دستی شروع کن و دوباره امتحان کن.', synchronized_player_unavailable: 'این تب امکان ساخت پلیر هماهنگ را نمی‌دهد؛ حالت داخل صفحه را انتخاب کن.', synchronized_player_failed: 'بافر ویدئو ساخته نشد؛ حالت داخل صفحه را امتحان کن.', downloads_permission_missing: 'برای ذخیرهٔ چهار خروجی، دسترسی Downloads لازم است.'
  },
  en: {
    tagline: 'Translate this tab live', ready: 'Ready to translate', connecting: 'Connecting…', connected: 'Live translation is active', error: 'Connection error',
    setupNeeded: 'Quick setup required', setupMessage: 'Add your Gemini key and explicitly confirm permission to send selected-tab audio to Google Gemini.', openSettings: 'Open settings',
    language: 'Target language', playbackMode: 'Playback', lowLatency: 'On this page', lowLatencyHelp: 'Fastest live audio and subtitle path', synchronized: 'Synchronized recorder & player', synchronizedHelp: 'Capture runs ahead; the independent player can seek and fullscreen', bestSync: 'Stable sync',
    start: 'Start translating', stop: 'Stop translation', startHint: 'Audio from this tab will be translated', syncHint: 'The synchronized recorder opens in a new tab', stopHint: 'Stops capture and the live session',
    yourOutput: 'Selected output', edit: 'Edit', selectedCount: (count) => `${count} enabled`, noOutput: 'No output is enabled',
    originalAudio: 'Original audio', dubbedAudio: 'Dubbed audio', sourceSubtitles: 'Source subtitles', translatedSubtitles: 'Translated subtitles',
    source: 'Source speech', translated: 'Live translation', waiting: 'Waiting for audio…', waitingTranslation: 'Translation appears here…',
    downloadReady: 'Four files were saved to Downloads.', privacyGoogle: 'After you press Start, selected-tab audio goes only to Google Gemini.', privacyPrecise: 'In precise mode, short selected-tab audio windows go directly to Groq Whisper; transcript text then goes to Google Gemini for translation and voice generation.', help:'Guide ↗', project: 'Project ↗',
    api_key_missing: 'Add your Gemini key in Settings.', api_key_invalid: 'The Gemini key is invalid.', consent_required: 'Confirm audio processing in Settings.',
    gemini_socket_failed: 'Could not connect to Gemini; check the browser proxy.', gemini_socket_closed: 'The Gemini connection closed.', gemini_socket_timeout: 'Gemini did not respond in time.', gemini_token_failed: 'Google could not issue a short-lived token; check the key and connection.', gemini_quota_exceeded: 'The Gemini quota is exhausted; try again shortly.', groq_key_missing:'Add a Groq key in Settings to use Whisper timing.', groq_consent_required:'Confirm permission for short audio windows to go to Groq Whisper in Settings.', groq_permission_missing:'Allow Chrome access to Groq in Settings to use precise mode.', groq_auth_failed:'The Groq key is invalid.', groq_access_forbidden:'Chrome cannot reach Groq; route api.groq.com through the browser or system proxy.', groq_connection_failed:'Chrome could not connect to Groq; check the proxy.', groq_quota_exceeded:'The Groq quota is temporarily exhausted.', capture_store_write_failed:'Local capture storage stopped; check available disk space and storage access.',
    active_tab_missing: 'No active tab was found.', capture_failed: 'Could not capture audio from this tab.', source_resume_failed:'The source video could not resume automatically. Play it once, then try again.', synchronized_player_unavailable: 'This tab cannot provide synchronized video; use on-page mode.', synchronized_player_failed: 'The video buffer could not start; try on-page mode.', downloads_permission_missing: 'Downloads access is required to save four outputs.'
  }
};

function t(key) {
  return copy[settings.locale]?.[key] ?? copy.en[key] ?? key;
}

function send(message) {
  return chrome.runtime.sendMessage(message);
}

function translate() {
  const locale = settings.locale;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
  $('#localeToggle').textContent = locale === 'fa' ? 'EN' : 'فا';
  $('#helpLink').href = `https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP${locale === 'fa' ? '.fa' : ''}.md`;
}

function languageName(code) {
  try {
    const names = new Intl.DisplayNames([settings.locale], {type: 'language'});
    return `${names.of(code) || names.of(code.split('-')[0]) || code} · ${code}`;
  } catch {
    return code;
  }
}

function fillLanguages() {
  if (!bootstrap) return;
  $('#targetLanguage').replaceChildren(...bootstrap.languages.map((code) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = languageName(code);
    option.selected = code === settings.targetLanguage;
    return option;
  }));
}

function outputItems() {
  const mix = outputMix(settings, settings.playbackMode);
  return [
    ['originalAudioEnabled', 'originalAudio'],
    ['dubAudioEnabled', 'dubbedAudio'],
    ['sourceSubtitlesEnabled', 'sourceSubtitles'],
    ['translatedSubtitlesEnabled', 'translatedSubtitles']
  ].filter(([key]) => mix[key]);
}

function setupError() {
  if (!bootstrap?.api_key_set) return 'api_key_missing';
  if (settings.consentVersion !== CONSENT_VERSION) return 'consent_required';
  return groqReadinessError(settings, bootstrap);
}

function renderSettings() {
  translate();
  fillLanguages();
  document.querySelector(`input[name="playbackMode"][value="${settings.playbackMode}"]`).checked = true;
  $('#actionHint').textContent = t(settings.playbackMode === 'synchronized' ? 'syncHint' : 'startHint');
  const items = outputItems();
  $('#outputCount').textContent = t('selectedCount')(items.length);
  $('#outputChips').replaceChildren(...(items.length ? items.map(([, key]) => {
    const chip = document.createElement('span');
    chip.className = 'output-chip';
    chip.textContent = t(key);
    return chip;
  }) : [Object.assign(document.createElement('span'), {className: 'output-chip', textContent: t('noOutput')})]));
  const readinessError = setupError();
  $('#setupNotice').hidden = !readinessError;
  $('#setupMessage').textContent = readinessError ? t(readinessError) : t('setupMessage');
  $('#toggleButton').disabled = Boolean(readinessError);
  $('#privacyText').textContent = t(usesGroqAudio(settings) ? 'privacyPrecise' : 'privacyGoogle');
  $('#languageBadge').textContent = `AUTO → ${settings.targetLanguage.toUpperCase()}`;
}

async function saveSettings() {
  await chrome.storage.local.set({settings});
  renderSettings();
}

function showError(message) {
  const box = $('#errorMessage');
  box.textContent = t(message) || message;
  box.hidden = !message;
}

function renderState(state) {
  const active = Boolean(state.active);
  const status = state.status === 'connected' ? 'connected' : state.status === 'connecting' ? 'connecting' : state.status === 'error' ? 'error' : 'ready';
  $('#statusText').textContent = state.error ? t(state.error) : t(status);
  $('#statusDot').className = `status-dot ${active ? 'active' : ''} ${status}`;
  $('#toggleButton').classList.toggle('stopping', active);
  $('#toggleButton .action-icon').textContent = active ? '■' : '▶';
  $('#toggleButton b').textContent = t(active ? 'stop' : 'start');
  $('#actionHint').textContent = t(active ? 'stopHint' : settings.playbackMode === 'synchronized' ? 'syncHint' : 'startHint');
  $('#toggleButton').disabled = !active && Boolean(setupError());
  $('#targetLanguage').disabled = active;
  document.querySelectorAll('input[name="playbackMode"]').forEach((input) => { input.disabled = active; });
  $('#languageBadge').textContent = `${(state.sourceLanguage || 'AUTO').toUpperCase()} → ${settings.targetLanguage.toUpperCase()}`;
  $('#downloadReady').hidden = !state.recordingReady;
  showError(state.error || '');
}

async function refresh() {
  const response = await send({type: 'state'});
  if (response?.ok) renderState(response.state);
}

async function openSettings() {
  await chrome.runtime.openOptionsPage();
}

$('#localeToggle').addEventListener('click', async () => {
  settings.locale = settings.locale === 'fa' ? 'en' : 'fa';
  await saveSettings();
});
$('#settingsButton').addEventListener('click', openSettings);
$('#setupButton').addEventListener('click', openSettings);
$('#editOutputButton').addEventListener('click', openSettings);
$('#targetLanguage').addEventListener('change', async () => {
  settings.targetLanguage = $('#targetLanguage').value;
  await saveSettings();
});
document.querySelectorAll('input[name="playbackMode"]').forEach((input) => input.addEventListener('change', async () => {
  settings.playbackMode = input.value;
  await saveSettings();
}));
$('#toggleButton').addEventListener('click', async () => {
  $('#toggleButton').disabled = true;
  showError('');
  const current = await send({type: 'state'});
  const response = await send(current.state.active ? {type: 'stop'} : {type: 'start', config: settings});
  if (!response?.ok) showError(response?.error || 'error');
  await refresh();
});

(async () => {
  const [{settings: stored}, response] = await Promise.all([
    chrome.storage.local.get('settings'),
    send({type: 'bootstrap'})
  ]);
  if (!response?.ok) throw new Error(response?.error || 'bootstrap_failed');
  bootstrap = response.data;
  settings = normalizeSettings({...stored, ...stored?.settings, ...bootstrap.settings});
  renderSettings();
  await refresh();
  timer = setInterval(refresh, 750);
})().catch((error) => showError(error.message));

window.addEventListener('unload', () => clearInterval(timer));
