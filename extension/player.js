import {normalizeSettings} from './core.mjs';

const $ = (selector) => document.querySelector(selector);
const channel = new BroadcastChannel('avorythm-sync');
const video = $('#video');
let settings = normalizeSettings({playbackMode: 'synchronized'});
let mediaSource = null;
let sourceBuffer = null;
let bufferTarget = 20;
let chunks = [];
let appending = false;
let streamEnded = false;
let started = false;
let wantedPlaying = false;
let rebuffering = false;
let hiddenPause = false;
let scrubbing = false;
let audioContext = null;
let dubGain = null;
let dubSequence = 0;
let dubTimeline = [];
const dubPlayers = new Map();
let captions = {source: [], translated: []};
let recordedFileName = '';

const copy = {
  fa:{playerTitle:'پلیر هماهنگ',buffering:'در حال ساخت دوبارهٔ بافر…',playing:'پخش هماهنگ',paused:'متوقف',complete:'ضبط کامل شد',stop:'پایان ضبط',close:'بستن',sourceTab:'ویدئوی تب انتخاب‌شده',playerHelp:'ترد ضبط جلوتر حرکت می‌کند و این پلیر نسخهٔ بافرشده را مستقل پخش می‌کند.',preparing:'در حال ضبط بخش ابتدایی',preparingHelp:'پس از آماده‌شدن فاصلهٔ امن، پخش هم‌زمان شروع می‌شود.',activate:'پخش از ابتدای ضبط',playerError:'پلیر هماهنگ آماده نشد',outputMix:'تنظیمات دوبله',outputHelp:'صدا و زیرنویس؛ مستقل از کنترل‌های پلیر',allSettings:'همهٔ تنظیمات ↗',originalAudio:'صدای اصلی',dubbedAudio:'صدای دوبله',sourceSubtitles:'زیرنویس اصلی',translatedSubtitles:'زیرنویس ترجمه',captionChannel:'نمایش روی ویدئو',unsupported:'این صفحه یا نوع ویدئو امکان ضبط مستقیم را نمی‌دهد. حالت «داخل همین صفحه» را انتخاب کن.',appendFailed:'جریان ویدئو قابل ادامه‌دادن نبود. برای محتوای محافظت‌شده حالت داخل صفحه را استفاده کن.',previewLimit:'حافظهٔ پیش‌نمایش پر شده، اما ضبط ادامه دارد. «رفتن به آخرین بخش» را بزن یا ضبط را تمام کن.',recorderTitle:'ضبط و پخش',recorderHelp:'ضبط تب مستقل از Pause، Seek و Fullscreen پلیر ادامه دارد.',recorded:'ضبط‌شده',lead:'فاصلهٔ امن',timing:'زمان‌بندی',gemini:'Gemini Live',whisper:'Groq Whisper + Gemini Live',downloadVideo:'دریافت ویدیوی ضبط‌شده',recording:'در حال ضبط…',downloadReady:'فایل ویدئو آماده است',goLive:'رفتن به آخرین بخش',fullscreen:'تمام‌صفحه',warning:'زمان‌بندی Whisper در دسترس نبود؛ زیرنویس Gemini استفاده می‌شود.',downloadDenied:'برای ذخیرهٔ ویدئو، اجازهٔ Downloads لازم است.'},
  en:{playerTitle:'Synchronized player',buffering:'Rebuilding the safety buffer…',playing:'Synchronized playback',paused:'Paused',complete:'Recording complete',stop:'Finish recording',close:'Close',sourceTab:'Selected tab video',playerHelp:'The recording thread stays ahead while this player independently consumes the buffered copy.',preparing:'Recording the opening segment',preparingHelp:'Playback starts when a safe lead is ready.',activate:'Play from the beginning',playerError:'Synchronized player could not start',outputMix:'Dubbing settings',outputHelp:'Audio and captions, separate from player controls',allSettings:'All settings ↗',originalAudio:'Original audio',dubbedAudio:'Dubbed audio',sourceSubtitles:'Source subtitles',translatedSubtitles:'Translated subtitles',captionChannel:'Shown over video',unsupported:'This page or video type cannot be captured directly. Choose On this page.',appendFailed:'The video stream could not continue. Use on-page mode for protected media.',previewLimit:'The live preview buffer is full, but recording continues. Jump to latest or finish recording.',recorderTitle:'Recorder & playback',recorderHelp:'Tab recording continues independently of Pause, Seek, and player fullscreen.',recorded:'Recorded',lead:'Safety lead',timing:'Timing',gemini:'Gemini Live',whisper:'Groq Whisper + Gemini Live',downloadVideo:'Download captured video',recording:'Recording…',downloadReady:'Video file is ready',goLive:'Jump to latest',fullscreen:'Fullscreen',warning:'Whisper timing became unavailable; Gemini captions remain active.',downloadDenied:'Downloads permission is required to save the video.'}
};

function t(key){return copy[settings.locale]?.[key]||copy.en[key]||key;}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function formatTime(seconds){const value=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}
function translate(){document.documentElement.lang=settings.locale;document.documentElement.dir=settings.locale==='fa'?'rtl':'ltr';document.querySelectorAll('[data-i18n]').forEach((node)=>{node.textContent=t(node.dataset.i18n);});$('#localeToggle').textContent=settings.locale==='fa'?'EN':'فا';}

function setError(key){$('#stageErrorText').textContent=t(key);$('#stageError').hidden=false;$('#bufferOverlay').hidden=true;$('#liveBadge span').textContent=t('playerError');$('#liveBadge').classList.remove('playing');}
function bufferedStart(){return sourceBuffer?.buffered.length?sourceBuffer.buffered.start(0):0;}
function bufferedEnd(){return sourceBuffer?.buffered.length?sourceBuffer.buffered.end(sourceBuffer.buffered.length-1):0;}
function bufferAhead(){return Math.max(0,bufferedEnd()-video.currentTime);}

function updateProgress(){
  const start=bufferedStart();const end=bufferedEnd();const ahead=bufferAhead();const percent=clamp(ahead/bufferTarget*100,0,100);
  $('#bufferPercent').textContent=`${Math.round(percent)}%`;$('.buffer-ring').style.setProperty('--progress',`${percent}%`);$('#bufferTrack').style.setProperty('--buffered',`${end?clamp((end-start)/Math.max(end,1)*100,0,100):0}%`);
  $('#delayBadge').textContent=`+${ahead.toFixed(1)}s`;$('#timeLabel').textContent=`${formatTime(video.currentTime)} / ${formatTime(end)}`;$('#recordedValue').textContent=formatTime(end);$('#leadValue').textContent=`${ahead.toFixed(1)}s`;
  $('#seekRange').min=String(start);$('#seekRange').max=String(Math.max(start,end));if(!scrubbing)$('#seekRange').value=String(clamp(video.currentTime,start,Math.max(start,end)));
  const ready=ahead>=bufferTarget-.35||streamEnded&&ahead>.1;$('#activateButton').disabled=!ready;$('#activateButton').classList.toggle('ready',ready);maybeResume();
}

function finishMediaSource(){if(!streamEnded||chunks.length||!mediaSource||mediaSource.readyState!=='open'||sourceBuffer?.updating)return;try{mediaSource.endOfStream();}catch{}}
async function drain(){
  if(appending||!sourceBuffer||sourceBuffer.updating)return;
  if(!chunks.length){finishMediaSource();return;}
  appending=true;const next=chunks.shift();
  try{sourceBuffer.appendBuffer(await next.arrayBuffer());}
  catch(error){
    chunks.unshift(next);
    if(error?.name==='QuotaExceededError'){
      if(video.currentTime>70&&bufferedStart()<video.currentTime-60){try{sourceBuffer.remove(bufferedStart(),video.currentTime-45);}catch{setError('appendFailed');}}
      else{$('#warningText').textContent=t('previewLimit');$('#playerWarning').hidden=false;setTimeout(drain,500);}
    }else if(['InvalidStateError','AbortError'].includes(error?.name)&&!streamEnded)setTimeout(drain,120);
    else setError('appendFailed');
  }
  finally{appending=false;}
}

function initializeMedia(type){
  if(mediaSource)return;if(!MediaSource.isTypeSupported(type)){setError('unsupported');return;}
  mediaSource=new MediaSource();video.src=URL.createObjectURL(mediaSource);
  mediaSource.addEventListener('sourceopen',()=>{try{sourceBuffer=mediaSource.addSourceBuffer(type);sourceBuffer.addEventListener('updateend',()=>{updateProgress();drain();});sourceBuffer.addEventListener('error',()=>setError('appendFailed'));drain();}catch{setError('unsupported');}},{once:true});
}

function ensureAudio(){if(audioContext)return;audioContext=new AudioContext({latencyHint:'interactive'});dubGain=audioContext.createGain();dubGain.connect(audioContext.destination);applyMix();}
function stopDubPlayers(){for(const player of dubPlayers.values()){try{player.stop();}catch{}}dubPlayers.clear();}
function scheduleDub(chunk){
  if(!started||!wantedPlaying||video.paused||!audioContext||dubPlayers.has(chunk.id))return;
  const end=chunk.start+chunk.duration;if(end<=video.currentTime+.01||chunk.start>video.currentTime+35)return;
  const bytes=chunk.data instanceof ArrayBuffer?chunk.data:chunk.data.buffer;const samples=new Int16Array(bytes);const buffer=audioContext.createBuffer(1,samples.length,24000);const output=buffer.getChannelData(0);
  for(let index=0;index<samples.length;index+=1)output[index]=samples[index]/32768;
  const offset=Math.max(0,video.currentTime-chunk.start);if(offset>=buffer.duration)return;
  const player=audioContext.createBufferSource();player.buffer=buffer;player.connect(dubGain);dubPlayers.set(chunk.id,player);player.onended=()=>dubPlayers.delete(chunk.id);player.start(audioContext.currentTime+Math.max(.025,chunk.start-video.currentTime),offset);
}
function scheduleWindow(){for(const chunk of dubTimeline)scheduleDub(chunk);}

function applyMix(){const original=settings.originalAudioEnabled?clamp(settings.originalVolume,0,1):0;const dubbed=settings.dubAudioEnabled?Math.max(0,Number(settings.dubVolume)||0):0;video.muted=original===0;video.volume=original;if(dubGain&&audioContext)dubGain.gain.setTargetAtTime(dubbed,audioContext.currentTime,.02);$('#originalVolume').disabled=!settings.originalAudioEnabled;$('#dubVolume').disabled=!settings.dubAudioEnabled;}
function upsertCaption(translated,cue){const key=translated?'translated':'source';const index=captions[key].findIndex((item)=>item.id===cue.id);if(index>=0)captions[key][index]={...captions[key][index],...cue};else captions[key].push(cue);captions[key].sort((left,right)=>left.start-right.start);}
function updateCaptions(){
  const now=video.currentTime;const pick=(items)=>[...items].reverse().find((item)=>item.start<=now&&item.end+.25>=now);const source=pick(captions.source);const translated=pick(captions.translated);
  $('#sourceCaption').textContent=source?.text||'';$('#sourceCaption').hidden=!settings.sourceSubtitlesEnabled||!source?.text;$('#translatedCaption').textContent=translated?.text||'';$('#translatedCaption').hidden=!settings.translatedSubtitlesEnabled||!translated?.text;
  const ducking=settings.autoDuck&&settings.originalAudioEnabled&&settings.dubAudioEnabled&&dubTimeline.some((range)=>range.start<=now&&range.start+range.duration>=now);video.volume=settings.originalAudioEnabled?clamp(settings.originalVolume*(ducking ? 0.12 : 1),0,1):0;
}

async function playConsumer(){ensureAudio();await audioContext.resume();await video.play();started=true;wantedPlaying=true;rebuffering=false;hiddenPause=false;$('#bufferOverlay').hidden=true;$('#rebufferNotice').hidden=true;$('#playButton').textContent='❚❚';$('#liveBadge').classList.add('playing');$('#liveBadge span').textContent=t('playing');scheduleWindow();}
async function maybeResume(){if(!rebuffering||!wantedPlaying||document.visibilityState==='hidden')return;const threshold=streamEnded ? 0.15 : Math.max(2,Math.min(bufferTarget*.65,12));if(bufferAhead()<threshold)return;try{await playConsumer();}catch{setError('unsupported');}}
async function enterRebuffer(){if(!started||!wantedPlaying||streamEnded&&bufferAhead()<=.05)return;rebuffering=true;video.pause();await audioContext?.suspend();stopDubPlayers();$('#rebufferNotice').hidden=false;$('#playButton').textContent='▶';$('#liveBadge').classList.remove('playing');$('#liveBadge span').textContent=t('buffering');}
async function togglePlayback(){if(!started){if(bufferAhead()<bufferTarget-.35&&!streamEnded)return;wantedPlaying=true;await playConsumer();return;}if(video.paused){wantedPlaying=true;if(bufferAhead()<1&&!streamEnded){rebuffering=true;await maybeResume();return;}await playConsumer();}else{wantedPlaying=false;video.pause();await audioContext?.suspend();$('#playButton').textContent='▶';$('#liveBadge span').textContent=t('paused');}}
async function seekTo(value){const target=clamp(Number(value)||0,bufferedStart(),bufferedEnd());stopDubPlayers();video.currentTime=target;updateCaptions();updateProgress();if(wantedPlaying){if(bufferAhead()<1&&!streamEnded){rebuffering=true;await enterRebuffer();}else{await audioContext?.resume();scheduleWindow();if(video.paused)await video.play();}}}

function renderSettings(){translate();for(const id of ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled'])$(`#${id}`).checked=Boolean(settings[id]);$('#originalVolume').value=settings.originalVolume;$('#dubVolume').value=settings.dubVolume;$('#originalVolumeValue').textContent=`${Math.round(settings.originalVolume*100)}%`;$('#dubVolumeValue').textContent=`${Math.round(settings.dubVolume*100)}%`;$('#originalValue').textContent=`${Math.round(settings.originalVolume*100)}%`;$('#dubValue').textContent=`${Math.round(settings.dubVolume*100)}%`;$('#engineValue').textContent=t(settings.syncCaptionEngine==='whisper'?'whisper':'gemini');applyMix();updateCaptions();}
async function persist(){await chrome.storage.local.set({settings});await chrome.runtime.sendMessage({type:'audio',config:settings});renderSettings();}

async function downloadRecording(){
  if(!recordedFileName)return;const granted=await chrome.permissions.request({permissions:['downloads']});if(!granted){$('#warningText').textContent=t('downloadDenied');$('#playerWarning').hidden=false;return;}
  const root=await navigator.storage.getDirectory();const file=await (await root.getFileHandle(recordedFileName)).getFile();const url=URL.createObjectURL(file);const stamp=new Date().toISOString().replaceAll(':','-').replace(/\.\d{3}Z$/,'Z');
  const response=await chrome.runtime.sendMessage({target:'background',type:'download',url,filename:`Avorythm/${stamp}/captured-video.webm`});if(!response?.ok)throw new Error(response?.error||'download_failed');$('#downloadState').textContent=t('downloadReady');
}

channel.onmessage=({data})=>{
  if(data?.type==='bridge-ready'){channel.postMessage({type:'ready'});return;}
  if(data?.type==='media-init'){bufferTarget=Number(data.bufferSeconds)||20;initializeMedia(data.mimeType);return;}
  if(data?.type==='media-chunk'){chunks.push(data.data);drain();return;}
  if(data?.type==='media-final'){recordedFileName=data.fileName||'';streamEnded=true;$('#downloadVideoButton').disabled=!recordedFileName;$('#downloadState').textContent=t('downloadReady');$('#stopButton').hidden=true;$('#closeButton').hidden=false;finishMediaSource();updateProgress();return;}
  if(data?.type==='dub-chunk'){const chunk={...data,id:++dubSequence,duration:Number(data.duration)||new Int16Array(data.data).length/24000};dubTimeline.push(chunk);scheduleDub(chunk);return;}
  if(data?.type==='dub-interrupted'){stopDubPlayers();return;}
  if(data?.type==='caption'){upsertCaption(Boolean(data.translated),data);updateCaptions();return;}
  if(data?.type==='warning'){$('#warningText').textContent=t('warning');$('#playerWarning').hidden=false;}
};

$('#activateButton').addEventListener('click',togglePlayback);$('#playButton').addEventListener('click',togglePlayback);
$('#seekRange').addEventListener('input',()=>{scrubbing=true;$('#timeLabel').textContent=`${formatTime($('#seekRange').value)} / ${formatTime(bufferedEnd())}`;});
$('#seekRange').addEventListener('change',async()=>{scrubbing=false;await seekTo($('#seekRange').value);});
$('#goLiveButton').addEventListener('click',()=>seekTo(Math.max(bufferedStart(),bufferedEnd()-Math.min(2,bufferTarget*.1))));
$('#fullscreenButton').addEventListener('click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await $('.stage-card').requestFullscreen();});
$('#downloadVideoButton').addEventListener('click',()=>downloadRecording().catch(()=>setError('appendFailed')));
$('#localeToggle').addEventListener('click',async()=>{settings.locale=settings.locale==='fa'?'en':'fa';await persist();});$('#settingsButton').addEventListener('click',()=>chrome.runtime.openOptionsPage());
$('#stopButton').addEventListener('click',async()=>{await chrome.runtime.sendMessage({type:'stop',keepPlayer:true});});$('#closeButton').addEventListener('click',()=>window.close());
for(const id of ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled'])$(`#${id}`).addEventListener('change',async()=>{settings[id]=$(`#${id}`).checked;await persist();});
for(const id of ['originalVolume','dubVolume'])$(`#${id}`).addEventListener('input',async()=>{settings[id]=Number($(`#${id}`).value);await persist();});
video.addEventListener('timeupdate',()=>{updateProgress();updateCaptions();scheduleWindow();});video.addEventListener('waiting',enterRebuffer);video.addEventListener('playing',()=>{$('#liveBadge span').textContent=t('playing');$('#rebufferNotice').hidden=true;scheduleWindow();});
video.addEventListener('ended',async()=>{wantedPlaying=false;await audioContext?.suspend();$('#playButton').textContent='▶';$('#liveBadge span').textContent=t(streamEnded?'complete':'paused');});
document.addEventListener?.('visibilitychange',async()=>{if(document.visibilityState==='hidden'&&!video.paused){hiddenPause=true;video.pause();await audioContext?.suspend();stopDubPlayers();}else if(document.visibilityState==='visible'&&hiddenPause&&wantedPlaying){hiddenPause=false;rebuffering=true;await maybeResume();}});

(async()=>{const [stored,stateResponse]=await Promise.all([chrome.storage.local.get('settings'),chrome.runtime.sendMessage({type:'state'})]);settings=normalizeSettings(stored.settings);bufferTarget=settings.syncBufferSeconds;$('#sourceTitle').textContent=stateResponse?.state?.sourceTitle||t('sourceTab');renderSettings();updateProgress();channel.postMessage({type:'ready'});const readyTimer=setInterval(()=>{if(sourceBuffer)clearInterval(readyTimer);else channel.postMessage({type:'ready'});},500);setInterval(()=>{drain();updateProgress();updateCaptions();scheduleWindow();},250);})().catch(()=>setError('unsupported'));
