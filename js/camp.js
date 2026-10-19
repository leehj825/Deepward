// Deepward - the settlement on the rim of the Deep, Deepward Hold: a palisaded camp of quarters around a fire, with the
// stair down into the dungeon to the north and a gate onto the Rim to the south. Built in code like everything else.
// The camp's buildings (forge, apothecary, training yard) grow with their levels. Camp.build returns a room-like object
// that World treats like a dungeon room (rectangle, obstacles, torches, fade).
const Camp = (() => {
  const HW = 24, HD = 18;
  let groundTex = null;

  function ground() {
    if (groundTex) return groundTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
    c.fillStyle = '#3a3226'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { const v = Math.random(); c.fillStyle = v < 0.5 ? 'rgba(80,66,48,0.6)' : v < 0.8 ? 'rgba(40,34,26,0.6)' : 'rgba(70,82,48,0.55)'; c.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 5, 2 + Math.random() * 4); }
    for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(110,110,100,0.5)'; c.beginPath(); c.arc(Math.random() * 256, Math.random() * 256, 1.5 + Math.random() * 3, 0, 7); c.fill(); }
    groundTex = new THREE.CanvasTexture(cv); groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.encoding = THREE.sRGBEncoding;
    return groundTex;
  }

  // Deepward Hold. North: the stair down. Middle: the fire circle (Maren, Wenna the bard, the ledger). West: the smiths'
  // row (Bram's forge, Nell the gem cutter). East: the market (Tilda, Ysolde the herbalist, Odo's curio wagon). South-east:
  // the training yard. South-west: the living quarter, where villagers walk between the tents and the well. South: the
  // gate onto the Rim, kept by Captain Rook and a sentry.
  function build(scene, lv) {
    const group = new THREE.Group(); scene.add(group);
    const room = {
      i: -1, kind: 'camp', hw: HW, hd: HD, cz: 0, southZ: HD, northZ: -HD, group, mats: [], geos: [], texs: [], torches: [], pillars: [],
      fade: 1, fadeDir: 1, occl: 1, occluders: [], state: 'camp', corr: null, rect: { x0: -HW, x1: HW, z0: -HD, z1: HD },
      th: CFG.themes.camp, npcs: [], spots: [], embers: null, keep: [],
    };
    const M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9, flatShading: true }, o)); room.mats.push(m); return m; };
    const add = (geo, m, x, y, z, parent = group, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; parent.add(o); room.geos.push(geo); return o; };
    const block = (x, z, r) => room.pillars.push([x, z, r]);
    const torch = (x, y, z, color, flame = true, size = 1) => {
      let fl = null;
      if (flame) { const fm = new THREE.MeshBasicMaterial({ color }); room.mats.push(fm); fl = add(new THREE.ConeGeometry(0.12 * size, 0.4 * size, 6), fm, x, y, z, group, false); room.keep.push(fm); }
      room.torches.push({ pos: new THREE.Vector3(x, y + 0.4, z), fl: fl || { scale: new THREE.Vector3() }, seed: Math.random() * 10, color });
    };
    const post = (x, z, h = 2.2) => { add(new THREE.CylinderGeometry(0.07, 0.08, h, 6), darkWood, x, h / 2, z); torch(x, h, z, 0xff9a40); block(x, z, 0.25); };
    const wood = M(0x5a3e26), darkWood = M(0x3e2a1a), stone = M(0x5a5652), iron = M(0x3a3a40, { roughness: 0.6, metalness: 0.5 }), steel = M(0x9ca2ad, { metalness: 0.5, roughness: 0.4 });
    const straw = M(0xb89a5a), roofM = M(0x4a3a28), dirt = M(0x1c160f, { roughness: 1 });

    // Ground and the dirt paths that join the quarters
    const gt = ground().clone(); gt.needsUpdate = true; gt.repeat.set(18, 15); room.texs.push(gt);
    add(new THREE.PlaneGeometry(140, 120).rotateX(-Math.PI / 2), M(0xffffff, { map: gt, flatShading: false }), 0, 0, 0, group, false);
    const path = (x0, z0, x1, z1, w = 1.7) => { const l = Math.hypot(x1 - x0, z1 - z0), p = add(new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2), dirt, (x0 + x1) / 2, 0.012, (z0 + z1) / 2, group, false); p.rotation.y = Math.atan2(x1 - x0, z1 - z0); };
    path(0, 1, 0, -HD); path(0, 1, 0, HD + 2, 2.0); path(0, 1, -14, -3); path(0, 1, 15, -2); path(0, 1, 12, 11); path(0, 1, -13, 11);
    // Palisade of sharpened stakes, open to the north (the stair) and the south (the Rim)
    const stakeG = new THREE.CylinderGeometry(0.16, 0.18, 2.6, 6), tipG = new THREE.ConeGeometry(0.16, 0.4, 6); room.geos.push(stakeG, tipG);
    const stake = (x, z) => { const h = 0.9 + Math.random() * 0.25; const s = new THREE.Mesh(stakeG, wood); s.position.set(x, 1.3 * h, z); s.scale.y = h; s.castShadow = true; group.add(s); const t = new THREE.Mesh(tipG, wood); t.position.set(x, 2.6 * h + 0.2, z); group.add(t); };
    for (let x = -HW - 0.5; x <= HW + 0.5; x += 0.4) { if (Math.abs(x) > 3.4) stake(x, HD + 0.6); if (Math.abs(x) > 3.2) stake(x, -HD - 0.6); }
    for (let z = -HD - 0.5; z <= HD + 0.5; z += 0.4) { stake(-HW - 0.6, z); stake(HW + 0.6, z); }
    // Watchtowers at the corners
    for (const [x, z] of [[-HW + 1, -HD + 1], [HW - 1, -HD + 1], [-HW + 1, HD - 1], [HW - 1, HD - 1]]) {
      for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) add(new THREE.CylinderGeometry(0.12, 0.14, 5, 6), darkWood, x + dx, 2.5, z + dz);
      add(new THREE.BoxGeometry(2.2, 0.15, 2.2), wood, x, 4.2, z); add(new THREE.ConeGeometry(1.7, 1.2, 4), roofM, x, 5.6, z).rotation.y = Math.PI / 4;
      torch(x, 4.4, z, 0xff9a40); block(x, z, 1.3);
    }
    // Trees beyond the wall (not across the south gate's road)
    const pine = M(0x1e2a22), trunk = M(0x2a1e14);
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, r = 32 + Math.random() * 16, x = Math.cos(a) * r * 1.15, z = Math.sin(a) * r;
      if ((z < -HD && Math.abs(x) < 7) || z > HD - 2) continue;              // the south side is the Rim's
      const h = 4 + Math.random() * 5;
      add(new THREE.CylinderGeometry(0.2, 0.3, 1.2, 5), trunk, x, 0.6, z);
      add(new THREE.ConeGeometry(1.4 + Math.random(), h, 6), pine, x, 1 + h / 2, z);
    }

    // ---- The fire circle ----
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; add(new THREE.DodecahedronGeometry(0.22, 0), stone, Math.cos(a) * 0.85, 0.12, 1 + Math.sin(a) * 0.85); }
    for (let k = 0; k < 4; k++) { const l = add(new THREE.CylinderGeometry(0.09, 0.1, 1.2, 6), darkWood, 0, 0.2, 1); l.rotation.set(Math.PI / 2 - 0.35, k * Math.PI / 4, 0); }
    torch(0, 0.45, 1, 0xff8a3a, true, 2.2); block(0, 1, 1.05);
    // Logs to sit on, laid around the fire (along the circle, so whoever sits faces the flames)
    const logs = [[-2.4, 1.6], [2.6, 0.2], [0.4, 3.4], [-1.6, -1.4]];
    for (const [x, z] of logs) { const l = add(new THREE.CylinderGeometry(0.22, 0.24, 1.6, 7), wood, x, 0.22, z); l.rotation.set(0, Math.atan2(-x, -(z - 1)), Math.PI / 2); block(x, z, 0.6); }
    const facing = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
    // The camp ledger
    add(new THREE.BoxGeometry(0.15, 1.8, 0.15), darkWood, -3.4, 0.9, 4.6);
    add(new THREE.BoxGeometry(1.2, 0.8, 0.08), wood, -3.4, 1.55, 4.65);
    for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.28, 0.34, 0.01), M(0xe8dcc0), -3.8 + k * 0.4, 1.55, 4.7, group, false).rotation.z = (Math.random() - 0.5) * 0.3;
    block(-3.4, 4.6, 0.4);
    room.spots.push({ id: 'ledger', name: 'Camp ledger', verb: 'Upgrade camp', x: -3.4, z: 5.5, r: 1.8 });
    room.spots.push({ id: 'elder', name: 'Maren', verb: 'Talk', x: 2.4, z: 2.6, r: 2.0 });
    room.spots.push({ id: 'bard', name: 'Wenna the bard', verb: 'Listen', x: -3.2, z: 2.6, r: 1.8 });
    // The notice board: jobs for the warden
    for (const sd of [-1, 1]) add(new THREE.BoxGeometry(0.12, 2.0, 0.12), darkWood, 3.6 + sd * 0.7, 1.0, 5.4);
    add(new THREE.BoxGeometry(1.7, 1.1, 0.08), wood, 3.6, 1.45, 5.45); add(new THREE.BoxGeometry(1.9, 0.12, 0.3), roofM, 3.6, 2.05, 5.45);
    for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.32, 0.38, 0.01), M(0xe8dcc0), 3.0 + k * 0.4, 1.45 + (k % 2) * 0.12, 5.5, group, false).rotation.z = (Math.random() - 0.5) * 0.3;
    block(3.6, 5.4, 0.8);
    room.spots.push({ id: 'board', name: 'Notice board', verb: 'Jobs', x: 3.6, z: 6.4, r: 1.8 });

    // ---- The stair down (north) ----
    const gz = -HD + 0.4;
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.9, 4, 0.9), stone, s * 2.4, 2, gz); block(s * 2.4, gz, 0.7); torch(s * 3.4, 1.2, gz + 0.6, 0x8fd8ff); add(new THREE.CylinderGeometry(0.25, 0.18, 1.0, 7), iron, s * 3.4, 0.5, gz + 0.6); }
    add(new THREE.BoxGeometry(5.8, 0.8, 1.0), stone, 0, 4.2, gz);
    const voidM = new THREE.MeshBasicMaterial({ color: 0x020203 }); room.mats.push(voidM);
    add(new THREE.PlaneGeometry(3.9, 3.8), voidM, 0, 1.9, gz - 0.3, group, false);
    for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(3.8, 0.2, 0.5), stone, 0, 0.1 - k * 0.04, gz + 1.2 - k * 0.45, group, false);
    room.spots.push({ id: 'gate', name: 'The Deep', verb: 'Descend', x: 0, z: gz + 1.8, r: 2.4 });
    post(-3.2, -8); post(3.2, -8);

    // ---- The smiths' row (west) ----
    const fx = -15, fz = -5;
    add(new THREE.BoxGeometry(2, 1.2, 1.5), stone, fx, 0.6, fz); block(fx, fz, 1.2);
    const emberM = new THREE.MeshBasicMaterial({ color: 0xff6a20 }); room.mats.push(emberM);
    add(new THREE.BoxGeometry(1.2, 0.08, 0.9), emberM, fx, 1.22, fz, group, false);
    add(new THREE.CylinderGeometry(0.35, 0.45, 2.6, 7), stone, fx - 0.4, 2.4, fz - 0.3);
    torch(fx, 1.3, fz, 0xff6a20, false);
    const anvil = (x, z) => { add(new THREE.BoxGeometry(0.4, 0.5, 0.3), iron, x, 0.25, z); add(new THREE.BoxGeometry(0.75, 0.18, 0.32), iron, x, 0.58, z); block(x, z, 0.5); };
    anvil(fx + 2.4, fz + 1.4);
    add(new THREE.BoxGeometry(0.1, 1.4, 1.6), darkWood, fx - 2.8, 0.7, fz + 2.5);
    for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.03, 1.1, 0.06), steel, fx - 2.65, 0.8, fz + 2 + k * 0.5);
    block(fx - 2.7, fz + 2.5, 0.6);
    if (lv.forge >= 1) { anvil(fx + 1.0, fz + 3.2); add(new THREE.BoxGeometry(0.6, 0.35, 0.9), M(0x6a4a2c), fx + 1.3, 0.45, fz - 0.6); }
    if (lv.forge >= 2) { for (const [x, z] of [[fx - 2, fz - 2], [fx + 2, fz - 2], [fx - 2, fz + 2], [fx + 2, fz + 2]]) add(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6), darkWood, x, 1.4, z); const roof = add(new THREE.BoxGeometry(4.6, 0.12, 4.6), roofM, fx, 2.85, fz); roof.rotation.z = 0.12; }
    if (lv.forge >= 3) { const rune = new THREE.MeshBasicMaterial({ color: 0x7fe8ff }); room.mats.push(rune); for (let k = -1; k <= 1; k++) add(new THREE.BoxGeometry(0.06, 0.3, 0.02), rune, fx + k * 0.5, 0.6, fz + 0.76, group, false); torch(fx, 0.8, fz + 0.9, 0x7fe8ff, false); }
    room.spots.push({ id: 'smith', name: 'Bram the smith', verb: 'Smithy', x: fx + 2.4, z: fz + 3.0, r: 2.2 });
    // Nell's bench: a grinding wheel and trays of stones
    const nx = -16, nz = 3;
    add(new THREE.BoxGeometry(2.2, 0.85, 0.9), wood, nx, 0.42, nz); block(nx, nz, 1.2);
    const wheel = add(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 12), stone, nx - 0.6, 1.25, nz); wheel.rotation.x = Math.PI / 2;
    const gemCols = [0xe03a4a, 0x3a7ae8, 0x3ac86a, 0xf0c030, 0x2a2a2a];
    for (let k = 0; k < 5; k++) { const gm = new THREE.MeshBasicMaterial({ color: gemCols[k] }); room.mats.push(gm); add(new THREE.OctahedronGeometry(0.07, 0), gm, nx + 0.1 + k * 0.2, 0.92, nz + 0.1, group, false); }
    torch(nx + 1.2, 1.2, nz - 0.3, 0x9ad8ff, false);
    room.spots.push({ id: 'gemcutter', name: 'Nell the gem cutter', verb: 'Gems', x: nx + 1.2, z: nz + 1.8, r: 2.0 });
    post(-9, -1); post(-9, 6);

    // ---- The market (east) ----
    const sx = 14, sz = -5;
    add(new THREE.BoxGeometry(2.6, 0.9, 1.0), wood, sx, 0.45, sz); block(sx, sz, 1.4);
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), darkWood, sx + s * 1.3, 1.3, sz - 0.6);
    const stripes = (a, b) => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const c = cv.getContext('2d'); for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? a : b; c.fillRect(k * 8, 0, 8, 8); } const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; room.texs.push(t); return t; };
    const awn = add(new THREE.BoxGeometry(3.0, 0.05, 1.6), M(0xffffff, { map: stripes('#c8b890', '#8a2a22') }), sx, 2.55, sz + 0.1); awn.rotation.x = 0.3;
    for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(0.2, 0.25 + Math.random() * 0.2, 0.2), M([0x6a8a4a, 0xa05a3a, 0x5a6a9a, 0xc9a23a, 0x7a5a8a][k]), sx - 1 + k * 0.5, 1.0, sz);
    for (const [x, z] of [[sx + 2.4, sz - 1.6], [sx + 2.6, sz + 1.2], [sx - 2.2, sz - 1.8]]) { add(new THREE.BoxGeometry(0.7, 0.7, 0.7), wood, x, 0.35, z).rotation.y = Math.random(); block(x, z, 0.55); }
    torch(sx + 1.5, 2.0, sz + 0.6, 0xffb060);
    room.spots.push({ id: 'trader', name: 'Tilda the quartermaster', verb: 'Trade', x: sx - 1.6, z: sz + 2.0, r: 2.2 });
    // Ysolde's herb stall: a green awning, drying racks, jars
    const hx = 19, hz = 1;
    add(new THREE.BoxGeometry(2.2, 0.85, 0.9), wood, hx, 0.42, hz); block(hx, hz, 1.2);
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6), darkWood, hx + s * 1.1, 1.2, hz - 0.5);
    const awn2 = add(new THREE.BoxGeometry(2.6, 0.05, 1.4), M(0xffffff, { map: stripes('#a8c890', '#3a6a3a') }), hx, 2.35, hz + 0.1); awn2.rotation.x = 0.3;
    for (let k = 0; k < 6; k++) add(new THREE.ConeGeometry(0.08, 0.35, 5), M([0x6a9a3a, 0x9aa04a, 0x5a7a3a][k % 3]), hx - 0.9 + k * 0.36, 1.95, hz - 0.45).rotation.x = Math.PI;
    const jarM = new THREE.MeshBasicMaterial({ color: 0x9aff8a }); room.mats.push(jarM);
    for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 7), jarM, hx - 0.6 + k * 0.4, 0.95, hz, group, false);
    room.spots.push({ id: 'herbalist', name: 'Ysolde the herbalist', verb: 'Tonics', x: hx - 1.6, z: hz + 1.8, r: 2.0 });
    // Odo's curio wagon: a covered cart with lanterns
    const wx = 14, wz = 6;
    add(new THREE.BoxGeometry(2.6, 0.7, 1.4), wood, wx, 0.85, wz); block(wx, wz, 1.6);
    const cover = add(new THREE.CylinderGeometry(0.75, 0.75, 2.6, 10, 1, true, 0, Math.PI), M(0xd8c8a0), wx, 1.2, wz); cover.rotation.z = Math.PI / 2; cover.material.side = THREE.DoubleSide;
    for (const [dx, dz] of [[-0.9, -0.75], [0.9, -0.75], [-0.9, 0.75], [0.9, 0.75]]) { const w = add(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 10), darkWood, wx + dx, 0.42, wz + dz); w.rotation.x = Math.PI / 2; }
    torch(wx - 1.4, 1.6, wz + 0.8, 0xc06aff, false);
    room.spots.push({ id: 'curio', name: 'Odo the curio dealer', verb: 'Browse', x: wx - 1.6, z: wz + 1.6, r: 2.0 });
    // The apothecary (a building from the ledger): shelves of glowing flasks by Ysolde's stall
    if (lv.apothecary >= 1) {
      add(new THREE.BoxGeometry(1.6, 0.8, 0.8), wood, 19, 0.4, -3); block(19, -3, 1.0);
      const potM = new THREE.MeshBasicMaterial({ color: 0xff5a6a }); room.mats.push(potM);
      for (let k = 0; k < 2 + lv.apothecary * 2; k++) add(new THREE.SphereGeometry(0.08, 6, 5), potM, 18.4 + (k % 4) * 0.4, 0.9 + Math.floor(k / 4) * 0.2, -3.1, group, false);
      torch(19, 1.0, -3.4, 0xff5a6a, false);
    }
    post(9, -1); post(9, 6);

    // ---- The training yard (south-east) ----
    add(new THREE.BoxGeometry(0.12, 1.6, 0.12), darkWood, 18, 0.8, 10);
    add(new THREE.BoxGeometry(0.9, 0.5, 0.06), wood, 18, 1.45, 10).rotation.y = -0.6;
    for (let k = 0; k < 2; k++) add(new THREE.BoxGeometry(0.05, 1.1, 0.05), steel, 17.5 + k * 0.25, 0.55, 10.5).rotation.z = 0.25;
    block(18, 10, 0.4);
    room.spots.push({ id: 'trainer', name: 'Training yard', verb: 'Expertise', x: 17, z: 11.2, r: 1.9 });
    // The Ring, Varga's arena: a ring of stakes on the open ground north-east of the fire, where old foes are fought again
    const rx = 13, rz = -12;
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; if (k === 12) continue; add(new THREE.CylinderGeometry(0.1, 0.12, 1.4, 5), darkWood, rx + Math.sin(a) * 3.4, 0.7, rz + Math.cos(a) * 3.4); block(rx + Math.sin(a) * 3.4, rz + Math.cos(a) * 3.4, 0.2); }
    const sand = add(new THREE.CircleGeometry(3.3, 20), M(0x8a7a5a), rx, 0.02, rz); sand.rotation.x = -Math.PI / 2; sand.castShadow = false;
    torch(rx - 3.9, 1.8, rz + 1.6, 0xff9a40); torch(rx + 3.9, 1.8, rz - 1.6, 0xff9a40);
    room.spots.push({ id: 'arena', name: 'The Ring', verb: 'Fight', x: rx - 4.6, z: rz + 1.2, r: 1.9 });
    // Sefa's caravan (some homecomings): a painted wagon on the open ground north-west, crates and a rug
    if (lv.wanderer) {
      const cx = -11, cz = -12;
      add(new THREE.BoxGeometry(2.8, 0.8, 1.5), M(0x6a3a2a), cx, 0.9, cz); block(cx, cz, 1.7);
      const roof = add(new THREE.CylinderGeometry(0.8, 0.8, 2.8, 10, 1, true, 0, Math.PI), M(0xffffff, { map: stripes('#2a8a8a', '#d8a040') }), cx, 1.3, cz); roof.rotation.z = Math.PI / 2; roof.material.side = THREE.DoubleSide;
      for (const [dx, dz] of [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]]) { const w = add(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 10), darkWood, cx + dx, 0.45, cz + dz); w.rotation.x = Math.PI / 2; }
      add(new THREE.BoxGeometry(2.4, 0.02, 1.6), M(0x8a2a3a), cx + 0.4, 0.02, cz + 2.4, group, false);
      for (const [dx, dz, sz] of [[1.9, 1.4, 0.6], [2.4, 2.2, 0.5], [-1.6, 1.6, 0.55]]) { add(new THREE.BoxGeometry(sz, sz, sz), wood, cx + dx, sz / 2, cz + dz).rotation.y = dx; block(cx + dx, cz + dz, sz * 0.7); }
      torch(cx - 1.5, 1.7, cz + 0.9, 0x5ad8c8, false);
      room.spots.push({ id: 'wanderer', name: 'Sefa the wanderer', verb: 'Trade', x: cx + 0.4, z: cz + 3.2, r: 2.0 });
    }
    // A rail fence around the yard and a straw dummy per level (one always stands)
    for (let x = 8; x <= 21; x += 1.6) { add(new THREE.BoxGeometry(0.1, 0.9, 0.1), darkWood, x, 0.45, 15.5); }
    add(new THREE.BoxGeometry(13, 0.08, 0.08), wood, 14.5, 0.75, 15.5);
    for (let k = 0; k < 1 + lv.yard; k++) {
      const x = 15 - k * 1.8, z = 13;
      add(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), darkWood, x, 0.9, z);
      add(new THREE.BoxGeometry(0.9, 0.08, 0.08), darkWood, x, 1.4, z);
      add(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 7), straw, x, 1.25, z);
      add(new THREE.SphereGeometry(0.16, 7, 6), straw, x, 1.75, z);
      block(x, z, 0.4);
    }
    // Archery butts
    for (const x of [20, 22]) { const t = add(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 12), straw, x, 1.0, 7.5); t.rotation.x = Math.PI / 2 - 0.2; add(new THREE.CylinderGeometry(0.25, 0.25, 0.21, 12), M(0xa03a2a), x, 1.0, 7.52).rotation.x = Math.PI / 2 - 0.2; block(x, 7.5, 0.6); }

    // ---- The living quarter (south-west) ----
    const tentG = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-1.4, 0), new THREE.Vector2(1.4, 0), new THREE.Vector2(0, 1.8)]), { depth: 3, bevelEnabled: false });
    tentG.translate(0, 0, -1.5); room.geos.push(tentG);
    for (const [x, z, c, ry] of [[-20, 9, 0x8a7a5a, 0.2], [-15, 14.5, 0x6a5a48, -0.2], [-9.5, 15, 0x7a6a4a, 1.4], [-20.5, 15, 0x6a6a5a, 0.9]]) {
      const t = new THREE.Mesh(tentG, M(c)); t.position.set(x, 0, z); t.rotation.y = ry; t.castShadow = true; t.receiveShadow = true; group.add(t);
      block(x, z, 1.6);
    }
    // Log cabins (two, with chimneys)
    for (const [x, z] of [[-14, 8.5], [-6.5, 11]]) {
      add(new THREE.BoxGeometry(3.4, 2.0, 2.6), wood, x, 1.0, z);
      const r = add(new THREE.ConeGeometry(2.6, 1.3, 4), roofM, x, 2.65, z); r.rotation.y = Math.PI / 4; r.scale.z = 0.8;
      add(new THREE.BoxGeometry(0.4, 1.4, 0.4), stone, x + 1.1, 2.9, z - 0.6);
      add(new THREE.BoxGeometry(0.7, 1.3, 0.05), darkWood, x, 0.65, z + 1.32);
      const win = new THREE.MeshBasicMaterial({ color: 0xffc070 }); room.mats.push(win);
      add(new THREE.BoxGeometry(0.5, 0.4, 0.05), win, x - 1.0, 1.2, z + 1.32, group, false);
      block(x - 0.9, z, 1.4); block(x + 0.9, z, 1.4);
    }
    // The well
    add(new THREE.CylinderGeometry(0.8, 0.85, 0.8, 10, 1, true), stone, -10, 0.4, 4).material.side = THREE.DoubleSide;
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.12, 1.8, 0.12), darkWood, -10 + s * 0.7, 0.9, 4);
    add(new THREE.BoxGeometry(1.7, 0.1, 0.1), darkWood, -10, 1.8, 4); add(new THREE.ConeGeometry(1.1, 0.6, 4), roofM, -10, 2.15, 4).rotation.y = Math.PI / 4;
    block(-10, 4, 1.0);
    post(-4, 12); post(-17, 4);

    // ---- The south gate onto the Rim ----
    const sgz = HD + 0.6;
    for (const s of [-1, 1]) {
      for (const [dx, dz] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]]) add(new THREE.CylinderGeometry(0.13, 0.15, 4.4, 6), darkWood, s * 4.4 + dx, 2.2, sgz + dz);
      add(new THREE.BoxGeometry(1.7, 0.15, 1.6), wood, s * 4.4, 3.4, sgz); torch(s * 4.4, 3.6, sgz, 0xff9a40); block(s * 4.4, sgz, 1.1);
    }
    // The gate doors stand open once the Rim is opened (World adds the road beyond); until then they are shut
    room.southGate = { z: sgz };
    room.spots.push({ id: 'guard', name: 'Captain Rook', verb: 'Talk', x: -3.2, z: HD - 2.2, r: 1.8 });

    // ---- The people of the Hold ----
    // Sitting: the legs bent over a seat and the pelvis lowered onto it, hands on the knees; the clip under it keeps the
    // body breathing. A worker at a bench keeps the clip's busy hands and leans in.
    const LEGS = { hips: [0, 0, 0], hipL: [-1.5, 0, 0.1], knL: [1.45, 0, 0], hipR: [-1.5, 0, -0.1], knR: [1.45, 0, 0] };
    const SEAT = { clip: 'idleEase', rate: 0.5, hipsY: 0.48, still: true, set: Object.assign({ shL: [-0.55, 0, 0.12], elL: [-0.9, 0, 0], shR: [-0.55, 0, -0.12], elR: [-0.9, 0, 0] }, LEGS) };
    const BENCH = { clip: 'seatWork', rate: 0.8, hipsY: 0.48, still: true, set: Object.assign({ spine: [0.25, 0, 0] }, LEGS) };
    const npc = (id, x, z, ry, opt, extra = {}) => {
      const r = Rig.build('npc', { npc: opt }); r.root.position.set(x, 0, z); r.root.rotation.y = ry; group.add(r.root);
      if (opt.seat) add(new THREE.CylinderGeometry(0.2, 0.24, opt.seat, 7), darkWood, x - Math.sin(ry) * 0.1, opt.seat / 2, z - Math.cos(ry) * 0.1);   // a stool
      const n = Object.assign({ id, rig: r, x, z, ry, face: ry, still: !!(opt.pose && opt.pose.still) }, extra); room.npcs.push(n); return n;
    };
    npc('smith', fx + 2.4, fz + 2.2, 0.9, { pose: { clip: 'idleExamine' }, cloth: 0x5a4632, hair: 0x2a1a10, beard: true, apron: true, tool: 'hammer', skin: 0xc88b63 });
    npc('trader', sx - 1.0, sz + 1.0, -2.4, { pose: { clip: 'idleLook', rate: 0.8 }, cloth: 0x6a2a2a, hair: 0x8a5a2b, scarf: 0xc9a23a, skin: 0xf1c9a0 });
    npc('elder', 2.4, 1.7, -0.6, { pose: { clip: 'idleEase', rate: 0.7, add: { spine: [0.22, 0, 0], neck: [0.12, 0, 0] } }, cloth: 0x3a4a5a, hair: 0xb0b0b0, elder: true, scarf: 0x6a5a48, skin: 0xe3b48a });
    npc('bard', -2.4, 1.6, facing(-2.4, 1.6, 0, 1), { pose: SEAT, cloth: 0x6a3a6a, hair: 0xc88a3a, scarf: 0xd8b04a, skin: 0xf0c8a8, tool: 'lute' });
    npc('gemcutter', nx + 0.2, nz + 0.95, Math.PI, { pose: BENCH, seat: 0.42, cloth: 0x3a5a6a, hair: 0x1a1a1a, apron: true, skin: 0xa8784a });
    npc('herbalist', hx - 1.2, hz + 1.0, -2.2, { pose: { clip: 'idleHold', rate: 0.8 }, cloth: 0x3a5a3a, hair: 0x6a4a2a, elder: true, scarf: 0x9aa04a, skin: 0xe8b890, tool: 'basket' });
    npc('curio', wx - 1.4, wz + 0.9, -2.0, { pose: { clip: 'idleExamine', phase: 2.5 }, cloth: 0x4a2a5a, hair: 0x3a2a1a, beard: true, scarf: 0xc06aff, skin: 0xd09a6a });
    npc('guard', -3.2, HD - 1.4, Math.PI, { pose: { clip: 'idleAlert' }, cloth: 0x4a4a5a, hair: 0x3a2a1a, beard: true, scarf: 0x7a2a22, skin: 0xd8a07a, tool: 'spear' });
    npc('arenamaster', 13 - 4.4, -12 - 0.2, -1.2, { pose: { clip: 'idleEase', rate: 0.9, phase: 3 }, cloth: 0x5a3a2a, hair: 0x6a6a6a, beard: true, scarf: 0xa03a2a, skin: 0xc89060, tool: 'spear' });
    if (lv.wanderer) npc('wanderer', -11 + 1.2, -12 + 2.1, 0.4, { pose: { clip: 'idleLook', phase: 1 }, cloth: 0x2a6a6a, hair: 0x1a1a1a, scarf: 0xd8a040, skin: 0xa86a40 });
    npc('sentry', 3.2, HD - 1.4, Math.PI, { pose: { clip: 'idleShift' }, cloth: 0x4a4a5a, hair: 0x6a4a2a, scarf: 0x7a2a22, skin: 0xe2b088, tool: 'spear' });
    for (const n of room.npcs) block(n.x, n.z, 0.45);
    // Villagers on their rounds: walk a loop of points, pause at each, greet the warden when close
    // By the fire: two villagers sit on the logs; in the living quarter one kneels at the vegetable patch
    npc('sitter', 2.6, 0.2, facing(2.6, 0.2, 0, 1), { pose: Object.assign({}, SEAT, { phase: 1.3 }), cloth: 0x6a4a3a, hair: 0x2a1a10, skin: 0xd8a07a, beard: true });
    npc('sitter', 0.4, 3.4, facing(0.4, 3.4, 0, 1), { pose: Object.assign({}, SEAT, { phase: 2.1 }), cloth: 0x4a5a6a, hair: 0xa07a3a, skin: 0xf0c8a0 });
    for (let k = 0; k < 6; k++) add(new THREE.ConeGeometry(0.12, 0.3, 4), M(0x5a8a3a), -18 + (k % 3) * 0.7, 0.15, -1.2 + Math.floor(k / 3) * 0.7);
    npc('gardener', -16.6, -0.8, -Math.PI / 2, { pose: { clip: 'pullPlant', from: 0.1, to: 0.6, rate: 0.6, still: true }, cloth: 0x7a6a3a, hair: 0x5a3a1a, skin: 0xc89060 });
    const EVERYDAY = ['idleEase', 'idleLook', 'idleUnarmed', 'idleHold', 'idleExamine'];
    const walker = (opt, pts) => {
      opt.pose = opt.pose || { clip: EVERYDAY[room.npcs.length % EVERYDAY.length], phase: Math.random() * 5 }; const n = npc('villager', pts[0][0], pts[0][1], 0, opt, { path: pts, pi: 1, wait: Math.random() * 3, greeted: false }); return n; };
    walker({ cloth: 0x7a5a3a, hair: 0x4a2a1a, skin: 0xe8b890, tool: 'basket' }, [[-10, 6], [-3, 7], [6, 7], [12, 3], [6, 7], [-3, 7]]);
    walker({ cloth: 0x5a6a7a, hair: 0x8a8a8a, elder: true, skin: 0xd8a07a }, [[-12, 12], [-10, 6.2], [-5, 9], [-8, 14]]);
    walker({ cloth: 0x8a3a2a, hair: 0x2a1a10, beard: true, skin: 0xb88050 }, [[-12, -2], [-6, -1], [-6, 4], [-12, 6]]);
    walker({ cloth: 0x3a6a5a, hair: 0xc8a050, skin: 0xf0d0b0 }, [[8, 2], [11, -1], [16, 3.5], [11, 8], [6, 9]]);
    walker({ cloth: 0x6a5a3a, hair: 0x5a3a1a, skin: 0xc89060 }, [[-2, 10], [4, 12], [2, 15], [-4, 14]]);
    // The people the warden freed from the Deep live here now
    const R = (lv.rescued || []).slice(0, 8);
    R.forEach((r, k) => { const a = k / Math.max(1, R.length) * Math.PI * 2, cx = -12 + Math.cos(a) * 2, cz = 10 + Math.sin(a) * 2; walker(Object.assign({ skin: 0xe0b088 }, r.look || {}), [[cx, cz], [-6 + (k % 3) * 2, 6 + (k % 2)], [-14 + k, 13], [cx + 1, cz - 3]]); });

    // Embers rising from the fire
    const N = 40, pos = new Float32Array(N * 3), eg = new THREE.BufferGeometry();
    for (let k = 0; k < N; k++) { pos[k * 3] = (Math.random() - 0.5) * 0.8; pos[k * 3 + 1] = Math.random() * 3; pos[k * 3 + 2] = 1 + (Math.random() - 0.5) * 0.8; }
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); room.geos.push(eg);
    const em = new THREE.PointsMaterial({ color: 0xffa040, size: 0.07, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }); room.mats.push(em);
    room.embers = new THREE.Points(eg, em); group.add(room.embers);
    // Static meshes baked together per material (flames stay apart: they flicker)
    Rig.bake(group, false, room.keep);
    return room;
  }

  // NPCs breathe, and turn to watch the hero when he comes near; embers drift up
  function update(room, dt, heroPos) {
    for (const n of room.npcs) {
      if (n.path) { walk(n, dt, heroPos); continue; }
      const d = heroPos ? Math.hypot(heroPos.x - n.x, heroPos.z - n.z) : 99;
      const want = d < 4.5 && !n.still ? Math.atan2(heroPos.x - n.x, heroPos.z - n.z) : n.ry;   // the seated and kneeling keep at what they do
      let df = want - n.face; df = Math.atan2(Math.sin(df), Math.cos(df)); n.face += df * Math.min(1, dt * 4);
      n.rig.root.rotation.y = n.face;
      Rig.animate(n.rig, { mode: 'idle', t: 0, speed: 0, calm: true }, dt);
    }
    if (room.embers) {
      const p = room.embers.geometry.attributes.position;
      for (let k = 0; k < p.count; k++) { let y = p.getY(k) + dt * (0.6 + (k % 5) * 0.15); if (y > 3.2) { y = 0.3; p.setX(k, (Math.random() - 0.5) * 0.8); p.setZ(k, 1 + (Math.random() - 0.5) * 0.8); } p.setY(k, y); p.setX(k, p.getX(k) + Math.sin(y * 3 + k) * dt * 0.1); }
      p.needsUpdate = true;
    }
  }
  // A villager on its round: walk to the next point, pause, go on; say hello once per visit when the warden comes close
  function walk(n, dt, heroPos) {
    const [tx, tz] = n.path[n.pi], dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz);
    const near = heroPos ? Math.hypot(heroPos.x - n.x, heroPos.z - n.z) : 99;
    let moving = false;
    if (n.wait > 0) n.wait -= dt;
    else if (d < 0.15) { n.pi = (n.pi + 1) % n.path.length; n.wait = 1.5 + Math.random() * 3; }
    else if (!(near < 1.2)) {                                               // step aside for nobody, but wait if the warden is in the way
      const sp = 1.15 * dt; n.x += dx / d * Math.min(sp, d); n.z += dz / d * Math.min(sp, d); moving = true;
      const want = Math.atan2(dx, dz); let df = want - n.face; df = Math.atan2(Math.sin(df), Math.cos(df)); n.face += df * Math.min(1, dt * 6);
    }
    if (!moving && near < 4) { const want = Math.atan2(heroPos.x - n.x, heroPos.z - n.z); let df = want - n.face; df = Math.atan2(Math.sin(df), Math.cos(df)); n.face += df * Math.min(1, dt * 4); }
    if (near < 3 && !n.greeted && typeof FX !== 'undefined') {
      n.greeted = true; const L = CFG.townsfolk.villager[1];
      FX.text(new THREE.Vector3(n.x, 2.2, n.z), L[Math.floor(Math.random() * L.length)], 'xp');
    }
    n.rig.root.position.set(n.x, 0, n.z); n.rig.root.rotation.y = n.face;
    Rig.animate(n.rig, { mode: moving ? 'move' : 'idle', t: 0, speed: moving ? 0.35 : 0, mps: moving ? 1.15 : 0, dirF: 1, dirS: 0, calm: true }, dt);
  }
  // The interactable spot nearest the hero, within reach
  function nearest(room, pos) {
    let best = null, bd = Infinity;
    for (const s of room.spots) { const d = Math.hypot(pos.x - s.x, pos.z - s.z); if (d < s.r && d < bd) { bd = d; best = s; } }
    return best;
  }
  return { build, update, nearest, spawn: { x: 0, z: 6.2, facing: Math.PI }, HW, HD };
})();
