'use client';

export interface VoiceAnalysis {
  pitch: number;       // Hz — 0 if no voice detected
  volume: number;      // 0–100 (RMS-derived)
  speechRate: number;  // placeholder — syllable detection requires more buffering
}

export class VoiceAnalyzer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private sampleRate = 44100;

  async init(stream: MediaStream): Promise<void> {
    this.ctx = new AudioContext();
    this.sampleRate = this.ctx.sampleRate;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source = this.ctx.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
  }

  analyze(): VoiceAnalysis {
    if (!this.analyser) {
      return { pitch: 0, volume: 0, speechRate: 0 };
    }

    const bufferLength = this.analyser.fftSize;
    const timeData  = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(timeData);

    // RMS volume
    const rms = Math.sqrt(
      timeData.reduce((sum, v) => sum + v * v, 0) / bufferLength
    );
    const volume = Math.min(rms * 500, 100);

    // Pitch via autocorrelation (YIN-lite approximation)
    const pitch = this.estimatePitch(timeData);

    return { pitch, volume, speechRate: 0 };
  }

  private estimatePitch(buf: Float32Array): number {
    const SIZE        = buf.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);
    const THRESHOLD   = 0.9;

    let best     = -1;
    let bestCorr = 0;
    let lastCorr = 1;
    let foundGoodCorr = false;

    for (let offset = 0; offset < MAX_SAMPLES; offset++) {
      let corr = 0;
      for (let i = 0; i < MAX_SAMPLES; i++) {
        corr += Math.abs(buf[i] - buf[i + offset]);
      }
      corr = 1 - corr / MAX_SAMPLES;

      if (corr > THRESHOLD && corr > lastCorr) {
        foundGoodCorr = true;
        if (corr > bestCorr) {
          bestCorr = corr;
          best = offset;
        }
      } else if (foundGoodCorr) {
        break;
      }
      lastCorr = corr;
    }

    if (best === -1) return 0;
    return Math.round(this.sampleRate / best);
  }

  destroy(): void {
    this.source?.disconnect();
    this.ctx?.close().catch(() => {});
    this.analyser = null;
    this.source   = null;
    this.ctx      = null;
  }
}
