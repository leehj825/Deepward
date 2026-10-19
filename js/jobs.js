// Deepward - the notice board by the fire: three jobs at a time, each paying gold (and sometimes a gem) when turned in.
//   hunt     slay N of a kind (counted from the lifetime records, from when the job was taken)
//   gather   bring N of a material to the board
//   boss     fell a field boss of the Rim, or a guardian already beaten once
// A finished job is turned in at the board for its reward and a fresh one takes its place; any job can be torn down.
const Jobs = (() => {
  const RIM = ['wolf', 'boar', 'scout', 'skeleton'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const S = () => Items.S, life = () => Codex.life();
  // The count a job measures, now
  function count(j) {
    if (j.kind === 'hunt') return life().kinds[j.target] || 0;
    if (j.kind === 'fieldboss') return (S().bossKills || {})[j.target] || 0;
    if (j.kind === 'guardian') return life().guardians[j.target] || 0;
    return (S().mats || {})[j.target] || 0;
  }
  const depth = () => 1 + Math.min(S().stage, CFG.stages.length) * 0.3;
  function make() {
    const r = Math.random(), s = S(), seen = Object.keys(life().kinds || {}).filter(k => CFG.enemies[k]);
    let j;
    if (r < 0.5) {                                                         // hunt
      const pool = RIM.concat(seen.filter(k => !['mimic', 'sparring', 'mutant', 'troll', 'golem'].includes(k)));
      const target = pick(pool), need = 4 + Math.floor(Math.random() * 7);
      j = { kind: 'hunt', target, need, gold: Math.round((30 + need * 14) * depth()), title: `Slay ${need} ${CFG.enemies[target].name}${need > 1 ? 's' : ''}` };
    } else if (r < 0.8) {                                                  // gather
      const target = pick(Object.keys(CFG.materials)), need = 3 + Math.floor(Math.random() * 4);
      j = { kind: 'gather', target, need, gold: Math.round((40 + need * 18) * depth()), title: `Bring ${need} ${CFG.materials[target].name.toLowerCase()}` };
    } else {                                                               // a boss: of the Rim, or a guardian already beaten
      const beaten = CFG.stages.slice(0, s.stage).map(st => st.guardian);
      if (beaten.length && Math.random() < 0.5) { const target = pick(beaten); j = { kind: 'guardian', target, need: 1, gold: Math.round(220 * depth()), gem: true, title: `Slay ${target} again` }; }
      else { const B = pick(CFG.field.bosses); j = { kind: 'fieldboss', target: B.id, need: 1, gold: Math.round(180 * depth()), gem: true, title: `Fell ${B.name} on the Rim` }; }
    }
    j.id = (s.nextJob = (s.nextJob || 0) + 1); j.base = j.kind === 'gather' ? 0 : count(j);
    return j;
  }
  // The three jobs on the board (made up when missing)
  function list() { const s = S(); s.jobs = (s.jobs || []).filter(Boolean); while (s.jobs.length < 3) s.jobs.push(make()); return s.jobs; }
  const progress = j => Math.min(j.need, count(j) - j.base);
  const done = j => progress(j) >= j.need;
  // Turn in a finished job: its reward, then a fresh job in its place. Returns the reward or null.
  function turnIn(id) {
    const s = S(), i = s.jobs.findIndex(j => j.id === id), j = s.jobs[i];
    if (!j || !done(j)) return null;
    if (j.kind === 'gather') s.mats[j.target] -= j.need;
    s.gold += j.gold; s.jobsDone = (s.jobsDone || 0) + 1;
    let gem = null; if (j.gem || Math.random() < 0.25) { gem = Items.randomGem(); Items.addGem(gem); }
    s.jobs[i] = make();
    return { gold: j.gold, gem };
  }
  function drop(id) { const s = S(), i = s.jobs.findIndex(j => j.id === id); if (i >= 0) s.jobs[i] = make(); }
  return { list, progress, done, turnIn, drop };
})();
