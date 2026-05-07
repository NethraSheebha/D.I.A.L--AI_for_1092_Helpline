export class AudioEngine {
  private context: AudioContext | null = null;
  private nextStartTime: number = 0;
  private readonly sampleRate: number = 16000;
  private readonly bufferSize: number = 2048;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.sampleRate,
    });
  }

  async playPCM(base64Data: string) {
    if (!this.context) return;
    
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Int16Array(len / 2);
    
    for (let i = 0; i < len; i += 2) {
      bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
    }

    const floatData = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      floatData[i] = bytes[i] / 32768.0;
    }

    const buffer = this.context.createBuffer(1, floatData.length, this.sampleRate);
    buffer.getChannelData(0).set(floatData);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);

    const currentTime = this.context.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + 0.1;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  async resume() {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  close() {
    this.context?.close();
  }
}

export const audioEngine = new AudioEngine();
