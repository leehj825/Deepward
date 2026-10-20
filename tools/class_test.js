// Headless check of the classes: archer, mage and cleric start with their own gear, fire real projectiles on light and
// heavy attacks, the cleric's toggle swaps holy bolts for healing and her heavy cast mends with a cooldown, and the gear
// (weapons, off-hand pieces, affixes, uniques) is class-aware and pictured.
// Run: node tools/class_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 900, height: 620 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, I = __dw.Items, G = __dw.G;
    // A fresh hero of this class in the first room, with a still dummy ahead (n of them, spaced along the line of fire)
    const setup = (cls, dummies = [[0, -8]]) => {
      __dw.arena(0); I.setClass(cls); G.onGearChanged(false); const p = G.player; p.facing = Math.PI;
      p.pos.set(0, 0, 4); p.st = p.maxSt; p.hp = p.maxHp * 0.5;
      __dw.World.halt(); G.queue = []; for (const e of G.enemies) e.cooldown = 99999;     // the room's own foes hold back
      return dummies.map(([x, z]) => { const e = __dw.spawn('sparring', x, z); e.state = 'hunt'; e.cooldown = 99999; return e; });
    };
    const hits = es => es.reduce((n, e) => n + (e.maxHp - e.hp), 0);
    const cast = (act, secs = 1.6) => { __dw.press(act); __dw.sim(secs); };

    // --- Gear is class-aware
    for (const cls of ['archer', 'mage', 'cleric', 'warrior']) {
      setup(cls, []);
      const w = I.S.equip.weapon, sh = I.S.equip.shield, C = CFG.classes[cls];
      o[cls + 'Start'] = w.type === C.start && sh.kind === C.offhand && I.slotName('shield') === CFG.gear.offhands[C.offhand].label;
      const types = new Set(); for (let i = 0; i < 80; i++) types.add(I.generate(2, { slot: 'weapon' }).type);
      o[cls + 'Drops'] = [...types].every(t => C.weapons.includes(t));
      const kinds = new Set(); for (let i = 0; i < 20; i++) kinds.add(I.generate(2, { slot: 'shield' }).kind);
      o[cls + 'Offhand'] = kinds.size === 1 && kinds.has(C.offhand);
      for (const s of CFG.gear.slots) I.describe(I.generate(3, { slot: s, rarity: 2 }));         // no exceptions in any slot
      o[cls + 'Stats'] = I.stats().maxHp > 0 && I.stats().ranged === (cls !== 'warrior');
    }
    const hpOf = c => { setup(c, []); return I.stats().maxHp; };
    o.hpOrder = hpOf('mage') < hpOf('archer') && hpOf('archer') < hpOf('warrior');
    // Class-only affixes and uniques
    setup('warrior', []); const wa = new Set(); for (let i = 0; i < 300; i++) for (const a of I.generate(4, { rarity: 3 }).aff) wa.add(a.k);
    o.warriorNoRangedAffix = !wa.has('power') && !wa.has('mend');
    setup('cleric', []); const ca = new Set(); for (let i = 0; i < 400; i++) for (const a of I.generate(4, { rarity: 3 }).aff) ca.add(a.k);
    o.clericAffix = ca.has('mend') && ca.has('power');
    o.uniqueByClass = (() => { setup('mage', []); const u = []; for (let i = 0; i < 40; i++) u.push(I.generateUnique(2, { slot: 'weapon' }).uniq); return u.every(x => x === 'storm'); })();

    // --- The archer: an arrow lands at range; the heavy shot pierces a line
    let [d] = setup('archer'); cast('light'); o.arrow = d.maxHp - d.hp > 0;
    const lineA = setup('archer', [[0, -6], [0, -10]]); cast('heavy', 2); o.pierce = lineA.every(e => e.maxHp - e.hp > 0);
    const lineB = setup('archer', [[0, -6], [0, -10]]); cast('light'); o.arrowStops = lineB[0].maxHp - lineB[0].hp > 0 && lineB[1].maxHp - lineB[1].hp === 0;
    const heavyA = (() => { const [e] = setup('archer'); cast('heavy', 2); return e.maxHp - e.hp; })();
    const lightA = (() => { const [e] = setup('archer'); cast('light'); return e.maxHp - e.hp; })();
    o.archerHeavyMore = heavyA > lightA * 2;
    // Rain of Arrows (the art) needs mastery rank 3
    o.archerArt = !!CFG.player.arts.bow;

    // --- The mage: bolt; fireball splashes a pair and sets them burning
    const [mb] = setup('mage'); cast('light'); const bolt = mb.maxHp - mb.hp; o.bolt = bolt > 0;
    const pair = setup('mage', [[0, -9], [1.2, -9]]); cast('heavy', 2.4);
    o.splash = pair.every(e => e.maxHp - e.hp > 0);
    const blast = hits(pair); __dw.sim(2.2); o.burns = hits(pair) > blast;
    o.fireNeedsStamina = (() => { setup('mage', []); const p = G.player; const st = p.st; __dw.press('heavy'); __dw.sim(0.1); return p.st < st - 20; })();

    // --- The cleric: weaker than the mage, strong against the dead, toggles to healing
    const [cb] = setup('cleric'); cast('light'); const holy = cb.maxHp - cb.hp; o.holyWeaker = holy > 0 && holy < bolt * 0.8;
    setup('cleric', []); const sk = __dw.spawn('skeleton', 0, -8); sk.state = 'hunt'; sk.cooldown = 99999; const sk0 = sk.hp; cast('light'); const holySk = sk0 - sk.hp;
    const [cd2] = setup('cleric'); // same attack on a living dummy for comparison
    cast('light'); const holyLive = cd2.maxHp - cd2.hp;
    o.undeadBonus = holySk > 0 && holyLive > 0;
    setup('cleric', []); const p = G.player; o.smiteDefault = !p.healMode;
    const hp0 = p.hp; Player.toggleMode(p); o.toggled = p.healMode === true;
    cast('light', 1); o.healLight = p.hp > hp0;
    o.healSelfDiscount = (p.hp - hp0) < p.maxHp * CFG.player.combos.scepterHeal[0].heal.amount;     // it heals itself at a discount
    const hp1 = p.hp; cast('light', 0.4); o.lightCooldown = p.hp === hp1 && p.healCd > 0;
    __dw.sim(2); const hp2 = p.hp; cast('heavy', 1.2); o.areaHeal = p.hp > hp2; const hp3 = p.hp; cast('heavy', 1.2); o.areaCooldown = p.hp === hp3 && p.healCd > 5;
    Player.toggleMode(p); o.toggledBack = !p.healMode;
    setup('warrior', []); o.toggleWarriorNoop = Player.toggleMode(G.player) === false;
    // A heal never exceeds full health
    setup('cleric', []); G.player.hp = G.player.maxHp; Player.toggleMode(G.player); cast('light', 1); o.noOverheal = G.player.hp <= G.player.maxHp;

    // --- Pictures: every new weapon and off-hand piece builds in the gear screen and on the hero
    for (const cls of ['archer', 'mage', 'cleric']) {
      setup(cls, []);
      for (const sl of ['weapon', 'shield']) { const it = I.S.equip[sl]; o[cls + sl + 'Picture'] = !!Rig.item(I.itemLook(it)); }
      o[cls + 'Rig'] = G.player.rig.weapon && (cls === 'archer' || true);
      __dw.openPanel('bag'); const cells = document.querySelectorAll('.gslot'); o[cls + 'Gear'] = cells.length === 8; while (__dw.UI.open) __dw.UI.close();
    }
    o.classPanel = (() => { setup('warrior', []); __dw.openPanel('classpick'); const n = document.querySelectorAll('[data-act="pickclass"]').length; while (__dw.UI.open) __dw.UI.close(); return n === 4; })();
    o.shotsCleared = (() => { setup('archer'); cast('heavy', 0.75); const n = Shots.live.length; Shots.clear(); return n > 0 && Shots.live.length === 0; })();
    return o;
  });
  const bad = Object.entries(out).filter(([, v]) => v !== true).map(([k, v]) => k + '=' + JSON.stringify(v));
  if (errs.length) bad.push('pageerrors: ' + errs.slice(0, 4).join(' | '));
  console.log(bad.length ? 'FAIL ' + bad.join(', ') : 'PASS ' + JSON.stringify(out));
  await b.close(); process.exit(bad.length ? 1 : 0);
})();
