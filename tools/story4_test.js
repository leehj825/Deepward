// Headless check of the Hollow King's two phases (the King, then the Under at half health: tint, music theme, new moves, shades, a caption)
// and the companions' comments at the story's key moments.
// Run: node tools/story4_test.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 620 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(300);
  const o = await pg.evaluate(() => {
    const o = {}, G = __dw.G;
    __dw.arena(9); const p = G.player; p.maxHp = p.hp = 1e7; __dw.World.halt();
    const e = __dw.spawn('duelist', 0, -6); Enemy.makeBoss(e, 9); e.state = 'hunt';
    o.kingStart = e.def.guard === false && e.def.hyperArmor === true && e.rig.twoHand === true && e.boss.B.phases.length === 1;
    o.king9 = e.def.attacks.length === 3 && !e.def.attacks.some(a => a.hits.some(h => h.blink));
    G.boss = e; e.hp = e.maxHp * 0.49; Enemy.receive(e, { dmg: 1, posture: 0 }, p); __dw.sim(2.5);
    o.turned = e.tint === 0x4a1a7a && e.musicTheme === 10 && e.enraged === true && e.boss.next === 1;
    o.under = /Under/.test(document.getElementById('whisper').textContent) && /tired/.test(document.getElementById('whisper').textContent);
    o.newMoves = e.def.attacks.some(a => a.hits.some(h => h.blink)) && e.def.attacks.some(a => a.hits.some(h => h.aoe && h.aoe.r > 4));
    o.shades = G.enemies.filter(x => x.add && x.state !== 'dead').length + G.queue.filter(q => q.add).length >= 2;
    o.music = __dw.musicMood() === 'boss';
    Story.guardianWake(9, 0); o.wake = /Do it properly/.test(document.getElementById('whisper').textContent);
    Story.guardianWake(9, 1); o.noWakeLater = true;
    __dw.Items.S.party = ['hobb', 'aldo', 'mira'];
    window.__spoke = []; const w = document.getElementById('whisper'); new MutationObserver(() => window.__spoke.push(w.textContent)).observe(w, { childList: true, characterData: true, subtree: true });
    o.started = Story.banter('throne') === true;
    __dw.Items.S.party = []; o.silent = Story.banter('throne') === false;
    return o;
  });
  await pg.waitForTimeout(6500);
  const o2 = await pg.evaluate(() => {
    const t = window.__spoke.join(' | ');
    const r = {}; r.hobbSpoke = /Stance, warden/.test(t); r.aldoSpoke = /He was a person/.test(t); r.onlyTwo = !/Two voices/.test(t);
    return r;
  });
  await b.close();
  const out = Object.assign(o, o2);
  const bad = Object.entries(out).filter(([, v]) => v !== true);
  const ok = !errs.length && !bad.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out)); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
