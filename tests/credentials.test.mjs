import assert from 'node:assert/strict';
import test from 'node:test';

let workerId = 0;

async function loadWorker(local = {}, session = {}, failAccess = false) {
  let installed;
  let receive;
  let failLocalWrite = false;
  const access = [];
  const area = (data, name) => ({
    async setAccessLevel({accessLevel}) {
      if (failAccess) throw new Error('storage_access_failed');
      access.push([name, accessLevel]);
    },
    async get(keys) {
      if (keys == null) return structuredClone(data);
      const list = typeof keys === 'string' ? [keys] : keys;
      return structuredClone(Object.fromEntries(list.filter((key) => key in data).map((key) => [key, data[key]])));
    },
    async set(value) {
      if (name === 'local' && failLocalWrite) throw new Error('storage_write_failed');
      Object.assign(data, structuredClone(value));
    },
    async remove(keys) { for (const key of [keys].flat()) delete data[key]; }
  });
  globalThis.chrome = {
    storage: {local: area(local, 'local'), session: area(session, 'session')},
    permissions: {async contains() { return true; }},
    runtime: {
      getURL: (path) => `chrome-extension://credentials-test/${path}`,
      async getContexts() { return []; },
      onInstalled: {addListener(listener) { installed = listener; }},
      onMessage: {addListener(listener) { receive = listener; }}
    },
    tabs: {onRemoved: {addListener() {}}}
  };
  await import(`../extension/background.js?credentials-test=${++workerId}`);
  if (!failAccess) await installed();
  const message = (payload, sender = {url: 'chrome-extension://credentials-test/options.html'}) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('message_response_missing')), 500);
    receive(payload, sender, (value) => { clearTimeout(timeout); resolve(value); });
  });
  return {local, session, access, message, failWrites() { failLocalWrite = true; }};
}

test('API keys stay session-only by default and disappear after a browser restart', async () => {
  let worker = await loadWorker();
  await worker.message({type: 'set-key', apiKey: 'test-gemini-session'});
  await worker.message({type: 'set-groq-key', apiKey: 'test-groq-session'});
  assert.equal(worker.session.apiKey, 'test-gemini-session');
  assert.equal(worker.session.groqApiKey, 'test-groq-session');
  assert.doesNotMatch(JSON.stringify(worker.local), /test-(gemini|groq)-session/);
  worker = await loadWorker(structuredClone(worker.local));
  const {data} = await worker.message({type: 'bootstrap'});
  assert.equal(data.api_key_set, false);
  assert.equal(data.groq_api_key_set, false);
  assert.equal(data.remember_gemini_key, false);
  assert.equal(data.remember_groq_key, false);
});

test('each provider can be remembered independently and restored across worker and browser restarts', async () => {
  let worker = await loadWorker();
  assert.deepEqual(worker.access, [['local', 'TRUSTED_CONTEXTS'], ['session', 'TRUSTED_CONTEXTS']]);
  assert.equal((await worker.message({type: 'set-key', apiKey: 'test-gemini-remembered', remember: true})).ok, true);
  await worker.message({type: 'set-groq-key', apiKey: 'test-groq-session'});
  worker = await loadWorker(structuredClone(worker.local));
  let {data} = await worker.message({type: 'bootstrap'});
  assert.equal(data.api_key_set, true);
  assert.equal(data.groq_api_key_set, false);
  assert.equal(data.remember_gemini_key, true);
  assert.equal(data.remember_groq_key, false);
  assert.doesNotMatch(JSON.stringify(data), /test-gemini-remembered/);
  await worker.message({type: 'set-groq-key', apiKey: 'test-groq-remembered', remember: true});
  worker = await loadWorker(structuredClone(worker.local), structuredClone(worker.session));
  ({data} = await worker.message({type: 'bootstrap'}));
  assert.equal(data.api_key_set, true);
  assert.equal(data.groq_api_key_set, true);
  assert.equal(data.remember_groq_key, true);
});

test('enabling remember migrates the current key; disabling removes its disk copy and preserves this session', async () => {
  let worker = await loadWorker();
  await worker.message({type: 'set-key', apiKey: 'test-gemini-migration'});
  let response = await worker.message({type: 'set-key-persistence', provider: 'gemini', remember: true});
  assert.equal(response.ok, true);
  assert.match(JSON.stringify(worker.local), /test-gemini-migration/);
  worker = await loadWorker(structuredClone(worker.local));
  response = await worker.message({type: 'set-key-persistence', provider: 'gemini', remember: false});
  assert.equal(response.ok, true);
  assert.equal(response.data.api_key_set, true);
  assert.equal(response.data.remember_gemini_key, false);
  assert.equal(worker.session.apiKey, 'test-gemini-migration');
  assert.doesNotMatch(JSON.stringify(worker.local), /test-gemini-migration/);
  worker = await loadWorker(structuredClone(worker.local));
  assert.equal((await worker.message({type: 'bootstrap'})).data.api_key_set, false);
});

test('replacing and clearing a remembered key never leaves a stale disk copy', async () => {
  let worker = await loadWorker();
  await Promise.all([
    worker.message({type: 'set-key', apiKey: 'test-gemini-old', remember: true}),
    worker.message({type: 'set-groq-key', apiKey: 'test-groq-keep', remember: true})
  ]);
  await worker.message({type: 'set-key', apiKey: 'test-gemini-new', remember: true});
  assert.doesNotMatch(JSON.stringify(worker.local), /test-gemini-old/);
  await worker.message({type: 'clear-key'});
  assert.doesNotMatch(JSON.stringify(worker.local), /test-gemini-(old|new)/);
  assert.equal(worker.session.apiKey, undefined);
  worker = await loadWorker(structuredClone(worker.local));
  let {data} = await worker.message({type: 'bootstrap'});
  assert.equal(data.api_key_set, false);
  assert.equal(data.remember_gemini_key, false);
  assert.equal(data.groq_api_key_set, true);
  await worker.message({type: 'clear-groq-key'});
  worker = await loadWorker(structuredClone(worker.local));
  ({data} = await worker.message({type: 'bootstrap'}));
  assert.equal(data.groq_api_key_set, false);
  assert.equal(data.remember_groq_key, false);
});

test('only trusted extension pages can save, clear, or opt into persistent credentials', async () => {
  const worker = await loadWorker();
  for (const payload of [
    {type: 'set-key', apiKey: 'test-untrusted-key', remember: true},
    {type: 'set-groq-key', apiKey: 'test-untrusted-key', remember: true},
    {type: 'set-key-persistence', provider: 'gemini', remember: true},
    {type: 'clear-key'},
    {type: 'clear-groq-key'}
  ]) {
    const response = await worker.message(payload, {url: 'https://www.youtube.com/watch?v=example', tab: {id: 1}});
    assert.equal(response.ok, false);
    assert.equal(response.error, 'credential_access_denied');
  }
  assert.doesNotMatch(JSON.stringify(worker.local), /test-untrusted-key/);
});

test('persistence errors fail visibly without falsely confirming the preference', async () => {
  const worker = await loadWorker();
  await worker.message({type: 'set-key', apiKey: 'test-write-failure'});
  worker.failWrites();
  const response = await worker.message({type: 'set-key-persistence', provider: 'gemini', remember: true});
  assert.equal(response.ok, false);
  assert.equal(response.error, 'storage_write_failed');
  assert.equal((await worker.message({type: 'bootstrap'})).data.remember_gemini_key, false);
  assert.doesNotMatch(JSON.stringify(worker.local), /test-write-failure/);
  const restricted = await loadWorker({}, {}, true);
  assert.equal((await restricted.message({type: 'set-key', apiKey: 'test-access-failure', remember: true})).ok, false);
  assert.doesNotMatch(JSON.stringify(restricted.local), /test-access-failure/);
});

test('malformed opt-in values and invalid key messages cannot enable persistent credentials', async () => {
  const worker = await loadWorker({credentials: {gemini: {remember: 'true', key: 'test-unapproved-key'}}});
  assert.equal((await worker.message({type: 'bootstrap'})).data.api_key_set, false);
  for (const payload of [
    {type: 'set-key'},
    {type: 'set-key', apiKey: 'test-key\nwith-newline'},
    {type: 'set-key', apiKey: 'test-implicit-optin', remember: 'true'},
    {type: 'set-key-persistence', provider: 'gemini', remember: 'false'},
    {type: 'set-key-persistence', provider: '__proto__', remember: true}
  ]) assert.equal((await worker.message(payload)).ok, false);
  assert.equal((await worker.message({type: 'bootstrap'})).data.remember_gemini_key, false);
});
