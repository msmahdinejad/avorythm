class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = [];
    this.position = 0;
    this.ratio = sampleRate / 16000;
    this.chunk = new Int16Array(1600);
    this.chunkIndex = 0;
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let frame = 0; frame < channels[0].length; frame += 1) {
      let mono = 0;
      for (const channel of channels) mono += channel[frame] || 0;
      this.pending.push(mono / channels.length);
    }
    while (this.position + 1 < this.pending.length) {
      const left = Math.floor(this.position);
      const fraction = this.position - left;
      const sample = this.pending[left] * (1 - fraction) + this.pending[left + 1] * fraction;
      this.chunk[this.chunkIndex++] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      this.position += this.ratio;
      if (this.chunkIndex === this.chunk.length) {
        const complete = this.chunk;
        this.port.postMessage(complete.buffer, [complete.buffer]);
        this.chunk = new Int16Array(1600);
        this.chunkIndex = 0;
      }
    }
    const consumed = Math.floor(this.position);
    if (consumed) {
      this.pending.splice(0, consumed);
      this.position -= consumed;
    }
    return true;
  }
}

registerProcessor('lingora-pcm-capture', PcmCaptureProcessor);
