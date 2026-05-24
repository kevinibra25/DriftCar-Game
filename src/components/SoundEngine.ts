// Pure Web Audio sound generator for car rumble and tire squealing
export class DriftingAudioEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Tire squealing noise
  private tireNoise: AudioWorkletNode | ScriptProcessorNode | null = null;
  private tireGain: GainNode | null = null;
  private squealFilter: BiquadFilterNode | null = null;

  private isStarted = false;
  private volumeMultiplier = 0.5;

  constructor() {}

  public init() {
    if (this.isStarted) return;
    try {
      // Lazy context initialization
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Create engine oscillator
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = "sawtooth";

      // Biquad lowpass filter for throaty rumble
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = "lowpass";
      this.engineFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      // Connect engine: Osc -> Filter -> Gain -> Destination
      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();

      // Setup tire screech synthesizer using a ScriptProcessor (highly compatible)
      this.setupScreechSynth();

      this.isStarted = true;
    } catch (e) {
      console.warn("Audio Context failed to start (interaction safety)", e);
    }
  }

  private setupScreechSynth() {
    if (!this.ctx) return;
    try {
      // We generate band-limited white noise for rubber tire scrub and squeal
      const bufferSize = 4096;
      this.tireNoise = this.ctx.createScriptProcessor(bufferSize, 1, 1);
      
      let lastVal = 0;
      this.tireNoise.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          // Combination of white noise and high-pitched ring oscillation
          const noise = Math.random() * 2 - 1;
          const tone = Math.sin(i * 0.45); // screech frequency
          lastVal = lastVal * 0.95 + noise * 0.05; // Low-pass filter noise
          output[i] = lastVal * 0.6 + tone * 0.4;
        }
      };

      this.squealFilter = this.ctx.createBiquadFilter();
      this.squealFilter.type = "bandpass";
      this.squealFilter.frequency.setValueAtTime(950, this.ctx.currentTime);
      this.squealFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

      this.tireGain = this.ctx.createGain();
      this.tireGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      // Tire screech path
      this.tireNoise.connect(this.squealFilter);
      this.squealFilter.connect(this.tireGain);
      this.tireGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Squeech synthesis setup failed", e);
    }
  }

  public setVolume(vol: number) {
    this.volumeMultiplier = Math.max(0, Math.min(1, vol));
  }

  // Update sound values each frames based on speed & drift intensity
  public update(speed: number, maxSpeed: number, isDrifting: boolean, driftPoints: number, inputGas: boolean) {
    if (!this.isStarted || !this.ctx) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const ratio = Math.abs(speed) / maxSpeed;
    const rpmRatio = ratio * 0.7 + (inputGas ? 0.3 : 0.0);

    // Engine sound values
    const engineFreq = 45 + rpmRatio * 185;
    const engineVolume = (0.05 + rpmRatio * 0.12) * this.volumeMultiplier;

    if (this.engineOsc && this.engineFilter && this.engineGain) {
      const now = this.ctx.currentTime;
      this.engineOsc.frequency.setTargetAtTime(engineFreq, now, 0.05);
      this.engineFilter.frequency.setTargetAtTime(100 + rpmRatio * 400, now, 0.05);
      this.engineGain.gain.setTargetAtTime(engineVolume, now, 0.08);
    }

    // Screech sound values
    if (this.tireGain && this.squealFilter) {
      const screechesVolume = isDrifting ? Math.min(0.18, (ratio * 0.1 + 0.08)) * this.volumeMultiplier : 0.0;
      const squealFreq = 850 + ratio * 250 + (isDrifting ? 150 : 0);
      
      const now = this.ctx.currentTime;
      this.squealFilter.frequency.setTargetAtTime(squealFreq, now, 0.08);
      this.tireGain.gain.setTargetAtTime(screechesVolume, now, 0.1);
    }
  }

  public playCollision() {
    if (!this.isStarted || !this.ctx) return;
    try {
      // Noise burst for crash impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sawtooth";
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.25 * this.volumeMultiplier, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      // ignore
    }
  }

  public playCheckPoint() {
    if (!this.isStarted || !this.ctx) return;
    try {
      // Friendly retro chime high score/checkpoint sound
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5

      osc2.frequency.setValueAtTime(1046.50, this.ctx.currentTime + 0.08); // C6

      gain.gain.setValueAtTime(0.08 * this.volumeMultiplier, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 0.3);
      osc2.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      // ignore
    }
  }

  public stop() {
    try {
      if (this.ctx) {
        this.ctx.close();
      }
    } catch (e) {}
    this.isStarted = false;
  }
}
export const audioEngine = new DriftingAudioEngine();
