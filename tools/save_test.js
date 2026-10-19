// Headless check of save safety: the title's buttons, three slots that keep apart, export and import (and a bad code
// refused), deleting only when asked twice, migrating an old save, and falling back to the backup when a save is broken.
// Run: node tools/save_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const url = 'file://' + path.resolve(__dirname, '../index.html');
  await pg.goto(url); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  const out = {};
  const text = id => pg.evaluate(i => { const e = document.getElementById(i); return getComputedStyle(e).display === 'none' ? '' : e.textContent; }, id);
  out.freshTitle = (await text('startBtn')) === 'Begin' && (await text('contBtn')) === '';
  await pg.click('#startBtn'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { while (__dw.UI.open) __dw.UI.close(); Items.S.gold = 777; Items.save(); });
  await pg.reload(); await pg.waitForTimeout(300);
  out.continueShown = (await text('contBtn')) === 'Continue' && (await text('startBtn')) === 'Saves';
  // The saves screen: slot 1 is filled; a new game in slot 2 leaves slot 1 alone
  await pg.click('#startBtn'); await pg.waitForTimeout(100);
  out.savesPanel = await pg.evaluate(() => document.querySelectorAll('.pcard.saves .irow.save').length === 3 && /777/.test(document.querySelector('.pcard.saves .irow.save').textContent));
  await pg.click('[data-act="savenew"][data-arg="2"]'); await pg.waitForTimeout(200);
  Object.assign(out, await pg.evaluate(() => {
    const o = {}; while (__dw.UI.open) __dw.UI.close();
    o.slot2 = Items.slot === 2 && Items.S.gold === 0 && Items.slotInfo(1).gold === 777;
    Items.S.gold = 55; Items.save();
    // Export slot 1, import it into slot 3
    const code = Items.exportSlot(1);
    o.exportCode = /^DEEPWARD1:/.test(code);
    o.importOk = Items.importSlot(3, code) && Items.slotInfo(3).gold === 777 && Items.slotInfo(2).gold === 55;
    o.badImport = !Items.importSlot(3, 'DEEPWARD1:not-a-save') && !Items.importSlot(3, 'hello') && Items.slotInfo(3).gold === 777;
    return o;
  }));
  // Import and delete through the screen (delete asks twice)
  await pg.evaluate(() => { __dw.G.state = 'title'; __dw.openSaves(); });
  await pg.click('[data-act="saveexport"][data-arg="1"]');
  const code = await pg.evaluate(() => document.querySelector('.savecode textarea').value);
  await pg.click('[data-act="saveimport"][data-arg="2"]'); await pg.fill('.savecode textarea', code); await pg.click('[data-act="saveimportgo"][data-arg="2"]');
  out.importScreen = await pg.evaluate(() => Items.slotInfo(2).gold === 777);
  await pg.click('[data-act="savedel"][data-arg="3"]');
  out.deleteAsks = await pg.evaluate(() => !!Items.slotInfo(3) && /Sure/.test(document.querySelector('[data-act="savedel"][data-arg="3"]').textContent));
  await pg.click('[data-act="savedel"][data-arg="3"]');
  out.deleted = await pg.evaluate(() => !Items.slotInfo(3) && !!document.querySelector('[data-act="savenew"][data-arg="3"]'));
  // Typing a code does not trigger game keys (I would close the menu)
  await pg.click('[data-act="saveimport"][data-arg="3"]'); await pg.type('.savecode textarea', 'IIII');
  out.typing = await pg.evaluate(() => !!__dw.UI.open && document.querySelector('.savecode textarea').value === 'IIII');
  // An old (version 1) save: weight classes fixed on its pieces, new fields filled in
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, old = { gold: 12, scrap: 0, inv: [{ id: 5, slot: 'armor', tier: 5, rarity: 0, plus: 0, aff: [], name: 'Deep-forged Brigandine' }], equip: { weapon: { id: 1, slot: 'weapon', type: 'sword', tier: 0, rarity: 0, plus: 0, aff: [], name: 'Rusted Sword' } }, nextId: 6, camp: { forge: 1, apothecary: 0, yard: 0 }, stage: 2, story: { intro: true, pre: {}, post: {} }, level: 3 };
    localStorage.setItem('dw_save_v1', JSON.stringify(old)); Items.useSlot(1);
    o.migrated = Items.load() && Items.S.v === 2 && Items.S.inv[0].wc === 2 && Array.isArray(Items.S.uniques) && Items.S.gold === 12 && Items.S.camp.forge === 1;
    // A broken save falls back to the backup of the last good one
    Items.S.gold = 99; Items.save(); Items.load();                         // loads cleanly, so a backup is kept
    localStorage.setItem('dw_save_v1', '{"broken');
    o.backup = Items.load() && Items.S.gold === 99;
    return o;
  }));
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
