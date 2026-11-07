// High performance Web Audio API procedural sound synthesizer for car racing

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.enabled = true;

    // Engine Nodes
    this.engineGain = null;
    this.osc1 = null;
    this.osc2 = null;
    this.oscSub = null;
    this.engineFilter = null;
    
    // Tire Skid Nodes
    this.skidGain = null;
    this.skidNoise = null;
    this.skidFilter = null;

    // Nitro Nodes
    this.nitroGain = null;
    this.nitroNoise = null;

    // Wind / Speed Rush
    this.windGain = null;
    this.windFilter = null;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Compressor to prevent clipping and give beefy gaming sound
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // --- 1. ENGINE SYNTHESIZER ---
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(600, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      // Primary cylinder oscillator (sawtooth for aggressive engine growl)
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setValueAtTime(45, this.ctx.currentTime);

      // Secondary harmonic oscillator
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'triangle';
      this.osc2.frequency.setValueAtTime(90, this.ctx.currentTime);

      // Sub rumble
      this.oscSub = this.ctx.createOscillator();
      this.oscSub.type = 'sine';
      this.oscSub.frequency.setValueAtTime(22.5, this.ctx.currentTime);

      // Connect engine
      const engineMix = this.ctx.createGain();
      engineMix.gain.setValueAtTime(0.5, this.ctx.currentTime);

      this.osc1.connect(engineMix);
      this.osc2.connect(engineMix);
      this.oscSub.connect(engineMix);

      engineMix.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.compressor);

      this.osc1.start();
      this.osc2.start();
      this.oscSub.start();

      // --- 2. TIRE SKID / DRIFT SYNTHESIZER ---
      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      // White noise buffer for skid
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.skidNoise = this.ctx.createBufferSource();
      this.skidNoise.buffer = noiseBuffer;
      this.skidNoise.loop = true;

      this.skidFilter = this.ctx.createBiquadFilter();
      this.skidFilter.type = 'bandpass';
      this.skidFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.skidFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      // High pitch tire squeal oscillator
      this.skidSqueal = this.ctx.createOscillator();
      this.skidSqueal.type = 'sine';
      this.skidSqueal.frequency.setValueAtTime(800, this.ctx.currentTime);
      const squealGain = this.ctx.createGain();
      squealGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      this.skidSqueal.connect(squealGain);
      squealGain.connect(this.skidGain);

      this.skidNoise.connect(this.skidFilter);
      this.skidFilter.connect(this.skidGain);
      this.skidGain.connect(this.compressor);

      this.skidNoise.start();
      this.skidSqueal.start();

      // --- 3. NITRO BOOST SYNTHESIZER ---
      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      const nitroNoiseSource = this.ctx.createBufferSource();
      nitroNoiseSource.buffer = noiseBuffer;
      nitroNoiseSource.loop = true;

      const nitroFilter = this.ctx.createBiquadFilter();
      nitroFilter.type = 'lowpass';
      nitroFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);

      nitroNoiseSource.connect(nitroFilter);
      nitroFilter.connect(this.nitroGain);
      this.nitroGain.connect(this.compressor);
      nitroNoiseSource.start();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateEngine(rpm, throttle, speedKmH) {
    if (!this.initialized || !this.enabled) {
      if (this.engineGain) this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }
    this.resume();

    // Map RPM (900 - 8000) to base frequency (30Hz - 220Hz)
    const normRPM = Math.max(0, Math.min(1, (rpm - 900) / 7100));
    const baseFreq = 28 + normRPM * 190;

    const t = this.ctx.currentTime;
    this.osc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.05);
    this.oscSub.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);

    // Filter frequency opens up with throttle
    const filterFreq = 300 + normRPM * 1800 + (throttle ? 800 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);

    // Volume scales with throttle & RPM
    const targetGain = 0.12 + (throttle ? 0.14 : 0.04) + normRPM * 0.1;
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.05);
  }

  updateDrift(isDrifting, driftIntensity) {
    if (!this.initialized || !this.enabled) return;
    const t = this.ctx.currentTime;
    const targetGain = isDrifting ? Math.min(0.25, driftIntensity * 0.25) : 0.0;
    this.skidGain.gain.setTargetAtTime(targetGain, t, 0.05);

    if (isDrifting && this.skidSqueal) {
      const squealPitch = 700 + Math.random() * 400;
      this.skidSqueal.frequency.setTargetAtTime(squealPitch, t, 0.08);
    }
  }

  updateNitro(isActive) {
    if (!this.initialized || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.nitroGain.gain.setTargetAtTime(isActive ? 0.28 : 0.0, t, 0.08);
  }

  playGearShift() {
    if (!this.initialized || !this.enabled) return;
    try {
      const t = this.ctx.currentTime;
      // Turbo blowoff "whoosh" sound
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch (e) {}
  }

  playCrash(intensity = 1.0) {
    if (!this.initialized || !this.enabled) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

      const impactVol = Math.min(0.4, 0.15 * intensity);
      gain.gain.setValueAtTime(impactVol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(t);
      osc.stop(t + 0.3);
    } catch (e) {}
  }

  playCheckpoint() {
    if (!this.initialized || !this.enabled) return;
    try {
      const t = this.ctx.currentTime;
      // High chime chord
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);

        gain.gain.setValueAtTime(0.12, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.4);

        osc.connect(gain);
        gain.connect(this.compressor);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.4);
      });
    } catch (e) {}
  }

  setEnabled(val) {
    this.enabled = val;
    if (!val && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }
}

export const soundManager = new SoundSystem();

