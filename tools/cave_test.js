// Headless check of the styled stages (caves: Ogre Den, Spider Depths, Frost Halls; the Iron Keep as a ruined town; the Bone Orchard as a forest): blockers shape every section, a walkable path always
// leads from the south doorway to the north one (a 0.5 m grid flood), nothing stands on a blocker, and the doorways stay clear.
// Run: node tools/cave_test.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 900, height: 560 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = { shaped: true, connected: true, doorsClear: true, plainStays: true }, G = __dw.G, W = __dw.World;
    const reach = r => {                                                   // can a body of radius 0.45 walk from the south end to the north end?
      const x0 = r.rect.x0, x1 = r.rect.x1, z0 = r.rect.z0, z1 = r.rect.z1, st = 0.5, nx = Math.floor((x1 - x0) / st), nz = Math.floor((z1 - z0) / st) - 1;
      const free = (x, z) => x > x0 + 0.45 && x < x1 - 0.45 && z > z0 + 0.45 && z < z1 - 0.45 && !r.pillars.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < (pr || CFG.pillarR) + 0.45);
      const key = (i, j) => i * (nz + 1) + j, seen = new Set(), q = [];
      const sx = r.doorS === null ? (x0 + x1) / 2 : r.doorS, ex = r.doorN === null ? (x0 + x1) / 2 : r.doorN;
      const si = Math.round((sx - x0) / st), ei = Math.round((ex - x0) / st);
      q.push([si, nz]); seen.add(key(si, nz));
      while (q.length) {
        const [i, j] = q.pop();
        if (j <= 1 && Math.abs(i - ei) <= 2) return true;
        for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + c; if (ii < 0 || jj < 0 || ii > nx || jj > nz || seen.has(key(ii, jj))) continue; if (!free(x0 + ii * st, z0 + jj * st)) continue; seen.add(key(ii, jj)); q.push([ii, jj]); }
      }
      return false;
    };
    for (const [stage, cave] of [[1, true], [2, true], [3, true], [6, true], [8, true], [0, false]]) for (let k = 0; k < 4; k++) {
      __dw.arena(stage);
      for (const r of W.sections) {
        const n = r.pillars.length;
        if (cave && n < 4) o.shaped = false;
        if (!cave && n > 4) o.plainStays = false;
        if (!reach(r)) { o.connected = false; o['bad_' + stage + '_' + r.j] = false; }
        for (const [d, z] of [[r.doorS, r.southZ], [r.doorN, r.northZ]]) if (d !== null && r.pillars.some(([px, pz, pr]) => Math.hypot(px - d, pz - z) < (pr || 0) + 1.3)) o.doorsClear = false;
      }
    }
    return o;
  });
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out)); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
