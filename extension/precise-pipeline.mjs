import {
  base64ToBytes,
  captionSegments,
  fileVoiceSetupMessage,
  fitPcm,
  latestCaption,
  liveUrl,
  wavHeader
} from './core.mjs';

const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;
const WINDOW_BYTES = 12 * INPUT_RATE * 2;
const OVERLAP_BYTES = 1.5 * INPUT_RATE * 2;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const TRANSLATION_MODELS = [
  ['gemini-3.6-flash', 5, 20, true],
  ['gemini-3.5-flash', 5, 20, true],
  ['gemini-3-flash-preview', 5, 20, true],
  ['gemini-2.5-flash', 5, 20, true],
  ['gemini-3.5-flash-lite', 15, 500, true],
  ['gemini-3.1-flash-lite', 15, 500, true],
  ['gemini-2.5-flash-lite', 10, 20, true],
  ['gemma-4-31b-it', 30, 14400, false],
  ['gemma-4-26b-a4b-it', 30, 14400, false]
];

function parseTranslationResponse(result, count) {
  const raw = (result.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('')
    .trim();
  const clean = raw.replace(/^```(?:json)?\s*|\s*```$/giu, '');
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start < 0 || end < start) throw new Error('gemini_translation_invalid');
  const items = JSON.parse(clean.slice(start, end + 1));
  const byId = new Map(items.map((item) => [Number(item.id), String(item.text || '').trim()]));
  if (byId.size !== count || [...Array(count).keys()].some((id) => !byId.get(id))) {
    throw new Error('gemini_translation_incomplete');
  }
  return [...Array(count).keys()].map((id) => byId.get(id));
}

function trimNarration(input) {
  const samples = input instanceof Int16Array
    ? input
    : new Int16Array(input.buffer, input.byteOffset || 0, Math.floor(input.byteLength / 2));
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < 64) first += 1;
  let last = samples.length - 1;
  while (last >= first && Math.abs(samples[last]) < 64) last -= 1;
  if (last < first) return new Int16Array();
  const lead = Math.round(0.02 * OUTPUT_RATE);
  const tail = Math.round(0.12 * OUTPUT_RATE);
  return samples.slice(Math.max(0, first - lead), Math.min(samples.length, last + tail + 1));
}

function sentenceReady(text) {
  return /[.!?\u061f\u3002\uff01\uff1f\u2026]["'\u00bb\u201d\s]*$/u.test(text);
}

export class PreciseDubbingPipeline {
  constructor({
    geminiKey,
    groqKey,
    targetLanguage,
    voiceName,
    onCaption,
    onDub,
    onFrontier,
    onSourceText,
    onWarning,
    fetchImpl = fetch,
    WebSocketImpl = WebSocket
  }) {
    this.geminiKey = geminiKey;
    this.groqKey = groqKey;
    this.targetLanguage = targetLanguage;
    this.voiceName = voiceName;
    this.onCaption = onCaption;
    this.onDub = onDub;
    this.onFrontier = onFrontier;
    this.onSourceText = onSourceText;
    this.onWarning = onWarning;
    this.fetch = fetchImpl;
    this.WebSocket = WebSocketImpl;
    this.chunks = [];
    this.bytes = 0;
    this.offset = 0;
    this.committedUntil = 0;
    this.pendingSegment = null;
    this.failed = false;
    this.busy = Promise.resolve();
    this.usage = new Map();
    this.unavailableModels = new Set();
  }

  push(pcm) {
    this.#queue(pcm, false);
  }

  async flush() {
    this.#queue(null, true);
    await this.busy;
  }

  #queue(pcm, flush) {
    if (this.failed) return;
    if (pcm?.byteLength) {
      const bytes = pcm instanceof Uint8Array ? pcm.slice() : new Uint8Array(pcm).slice();
      this.chunks.push(bytes);
      this.bytes += bytes.byteLength;
    }
    if (this.bytes < WINDOW_BYTES && !(flush && this.bytes >= INPUT_RATE * 2)) return;
    const merged = new Uint8Array(this.bytes);
    let cursor = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, cursor);
      cursor += chunk.byteLength;
    }
    const window = flush ? merged : merged.subarray(0, WINDOW_BYTES);
    const consumed = flush ? merged.byteLength : WINDOW_BYTES - OVERLAP_BYTES;
    const remainder = flush ? new Uint8Array() : merged.slice(consumed);
    const offset = this.offset;
    this.offset += consumed / (INPUT_RATE * 2);
    this.chunks = remainder.byteLength ? [remainder] : [];
    this.bytes = remainder.byteLength;
    this.busy = this.busy
      .then(() => this.#transcribe(window, offset, flush))
      .catch(async (error) => {
        this.failed = true;
        this.onWarning(error);
        this.onFrontier(Number.MAX_SAFE_INTEGER);
      });
  }

  #claimModel(model, rpm, rpd) {
    if (this.unavailableModels.has(model)) return false;
    const now = Date.now();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    const usage = this.usage.get(model) || {today, daily: 0, minute: []};
    if (usage.today !== today) {
      usage.today = today;
      usage.daily = 0;
    }
    usage.minute = usage.minute.filter((stamp) => now - stamp < 60000);
    if (usage.minute.length >= rpm || usage.daily >= rpd) return false;
    usage.minute.push(now);
    usage.daily += 1;
    this.usage.set(model, usage);
    return true;
  }

  async #translate(segments) {
    const instruction = 'Translate every segment faithfully, idiomatically, and naturally for native viewers. Use the full batch as context, keep a one-to-one output mapping, and preserve names, numbers, technical terms, tone, intent, and sentence boundaries. Do not summarize, explain, merge, or add information. Return only a JSON array with the keys id and text.';
    const prompt = JSON.stringify({
      source_language: 'auto',
      target_language: this.targetLanguage,
      segments: segments.map((item, id) => ({id, text: item.text})),
      output_format: [{id: 0, text: 'translated text'}]
    });
    let lastError = new Error('translation_pool_exhausted');
    for (const [model, rpm, rpd, structured] of TRANSLATION_MODELS) {
      if (!this.#claimModel(model, rpm, rpd)) continue;
      try {
        const response = await this.fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(this.geminiKey)}`,
          {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              systemInstruction: {parts: [{text: instruction}]},
              contents: [{role: 'user', parts: [{text: prompt}]}],
              generationConfig: {
                ...(structured ? {responseMimeType: 'application/json'} : {}),
                temperature: 0.15
              }
            })
          }
        );
        if (!response.ok) {
          const error = new Error(`gemini_translation_${response.status}`);
          error.status = response.status;
          throw error;
        }
        return parseTranslationResponse(await response.json(), segments.length);
      } catch (error) {
        lastError = error;
        if (error.status === 404) this.unavailableModels.add(model);
        if ([401, 403].includes(error.status)) throw error;
      }
    }
    throw lastError;
  }

  async #narrate(text) {
    return new Promise((resolve, reject) => {
      const socket = new this.WebSocket(liveUrl(this.geminiKey));
      const chunks = [];
      let ready = false;
      let settled = false;
      let messages = Promise.resolve();
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { socket.close(); } catch {}
        if (error) {
          reject(error);
          return;
        }
        const size = chunks.reduce((total, item) => total + item.byteLength, 0);
        const audio = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          audio.set(chunk, offset);
          offset += chunk.byteLength;
        }
        resolve(trimNarration(audio));
      };
      const timeout = setTimeout(() => finish(new Error('gemini_voice_timeout')), 30000);
      socket.onopen = () => socket.send(JSON.stringify(
        fileVoiceSetupMessage(this.targetLanguage, this.voiceName)
      ));
      socket.onmessage = (event) => {
        messages = messages.then(async () => {
          const payload = event.data instanceof Blob ? await event.data.text() : event.data;
          const message = JSON.parse(payload);
          if (message.error) throw new Error(message.error.message || 'gemini_voice_error');
          if (message.setupComplete && !ready) {
            ready = true;
            socket.send(JSON.stringify({
              clientContent: {
                turns: [{role: 'user', parts: [{text}]}],
                turnComplete: true
              }
            }));
            return;
          }
          const content = message.serverContent;
          for (const part of content?.modelTurn?.parts || []) {
            const inline = part.inlineData || part.inline_data;
            if (inline?.data) chunks.push(base64ToBytes(inline.data));
          }
          if (content?.turnComplete) finish();
        }).catch(finish);
      };
      socket.onerror = () => finish(new Error('gemini_voice_failed'));
      socket.onclose = () => { if (!ready) finish(new Error('gemini_voice_closed')); };
    });
  }

  #publishCaption(translated, segment, text) {
    const pieces = captionSegments(text);
    const slice = Math.max(0.01, segment.end - segment.start) / Math.max(1, pieces.length);
    pieces.forEach((piece, index) => this.onCaption(translated, {
      id: `${translated ? 'translated' : 'whisper'}-${segment.start.toFixed(2)}-${index}`,
      text: piece,
      start: segment.start + slice * index,
      end: index === pieces.length - 1 ? segment.end : segment.start + slice * (index + 1)
    }));
  }

  #groupSegments(segments, flush) {
    const ready = [];
    const commit = () => {
      if (!this.pendingSegment) return;
      ready.push(this.pendingSegment);
      this.pendingSegment = null;
    };
    for (const segment of segments) {
      if (this.pendingSegment && (
        segment.start - this.pendingSegment.end > 1 ||
        segment.end - this.pendingSegment.start > 12
      )) commit();
      if (!this.pendingSegment) this.pendingSegment = {...segment};
      else {
        this.pendingSegment.text = `${this.pendingSegment.text} ${segment.text}`.trim();
        this.pendingSegment.end = segment.end;
      }
      if (sentenceReady(this.pendingSegment.text) ||
          this.pendingSegment.end - this.pendingSegment.start >= 10) commit();
    }
    if (flush) commit();
    return ready;
  }

  async #process(segments, frontier) {
    if (!segments.length) {
      this.onFrontier(frontier);
      return;
    }
    const translations = await this.#translate(segments);
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const translated = translations[index];
      this.#publishCaption(false, segment, segment.text);
      this.#publishCaption(true, segment, translated);
      let narration = null;
      let narrationError = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          narration = await this.#narrate(translated);
          if (!narration.length) throw new Error('gemini_voice_empty');
          break;
        } catch (error) {
          narrationError = error;
          if (attempt < 2) await wait(400 * (attempt + 1));
        }
      }
      if (!narration) throw narrationError;
      const targetSamples = Math.max(1, Math.round((segment.end - segment.start) * OUTPUT_RATE));
      const fitted = fitPcm(narration, targetSamples);
      const pcm = new Uint8Array(fitted.buffer);
      this.onDub({data: pcm.slice().buffer, start: segment.start, duration: fitted.length / OUTPUT_RATE});
    }
    this.onFrontier(frontier);
  }

  async #transcribe(pcm, offset, flush) {
    const form = new FormData();
    form.append('file', new Blob([wavHeader(pcm.byteLength, INPUT_RATE), pcm], {type: 'audio/wav'}), 'capture.wav');
    form.append('model', 'whisper-large-v3');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    form.append('temperature', '0');
    let response = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await this.fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {Authorization: `Bearer ${this.groqKey}`},
        body: form
      });
      if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) break;
      await wait(500 * (attempt + 1));
    }
    if (!response?.ok) throw new Error(response?.status === 429 ? 'groq_quota_exceeded' : 'groq_transcription_failed');
    const result = await response.json();
    const fresh = [];
    for (const segment of result.segments || []) {
      const start = offset + Number(segment.start || 0);
      const end = offset + Number(segment.end || segment.start || 0.6);
      const text = String(segment.text || '').trim();
      if (end <= this.committedUntil + 0.05 || !text) continue;
      fresh.push({text, start, end});
      this.committedUntil = Math.max(this.committedUntil, end);
      await this.onSourceText(latestCaption(text));
    }
    const grouped = this.#groupSegments(fresh, flush);
    const frontier = this.pendingSegment?.start ?? offset + pcm.byteLength / (INPUT_RATE * 2);
    await this.#process(grouped, frontier);
  }
}
