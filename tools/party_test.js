// Headless check of the party: recruiting (hire, rescued only, two at most, dismiss), companions that follow and catch up, and
// that each class does its part in a fight (the warrior swings, the archer and mage shoot from range, the cleric mends).
// Run: node tools/party_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 900, height: 620 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, I = __dw.Items, G = __dw.G;
    const fresh = () => { __dw.arena(0); __dw.World.halt(); G.queue = []; for (const e of G.enemies) e.cooldown = 99999; const p = G.player; p.pos.set(0, 0, 4); p.facing = Math.PI; I.S.party = []; I.S.hired = {}; Party.clear(); return p; };
    // --- Recruiting
    o.names = Party.defs.every(d => d.short && d.name);
    let p = fresh(); I.S.gold = 0;
    o.hobbHire = Party.status('hobb') === 'hire' && Party.recruit('hobb') === false && Party.status('hobb') === 'hire';
    o.miraLocked = Party.status('mira') === 'locked' && Party.recruit('mira') === false;
    I.S.gold = 200; o.hired = Party.recruit('hobb') === true && I.S.gold === 50 && I.S.party.join() === 'hobb' && Party.status('hobb') === 'in';
    I.S.rescued.push({ id: 'mira', name: 'Mira' }, { id: 'aldo', name: 'Aldo' }, { id: 'pell', name: 'Pell' });
    o.miraReady = Party.status('mira') === 'ready'; o.miraFree = Party.recruit('mira') === true && I.S.gold === 50;
    o.maxTwo = Party.recruit('aldo') === false && I.S.party.length === 2;
    __dw.sim(0.2); o.bodies = G.allies.length === 2 && G.allies.every(a => a.rig.root.parent) && document.querySelectorAll('#party .pm').length === 2;
    o.dismiss = Party.dismiss('mira') === true && (__dw.sim(0.1), G.allies.length === 1) && I.S.party.join() === 'hobb';
    o.rehireFree = (Party.dismiss('hobb'), Party.status('hobb') === 'ready' && Party.recruit('hobb') === true && I.S.gold === 50);          // paid once
    // --- Following
    p.pos.set(10, 0, -2); __dw.sim(3); const a = G.allies[0]; o.follows = Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) < 4.2;
    p.pos.set(0, 0, 4); const far = a.pos.clone(); p.pos.set(-60, 0, 4); __dw.sim(0.3); o.catchUp = Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) < 6;
    // --- Fighting: a skeleton near the party; the warden stands still and does nothing
    const fight = (ids, secs = 6) => {
      p = fresh(); I.S.gold = 999; I.S.rescued = [{ id: 'mira' }, { id: 'aldo' }, { id: 'pell' }];
      for (const id of ids) Party.recruit(id);
      const e = __dw.spawn('skeleton', 0, -5); e.state = 'hunt'; e.cooldown = 99999; e.maxHp = e.hp = 400;
      __dw.sim(secs); return { e, dmg: e.maxHp - e.hp, d: Math.min(...G.allies.map(x => Math.hypot(x.pos.x - e.pos.x, x.pos.z - e.pos.z))) };
    };
    const w = fight(['hobb']); o.warriorFights = w.dmg > 20 && w.d < 3;
    const ar = fight(['mira'], 10); o.archerShoots = ar.dmg > 15;
    const mg = fight(['pell'], 10); o.mageCasts = mg.dmg > 15;
    const cl = fight(['aldo']); o.clericSmites = cl.dmg > 5;
    // The cleric mends a hurt warden
    p = fresh(); I.S.rescued = [{ id: 'aldo' }]; Party.recruit('aldo'); p.hp = p.maxHp * 0.3; __dw.sim(3); o.clericHeals = p.hp > p.maxHp * 0.4;

    // --- Aggro: foes go for the nearer or the harder-hitting friend, companions take damage, fall and are lifted by heals
    const room = ids => { p = fresh(); I.S.gold = 999; I.S.rescued = [{ id: 'mira' }, { id: 'aldo' }, { id: 'pell' }]; for (const id of ids) Party.recruit(id); __dw.sim(0.1); return G.allies; };
    // 1. A foe next to the companion and far from the warden attacks the companion
    let al = room(['hobb']); al[0].pos.set(0, 0, -10); p.pos.set(0, 0, 4);
    let sk = __dw.spawn('skeleton', 0, -12.5); sk.state = 'hunt'; sk.cooldown = 0; sk.zone = null; const hp0 = al[0].hp;
    __dw.sim(4, () => { al[0].pos.x = 0; al[0].pos.z = -10; }); o.foeHitsCompanion = al[0].hp < hp0 && sk.tgt === al[0];
    o.heroUntouched = p.hp === p.maxHp;
    // 2. Down at zero, no more hits taken while down, and a cleric heal lifts them
    al = room(['hobb']); const h = al[0]; h.hp = 1; Party.hurt(h, { mult: 1, pos: p.pos }, { dmg: 30 }); o.goesDown = h.state === 'down' && h.hp === 0;
    const sk2 = __dw.spawn('skeleton', h.pos.x, h.pos.z - 1.6); sk2.state = 'hunt'; sk2.cooldown = 0; __dw.sim(1.5); o.downNotTargeted = sk2.tgt === p || sk2.tgt === undefined || sk2.tgt !== h;
    p = fresh(); I.S.rescued = [{ id: 'aldo' }]; I.S.gold = 999; Party.recruit('hobb'); G.allies[0].hp = 0; Party.hurt(G.allies[0], { mult: 1, pos: p.pos }, { dmg: 1 });
    G.allies[0].state = 'down'; G.allies[0].pos.set(3, 0, 4); I.setClass('cleric'); G.onGearChanged(false); p.pos.set(0, 0, 4); p.facing = Math.PI; p.st = p.maxSt; Player.toggleMode(p);
    __dw.press('light'); __dw.sim(1.2); o.clericRevives = G.allies[0].state === 'free' && G.allies[0].hp > 0;
    // 3. The warden-cleric heals the hurt companion (lowest first), shown in the party list
    p = fresh(); I.S.gold = 999; I.S.rescued = [{ id: 'mira' }]; Party.recruit('hobb'); Party.recruit('mira'); I.setClass('cleric'); G.onGearChanged(false); p.pos.set(0, 0, 4); p.facing = Math.PI; p.st = p.maxSt; Player.toggleMode(p); p.hp = p.maxHp;
    __dw.sim(0.1); const [ah, am] = G.allies; ah.hp = ah.maxHp * 0.9; am.hp = am.maxHp * 0.3; const m0 = am.hp; __dw.press('light'); __dw.sim(1.2); o.healsLowest = am.hp > m0 && ah.hp < ah.maxHp * 0.96;
    __dw.sim(0.1); o.partyBars = document.querySelectorAll('#party .pm').length === 2 && /\d+ \/ \d+/.test(document.querySelector('#party .pm .pn').textContent) && document.querySelectorAll('#bars .abar').length === 2;
    am.hp = 0; Party.hurt(am, { mult: 1, pos: p.pos }, { dmg: 1 }); __dw.sim(0.1); o.downShown = document.querySelector('#party .pm.down') !== null;
    // 4. Area heal lifts everyone near, the downed too
    p.st = p.maxSt; p.healCd = 0; ah.hp = ah.maxHp * 0.2; ah.pos.set(1.5, 0, 4); am.pos.set(-1.5, 0, 4); __dw.press('heavy'); __dw.sim(1.4); o.areaLifts = am.state === 'free' && ah.hp > ah.maxHp * 0.3;
    // 5. Threat: a companion that hurts a foe draws it (damage and healing are threat)
    al = room(['hobb']); al[0].pos.set(2, 0, -3); p.pos.set(-2, 0, -2); const sk3 = __dw.spawn('skeleton', 0, -3.5); sk3.state = 'hunt'; sk3.cooldown = 99999; sk3.tgt = p;
    Enemy.addThreat(sk3, al[0], 80); sk3.tgtT = 0; __dw.sim(0.6); o.threatPulls = sk3.tgt === al[0];
    // 6. A new stage stands them up
    al = room(['hobb']); al[0].hp = 0; al[0].state = 'down'; Party.restore(true); o.restoreStands = al[0].state === 'free' && al[0].hp === al[0].maxHp;
    // Training dummies are left alone (the lessons need them)
    p = fresh(); I.S.gold = 999; Party.recruit('hobb'); const dm = __dw.spawn('sparring', 0, -4); dm.state = 'hunt'; dm.cooldown = 99999; __dw.sim(4); o.leavesDummies = dm.hp === dm.maxHp;
    // The party survives the camp, the title round trip of a new warden clears it
    p = fresh(); I.S.gold = 999; Party.recruit('hobb'); __dw.sim(0.1); Party.clear(); o.cleared = G.allies.length === 0 && document.getElementById('party').style.display === 'none';
    // --- The panel
    p = fresh(); I.S.gold = 999; I.S.rescued = [{ id: 'mira' }]; G.mode = 'camp'; __dw.openPanel('party');
    const rows = document.querySelectorAll('#pcard .irow').length; o.panelRows = rows === 4;
    o.panelRecruit = document.querySelectorAll('[data-act="recruit"]').length === 2 && document.querySelectorAll('[data-act="recruit"]:not([disabled])').length === 2;
    document.querySelector('[data-act="recruit"][data-arg="hobb"]').click(); o.panelJoined = I.S.party.includes('hobb') && !!document.querySelector('[data-act="dismiss"][data-arg="hobb"]');
    while (__dw.UI.open) __dw.UI.close(); G.mode = 'dungeon'; __dw.openPanel('party'); o.panelCampOnly = [...document.querySelectorAll('[data-act="dismiss"],[data-act="recruit"]')].every(x => x.disabled); while (__dw.UI.open) __dw.UI.close();
    return o;
  });
  const bad = Object.entries(out).filter(([, v]) => v !== true).map(([k, v]) => k + '=' + JSON.stringify(v));
  if (errs.length) bad.push('pageerrors: ' + errs.slice(0, 4).join(' | '));
  console.log(bad.length ? 'FAIL ' + bad.join(', ') : 'PASS ' + JSON.stringify(out));
  await b.close(); process.exit(bad.length ? 1 : 0);
})();
