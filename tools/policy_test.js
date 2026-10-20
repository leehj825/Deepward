// Checks the companions' battle policy: the network file is sound (shape, no NaN, only legal moves, a policy that agrees with the
// rules where it should), and in the real game the learned policy does no worse than the plain rules on the same fights
// (a tank and a healer, and two shooters, against a wave; the warden stands still).
// Run: node tools/policy_test.js [trials per case, default 5]   (needs Playwright; NODE_PATH=$(npm root -g) if installed globally)
const { chromium } = require('playwright');
const path = require('path');
const N = parseInt(process.argv[2] || '5', 10);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 800, height: 560 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  const unit = await pg.evaluate(() => {
    const o = {}, w = DW_POLICY, A = Policy.A;
    o.shape = w.in === Policy.N_IN && w.out === Policy.ACTIONS.length && w.W1.length === w.in * w.hid && w.W2.length === w.out * w.hid && w.b1.length === w.hid && w.b2.length === w.out;
    o.finite = [...w.W1, ...w.b1, ...w.W2, ...w.b2].every(Number.isFinite);
    o.ready = Policy.ready === true && !!Policy.info && Policy.info.actions.join() === Policy.ACTIONS.join();
    const base = { cls: 'warrior', hp: 1, hero: 1, other: 1, downed: 0, dHero: 3, dEnemy: 5, nNear: 1, nHero: 1, targeted: 0, danger: 3, atkRdy: 1, heavyRdy: 1, healRdy: 1, lowest: 1, hurtN: 0, hasTarget: true };
    o.encodes = Policy.encode(base).length === Policy.N_IN && Policy.encode(base).every(Number.isFinite);
    // The mask: only a cleric heals, only a warrior guards, nothing attacks without a target
    o.mask = Policy.legal(Object.assign({}, base, { cls: 'archer' }))[A.heal] === false && Policy.legal(base)[A.guard] === true && Policy.legal(Object.assign({}, base, { cls: 'mage' }))[A.guard] === false && Policy.legal(Object.assign({}, base, { hasTarget: false }))[A.attack] === false;
    // Whatever the state, the network only picks a legal move
    let ok = true, agree = 0, n = 0;
    for (let i = 0; i < 4000; i++) {
      const s = { cls: Policy.CLS[i % 4], hp: Math.random(), hero: Math.random(), other: Math.random(), downed: Math.floor(Math.random() * 3), dHero: Math.random() * 20, dEnemy: Math.random() < 0.15 ? 99 : Math.random() * 15, nNear: Math.floor(Math.random() * 5), nHero: Math.floor(Math.random() * 5), targeted: Math.floor(Math.random() * 3), danger: Math.random() * 3, atkRdy: Math.random() < 0.6 ? 1 : 0, heavyRdy: Math.random() < 0.3 ? 1 : 0, healRdy: Math.random() < 0.3 ? 1 : 0, lowest: Math.random(), hurtN: Math.floor(Math.random() * 3), hasTarget: Math.random() < 0.85 };
      s.lowest = Math.min(s.lowest, s.hp); const m = Policy.legal(s), c = Policy.choose(s);
      if (c == null || !m[c]) ok = false; if (c === Policy.classic(s)) agree++; n++;
    }
    o.onlyLegal = ok; o.agreement = +(agree / n).toFixed(2); o.agreesMostly = agree / n > 0.6;
    o.toggleOff = (Settings.set('learnedAI', false), Settings.get('learnedAI') === false); Settings.set('learnedAI', true);
    return o;
  });
  // The real fights
  const trial = async (ids, learned) => pg.evaluate(([ids, learned]) => {
    const I = __dw.Items, G = __dw.G; Settings.set('learnedAI', learned);
    __dw.arena(0); __dw.World.halt(); G.queue = []; for (const e of G.enemies) e.cooldown = 99999;
    const p = G.player; p.pos.set(0, 0, 4); p.facing = Math.PI; p.hp = p.maxHp; I.S.gold = 9999; I.S.party = []; I.S.hired = {}; I.S.rescued = []; I.S.stage = 1; Party.clear();
    for (const id of ids) Party.recruit(id);
    __dw.sim(0.2);
    const foes = [['skeleton', -4], ['skeleton', 0], ['knight', 4], ['wolf', 7]].map(([t, x]) => { const e = __dw.spawn(t, x, -12); e.state = 'hunt'; return e; });
    let downs = 0; const was = new Map(G.allies.map(a => [a, false]));
    const hp0 = p.maxHp, ally0 = G.allies.reduce((s, a) => s + a.maxHp, 0); let allyLost = 0, last = new Map(G.allies.map(a => [a, a.hp]));
    let t = 0;
    __dw.sim(45, () => {
      t += 1 / 60; p.st = p.maxSt;
      for (const a of G.allies) { const d = a.state === 'down'; if (d && !was.get(a)) downs++; was.set(a, d); if (a.hp < last.get(a)) allyLost += last.get(a) - a.hp; last.set(a, a.hp); }
      p.state === 'dead' || (p.hp = Math.max(p.hp, 0));
      return foes.every(e => e.state === 'dead') || p.state === 'dead';
    });
    return { cleared: foes.every(e => e.state === 'dead'), time: t, heroLost: (hp0 - Math.max(0, p.hp)) / hp0, allyLost: allyLost / ally0, downs, heroDied: p.state === 'dead' };
  }, [ids, learned]);
  const cases = { 'tank and healer': ['hobb', 'aldo'], 'two shooters': ['mira', 'pell'] };
  const res = {};
  for (const [name, ids] of Object.entries(cases)) {
    res[name] = { rules: [], net: [] };
    for (let i = 0; i < N; i++) { res[name].rules.push(await trial(ids, false)); res[name].net.push(await trial(ids, true)); }
  }
  const mean = (a, k) => a.reduce((s, x) => s + (typeof x[k] === 'boolean' ? +x[k] : x[k]), 0) / a.length;
  // A single score for a fight: lower is better
  const cost = r => (r.cleared ? 0 : 1) * 1.0 + r.heroLost * 0.6 + r.allyLost * 0.3 + r.downs * 0.3 + (r.heroDied ? 1 : 0) + r.time / 45 * 0.2;
  const out = { unit, cases: {} };
  let fine = true;
  for (const [name, r] of Object.entries(res)) {
    const c = { rules: +mean(r.rules.map(x => ({ c: cost(x) })), 'c').toFixed(3), net: +mean(r.net.map(x => ({ c: cost(x) })), 'c').toFixed(3) };
    c.detail = { rules: { cleared: mean(r.rules, 'cleared'), time: +mean(r.rules, 'time').toFixed(1), heroLost: +mean(r.rules, 'heroLost').toFixed(2), allyLost: +mean(r.rules, 'allyLost').toFixed(2), downs: mean(r.rules, 'downs') }, net: { cleared: mean(r.net, 'cleared'), time: +mean(r.net, 'time').toFixed(1), heroLost: +mean(r.net, 'heroLost').toFixed(2), allyLost: +mean(r.net, 'allyLost').toFixed(2), downs: mean(r.net, 'downs') } };
    c.notWorse = c.net <= c.rules + 0.15;                       // the learned policy must not be clearly worse than the rules
    fine = fine && c.notWorse; out.cases[name] = c;
  }
  const bad = Object.entries(unit).filter(([k, v]) => k !== 'agreement' && v !== true).map(([k]) => k);
  if (!fine) bad.push('learned policy worse than the rules in a real fight');
  if (errs.length) bad.push('pageerrors: ' + errs.slice(0, 3).join(' | '));
  console.log(bad.length ? 'FAIL ' + bad.join(', ') + '\n' + JSON.stringify(out, null, 1) : 'PASS ' + JSON.stringify(out));
  await b.close(); process.exit(bad.length ? 1 : 0);
})();
