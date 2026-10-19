// Headless check of the settings menu (from the title and the pause screen), that each setting takes effect and is kept,
// and that the score follows the action (camp, dungeon, combat, boss).
// Run: node tools/settings_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const url = 'file://' + path.resolve(__dirname, '../index.html');
  await pg.goto(url); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  await pg.waitForTimeout(300);
  const out = {};
  // From the title
  await pg.click('#titleSetBtn');
  out.fromTitle = await pg.evaluate(() => __dw.UI.open && __dw.G.state === 'menu' && !document.getElementById('title').classList.contains('show'));
  await pg.click('[data-act="set"][data-arg="music:-1"]'); await pg.click('[data-act="set"][data-arg="music:-1"]');
  await pg.click('[data-act="set"][data-arg="sens:1"]');
  await pg.click('[data-act="quality"]'); await pg.click('[data-act="quality"]'); await pg.click('[data-act="quality"]');
  out.lowQuality = await pg.evaluate(() => Settings.get('quality') === 'low' && !__dw.renderer.shadowMap.enabled && __dw.renderer.getPixelRatio() === 1);
  await pg.click('[data-act="quality"]');
  await pg.click('[data-act="toggle"][data-arg="invertY"]'); await pg.click('[data-act="toggle"][data-arg="shake"]');
  await pg.click('[data-act="close"]');
  out.backToTitle = await pg.evaluate(() => __dw.G.state === 'title' && document.getElementById('title').classList.contains('show'));
  await pg.reload(); await pg.waitForTimeout(300);
  out.kept = await pg.evaluate(() => ({ music: Settings.get('music'), sens: Settings.get('sens'), invertY: Settings.get('invertY'), shake: Settings.get('shake') }));
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, G = __dw.G, V = __dw.View;
    __dw.setView('behind'); __dw.arena(0); __dw.World.halt(); G.queue = [];
    // Sensitivity and inverted look
    const y0 = V.yaw, p0 = V.pitch = 0.5;
    const ev = new MouseEvent('mousemove'); // turnView is internal; drive it through the pad's right stick instead
    G.state = 'play';
    // Screen shake off
    FX.shake(0.5); o.noShake = FX.shakeAmt === 0;
    // Pause -> settings -> back to pause
    G.state = 'pause'; document.getElementById('pause').classList.add('show');
    __dw.openSettings(); o.fromPause = __dw.UI.open && !document.getElementById('pause').classList.contains('show');
    __dw.UI.back(); o.backToPause = G.state === 'pause' && document.getElementById('pause').classList.contains('show');
    G.state = 'play'; document.getElementById('pause').classList.remove('show');
    // Music moods
    G.mode = 'camp'; o.camp = __dw.musicMood();
    G.mode = 'dungeon'; G.calmAt = undefined; o.dungeon = __dw.musicMood();
    const e = __dw.spawn('skeleton', G.player.pos.x, G.player.pos.z - 4); o.combat = __dw.musicMood();
    e.state = 'dead'; __dw.sim(1); o.lingers = __dw.musicMood();
    __dw.sim(4); o.calm = __dw.musicMood();
    const bss = __dw.spawn('knight', G.player.pos.x, G.player.pos.z - 4); bss.guardian = 'x'; Enemy.makeBoss(bss, 1); G.boss = bss; o.boss = __dw.musicMood();
    Snd.init();
    return o;
  }));
  // The pad's right stick turns the camera by the sensitivity, inverted vertically
  await pg.evaluate(() => {
    const pad = { connected: true, mapping: 'standard', index: 0, id: 'Xbox', axes: [0, 0, 0.9, 0.9], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(Navigator.prototype, 'getGamepads', { value: () => [pad], configurable: true });
    window.__V0 = { yaw: __dw.View.yaw, pitch: __dw.View.pitch = 0.6 };
  });
  await pg.waitForTimeout(300);
  Object.assign(out, await pg.evaluate(() => ({ turned: __dw.View.yaw !== __V0.yaw, inverted: __dw.View.pitch < __V0.pitch })));
  await pg.waitForTimeout(2500);
  out.scoreMood = await pg.evaluate(() => Snd.mood);
  await b.close();
  const ok = !errs.length && out.lowQuality && out.fromTitle && out.backToTitle && out.kept.music === 0.4 && out.kept.sens === 1.2 && out.kept.invertY === true && out.kept.shake === false
    && out.noShake && out.fromPause && out.backToPause && out.camp === 'camp' && out.dungeon === 'dungeon' && out.combat === 'combat' && out.lingers === 'combat'
    && out.calm === 'dungeon' && out.boss === 'boss' && out.turned && out.inverted && out.scoreMood === 'boss';
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
