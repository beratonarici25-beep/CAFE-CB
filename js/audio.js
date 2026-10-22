/* Web Audio sound effects; everything is synthesised, no audio files. */
/* ---------------- audio ---------------- */
const sfx = {
  ctx: null, master: null, noise: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const len = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
      this.master = this.ctx.createGain();
      this.master.gain.value = save.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) { if (this.master) this.master.gain.value = m ? 0 : 0.55; },
  tone(freq, dur, type = 'sine', vol = 0.2, delay = 0, slide = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  },
  loop(type, freq, q, vol, extra) {
    if (!this.ctx) return () => {};
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(), t0 = this.ctx.currentTime;
    src.buffer = this.noise; src.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.06);
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    let osc = null;
    if (extra) {
      osc = this.ctx.createOscillator(); const og = this.ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = extra; og.gain.value = 0.04; osc.connect(og); og.connect(g); osc.start();
    }
    let stopped = false;
    return () => {
      if (stopped) return; stopped = true;
      const n = this.ctx.currentTime;
      g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.1);
      src.stop(n + 0.12); if (osc) osc.stop(n + 0.12);
    };
  },
  burst(type, freq, dur, vol) { if (!this.ctx) return; const stop = this.loop(type, freq, 1, vol); setTimeout(stop, dur * 1000); },
  grind() { return this.loop('bandpass', 1700, 1.4, 0.4, 95); },
  steam() { return this.loop('highpass', 3200, 0.7, 0.22); },
  drip() { return this.loop('lowpass', 520, 3, 0.35); },
  pour() { this.burst('lowpass', 700, 0.7, 0.35); },
  pump() { this.tone(260, 0.12, 'sine', 0.18, 0, 0.6); },
  click() { this.tone(700, 0.05, 'triangle', 0.08); },
  bell() { this.tone(1318, 0.7, 'sine', 0.16); this.tone(1976, 0.6, 'sine', 0.06, 0.03); },
  coin() { this.tone(988, 0.09, 'square', 0.06); this.tone(1319, 0.28, 'square', 0.06, 0.09); },
  sad() { this.tone(392, 0.25, 'triangle', 0.12); this.tone(311, 0.4, 'triangle', 0.12, 0.2); },
};
Object.assign(sfx, {
  tamp() { this.tone(110, 0.14, 'sine', 0.35, 0, 0.5); this.burst('lowpass', 300, 0.08, 0.25); },
  clack() { this.tone(520, 0.06, 'square', 0.05); this.tone(380, 0.08, 'triangle', 0.08, 0.04); },
  trash() { this.burst('bandpass', 900, 0.18, 0.3); this.tone(160, 0.2, 'triangle', 0.15, 0.08); },
  error() { this.tone(220, 0.12, 'square', 0.06); this.tone(185, 0.16, 'square', 0.06, 0.1); },
  pickup() { this.tone(560, 0.06, 'sine', 0.08, 0, 1.4); },
  // issues #6/#7: machine keys click, the service bell dings, coins jingle on the bar
  button() { this.tone(1800, 0.025, 'square', 0.05); this.tone(240, 0.06, 'triangle', 0.12, 0.012); },
  ding() { this.tone(2093, 0.9, 'sine', 0.16); this.tone(3136, 0.5, 'sine', 0.05, 0.01); this.tone(2093, 0.6, 'sine', 0.06, 0.18); },
  whoosh() { if (!this.ctx) return; const stop = this.loop('bandpass', 900, 0.8, 0.12); setTimeout(stop, 260); },
  coins(tip) {
    for (let i = 0, n = tip ? 6 : 3; i < n; i++) this.tone(rand(1700, 2600), 0.12, 'triangle', 0.07, 0.05 + i * 0.07 + rand(0, 0.03));
    this.coin();
  },
});
