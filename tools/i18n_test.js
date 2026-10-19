// Headless check of the Korean texts: with the language set to Korean, every screen the harvester opens is walked
// again and any text still showing English words is listed (tools/i18n/untranslated_ko.json). Key names, button
// letters and the like may stay. Also checks an item name (suffix moved to the front), a number template and that
// switching to English brings English back. Run: node tools/i18n_test.js   (needs Playwright)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ALLOW = /^(WASD|Esc|Space|Enter|Tab|Shift|Ctrl|LB|RB|LT|RT|LS|RS|View|Menu|Key[A-Z]|Arrow\w+|Shift\w+|Digit\d|PNG|FPS|XP|HP|OK|[A-Z]|[A-Z]\d?|px|ms|x|vs|Deepward|English)$/;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
  await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('dw_settings', JSON.stringify({ lang: 'ko' })); }); await pg.reload(); await pg.waitForTimeout(400);
  const out = { korean: await pg.evaluate(() => I18N.lang === 'ko' && /[가-힣]/.test(document.getElementById('title').textContent)) };
  const left = await pg.evaluate(async () => {
    const G = __dw.G, I = __dw.Items, sleep = ms => new Promise(r => setTimeout(r, ms)), close = () => { while (__dw.UI.open) __dw.UI.close(); };
    const bad = new Set(), scan = () => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) { const el = n.parentElement; if (!el || el.closest('script,style,[translate="no"]') || !el.offsetParent && getComputedStyle(el).position !== 'fixed') continue; const t = n.data.trim(); if (/[A-Za-z]{3,}/.test(t)) bad.add(t); } };
    const panel = async (id, opt) => { close(); try { __dw.openPanel(id, opt); } catch (e) { return; } await sleep(20); scan(); for (const t of [...document.querySelectorAll('[data-act="tab"]')].map(b => b.dataset.arg)) { const b = document.querySelector(`[data-act="tab"][data-arg="${t}"]`); if (b) { b.click(); await sleep(20); scan(); } } };
    scan(); __dw.start('new'); await sleep(50); scan(); close(); G.state = 'play';
    I.S.gold = 99999; I.S.scrap = 999; I.S.stage = 10; I.S.level = 20; I.S.points = 5; I.S.mats = { pelt: 9, tusk: 9, bone: 9, ore: 9, herb: 9, silk: 9 }; I.S.gems = { ruby: 3, sapphire: 3 };
    I.S.raids = 2; I.S.endless = { best: 6, daily: { date: '', best: 2 }, heat: { 1: 4 } }; I.S.bossKills = { ridgehorror: 1, mossback: 1, colossus: 1, mirelord: 1 };
    for (let r = 0; r < 4; r++) for (const s of CFG.gear.slots) I.add(I.generate(r + 2, { slot: s, rarity: r }));
    G.onGearChanged(true); await sleep(30); scan();
    for (const id of ['smith', 'trader', 'ledger', 'gate', 'gemcutter', 'herbalist', 'curio', 'board', 'arena', 'looks', 'trainOffer', 'trainer', 'settings', 'controls', 'saves', 'curses', 'talents', 'codex', 'bag']) await panel(id);
    close(); for (const k of [0, 5]) { G.descend(k); await sleep(1300); scan(); close(); __dw.sim(1); scan(); }
    return [...bad];
  });
  const real = left.filter(t => t.split(/[^A-Za-z-]+/).filter(w => w.length >= 3).some(w => !ALLOW.test(w)));
  fs.writeFileSync(path.join(__dirname, 'i18n', 'untranslated_ko.json'), JSON.stringify(real.sort(), null, 1));
  out.coverage = real.length <= 15;                          // a few dynamic odds and ends may stay
  Object.assign(out, await pg.evaluate(() => {
    const o = {};
    o.itemName = I18N.tr('Runed Gauntlets of Fortune') !== 'Runed Gauntlets of Fortune' && /의 /.test(I18N.tr('Runed Gauntlets of Fortune'));
    o.template = /[가-힣]/.test(I18N.tr('Learn rank 2 · 3 point'));
    return o;
  }));
  await pg.evaluate(() => { localStorage.setItem('dw_settings', JSON.stringify({ lang: 'en' })); }); await pg.reload(); await pg.waitForTimeout(300);
  out.english = await pg.evaluate(() => I18N.lang === 'en' && !/[가-힣]/.test(document.body.textContent));
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out) + ` (untranslated: ${real.length})`); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
