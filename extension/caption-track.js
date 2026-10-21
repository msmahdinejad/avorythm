// Live subtitle timeline for the on-page overlay. Classic script (injected
// before content.js) with a CommonJS export so tests can load it directly.
(() => {
  const TERMINAL = /[.!?؟。！？…]["'»”)\]]*$/u;
  const SENTENCE = /[^.!?؟。！？…]+[.!?؟。！？…]+|[^.!?؟。！？…]+$/gu;
  const READING_MS_PER_CHARACTER = 70;
  const MIN_READING_MS = 1200;

  // Mirrors captionSegments() in core.mjs; classic scripts cannot import it.
  function segments(value, maxCharacters = 84) {
    const normalized = String(value || '').replace(/\s+/gu, ' ').trim();
    if (!normalized) return [];
    const result = [];
    for (const sentence of normalized.match(SENTENCE) || [normalized]) {
      let remaining = sentence.trim();
      while (remaining.length > maxCharacters) {
        let split = remaining.lastIndexOf(' ', maxCharacters);
        if (split < Math.floor(maxCharacters * 0.55)) split = maxCharacters;
        result.push(remaining.slice(0, split).trim());
        remaining = remaining.slice(split).trim();
      }
      if (remaining) result.push(remaining);
    }
    return result;
  }

  function commonPrefix(left, right) {
    const limit = Math.min(left.length, right.length);
    let index = 0;
    while (index < limit && left[index] === right[index]) index += 1;
    return index;
  }

  // True when `next` is the same sentence as `previous` still being transcribed
  // (it grew, was corrected a little, or was finalised) rather than a new one.
  function continues(previous, next) {
    if (next.startsWith(previous) || previous.startsWith(next)) return true;
    if (TERMINAL.test(previous)) return false;
    const shared = commonPrefix(previous, next);
    return shared >= 6 && shared >= Math.min(previous.length, next.length) * 0.6;
  }

  const readingMs = (text) => Math.max(MIN_READING_MS, text.length * READING_MS_PER_CHARACTER);

  /**
   * Keeps recent captions on screen long enough to read.
   *  - 'scroll'   : the last `lines` caption lines stay visible and scroll upward.
   *  - 'sentence' : one sentence at a time; the next one waits until the current
   *                 sentence has had its reading time (shorter when a backlog builds).
   * Every line leaves `holdMs` after its last update.
   */
  class CaptionTrack {
    constructor({mode = 'scroll', lines = 3, holdMs = 6000, now = () => Date.now()} = {}) {
      this.now = now;
      this.items = [];
      this.queue = [];
      this.sequence = null;
      this.spoken = false;
      this.configure({mode, lines, holdMs});
    }

    configure({mode, lines, holdMs}) {
      this.mode = mode === 'sentence' ? 'sentence' : 'scroll';
      this.lines = Math.max(1, Math.min(6, Math.round(Number(lines)) || 3));
      this.holdMs = Math.max(1000, Math.min(30000, Number(holdMs) || 6000));
    }

    clear() {
      this.items = [];
      this.queue = [];
      this.sequence = null;
      this.spoken = false;
    }

    push(text, sequence = null) {
      const clean = String(text || '').replace(/\s+/gu, ' ').trim();
      if (!clean) return;
      this.spoken = true;
      const repeated = sequence !== null && this.sequence !== null && sequence === this.sequence;
      if (sequence !== null) this.sequence = sequence;
      const now = this.now();
      const latest = this.queue.at(-1) || this.items.at(-1);
      if (latest) {
        // The same snapshot delivered twice (status updates re-broadcast it).
        if (repeated && latest.text === clean) return;
        const sameSentence = latest.text === clean
          ? !TERMINAL.test(clean)
          : continues(latest.text, clean);
        if (sameSentence) {
          latest.text = clean;
          latest.updated = now;
          return;
        }
      }
      const item = {text: clean, born: now, updated: now, shown: now};
      if (this.mode === 'scroll' || (!this.queue.length && this.items.length === 0)) {
        this.items.push(item);
        this.items = this.items.slice(-12);
      } else if (!this.queue.length && this.canAdvance(now, 0)) {
        this.items = [item];
      } else {
        this.queue.push(item);
        this.queue = this.queue.slice(-8);
      }
    }

    canAdvance(now, backlog) {
      const current = this.items.at(-1);
      if (!current) return true;
      const wait = Math.min(this.holdMs, readingMs(current.text)) / (1 + backlog * 0.5);
      return now - current.shown >= Math.max(700, wait);
    }

    advance() {
      const now = this.now();
      if (this.mode === 'sentence') {
        while (this.queue.length && (this.canAdvance(now, this.queue.length) || this.expired(this.items.at(-1), now))) {
          const next = this.queue.shift();
          next.shown = now;
          this.items = [next];
        }
      } else if (this.queue.length) {
        this.items.push(...this.queue.splice(0));
        this.items = this.items.slice(-12);
      }
      this.items = this.items.filter((item) => !this.expired(item, now));
    }

    expired(item, now) {
      return !item || now - item.updated > this.holdMs;
    }

    /** Lines to display, oldest first. `current` marks the newest line. */
    visible(maxCharacters = 84) {
      this.advance();
      const lines = [];
      const shown = this.mode === 'sentence' ? this.items.slice(-1) : this.items;
      for (const item of shown) {
        for (const text of segments(item.text, maxCharacters)) lines.push({text, current: false});
      }
      const result = lines.slice(-this.lines);
      if (result.length) result[result.length - 1].current = true;
      return result;
    }

    get idle() {
      return !this.items.length && !this.queue.length;
    }
  }

  CaptionTrack.segments = segments;
  globalThis.AvorythmCaptionTrack = CaptionTrack;
  if (typeof module !== 'undefined' && module.exports) module.exports = CaptionTrack;
})();
