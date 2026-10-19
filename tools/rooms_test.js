// Headless check of the newer side rooms: the gauntlet (sealed by a portcullis for three waves, then a rich chest) and
// the rune vault (runes show an order; a wrong plate fires spikes and resets it; the right order opens the vault).
// Run: node tools/rooms_test.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 900, height: 560 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, G = __dw.G, W = __dw.World; let p; const kill = () => { for (const e of G.enemies) if (e.state !== 'dead') { e.state = 'broken'; Enemy.receive(e, { dmg: 1e9, posture: 0 }, p); } };
    const find = kind => { for (let i = 0; i < 30; i++) { __dw.arena(i % 5); const r = W.sides.find(s => s.sideKind === kind); if (r) { p = G.player; return r; } } return null; };
    // The gauntlet
    let r = find('gauntlet'); o.gauntletFound = !!r;
    if (r) {
      p.maxHp = p.hp = 1e7; p.pos.set(r.cx, 0, r.cz); __dw.sim(0.3);
      o.sealed = r.state !== 'ahead' && r.pillars.some(q => r.seal.includes(q));
      __dw.setView('top'); p.pos.set(r.cx - r.dir * (r.hw - 1), 0, r.cz); Input.stick.x = -r.dir; Input.stick.z = 0;   // walk at the doorway
      __dw.sim(2); Input.stick.x = 0; __dw.setView('behind'); o.cannotLeave = Math.abs(p.pos.x - r.cx) < r.hw + 0.6;
      const waves = new Set(); for (let i = 0; i < 80 && r.state !== 'cleared'; i++) { __dw.sim(0.25); waves.add(r.wave); kill(); }
      o.threeWaves = waves.size === 3; __dw.sim(1.5);
      o.gauntletDone = r.state === 'cleared' && !!r.chest && r.chest.rich && !r.pillars.some(q => r.seal.includes(q)) && r.portcullis.position.y > 2;
    }
    // The rune vault
    r = find('puzzle'); o.puzzleFound = !!r;
    if (r) {
      p.maxHp = p.hp = 1000; p.pos.set(r.cx + r.dir * 2, 0, r.cz); __dw.sim(0.3); o.runesOn = r.state === 'runes';
      const stand = k => { p.pos.set(r.plates[k].x, 0, r.plates[k].z); __dw.sim(0.2); p.pos.set(r.cx + r.dir * 2.2, 0, r.cz + 3.5); __dw.sim(0.2); };
      const hp0 = p.hp; stand(r.seq[1]); o.wrongHurts = p.hp < hp0 && r.step === 0;
      stand(r.seq[0]); stand(r.seq[1]); stand(r.seq[2]);
      o.solved = r.state === 'cleared' && !!r.chest && r.chest.rich;
    }
    return o;
  });
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out)); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
