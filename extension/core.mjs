export const LIVE_MODEL = 'gemini-3.5-live-translate-preview';
export const LIVE_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export const LANGUAGES = [
  'af','ak','sq','am','ar','hy','az','eu','be','bn','bg','my','ca','zh-Hans','zh-Hant','hr','cs','da','nl','en','et','fil','fi','fr','gl','ka','de','el','gu','ha','he','hi','hu','is','id','it','ja','jv','kn','kk','km','rw','ko','lo','lv','lt','mk','ms','ml','mr','mn','ne','no','nb','fa','pl','pt-BR','pt-PT','pa','ro','ru','sr','sd','si','sk','sl','es','su','sw','sv','ta','te','th','tr','uk','ur','uz','vi','zu'
];

export const DEFAULT_SETTINGS = Object.freeze({
  locale: 'fa',
  targetLanguage: 'fa',
  audioMode: 'dub',
  originalVolume: 0,
  dubVolume: 1,
  autoDuck: true,
  recording: false,
  subtitlePosition: 'bottom-center',
  subtitleFontSize: 24,
  subtitleWidth: 680,
  subtitleOpacity: 88,
  subtitleShowSource: false
});

export function audioChannelVolume(mode, channel, settings) {
  if (mode === 'dub') return channel === 'dub' ? 1 : 0;
  if (mode === 'original' || mode === 'subtitles') return channel === 'original' ? 1 : 0;
  return Number(channel === 'original' ? settings.originalVolume : settings.dubVolume);
}

export function liveUrl(apiKey) {
  return `${LIVE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
}

export function setupMessage(targetLanguage) {
  return {
    setup: {
      model: `models/${LIVE_MODEL}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        translationConfig: {
          targetLanguageCode: targetLanguage,
          echoTargetLanguage: false
        }
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {}
    }
  };
}

export function bytesToBase64(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function audioMessage(pcm) {
  return {
    realtimeInput: {
      audio: {
        data: bytesToBase64(pcm),
        mimeType: 'audio/pcm;rate=16000'
      }
    }
  };
}

export function mergeTranscript(tracker, text, finished, now) {
  const clean = text.trim();
  if (!clean) return null;
  if (!tracker.partial) tracker.started = now;
  if (clean.startsWith(tracker.partial)) tracker.partial = clean;
  else if (!tracker.partial.endsWith(clean)) tracker.partial = `${tracker.partial} ${clean}`.trim();
  if (!finished) return null;
  const completed = {text: tracker.partial, start: tracker.started, end: now};
  tracker.partial = '';
  tracker.started = 0;
  return completed;
}

export function wavHeader(dataBytes, sampleRate) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const text = (offset, value) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + dataBytes, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, dataBytes, true);
  return new Uint8Array(header);
}

export function srt(entries) {
  const stamp = (seconds) => {
    let milliseconds = Math.max(0, Math.round(seconds * 1000));
    const hours = Math.floor(milliseconds / 3600000); milliseconds %= 3600000;
    const minutes = Math.floor(milliseconds / 60000); milliseconds %= 60000;
    const secs = Math.floor(milliseconds / 1000); milliseconds %= 1000;
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')},${String(milliseconds).padStart(3,'0')}`;
  };
  return entries.map((entry, index) => `${index + 1}\n${stamp(entry.start)} --> ${stamp(Math.max(entry.end, entry.start + 0.6))}\n${entry.text}\n`).join('\n');
}
