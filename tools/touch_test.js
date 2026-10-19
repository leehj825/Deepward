// Headless check of the touch controls on a phone screen: button size and opacity, the left-handed layout, dragging a
// button in the arrange editor (kept across a reload) and Reset.
// Run: node tools/touch_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const url = 'file://' + path.resolve(__dirname, '../index.html');
  await pg.goto(url); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);
  const shot = process.argv[2];
  const out = await pg.evaluate(() => {
    __dw.arena(0); __dw.World.halt();
    const o = {}, q = a => document.querySelector(`#pad [data-act="${a}"]`);
    o.touch = document.body.classList.contains('touch'); o.free = document.getElementById('pad').classList.contains('free');
    const r0 = q('light').getBoundingClientRect(); o.rightSide = r0.left > innerWidth / 2;
    Settings.set('padScale', 1.3); o.scaled = /scale\(1\.3\)/.test(q('light').style.transform);
    Settings.set('padOpacity', 0.5); o.faded = document.getElementById('pad').style.opacity === '0.5';
    Settings.set('lefty', true); const r1 = q('light').getBoundingClientRect(); o.lefty = r1.left < innerWidth / 2 && q('light').style.left !== 'auto';
    Settings.set('lefty', false); Settings.set('padScale', 1); Settings.set('padOpacity', 0.9);
    return o;
  });
  // Settings -> Arrange shows the editor; drag the dodge button to the middle of the screen; Done
  await pg.evaluate(() => __dw.openSettings()); await pg.waitForTimeout(100);
  out.section = await pg.evaluate(() => !!document.querySelector('[data-act="arrange"]'));
  await pg.click('[data-act="arrange"]');
  out.editor = await pg.evaluate(() => TouchLayout.editing && document.getElementById('arrangeBar').classList.contains('show') && document.body.classList.contains('arranging'));
  const bb = await pg.locator('#pad [data-act="dodge"]').boundingBox();
  await pg.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await pg.mouse.down();
  await pg.mouse.move(500, 200, { steps: 6 }); await pg.mouse.up();
  if (shot) await pg.screenshot({ path: shot + '_arrange.png' });
  out.moved = await pg.evaluate(() => { const r = document.querySelector('#pad [data-act="dodge"]').getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - 500) < 6 && Math.abs(r.top + r.height / 2 - 200) < 6 && !!Settings.get('padLayout').dodge; });
  await pg.click('#arrangeBar [data-pad="done"]');
  out.done = await pg.evaluate(() => !TouchLayout.editing && !document.getElementById('arrangeBar').classList.contains('show'));
  await pg.reload(); await pg.waitForTimeout(400);
  out.kept = await pg.evaluate(() => { __dw.arena(0); __dw.World.halt(); const r = document.querySelector('#pad [data-act="dodge"]').getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - 500) < 6; });
  if (shot) { await pg.evaluate(() => { Settings.set('lefty', true); }); await pg.waitForTimeout(400); await pg.screenshot({ path: shot + '_lefty.png' }); await pg.evaluate(() => Settings.set('lefty', false)); }
  out.reset = await pg.evaluate(() => { TouchLayout.reset(); const r = document.querySelector('#pad [data-act="dodge"]').getBoundingClientRect(); return Object.keys(Settings.get('padLayout')).length === 0 && r.left > innerWidth / 2; });
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
