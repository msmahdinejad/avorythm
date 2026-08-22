(() => {
  try {
    window.__avorythmSourceBridge?.disconnect?.();
  } catch {}

  let media = null;
  let cleanup = () => {};
  let previous = null;
  let completionSent = false;
  let interval = null;
  let observer = null;
  let bridge = null;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cleanup();
    cleanup = () => {};
    observer?.disconnect();
    if (interval !== null) clearInterval(interval);
    interval = null;
    media = null;
    if (window.__avorythmSourceBridge === bridge) delete window.__avorythmSourceBridge;
  };
  const pick = () => [...document.querySelectorAll('video,audio')]
    .filter((element) => Number.isFinite(element.duration) || !element.paused)
    .sort((left, right) => (right.clientWidth * right.clientHeight) - (left.clientWidth * left.clientHeight))[0] || null;
  const snapshot = () => ({
    currentTime: Number(media?.currentTime) || 0,
    duration: Number.isFinite(media?.duration) ? media.duration : null,
    paused: Boolean(media?.paused),
    ended: Boolean(media?.ended),
    mediaUrl: String(media?.currentSrc || media?.src || ''),
    pageUrl: String(window.location?.href || ''),
    title: String(document.title || '')
  });
  const report = (event = 'state', override = {}) => {
    if (disposed || !media) return;
    const state = {...snapshot(), ...override};
    try {
      Promise.resolve(chrome.runtime.sendMessage({
        type: 'source-media-state',
        event,
        state
      })).catch(dispose);
    } catch {
      dispose();
      return;
    }
    previous = state;
  };
  const poll = () => {
    if (disposed || !media || completionSent) return;
    const next = snapshot();
    const duration = previous?.duration;
    const nearEnd = Number.isFinite(duration) && previous.currentTime >= duration - Math.max(0.75, duration * 0.0025);
    const identityChanged = previous && (
      next.mediaUrl !== previous.mediaUrl ||
      next.pageUrl !== previous.pageUrl ||
      next.title !== previous.title
    );
    const restarted = previous && next.currentTime + 1 < previous.currentTime && next.currentTime <= 2;
    if (next.ended || nearEnd && (identityChanged || restarted)) {
      completionSent = true;
      report('completed', {completed: true, completionReason: next.ended ? 'ended' : 'media-transition'});
      return;
    }
    previous = next;
  };
  const bind = () => {
    if (disposed) return;
    const next = pick();
    if (!next || next === media) return;
    const previousDuration = previous?.duration;
    const previousNearEnd = Number.isFinite(previousDuration) &&
      previous.currentTime >= previousDuration - Math.max(0.75, previousDuration * 0.0025);
    if (media && previousNearEnd && !completionSent) {
      completionSent = true;
      report('completed', {completed: true, completionReason: 'media-transition'});
      return;
    }
    cleanup();
    media = next;
    previous = snapshot();
    const events = ['play', 'pause', 'seeking', 'durationchange', 'loadedmetadata', 'ended'];
    const listeners = events.map((event) => {
      const listener = () => event === 'ended' ? poll() : report(event);
      media.addEventListener(event, listener);
      return [event, listener];
    });
    cleanup = () => listeners.forEach(([event, listener]) => media?.removeEventListener(event, listener));
    report('bound');
  };

  bind();
  if (disposed) return;
  observer = new MutationObserver(bind);
  observer.observe(document.documentElement, {childList: true, subtree: true});
  interval = setInterval(poll, 400);
  bridge = {report, disconnect: dispose};
  window.__avorythmSourceBridge = bridge;
})();
