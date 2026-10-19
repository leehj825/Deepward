// Headless check that an area blow is aimed once: its floor ring stays where it was drawn while the foe winds up, a
// dash out of the ring is safe, and a warden who stays in it is hit. Leaps land on their ring.
// Run: node tools/aoe_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 900, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, G = __dw.G;
    __dw.arena(0); __dw.World.halt(); for (const e of G.enemies) e.remove = true; G.queue = []; __dw.sim(0.1);
    const p = G.player, r = __dw.World.sections[0];
    // One blow: the brute's slam (idx 2 is a red, unblockable area blow), the troll's leaping slam and the long leap
    const run = (type, idx, dash, dist = 3) => {
      for (const e of G.enemies) e.remove = true; __dw.sim(0.05);
      p.pos.set(r.cx, 0, r.cz + 2); p.hp = p.maxHp = 1e5; p.state = 'idle';
      const e = __dw.spawn(type, r.cx, r.cz + 2 - dist); e.state = 'hunt'; e.rig.root.position.y = 0; e.facing = 0; e.cooldown = 99; e.aggro = true;
      __dw.sim(0.05); Enemy.startAttack(e, idx); const h = e.atk.hits[0];
      const ring0 = e.ring.m.position.clone(), hp0 = p.hp;
      __dw.sim(h.wind * 0.4);
      if (dash) { p.pos.x += 5; }                                       // out of the ring, sideways
      for (let t = 0; t < h.wind * 0.6 + h.active + 0.1; t += 0.05) { __dw.sim(0.05); if (e.ring && e.ring.m) o.lastRing = e.ring.m.position.clone(); }
      const moved = o.lastRing ? o.lastRing.distanceTo(ring0) : 0;
      return { moved: +moved.toFixed(3), hit: p.hp < hp0, landed: e.aoeTo ? +Math.hypot(e.pos.x - e.aoeTo.x, e.pos.z - e.aoeTo.z).toFixed(2) : -1 };
    };
    const brute = CFG.enemies.brute.attacks.findIndex(a => a.hits[0].aoe);
    o.bruteDash = run('brute', brute, true); o.bruteStay = run('brute', brute, false);
    const slam = CFG.enemies.troll.attacks.findIndex(a => a.hits[0].aoe && a.hits[0].leap);
    o.trollDash = run('troll', slam, true, 4.5); o.trollStay = run('troll', slam, false, 4.5);
    o.leapStay = run('mutant', 3, false, 8);
    return o;
  });
  const okv = r => r.moved < 0.01;
  const ok = !errs.length && okv(out.bruteDash) && !out.bruteDash.hit && out.bruteStay.hit && okv(out.trollDash) && !out.trollDash.hit && out.trollStay.hit
    && out.trollStay.landed >= 0 && out.trollStay.landed < 0.1 && out.leapStay.hit && out.leapStay.landed >= 0 && out.leapStay.landed < 0.1;
  delete out.lastRing;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out));
  if (errs.length) console.log('ERRORS', errs);
  await b.close(); process.exit(ok ? 0 : 1);
})();
