// Headless check of the horde: bigger waves, the cap, the next wave coming as the last few fall, the kill streak, the attacker limit.
// Run: node tools/horde_test.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 900, height: 560 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, G = __dw.G, W = __dw.World; let p;
    const mine = r => G.enemies.filter(e => e.room === r && e.state !== 'dead');
    const killOne = e => { e.state = 'broken'; Enemy.receive(e, { dmg: 1e9, posture: 0 }, p); };
    __dw.arena(0); p = G.player; p.maxHp = p.hp = 1e7;
    const r = W.rooms.find(q => q.kind !== 'side' && q.j === 2); p.pos.set(r.cx, 0, r.cz + r.hd - 2); __dw.sim(2.5);
    const base = r.inf.room.waves[0].length, n0 = mine(r).length;
    o.bigger = n0 > base;
    o.cap = n0 <= CFG.horde.cap;
    // The next wave comes while a couple are still standing
    const live = mine(r); for (let i = 0; i < live.length - 1; i++) killOne(live[i]);
    __dw.sim(2.5); o.chains = r.wave === 1;
    // The streak
    for (const e of G.enemies) if (e.state !== 'dead') { e.state = 'broken'; Enemy.receive(e, { dmg: 1e9, posture: 0 }, p); }
    G.queue = []; p.hp = p.maxHp * 0.5; p.ultCd = 0;
    const foes = Array.from({ length: 6 }, (_, i) => __dw.spawn('skeleton', -8 + i, -30)); foes.forEach(e => { e.state = 'hunt'; e.cooldown = 99999; });
    const hp0 = p.hp; foes.forEach(killOne); o.streak = G.streak >= 5 && p.hp > hp0;
    // The attacker limit (Normal: four at once) with a crowd around the warden
    for (const e of G.enemies) if (e.state !== 'dead') killOne(e); G.queue = [];
    Settings.set('difficulty', 'normal'); p.hp = p.maxHp = 1e7;
    const crowd = Array.from({ length: 9 }, (_, i) => { const a = i / 9 * Math.PI * 2; const e = __dw.spawn('skeleton', p.pos.x + Math.sin(a) * 2.2, p.pos.z + Math.cos(a) * 2.2); e.state = 'hunt'; return e; });
    let max = 0; __dw.sim(8, () => { max = Math.max(max, G.enemies.filter(e => e.state === 'attack').length); return false; });
    o.maxAttack = max; o.limit = max <= CFG.maxAttackers + Settings.diff.attackers && max >= 3;
    return o;
  });
  await b.close();
  const bad = Object.entries(out).filter(([k, v]) => v !== true && k !== 'maxAttack');
  const ok = !errs.length && !bad.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out)); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
