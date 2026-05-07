export class AudioEngine {
  private context: AudioContext | null = null;
  private callerAnalyser: AnalyserNode | null = null;
  private aiAnalyser: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private sampleRate: number = 16000; // Match backend PCM rate

  constructor() {
    // Context is created on first user interaction via resume()
  }

  async resume() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate,
      });

      this.callerAnalyser = this.context.createAnalyser();
      this.aiAnalyser = this.context.createAnalyser();
      
      this.callerAnalyser.fftSize = 256;
      this.aiAnalyser.fftSize = 256;

      this.callerAnalyser.connect(this.context.destination);
      this.aiAnalyser.connect(this.context.destination);
      
      this.nextStartTime = this.context.currentTime;
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  playChunk(pcmData: Int16Array, channel: 'caller' | 'ai') {
    if (!this.context || this.context.state === 'suspended') return;

    // Convert Int16 PCM to Float32 [-1, 1]
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }

    const buffer = this.context.createBuffer(1, floatData.length, this.sampleRate);
    buffer.getChannelData(0).set(floatData);

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const analyser = channel === 'caller' ? this.callerAnalyser : this.aiAnalyser;
    if (analyser) {
      source.connect(analyser);
    }

    // Schedule playback to avoid gaps/pops
    const currentTime = this.context.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);
    
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;
  }

  getByteTimeDomainData(channel: 'caller' | 'ai'): Uint8Array {
    const analyser = channel === 'caller' ? this.callerAnalyser : this.aiAnalyser;
    const dataArray = new Uint8Array(128);
    if (analyser) {
      analyser.getByteTimeDomainData(dataArray);
    } else {
      dataArray.fill(128); // Neutral value for silence
    }
    return dataArray;
  }

  close() {
    this.context?.close();
  }
}

export const audioEngine = new AudioEngine();
