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
    let p = fresh(); I.S.gold = 0;
    o.hobbHire = Party.status('hobb') === 'hire' && Party.recruit('hobb') === false && Party.status('hobb') === 'hire';
    o.miraLocked = Party.status('mira') === 'locked' && Party.recruit('mira') === false;
    I.S.gold = 200; o.hired = Party.recruit('hobb') === true && I.S.gold === 50 && I.S.party.join() === 'hobb' && Party.status('hobb') === 'in';
    I.S.rescued.push({ id: 'mira', name: 'Mira' }, { id: 'aldo', name: 'Aldo' }, { id: 'pell', name: 'Pell' });
    o.miraReady = Party.status('mira') === 'ready'; o.miraFree = Party.recruit('mira') === true && I.S.gold === 50;
    o.maxTwo = Party.recruit('aldo') === false && I.S.party.length === 2;
    __dw.sim(0.2); o.bodies = G.allies.length === 2 && G.allies.every(a => a.rig.root.parent) && document.querySelectorAll('.pchip').length === 2;
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
    const ar = fight(['mira'], 10); o.archerShoots = ar.dmg > 15 && ar.d > 3;
    const mg = fight(['pell'], 10); o.mageCasts = mg.dmg > 15 && mg.d > 3;
    const cl = fight(['aldo']); o.clericSmites = cl.dmg > 5;
    // The cleric mends a hurt warden
    p = fresh(); I.S.rescued = [{ id: 'aldo' }]; Party.recruit('aldo'); p.hp = p.maxHp * 0.3; __dw.sim(3); o.clericHeals = p.hp > p.maxHp * 0.4;
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
