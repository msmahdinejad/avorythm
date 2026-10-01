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
let rememberedKeys = {gemini: false, groq: false};
const MIX_TOGGLES = ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled','autoDuck'];
const MIX_VOLUMES = ['originalVolume','dubVolume'];
const mixControlId = (prefix, field) => `${prefix}${field[0].toUpperCase()}${field.slice(1)}`;

const copy = {
  fa: {
    rememberKey:'کلید را روی این دستگاه به خاطر بسپار',rememberKeyHelp:'کلید در پروفایل همین مرورگر ذخیره می‌شود و Sync نمی‌شود. این ذخیره رمزنگاری‌شده نیست؛ روی دستگاه مشترک فعال نکن.',keyRemembered:'کلید Gemini روی این دستگاه ذخیره شده است.',groqKeyRemembered:'کلید Groq روی این دستگاه ذخیره شده است.',rememberEnabled:'ذخیره روی دستگاه فعال شد.',rememberDisabled:'نسخهٔ روی دستگاه حذف شد؛ کلید فقط تا پایان این نشست می‌ماند.',keyStorageFailed:'ذخیره یا پاک‌کردن کلید انجام نشد. دوباره امتحان کن.',
    settingsTitle:'تنظیمات اکستنشن',saved:'تغییرات خودکار ذخیره می‌شوند',heading:'تجربهٔ ترجمه را دقیقاً برای خودت تنظیم کن.',intro:'کنترل صدا، زیرنویس، ضبط و پلیر هماهنگ در یک جای آرام و خوانا؛ صفحهٔ اصلی اکستنشن فقط برای شروع سریع می‌ماند.',
    navConnection:'اتصال',navOutput:'خروجی',navCaptions:'زیرنویس',navSync:'هماهنگی',navPrivacy:'حریم خصوصی',connection:'اتصال به Gemini',connectionHelp:'پیش‌فرض، کلید فقط تا پایان نشست مرورگر می‌ماند. ذخیره روی دستگاه اختیاری است.',saveKey:'ذخیره',clearKey:'پاک‌کردن کلید Gemini',keyReady:'کلید برای این نشست آماده است.',keyMissing:'هنوز کلیدی ثبت نشده است.',keySaved:'کلید با موفقیت ذخیره شد.',keyCleared:'کلید از این نشست و دستگاه پاک شد.',invalidKey:'کلید معتبر نیست.',
    output:'خروجی',outputHelp:'هر چهار کانال مستقل‌اند؛ هر ترکیبی که می‌خواهی انتخاب کن.',pageOutput:'پخش داخل تب',pageOutputHelp:'این تنظیمات فقط روی حالت سریع «داخل همین صفحه» اثر دارند.',syncOutput:'پخش و خروجی پلیر هماهنگ',syncOutputHelp:'مستقل از پخش داخل تب؛ همین ترکیب صوتی در ویدیوی خروجی اعمال می‌شود.',originalAudio:'صدای اصلی',originalAudioHelp:'صدای واقعی ویدئو یا صفحه',dubbedAudio:'صدای دوبله',dubbedAudioHelp:'صدای ترجمه‌شدهٔ Gemini',sourceSubtitles:'زیرنویس اصلی',sourceSubtitlesHelp:'متن زبان گوینده',translatedSubtitles:'زیرنویس ترجمه',translatedSubtitlesHelp:'متن زبان مقصد',originalVolume:'بلندی صدای اصلی',dubVolume:'بلندی صدای دوبله',autoDuck:'کاهش هوشمند صدای اصلی',autoDuckHelp:'هنگام صحبت دوبله، صدای اصلی آرام‌تر می‌شود.',recording:'ذخیرهٔ چهار خروجی',recordingHelp:'دو WAV و دو SRT در Downloads؛ پیش‌فرض خاموش است.',downloadsDenied:'بدون اجازهٔ Downloads، ذخیرهٔ خروجی فعال نمی‌شود.',
    captions:'کادر زیرنویس',captionsHelp:'کادر روی صفحه قابل جابه‌جایی، تغییر اندازه و اسکرول است.',position:'جای اولیه',bottomCenter:'پایین، وسط',bottomLeft:'پایین، چپ',bottomRight:'پایین، راست',topCenter:'بالا، وسط',fontSize:'اندازهٔ متن',width:'عرض کادر',opacity:'شفافیت پس‌زمینه',
    syncPlayer:'ضبط و پلیر هماهنگ',syncHelp:'ضبط تب جلوتر از پلیر ادامه پیدا می‌کند تا پخش، Seek و دوبله پایدار بمانند.',buffer:'فاصلهٔ ضبط تا پخش',bufferHelp:'ضبط جلوتر از پلیر ادامه پیدا می‌کند؛ ۲۰ ثانیه برای پایداری پیشنهاد می‌شود.',faster:'شروع سریع‌تر',steadier:'هماهنگی پایدارتر',timingEngine:'موتور دوبلهٔ هماهنگ',geminiTiming:'Gemini 3.5 Live · سریع‌تر',whisperTiming:'Whisper + LLM + Gemini 3.1 Live · دقیق‌تر',timingEngineHelp:'حالت دقیق ابتدا جمله و زمان را با Groq Whisper می‌گیرد، آن را با مخزن رایگان Gemini ترجمه می‌کند و صدای نهایی را با Gemini 3.1 Flash Live دقیقاً روی همان بازه می‌نشاند. در شبکه‌های محدود، Chrome هم باید api.groq.com را از پروکسی سیستم یا مرورگر عبور دهد.',voiceName:'گویندهٔ حالت دقیق',clearGroqKey:'پاک‌کردن کلید Groq',groqKeyReady:'کلید Groq برای این نشست آماده است.',groqKeyMissing:'برای حالت دقیق یک کلید Groq وارد کن.',groqPermissionReady:'دسترسی Chrome به Groq فعال است.',groqPermissionMissing:'هنوز اجازهٔ اتصال Chrome به Groq داده نشده است.',grantGroqPermission:'دادن اجازهٔ اتصال به Groq',groqConsentTitle:'اجازه می‌دهم بازه‌های کوتاه صدای تب انتخاب‌شده مستقیماً برای Groq Whisper ارسال شوند',groqConsentBody:'این ارسال فقط در حالت دقیق و برای تبدیل گفتار به متن و دریافت زمان‌بندی انجام می‌شود. سپس متن به Google Gemini می‌رود تا ترجمه و صدا ساخته شود.',
    consentTipTitle:'یک مرحلهٔ ضروری',consentTipBody:'پیش از اولین ترجمه، در بخش حریم خصوصی تأیید کن که صدای تب انتخاب‌شده می‌تواند به Google Gemini فرستاده شود.',consentTipAction:'بررسی اجازه ↓',privacyTitle:'اجازه و حریم خصوصی',privacyHelp:'Avorythm تبلیغ، آنالیتیکس یا سرور توسعه‌دهنده ندارد.',consentTitle:'ارسال صدای تب انتخاب‌شده به Google Gemini را تأیید می‌کنم',consentBody:'پردازش فقط پس از زدن «شروع» انجام می‌شود. ذخیرهٔ چهار خروجی پیش‌فرض خاموش است؛ پلیر هماهنگ برای Seek و خروجی WebM، تب را محلی ضبط می‌کند.',privacyPolicy:'سیاست حریم خصوصی ↗',helpPage:'راهنمای کامل ↗',projectPage:'صفحهٔ پروژه ↗',reset:'بازگرداندن تنظیمات پیش‌فرض',resetDone:'تنظیمات پیش‌فرض بازگردانده شد.',groqPermissionDenied:'بدون اجازهٔ اتصال به Groq، زمان‌بندی Whisper فعال نمی‌شود.'
  },
  en: {
    rememberKey:'Remember key on this device',rememberKeyHelp:'Saved in this browser profile, never synced. This storage is not encrypted; leave it off on shared devices.',keyRemembered:'The Gemini key is saved on this device.',groqKeyRemembered:'The Groq key is saved on this device.',rememberEnabled:'Remembering on this device is enabled.',rememberDisabled:'The device copy was removed; the key stays only for this session.',keyStorageFailed:'Could not save or remove the key. Please try again.',
    settingsTitle:'Extension settings',saved:'Changes save automatically',heading:'Shape the translation experience around you.',intro:'Audio, captions, recording, and synchronized playback live in one calm, readable space—leaving the popup focused on starting quickly.',
    navConnection:'Connection',navOutput:'Output',navCaptions:'Captions',navSync:'Synchronization',navPrivacy:'Privacy',connection:'Connect to Gemini',connectionHelp:'Keys stay in this browser session by default. Remembering them on this device is optional.',saveKey:'Save',clearKey:'Clear Gemini key',keyReady:'The key is ready for this session.',keyMissing:'No key is configured yet.',keySaved:'The key was saved.',keyCleared:'The key was removed from this session and device.',invalidKey:'The key is invalid.',
    output:'Output',outputHelp:'All four channels are independent—combine them however you like.',pageOutput:'On-page playback',pageOutputHelp:'These controls affect only the fast “On this page” mode.',syncOutput:'Synchronized playback & export',syncOutputHelp:'Independent from on-page playback; this audio mix is also used for the exported video.',originalAudio:'Original audio',originalAudioHelp:'The page or video’s real sound',dubbedAudio:'Dubbed audio',dubbedAudioHelp:'Gemini’s translated speech',sourceSubtitles:'Source subtitles',sourceSubtitlesHelp:'Speech in the original language',translatedSubtitles:'Translated subtitles',translatedSubtitlesHelp:'Text in your target language',originalVolume:'Original volume',dubVolume:'Dubbed volume',autoDuck:'Smart original-audio ducking',autoDuckHelp:'Lower the original while translated speech plays.',recording:'Save four outputs',recordingHelp:'Two WAV and two SRT files in Downloads; off by default.',downloadsDenied:'Output saving stays off without Downloads access.',
    captions:'Subtitle card',captionsHelp:'Move, resize, and scroll the card directly on the page.',position:'Initial position',bottomCenter:'Bottom center',bottomLeft:'Bottom left',bottomRight:'Bottom right',topCenter:'Top center',fontSize:'Text size',width:'Card width',opacity:'Background opacity',
    syncPlayer:'Synchronized recorder & player',syncHelp:'The tab keeps recording ahead of playback so seeking and dubbing remain stable.',buffer:'Recording lead',bufferHelp:'Capture stays ahead of playback; 20 seconds is recommended for stability.',faster:'Faster start',steadier:'Steadier sync',timingEngine:'Synchronized dubbing engine',geminiTiming:'Gemini 3.5 Live · faster',whisperTiming:'Whisper + LLM + Gemini 3.1 Live · more precise',timingEngineHelp:'Precise mode timestamps each utterance with Groq Whisper, translates it through the free Gemini model pool, then fits Gemini 3.1 Flash Live speech to that exact interval. On restricted networks, Chrome must also route api.groq.com through the browser or system proxy.',voiceName:'Precise-mode voice',clearGroqKey:'Clear Groq key',groqKeyReady:'The Groq key is ready for this session.',groqKeyMissing:'Add a Groq key to use precise mode.',groqPermissionReady:'Chrome access to Groq is enabled.',groqPermissionMissing:'Chrome access to Groq has not been granted yet.',grantGroqPermission:'Allow access to Groq',groqConsentTitle:'I allow short audio windows from the selected tab to be sent directly to Groq Whisper',groqConsentBody:'This happens only in precise mode to transcribe speech and return timestamps. The resulting text then goes to Google Gemini for translation and voice generation.',
    consentTipTitle:'One required step',consentTipBody:'Before the first translation, open Privacy below and confirm that audio from the selected tab may be sent to Google Gemini.',consentTipAction:'Review consent ↓',privacyTitle:'Consent and privacy',privacyHelp:'Avorythm has no ads, analytics, or developer-operated server.',consentTitle:'I allow audio from my selected tab to be sent to Google Gemini',consentBody:'Processing starts only after you press Start. Four-output saving is off by default; synchronized playback records the tab locally for seeking and WebM export.',privacyPolicy:'Privacy policy ↗',helpPage:'Complete guide ↗',projectPage:'Project page ↗',reset:'Restore default settings',resetDone:'Default settings were restored.',groqPermissionDenied:'Whisper timing needs permission to connect to Groq.'
  },
  'zh-Hans': {
    rememberKey:'在此设备上记住密钥',rememberKeyHelp:'保存在此浏览器配置文件中，不会同步。此存储未加密；共用设备请勿开启。',keyRemembered:'Gemini 密钥已保存在此设备上。',groqKeyRemembered:'Groq 密钥已保存在此设备上。',rememberEnabled:'已开启在此设备上记住密钥。',rememberDisabled:'已删除设备上的副本；密钥仅保留至本次会话结束。',keyStorageFailed:'无法保存或删除密钥，请重试。',
    settingsTitle:'扩展设置',saved:'更改会自动保存',heading:'量身定制属于你的翻译体验。',intro:'音频、字幕、录制和同步播放器集中在一个清爽、易读的界面里;弹出页只负责快速启动。',
    navConnection:'连接',navOutput:'输出',navCaptions:'字幕',navSync:'同步',navPrivacy:'隐私',connection:'连接到 Gemini',connectionHelp:'默认仅保留当前浏览器会话的密钥。也可选择在此设备上记住密钥。',saveKey:'保存',clearKey:'清除 Gemini 密钥',keyReady:'密钥已为本会话就绪。',keyMissing:'尚未配置密钥。',keySaved:'密钥已保存。',keyCleared:'已从当前会话和此设备删除密钥。',invalidKey:'密钥无效。',
    output:'输出',outputHelp:'四个声道相互独立——可任意组合。',pageOutput:'页面内播放',pageOutputHelp:'这些控件仅影响快速的"在本页"模式。',syncOutput:'同步播放与导出',syncOutputHelp:'与页面内播放相互独立;此混音方案也会用于导出视频。',originalAudio:'原始音频',originalAudioHelp:'页面或视频的真实声音',dubbedAudio:'配音',dubbedAudioHelp:'Gemini 翻译后的语音',sourceSubtitles:'原文字幕',sourceSubtitlesHelp:'原话文本',translatedSubtitles:'译文字幕',translatedSubtitlesHelp:'目标语言文本',originalVolume:'原始音量',dubVolume:'配音音量',autoDuck:'智能压低原声',autoDuckHelp:'配音播放时自动降低原声音量。',recording:'保存四路输出',recordingHelp:'两个 WAV 和两个 SRT 文件保存到下载目录;默认关闭。',downloadsDenied:'未授予下载权限时,输出保存将保持关闭。',
    captions:'字幕卡片',captionsHelp:'可在页面上直接拖动、调整大小并滚动卡片。',position:'初始位置',bottomCenter:'下方居中',bottomLeft:'左下',bottomRight:'右下',topCenter:'上方居中',fontSize:'文字大小',width:'卡片宽度',opacity:'背景不透明度',
    syncPlayer:'同步录制器与播放器',syncHelp:'标签页会持续录制,领先于播放,以保证跳转和配音稳定。',buffer:'录制提前量',bufferHelp:'录制会领先于播放;建议 20 秒以保持稳定。',faster:'启动更快',steadier:'同步更稳',timingEngine:'同步配音引擎',geminiTiming:'Gemini 3.5 Live · 更快',whisperTiming:'Whisper + LLM + Gemini 3.1 Live · 更精准',timingEngineHelp:'精准模式先用 Groq Whisper 为每句话打时间戳,再通过免费的 Gemini 模型池翻译,最后用 Gemini 3.1 Flash Live 将配音贴合到该时间段。在受限网络下,Chrome 还需让 api.groq.com 通过浏览器或系统代理访问。',voiceName:'精准模式嗓音',clearGroqKey:'清除 Groq 密钥',groqKeyReady:'Groq 密钥已为本会话就绪。',groqKeyMissing:'请添加 Groq 密钥以使用精准模式。',groqPermissionReady:'Chrome 访问 Groq 已启用。',groqPermissionMissing:'尚未授予 Chrome 访问 Groq 的权限。',grantGroqPermission:'允许访问 Groq',groqConsentTitle:'我允许将所选标签页的短音频片段直接发送到 Groq Whisper',groqConsentBody:'仅在精准模式下进行,用于转录语音并返回时间戳。随后文本会发送到 Google Gemini 进行翻译和配音。',
    consentTipTitle:'必要的一步',consentTipBody:'首次翻译前,请在下方"隐私"中确认允许将所选标签页的音频发送到 Google Gemini。',consentTipAction:'查看授权 ↓',privacyTitle:'授权与隐私',privacyHelp:'Avorythm 没有广告、分析或开发者运营的服务器。',consentTitle:'我允许将所选标签页的音频发送到 Google Gemini',consentBody:'只有在你按下"开始"后才会处理。四路输出保存默认关闭;同步播放会在本地录制标签页,以支持跳转和 WebM 导出。',privacyPolicy:'隐私政策 ↗',helpPage:'完整指南 ↗',projectPage:'项目页面 ↗',reset:'恢复默认设置',resetDone:'已恢复默认设置。',groqPermissionDenied:'Whisper 计时需要连接 Groq 的权限。'
  }
};

function t(key){ return copy[settings.locale]?.[key] || copy.en[key] || key; }

function translate(){
  document.documentElement.lang=settings.locale;
  document.documentElement.dir=settings.locale==='fa'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node)=>{node.textContent=t(node.dataset.i18n);});
  $('#localeToggle').value=settings.locale;
  $('#helpPageLink').href=`https://github.com/msmahdinejad/avorythm/blob/main/docs/HELP${settings.locale==='fa'?'.fa':settings.locale==='zh-Hans'?'.zh-CN':''}.md`;
}

function notice(message, success=false){
  const box=$('#notice'); box.textContent=message; box.hidden=!message; box.classList.toggle('success',success);
  if(message) setTimeout(()=>{if(box.textContent===message) box.hidden=true;},3500);
}

function renderKey(){
  $('#keyStatus').textContent=t(keySet?(rememberedKeys.gemini?'keyRemembered':'keyReady'):'keyMissing');
  $('#clearKeyButton').hidden=!keySet;
  $('#groqKeyStatus').textContent=t(groqKeySet?(rememberedKeys.groq?'groqKeyRemembered':'groqKeyReady'):'groqKeyMissing');
  $('#rememberGeminiKey').checked=rememberedKeys.gemini;
  $('#rememberGroqKey').checked=rememberedKeys.groq;
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

function applyKeyStatus(data){
  keySet=Boolean(data.api_key_set);
  groqKeySet=Boolean(data.groq_api_key_set);
  rememberedKeys={gemini:data.remember_gemini_key===true,groq:data.remember_groq_key===true};
  renderKey();
}

async function updateCredential(message, success){
  const controls=['saveKeyButton','saveGroqKeyButton','clearKeyButton','clearGroqKeyButton','rememberGeminiKey','rememberGroqKey','resetButton'];
  for(const id of controls) $(`#${id}`).disabled=true;
  try{
    const response=await chrome.runtime.sendMessage(message);
    if(!response?.ok) throw new Error(response?.error||'key_storage_failed');
    applyKeyStatus(response.data);
    notice(t(success),true);
    return true;
  }catch(error){
    notice(t(error.message==='api_key_invalid'?'invalidKey':'keyStorageFailed'));
    renderKey();
    return false;
  }finally{
    for(const id of controls) $(`#${id}`).disabled=false;
  }
}

for(const [provider,id] of [['gemini','rememberGeminiKey'],['groq','rememberGroqKey']]){
  const checkbox=$(`#${id}`);
  checkbox.addEventListener('change',async()=>{
    const remember=checkbox.checked;
    checkbox.disabled=true;
    await updateCredential({type:'set-key-persistence',provider,remember},remember?'rememberEnabled':'rememberDisabled');
    checkbox.disabled=false;
  });
}

$('#localeToggle').addEventListener('change',async()=>{settings.locale=$('#localeToggle').value;await persist(false);});
$('#saveKeyButton').addEventListener('click',async()=>{
  if(await updateCredential({type:'set-key',apiKey:$('#apiKey').value.trim(),remember:$('#rememberGeminiKey').checked},'keySaved')) $('#apiKey').value='';
});
$('#clearKeyButton').addEventListener('click',()=>updateCredential({type:'clear-key'},'keyCleared'));
async function requestGroqPermission(){
  groqPermissionGranted=await chrome.permissions.request({origins:['https://api.groq.com/*']});
  if(!groqPermissionGranted) notice(t('groqPermissionDenied'));
  render();
  return groqPermissionGranted;
}
$('#grantGroqPermissionButton').addEventListener('click',requestGroqPermission);
$('#saveGroqKeyButton').addEventListener('click',async()=>{
  if(!groqPermissionGranted&&!await requestGroqPermission()) return;
  if(await updateCredential({type:'set-groq-key',apiKey:$('#groqApiKey').value.trim(),remember:$('#rememberGroqKey').checked},'keySaved')) $('#groqApiKey').value='';
});
$('#clearGroqKeyButton').addEventListener('click',async()=>{
  if(!await updateCredential({type:'clear-groq-key'},'keyCleared')) return;
  await chrome.permissions.remove({origins:['https://api.groq.com/*']});
  groqPermissionGranted=false;render();
});
document.querySelectorAll('input,select').forEach((element)=>{
  if(['apiKey','groqApiKey','rememberGeminiKey','rememberGroqKey'].includes(element.id)) return;
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
  for(const provider of ['gemini','groq']){
    if(!await updateCredential({type:'set-key-persistence',provider,remember:false},'rememberDisabled')) return;
  }
  const locale=settings.locale;
  settings=normalizeSettings({...DEFAULT_SETTINGS,locale});
  await persist(); notice(t('resetDone'),true);
});

(async()=>{
  const [stored,response]=await Promise.all([chrome.storage.local.get('settings'),chrome.runtime.sendMessage({type:'bootstrap'})]);
  if(!response?.ok) throw new Error(response?.error||'bootstrap_failed');
  settings=normalizeSettings(stored.settings);
  applyKeyStatus(response.data);
  groqPermissionGranted=Boolean(response.data.groq_permission_granted);
  render();
})().catch((error)=>notice(error.message));
