const $ = (selector) => document.querySelector(selector);
const API = '/api';
let locale = localStorage.getItem('lingodub.locale') || 'fa';
let bootstrap = null;
let lastError = '';
let selectedMediaFile = null;
let currentJobId = '';
let currentJob = null;
let recentJobs = [];
let loadedPlayerJobId = '';
let sourceCues = [];
let translatedCues = [];

const messages = {
  fa: {
    appOnline: 'اپ دسکتاپ آنلاین است', tagline: 'دوبلهٔ زنده، بدون دردسر',
    eyebrow: 'ترجمه و دوبلهٔ هم‌زمان با Gemini', heroTitle: 'هر صدایی را به زبان خودت بشنو.',
    heroText: 'صدای فیلم، کلاس و ویدئو را زنده ترجمه کن یا فایل را برای پخش کاملاً هماهنگ پردازش کن.',
    start: 'شروع دوبله', stop: 'توقف دوبله', record: 'شروع ضبط', stopRecord: 'پایان ضبط',
    status: 'وضعیت', idle: 'آماده', connecting: 'در حال اتصال', connected: 'در حال دوبله',
    error: 'خطا', detectedLanguage: 'زبان تشخیص‌داده‌شده', recording: 'ضبط', off: 'خاموش', on: 'روشن',
    liveTranscript: 'متن زنده', clear: 'پاک‌کردن', original: 'صدای اصلی', translation: 'ترجمه',
    waitingSource: 'منتظر دریافت صدا…', waitingTranslation: 'ترجمه اینجا نمایش داده می‌شود…',
    archive: 'آرشیو', latestOutput: 'آخرین خروجی', noRecording: 'هنوز خروجی‌ای ثبت نشده',
    recordHint: 'هنگام دوبله، ضبط را روشن کن تا چهار فایل هماهنگ ساخته شود.', downloadAll: 'دریافت همه',
    controls: 'کنترل‌ها', settings: 'تنظیمات', quickSetup: 'تنظیم دستی صدای برنامه‌ها',
    setupDescription: 'یک مرحله در Windows Volume Mixer',
    setupHelp: 'برای اپ دسکتاپ، خروجی برنامهٔ منبع را روی AMM Virtual بگذار و خروجی LingoDub را روی هدفون واقعی نگه دار. اکستنشن و پردازش فایل به این مسیر نیاز ندارند.',
    openWindowsMixer: 'باز کردن میکسر صدای ویندوز', audioGuide: 'آموزش تصویری تنظیم صدا',
    targetLanguage: 'زبان مقصد', speaker: 'گوینده', nativeVoice: 'صدای خودکار Gemini Live',
    nativeVoiceHelp: 'Gemini Live صدای گوینده را خودکار بازتولید می‌کند.', captureDevice: 'ورودی صدای برنامه',
    outputDevice: 'خروجی شنیداری', soundMix: 'ترکیب صدا', soundMixHint: 'هر کدام را مستقل بشنو',
    originalSound: 'صدای اصلی', dubbedSound: 'صدای دوبله', advanced: 'تنظیمات پیشرفته', save: 'ذخیره',
    proxy: 'پروکسی', saveSettings: 'ذخیرهٔ تنظیمات', saved: 'ذخیره شد.', keySaved: 'کلید امن ذخیره شد.',
    keyExists: 'کلید API تنظیم شده است', keyMissing: 'کلید API را وارد کنید',
    mixerOpened: 'میکسر ویندوز باز شد؛ مسیر AMM را طبق آموزش تنظیم کن.', requestFailed: 'درخواست انجام نشد',
    recordingReady: 'چهار خروجی آماده است', selectDefault: 'پیش‌فرض سیستم',
    locationUnsupported: 'Google این API Key یا موقعیت اتصال را مجاز نمی‌داند؛ حساب و خروجی پروکسی را بررسی کن.',
    mediaKicker: 'استودیوی رسانه', mediaTitle: 'دوبلهٔ فایل ویدئویی',
    mediaIntro: 'فیلم را محلی پردازش کن، چهار خروجی بگیر و دوبله را بدون تأخیر تجمعی روی تایم‌لاین ببین.',
    chooseVideo: 'ویدئو را انتخاب یا اینجا رها کن', videoFormats: 'MP4، MKV، WebM، MOV، AVI و WMV تا ۸ گیگابایت',
    processingMode: 'حالت پردازش', preciseMode: 'سینک دقیق',
    preciseHelp: 'پیشنهادی؛ هر دیالوگ روی بازهٔ خودش تنظیم می‌شود.', fastMode: 'سریع',
    fastHelp: 'پیش‌نمایش زودتر، با اصلاح سبک‌تر مرز دیالوگ‌ها.', fileTargetLanguage: 'زبان دوبلهٔ فایل',
    processVideo: 'شروع پردازش ویدئو',
    mediaPrivacy: 'خود ویدئو روی لپ‌تاپ می‌ماند؛ فقط صوت PCM استخراج‌شده به Gemini 3.5 Live Translate فرستاده می‌شود.',
    cancel: 'لغو', deleteJob: 'حذف پروژه', recentJobs: 'پروژه‌های اخیر', storedLocally: 'ذخیره‌شده روی همین دستگاه',
    noJobs: 'هنوز ویدئویی پردازش نشده است.', playerWaiting: 'پس از آماده‌شدن ویدئو، پلیر هماهنگ اینجا فعال می‌شود.',
    hearOriginal: 'صدای اصلی', hearDubbed: 'صدای دوبله', sourceSubs: 'زیرنویس اصلی',
    translatedSubs: 'زیرنویس ترجمه', originalShort: 'اصلی', dubbedShort: 'دوبله',
    originalAudioFile: 'صدای اصلی', dubbedAudioFile: 'صدای دوبله', sourceSubtitleFile: 'زیرنویس اصلی',
    translatedSubtitleFile: 'زیرنویس دوبله', allFourFiles: 'هر چهار فایل', fileSelected: 'انتخاب شد',
    uploadFirst: 'ابتدا یک ویدئو انتخاب کن.', mediaQueued: 'فایل ذخیره شد و در صف پردازش است.',
    confirmDelete: 'این پروژه و همهٔ خروجی‌های محلی آن حذف شود؟', open: 'بازکردن',
    stageQueued: 'در صف', stageProbing: 'بررسی فایل', stageExtracting: 'استخراج صدا',
    stageTranslating: 'ترجمه با Gemini Live', stageQuotaWait: 'انتظار برای سهمیه', stageAligning: 'هماهنگ‌سازی خروجی‌ها',
    stageReady: 'آمادهٔ پخش', stageFailed: 'ناموفق', stageCancelled: 'لغوشده', stageCancelling: 'در حال لغو',
    quotaNotice: 'برای ماندن زیر سقف توکن، پردازش خودکار مکث کرده است.', processingWarning: 'این پردازش تقریباً به‌اندازهٔ مدت گفتار یا بیشتر زمان می‌برد.',
    dub_trimmed: 'بخشی از گفتار طولانی برای حفظ سینک کوتاه شد.'
  },
  en: {
    appOnline: 'Desktop app is online', tagline: 'Live dubbing, minus the friction',
    eyebrow: 'Real-time translation and dubbing with Gemini', heroTitle: 'Hear anything in your language.',
    heroText: 'Translate live audio or process a video file for timeline-locked playback.',
    start: 'Start dubbing', stop: 'Stop dubbing', record: 'Start recording', stopRecord: 'Stop recording',
    status: 'Status', idle: 'Ready', connecting: 'Connecting', connected: 'Dubbing live', error: 'Error',
    detectedLanguage: 'Detected language', recording: 'Recording', off: 'Off', on: 'On',
    liveTranscript: 'Live transcript', clear: 'Clear', original: 'Original audio', translation: 'Translation',
    waitingSource: 'Waiting for audio…', waitingTranslation: 'Your translation will appear here…',
    archive: 'ARCHIVE', latestOutput: 'Latest output', noRecording: 'No output recorded yet',
    recordHint: 'Enable recording while dubbing to create four synchronized files.', downloadAll: 'Download all',
    controls: 'CONTROLS', settings: 'Settings', quickSetup: 'Manual desktop audio setup',
    setupDescription: 'One step in Windows Volume Mixer',
    setupHelp: 'For desktop live dubbing, route the source app to AMM Virtual and keep LingoDub on physical headphones. The extension and file processor do not need this route.',
    openWindowsMixer: 'Open Windows volume mixer', audioGuide: 'Open the visual audio guide',
    targetLanguage: 'Target language', speaker: 'Speaker', nativeVoice: 'Automatic Gemini Live voice',
    nativeVoiceHelp: 'Gemini Live automatically reproduces the speaker voice.', captureDevice: 'Application audio input',
    outputDevice: 'Listening output', soundMix: 'Audio mix', soundMixHint: 'Listen independently',
    originalSound: 'Original audio', dubbedSound: 'Dubbed audio', advanced: 'Advanced settings', save: 'Save',
    proxy: 'Proxy', saveSettings: 'Save settings', saved: 'Saved.', keySaved: 'Key stored securely.',
    keyExists: 'API key is configured', keyMissing: 'Enter an API key',
    mixerOpened: 'Windows mixer opened; follow the AMM route in the guide.', requestFailed: 'Request failed',
    recordingReady: 'Four outputs are ready', selectDefault: 'System default',
    locationUnsupported: 'Google does not allow this API key or connection location; check the account and proxy exit.',
    mediaKicker: 'MEDIA STUDIO', mediaTitle: 'Dub a video file',
    mediaIntro: 'Process locally, download four outputs, and play the dub on a drift-free timeline.',
    chooseVideo: 'Choose a video or drop it here', videoFormats: 'MP4, MKV, WebM, MOV, AVI, and WMV up to 8 GB',
    processingMode: 'Processing mode', preciseMode: 'Precise sync',
    preciseHelp: 'Recommended; each spoken segment is fitted to its source window.', fastMode: 'Fast',
    fastHelp: 'Earlier preview with lighter dialogue-boundary correction.', fileTargetLanguage: 'File target language',
    processVideo: 'Process video',
    mediaPrivacy: 'The video stays on this laptop; only extracted PCM audio is sent to Gemini 3.5 Live Translate.',
    cancel: 'Cancel', deleteJob: 'Delete project', recentJobs: 'Recent projects', storedLocally: 'Stored on this device',
    noJobs: 'No video has been processed yet.', playerWaiting: 'The synchronized player appears after processing finishes.',
    hearOriginal: 'Original audio', hearDubbed: 'Dubbed audio', sourceSubs: 'Source subtitles',
    translatedSubs: 'Translated subtitles', originalShort: 'Original', dubbedShort: 'Dub',
    originalAudioFile: 'Original audio', dubbedAudioFile: 'Dubbed audio', sourceSubtitleFile: 'Source subtitles',
    translatedSubtitleFile: 'Dub subtitles', allFourFiles: 'All four files', fileSelected: 'Selected',
    uploadFirst: 'Choose a video first.', mediaQueued: 'File stored and queued for processing.',
    confirmDelete: 'Delete this project and all of its local outputs?', open: 'Open',
    stageQueued: 'Queued', stageProbing: 'Inspecting file', stageExtracting: 'Extracting audio',
    stageTranslating: 'Translating with Gemini Live', stageQuotaWait: 'Waiting for quota', stageAligning: 'Aligning outputs',
    stageReady: 'Ready to play', stageFailed: 'Failed', stageCancelled: 'Cancelled', stageCancelling: 'Cancelling',
    quotaNotice: 'Processing paused automatically to stay below the token ceiling.', processingWarning: 'Processing takes roughly the speech duration or longer.',
    dub_trimmed: 'Some long dialogue was shortened to preserve sync.'
  }
};

const languageNames = {
  fa: {fa: 'فارسی', en: 'انگلیسی', ar: 'عربی', de: 'آلمانی', fr: 'فرانسوی', es: 'اسپانیایی', it: 'ایتالیایی', ja: 'ژاپنی', ko: 'کره‌ای', ru: 'روسی', tr: 'ترکی', zh: 'چینی'},
  en: {fa: 'Persian', en: 'English', ar: 'Arabic', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', ja: 'Japanese', ko: 'Korean', ru: 'Russian', tr: 'Turkish', zh: 'Chinese'}
};

function t(key) { return messages[locale][key] || key; }
function formatError(message) {
  if (message?.toLowerCase().includes('location is not supported')) return t('locationUnsupported');
  return message;
}

function notify(message, success = false) {
  const notice = $('#notice');
  notice.textContent = formatError(message);
  notice.classList.toggle('success', success);
  notice.hidden = false;
  clearTimeout(notice._timer);
  notice._timer = setTimeout(() => { notice.hidden = true; }, 6500);
}

async function request(path, options = {}) {
  const headers = options.body && typeof options.body === 'string' ? {'Content-Type': 'application/json'} : {};
  const response = await fetch(`${API}${path}`, {...options, headers: {...headers, ...(options.headers || {})}});
  if (!response.ok) {
    let detail = `${t('requestFailed')} (${response.status})`;
    try { detail = (await response.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  return response.json();
}

function fillSelect(element, items, selected, label) {
  element.replaceChildren(...items.map((item) => {
    const option = document.createElement('option');
    option.value = item.index ?? item;
    option.textContent = label ? label(item) : item.name;
    option.selected = String(option.value) === String(selected);
    return option;
  }));
}

function fillLanguages(element, languages, selected) {
  const display = new Intl.DisplayNames([locale === 'fa' ? 'fa' : 'en'], {type: 'language'});
  fillSelect(element, languages, selected, (code) => {
    const base = code.split('-')[0];
    try { return `${languageNames[locale][base] || display.of(base) || code} · ${code}`; } catch { return code; }
  });
}

function translatePage() {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  $('#localeToggle').textContent = locale === 'fa' ? 'EN' : 'فا';
  if (bootstrap) {
    fillLanguages($('#targetLanguage'), bootstrap.languages, $('#targetLanguage').value || bootstrap.settings.target_language);
    fillLanguages($('#mediaTargetLanguage'), bootstrap.languages, $('#mediaTargetLanguage').value || bootstrap.settings.target_language);
  }
  if (currentJob) renderJob(currentJob);
  renderRecentJobs();
}

function formSettings() {
  return {
    target_language: $('#targetLanguage').value,
    capture_device: Number($('#captureDevice').value),
    output_device: Number($('#outputDevice').value),
    original_volume: Number($('#originalVolume').value),
    dub_volume: Number($('#dubVolume').value),
    proxy_url: $('#proxyUrl').value.trim()
  };
}

function applySettings(settings) {
  fillLanguages($('#targetLanguage'), bootstrap.languages, settings.target_language);
  fillLanguages($('#mediaTargetLanguage'), bootstrap.languages, settings.target_language);
  fillSelect($('#captureDevice'), bootstrap.devices.captures, settings.capture_device);
  fillSelect($('#outputDevice'), bootstrap.devices.outputs, settings.output_device);
  $('#proxyUrl').value = settings.proxy_url;
  $('#originalVolume').value = settings.original_volume;
  $('#dubVolume').value = settings.dub_volume;
  updateRangeLabels();
  $('#targetCode').textContent = settings.target_language.toUpperCase();
}

function updateRangeLabels() {
  $('#originalVolumeValue').textContent = `${Math.round(Number($('#originalVolume').value) * 100)}%`;
  $('#dubVolumeValue').textContent = `${Math.round(Number($('#dubVolume').value) * 100)}%`;
}

async function loadBootstrap() {
  bootstrap = await request('/bootstrap');
  applySettings(bootstrap.settings);
  $('#keyStatus').textContent = t(bootstrap.api_key_set ? 'keyExists' : 'keyMissing');
  translatePage();
}

function renderState(state) {
  const statusKey = ['idle', 'connecting', 'connected', 'error'].includes(state.status) ? state.status : 'idle';
  $('#runtimeStatus').textContent = t(statusKey);
  $('#runtimeStatus').classList.toggle('active', state.running);
  $('#detectedLanguage').textContent = state.source_lang ? state.source_lang.toUpperCase() : '—';
  $('#sourceCode').textContent = state.source_lang ? state.source_lang.toUpperCase() : 'AUTO';
  $('#recordingStatus').textContent = t(state.recording ? 'on' : 'off');
  $('#recordingStatus').classList.toggle('active', state.recording);
  $('#startButton').lastElementChild.textContent = t(state.running ? 'stop' : 'start');
  $('#startButton').classList.toggle('is-running', state.running);
  $('#recordButton').disabled = !state.running;
  $('#recordButton').classList.toggle('is-recording', state.recording);
  $('#recordButton').lastElementChild.textContent = t(state.recording ? 'stopRecord' : 'record');
  if (state.source_text) { $('#sourceText').textContent = state.source_text; $('#sourceText').classList.add('has-text'); }
  if (state.translated_text) { $('#translatedText').textContent = state.translated_text; $('#translatedText').classList.add('has-text'); }
  const interfaceDirection = locale === 'fa' ? 'rtl' : 'ltr';
  $('#sourceText').dir = state.source_text ? (state.source_dir || 'auto') : interfaceDirection;
  $('#translatedText').dir = state.translated_text ? (state.translated_dir || 'auto') : interfaceDirection;
  if (state.error && state.error !== lastError) { lastError = state.error; notify(state.error); }
  if (!state.error) lastError = '';
  if (state.latest_recording) {
    $('#downloadPanel').classList.remove('empty');
    $('#downloadPanel strong').textContent = t('recordingReady');
    $('#downloadAll').href = `/api/recordings/${encodeURIComponent(state.latest_recording)}/all-outputs.zip`;
    $('#downloadAll').hidden = false;
  }
}

async function pollState() {
  try { renderState(await request('/state')); $('#connectionBadge').classList.remove('offline'); }
  catch { $('#connectionBadge').classList.add('offline'); }
}

function stageKey(status) {
  const camel = status.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  return `stage${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
}

function renderJob(job) {
  currentJob = job;
  currentJobId = job.id;
  $('#jobPanel').hidden = false;
  $('#jobFile').textContent = job.filename;
  $('#jobStage').textContent = t(stageKey(job.status));
  $('#jobPercent').textContent = `${Math.round(job.progress * 100)}%`;
  $('#jobProgress').value = job.progress;
  const warnings = (job.warnings || []).map((warning) => t(warning)).join(' ');
  $('#jobMessage').textContent = job.error || warnings || (job.status === 'quota_wait' ? t('quotaNotice') : t('processingWarning'));
  const terminal = ['ready', 'failed', 'cancelled'].includes(job.status);
  $('#cancelJobButton').hidden = terminal || job.status === 'cancelling';
  $('#deleteJobButton').hidden = !terminal;
  $('#processMediaButton').disabled = !selectedMediaFile || !terminal;
  if (job.status === 'ready' && loadedPlayerJobId !== job.id) loadPlayer(job).catch((error) => notify(error.message));
}

function renderRecentJobs() {
  const list = $('#recentJobsList');
  if (!list || !recentJobs.length) {
    if (list) list.innerHTML = `<p>${t('noJobs')}</p>`;
    return;
  }
  list.replaceChildren(...recentJobs.slice(0, 6).map((job) => {
    const row = document.createElement('div');
    row.className = 'recent-job';
    const text = document.createElement('span');
    const title = document.createElement('b');
    title.textContent = job.filename;
    const meta = document.createElement('small');
    meta.textContent = `${t(stageKey(job.status))} · ${job.target_language.toUpperCase()}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.jobId = job.id;
    button.textContent = t('open');
    text.append(title, meta); row.append(text, button);
    return row;
  }));
}

async function pollMediaJobs() {
  try {
    const response = await request('/media/jobs');
    recentJobs = response.jobs;
    renderRecentJobs();
    if (currentJobId) {
      const latest = recentJobs.find((job) => job.id === currentJobId);
      if (latest) renderJob(latest);
    }
  } catch {}
}

function selectMediaFile(file) {
  selectedMediaFile = file || null;
  $('#processMediaButton').disabled = !selectedMediaFile || Boolean(currentJob && !['ready', 'failed', 'cancelled'].includes(currentJob.status));
  $('#selectedFile').textContent = selectedMediaFile
    ? `${t('fileSelected')}: ${selectedMediaFile.name} · ${(selectedMediaFile.size / 1048576).toFixed(1)} MB`
    : t('videoFormats');
}

async function processMedia() {
  if (!selectedMediaFile) return notify(t('uploadFirst'));
  if (!bootstrap.api_key_set) return notify(t('keyMissing'));
  const mode = document.querySelector('input[name="mediaMode"]:checked').value;
  const query = new URLSearchParams({
    filename: selectedMediaFile.name,
    target_language: $('#mediaTargetLanguage').value,
    mode
  });
  $('#processMediaButton').disabled = true;
  try {
    const job = await request(`/media/jobs?${query}`, {
      method: 'POST',
      headers: {'Content-Type': selectedMediaFile.type || 'application/octet-stream'},
      body: selectedMediaFile
    });
    renderJob(job);
    notify(t('mediaQueued'), true);
    await pollMediaJobs();
  } catch (error) {
    $('#processMediaButton').disabled = false;
    notify(error.message);
  }
}

function parseTimestamp(value) {
  const parts = value.trim().split(':').map(Number);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function parseVtt(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const cues = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes('-->')) continue;
    const [start, end] = lines[index].split('-->').map(parseTimestamp);
    const body = [];
    while (lines[index + 1] && lines[index + 1].trim()) body.push(lines[++index].trim());
    if (Number.isFinite(start) && Number.isFinite(end) && body.length) cues.push({start, end, text: body.join(' ')});
  }
  return cues;
}

async function fetchCues(url) {
  const response = await fetch(url);
  if (!response.ok) return [];
  return parseVtt(await response.text());
}

function cueAt(cues, time) { return cues.find((cue) => time >= cue.start && time < cue.end); }
function renderCaptions() {
  const time = $('#mediaPlayer').currentTime;
  const source = cueAt(sourceCues, time);
  const translated = cueAt(translatedCues, time);
  $('#sourceCaption').textContent = source?.text || '';
  $('#translatedCaption').textContent = translated?.text || '';
  $('#sourceCaption').hidden = !$('#showSourceSubs').checked || !source;
  $('#translatedCaption').hidden = !$('#showTranslatedSubs').checked || !translated;
}

function syncPlayers(force = false) {
  const video = $('#mediaPlayer');
  const dub = $('#dubbedPlayer');
  if (!$('#hearDubbed').checked || !Number.isFinite(video.currentTime)) return;
  const drift = dub.currentTime - video.currentTime;
  if (force || Math.abs(drift) > 0.12) {
    dub.currentTime = Math.min(video.currentTime, Number.isFinite(dub.duration) ? dub.duration : video.currentTime);
    dub.playbackRate = video.playbackRate;
  } else if (Math.abs(drift) > 0.04) {
    dub.playbackRate = video.playbackRate * (drift > 0 ? 0.98 : 1.02);
  } else {
    dub.playbackRate = video.playbackRate;
  }
}

async function loadPlayer(job) {
  loadedPlayerJobId = job.id;
  const video = $('#mediaPlayer');
  const dub = $('#dubbedPlayer');
  video.pause(); dub.pause();
  video.src = job.video_url;
  dub.src = job.outputs['dubbed.wav'];
  video.muted = !$('#hearOriginal').checked;
  video.volume = Number($('#playerOriginalVolume').value);
  dub.volume = Number($('#playerDubVolume').value);
  sourceCues = await fetchCues(job.source_vtt_url);
  translatedCues = await fetchCues(job.translated_vtt_url);
  $('#downloadOriginal').href = job.outputs['original.wav'];
  $('#downloadDubbed').href = job.outputs['dubbed.wav'];
  $('#downloadSourceSrt').href = job.outputs['source.srt'];
  $('#downloadTranslatedSrt').href = job.outputs['translated.srt'];
  $('#downloadMediaZip').href = job.outputs['all-outputs.zip'];
  $('#playerCard').classList.remove('empty');
  $('#playerEmpty').hidden = true;
  $('#playerReady').hidden = false;
  video.load(); dub.load(); renderCaptions();
}

$('#localeToggle').addEventListener('click', () => {
  locale = locale === 'fa' ? 'en' : 'fa';
  localStorage.setItem('lingodub.locale', locale);
  translatePage();
});
$('#settingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await request('/settings', {method: 'POST', body: JSON.stringify(formSettings())});
    bootstrap.settings = result.settings;
    notify(t('saved'), true);
  } catch (error) { notify(error.message); }
});
$('#saveKeyButton').addEventListener('click', async () => {
  const apiKey = $('#apiKey').value.trim();
  if (!apiKey) return notify(t('keyMissing'));
  try {
    await request('/key', {method: 'POST', body: JSON.stringify({api_key: apiKey})});
    $('#apiKey').value = '';
    $('#keyStatus').textContent = t('keyExists');
    bootstrap.api_key_set = true;
    notify(t('keySaved'), true);
  } catch (error) { notify(error.message); }
});
$('#openMixerButton').addEventListener('click', async () => {
  try { await request('/audio/open-mixer', {method: 'POST'}); notify(t('mixerOpened'), true); }
  catch (error) { notify(error.message); }
});
$('#startButton').addEventListener('click', async () => {
  try {
    const state = await request('/state');
    await request(state.running ? '/stop' : '/start', {method: 'POST'});
    await pollState();
  } catch (error) { notify(error.message); }
});
$('#recordButton').addEventListener('click', async () => {
  try {
    const state = await request('/state');
    await request(state.recording ? '/record/stop' : '/record/start', {method: 'POST'});
    await pollState();
  } catch (error) { notify(error.message); }
});
$('#clearTranscript').addEventListener('click', () => {
  $('#sourceText').textContent = t('waitingSource'); $('#sourceText').classList.remove('has-text');
  $('#translatedText').textContent = t('waitingTranslation'); $('#translatedText').classList.remove('has-text');
});
['originalVolume', 'dubVolume'].forEach((id) => $(`#${id}`).addEventListener('input', updateRangeLabels));

$('#mediaFile').addEventListener('change', (event) => selectMediaFile(event.target.files[0]));
['dragenter', 'dragover'].forEach((name) => $('#dropZone').addEventListener(name, (event) => { event.preventDefault(); $('#dropZone').classList.add('dragging'); }));
['dragleave', 'drop'].forEach((name) => $('#dropZone').addEventListener(name, (event) => { event.preventDefault(); $('#dropZone').classList.remove('dragging'); }));
$('#dropZone').addEventListener('drop', (event) => selectMediaFile(event.dataTransfer.files[0]));
document.querySelectorAll('input[name="mediaMode"]').forEach((radio) => radio.addEventListener('change', () => {
  document.querySelectorAll('.mode-option').forEach((option) => option.classList.toggle('selected', option.contains(document.querySelector('input[name="mediaMode"]:checked'))));
}));
$('#processMediaButton').addEventListener('click', processMedia);
$('#cancelJobButton').addEventListener('click', async () => {
  if (!currentJobId) return;
  try { renderJob(await request(`/media/jobs/${currentJobId}/cancel`, {method: 'POST'})); }
  catch (error) { notify(error.message); }
});
$('#deleteJobButton').addEventListener('click', async () => {
  if (!currentJobId || !window.confirm(t('confirmDelete'))) return;
  try {
    await request(`/media/jobs/${currentJobId}`, {method: 'DELETE'});
    currentJobId = ''; currentJob = null; loadedPlayerJobId = '';
    $('#jobPanel').hidden = true; $('#playerReady').hidden = true; $('#playerEmpty').hidden = false; $('#playerCard').classList.add('empty');
    await pollMediaJobs();
  } catch (error) { notify(error.message); }
});
$('#recentJobsList').addEventListener('click', (event) => {
  const id = event.target.dataset.jobId;
  const job = recentJobs.find((item) => item.id === id);
  if (job) renderJob(job);
});

const video = $('#mediaPlayer');
const dub = $('#dubbedPlayer');
video.addEventListener('play', async () => {
  syncPlayers(true);
  if ($('#hearDubbed').checked) { try { await dub.play(); } catch {} }
});
video.addEventListener('pause', () => dub.pause());
video.addEventListener('seeking', () => syncPlayers(true));
video.addEventListener('ratechange', () => { dub.playbackRate = video.playbackRate; });
video.addEventListener('timeupdate', renderCaptions);
video.addEventListener('ended', () => { dub.pause(); dub.currentTime = 0; });
$('#hearOriginal').addEventListener('change', () => { video.muted = !$('#hearOriginal').checked; });
$('#hearDubbed').addEventListener('change', async () => {
  if (!$('#hearDubbed').checked) dub.pause();
  else if (!video.paused) { syncPlayers(true); try { await dub.play(); } catch {} }
});
['showSourceSubs', 'showTranslatedSubs'].forEach((id) => $(`#${id}`).addEventListener('change', renderCaptions));
$('#playerOriginalVolume').addEventListener('input', () => { video.volume = Number($('#playerOriginalVolume').value); });
$('#playerDubVolume').addEventListener('input', () => { dub.volume = Number($('#playerDubVolume').value); });
setInterval(() => { if (!video.paused) syncPlayers(); }, 250);

(async () => {
  translatePage();
  try {
    await loadBootstrap();
    await Promise.all([pollState(), pollMediaJobs()]);
    setInterval(() => { pollState(); pollMediaJobs(); }, 1000);
  } catch (error) {
    $('#connectionBadge').classList.add('offline');
    notify(error.message);
  }
})();
