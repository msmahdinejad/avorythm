export function installCaptureWorker(files, observed = []) {
  globalThis.Worker = class FakeCaptureWorker {
    constructor() {
      this.fileName = '';
      this.size = 0;
      this.closed = false;
    }

    postMessage(message) {
      observed.push(message.type);
      queueMicrotask(() => {
        try {
          const result = this.#handle(message);
          this.onmessage?.({data: {id: message.id, result}});
        } catch (error) {
          this.onmessage?.({data: {id: message.id, error: error.message}});
        }
      });
    }

    terminate() { this.closed = true; }

    #handle(message) {
      if (message.type === 'create') {
        this.fileName = message.fileName;
        files.set(this.fileName, []);
        this.size = 0;
      } else if (message.type === 'append') {
        const bytes = new Uint8Array(message.buffer);
        files.get(this.fileName).push(bytes.slice());
        this.size += bytes.byteLength;
      } else if (message.type === 'finish') {
        this.closed = true;
      } else if (!['flush', 'release', 'reopen'].includes(message.type)) {
        throw new Error('capture_store_unknown_command');
      }
      return {fileName: this.fileName, size: this.size};
    }
  };
}
