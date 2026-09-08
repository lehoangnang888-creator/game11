/**
 * Procedural Dynamic Engine Audio Synthesizer
 * Uses Web Audio API to create authentic multi-cylinder internal combustion engine sound
 * modulated in real-time by RPM, throttle load, turbo blow-off, and tire friction screech.
 */

export class RacingAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private tireGain: GainNode | null = null;
  private turboGain: GainNode | null = null;

  // Oscillators for engine harmonics
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;

  // Tire screech noise
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;

  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    // Lazy initialize on first user gesture
  }

  public init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);

      // 1. Engine Harmonic Oscillators
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.4;
      this.engineGain.connect(this.masterGain);

      // Fundamental cylinder firing
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.value = 45; // ~900 RPM idle

      // 2nd order harmonic (V8 growl)
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'triangle';
      this.osc2.frequency.value = 90;

      // Sub-bass resonance
      this.oscSub = this.ctx.createOscillator();
      this.oscSub.type = 'sine';
      this.oscSub.frequency.value = 30;

      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 800;

      this.osc1.connect(engineFilter);
      this.osc2.connect(engineFilter);
      this.oscSub.connect(this.engineGain);
      engineFilter.connect(this.engineGain);

      this.osc1.start();
      this.osc2.start();
      this.oscSub.start();

      // 2. Tire Screech Synthesizer (White Noise with Bandpass)
      this.setupTireScreech();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio could not start automatically:', e);
    }
  }

  private setupTireScreech() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.value = 1400;
    this.tireFilter.Q.value = 3.5;

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.value = 0.0;

    whiteNoise.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);

    whiteNoise.start();
  }

  /**
   * Updates audio parameters based on vehicle state
   */
  public update(rpm: number, throttle: number, isDrifting: boolean, isBraking: boolean, speedKmh: number) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    // RPM mapping (900 idle -> ~35Hz, 8000 redline -> ~260Hz)
    const normalizedRPM = Math.max(900, Math.min(8500, rpm));
    const baseFreq = (normalizedRPM / 60) * 1.8;

    if (this.osc1 && this.osc2 && this.oscSub) {
      this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
      this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.04);
      this.oscSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
    }

    // Engine volume reacts to throttle load
    if (this.engineGain) {
      const targetVolume = 0.25 + throttle * 0.45;
      this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.05);
    }

    // Tire Screech volume
    if (this.tireGain && this.tireFilter) {
      let screechIntensity = 0;
      if (isDrifting && speedKmh > 25) {
        screechIntensity = 0.45;
      } else if (isBraking && speedKmh > 40) {
        screechIntensity = 0.35;
      }
      this.tireGain.gain.setTargetAtTime(screechIntensity, now, 0.08);
      this.tireFilter.frequency.setTargetAtTime(1200 + speedKmh * 8, now, 0.08);
    }
  }

  /**
   * Sound for 3-2-1-GO Countdown
   */
  public playCountdownBeep(isGo: boolean = false) {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isGo ? 'sine' : 'triangle';
      osc.frequency.value = isGo ? 880 : 440; // A5 for GO!, A4 for 3-2-1

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isGo ? 0.6 : 0.25));

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + (isGo ? 0.65 : 0.3));
    } catch {
      // Ignored
    }
  }

  /**
   * Turbo pop / backfire
   */
  public playBackfire() {
    if (!this.isInitialized || !this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch {
      // Ignored
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public destroy() {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.isInitialized = false;
  }
}

export const audioEngine = new RacingAudioEngine();
