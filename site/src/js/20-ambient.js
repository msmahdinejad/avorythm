/* Hero ambient: layered "voice ribbons" drawn with additive light. Pauses when hidden or off screen. */
(() => {
  const canvas = $('[data-ambient]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = 1;
  let running = false;
  let raf = 0;
  let pointer = 0.5;
  const start = performance.now();

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = canvas.width = Math.max(1, Math.round(rect.width * dpr));
    h = canvas.height = Math.max(1, Math.round(rect.height * dpr));
    if (!running) draw(performance.now());
  }

  function ribbon(t, k, count, light) {
    const p = k / (count - 1);
    const base = h * (0.66 + (p - 0.5) * 0.07);
    const amp = h * 0.05 * (0.6 + 0.4 * Math.sin(t * 0.45 + k * 1.3));
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const u = x / w;
      const env = Math.pow(Math.sin(Math.PI * u), 1.4);
      const y = base + env * amp * (Math.sin(u * 8 + t * 1.05 + k * 0.7 + pointer * 2) + 0.55 * Math.sin(u * 17 - t * 1.6 + k * 1.2) + 0.28 * Math.sin(u * 31 + t * 2.2 - k));
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    const g = ctx.createLinearGradient(0, 0, w, 0);
    const a = light ? 0.5 : 0.62;
    g.addColorStop(0, 'rgba(117,97,245,0)');
    g.addColorStop(0.22, `rgba(143,124,255,${a})`);
    g.addColorStop(0.5, `rgba(120,190,245,${a * 0.9})`);
    g.addColorStop(0.78, `rgba(84,223,218,${a})`);
    g.addColorStop(1, 'rgba(84,223,218,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = (1 + (k % 3) * 0.9) * dpr;
    ctx.stroke();
  }

  function draw(now) {
    const t = reduceMotion ? 4 : (now - start) / 1000;
    const light = document.documentElement.dataset.theme === 'light';
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
    const count = 7;
    ctx.globalAlpha = light ? 0.35 : 0.5;
    for (let k = 0; k < count; k++) ribbon(t, k, count, light);
    ctx.globalAlpha = light ? 0.2 : 0.22;
    ctx.filter = `blur(${6 * dpr}px)`;
    for (let k = 0; k < count; k += 2) ribbon(t, k, count, light);
    ctx.filter = 'none';
  }

  function loop(now) {
    draw(now);
    if (running) raf = requestAnimationFrame(loop);
  }

  function setRunning(next) {
    if (next === running || reduceMotion) return;
    running = next;
    cancelAnimationFrame(raf);
    if (running) raf = requestAnimationFrame(loop);
  }

  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', (e) => { pointer = e.clientX / innerWidth; }, { passive: true });
  document.addEventListener('visibilitychange', () => setRunning(!document.hidden && visible));
  let visible = true;
  onVisible(canvas, (v) => { visible = v; setRunning(v && !document.hidden); }, { threshold: 0 });
  resize();
})();
