// Headless check of the pause screen's Main menu button: it asks twice inside a run, returns to the title, and Continue resumes the save.
// Run: node tools/menu_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 900, height: 620 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  await pg.evaluate(() => { __dw.arena(0); __dw.Items.save(); __dw.togglePause(); });
  const o = {};
  o.paused = await pg.evaluate(() => __dw.G.state === 'pause');
  await pg.click('#titleBtn');                                   // in a run: the first tap only asks
  o.asks = await pg.evaluate(() => document.getElementById('titleBtn').textContent !== 'Main menu' && __dw.G.state === 'pause');
  await Promise.all([pg.waitForNavigation(), pg.click('#titleBtn')]); await pg.waitForTimeout(500);
  o.title = await pg.evaluate(() => __dw.G.state === 'title' && document.getElementById('title').classList.contains('show'));
  o.continueShown = await pg.evaluate(() => document.getElementById('contBtn').style.display !== 'none');
  await pg.click('#contBtn'); await pg.waitForTimeout(500);
  o.resumed = await pg.evaluate(() => __dw.G.state === 'play' || __dw.G.state === 'menu');
  console.log(Object.values(o).every(Boolean) && !errs.length ? 'PASS ' + JSON.stringify(o) : 'FAIL ' + JSON.stringify(o) + errs.join('|'));
  await b.close();
})();
