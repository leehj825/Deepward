// Trains the companions' per-class move preferences (weights.cb: 4 classes x 7 moves) against the REAL game, headless.
//   node tools/policy/real_train.js [minutes of training, default 60] [workers, default 3]
// Several headless browsers play randomized fights (a party of one or two companions of random classes, a warden who fights, two or
// three waves of foes, depth 0-3) with candidate preference tables; evolution strategies keep what scores better, using the same
// fight score as the in-game learner (Policy.Learner.score). The result is tested on fresh fights against the unchanged network and
// the plain rules, and written to js/policy_weights.js only if it is not worse than the unchanged network and clearly not worse than
// the rules. The simulator is not used: its gap to the game is what spoiled the longer simulator run.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const MIN = parseFloat(process.argv[2] || '60'), W = parseInt(process.argv[3] || '3', 10);
const Policy = require('../../js/policy.js');
const file = path.join(__dirname, '../../js/policy_weights.js');
const readW = () => new Function(fs.readFileSync(file, 'utf8').replace(/^[^]*?const DW_POLICY =/, 'return ').replace(/;\s*$/, ';'))();
const CLS = Policy.CLS, NA = Policy.ACTIONS.length, NP = CLS.length * NA;
const R = (() => { let a = 424242; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const gauss = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); };
const toCb = th => Object.fromEntries(CLS.map((c, i) => [c, Array.from(th.slice(i * NA, (i + 1) * NA))]));
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

// The fight, run inside the page: returns the measurements the learner's score needs
const WAVE_BASE = parseInt(process.env.WAVE_BASE || '1', 10), BRUTE_P = parseFloat(process.env.BRUTE_P || '0.05'), MULT_PER_TIER = parseFloat(process.env.MULT || '0.05'), LV_PER_TIER = parseInt(process.env.LV || '6', 10);
const FIGHT = `(([seed, cb, mode]) => {
  const WAVE_BASE = ${WAVE_BASE}, BRUTE_P = ${BRUTE_P}, MULT_PER_TIER = ${MULT_PER_TIER}, LV_PER_TIER = ${LV_PER_TIER};
  const rng = (() => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const pick = a => a[Math.floor(rng() * a.length)];
  const tier = Math.floor(rng() * 4), classes = pick([['warrior'], ['cleric'], ['archer'], ['mage'], ['warrior', 'cleric'], ['warrior', 'archer'], ['warrior', 'mage'], ['archer', 'cleric'], ['mage', 'cleric'], ['archer', 'mage'], ['warrior', 'cleric'], ['archer', 'cleric']]);
  const waves = []; const nw = 2 + Math.floor(rng() * 2);
  for (let w = 0; w < nw; w++) { const list = [], n = WAVE_BASE + Math.floor(rng() * 2) + (tier > 1 ? 1 : 0); for (let i = 0; i < n; i++) list.push(pick(['skeleton', 'skeleton', 'skeleton', 'wolf', 'knight', 'archer', 'archer'])); if (rng() < BRUTE_P) list.push('brute'); waves.push({ at: w * 14 + (w ? rng() * 4 : 0), list }); }
  Settings.set('learnOnline', false); Settings.set('learnedAI', mode !== 'rules');
  DW_POLICY.cb = mode === 'net' ? cb : (mode === 'base' ? undefined : DW_POLICY.cb);
  const I = __dw.Items, G = __dw.G;
  __dw.arena(0); __dw.World.halt(); G.queue = []; for (const e of G.enemies) e.cooldown = 99999;
  I.S.stage = tier; I.S.level = 1 + LV_PER_TIER * tier; I.S.gold = 99999; I.S.party = []; I.S.hired = {}; I.S.rescued = []; Party.clear();
  const p = G.player; p.facing = Math.PI; p.pos.set(0, 0, 4); G.onGearChanged(false); p.hp = p.maxHp; p.pos.set(0, 0, 4);
  const id = { warrior: 'hobb', archer: 'mira', mage: 'pell', cleric: 'aldo' }; for (const c of classes) Party.recruit(id[c]);
  __dw.sim(0.2); __dw.setView('top');
  const mult = 1 + MULT_PER_TIER * tier, foes = [], was = new Map(G.allies.map(a => [a, false])), last = new Map(G.allies.map(a => [a, a.hp]));
  let downs = 0, allyLost = 0, heroLost = 0, hlast = p.hp, t = 0, next = 0, swing = 0, totalHp = 0;
  const allyMax = G.allies.reduce((s, a) => s + a.maxHp, 0), heroMax = p.maxHp;
  const spawnWave = w => w.list.forEach((type, i) => { const a = (rng() - 0.5) * 1.4, dd = 12 + rng() * 3, e = Enemy.spawn(__dw.scene, type, new THREE.Vector3(Math.max(-7, Math.min(7, -Math.sin(a) * dd - i * 0.4)), 0, -Math.cos(a) * dd + 4 - 2), mult); e.state = 'hunt'; G.enemies.push(e); foes.push(e); totalHp += e.maxHp; });
  const LIMIT = 70;
  __dw.sim(LIMIT, () => {
    t += 1 / 60; p.st = p.maxSt; swing -= 1 / 60;
    while (next < waves.length && t >= waves[next].at) spawnWave(waves[next++]);
    for (const a of G.allies) { const d = a.state === 'down'; if (d && !was.get(a)) downs++; was.set(a, d); if (a.hp < last.get(a)) allyLost += last.get(a) - a.hp; last.set(a, a.hp); }
    if (p.hp < hlast) heroLost += hlast - p.hp; hlast = p.hp;
    let ne = null, nd = 99; for (const e of foes) if (e.state !== 'dead') { const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < nd) { nd = d; ne = e; } }
    if (ne && nd < 14 && p.state !== 'dead') { const dx = ne.pos.x - p.pos.x, dz = ne.pos.z - p.pos.z; __dw.Input.move.x = nd > 2.2 ? dx / nd * 0.8 : 0; __dw.Input.move.z = nd > 2.2 ? dz / nd * 0.8 : 0; if (nd < 2.6 && swing <= 0) { __dw.press('light'); swing = 0.7; } } else { __dw.Input.move.x = 0; __dw.Input.move.z = 0; }
    return p.state === 'dead' || (next >= waves.length && foes.every(e => e.state === 'dead'));
  });
  __dw.Input.move.x = 0; __dw.Input.move.z = 0;
  let removed = 0; for (const e of foes) removed += e.maxHp - (e.state === 'dead' ? 0 : Math.max(0, e.hp));
  const cleared = next >= waves.length && foes.every(e => e.state === 'dead');
  const res = { frac: totalHp ? Math.min(1, removed / totalHp) : 1, cleared, time: t, downs, heroDied: p.state === 'dead', heroLost: heroLost / heroMax, compLost: allyLost / Math.max(1, allyMax) };
  return { r: Policy.Learner.score(res), cleared, downs, died: res.heroDied, heroLost: res.heroLost, compLost: res.compLost, time: t };
})`;

async function main() {
  const t0 = Date.now(), elapsed = () => (Date.now() - t0) / 60000;
  const cur = readW(), ckptFile = path.join(__dirname, 'real-checkpoint.json');
  let th0 = Float64Array.from(CLS.flatMap(c => (cur.cb && cur.cb[c]) || new Array(NA).fill(0)));
  // RESUME=1: start from the best preferences of an earlier run's checkpoint (a run on a hosted runner can be cut short)
  if (process.env.RESUME && fs.existsSync(ckptFile)) { const c = JSON.parse(fs.readFileSync(ckptFile, 'utf8')); th0 = Float64Array.from(CLS.flatMap(cl => c.cb[cl])); console.log(`resuming from the checkpoint (generation ${c.gen}, validation ${c.score.toFixed(2)})`); }
  console.log(`launching ${W} headless browsers`);
  const launch = async () => {
    const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const pg = await b.newPage({ viewport: { width: 400, height: 300 } });
    await pg.goto('file://' + path.resolve(__dirname, '../../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
    return { b, pg };
  };
  const pages = [];
  for (let i = 0; i < W; i++) pages.push(await launch());
  let fights = 0;
  if (process.env.CALIBRATE) {
    const seeds = Array.from({ length: 60 }, (_, i) => 1000 + i), run = async mode => { const out = []; let nx = 0; await Promise.all(pages.map(async ({ pg }) => { while (nx < seeds.length) { const sd = seeds[nx++]; out.push(await pg.evaluate(`(${FIGHT})(${JSON.stringify([sd, null, mode])})`)); } })); return out; };
    for (const mode of ['rules', 'base']) { const X = await run(mode); console.log(mode, 'reward', mean(X.map(x => x.r)).toFixed(1), 'cleared', (mean(X.map(x => x.cleared ? 1 : 0)) * 100).toFixed(0) + '%', 'downs', mean(X.map(x => x.downs)).toFixed(2), 'warden died', (mean(X.map(x => x.died ? 1 : 0)) * 100).toFixed(0) + '%'); }
    for (const { b } of pages) await b.close(); return;
  }
  // Run a list of (mode, cb, seed) fights over the workers; returns the results in order
  async function runAll(tasks) {
    const out = new Array(tasks.length); let next = 0;
    await Promise.all(pages.map(async slot => {
      while (next < tasks.length) {
        const i = next++, [mode, cb, seed] = tasks[i];
        // A fight that does not come back in 100 s (a stuck browser) is abandoned: the browser is replaced and the fight skipped (null)
        for (let tryN = 0; tryN < 2 && out[i] === undefined; tryN++) {
          let timer;
          try {
            out[i] = await Promise.race([slot.pg.evaluate(`(${FIGHT})(${JSON.stringify([seed, cb, mode])})`), new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), 100000); })]); fights++;
          } catch (e) {
            console.log('  a fight failed (' + String(e.message).slice(0, 60) + '): replacing a browser');
            try { await Promise.race([slot.b.close(), new Promise(r => setTimeout(r, 5000))]); } catch (e2) {}
            try { Object.assign(slot, await launch()); } catch (e3) { console.log('  could not relaunch', e3.message); }
          } finally { clearTimeout(timer); }
        }
        if (out[i] === undefined) out[i] = null;
      }
    }));
    return out;
  }
  const valid = rs => rs.filter(x => x);
  const rewards = rs => mean(valid(rs).map(x => x.r));

  // ---------- evolution strategies on the 28 preferences ----------
  const K = 14, SIGMA = 2.0, LR = 0.25, B = 8, CLIP = 6;
  let th = Float64Array.from(th0); const m = new Float64Array(NP), v = new Float64Array(NP); let step = 0, gen = 0;
  const valSeeds = Array.from({ length: 30 }, (_, i) => 810000 + i);
  const base = rewards(await runAll(valSeeds.map(s => ['base', null, s])));
  let best = { th: Float64Array.from(th), score: rewards(await runAll(valSeeds.map(s => ['net', toCb(th), s]))), gen: 0 };
  console.log(`start: validation reward with the shipped preferences ${best.score.toFixed(2)} (network without preferences ${base.toFixed(2)}), ${fights} fights`);
  // The best preferences so far, kept on disk after every validation (and when the process is told to stop)
  const saveCkpt = () => { try { fs.writeFileSync(ckptFile, JSON.stringify({ cb: toCb(best.th.map(x => Math.round(x * 1e3) / 1e3)), gen: best.gen, score: best.score, fights, savedAt: new Date().toISOString() })); } catch (e) {} };
  process.on('SIGTERM', () => { saveCkpt(); process.exit(143); });
  saveCkpt();
  while (elapsed() < MIN) {
    gen++;
    const seeds = Array.from({ length: B }, () => 1 + Math.floor(R() * 8e8)), eps = [], cands = [];
    for (let k = 0; k < K; k++) { const e = Float64Array.from({ length: NP }, gauss); eps.push(e); for (const sg of [1, -1]) cands.push(Float64Array.from(th, (x, i) => Math.max(-CLIP, Math.min(CLIP, x + sg * SIGMA * e[i])))); }
    const tasks = []; cands.forEach(c => seeds.forEach(s => tasks.push(['net', toCb(c), s])));
    const res = await runAll(tasks), rs = cands.map((_, i) => rewards(res.slice(i * B, (i + 1) * B)));
    const order = rs.map((r, i) => [r, i]).sort((a, b) => a[0] - b[0]), rank = new Array(rs.length); order.forEach(([, i], r) => { rank[i] = r / (rs.length - 1) - 0.5; });
    const g = new Float64Array(NP); for (let k = 0; k < K; k++) { const d = rank[2 * k] - rank[2 * k + 1]; for (let i = 0; i < NP; i++) g[i] += d * eps[k][i]; }
    step++; for (let i = 0; i < NP; i++) { const gi = -g[i] / (K * SIGMA); m[i] = 0.9 * m[i] + 0.1 * gi; v[i] = 0.999 * v[i] + 0.001 * gi * gi; th[i] = Math.max(-CLIP, Math.min(CLIP, th[i] - LR * (m[i] / (1 - 0.9 ** step)) / (Math.sqrt(v[i] / (1 - 0.999 ** step)) + 1e-8) * SIGMA)); }
    if (gen % 3 === 0) {
      const sc = rewards(await runAll(valSeeds.map(s => ['net', toCb(th), s])));
      if (sc > best.score) { best = { th: Float64Array.from(th), score: sc, gen }; saveCkpt(); }
      console.log(`gen ${gen}: candidates ${Math.min(...rs).toFixed(1)}..${Math.max(...rs).toFixed(1)}, validation ${sc.toFixed(2)} (best ${best.score.toFixed(2)} at ${best.gen}), ${fights} fights, ${elapsed().toFixed(1)} min`);
    }
  }
  // ---------- the test: fresh fights, three ways ----------
  const N = parseInt(process.env.TEST_N || '120', 10), testSeeds = Array.from({ length: N }, (_, i) => 910000 + i);
  console.log(`testing on ${N} fresh fights, three ways`);
  const A = await runAll(testSeeds.map(s => ['base', null, s]));              // the network as shipped without preferences
  const Bn = await runAll(testSeeds.map(s => ['net', toCb(best.th), s]));     // with the trained preferences
  const Cr = await runAll(testSeeds.map(s => ['rules', null, s]));            // the plain rules
  const diff = (X, Y) => { const d = X.map((x, i) => x && Y[i] ? x.r - Y[i].r : null).filter(x => x !== null), md = mean(d), sd = Math.sqrt(mean(d.map(x => (x - md) ** 2))); return { md, ci: 1.96 * sd / Math.sqrt(d.length) }; };
  const row = (n, X0) => { const X = valid(X0); return `${n.padEnd(34)} reward ${rewards(X).toFixed(1).padStart(6)}  cleared ${(mean(X.map(x => x.cleared ? 1 : 0)) * 100).toFixed(0).padStart(3)}%  downs/fight ${mean(X.map(x => x.downs)).toFixed(2)}  warden died ${(mean(X.map(x => x.died ? 1 : 0)) * 100).toFixed(0)}%`; };
  console.log(row('network, no preferences', A)); console.log(row('network + trained preferences', Bn)); console.log(row('plain rules', Cr));
  const dBA = diff(Bn, A), dBC = diff(Bn, Cr), dAC = diff(A, Cr);
  console.log(`trained minus no preferences: ${dBA.md.toFixed(2)} ± ${dBA.ci.toFixed(2)};  trained minus rules: ${dBC.md.toFixed(2)} ± ${dBC.ci.toFixed(2)};  network minus rules: ${dAC.md.toFixed(2)} ± ${dAC.ci.toFixed(2)}`);
  console.log(`(${fights} real fights in ${elapsed().toFixed(1)} minutes)`);
  const ok = dBA.md > 0 && dBC.md - dBC.ci > -1;
  const report = `# Companion preferences trained against the real game

${new Date().toISOString().slice(0, 10)}: ${gen} generations of evolution strategies over the 28 per-class move preferences (weights.cb), ${fights} real fights in headless browsers (${MIN} min of training).
Test: ${N} fresh randomized fights, the same scenarios three ways.

| | Reward | Fights won | Companions downed per fight | Warden died |
| --- | --- | --- | --- | --- |
| Plain rules | ${rewards(Cr).toFixed(1)} | ${(mean(valid(Cr).map(x => x.cleared ? 1 : 0)) * 100).toFixed(0)}% | ${mean(valid(Cr).map(x => x.downs)).toFixed(2)} | ${(mean(valid(Cr).map(x => x.died ? 1 : 0)) * 100).toFixed(0)}% |
| Network as shipped (no preferences) | ${rewards(A).toFixed(1)} | ${(mean(valid(A).map(x => x.cleared ? 1 : 0)) * 100).toFixed(0)}% | ${mean(valid(A).map(x => x.downs)).toFixed(2)} | ${(mean(valid(A).map(x => x.died ? 1 : 0)) * 100).toFixed(0)}% |
| Network + trained preferences | ${rewards(Bn).toFixed(1)} | ${(mean(valid(Bn).map(x => x.cleared ? 1 : 0)) * 100).toFixed(0)}% | ${mean(valid(Bn).map(x => x.downs)).toFixed(2)} | ${(mean(valid(Bn).map(x => x.died ? 1 : 0)) * 100).toFixed(0)}% |

Paired differences in reward: trained minus no preferences ${dBA.md.toFixed(2)} ± ${dBA.ci.toFixed(2)}; trained minus rules ${dBC.md.toFixed(2)} ± ${dBC.ci.toFixed(2)}; network minus rules ${dAC.md.toFixed(2)} ± ${dAC.ci.toFixed(2)} (95%).
${ok ? 'Written to js/policy_weights.js (weights.cb).' : 'Not written: the trained preferences were not better than the network without them, or clearly worse than the rules.'}
`;
  if (!process.env.DRY) fs.writeFileSync(path.join(__dirname, '../../docs/real-training-report.md'), report);
  if (ok && !process.env.DRY) {
    const w = readW(); w.cb = toCb(best.th.map(x => Math.round(x * 1e3) / 1e3)); w.meta.realTrained = { fights, generations: gen, date: new Date().toISOString().slice(0, 10) };
    fs.writeFileSync(file, '// Generated by tools/policy/train.js (imitation of the rules, then evolution strategies in tools/policy/sim.js); weights.cb by tools/policy/real_train.js (against the real game) or bake.js. Do not edit by hand.\nconst DW_POLICY = ' + JSON.stringify(w) + ';\n');
    console.log('written: js/policy_weights.js (cb)');
  } else console.log('not written: the shipped weights are kept');
  for (const { b } of pages) await b.close();
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
