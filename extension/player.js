import {normalizeSettings} from './core.mjs';

const $ = (selector) => document.querySelector(selector);
const channel = new BroadcastChannel('avorythm-sync');
const video = $('#video');
let settings = normalizeSettings({playbackMode: 'synchronized'});
let mediaSource = null;
let sourceBuffer = null;
let mimeType = '';
let bufferTarget = 4.5;
let chunks = [];
let appending = false;
let started = false;
let audioContext = null;
let dubGain = null;
let pendingDubs = [];
let dubPlayers = new Set();
let dubRanges = [];
let captions = {source: [], translated: []};

const copy = {
  fa:{playerTitle:'پلیر هماهنگ',buffering:'در حال بافر…',playing:'پخش هماهنگ',paused:'متوقف',stop:'توقف',sourceTab:'ویدئوی تب انتخاب‌شده',playerHelp:'صوت و تصویر چند ثانیه عقب نگه داشته می‌شوند تا دوبله روی همان خط زمانی پخش شود.',preparing:'در حال آماده‌سازی پلیر هماهنگ',preparingHelp:'ویدئو و اولین جملهٔ دوبله در حال بافرشدن هستند.',activate:'آماده‌ام؛ پس از بافر پخش کن',waitingBuffer:'فعال شد؛ چند لحظه تا تکمیل بافر…',playerError:'پلیر هماهنگ آماده نشد',outputMix:'ترکیب خروجی',outputHelp:'همین‌جا و در لحظه تغییرش بده',allSettings:'همهٔ تنظیمات ↗',originalAudio:'صدای اصلی',dubbedAudio:'صدای دوبله',sourceSubtitles:'زیرنویس اصلی',translatedSubtitles:'زیرنویس ترجمه',captionChannel:'نمایش روی ویدئو',unsupported:'این صفحه یا نوع ویدئو امکان بافر مستقیم را نمی‌دهد. حالت «داخل همین صفحه» را از اکستنشن انتخاب کن.',appendFailed:'مرورگر نتوانست جریان ویدئو را بافر کند. برای محتوای محافظت‌شده از حالت داخل صفحه استفاده کن.'},
  en:{playerTitle:'Synchronized player',buffering:'Buffering…',playing:'Synchronized playback',paused:'Paused',stop:'Stop',sourceTab:'Selected tab video',playerHelp:'Audio and video are held briefly so translated speech can play on a closer shared timeline.',preparing:'Preparing synchronized playback',preparingHelp:'Buffering video and the first translated phrase.',activate:'Ready—play when buffered',waitingBuffer:'Activated—waiting for the buffer…',playerError:'Synchronized player could not start',outputMix:'Output mix',outputHelp:'Change any channel while it plays',allSettings:'All settings ↗',originalAudio:'Original audio',dubbedAudio:'Dubbed audio',sourceSubtitles:'Source subtitles',translatedSubtitles:'Translated subtitles',captionChannel:'Shown over video',unsupported:'This page or video type cannot be buffered directly. Choose On this page from the extension.',appendFailed:'The browser could not buffer this video stream. Use on-page mode for protected media.'}
};

function t(key){return copy[settings.locale]?.[key]||copy.en[key]||key;}
function translate(){document.documentElement.lang=settings.locale;document.documentElement.dir=settings.locale==='fa'?'rtl':'ltr';document.querySelectorAll('[data-i18n]').forEach((node)=>{node.textContent=t(node.dataset.i18n);});$('#localeToggle').textContent=settings.locale==='fa'?'EN':'فا';}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

function setError(key){
  $('#stageErrorText').textContent=t(key);
  $('#stageError').hidden=false;
  $('#bufferOverlay').hidden=true;
  $('#liveBadge span').textContent=t('playerError');
  $('#liveBadge').classList.remove('playing');
}

function bufferedEnd(){
  if(!sourceBuffer?.buffered.length)return 0;
  return sourceBuffer.buffered.end(sourceBuffer.buffered.length-1);
}

function updateProgress(){
  const end=bufferedEnd();
  const ahead=Math.max(0,end-video.currentTime);
  const percent=clamp(ahead/bufferTarget*100,0,100);
  $('#bufferPercent').textContent=`${Math.round(percent)}%`;
  $('.buffer-ring').style.setProperty('--progress',`${percent}%`);
  $('#bufferTrack').style.setProperty('--buffered',`${percent}%`);
  $('#delayBadge').textContent=`−${bufferTarget.toFixed(1)}s`;
  $('#timeLabel').textContent=`LIVE −${Math.max(0,ahead).toFixed(1)}s`;
  const ready=ahead>=bufferTarget-.35;
  $('#activateButton').disabled=!ready;
  $('#activateButton').classList.toggle('ready',ready);
}

async function drain(){
  if(appending||!sourceBuffer||sourceBuffer.updating||!chunks.length)return;
  appending=true;
  try{
    const data=await chunks.shift().arrayBuffer();
    sourceBuffer.appendBuffer(data);
  }catch{
    setError('appendFailed');
  }finally{appending=false;}
}

function initializeMedia(type){
  if(mediaSource)return;
  mimeType=type;
  if(!MediaSource.isTypeSupported(mimeType)){setError('unsupported');return;}
  mediaSource=new MediaSource();
  video.src=URL.createObjectURL(mediaSource);
  mediaSource.addEventListener('sourceopen',()=>{
    try{
      sourceBuffer=mediaSource.addSourceBuffer(mimeType);
      sourceBuffer.addEventListener('updateend',()=>{
        updateProgress();
        if(video.currentTime>35&&sourceBuffer.buffered.length&&sourceBuffer.buffered.start(0)<video.currentTime-25){
          sourceBuffer.remove(sourceBuffer.buffered.start(0),video.currentTime-20);
        }else drain();
      });
      sourceBuffer.addEventListener('error',()=>setError('appendFailed'));
      drain();
    }catch{setError('unsupported');}
  },{once:true});
}

function ensureAudio(){
  if(audioContext)return;
  audioContext=new AudioContext({latencyHint:'interactive'});
  dubGain=audioContext.createGain();
  dubGain.connect(audioContext.destination);
  applyMix();
}

function scheduleDub(chunk){
  if(!started||!audioContext||video.paused){
    pendingDubs.push(chunk);
    if(pendingDubs.length>480)pendingDubs.shift();
    return;
  }
  const bytes=chunk.data instanceof ArrayBuffer?chunk.data:chunk.data.buffer;
  const samples=new Int16Array(bytes);
  const buffer=audioContext.createBuffer(1,samples.length,24000);
  const output=buffer.getChannelData(0);
  for(let index=0;index<samples.length;index+=1)output[index]=samples[index]/32768;
  const lateness=Math.max(0,video.currentTime-chunk.start);
  if(lateness>=buffer.duration)return;
  const player=audioContext.createBufferSource();
  player.buffer=buffer;player.connect(dubGain);dubPlayers.add(player);player.onended=()=>dubPlayers.delete(player);
  const when=audioContext.currentTime+Math.max(.025,chunk.start-video.currentTime);
  player.start(when,lateness);
  dubRanges.push({start:chunk.start,end:chunk.start+buffer.duration});
  if(dubRanges.length>120)dubRanges=dubRanges.slice(-80);
}

function schedulePending(){
  const pending=pendingDubs.splice(0);
  for(const chunk of pending)scheduleDub(chunk);
}

function clearDub(){
  for(const player of dubPlayers){try{player.stop();}catch{}}
  dubPlayers.clear();pendingDubs=[];dubRanges=[];
}

function applyMix(){
  const original=settings.originalAudioEnabled?clamp(settings.originalVolume,0,1):0;
  const dubbed=settings.dubAudioEnabled?Math.max(0,Number(settings.dubVolume)||0):0;
  video.muted=original===0;
  video.volume=original;
  if(dubGain&&audioContext)dubGain.gain.setTargetAtTime(dubbed,audioContext.currentTime,.02);
  $('#originalVolume').disabled=!settings.originalAudioEnabled;
  $('#dubVolume').disabled=!settings.dubAudioEnabled;
}

function updateCaptions(){
  const now=video.currentTime;
  const pick=(items)=>[...items].reverse().find((item)=>item.start<=now&&item.end+2.2>=now);
  const source=pick(captions.source);const translated=pick(captions.translated);
  $('#sourceCaption').textContent=source?.text||'';
  $('#sourceCaption').hidden=!settings.sourceSubtitlesEnabled||!source?.text;
  $('#translatedCaption').textContent=translated?.text||'';
  $('#translatedCaption').hidden=!settings.translatedSubtitlesEnabled||!translated?.text;
  const ducking=settings.autoDuck&&settings.originalAudioEnabled&&settings.dubAudioEnabled&&dubRanges.some((range)=>range.start<=now&&range.end>=now);
  video.volume=settings.originalAudioEnabled?clamp(settings.originalVolume*(ducking ? .12 : 1),0,1):0;
  dubRanges=dubRanges.filter((range)=>range.end>now-2);
}

async function startPlayback(){
  if(started)return;
  ensureAudio();
  await audioContext.resume();
  applyMix();
  try{
    await video.play();
    started=true;
    $('#bufferOverlay').hidden=true;
    $('#playButton').textContent='❚❚';
    $('#liveBadge').classList.add('playing');
    $('#liveBadge span').textContent=t('playing');
    schedulePending();
  }catch{setError('unsupported');}
}

async function togglePlayback(){
  if(!started){
    if(bufferedEnd()-video.currentTime<bufferTarget-.35)return;
    ensureAudio();await startPlayback();return;
  }
  if(video.paused){await audioContext.resume();await video.play();$('#playButton').textContent='❚❚';$('#liveBadge span').textContent=t('playing');schedulePending();await chrome.runtime.sendMessage({type:'media-control',action:'play'});}
  else{video.pause();await audioContext.suspend();$('#playButton').textContent='▶';$('#liveBadge span').textContent=t('paused');await chrome.runtime.sendMessage({type:'media-control',action:'pause'});}
}

function renderSettings(){
  translate();
  for(const id of ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled'])$(`#${id}`).checked=Boolean(settings[id]);
  $('#originalVolume').value=settings.originalVolume;$('#dubVolume').value=settings.dubVolume;
  $('#originalVolumeValue').textContent=`${Math.round(settings.originalVolume*100)}%`;$('#dubVolumeValue').textContent=`${Math.round(settings.dubVolume*100)}%`;
  $('#originalValue').textContent=`${Math.round(settings.originalVolume*100)}%`;$('#dubValue').textContent=`${Math.round(settings.dubVolume*100)}%`;
  applyMix();updateCaptions();
}

async function persist(){
  await chrome.storage.local.set({settings});
  await chrome.runtime.sendMessage({type:'audio',config:settings});
  renderSettings();
}

channel.onmessage=({data})=>{
  if(data?.type==='bridge-ready'){channel.postMessage({type:'ready'});return;}
  if(data?.type==='media-init'){bufferTarget=Number(data.bufferSeconds)||4.5;initializeMedia(data.mimeType);return;}
  if(data?.type==='media-chunk'){chunks.push(data.data);if(chunks.length>240)chunks.shift();drain();return;}
  if(data?.type==='dub-chunk'){scheduleDub(data);return;}
  if(data?.type==='dub-interrupted'){clearDub();return;}
  if(data?.type==='caption'){
    const key=data.translated?'translated':'source';captions[key].push(data);if(captions[key].length>100)captions[key].shift();updateCaptions();
  }
};

$('#activateButton').addEventListener('click',togglePlayback);$('#playButton').addEventListener('click',togglePlayback);
$('#localeToggle').addEventListener('click',async()=>{settings.locale=settings.locale==='fa'?'en':'fa';await persist();});
$('#settingsButton').addEventListener('click',()=>chrome.runtime.openOptionsPage());
$('#stopButton').addEventListener('click',async()=>{await chrome.runtime.sendMessage({type:'stop'});window.close();});
for(const id of ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled'])$(`#${id}`).addEventListener('change',async()=>{settings[id]=$(`#${id}`).checked;await persist();});
for(const id of ['originalVolume','dubVolume'])$(`#${id}`).addEventListener('input',async()=>{settings[id]=Number($(`#${id}`).value);await persist();});
video.addEventListener('timeupdate',()=>{updateProgress();updateCaptions();});
video.addEventListener('waiting',()=>{$('#liveBadge span').textContent=t('buffering');audioContext?.suspend();});
video.addEventListener('playing',()=>{$('#liveBadge span').textContent=t('playing');audioContext?.resume();schedulePending();});

(async()=>{
  const [stored,stateResponse]=await Promise.all([chrome.storage.local.get('settings'),chrome.runtime.sendMessage({type:'state'})]);
  settings=normalizeSettings(stored.settings);
  bufferTarget=settings.syncBufferSeconds;
  $('#sourceTitle').textContent=stateResponse?.state?.sourceTitle||t('sourceTab');
  renderSettings();updateProgress();
  await chrome.runtime.sendMessage({type:'media-control',action:'play'}).catch(()=>{});
  channel.postMessage({type:'ready'});
  const readyTimer=setInterval(()=>{if(sourceBuffer)clearInterval(readyTimer);else channel.postMessage({type:'ready'});},500);
  setInterval(()=>{updateProgress();updateCaptions();},200);
})().catch(()=>setError('unsupported'));
