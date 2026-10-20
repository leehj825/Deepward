// Trains the companions' battle policy offline and writes js/policy_weights.js.
//   node tools/policy/train.js [minutes of fine-tuning, default 6]
// 1. Imitation: the hand-written rules (Policy.classic) play 600 scenarios in tools/policy/sim.js; the network learns to copy them
//    (softmax over the legal moves, Adam). That alone gives a working, rule-like policy.
// 2. Evolution strategies: the weights are nudged by random perturbations that scored better in the simulator (antithetic
//    sampling, centred ranks, Adam), on fresh scenarios each generation. The best generation by a held-out set is kept.
// 3. A fair test on scenarios never seen in training, against the rules, paired by scenario; the report goes to docs/policy-report.md.
const fs = require('fs'), path = require('path'), os = require('os'), { Worker } = require('worker_threads');
const { run, makeScenario, classicFn, Policy, rng } = require('./sim.js');
const MIN = parseFloat(process.argv[2] || '6'), CONTINUE = process.argv.includes('--continue');         // --continue: start from the shipped weights instead of imitation
const IN = Policy.N_IN, HID = 20, OUT = Policy.ACTIONS.length, NP = HID * IN + HID + OUT * HID + OUT;
const R = rng(12345), gauss = () => { let u = 0, v = 0; while (!u) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const unpack = th => ({ in: IN, hid: HID, out: OUT, W1: th.slice(0, HID * IN), b1: th.slice(HID * IN, HID * IN + HID), W2: th.slice(HID * IN + HID, HID * IN + HID + OUT * HID), b2: th.slice(NP - OUT) });
const policyOf = th => { const w = unpack(Array.from(th)); return s => Policy.choose(s, w); };
const evalSet = (th, seeds) => { const f = policyOf(th), out = []; for (const sd of seeds) out.push(run(makeScenario(sd), f)); return out; };
const mean = (a, k) => a.reduce((s, x) => s + (typeof k === 'function' ? k(x) : x[k]), 0) / a.length;

// A pool of workers scores candidates in parallel (one fewer than the cores)
const pool = Array.from({ length: Math.max(1, os.cpus().length - 1) }, () => new Worker(path.join(__dirname, 'worker.js')));
let jobId = 0;
function scoreAll(cands, seeds) {
  const per = Math.ceil(cands.length / pool.length), jobs = [];
  pool.forEach((w, k) => {
    const part = cands.slice(k * per, (k + 1) * per); if (!part.length) return;
    jobs.push(new Promise(res => { const id = ++jobId, h = m => { if (m.id === id) { w.off('message', h); res(m.out); } }; w.on('message', h); w.postMessage({ id, cands: part.map(c => Array.from(c)), seeds }); }));
  });
  return Promise.all(jobs).then(parts => [].concat(...parts));
}

// ---------- 1. imitation ----------
function dataset(n, seed0) {
  const X = [], Y = [], M = [];
  for (let i = 0; i < n; i++) run(makeScenario(seed0 + i), s => { const a = Policy.classic(s); X.push(Policy.encode(s)); Y.push(a); M.push(Policy.legal(s)); return a; });
  return { X, Y, M };
}
function imitate(D, epochs) {
  const th = new Float64Array(NP); for (let i = 0; i < HID * IN; i++) th[i] = gauss() * 0.3; for (let i = HID * IN + HID; i < NP - OUT; i++) th[i] = gauss() * 0.3;
  const m = new Float64Array(NP), v = new Float64Array(NP); let t = 0;
  const idx = D.X.map((_, i) => i);
  for (let ep = 0; ep < epochs; ep++) {
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    let loss = 0, hit = 0;
    for (let b = 0; b < idx.length; b += 128) {
      const g = new Float64Array(NP), w = unpack(Array.from(th)); let cnt = 0;
      for (let q = b; q < Math.min(idx.length, b + 128); q++) {
        const k = idx[q], x = D.X[k], mask = D.M[k], y = D.Y[k], h = new Array(HID), o = new Array(OUT);
        for (let j = 0; j < HID; j++) { let a = w.b1[j]; for (let i = 0; i < IN; i++) a += w.W1[j * IN + i] * x[i]; h[j] = Math.tanh(a); }
        let mx = -1e9; for (let c = 0; c < OUT; c++) { let a = w.b2[c]; for (let j = 0; j < HID; j++) a += w.W2[c * HID + j] * h[j]; o[c] = mask[c] ? a : -1e9; if (o[c] > mx) mx = o[c]; }
        let z = 0; const p = o.map(a => { const e = Math.exp(a - mx); z += e; return e; }).map(e => e / z);
        loss -= Math.log(Math.max(1e-9, p[y])); let am = 0; for (let c = 1; c < OUT; c++) if (p[c] > p[am]) am = c; if (am === y) hit++; cnt++;
        const dz = p.map((pp, c) => (pp - (c === y ? 1 : 0)) * (mask[c] ? 1 : 0)), dh = new Array(HID).fill(0);
        for (let c = 0; c < OUT; c++) { g[NP - OUT + c] += dz[c]; for (let j = 0; j < HID; j++) { g[HID * IN + HID + c * HID + j] += dz[c] * h[j]; dh[j] += dz[c] * w.W2[c * HID + j]; } }
        for (let j = 0; j < HID; j++) { const d = dh[j] * (1 - h[j] * h[j]); g[HID * IN + j] += d; for (let i = 0; i < IN; i++) g[j * IN + i] += d * x[i]; }
      }
      t++; for (let i = 0; i < NP; i++) { const gi = g[i] / cnt; m[i] = 0.9 * m[i] + 0.1 * gi; v[i] = 0.999 * v[i] + 0.001 * gi * gi; th[i] -= 0.01 * (m[i] / (1 - 0.9 ** t)) / (Math.sqrt(v[i] / (1 - 0.999 ** t)) + 1e-8); }
    }
    if (ep % 5 === 4 || ep === epochs - 1) console.log(`  imitation epoch ${ep + 1}: loss ${(loss / idx.length).toFixed(3)}, agrees with the rules ${(hit / idx.length * 100).toFixed(1)}%`);
  }
  return th;
}

// ---------- 2. evolution strategies ----------
async function es(th0, minutes) {
  let th = Float64Array.from(th0); const m = new Float64Array(NP), v = new Float64Array(NP); let t = 0;
  const K = 40, SIGMA = 0.05, LR = 0.015, B = 40, DECAY = 0.003, held = Array.from({ length: 160 }, (_, i) => 9000 + i);
  let best = { th: Float64Array.from(th), score: (await scoreAll([th], held))[0], gen: 0 };
  console.log(`  start: held-out reward ${best.score.toFixed(2)}  (rules: ${mean(held.map(sd => run(makeScenario(sd), classicFn)), 'reward').toFixed(2)})`);
  const t0 = Date.now(); let gen = 0;
  while ((Date.now() - t0) / 60000 < minutes) {
    gen++;
    const seeds = Array.from({ length: B }, () => 20000 + Math.floor(R() * 400000)), eps = [], rs = [];
    const cs = [];
    for (let k = 0; k < K; k++) {
      const e = Float64Array.from({ length: NP }, () => gauss());
      for (const sg of [1, -1]) cs.push(Float64Array.from(th, (x, i) => x + sg * SIGMA * e[i]));
      eps.push(e);
    }
    (await scoreAll(cs, seeds)).forEach(r => rs.push(r));
    // centred ranks
    const order = rs.map((r, i) => [r, i]).sort((a, b) => a[0] - b[0]), rank = new Array(rs.length); order.forEach(([, i], r) => { rank[i] = r / (rs.length - 1) - 0.5; });
    const g = new Float64Array(NP);
    for (let k = 0; k < K; k++) { const d = rank[2 * k] - rank[2 * k + 1]; for (let i = 0; i < NP; i++) g[i] += d * eps[k][i]; }
    t++; for (let i = 0; i < NP; i++) { const gi = -g[i] / (K * SIGMA); m[i] = 0.9 * m[i] + 0.1 * gi; v[i] = 0.999 * v[i] + 0.001 * gi * gi; th[i] -= LR * (m[i] / (1 - 0.9 ** t)) / (Math.sqrt(v[i] / (1 - 0.999 ** t)) + 1e-8) + DECAY * (th[i] - th0[i]); }
    if (gen % 8 === 0) {
      const sc = (await scoreAll([th], held))[0];
      if (sc > best.score) best = { th: Float64Array.from(th), score: sc, gen };
      console.log(`  gen ${gen}: held-out reward ${sc.toFixed(2)} (best ${best.score.toFixed(2)} at ${best.gen}), ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  }
  return { th: best.th, gens: gen, heldScore: best.score };
}

// ---------- 3. the test ----------
function compare(th, seeds) {
  const f = policyOf(th), rows = [];
  for (const sd of seeds) { const sc = makeScenario(sd); rows.push({ c: run(sc, classicFn, 1), n: run(sc, f, 1) }); }
  const d = rows.map(r => r.n.reward - r.c.reward), md = mean(d, x => x), sd = Math.sqrt(mean(d, x => (x - md) ** 2)), se = sd / Math.sqrt(d.length);
  const pct = k => (mean(rows, r => r[k] ? 1 : 0) * 100).toFixed(1);
  return { n: rows.length, rules: { reward: mean(rows, r => r.c.reward), cleared: pct('c') && mean(rows, r => r.c.cleared ? 1 : 0) * 100, downs: mean(rows, r => r.c.downs), heroDied: mean(rows, r => r.c.heroDied ? 1 : 0) * 100, time: mean(rows, r => r.c.time), heroDmg: mean(rows, r => r.c.heroDmg), compDmg: mean(rows, r => r.c.compDmg) },
    net: { reward: mean(rows, r => r.n.reward), cleared: mean(rows, r => r.n.cleared ? 1 : 0) * 100, downs: mean(rows, r => r.n.downs), heroDied: mean(rows, r => r.n.heroDied ? 1 : 0) * 100, time: mean(rows, r => r.n.time), heroDmg: mean(rows, r => r.n.heroDmg), compDmg: mean(rows, r => r.n.compDmg) },
    diff: md, ci: 1.96 * se };
}

async function main() {
  let D, th0, keepCb = null;
  if (CONTINUE) {
    const cur = new Function(fs.readFileSync(path.join(__dirname, '../../js/policy_weights.js'), 'utf8').replace(/^[^]*?const DW_POLICY =/, 'return ').replace(/;\s*$/, ';'))();
    th0 = Float64Array.from([].concat(cur.W1, cur.b1, cur.W2, cur.b2)); keepCb = cur.cb || null; D = { X: [], M: [] };
    console.log('1. continuing from the shipped weights (no imitation)');
  } else {
    console.log('1. imitation of the rules');
    D = dataset(600, 100000); console.log(`  ${D.X.length} decisions`);
    th0 = imitate(D, 25);
  }
  const test = Array.from({ length: 400 }, (_, i) => 500000 + i);
  const afterImit = compare(th0, test);
  if (!CONTINUE) console.log(`  after imitation: reward ${afterImit.net.reward.toFixed(2)} vs rules ${afterImit.rules.reward.toFixed(2)} (difference ${afterImit.diff.toFixed(2)} ± ${afterImit.ci.toFixed(2)})`);
  console.log(`2. evolution strategies for ${MIN} minutes`);
  const out = await es(th0, MIN);
  const final = compare(out.th, test);
  if (CONTINUE) {
    const inc = compare(th0, test);
    console.log(`  shipped weights on the same test: ${inc.net.reward.toFixed(2)}; new: ${final.net.reward.toFixed(2)}`);
    if (final.net.reward < inc.net.reward + 0.5) { console.log('  no clear improvement: the shipped weights are kept'); return; }
  }
  console.log('3. test on 400 unseen scenarios');
  console.log(JSON.stringify(final, null, 1));
  const w = unpack(Array.from(out.th)), r = x => Math.round(x * 1e4) / 1e4;
  const weights = { in: IN, hid: HID, out: OUT, W1: w.W1.map(r), b1: w.b1.map(r), W2: w.W2.map(r), b2: w.b2.map(r), ...(keepCb ? { cb: keepCb } : {}),
    meta: { actions: Policy.ACTIONS, trained: new Date().toISOString().slice(0, 10), generations: out.gens, simRewardRules: +final.rules.reward.toFixed(2), simRewardNet: +final.net.reward.toFixed(2), params: NP } };
  fs.writeFileSync(path.join(__dirname, '../../js/policy_weights.js'), '// Generated by tools/policy/train.js (imitation of the rules, then evolution strategies in tools/policy/sim.js). Do not edit by hand.\nconst DW_POLICY = ' + JSON.stringify(weights) + ';\n');
  const f = (o, k, d = 1) => o[k].toFixed(d);
  fs.writeFileSync(path.join(__dirname, '../../docs/policy-report.md'), `# Companion policy: training report

Trained ${weights.meta.trained}: ${NP} weights (${IN} inputs, ${HID} hidden, ${OUT} moves), ${CONTINUE ? 'continued from the earlier weights' : 'imitation of the hand-written rules on ' + D.X.length + ' decisions'}, then ${out.gens} generations of evolution strategies (${MIN} min).
Tested on ${final.n} scenarios never used in training, rules and network on the same scenarios in \`tools/policy/sim.js\` (a simplified copy of the game's combat).

| | Rules | Network |
| --- | --- | --- |
| Mean reward | ${f(final.rules, 'reward')} | ${f(final.net, 'reward')} |
| Fights won | ${f(final.rules, 'cleared')}% | ${f(final.net, 'cleared')}% |
| Companions downed per fight | ${f(final.rules, 'downs', 2)} | ${f(final.net, 'downs', 2)} |
| Warden died | ${f(final.rules, 'heroDied')}% | ${f(final.net, 'heroDied')}% |
| Time to clear (s) | ${f(final.rules, 'time')} | ${f(final.net, 'time')} |
| Warden damage taken (share of health) | ${f(final.rules, 'heroDmg', 2)} | ${f(final.net, 'heroDmg', 2)} |
| Companion damage taken (share of health) | ${f(final.rules, 'compDmg', 2)} | ${f(final.net, 'compDmg', 2)} |

Paired difference in reward (network minus rules): ${final.diff.toFixed(2)} ± ${final.ci.toFixed(2)} (95%).
Right after imitation alone: ${afterImit.diff.toFixed(2)} ± ${afterImit.ci.toFixed(2)}.

The simulator is a sketch of the game, so the real test is \`tools/policy_test.js\` (the same fights in the real game, rules against network).
`);
  require('./gap.js').update();                                   // meta.gap: the unit of the run-time learner
  console.log('wrote js/policy_weights.js and docs/policy-report.md');
}
main().then(() => process.exit(0));
