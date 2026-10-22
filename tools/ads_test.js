// Headless check of the ad strip: with no ad nothing is reserved; once an ad is up everything at the top of the screen (health bar, buttons, minimap,
// place name, tips) sits below the strip the banner takes, on a wide and on a narrow screen. Run: node tools/ads_test.js   (needs Playwright)
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const bad = [], errs = [];
  for (const [w, h] of [[1100, 700], [400, 800]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } }); pg.on('pageerror', x => errs.push(x.message));
    await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await pg.waitForTimeout(600);
    const r = await pg.evaluate(() => {
      document.body.classList.add('playing'); 
      const ids = ['hud', 'corner', 'waveBox', 'minimap', 'mapInfo'], top = id => document.getElementById(id).getBoundingClientRect().top;
      const before = Object.fromEntries(ids.map(i => [i, top(i)]));
      document.getElementById('adSlot').innerHTML = '<div style="width:320px;height:50px"></div>'; Ads.show(true);
      const adh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--adh'));
      const after = Object.fromEntries(ids.map(i => [i, top(i)]));
      const sc = document.getElementById('panel'); sc.classList.add('show'); document.getElementById('pcard').innerHTML = '<h2>x</h2>'.repeat(60); const pc = document.getElementById('pcard').getBoundingClientRect();
      return { adh, before, after, cardTop: pc.top };
    });
    for (const id of Object.keys(r.after)) { if (r.after[id] < r.adh - 0.5 || r.after[id] < r.before[id] + r.adh - 0.5) bad.push(`${w}x${h} ${id}: ${r.before[id]} -> ${r.after[id]} (strip ${r.adh})`); }
    if (r.cardTop < r.adh - 0.5) bad.push(`${w}x${h} panel card starts at ${r.cardTop}, under the strip ${r.adh}`);
    await pg.close();
  }
  await b.close();
  console.log(bad.length || errs.length ? 'FAIL ' + JSON.stringify({ bad, errs }) : 'PASS'); process.exit(bad.length || errs.length ? 1 : 0);
})();
