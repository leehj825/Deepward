// Compares two sets of network weights, and the plain rules, on the same randomized REAL fights (the fights of real_train.js), headless.
//   node tools/policy/compare_real.js <candidate weights .js> [fights, default 200] [browsers, default 3] [baseline weights .js, default js/policy_weights.js]
// Prints rewards, wins, downs and paired differences with 95% intervals: the check to run before shipping new weights.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const cand = process.argv[2], N = parseInt(process.argv[3] || '200', 10), W = parseInt(process.argv[4] || '3', 10), base = process.argv[5] || path.join(__dirname, '../../js/policy_weights.js');
if (!cand) { console.error('usage: compare_real.js <candidate weights file> [fights] [browsers] [baseline file]'); process.exit(1); }
const loadW = f => new Function(fs.readFileSync(f, 'utf8').replace(/^[^]*?const DW_POLICY =/, 'return ').replace(/;\s*$/, ';'))();
const A = loadW(base), B = loadW(cand);
// The fight itself is taken from real_train.js (so both always play the same game)
const src = fs.readFileSync(path.join(__dirname, 'real_train.js'), 'utf8');
const m = src.match(/const FIGHT = `([^]*?\n\}\))`;/); if (!m) throw new Error('could not find the fight in real_train.js');
const defaults = { WAVE_BASE: 1, BRUTE_P: 0.05, MULT_PER_TIER: 0.05, LV_PER_TIER: 6 };
const FIGHT = m[1].replace(/\$\{(WAVE_BASE|BRUTE_P|MULT_PER_TIER|LV_PER_TIER)\}/g, (_, k) => defaults[k]);
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
(async () => {
  const pages = [];
  for (let i = 0; i < W; i++) {
    const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const pg = await b.newPage({ viewport: { width: 400, height: 300 } });
    await pg.goto('file://' + path.resolve(__dirname, '../../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
    pages.push({ b, pg });
  }
  const seeds = Array.from({ length: N }, (_, i) => 920000 + i), tasks = [];
  for (const s of seeds) for (const who of ['rules', 'A', 'B']) tasks.push([who, s]);
  const out = new Array(tasks.length); let next = 0, done = 0; const t0 = Date.now();
  await Promise.all(pages.map(async ({ pg }) => {
    while (next < tasks.length) {
      const i = next++, [who, seed] = tasks[i];
      try {
        const w = who === 'B' ? B : A;
        out[i] = await Promise.race([pg.evaluate(`(() => { const w = ${JSON.stringify(who === 'rules' ? null : w)}; if (w) { for (const k of ['W1', 'b1', 'W2', 'b2', 'cb', 'meta']) { if (w[k] === undefined) delete DW_POLICY[k]; else DW_POLICY[k] = w[k]; } } return (${FIGHT})(${JSON.stringify([seed, null, who === 'rules' ? 'rules' : 'base'])}); })()`), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 100000))]);
      } catch (e) { out[i] = null; }
      if (++done % 60 === 0) console.log(`  ${done}/${tasks.length} fights, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
    }
  }));
  const col = who => seeds.map((_, k) => out[k * 3 + ['rules', 'A', 'B'].indexOf(who)]);
  const R = col('rules'), SA = col('A'), SB = col('B');
  const diff = (X, Y) => { const d = X.map((x, i) => x && Y[i] ? x.r - Y[i].r : null).filter(x => x !== null), md = mean(d), sd = Math.sqrt(mean(d.map(x => (x - md) ** 2))); return `${md.toFixed(2)} ± ${(1.96 * sd / Math.sqrt(d.length)).toFixed(2)} (${d.length} pairs)`; };
  const row = (n, X0) => { const X = X0.filter(Boolean); return `${n.padEnd(26)} reward ${mean(X.map(x => x.r)).toFixed(1).padStart(6)}  won ${(mean(X.map(x => x.cleared ? 1 : 0)) * 100).toFixed(0).padStart(3)}%  downs/fight ${mean(X.map(x => x.downs)).toFixed(2)}  warden died ${(mean(X.map(x => x.died ? 1 : 0)) * 100).toFixed(0)}%`; };
  console.log(row('plain rules', R)); console.log(row('baseline network (A)', SA)); console.log(row('candidate network (B)', SB));
  console.log(`A minus rules: ${diff(SA, R)}\nB minus rules: ${diff(SB, R)}\nB minus A:     ${diff(SB, SA)}`);
  for (const { b } of pages) await b.close();
})().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
