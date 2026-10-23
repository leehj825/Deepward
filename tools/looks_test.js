// Headless check of the warden's appearance: offered after the opening story, the choices reach the hero's look and the
// save, and the training offer follows. Run: node tools/looks_test.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 650 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.evaluate(() => __dw.start('new')); await pg.waitForTimeout(300);
  for (let i = 0; i < 15; i++) { if (await pg.evaluate(() => __dw.UI.open && __dw.UI.open.id) !== 'dialogue') break; await pg.click('[data-act="next"]'); }
  await pg.evaluate(() => { const b = document.querySelector('[data-act="pickclass"][data-arg="warrior"]'); if (b) b.click(); });
  const out = { offered: await pg.evaluate(() => __dw.UI.open && __dw.UI.open.id === 'looks') };
  for (const a of ['skin:5', 'hair:5', 'style:2', 'beard:1']) await pg.click(`[data-act="look"][data-arg="${a}"]`);
  Object.assign(out, await pg.evaluate(() => {
    const L = __dw.Items.look(), A = CFG.appearance;
    return { look: L.skin === A.skins[5] && L.hair === A.hairs[5] && L.hairStyle === 'tail' && L.beard === 'short' };
  }));
  await pg.click('[data-act="looksdone"]'); out.thenTraining = await pg.evaluate(() => __dw.UI.open && __dw.UI.open.id === 'trainOffer');
  await pg.evaluate(() => { while (__dw.UI.open) __dw.UI.close(); __dw.openPanel('bag'); }); out.fromGear = await pg.evaluate(() => !!document.querySelector('[data-act="open"][data-arg="looks"]'));
  await pg.reload(); await pg.waitForTimeout(300);
  out.saved = await pg.evaluate(() => __dw.Items.load() && __dw.Items.S.looks.style === 2 && __dw.Items.S.looks.skin === 5);
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out)); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
