const $ = (selector) => document.querySelector(selector);
let settings = null;
let bootstrap = null;
let timer = null;

const copy = {
  fa:{tagline:'دوبلهٔ زندهٔ همین تب',companionOffline:'برنامهٔ LingoDub اجرا نیست',companionHelp:'اول Companion را روی لپ‌تاپ اجرا کن.',keyHelp:'از تنظیمات کامل، کلید Gemini را امن ذخیره کن.',retry:'تلاش دوباره',ready:'آمادهٔ دوبله',connecting:'در حال اتصال…',connected:'دوبلهٔ زنده فعال است',error:'خطا در اتصال',source:'متن اصلی',translated:'ترجمه',waiting:'منتظر صدا…',waitingTranslation:'ترجمه اینجا می‌آید…',language:'زبان مقصد',voice:'گوینده',audioMode:'صدایی که می‌شنوی',dubOnly:'فقط دوبله',originalOnly:'فقط صدای اصلی',smartMix:'میکس هوشمند',sourceVolume:'صدای اصلی',dubVolume:'صدای دوبله',duckHelp:'هنگام صحبت دوبله، صدای اصلی خودکار کم شود',saveOutputs:'ذخیرهٔ چهار خروجی',outputsHelp:'دو فایل WAV و دو زیرنویس SRT',start:'شروع دوبلهٔ این تب',stop:'توقف دوبله',download:'دریافت چهار خروجی',dashboard:'تنظیمات کامل و API Key',privacy:'کلید API فقط در Companion امن ویندوز نگه‌داری می‌شود.',keyMissing:'API Key را در داشبورد وارد کن',native:'صدای بومی Gemini'},
  en:{tagline:'Dub this tab live',companionOffline:'LingoDub Companion is not running',companionHelp:'Start the Companion app on your laptop first.',keyHelp:'Store your Gemini key securely in full settings.',retry:'Retry',ready:'Ready to dub',connecting:'Connecting…',connected:'Live dubbing is active',error:'Connection error',source:'Source transcript',translated:'Translation',waiting:'Waiting for audio…',waitingTranslation:'Translation appears here…',language:'Target language',voice:'Speaker',audioMode:'What you hear',dubOnly:'Dubbed audio only',originalOnly:'Original audio only',smartMix:'Smart mix',sourceVolume:'Original audio',dubVolume:'Dubbed audio',duckHelp:'Lower source automatically while dubbed speech plays',saveOutputs:'Save four outputs',outputsHelp:'Two WAV files and two SRT subtitles',start:'Start dubbing this tab',stop:'Stop dubbing',download:'Download four outputs',dashboard:'Full settings and API Key',privacy:'Your API key stays inside the secure Windows Companion.',keyMissing:'Set your API key in the dashboard',native:'Native Gemini voice'}
};

function t(key){ return copy[settings?.locale || 'fa'][key] || key; }
function send(message){ return chrome.runtime.sendMessage(message); }

async function loadSettings(){
  const stored = await chrome.storage.local.get('settings');
  settings = stored.settings || {locale:'fa',targetLanguage:'fa',voice:'Native',voiceStyle:'Natural, clear, cinematic dubbing',audioMode:'dub',originalVolume:0,dubVolume:1,autoDuck:true,recording:false};
}

async function saveSettings(liveAudio = false){
  settings = {...settings,targetLanguage:$('#targetLanguage').value,voice:$('#voice').value,audioMode:$('#audioMode').value,originalVolume:Number($('#originalVolume').value),dubVolume:Number($('#dubVolume').value),autoDuck:$('#autoDuck').checked,recording:$('#recording').checked};
  await chrome.storage.local.set({settings});
  if (liveAudio) await send({type:'audio',config:settings});
  renderStatic();
}

function translate(){
  const locale = settings.locale;
  document.documentElement.lang=locale; document.documentElement.dir=locale==='fa'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node)=>{node.textContent=t(node.dataset.i18n);});
  $('#localeToggle').textContent=locale==='fa'?'EN':'فا';
}

function fill(element, items, selected, label){
  element.replaceChildren(...items.map((item)=>{const option=document.createElement('option');option.value=item;option.textContent=label(item);option.selected=item===selected;return option;}));
}

function renderStatic(){
  translate();
  if (bootstrap){
    const names = new Intl.DisplayNames([settings.locale],{type:'language'});
    fill($('#targetLanguage'),bootstrap.languages,settings.targetLanguage,(code)=>{try{return `${names.of(code.split('-')[0])||code} · ${code}`;}catch{return code;}});
    fill($('#voice'),bootstrap.voices,settings.voice,(voice)=>voice==='Native'?`${t('native')} · Native`:voice);
  }
  $('#audioMode').value=settings.audioMode; $('#originalVolume').value=settings.originalVolume; $('#dubVolume').value=settings.dubVolume;
  $('#autoDuck').checked=settings.autoDuck; $('#recording').checked=settings.recording;
  $('#mixControls').hidden=settings.audioMode!=='mix';
  $('#originalValue').textContent=`${Math.round(settings.originalVolume*100)}%`; $('#dubValue').textContent=`${Math.round(settings.dubVolume*100)}%`;
  $('#languageBadge').textContent=`AUTO → ${settings.targetLanguage.toUpperCase()}`;
}

function renderState(state){
  const status = state.status==='connected'?'connected':state.status==='connecting'?'connecting':state.status==='error'?'error':'ready';
  $('#statusText').textContent=t(status); $('#statusDot').className=`status-dot ${state.active?'active':''} ${state.status==='error'?'error':''}`;
  $('#toggleButton').disabled=!bootstrap?.api_key_set; $('#toggleButton').classList.toggle('stopping',state.active);
  $('#toggleButton b').textContent=t(state.active?'stop':'start'); $('#toggleButton span').textContent=state.active?'■':'▶';
  $('#sourceText').textContent=state.sourceText||t('waiting'); $('#translatedText').textContent=state.translatedText||t('waitingTranslation');
  $('#languageBadge').textContent=`${(state.sourceLanguage||'AUTO').toUpperCase()} → ${settings.targetLanguage.toUpperCase()}`;
  $('#downloadLink').hidden=!state.recordingUrl; if(state.recordingUrl) $('#downloadLink').href=state.recordingUrl;
  document.querySelectorAll('.controls select,.controls input').forEach((node)=>{node.disabled=state.active && !['audioMode','originalVolume','dubVolume','autoDuck'].includes(node.id);});
}

async function refresh(){
  const response=await send({type:'state'}); if(response?.ok) renderState(response.state);
}

async function connect(){
  try{
    const response=await send({type:'bootstrap'}); if(!response?.ok) throw new Error(response?.error);
    bootstrap=response.data; $('#companionNotice').hidden=true;
    renderStatic();
    if(!bootstrap.api_key_set){
      $('#companionNotice').hidden=false;
      $('#companionNotice b').dataset.i18n='keyMissing';
      $('#companionNotice b').textContent=t('keyMissing');
      $('#companionNotice span').dataset.i18n='keyHelp';
      $('#companionNotice span').textContent=t('keyHelp');
    }
    $('#toggleButton').disabled=!bootstrap.api_key_set; await refresh();
  }catch{
    bootstrap=null;
    $('#companionNotice').hidden=false;
    $('#companionNotice b').dataset.i18n='companionOffline';
    $('#companionNotice span').dataset.i18n='companionHelp';
    translate();
    $('#toggleButton').disabled=true;
  }
}

$('#localeToggle').addEventListener('click',async()=>{settings.locale=settings.locale==='fa'?'en':'fa';await saveSettings();});
$('#retryButton').addEventListener('click',connect);
$('#dashboardButton').addEventListener('click',()=>send({type:'open-dashboard'}));
$('#toggleButton').addEventListener('click',async()=>{
  $('#toggleButton').disabled=true;
  const current=await send({type:'state'});
  const response=await send(current.state.active?{type:'stop'}:{type:'start',config:settings});
  if(!response?.ok) {$('#companionNotice').hidden=false;}
  await refresh();
});
$('#targetLanguage').addEventListener('change',()=>saveSettings()); $('#voice').addEventListener('change',()=>saveSettings()); $('#recording').addEventListener('change',()=>saveSettings());
$('#audioMode').addEventListener('change',()=>saveSettings(true)); $('#autoDuck').addEventListener('change',()=>saveSettings(true));
['originalVolume','dubVolume'].forEach((id)=>$(`#${id}`).addEventListener('input',()=>saveSettings(true)));

(async()=>{await loadSettings();renderStatic();await connect();timer=setInterval(refresh,750);})();
