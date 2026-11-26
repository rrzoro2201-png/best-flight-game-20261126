// Langit Senja — sound, all synthesised with WebAudio: no audio files.
// Engine hum follows the throttle, rings chime, landings fanfare, crashes thud.
export function makeAudio() {
  return {
    ctx: null,
    muted: false,
    engine: null,
    engineGain: null,
    ensure() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.engine = this.ctx.createOscillator();
      this.engine.type = 'sawtooth';
      this.engine.frequency.value = 55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engine.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engine.start();
    },
    setEngine(throttle, boost, flying) {
      if (!this.ctx || this.muted) {
        if (this.engineGain) this.engineGain.gain.value = 0;
        return;
      }
      const target = flying ? 0.035 + throttle * 0.05 + (boost ? 0.03 : 0) : 0;
      this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
      this.engine.frequency.setTargetAtTime(50 + throttle * 70 + (boost ? 25 : 0), this.ctx.currentTime, 0.1);
    },
    blip(freq, dur, type = 'sine', vol = 0.12) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    },
    ring() {
      this.blip(880, 0.25);
      setTimeout(() => this.blip(1318, 0.3), 70);
    },
    warn() {
      this.blip(220, 0.18, 'square', 0.07);
    },
    crash() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const len = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(t);
    },
    land() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.3), i * 110));
    },
  };
}
