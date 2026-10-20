// Does learning while playing help? Plays sequences of fights in the simulator, the same scenarios with the network frozen and
// with the run-time learner (Policy.Learner) on, and compares the early and late fights.
//   node tools/policy/learn_check.js [sequences, default 8] [fights per sequence, default 300]
const fs = require('fs'), path = require('path');
const { run, makeScenario, Policy } = require('./sim.js');
const w = new Function(fs.readFileSync(path.join(__dirname, '../../js/policy_weights.js'), 'utf8').replace(/^[^]*?const DW_POLICY =/, 'return ').replace(/;\s*$/, ';'))();
const SEQ = parseInt(process.argv[2] || '8', 10), N = parseInt(process.argv[3] || '300', 10), rnd = (() => { let a = 7; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
if (process.env.LR) Policy.Learner.params.LR = +process.env.LR; if (process.env.EXPLORE) Policy.Learner.params.EXPLORE = +process.env.EXPLORE; if (process.env.CLIP) Policy.Learner.params.CLIP = +process.env.CLIP;
const frozen = s => Policy.choose(s, w);
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const diffs = { early: [], late: [], all: [] }, fz = [], ln = [];
for (let q = 0; q < SEQ; q++) {
  const L = Policy.Learner.make(), A = [], B = [];
  for (let i = 0; i < N; i++) {
    const sc = makeScenario(700000 + q * 1000 + i);
    A.push(run(sc, frozen, 1).reward);
    const r = run(sc, s => { const a = Policy.Learner.pick(L, s, w, true, rnd); return a; }, 1);
    Policy.Learner.end(L, r.reward); B.push(r.reward);
  }
  const d = B.map((x, i) => x - A[i]), k = Math.floor(N / 3);
  diffs.early.push(mean(d.slice(0, k))); diffs.late.push(mean(d.slice(-k))); diffs.all.push(mean(d)); fz.push(mean(A)); ln.push(mean(B));
}
const ci = a => { const m = mean(a), sd = Math.sqrt(mean(a.map(x => (x - m) ** 2))); return `${m.toFixed(2)} ± ${(1.96 * sd / Math.sqrt(a.length)).toFixed(2)}`; };
console.log(`${SEQ} sequences x ${N} fights. Reward of the learner minus the frozen network (same fights):`);
console.log(`  first third: ${ci(diffs.early)}   last third: ${ci(diffs.late)}   all: ${ci(diffs.all)}`);
console.log(`  mean reward: frozen ${mean(fz).toFixed(2)}, learner ${mean(ln).toFixed(2)}`);
