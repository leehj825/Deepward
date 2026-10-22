// Headless check of the main story and its scenes: the objective in the HUD, a scene played in the world (the speaker turns to the warden,
// words typed, a choice that jumps, skipping), objectives moving on with talking and a fallen guardian, saved progress.
// Run: node tools/story_test.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 620 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items; let p;
    __dw.Items.wipe(); __dw.start('new'); __dw.sim(0.3);
    while (document.querySelector('.pcard.dialogue')) document.querySelector('#pcard .pb').click();
    if (document.querySelector('[data-act="pickclass"]')) document.querySelector('[data-act="pickclass"][data-arg="warrior"]').click();
    if (document.querySelector('[data-act="looksdone"]')) document.querySelector('[data-act="looksdone"]').click();
    const off = document.querySelector('.pcard.trainOffer [data-act="close"]'); if (off) off.click();
    __dw.sim(0.3); p = G.player;
    o.objective = /Maren/.test(document.getElementById('objective').textContent) && I.S.main.i === 0;
    const camp = __dw.World.rooms.find(r => r.kind === 'camp'), maren = camp.npcs.find(n => n.id === 'elder');
    // Talk to Maren: a scene, not a panel
    p.pos.set(2.4, 0, 3.6); __dw.sim(0.3); __dw.interact(); __dw.sim(0.1);
    o.sceneOn = G.state === 'scene' && Scene.active && !document.querySelector('.pcard.dialogue') && document.getElementById('sceneBox').classList.contains('show');
    __dw.sim(1.0); const typed = document.querySelector('#sceneBox .st').textContent;
    o.typing = typed.length > 10 && typed.length < Scene.current.full.length;
    const want = Math.atan2(p.pos.x - maren.x, p.pos.z - maren.z); let df = want - maren.face; df = Math.atan2(Math.sin(df), Math.cos(df));
    __dw.sim(1); o.turns = Math.abs(df) < 0.5 || Math.abs(Math.atan2(Math.sin(want - maren.face), Math.cos(want - maren.face))) < 0.5;
    o.nameShown = document.querySelector('#sceneBox .sn').textContent === 'Maren';
    Scene.next(); o.completes = document.querySelector('#sceneBox .st').textContent === Scene.current.full;      // the first key finishes the line
    Scene.next(); __dw.sim(4);                                                                                    // the second goes on: the menu line with choices
    o.choices = document.querySelectorAll('#sceneBox .sc button').length === 3;
    Scene.pick(1); __dw.sim(0.1); o.jumped = /bells/.test(Scene.current.full);                                    // "Louder how?"
    Scene.next(); __dw.sim(0.1); Scene.next(); __dw.sim(4); o.back = document.querySelectorAll('#sceneBox .sc button').length === 3;
    Scene.pick(2); __dw.sim(0.1); o.start = /Hobb/.test(Scene.current.full);
    Scene.skip(); __dw.sim(0.2);
    o.ended = G.state === 'play' && !Scene.active && !document.getElementById('sceneBox').classList.contains('show');
    o.advanced = I.S.main.i === 1 && /Hobb/.test(document.getElementById('objective').textContent);
    // The usual lines are a scene too once the story has nothing waiting for Maren
    p.pos.set(2.4, 0, 3.6); __dw.sim(0.3); I.S.main.i = 2; __dw.interact(); __dw.sim(0.1); o.usual = G.state === 'scene'; Scene.skip(); __dw.sim(0.1);
    // A guardian falling moves the step on (no scene), and talking to Maren then plays the report with its choice
    I.S.main.i = 2; Story.event('guardian', 0); o.guardianStep = I.S.main.i === 3 && G.state === 'play';
    __dw.interact(); __dw.sim(0.1); o.report = G.state === 'scene' && /Warden/.test(Scene.current.full);
    for (let k = 0; k < 6 && Scene.active; k++) { Scene.next(); __dw.sim(4); Scene.next(); __dw.sim(0.1); if (document.querySelectorAll('#sceneBox .sc button').length) Scene.pick(0); }
    o.reportDone = !Scene.active && I.S.main.i === 4;
    I.S.main.i = 5; Story.event('guardian', 5); o.wrongGuardian = I.S.main.i === 5;           // another guardian: nothing
    // Pressing on without going home: guardians cleared out of step still count, in order, as the talks catch up
    I.S.main.i = 2; I.S.stage = 3; o.catchUp = /Maren/.test(Story.objective()) && I.S.main.i === 3;        // the Crypt's step is done by the cleared stage
    const hit = Story.event('talk', 'elder'); for (let k = 0; k < 40 && Scene.active; k++) { __dw.sim(0.1); Scene.next(); __dw.sim(4); if (Scene.current && Scene.current.choices.length) Scene.pick(0); else Scene.next(); }
    o.catchUp2 = hit && /Maren/.test(Story.objective()) && I.S.main.i === 5;                    // the report, then the Keep's step on its own, then the king step waits
    // Saved
    Items.save(); o.saved = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /dw_/.test(k) && /"main"/.test(localStorage.getItem(k)) ) || '') || '{}').main !== undefined;
    return o;
  });
  await b.close();
  const bad = Object.entries(out).filter(([, v]) => v !== true);
  const ok = !errs.length && !bad.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out)); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
