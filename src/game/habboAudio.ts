export type ChatPopMode = 'say' | 'shout' | 'whisper';

interface RhodesChordStep {
  bass: number | null;
  chord: number[] | null;
  accent?: boolean;
}

class HabboAudioEngine {
  private ctx: AudioContext | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private inGame = false;
  private hasUserGesture = false;
  private gestureListenerAttached = false;
  private readonly defaultVolume = 0.22;

  private traxTimer: ReturnType<typeof setInterval> | null = null;
  private traxStep = 0;
  private activeTraxIndex: number | null = null;

  private attachGestureUnlock() {
    if (this.gestureListenerAttached || typeof window === 'undefined') return;
    this.gestureListenerAttached = true;
    const markUnlocked = () => {
      this.hasUserGesture = true;
      if (this.ctx && this.ctx.state === 'suspended' && !this.muted && this.inGame) {
        this.ctx.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', markUnlocked, { capture: true, passive: true });
    window.addEventListener('keydown', markUnlocked, { capture: true, passive: true });
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || !this.inGame || typeof window === 'undefined') return null;
    this.attachGestureUnlock();

    const userActivated =
      this.hasUserGesture ||
      Boolean((navigator as unknown as { userActivation?: { hasBeenActive?: boolean } })?.userActivation?.hasBeenActive);
    if (!userActivated) return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.masterFilter || !this.masterCompressor || !this.masterGain) {
      const ctx = this.ctx;
      const warmthFilter = ctx.createBiquadFilter();
      warmthFilter.type = 'lowpass';
      warmthFilter.frequency.setValueAtTime(3800, ctx.currentTime);
      warmthFilter.Q.setValueAtTime(0.65, ctx.currentTime);

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-16, ctx.currentTime);
      comp.knee.setValueAtTime(18, ctx.currentTime);
      comp.ratio.setValueAtTime(3, ctx.currentTime);
      comp.attack.setValueAtTime(0.004, ctx.currentTime);
      comp.release.setValueAtTime(0.14, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.muted ? 0 : this.defaultVolume, ctx.currentTime);

      warmthFilter.connect(comp);
      comp.connect(gain);
      gain.connect(ctx.destination);

      this.masterFilter = warmthFilter;
      this.masterCompressor = comp;
      this.masterGain = gain;
    }

    return this.ctx;
  }

  private getOutputNode(): AudioNode | null {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterFilter) return null;
    return this.masterFilter;
  }

  private getWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.whiteNoiseBuffer && this.whiteNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.whiteNoiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 1.0);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = buffer;
    return buffer;
  }

  private getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.pinkNoiseBuffer && this.pinkNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.pinkNoiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 1.0);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.pinkNoiseBuffer = buffer;
    return buffer;
  }

  private playNoiseBurst(opts: {
    kind?: 'white' | 'pink';
    duration: number;
    filterType: BiquadFilterType;
    freqStart: number;
    freqEnd?: number;
    q?: number;
    gainPeak: number;
    attack?: number;
    delay?: number;
  }) {
    const ctx = this.ensureContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime + (opts.delay ?? 0);
    const buffer =
      opts.kind === 'white' ? this.getWhiteNoiseBuffer(ctx) : this.getPinkNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const offset = Math.random() * Math.max(0.05, buffer.duration - opts.duration - 0.02);

    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType;
    filter.frequency.setValueAtTime(opts.freqStart, now);
    if (opts.freqEnd !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freqEnd), now + opts.duration);
    }
    filter.Q.setValueAtTime(opts.q ?? 1.4, now);

    const gain = ctx.createGain();
    const attack = Math.min(opts.attack ?? 0.004, opts.duration * 0.35);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(opts.gainPeak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    src.start(now, offset, opts.duration + 0.02);
  }

  private playFilteredTransient(opts: {
    freqStart: number;
    freqEnd?: number;
    duration: number;
    gainPeak: number;
    cutoff?: number;
    q?: number;
    delay?: number;
    attack?: number;
  }) {
    const ctx = this.ensureContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(opts.freqStart, now);
    if (opts.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(35, opts.freqEnd), now + opts.duration);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(opts.cutoff ?? 1600, now);
    filter.Q.setValueAtTime(opts.q ?? 1.2, now);

    const gain = ctx.createGain();
    const attack = Math.min(opts.attack ?? 0.003, opts.duration * 0.3);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(opts.gainPeak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + opts.duration + 0.02);
  }

  setInGame(inGame: boolean) {
    this.inGame = inGame;
    if (!inGame) {
      this.stopTrax();
    }
  }

  isInGame(): boolean {
    return this.inGame;
  }

  setMuted(mute: boolean) {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        mute ? 0 : this.defaultVolume,
        this.ctx.currentTime,
        0.015
      );
    }
    if (mute) {
      this.stopTrax();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  // 1. Speech Bubble Pop (say / shout / whisper)
  playChatPop(mode: ChatPopMode = 'say') {
    if (mode === 'whisper') {
      // Soft 40ms bandpass breath/paper rustle (1800Hz) + tiny soft click
      this.playNoiseBurst({
        kind: 'pink',
        duration: 0.04,
        filterType: 'bandpass',
        freqStart: 1800,
        freqEnd: 1350,
        q: 2.3,
        gainPeak: 0.16,
        attack: 0.006,
      });
      this.playNoiseBurst({
        kind: 'white',
        duration: 0.008,
        filterType: 'bandpass',
        freqStart: 1250,
        q: 2.8,
        gainPeak: 0.07,
        attack: 0.001,
      });
      return;
    }

    if (mode === 'shout') {
      // Crisp double-pop (25ms + 30ms slightly higher) with snappy punch
      this.playFilteredTransient({
        freqStart: 340,
        freqEnd: 720,
        duration: 0.025,
        gainPeak: 0.24,
        cutoff: 1300,
        q: 2.2,
        attack: 0.002,
      });
      this.playNoiseBurst({
        kind: 'pink',
        duration: 0.016,
        filterType: 'bandpass',
        freqStart: 880,
        q: 3.2,
        gainPeak: 0.12,
        attack: 0.001,
      });
      this.playFilteredTransient({
        freqStart: 430,
        freqEnd: 880,
        duration: 0.03,
        gainPeak: 0.28,
        cutoff: 1500,
        q: 2.4,
        delay: 0.038,
        attack: 0.002,
      });
      this.playNoiseBurst({
        kind: 'pink',
        duration: 0.018,
        filterType: 'bandpass',
        freqStart: 1050,
        q: 3.0,
        gainPeak: 0.14,
        delay: 0.038,
        attack: 0.001,
      });
      return;
    }

    // 'say': Iconic 28ms warm triangle-to-filtered-noise transient sweeping 320Hz -> 680Hz, zero sustain tail
    this.playFilteredTransient({
      freqStart: 320,
      freqEnd: 680,
      duration: 0.028,
      gainPeak: 0.26,
      cutoff: 1180,
      q: 2.4,
      attack: 0.002,
    });
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.018,
      filterType: 'bandpass',
      freqStart: 760,
      freqEnd: 1120,
      q: 3.4,
      gainPeak: 0.11,
      attack: 0.001,
    });
  }

  // 2. Friend List / Console Ping (Warm wooden marimba/xylophone D5 -> A5 knock)
  playConsoleMessage() {
    const playMarimbaKnock = (freq: number, delay: number, peak: number) => {
      // Damped fundamental (80ms exponential decay)
      this.playFilteredTransient({
        freqStart: freq,
        duration: 0.08,
        gainPeak: peak,
        cutoff: 2400,
        q: 1.1,
        delay,
        attack: 0.002,
      });
      // 4th harmonic wooden overtone (24ms crisp wood snap)
      this.playFilteredTransient({
        freqStart: freq * 4,
        duration: 0.024,
        gainPeak: peak * 0.28,
        cutoff: 3200,
        q: 0.9,
        delay,
        attack: 0.001,
      });
      // Soft mallet impact noise
      this.playNoiseBurst({
        kind: 'white',
        duration: 0.008,
        filterType: 'bandpass',
        freqStart: 1650,
        q: 2.2,
        gainPeak: peak * 0.25,
        delay,
        attack: 0.001,
      });
    };

    playMarimbaKnock(587.33, 0, 0.26); // D5
    playMarimbaKnock(880.0, 0.075, 0.29); // A5
  }

  // 3. Metallic Coin Clink (Catalogue buy, Trade confirm, Badges/Credits)
  playCoinsPurchase() {
    const ctx = this.ensureContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const triggerClink = (partials: number[], delay: number, ampScale: number) => {
      const now = ctx.currentTime + delay;
      partials.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(freq, now);
        bp.Q.setValueAtTime(6.0, now);

        const gain = ctx.createGain();
        const dur = 0.13 - idx * 0.014;
        const peak = (0.11 - idx * 0.018) * ampScale;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(peak, now + 0.0015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(bp);
        bp.connect(gain);
        gain.connect(out);

        osc.start(now);
        osc.stop(now + dur + 0.02);
      });

      // 12ms crisp transient metallic click
      this.playNoiseBurst({
        kind: 'white',
        duration: 0.012,
        filterType: 'bandpass',
        freqStart: 3100,
        q: 2.0,
        gainPeak: 0.14 * ampScale,
        delay,
        attack: 0.001,
      });
    };

    triggerClink([2340, 3580, 4910, 6420], 0, 1.0);
    triggerClink([2480, 3790, 5150, 6680], 0.055, 0.62);
  }

  // 4. UI Micro-Click & Window Open/Close Thump
  playUiClick() {
    // 9ms crisp wooden/mechanical mouse-switch micro-click (zero musical pitch)
    this.playNoiseBurst({
      kind: 'white',
      duration: 0.009,
      filterType: 'bandpass',
      freqStart: 1400,
      q: 3.2,
      gainPeak: 0.19,
      attack: 0.001,
    });
  }

  playWindowToggle(open: boolean) {
    // Soft 35ms low-end card/drawer thump
    this.playFilteredTransient({
      freqStart: open ? 160 : 130,
      freqEnd: open ? 95 : 75,
      duration: 0.035,
      gainPeak: 0.24,
      cutoff: 320,
      q: 1.1,
      attack: 0.002,
    });
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.024,
      filterType: 'bandpass',
      freqStart: open ? 560 : 420,
      freqEnd: open ? 820 : 290,
      q: 1.6,
      gainPeak: 0.09,
      attack: 0.002,
    });
  }

  // 5. Furniture Placement & Rotation (Tactile cardboard/wooden box foley)
  playFurniPlace() {
    // 55ms damped low-mid body (135Hz -> 58Hz) + 22ms lowpass filtered noise scuff (900Hz)
    this.playFilteredTransient({
      freqStart: 135,
      freqEnd: 58,
      duration: 0.055,
      gainPeak: 0.36,
      cutoff: 340,
      q: 1.2,
      attack: 0.002,
    });
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.022,
      filterType: 'lowpass',
      freqStart: 900,
      freqEnd: 460,
      q: 1.1,
      gainPeak: 0.2,
      attack: 0.001,
    });
  }

  playFurniRotate() {
    this.playFilteredTransient({
      freqStart: 168,
      freqEnd: 78,
      duration: 0.042,
      gainPeak: 0.26,
      cutoff: 420,
      q: 1.3,
      attack: 0.002,
    });
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.018,
      filterType: 'lowpass',
      freqStart: 1120,
      freqEnd: 620,
      q: 1.2,
      gainPeak: 0.14,
      attack: 0.001,
    });
  }

  playFurniPickup() {
    this.playFilteredTransient({
      freqStart: 105,
      freqEnd: 175,
      duration: 0.045,
      gainPeak: 0.24,
      cutoff: 450,
      q: 1.1,
      attack: 0.002,
    });
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.02,
      filterType: 'bandpass',
      freqStart: 980,
      freqEnd: 1350,
      q: 1.8,
      gainPeak: 0.11,
      attack: 0.001,
    });
  }

  // 6. Lido Pool Dive Splash, Water Wade Step & Soft Footstep
  playDiveSplash() {
    // 380ms pink-noise water splash with resonant lowpass sweep (1600Hz -> 280Hz) + bubbly sub-thump
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.38,
      filterType: 'lowpass',
      freqStart: 1600,
      freqEnd: 280,
      q: 2.3,
      gainPeak: 0.34,
      attack: 0.008,
    });
    this.playFilteredTransient({
      freqStart: 155,
      freqEnd: 52,
      duration: 0.11,
      gainPeak: 0.28,
      cutoff: 320,
      q: 1.5,
      attack: 0.003,
    });
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.22,
      filterType: 'bandpass',
      freqStart: 1850,
      freqEnd: 640,
      q: 2.0,
      gainPeak: 0.16,
      delay: 0.085,
      attack: 0.01,
    });
  }

  playWaterStep() {
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.075,
      filterType: 'bandpass',
      freqStart: 1100,
      freqEnd: 420,
      q: 1.9,
      gainPeak: 0.095,
      attack: 0.005,
    });
    this.playFilteredTransient({
      freqStart: 390,
      freqEnd: 640,
      duration: 0.024,
      gainPeak: 0.045,
      cutoff: 950,
      q: 2.0,
      delay: 0.012,
      attack: 0.002,
    });
  }

  playStep() {
    // Ultra-quiet 10ms soft muffled floor tap (gain: 0.03, 600Hz low-pass)
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.01,
      filterType: 'lowpass',
      freqStart: 600,
      q: 1.0,
      gainPeak: 0.03,
      attack: 0.001,
    });
  }

  // 7. Holo Dice Roll & Imperial Teleporter
  playDiceRoll() {
    // 3 rapid 18ms wooden rattle clicks spaced 35ms apart
    [0, 0.035, 0.07].forEach((delay, idx) => {
      this.playNoiseBurst({
        kind: 'white',
        duration: 0.018,
        filterType: 'bandpass',
        freqStart: 1650 + idx * 180,
        q: 3.4,
        gainPeak: 0.18,
        delay,
        attack: 0.001,
      });
      this.playFilteredTransient({
        freqStart: 360 + idx * 45,
        freqEnd: 190,
        duration: 0.015,
        gainPeak: 0.16,
        cutoff: 1200,
        q: 1.4,
        delay,
        attack: 0.001,
      });
    });
    // Soft final wood settle
    this.playFilteredTransient({
      freqStart: 520,
      freqEnd: 310,
      duration: 0.022,
      gainPeak: 0.12,
      cutoff: 1100,
      delay: 0.12,
      attack: 0.001,
    });
  }

  playTeleporter() {
    // Retro sci-fi booth hum/whoosh (180Hz -> 520Hz -> 240Hz warm filtered sweep over 320ms)
    const ctx = this.ensureContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const dur = 0.32;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(150, now + dur);

    const sub = ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(70, now);
    sub.frequency.exponentialRampToValueAtTime(130, now + 0.15);
    sub.frequency.exponentialRampToValueAtTime(75, now + dur);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(180, now);
    bp.frequency.exponentialRampToValueAtTime(520, now + 0.15);
    bp.frequency.exponentialRampToValueAtTime(240, now + dur);
    bp.Q.setValueAtTime(3.6, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(bp);
    sub.connect(bp);
    bp.connect(gain);
    gain.connect(out);

    osc.start(now);
    sub.start(now);
    osc.stop(now + dur + 0.02);
    sub.stop(now + dur + 0.02);

    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.28,
      filterType: 'bandpass',
      freqStart: 320,
      freqEnd: 880,
      q: 2.2,
      gainPeak: 0.14,
      attack: 0.03,
    });
  }

  playDragonFlame() {
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.28,
      filterType: 'lowpass',
      freqStart: 780,
      freqEnd: 240,
      q: 1.8,
      gainPeak: 0.26,
      attack: 0.015,
    });
    this.playFilteredTransient({
      freqStart: 120,
      freqEnd: 65,
      duration: 0.22,
      gainPeak: 0.18,
      cutoff: 280,
      q: 1.5,
      attack: 0.01,
    });
  }

  playEnterHotel() {
    // Warm 2000s Habbo lobby Rhodes chord swell
    const chord = [349.23, 440.0, 523.25, 659.25];
    chord.forEach((f, idx) => {
      this.playRhodesNote(f, 0.34, 0.12, idx * 0.045);
    });
  }

  playRespectFanfare() {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((n, idx) => {
      this.playFilteredTransient({
        freqStart: n,
        duration: 0.11,
        gainPeak: 0.2,
        cutoff: 2400,
        delay: idx * 0.065,
        attack: 0.002,
      });
      this.playFilteredTransient({
        freqStart: n * 4,
        duration: 0.026,
        gainPeak: 0.055,
        cutoff: 3200,
        delay: idx * 0.065,
        attack: 0.001,
      });
    });
  }

  playError() {
    // Soft muted wooden thud (never a harsh buzzer)
    this.playFilteredTransient({
      freqStart: 145,
      freqEnd: 88,
      duration: 0.065,
      gainPeak: 0.22,
      cutoff: 360,
      q: 1.3,
      attack: 0.002,
    });
    this.playNoiseBurst({
      kind: 'pink',
      duration: 0.024,
      filterType: 'lowpass',
      freqStart: 520,
      q: 1.0,
      gainPeak: 0.08,
      attack: 0.002,
    });
  }

  // Rhodes Electric Piano & Muted Slap-Bass helpers for Trax
  private playRhodesNote(freq: number, duration: number, peak: number, delay = 0) {
    const ctx = this.ensureContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime + delay;
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    // Subtle bell tine overtone
    const tine = ctx.createOscillator();
    tine.type = 'triangle';
    tine.frequency.setValueAtTime(freq * 2, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1950, now);
    filter.frequency.exponentialRampToValueAtTime(920, now + duration);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(peak, now + 0.008);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const tineGain = ctx.createGain();
    tineGain.gain.setValueAtTime(0.0001, now);
    tineGain.gain.linearRampToValueAtTime(peak * 0.34, now + 0.003);
    tineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc1.connect(bodyGain);
    tine.connect(tineGain);
    bodyGain.connect(filter);
    tineGain.connect(filter);
    filter.connect(out);

    osc1.start(now);
    tine.start(now);
    osc1.stop(now + duration + 0.02);
    tine.stop(now + 0.08);
  }

  private playSlapBass(freq: number, duration = 0.14) {
    const ctx = this.ensureContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(720, now);
    filter.frequency.exponentialRampToValueAtTime(210, now + 0.09);
    filter.Q.setValueAtTime(2.6, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // 8. Chill 98 BPM 2000s Habbo Lounge Trax Loop (Rhodes + Slap-Bass + Soft Noise Hi-Hat)
  toggleTraxMusic(trackIndex?: number | null): number | null {
    if (trackIndex === null) {
      this.stopTrax();
      return null;
    }
    const target = trackIndex ?? 0;
    if (this.activeTraxIndex === target) {
      this.stopTrax();
      return null;
    }
    this.startTrax(target);
    return this.activeTraxIndex;
  }

  startTrax(trackIndex: number) {
    this.stopTrax();
    if (!this.inGame || this.muted) return;
    this.activeTraxIndex = trackIndex;
    this.traxStep = 0;

    // 98 BPM 16th-note lounge progressions (32 steps = 2 bars)
    const grooves: RhodesChordStep[][] = [
      // Track 0: Sunset Club Mammoth (Warm Rhodes Neo-Soul Groove)
      [
        { bass: 130.81, chord: [261.63, 329.63, 392.0, 493.88], accent: true }, // Cmaj7
        { bass: null, chord: null },
        { bass: null, chord: null },
        { bass: 130.81, chord: null },
        { bass: null, chord: [261.63, 329.63, 392.0, 493.88] },
        { bass: null, chord: null },
        { bass: 196.0, chord: null },
        { bass: null, chord: null },
        { bass: 110.0, chord: [220.0, 261.63, 329.63, 392.0], accent: true }, // Am7
        { bass: null, chord: null },
        { bass: null, chord: null },
        { bass: 110.0, chord: null },
        { bass: null, chord: [220.0, 261.63, 329.63, 392.0] },
        { bass: null, chord: null },
        { bass: 164.81, chord: null },
        { bass: null, chord: null },
        { bass: 146.83, chord: [261.63, 329.63, 349.23, 440.0], accent: true }, // Dm9
        { bass: null, chord: null },
        { bass: null, chord: null },
        { bass: 146.83, chord: null },
        { bass: null, chord: [261.63, 329.63, 349.23, 440.0] },
        { bass: null, chord: null },
        { bass: 174.61, chord: null },
        { bass: null, chord: null },
        { bass: 98.0, chord: [246.94, 293.66, 349.23, 440.0], accent: true }, // G13
        { bass: null, chord: null },
        { bass: null, chord: null },
        { bass: 196.0, chord: null },
        { bass: null, chord: [246.94, 293.66, 349.23, 440.0] },
        { bass: null, chord: null },
        { bass: 146.83, chord: null },
        { bass: null, chord: null },
      ],
      // Track 1: Battle Banzai Lounge (Syncopated Slap-Bass & Fender Rhodes)
      [
        { bass: 110.0, chord: [220.0, 261.63, 329.63, 392.0], accent: true },
        { bass: null, chord: null },
        { bass: 220.0, chord: null },
        { bass: null, chord: [220.0, 261.63, 329.63, 392.0] },
        { bass: null, chord: null },
        { bass: 164.81, chord: null },
        { bass: 196.0, chord: [246.94, 293.66, 392.0] },
        { bass: null, chord: null },
        { bass: 146.83, chord: [261.63, 329.63, 349.23, 440.0], accent: true },
        { bass: null, chord: null },
        { bass: 293.66, chord: null },
        { bass: null, chord: [261.63, 329.63, 349.23, 440.0] },
        { bass: null, chord: null },
        { bass: 196.0, chord: null },
        { bass: 164.81, chord: null },
        { bass: null, chord: null },
      ],
      // Track 2: Cozy Welcome Lobby (Chill Pixel Bossa)
      [
        { bass: 174.61, chord: [261.63, 329.63, 349.23, 440.0], accent: true }, // Fmaj7
        { bass: null, chord: null },
        { bass: null, chord: [261.63, 329.63, 349.23, 440.0] },
        { bass: 130.81, chord: null },
        { bass: null, chord: null },
        { bass: null, chord: [261.63, 329.63, 349.23, 440.0] },
        { bass: 174.61, chord: null },
        { bass: null, chord: null },
        { bass: 196.0, chord: [246.94, 293.66, 349.23, 440.0], accent: true }, // G13
        { bass: null, chord: null },
        { bass: null, chord: [246.94, 293.66, 349.23, 440.0] },
        { bass: 146.83, chord: null },
        { bass: null, chord: null },
        { bass: null, chord: [246.94, 293.66, 349.23, 440.0] },
        { bass: 196.0, chord: null },
        { bass: null, chord: null },
      ],
    ];

    const groove = grooves[trackIndex % grooves.length];
    const stepMs = Math.round(60000 / 98 / 4); // ~153ms at 98 BPM

    const playStep = () => {
      if (!this.inGame || this.muted || this.activeTraxIndex === null) {
        this.stopTrax();
        return;
      }

      const stepIdx = this.traxStep % groove.length;
      const barStep = stepIdx % 16;
      const ev = groove[stepIdx];

      // Soft brushed noise hi-hat on 8th notes
      if (barStep % 2 === 0) {
        this.playNoiseBurst({
          kind: 'pink',
          duration: 0.016,
          filterType: 'bandpass',
          freqStart: 4800,
          q: 2.2,
          gainPeak: barStep % 4 === 2 ? 0.032 : 0.018,
          attack: 0.001,
        });
      }

      // Subtle rim/kick cushion on 1 & 9 / 4 & 12
      if (barStep === 0 || barStep === 8) {
        this.playFilteredTransient({
          freqStart: 95,
          freqEnd: 46,
          duration: 0.055,
          gainPeak: 0.14,
          cutoff: 220,
          attack: 0.002,
        });
      } else if (barStep === 4 || barStep === 12) {
        this.playNoiseBurst({
          kind: 'pink',
          duration: 0.018,
          filterType: 'bandpass',
          freqStart: 880,
          q: 3.0,
          gainPeak: 0.055,
          attack: 0.001,
        });
      }

      if (ev.bass) {
        this.playSlapBass(ev.bass, 0.15);
      }

      if (ev.chord) {
        ev.chord.forEach((n, idx) => {
          this.playRhodesNote(n, ev.accent ? 0.34 : 0.22, ev.accent ? 0.058 : 0.044, idx * 0.012);
        });
      }

      this.traxStep = (this.traxStep + 1) % groove.length;
    };

    playStep();
    this.traxTimer = setInterval(playStep, stepMs);
  }

  stopTrax() {
    if (this.traxTimer) {
      clearInterval(this.traxTimer);
      this.traxTimer = null;
    }
    this.activeTraxIndex = null;
  }

  getActiveTrax(): number | null {
    return this.activeTraxIndex;
  }

  // Compatibility aliases so existing callers/tests map cleanly onto the new foley engine
  playClick() {
    this.playUiClick();
  }

  playFootstep() {
    this.playStep();
  }

  playChatBlip(mode: ChatPopMode = 'say') {
    this.playChatPop(mode);
  }

  playCreditChime() {
    this.playCoinsPurchase();
  }

  playSplash() {
    this.playDiveSplash();
  }
}

export const habboAudio = new HabboAudioEngine();
