const $ = (selector) => document.querySelector(selector);
const API = '/api';
let locale = localStorage.getItem('lingora.locale') || localStorage.getItem('dubira.locale') || localStorage.getItem('voxilyra.locale') || 'fa';
let bootstrap = null;
let lastError = '';
let selectedMediaFile = null;
let currentJobId = '';
let currentJob = null;
let recentJobs = [];
let loadedPlayerJobId = '';
let sourceCues = [];
let translatedCues = [];
let subtitleWindow = null;
let subtitleNodes = null;
let nativeSubtitleOpen = false;

const messages = {
  fa: {
    navLive: 'زنده', navStudio: 'استودیوی فایل', navGuide: 'تنظیم صدا', quitApp: 'خروج کامل',
    appClosed: 'Lingora بسته شد.', closeTab: 'اکنون می‌توانی این پنجره را ببندی.', translationModel: 'مدل ترجمه',
    appOnline: 'اپ دسکتاپ آنلاین است', tagline: 'ترجمهٔ زنده، بدون دردسر',
    eyebrow: 'ترجمه و دوبلهٔ هم‌زمان با Gemini', heroTitle: 'هر صدایی را به زبان خودت بشنو.',
    heroText: 'صدای فیلم، کلاس و فایل صوتی را زنده ترجمه کن یا رسانه را برای پخش کاملاً هماهنگ پردازش کن.',
    start: 'شروع ترجمه', stop: 'توقف ترجمه', record: 'شروع ضبط', stopRecord: 'پایان ضبط',
    status: 'وضعیت', idle: 'آماده', connecting: 'در حال اتصال', connected: 'در حال ترجمه',
    error: 'خطا', detectedLanguage: 'زبان تشخیص‌داده‌شده', recording: 'ضبط', off: 'خاموش', on: 'روشن',
    liveTranscript: 'متن زنده', clear: 'پاک‌کردن', original: 'صدای اصلی', translation: 'ترجمه',
    waitingSource: 'منتظر دریافت صدا…', waitingTranslation: 'ترجمه اینجا نمایش داده می‌شود…',
    archive: 'آرشیو', latestOutput: 'آخرین خروجی', noRecording: 'هنوز خروجی‌ای ثبت نشده',
    recordHint: 'هنگام دوبله، ضبط را روشن کن تا چهار فایل هماهنگ ساخته شود.', downloadAll: 'دریافت همه',
    controls: 'کنترل‌ها', settings: 'تنظیمات', quickSetup: 'تنظیم دستی صدای برنامه‌ها',
    setupDescription: 'یک مرحله در Windows Volume Mixer',
    setupDescriptionDarwin: 'انتخاب ورودی loopback در macOS',
    setupDescriptionLinux: 'انتخاب monitor صدا در Linux',
    setupHelp: 'برای اپ دسکتاپ، خروجی برنامهٔ منبع را روی AMM Virtual بگذار و خروجی Lingora را روی هدفون واقعی نگه دار. اکستنشن و پردازش فایل به این مسیر نیاز ندارند.',
    setupHelpDarwin: 'در macOS یک ورودی loopback مثل BlackHole را به‌عنوان ورودی Lingora انتخاب کن. استودیوی فایل و اکستنشن به آن نیاز ندارند.',
    setupHelpLinux: 'در Linux ورودی monitor مربوط به PipeWire/PulseAudio را انتخاب کن. استودیوی فایل و اکستنشن به مسیر مجازی نیاز ندارند.',
    openWindowsMixer: 'باز کردن میکسر صدای ویندوز', audioGuide: 'آموزش تصویری تنظیم صدا',
    targetLanguage: 'زبان مقصد', speaker: 'گویندهٔ فایل',
    outputMixer: 'خروجی دلخواه من', outputMixerHint: 'صدا و زیرنویس را آزادانه ترکیب کن',
    floatingSubtitles: 'زیرنویس شناور', floatingHint: 'قابل جابه‌جایی و تغییر اندازه', openSubtitleWindow: 'بازکردن کادر زیرنویس', closeSubtitleWindow: 'بستن کادر زیرنویس',
    subtitleSize: 'اندازهٔ متن', subtitleWidth: 'عرض کادر', subtitleOpacity: 'شفافیت پس‌زمینه', showSourceLine: 'نمایش متن اصلی بالای ترجمه', subtitlePopupBlocked: 'مرورگر بازشدن پنجرهٔ زیرنویس را مسدود کرد.', subtitleWaiting: 'منتظر ترجمه…',
    nativeVoiceHelp: 'فقط برای دوبلهٔ فایل‌های صوتی و ویدئویی.', captureDevice: 'ورودی صدای برنامه',
    outputDevice: 'خروجی شنیداری',
    originalSound: 'صدای اصلی', dubbedSound: 'صدای دوبله', sourceSubtitles: 'زیرنویس اصلی', translatedSubtitles: 'زیرنویس ترجمه', audioLevels: 'میکس صدا', advanced: 'تنظیمات پیشرفته', save: 'ذخیره',
    proxy: 'پروکسی', saveSettings: 'ذخیرهٔ تنظیمات', saved: 'ذخیره شد.', keySaved: 'کلید امن ذخیره شد.',
    keyExists: 'کلید API تنظیم شده است', keyMissing: 'کلید API را وارد کنید', groqKeyMissing: 'برای پردازش فایل، Groq API Key را در تنظیمات پیشرفته وارد کنید.',
    mixerOpened: 'میکسر ویندوز باز شد؛ مسیر AMM را طبق آموزش تنظیم کن.', requestFailed: 'درخواست انجام نشد',
    recordingReady: 'چهار خروجی آماده است', selectDefault: 'پیش‌فرض سیستم',
    locationUnsupported: 'Google این API Key یا موقعیت اتصال را مجاز نمی‌داند؛ حساب و خروجی پروکسی را بررسی کن.',
    mediaKicker: 'استودیوی رسانه', mediaTitle: 'دوبلهٔ فایل صوتی یا ویدئویی',
    mediaIntro: 'صوت یا ویدئو را محلی پردازش کن، چهار خروجی بگیر و دوبله را روی تایم‌لاین هماهنگ پخش کن.',
    chooseVideo: 'فایل صوتی یا ویدئویی را انتخاب یا اینجا رها کن', videoFormats: 'MP3، WAV، M4A، FLAC، OGG، MP4، MKV و فرمت‌های رایج تا ۸ گیگابایت',
    processingMode: 'حالت پردازش', preciseMode: 'سینک دقیق',
    preciseHelp: 'Whisper Large v3 و کنترل متن صدای تولیدشده؛ پیشنهاد ما.', fastMode: 'سریع',
    fastHelp: 'Whisper Large v3 Turbo با کنترل کمتر برای پیش‌نمایش سریع.', fileTargetLanguage: 'زبان دوبلهٔ فایل',
    processVideo: 'شروع پردازش فایل',
    mediaPrivacy: 'فایل روی لپ‌تاپ می‌ماند؛ قطعه‌های صوتی به Groq Whisper، متن به مخزن مدل‌های رایگان Gemini و متن ترجمه‌شده برای تولید صدا به Gemini Live فرستاده می‌شود.',
    cancel: 'لغو', deleteJob: 'حذف پروژه', recentJobs: 'پروژه‌های اخیر', storedLocally: 'ذخیره‌شده روی همین دستگاه',
    noJobs: 'هنوز فایل صوتی یا ویدئویی پردازش نشده است.', playerWaiting: 'پس از آماده‌شدن فایل، پلیر هماهنگ اینجا فعال می‌شود.',
    hearOriginal: 'صدای اصلی', hearDubbed: 'صدای دوبله', sourceSubs: 'زیرنویس اصلی',
    translatedSubs: 'زیرنویس ترجمه', originalShort: 'اصلی', dubbedShort: 'دوبله',
    originalAudioFile: 'صدای اصلی', dubbedAudioFile: 'صدای دوبله', sourceSubtitleFile: 'زیرنویس اصلی',
    translatedSubtitleFile: 'زیرنویس دوبله', allFourFiles: 'هر چهار فایل', fileSelected: 'انتخاب شد',
    uploadFirst: 'ابتدا یک فایل صوتی یا ویدئویی انتخاب کن.', mediaQueued: 'فایل ذخیره شد و در صف پردازش است.',
    confirmDelete: 'این پروژه و همهٔ خروجی‌های محلی آن حذف شود؟', open: 'بازکردن',
    stageQueued: 'در صف', stageProbing: 'بررسی فایل', stageExtracting: 'استخراج صدا',
    stageTranscribing: 'تبدیل صدا به متن با Groq Whisper', stageTranslating: 'ترجمه با مخزن مدل‌های رایگان Gemini', stageNarrating: 'ساخت صدای دوبله با Gemini Live', stageQuotaWait: 'انتظار برای سهمیه', stageAligning: 'هماهنگ‌سازی خروجی‌ها',
    stageReady: 'آمادهٔ پخش', stageFailed: 'ناموفق', stageCancelled: 'لغوشده', stageCancelling: 'در حال لغو',
    quotaNotice: 'برای ماندن زیر سقف ۲۰ هزار توکن در دقیقه، پردازش خودکار مکث کرده است.', processingWarning: 'حالت دقیق از Whisper دقیق‌تر استفاده می‌کند و متن صدای ساخته‌شده را برای هر قطعه کنترل می‌کند.',
    qualityScore: 'تطابق گفتار و ترجمه', narration_retry: 'یک قطعه به‌دلیل اختلاف صوت و متن دوباره تولید شد.',
    quality_low: 'کیفیت یک قطعه پایین ماند؛ متن و صوت را پیش از استفادهٔ نهایی بررسی کن.',
    quality_unverified: 'زبان مبدأ برای کنترل خودکار کیفیت قابل تشخیص نبود؛ خروجی را دستی بررسی کن.',
    network_recovered: 'اتصال موقتاً قطع شد؛ برنامه از آخرین خروجی معتبر استفاده کرد.',
    non_speech_skipped: 'یک بازه بدون گفتار بود و با سکوت هماهنگ حفظ شد.',
    segment_skipped: 'یک بازه پس از سه تلاش پاسخی نگرفت و با سکوت هماهنگ حفظ شد؛ آن بخش را بازبینی کن.'
  },
  en: {
    navLive: 'Live', navStudio: 'File studio', navGuide: 'Audio setup', quitApp: 'Quit app',
    appClosed: 'Lingora is closed.', closeTab: 'You can close this window now.', translationModel: 'Translation model',
    appOnline: 'Desktop app is online', tagline: 'Live translation, minus the friction',
    eyebrow: 'Real-time translation and dubbing with Gemini', heroTitle: 'Hear anything in your language.',
    heroText: 'Translate live audio or process audio/video files for timeline-locked playback.',
    start: 'Start translation', stop: 'Stop translation', record: 'Start recording', stopRecord: 'Stop recording',
    status: 'Status', idle: 'Ready', connecting: 'Connecting', connected: 'Translating live', error: 'Error',
    detectedLanguage: 'Detected language', recording: 'Recording', off: 'Off', on: 'On',
    liveTranscript: 'Live transcript', clear: 'Clear', original: 'Original audio', translation: 'Translation',
    waitingSource: 'Waiting for audio…', waitingTranslation: 'Your translation will appear here…',
    archive: 'ARCHIVE', latestOutput: 'Latest output', noRecording: 'No output recorded yet',
    recordHint: 'Enable recording while dubbing to create four synchronized files.', downloadAll: 'Download all',
    controls: 'CONTROLS', settings: 'Settings', quickSetup: 'Manual desktop audio setup',
    setupDescription: 'One step in Windows Volume Mixer',
    setupDescriptionDarwin: 'Select a macOS loopback input',
    setupDescriptionLinux: 'Select a Linux monitor source',
    setupHelp: 'For desktop live dubbing, route the source app to AMM Virtual and keep Lingora on physical headphones. The extension and file processor do not need this route.',
    setupHelpDarwin: 'On macOS, select a loopback input such as BlackHole in Lingora. Media Studio and the extension do not need it.',
    setupHelpLinux: 'On Linux, select the relevant PipeWire/PulseAudio monitor source. Media Studio and the extension need no virtual route.',
    openWindowsMixer: 'Open Windows volume mixer', audioGuide: 'Open the visual audio guide',
    targetLanguage: 'Target language', speaker: 'File dubbing voice',
    outputMixer: 'My output mix', outputMixerHint: 'Combine audio and subtitles freely',
    floatingSubtitles: 'Floating subtitles', floatingHint: 'Move and resize freely', openSubtitleWindow: 'Open subtitle window', closeSubtitleWindow: 'Close subtitle window',
    subtitleSize: 'Text size', subtitleWidth: 'Card width', subtitleOpacity: 'Background opacity', showSourceLine: 'Show source above translation', subtitlePopupBlocked: 'The browser blocked the subtitle window.', subtitleWaiting: 'Waiting for translation…',
    nativeVoiceHelp: 'Used only for uploaded audio and video files.', captureDevice: 'Application audio input',
    outputDevice: 'Listening output',
    originalSound: 'Original audio', dubbedSound: 'Dubbed audio', sourceSubtitles: 'Source subtitles', translatedSubtitles: 'Translated subtitles', audioLevels: 'Audio mix', advanced: 'Advanced settings', save: 'Save',
    proxy: 'Proxy', saveSettings: 'Save settings', saved: 'Saved.', keySaved: 'Key stored securely.',
    keyExists: 'API key is configured', keyMissing: 'Enter an API key', groqKeyMissing: 'Enter a Groq API key in Advanced settings to process files.',
    mixerOpened: 'Windows mixer opened; follow the AMM route in the guide.', requestFailed: 'Request failed',
    recordingReady: 'Four outputs are ready', selectDefault: 'System default',
    locationUnsupported: 'Google does not allow this API key or connection location; check the account and proxy exit.',
    mediaKicker: 'MEDIA STUDIO', mediaTitle: 'Dub an audio or video file',
    mediaIntro: 'Process locally, download four outputs, and play the dub on a drift-free timeline.',
    chooseVideo: 'Choose an audio or video file or drop it here', videoFormats: 'MP3, WAV, M4A, FLAC, OGG, MP4, MKV, and common formats up to 8 GB',
    processingMode: 'Processing mode', preciseMode: 'Precise sync',
    preciseHelp: 'Whisper Large v3 plus generated-speech transcript checks; recommended.', fastMode: 'Fast',
    fastHelp: 'Whisper Large v3 Turbo with fewer checks for a faster preview.', fileTargetLanguage: 'File target language',
    processVideo: 'Process file',
    mediaPrivacy: 'The file stays on this laptop; audio chunks go to Groq Whisper, text to the free Gemini model pool, and translated text to Gemini Live for speech.',
    cancel: 'Cancel', deleteJob: 'Delete project', recentJobs: 'Recent projects', storedLocally: 'Stored on this device',
    noJobs: 'No audio or video file has been processed yet.', playerWaiting: 'The synchronized player appears after processing finishes.',
    hearOriginal: 'Original audio', hearDubbed: 'Dubbed audio', sourceSubs: 'Source subtitles',
    translatedSubs: 'Translated subtitles', originalShort: 'Original', dubbedShort: 'Dub',
    originalAudioFile: 'Original audio', dubbedAudioFile: 'Dubbed audio', sourceSubtitleFile: 'Source subtitles',
    translatedSubtitleFile: 'Dub subtitles', allFourFiles: 'All four files', fileSelected: 'Selected',
    uploadFirst: 'Choose an audio or video file first.', mediaQueued: 'File stored and queued for processing.',
    confirmDelete: 'Delete this project and all of its local outputs?', open: 'Open',
    stageQueued: 'Queued', stageProbing: 'Inspecting file', stageExtracting: 'Extracting audio',
    stageTranscribing: 'Transcribing with Groq Whisper', stageTranslating: 'Translating with the Gemini free-tier pool', stageNarrating: 'Generating dub with Gemini Live', stageQuotaWait: 'Waiting for quota', stageAligning: 'Aligning outputs',
    stageReady: 'Ready to play', stageFailed: 'Failed', stageCancelled: 'Cancelled', stageCancelling: 'Cancelling',
    quotaNotice: 'Processing paused automatically to stay below 20,000 tokens per minute.', processingWarning: 'Precise mode uses the more accurate Whisper model and checks each generated speech transcript.',
    qualityScore: 'Speech-to-translation match', narration_retry: 'A segment was regenerated because its audio and transcript disagreed.',
    quality_low: 'A segment remained low-confidence; review its audio and transcript before final use.',
    quality_unverified: 'The source language could not be identified for automatic quality checking; review the output manually.',
    network_recovered: 'The connection briefly dropped; the last valid result was preserved.',
    non_speech_skipped: 'A non-speech interval was preserved as synchronized silence.',
    segment_skipped: 'One interval returned no result after three attempts and was preserved as synchronized silence; review that section.'
  }
};

const languageNames = {
  fa: {fa: 'فارسی', en: 'انگلیسی', ar: 'عربی', de: 'آلمانی', fr: 'فرانسوی', es: 'اسپانیایی', it: 'ایتالیایی', ja: 'ژاپنی', ko: 'کره‌ای', ru: 'روسی', tr: 'ترکی', zh: 'چینی'},
  en: {fa: 'Persian', en: 'English', ar: 'Arabic', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', ja: 'Japanese', ko: 'Korean', ru: 'Russian', tr: 'Turkish', zh: 'Chinese'}
};

function t(key) { return messages[locale][key] || key; }

function buildSubtitleWindow(target) {
  const doc = target.document;
  doc.documentElement.lang = locale;
  doc.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
  doc.title = 'Lingora · Subtitles';
  doc.head.replaceChildren(); doc.body.replaceChildren();
  const style = doc.createElement('style');
  style.textContent = `
    @font-face{font-family:Vazirmatn;src:url('/assets/vazirmatn-arabic.woff2') format('woff2');font-weight:100 900}
    @font-face{font-family:Vazirmatn;src:url('/assets/vazirmatn-latin.woff2') format('woff2');font-weight:100 900}
    *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;background:transparent;overflow:hidden}
    body{display:grid;place-items:center;padding:8px;font-family:Vazirmatn,Inter,system-ui,sans-serif;color:#fff}
    .card{width:100%;height:100%;min-height:96px;padding:18px 24px 14px;display:flex;flex-direction:column;justify-content:safe center;
      border:1px solid rgba(255,255,255,.22);border-radius:22px;background:rgba(9,13,27,var(--opacity,.88));
      box-shadow:0 22px 70px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.13);
      overflow-y:auto;scrollbar-gutter:stable;backdrop-filter:blur(26px) saturate(155%);-webkit-backdrop-filter:blur(26px) saturate(155%)}
    p{margin:2px 0;text-align:center;unicode-bidi:plaintext;text-wrap:balance;overflow-wrap:anywhere}
    .source{font-size:calc(var(--size,26px)*.65);line-height:1.55;color:rgba(226,232,240,.7)}
    .source-only .source{font-size:var(--size,26px);font-weight:650;color:#fff}
    .translation{font-size:var(--size,26px);font-weight:680;line-height:1.65;text-shadow:0 2px 14px rgba(0,0,0,.7)}
    [hidden]{display:none}`;
  const card = doc.createElement('main'); card.className = 'card';
  const source = doc.createElement('p'); source.className = 'source'; source.dir = 'auto';
  const translation = doc.createElement('p'); translation.className = 'translation'; translation.dir = 'auto';
  card.append(source, translation); doc.head.append(style); doc.body.append(card);
  subtitleNodes = {card, source, translation};
  target.addEventListener('pagehide', () => { if (subtitleWindow === target) { subtitleWindow = null; subtitleNodes = null; renderSubtitleButton(); } }, {once: true});
  updateSubtitleAppearance();
}

async function openSubtitleWindow() {
  if (!$('#sourceSubtitlesEnabled').checked && !$('#translatedSubtitlesEnabled').checked) return;
  const doubleLine = $('#sourceSubtitlesEnabled').checked && $('#translatedSubtitlesEnabled').checked;
  if (window.pywebview?.api?.show_subtitles) {
    nativeSubtitleOpen = await window.pywebview.api.show_subtitles(
      Number($('#subtitleWidth').value), doubleLine ? 190 : 145
    );
    renderSubtitleButton();
    return;
  }
  if (subtitleWindow && !subtitleWindow.closed) { subtitleWindow.focus(); return; }
  try {
    if ('documentPictureInPicture' in window) {
      subtitleWindow = await window.documentPictureInPicture.requestWindow({
        width: Number($('#subtitleWidth').value), height: doubleLine ? 190 : 145
      });
    } else {
      subtitleWindow = window.open('', 'lingora-subtitles', `popup,width=${$('#subtitleWidth').value},height=180,resizable=yes`);
    }
    if (!subtitleWindow) throw new Error('blocked');
    buildSubtitleWindow(subtitleWindow); renderSubtitleButton();
  } catch { subtitleWindow = null; notify(t('subtitlePopupBlocked')); }
}

function closeSubtitleWindow() {
  if (window.pywebview?.api?.hide_subtitles) {
    window.pywebview.api.hide_subtitles(); nativeSubtitleOpen = false; renderSubtitleButton(); return;
  }
  subtitleWindow?.close(); subtitleWindow = null; subtitleNodes = null; renderSubtitleButton();
}

function renderSubtitleButton() {
  const open = nativeSubtitleOpen || Boolean(subtitleWindow && !subtitleWindow.closed);
  $('#openSubtitleButton').textContent = t(open ? 'closeSubtitleWindow' : 'openSubtitleWindow');
}

function updateSubtitleAppearance(state = null) {
  if (!subtitleNodes) return;
  const settings = bootstrap?.settings || formSettings();
  const sourceEnabled = $('#sourceSubtitlesEnabled').checked;
  const translatedEnabled = $('#translatedSubtitlesEnabled').checked;
  subtitleNodes.card.style.setProperty('--size', `${Number($('#subtitleFontSize').value || settings.subtitle_font_size)}px`);
  subtitleNodes.card.style.setProperty('--opacity', String(Number($('#subtitleOpacity').value || settings.subtitle_opacity) / 100));
  subtitleNodes.card.classList.toggle('source-only', sourceEnabled && !translatedEnabled);
  subtitleNodes.source.hidden = !sourceEnabled;
  subtitleNodes.translation.hidden = !translatedEnabled;
  if (state) {
    subtitleNodes.source.textContent = state.source_text || '';
    subtitleNodes.source.hidden = !sourceEnabled || !state.source_text;
    subtitleNodes.translation.textContent = state.translated_text || t('subtitleWaiting');
    subtitleNodes.translation.hidden = !translatedEnabled;
    subtitleNodes.translation.dir = state.translated_dir || 'auto';
    subtitleNodes.source.dir = state.source_dir || 'auto';
  } else if (!subtitleNodes.translation.textContent) subtitleNodes.translation.textContent = t('subtitleWaiting');
}

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
    $('#keyStatus').textContent = t(bootstrap.gemini_key_set ? 'keyExists' : 'keyMissing');
    $('#groqKeyStatus').textContent = t(bootstrap.groq_key_set ? 'keyExists' : 'keyMissing');
  }
  if (currentJob) renderJob(currentJob);
  renderRecentJobs();
  applyPlatformAudioHelp();
}

function applyPlatformAudioHelp() {
  if (!bootstrap) return;
  const isWindows = bootstrap.platform === 'windows';
  $('#openMixerButton').hidden = !isWindows;
  $('#audioGuideLink').hidden = !isWindows;
  if (isWindows) return;
  const isMac = bootstrap.platform === 'darwin';
  $('#setupSummary').textContent = t(isMac ? 'setupDescriptionDarwin' : 'setupDescriptionLinux');
  $('#setupHelpText').textContent = t(isMac ? 'setupHelpDarwin' : 'setupHelpLinux');
}

function formSettings() {
  const device = (selector) => selector.value === '' ? null : Number(selector.value);
  return {
    target_language: $('#targetLanguage').value,
    capture_device: device($('#captureDevice')),
    output_device: device($('#outputDevice')),
    original_audio_enabled: $('#originalAudioEnabled').checked,
    dub_audio_enabled: $('#dubAudioEnabled').checked,
    source_subtitles_enabled: $('#sourceSubtitlesEnabled').checked,
    translated_subtitles_enabled: $('#translatedSubtitlesEnabled').checked,
    original_volume: Number($('#originalVolume').value),
    dub_volume: Number($('#dubVolume').value),
    subtitle_font_size: Number($('#subtitleFontSize').value),
    subtitle_width: Number($('#subtitleWidth').value),
    subtitle_opacity: Number($('#subtitleOpacity').value),
    proxy_url: $('#proxyUrl').value.trim()
  };
}

function applySettings(settings) {
  fillLanguages($('#targetLanguage'), bootstrap.languages, settings.target_language);
  fillLanguages($('#mediaTargetLanguage'), bootstrap.languages, settings.target_language);
  fillSelect($('#captureDevice'), bootstrap.devices.captures, settings.capture_device);
  fillSelect($('#outputDevice'), bootstrap.devices.outputs, settings.output_device);
  fillSelect($('#mediaVoice'), bootstrap.voices, localStorage.getItem('lingora.mediaVoice') || localStorage.getItem('dubira.mediaVoice') || 'Kore', (voice) => voice);
  $('#originalAudioEnabled').checked = settings.original_audio_enabled;
  $('#dubAudioEnabled').checked = settings.dub_audio_enabled;
  $('#sourceSubtitlesEnabled').checked = settings.source_subtitles_enabled;
  $('#translatedSubtitlesEnabled').checked = settings.translated_subtitles_enabled;
  $('#subtitleFontSize').value = settings.subtitle_font_size;
  $('#subtitleWidth').value = settings.subtitle_width;
  $('#subtitleOpacity').value = settings.subtitle_opacity;
  $('#proxyUrl').value = settings.proxy_url;
  $('#originalVolume').value = settings.original_volume;
  $('#dubVolume').value = settings.dub_volume;
  updateRangeLabels();
  updateOutputControls();
  $('#targetCode').textContent = settings.target_language.toUpperCase();
  applyPlatformAudioHelp();
}

function updateRangeLabels() {
  $('#originalVolumeValue').textContent = `${Math.round(Number($('#originalVolume').value) * 100)}%`;
  $('#dubVolumeValue').textContent = `${Math.round(Number($('#dubVolume').value) * 100)}%`;
  $('#subtitleFontSizeValue').textContent = `${$('#subtitleFontSize').value}px`;
  $('#subtitleWidthValue').textContent = `${$('#subtitleWidth').value}px`;
  $('#subtitleOpacityValue').textContent = `${$('#subtitleOpacity').value}%`;
  updateSubtitleAppearance();
}

function updateOutputControls() {
  const originalAudio = $('#originalAudioEnabled').checked;
  const dubAudio = $('#dubAudioEnabled').checked;
  const subtitles = $('#sourceSubtitlesEnabled').checked || $('#translatedSubtitlesEnabled').checked;
  $('#audioLevels').hidden = !originalAudio && !dubAudio;
  $('#originalVolume').disabled = !originalAudio;
  $('#dubVolume').disabled = !dubAudio;
  $('#subtitleSettings').hidden = !subtitles;
  if (!subtitles && (nativeSubtitleOpen || (subtitleWindow && !subtitleWindow.closed))) closeSubtitleWindow();
  updateSubtitleAppearance();
}

async function loadBootstrap() {
  bootstrap = await request('/bootstrap');
  applySettings(bootstrap.settings);
  $('#keyStatus').textContent = t(bootstrap.gemini_key_set ? 'keyExists' : 'keyMissing');
  $('#groqKeyStatus').textContent = t(bootstrap.groq_key_set ? 'keyExists' : 'keyMissing');
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
  updateSubtitleAppearance(state);
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
  $('#jobQuality').hidden = job.quality_score == null;
  $('#jobQuality').classList.toggle('low-quality', job.quality_score != null && job.quality_score < 0.62);
  $('#jobQuality').textContent = job.quality_score == null
    ? ''
    : `${t('qualityScore')}: ${Math.round(job.quality_score * 100)}%`;
  const warnings = (job.warnings || []).map((warning) => t(warning)).join(' ');
  const model = job.translation_models?.length ? `${t('translationModel')}: ${job.translation_models.join(' → ')}` : '';
  $('#jobMessage').textContent = [job.error || warnings || (job.status === 'quota_wait' ? t('quotaNotice') : t('processingWarning')), model].filter(Boolean).join(' · ');
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
  if (!bootstrap.gemini_key_set) return notify(t('keyMissing'));
  if (!bootstrap.groq_key_set) return notify(t('groqKeyMissing'));
  const mode = document.querySelector('input[name="mediaMode"]:checked').value;
  const query = new URLSearchParams({
    filename: selectedMediaFile.name,
    target_language: $('#mediaTargetLanguage').value,
    mode,
    voice_name: $('#mediaVoice').value
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
function sourcePlayer() { return currentJob?.media_kind === 'audio' ? $('#sourceAudioPlayer') : $('#mediaPlayer'); }
function applyOriginalAudioState() {
  const source = sourcePlayer();
  const enabled = $('#hearOriginal').checked;
  source.defaultMuted = !enabled;
  source.muted = !enabled;
  source.volume = enabled ? Number($('#playerOriginalVolume').value) : 0;
}
function renderCaptions() {
  const time = sourcePlayer().currentTime;
  const source = cueAt(sourceCues, time);
  const translated = cueAt(translatedCues, time);
  $('#sourceCaption').textContent = source?.text || '';
  $('#translatedCaption').textContent = translated?.text || '';
  $('#sourceCaption').hidden = !$('#showSourceSubs').checked || !source;
  $('#translatedCaption').hidden = !$('#showTranslatedSubs').checked || !translated;
}

function syncPlayers(force = false) {
  const source = sourcePlayer();
  const dub = $('#dubbedPlayer');
  if (!$('#hearDubbed').checked || !Number.isFinite(source.currentTime)) return;
  const drift = dub.currentTime - source.currentTime;
  if (force || Math.abs(drift) > 0.12) {
    dub.currentTime = Math.min(source.currentTime, Number.isFinite(dub.duration) ? dub.duration : source.currentTime);
    dub.playbackRate = source.playbackRate;
  } else if (Math.abs(drift) > 0.04) {
    dub.playbackRate = source.playbackRate * (drift > 0 ? 0.98 : 1.02);
  } else {
    dub.playbackRate = source.playbackRate;
  }
}

async function loadPlayer(job) {
  const video = $('#mediaPlayer');
  const audio = $('#sourceAudioPlayer');
  const dub = $('#dubbedPlayer');
  video.pause(); audio.pause(); dub.pause();
  const isAudio = job.media_kind === 'audio';
  video.hidden = isAudio;
  $('#audioSourceStage').hidden = !isAudio;
  video.removeAttribute('src'); audio.removeAttribute('src');
  const source = isAudio ? audio : video;
  source.src = job.media_url || job.video_url;
  $('#audioSourceName').textContent = job.filename;
  dub.src = job.outputs['dubbed.wav'];
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
  source.load(); dub.load(); applyOriginalAudioState(); renderCaptions();
  loadedPlayerJobId = job.id;
}

$('#localeToggle').addEventListener('click', () => {
  locale = locale === 'fa' ? 'en' : 'fa';
  localStorage.setItem('lingora.locale', locale);
  translatePage();
  renderSubtitleButton();
});
$('#shutdownButton').addEventListener('click', async () => {
  $('#shutdownButton').disabled = true;
  try {
    await request('/shutdown', {method: 'POST'});
    $('#shutdownScreen').hidden = false;
    document.body.classList.add('is-closed');
  } catch (error) {
    $('#shutdownButton').disabled = false;
    notify(error.message);
  }
});
$('#settingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await request('/settings', {method: 'POST', body: JSON.stringify(formSettings())});
    bootstrap.settings = result.settings;
    notify(t('saved'), true);
  } catch (error) { notify(error.message); }
});
$('#openSubtitleButton').addEventListener('click', async () => {
  if (window.pywebview?.api?.subtitles_are_visible) {
    nativeSubtitleOpen = await window.pywebview.api.subtitles_are_visible();
  }
  if (nativeSubtitleOpen || (subtitleWindow && !subtitleWindow.closed)) closeSubtitleWindow(); else openSubtitleWindow();
});
$('#saveKeyButton').addEventListener('click', async () => {
  const apiKey = $('#apiKey').value.trim();
  if (!apiKey) return notify(t('keyMissing'));
  try {
    await request('/key', {method: 'POST', body: JSON.stringify({api_key: apiKey, provider: 'gemini'})});
    $('#apiKey').value = '';
    $('#keyStatus').textContent = t('keyExists');
    bootstrap.api_key_set = true;
    bootstrap.gemini_key_set = true;
    notify(t('keySaved'), true);
  } catch (error) { notify(error.message); }
});
$('#saveGroqKeyButton').addEventListener('click', async () => {
  const apiKey = $('#groqApiKey').value.trim();
  if (!apiKey) return notify(t('keyMissing'));
  try {
    await request('/key', {method: 'POST', body: JSON.stringify({api_key: apiKey, provider: 'groq'})});
    $('#groqApiKey').value = '';
    $('#groqKeyStatus').textContent = t('keyExists');
    bootstrap.groq_key_set = true;
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
    if (!state.running) {
      if ($('#sourceSubtitlesEnabled').checked || $('#translatedSubtitlesEnabled').checked) await openSubtitleWindow();
      const result = await request('/settings', {method: 'POST', body: JSON.stringify(formSettings())});
      bootstrap.settings = result.settings;
    }
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
['originalVolume', 'dubVolume', 'subtitleFontSize', 'subtitleWidth', 'subtitleOpacity'].forEach((id) => $(`#${id}`).addEventListener('input', updateRangeLabels));
['originalAudioEnabled', 'dubAudioEnabled', 'sourceSubtitlesEnabled', 'translatedSubtitlesEnabled'].forEach((id) => $(`#${id}`).addEventListener('change', updateOutputControls));

$('#mediaFile').addEventListener('change', (event) => selectMediaFile(event.target.files[0]));
$('#mediaVoice').addEventListener('change', () => localStorage.setItem('lingora.mediaVoice', $('#mediaVoice').value));
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

const dub = $('#dubbedPlayer');
[$('#mediaPlayer'), $('#sourceAudioPlayer')].forEach((source) => {
  source.addEventListener('play', async () => {
    applyOriginalAudioState();
    syncPlayers(true);
    if ($('#hearDubbed').checked) { try { await dub.play(); } catch {} }
  });
  source.addEventListener('pause', () => dub.pause());
  source.addEventListener('seeking', () => syncPlayers(true));
  source.addEventListener('ratechange', () => { dub.playbackRate = source.playbackRate; });
  source.addEventListener('timeupdate', renderCaptions);
  source.addEventListener('ended', () => { dub.pause(); dub.currentTime = 0; });
  source.addEventListener('loadedmetadata', applyOriginalAudioState);
  source.addEventListener('volumechange', () => {
    if (!$('#hearOriginal').checked && (!source.muted || source.volume !== 0)) applyOriginalAudioState();
  });
});
$('#hearOriginal').addEventListener('change', applyOriginalAudioState);
$('#hearDubbed').addEventListener('change', async () => {
  if (!$('#hearDubbed').checked) dub.pause();
  else if (!sourcePlayer().paused) { syncPlayers(true); try { await dub.play(); } catch {} }
});
['showSourceSubs', 'showTranslatedSubs'].forEach((id) => $(`#${id}`).addEventListener('change', renderCaptions));
$('#playerOriginalVolume').addEventListener('input', applyOriginalAudioState);
$('#playerDubVolume').addEventListener('input', () => { dub.volume = Number($('#playerDubVolume').value); });
setInterval(() => { if (!sourcePlayer().paused) syncPlayers(); }, 250);

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
