export class CaptureStore {
  static async create(fileName, options = {}) {
    const WorkerImpl = options.WorkerImpl || globalThis.Worker;
    if (typeof WorkerImpl !== 'function') throw new Error('capture_store_worker_unavailable');
    const workerUrl = options.workerUrl || new URL('./capture-store-worker.js', import.meta.url);
    const worker = new WorkerImpl(workerUrl, {type: 'module'});
    const store = new CaptureStore(fileName, worker);
    try {
      await store.#call('create', {fileName});
      return store;
    } catch (error) {
      worker.terminate();
      throw error;
    }
  }

  constructor(fileName, worker) {
    this.fileName = fileName;
    this.worker = worker;
    this.sequence = 0;
    this.pending = new Map();
    this.operationQueue = Promise.resolve();
    this.closed = false;
    worker.onmessage = ({data}) => {
      const operation = this.pending.get(data?.id);
      if (!operation) return;
      this.pending.delete(data.id);
      if (data.error) operation.reject(new Error(data.error));
      else operation.resolve(data.result || {});
    };
    worker.onerror = () => this.#rejectAll(new Error('capture_store_worker_failed'));
    worker.onmessageerror = () => this.#rejectAll(new Error('capture_store_message_failed'));
  }

  append(blob) {
    return this.#enqueue(async () => {
      if (this.closed) throw new Error('capture_store_closed');
      const buffer = await blob.arrayBuffer();
      await this.#call('append', {buffer}, [buffer]);
    });
  }

  snapshot(mimeType = 'video/webm') {
    return this.#enqueue(async () => {
      if (this.closed) throw new Error('capture_store_closed');
      const {size = 0} = await this.#call('release');
      try {
        const root = await navigator.storage.getDirectory();
        const file = await (await root.getFileHandle(this.fileName)).getFile();
        if (file.size < size) throw new Error('capture_store_flush_incomplete');
        return file.slice(0, size, mimeType);
      } finally {
        await this.#call('reopen');
      }
    });
  }

  finish() {
    return this.#enqueue(async () => {
      if (this.closed) throw new Error('capture_store_closed');
      const result = await this.#call('finish');
      this.closed = true;
      this.worker.terminate();
      return result;
    });
  }

  #enqueue(operation) {
    const result = this.operationQueue.then(operation);
    this.operationQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  #call(type, payload = {}, transfer = []) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      this.worker.postMessage({id, type, ...payload}, transfer);
    });
  }

  #rejectAll(error) {
    for (const operation of this.pending.values()) operation.reject(error);
    this.pending.clear();
  }
}
