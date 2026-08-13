import {DEFAULT_SETTINGS} from './core.mjs';

const $ = (selector) => document.querySelector(selector);
let settings = null;
let bootstrap = null;
let timer = null;

const copy = {
  fa:{tagline:'ترجمهٔ زندهٔ همین تب',keyHelp:'کلید فقط تا وقتی مرورگر باز است نگه‌داری می‌شود و مستقیم به Google فرستاده می‌شود.',ready:'آمادهٔ ترجمه',connecting:'در حال اتصال…',connected:'ترجمهٔ زنده فعال است',error:'خطا در اتصال',source:'متن اصلی',translated:'ترجمه',waiting:'منتظر صدا…',waitingTranslation:'ترجمه اینجا می‌آید…',language:'زبان مقصد',nativeVoiceHelp:'Gemini Live صدای گوینده را خودکار بازتولید می‌کند.',audioMode:'حالت ترجمه',dubOnly:'فقط دوبله',subtitlesOnly:'صدای اصلی + زیرنویس شناور',originalOnly:'فقط صدای اصلی',smartMix:'میکس هوشمند',subtitleBox:'کادر زیرنویس',dragHint:'روی نوار بالای کادر بکش تا جابه‌جا شود',subtitlePosition:'جای اولیه',bottomCenter:'پایین وسط',bottomLeft:'پایین چپ',bottomRight:'پایین راست',topCenter:'بالا وسط',subtitleSize:'اندازهٔ متن',subtitleWidth:'عرض کادر',subtitleOpacity:'شفافیت پس‌زمینه',showSourceLine:'نمایش متن اصلی',sourceLineHelp:'ترجمه و متن اصلی را هم‌زمان ببین',sourceVolume:'صدای اصلی',dubVolume:'صدای دوبله',duckHelp:'هنگام صحبت دوبله، صدای اصلی خودکار کم شود',saveOutputs:'ذخیرهٔ چهار خروجی',outputsHelp:'دو WAV و دو SRT مستقیم در Downloads',start:'شروع ترجمهٔ این تب',stop:'توقف ترجمه',downloadReady:'چهار فایل در Downloads ذخیره شدند.',privacy:'با شروع، صدای همین تب به Google Gemini فرستاده می‌شود؛ ضبط فقط با فعال‌کردن گزینهٔ بالا انجام می‌شود.',keyMissing:'Gemini API Key را وارد کن',keyMissingShort:'تنظیم نشده',keyReady:'برای این نشست مرورگر آماده است',saveKey:'ذخیره',clearKey:'حذف کلید',api_key_missing:'Gemini API Key را وارد کن',api_key_invalid:'API Key معتبر نیست',gemini_socket_failed:'اتصال مستقیم به Gemini ممکن نشد؛ پروکسی مرورگر را بررسی کن.',gemini_socket_closed:'اتصال Gemini بسته شد.',active_tab_missing:'تب فعالی پیدا نشد.',capture_failed:'Capture صدای تب ممکن نشد.',subtitle_overlay_unavailable:'نمایش زیرنویس روی این صفحه مجاز نیست؛ یک صفحهٔ عادی وب را باز کن.'},
  en:{tagline:'Translate this tab live',keyHelp:'The key is kept only for this browser session and sent directly to Google.',ready:'Ready to translate',connecting:'Connecting…',connected:'Live translation is active',error:'Connection error',source:'Source transcript',translated:'Translation',waiting:'Waiting for audio…',waitingTranslation:'Translation appears here…',language:'Target language',nativeVoiceHelp:'Gemini Live automatically reproduces the speaker voice.',audioMode:'Translation mode',dubOnly:'Dubbed audio only',subtitlesOnly:'Original audio + floating subtitles',originalOnly:'Original audio only',smartMix:'Smart mix',subtitleBox:'Subtitle card',dragHint:'Drag the top handle to move it',subtitlePosition:'Initial position',bottomCenter:'Bottom center',bottomLeft:'Bottom left',bottomRight:'Bottom right',topCenter:'Top center',subtitleSize:'Text size',subtitleWidth:'Card width',subtitleOpacity:'Background opacity',showSourceLine:'Show source line',sourceLineHelp:'See source and translation together',sourceVolume:'Original audio',dubVolume:'Dubbed audio',duckHelp:'Lower source automatically while dubbed speech plays',saveOutputs:'Save four outputs',outputsHelp:'Two WAV and two SRT files in Downloads',start:'Start translating this tab',stop:'Stop translation',downloadReady:'Four files were saved to Downloads.',privacy:'Starting sends audio from this tab to Google Gemini; recording stays off unless you enable it above.',keyMissing:'Enter a Gemini API Key',keyMissingShort:'Not configured',keyReady:'Ready for this browser session',saveKey:'Save',clearKey:'Clear key',api_key_missing:'Enter a Gemini API Key.',api_key_invalid:'The API key is invalid.',gemini_socket_failed:'Could not connect directly to Gemini; check the browser proxy.',gemini_socket_closed:'The Gemini connection closed.',active_tab_missing:'No active tab was found.',capture_failed:'Could not capture tab audio.',subtitle_overlay_unavailable:'Subtitles cannot be shown on this restricted page; open a regular website.'}
};

function t(key){ return copy[settings?.locale || 'fa'][key] || key; }
function send(message){ return chrome.runtime.sendMessage(message); }

async function loadSettings(){
  const stored = await chrome.storage.local.get('settings');
  settings = {...DEFAULT_SETTINGS, ...stored.settings};
}

async function saveSettings(liveAudio = false){
  settings = {...settings,targetLanguage:$('#targetLanguage').value,audioMode:$('#audioMode').value,originalVolume:Number($('#originalVolume').value),dubVolume:Number($('#dubVolume').value),autoDuck:$('#autoDuck').checked,recording:$('#recording').checked,subtitlePosition:$('#subtitlePosition').value,subtitleFontSize:Number($('#subtitleFontSize').value),subtitleWidth:Number($('#subtitleWidth').value),subtitleOpacity:Number($('#subtitleOpacity').value),subtitleShowSource:$('#subtitleShowSource').checked};
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

function renderKey(){
  const ready=Boolean(bootstrap?.api_key_set);
  $('#keyStatus').textContent=t(ready?'keyReady':'keyMissingShort');
  $('#keyStatus').classList.toggle('ready',ready);
  $('#keyNotice').hidden=ready;
  $('#toggleButton').disabled=!ready;
}

function renderStatic(){
  translate();
  if (bootstrap){
    const names = new Intl.DisplayNames([settings.locale],{type:'language'});
    fill($('#targetLanguage'),bootstrap.languages,settings.targetLanguage,(code)=>{try{return `${names.of(code.split('-')[0])||code} · ${code}`;}catch{return code;}});
  }
  $('#audioMode').value=settings.audioMode; $('#originalVolume').value=settings.originalVolume; $('#dubVolume').value=settings.dubVolume;
  $('#autoDuck').checked=settings.autoDuck; $('#recording').checked=settings.recording;
  $('#mixControls').hidden=settings.audioMode!=='mix';
  $('#subtitleControls').hidden=settings.audioMode!=='subtitles';
  $('#subtitlePosition').value=settings.subtitlePosition; $('#subtitleFontSize').value=settings.subtitleFontSize; $('#subtitleWidth').value=settings.subtitleWidth; $('#subtitleOpacity').value=settings.subtitleOpacity; $('#subtitleShowSource').checked=settings.subtitleShowSource;
  $('#subtitleFontSizeValue').textContent=`${settings.subtitleFontSize}px`; $('#subtitleWidthValue').textContent=`${settings.subtitleWidth}px`; $('#subtitleOpacityValue').textContent=`${settings.subtitleOpacity}%`;
  $('#originalValue').textContent=`${Math.round(settings.originalVolume*100)}%`; $('#dubValue').textContent=`${Math.round(settings.dubVolume*100)}%`;
  $('#languageBadge').textContent=`AUTO → ${settings.targetLanguage.toUpperCase()}`;
  renderKey();
}

function renderState(state){
  const status=state.status==='connected'?'connected':state.status==='connecting'?'connecting':state.status==='error'?'error':'ready';
  $('#statusText').textContent=state.error?t(state.error):t(status); $('#statusDot').className=`status-dot ${state.active?'active':''} ${state.status==='error'?'error':''}`;
  $('#toggleButton').disabled=!bootstrap?.api_key_set; $('#toggleButton').classList.toggle('stopping',state.active);
  $('#toggleButton b').textContent=t(state.active?'stop':'start'); $('#toggleButton span').textContent=state.active?'■':'▶';
  $('#sourceText').textContent=state.sourceText||t('waiting'); $('#translatedText').textContent=state.translatedText||t('waitingTranslation');
  $('#languageBadge').textContent=`${(state.sourceLanguage||'AUTO').toUpperCase()} → ${settings.targetLanguage.toUpperCase()}`;
  $('#downloadReady').hidden=!state.recordingReady;
  const liveControls=['audioMode','originalVolume','dubVolume','autoDuck','subtitlePosition','subtitleFontSize','subtitleWidth','subtitleOpacity','subtitleShowSource'];
  document.querySelectorAll('.controls select,.controls input').forEach((node)=>{node.disabled=state.active && !liveControls.includes(node.id);});
}

async function refresh(){
  const response=await send({type:'state'}); if(response?.ok) renderState(response.state);
}

async function connect(){
  const response=await send({type:'bootstrap'});
  if(!response?.ok) throw new Error(response?.error);
  bootstrap=response.data;
  settings={...settings,...bootstrap.settings};
  renderStatic();
  await refresh();
}

$('#localeToggle').addEventListener('click',async()=>{settings.locale=settings.locale==='fa'?'en':'fa';await saveSettings();});
$('#saveKeyButton').addEventListener('click',async()=>{
  const apiKey=$('#apiKey').value.trim();
  const response=await send({type:'set-key',apiKey});
  if(response?.ok){bootstrap.api_key_set=true;$('#apiKey').value='';renderKey();}
  else {$('#keyNotice').hidden=false;$('#keyNotice b').textContent=t(response?.error||'api_key_invalid');}
});
$('#clearKeyButton').addEventListener('click',async()=>{await send({type:'clear-key'});bootstrap.api_key_set=false;renderKey();});
$('#toggleButton').addEventListener('click',async()=>{
  $('#toggleButton').disabled=true;
  const current=await send({type:'state'});
  const response=await send(current.state.active?{type:'stop'}:{type:'start',config:settings});
  if(!response?.ok){$('#keyNotice').hidden=false;$('#keyNotice b').textContent=t(response?.error||'error');}
  await refresh();
});
$('#targetLanguage').addEventListener('change',()=>saveSettings()); $('#recording').addEventListener('change',()=>saveSettings());
$('#audioMode').addEventListener('change',()=>saveSettings(true)); $('#autoDuck').addEventListener('change',()=>saveSettings(true));
['originalVolume','dubVolume'].forEach((id)=>$(`#${id}`).addEventListener('input',()=>saveSettings(true)));
$('#subtitlePosition').addEventListener('change',()=>saveSettings(true)); $('#subtitleShowSource').addEventListener('change',()=>saveSettings(true));
['subtitleFontSize','subtitleWidth','subtitleOpacity'].forEach((id)=>$(`#${id}`).addEventListener('input',()=>saveSettings(true)));

(async()=>{await loadSettings();renderStatic();await connect();timer=setInterval(refresh,750);})().catch((error)=>{$('#keyNotice').hidden=false;$('#keyNotice b').textContent=error.message;});
