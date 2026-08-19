import {DEFAULT_SETTINGS, normalizeSettings} from './core.mjs';

const $ = (selector) => document.querySelector(selector);
const CONSENT_VERSION = 1;
let settings = normalizeSettings();
let keySet = false;

const copy = {
  fa: {
    settingsTitle:'تنظیمات اکستنشن',saved:'تغییرات خودکار ذخیره می‌شوند',heading:'تجربهٔ ترجمه را دقیقاً برای خودت تنظیم کن.',intro:'کنترل صدا، زیرنویس، ضبط و پلیر هماهنگ در یک جای آرام و خوانا؛ صفحهٔ اصلی اکستنشن فقط برای شروع سریع می‌ماند.',
    navConnection:'اتصال',navOutput:'خروجی',navCaptions:'زیرنویس',navSync:'هماهنگی',navPrivacy:'حریم خصوصی',connection:'اتصال به Gemini',connectionHelp:'کلید فقط در حافظهٔ همین نشست مرورگر نگه‌داری می‌شود.',saveKey:'ذخیره',clearKey:'پاک‌کردن کلید این نشست',keyReady:'کلید برای این نشست آماده است.',keyMissing:'هنوز کلیدی ثبت نشده است.',keySaved:'کلید با موفقیت برای این نشست ذخیره شد.',keyCleared:'کلید این نشست پاک شد.',invalidKey:'کلید معتبر نیست.',
    output:'ترکیب خروجی',outputHelp:'هر چهار کانال مستقل‌اند؛ هر ترکیبی که می‌خواهی انتخاب کن.',originalAudio:'صدای اصلی',originalAudioHelp:'صدای واقعی ویدئو یا صفحه',dubbedAudio:'صدای دوبله',dubbedAudioHelp:'صدای ترجمه‌شدهٔ Gemini',sourceSubtitles:'زیرنویس اصلی',sourceSubtitlesHelp:'متن زبان گوینده',translatedSubtitles:'زیرنویس ترجمه',translatedSubtitlesHelp:'متن زبان مقصد',originalVolume:'بلندی صدای اصلی',dubVolume:'بلندی صدای دوبله',autoDuck:'کاهش هوشمند صدای اصلی',autoDuckHelp:'هنگام صحبت دوبله، صدای اصلی آرام‌تر می‌شود.',recording:'ذخیرهٔ چهار خروجی',recordingHelp:'دو WAV و دو SRT در Downloads؛ پیش‌فرض خاموش است.',downloadsDenied:'بدون اجازهٔ Downloads، ذخیرهٔ خروجی فعال نمی‌شود.',
    captions:'کادر زیرنویس',captionsHelp:'کادر روی صفحه قابل جابه‌جایی، تغییر اندازه و اسکرول است.',position:'جای اولیه',bottomCenter:'پایین، وسط',bottomLeft:'پایین، چپ',bottomRight:'پایین، راست',topCenter:'بالا، وسط',fontSize:'اندازهٔ متن',width:'عرض کادر',opacity:'شفافیت پس‌زمینه',
    syncPlayer:'پلیر هماهنگ',syncHelp:'ویدئوی تب را بافر می‌کند تا دوبله روی timeline نزدیک‌تری پخش شود.',buffer:'بافر صوت و تصویر',bufferHelp:'بافر بیشتر، هماهنگی پایدارتر؛ بافر کمتر، شروع سریع‌تر.',faster:'شروع سریع‌تر',steadier:'هماهنگی پایدارتر',
    privacyTitle:'اجازه و حریم خصوصی',privacyHelp:'Avorythm تبلیغ، آنالیتیکس یا سرور توسعه‌دهنده ندارد.',consentTitle:'ارسال صدای تب انتخاب‌شده به Google Gemini را تأیید می‌کنم',consentBody:'پردازش فقط بعد از زدن «شروع» انجام می‌شود. ضبط جداگانه و به‌طور پیش‌فرض خاموش است.',privacyPolicy:'سیاست حریم خصوصی ↗',projectPage:'صفحهٔ پروژه ↗',reset:'بازگرداندن تنظیمات پیش‌فرض',resetDone:'تنظیمات پیش‌فرض بازگردانده شد.'
  },
  en: {
    settingsTitle:'Extension settings',saved:'Changes save automatically',heading:'Shape the translation experience around you.',intro:'Audio, captions, recording, and synchronized playback live in one calm, readable space—leaving the popup focused on starting quickly.',
    navConnection:'Connection',navOutput:'Output',navCaptions:'Captions',navSync:'Synchronization',navPrivacy:'Privacy',connection:'Connect to Gemini',connectionHelp:'Your key stays in memory for this browser session only.',saveKey:'Save',clearKey:'Clear session key',keyReady:'The key is ready for this session.',keyMissing:'No key is configured yet.',keySaved:'The key was saved for this session.',keyCleared:'The session key was cleared.',invalidKey:'The key is invalid.',
    output:'Output mix',outputHelp:'All four channels are independent—combine them however you like.',originalAudio:'Original audio',originalAudioHelp:'The page or video’s real sound',dubbedAudio:'Dubbed audio',dubbedAudioHelp:'Gemini’s translated speech',sourceSubtitles:'Source subtitles',sourceSubtitlesHelp:'Speech in the original language',translatedSubtitles:'Translated subtitles',translatedSubtitlesHelp:'Text in your target language',originalVolume:'Original volume',dubVolume:'Dubbed volume',autoDuck:'Smart original-audio ducking',autoDuckHelp:'Lower the original while translated speech plays.',recording:'Save four outputs',recordingHelp:'Two WAV and two SRT files in Downloads; off by default.',downloadsDenied:'Output saving stays off without Downloads access.',
    captions:'Subtitle card',captionsHelp:'Move, resize, and scroll the card directly on the page.',position:'Initial position',bottomCenter:'Bottom center',bottomLeft:'Bottom left',bottomRight:'Bottom right',topCenter:'Top center',fontSize:'Text size',width:'Card width',opacity:'Background opacity',
    syncPlayer:'Synchronized player',syncHelp:'Buffers tab video so the dub can follow a closer shared timeline.',buffer:'Audio and video buffer',bufferHelp:'More buffer improves stability; less buffer starts faster.',faster:'Faster start',steadier:'Steadier sync',
    privacyTitle:'Consent and privacy',privacyHelp:'Avorythm has no ads, analytics, or developer-operated server.',consentTitle:'I allow audio from my selected tab to be sent to Google Gemini',consentBody:'Processing starts only when you press Start. Recording is separate and off by default.',privacyPolicy:'Privacy policy ↗',projectPage:'Project page ↗',reset:'Restore default settings',resetDone:'Default settings were restored.'
  }
};

function t(key){ return copy[settings.locale]?.[key] || copy.en[key] || key; }

function translate(){
  document.documentElement.lang=settings.locale;
  document.documentElement.dir=settings.locale==='fa'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node)=>{node.textContent=t(node.dataset.i18n);});
  $('#localeToggle').textContent=settings.locale==='fa'?'EN':'فا';
}

function notice(message, success=false){
  const box=$('#notice'); box.textContent=message; box.hidden=!message; box.classList.toggle('success',success);
  if(message) setTimeout(()=>{if(box.textContent===message) box.hidden=true;},3500);
}

function renderKey(){
  $('#keyStatus').textContent=t(keySet?'keyReady':'keyMissing');
  $('#clearKeyButton').hidden=!keySet;
}

function render(){
  translate(); renderKey();
  for(const id of ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled','autoDuck','recording']) $(`#${id}`).checked=Boolean(settings[id]);
  $('#dataConsent').checked=settings.consentVersion===CONSENT_VERSION;
  for(const id of ['originalVolume','dubVolume','subtitleFontSize','subtitleWidth','subtitleOpacity','syncBufferSeconds']) $(`#${id}`).value=settings[id];
  $('#subtitlePosition').value=settings.subtitlePosition;
  $('#originalVolumeValue').textContent=`${Math.round(settings.originalVolume*100)}%`;
  $('#dubVolumeValue').textContent=`${Math.round(settings.dubVolume*100)}%`;
  $('#subtitleFontSizeValue').textContent=`${settings.subtitleFontSize}px`;
  $('#subtitleWidthValue').textContent=`${settings.subtitleWidth}px`;
  $('#subtitleOpacityValue').textContent=`${settings.subtitleOpacity}%`;
  $('#syncBufferValue').textContent=`${Number(settings.syncBufferSeconds).toFixed(1)}s`;
  $('#originalVolume').disabled=!settings.originalAudioEnabled;
  $('#dubVolume').disabled=!settings.dubAudioEnabled;
  $('#autoDuck').disabled=!settings.originalAudioEnabled||!settings.dubAudioEnabled;
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
  for(const id of ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled','autoDuck','recording']) settings[id]=$(`#${id}`).checked;
  for(const id of ['originalVolume','dubVolume','subtitleFontSize','subtitleWidth','subtitleOpacity','syncBufferSeconds']) settings[id]=Number($(`#${id}`).value);
  settings.subtitlePosition=$('#subtitlePosition').value;
  settings.consentVersion=$('#dataConsent').checked?CONSENT_VERSION:0;
  settings=normalizeSettings(settings);
}

$('#localeToggle').addEventListener('click',async()=>{settings.locale=settings.locale==='fa'?'en':'fa';await persist(false);});
$('#saveKeyButton').addEventListener('click',async()=>{
  const response=await chrome.runtime.sendMessage({type:'set-key',apiKey:$('#apiKey').value.trim()});
  if(response?.ok){keySet=true;$('#apiKey').value='';renderKey();notice(t('keySaved'),true);}else notice(t('invalidKey'));
});
$('#clearKeyButton').addEventListener('click',async()=>{await chrome.runtime.sendMessage({type:'clear-key'});keySet=false;renderKey();notice(t('keyCleared'),true);});
document.querySelectorAll('input,select').forEach((element)=>{
  if(element.id==='apiKey') return;
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
  render();
})().catch((error)=>notice(error.message));
