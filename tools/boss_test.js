// Headless check of the five guardians: size, phases at their health marks, summons, stance change, enrage,
// the Pale Duelist's blink, and adds crumbling when the guardian falls.
// Run: node tools/boss_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
  await pg.waitForTimeout(300);
  const r = await pg.evaluate(() => {
    const out = {}, G = __dw.G, kinds = ['skeleton', 'knight', 'brute', 'spider', 'duelist', 'caster', 'bearer', 'brute', 'necro', 'knight'];
    __dw.setView('behind');
    kinds.forEach((kind, si) => {
      __dw.arena(0); __dw.World.halt(); G.queue = [];
      const p = G.player, at = p.pos.clone();
      p.maxHp = p.hp = 1e6;
      const e = __dw.spawn(kind, at.x, at.z - 5); e.guardian = CFG.bosses[si].name; Enemy.makeBoss(e, si); G.boss = e;
      const o = out[si + ':' + kind] = { bigger: e.def.scale > CFG.enemies[kind].scale, tougher: e.maxHp > CFG.enemies[kind].hp, phases: [] };
      __dw.sim(1.2);
      const hit = n => Enemy.receive(e, { dmg: n, posture: 0, breaksGuard: kind === 'knight' || kind === 'bearer' }, p);
      for (const ph of CFG.bosses[si].phases) {
        e.state = 'hunt'; e.hp = e.maxHp * ph.at + 1; hit(5);
        const roared = e.state === 'roar', immune = hit(9999) === null && e.hp > 0;
        __dw.sim(1.6);
        const adds = G.enemies.filter(x => x.add && x.state !== 'dead').length;
        o.phases.push({ roared, immune, adds, wantAdds: (ph.summon || []).length });
      }
      o.adds = G.enemies.filter(x => x.add).length;
      if (kind === 'knight' || si === 6) o.stance = e.rig.twoHand && !e.def.guard && !e.rig.shield && !!e.dropped;
      if (kind === 'brute') o.enraged = !!e.enraged && e.def.speed > CFG.enemies.brute.speed;
      if (si === 9) o.enraged = !!e.enraged;
      if (si === 4) {
        // Blink: strikes from behind the hero
        e.def.attacks = e.def.attacks.filter(a => a.hits[0].blink); e.cooldown = 0;
        p.pos.copy(at); p.facing = Math.PI; e.pos.set(at.x, 0, at.z - 2.2);
        let blinked = false;
        __dw.sim(1.5, () => { if (e.state === 'attack') { const fx = Math.sin(p.facing), fz = Math.cos(p.facing); blinked = (e.pos.x - p.pos.x) * fx + (e.pos.z - p.pos.z) * fz < -1; return true; } });
        o.blink = blinked;
      }
      e.state = 'broken'; e.hp = 1; hit(50);
      __dw.sim(0.2);
      o.dead = e.state === 'dead';
      o.addsCrumbled = G.enemies.filter(x => x.add && x.state !== 'dead').length === 0;
      o.barTicks = document.querySelectorAll('#bossBar .tick').length;
    });
    return out;
  });
  await b.close();
  let ok = !errs.length;
  for (const [k, o] of Object.entries(r)) {
    const good = o.bigger && o.tougher && o.dead && o.addsCrumbled && o.phases.every(ph => ph.roared && ph.immune && ph.adds >= ph.wantAdds)
      && (o.stance === undefined || o.stance) && (o.enraged === undefined || o.enraged) && (o.blink === undefined || o.blink);
    ok = ok && good;
    console.log((good ? 'PASS ' : 'FAIL ') + k.padEnd(9) + JSON.stringify(o));
  }
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
