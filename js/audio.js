// Deepward - synthesized sound effects and a generative score (WebAudio, no asset files).
const Snd = (() => {
  let ctx = null, master, sfx, mus, noiseBuf, muted = false;
  try { muted = localStorage.getItem('dw_mute') === '1'; } catch (e) {}

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.connect(master);
    mus = ctx.createGain(); mus.connect(master);
    levels();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // A quiet, detuned drone so the dungeon is never silent
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const dg = ctx.createGain(); dg.gain.value = 0.035;
    for (const f of [49, 49.3, 73.5]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
    lp.connect(dg); dg.connect(mus);
    startMusic();
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

  function levels() {
    if (!ctx) return;
    master.gain.value = muted ? 0 : Settings.get('master');
    sfx.gain.value = Settings.get('sfx');
    mus.gain.value = Settings.get('music');
  }
  Settings.on(levels);

  // ---------------- Music ----------------
  // A small generative score. Chords change every bar; five layers (pad, arpeggio, bell melody, bass, drums, plus brass
  // for guardians) fade in and out with the mood: camp (warm, major), dungeon (sparse, minor), combat (drums and bass
  // join, faster), boss (faster still, darker chords). Mood and tempo change on a bar line.
  const NF = n => 440 * Math.pow(2, (n - 69) / 12);
  const MINOR = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];       // Dm Bb Gm A
  const MOODS = {
    camp: { bpm: 74, prog: [[50, 54, 57], [55, 59, 62], [47, 50, 54], [45, 49, 52]], scale: [74, 76, 78, 81, 83, 86, 88],
      mix: { pad: 0.45, arp: 0.5, mel: 0.45, bass: 0.25, drum: 0, brass: 0 } },
    dungeon: { bpm: 60, prog: MINOR, scale: [74, 77, 79, 81, 84, 86, 89], mix: { pad: 0.55, arp: 0, mel: 0.4, bass: 0.2, drum: 0, brass: 0 } },
    combat: { bpm: 94, prog: MINOR, scale: [74, 77, 79, 81, 84, 86], mix: { pad: 0.35, arp: 0.35, mel: 0.15, bass: 0.6, drum: 0.75, brass: 0 } },
    boss: { bpm: 108, prog: [[50, 53, 57], [51, 55, 58], [50, 53, 57], [48, 52, 55]], scale: [74, 75, 77, 79, 81, 82, 86],
      mix: { pad: 0.4, arp: 0.4, mel: 0, bass: 0.75, drum: 1, brass: 0.55 } },
  };
  // Every guardian gets a theme of its own: chords, scale and tempo for the boss mood
  const BOSS_THEMES = [
    { bpm: 104, prog: [[50, 53, 57], [51, 55, 58], [50, 53, 57], [48, 52, 55]], scale: [74, 75, 77, 79, 81, 82, 86] },      // Bone Warden: D phrygian
    { bpm: 100, prog: [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 51, 54]], scale: [76, 78, 79, 81, 83, 84, 86] },      // Sir Aldric: E minor, marching
    { bpm: 116, prog: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]], scale: [69, 71, 72, 74, 76, 77, 80] },      // Den Mother: A harmonic minor
    { bpm: 112, prog: [[49, 52, 56], [50, 53, 57], [49, 52, 56], [47, 50, 54]], scale: [73, 74, 76, 77, 80, 81, 85] },      // Brood Queen: C# with a crawling half step
    { bpm: 96, prog: [[48, 51, 55], [44, 48, 51], [46, 50, 53], [43, 47, 50]], scale: [72, 74, 75, 77, 79, 80, 83] },       // Pale Duelist: C minor waltz-ish
    { bpm: 92, prog: [[47, 50, 54], [43, 47, 50], [45, 49, 52], [42, 46, 49]], scale: [71, 73, 74, 76, 78, 79, 81] },       // Drowned Prophet
    { bpm: 98, prog: [[52, 55, 59], [50, 53, 57], [48, 52, 55], [47, 50, 54]], scale: [76, 79, 81, 83, 86, 88] },           // Frost Marshal
    { bpm: 120, prog: [[45, 48, 52], [46, 50, 53], [45, 48, 52], [44, 48, 51]], scale: [69, 70, 72, 74, 76, 77, 79] },      // Furnace Lord
    { bpm: 94, prog: [[51, 54, 58], [47, 51, 54], [49, 52, 56], [46, 49, 53]], scale: [75, 78, 80, 82, 85, 87] },           // Bone Gardener
    { bpm: 84, prog: [[38, 41, 45], [39, 43, 46], [36, 40, 43], [37, 41, 44]], scale: [62, 63, 65, 67, 68, 70, 74] },      // Hollow King: low, slow, heavy
  ];
  const DRUMS = {
    combat: { kick: [1, 0, 0, 0, 1, 0, 0, 1], tom: [0, 0, 1, 0, 0, 0, 1, 0], hat: [0, 1, 0, 1, 0, 1, 0, 1] },
    boss: { kick: [1, 0, 1, 0, 1, 0, 1, 1], tom: [0, 1, 0, 1, 0, 1, 0, 0], hat: [1, 1, 1, 1, 1, 1, 1, 1] },
  };
  const M = { mood: 'camp', want: 'camp', step: 0, next: 0, lay: {}, mel: 3, timer: null, theme: null };
  function startMusic() {
    for (const k of ['pad', 'arp', 'mel', 'bass', 'drum', 'brass']) { const g = ctx.createGain(); g.gain.value = MOODS.camp.mix[k]; g.connect(mus); M.lay[k] = g; }
    // A soft echo for the bells and plucks
    const dl = ctx.createDelay(1), fb = ctx.createGain(), dlp = ctx.createBiquadFilter();
    dl.delayTime.value = 0.42; fb.gain.value = 0.32; dlp.type = 'lowpass'; dlp.frequency.value = 2200;
    dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(mus); M.echo = dl;
    M.lay.mel.connect(dl); M.lay.arp.connect(dl);
    M.next = ctx.currentTime + 0.1;
    M.timer = setInterval(schedule, 50);
  }
  function voice(dest, f, t, dur, type, vol, attack = 0.01, filt = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (filt) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = filt; o.connect(lp); lp.connect(g); } else o.connect(g);
    g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function drum(kind, t, vol) {
    const d = M.lay.drum;
    if (kind === 'kick') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.35); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(g); g.connect(d); o.start(t); o.stop(t + 0.5); }
    else if (kind === 'tom') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.25); g.gain.setValueAtTime(vol * 0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(d); o.start(t); o.stop(t + 0.35); }
    else { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 6000; g.gain.setValueAtTime(vol * 0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(f); f.connect(g); g.connect(d); s.start(t, Math.random() * 0.5); s.stop(t + 0.08); }
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    if (M.next < ctx.currentTime - 0.5) M.next = ctx.currentTime + 0.05;          // after a long pause, don't rush to catch up
    while (M.next < ctx.currentTime + 0.25) { playStep(M.next); M.next += 30 / (M.mood === 'boss' && M.theme !== null ? BOSS_THEMES[M.theme % BOSS_THEMES.length].bpm : MOODS[M.mood].bpm); M.step++; }
  }
  function playStep(t) {
    const i = M.step % 8;
    if (i === 0 && M.want !== M.mood) {                                       // moods change on a bar line
      M.mood = M.want;
      for (const [k, v] of Object.entries(MOODS[M.mood].mix)) M.lay[k].gain.setTargetAtTime(v, t, 0.8);
    }
    const base = MOODS[M.mood], mood = M.mood === 'boss' && M.theme !== null ? Object.assign({}, base, BOSS_THEMES[M.theme % BOSS_THEMES.length]) : base;
    const bar = Math.floor(M.step / 8), chord = mood.prog[bar % mood.prog.length], beat = 30 / mood.bpm;
    if (i === 0) {
      for (const n of chord) for (const det of [-6, 6]) voice(M.lay.pad, NF(n) * Math.pow(2, det / 1200), t, beat * 8.6, 'sawtooth', 0.045, beat * 2.5, 900);
      if (mood.mix.brass) for (const n of chord) voice(M.lay.brass, NF(n + 12), t, beat * 2.2, 'sawtooth', 0.06, 0.04, 1600);
    }
    if (mood.mix.arp) { const n = chord[[0, 1, 2, 1][i % 4]] + 12 + (i >= 4 ? 12 : 0); voice(M.lay.arp, NF(n), t, beat * 1.6, 'triangle', 0.09, 0.005); }
    if (mood.mix.bass && (M.mood === 'camp' ? i % 4 === 0 : true)) voice(M.lay.bass, NF(chord[0] - 12), t, beat * (M.mood === 'camp' ? 3.5 : 0.9), M.mood === 'camp' ? 'triangle' : 'sawtooth', 0.12, 0.01, 420);
    if (mood.mix.mel && i % 2 === 0 && Math.random() < (M.mood === 'camp' ? 0.55 : 0.3)) {
      // A wandering bell line: small steps along the scale
      M.mel = Math.max(0, Math.min(mood.scale.length - 1, M.mel + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      const f = NF(mood.scale[M.mel]);
      voice(M.lay.mel, f, t, beat * 4, 'sine', 0.1, 0.005); voice(M.lay.mel, f * 2.76, t, beat * 1.2, 'sine', 0.025, 0.005);
    }
    const dr = DRUMS[M.mood];
    if (dr) { if (dr.kick[i]) drum('kick', t, 0.5); if (dr.tom[i]) drum('tom', t, 0.4); if (dr.hat[i]) drum('hat', t, 0.5); }
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
    // Newer events
    spikes: () => { noise(0.12, 0.35, 'highpass', 3000, 6000); for (const f of [1800, 2400]) tone(f, 0.1, 'square', 0.04, f * 0.8); },
    execute: () => { tone(70, 0.6, 'sine', 0.7, 30); noise(0.5, 0.5, 'lowpass', 2500, 80); for (const [f, d] of [[523, 0.05], [784, 0.1], [1046, 0.15]]) tone(f, 0.5, 'triangle', 0.1, null, d); },
    cast: () => { tone(300, 0.5, 'sine', 0.12, 900); noise(0.4, 0.12, 'bandpass', 800, 2400); },
    reflect: () => { for (const [f, d] of [[1568, 0], [2093, 0.04], [2637, 0.08]]) tone(f, 0.4, 'sine', 0.12, null, d); },
    mimic: () => { tone(120, 0.15, 'square', 0.25, 60); noise(0.12, 0.4, 'lowpass', 1500, 200, 0.05); tone(90, 0.2, 'sawtooth', 0.15, 50, 0.1); },
    elite: () => { tone(220, 0.6, 'sawtooth', 0.06, 330); tone(330, 0.6, 'triangle', 0.08, 495, 0.05); },
    shrine: () => { for (const [f, d] of [[392, 0], [494, 0.1], [587, 0.2], [784, 0.3]]) tone(f, 1.4, 'sine', 0.07, null, d); },
    achieve: () => { for (const [f, d] of [[523, 0], [659, 0.1], [784, 0.2], [1046, 0.32]]) tone(f, 0.5, 'triangle', 0.12, null, d); },
    lose: () => { for (const [f, d] of [[392, 0], [311, 0.2], [262, 0.4]]) tone(f, 0.6, 'triangle', 0.14, null, d); },
  };

  return {
    init,
    // The app went to the background (or came back): hold all sound, then let it go again
    hold(on) { if (!ctx) return; try { if (on) ctx.suspend(); else ctx.resume(); } catch (e) {} },
    play(name) { if (!ctx || muted || !SFX[name]) return; try { SFX[name](); } catch (e) {} },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('dw_mute', muted ? '1' : '0'); } catch (e) {}
      levels();
      return muted;
    },
    // The mood of the score: camp, dungeon, combat or boss (takes effect on the next bar)
    music(mood, theme = null) { if (MOODS[mood]) { M.want = mood; M.theme = theme; } },
    get mood() { return M.mood; },
    get theme() { return M.theme; },
    get muted() { return muted; },
  };
})();
