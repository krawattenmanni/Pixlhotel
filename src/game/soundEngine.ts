class PixlHotelSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private inGame = false;
  private traxTimer: ReturnType<typeof setInterval> | null = null;
  private traxStep = 0;
  private activeTraxIndex: number | null = null;

  private ensureContext(): AudioContext | null {
    if (this.muted || !this.inGame || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
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
    if (mute) {
      this.stopTrax();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
    delay = 0,
    freqEnd?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playFilteredNoise(duration: number, centerFreq: number, gainPeak: number, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  playClick() {
    this.playTone(540, 0.065, 'triangle', 0.09, 0, 720);
    this.playFilteredNoise(0.025, 1800, 0.03);
  }

  playFootstep() {
    this.playFilteredNoise(0.035, 650 + Math.random() * 180, 0.025);
  }

  playChatBlip() {
    const pitch = 680 + Math.random() * 140;
    this.playTone(pitch, 0.075, 'triangle', 0.08, 0, pitch * 1.28);
    this.playTone(pitch * 1.5, 0.06, 'sine', 0.04, 0.02);
  }

  playCreditChime() {
    const notes = [880, 1174.66, 1567.98, 2093];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.16, 'triangle', 0.09, idx * 0.055);
      this.playTone(n * 2, 0.12, 'sine', 0.035, idx * 0.055);
    });
  }

  playFurniPlace() {
    this.playTone(180, 0.11, 'triangle', 0.14, 0, 95);
    this.playFilteredNoise(0.05, 420, 0.05);
  }

  playFurniPickup() {
    this.playTone(280, 0.1, 'triangle', 0.09, 0, 520);
  }

  playDiceRoll() {
    for (let i = 0; i < 4; i++) {
      this.playTone(420 + i * 110, 0.045, 'square', 0.035, i * 0.05);
    }
    this.playTone(987.77, 0.18, 'triangle', 0.09, 0.22);
  }

  playDragonFlame() {
    this.playFilteredNoise(0.32, 520, 0.11);
    this.playTone(190, 0.28, 'sawtooth', 0.05, 0, 95);
  }

  playEnterHotel() {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, idx) => {
      this.playTone(f, 0.24, 'triangle', 0.08, idx * 0.07);
    });
  }

  playError() {
    this.playTone(240, 0.14, 'sawtooth', 0.06, 0, 160);
  }

  playRespectFanfare() {
    const notes = [587.33, 783.99, 987.77, 1174.66];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.18, 'triangle', 0.085, idx * 0.06);
    });
  }

  playSplash() {
    this.playFilteredNoise(0.38, 780, 0.14, 0);
    this.playFilteredNoise(0.26, 1450, 0.09, 0.06);
    this.playTone(320, 0.18, 'sine', 0.08, 0, 130);
    this.playTone(540, 0.12, 'triangle', 0.04, 0.08, 920);
  }

  startTrax(trackIndex: number) {
    this.stopTrax();
    if (!this.inGame || this.muted) return;
    this.activeTraxIndex = trackIndex;
    this.traxStep = 0;

    const melodies: number[][] = [
      // Track 0: Sunset Club Mammoth (Upbeat Synth Groove)
      [523.25, 659.25, 783.99, 659.25, 587.33, 783.99, 880.0, 783.99],
      // Track 1: Battle Banzai Electro (Arcade Bassline)
      [329.63, 329.63, 440.0, 493.88, 523.25, 493.88, 440.0, 392.0],
      // Track 2: Cozy Lobby Bossa (Warm Chords)
      [440.0, 554.37, 659.25, 554.37, 493.88, 622.25, 739.99, 622.25],
    ];
    const pattern = melodies[trackIndex % melodies.length];

    const playStep = () => {
      if (!this.inGame || this.muted || this.activeTraxIndex === null) {
        this.stopTrax();
        return;
      }
      const freq = pattern[this.traxStep % pattern.length];
      this.playTone(freq, 0.19, 'triangle', 0.045);
      if (this.traxStep % 2 === 0) {
        this.playTone(freq * 0.5, 0.14, 'sine', 0.035);
      }
      this.traxStep = (this.traxStep + 1) % pattern.length;
    };

    playStep();
    this.traxTimer = setInterval(playStep, 280);
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
}

export const soundEngine = new PixlHotelSoundEngine();
