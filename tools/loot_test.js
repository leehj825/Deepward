// Headless check of loot identity: every unique can drop once, each unique's effect, gems in sockets (stats, prying,
// a new socket from Bram, the smithy's Gems tab) and gem drops from a guardian's chest.
// Run: node tools/loot_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
  await pg.waitForTimeout(300);
  const r = await pg.evaluate(() => {
    const out = {}, G = __dw.G, I = __dw.Items;
    __dw.setView('behind'); __dw.arena(0); __dw.World.halt(); G.queue = [];
    const p = () => G.player, at = p().pos.clone(), S = I.S;
    const wear = it => { S.equip[it.slot] = it; G.onGearChanged(); p().state = 'free'; };
    const foe = (dz, dx = 0, type = 'skeleton') => { const e = __dw.spawn(type, at.x + dx, at.z + dz); e.state = 'hunt'; e.cooldown = 99; e.rig.root.position.y = 0; e.maxHp = e.hp = 500; return e; };
    const reset = () => { for (const e of G.enemies) { e.state = 'dead'; e.hp = 0; } __dw.sim(0.1); p().pos.copy(at); p().facing = Math.PI; __dw.View.yaw = 0; p().state = 'free'; };
    // Every unique drops once before any repeats
    const ids = new Set(); for (let k = 0; k < CFG.gear.uniques.length; k++) ids.add(I.generateUnique(2).uniq);
    out.allUniques = ids.size === CFG.gear.uniques.length && S.uniques.length === CFG.gear.uniques.length;
    const U = id => I.generateUnique(2, { id });
    // Gambler's Coin and Heart of the Deep change the numbers
    const fl0 = p().S.flasks;
    // (compared with the same trinket minus its unique effect, as its random bonuses can include health)
    const coin = U('coin'); wear(coin); const withC = { crit: p().S.crit, hp: p().maxHp };
    delete coin.uniq; G.onGearChanged(); const without = { crit: p().S.crit, hp: p().maxHp }; coin.uniq = 'coin'; G.onGearChanged();
    out.coin = withC.crit > without.crit + 0.14 && withC.hp < without.hp;
    wear(U('heart')); out.heart = p().S.flasks === fl0 + 1;
    // Dawnbreaker: a parry sends a blade of light that hits a foe 5 m down the line
    wear(U('dawn')); reset();
    const far = foe(-5), near = foe(-1.6); near.hp = 500;
    p().blocking = true; p().blockT = 0.02;
    const res = Player.receive(p(), near, near.def.attacks[0].hits[0]);
    out.dawn = res === 'parry' && far.hp < 500;
    // Crown of Thorns: a blocked blow hurts the attacker
    wear(U('thorns')); reset(); const t = foe(-1.6); p().blocking = true; p().blockT = 1;
    Player.receive(p(), t, t.def.attacks[0].hits[0]); out.thorns = t.hp < 500;
    // Widowmaker: more damage to a foe below 30%
    wear(U('widow')); reset(); const w1 = foe(-1.6), w2 = foe(-1.6, 0.01); w2.hp = 100;
    const a1 = w1.hp; Enemy.receive(w1, { dmg: 20, posture: 0 }, p()); const d1 = a1 - w1.hp;
    w2.state = 'hunt'; const a2 = w2.hp; Combat.playerStrike(p(), { dmg: 20, posture: 0, range: 3, arc: 360 }); const d2 = a2 - w2.hp;
    out.widow = d2 > d1 * 1.4;
    // Emberwake Mail: a dash leaves fire that burns a foe standing in it
    wear(U('ember')); reset(); const em = foe(-1.2);
    __dw.Input.keys.KeyW = true; __dw.press('dodge'); __dw.sim(0.35); __dw.Input.keys.KeyW = false; em.pos.set(at.x, 0, at.z - 1.2);
    __dw.sim(2, () => { em.pos.set(at.x, 0, at.z - 1.2); em.state = 'hunt'; }); out.ember = em.hp < 500 && (p().fires || []).length >= 0;
    // Grave Oath: a kill heals
    wear(U('oath')); reset(); const o = foe(-1.6); p().hp = p().maxHp * 0.5; const h1 = p().hp;
    o.state = 'broken'; Enemy.receive(o, { dmg: 9999, posture: 0 }, p()); out.oath = p().hp > h1;
    // Gems: a ruby in a socket raises damage; prying returns it; Bram cuts a new socket for gold and scrap
    const wpn = I.generate(1, { slot: 'weapon', type: 'sword', rarity: 0 }); wpn.gems = [null]; wear(wpn);
    const dmg0 = p().S.dmg; I.addGem('ruby', 2);
    out.set = I.setGem(wpn, 'ruby') && S.gems.ruby === 1; G.onGearChanged(); out.ruby = p().S.dmg > dmg0 * 1.05;
    I.pryGems(wpn); out.pry = S.gems.ruby === 2 && wpn.gems[0] === null;
    S.gold = 500; S.scrap = 20; out.socket = I.addSocket(wpn) && wpn.gems.length === 2 && S.gold === 380;
    // The smithy's Gems tab sets a gem with a click
    __dw.openPanel('smith'); document.querySelector('[data-arg="smith:gems"]').click();
    const gb = document.querySelector(`[data-act="gem"][data-arg^="${wpn.id}:"]`); if (gb) gb.click();
    out.smithGem = wpn.gems.filter(Boolean).length === 1; __dw.UI.close();
    // A guardian's chest always holds a gem or two
    const g0 = Object.values(S.gems).reduce((a, b) => a + b, 0);
    G.mode = 'dungeon'; G.onChest({ chest: { big: true, rich: false, x: at.x, z: at.z }, inf: { k: 0, stage: CFG.stages[0] } });
    __dw.sim(1.6); __dw.UI.close();
    out.chestGems = Object.values(S.gems).reduce((a, b) => a + b, 0) >= g0 + 2;
    return out;
  });
  await b.close();
  const ok = !errs.length && Object.values(r).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
