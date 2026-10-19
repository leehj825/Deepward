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
    // Gloves, boots and rings; weight classes; elements only on weapons
    const many = Array.from({ length: 300 }, () => I.generate(3));
    out.newSlots = ['gloves', 'boots', 'ring'].every(sl => many.some(x => x.slot === sl));
    out.weightClasses = many.filter(x => CFG.gear.weightSlots.includes(x.slot)).every(x => x.wc >= 0 && x.wc <= 2 && x.name.includes([CFG.gear.armors, CFG.gear.helms, CFG.gear.gloves, CFG.gear.boots][CFG.gear.weightSlots.indexOf(x.slot)][x.wc]));
    out.elementsOnWeapons = many.every(x => x.slot === 'weapon' || !x.aff.some(a => ['fire', 'frost', 'shock'].includes(a.k)));
    // Heavy pieces give more, and a heavy load makes the dash dearer and shorter
    out.heavyGivesMore = I.main(I.generate(3, { slot: 'armor', wc: 2, rarity: 0 })).hp > I.main(I.generate(3, { slot: 'armor', wc: 0, rarity: 0 })).hp;
    for (const sl of CFG.gear.weightSlots) S.equip[sl] = I.generate(3, { slot: sl, wc: 2, rarity: 0 });
    const heavy = I.stats();
    for (const sl of CFG.gear.weightSlots) S.equip[sl] = I.generate(3, { slot: sl, wc: 0, rarity: 0 });
    const light = I.stats();
    out.load = heavy.loadClass === 2 && light.loadClass === 0 && heavy.dashCost > light.dashCost && heavy.dashDist < light.dashDist && heavy.move < light.move && heavy.maxHp > light.maxHp;
    // The dash really is shorter in heavy gear
    const dashLen = () => { reset(); p().st = p().maxSt; Input.move.x = 0; Input.move.z = -1; const z0 = p().pos.z; __dw.press('dodge'); __dw.sim(0.5); Input.move.z = 0; return Math.abs(p().pos.z - z0); };
    G.onGearChanged(); const lightDash = dashLen();
    for (const sl of CFG.gear.weightSlots) S.equip[sl] = I.generate(3, { slot: sl, wc: 2, rarity: 0 });
    G.onGearChanged(); const heavyDash = dashLen();
    out.heavyDash = heavyDash < lightDash - 0.1;
    for (const sl of CFG.gear.weightSlots) delete S.equip[sl];
    // Fire burns over time, frost slows, shock jolts
    const elem = (k, v, type) => { const w = I.generate(3, { slot: 'weapon', type: 'sword', rarity: 0 }); w.aff = [{ k, v }]; wear(w); reset(); const e = foe(-1.6, 0, type); e.cooldown = 99; return e; };
    let fe = elem('fire', 50); __dw.press('light'); __dw.sim(0.5); const hb = fe.hp, burning = fe.burnLeft > 0; __dw.sim(2.2);
    out.fire = burning && fe.burnLeft === 0 && fe.hp < hb - 1;
    fe = elem('frost', 30); __dw.press('light'); __dw.sim(0.5); out.frost = fe.chillT > 0 && fe.chill === 0.3;
    fe = elem('shock', 0, 'spider'); __dw.press('light'); __dw.sim(0.45); const noJolt = fe.state !== 'stagger';            // spiders do not flinch...
    fe = elem('shock', 100, 'spider'); __dw.press('light'); __dw.sim(0.45); out.shock = noJolt && fe.state === 'stagger';   // ...but a jolt staggers them
    // Bram's reroll swaps a bonus for a different kind, for gold and scrap, dearer each time
    const ring = I.generate(3, { slot: 'ring', rarity: 2 }); S.equip.ring = ring; S.gold = 5000; S.scrap = 100;
    const k0 = ring.aff.map(a => a.k), c0 = I.rerollCost(ring), g1 = S.gold;
    const did = I.reroll(ring, 0);
    out.reroll = did && !k0.includes(ring.aff[0].k) && ring.aff.length === k0.length && S.gold === g1 - c0.gold && I.rerollCost(ring).gold > c0.gold;
    __dw.openPanel('smith'); document.querySelector('[data-arg="smith:reroll"]').click();
    const rb = document.querySelector(`[data-act="reroll"][data-arg="${ring.id}:1"]`), k1 = ring.aff[1].k; if (rb) rb.click();
    out.rerollTab = !!rb && ring.aff[1].k !== k1; __dw.UI.close();
    return out;
  });
  await b.close();
  const ok = !errs.length && Object.values(r).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
