// Checks the companions' battle policy: the network file is sound (shape, no NaN, only legal moves, a policy that agrees with the
// rules where it should), and in the real game the learned policy does no worse than the plain rules on the same fights
// (a tank and a healer, and two shooters, against a wave; the warden fights too).
// Run: node tools/policy_test.js [trials per case, default 8]   (needs Playwright; NODE_PATH=$(npm root -g) if installed globally)
const { chromium } = require('playwright');
const path = require('path');
const N = parseInt(process.argv[2] || '8', 10);
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
    const base = { cls: 'warrior', hp: 1, hero: 1, other: 1, downed: 0, dHero: 3, dEnemy: 5, nNear: 1, nHero: 1, targeted: 0, danger: 3, atkRdy: 1, heavyRdy: 1, healRdy: 1, lowest: 1, hurtN: 0, hasTarget: true, dodgeRdy: 1, aoe: 0 };
    o.encodes = Policy.encode(base).length === Policy.N_IN && Policy.encode(base).every(Number.isFinite);
    // The mask: only a cleric heals, only a warrior guards, nothing attacks without a target
    o.mask = Policy.legal(Object.assign({}, base, { cls: 'archer' }))[A.heal] === false && Policy.legal(base)[A.guard] === true && Policy.legal(Object.assign({}, base, { cls: 'mage' }))[A.guard] === false && Policy.legal(Object.assign({}, base, { hasTarget: false }))[A.attack] === false;
    o.dodgeMask = Policy.legal(Object.assign({}, base, { danger: 0.2 }))[A.dodge] === true && Policy.legal(base)[A.dodge] === false && Policy.legal(Object.assign({}, base, { danger: 0.2, dodgeRdy: 0 }))[A.dodge] === false && Policy.classic(Object.assign({}, base, { danger: 0.15 })) === A.dodge && Policy.classic(Object.assign({}, base, { danger: 0.15, dodgeRdy: 0 })) !== A.dodge;
    // Whatever the state, the network only picks a legal move
    let ok = true, agree = 0, n = 0;
    for (let i = 0; i < 4000; i++) {
      const s = { cls: Policy.CLS[i % 4], hp: Math.random(), hero: Math.random(), other: Math.random(), downed: Math.floor(Math.random() * 3), dHero: Math.random() * 20, dEnemy: Math.random() < 0.15 ? 99 : Math.random() * 15, nNear: Math.floor(Math.random() * 5), nHero: Math.floor(Math.random() * 5), targeted: Math.floor(Math.random() * 3), danger: Math.random() * 3, atkRdy: Math.random() < 0.6 ? 1 : 0, heavyRdy: Math.random() < 0.3 ? 1 : 0, healRdy: Math.random() < 0.3 ? 1 : 0, lowest: Math.random(), hurtN: Math.floor(Math.random() * 3), hasTarget: Math.random() < 0.85, dodgeRdy: Math.random() < 0.5 ? 1 : 0, aoe: Math.random() < 0.3 ? 1 : 0 };
      s.lowest = Math.min(s.lowest, s.hp); const m = Policy.legal(s), c = Policy.choose(s);
      if (c == null || !m[c]) ok = false; if (c === Policy.classic(s)) agree++; n++;
    }
    o.onlyLegal = ok; o.agreement = +(agree / n).toFixed(2); o.agreesMostly = agree / n > 0.6;
    o.toggleOff = (Settings.set('learnedAI', false), Settings.get('learnedAI') === false); Settings.set('learnedAI', true);
    return o;
  });
  // The real fights
  const trial = async (ids, learned) => pg.evaluate(([ids, learned]) => {
    const I = __dw.Items, G = __dw.G; Settings.set('learnedAI', learned); Settings.set('learnOnline', false);
    __dw.arena(0); __dw.World.halt(); G.queue = []; for (const e of G.enemies) e.cooldown = 99999;
    const p = G.player; p.pos.set(0, 0, 4); p.facing = Math.PI; p.hp = p.maxHp; I.S.gold = 9999; I.S.party = []; I.S.hired = {}; I.S.rescued = []; I.S.stage = 1; Party.clear();
    for (const id of ids) Party.recruit(id);
    __dw.sim(0.2);
    const foes = [['skeleton', -4], ['skeleton', 0], ['knight', 4], ['wolf', 7], ['brute', -7], ['archer', 2]].map(([t, x]) => { const e = __dw.spawn(t, x, -12); e.state = 'hunt'; return e; });
    let downs = 0; const was = new Map(G.allies.map(a => [a, false]));
    const hp0 = p.maxHp, ally0 = G.allies.reduce((s, a) => s + a.maxHp, 0); let allyLost = 0, last = new Map(G.allies.map(a => [a, a.hp]));
    let t = 0;
    // The warden fights like the simulator's scripted one: walks up to the nearest foe and swings
    __dw.setView('top'); let swing = 0;
    __dw.sim(60, () => {
      t += 1 / 60; p.st = p.maxSt; swing -= 1 / 60;
      let ne = null, nd = 99; for (const e of foes) if (e.state !== 'dead') { const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < nd) { nd = d; ne = e; } }
      if (ne && nd < 14 && p.state !== 'dead') {
        const dx = ne.pos.x - p.pos.x, dz = ne.pos.z - p.pos.z;
        __dw.Input.move.x = nd > 2.2 ? dx / nd * 0.8 : 0; __dw.Input.move.z = nd > 2.2 ? dz / nd * 0.8 : 0;
        if (nd < 2.6 && swing <= 0) { __dw.press('light'); swing = 0.7; }
      } else { __dw.Input.move.x = 0; __dw.Input.move.z = 0; }
      for (const a of G.allies) { const d = a.state === 'down'; if (d && !was.get(a)) downs++; was.set(a, d); if (a.hp < last.get(a)) allyLost += last.get(a) - a.hp; last.set(a, a.hp); }
      p.state === 'dead' || (p.hp = Math.max(p.hp, 0));
      return foes.every(e => e.state === 'dead') || p.state === 'dead';
    });
    __dw.Input.move.x = 0; __dw.Input.move.z = 0;
    return { cleared: foes.every(e => e.state === 'dead'), time: t, heroLost: (hp0 - Math.max(0, p.hp)) / hp0, allyLost: allyLost / ally0, downs, heroDied: p.state === 'dead' };
  }, [ids, learned]);
  // Learning while playing: a fight is scored and nudges the preferences, which are saved; forgetting clears them
  const learn = await pg.evaluate(() => {
    const o = {}, I = __dw.Items, G = __dw.G; Settings.set('learnedAI', true); Settings.set('learnOnline', true);
    __dw.arena(0); __dw.World.halt(); G.queue = []; for (const e of G.enemies) e.cooldown = 99999;
    const p = G.player; p.pos.set(0, 0, 4); p.facing = Math.PI; I.S.gold = 9999; I.S.party = []; Party.clear(); Party.recruit('hobb'); Party.recruit('aldo'); __dw.sim(0.2);
    o.noneYet = Party.fights() === 0;
    const foes = [-3, 3].map(x => { const e = __dw.spawn('skeleton', x, -9); e.state = 'hunt'; return e; });
    __dw.sim(40, () => { p.st = p.maxSt; return foes.every(e => e.state === 'dead'); });
    __dw.sim(4);                                                         // quiet for a moment: the fight ends
    o.learned = Party.fights() === 1 && !!I.S.policyAdapt && Object.keys(I.S.policyAdapt.bias).length === 4;
    o.biasMoved = Object.values(I.S.policyAdapt.bias).some(b => b.some(x => x !== 0)) || I.S.policyAdapt.n === 1;
    o.fightLog = I.S.policyAdapt.log.length === 1 && typeof I.S.policyAdapt.log[0].r === 'number' && I.S.policyAdapt.log[0].party === 'hobb+aldo';
    // A bad long fight cannot swamp the score
    o.scoreCapped = Policy.Learner.score({ frac: 0, cleared: false, time: 75, downs: 9, heroDied: true, heroLost: 9, compLost: 9 }) >= -100 && Policy.Learner.score({ frac: 1, cleared: true, time: 5, downs: 0, heroDied: false, heroLost: 0, compLost: 0 }) <= 100;
    // The saved table loads back, and stays inside its clip
    const back = Policy.Learner.make(JSON.parse(JSON.stringify(I.S.policyAdapt)));
    o.roundTrip = back.n === 1 && Object.values(back.bias).every(b => b.every(x => Math.abs(x) <= 2));
    // With learning off nothing is recorded
    Settings.set('learnOnline', false); const n0 = Party.fights();
    const f2 = [-3].map(x => { const e = __dw.spawn('skeleton', x, -9); e.state = 'hunt'; return e; }); __dw.sim(40, () => { p.st = p.maxSt; return f2.every(e => e.state === 'dead'); }); __dw.sim(4);
    o.offStaysPut = Party.fights() === n0;
    // The Party panel offers Share, Copy and the text itself
    __dw.openPanel('party'); const has = a => !!document.querySelector(`[data-act="${a}"]`);
    o.shareButtons = has('policyshare') && has('policycopy') && has('policyshow');
    document.querySelector('[data-act="policyshare"]').click(); document.querySelector('[data-act="policycopy"]').click();
    document.querySelector('[data-act="policyshow"]').click(); o.textShown = /DWPOLICY1:/.test((document.querySelector('.savecode textarea') || {}).value || '');
    while (__dw.UI.open) __dw.UI.close();
    // The learned preferences copy out as text, and tools/policy/bake.js folds such text into a network's per-class bias
    const code = Party.exportData(); o.exportCode = /^DWPOLICY1:[A-Za-z0-9+\/=]+$/.test(code) && JSON.parse(atob(code.slice(10))).n === 1;
    o.exportCode = o.exportCode && (window.__code = code, true);
    // A baked bias changes a class's choice only by its own amount (a big bias for one move wins whenever that move is legal)
    const s0 = { cls: 'archer', hp: 1, hero: 1, other: 1, downed: 0, dHero: 3, dEnemy: 8, nNear: 1, nHero: 1, targeted: 0, danger: 3, atkRdy: 1, heavyRdy: 0, healRdy: 0, lowest: 1, hurtN: 0, hasTarget: true, dodgeRdy: 1, aoe: 0 };
    const w0 = JSON.parse(JSON.stringify(DW_POLICY)), w1 = JSON.parse(JSON.stringify(DW_POLICY)); w1.cb = { archer: [0, 0, 0, 50, 0, 0, 0], warrior: [0, 0, 0, 0, 0, 0, 0], mage: [0, 0, 0, 0, 0, 0, 0], cleric: [0, 0, 0, 0, 0, 0, 0] };
    o.bakedBias = Policy.choose(s0, w1) === Policy.A.regroup && Policy.choose(Object.assign({}, s0, { cls: 'mage' }), w1) === Policy.choose(Object.assign({}, s0, { cls: 'mage' }), w0);
    Party.forget(); o.forgets = Party.fights() === 0 && Party.exportData() === '';
    Settings.set('learnOnline', true);
    return o;
  });
  // tools/policy/bake.js: a code from the game folds into a copy of the weights
  const fsx = require('fs'), os = require('os'), cp = require('child_process');
  const code = await pg.evaluate(() => window.__code), tmp = path.join(os.tmpdir(), 'dw_policy_copy.js');
  fsx.copyFileSync(path.join(__dirname, '../js/policy_weights.js'), tmp);
  const run = cp.spawnSync('node', [path.join(__dirname, 'policy/bake.js'), code], { env: Object.assign({}, process.env, { POLICY_FILE: tmp }), encoding: 'utf8' });
  const baked = new Function(fsx.readFileSync(tmp, 'utf8').replace(/^[^]*?const DW_POLICY =/, 'return ').replace(/;\s*$/, ';'))();
  learn.bakeRuns = run.status === 0 && !!baked.cb && Object.keys(baked.cb).length === 4 && baked.meta.baked >= 1 && [].concat(...Object.values(baked.cb)).every(Number.isFinite);
  const cases = { 'tank and healer': ['hobb', 'aldo'], 'two shooters': ['mira', 'pell'] };
  const res = {};
  for (const [name, ids] of Object.entries(cases)) {
    res[name] = { rules: [], net: [] };
    for (let i = 0; i < N; i++) { res[name].rules.push(await trial(ids, false)); res[name].net.push(await trial(ids, true)); }
  }
  const mean = (a, k) => a.reduce((s, x) => s + (typeof x[k] === 'boolean' ? +x[k] : x[k]), 0) / a.length;
  // A single score for a fight: lower is better
  const cost = r => (r.cleared ? 0 : 1) * 1.0 + r.heroLost * 0.6 + r.allyLost * 0.3 + r.downs * 0.3 + (r.heroDied ? 1 : 0) + r.time / 45 * 0.2;
  const out = { unit, learn, cases: {} };
  let fine = true;
  for (const [name, r] of Object.entries(res)) {
    const c = { rules: +mean(r.rules.map(x => ({ c: cost(x) })), 'c').toFixed(3), net: +mean(r.net.map(x => ({ c: cost(x) })), 'c').toFixed(3) };
    c.detail = { rules: { cleared: mean(r.rules, 'cleared'), time: +mean(r.rules, 'time').toFixed(1), heroLost: +mean(r.rules, 'heroLost').toFixed(2), allyLost: +mean(r.rules, 'allyLost').toFixed(2), downs: mean(r.rules, 'downs') }, net: { cleared: mean(r.net, 'cleared'), time: +mean(r.net, 'time').toFixed(1), heroLost: +mean(r.net, 'heroLost').toFixed(2), allyLost: +mean(r.net, 'allyLost').toFixed(2), downs: mean(r.net, 'downs') } };
    c.notWorse = c.net <= c.rules + 0.3;                       // the learned policy must not be clearly worse than the rules
    fine = fine && c.notWorse; out.cases[name] = c;
  }
  const bad = Object.entries(unit).filter(([k, v]) => k !== 'agreement' && v !== true).map(([k]) => k).concat(Object.entries(learn).filter(([, v]) => v !== true).map(([k]) => 'learn.' + k));
  if (!fine) bad.push('learned policy worse than the rules in a real fight');
  if (errs.length) bad.push('pageerrors: ' + errs.slice(0, 3).join(' | '));
  console.log(bad.length ? 'FAIL ' + bad.join(', ') + '\n' + JSON.stringify(out, null, 1) : 'PASS ' + JSON.stringify(out));
  await b.close(); process.exit(bad.length ? 1 : 0);
})();
