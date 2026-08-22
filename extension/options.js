import {
  DEFAULT_SETTINGS,
  GROQ_AUDIO_CONSENT_VERSION,
  normalizeSettings,
  outputMix,
  updateOutputMix
} from './core.mjs';

const $ = (selector) => document.querySelector(selector);
const CONSENT_VERSION = 1;
let settings = normalizeSettings();
let keySet = false;
let groqKeySet = false;
let groqPermissionGranted = false;
const MIX_TOGGLES = ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled','autoDuck'];
const MIX_VOLUMES = ['originalVolume','dubVolume'];
const mixControlId = (prefix, field) => `${prefix}${field[0].toUpperCase()}${field.slice(1)}`;

const copy = {
  fa: {
    settingsTitle:'تنظیمات اکستنشن',saved:'تغییرات خودکار ذخیره می‌شوند',heading:'تجربهٔ ترجمه را دقیقاً برای خودت تنظیم کن.',intro:'کنترل صدا، زیرنویس، ضبط و پلیر هماهنگ در یک جای آرام و خوانا؛ صفحهٔ اصلی اکستنشن فقط برای شروع سریع می‌ماند.',
    navConnection:'اتصال',navOutput:'خروجی',navCaptions:'زیرنویس',navSync:'هماهنگی',navPrivacy:'حریم خصوصی',connection:'اتصال به Gemini',connectionHelp:'کلید فقط در حافظهٔ همین نشست مرورگر نگه‌داری می‌شود.',saveKey:'ذخیره',clearKey:'پاک‌کردن کلید این نشست',keyReady:'کلید برای این نشست آماده است.',keyMissing:'هنوز کلیدی ثبت نشده است.',keySaved:'کلید با موفقیت برای این نشست ذخیره شد.',keyCleared:'کلید این نشست پاک شد.',invalidKey:'کلید معتبر نیست.',
    output:'خروجی',outputHelp:'هر چهار کانال مستقل‌اند؛ هر ترکیبی که می‌خواهی انتخاب کن.',pageOutput:'پخش داخل تب',pageOutputHelp:'این تنظیمات فقط روی حالت سریع «داخل همین صفحه» اثر دارند.',syncOutput:'پخش و خروجی پلیر هماهنگ',syncOutputHelp:'مستقل از پخش داخل تب؛ همین ترکیب صوتی در ویدیوی خروجی اعمال می‌شود.',originalAudio:'صدای اصلی',originalAudioHelp:'صدای واقعی ویدئو یا صفحه',dubbedAudio:'صدای دوبله',dubbedAudioHelp:'صدای ترجمه‌شدهٔ Gemini',sourceSubtitles:'زیرنویس اصلی',sourceSubtitlesHelp:'متن زبان گوینده',translatedSubtitles:'زیرنویس ترجمه',translatedSubtitlesHelp:'متن زبان مقصد',originalVolume:'بلندی صدای اصلی',dubVolume:'بلندی صدای دوبله',autoDuck:'کاهش هوشمند صدای اصلی',autoDuckHelp:'هنگام صحبت دوبله، صدای اصلی آرام‌تر می‌شود.',recording:'ذخیرهٔ چهار خروجی',recordingHelp:'دو WAV و دو SRT در Downloads؛ پیش‌فرض خاموش است.',downloadsDenied:'بدون اجازهٔ Downloads، ذخیرهٔ خروجی فعال نمی‌شود.',
    captions:'کادر زیرنویس',captionsHelp:'کادر روی صفحه قابل جابه‌جایی، تغییر اندازه و اسکرول است.',position:'جای اولیه',bottomCenter:'پایین، وسط',bottomLeft:'پایین، چپ',bottomRight:'پایین، راست',topCenter:'بالا، وسط',fontSize:'اندازهٔ متن',width:'عرض کادر',opacity:'شفافیت پس‌زمینه',
    syncPlayer:'ضبط و پلیر هماهنگ',syncHelp:'ضبط تب جلوتر از پلیر ادامه پیدا می‌کند تا پخش، Seek و دوبله پایدار بمانند.',buffer:'فاصلهٔ ضبط تا پخش',bufferHelp:'ضبط جلوتر از پلیر ادامه پیدا می‌کند؛ ۲۰ ثانیه برای پایداری پیشنهاد می‌شود.',faster:'شروع سریع‌تر',steadier:'هماهنگی پایدارتر',timingEngine:'موتور دوبلهٔ هماهنگ',geminiTiming:'Gemini 3.5 Live · سریع‌تر',whisperTiming:'Whisper + LLM + Gemini 3.1 Live · دقیق‌تر',timingEngineHelp:'حالت دقیق ابتدا جمله و زمان را با Groq Whisper می‌گیرد، آن را با مخزن رایگان Gemini ترجمه می‌کند و صدای نهایی را با Gemini 3.1 Flash Live دقیقاً روی همان بازه می‌نشاند. در شبکه‌های محدود، Chrome هم باید api.groq.com را از پروکسی سیستم یا مرورگر عبور دهد.',voiceName:'گویندهٔ حالت دقیق',clearGroqKey:'پاک‌کردن کلید Groq این نشست',groqKeyReady:'کلید Groq برای این نشست آماده است.',groqKeyMissing:'برای حالت دقیق یک کلید Groq وارد کن.',groqPermissionReady:'دسترسی Chrome به Groq فعال است.',groqPermissionMissing:'هنوز اجازهٔ اتصال Chrome به Groq داده نشده است.',grantGroqPermission:'دادن اجازهٔ اتصال به Groq',groqConsentTitle:'اجازه می‌دهم بازه‌های کوتاه صدای تب انتخاب‌شده مستقیماً برای Groq Whisper ارسال شوند',groqConsentBody:'این ارسال فقط در حالت دقیق و برای تبدیل گفتار به متن و دریافت زمان‌بندی انجام می‌شود. سپس متن به Google Gemini می‌رود تا ترجمه و صدا ساخته شود.',
    consentTipTitle:'یک مرحلهٔ ضروری',consentTipBody:'پیش از اولین ترجمه، در بخش حریم خصوصی تأیید کن که صدای تب انتخاب‌شده می‌تواند به Google Gemini فرستاده شود.',consentTipAction:'بررسی اجازه ↓',privacyTitle:'اجازه و حریم خصوصی',privacyHelp:'Avorythm تبلیغ، آنالیتیکس یا سرور توسعه‌دهنده ندارد.',consentTitle:'ارسال صدای تب انتخاب‌شده به Google Gemini را تأیید می‌کنم',consentBody:'پردازش فقط پس از زدن «شروع» انجام می‌شود. ذخیرهٔ چهار خروجی پیش‌فرض خاموش است؛ پلیر هماهنگ برای Seek و خروجی WebM، تب را محلی ضبط می‌کند.',privacyPolicy:'سیاست حریم خصوصی ↗',helpPage:'راهنمای کامل ↗',projectPage:'صفحهٔ پروژه ↗',reset:'بازگرداندن تنظیمات پیش‌فرض',resetDone:'تنظیمات پیش‌فرض بازگردانده شد.',groqPermissionDenied:'بدون اجازهٔ اتصال به Groq، زمان‌بندی Whisper فعال نمی‌شود.'
  },
  en: {
    settingsTitle:'Extension settings',saved:'Changes save automatically',heading:'Shape the translation experience around you.',intro:'Audio, captions, recording, and synchronized playback live in one calm, readable space—leaving the popup focused on starting quickly.',
    navConnection:'Connection',navOutput:'Output',navCaptions:'Captions',navSync:'Synchronization',navPrivacy:'Privacy',connection:'Connect to Gemini',connectionHelp:'Your key stays in memory for this browser session only.',saveKey:'Save',clearKey:'Clear session key',keyReady:'The key is ready for this session.',keyMissing:'No key is configured yet.',keySaved:'The key was saved for this session.',keyCleared:'The session key was cleared.',invalidKey:'The key is invalid.',
    output:'Output',outputHelp:'All four channels are independent—combine them however you like.',pageOutput:'On-page playback',pageOutputHelp:'These controls affect only the fast “On this page” mode.',syncOutput:'Synchronized playback & export',syncOutputHelp:'Independent from on-page playback; this audio mix is also used for the exported video.',originalAudio:'Original audio',originalAudioHelp:'The page or video’s real sound',dubbedAudio:'Dubbed audio',dubbedAudioHelp:'Gemini’s translated speech',sourceSubtitles:'Source subtitles',sourceSubtitlesHelp:'Speech in the original language',translatedSubtitles:'Translated subtitles',translatedSubtitlesHelp:'Text in your target language',originalVolume:'Original volume',dubVolume:'Dubbed volume',autoDuck:'Smart original-audio ducking',autoDuckHelp:'Lower the original while translated speech plays.',recording:'Save four outputs',recordingHelp:'Two WAV and two SRT files in Downloads; off by default.',downloadsDenied:'Output saving stays off without Downloads access.',
    captions:'Subtitle card',captionsHelp:'Move, resize, and scroll the card directly on the page.',position:'Initial position',bottomCenter:'Bottom center',bottomLeft:'Bottom left',bottomRight:'Bottom right',topCenter:'Top center',fontSize:'Text size',width:'Card width',opacity:'Background opacity',
    syncPlayer:'Synchronized recorder & player',syncHelp:'The tab keeps recording ahead of playback so seeking and dubbing remain stable.',buffer:'Recording lead',bufferHelp:'Capture stays ahead of playback; 20 seconds is recommended for stability.',faster:'Faster start',steadier:'Steadier sync',timingEngine:'Synchronized dubbing engine',geminiTiming:'Gemini 3.5 Live · faster',whisperTiming:'Whisper + LLM + Gemini 3.1 Live · more precise',timingEngineHelp:'Precise mode timestamps each utterance with Groq Whisper, translates it through the free Gemini model pool, then fits Gemini 3.1 Flash Live speech to that exact interval. On restricted networks, Chrome must also route api.groq.com through the browser or system proxy.',voiceName:'Precise-mode voice',clearGroqKey:'Clear Groq session key',groqKeyReady:'The Groq key is ready for this session.',groqKeyMissing:'Add a Groq key to use precise mode.',groqPermissionReady:'Chrome access to Groq is enabled.',groqPermissionMissing:'Chrome access to Groq has not been granted yet.',grantGroqPermission:'Allow access to Groq',groqConsentTitle:'I allow short audio windows from the selected tab to be sent directly to Groq Whisper',groqConsentBody:'This happens only in precise mode to transcribe speech and return timestamps. The resulting text then goes to Google Gemini for translation and voice generation.',
    consentTipTitle:'One required step',consentTipBody:'Before the first translation, open Privacy below and confirm that audio from the selected tab may be sent to Google Gemini.',consentTipAction:'Review consent ↓',privacyTitle:'Consent and privacy',privacyHelp:'Avorythm has no ads, analytics, or developer-operated server.',consentTitle:'I allow audio from my selected tab to be sent to Google Gemini',consentBody:'Processing starts only after you press Start. Four-output saving is off by default; synchronized playback records the tab locally for seeking and WebM export.',privacyPolicy:'Privacy policy ↗',helpPage:'Complete guide ↗',projectPage:'Project page ↗',reset:'Restore default settings',resetDone:'Default settings were restored.',groqPermissionDenied:'Whisper timing needs permission to connect to Groq.'
  }
};

function t(key){ return copy[settings.locale]?.[key] || copy.en[key] || key; }

function translate(){
  document.documentElement.lang=settings.locale;
  document.documentElement.dir=settings.locale==='fa'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node)=>{node.textContent=t(node.dataset.i18n);});
  $('#localeToggle').textContent=settings.locale==='fa'?'EN':'فا';
  $('#helpPageLink').href=`https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP${settings.locale==='fa'?'.fa':''}.md`;
}

function notice(message, success=false){
  const box=$('#notice'); box.textContent=message; box.hidden=!message; box.classList.toggle('success',success);
  if(message) setTimeout(()=>{if(box.textContent===message) box.hidden=true;},3500);
}

function renderKey(){
  $('#keyStatus').textContent=t(keySet?'keyReady':'keyMissing');
  $('#clearKeyButton').hidden=!keySet;
  $('#groqKeyStatus').textContent=t(groqKeySet?'groqKeyReady':'groqKeyMissing');
  $('#groqPermissionStatus').textContent=t(groqPermissionGranted?'groqPermissionReady':'groqPermissionMissing');
  $('#grantGroqPermissionButton').hidden=groqPermissionGranted;
  $('#clearGroqKeyButton').hidden=!groqKeySet;
}

function renderMix(prefix, mix){
  for(const field of MIX_TOGGLES) $(`#${mixControlId(prefix,field)}`).checked=Boolean(mix[field]);
  for(const field of MIX_VOLUMES) $(`#${mixControlId(prefix,field)}`).value=mix[field];
  $(`#${mixControlId(prefix,'originalVolume')}Value`).textContent=`${Math.round(mix.originalVolume*100)}%`;
  $(`#${mixControlId(prefix,'dubVolume')}Value`).textContent=`${Math.round(mix.dubVolume*100)}%`;
  $(`#${mixControlId(prefix,'originalVolume')}`).disabled=!mix.originalAudioEnabled;
  $(`#${mixControlId(prefix,'dubVolume')}`).disabled=!mix.dubAudioEnabled;
  $(`#${mixControlId(prefix,'autoDuck')}`).disabled=!mix.originalAudioEnabled||!mix.dubAudioEnabled;
}

function readMix(prefix){
  return {
    ...Object.fromEntries(MIX_TOGGLES.map((field)=>[field,$(`#${mixControlId(prefix,field)}`).checked])),
    ...Object.fromEntries(MIX_VOLUMES.map((field)=>[field,Number($(`#${mixControlId(prefix,field)}`).value)]))
  };
}

function render(){
  translate(); renderKey();
  renderMix('page',outputMix(settings,'low-latency'));
  renderMix('sync',outputMix(settings,'synchronized'));
  $('#recording').checked=Boolean(settings.recording);
  $('#dataConsent').checked=settings.consentVersion===CONSENT_VERSION;
  $('#groqAudioConsent').checked=settings.groqAudioConsentVersion===GROQ_AUDIO_CONSENT_VERSION;
  for(const id of ['subtitleFontSize','subtitleWidth','subtitleOpacity','syncBufferSeconds']) $(`#${id}`).value=settings[id];
  $('#subtitlePosition').value=settings.subtitlePosition;
  $('#syncCaptionEngine').value=settings.syncCaptionEngine;
  $('#syncVoiceName').value=settings.syncVoiceName;
  $('#subtitleFontSizeValue').textContent=`${settings.subtitleFontSize}px`;
  $('#subtitleWidthValue').textContent=`${settings.subtitleWidth}px`;
  $('#subtitleOpacityValue').textContent=`${settings.subtitleOpacity}%`;
  $('#syncBufferValue').textContent=`${Number(settings.syncBufferSeconds).toFixed(1)}s`;
  $('#consentTip').hidden=settings.consentVersion===CONSENT_VERSION;
  const groqReady=groqKeySet&&groqPermissionGranted&&settings.groqAudioConsentVersion===GROQ_AUDIO_CONSENT_VERSION;
  $('#groqConnection').classList.toggle('required',settings.syncCaptionEngine==='whisper'&&!groqReady);
}

async function persist(live=true){
  await chrome.storage.local.set({settings});
  if(live){
    const state=await chrome.runtime.sendMessage({type:'state'});
    if(state?.state?.active) await chrome.runtime.sendMessage({type:'audio',config:settings});
  }
  $('#saveState').classList.add('changed');
  setTimeout(()=>$('#saveState').classList.remove('changed'),700);
  render();
}

function readControls(){
  settings=updateOutputMix(settings,'low-latency',readMix('page'));
  settings=updateOutputMix(settings,'synchronized',readMix('sync'));
  settings.recording=$('#recording').checked;
  for(const id of ['subtitleFontSize','subtitleWidth','subtitleOpacity','syncBufferSeconds']) settings[id]=Number($(`#${id}`).value);
  settings.subtitlePosition=$('#subtitlePosition').value;
  settings.syncCaptionEngine=$('#syncCaptionEngine').value;
  settings.syncVoiceName=$('#syncVoiceName').value;
  settings.consentVersion=$('#dataConsent').checked?CONSENT_VERSION:0;
  settings.groqAudioConsentVersion=$('#groqAudioConsent').checked?GROQ_AUDIO_CONSENT_VERSION:0;
  settings=normalizeSettings(settings);
}

$('#localeToggle').addEventListener('click',async()=>{settings.locale=settings.locale==='fa'?'en':'fa';await persist(false);});
$('#saveKeyButton').addEventListener('click',async()=>{
  const response=await chrome.runtime.sendMessage({type:'set-key',apiKey:$('#apiKey').value.trim()});
  if(response?.ok){keySet=true;$('#apiKey').value='';renderKey();notice(t('keySaved'),true);}else notice(t('invalidKey'));
});
$('#clearKeyButton').addEventListener('click',async()=>{await chrome.runtime.sendMessage({type:'clear-key'});keySet=false;renderKey();notice(t('keyCleared'),true);});
async function requestGroqPermission(){
  groqPermissionGranted=await chrome.permissions.request({origins:['https://api.groq.com/*']});
  if(!groqPermissionGranted) notice(t('groqPermissionDenied'));
  render();
  return groqPermissionGranted;
}
$('#grantGroqPermissionButton').addEventListener('click',requestGroqPermission);
$('#saveGroqKeyButton').addEventListener('click',async()=>{
  if(!groqPermissionGranted&&!await requestGroqPermission()) return;
  const response=await chrome.runtime.sendMessage({type:'set-groq-key',apiKey:$('#groqApiKey').value.trim()});
  if(response?.ok){groqKeySet=true;$('#groqApiKey').value='';renderKey();notice(t('keySaved'),true);}else notice(t('invalidKey'));
});
$('#clearGroqKeyButton').addEventListener('click',async()=>{await chrome.runtime.sendMessage({type:'clear-groq-key'});await chrome.permissions.remove({origins:['https://api.groq.com/*']});groqKeySet=false;groqPermissionGranted=false;render();notice(t('keyCleared'),true);});
document.querySelectorAll('input,select').forEach((element)=>{
  if(['apiKey','groqApiKey'].includes(element.id)) return;
  const event=element.type==='range'?'input':'change';
  element.addEventListener(event,async()=>{
    if(element.id==='recording'&&element.checked){
      const granted=await chrome.permissions.request({permissions:['downloads']});
      if(!granted){element.checked=false;notice(t('downloadsDenied'));}
    }
    readControls(); await persist();
  });
});
$('#resetButton').addEventListener('click',async()=>{
  const locale=settings.locale;
  settings=normalizeSettings({...DEFAULT_SETTINGS,locale});
  await persist(); notice(t('resetDone'),true);
});

(async()=>{
  const [stored,response]=await Promise.all([chrome.storage.local.get('settings'),chrome.runtime.sendMessage({type:'bootstrap'})]);
  if(!response?.ok) throw new Error(response?.error||'bootstrap_failed');
  settings=normalizeSettings(stored.settings);
  keySet=Boolean(response.data.api_key_set);
  groqKeySet=Boolean(response.data.groq_api_key_set);
  groqPermissionGranted=Boolean(response.data.groq_permission_granted);
  render();
})().catch((error)=>notice(error.message));
