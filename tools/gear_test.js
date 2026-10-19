// Headless check of the gear screen: the hero preview, a picture for every slot and bag item, selecting a piece shows
// its details, equipping and taking off by button and by confirming twice, and that each helm covers the head.
// Run: node tools/gear_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 760 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, I = Items, q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
    __dw.arena(0); __dw.World.halt();
    for (const t of ['axe', 'spear', 'daggers']) I.add(I.generate(2, { slot: 'weapon', type: t, rarity: 2 }));
    for (const s of ['armor', 'helm', 'trinket', 'shield']) I.add(I.generate(3, { slot: s, rarity: 1 }));
    __dw.openPanel('bag');
    o.doll = !!q('.gdoll canvas');
    o.slots = qa('.gslot').length === 5;
    o.cells = qa('.pb.icell').length === I.S.inv.length;
    o.pictures = qa('.pb.icell img.ipic').length === I.S.inv.length && qa('.gslot img.ipic').length === 2;     // sword and shield worn
    // Different items get different pictures; the same look reuses one
    const srcs = qa('.pb.icell img.ipic').map(i => i.src); o.distinct = new Set(srcs).size === srcs.length;
    // Select the spear: its details show; equip it
    const spear = I.S.inv.find(x => x.type === 'spear');
    q(`.icell[data-arg="i:${spear.id}"]`).click();
    o.detail = /Spear/.test(q('.gdetail').textContent) && /Worn now/.test(q('.gdetail').textContent);
    q('.gdetail [data-act="equip"]').click();
    o.equipped = I.S.equip.weapon.id === spear.id && !!q('.gslot.sel[data-arg="e:weapon"]');
    return o;
  });
  // Selecting a bag piece (click, or the d-pad) and confirming it again equips it, as A does on a controller
  Object.assign(out, await pg.evaluate(() => {
    const o = {}, I = Items, helm = I.S.inv.find(x => x.slot === 'helm');
    document.querySelector(`.icell[data-arg="i:${helm.id}"]`).click(); UI.confirm();
    o.confirmEquips = !!I.S.equip.helm;
    // Take the helm off again from its slot
    document.querySelector('.gslot[data-arg="e:helm"]').click(); document.querySelector('.gdetail [data-act="unequip"]').click();
    o.tookOff = !I.S.equip.helm && I.S.inv.some(x => x.slot === 'helm');
    // Every helm style encloses the head: a ray from outside toward each top corner of the head box (and the top of
    // the face) hits the helm before it reaches the head
    o.helms = [0, 1, 2].every(st => {
      const r = Rig.build('hero', { look: { helm: st } }); r.root.updateMatrixWorld(true);
      const M = r.j.head.matrixWorld, rc = new THREE.Raycaster();
      const pts = [];
      for (const x of [-0.115, 0.115]) for (const z of [-0.12, 0.12]) pts.push([x, 0.13, z]);
      pts.push([0, 0.13, 0.12], [0.115, 0.1, 0]);
      return pts.every(([x, y, z]) => {
        const c = new THREE.Vector3(x, y, z), d = new THREE.Vector3(x, 0.4, z).normalize();
        const from = c.clone().addScaledVector(d, 0.5).applyMatrix4(M), to = c.clone().applyMatrix4(M);
        rc.set(from, to.clone().sub(from).normalize()); rc.far = 1;
        const hit = rc.intersectObject(r.root, true)[0];
        return hit && hit.distance < from.distanceTo(to) - 0.008;
      });
    });
    o.preview = GearView.ready;
    // A picture made while the hero preview is showing holds only the item (it once caught the hero's legs behind it):
    // equip a never-seen look with the preview up, and its picture must have transparent corners and edges
    __dw.openPanel('bag');
    const fresh = Items.generate(5, { slot: 'armor', rarity: 3 }); Items.add(fresh);
    o.cleanPicture = GearView.icon(fresh);
    return o;
  }));
  Object.assign(out, await pg.evaluate(async url => {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
    // The armour sits in the middle; the bottom and top rows and the outer columns must be empty
    let edge = 0;
    for (let i = 0; i < W; i++) for (const j of [0, 1, H - 2, H - 1]) edge += d[(j * W + i) * 4 + 3] > 0 ? 1 : 0;
    for (let j = 0; j < H; j++) for (const i of [0, 1, W - 2, W - 1]) edge += d[(j * W + i) * 4 + 3] > 0 ? 1 : 0;
    return { cleanPicture: edge === 0 };
  }, out.cleanPicture));
  await b.close();
  const ok = !errs.length && Object.values(out).every(v => v === true);
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out));
  if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
