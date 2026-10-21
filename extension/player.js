import {captionReadingSeconds, clampOffset, normalizeSettings, outputMix, shiftSrt, updateOutputMix} from './core.mjs';
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
let stallRecoveryPromise = null;
let lastStallPosition = NaN;
let repeatedStalls = 0;
let processingFrontier = Infinity;
let restorePosition = 0;
let restoreWantedPlaying = false;
let replayAttempts = 0;
let lastReplayPosition = NaN;
let replayTarget = null;
let replayGeneration = 0;
let captionsDirty = true;
const dubbedTrack = $('#dubbedTrack');
let finalizedPlayback = false;
let mediaRevision = 0;
let mediaObjectUrl = '';
let dubbedObjectUrl = '';
let finalizedArtifacts = null;
let finalizedMetadata = null;
let finalDubRetryTimer = null;
let finalDubStartPromise = null;
let stageIssue = null;
let warningIssue = null;
let replayPending = false;
let replayTimer = null;
let appendBlocked = false;
let lastProgressPosition = 0;
let lastProgressAt = performance.now();
let dubClock = null;
const MIN_DUB_SCHEDULE_HORIZON_SECONDS = 12;
// Buffered media beyond this lead means a stall is a decoder hiccup, not starvation.
const HEALTHY_AHEAD_SECONDS = 1.5;
// Holes in the live MSE buffer (missing video frames) are skipped, never waited out.
const MAX_BUFFER_HOLE_SECONDS = 10;
const OFFSET_FIELDS = {subtitleOffset: 'syncSubtitleOffset', dubOffset: 'syncDubOffset'};

const copy = {
  fa:{playerTitle:'پلیر هماهنگ',buffering:'در حال ساخت دوبارهٔ بافر…',playing:'پخش هماهنگ',dubPending:'ویدئو در حال پخش است؛ دوبله هنوز نرسیده',paused:'متوقف',complete:'ضبط کامل شد',stop:'پایان ضبط',close:'بستن',sourceTab:'ویدئوی تب انتخاب‌شده',playerHelp:'ترد ضبط جلوتر حرکت می‌کند و این پلیر نسخهٔ بافرشده را مستقل پخش می‌کند.',preparing:'در حال ضبط بخش ابتدایی',preparingHelp:'به‌محض آماده‌شدن فاصلهٔ امن، ویدئو پخش می‌شود؛ دوبله هر زمان آماده شود به همان خط زمانی می‌پیوندد.',captureProgress:'فاصلهٔ ضبط',processedProgress:'بافر دوبلهٔ قابل‌پخش',activate:'پخش از ابتدای ضبط',playerError:'پلیر هماهنگ آماده نشد',outputMix:'پخش و خروجی پلیر هماهنگ',outputHelp:'کاملاً مستقل از تنظیمات پخش داخل تب',allSettings:'همهٔ تنظیمات ↗',originalAudio:'صدای اصلی',dubbedAudio:'صدای دوبله',sourceSubtitles:'زیرنویس اصلی',translatedSubtitles:'زیرنویس ترجمه',autoDuck:'کاهش هوشمند صدای اصلی',captionChannel:'نمایش روی ویدئو',unsupported:'این صفحه یا نوع ویدئو امکان ضبط مستقیم را نمی‌دهد. حالت «داخل همین صفحه» را انتخاب کن.',appendFailed:'جریان ویدئو قابل ادامه‌دادن نبود. برای محتوای محافظت‌شده حالت داخل صفحه را استفاده کن.',previewLimit:'حافظهٔ پیش‌نمایش پر شده، اما ضبط ادامه دارد. «رفتن به آخرین بخش» را بزن یا ضبط را تمام کن.',recorderTitle:'ضبط و پخش',recorderHelp:'ضبط تب مستقل از Pause، Seek و Fullscreen پلیر ادامه دارد.',recorded:'ضبط‌شده',lead:'فاصلهٔ امن',timing:'زمان‌بندی',gemini:'Gemini 3.5 Live',whisper:'Whisper + LLM + Gemini 3.1 Live',downloadVideo:'ساخت و دریافت ویدیوی شخصی‌سازی‌شده',recording:'در حال ضبط…',downloadReady:'فایل ویدئو آماده است',exporting:'در حال ساخت خروجی',exportComplete:'ویدیوی شخصی‌سازی‌شده دریافت شد',exportUnsupported:'این مرورگر از ساخت خروجی ترکیبی پشتیبانی نمی‌کند؛ Chrome را به‌روز کن.',exportPlaybackFailed:'بازپخش فایل ضبط‌شده کامل نشد؛ یک بار پلیر را ببند و دوباره خروجی بگیر.',exportAudioFailed:'فایل دوبله کامل نیست؛ ضبط را دوباره پایان بده و سپس خروجی بگیر.',exportArtifactMissing:'فایل موقت ضبط پیدا نشد؛ یک ضبط تازه شروع کن.',exportDownloadFailed:'Chrome نتوانست فایل خروجی را در Downloads ذخیره کند.',storageNote:'فقط آخرین ضبط به‌طور موقت در فضای خصوصی Chrome می‌ماند؛ فایل‌های دریافتی در Downloads/Avorythm ذخیره می‌شوند.',goLive:'رفتن به آخرین بخش',fullscreen:'تمام‌صفحه',warning:'موتور دقیق متوقف شد؛ ضبط حفظ شده و پلیر برای جلوگیری از سکوت به صدای اصلی برگشت.',groqAuthFailed:'کلید Groq معتبر نیست؛ آن را در تنظیمات دوباره وارد کن.',groqAccessFailed:'Chrome به Groq دسترسی ندارد؛ api.groq.com را از پروکسی سیستم یا مرورگر عبور بده و دوباره امتحان کن.',groqConnectionFailed:'اتصال Chrome به Groq برقرار نشد؛ پروکسی سیستم یا مرورگر را بررسی کن.',groqTimeoutFailed:'پاسخ Groq بیش از حد طول کشید؛ مسیر پروکسی api.groq.com را بررسی و دوباره تلاش کن.',groqTranscriptionFailed:'Whisper نتوانست این بخش صوت را تبدیل به متن کند؛ ضبط اصلی حفظ شده است.',groqQuotaFailed:'سهمیهٔ Groq فعلاً تمام شده است؛ کمی بعد دوباره امتحان کن.',translationFailed:'ترجمهٔ متنی Gemini کامل نشد؛ ضبط اصلی حفظ شده است.',translationTimeoutFailed:'پاسخ مدل ترجمه بیش از حد طول کشید؛ اتصال Google را بررسی کن.',voiceAuthFailed:'کلید Gemini معتبر نیست یا اجازهٔ مدل صدا را ندارد.',voiceQuotaFailed:'سهمیهٔ Gemini 3.1 Live فعلاً تمام شده است.',voiceFailed:'Gemini 3.1 Live نتوانست صوت دوبله را بسازد؛ ضبط اصلی حفظ شده است.',actionFailed:'این فرمان انجام نشد؛ دوباره امتحان کن.',downloadDenied:'برای ذخیرهٔ ویدئو، اجازهٔ Downloads لازم است.'},
  en:{playerTitle:'Synchronized player',buffering:'Rebuilding the safety buffer…',playing:'Synchronized playback',dubPending:'Video is playing; the first dubbed cue is still arriving',paused:'Paused',complete:'Recording complete',stop:'Finish recording',close:'Close',sourceTab:'Selected tab video',playerHelp:'The recording thread stays ahead while this player independently consumes the buffered copy.',preparing:'Recording the opening segment',preparingHelp:'Video starts as soon as the safety lead is ready; dubbed speech joins its timeline when available.',captureProgress:'Capture lead',processedProgress:'Playable dubbed buffer',activate:'Play from the beginning',playerError:'Synchronized player could not start',outputMix:'Synchronized playback & export',outputHelp:'Completely independent from on-page playback settings',allSettings:'All settings ↗',originalAudio:'Original audio',dubbedAudio:'Dubbed audio',sourceSubtitles:'Source subtitles',translatedSubtitles:'Translated subtitles',autoDuck:'Smart original-audio ducking',captionChannel:'Shown over video',unsupported:'This page or video type cannot be captured directly. Choose On this page.',appendFailed:'The video stream could not continue. Use on-page mode for protected media.',previewLimit:'The live preview buffer is full, but recording continues. Jump to latest or finish recording.',recorderTitle:'Recorder & playback',recorderHelp:'Tab recording continues independently of Pause, Seek, and player fullscreen.',recorded:'Recorded',lead:'Safety lead',timing:'Timing',gemini:'Gemini 3.5 Live',whisper:'Whisper + LLM + Gemini 3.1 Live',downloadVideo:'Build & download customized video',recording:'Recording…',downloadReady:'Video file is ready',exporting:'Building export',exportComplete:'Customized video downloaded',exportUnsupported:'This browser cannot build a mixed export; update Chrome and try again.',exportPlaybackFailed:'The recorded file could not finish replaying; close the player and retry the export.',exportAudioFailed:'The dubbed-audio artifact is incomplete; finish the recording again before exporting.',exportArtifactMissing:'The temporary recording is no longer available; start a new synchronized recording.',exportDownloadFailed:'Chrome could not save the finished file to Downloads.',storageNote:'Only the latest recording is kept temporarily in private Chrome storage. Downloads are saved under Downloads/Avorythm.',goLive:'Jump to latest',fullscreen:'Fullscreen',warning:'The precise engine stopped; the recording was preserved and playback fell back to original audio.',groqAuthFailed:'The Groq key is invalid; save it again in Settings.',groqAccessFailed:'Chrome cannot reach Groq on this network; route api.groq.com through the browser or system proxy and retry.',groqConnectionFailed:'Chrome could not connect to Groq; check the browser or system proxy.',groqTimeoutFailed:'Groq took too long to respond; verify the api.groq.com proxy route and retry.',groqTranscriptionFailed:'Whisper could not transcribe this audio window; the original recording was preserved.',groqQuotaFailed:'The Groq quota is temporarily exhausted; try again later.',translationFailed:'Gemini text translation did not complete; the original recording was preserved.',translationTimeoutFailed:'The translation model took too long to respond; check Google connectivity.',voiceAuthFailed:'The Gemini key is invalid or cannot access the voice model.',voiceQuotaFailed:'The Gemini 3.1 Live quota is temporarily exhausted.',voiceFailed:'Gemini 3.1 Live could not render dubbed speech; the original recording was preserved.',actionFailed:'That action could not be completed. Try again.',downloadDenied:'Downloads permission is required to save the video.'},
  'zh-Hans':{playerTitle:'同步播放器',buffering:'正在重建安全缓冲…',playing:'同步播放',dubPending:'视频正在播放;配音尚未到达',paused:'已暂停',complete:'录制完成',stop:'结束录制',close:'关闭',sourceTab:'所选标签页视频',playerHelp:'录制线程在前方推进,此播放器独立消费缓冲副本。',preparing:'正在录制开场片段',preparingHelp:'安全提前量就绪后视频即开始播放;配音就绪后会接入对应时间线。',captureProgress:'录制提前量',processedProgress:'可播放的配音缓冲',activate:'从开头播放',playerError:'同步播放器未能启动',outputMix:'同步播放与导出',outputHelp:'与页面内播放设置完全独立',allSettings:'全部设置 ↗',originalAudio:'原始音频',dubbedAudio:'配音',sourceSubtitles:'原文字幕',translatedSubtitles:'译文字幕',autoDuck:'智能压低原声',captionChannel:'叠加在视频上',unsupported:'此页面或视频类型无法直接录制。请选择"在本页"模式。',appendFailed:'视频流无法继续。对于受保护内容,请使用页面内模式。',previewLimit:'实时预览缓冲已满,但录制仍在进行。请跳转到最新或结束录制。',recorderTitle:'录制与播放',recorderHelp:'标签页录制独立于播放器的暂停、跳转和全屏。',recorded:'已录制',lead:'安全提前量',timing:'计时',gemini:'Gemini 3.5 Live',whisper:'Whisper + LLM + Gemini 3.1 Live',downloadVideo:'构建并下载定制视频',recording:'录制中…',downloadReady:'视频文件已就绪',exporting:'正在构建导出',exportComplete:'定制视频已下载',exportUnsupported:'此浏览器无法构建混合导出;请更新 Chrome 后重试。',exportPlaybackFailed:'录制文件无法完整回放;请关闭播放器后重试导出。',exportAudioFailed:'配音文件不完整;请重新结束录制后再导出。',exportArtifactMissing:'临时录制已不可用;请开始新的同步录制。',exportDownloadFailed:'Chrome 无法将成品保存到下载目录。',storageNote:'仅最新的录制会临时保存在 Chrome 私有存储中。下载文件保存在 Downloads/Avorythm 下。',goLive:'跳转到最新',fullscreen:'全屏',warning:'精准引擎已停止;录制已保留,播放器为避免静音回退到原始音频。',groqAuthFailed:'Groq 密钥无效;请在设置中重新保存。',groqAccessFailed:'Chrome 在当前网络无法访问 Groq;请让 api.groq.com 通过浏览器或系统代理后重试。',groqConnectionFailed:'Chrome 无法连接到 Groq;请检查浏览器或系统代理。',groqTimeoutFailed:'Groq 响应超时;请检查 api.groq.com 代理路由后重试。',groqTranscriptionFailed:'Whisper 无法转录此音频片段;原始录制已保留。',groqQuotaFailed:'Groq 配额暂时已耗尽;请稍后重试。',translationFailed:'Gemini 文本翻译未完成;原始录制已保留。',translationTimeoutFailed:'翻译模型响应超时;请检查 Google 连接。',voiceAuthFailed:'Gemini 密钥无效或无权访问语音模型。',voiceQuotaFailed:'Gemini 3.1 Live 配额暂时已耗尽。',voiceFailed:'Gemini 3.1 Live 无法生成配音语音;原始录制已保留。',actionFailed:'该操作未能完成。请重试。',downloadDenied:'保存视频需要下载权限。'}
};

Object.assign(copy.fa, {subtitleTiming:'زمان‌بندی زیرنویس',subtitleTimingHelp:'اگر زیرنویس دیرتر از صدا می‌آید عدد را منفی کن؛ اگر زودتر می‌آید مثبت.',dubTiming:'زمان‌بندی صدای دوبله',dubTimingHelp:'صدای دوبله را نسبت به تصویر جلو یا عقب ببر.',timingReset:'بازنشانی',timingEarlier:'۰٫۱ ثانیه زودتر',timingLater:'۰٫۱ ثانیه دیرتر',exportKeepOpen:'تا پایان ساخت خروجی این تب را باز و در پیش‌زمینه نگه دار.',dismissNotice:'باشه',retryPlayback:'تلاش دوباره برای پخش',playerError:'پخش به بررسی نیاز دارد',playPermission:'برای ادامهٔ تصویر و صدا، دکمهٔ پخش را بزن.',replayTimeout:'بازسازی پخش طول کشید. دوباره تلاش کن؛ ضبط تب مستقل ادامه دارد.',recordingStopFailed:'پایان ضبط انجام نشد؛ دوباره دکمهٔ پایان ضبط را بزن.',appendFailed:'پخش این بخش از ضبط بازیابی نشد. دوباره تلاش کن یا به بخش دیگری برو.'});
Object.assign(copy.en, {subtitleTiming:'Subtitle timing',subtitleTimingHelp:'If subtitles appear after the voice, drag left (negative); if they appear early, drag right.',dubTiming:'Dubbed voice timing',dubTimingHelp:'Move the dubbed voice earlier or later relative to the picture.',timingReset:'Reset',timingEarlier:'0.1 s earlier',timingLater:'0.1 s later',exportKeepOpen:'Keep this tab open and in the foreground until the export finishes.',dismissNotice:'OK',retryPlayback:'Retry playback',playerError:'Playback needs attention',playPermission:'Press Play to resume video and audio.',replayTimeout:'Rebuilding playback took too long. Retry; tab recording continues independently.',recordingStopFailed:'Could not finish recording. Press Finish recording to retry.',appendFailed:'This part of the recording could not be recovered. Retry or seek to another position.'});

Object.assign(copy['zh-Hans'], {subtitleTiming:'字幕时间',subtitleTimingHelp:'字幕比声音晚出现时向左拖(负值);提前出现时向右拖。',dubTiming:'配音时间',dubTimingHelp:'相对画面提前或延后配音。',timingReset:'重置',timingEarlier:'提前 0.1 秒',timingLater:'延后 0.1 秒',exportKeepOpen:'导出完成前请保持此标签页打开并在前台。'});

function t(key){return copy[settings.locale]?.[key]||copy.en[key]||key;}
function exportErrorKey(error){const code=String(error?.message||'');if(error?.name==='NotFoundError')return'exportArtifactMissing';if(/invalid_wav|audio_track|original_track/u.test(code))return'exportAudioFailed';if(/playback|empty|video_track|recorder/u.test(code))return'exportPlaybackFailed';if(/download/u.test(code))return'exportDownloadFailed';return'exportUnsupported';}
function preciseWarningKey(code){if(code==='groq_auth_failed')return'groqAuthFailed';if(code==='groq_access_forbidden')return'groqAccessFailed';if(code==='groq_connection_failed')return'groqConnectionFailed';if(code==='groq_timeout')return'groqTimeoutFailed';if(code==='groq_transcription_failed')return'groqTranscriptionFailed';if(code==='groq_quota_exceeded')return'groqQuotaFailed';if(code==='gemini_translation_timeout')return'translationTimeoutFailed';if(String(code).startsWith('gemini_translation_')||code==='translation_pool_exhausted')return'translationFailed';if(code==='gemini_voice_auth_failed')return'voiceAuthFailed';if(code==='gemini_voice_quota_exceeded')return'voiceQuotaFailed';if(String(code).startsWith('gemini_voice_'))return'voiceFailed';return'warning';}
function subtitleShift(){return Number(settings.syncSubtitleOffset)||0;}
function dubShift(){return Number(settings.syncDubOffset)||0;}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function formatTime(seconds){const value=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}
function pcmSamples(data){if(data instanceof ArrayBuffer)return new Int16Array(data);if(ArrayBuffer.isView(data))return new Int16Array(data.buffer,data.byteOffset,Math.floor(data.byteLength/2));return new Int16Array(data||0);}
function translate(){document.documentElement.lang=settings.locale;document.documentElement.dir=settings.locale==='fa'?'rtl':'ltr';document.querySelectorAll('[data-i18n]').forEach((node)=>{node.textContent=t(node.dataset.i18n);});document.querySelectorAll('[data-i18n-aria]').forEach((node)=>node.setAttribute('aria-label',t(node.dataset.i18nAria)));$('#localeToggle').value=settings.locale;}

function recoverablePlaybackError(error){return ['AbortError','InvalidStateError','NotAllowedError'].includes(error?.name);}
function dismissStageError(){if(stageIssue){stageIssue.dismissed=true;clearTimeout(stageIssue.timer);}$('#stageError').hidden=true;}
function clearStageError(){dismissStageError();stageIssue=null;}
function dismissWarning(){if(warningIssue)clearTimeout(warningIssue.timer);$('#playerWarning').hidden=true;}
function clearWarning(category){if(warningIssue?.category===category){dismissWarning();warningIssue=null;}}
function setError(key){
  if(stageIssue?.key===key)return;
  clearStageError();stageIssue={key,position:video.currentTime};
  $('#stageErrorText').textContent=t(key);$('#stageError').hidden=false;$('#bufferOverlay').hidden=true;$('#rebufferNotice').hidden=true;
  $('#liveBadge span').textContent=t('playerError');$('#liveBadge').classList.remove('playing');
  stageIssue.timer=setTimeout(dismissStageError,12000);
}
function showWarning(key,category='action'){
  if(warningIssue?.key===key&&warningIssue.category===category)return;
  dismissWarning();warningIssue={key,category};$('#warningText').textContent=t(key);$('#playerWarning').hidden=false;
  warningIssue.timer=setTimeout(dismissWarning,12000);
}
function showRecovery(){clearStageError();$('#rebufferNotice').hidden=false;$('#liveBadge').classList.remove('playing');$('#liveBadge span').textContent=t('buffering');}
function handleActionError(error){
  if(error?.name==='AbortError')return;
  if(error?.name==='NotAllowedError'){wantedPlaying=false;rebuffering=false;video.pause();dubbedTrack?.pause?.();stopDubPlayers();$('#playButton').textContent='▶';$('#rebufferNotice').hidden=true;setError('playPermission');return;}
  showWarning('actionFailed');
}
function runAction(action){try{return Promise.resolve(action()).catch(handleActionError);}catch(error){handleActionError(error);return Promise.resolve();}}
function safeBufferedRanges(target=sourceBuffer){try{return target?.buffered||null;}catch{return null;}}
function bufferedStart(){const ranges=safeBufferedRanges();return finalizedPlayback?0:(ranges?.length?ranges.start(0):0);}
function bufferedEnd(){if(finalizedPlayback)return timelineEnd();const ranges=safeBufferedRanges();return ranges?.length?ranges.end(ranges.length-1):0;}
function timelineEnd(){const ranges=safeBufferedRanges();return Math.max(recordedDuration,Number.isFinite(video.duration)?video.duration:0,ranges?.length?ranges.end(ranges.length-1):0);}
function rangeAt(position){
  if(finalizedPlayback)return {start:0,end:timelineEnd()};
  const ranges=safeBufferedRanges();if(!ranges)return null;
  for(let index=0;index<ranges.length;index+=1){const start=ranges.start(index);const end=ranges.end(index);if(position>=start&&position<=end)return {start,end};}
  return null;
}
function nextRange(position){
  if(finalizedPlayback)return null;const ranges=safeBufferedRanges();if(!ranges)return null;
  for(let index=0;index<ranges.length;index+=1){const start=ranges.start(index);if(start>position)return {start,end:ranges.end(index)};}
  return null;
}
function finalDubPosition(){return video.currentTime-dubShift();}
function setFinalDubTime(){if(dubbedTrack?.src)dubbedTrack.currentTime=Math.max(0,finalDubPosition());}
// Jumps over a hole in the live buffer when data exists just beyond it.
function skipBufferHole(){
  if(finalizedPlayback)return false;
  const position=Number(video.currentTime)||0;const range=rangeAt(position);
  if(range&&range.end-position>.3)return false;
  const next=nextRange(position);if(!next||(next.end-next.start<.5&&!streamEnded))return false;
  if(next.start-Math.max(position,range?.end??position)>MAX_BUFFER_HOLE_SECONDS)return false;
  invalidatePlayback();stopDubPlayers();video.currentTime=Math.min(next.end,next.start+.01);setFinalDubTime();lastProgressPosition=video.currentTime;lastProgressAt=performance.now();captionsDirty=true;updateCaptions();return true;
}
function stallHasBufferedData(){return finalizedPlayback||bufferAhead()>=HEALTHY_AHEAD_SECONDS;}
// Soft recovery: re-seek in place so the decoder restarts without rebuilding the buffer.
function nudgePlayback(){
  const position=Number(video.currentTime)||0;stopDubPlayers();dubbedTrack?.pause?.();
  try{video.currentTime=Math.min(position+.05,Math.max(position,bufferedEnd()-.05));}catch{}
  lastProgressPosition=video.currentTime;lastProgressAt=performance.now();
  if(video.paused&&wantedPlaying)void video.play().catch(()=>{});
}
function isBuffered(position){return Boolean(rangeAt(position));}
function playableEnd(){const range=rangeAt(video.currentTime);return range?Math.min(range.end,processingFrontier):video.currentTime;}
function bufferAhead(){return Math.max(0,playableEnd()-video.currentTime);}
function capturedAhead(){const range=rangeAt(video.currentTime);return Math.max(0,(range?.end||video.currentTime)-video.currentTime);}
function startupLead(){return settings.syncCaptionEngine==='whisper'?Math.min(bufferTarget,10):bufferTarget;}
function firstDubReady(){return Boolean(dubbedTrack?.src||dubTimeline.length);}
function playbackStatus(){return mix.dubAudioEnabled&&!mix.originalAudioEnabled&&!firstDubReady()?'dubPending':'playing';}

function updateProgress(){
  const end=timelineEnd();const ahead=bufferAhead();const percent=clamp(capturedAhead()/bufferTarget*100,0,100);const processedPercent=clamp(ahead/startupLead()*100,0,100);const availableEnd=bufferedEnd();
  $('#bufferPercent').textContent=`${Math.round(percent)}%`;$('.buffer-ring').style.setProperty('--progress',`${percent}%`);$('#bufferTrack').style.setProperty('--buffered',`${end?clamp(availableEnd/end*100,0,100):0}%`);
  $('#captureProgress').textContent=`${Math.round(percent)}%`;$('#processedProgress').textContent=`${Math.round(processedPercent)}%`;
  $('#delayBadge').textContent=`+${ahead.toFixed(1)}s`;$('#timeLabel').textContent=`${formatTime(video.currentTime)} / ${formatTime(end)}`;$('#recordedValue').textContent=formatTime(end);$('#leadValue').textContent=`${ahead.toFixed(1)}s`;
  $('#seekRange').min='0';$('#seekRange').max=String(Math.max(0,end));if(!scrubbing)$('#seekRange').value=String(clamp(video.currentTime,0,Math.max(0,end)));
  const ready=ahead>=startupLead()-.35||streamEnded&&ahead>.1;$('#activateButton').disabled=!ready;$('#activateButton').classList.toggle('ready',ready);void maybeResume();
}

function finishMediaSource(){if(!streamEnded||chunks.length||!mediaSource||mediaSource.readyState!=='open'||sourceBuffer?.updating)return;try{mediaSource.endOfStream();}catch{}}
async function drain(){
  if(appending||appendBlocked||replayPending||!sourceBuffer||sourceBuffer.updating)return;
  if(!chunks.length){finishMediaSource();return;}
  appending=true;const next=chunks.shift();const revision=mediaRevision;const targetBuffer=sourceBuffer;
  try{const bytes=await next.arrayBuffer();if(revision!==mediaRevision||targetBuffer!==sourceBuffer)return;targetBuffer.appendBuffer(bytes);clearWarning('buffer');}
  catch(error){
    if(revision!==mediaRevision)return;
    chunks.unshift(next);
    if(error?.name==='QuotaExceededError'){
      if(video.currentTime>70&&bufferedStart()<video.currentTime-60){try{sourceBuffer.remove(bufferedStart(),video.currentTime-45);}catch{setError('appendFailed');}}
      else{showWarning('previewLimit','buffer');setTimeout(drain,500);}
    }else if(['InvalidStateError','AbortError'].includes(error?.name)&&!streamEnded)recoverMediaStream();
    else{appendBlocked=true;setError('appendFailed');}
  }
  finally{if(revision===mediaRevision)appending=false;}
}

function initializeMedia(type){
  if(mediaSource)return;if(!MediaSource.isTypeSupported(type)){setError('unsupported');return;}
  mediaSource=new MediaSource();if(mediaObjectUrl)URL.revokeObjectURL(mediaObjectUrl);mediaObjectUrl=URL.createObjectURL(mediaSource);video.src=mediaObjectUrl;
  const targetSource=mediaSource;const revision=mediaRevision;
  mediaSource.addEventListener('sourceopen',()=>{if(targetSource!==mediaSource||revision!==mediaRevision)return;try{sourceBuffer=targetSource.addSourceBuffer(type);const targetBuffer=sourceBuffer;sourceBuffer.addEventListener('updateend',()=>{
    if(targetBuffer!==sourceBuffer)return;const ranges=safeBufferedRanges(targetBuffer);
    if(restorePosition!==null&&ranges?.length){
      const next=nextRange(restorePosition);
      if(next&&next.start-restorePosition<=.25)restorePosition=next.start+.001;
      if(isBuffered(restorePosition)){
        clearTimeout(replayTimer);replayTimer=null;
        video.currentTime=restorePosition;lastProgressPosition=restorePosition;lastProgressAt=performance.now();restorePosition=null;captionsDirty=true;
        replayTarget=null;
        if(!wantedPlaying){$('#rebufferNotice').hidden=true;$('#liveBadge span').textContent=t('paused');clearStageError();updateCaptions();}
      }
      else if(bufferedEnd()<restorePosition-45&&bufferedEnd()-bufferedStart()>60){try{sourceBuffer.remove(bufferedStart(),bufferedEnd()-30);return;}catch{}}
    }
    updateProgress();drain();
  });sourceBuffer.addEventListener('error',()=>{if(targetBuffer===sourceBuffer&&revision===mediaRevision)recoverMediaStream();});drain();}catch{setError('unsupported');}},{once:true});
}

function resetMediaStream(){
  mediaRevision+=1;invalidatePlayback();stopDubPlayers();video.pause();dubbedTrack?.pause?.();
  chunks=[];appending=false;appendBlocked=false;sourceBuffer=null;mediaSource=null;streamEnded=false;finalizedPlayback=false;processingFrontier=settings.syncCaptionEngine==='whisper'?0:Infinity;lastStallPosition=NaN;repeatedStalls=0;
  try{video.removeAttribute?.('src');video.load?.();if(mediaObjectUrl)URL.revokeObjectURL(mediaObjectUrl);mediaObjectUrl='';}catch{}
}
function recoverMediaStream(){
  if(replayPending||appendBlocked)return;
  if(streamEnded||replayAttempts>=3){failReplay('appendFailed');return;}
  replayAttempts+=1;requestReplay(video.currentTime);
}
function failReplay(key){
  clearTimeout(replayTimer);replayTimer=null;replayPending=false;appendBlocked=true;rebuffering=false;
  invalidatePlayback();video.pause();dubbedTrack?.pause?.();stopDubPlayers();$('#playButton').textContent='▶';setError(key);
}

function ensureAudio(){if(audioContext)return;audioContext=new AudioContext({latencyHint:'interactive'});dubGain=audioContext.createGain();dubGain.connect(audioContext.destination);applyMix();}
function stopDubPlayers(){for(const player of dubPlayers.values()){try{player.stop();}catch{}}dubPlayers.clear();dubClock=null;}
function scheduleDub(chunk){
  if(finalizedPlayback||rebuffering||video.seeking||!started||!wantedPlaying||video.paused||!audioContext||dubPlayers.has(chunk.id))return;
  if(audioContext.state!=='running'){
    void audioContext.resume().then(()=>{if(audioContext.state==='running')scheduleDub(chunk);}).catch(handleActionError);
    return;
  }
  const horizon=Math.max(MIN_DUB_SCHEDULE_HORIZON_SECONDS,Math.min(bufferTarget,30));
  const chunkStart=chunk.start+dubShift();
  const end=chunkStart+chunk.duration;if(end<=video.currentTime+.01||chunkStart>video.currentTime+horizon)return;
  const samples=pcmSamples(chunk.data);const buffer=audioContext.createBuffer(1,samples.length,24000);const output=buffer.getChannelData(0);
  for(let index=0;index<samples.length;index+=1)output[index]=samples[index]/32768;
  const offset=Math.max(0,video.currentTime-chunkStart);if(offset>=buffer.duration)return;
  const player=audioContext.createBufferSource();player.buffer=buffer;player.connect(dubGain);dubPlayers.set(chunk.id,player);
  player.onended=()=>{if(dubPlayers.get(chunk.id)===player)dubPlayers.delete(chunk.id);};
  if(!dubClock)dubClock={audio:audioContext.currentTime,video:video.currentTime};
  player.start(audioContext.currentTime+Math.max(.025,chunkStart-video.currentTime),offset);
}
function scheduleWindow(){
  if(finalizedPlayback||video.seeking||rebuffering)return;
  if(dubClock&&audioContext?.state==='running'&&Math.abs((video.currentTime-dubClock.video)-(audioContext.currentTime-dubClock.audio))>.2)stopDubPlayers();
  for(const chunk of dubTimeline)scheduleDub(chunk);
}

function applyMix(){const original=mix.originalAudioEnabled?clamp(mix.originalVolume,0,1):0;const dubbed=mix.dubAudioEnabled?Math.max(0,Number(mix.dubVolume)||0):0;video.muted=original===0;video.volume=original;if(dubGain&&audioContext)dubGain.gain.setTargetAtTime(dubbed,audioContext.currentTime,.02);if(dubbedTrack){dubbedTrack.muted=dubbed===0;dubbedTrack.volume=clamp(dubbed,0,1);}$('#originalVolume').disabled=!mix.originalAudioEnabled;$('#dubVolume').disabled=!mix.dubAudioEnabled;$('#autoDuck').disabled=!mix.originalAudioEnabled||!mix.dubAudioEnabled;}
function upsertCaption(translated,cue){const key=translated?'translated':'source';const index=captions[key].findIndex((item)=>item.id===cue.id);if(index>=0)captions[key][index]={...captions[key][index],...cue};else captions[key].push(cue);captions[key].sort((left,right)=>left.start-right.start);}
// A cue stays up for its reading time even when the speech was shorter, until the next cue replaces it.
function cueAt(items,at){for(let index=items.length-1;index>=0;index-=1){const item=items[index];if(item.start>at)continue;if(at<=Math.max(item.end+.25,item.start+captionReadingSeconds(item.text)))return item;}return undefined;}
function updateCaptions(){
  if(video.paused&&!scrubbing&&!captionsDirty)return;
  const now=video.currentTime;const finalDubTime=Number(dubbedTrack?.currentTime);const translatedClock=finalizedPlayback&&dubbedTrack?.src&&mix.dubAudioEnabled
    ? (Number.isFinite(finalDubTime)?finalDubTime:now-dubShift())
    : now-dubShift()-Math.max(.04,.025+(Number(audioContext?.outputLatency)||Number(audioContext?.baseLatency)||0));
  const translatedNow=Math.max(0,translatedClock-subtitleShift());const sourceNow=Math.max(0,now-subtitleShift());
  const source=cueAt(captions.source,sourceNow);const translated=cueAt(captions.translated,translatedNow);
  $('#sourceCaption').textContent=source?.text||'';$('#sourceCaption').hidden=!mix.sourceSubtitlesEnabled||!source?.text;$('#translatedCaption').textContent=translated?.text||'';$('#translatedCaption').hidden=!mix.translatedSubtitlesEnabled||!translated?.text;
  const ducking=mix.autoDuck&&mix.originalAudioEnabled&&mix.dubAudioEnabled&&dubTimeline.some((range)=>range.start+dubShift()<=now&&range.start+dubShift()+range.duration>=now);video.volume=mix.originalAudioEnabled?clamp(mix.originalVolume*(ducking ? 0.12 : 1),0,1):0;
  captionsDirty=false;
}

function invalidatePlayback(){playbackRevision+=1;if(finalDubRetryTimer!==null){clearTimeout(finalDubRetryTimer);finalDubRetryTimer=null;}}
async function syncFinalDub(action){
  if(!dubbedTrack?.src)return true;
  if(action!=='play'||!mix.dubAudioEnabled){dubbedTrack.pause();return true;}
  if(finalDubStartPromise)return finalDubStartPromise;
  const revision=playbackRevision;
  finalDubStartPromise=(async()=>{
    // A positive dub offset delays the voice: nothing to play until the video reaches it.
    if(finalDubPosition()<0){dubbedTrack.pause();return true;}
    setFinalDubTime();
    try{await dubbedTrack.play();if(revision!==playbackRevision||!wantedPlaying||video.paused){if(!wantedPlaying||video.paused)dubbedTrack.pause();return false;}return true;}
    catch(error){
      if(!recoverablePlaybackError(error))throw error;
      if(error?.name==='NotAllowedError')throw error;
      if(revision===playbackRevision&&wantedPlaying&&!video.paused&&finalDubRetryTimer===null)finalDubRetryTimer=setTimeout(()=>{
        finalDubRetryTimer=null;void syncFinalDub('play').catch(handleActionError);
      },200);
      return false;
    }
  })().finally(()=>{finalDubStartPromise=null;});
  return finalDubStartPromise;
}
async function playConsumer(){
  if(replayPending||restorePosition!==null)return false;
  const revision=++playbackRevision;ensureAudio();await audioContext.resume();
  if(revision!==playbackRevision||!wantedPlaying)return false;
  try{await video.play();}catch(error){
    if(revision!==playbackRevision)return false;
    if(['AbortError','InvalidStateError'].includes(error?.name)){rebuffering=wantedPlaying;return false;}
    throw error;
  }
  if(revision!==playbackRevision||!wantedPlaying){if(!wantedPlaying)video.pause();return false;}
  await syncFinalDub('play');
  if(revision!==playbackRevision||!wantedPlaying)return false;
  lastProgressAt=performance.now();lastProgressPosition=video.currentTime;
  started=true;wantedPlaying=true;rebuffering=false;captionsDirty=true;clearStageError();$('#bufferOverlay').hidden=true;$('#rebufferNotice').hidden=true;$('#playButton').textContent='❚❚';$('#liveBadge').classList.add('playing');$('#liveBadge span').textContent=t(playbackStatus());scheduleWindow();return true;
}
async function maybeResume(){
  if(!rebuffering||!wantedPlaying||replayPending||restorePosition!==null)return;const threshold=streamEnded ? 0.05 : Math.max(2,Math.min(bufferTarget*.65,12));if(bufferAhead()<threshold)return;
  if(resumePromise)return resumePromise;
  resumePromise=playConsumer().catch(handleActionError).finally(()=>{resumePromise=null;});return resumePromise;
}
// reason: 'event' (waiting/stalled), 'watchdog' (no progress for seconds), 'buffer' (out of processed media).
async function enterRebuffer(reason='buffer'){
  if(stallRecoveryPromise)return stallRecoveryPromise;
  stallRecoveryPromise=(async()=>{
    if(!started||!wantedPlaying||streamEnded&&bufferAhead()<=.05)return;
    if(appendBlocked||replayPending)return;
    if(skipBufferHole())return;
    const position=Number(video.currentTime)||0;
    if(stallHasBufferedData()){
      // Media is buffered ahead of the playhead, so rebuilding the buffer would only
      // discard good data. Let the decoder work through it; only a real freeze escalates.
      if(reason!=='watchdog')return;
      if(Number.isFinite(lastStallPosition)&&Math.abs(position-lastStallPosition)<=.2)repeatedStalls+=1;else repeatedStalls=1;
      lastStallPosition=position;
      if(repeatedStalls>=3){repeatedStalls=0;if(finalizedPlayback)await retryPlayback();else recoverMediaStream();return;}
      nudgePlayback();return;
    }
    repeatedStalls=0;lastStallPosition=NaN;
    invalidatePlayback();const revision=playbackRevision;
    rebuffering=true;video.pause();dubbedTrack?.pause?.();stopDubPlayers();await audioContext?.suspend();
    if(revision!==playbackRevision||!wantedPlaying)return;
    showRecovery();$('#playButton').textContent='❚❚';await maybeResume();
  })().finally(()=>{stallRecoveryPromise=null;});
  return stallRecoveryPromise;
}
async function togglePlayback(){
  if(appendBlocked){
    await retryPlayback();return;
  }
  if(wantedPlaying&&(started||rebuffering||replayPending)){
    wantedPlaying=false;restoreWantedPlaying=false;rebuffering=false;invalidatePlayback();video.pause();dubbedTrack?.pause?.();stopDubPlayers();await audioContext?.suspend();captionsDirty=true;updateCaptions();$('#rebufferNotice').hidden=true;$('#playButton').textContent='▶';$('#liveBadge').classList.remove('playing');$('#liveBadge span').textContent=t('paused');return;
  }
  if(!started&&bufferAhead()<startupLead()-.35&&!streamEnded)return;
  wantedPlaying=true;
  if(replayPending||restorePosition!==null){restoreWantedPlaying=true;rebuffering=true;return;}
  if(bufferAhead()<1&&!streamEnded){rebuffering=true;showRecovery();await maybeResume();return;}
  await playConsumer();
}
function requestReplay(target){
  lastReplayPosition=target;replayTarget=Math.max(0,Number(target)||0);replayGeneration+=1;
  invalidatePlayback();restorePosition=target;restoreWantedPlaying=wantedPlaying;rebuffering=wantedPlaying;video.pause();dubbedTrack?.pause?.();stopDubPlayers();showRecovery();
  replayPending=true;clearTimeout(replayTimer);
  replayTimer=setTimeout(()=>failReplay('replayTimeout'),10000);
  channel.postMessage({type:'ready',position:target,replay:true,replayId:replayGeneration});
}
async function retryPlayback(){
  const permissionIssue=stageIssue?.key==='playPermission';
  clearStageError();replayAttempts=0;appendBlocked=false;wantedPlaying=true;
  if(permissionIssue){await playConsumer();}
  else if(finalizedPlayback&&finalizedArtifacts){restorePosition=video.currentTime;restoreWantedPlaying=true;await restoreFinalizedSession(finalizedArtifacts);}
  else requestReplay(video.currentTime);
}
async function seekTo(value){
  const target=clamp(Number(value)||0,0,timelineEnd());
  if(!finalizedPlayback&&(!isBuffered(target)||appendBlocked||video.error)){requestReplay(target);return;}
  invalidatePlayback();stopDubPlayers();video.currentTime=target;setFinalDubTime();captionsDirty=true;updateCaptions();updateProgress();if(wantedPlaying){if(bufferAhead()<1&&!streamEnded){rebuffering=true;showRecovery();}else await playConsumer();}
}

function formatOffset(value){const seconds=Number(value)||0;return `${seconds>0?'+':''}${seconds.toFixed(1)}s`;}
function renderOffsets(){for(const [id,field] of Object.entries(OFFSET_FIELDS)){const value=Number(settings[field])||0;$(`#${id}`).value=value;$(`#${id}Value`).textContent=formatOffset(value);}}
function applyOffset(field,value){
  settings={...settings,[field]:clampOffset(value)};
  if(field==='syncDubOffset'){stopDubPlayers();dubbedTrack?.pause?.();scheduleWindow();if(wantedPlaying&&!video.paused)void syncFinalDub('play').catch(handleActionError);}
  captionsDirty=true;renderOffsets();updateCaptions();
}
function renderSettings(){translate();renderOffsets();for(const id of ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled','autoDuck'])$(`#${id}`).checked=Boolean(mix[id]);$('#originalVolume').value=mix.originalVolume;$('#dubVolume').value=mix.dubVolume;$('#originalVolumeValue').textContent=`${Math.round(mix.originalVolume*100)}%`;$('#dubVolumeValue').textContent=`${Math.round(mix.dubVolume*100)}%`;$('#originalValue').textContent=`${Math.round(mix.originalVolume*100)}%`;$('#dubValue').textContent=`${Math.round(mix.dubVolume*100)}%`;$('#engineValue').textContent=t(settings.syncCaptionEngine==='whisper'?'whisper':'gemini');applyMix();updateCaptions();updateProgress();}
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
  if(!finalizedArtifacts||!finalizedMetadata)return;const granted=await chrome.permissions.request({permissions:['downloads']});if(!granted){showWarning('downloadDenied','export');return;}
  clearWarning('export');showWarning('exportKeepOpen','export');
  const button=$('#downloadVideoButton');button.disabled=true;
  try{
    const root=await navigator.storage.getDirectory();const exportMix={...mix};const [videoFile,dubbedFile]=await Promise.all([(await root.getFileHandle(finalizedArtifacts.videoFileName)).getFile(),(await root.getFileHandle(finalizedArtifacts.dubbedFileName)).getFile()]);
    const exportStartedAt=Date.now();const rendered=await buildMixedRecording({videoBlob:videoFile,dubbedBlob:dubbedFile,mix:exportMix,duckIntervals:finalizedMetadata.dubs?.length?finalizedMetadata.dubs.map((cue)=>({start:cue.start,end:cue.start+cue.duration})):(finalizedMetadata.translated||[]),dubOffsetSeconds:dubShift(),durationSeconds:Number(finalizedMetadata.duration)||Number(finalizedArtifacts.duration)||0,onProgress:(progress)=>{const elapsed=(Date.now()-exportStartedAt)/1000;const remaining=progress>.01?elapsed*(1-progress)/progress:0;const eta=remaining>1?` · ~${formatTime(remaining)}`:'';$('#downloadState').textContent=`${t('exporting')} · ${Math.round(progress*100)}%${eta}`;}});
    const subtitleFile=async(name)=>new Blob(['\ufeff',shiftSrt(await (await (await root.getFileHandle(name)).getFile()).text(),subtitleShift())],{type:'application/x-subrip'});
    const stamp=new Date().toISOString().replaceAll(':','-').replace(/\.\d{3}Z$/,'Z');const folder=`Avorythm/${stamp}`;const audioName=exportMix.dubAudioEnabled&&!exportMix.originalAudioEnabled?'dubbed-video':exportMix.dubAudioEnabled&&exportMix.originalAudioEnabled?'mixed-video':exportMix.originalAudioEnabled?'original-video':'silent-video';
    const downloads=[[rendered,`${folder}/${audioName}.webm`]];
    if(exportMix.sourceSubtitlesEnabled)downloads.push([subtitleFile(finalizedArtifacts.sourceSubtitleFileName),`${folder}/source.srt`]);
    if(exportMix.translatedSubtitlesEnabled)downloads.push([subtitleFile(finalizedArtifacts.translatedSubtitleFileName),`${folder}/translated.srt`]);
    for(const [file,filename] of downloads){const url=URL.createObjectURL(await file);const response=await chrome.runtime.sendMessage({target:'background',type:'download',url,filename});if(!response?.ok)throw new Error(response?.error||'download_failed');setTimeout(()=>URL.revokeObjectURL(url),30000);}
    $('#downloadState').textContent=t('exportComplete');
  }catch(error){showWarning(exportErrorKey(error),'export');$('#downloadState').textContent=t('downloadReady');}
  finally{button.disabled=false;}
}

async function restoreFinalizedSession(artifacts) {
  const revision=mediaRevision;
  const root=await navigator.storage.getDirectory();
  const [videoFile,dubbedFile,metadataFile]=await Promise.all([
    (await root.getFileHandle(artifacts.videoFileName)).getFile(),
    (await root.getFileHandle(artifacts.dubbedFileName)).getFile(),
    (await root.getFileHandle(artifacts.metadataFileName)).getFile()
  ]);
  const metadata=JSON.parse(await metadataFile.text());if(revision!==mediaRevision)return;finalizedArtifacts=artifacts;finalizedMetadata=metadata;captions={source:metadata.source||[],translated:metadata.translated||[]};captionsDirty=true;
  clearTimeout(replayTimer);replayTimer=null;replayPending=false;appendBlocked=false;replayAttempts=0;replayTarget=null;replayGeneration=0;
  recordedDuration=Math.max(recordedDuration,Number(metadata.duration)||Number(artifacts.duration)||0);finalizedPlayback=true;streamEnded=true;processingFrontier=Infinity;recordedFileName=artifacts.videoFileName;
  invalidatePlayback();stopDubPlayers();video.pause();dubbedTrack?.pause?.();mediaRevision+=1;chunks=[];appending=false;sourceBuffer=null;mediaSource=null;if(mediaObjectUrl)URL.revokeObjectURL(mediaObjectUrl);if(dubbedObjectUrl)URL.revokeObjectURL(dubbedObjectUrl);mediaObjectUrl=URL.createObjectURL(videoFile);dubbedObjectUrl=URL.createObjectURL(dubbedFile);video.src=mediaObjectUrl;dubbedTrack.src=dubbedObjectUrl;applyMix();
  $('#bufferOverlay').hidden=true;$('#rebufferNotice').hidden=true;$('#stopButton').hidden=true;$('#closeButton').hidden=false;$('#downloadVideoButton').disabled=false;$('#downloadState').textContent=t('downloadReady');
  const loadedRevision=mediaRevision;
  await new Promise((resolve,reject)=>{
    if(video.readyState>=1){resolve();return;}
    const timer=setTimeout(()=>{cleanup();reject(new Error('media_metadata_timeout'));},10000);
    const cleanup=()=>{clearTimeout(timer);video.removeEventListener?.('loadedmetadata',ready);video.removeEventListener?.('error',failed);};
    const ready=()=>{cleanup();resolve();};const failed=()=>{cleanup();reject(new Error('media_load_failed'));};
    video.addEventListener('loadedmetadata',ready,{once:true});video.addEventListener('error',failed,{once:true});
  });
  if(loadedRevision!==mediaRevision)return;
  const target=clamp(Number(restorePosition)||0,0,timelineEnd());restorePosition=null;video.currentTime=target;setFinalDubTime();captionsDirty=true;updateCaptions();updateProgress();
  if(restoreWantedPlaying){wantedPlaying=true;rebuffering=false;await playConsumer();}
}

channel.onmessage=({data})=>{
  if(data?.type==='bridge-ready'){channel.postMessage({type:'ready'});return;}
  if(data?.type==='session-reset'){const responseId=Number(data.replayId);if(Number.isFinite(responseId)&&responseId!==replayGeneration)return;replayPending=false;const position=Number(data.position);const requested=Number.isFinite(position)?Math.max(0,position):Math.max(0,Number(restorePosition)||video.currentTime);const target=Number.isFinite(responseId)||replayTarget===null?requested:replayTarget;restorePosition=target;recordedDuration=Math.max(recordedDuration,Number(data.duration)||0);resetMediaStream();captions={source:[],translated:[]};dubTimeline=[];dubSequence=0;captionsDirty=true;return;}
  if(data?.type==='media-init'){bufferTarget=Number(data.bufferSeconds)||20;initializeMedia(data.mimeType);return;}
  if(data?.type==='media-chunk'){chunks.push(data.data);drain();return;}
  if(data?.type==='media-progress'){recordedDuration=Math.max(recordedDuration,Number(data.duration)||0);updateProgress();return;}
  if(data?.type==='processing-frontier'){processingFrontier=Math.max(processingFrontier,Number(data.seconds)||0);updateProgress();return;}
  if(data?.type==='media-final'){recordedFileName=data.fileName||'';recordedDuration=Math.max(recordedDuration,Number(data.duration)||0);streamEnded=true;processingFrontier=Infinity;$('#downloadVideoButton').disabled=true;$('#downloadState').textContent=t('downloadReady');$('#stopButton').hidden=true;$('#closeButton').hidden=false;finishMediaSource();updateProgress();if(data.artifacts){restorePosition=video.currentTime;restoreWantedPlaying=wantedPlaying;void restoreFinalizedSession(data.artifacts).catch(()=>failReplay('appendFailed'));}return;}
  if(data?.type==='dub-chunk'){const id=data.id||`dub-${++dubSequence}`;if(dubTimeline.some((chunk)=>chunk.id===id))return;const chunk={...data,id,duration:Number(data.duration)||pcmSamples(data.data).length/24000};dubTimeline.push(chunk);updateProgress();if(started&&wantedPlaying)$('#liveBadge span').textContent=t('playing');scheduleDub(chunk);return;}
  if(data?.type==='dub-interrupted'){stopDubPlayers();return;}
  if(data?.type==='caption'){upsertCaption(Boolean(data.translated),data);if(!video.paused){captionsDirty=true;updateCaptions();}return;}
  if(data?.type==='warning'){if(!mix.originalAudioEnabled){mix={...mix,originalAudioEnabled:true};$('#originalAudioEnabled').checked=true;applyMix();}showWarning(preciseWarningKey(data.error),'provider');}
};

$('#dismissStageError').addEventListener('click',dismissStageError);
$('#dismissPlayerWarning').addEventListener('click',dismissWarning);
$('#retryPlayback').addEventListener('click',()=>runAction(retryPlayback));
$('#activateButton').addEventListener('click',()=>runAction(togglePlayback));$('#playButton').addEventListener('click',()=>runAction(togglePlayback));
$('#seekRange').addEventListener('input',()=>{scrubbing=true;$('#timeLabel').textContent=`${formatTime($('#seekRange').value)} / ${formatTime(timelineEnd())}`;});
$('#seekRange').addEventListener('change',()=>runAction(async()=>{scrubbing=false;await seekTo($('#seekRange').value);}));
$('#goLiveButton').addEventListener('click',()=>runAction(()=>seekTo(Math.max(0,timelineEnd()-Math.min(2,bufferTarget*.1)))));
$('#fullscreenButton').addEventListener('click',()=>runAction(async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await $('.stage-card').requestFullscreen();}));
$('#downloadVideoButton').addEventListener('click',()=>runAction(downloadRecording));
for(const [id,field] of Object.entries(OFFSET_FIELDS)){
  $(`#${id}`).addEventListener('input',()=>applyOffset(field,Number($(`#${id}`).value)));
  $(`#${id}`).addEventListener('change',()=>runAction(persist));
}
document.querySelectorAll('[data-offset-field]').forEach((button)=>button.addEventListener('click',()=>runAction(async()=>{
  const field=button.dataset.offsetField;
  applyOffset(field,button.dataset.offsetReset!==undefined?0:(Number(settings[field])||0)+Number(button.dataset.nudge));
  await persist();
})));
$('#localeToggle').addEventListener('change',()=>runAction(async()=>{settings.locale=$('#localeToggle').value;await persist();}));$('#settingsButton').addEventListener('click',()=>chrome.runtime.openOptionsPage());
$('#stopButton').addEventListener('click',()=>runAction(async()=>{
  const button=$('#stopButton');button.disabled=true;button.textContent=t('buffering');$('#downloadState').textContent=t('buffering');
  try{const response=await chrome.runtime.sendMessage({type:'stop',keepPlayer:true});if(!response?.ok)throw new Error(response?.error||'stop_failed');clearWarning('recording');}
  catch{button.disabled=false;button.textContent=t('stop');$('#downloadState').textContent=t('recording');showWarning('recordingStopFailed','recording');}
}));$('#closeButton').addEventListener('click',()=>window.close());
for(const id of ['originalAudioEnabled','dubAudioEnabled','sourceSubtitlesEnabled','translatedSubtitlesEnabled','autoDuck'])$(`#${id}`).addEventListener('change',()=>runAction(async()=>{settings=updateOutputMix(settings,'synchronized',{[id]:$(`#${id}`).checked});mix=outputMix(settings,'synchronized');captionsDirty=true;await persist();}));
for(const id of ['originalVolume','dubVolume'])$(`#${id}`).addEventListener('input',()=>runAction(async()=>{settings=updateOutputMix(settings,'synchronized',{[id]:Number($(`#${id}`).value)});mix=outputMix(settings,'synchronized');await persist();}));
function observePlayback(){
  const now=performance.now();const position=Number(video.currentTime)||0;
  if(!video.paused&&!video.seeking&&position>lastProgressPosition+.05){
    lastProgressPosition=position;lastProgressAt=now;repeatedStalls=0;
    // Only decoded playback progress proves recovery; an accepted append does not.
    if(stageIssue&&position>stageIssue.position+.1)clearStageError();
    if(!rebuffering&&!replayPending){$('#rebufferNotice').hidden=true;$('#liveBadge span').textContent=t(playbackStatus());$('#liveBadge').classList.add('playing');}
    if(position>lastReplayPosition+1)replayAttempts=0;
  }
  if(!wantedPlaying||!started||video.seeking||replayPending||restorePosition!==null){lastProgressAt=now;lastProgressPosition=position;return;}
  if(!streamEnded&&Number.isFinite(processingFrontier)&&bufferAhead()<.15&&!rebuffering){void runAction(()=>enterRebuffer('buffer'));return;}
  if(!video.paused&&!rebuffering&&now-lastProgressAt>4000){lastProgressAt=now;void runAction(()=>enterRebuffer('watchdog'));}
}
video.addEventListener('timeupdate',()=>{
  observePlayback();captionsDirty=true;updateProgress();updateCaptions();scheduleWindow();
  if(dubbedTrack?.src&&!dubbedTrack.paused&&Math.abs(dubbedTrack.currentTime-finalDubPosition())>.25)setFinalDubTime();
  else if(dubbedTrack?.src&&dubbedTrack.paused&&wantedPlaying&&!video.paused)void syncFinalDub('play').catch(handleActionError);
});
for(const event of ['waiting','stalled'])video.addEventListener(event,()=>runAction(()=>enterRebuffer('event')));
video.addEventListener('playing',()=>{
  if(!wantedPlaying){video.pause();return;}
  lastProgressAt=performance.now();lastProgressPosition=video.currentTime;clearStageError();$('#liveBadge span').textContent=t(playbackStatus());$('#rebufferNotice').hidden=true;
  scheduleWindow();if(dubbedTrack?.src&&mix.dubAudioEnabled)void syncFinalDub('play').catch(handleActionError);
});
video.addEventListener('error',()=>{
  if(finalizedPlayback){failReplay('appendFailed');return;}
  if(!mediaSource||replayPending)return;
  stopDubPlayers();dubbedTrack?.pause?.();recoverMediaStream();
});
video.addEventListener('seeking',()=>{stopDubPlayers();dubbedTrack?.pause?.();lastProgressAt=performance.now();lastProgressPosition=video.currentTime;});
video.addEventListener('seeked',()=>{lastProgressAt=performance.now();lastProgressPosition=video.currentTime;captionsDirty=true;updateCaptions();if(wantedPlaying&&!video.paused){scheduleWindow();void syncFinalDub('play').catch(handleActionError);}});
video.addEventListener('pause',()=>{stopDubPlayers();dubbedTrack?.pause?.();});
dubbedTrack?.addEventListener('error',()=>showWarning('exportAudioFailed','audio'));
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
  setInterval(()=>{observePlayback();drain();updateProgress();if(!video.paused){captionsDirty=true;updateCaptions();}scheduleWindow();},250);
  setInterval(persistPlayerSession,1000);
})().catch(()=>setError('unsupported'));
