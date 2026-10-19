// Headless check of the codex and achievements: lifetime records add up from fights, a bestiary entry opens on the
// first kill with its telegraphs, achievements pay once, uniques show when found, and the panel opens from the gear
// screen and the pause screen.
// Run: node tools/codex_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
  await pg.waitForTimeout(300);
  const r = await pg.evaluate(() => {
    const out = {}, G = __dw.G, I = __dw.Items;
    __dw.setView('top'); __dw.arena(0); __dw.World.halt(); G.queue = []; G.mode = 'dungeon';
    const p = G.player; p.maxHp = p.hp = 1e5;
    // A skeleton slain: kills and its bestiary entry; first-blood pays once
    const g0 = I.S.gold;
    const e = __dw.spawn('skeleton', p.pos.x, p.pos.z - 2); __dw.sim(1); e.state = 'broken'; Enemy.receive(e, { dmg: 9999, posture: 0 }, p);
    __dw.sim(1);
    out.kills = Codex.life().kills === 1 && Codex.life().kinds.skeleton === 1;
    out.firstBlood = !!I.S.ach.first && I.S.gold >= g0 + 20;
    const g1 = I.S.gold; __dw.sim(1); out.paysOnce = I.S.gold === g1;
    // A parry counts toward the lifetime record
    const k = __dw.spawn('knight', p.pos.x, p.pos.z - 1.6); __dw.sim(1); p.state = 'free'; p.blocking = true; p.blockT = 0.02;
    Player.receive(p, k, k.def.attacks[0].hits[0]); __dw.sim(0.6);
    out.parries = Codex.life().parries === 1;
    // The bestiary shows the skeleton with its telegraphs, the knight stays ??? until slain
    __dw.openPanel('codex');
    const txt = document.querySelector('.pcard.codex').textContent;
    out.bestiary = /Skeleton/.test(txt) && /WHITE: block or parry/.test(txt) && txt.includes('???');
    // Uniques and achievements tabs
    I.generateUnique(2, { id: 'dawn' }); document.querySelector('[data-arg="codex:uniques"]').click();
    out.uniques = /Dawnbreaker/.test(document.querySelector('.pcard.codex').textContent);
    document.querySelector('[data-arg="codex:ach"]').click();
    out.achTab = document.querySelectorAll('.pcard.codex .irow').length === Codex.list.length && Codex.list.length >= 30;
    document.querySelector('[data-arg="codex:records"]').click();
    out.records = /Foes felled/.test(document.querySelector('.pcard.codex').textContent);
    __dw.UI.close();
    // From the gear screen
    __dw.openPanel('bag'); document.querySelector('[data-act="open"][data-arg="codex"]').click();
    out.fromBag = !!document.querySelector('.pcard.codex'); __dw.UI.close();
    // Unique-found achievement pays; saved with the game
    __dw.sim(1); out.uniqueAch = !!I.S.ach.unique1;
    I.save(); out.saved = JSON.parse(localStorage.getItem('dw_save_v1')).ach.first > 0;
    // From the pause screen, and back
    G.state = 'play'; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyP' }));
    document.getElementById('codexBtn').click(); out.fromPause = !!document.querySelector('.pcard.codex');
    __dw.UI.close(); out.backToPause = G.state === 'pause';
    return out;
  });
  await b.close();
  const ok = !errs.length && Object.values(r).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
