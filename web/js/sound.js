export class Sound {
  constructor() { this.on = true; this.vol = 0.75; this.ctx = null; this._last = {}; this.scene = 'menu'; this._ex = 0; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.on ? this.vol : 0; this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(this.master); this.bus = comp;
    const ir = c.createBuffer(2, c.sampleRate * 1.6, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
    this.verb = c.createConvolver(); this.verb.buffer = ir; const vg = c.createGain(); vg.gain.value = 0.28; this.verb.connect(vg).connect(this.bus);
    this.musicBus = c.createGain(); this.musicBus.gain.value = this.scene === 'race' ? 0.18 : 1; const mlp = c.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 1500; this.musicBus.connect(mlp).connect(this.bus);
    const len = c.sampleRate * 2; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = buf;
    const pb = c.createBuffer(1, len, c.sampleRate); const pd = pb.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; pd[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; } this.pink = pb;
    this.buildCrowd(); this.startMusic();
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? this.vol : 0, this.ctx.currentTime, 0.08); }
  ok() { return this.ctx && this.on && this.ctx.state === 'running'; }
  setScene(sc) { this.scene = sc; if (!this.musicBus) return; const t = this.ctx.currentTime; this.musicBus.gain.setTargetAtTime(sc === 'race' ? 0.16 : 1, t, 0.6); if (sc !== 'race') this.crowdGain.gain.setTargetAtTime(0, t, 0.8); }
  buildCrowd() {
    const c = this.ctx; this.crowdGain = c.createGain(); this.crowdGain.gain.value = 0; this.crowdGain.connect(this.bus); this.crowdGain.connect(this.verb);
    this.voices = [[350, 4, -0.6], [700, 5, 0.5], [1150, 6, -0.2], [2400, 7, 0.7], [520, 3, 0.1]].map(([f, q, pan]) => {
      const s = c.createBufferSource(); s.buffer = this.pink; s.loop = true; s.playbackRate.value = 0.9 + Math.random() * 0.2;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = c.createGain(); g.gain.value = 0.5; const lfo = c.createOscillator(); lfo.frequency.value = 0.15 + Math.random() * 0.4; const lg = c.createGain(); lg.gain.value = 0.25; lfo.connect(lg).connect(g.gain); lfo.start();
      const p = c.createStereoPanner ? c.createStereoPanner() : null; s.connect(bp).connect(g); if (p) { p.pan.value = pan; g.connect(p); p.connect(this.crowdGain); } else g.connect(this.crowdGain);
      s.start(); return { bp, f };
    });
  }
  crowd(level, active = true) {
    if (!this.ctx) return; const now = performance.now(); if (now - (this._ct || 0) < 150) return; this._ct = now;
    const L = active && this.scene === 'race' ? Math.min(1, level) : 0; this._ex += (L - this._ex) * 0.25;
    const t = this.ctx.currentTime; this.crowdGain.gain.setTargetAtTime(0.03 + 0.42 * this._ex * this._ex, t, 0.35);
    this.voices.forEach(v => v.bp.frequency.setTargetAtTime(v.f * (1 + 0.35 * this._ex), t, 0.5));
    if (L > 0.55 && Math.random() < 0.06 * L) this.shout(L);
    if (L > 0.75 && this.rate('claps', 1600)) this.claps(L * 0.5, 1.4);
  }
  shout(a = 0.6) { if (!this.ok()) return; const c = this.ctx, t = c.currentTime; const f0 = 220 + Math.random() * 260; const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (1.15 + Math.random() * 0.3), t + 0.25); o.frequency.linearRampToValueAtTime(f0 * 0.9, t + 0.6); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 600; bp.Q.value = 1.4; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.018 * a, t + 0.06); g.gain.linearRampToValueAtTime(0, t + 0.65); const p = c.createStereoPanner ? c.createStereoPanner() : null; o.connect(bp).connect(g); if (p) { p.pan.value = Math.random() * 1.6 - 0.8; g.connect(p); p.connect(this.verb); p.connect(this.bus); } else g.connect(this.bus); o.start(t); o.stop(t + 0.7); }
  roar(a = 1, dur = 3) { if (!this.ok()) return; const t = this.ctx.currentTime; this._ex = Math.min(1, this._ex + 0.4 * a); this.crowdGain.gain.cancelScheduledValues(t); this.crowdGain.gain.setTargetAtTime(0.55 * a, t, 0.08); this.crowdGain.gain.setTargetAtTime(0.03 + 0.42 * this._ex * this._ex, t + dur, 1.2); for (let i = 0; i < 6 * a; i++) setTimeout(() => this.shout(a), i * 160 + Math.random() * 200); this.claps(a, dur); }
  startMusic() {
    const c = this.ctx; const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]]; const bar = 3.2; let k = 0; let next = c.currentTime + 0.2;
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const voice = (f, t0, dur, amp, type = 'sine') => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 8; const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(amp, t0 + Math.min(1.1, dur * 0.35)); g.gain.linearRampToValueAtTime(0, t0 + dur); o.connect(g).connect(this.musicBus); o.start(t0); o.stop(t0 + dur + 0.05); };
    const tick = () => { if (!this.ctx) return; while (next < c.currentTime + 1.5) { const ch = chords[k % chords.length]; ch.forEach((m, i) => voice(hz(m), next, bar + 0.6, 0.012 + (i === 0 ? 0.006 : 0), i === 0 ? 'triangle' : 'sine')); voice(hz(ch[0] - 12), next, bar, 0.014, 'sine'); [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12].forEach((m, i) => { if (Math.random() < 0.7) voice(hz(m), next + i * bar / 4 + 0.05, 0.9, 0.007, 'triangle'); }); next += bar; k++; } };
    tick(); this._mt = setInterval(tick, 500);
  }
  src(buf, { hp = 100, lp = 4000, q = 0.7, amp = 0.3, dur = 0.3, attack = 0.005, pan = 0, at = 0, rate = 1, verb = 0.3, bp = null } = {}) {
    if (!this.ok()) return null; const c = this.ctx, t = c.currentTime + at; const s = c.createBufferSource(); s.buffer = buf || this.noise; s.playbackRate.value = rate * (0.92 + Math.random() * 0.16);
    let node = s; const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; node.connect(h); node = h;
    const l = c.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp; l.Q.value = q; node.connect(l); node = l;
    if (bp) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = bp; b.Q.value = 2.2; node.connect(b); node = b; }
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); node.connect(g);
    const p = c.createStereoPanner ? c.createStereoPanner() : null; if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(this.bus); if (verb) { const vg = c.createGain(); vg.gain.value = verb; p.connect(vg).connect(this.verb); } } else g.connect(this.bus);
    s.start(t, Math.random() * 1.2, dur + 0.1); return { s, l, g, t };
   }
  rate(key, ms) { const n = performance.now(); if (n - (this._last[key] || 0) < ms) return false; this._last[key] = n; return true; }
  tone(f, dur, type = 'sine', amp = 0.25, at = 0, verb = 0.2) {
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime + at; const o = c.createOscillator(); o.type = type; o.frequency.value = f;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.01); g.gain.setValueAtTime(amp, t + Math.max(0.02, dur - 0.04)); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.bus); if (verb) { const vg = c.createGain(); vg.gain.value = verb; g.connect(vg).connect(this.verb); } o.start(t); o.stop(t + dur + 0.02); return o;
  }
  claps(a = 0.5, dur = 1.6) { if (!this.ok()) return; const n = Math.round(14 + 46 * a); for (let i = 0; i < n; i++) this.src(null, { dur: 0.045, hp: 1000 + Math.random() * 1200, lp: 6000, amp: 0.025 + 0.035 * a * Math.random(), pan: Math.random() * 1.6 - 0.8, attack: 0.002, at: Math.random() * dur, verb: 0.5 }); }
  cheer(a = 0.6) { if (this.rate('cheer', 700)) this.roar(Math.min(1, a + 0.2), 1.6); }
  whistle() { if (!this.ok()) return; const c = this.ctx; [0, 0.22, 0.44].forEach((d, i) => { const o = this.tone(2850, i < 2 ? 0.14 : 0.7, 'sine', 0.11, d, 0.35); if (o) { const lfo = c.createOscillator(); lfo.frequency.value = 34; const lg = c.createGain(); lg.gain.value = 60; lfo.connect(lg).connect(o.frequency); lfo.start(c.currentTime + d); lfo.stop(c.currentTime + d + 0.8); } }); if (this.crowdGain) this.crowdGain.gain.setTargetAtTime(0.012, this.ctx.currentTime + 0.6, 0.4); }
  marks() { try { if (!this.on || !window.speechSynthesis) return; const u = new SpeechSynthesisUtterance('Às suas marcas'); u.lang = 'pt-BR'; u.rate = 0.85; u.pitch = 0.9; u.volume = Math.min(1, this.vol); window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { } }
  beep() { this.tone(1046, 0.3, 'square', 0.07, 0, 0.4); this.tone(1046, 0.3, 'sine', 0.15, 0, 0.4); setTimeout(() => this.roar(0.7, 2), 250); }
  dive(pan = 0) {
    if (!this.rate('dv', 25)) return;
    this.src(null, { dur: 0.35, hp: 120, lp: 3200, amp: 0.38, pan, verb: 0.45 });
    const r = this.src(null, { dur: 0.9, hp: 60, lp: 900, amp: 0.32, pan, attack: 0.01, verb: 0.2 }); if (r) r.l.frequency.exponentialRampToValueAtTime(180, r.t + 0.8);
    this.tone(90, 0.18, 'sine', 0.14, 0, 0);
  }
  underwater(dur = 3, pan = 0, kickHz = 2.4) {
    if (!this.ok() || !this.rate('uw', 300)) return; const c = this.ctx, t = c.currentTime; dur = Math.max(0.5, Math.min(8, dur));
    const s = c.createBufferSource(); s.buffer = this.pink; s.loop = true; const l = c.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = 320; l.Q.value = 3;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.12); g.gain.setValueAtTime(0.22, t + dur - 0.25); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(l).connect(g).connect(this.bus); s.start(t); s.stop(t + dur + 0.05);
    const n = Math.floor(dur * kickHz); for (let k = 0; k < n; k++) { const at = k / kickHz; this.tone(70 + Math.random() * 15, 0.12, 'sine', 0.09, at, 0); this.src(this.pink, { dur: 0.22, hp: 80, lp: 500, amp: 0.08, pan, at: at + 0.02, verb: 0 }); }
    if (this.crowdGain) { this.crowdGain.gain.setTargetAtTime(0.01, t, 0.08); this.crowdGain.gain.setTargetAtTime(0.03 + 0.42 * this._ex * this._ex, t + dur, 0.2); }
  }
  splash(i = 1, pan = 0) { if (!this.rate('sp', 28)) return; this.src(null, { dur: 0.2 + 0.4 * i, hp: 300, lp: 1800 + 1800 * i, amp: 0.12 + 0.3 * i, pan, verb: 0.3 }); }
  breakout(pan = 0) { this.src(null, { dur: 0.32, hp: 400, lp: 4200, amp: 0.2, pan, verb: 0.35 }); }
  stroke(pan = 0, style = 'free') {
    if (!this.rate('st', 55)) return; const amp = style === 'fly' ? 0.16 : style === 'breast' ? 0.08 : 0.11;
    this.src(null, { dur: 0.09, hp: 1800, lp: 7000, amp: amp * 0.8, pan, verb: 0.3, rate: 1.2 });
    this.src(null, { dur: style === 'fly' ? 0.3 : 0.2, hp: 500, lp: 2600, amp, pan, at: 0.04, verb: 0.25, bp: style === 'breast' ? 900 : null });
  }
  kicks(pan = 0, n = 3, span = 0.5) { if (!this.rate('kk', 110)) return; for (let i = 0; i < n; i++) this.src(null, { dur: 0.06, hp: 900, lp: 3800, amp: 0.035, pan, at: i * span / n + Math.random() * 0.02, verb: 0.15 }); }
  turn(pan = 0) {
    if (!this.rate('tn', 200)) return; const r = this.src(this.pink, { dur: 0.55, hp: 150, lp: 1800, amp: 0.18, pan, verb: 0.3 }); if (r) r.l.frequency.exponentialRampToValueAtTime(400, r.t + 0.5);
    setTimeout(() => { this.tone(110, 0.09, 'sine', 0.2, 0, 0.1); this.src(null, { dur: 0.08, hp: 200, lp: 1200, amp: 0.2, pan, verb: 0.3 }); }, 380);
  }
  touch(pan = 0) { if (!this.rate('tc', 45)) return; this.tone(1568, 0.07, 'sine', 0.06, 0, 0.3); this.src(null, { dur: 0.14, hp: 600, lp: 2600, amp: 0.1, pan }); }
  horn() { this.tone(233, 0.9, 'sawtooth', 0.045, 0, 0.5); this.tone(349, 0.9, 'sawtooth', 0.03, 0, 0.5); this.roar(1, 4); }
  celebrate(a = 0.8) { if (!this.rate('cel', 1500)) return; this.roar(a, 3.2); [0, 0.25, 0.5, 0.9, 1.15, 1.4].forEach(d => this.claps(0.4, 0.15)); }
  suspend() { }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
}
