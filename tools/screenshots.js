// Takes the README screenshots: the camp, and a fight in the dungeon. Run: node tools/screenshots.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html') + '?classes=1'); await pg.waitForTimeout(300);
  const out = f => path.resolve(__dirname, '../docs/screenshots', f);
  await pg.evaluate(() => {
    __dw.start('new');
    while (__dw.UI.open) { const q = s => document.querySelector(s); (q('[data-act="pickclass"][data-arg="warrior"]') || q('[data-act="looksdone"]') || q('[data-act="skiptrain"]') || q('#pcard .pb')).click(); }
    Tutorial.stop(); __dw.sim(3);
  });
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: out('camp.png') });
  await pg.evaluate(() => {
    const G = __dw.G, W = __dw.World;
    __dw.arena(0); const p = G.player; p.maxHp = p.hp = 1e7;
    const r = W.rooms.find(q => q.kind !== 'side' && q.j === 2); p.pos.set(r.cx, 0, r.cz + r.hd - 3); __dw.sim(3.2);
    for (let i = 0; i < 40; i++) { const e = G.enemies.find(x => x.state === 'hunt' || x.state === 'attack'); if (!e) break; p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z); __dw.sim(0.25); if (i === 8) __dw.press('light'); }
    p.maxHp = 100; p.hp = 82;
  });
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: out('dungeon.png') });
  await b.close();
  if (errs.length) { console.log('ERRORS', errs); process.exit(1); }
  console.log('saved docs/screenshots/camp.png and dungeon.png');
})();
