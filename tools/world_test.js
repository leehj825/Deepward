// Headless check of Deepward Hold and the world around it: the bigger camp and its people (walking villagers, the
// bard's and the captain's lines, Nell's gem cutting, Ysolde's tonics for the next trip, Odo's piece of the day).
// Run: node tools/world_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, W = __dw.World;
    __dw.start('new'); while (__dw.UI.open) __dw.UI.close(); G.state = 'play';
    const camp = W.camp(), p = G.player, at = (x, z) => { p.pos.set(x, 0, z); __dw.sim(0.25); return G.spot && G.spot.id; };
    o.bigger = camp.rect.x1 - camp.rect.x0 >= 48 && camp.rect.z1 - camp.rect.z0 >= 36;
    o.people = camp.npcs.length >= 12 && camp.npcs.filter(n => n.path).length >= 5;
    // Villagers walk their rounds
    const v = camp.npcs.find(n => n.path), v0 = [v.x, v.z]; p.pos.set(20, 0, -15); __dw.sim(6);
    o.walking = Math.hypot(v.x - v0[0], v.z - v0[1]) > 1;
    // Every service has its place
    o.spots = ['gate', 'smith', 'gemcutter', 'trader', 'herbalist', 'curio', 'elder', 'bard', 'ledger', 'trainer', 'guard'].every(id => camp.spots.some(s => s.id === id));
    // Wenna and Rook speak their lines in turn
    const sp = id => camp.spots.find(s => s.id === id);
    at(sp('bard').x, sp('bard').z); __dw.interact(); const l1 = document.querySelector('.pcard.dialogue p').textContent; __dw.UI.close();
    __dw.interact(); const l2 = document.querySelector('.pcard.dialogue p').textContent; __dw.UI.close();
    o.bard = l1 !== l2 && /Warden|guard|Aldric/i.test(l1 + l2);
    at(sp('guard').x, sp('guard').z); __dw.interact(); o.guard = /Rim|gate/.test(document.querySelector('.pcard.dialogue p').textContent); __dw.UI.close();
    // Nell cuts three rubies into a sapphire
    I.S.gems = { ruby: 4 }; at(sp('gemcutter').x, sp('gemcutter').z); __dw.interact();
    document.querySelector('[data-act="gemcut"][data-arg="ruby:sapphire"]').click();
    o.gemcut = I.S.gems.ruby === 1 && I.S.gems.sapphire === 1; __dw.UI.close();
    // Ysolde's Wind Tonic lasts for the next trip and ends back in camp
    I.S.gold = 1000; at(sp('herbalist').x, sp('herbalist').z); __dw.interact(); document.querySelector('[data-act="tonic"][data-arg="stamina"]').click(); __dw.UI.close();
    o.tonicBought = I.S.tonics.includes('stamina') && I.S.gold === 940;
    const base = Player.gearStats().regen;
    G.descend(0); return o;
  });
  await pg.waitForFunction(() => __dw.G.mode === 'dungeon' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 8000 });
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items;
    o.tonicOn = G.tonics.includes('stamina') && Math.abs(G.player.S.regen / (I.stats().regen) - 1.3) < 0.01 && !I.S.tonics.length;
    G.returnToCamp(); return o;
  }));
  await pg.waitForFunction(() => __dw.G.mode === 'camp' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 8000 });
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items; while (__dw.UI.open) __dw.UI.close();
    o.tonicGone = !G.tonics.length && Math.abs(G.player.S.regen - I.stats().regen) < 0.01;
    // Odo's piece of the day: rare or better, bought once
    I.S.gold = 99999; __dw.openPanel('curio'); const it = I.S.curio.item;
    o.curioRare = !!it && it.rarity >= 2; document.querySelector('[data-act="curiobuy"]').click();
    o.curioBought = I.S.inv.includes(it) && !I.S.curio.item; __dw.UI.close();
    return o;
  }));
  // ---- W2: the Rim ----
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, W = __dw.World, p = G.player, f = W.field();
    o.rim = !!f && f.rect.z0 > W.camp().rect.z1 && f.rect.x1 - f.rect.x0 >= 100;
    // Through the gate: the Rim is a little trip of its own
    I.S.gold = 500; p.maxHp = p.hp = 1e5; p.pos.set(0, 0, f.rect.z0 + 2); __dw.sim(0.3);
    o.fieldMode = G.mode === 'field' && /The Rim/.test(W.label());
    __dw.setView('top'); __dw.sim(0.2); o.topCamera = [__dw.camera.position.x, __dw.camera.position.y, __dw.camera.position.z].every(Number.isFinite); __dw.setView('behind');   // the field has no depth to frame (was NaN)
    // The Meadow fills with beasts that wander until the warden is near
    const mead = f.zones.find(z => z.id === 'meadow'); p.pos.set(mead.x, 0, mead.z - mead.r - 12); __dw.sim(2);
    const beasts = () => G.enemies.filter(e => e.zone === mead && e.state !== 'dead' && !e.fieldBoss);
    o.spawned = beasts().length >= 3 && beasts().length <= mead.cap;
    o.passive = beasts().every(e => !e.aggro);
    // Walking up to a wolf rouses it, and its pack with it
    const wolves = beasts().filter(e => e.type === 'wolf');
    if (wolves.length >= 2) { wolves[1].pos.copy(wolves[0].pos).add(new THREE.Vector3(2, 0, 0)); }
    p.pos.set(wolves[0].pos.x, 0, wolves[0].pos.z + 4); __dw.sim(0.3);
    o.roused = wolves[0].aggro === true && (wolves.length < 2 || wolves[1].aggro === true);
    // A kill on the Rim pays gold and XP like below
    const xp0 = I.S.xp + I.S.level * 1000; wolves[0].state = 'broken'; Enemy.receive(wolves[0], { dmg: 9999, posture: 0 }, p); __dw.sim(0.2);
    o.pays = I.S.tripGold > 0 && I.S.xp + I.S.level * 1000 > xp0;
    for (const e of G.enemies) { e.remove = true; } __dw.sim(0.1);
    // A boar charges from afar (unblockable); a goblin scout throws a spear
    const at = p.pos;
    const boar = __dw.spawn('boar', at.x, at.z - 7); boar.state = 'hunt'; boar.rig.root.position.y = 0; boar.zone = mead; boar.aggro = true; boar.cooldown = 0; boar.facing = 0;
    __dw.sim(0.1); o.charge = boar.state === 'attack' && boar.atk === CFG.enemies.boar.attacks[1] && boar.atk.hits[0].unblockable;
    boar.remove = true; __dw.sim(0.05);
    const sc = __dw.spawn('scout', at.x, at.z - 8); sc.state = 'hunt'; sc.rig.root.position.y = 0; sc.zone = mead; sc.aggro = true; sc.cooldown = 0;
    __dw.sim(1.0, () => Enemy.arrows.length > 0); o.spear = Enemy.arrows.length > 0;
    // Led too far from home, a beast gives up and mends
    sc.hp = 1; sc.pos.set(mead.x + mead.r + CFG.field.leash + 6, 0, mead.z); p.pos.set(sc.pos.x + 10, 0, sc.pos.z); __dw.sim(3, () => sc.aggro === false);
    o.leash = sc.aggro === false && sc.hp === sc.maxHp;
    for (const e of G.enemies) { e.remove = true; } __dw.sim(0.1);
    // Back through the gate: the gold is banked
    const carried = I.S.tripGold; p.pos.set(0, 0, 10); __dw.sim(0.3);
    o.banked = G.mode === 'camp' && I.S.tripGold === 0 && carried > 0;
    return o;
  }));
  // Falling on the Rim costs a tenth of the gold carried, not half
  Object.assign(out, await pg.evaluate(() => {
    const G = __dw.G, I = __dw.Items, f = __dw.World.field(), p = G.player;
    p.pos.set(0, 0, f.rect.z0 + 2); __dw.sim(0.2); I.S.tripGold = 100; const g0 = I.S.gold;
    p.maxHp = p.hp = 1; p.state = 'free'; p.blocking = false; const e = __dw.spawn('skeleton', p.pos.x, p.pos.z - 1.5); Player.receive(p, e, Object.assign({}, e.def.attacks[0].hits[0], { dmg: 500 })); e.remove = true;
    __dw.sim(2.5);
    return { rimDeath: I.S.gold === g0 - 10 && !!document.querySelector('.pcard.fallen') };
  }));
  // ---- W3: materials and crafting ----
  await pg.evaluate(() => { while (__dw.UI.open) __dw.UI.close(); __dw.G.wakeInCamp(); });
  await pg.waitForFunction(() => __dw.G.mode === 'camp' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 8000 });
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, f = __dw.World.field(), p = G.player; while (__dw.UI.open) __dw.UI.close(); G.state = 'play';
    p.maxHp = p.hp = 1e5; p.pos.set(0, 0, f.rect.z0 + 2); __dw.sim(0.3);
    // Wolves drop pelts on the Rim
    const mead = f.zones.find(z => z.id === 'meadow'); I.S.mats = {};
    for (let k = 0; k < 10; k++) { const w = __dw.spawn('wolf', p.pos.x, p.pos.z + 3); w.zone = mead; w.state = 'broken'; Enemy.receive(w, { dmg: 9999, posture: 0 }, p); __dw.sim(0.05); w.remove = true; }
    o.pelts = (I.S.mats.pelt || 0) > 0;
    // Gather a herb patch and an ore vein; they grow back
    const herb = f.nodes.find(n => n.kind === 'herb'), ore = f.nodes.find(n => n.kind === 'ore');
    p.pos.set(herb.x + 1, 0, herb.z); __dw.sim(0.2); const spot = G.spot && G.spot.id; __dw.interact();
    o.gather = spot === 'gather' && I.S.mats.herb > 0 && !herb.ready && !herb.g.visible;
    p.pos.set(ore.x + 1.3, 0, ore.z); __dw.sim(0.2); __dw.interact(); o.mine = I.S.mats.ore > 0;
    herb.t = 0.1; __dw.sim(0.3); o.regrow = herb.ready && herb.g.visible;
    // Bram crafts Wolfhide Wraps from pelts, and tempers a worn piece with ore
    I.S.mats = { pelt: 5, ore: 5, herb: 5, tusk: 0, bone: 0 }; I.S.gold = 1000; I.S.scrap = 10;
    __dw.openPanel('smith'); document.querySelector('[data-arg="smith:craft"]').click();
    document.querySelector('[data-act="craft"][data-arg="wolfwraps"]').click();
    const wraps = I.S.inv.find(x => x.name === 'Wolfhide Wraps');
    o.craft = !!wraps && wraps.slot === 'gloves' && wraps.rarity >= 1 && wraps.aff.some(a => a.k === 'crit') && I.S.mats.pelt === 1 && I.S.gold === 960;
    document.querySelector('[data-arg="smith:upgrade"]').click();
    const wpn = I.S.equip.weapon, plus0 = wpn.plus; document.querySelector(`[data-act="temper"][data-arg="${wpn.id}"]`).click();
    o.temper = wpn.plus === plus0 + 1 && I.S.mats.ore === 2 && I.S.scrap === 8; __dw.UI.close();
    // Ysolde brews a Wind Tonic from herbs for a fifth of the price
    I.S.tonics = []; __dw.openPanel('herbalist'); document.querySelector('[data-act="brew"][data-arg="stamina"]').click();
    o.brew = I.S.tonics.includes('stamina') && I.S.mats.herb === 3 && I.S.gold === 960 - 12; __dw.UI.close();
    return o;
  }));
  // ---- W4: day and night, field bosses ----
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, f = __dw.World.field(), p = G.player, D = CFG.day.length; while (__dw.UI.open) __dw.UI.close(); G.state = 'play';
    for (const e of G.enemies) e.remove = true; G.queue = []; __dw.sim(0.1);
    p.maxHp = p.hp = 1e5; p.pos.set(0, 0, 8);
    I.S.clock = 0.25 * D; __dw.sim(0.2); const dayHemi = __dw.World && G.isNight() === false;
    const c0 = I.S.clock; __dw.sim(1); o.clockRuns = I.S.clock > c0 + 0.9;
    I.S.clock = 0.75 * D; __dw.sim(0.2); o.nightFalls = dayHemi && G.isNight() && /Night/.test(__dw.World.label());
    // The Old Graveyard: empty by day, the dead rise at night, and crumble at dawn
    const gy = f.zones.find(z => z.id === 'graves'), dead = () => G.enemies.filter(e => e.zone === gy && e.state !== 'dead' && !e.fieldBoss).length;
    p.pos.set(gy.x + gy.r + 10, 0, gy.z); I.S.clock = 0.25 * D; __dw.sim(2);
    o.graveDay = dead() === 0;
    I.S.clock = 0.75 * D; __dw.sim(2); o.graveNight = dead() >= 3 && G.enemies.some(e => e.fieldBoss && e.fieldBoss.id === 'graveknight');
    I.S.clock = 0.2 * D; __dw.sim(0.5); o.graveDawn = dead() === 0;
    // Old Tusk walks the Meadow by day; roused, he gets a boss bar; felled, he pays and stays down a while
    for (const e of G.enemies) e.remove = true; G.queue = []; __dw.sim(0.1);
    const mead = f.zones.find(z => z.id === 'meadow'); p.pos.set(mead.x, 0, mead.z - mead.r - 15); I.S.fieldBoss = {}; __dw.sim(1.5);
    const tusk = G.enemies.find(e => e.fieldBoss && e.fieldBoss.id === 'oldtusk');
    o.tuskOut = !!tusk && tusk.champion && tusk.maxHp > CFG.enemies.boar.hp * 5;
    if (tusk) {
      p.pos.set(tusk.pos.x, 0, tusk.pos.z + 5); __dw.sim(0.2); o.tuskBar = tusk.aggro && G.boss === tusk;
      const tu0 = I.S.mats.tusk || 0, inv0 = I.S.inv.length; tusk.state = 'broken'; Enemy.receive(tusk, { dmg: 1e6, posture: 0 }, p); __dw.sim(0.5);
      o.tuskSpoils = (I.S.mats.tusk || 0) >= tu0 + 4 && I.S.inv.length === inv0 + 1 && I.S.fieldBoss.oldtusk > Date.now();
      __dw.sim(2); o.tuskStaysDown = !G.enemies.some(e => e.fieldBoss && e.fieldBoss.id === 'oldtusk' && e.state !== 'dead');
    }
    return o;
  }));
  // The big monsters (the Creature Pack's motion capture on code-built bodies): field bosses with phases
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, f = __dw.World.field(), p = G.player, D = CFG.day.length;
    for (const e of G.enemies) e.remove = true; G.queue = []; __dw.sim(0.1);
    o.clips = ['mIdle', 'mWalk', 'mRun', 'brawlSwipe', 'brawlPunch', 'mJumpAttack', 'mRoar', 'mDie'].every(n => Mocap.has(n));
    // Mossback the troll keeps to Thornwood; he is a phased boss and knits back together when left alone
    const wood = f.zones.find(z => z.id === 'wood'); I.S.fieldBoss = {}; I.S.clock = 0.25 * D; p.pos.set(wood.x - wood.r - 14, 0, wood.z); __dw.sim(1.5);
    const troll = G.enemies.find(e => e.fieldBoss && e.fieldBoss.id === 'mossback');
    o.troll = !!troll && troll.type === 'troll' && !!troll.boss && troll.rig.set === 'mu';
    if (troll) {
      troll.hp = troll.maxHp * 0.5; troll.postureT = 9; __dw.sim(1); o.regen = troll.hp > troll.maxHp * 0.5;
      p.pos.set(troll.pos.x, 0, troll.pos.z + 6); __dw.sim(0.1); troll.hp = troll.maxHp * 0.62; Enemy.receive(troll, { dmg: troll.maxHp * 0.05, posture: 0 }, p);
      o.phase = troll.state === 'roar';
    }
    for (const e of G.enemies) e.remove = true; G.queue = []; __dw.sim(0.1);
    // The Forge Colossus walks the ridge at night; its stone hide turns part of every blow
    const ridge = f.zones.find(z => z.id === 'ridge'); I.S.clock = 0.75 * D; p.pos.set(ridge.x, 0, ridge.z - ridge.r - 14); __dw.sim(1.5);
    const gol = G.enemies.find(e => e.fieldBoss && e.fieldBoss.id === 'colossus');
    o.golem = !!gol && gol.def.dr > 0;
    if (gol) { gol.facing = Combat.yawTo(gol.pos, p.pos); const h0 = gol.hp; gol.state = 'hunt'; Enemy.receive(gol, { dmg: 100, posture: 0 }, p); o.stoneHide = Math.abs((h0 - gol.hp) - 100 * (1 - gol.def.dr)) < 1; }
    // ...and by day the Ridge Horror
    for (const e of G.enemies) e.remove = true; G.queue = []; __dw.sim(0.1); I.S.clock = 0.25 * D; __dw.sim(1.5);
    o.horror = G.enemies.some(e => e.fieldBoss && e.fieldBoss.id === 'ridgehorror' && e.type === 'mutant');
    // Endless floors from 4 sometimes bring one as their champion
    const kinds = new Set(); for (let s = 1; s < 60; s++) { const c = Endless.floorDef(5, Endless.rng(s)).def.champion; if (c) kinds.add(c.kind); }
    o.endlessMonsters = ['mutant', 'troll', 'golem'].every(k => kinds.has(k));
    for (const e of G.enemies) e.remove = true; G.queue = []; __dw.sim(0.1); p.pos.set(0, 0, 8); __dw.sim(0.3);
    return o;
  }));
  // Below, the dungeon keeps its own light whatever the hour above
  await pg.evaluate(() => { __dw.Items.S.clock = 0.25 * CFG.day.length; __dw.G.descend(0); });
  await pg.waitForFunction(() => __dw.G.mode === 'dungeon' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 8000 });
  Object.assign(out, await pg.evaluate(() => { __dw.sim(0.2); const s = __dw.scene; return { dungeonLight: s.fog.far === 38 && s.fog.near === 18 && __dw.G.torchK === 1 }; }));
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
