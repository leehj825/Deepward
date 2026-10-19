// Deepward - synthesized sound effects and a low dungeon drone (WebAudio, no asset files).
const Snd = (() => {
  let ctx = null, master, sfx, noiseBuf, muted = false;
  try { muted = localStorage.getItem('dw_mute') === '1'; } catch (e) {}

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // A quiet, detuned drone so the dungeon is never silent
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const dg = ctx.createGain(); dg.gain.value = 0.05;
    for (const f of [49, 49.3, 73.5]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
    lp.connect(dg); dg.connect(master);
    document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else ctx.resume(); });
  }

  function tone(f, dur, type = 'sine', vol = 0.3, slide = null, delay = 0) {
    const t0 = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(sfx); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, type, f0, f1, delay = 0) {
    const t0 = ctx.currentTime + delay, src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f0, t0); fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl); fl.connect(g); g.connect(sfx); src.start(t0); src.stop(t0 + dur + 0.05);
  }

  const SFX = {
    swing: () => noise(0.14, 0.25, 'bandpass', 600, 2800),
    heavySwing: () => { noise(0.3, 0.3, 'bandpass', 300, 1600); tone(90, 0.25, 'sine', 0.15, 60); },
    hit: () => { noise(0.09, 0.45, 'lowpass', 2200, 200); tone(140, 0.12, 'sine', 0.4, 60); },
    crit: () => { noise(0.2, 0.5, 'lowpass', 3000, 150); tone(90, 0.3, 'sine', 0.55, 40); tone(880, 0.25, 'triangle', 0.15, 440, 0.02); },
    block: () => { for (const f of [520, 780, 1170]) tone(f, 0.22, 'square', 0.05, f * 0.97); noise(0.06, 0.25, 'highpass', 2500, 1500); },
    parry: () => { for (const [f, d] of [[1320, 0], [1980, 0.01], [2640, 0.02]]) tone(f, 0.5, 'triangle', 0.13, f * 0.99, d); noise(0.05, 0.3, 'highpass', 5000, 3000); },
    guardBreak: () => { tone(300, 0.35, 'sawtooth', 0.2, 80); noise(0.25, 0.35, 'lowpass', 1500, 100); },
    hurt: () => { tone(220, 0.2, 'sawtooth', 0.15, 90); noise(0.12, 0.35, 'lowpass', 1200, 150); },
    roll: () => { noise(0.18, 0.22, 'bandpass', 1800, 400); noise(0.1, 0.12, 'lowpass', 600, 150, 0.04); },
    warn: () => { tone(160, 0.32, 'sawtooth', 0.12, 150); tone(240, 0.32, 'square', 0.06, 230); },
    glint: () => tone(2200, 0.12, 'sine', 0.06, 2600),
    die: () => { noise(0.4, 0.3, 'lowpass', 800, 80); for (let i = 0; i < 4; i++) tone(400 - i * 60, 0.08, 'square', 0.05, 200, i * 0.05); },
    slam: () => { tone(60, 0.5, 'sine', 0.6, 30); noise(0.45, 0.45, 'lowpass', 600, 60); },
    gate: () => { noise(0.9, 0.18, 'lowpass', 700, 120); for (let i = 0; i < 6; i++) tone(90 + (i % 2) * 30, 0.06, 'square', 0.04, 70, i * 0.12); },
    wave: () => { for (const [f, d] of [[392, 0], [523, 0.12], [659, 0.24]]) tone(f, 0.4, 'triangle', 0.12, null, d); },
    lose: () => { for (const [f, d] of [[392, 0], [311, 0.2], [262, 0.4]]) tone(f, 0.6, 'triangle', 0.14, null, d); },
  };

  return {
    init,
    play(name) { if (!ctx || muted || !SFX[name]) return; try { SFX[name](); } catch (e) {} },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('dw_mute', muted ? '1' : '0'); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.8;
      return muted;
    },
    get muted() { return muted; },
  };
})();
