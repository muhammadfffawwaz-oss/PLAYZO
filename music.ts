/**
 * Background Music Synthesizer Engine for PLAYZO
 * Produces upbeat, playful, royalty-free arcade gaming soundtrack in real-time.
 * Uses Web Audio API with zero external file dependencies - 100% reliable,
 * seamless loop, zero-latency, and works continuously across game switches.
 */

type Listener = () => void;

export interface TrackInfo {
  id: string;
  name: string;
  bpm: number;
  description: string;
}

export const TRACKS: TrackInfo[] = [
  {
    id: 'arcade-adventure',
    name: 'Playzo Arcade Rush',
    bpm: 124,
    description: 'Upbeat, bouncy retro gaming theme',
  },
  {
    id: 'pixel-playground',
    name: 'Pixel Playground',
    bpm: 118,
    description: 'Catchy chiptune melody with playful groove',
  },
  {
    id: 'cyber-chill',
    name: 'Cyber Horizon',
    bpm: 110,
    description: 'Warm synthwave chords for relaxed browsing',
  },
];

class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying = false;
  private isMuted = false;
  private volume = 0.45; // 0 to 1
  private currentTrackIndex = 0;
  private loopTimer: number | null = null;
  private step = 0;
  private listeners: Set<Listener> = new Set();
  private visualizerFreqs: number[] = [20, 45, 75, 55, 30];

  constructor() {
    this.loadPreferences();
  }

  private loadPreferences() {
    try {
      const raw = localStorage.getItem('playzo_music_pref');
      if (raw) {
        const pref = JSON.parse(raw);
        if (typeof pref.volume === 'number') this.volume = Math.max(0, Math.min(1, pref.volume));
        if (typeof pref.isMuted === 'boolean') this.isMuted = pref.isMuted;
        if (typeof pref.trackIndex === 'number') this.currentTrackIndex = pref.trackIndex % TRACKS.length;
      }
    } catch {}
  }

  private savePreferences() {
    try {
      localStorage.setItem(
        'playzo_music_pref',
        JSON.stringify({
          volume: this.volume,
          isMuted: this.isMuted,
          trackIndex: this.currentTrackIndex,
        })
      );
    } catch {}
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;

        this.masterGain = this.ctx.createGain();
        this.updateMasterVolume();

        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private updateMasterVolume() {
    if (!this.masterGain || !this.ctx) return;
    const effectiveVolume = this.isMuted ? 0 : this.volume * 0.35; // gentle default
    this.masterGain.gain.setValueAtTime(effectiveVolume, this.ctx.currentTime);
  }

  public subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentTrack(): TrackInfo {
    return TRACKS[this.currentTrackIndex];
  }

  public getVisualizerData(): number[] {
    if (!this.analyser || !this.isPlaying || this.isMuted) {
      return [4, 4, 4, 4, 4];
    }
    const data = new Uint8Array(5);
    this.analyser.getByteFrequencyData(data);
    return Array.from(data).map((v) => Math.max(8, Math.min(100, Math.floor((v / 255) * 100))));
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play() {
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.isPlaying) return;
    this.isPlaying = true;
    this.updateMasterVolume();
    this.startMusicLoop();
    this.notify();
  }

  public pause() {
    this.isPlaying = false;
    if (this.loopTimer !== null) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    this.notify();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.isMuted && this.volume > 0) {
      this.isMuted = false;
    }
    this.updateMasterVolume();
    this.savePreferences();
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.updateMasterVolume();
    this.savePreferences();
    this.notify();
  }

  public setTrack(index: number) {
    this.currentTrackIndex = (index + TRACKS.length) % TRACKS.length;
    this.step = 0;
    this.savePreferences();
    if (this.isPlaying) {
      if (this.loopTimer !== null) clearInterval(this.loopTimer);
      this.startMusicLoop();
    }
    this.notify();
  }

  public nextTrack() {
    this.setTrack(this.currentTrackIndex + 1);
  }

  /* Core Procedural Step Sequencer */
  private startMusicLoop() {
    if (this.loopTimer !== null) clearInterval(this.loopTimer);

    const track = TRACKS[this.currentTrackIndex];
    // 16th note interval in ms = (60,000 / BPM) / 4
    const intervalMs = Math.floor(60000 / track.bpm / 4);

    this.loopTimer = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.onTick();
      this.step = (this.step + 1) % 64; // 4-bar loop (16 steps per bar)
    }, intervalMs);
  }

  private onTick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const step = this.step;
    const track = this.currentTrackIndex;

    // Track 1: Playzo Arcade Rush (Energetic Major Pentatonic C - G - Am - F)
    if (track === 0) {
      this.tickTrackArcade(step, now);
    } else if (track === 1) {
      this.tickTrackPixel(step, now);
    } else {
      this.tickTrackChill(step, now);
    }
  }

  // TRACK 1: Upbeat Arcade Theme
  private tickTrackArcade(step: number, now: number) {
    const chordStep = Math.floor(step / 16); // 0=C, 1=G, 2=Am, 3=F

    // 1. Kick & Hihat Drum Beats
    if (step % 4 === 0) {
      this.playKick(now);
    }
    if (step % 2 === 1) {
      this.playHiHat(now);
    }
    if (step % 8 === 4) {
      this.playSnare(now);
    }

    // 2. Bouncing Bassline (Root octaves)
    if (step % 2 === 0) {
      const bassRoots = [130.81, 98.0, 110.0, 87.31]; // C3, G2, A2, F2
      const root = bassRoots[chordStep];
      const freq = step % 4 === 0 ? root : root * 1.5;
      this.playTone(freq, 0.12, 'sawtooth', 0.12, now);
    }

    // 3. Catchy Melodic Arpeggio
    const melodyPattern = [
      523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 880.0, 1046.5,
      587.33, 659.25, 783.99, 1174.66, 783.99, 659.25, 987.77, 1046.5,
    ];
    if (step % 2 === 0) {
      const noteIdx = (step % 16);
      const freq = melodyPattern[noteIdx];
      this.playTone(freq, 0.09, 'square', 0.08, now);
    }

    // 4. Warm Chord Pad (on bar start)
    if (step % 16 === 0) {
      const pads = [
        [261.63, 329.63, 392.0], // C maj
        [196.0, 246.94, 293.66], // G maj
        [220.0, 261.63, 329.63], // A min
        [174.61, 220.0, 261.63], // F maj
      ];
      pads[chordStep].forEach((f) => {
        this.playPadTone(f, 0.9, 'triangle', 0.05, now);
      });
    }
  }

  // TRACK 2: Pixel Playground
  private tickTrackPixel(step: number, now: number) {
    const chordStep = Math.floor(step / 16);

    // Chiptune drums
    if (step % 4 === 0) this.playKick(now);
    if (step % 4 === 2) this.playSnare(now);
    if (step % 2 === 1) this.playHiHat(now);

    // Funky bass
    if (step % 2 === 0) {
      const bass = [146.83, 164.81, 130.81, 174.61]; // D3, E3, C3, F3
      this.playTone(bass[chordStep], 0.1, 'square', 0.1, now);
    }

    // Fast 8-bit chip arps
    const chipNotes = [587.33, 659.25, 739.99, 880.0, 1174.66, 880.0, 739.99, 659.25];
    const freq = chipNotes[step % chipNotes.length];
    this.playTone(freq, 0.06, 'square', 0.07, now);
  }

  // TRACK 3: Cyber Horizon Chill
  private tickTrackChill(step: number, now: number) {
    const chordStep = Math.floor(step / 16);

    // Soft kick & ride
    if (step % 8 === 0) this.playKick(now);
    if (step % 8 === 4) this.playSnare(now);
    if (step % 4 === 2) this.playHiHat(now);

    // Deep sub bass
    if (step % 4 === 0) {
      const sub = [65.41, 73.42, 87.31, 98.0];
      this.playTone(sub[chordStep], 0.28, 'sine', 0.2, now);
    }

    // Ambient chords
    if (step % 16 === 0) {
      const lushChords = [
        [261.63, 392.0, 493.88], // Cmaj7
        [293.66, 440.0, 523.25], // Dm7
        [349.23, 440.0, 523.25], // Fmaj7
        [392.0, 493.88, 587.33], // G7
      ];
      lushChords[chordStep].forEach((f) => {
        this.playPadTone(f, 1.2, 'sine', 0.06, now);
      });
    }

    // Gliding lead bell
    if (step % 8 === 2 || step % 8 === 6) {
      const leadNotes = [523.25, 659.25, 783.99, 987.77, 880.0];
      const f = leadNotes[Math.floor((step / 4) % leadNotes.length)];
      this.playTone(f, 0.2, 'triangle', 0.08, now);
    }
  }

  /* Sound Synthesis Generators */
  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    vol: number,
    time: number
  ) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type === ('pulse' as any) ? 'square' : type;
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration);
    } catch {}
  }

  private playPadTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    vol: number,
    time: number
  ) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, time);

      // Smooth attack and release
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration);
    } catch {}
  }

  private playKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.14);
    } catch {}
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(time);
      noise.stop(time + 0.1);
    } catch {}
  }

  private playHiHat(time: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6000, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(time);
      noise.stop(time + 0.04);
    } catch {}
  }
}

export const Music = new MusicEngine();
