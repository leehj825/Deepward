// Headless check of the Endless Deep: locked until the fifth guardian, floors built from a seed (the daily one the same
// every time), tougher each floor, a guardian every third floor, the choice between floors, and the records kept.
// Run: node tools/endless_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
  await pg.waitForTimeout(300);
  const wait = () => pg.waitForFunction(() => !document.getElementById('fade').classList.contains('on') && __dw.G.mode === (window.__want || __dw.G.mode) && (!window.__floor || (__dw.World.active && __dw.World.active.inf.stage.name.endsWith('Floor ' + window.__floor))), null, { timeout: 8000 }).then(() => pg.waitForTimeout(150));
  const out = {};
  Object.assign(out, await pg.evaluate(() => {
    const o = {}; __dw.start('new'); while (__dw.UI.open) document.querySelector('#pcard .pb').click();
    __dw.openPanel('gate'); o.locked = !document.querySelector('[data-act="endless"]'); __dw.UI.close();
    __dw.Items.S.stage = CFG.stages.length; __dw.openPanel('gate'); o.unlocked = document.querySelectorAll('[data-act="endless"]').length === 1 && !!document.querySelector('[data-act="open"][data-arg="curses"]');
    // The daily floors are the same from one build to the next
    const a = Endless.floorDef(2, Endless.rng(1234), true), b = Endless.floorDef(2, Endless.rng(1234), true);
    o.seeded = JSON.stringify(a) === JSON.stringify(b);
    o.lairEvery3 = !Endless.floorDef(1, Endless.rng(5)).lair && !Endless.floorDef(2, Endless.rng(5)).lair && Endless.floorDef(3, Endless.rng(5)).lair;
    document.querySelector('[data-act="open"][data-arg="curses"]').click();
    o.cursesPanel = document.querySelectorAll('.pcard.curses .irow.curse').length === CFG.curses.length;
    window.__floor = 1; document.querySelector('[data-act="endlessgo"]').click();
    return o;
  }));
  await wait();
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, W = __dw.World;
    o.floor1 = !!G.run && G.run.floor === 1 && G.mode === 'dungeon' && /Endless Deep · Floor 1/.test(W.active.inf.stage.name);
    o.mult1 = W.active.inf.mult;
    // Clear every section: the floor-cleared choice appears
    G.player.maxHp = G.player.hp = 1e6;
    const kill = () => { for (const e of G.enemies) if (e.state !== 'dead' && e.state !== 'spawn') { e.state = 'broken'; e.ward = 0; Enemy.receive(e, { dmg: 9999, posture: 0 }, G.player); } };
    for (const r of W.sections) { G.player.pos.set(r.doorS === null ? r.cx : r.doorS, 0, r.southZ - 2.5); __dw.sim(30, () => { kill(); G.player.hp = 1e6; return r.state === 'cleared'; }); }
    __dw.sim(2, () => __dw.UI.open);
    o.choice = !!document.querySelector('.pcard.deeper');
    window.__floor = 2; document.querySelector('[data-act="deeper"]').click();
    return o;
  }));
  await wait();
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, W = __dw.World;
    o.floor2 = G.run.floor === 2 && W.active.inf.mult > 1.3;
    o.best = __dw.Items.S.endless.best === 2;
    // Floor 3 ends with a guardian
    G.run.floor = 3; window.__floor = 3; return o;
  }));
  await pg.evaluate(() => __dw.G.goFloor()); await wait();
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, W = __dw.World;
    o.floor3Lair = W.sections[W.sections.length - 1].inf.room.guardian === true;
    // Home: the run ends; the daily record is kept separately
    document.querySelector('#pcard') && __dw.UI.close();
    return o;
  }));
  await pg.evaluate(() => { window.__floor = 0; window.__want = 'camp'; __dw.G.returnToCamp(); }); await wait();
  Object.assign(out, await pg.evaluate(() => {
    const o = {}; while (__dw.UI.open) document.querySelector('#pcard .pb').click();
    o.home = __dw.G.mode === 'camp' && !__dw.G.run && __dw.Items.S.stage === CFG.stages.length;
    window.__want = 'dungeon'; window.__floor = 1; __dw.G.enterEndless(true); return o;
  }));
  await wait();
  Object.assign(out, await pg.evaluate(() => ({ daily: !!__dw.G.run && __dw.G.run.daily && __dw.Items.S.endless.daily.best === 1 && __dw.Items.S.endless.best === 3,
    dailyCurse: __dw.G.run.curses.length === 1 && __dw.G.run.curses[0] === Endless.dailyCurse() })));
  // Curses: plain numbers first, then a climb carrying Dry Flasks, Hunted, Lightless, Glass Warden, Brittle Guard and Frenzy
  const plain = await pg.evaluate(() => { const run = __dw.G.run; __dw.G.run = null; const S = Player.gearStats(); __dw.G.run = run; return { hp: S.maxHp, block: S.block, gold: S.goldFind }; });
  await pg.evaluate(() => { window.__want = 'camp'; window.__floor = 0; __dw.G.returnToCamp(); }); await wait();
  await pg.evaluate(() => { while (__dw.UI.open) document.querySelector('#pcard .pb').click(); __dw.openPanel('gate'); document.querySelector('[data-act="open"][data-arg="curses"]').click();
    for (const id of ['dry', 'hunted', 'dark', 'glass', 'brittle', 'frenzy']) document.querySelector(`[data-act="curse"][data-arg="${id}"]`).click();
    window.__want = 'dungeon'; window.__floor = 1; document.querySelector('[data-act="endlessgo"]').click(); });
  await wait();
  Object.assign(out, await pg.evaluate(base => {
    const o = {}, G = __dw.G, p = G.player, S = p.S;
    o.cursedRun = G.run.curses.length === 6 && __dw.Items.S.endless.lastCurses.length === 6;
    o.dry = p.flasks === 0 && S.flasks === 0;
    o.glass = !!base && S.maxHp <= Math.round(base.hp * 0.5) + 1 && S.block < base.block * 0.7;
    o.goldMore = !!base && Math.abs(S.goldFind / base.gold - (1 + Endless.curseGold(G.run.curses))) < 0.01;
    o.dark = document.body.classList.contains('lightless') && __dw.scene.fog.far < 20;
    // Spawned foes are all elites, and quicker
    const sp = CFG.enemies.skeleton.speed; G.queue.push({ type: 'skeleton', at: p.pos.clone().add(new THREE.Vector3(0, 0, -4)), mult: 1, t: G.time }); __dw.sim(0.1);
    const e = G.enemies[G.enemies.length - 1]; o.hunted = !!e.elite; o.frenzy = e.frenzy === true;
    return o;
  }, plain));
  // Records by number of curses; home clears the dark
  await pg.evaluate(() => { window.__want = 'camp'; window.__floor = 0; __dw.G.returnToCamp(); }); await wait();
  Object.assign(out, await pg.evaluate(() => ({ heat: __dw.Items.S.endless.heat[6] === 1, lightAgain: !document.body.classList.contains('lightless') && __dw.scene.fog.far === 38 })));
  await b.close();
  const ok = !errs.length && Object.entries(out).every(([k, v]) => k === 'mult1' ? v > 1.1 : v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
