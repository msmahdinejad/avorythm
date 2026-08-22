import {
  base64ToBytes,
  captionSegments,
  fileVoiceSetupMessage,
  latestCaption,
  liveUrl,
  wavHeader
} from './core.mjs';

const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;
const WINDOW_BYTES = 12 * INPUT_RATE * 2;
const OVERLAP_BYTES = 1.5 * INPUT_RATE * 2;
const NARRATION_IDLE_MS = 600;
const NARRATION_MAX_MS = 12000;
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
    this.dubCursor = 0;
    this.failed = false;
    this.failure = null;
    this.busy = Promise.resolve();
    this.usage = new Map();
    this.unavailableModels = new Set();
    this.narratorSession = null;
    this.narratorTurn = null;
  }

  push(pcm) {
    this.#queue(pcm, false);
  }

  async flush() {
    this.#queue(null, true);
    try {
      await this.busy;
      if (this.failure) throw this.failure;
    } finally {
      this.#closeNarrator();
    }
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
      .catch((error) => {
        // Never let a later window move the contiguous processing frontier
        // past media whose transcript/translation/dub could not be completed.
        this.failed = true;
        this.failure = error;
        this.onWarning(error);
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

  #isFatalPipelineError(error) {
    return [401, 403, 429].includes(Number(error?.status)) ||
      /(?:auth|quota|permission|api[_ -]?key)/iu.test(String(error?.message || ''));
  }

  #narratorError(code, status = 0) {
    const error = new Error(code);
    if (status) error.status = status;
    return error;
  }

  #protocolError(value) {
    const status = Number(value?.code || value?.status || 0);
    const detail = String(value?.message || value?.status || '').toLowerCase();
    if ([401, 403].includes(status) || /(?:api key|unauth|permission|forbidden)/u.test(detail)) {
      return this.#narratorError('gemini_voice_auth_failed', status || 401);
    }
    if (status === 429 || /(?:quota|rate limit|resource exhausted)/u.test(detail)) {
      return this.#narratorError('gemini_voice_quota_exceeded', 429);
    }
    return this.#narratorError('gemini_voice_failed', status);
  }

  #closeNarrator(session = this.narratorSession) {
    if (!session || session.closed) return;
    session.closed = true;
    session.intentional = true;
    clearTimeout(session.setupTimer);
    if (this.narratorSession === session) this.narratorSession = null;
    try { session.socket.close(); } catch {}
  }

  #finishNarratorTurn(turn, error = null, recycle = false) {
    if (!turn || turn.settled || this.narratorTurn !== turn) return;
    turn.settled = true;
    clearTimeout(turn.timeout);
    clearTimeout(turn.idleTimer);
    clearTimeout(turn.maxTimer);
    this.narratorTurn = null;
    if (recycle) this.#closeNarrator(turn.session);
    if (error) {
      turn.reject(error);
      return;
    }
    const size = turn.chunks.reduce((total, item) => total + item.byteLength, 0);
    const audio = new Uint8Array(size);
    let offset = 0;
    for (const chunk of turn.chunks) {
      audio.set(chunk, offset);
      offset += chunk.byteLength;
    }
    turn.resolve(trimNarration(audio));
  }

  #disconnectNarrator(session, error) {
    if (!session || session.closed) return;
    session.closed = true;
    session.intentional = true;
    clearTimeout(session.setupTimer);
    if (this.narratorSession === session) this.narratorSession = null;
    if (!session.ready) session.rejectReady(error);
    if (this.narratorTurn?.session === session) {
      this.#finishNarratorTurn(this.narratorTurn, error);
    }
    try { session.socket.close(); } catch {}
  }

  #scheduleNarratorIdle(turn) {
    clearTimeout(turn.idleTimer);
    turn.idleTimer = setTimeout(
      () => this.#finishNarratorTurn(turn),
      NARRATION_IDLE_MS
    );
    turn.maxTimer ||= setTimeout(
      () => this.#finishNarratorTurn(turn),
      NARRATION_MAX_MS
    );
  }

  #openNarrator() {
    if (this.narratorSession && !this.narratorSession.closed) {
      return this.narratorSession.readyPromise;
    }
    const socket = new this.WebSocket(liveUrl(this.geminiKey));
    const session = {
      socket,
      ready: false,
      closed: false,
      intentional: false,
      messages: Promise.resolve(),
      setupTimer: null,
      resolveReady: null,
      rejectReady: null,
      readyPromise: null
    };
    session.readyPromise = new Promise((resolve, reject) => {
      session.resolveReady = resolve;
      session.rejectReady = reject;
    });
    session.setupTimer = setTimeout(() => this.#disconnectNarrator(
      session,
      this.#narratorError('gemini_voice_timeout')
    ), 30000);
    this.narratorSession = session;
    socket.onopen = () => {
      try {
        socket.send(JSON.stringify(fileVoiceSetupMessage(this.targetLanguage, this.voiceName)));
      } catch {
        this.#disconnectNarrator(session, this.#narratorError('gemini_voice_closed'));
      }
    };
    socket.onmessage = (event) => {
      session.messages = session.messages.then(async () => {
        if (session.closed) return;
        const payload = typeof Blob !== 'undefined' && event.data instanceof Blob
          ? await event.data.text()
          : event.data;
        const message = JSON.parse(payload);
        if (message.error) throw this.#protocolError(message.error);
        if (message.setupComplete && !session.ready) {
          session.ready = true;
          clearTimeout(session.setupTimer);
          session.resolveReady(session);
        }
        if (message.goAway) {
          throw this.#narratorError('gemini_voice_go_away');
        }
        const content = message.serverContent;
        const turn = this.narratorTurn?.session === session ? this.narratorTurn : null;
        for (const part of content?.modelTurn?.parts || []) {
          const inline = part.inlineData || part.inline_data;
          if (turn && inline?.data) {
            turn.chunks.push(base64ToBytes(inline.data));
            turn.hasAudio = true;
            this.#scheduleNarratorIdle(turn);
          }
        }
        if (turn?.hasAudio && content?.turnComplete) {
          this.#finishNarratorTurn(turn);
        } else if (turn?.hasAudio && content?.generationComplete) {
          this.#finishNarratorTurn(turn);
        }
      }).catch((error) => this.#disconnectNarrator(
        session,
        error instanceof Error ? error : this.#narratorError('gemini_voice_failed')
      ));
    };
    socket.onerror = () => this.#disconnectNarrator(
      session,
      this.#narratorError('gemini_voice_failed')
    );
    socket.onclose = () => {
      if (!session.intentional) this.#disconnectNarrator(
        session,
        this.#narratorError(session.ready ? 'gemini_voice_closed' : 'gemini_voice_setup_closed')
      );
    };
    return session.readyPromise;
  }

  async #narrateOnce(text) {
    const session = await this.#openNarrator();
    if (session.closed || this.narratorSession !== session) {
      throw this.#narratorError('gemini_voice_closed');
    }
    if (this.narratorTurn) throw this.#narratorError('gemini_voice_busy');
    return new Promise((resolve, reject) => {
      const turn = {
        session,
        chunks: [],
        resolve,
        reject,
        settled: false,
        hasAudio: false,
        idleTimer: null,
        maxTimer: null,
        timeout: null
      };
      turn.timeout = setTimeout(() => this.#finishNarratorTurn(
        turn,
        this.#narratorError('gemini_voice_timeout'),
        true
      ), 30000);
      this.narratorTurn = turn;
      try {
        session.socket.send(JSON.stringify({realtimeInput: {text}}));
      } catch {
        this.#finishNarratorTurn(turn, this.#narratorError('gemini_voice_closed'), true);
      }
    });
  }

  async #narrate(text) {
    let lastError = this.#narratorError('gemini_voice_failed');
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const narration = await this.#narrateOnce(text);
        if (!narration.length) throw this.#narratorError('gemini_voice_empty');
        return narration;
      } catch (error) {
        lastError = error;
        this.#closeNarrator();
        if (this.#isFatalPipelineError(error) || attempt === 1) break;
        await wait(400);
      }
    }
    throw lastError;
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
      const pieces = captionSegments(translated);
      for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex += 1) {
        const piece = pieces[pieceIndex];
        const narration = await this.#narrate(piece);
        const start = Math.max(segment.start, this.dubCursor);
        const duration = narration.length / OUTPUT_RATE;
        const end = start + duration;
        const pcm = new Uint8Array(narration.buffer, narration.byteOffset, narration.byteLength);
        this.onDub({data: pcm.slice().buffer, start, duration});
        this.onCaption(true, {
          id: `translated-${segment.start.toFixed(2)}-${pieceIndex}`,
          text: piece,
          start,
          end
        });
        this.dubCursor = end;
      }
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
    if (!response?.ok) {
      const status = Number(response?.status || 0);
      const code = [401, 403].includes(status)
        ? 'groq_auth_failed'
        : status === 429 ? 'groq_quota_exceeded' : 'groq_transcription_failed';
      const error = new Error(code);
      error.status = status;
      throw error;
    }
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
