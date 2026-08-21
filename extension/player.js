import {normalizeSettings, outputMix, updateOutputMix} from './core.mjs';
import {buildMixedRecording} from './recording-export.mjs';

const $ = (selector) => document.querySelector(selector);
const channel = new BroadcastChannel('avorythm-sync');
const video = $('#video');
let settings = normalizeSettings({playbackMode: 'synchronized'});
let mix = outputMix(settings, 'synchronized');
let mediaSource = null;
let sourceBuffer = null;
let bufferTarget = 20;
let chunks = [];
let appending = false;
let streamEnded = false;
let started = false;
let wantedPlaying = false;
let rebuffering = false;
let scrubbing = false;
let audioContext = null;
let dubGain = null;
let dubSequence = 0;
let dubTimeline = [];
const dubPlayers = new Map();
let captions = {source: [], translated: []};
let recordedFileName = '';
let recordedDuration = 0;
let playbackRevision = 0;
let resumePromise = null;
let processingFrontier = Infinity;
let restorePosition = 0;
let restoreWantedPlaying = false;
let replayAttempts = 0;
let captionsDirty = true;
const dubbedTrack = $('#dubbedTrack');
let finalizedPlayback = false;
let mediaRevision = 0;
let mediaObjectUrl = '';
let dubbedObjectUrl = '';
let finalizedArtifacts = null;
let finalizedMetadata = null;
const MIN_DUB_SCHEDULE_HORIZON_SECONDS = 12;

const copy = {
  fa:{playerTitle:'پلیر هماهنگ',buffering:'در حال ساخت دوبارهٔ بافر…',playing:'پخش هماهنگ',dubPending:'ویدئو در حال پخش است؛ دوبله هنوز نرسیده',paused:'متوقف',complete:'ضبط کامل شد',stop:'پایان ضبط',close:'بستن',sourceTab:'ویدئوی تب انتخاب‌شده',playerHelp:'ترد ضبط جلوتر حرکت می‌کند و این پلیر نسخهٔ بافرشده را مستقل پخش می‌کند.',preparing:'در حال ضبط بخش ابتدایی',preparingHelp:'به‌محض آماده‌شدن فاصلهٔ امن، ویدئو پخش می‌شود؛ دوبله هر زمان آماده شود به همان خط زمانی می‌پیوندد.',activate:'پخش از ابتدای ضبط',playerError:'پلیر هماهنگ آماده نشد',outputMix:'پخش و خروجی پلیر هماهنگ',outputHelp:'کاملاً مستقل از تنظیمات پخش داخل تب',allSettings:'همهٔ تنظیمات ↗',originalAudio:'صدای اصلی',dubbedAudio:'صدای دوبله',sourceSubtitles:'زیرنویس اصلی',translatedSubtitles:'زیرنویس ترجمه',autoDuck:'کاهش هوشمند صدای اصلی',captionChannel:'نمایش روی ویدئو',unsupported:'این صفحه یا نوع ویدئو امکان ضبط مستقیم را نمی‌دهد. حالت «داخل همین صفحه» را انتخاب کن.',appendFailed:'جریان ویدئو قابل ادامه‌دادن نبود. برای محتوای محافظت‌شده حالت داخل صفحه را استفاده کن.',previewLimit:'حافظهٔ پیش‌نمایش پر شده، اما ضبط ادامه دارد. «رفتن به آخرین بخش» را بزن یا ضبط را تمام کن.',recorderTitle:'ضبط و پخش',recorderHelp:'ضبط تب مستقل از Pause، Seek و Fullscreen پلیر ادامه دارد.',recorded:'ضبط‌شده',lead:'فاصلهٔ امن',timing:'زمان‌بندی',gemini:'Gemini 3.5 Live',whisper:'Whisper + LLM + Gemini 3.1 Live',downloadVideo:'ساخت و دریافت ویدیوی شخصی‌سازی‌شده',recording:'در حال ضبط…',downloadReady:'فایل ویدئو آماده است',exporting:'در حال ساخت خروجی',exportComplete:'ویدیوی شخصی‌سازی‌شده دریافت شد',exportUnsupported:'Chrome نتوانست خروجی ترکیبی بسازد؛ مرورگر را به‌روز کن.',storageNote:'فقط آخرین ضبط به‌طور موقت در فضای خصوصی Chrome می‌ماند؛ فایل‌های دریافتی در Downloads/Avorythm ذخیره می‌شوند.',goLive:'رفتن به آخرین بخش',fullscreen:'تمام‌صفحه',warning:'موتور دقیق موقتاً در دسترس نبود؛ پخش و ضبط اصلی ادامه دارد.',actionFailed:'این فرمان انجام نشد؛ دوباره امتحان کن.',downloadDenied:'برای ذخیرهٔ ویدئو، اجازهٔ Downloads لازم است.'},
  en:{playerTitle:'Synchronized player',buffering:'Rebuilding the safety buffer…',playing:'Synchronized playback',dubPending:'Video is playing; the first dubbed cue is still arriving',paused:'Paused',complete:'Recording complete',stop:'Finish recording',close:'Close',sourceTab:'Selected tab video',playerHelp:'The recording thread stays ahead while this player independently consumes the buffered copy.',preparing:'Recording the opening segment',preparingHelp:'Video starts as soon as the safety lead is ready; dubbed speech joins its timeline when available.',activate:'Play from the beginning',playerError:'Synchronized player could not start',outputMix:'Synchronized playback & export',outputHelp:'Completely independent from on-page playback settings',allSettings:'All settings ↗',originalAudio:'Original audio',dubbedAudio:'Dubbed audio',sourceSubtitles:'Source subtitles',translatedSubtitles:'Translated subtitles',autoDuck:'Smart original-audio ducking',captionChannel:'Shown over video',unsupported:'This page or video type cannot be captured directly. Choose On this page.',appendFailed:'The video stream could not continue. Use on-page mode for protected media.',previewLimit:'The live preview buffer is full, but recording continues. Jump to latest or finish recording.',recorderTitle:'Recorder & playback',recorderHelp:'Tab recording continues independently of Pause, Seek, and player fullscreen.',recorded:'Recorded',lead:'Safety lead',timing:'Timing',gemini:'Gemini 3.5 Live',whisper:'Whisper + LLM + Gemini 3.1 Live',downloadVideo:'Build & download customized video',recording:'Recording…',downloadReady:'Video file is ready',exporting:'Building export',exportComplete:'Customized video downloaded',exportUnsupported:'Chrome could not build the mixed export; update the browser and try again.',storageNote:'Only the latest recording is kept temporarily in private Chrome storage. Downloads are saved under Downloads/Avorythm.',goLive:'Jump to latest',fullscreen:'Fullscreen',warning:'The precise engine became temporarily unavailable; original capture and playback continue.',actionFailed:'That action could not be completed. Try again.',downloadDenied:'Downloads permission is required to save the video.'}
};

function t(key){return copy[settings.locale]?.[key]||copy.en[key]||key;}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function formatTime(seconds){const value=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}
function pcmSamples(data){if(data instanceof ArrayBuffer)return new Int16Array(data);if(ArrayBuffer.isView(data))return new Int16Array(data.buffer,data.byteOffset,Math.floor(data.byteLength/2));return new Int16Array(data||0);}
function translate(){document.documentElement.lang=settings.locale;document.documentElement.dir=settings.locale==='fa'?'rtl':'ltr';document.querySelectorAll('[data-i18n]').forEach((node)=>{node.textContent=t(node.dataset.i18n);});$('#localeToggle').textContent=settings.locale==='fa'?'EN':'فا';}

function recoverablePlaybackError(error){return ['AbortError','InvalidStateError','NotAllowedError'].includes(error?.name);}
function clearStageError(){$('#stageError').hidden=true;}
function setError(key){$('#stageErrorText').textContent=t(key);$('#stageError').hidden=false;$('#bufferOverlay').hidden=true;$('#liveBadge span').textContent=t('playerError');$('#liveBadge').classList.remove('playing');}
function showRecovery(){clearStageError();$('#rebufferNotice').hidden=false;$('#liveBadge').classList.remove('playing');$('#liveBadge span').textContent=t('buffering');}
function handleActionError(error){if(recoverablePlaybackError(error)){showRecovery();return;}$('#warningText').textContent=t('actionFailed');$('#playerWarning').hidden=false;}
function runAction(action){try{return Promise.resolve(action()).catch(handleActionError);}catch(error){handleActionError(error);return Promise.resolve();}}
function bufferedStart(){return finalizedPlayback?0:(sourceBuffer?.buffered.length?sourceBuffer.buffered.start(0):0);}
function bufferedEnd(){return finalizedPlayback?timelineEnd():(sourceBuffer?.buffered.length?sourceBuffer.buffered.end(sourceBuffer.buffered.length-1):0);}
function timelineEnd(){return Math.max(recordedDuration,Number.isFinite(video.duration)?video.duration:0,sourceBuffer?.buffered.length?sourceBuffer.buffered.end(sourceBuffer.buffered.length-1):0);}
function rangeAt(position){
  if(finalizedPlayback)return {start:0,end:timelineEnd()};
  const ranges=sourceBuffer?.buffered;if(!ranges)return null;
  for(let index=0;index<ranges.length;index+=1){const start=ranges.start(index);const end=ranges.end(index);if(position>=start-.08&&position<=end+.08)return {start,end};}
  return null;
}
function isBuffered(position){return Boolean(rangeAt(position));}
function playableEnd(){const range=rangeAt(video.currentTime);return range?Math.min(range.end,processingFrontier):video.currentTime;}
function bufferAhead(){return Math.max(0,playableEnd()-video.currentTime);}
function firstDubReady(){return Boolean(dubbedTrack?.src||dubTimeline.length);}
function playbackStatus(){return mix.dubAudioEnabled&&!mix.originalAudioEnabled&&!firstDubReady()?'dubPending':'playing';}

function updateProgress(){
  const end=timelineEnd();const ahead=bufferAhead();const percent=clamp(ahead/bufferTarget*100,0,100);const availableEnd=bufferedEnd();
  $('#bufferPercent').textContent=`${Math.round(percent)}%`;$('.buffer-ring').style.setProperty('--progress',`${percent}%`);$('#bufferTrack').style.setProperty('--buffered',`${end?clamp(availableEnd/end*100,0,100):0}%`);
  $('#delayBadge').textContent=`+${ahead.toFixed(1)}s`;$('#timeLabel').textContent=`${formatTime(video.currentTime)} / ${formatTime(end)}`;$('#recordedValue').textContent=formatTime(end);$('#leadValue').textContent=`${ahead.toFixed(1)}s`;
  $('#seekRange').min='0';$('#seekRange').max=String(Math.max(0,end));if(!scrubbing)$('#seekRange').value=String(clamp(video.currentTime,0,Math.max(0,end)));
  const ready=ahead>=bufferTarget-.35||streamEnded&&ahead>.1;$('#activateButton').disabled=!ready;$('#activateButton').classList.toggle('ready',ready);void maybeResume();
}

function finishMediaSource(){if(!streamEnded||chunks.length||!mediaSource||mediaSource.readyState!=='open'||sourceBuffer?.updating)return;try{mediaSource.endOfStream();}catch{}}
async function drain(){
  if(appending||!sourceBuffer||sourceBuffer.updating)return;
  if(!chunks.length){finishMediaSource();return;}
  appending=true;const next=chunks.shift();const revision=mediaRevision;const targetBuffer=sourceBuffer;
  try{const bytes=await next.arrayBuffer();if(revision!==mediaRevision||targetBuffer!==sourceBuffer)return;targetBuffer.appendBuffer(bytes);clearStageError();replayAttempts=0;}
  catch(error){
    if(revision!==mediaRevision)return;
    chunks.unshift(next);
    if(error?.name==='QuotaExceededError'){
      if(video.currentTime>70&&bufferedStart()<video.currentTime-60){try{sourceBuffer.remove(bufferedStart(),video.currentTime-45);}catch{setError('appendFailed');}}
      else{$('#warningText').textContent=t('previewLimit');$('#playerWarning').hidden=false;setTimeout(drain,500);}
    }else if(['InvalidStateError','AbortError'].includes(error?.name)&&!streamEnded)setTimeout(drain,120);
    else setError('appendFailed');
  }
  finally{if(revision===mediaRevision)appending=false;}
}

function initializeMedia(type){
  if(mediaSource)return;if(!MediaSource.isTypeSupported(type)){setError('unsupported');return;}
  mediaSource=new MediaSource();if(mediaObjectUrl)URL.revokeObjectURL(mediaObjectUrl);mediaObjectUrl=URL.createObjectURL(mediaSource);video.src=mediaObjectUrl;
  mediaSource.addEventListener('sourceopen',()=>{try{sourceBuffer=mediaSource.addSourceBuffer(type);sourceBuffer.addEventListener('updateend',()=>{
    if(restorePosition!==null&&sourceBuffer.buffered.length){
      if(isBuffered(restorePosition)){video.currentTime=restorePosition;restorePosition=null;captionsDirty=true;}
      else if(bufferedEnd()<restorePosition-45&&bufferedEnd()-bufferedStart()>60){try{sourceBuffer.remove(bufferedStart(),bufferedEnd()-30);return;}catch{}}
    }
    updateProgress();drain();
  });sourceBuffer.addEventListener('error',recoverMediaStream);drain();}catch{setError('unsupported');}},{once:true});
}

function resetMediaStream(){
  mediaRevision+=1;invalidatePlayback();stopDubPlayers();video.pause();dubbedTrack?.pause?.();
  chunks=[];appending=false;sourceBuffer=null;mediaSource=null;streamEnded=false;finalizedPlayback=false;processingFrontier=settings.syncCaptionEngine==='whisper'?0:Infinity;
  try{video.removeAttribute?.('src');video.load?.();if(mediaObjectUrl)URL.revokeObjectURL(mediaObjectUrl);mediaObjectUrl='';}catch{}
}
function recoverMediaStream(){
  if(streamEnded||replayAttempts>=3){setError('appendFailed');return;}
  replayAttempts+=1;restorePosition=video.currentTime;restoreWantedPlaying=wantedPlaying;rebuffering=true;showRecovery();
  channel.postMessage({type:'ready',position:restorePosition,replay:true});
}

function ensureAudio(){if(audioContext)return;audioContext=new AudioContext({latencyHint:'interactive'});dubGain=audioContext.createGain();dubGain.connect(audioContext.destination);applyMix();}
function stopDubPlayers(){for(const player of dubPlayers.values()){try{player.stop();}catch{}}dubPlayers.clear();}
function scheduleDub(chunk){
  if(!started||!wantedPlaying||video.paused||!audioContext||dubPlayers.has(chunk.id))return;
  const horizon=Math.max(MIN_DUB_SCHEDULE_HORIZON_SECONDS,Math.min(bufferTarget,30));
  const end=chunk.start+chunk.duration;if(end<=video.currentTime+.01||chunk.start>video.currentTime+horizon)return;
  const samples=pcmSamples(chunk.data);const buffer=audioContext.createBuffer(1,samples.length,24000);const output=buffer.getChannelData(0);
  for(let index=0;index<samples.length;index+=1)output[index]=samples[index]/32768;
  const offset=Math.max(0,video.currentTime-chunk.start);if(offset>=buffer.duration)return;
  const player=audioContext.createBufferSource();player.buffer=buffer;player.connect(dubGain);dubPlayers.set(chunk.id,player);player.onended=()=>dubPlayers.delete(chunk.id);player.start(audioContext.currentTime+Math.max(.025,chunk.start-video.currentTime),offset);
}
function scheduleWindow(){for(const chunk of dubTimeline)scheduleDub(chunk);}

function applyMix(){const original=mix.originalAudioEnabled?clamp(mix.originalVolume,0,1):0;const dubbed=mix.dubAudioEnabled?Math.max(0,Number(mix.dubVolume)||0):0;video.muted=original===0;video.volume=original;if(dubGain&&audioContext)dubGain.gain.setTargetAtTime(dubbed,audioContext.currentTime,.02);if(dubbedTrack){dubbedTrack.muted=dubbed===0;dubbedTrack.volume=clamp(dubbed,0,1);}$('#originalVolume').disabled=!mix.originalAudioEnabled;$('#dubVolume').disabled=!mix.dubAudioEnabled;$('#autoDuck').disabled=!mix.originalAudioEnabled||!mix.dubAudioEnabled;}
function upsertCaption(translated,cue){const key=translated?'translated':'source';const index=captions[key].findIndex((item)=>item.id===cue.id);if(index>=0)captions[key][index]={...captions[key][index],...cue};else captions[key].push(cue);captions[key].sort((left,right)=>left.start-right.start);}
function updateCaptions(){
  if(video.paused&&!scrubbing&&!captionsDirty)return;
  const now=video.currentTime;const pick=(items)=>[...items].reverse().find((item)=>item.start<=now&&item.end+.25>=now);const source=pick(captions.source);const translated=pick(captions.translated);
  $('#sourceCaption').textContent=source?.text||'';$('#sourceCaption').hidden=!mix.sourceSubtitlesEnabled||!source?.text;$('#translatedCaption').textContent=translated?.text||'';$('#translatedCaption').hidden=!mix.translatedSubtitlesEnabled||!translated?.text;
  const ducking=mix.autoDuck&&mix.originalAudioEnabled&&mix.dubAudioEnabled&&dubTimeline.some((range)=>range.start<=now&&range.start+range.duration>=now);video.volume=mix.originalAudioEnabled?clamp(mix.originalVolume*(ducking ? 0.12 : 1),0,1):0;
  captionsDirty=false;
}

function invalidatePlayback(){playbackRevision+=1;}
async function syncFinalDub(action){if(!dubbedTrack?.src)return;dubbedTrack.currentTime=video.currentTime;if(action==='play'&&mix.dubAudioEnabled)await dubbedTrack.play();else dubbedTrack.pause();}
async function playConsumer(){
  const revision=++playbackRevision;ensureAudio();await audioContext.resume();
  try{await video.play();}catch(error){if(revision!==playbackRevision||recoverablePlaybackError(error))return false;throw error;}
  if(revision!==playbackRevision){video.pause();return false;}
  await syncFinalDub('play').catch((error)=>{if(!recoverablePlaybackError(error))throw error;});
  started=true;wantedPlaying=true;rebuffering=false;captionsDirty=true;clearStageError();$('#bufferOverlay').hidden=true;$('#rebufferNotice').hidden=true;$('#playButton').textContent='❚❚';$('#liveBadge').classList.add('playing');$('#liveBadge span').textContent=t(playbackStatus());scheduleWindow();return true;
}
async function maybeResume(){
  if(!rebuffering||!wantedPlaying)return;const threshold=streamEnded ? 0.15 : Math.max(2,Math.min(bufferTarget*.65,12));if(bufferAhead()<threshold)return;
  if(resumePromise)return resumePromise;
  resumePromise=playConsumer().catch(handleActionError).finally(()=>{resumePromise=null;});return resumePromise;
}
async function enterRebuffer(){if(!started||!wantedPlaying||streamEnded&&bufferAhead()<=.05)return;invalidatePlayback();rebuffering=true;video.pause();dubbedTrack?.pause?.();await audioContext?.suspend();stopDubPlayers();showRecovery();$('#playButton').textContent='▶';}
async function togglePlayback(){if(!started){if(bufferAhead()<bufferTarget-.35&&!streamEnded)return;wantedPlaying=true;await playConsumer();return;}if(video.paused){wantedPlaying=true;if(bufferAhead()<1&&!streamEnded){rebuffering=true;showRecovery();await maybeResume();return;}await playConsumer();}else{wantedPlaying=false;invalidatePlayback();video.pause();dubbedTrack?.pause?.();await audioContext?.suspend();stopDubPlayers();captionsDirty=true;updateCaptions();$('#playButton').textContent='▶';$('#liveBadge').classList.remove('playing');$('#liveBadge span').textContent=t('paused');}}
function requestReplay(target){invalidatePlayback();restorePosition=target;restoreWantedPlaying=wantedPlaying;rebuffering=wantedPlaying;video.pause();dubbedTrack?.pause?.();stopDubPlayers();showRecovery();channel.postMessage({type:'ready',position:target,replay:true});}
async function seekTo(value){
  const target=clamp(Number(value)||0,0,timelineEnd());
  if(!finalizedPlayback&&!isBuffered(target)){requestReplay(target);return;}
  invalidatePlayback();stopDubPlayers();video.currentTime=target;if(dubbedTrack?.src)dubbedTrack.currentTime=target;captionsDirty=true;updateCaptions();updateProgress();if(wantedPlaying){if(bufferAhead()<1&&!streamEnded){rebuffering=true;showRecovery();}else await playConsumer();}
}

function renderSettings(){translate();for(const id of ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled','autoDuck'])$(`#${id}`).checked=Boolean(mix[id]);$('#originalVolume').value=mix.originalVolume;$('#dubVolume').value=mix.dubVolume;$('#originalVolumeValue').textContent=`${Math.round(mix.originalVolume*100)}%`;$('#dubVolumeValue').textContent=`${Math.round(mix.dubVolume*100)}%`;$('#originalValue').textContent=`${Math.round(mix.originalVolume*100)}%`;$('#dubValue').textContent=`${Math.round(mix.dubVolume*100)}%`;$('#engineValue').textContent=t(settings.syncCaptionEngine==='whisper'?'whisper':'gemini');applyMix();updateCaptions();updateProgress();}
async function persist(){await chrome.storage.local.set({settings});await chrome.runtime.sendMessage({type:'audio',config:settings});renderSettings();}
async function persistPlayerSession(){
  if(!chrome.storage.session?.set)return;
  await chrome.storage.session.set({playerSession:{
    currentTime:Number(video.currentTime)||0,
    wantedPlaying,
    started,
    recordedFileName,
    recordedDuration,
    sourceTitle:$('#sourceTitle').textContent||'',
    updatedAt:Date.now()
  }}).catch(()=>{});
}

async function downloadRecording(){
  if(!finalizedArtifacts||!finalizedMetadata)return;const granted=await chrome.permissions.request({permissions:['downloads']});if(!granted){$('#warningText').textContent=t('downloadDenied');$('#playerWarning').hidden=false;return;}
  const button=$('#downloadVideoButton');button.disabled=true;const root=await navigator.storage.getDirectory();const exportMix={...mix};const [videoFile,dubbedFile]=await Promise.all([(await root.getFileHandle(finalizedArtifacts.videoFileName)).getFile(),(await root.getFileHandle(finalizedArtifacts.dubbedFileName)).getFile()]);
  try{
    const rendered=await buildMixedRecording({videoBlob:videoFile,dubbedBlob:dubbedFile,mix:exportMix,duckIntervals:finalizedMetadata.translated||[],durationSeconds:Number(finalizedMetadata.duration)||Number(finalizedArtifacts.duration)||0,onProgress:(progress)=>{$('#downloadState').textContent=`${t('exporting')} · ${Math.round(progress*100)}%`;}});
    const stamp=new Date().toISOString().replaceAll(':','-').replace(/\.\d{3}Z$/,'Z');const folder=`Avorythm/${stamp}`;const audioName=exportMix.dubAudioEnabled&&!exportMix.originalAudioEnabled?'dubbed-video':exportMix.dubAudioEnabled&&exportMix.originalAudioEnabled?'mixed-video':exportMix.originalAudioEnabled?'original-video':'silent-video';
    const downloads=[[rendered,`${folder}/${audioName}.webm`]];
    if(exportMix.sourceSubtitlesEnabled)downloads.push([(await root.getFileHandle(finalizedArtifacts.sourceSubtitleFileName)).getFile(),`${folder}/source.srt`]);
    if(exportMix.translatedSubtitlesEnabled)downloads.push([(await root.getFileHandle(finalizedArtifacts.translatedSubtitleFileName)).getFile(),`${folder}/translated.srt`]);
    for(const [file,filename] of downloads){const url=URL.createObjectURL(await file);const response=await chrome.runtime.sendMessage({target:'background',type:'download',url,filename});if(!response?.ok)throw new Error(response?.error||'download_failed');setTimeout(()=>URL.revokeObjectURL(url),30000);}
    $('#downloadState').textContent=t('exportComplete');
  }catch(error){$('#warningText').textContent=t(error?.message?.startsWith('mixed_export_')?'exportUnsupported':'actionFailed');$('#playerWarning').hidden=false;throw error;}
  finally{button.disabled=false;}
}

async function restoreFinalizedSession(artifacts) {
  const root=await navigator.storage.getDirectory();
  const [videoFile,dubbedFile,metadataFile]=await Promise.all([
    (await root.getFileHandle(artifacts.videoFileName)).getFile(),
    (await root.getFileHandle(artifacts.dubbedFileName)).getFile(),
    (await root.getFileHandle(artifacts.metadataFileName)).getFile()
  ]);
  const metadata=JSON.parse(await metadataFile.text());finalizedArtifacts=artifacts;finalizedMetadata=metadata;captions={source:metadata.source||[],translated:metadata.translated||[]};captionsDirty=true;
  recordedDuration=Math.max(recordedDuration,Number(metadata.duration)||Number(artifacts.duration)||0);finalizedPlayback=true;streamEnded=true;processingFrontier=Infinity;recordedFileName=artifacts.videoFileName;
  invalidatePlayback();stopDubPlayers();video.pause();dubbedTrack?.pause?.();if(mediaObjectUrl)URL.revokeObjectURL(mediaObjectUrl);if(dubbedObjectUrl)URL.revokeObjectURL(dubbedObjectUrl);mediaObjectUrl=URL.createObjectURL(videoFile);dubbedObjectUrl=URL.createObjectURL(dubbedFile);video.src=mediaObjectUrl;dubbedTrack.src=dubbedObjectUrl;applyMix();
  $('#bufferOverlay').hidden=true;$('#rebufferNotice').hidden=true;$('#stopButton').hidden=true;$('#closeButton').hidden=false;$('#downloadVideoButton').disabled=false;$('#downloadState').textContent=t('downloadReady');
  await new Promise((resolve)=>{if(video.readyState>=1)resolve();else video.addEventListener('loadedmetadata',resolve,{once:true});});
  const target=clamp(Number(restorePosition)||0,0,timelineEnd());restorePosition=null;video.currentTime=target;if(dubbedTrack.src)dubbedTrack.currentTime=target;captionsDirty=true;updateCaptions();updateProgress();
  if(restoreWantedPlaying){wantedPlaying=true;rebuffering=false;await playConsumer();}
}

channel.onmessage=({data})=>{
  if(data?.type==='bridge-ready'){channel.postMessage({type:'ready'});return;}
  if(data?.type==='session-reset'){const position=Number(data.position);restorePosition=Number.isFinite(position)?Math.max(0,position):Math.max(0,Number(restorePosition)||video.currentTime);recordedDuration=Math.max(recordedDuration,Number(data.duration)||0);resetMediaStream();captions={source:[],translated:[]};dubTimeline=[];dubSequence=0;captionsDirty=true;return;}
  if(data?.type==='media-init'){bufferTarget=Number(data.bufferSeconds)||20;initializeMedia(data.mimeType);return;}
  if(data?.type==='media-chunk'){chunks.push(data.data);drain();return;}
  if(data?.type==='media-progress'){recordedDuration=Math.max(recordedDuration,Number(data.duration)||0);updateProgress();return;}
  if(data?.type==='processing-frontier'){processingFrontier=Math.max(processingFrontier,Number(data.seconds)||0);updateProgress();return;}
  if(data?.type==='media-final'){recordedFileName=data.fileName||'';recordedDuration=Math.max(recordedDuration,Number(data.duration)||0);streamEnded=true;processingFrontier=Infinity;$('#downloadVideoButton').disabled=true;$('#downloadState').textContent=t('downloadReady');$('#stopButton').hidden=true;$('#closeButton').hidden=false;finishMediaSource();updateProgress();if(data.artifacts){restorePosition=video.currentTime;restoreWantedPlaying=wantedPlaying;void restoreFinalizedSession(data.artifacts).catch(handleActionError);}return;}
  if(data?.type==='dub-chunk'){const id=data.id||`dub-${++dubSequence}`;if(dubTimeline.some((chunk)=>chunk.id===id))return;const chunk={...data,id,duration:Number(data.duration)||pcmSamples(data.data).length/24000};dubTimeline.push(chunk);updateProgress();if(started&&wantedPlaying)$('#liveBadge span').textContent=t('playing');scheduleDub(chunk);return;}
  if(data?.type==='dub-interrupted'){stopDubPlayers();return;}
  if(data?.type==='caption'){upsertCaption(Boolean(data.translated),data);if(!video.paused){captionsDirty=true;updateCaptions();}return;}
  if(data?.type==='warning'){$('#warningText').textContent=t('warning');$('#playerWarning').hidden=false;}
};

$('#activateButton').addEventListener('click',()=>runAction(togglePlayback));$('#playButton').addEventListener('click',()=>runAction(togglePlayback));
$('#seekRange').addEventListener('input',()=>{scrubbing=true;$('#timeLabel').textContent=`${formatTime($('#seekRange').value)} / ${formatTime(timelineEnd())}`;});
$('#seekRange').addEventListener('change',()=>runAction(async()=>{scrubbing=false;await seekTo($('#seekRange').value);}));
$('#goLiveButton').addEventListener('click',()=>runAction(()=>seekTo(Math.max(0,timelineEnd()-Math.min(2,bufferTarget*.1)))));
$('#fullscreenButton').addEventListener('click',()=>runAction(async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await $('.stage-card').requestFullscreen();}));
$('#downloadVideoButton').addEventListener('click',()=>runAction(downloadRecording));
$('#localeToggle').addEventListener('click',()=>runAction(async()=>{settings.locale=settings.locale==='fa'?'en':'fa';await persist();}));$('#settingsButton').addEventListener('click',()=>chrome.runtime.openOptionsPage());
$('#stopButton').addEventListener('click',()=>runAction(async()=>{const button=$('#stopButton');button.disabled=true;button.textContent=t('buffering');$('#downloadState').textContent=t('buffering');const response=await chrome.runtime.sendMessage({type:'stop',keepPlayer:true});if(!response?.ok){button.hidden=true;$('#closeButton').hidden=false;throw new Error(response?.error||'stop_failed');}}));$('#closeButton').addEventListener('click',()=>window.close());
for(const id of ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled','autoDuck'])$(`#${id}`).addEventListener('change',()=>runAction(async()=>{settings=updateOutputMix(settings,'synchronized',{[id]:$(`#${id}`).checked});mix=outputMix(settings,'synchronized');captionsDirty=true;await persist();}));
for(const id of ['originalVolume','dubVolume'])$(`#${id}`).addEventListener('input',()=>runAction(async()=>{settings=updateOutputMix(settings,'synchronized',{[id]:Number($(`#${id}`).value)});mix=outputMix(settings,'synchronized');await persist();}));
video.addEventListener('timeupdate',()=>{captionsDirty=true;updateProgress();updateCaptions();scheduleWindow();if(dubbedTrack?.src&&!dubbedTrack.paused&&Math.abs(dubbedTrack.currentTime-video.currentTime)>.12)dubbedTrack.currentTime=video.currentTime;});video.addEventListener('waiting',()=>runAction(enterRebuffer));video.addEventListener('playing',()=>{clearStageError();$('#liveBadge span').textContent=t('playing');$('#rebufferNotice').hidden=true;scheduleWindow();});
video.addEventListener('ended',()=>runAction(async()=>{wantedPlaying=false;invalidatePlayback();dubbedTrack?.pause?.();await audioContext?.suspend();stopDubPlayers();$('#playButton').textContent='▶';$('#liveBadge span').textContent=t(streamEnded?'complete':'paused');}));
document.addEventListener('visibilitychange',()=>{
  stopDubPlayers();
  if(!wantedPlaying||video.paused)return;
  void audioContext?.resume().then(scheduleWindow).catch(handleActionError);
});

(async()=>{
  const [stored,stateResponse,sessionStored]=await Promise.all([
    chrome.storage.local.get('settings'),
    chrome.runtime.sendMessage({type:'state'}),
    chrome.storage.session?.get?.('playerSession')||Promise.resolve({})
  ]);
  settings=normalizeSettings(stored.settings);mix=outputMix(settings,'synchronized');bufferTarget=settings.syncBufferSeconds;processingFrontier=settings.syncCaptionEngine==='whisper'?0:Infinity;
  const previous=sessionStored?.playerSession||{};restorePosition=Math.max(0,Number(previous.currentTime)||0);recordedDuration=Math.max(0,Number(previous.recordedDuration)||0,Number(stateResponse?.state?.syncArtifacts?.duration)||0);restoreWantedPlaying=Boolean(previous.wantedPlaying&&stateResponse?.state?.active);started=Boolean(previous.started);wantedPlaying=restoreWantedPlaying;rebuffering=restoreWantedPlaying;
  $('#sourceTitle').textContent=stateResponse?.state?.sourceTitle||previous.sourceTitle||t('sourceTab');renderSettings();updateProgress();
  if(!stateResponse?.state?.active&&stateResponse?.state?.syncArtifacts){await restoreFinalizedSession(stateResponse.state.syncArtifacts);setInterval(persistPlayerSession,1000);return;}
  channel.postMessage({type:'ready',position:restorePosition});
  const readyTimer=setInterval(()=>{if(sourceBuffer)clearInterval(readyTimer);else channel.postMessage({type:'ready',position:restorePosition});},500);
  setInterval(()=>{drain();updateProgress();if(!video.paused){captionsDirty=true;updateCaptions();}scheduleWindow();},250);
  setInterval(persistPlayerSession,1000);
})().catch(()=>setError('unsupported'));
