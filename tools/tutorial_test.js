// Headless check of the training yard: the offer after the intro, all six lessons completed by actually doing them
// (strike, heavy, block, parry, dash through the slam, break and execute), the first-time reward, and leaving early.
// Run: node tools/tutorial_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
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
    __dw.setView('top'); __dw.start('new');
    while (__dw.UI.open && document.querySelector('.pcard.dialogue')) document.querySelector('#pcard .pb').click();
    out.offer = !!document.querySelector('.pcard.trainOffer');
    document.querySelector('[data-act="train"]').click();
    out.started = Tutorial.active && document.getElementById('lesson').classList.contains('show');
    const gold0 = I.S.gold, p = G.player, foe = () => G.enemies.find(e => e.type === 'sparring' && e.state !== 'dead');
    const face = () => { const f = foe(); if (f) p.facing = Math.atan2(f.pos.x - p.pos.x, f.pos.z - p.pos.z); };
    const lesson = () => Tutorial.active ? Tutorial.index : 99;
    const done = [];
    // 1 strike, 2 heavy: walk up and swing
    for (const act of ['light', 'heavy']) {
      const L = lesson(); p.pos.set(foe().pos.x, 0, foe().pos.z + 1.7);
      __dw.sim(14, t => { face(); if (Math.floor(t * 60) % 30 === 0) __dw.press(act); return lesson() !== L; });
      done.push(lesson() !== L);
    }
    // 3 block, 4 parry: answer the slow overhead; 5 dash through the slam
    const answer = how => {
      const L = lesson(); p.pos.set(foe().pos.x, 0, foe().pos.z + 1.7);
      __dw.sim(30, () => {
        face(); const f = foe(); __dw.Input.touchBlock = false;
        if (f && f.state === 'attack' && (f.phase === 'wind' || f.phase === 'active')) {
          const h = f.atk.hits[f.hitIdx], left = f.phase === 'wind' ? h.wind - f.phaseT + h.active * 0.5 : h.active * 0.5 - f.phaseT;
          if (how === 'block' && left < 0.5) __dw.Input.touchBlock = true;
          if (how === 'parry' && left < 0.1) __dw.Input.touchBlock = true;
          if (how === 'dash' && left < 0.14 && left > 0 && p.state === 'free') { __dw.Input.stick.x = 1; __dw.press('dodge'); }
        }
        if (p.state === 'free' && how === 'dash') __dw.Input.stick.x = 0;
        return lesson() !== L;
      });
      __dw.Input.touchBlock = false; __dw.Input.stick.x = 0;
      return lesson() !== L;
    };
    done.push(answer('block'), answer('parry'), answer('dash'));
    // 6 break his posture with parries and heavies, then execute
    const L6 = lesson(); p.pos.set(foe().pos.x, 0, foe().pos.z + 1.7);
    __dw.sim(40, t => {
      face(); const f = foe(); __dw.Input.touchBlock = false;
      if (!f) return false;
      if (f.state === 'broken') { __dw.press('heavy'); return false; }
      if (f.state === 'attack' && ((f.phase === 'wind' && f.atk.hits[f.hitIdx].wind - f.phaseT + f.atk.hits[f.hitIdx].active * 0.5 < 0.1) || f.phase === 'active')) __dw.Input.touchBlock = true;
      return !Tutorial.active;
    });
    __dw.sim(2, () => !Tutorial.active);
    done.push(!Tutorial.active);
    out.lessons = done;
    __dw.sim(1);
    out.reward = I.S.trained && I.S.gold >= gold0 + 150 && !G.enemies.some(e => e.type === 'sparring' && e.state !== 'dead');
    // Again from the yard, then leave early
    G.startTraining(); out.again = Tutorial.active; document.querySelector('#lesson [data-t="leave"]').click();
    out.left = !Tutorial.active && !G.enemies.some(e => e.type === 'sparring' && e.state !== 'dead');
    return out;
  });
  await b.close();
  const ok = !errs.length && r.offer && r.started && r.lessons.every(Boolean) && r.lessons.length === 6 && r.reward && r.again && r.left;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
