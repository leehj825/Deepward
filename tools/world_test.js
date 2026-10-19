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
    // Phone budget: each person and beast draws as one skinned mesh, so the whole Hold stays under 200 draw calls
    const R = __dw.renderer; R.info.autoReset = false; R.info.reset(); R.render(__dw.scene, __dw.camera); o.drawCalls = R.info.render.calls < 200; R.info.autoReset = true;
    o.skinned = camp.npcs.every(n => n.rig.body3 && n.rig.body3.isSkinnedMesh);
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
    // Walking (no dash) from the fire out through the gate onto the Rim and back: nothing on the road holds the warden
    __dw.setView('top'); p.pos.set(0.6, 0, 8); Input.stick.z = 1; Input.stick.x = 0;
    __dw.sim(14, () => p.pos.z > f.rect.z0 + 8); o.walkOut = p.pos.z > f.rect.z0 + 8;
    Input.stick.z = -1; __dw.sim(14, () => p.pos.z < 8); o.walkIn = p.pos.z < 8; Input.stick.z = 0; __dw.setView('behind'); __dw.sim(0.2);
    for (const e of G.enemies) e.remove = true; G.queue = []; for (const z of f.zones) { z.filled = false; z.next = 0; } __dw.sim(0.1);
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
  // ---- W5: captives, the notice board, the Ring ----
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, W = __dw.World, p = G.player;
    // A captive chained in a vault (placed by hand here: vaults roll for one)
    const side = W.sides[0] || W.sections[1]; Props.captive(side, 0, side.cz); const c = Props.captives[Props.captives.length - 1];
    p.pos.set(c.x + 1.2, 0, c.z); __dw.sim(0.3); o.captiveSpot = !!G.spot && G.spot.id === 'captive';
    __dw.interact(); o.freed = c.freed && I.rescued('pell') && I.S.rescued[0].where === 'The Crypt' && /cartographer|mapped/i.test(document.querySelector('.pcard.dialogue').textContent);
    while (__dw.UI.open) __dw.UI.close();
    const heal0 = Player.gearStats().flaskHeal, gf0 = Player.gearStats().goldFind;
    I.rescue(); o.ilsa = I.rescued('ilsa') && Math.abs(Player.gearStats().flaskHeal / heal0 - 1.1) < 0.01 && Player.gearStats().goldFind > gf0;
    G.returnToCamp(); return o;
  }));
  await pg.waitForFunction(() => __dw.G.mode === 'camp' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 8000 });
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, W = __dw.World, p = G.player; while (__dw.UI.open) __dw.UI.close();
    o.homeWalkers = W.camp().npcs.filter(n => n.path).length >= 7;
    // The notice board: three jobs; a finished one pays and is replaced
    const sp = id => W.camp().spots.find(s => s.id === id);
    p.pos.set(sp('board').x, 0, sp('board').z); __dw.sim(0.3); o.boardSpot = G.spot && G.spot.id === 'board';
    I.S.jobs = [{ kind: 'gather', target: 'herb', need: 2, gold: 50, id: 999, base: 0, title: 'Bring 2 herbs' }]; I.S.mats.herb = 3;
    __dw.interact(); o.jobs = document.querySelectorAll('.pcard [data-act="jobin"]').length === 3;
    const g0 = I.S.gold; document.querySelector('[data-act="jobin"][data-arg="999"]').click();
    o.turnIn = I.S.gold === g0 + 50 && I.S.mats.herb === 1 && I.S.jobsDone === 1 && !I.S.jobs.some(j => j.id === 999) && I.S.jobs.length === 3;
    const hunt = { kind: 'hunt', target: 'wolf', need: 2, gold: 10, id: 998, base: Codex.life().kinds.wolf || 0, title: 'x' }; I.S.jobs[0] = hunt;
    o.huntCounts = !Jobs.done(hunt) && (Codex.life().kinds.wolf = hunt.base + 2) && Jobs.done(hunt);
    __dw.UI.close();
    // The Ring: guardians already beaten, monsters once their kin fell on the Rim, the Abomination last
    I.S.stage = 1; I.S.bossKills = { ridgehorror: 1 }; I.S.arena = {};
    const L = G.arenaList(), by = id => L.find(a => a.id === id);
    o.ringList = !!by('g0') && !by('g1') && !by('horror').locked && !!by('troll').locked && !!by('abomination').locked;
    p.pos.set(sp('arena').x, 0, sp('arena').z); __dw.sim(0.3); __dw.interact(); o.ringPanel = document.querySelectorAll('.pcard [data-act="ring"]:not([disabled])').length === 2;
    p.maxHp = p.hp = 1e6; document.querySelector('[data-act="ring"][data-arg="horror"]').click();
    return o;
  }));
  await pg.waitForFunction(() => __dw.G.mode === 'dungeon' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 8000 });
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, W = __dw.World, p = G.player; while (__dw.UI.open) __dw.UI.close();
    const r = W.sections[0]; p.pos.set(r.cx, 0, r.cz + 2); p.maxHp = p.hp = 1e6;
    for (let i = 0; i < 40 && !G.boss; i++) __dw.sim(0.25);
    const e = G.boss; o.ringBoss = !!e && e.type === 'mutant' && e.guardian === 'The Ridge Horror' && /The Ring/.test(W.label()) && W.sections.length === 1;
    const g0 = I.S.gold;
    for (let i = 0; i < 30; i++) { for (const x of G.enemies) if (x.state !== 'dead') { x.state = 'broken'; Enemy.receive(x, { dmg: 1e7, posture: 0 }, p); } __dw.sim(0.25); if (r.chest) break; }
    if (r.chest) { p.pos.set(r.chest.x, 0, r.chest.z + 1.2); __dw.sim(2); }
    o.ringWon = I.S.arena.horror === 1 && I.S.gold > g0 + 200 && !!__dw.UI.open && __dw.UI.open.id === 'arenaWon' && I.S.stage === 1;
    return o;
  }));
  // ---- W6: a raid on the gate, Sefa's caravan ----
  await pg.evaluate(() => { CFG.wanderer.chance = 1; CFG.raid.chance = 0; document.querySelector('[data-act="ringhome"]').click(); });
  await pg.waitForFunction(() => __dw.G.mode === 'camp' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 8000 });
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, W = __dw.World, p = G.player; while (__dw.UI.open) __dw.UI.close();
    // Sefa's caravan: gear a tier up, bundles, a gem; she buys materials
    const sp = W.camp().spots.find(s => s.id === 'wanderer'); o.caravan = !!sp && !!I.S.wander && W.camp().npcs.some(n => n.id === 'wanderer');
    I.S.gold = 99999; I.S.inv = []; p.pos.set(sp.x, 0, sp.z); __dw.sim(0.3); __dw.interact();
    const it = I.S.wander.items[0]; document.querySelector('[data-act="wbuy"][data-arg="0"]').click();
    o.wbuy = I.S.inv.includes(it) && it.rarity >= 2 && !I.S.wander.items[0];
    const b = I.S.wander.bundles[0], m0 = I.S.mats[b.id] || 0; document.querySelector('[data-act="wbundle"][data-arg="0"]').click();
    o.wbundle = I.S.mats[b.id] === m0 + b.n && b.sold;
    const g0 = I.S.gold; document.querySelector(`[data-act="wsell"][data-arg="${b.id}"]`).click(); o.wsell = I.S.gold === g0 + CFG.wanderer.buys && I.S.mats[b.id] === m0 + b.n - 1;
    __dw.UI.close();
    // A raid: the band marches up the road and batters the gate while the warden is inside
    for (const e of G.enemies) e.remove = true; G.queue = []; __dw.sim(0.1);
    I.S.stage = 3; p.pos.set(0, 0, 6); p.maxHp = p.hp = 1e6; G.startRaid(); __dw.sim(2);
    const raiders = () => G.enemies.filter(e => e.raid && e.state !== 'dead');
    o.raiders = raiders().length === G.raid.n && raiders().some(e => e.elite);
    for (let i = 0; i < 40 && G.raid.gate === CFG.raid.gate; i++) __dw.sim(0.5);
    o.battered = !!G.raid && G.raid.gate < CFG.raid.gate && /Raid/.test(document.getElementById('foesN').textContent) && raiders().length === G.raid.n;
    // The alarm: the bell swings, and Rook and the sentry go out past the gate and spear the raiders there
    const camp = W.camp(), guards = camp.npcs.filter(n => n.guard);
    o.bell = !!camp.bell && camp.bell.rung;
    o.guardsOut = guards.length === 2 && guards.every(n => Math.hypot(n.x - n.post[0], n.z - n.post[1]) < 0.2);
    for (let i = 0; i < 20 && !raiders().some(e => e.hp < e.maxHp); i++) __dw.sim(0.5);
    o.guardsFight = raiders().some(e => e.hp < e.maxHp);
    // ...and is beaten for gold and materials
    const gold0 = I.S.gold, pelt0 = I.S.mats.pelt || 0; p.pos.set(0, 0, W.field().rect.z0 + 1);
    for (const e of raiders()) { e.state = 'broken'; e.ward = 0; Enemy.receive(e, { dmg: 1e7, posture: 0 }, p); } __dw.sim(1);   // a warded chief soaks the first blow
    o.raidWon = !G.raid && I.S.raids === 1 && I.S.gold > gold0 && I.S.mats.pelt >= pelt0 + 2;
    __dw.sim(4); o.guardsHome = guards.every(n => Math.hypot(n.x - n.home[0], n.z - n.home[1]) < 0.2);
    // If the gate breaks, they run off with some of the gold
    G.startRaid(); __dw.sim(0.5); G.raid.gate = 0; const g1 = I.S.gold; __dw.sim(0.2);
    o.raidLost = !G.raid && I.S.gold === g1 - Math.min(CFG.raid.stealMax, Math.floor(g1 * CFG.raid.steal)) && !G.enemies.some(e => e.raid && !e.remove && e.state !== 'dead');
    CFG.wanderer.chance = 0; G.wakeInCamp(); return o;
  }));
  await pg.waitForFunction(() => __dw.G.mode === 'camp' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 8000 });
  out.stays = await pg.evaluate(() => !!__dw.Items.S.wander && __dw.World.camp().spots.some(s => s.id === 'wanderer'));
  await pg.evaluate(() => __dw.G.wakeInCamp());
  await pg.waitForFunction(() => __dw.G.mode === 'camp' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 8000 });
  out.movesOn = await pg.evaluate(() => !__dw.Items.S.wander && !__dw.World.camp().spots.some(s => s.id === 'wanderer'));
  // ---- N6: the Fen, through the east gate (after Act I) ----
  out.fenBarred = await pg.evaluate(() => !__dw.World.fenOpen() && __dw.World.fields().length === 1 && __dw.World.camp().spots.some(s => s.id === 'eastgate'));
  await pg.evaluate(() => { const I = __dw.Items; I.S.stage = 5; I.S.fenSeen = false; __dw.G.wakeInCamp(); });
  await pg.waitForFunction(() => __dw.G.mode === 'camp' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 8000 });
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, W = __dw.World, p = G.player;
    __dw.sim(1.5); o.rookOpens = !!__dw.UI.open && /east gate/i.test(document.querySelector('.pcard').textContent); while (__dw.UI.open) __dw.UI.close();
    const fen = W.fields().find(f => f.side === 'east');
    o.fenBuilt = !!fen && !W.camp().spots.some(s => s.id === 'eastgate') && fen.rect.z1 < W.field().rect.z0;
    // Walk (no dash) out through the east gate along the boardwalk
    for (const e of G.enemies) e.remove = true; G.raid = null; __dw.sim(0.1);
    __dw.setView('top'); p.maxHp = p.hp = 1e7; p.pos.set(20, 0, CFG.fen.gateZ + 0.4); Input.stick.x = 1; Input.stick.z = 0;
    __dw.sim(14, () => p.pos.x > fen.rect.x0 + 6); Input.stick.x = 0; __dw.setView('behind');
    o.walkFen = p.pos.x > fen.rect.x0 + 6 && G.mode === 'field' && /^The Fen/.test(W.label());
    // The Reedbank fills; the Mirelord comes out in the Black Mire at night
    const reeds = fen.zones.find(z => z.id === 'reeds'); I.S.clock = 0.25 * CFG.day.length; p.pos.set(reeds.x - reeds.r - 6, 0, reeds.z); __dw.sim(2);
    o.fenSpawns = G.enemies.filter(e => e.zone === reeds && e.home === fen).length >= 3;
    for (const e of G.enemies) e.remove = true; G.queue = []; __dw.sim(0.1);
    const mire = fen.zones.find(z => z.id === 'mire'); I.S.fieldBoss = {}; I.S.clock = 0.75 * CFG.day.length; p.pos.set(mire.x - mire.r - 8, 0, mire.z); __dw.sim(1.5);
    const lord = G.enemies.find(e => e.fieldBoss && e.fieldBoss.id === 'mirelord');
    o.mirelord = !!lord && lord.type === 'troll' && !!lord.boss && /Fen/.test(W.label());
    // Spiders give silk; Bram makes a Fensilk Jerkin from it
    for (const e of G.enemies) e.remove = true; G.queue = []; __dw.sim(0.1);
    const s0 = I.S.mats.silk || 0; for (let k = 0; k < 12; k++) { const sp = __dw.spawn('spider', p.pos.x, p.pos.z - 4); sp.zone = mire; sp.home = fen; sp.state = 'broken'; Enemy.receive(sp, { dmg: 1e6, posture: 0 }, p); } __dw.sim(0.3);
    o.silk = (I.S.mats.silk || 0) > s0;
    I.S.mats.silk = 9; I.S.mats.herb = 9; I.S.gold = 9999;
    const made = I.craft(CFG.crafts.find(c => c.id === 'fenjerkin')); o.craftFen = !!made && I.S.mats.silk === 4 && made.slot === 'armor';
    // ...and the Mirelord joins the Ring once felled in the Fen
    I.S.bossKills = { mirelord: 1 }; o.ringMirelord = !G.arenaList().find(a => a.id === 'mirelord').locked;
    for (const e of G.enemies) e.remove = true; p.pos.set(0, 0, 6); __dw.sim(0.3);
    return o;
  }));
  // ---- N7: Captain Rook's task, the goblin war camp ----
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, W = __dw.World, p = G.player, close = () => { while (__dw.UI.open) __dw.UI.close(); };
    close(); for (const e of G.enemies) e.remove = true; G.queue = []; G.raid = null; __dw.sim(0.1);
    I.S.raids = 1; I.S.quest = {}; I.S.clock = 0.25 * CFG.day.length; p.maxHp = p.hp = 1e7;
    const talkRook = () => { const g = W.camp().spots.find(s => s.id === 'guard'); p.pos.set(g.x, 0, g.z); __dw.sim(0.3); __dw.interact(); close(); __dw.sim(0.1); };
    talkRook(); o.questStart = I.S.quest.rook.step === 1 && /trail/.test(document.getElementById('questLine').textContent);
    const rim = W.field(), t = rim.spots.find(s => s.id === 'tracks');
    o.tracksShown = !!t;
    p.pos.set(t.x, 0, t.z); __dw.sim(0.3); __dw.interact(); close(); o.tracksFound = I.S.quest.rook.step === 2;
    p.pos.set(0, 0, 6); __dw.sim(0.3); talkRook();
    const rim2 = W.field(), wc = rim2.zones.find(z => z.id === 'warcamp');
    o.warCamp = I.S.quest.rook.step === 3 && !!wc && rim2.spots.filter(s => s.id === 'totem').length === CFG.rookQuest.totems;
    // Out to the camp: goblins about it and Gragnak, who falls; then the totems burn
    p.pos.set(wc.x + wc.r + 6, 0, wc.z); __dw.sim(2.5);
    const chief = G.enemies.find(e => e.fieldBoss && e.fieldBoss.id === 'gragnak');
    o.gragnak = !!chief && G.enemies.some(e => e.zone === wc && !e.fieldBoss);
    if (chief) { chief.state = 'broken'; Enemy.receive(chief, { dmg: 1e9, posture: 0 }, p); __dw.sim(2.5); }
    for (const s of rim2.spots.filter(s => s.id === 'totem')) { for (const e of G.enemies) e.remove = true; p.pos.set(s.x + 1, 0, s.z); __dw.sim(0.2); __dw.interact(); }
    __dw.sim(0.3); o.campBurned = I.S.quest.rook.step === 4;
    // Back to Rook for the reward; raids then come half as often
    for (const e of G.enemies) e.remove = true; p.pos.set(0, 0, 6); __dw.sim(0.5); const g0 = I.S.gold; talkRook();
    o.rookReward = I.S.quest.rook.step === 5 && I.S.gold > g0 && I.S.inv.some(it => it.name === "Rook's Warhorn") && document.getElementById('questLine').textContent === '';
    return o;
  }));
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
