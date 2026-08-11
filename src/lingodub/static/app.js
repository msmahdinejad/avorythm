const $ = (selector) => document.querySelector(selector);
const API = '/api';
let locale = localStorage.getItem('lingodub.locale') || 'fa';
let bootstrap = null;
let stateTimer = null;
let lastError = '';

const messages = {
  fa: {
    tagline:'دوبلهٔ زنده، بدون دردسر', companionOnline:'همراه محلی آنلاین است', eyebrow:'ترجمه و دوبلهٔ هم‌زمان با Gemini', heroTitle:'هر صدایی را به زبان خودت بشنو.', heroText:'صدای فیلم، کلاس و ویدیو را زنده ترجمه کن؛ صدای اصلی و دوبله را جداگانه کنترل و هر چهار خروجی را ذخیره کن.', start:'شروع دوبله', stop:'توقف دوبله', record:'شروع ضبط', stopRecord:'پایان ضبط', status:'وضعیت', idle:'آماده', connecting:'در حال اتصال', connected:'در حال دوبله', error:'خطا', detectedLanguage:'زبان تشخیص‌داده‌شده', extension:'اکستنشن', notConnected:'متصل نیست', connectedExtension:'متصل است', recording:'ضبط', off:'خاموش', on:'روشن', liveTranscript:'متن زنده', clear:'پاک‌کردن', original:'صدای اصلی', translation:'ترجمه', waitingSource:'منتظر دریافت صدا…', waitingTranslation:'ترجمه اینجا نمایش داده می‌شود…', archive:'آرشیو', latestOutput:'آخرین خروجی', noRecording:'هنوز خروجی‌ای ثبت نشده', recordHint:'هنگام دوبله، ضبط را روشن کن تا چهار فایل هماهنگ ساخته شود.', downloadAll:'دریافت همه', controls:'کنترل‌ها', settings:'تنظیمات', quickSetup:'راه‌اندازی خودکار صدا', setupDescription:'بهترین ورودی و خروجی را پیدا می‌کنیم', setupHelp:'برای ویدیوهای مرورگر، اکستنشن خودش صدا را جدا می‌کند. برای برنامه‌های ویندوز، دستگاه مجازی لازم است.', runAutoSetup:'بررسی و تنظیم خودکار', openWindowsMixer:'باز کردن میکسر صدای ویندوز', targetLanguage:'زبان مقصد', speaker:'گوینده', voiceStyle:'سبک اجرا', captureDevice:'ورودی صدای برنامه', outputDevice:'خروجی شنیداری', soundMix:'ترکیب صدا', soundMixHint:'هر کدام را مستقل بشنو', originalSound:'صدای اصلی', dubbedSound:'صدای دوبله', advanced:'تنظیمات پیشرفته', save:'ذخیره', proxy:'پروکسی', saveSettings:'ذخیرهٔ تنظیمات', saved:'ذخیره شد.', keySaved:'کلید امن ذخیره شد.', keyExists:'کلید API تنظیم شده است', keyMissing:'کلید API را وارد کنید', setupDone:'تنظیم صدا انجام شد.', virtualMissing:'دستگاه مجازی پیدا نشد؛ اکستنشن بدون آن کار می‌کند.', mixerOpened:'میکسر ویندوز باز شد؛ صدای برنامه را به دستگاه مجازی بفرستید.', requestFailed:'درخواست انجام نشد', recordingReady:'چهار خروجی آماده است', selectDefault:'پیش‌فرض سیستم', locationUnsupported:'Google این API Key یا موقعیت اتصال را مجاز نمی‌داند؛ حساب و خروجی پروکسی را بررسی کن.'
  },
  en: {
    tagline:'Live dubbing, minus the friction', companionOnline:'Local companion is online', eyebrow:'Real-time translation and dubbing with Gemini', heroTitle:'Hear anything in your language.', heroText:'Translate movies, classes, and videos live; control source and dubbed audio independently, then save all four synchronized outputs.', start:'Start dubbing', stop:'Stop dubbing', record:'Start recording', stopRecord:'Stop recording', status:'Status', idle:'Ready', connecting:'Connecting', connected:'Dubbing live', error:'Error', detectedLanguage:'Detected language', extension:'Extension', notConnected:'Not connected', connectedExtension:'Connected', recording:'Recording', off:'Off', on:'On', liveTranscript:'Live transcript', clear:'Clear', original:'Original audio', translation:'Translation', waitingSource:'Waiting for audio…', waitingTranslation:'Your translation will appear here…', archive:'ARCHIVE', latestOutput:'Latest output', noRecording:'No output recorded yet', recordHint:'Enable recording while dubbing to create four synchronized files.', downloadAll:'Download all', controls:'CONTROLS', settings:'Settings', quickSetup:'Automatic audio setup', setupDescription:'We find the best input and output', setupHelp:'The extension isolates browser audio automatically. Desktop apps require a virtual audio device.', runAutoSetup:'Detect and configure', openWindowsMixer:'Open Windows volume mixer', targetLanguage:'Target language', speaker:'Speaker', voiceStyle:'Delivery style', captureDevice:'Application audio input', outputDevice:'Listening output', soundMix:'Audio mix', soundMixHint:'Listen independently', originalSound:'Original audio', dubbedSound:'Dubbed audio', advanced:'Advanced settings', save:'Save', proxy:'Proxy', saveSettings:'Save settings', saved:'Saved.', keySaved:'Key stored securely.', keyExists:'API key is configured', keyMissing:'Enter an API key', setupDone:'Audio configured.', virtualMissing:'No virtual device found; the extension still works without one.', mixerOpened:'Windows mixer opened; route your app to the virtual device.', requestFailed:'Request failed', recordingReady:'Four outputs are ready', selectDefault:'System default', locationUnsupported:'Google does not allow this API key or connection location; check the account and proxy exit.'
  }
};

const languageNames = {
  fa:{fa:'فارسی',en:'انگلیسی',ar:'عربی',de:'آلمانی',fr:'فرانسوی',es:'اسپانیایی',it:'ایتالیایی',ja:'ژاپنی',ko:'کره‌ای',ru:'روسی',tr:'ترکی',zh:'چینی'},
  en:{fa:'Persian',en:'English',ar:'Arabic',de:'German',fr:'French',es:'Spanish',it:'Italian',ja:'Japanese',ko:'Korean',ru:'Russian',tr:'Turkish',zh:'Chinese'}
};

function t(key){ return messages[locale][key] || key; }
function formatError(message){
  if (message?.toLowerCase().includes('location is not supported')) return t('locationUnsupported');
  return message;
}
function translatePage(){
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  $('#localeToggle').textContent = locale === 'fa' ? 'EN' : 'فا';
  if (bootstrap) fillLanguages(bootstrap.languages, $('#targetLanguage').value);
}

async function request(path, options = {}){
  const response = await fetch(`${API}${path}`, {headers:{'Content-Type':'application/json'}, ...options});
  if (!response.ok){
    let detail = `${t('requestFailed')} (${response.status})`;
    try { detail = (await response.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  return response.json();
}

function notify(message, success = false){
  const notice = $('#notice');
  notice.textContent = message;
  notice.classList.toggle('success', success);
  notice.hidden = false;
  clearTimeout(notice._timer);
  notice._timer = setTimeout(() => { notice.hidden = true; }, 5500);
}

function fillSelect(element, items, selected, label){
  element.replaceChildren(...items.map((item) => {
    const option = document.createElement('option');
    option.value = item.index ?? item;
    option.textContent = label ? label(item) : item.name;
    option.selected = String(option.value) === String(selected);
    return option;
  }));
}

function fillLanguages(languages, selected){
  const display = new Intl.DisplayNames([locale === 'fa' ? 'fa' : 'en'], {type:'language'});
  fillSelect($('#targetLanguage'), languages, selected, (code) => {
    const base = code.split('-')[0];
    try { return `${languageNames[locale][base] || display.of(base) || code} · ${code}`; } catch { return code; }
  });
}

function formSettings(){
  return {
    target_language:$('#targetLanguage').value,
    capture_device:Number($('#captureDevice').value), output_device:Number($('#outputDevice').value),
    original_volume:Number($('#originalVolume').value), dub_volume:Number($('#dubVolume').value),
    voice:$('#voice').value, voice_style:$('#voiceStyle').value.trim(), proxy_url:$('#proxyUrl').value.trim()
  };
}

function applySettings(settings){
  fillLanguages(bootstrap.languages, settings.target_language);
  fillSelect($('#voice'), bootstrap.voices, settings.voice, (voice) => voice === 'Native' ? `Gemini Native · ${voice}` : voice);
  fillSelect($('#captureDevice'), bootstrap.devices.captures, settings.capture_device);
  fillSelect($('#outputDevice'), bootstrap.devices.outputs, settings.output_device);
  $('#voiceStyle').value = settings.voice_style;
  $('#proxyUrl').value = settings.proxy_url;
  $('#originalVolume').value = settings.original_volume;
  $('#dubVolume').value = settings.dub_volume;
  updateRangeLabels();
  $('#targetCode').textContent = settings.target_language.toUpperCase();
}

function updateRangeLabels(){
  $('#originalVolumeValue').textContent = `${Math.round(Number($('#originalVolume').value) * 100)}%`;
  $('#dubVolumeValue').textContent = `${Math.round(Number($('#dubVolume').value) * 100)}%`;
}

async function loadBootstrap(){
  bootstrap = await request('/bootstrap');
  applySettings(bootstrap.settings);
  $('#keyStatus').textContent = t(bootstrap.api_key_set ? 'keyExists' : 'keyMissing');
  translatePage();
}

function renderState(state){
  const statusKey = ['idle','connecting','connected','error'].includes(state.status) ? state.status : 'idle';
  $('#runtimeStatus').textContent = t(statusKey);
  $('#runtimeStatus').classList.toggle('active', state.running);
  $('#detectedLanguage').textContent = state.source_lang ? state.source_lang.toUpperCase() : '—';
  $('#sourceCode').textContent = state.source_lang ? state.source_lang.toUpperCase() : 'AUTO';
  $('#extensionStatus').textContent = t(state.extension_connections > 0 ? 'connectedExtension' : 'notConnected');
  $('#recordingStatus').textContent = t(state.recording ? 'on' : 'off');
  $('#recordingStatus').classList.toggle('active', state.recording);
  $('#startButton').dataset.i18n = state.running ? 'stop' : 'start';
  $('#startButton').lastElementChild.textContent = t(state.running ? 'stop' : 'start');
  $('#startButton').classList.toggle('is-running', state.running);
  $('#recordButton').disabled = !state.running;
  $('#recordButton').classList.toggle('is-recording', state.recording);
  $('#recordButton').dataset.i18n = state.recording ? 'stopRecord' : 'record';
  $('#recordButton').lastElementChild.textContent = t(state.recording ? 'stopRecord' : 'record');
  if (state.source_text){ $('#sourceText').textContent = state.source_text; $('#sourceText').classList.add('has-text'); }
  if (state.translated_text){ $('#translatedText').textContent = state.translated_text; $('#translatedText').classList.add('has-text'); }
  const interfaceDirection = locale === 'fa' ? 'rtl' : 'ltr';
  $('#sourceText').dir = state.source_text ? (state.source_dir || 'auto') : interfaceDirection;
  $('#translatedText').dir = state.translated_text
    ? (state.translated_dir || 'auto')
    : interfaceDirection;
  if (state.error && state.error !== lastError){ lastError = state.error; notify(formatError(state.error)); }
  if (!state.error) lastError = '';
  if (state.latest_recording){
    $('#downloadPanel').classList.remove('empty');
    $('#downloadPanel strong').textContent = t('recordingReady');
    $('#downloadAll').href = `/api/recordings/${encodeURIComponent(state.latest_recording)}/all-outputs.zip`;
    $('#downloadAll').hidden = false;
  }
}

async function pollState(){
  try { renderState(await request('/state')); $('#connectionBadge').classList.remove('offline'); }
  catch { $('#connectionBadge').classList.add('offline'); }
}

$('#localeToggle').addEventListener('click', () => { locale = locale === 'fa' ? 'en' : 'fa'; localStorage.setItem('lingodub.locale', locale); translatePage(); });
$('#settingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try { const result = await request('/settings',{method:'POST',body:JSON.stringify(formSettings())}); bootstrap.settings = result.settings; notify(t('saved'),true); }
  catch (error) { notify(error.message); }
});
$('#saveKeyButton').addEventListener('click', async () => {
  const apiKey = $('#apiKey').value.trim();
  if (!apiKey) return notify(t('keyMissing'));
  try { await request('/key',{method:'POST',body:JSON.stringify({api_key:apiKey})}); $('#apiKey').value=''; $('#keyStatus').textContent=t('keyExists'); notify(t('keySaved'),true); }
  catch (error) { notify(error.message); }
});
$('#autoSetupButton').addEventListener('click', async () => {
  try {
    const response = await request('/audio/auto-setup',{method:'POST'});
    bootstrap.settings = response.settings; applySettings(response.settings);
    notify(t(response.result.virtual_device_found ? 'setupDone' : 'virtualMissing'), response.result.virtual_device_found);
  } catch (error) { notify(error.message); }
});
$('#openMixerButton').addEventListener('click', async () => {
  try { await request('/audio/open-mixer',{method:'POST'}); notify(t('mixerOpened'),true); } catch (error) { notify(error.message); }
});
$('#startButton').addEventListener('click', async () => {
  try { const state = await request('/state'); await request(state.running ? '/stop' : '/start',{method:'POST'}); await pollState(); } catch (error) { notify(error.message); }
});
$('#recordButton').addEventListener('click', async () => {
  try { const state = await request('/state'); await request(state.recording ? '/record/stop' : '/record/start',{method:'POST'}); await pollState(); } catch (error) { notify(error.message); }
});
$('#clearTranscript').addEventListener('click', () => {
  $('#sourceText').textContent=t('waitingSource'); $('#sourceText').classList.remove('has-text');
  $('#translatedText').textContent=t('waitingTranslation'); $('#translatedText').classList.remove('has-text');
});
['originalVolume','dubVolume'].forEach((id) => $(`#${id}`).addEventListener('input', updateRangeLabels));

(async () => {
  translatePage();
  try { await loadBootstrap(); await pollState(); stateTimer = setInterval(pollState, 1000); }
  catch (error) { $('#connectionBadge').classList.add('offline'); notify(error.message); }
})();
