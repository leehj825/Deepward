// Headless check of photo mode: the fight holds still, the HUD hides, the camera orbits and zooms, filters cycle, the
// warden can be hidden, a picture is saved (with the filter baked in), and Done puts everything back.
// Run: node tools/photo_test.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 600 }, acceptDownloads: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(300);
  await pg.evaluate(() => { __dw.arena(0); __dw.G.player.pos.set(0, 0, 4); __dw.sim(0.5); });
  const out = {};
  await pg.keyboard.press('KeyH'); await pg.waitForTimeout(100);
  Object.assign(out, await pg.evaluate(() => {
    const G = __dw.G, t0 = G.time, e = G.enemies[0], ep = e && e.pos.clone();
    __dw.sim(0.5);
    return { on: G.state === 'photo', frozen: G.time === t0 && (!e || e.pos.distanceTo(ep) < 1e-6), hudHidden: getComputedStyle(document.getElementById('hud')).display === 'none', bar: document.getElementById('photoBar').classList.contains('show') };
  }));
  const cam = () => pg.evaluate(() => __dw.camera.position.toArray());
  const c0 = await cam(); const box = await pg.$('#game'); const bb = await box.boundingBox();
  await pg.mouse.move(bb.x + 500, bb.y + 300); await pg.mouse.down(); await pg.mouse.move(bb.x + 650, bb.y + 320, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(100);
  const c1 = await cam(); out.orbits = Math.hypot(c1[0] - c0[0], c1[2] - c0[2]) > 0.5;
  await pg.mouse.wheel(0, 400); await pg.waitForTimeout(100); const c2 = await cam();
  out.zooms = await pg.evaluate(([a, b]) => { const p = __dw.G.player.pos; return Math.hypot(b[0] - p.x, b[2] - p.z) > Math.hypot(a[0] - p.x, a[2] - p.z); }, [c1, c2]);
  await pg.click('[data-ph="filter"]'); out.filter = await pg.evaluate(() => /sepia/.test(document.getElementById('game').style.filter));
  await pg.click('[data-ph="hero"]'); out.heroHidden = await pg.evaluate(() => !__dw.G.player.rig.root.visible);
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 5000 }), pg.click('[data-ph="save"]')]);
  out.saved = /^deepward-\d{8}-\d{6}\.png$/.test(dl.suggestedFilename()) && await pg.evaluate(() => __dw.G.lastPhoto.length > 5000);
  await pg.click('[data-ph="exit"]');
  out.back = await pg.evaluate(() => __dw.G.state === 'play' && __dw.G.player.rig.root.visible && !document.getElementById('game').style.filter && getComputedStyle(document.getElementById('hud')).display !== 'none');
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out)); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
