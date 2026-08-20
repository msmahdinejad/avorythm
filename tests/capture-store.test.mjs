import assert from 'node:assert/strict';
import test from 'node:test';

import {CaptureStore} from '../extension/capture-store.mjs';
import {installCaptureWorker} from './fake-capture-worker.mjs';

test('serializes snapshot release and reopen between recording writes', async () => {
  const files = new Map();
  const observed = [];
  installCaptureWorker(files, observed);
  const root = {
    async getFileHandle(name) {
      return {async getFile() { return new Blob(files.get(name) || []); }};
    }
  };
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
    storage: {async getDirectory() { return root; }}
  }});

  const store = await CaptureStore.create('capture.webm', {WorkerImpl: globalThis.Worker});
  await store.append(new Blob(['before']));
  const snapshot = await store.snapshot('video/webm');
  await store.append(new Blob(['-after']));
  const result = await store.finish();

  assert.equal(await snapshot.text(), 'before');
  assert.equal(new TextDecoder().decode(new Uint8Array((await new Blob(files.get('capture.webm')).arrayBuffer()))), 'before-after');
  assert.equal(result.size, 12);
  assert.deepEqual(observed, ['create', 'append', 'release', 'reopen', 'append', 'finish']);
});
