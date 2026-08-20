let accessHandle = null;
let fileName = '';
let size = 0;

async function openAccessHandle() {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(fileName, {create: true});
  accessHandle = await handle.createSyncAccessHandle();
  size = accessHandle.getSize();
}

function releaseAccessHandle() {
  accessHandle.flush();
  accessHandle.close();
  accessHandle = null;
}

function respond(id, result = {}, error = '') {
  self.postMessage({id, result, error});
}

self.onmessage = async ({data}) => {
  const {id, type} = data || {};
  try {
    if (type === 'create') {
      if (accessHandle) throw new Error('capture_store_already_open');
      const root = await navigator.storage.getDirectory();
      fileName = String(data.fileName || '');
      const handle = await root.getFileHandle(fileName, {create: true});
      accessHandle = await handle.createSyncAccessHandle();
      accessHandle.truncate(0);
      size = 0;
      respond(id, {fileName, size});
      return;
    }
    if (type === 'reopen') {
      if (accessHandle) throw new Error('capture_store_already_open');
      await openAccessHandle();
      respond(id, {fileName, size});
      return;
    }
    if (!accessHandle) throw new Error('capture_store_not_open');
    if (type === 'append') {
      const bytes = new Uint8Array(data.buffer);
      const written = accessHandle.write(bytes, {at: size});
      if (written !== bytes.byteLength) throw new Error('capture_store_short_write');
      size += written;
      respond(id, {size});
      return;
    }
    if (type === 'flush') {
      accessHandle.flush();
      respond(id, {fileName, size});
      return;
    }
    if (type === 'release') {
      releaseAccessHandle();
      respond(id, {fileName, size});
      return;
    }
    if (type === 'finish') {
      releaseAccessHandle();
      respond(id, {fileName, size});
      return;
    }
    throw new Error('capture_store_unknown_command');
  } catch (error) {
    respond(id, {}, error?.message || 'capture_store_failed');
  }
};
