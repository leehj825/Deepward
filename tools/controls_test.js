// Headless check of rebinding: change a key from Settings → Controls and the game follows (attacks, movement, hints),
// a key taken by one action leaves the other, Esc cancels, a controller button can be rebound, and defaults come back.
// Run: node tools/controls_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  const play = () => pg.evaluate(() => { while (__dw.UI.open) __dw.UI.close(); __dw.G.state = 'play'; const p = __dw.G.player; p.state = 'free'; p.st = p.maxSt; });
  // Frames are slow in a headless browser, so each check waits for its outcome (or a time limit)
  const until = (fn, ms = 3000, arg) => pg.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
  const attacked = async (key, ms = 3000) => { await play(); await pg.keyboard.press(key); return until(() => __dw.G.player.state === 'attack', ms); };
  await pg.evaluate(() => { __dw.arena(0); __dw.World.halt(); });
  const out = {};
  out.defaultJ = await attacked('j');
  // Settings → Controls → Attack, then press U
  await pg.evaluate(() => { __dw.G.state = 'play'; __dw.openSettings(); });
  await pg.click('[data-act="open"][data-arg="controls"]');
  await pg.click('[data-act="bindkey"][data-arg="light"]');
  out.listening = await pg.evaluate(() => !!document.querySelector('.listen') && Bindings.listening.act === 'light');
  await pg.keyboard.press('u');
  out.bound = await pg.evaluate(() => Settings.get('keys').light[0] === 'KeyU' && !Bindings.listening && /U/.test(document.querySelector('[data-act="bindkey"][data-arg="light"]').textContent));
  out.newKey = await attacked('u');
  out.oldKeyFree = !(await attacked('j', 800));
  // Taking a key from another action: give Dash the K key (Heavy keeps Q)
  await pg.evaluate(() => { __dw.openSettings(); }); await pg.click('[data-act="open"][data-arg="controls"]');
  await pg.click('[data-act="bindkey"][data-arg="dodge"]'); await pg.keyboard.press('k');
  out.stolen = await pg.evaluate(() => { const K = Settings.get('keys'); return K.dodge[0] === 'KeyK' && !K.heavy.includes('KeyK') && K.heavy.includes('KeyQ'); });
  // Esc cancels without changing anything
  await pg.click('[data-act="bindkey"][data-arg="flask"]'); await pg.keyboard.press('Escape');
  out.escCancels = await pg.evaluate(() => !Bindings.listening && !!__dw.UI.open && Bindings.label('flask') === 'R');
  // Movement follows: forward on Y
  await pg.click('[data-act="bindkey"][data-arg="up"]'); await pg.keyboard.press('y');
  await play();
  const from = await pg.evaluate(() => ({ x0: __dw.G.player.pos.x, z0: __dw.G.player.pos.z }));
  await pg.keyboard.down('y');
  out.move = await until(o => Math.hypot(__dw.G.player.pos.x - o.x0, __dw.G.player.pos.z - o.z0) > 0.5, 4000, from);
  await pg.keyboard.up('y');
  // Hints follow the keys
  out.hints = await pg.evaluate(() => Bindings.fmt('Hit HEAVY (@heavy)', 'key') === 'Hit HEAVY (Q / middle-click)' && /<b>U<\/b>\/click attack/.test(document.getElementById('keys').innerHTML));
  // A controller: rebind Heavy to Y (the ultimate gives it up), then Y does a heavy attack
  await pg.evaluate(() => {
    window.__pad = { connected: true, mapping: 'standard', index: 0, id: 'Xbox', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(Navigator.prototype, 'getGamepads', { value: () => [window.__pad], configurable: true });
    __dw.openSettings();
  });
  await pg.click('[data-act="open"][data-arg="controls"]'); await pg.click('[data-act="bindpad"][data-arg="heavy"]');
  await pg.waitForTimeout(100);
  await pg.evaluate(() => { __pad.buttons[3] = { pressed: true, value: 1 }; }); await until(() => !Bindings.listening); await pg.evaluate(() => { __pad.buttons[3] = { pressed: false, value: 0 }; });
  out.padBound = await pg.evaluate(() => { const P = Settings.get('padKeys'); return P.heavy && P.heavy[0] === 3 && !P.ult.includes(3); });
  await play(); await pg.waitForTimeout(300);
  await pg.evaluate(() => { __pad.buttons[3] = { pressed: true, value: 1 }; });
  out.padHeavy = await until(() => __dw.G.player.state === 'attack' && __dw.G.player.atkKind === 'heavy', 8000);   // slow headless frames under load
  await pg.evaluate(() => { __pad.buttons[3] = { pressed: false, value: 0 }; });
  // Restore defaults
  out.reset = await pg.evaluate(() => { Bindings.reset(); return Bindings.label('light') === 'J' && Bindings.label('heavy', 'pad') === 'RT' && Bindings.label('up') === 'W'; });
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
