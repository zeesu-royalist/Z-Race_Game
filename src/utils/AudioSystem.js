// High performance Web Audio API procedural sound synthesizer for car racing
// Ultra-optimized, zero-latency dynamic engine, drift, turbo & crash audio

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.enabled = true;
    this.currentProfile = 'jdm_turbo';
    this.lastCategory = '';

    // Master Nodes
    this.masterGain = null;
    this.compressor = null;

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
    this.skidSqueal = null;

    // Nitro Nodes
    this.nitroGain = null;
    this.nitroNoise = null;
  }

  init() {
    if (this.initialized) {
      this.resume();
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master Output Chain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Dynamics Compressor (keeps audio loud, punchy and prevents digital clipping)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-8, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(20, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // --- 1. ENGINE SYNTHESIZER ---
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(650, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

      // Primary cylinder oscillator (sawtooth for aggressive engine growl)
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setValueAtTime(45, this.ctx.currentTime);

      // Secondary harmonic oscillator (mechanical grit)
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'triangle';
      this.osc2.frequency.setValueAtTime(90, this.ctx.currentTime);

      // Sub exhaust rumble (deep bass pressure)
      this.oscSub = this.ctx.createOscillator();
      this.oscSub.type = 'sine';
      this.oscSub.frequency.setValueAtTime(25, this.ctx.currentTime);

      const engineMix = this.ctx.createGain();
      engineMix.gain.setValueAtTime(0.85, this.ctx.currentTime);

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

      // White noise buffer for asphalt tire friction
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
      this.skidSqueal.frequency.setValueAtTime(850, this.ctx.currentTime);

      const squealGain = this.ctx.createGain();
      squealGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
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
      nitroFilter.frequency.setValueAtTime(2500, this.ctx.currentTime);

      nitroNoiseSource.connect(nitroFilter);
      nitroFilter.connect(this.nitroGain);
      this.nitroGain.connect(this.compressor);
      nitroNoiseSource.start();

      this.initialized = true;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  resume() {
    if (!this.initialized) {
      this.init();
      return;
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setProfile(category = '') {
    if (this.lastCategory === category) return;
    this.lastCategory = category;
    const cat = (category || '').toLowerCase();
    if (cat.includes('ev') || cat.includes('electric')) {
      this.currentProfile = 'ev';
    } else if (cat.includes('muscle')) {
      this.currentProfile = 'v8_muscle';
    } else if (cat.includes('scuderia') || cat.includes('vision') || cat.includes('ferrari') || cat.includes('lamborghini')) {
      this.currentProfile = 'v12_screamer';
    } else if (cat.includes('w16') || cat.includes('bugatti') || cat.includes('titan')) {
      this.currentProfile = 'w16_quad';
    } else {
      this.currentProfile = 'jdm_turbo';
    }
  }

  updateEngine(rpm, throttle, speedKmH, category = '') {
    if (!this.initialized) {
      this.init();
    }
    if (!this.enabled || !this.ctx) {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (category && category !== this.lastCategory) {
      this.setProfile(category);
    }

    const normRPM = Math.max(0, Math.min(1, (rpm - 900) / 7100));
    const t = this.ctx.currentTime;

    // Distinct Procedural Sound Profiles
    if (this.currentProfile === 'ev') {
      // Futuristic High-Pitch Electric Turbine Whine
      const evFreq = 110 + normRPM * 720;
      this.osc1.type = 'sine';
      this.osc1.frequency.setTargetAtTime(evFreq, t, 0.05);
      this.osc2.frequency.setTargetAtTime(evFreq * 2.0, t, 0.05);
      this.oscSub.frequency.setTargetAtTime(evFreq * 0.5, t, 0.05);

      const filterFreq = 900 + normRPM * 2800;
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);

      const targetGain = 0.22 + (throttle ? 0.32 : 0.08) + normRPM * 0.25;
      this.engineGain.gain.setTargetAtTime(targetGain, t, 0.05);
    } else if (this.currentProfile === 'v8_muscle') {
      // Deep Throaty American V8 Rumble
      const v8Freq = 26 + normRPM * 185;
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setTargetAtTime(v8Freq, t, 0.05);
      this.osc2.frequency.setTargetAtTime(v8Freq * 1.5, t, 0.05);
      this.oscSub.frequency.setTargetAtTime(v8Freq * 0.5, t, 0.05);

      const filterFreq = 350 + normRPM * 1800 + (throttle ? 900 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);

      const targetGain = 0.30 + (throttle ? 0.38 : 0.12) + normRPM * 0.28;
      this.engineGain.gain.setTargetAtTime(targetGain, t, 0.05);
    } else if (this.currentProfile === 'v12_screamer') {
      // High-Revving Screaming Italian V12 / V10
      const v12Freq = 42 + normRPM * 320;
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setTargetAtTime(v12Freq, t, 0.05);
      this.osc2.frequency.setTargetAtTime(v12Freq * 1.5, t, 0.05);
      this.oscSub.frequency.setTargetAtTime(v12Freq * 0.5, t, 0.05);

      const filterFreq = 500 + normRPM * 3000 + (throttle ? 1200 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);

      const targetGain = 0.28 + (throttle ? 0.36 : 0.10) + normRPM * 0.28;
      this.engineGain.gain.setTargetAtTime(targetGain, t, 0.05);
    } else if (this.currentProfile === 'w16_quad') {
      // Massive Quad-Turbo W16 Roar
      const w16Freq = 30 + normRPM * 240;
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setTargetAtTime(w16Freq, t, 0.05);
      this.osc2.frequency.setTargetAtTime(w16Freq * 1.6, t, 0.05);
      this.oscSub.frequency.setTargetAtTime(w16Freq * 0.5, t, 0.05);

      const filterFreq = 400 + normRPM * 2400 + (throttle ? 1100 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);

      const targetGain = 0.30 + (throttle ? 0.38 : 0.12) + normRPM * 0.28;
      this.engineGain.gain.setTargetAtTime(targetGain, t, 0.05);
    } else {
      // JDM Twin-Turbo / GT3 Racing Engine
      const baseFreq = 32 + normRPM * 220;
      this.osc1.type = 'sawtooth';
      this.osc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
      this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.05);
      this.oscSub.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);

      const filterFreq = 380 + normRPM * 2200 + (throttle ? 1000 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);

      const targetGain = 0.28 + (throttle ? 0.35 : 0.10) + normRPM * 0.26;
      this.engineGain.gain.setTargetAtTime(targetGain, t, 0.05);
    }
  }

  updateDrift(isDrifting, driftIntensity) {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const targetGain = isDrifting ? Math.min(0.40, driftIntensity * 0.40) : 0.0;
    this.skidGain.gain.setTargetAtTime(targetGain, t, 0.05);

    if (isDrifting && this.skidSqueal) {
      const squealPitch = 700 + Math.random() * 400;
      this.skidSqueal.frequency.setTargetAtTime(squealPitch, t, 0.08);
    }
  }

  updateNitro(isActive) {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.nitroGain.gain.setTargetAtTime(isActive ? 0.35 : 0.0, t, 0.08);
  }

  playGearShift() {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Turbo blowoff "whoosh" sound
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch (e) {}
  }

  playCrash(intensity = 1.0) {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.25);

      const impactVol = Math.min(0.55, 0.25 * intensity);
      gain.gain.setValueAtTime(impactVol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(t);
      osc.stop(t + 0.3);
    } catch (e) {}
  }

  playCountdown(count) {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const isGo = count === 0;

      osc.type = isGo ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, t);

      gain.gain.setValueAtTime(isGo ? 0.35 : 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.35 : 0.15));

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(t);
      osc.stop(t + (isGo ? 0.35 : 0.15));
    } catch (e) {}
  }

  playCheckpoint() {
    if (!this.initialized || !this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // High chime chord
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);

        gain.gain.setValueAtTime(0.18, t + idx * 0.05);
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
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(val ? 1.0 : 0.0, this.ctx.currentTime, 0.03);
    }
    if (val) {
      this.resume();
    }
  }
}

export const soundManager = new SoundSystem();
