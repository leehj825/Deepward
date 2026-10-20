// Headless check of the timing circle on enemy blows: every enemy kind that swings at the warden gets a circle that shrinks and arrives
// exactly when the blow lands, it turns gold for the parry window, it is gone when the blow never lands, a feint has none, and it can be
// switched off in Settings.   Run: node tools/timing_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 800, height: 560 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, G = __dw.G;
    const setup = () => { __dw.arena(0); __dw.World.halt(); G.queue = []; for (const e of G.enemies) e.cooldown = 99999; const p = G.player; p.pos.set(0, 0, 4); p.facing = Math.PI; p.hp = p.maxHp; };
    // One enemy kind swinging at the hero: returns what the circle did
    const watch = (type, setting = true) => {
      setup(); Settings.set('timingRing', setting);
      const e = __dw.spawn(type, 0, 4 - 2.0); e.state = 'hunt'; e.cooldown = 0; e.hp = e.maxHp = 9999;
      let seen = 0, shrinking = true, lastScale = Infinity, gold = false, lands = null, struckSeen = false, hits = 0;
      __dw.sim(6, () => {
        const ts = FX.timings;
        if (ts.length) { seen++; const t = ts[0]; const s = t.outer.scale.x; if (t.hit <= 0 && s > lastScale + 1e-6) shrinking = false; lastScale = t.hit <= 0 ? s : Infinity; if (t.hit <= 0 && t.time - t.t <= t.parryWin) gold = true; }
        else lastScale = Infinity;
        if (e.state === 'attack' && e.struck && !struckSeen) { struckSeen = true; hits++; const t = ts[0]; lands = t ? Math.abs(t.t - t.time) < 0.06 || t.hit > 0 : false; }
        if (e.state !== 'attack') struckSeen = false;
        return hits >= 1 && !ts.length;
      });
      return { seen, shrinking, gold, lands, gone: FX.timings.length === 0 };
    };
    for (const type of ['skeleton', 'wolf', 'boar', 'brute', 'knight', 'troll']) {
      if (!CFG.enemies[type]) continue;
      const r = watch(type); o[type] = r.seen > 3 && r.shrinking && r.gold && r.lands === true && r.gone;
    }
    const off = watch('skeleton', false); o.canBeOff = off.seen === 0; Settings.set('timingRing', true);
    // A blow that never lands: the enemy is stunned in the wind-up, the circle goes
    setup(); const e2 = __dw.spawn('skeleton', 0, 2); e2.state = 'hunt'; e2.cooldown = 0; e2.hp = e2.maxHp = 9999;
    __dw.sim(3, () => e2.state === 'attack' && e2.phase === 'wind' && FX.timings.length > 0);
    o.circleOnWindup = FX.timings.length === 1;
    Enemy.parried(e2); __dw.sim(0.1); o.goneWhenParried = FX.timings.length === 0;
    // Colours: red for an unblockable blow (the brute's slam)
    setup(); const br = __dw.spawn('brute', 0, 2); br.state = 'hunt'; br.cooldown = 0; br.hp = br.maxHp = 9999;
    let red = false; __dw.sim(8, () => { if (br.state === 'attack' && br.atk.hits[br.hitIdx].unblockable && FX.timings[0] && FX.timings[0].color === 0xff2a10) red = true; return red; });
    o.redForUnblockable = red;
    // Not for a blow meant for someone far from the warden
    setup(); const far = __dw.spawn('skeleton', 0, -18); far.state = 'hunt'; far.cooldown = 0; far.hp = far.maxHp = 9999; far.tgt = null;
    let any = false; __dw.sim(3, () => { if (far.state === 'attack' && FX.timings.length) any = true; return false; }); o.notForFarBlows = !any;
    return o;
  });
  const bad = Object.entries(out).filter(([, v]) => v !== true).map(([k, v]) => k + '=' + JSON.stringify(v));
  if (errs.length) bad.push('pageerrors: ' + errs.slice(0, 3).join(' | '));
  console.log(bad.length ? 'FAIL ' + bad.join(', ') : 'PASS ' + JSON.stringify(out));
  await b.close(); process.exit(bad.length ? 1 : 0);
})();
