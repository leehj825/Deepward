// Deepward - the Endless Deep: after the fifth guardian, floor after floor of fresh dungeon, each a little tougher.
// Every third floor ends in a guardian's lair; the others bring a champion in their middle. Between floors you choose:
// deeper, or back to camp with your gold. The Daily Descent is the same climb seeded by the date, so every warden
// gets the same floors that day. The deepest floor reached is kept for both.
const Endless = (() => {
  const E = CFG.endless;
  // A small seeded random generator (mulberry32)
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

  // One floor: a stage's theme, guardian and champion, with rooms and waves drawn from the deep's enemies
  function floorDef(floor, R, daily) {
    const pick = arr => arr[Math.floor(R() * arr.length)];
    const si = Math.floor(R() * CFG.stages.length), base = CFG.stages[si], lair = floor % E.lairEvery === 0;
    const own = [...new Set(base.rooms.flatMap(r => r.waves.flat()))], all = Object.keys(CFG.enemies);
    const pool = floor >= E.mixFrom ? own.concat(all) : own;
    const n = E.sections[0] + (floor >= E.bigFrom ? 1 : 0), size = Math.min(E.maxWave, 2 + Math.floor(floor / 3));
    const plain = base.rooms.filter(r => !r.guardian);
    const rooms = [];
    for (let k = 0; k < n - 1; k++) {
      const shape = pick(plain), waves = [];
      for (let w = 0; w < (floor >= 3 && R() < 0.6 ? 2 : 1); w++) waves.push(Array.from({ length: size - w }, () => pick(pool)));
      rooms.push({ size: shape.size.slice(), pillars: R() < 0.4, waves });
    }
    const g = base.rooms.find(r => r.guardian);
    rooms.push(lair ? { size: g.size.slice(), guardian: true, waves: g.waves.map(w => w.slice()) }
      : { size: g.size.slice(), waves: [Array.from({ length: size }, () => pick(pool)), Array.from({ length: Math.max(1, size - 1) }, () => pick(pool))] });
    return {
      def: { name: (daily ? 'Daily Descent' : 'The Endless Deep') + ' · Floor ' + floor, theme: base.theme, guardian: base.guardian, champion: lair ? null : base.champion, rooms },
      si, lair,
    };
  }
  // Build floor n (in a seeded world when the run has a seed)
  function start(run) {
    const R = rng(run.seed + run.floor * 7919), keep = Math.random;
    const f = floorDef(run.floor, R, run.daily);
    Math.random = R;                                                   // the layout, props and side rooms follow the seed too
    try { return Object.assign(World.startCustom(f.def, { si: f.si, k: CFG.stages.length - 1 + run.floor, mult: 1 + CFG.stageScale * (CFG.stages.length - 1) + E.perFloor * run.floor, hpMult: 1 + CFG.stageHp * (CFG.stages.length - 1) + 0.08 * run.floor }), { lair: f.lair }); }
    finally { Math.random = keep; }
  }
  // A new climb: daily uses today's seed, otherwise a random one
  function newRun(daily, curses = []) { return { daily, floor: 1, date: today(), seed: daily ? hash('deepward:' + today()) : Math.floor(Math.random() * 2 ** 31), curses: daily ? [dailyCurse()] : curses.slice() }; }
  // Today's curse for the Daily Descent: the same for everyone
  const dailyCurse = () => CFG.curses[hash('curse:' + today()) % CFG.curses.length].id;
  // The extra gold a set of curses brings (they add up)
  const curseGold = ids => (ids || []).reduce((a, id) => a + ((CFG.curses.find(c => c.id === id) || {}).gold || 0), 0);
  // Keep the deepest floor reached
  function record(run) {
    const S = Items.S, e = S.endless = S.endless || { best: 0, daily: {} };
    if (run.daily) { e.daily = e.daily.date === run.date ? e.daily : { date: run.date, best: 0 }; e.daily.best = Math.max(e.daily.best, run.floor); }
    else e.best = Math.max(e.best, run.floor);
    const n = (run.curses || []).length;                                      // records by how many curses were carried
    if (n && !run.daily) { e.heat = e.heat || {}; e.heat[n] = Math.max(e.heat[n] || 0, run.floor); }
  }
  const unlocked = () => !!Items.S && Items.S.stage >= CFG.stages.length;
  return { rng, today, floorDef, start, newRun, record, unlocked, dailyCurse, curseGold };
})();
