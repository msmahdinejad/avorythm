(() => {
  if (window.__avorythmSourceBridge) return;

  let media = null;
  let cleanup = () => {};
  const pick = () => [...document.querySelectorAll('video,audio')]
    .filter((element) => Number.isFinite(element.duration) || !element.paused)
    .sort((left, right) => (right.clientWidth * right.clientHeight) - (left.clientWidth * left.clientHeight))[0] || null;
  const report = (event = 'state') => {
    if (!media) return;
    chrome.runtime.sendMessage({
      type: 'source-media-state',
      event,
      state: {
        currentTime: Number(media.currentTime) || 0,
        duration: Number.isFinite(media.duration) ? media.duration : null,
        paused: media.paused,
        ended: media.ended
      }
    }).catch(() => {});
  };
  const bind = () => {
    const next = pick();
    if (!next || next === media) return;
    cleanup();
    media = next;
    const events = ['play', 'pause', 'seeking', 'durationchange', 'ended'];
    const listeners = events.map((event) => {
      const listener = () => report(event);
      media.addEventListener(event, listener);
      return [event, listener];
    });
    cleanup = () => listeners.forEach(([event, listener]) => media?.removeEventListener(event, listener));
    report('bound');
  };

  bind();
  const observer = new MutationObserver(bind);
  observer.observe(document.documentElement, {childList: true, subtree: true});
  window.__avorythmSourceBridge = {report, disconnect() { cleanup(); observer.disconnect(); }};
})();
