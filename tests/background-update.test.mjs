import assert from 'node:assert/strict';
import test from 'node:test';

test('the service worker lets the user apply a ready update only when it is safe', async () => {
  const local = {};
  const session = {state: {active: false}};
  const area = (data) => ({
    async setAccessLevel() {},
    async get(key) { return typeof key === 'string' ? {[key]: data[key]} : Object.fromEntries([].concat(key).map((name) => [name, data[name]])); },
    async set(update) { Object.assign(data, update); },
    async remove(key) { delete data[key]; }
  });
  const badges = [];
  let reloads = 0;
  let playerTabs = [];
  let onMessage;
  let onUpdateAvailable;
  const timers = [];
  globalThis.setTimeout = (callback) => { timers.push(callback); return timers.length; };
  globalThis.chrome = {
    storage: {local: area(local), session: area(session)},
    permissions: {async contains() { return true; }},
    action: {async setBadgeText({text}) { badges.push(text); }, async setBadgeBackgroundColor() {}},
    runtime: {
      getURL: (path) => `chrome-extension://abc/${path}`,
      getManifest: () => ({version: '1.1.18'}),
      async getContexts() { return []; },
      async sendMessage() { return {ok: true}; },
      reload() { reloads += 1; },
      async requestUpdateCheck() { return {status: 'update_available', version: '1.1.19'}; },
      onInstalled: {addListener() {}},
      onStartup: {addListener() {}},
      onUpdateAvailable: {addListener(listener) { onUpdateAvailable = listener; }},
      onMessage: {addListener(listener) { onMessage = listener; }}
    },
    tabs: {async query() { return playerTabs; }, onRemoved: {addListener() {}}}
  };
  await import('../extension/background.js');

  const send = (message, sender = {url: 'chrome-extension://abc/popup.html'}) => new Promise((resolve) => {
    onMessage({target: undefined, ...message}, sender, resolve);
  });

  assert.equal((await send({type: 'update-status'})).pending, null);
  await onUpdateAvailable({version: '1.1.19'});
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(badges.at(-1), '↑');
  const status = await send({type: 'update-status'});
  assert.equal(status.pending.version, '1.1.19');
  assert.equal(status.blocked, '');

  assert.deepEqual(await send({type: 'apply-update'}, {url: 'https://evil.example/'}), {ok: false, error: 'update_access_denied'});

  session.state = {active: true};
  assert.deepEqual(await send({type: 'apply-update'}), {ok: false, error: 'update_blocked_active'});
  session.state = {active: false};
  playerTabs = [{id: 5}];
  assert.deepEqual(await send({type: 'apply-update'}), {ok: false, error: 'update_blocked_player'});
  assert.equal(reloads, 0, 'a recording or an open player must never be interrupted');

  playerTabs = [];
  assert.deepEqual(await send({type: 'apply-update'}), {ok: true});
  timers.forEach((run) => run());
  assert.equal(reloads, 1);

  const check = await send({type: 'check-update'});
  assert.equal(check.status, 'update_available');
  local.pendingUpdate = undefined;
  delete local.pendingUpdate;
  assert.deepEqual(await send({type: 'apply-update'}), {ok: false, error: 'update_not_ready'});
});
