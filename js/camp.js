// Deepward - the settlement camp on the rim of the Deep: a palisaded clearing with a campfire, Bram's forge, Tilda's stall,
// Maren by the fire, the camp ledger and the stairway gate down into the dungeon. Built in code like everything else.
// The camp's buildings (forge, apothecary, training yard) grow with their levels. Camp.build returns a room-like object
// that World treats like a dungeon room (rectangle, obstacles, torches, fade).
const Camp = (() => {
  const HW = 12, HD = 10;
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

  function build(scene, lv) {
    const group = new THREE.Group(); scene.add(group);
    const room = {
      i: -1, kind: 'camp', hw: HW, hd: HD, cz: 0, southZ: HD, northZ: -HD, group, mats: [], geos: [], texs: [], torches: [], pillars: [],
      fade: 1, fadeDir: 1, occl: 1, occluders: [], state: 'camp', corr: null, rect: { x0: -HW, x1: HW, z0: -HD, z1: HD },
      th: CFG.themes.camp, npcs: [], spots: [], embers: null,
    };
    const M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9, flatShading: true }, o)); room.mats.push(m); return m; };
    const add = (geo, m, x, y, z, parent = group, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; parent.add(o); room.geos.push(geo); return o; };
    const block = (x, z, r) => room.pillars.push([x, z, r]);
    const torch = (x, y, z, color, flame = true, size = 1) => {
      let fl = null;
      if (flame) { const fm = new THREE.MeshBasicMaterial({ color }); room.mats.push(fm); fl = add(new THREE.ConeGeometry(0.12 * size, 0.4 * size, 6), fm, x, y, z, group, false); }
      room.torches.push({ pos: new THREE.Vector3(x, y + 0.4, z), fl: fl || { scale: new THREE.Vector3() }, seed: Math.random() * 10, color });
    };
    const wood = M(0x5a3e26), darkWood = M(0x3e2a1a), stone = M(0x5a5652), cloth = M(0x8a7a5a), iron = M(0x3a3a40, { roughness: 0.6, metalness: 0.5 });

    // Ground, with the dark wood beyond the palisade
    const gt = ground().clone(); gt.needsUpdate = true; gt.repeat.set(9, 8); room.texs.push(gt);
    add(new THREE.PlaneGeometry(70, 60).rotateX(-Math.PI / 2), M(0xffffff, { map: gt, flatShading: false }), 0, 0, 0, group, false);
    // Palisade of sharpened stakes, with the north side open onto the gate
    const stakeG = new THREE.CylinderGeometry(0.16, 0.18, 2.6, 6), tipG = new THREE.ConeGeometry(0.16, 0.4, 6); room.geos.push(stakeG, tipG);
    const stake = (x, z) => { const h = 0.9 + Math.random() * 0.25; const s = new THREE.Mesh(stakeG, wood); s.position.set(x, 1.3 * h, z); s.scale.y = h; s.castShadow = true; group.add(s); const t = new THREE.Mesh(tipG, wood); t.position.set(x, 2.6 * h + 0.2, z); group.add(t); };
    for (let x = -HW - 0.5; x <= HW + 0.5; x += 0.38) { stake(x, HD + 0.6); if (Math.abs(x) > 3.2) stake(x, -HD - 0.6); }
    for (let z = -HD - 0.5; z <= HD + 0.5; z += 0.38) { stake(-HW - 0.6, z); stake(HW + 0.6, z); }
    // Trees beyond the wall
    const pine = M(0x1e2a22), trunk = M(0x2a1e14);
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, r = 17 + Math.random() * 12, x = Math.cos(a) * r * 1.1, z = Math.sin(a) * r;
      if (z < -12 && Math.abs(x) < 6) continue;
      const h = 4 + Math.random() * 4;
      add(new THREE.CylinderGeometry(0.2, 0.3, 1.2, 5), trunk, x, 0.6, z);
      add(new THREE.ConeGeometry(1.4 + Math.random(), h, 6), pine, x, 1 + h / 2, z);
    }

    // The campfire
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; add(new THREE.DodecahedronGeometry(0.22, 0), stone, Math.cos(a) * 0.85, 0.12, 1 + Math.sin(a) * 0.85); }
    for (let k = 0; k < 4; k++) { const l = add(new THREE.CylinderGeometry(0.09, 0.1, 1.2, 6), darkWood, 0, 0.2, 1); l.rotation.set(Math.PI / 2 - 0.35, k * Math.PI / 4, 0); }
    torch(0, 0.45, 1, 0xff8a3a, true, 2.2); block(0, 1, 1.05);
    // Benches (logs) around the fire
    for (const [x, z, ry] of [[-2.4, 1.6, 0.3], [2.6, 0.2, -0.4], [0.4, 3.4, 1.4]]) { const l = add(new THREE.CylinderGeometry(0.22, 0.24, 1.6, 7), wood, x, 0.22, z); l.rotation.set(0, ry, Math.PI / 2); block(x, z, 0.6); }

    // The gate down: a stone arch over a stair into the dark, with blue-lit braziers
    const gz = -HD + 0.4;
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.9, 4, 0.9), stone, s * 2.4, 2, gz); block(s * 2.4, gz, 0.7); torch(s * 3.4, 1.2, gz + 0.6, 0x8fd8ff); add(new THREE.CylinderGeometry(0.25, 0.18, 1.0, 7), iron, s * 3.4, 0.5, gz + 0.6); }
    add(new THREE.BoxGeometry(5.8, 0.8, 1.0), stone, 0, 4.2, gz);
    const voidM = new THREE.MeshBasicMaterial({ color: 0x020203 }); room.mats.push(voidM);
    add(new THREE.PlaneGeometry(3.9, 3.8), voidM, 0, 1.9, gz - 0.3, group, false);
    for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(3.8, 0.2, 0.5), stone, 0, 0.1 - k * 0.04, gz + 1.2 - k * 0.45, group, false);
    room.spots.push({ id: 'gate', name: 'The Deep', verb: 'Descend', x: 0, z: gz + 1.8, r: 2.4 });

    // Bram's forge (west). Its level adds a second anvil and bellows, then a roof, then a rune-lit hearth.
    const fx = -8.5, fz = -3;
    add(new THREE.BoxGeometry(2, 1.2, 1.5), stone, fx, 0.6, fz); block(fx, fz, 1.2);
    const emberM = new THREE.MeshBasicMaterial({ color: 0xff6a20 }); room.mats.push(emberM);
    add(new THREE.BoxGeometry(1.2, 0.08, 0.9), emberM, fx, 1.22, fz, group, false);
    add(new THREE.CylinderGeometry(0.35, 0.45, 2.6, 7), stone, fx - 0.4, 2.4, fz - 0.3);
    torch(fx, 1.3, fz, 0xff6a20, false);
    const anvil = (x, z) => { add(new THREE.BoxGeometry(0.4, 0.5, 0.3), iron, x, 0.25, z); add(new THREE.BoxGeometry(0.75, 0.18, 0.32), iron, x, 0.58, z); block(x, z, 0.5); };
    anvil(-6.2, -1.6);
    add(new THREE.BoxGeometry(0.1, 1.4, 1.6), darkWood, -11.3, 0.7, -0.5);
    for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.03, 1.1, 0.06), M(0x9ca2ad, { metalness: 0.5, roughness: 0.4 }), -11.15, 0.8, -1 + k * 0.5);
    block(-11.2, -0.5, 0.6);
    if (lv.forge >= 1) { anvil(-7.6, 0.2); add(new THREE.BoxGeometry(0.6, 0.35, 0.9), M(0x6a4a2c), fx + 1.3, 0.45, fz - 0.6); }
    if (lv.forge >= 2) { for (const [x, z] of [[-10.5, -5], [-6.5, -5], [-10.5, -1], [-6.5, -1]]) add(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6), darkWood, x, 1.4, z); const roof = add(new THREE.BoxGeometry(4.6, 0.12, 4.6), M(0x4a3a28), -8.5, 2.85, -3); roof.rotation.z = 0.12; }
    if (lv.forge >= 3) { const rune = new THREE.MeshBasicMaterial({ color: 0x7fe8ff }); room.mats.push(rune); for (let k = -1; k <= 1; k++) add(new THREE.BoxGeometry(0.06, 0.3, 0.02), rune, fx + k * 0.5, 0.6, fz + 0.76, group, false); torch(fx, 0.8, fz + 0.9, 0x7fe8ff, false); }
    room.spots.push({ id: 'smith', name: 'Bram the smith', verb: 'Smithy', x: -6.6, z: 0.2, r: 2.2 });

    // Tilda's stall (east): a table under a striped awning, crates and barrels
    const sx = 8.5, sz = -2.5;
    add(new THREE.BoxGeometry(2.6, 0.9, 1.0), wood, sx, 0.45, sz); block(sx, sz, 1.4);
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), darkWood, sx + s * 1.3, 1.3, sz - 0.6);
    const awnTex = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const c = cv.getContext('2d'); for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#c8b890' : '#8a2a22'; c.fillRect(k * 8, 0, 8, 8); } const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; room.texs.push(t); return t; })();
    const awn = add(new THREE.BoxGeometry(3.0, 0.05, 1.6), M(0xffffff, { map: awnTex }), sx, 2.55, sz + 0.1); awn.rotation.x = 0.3;
    for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(0.2, 0.25 + Math.random() * 0.2, 0.2), M([0x6a8a4a, 0xa05a3a, 0x5a6a9a, 0xc9a23a, 0x7a5a8a][k]), sx - 1 + k * 0.5, 1.0, sz);
    for (const [x, z] of [[10.8, -4.2], [11, -1.2], [6.6, -4.4]]) { add(new THREE.BoxGeometry(0.7, 0.7, 0.7), wood, x, 0.35, z).rotation.y = Math.random(); block(x, z, 0.55); }
    add(new THREE.CylinderGeometry(0.32, 0.32, 0.8, 9), darkWood, 10.6, 0.4, 0.2); block(10.6, 0.2, 0.45);
    torch(sx + 1.5, 2.0, sz + 0.6, 0xffb060);
    room.spots.push({ id: 'trader', name: 'Tilda the quartermaster', verb: 'Trade', x: 6.9, z: -0.6, r: 2.2 });

    // The camp ledger: a post with a board of notices
    add(new THREE.BoxGeometry(0.15, 1.8, 0.15), darkWood, -3.4, 0.9, 4.6);
    add(new THREE.BoxGeometry(1.2, 0.8, 0.08), wood, -3.4, 1.55, 4.65);
    for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.28, 0.34, 0.01), M(0xe8dcc0), -3.8 + k * 0.4, 1.55, 4.7, group, false).rotation.z = (Math.random() - 0.5) * 0.3;
    block(-3.4, 4.6, 0.4);
    room.spots.push({ id: 'ledger', name: 'Camp ledger', verb: 'Upgrade camp', x: -3.4, z: 5.5, r: 1.8 });
    room.spots.push({ id: 'elder', name: 'Maren', verb: 'Talk', x: 2.4, z: 2.6, r: 2.0 });

    // Tents along the south side
    const tentG = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-1.4, 0), new THREE.Vector2(1.4, 0), new THREE.Vector2(0, 1.8)]), { depth: 3, bevelEnabled: false });
    tentG.translate(0, 0, -1.5); room.geos.push(tentG);
    for (const [x, z, c, ry] of [[-9, 7.4, 0x8a7a5a, 0.2], [9, 7.4, 0x6a5a48, -0.2], [-5.2, 8.4, 0x7a6a4a, 1.4]]) {
      const t = new THREE.Mesh(tentG, M(c)); t.position.set(x, 0, z); t.rotation.y = ry; t.castShadow = true; t.receiveShadow = true; group.add(t);
      block(x, z, 1.6);
    }
    // Apothecary: a little table of glowing flasks, more shelves with each level
    if (lv.apothecary >= 1) {
      add(new THREE.BoxGeometry(1.6, 0.8, 0.8), wood, 5.2, 0.4, 6.8); block(5.2, 6.8, 1.0);
      const potM = new THREE.MeshBasicMaterial({ color: 0xff5a6a }); room.mats.push(potM);
      for (let k = 0; k < 2 + lv.apothecary * 2; k++) add(new THREE.SphereGeometry(0.08, 6, 5), potM, 4.6 + (k % 4) * 0.4, 0.9 + Math.floor(k / 4) * 0.2, 6.7, group, false);
      torch(5.2, 1.0, 6.4, 0xff5a6a, false);
    }
    // Training yard: one straw dummy per level
    for (let k = 0; k < lv.yard; k++) {
      const x = 9.6 - k * 1.6, z = 3.2;
      add(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), darkWood, x, 0.9, z);
      add(new THREE.BoxGeometry(0.9, 0.08, 0.08), darkWood, x, 1.4, z);
      add(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 7), M(0xc9a85a), x, 1.25, z);
      add(new THREE.SphereGeometry(0.16, 7, 6), M(0xc9a85a), x, 1.75, z);
      block(x, z, 0.4);
    }

    // The people of the camp
    const npc = (id, x, z, ry, opt) => {
      const r = Rig.build('npc', { npc: opt }); r.root.position.set(x, 0, z); r.root.rotation.y = ry; group.add(r.root);
      room.npcs.push({ id, rig: r, x, z, ry, face: ry });
    };
    npc('smith', -6.6, -0.6, 1.2, { cloth: 0x5a4632, hair: 0x2a1a10, beard: true, apron: true, tool: 'hammer', skin: 0xc88b63 });
    npc('trader', 7.0, -1.6, -1.3, { cloth: 0x6a2a2a, hair: 0x8a5a2b, scarf: 0xc9a23a, skin: 0xf1c9a0 });
    npc('elder', 2.4, 1.7, -0.6, { cloth: 0x3a4a5a, hair: 0xb0b0b0, elder: true, scarf: 0x6a5a48, skin: 0xe3b48a });
    for (const n of room.npcs) block(n.x, n.z, 0.45);

    // Embers rising from the fire
    const N = 40, pos = new Float32Array(N * 3), eg = new THREE.BufferGeometry();
    for (let k = 0; k < N; k++) { pos[k * 3] = (Math.random() - 0.5) * 0.8; pos[k * 3 + 1] = Math.random() * 3; pos[k * 3 + 2] = 1 + (Math.random() - 0.5) * 0.8; }
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); room.geos.push(eg);
    const em = new THREE.PointsMaterial({ color: 0xffa040, size: 0.07, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }); room.mats.push(em);
    room.embers = new THREE.Points(eg, em); group.add(room.embers);
    return room;
  }

  // NPCs breathe, and turn to watch the hero when he comes near; embers drift up
  function update(room, dt, heroPos) {
    for (const n of room.npcs) {
      const d = heroPos ? Math.hypot(heroPos.x - n.x, heroPos.z - n.z) : 99;
      const want = d < 4.5 ? Math.atan2(heroPos.x - n.x, heroPos.z - n.z) : n.ry;
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
  // The interactable spot nearest the hero, within reach
  function nearest(room, pos) {
    let best = null, bd = Infinity;
    for (const s of room.spots) { const d = Math.hypot(pos.x - s.x, pos.z - s.z); if (d < s.r && d < bd) { bd = d; best = s; } }
    return best;
  }
  return { build, update, nearest, spawn: { x: 0, z: 6.2, facing: Math.PI } };
})();
