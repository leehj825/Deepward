// Headless check of controller support: a fake standard-mapping (Xbox) gamepad drives menus, movement, camera and actions.
// Run: node tools/gamepad_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 960, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => {
    const pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', connected: true, mapping: 'standard', index: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__pad = pad;
    window.__btn = (i, on) => { pad.buttons[i] = { pressed: on, value: on ? 1 : 0 }; };
    Object.defineProperty(Navigator.prototype, 'getGamepads', { value: () => [pad, null, null, null], configurable: true });
  });
  await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
  await pg.waitForTimeout(300);
  const r = await pg.evaluate(() => {
    const out = {}, G = __dw.G, sim = (s, fn) => __dw.sim(s, fn), tap = i => { __btn(i, true); sim(1 / 60); __btn(i, false); sim(1 / 60); };
    __dw.setView('behind');
    out.padClass = (sim(0.1), document.body.classList.contains('pad'));
    tap(0); out.startedWithA = G.state === 'menu' && __dw.G.mode === 'camp';      // a new game opens on the camp and its story
    for (let i = 0; i < 8 && G.state === 'menu'; i++) tap(0);                   // A pages through the story
    out.storyDone = G.state === 'play';
    __dw.arena(0); __dw.World.halt(); G.queue = []; G.player.pos.set(0, 0, 4);
    __pad.axes[1] = -1; sim(0.5); __pad.axes[1] = 0; sim(0.1);
    out.movedForward = G.player.pos.z < 2.5;
    const yaw0 = __dw.View.yaw; __pad.axes[2] = 1; sim(0.5); __pad.axes[2] = 0;
    out.cameraTurned = Math.abs(__dw.View.yaw - yaw0) > 1;
    tap(5); out.rbAttacks = G.player.state === 'attack'; sim(0.8);
    __btn(4, true); sim(0.2); out.lbBlocks = G.player.blocking; __btn(4, false); sim(0.2);
    tap(0); out.aDodges = G.player.state === 'roll'; sim(0.6);
    tap(7); out.rtHeavy = G.player.state === 'attack' && G.player.atkKind === 'heavy'; sim(1.2);
    tap(9); out.menuPauses = G.state === 'pause';
    tap(0); out.aResumes = G.state === 'play';
    const v0 = __dw.View.mode; tap(8); out.viewToggles = __dw.View.mode !== v0; tap(8);
    return out;
  });
  const ok = Object.values(r).every(v => v === true) && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r) + (errs.length ? ' errors: ' + errs.join(' | ') : ''));
  await b.close();
  process.exit(ok ? 0 : 1);
})();
