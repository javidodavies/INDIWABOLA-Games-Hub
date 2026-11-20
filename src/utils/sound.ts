class BolaSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.muted = window.localStorage.getItem('indiwabola_muted') === '1';
      } catch {
        this.muted = false;
      }
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('indiwabola_muted', this.muted ? '1' : '0');
      } catch {
        // ignore storage errors
      }
    }
    return this.muted;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'triangle', gainVal = 0.08, delay = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick(): void {
    this.tone(520, 0.06, 'sine', 0.05);
  }

  public playMove(): void {
    this.tone(360, 0.08, 'triangle', 0.06);
  }

  public playRoll(): void {
    this.tone(240, 0.05, 'square', 0.04, 0);
    this.tone(320, 0.05, 'square', 0.04, 0.05);
    this.tone(440, 0.07, 'triangle', 0.05, 0.1);
  }

  public playCorrect(): void {
    this.tone(523.25, 0.12, 'triangle', 0.08, 0);
    this.tone(659.25, 0.14, 'triangle', 0.08, 0.08);
    this.tone(783.99, 0.18, 'triangle', 0.09, 0.16);
  }

  public playWrong(): void {
    this.tone(220, 0.14, 'sawtooth', 0.05, 0);
    this.tone(175, 0.2, 'sawtooth', 0.05, 0.1);
  }

  public playCapture(): void {
    this.tone(620, 0.08, 'triangle', 0.09, 0);
    this.tone(410, 0.14, 'sine', 0.08, 0.06);
  }

  public playWhistle(): void {
    this.tone(2450, 0.14, 'sine', 0.04, 0);
    this.tone(2620, 0.22, 'sine', 0.04, 0.08);
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.22, 'triangle', 0.09, idx * 0.09);
    });
  }
}

export const soundEngine = new BolaSoundEngine();
