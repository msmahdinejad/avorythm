/* Interactive hero demo: a voice in one language, one click, the same voice in yours. */
(() => {
  const demo = $('[data-demo]');
  if (!demo) return;
  const els = {
    pill: $('[data-demo-pill-text]', demo),
    srcLine: $('[data-sub-src]', demo),
    dstLine: $('[data-sub-dst]', demo),
    wave: $('[data-demo-wave]', demo),
    progress: $('[data-demo-progress]', demo),
    speaking: $('[data-demo-speaking]', demo),
    sound: $('[data-demo-sound]', demo),
    replay: $('[data-demo-replay]', demo),
    popupStatus: $('[data-popup-status]', demo),
    popupDot: $('[data-popup-dot]', demo),
    popupBadge: $('[data-popup-badge]', demo),
    popupLang: $('[data-popup-lang]', demo),
    popupStart: $('[data-popup-start]', demo),
    popupStartText: $('[data-popup-start-text]', demo),
    chips: $$('[data-demo-lang]', demo),
  };
  const english = new Intl.DisplayNames(['en'], { type: 'language' });
  const regionless = { zh: 'zh-Hans', pt: 'pt-BR' };
  const popupName = (code) => {
    if (code === 'zh') return 'Chinese (Simplified) · zh-Hans';
    if (code === 'pt') return 'Portuguese (Brazil) · pt-BR';
    return `${english.of(code)} · ${code}`;
  };
  const nativeName = (code) => { const l = langInfo(code); return l ? l.native : code; };
  const localName = (code) => (displayName ? (displayName.of(code) || code) : code);
  const segmenter = 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;
  const pieces = (text) => (segmenter ? [...segmenter.segment(text)].map((s) => s.segment) : text.split(/(\s+)/));

  const T_START = 3900; // popup press (after the original voice has finished: clips run 3.6-4.5 s)
  const T_DUB = 4800; // translation starts
  const T_END = 11400;
  let target = AVO.lang;
  let source = 'ja';
  let run = 0;
  let clock = 0;
  let state = 'original';
  let visible = true;
  const timers = new Set();
  const audio = { enabled: false, el: null };

  // ------------------------------------------------------------- waveform
  const ctx = els.wave.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = 1;
  let mix = 0; // 0 = violet (original) … 1 = cyan (dubbed)
  let energy = 0.2;
  let raf = 0;
  function resizeWave() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = els.wave.getBoundingClientRect();
    w = els.wave.width = Math.max(1, Math.round(r.width * dpr));
    h = els.wave.height = Math.max(1, Math.round(r.height * dpr));
  }
  function drawWave(now) {
    const t = now / 1000;
    const goal = state === 'dubbed' ? 1 : 0;
    mix += (goal - mix) * 0.06;
    const speaking = running() ? 1 : 0.25;
    energy += ((0.35 + 0.65 * Math.abs(Math.sin(t * 3.1) * Math.sin(t * 1.3 + 1))) * speaking - energy) * 0.12;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const c1 = [143 + (84 - 143) * mix, 124 + (223 - 124) * mix, 255 + (218 - 255) * mix];
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      const jitter = state === 'dubbed' ? 0.5 : 1.6;
      for (let x = 0; x <= w; x += 6) {
        const u = x / w;
        const env = Math.pow(Math.sin(Math.PI * u), 1.2);
        const y = h * 0.62 + env * h * 0.22 * energy * (Math.sin(u * 10 + t * 2 + k) + 0.5 * Math.sin(u * 23 - t * 3 + k * 2) * jitter);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${c1[0] | 0},${c1[1] | 0},${c1[2] | 0},${0.55 - k * 0.05})`;
      ctx.lineWidth = (1.2 + (k % 3)) * dpr;
      ctx.stroke();
    }
  }
  function loop(now) {
    drawWave(now);
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    else raf = 0;
  }
  const running = () => clock > 0 && clock < T_END;

  // ---------------------------------------------------------------- audio
  function playClip(file) {
    if (!audio.enabled) return;
    stopAudio();
    audio.el = new Audio(`${AVO.base}assets/audio/${file}`);
    audio.el.volume = 0.9;
    audio.el.play().catch(() => { /* file missing or blocked: stay silent */ });
  }
  function stopAudio() { if (audio.el) { audio.el.pause(); audio.el = null; } }

  // -------------------------------------------------------------- timeline
  function later(fn, ms, id) { const t = setTimeout(() => { timers.delete(t); if (id === run) fn(); }, ms); timers.add(t); }
  function type(el, text, ms, id, dir) {
    el.dir = dir;
    if (reduceMotion) { el.textContent = text; return; }
    const parts = pieces(text);
    const stepMs = ms / Math.max(1, parts.length);
    let i = 0;
    el.textContent = '';
    const tick = () => {
      if (id !== run) return;
      i += 1;
      el.textContent = parts.slice(0, i).join('');
      if (i < parts.length) later(tick, stepMs, id);
    };
    tick();
  }
  function setState(next) {
    state = next;
    demo.dataset.demoState = next;
    const code = next === 'dubbed' ? target : source;
    els.pill.textContent = next === 'dubbed' ? `${AVO.msg.dubbed} · ${localName(target === 'zh' ? 'zh-Hans' : target)}` : `${AVO.msg.original} · ${localName(source)}`;
    els.speaking.textContent = fmt(AVO.msg.spokenIn, { language: localName(code === 'zh' ? 'zh-Hans' : code) });
  }

  function start() {
    run += 1;
    const id = run;
    timers.forEach(clearTimeout);
    timers.clear();
    stopAudio();
    clock = 0;
    source = target === 'ja' ? 'ko' : 'ja';
    const T = langInfo(target);
    const S = AVO.demoSources[source];
    els.dstLine.textContent = '';
    els.srcLine.textContent = '';
    els.srcLine.lang = source;
    els.dstLine.lang = langInfo(target).html;
    els.popupBadge.textContent = `AUTO → ${(regionless[target] || target).toUpperCase()}`;
    els.popupLang.textContent = popupName(target);
    els.popupStatus.textContent = AVO.msg.ready;
    els.popupDot.classList.remove('live');
    els.popupStartText.textContent = AVO.msg.start;
    els.popupStart.classList.remove('pressing');
    els.progress.style.transition = 'none';
    els.progress.style.transform = 'scaleX(0)';
    setState('original');
    els.chips.forEach((chip) => chip.setAttribute('aria-checked', String(chip.dataset.demoLang === target)));

    type(els.srcLine, S.text, 2400, id, 'ltr');
    playClip(`demo-src-${source}.mp3`);
    if (!reduceMotion) {
      requestAnimationFrame(() => {
        els.progress.style.transition = `transform ${T_END}ms linear`;
        els.progress.style.transform = 'scaleX(1)';
      });
    }
    const t0 = performance.now();
    const clockTimer = setInterval(() => { if (id !== run) { clearInterval(clockTimer); return; } clock = performance.now() - t0; }, 100);
    later(() => els.popupStart.classList.add('pressing'), T_START, id);
    later(() => {
      els.popupStart.classList.remove('pressing');
      els.popupStatus.textContent = AVO.msg.connected;
      els.popupDot.classList.add('live');
      els.popupStartText.textContent = AVO.msg.stop;
      setState('dubbed');
      type(els.dstLine, T.demo, 3200, id, T.dir);
      playClip(`demo-dub-${target}.mp3`);
    }, T_DUB, id);
    later(() => { clock = T_END; }, T_END, id);
    later(start, T_END + 1700, id);
    if (reduceMotion) { setState('dubbed'); els.srcLine.textContent = S.text; els.dstLine.textContent = T.demo; }
  }

  // ------------------------------------------------------------- controls
  els.chips.forEach((chip) => chip.addEventListener('click', () => { target = chip.dataset.demoLang; start(); }));
  els.replay.addEventListener('click', start);
  els.sound.addEventListener('click', () => {
    audio.enabled = els.sound.getAttribute('aria-pressed') !== 'true';
    els.sound.setAttribute('aria-pressed', String(audio.enabled));
    if (audio.enabled) start(); else stopAudio();
  });
  els.chips.forEach((chip) => {
    chip.addEventListener('keydown', (e) => {
      const i = els.chips.indexOf(chip);
      const next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!next) return;
      e.preventDefault();
      const nextChip = els.chips[(i + (AVO.dir === 'rtl' ? -next : next) + els.chips.length) % els.chips.length];
      nextChip.focus();
      nextChip.click();
    });
  });

  addEventListener('resize', resizeWave, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(loop); if (document.hidden) stopAudio(); });
  onVisible(demo, (v) => {
    visible = v;
    if (v && !raf) raf = requestAnimationFrame(loop);
    if (!v) stopAudio();
  }, { threshold: 0.15 });
  resizeWave();
  start();
})();
