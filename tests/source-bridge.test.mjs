import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('detects a same-element autoplay transition at the end of a video', async () => {
  const listeners = new Map();
  const media = {
    currentTime: 99.8,
    duration: 100,
    paused: false,
    ended: false,
    currentSrc: 'https://example.test/first.mp4',
    clientWidth: 1280,
    clientHeight: 720,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener() {}
  };
  const messages = [];
  const intervals = [];
  globalThis.window = {location: {href: 'https://example.test/watch/first'}};
  globalThis.document = {
    title: 'First video',
    documentElement: {},
    querySelectorAll: () => [media]
  };
  globalThis.chrome = {runtime: {sendMessage: async (message) => { messages.push(message); }}};
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
  globalThis.setInterval = (callback) => { intervals.push(callback); return 1; };
  globalThis.clearInterval = () => {};

  await import(`../extension/source-bridge.js?autoplay=${Date.now()}`);
  assert.equal(intervals.length, 1, 'the source bridge must poll SPA players that can skip the native ended event');
  intervals[0]();
  media.currentTime = 0.2;
  media.currentSrc = 'https://example.test/second.mp4';
  window.location.href = 'https://example.test/watch/second';
  document.title = 'Second video';
  intervals[0]();

  assert.equal(messages.at(-1)?.state?.completed, true);
  assert.equal(messages.at(-1)?.state?.completionReason, 'media-transition');

  let staleDisconnected = false;
  window.__avorythmSourceBridge = {disconnect() { staleDisconnected = true; }};
  vm.runInThisContext(readFileSync(new URL('../extension/source-bridge.js', import.meta.url), 'utf8'));
  assert.equal(staleDisconnected, true, 'reinjection must dispose the bridge from the previous extension session');

  chrome.runtime.sendMessage = () => { throw new Error('Extension context invalidated.'); };
  assert.doesNotThrow(
    () => window.__avorythmSourceBridge.report(),
    'an invalidated extension context must stop the bridge instead of leaking an uncaught page error'
  );
});
