// Deepward - the dungeon. Each stage is one continuous, winding dungeon: a run of sections (wide halls) joined by open
// passages heading north (-Z), with no gates. Walking into a section wakes its monsters; the last section is the
// guardian's lair, and the guardian comes out of the dark archway at its far end when you step in. The whole stage is
// built at once; enemies chase you from section to section along the passages.
// States of a section: ahead (not yet entered) -> start (a short breath) -> fight (waves) -> cleared.
const World = (() => {
  const CORR_LEN = 8, DOOR = 2.0, SIDE_DOOR = 1.6, SIDE_LEN = 4, WALL_H = 3.4, N_LIGHTS = 6, CULL_DIST = 40;
  const FE = CFG.features;
  let scene, hemi, rooms = [], sections = [], sides = [], lights = [], fogTo = null, hemiTo = null, active = null, halted = false;
  const texCache = {};

  // Which stage, room and loop a running room index falls in
  function info(i) {
    const S = CFG.stages, per = S.reduce((n, s) => n + s.rooms.length, 0), loop = Math.floor(i / per);
    let n = i % per;
    for (let si = 0; si < S.length; si++) {
      if (n < S[si].rooms.length) return { si, ri: n, loop, k: loop * S.length + si, stage: S[si], room: S[si].rooms[n], count: S[si].rooms.length };
      n -= S[si].rooms.length;
    }
  }

  // ---------------- Textures (drawn once per theme) ----------------
  function canvasTex(draw) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; draw(cv.getContext('2d'));
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
  }
  const rgb = (c, d = 0) => `rgb(${c[0] + d | 0},${c[1] + d | 0},${c[2] + d | 0})`;
  function themeTex(name) {
    if (texCache[name]) return texCache[name];
    const th = CFG.themes[name];
    // Flagstones: irregular slabs, dark grout, a few cracks
    const floor = canvasTex(c => {
      c.fillStyle = rgb(th.stone, -36); c.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const v = Math.random() * 20 - 6, sx = (x * 64 + (y % 2) * 32) % 256 + 3;
        c.fillStyle = rgb(th.stone, v); c.fillRect(sx, y * 64 + 3, 58, 58);
        if (sx + 58 > 256) c.fillRect(sx - 256, y * 64 + 3, 58, 58);
        c.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 6; i++) c.fillRect((sx + Math.random() * 58) % 256, y * 64 + Math.random() * 58, 3, 3);
      }
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) { c.beginPath(); let px = Math.random() * 256, py = Math.random() * 256; c.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (Math.random() - 0.5) * 30; py += (Math.random() - 0.5) * 30; c.lineTo(px, py); } c.stroke(); }
    });
    // Brick courses
    const wall = canvasTex(c => {
      c.fillStyle = rgb(th.wall, -32); c.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) {
        c.fillStyle = rgb(th.wall, Math.random() * 18 - 6);
        c.fillRect(x * 56 + (y % 2) * 28 - 28, y * 32 + 2, 52, 28);
      }
    });
    return (texCache[name] = { floor, wall });
  }

  // ---------------- Laying out a stage ----------------
  // Sizes grow by CFG.sectionScale; each section shifts sideways from the last (so the path winds) while keeping enough
  // overlap for a straight passage between them.
  function plan(infos) {
    const count = infos.length, out = [];
    let prev = null, side = Math.random() < 0.5 ? 1 : -1;
    for (let j = 0; j < count; j++) {
      const inf = infos[j], [hw, hd] = inf.room.size.map(v => v * CFG.sectionScale);
      const p = { i: j, j, inf, hw, hd, cx: 0, doorS: null, doorN: null };
      if (prev) {
        const lim = Math.max(0, Math.min(7, prev.hw + hw - DOOR * 2 - 3));
        p.cx = Math.max(-12, Math.min(12, prev.cx + side * lim * (0.5 + Math.random() * 0.5)));
        side = Math.abs(p.cx) > 8 ? -Math.sign(p.cx) : Math.random() < 0.7 ? -side : side;
        const lo = Math.max(prev.cx - prev.hw, p.cx - hw) + DOOR + 1, hi = Math.min(prev.cx + prev.hw, p.cx + hw) - DOOR - 1;
        p.doorS = prev.doorN = lo <= hi ? lo + Math.random() * (hi - lo) : (lo + hi) / 2;
        p.southZ = prev.northZ - CORR_LEN;
      } else p.southZ = 6;
      p.northZ = p.southZ - hd * 2;
      out.push(p); prev = p;
    }
    // Extras: side rooms (an elite's den, then a trapped vault) off middle sections, traps in some passages, one shrine
    const mids = out.filter(p => p.j > 0 && p.j < count - 1).sort(() => Math.random() - 0.5);
    mids.slice(0, FE.sideRooms).forEach((p, k) => { p.side = { dir: Math.random() < 0.5 ? -1 : 1, kind: k % 2 ? 'vault' : 'den' }; });
    out.filter(p => p.j > 0).sort(() => Math.random() - 0.5).slice(0, FE.traps).forEach(p => { p.trap = Math.random() < 0.5 ? 'spikes' : 'blade'; });
    const sh = mids.find(p => !p.side) || mids[0]; if (sh) sh.shrine = true;
    if (infos[0].si >= 5 && mids.length) mids[mids.length - 1].mimic = true;                 // Act II: one chest is not a chest
    if (count > 2 && infos[0].stage.champion) out[Math.floor(count / 2)].champion = infos[0].stage.champion;          // the middle section's last wave
    return out;
  }

  // ---------------- Building a section ----------------
  function build(P) {
    const { i, inf, hw, hd, cx, southZ, northZ } = P, def = inf.room, th = CFG.themes[inf.stage.theme], T = themeTex(inf.stage.theme);
    const cz = southZ - hd, last = P.doorN === null, ds = P.doorS === null ? null : P.doorS - cx, dn = last ? null : P.doorN - cx;
    const group = new THREE.Group(); group.position.x = cx; scene.add(group);
    const room = {
      i, j: P.j, inf, th, hw, hd, cx, southZ, northZ, cz, group, mats: [], geos: [], texs: [], torches: [], pillars: [],
      doorS: P.doorS, doorN: P.doorN, lair: last,
      champion: P.champion || null, waves: P.champion ? def.waves.concat([[P.champion.kind]]) : null,
      fade: 1, fadeDir: 1, occl: 1, state: 'ahead', t: 0, wave: 0, waveDelay: 0,
      rect: { x0: cx - hw, x1: cx + hw, z0: northZ, z1: southZ },
      // The passage south of the section overlaps both sections by a metre so you can walk from one into the next
      corr: ds !== null ? { x0: P.doorS - DOOR + 0.1, x1: P.doorS + DOOR - 0.1, z0: southZ - 1, z1: southZ + CORR_LEN + 1 } : null,
    };
    const M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9, flatShading: true }, o)); m.userData.op = o.opacity === undefined ? 1 : o.opacity; room.mats.push(m); return m; };
    const add = (geo, m, x, y, z, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; group.add(o); room.geos.push(geo); return o; };
    const texFor = (t, rx, ry) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); room.texs.push(c); return c; };

    // Floor (section + passage)
    const floorM = M(0xffffff, { map: texFor(T.floor, (hw * 2 + 2) / 4, (hd * 2 + 2) / 4), roughness: 0.95, flatShading: false });
    add(new THREE.PlaneGeometry(hw * 2 + 2, hd * 2 + 2).rotateX(-Math.PI / 2), floorM, 0, 0, cz, false);
    if (ds !== null) {
      const cm = M(0xffffff, { map: texFor(T.floor, (DOOR * 2 + 2) / 4, CORR_LEN / 4), roughness: 0.95, flatShading: false });
      add(new THREE.PlaneGeometry(DOOR * 2 + 2, CORR_LEN).rotateX(-Math.PI / 2), cm, ds, 0.001, southZ + CORR_LEN / 2, false);
    }

    // Walls: brick boxes whose texture repeats by size
    const wallM = M(0xffffff, { map: T.wall, roughness: 0.95, flatShading: false }), trimM = M(rgbHex(th.wall, -8));
    function wallBox(w, h, d, x, y, z, m = wallM) {
      if (w <= 0.01) return null;
      const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
      const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const n = f * 4 + k; uv.setXY(n, uv.getX(n) * dims[f][0] / 3, uv.getY(n) * dims[f][1] / 3); }
      return add(g, m, x, y, z);
    }
    // A run of wall across the section at z, broken by a doorway at local x `door` (or solid)
    function wallRow(z, h, door, y = h / 2) {
      const a = -hw - 1, b = hw + 1;
      if (door === null) return wallBox(b - a, h, 1, 0, y, z);
      wallBox(door - DOOR - a, h, 1, (a + door - DOOR) / 2, y, z); wallBox(b - door - DOOR, h, 1, (door + DOOR + b) / 2, y, z);
    }
    // Side walls; one may open into a side room
    for (const sd of [-1, 1]) {
      const x = sd * (hw + 0.5), a = cz - hd - 1, b = cz + hd + 1;
      if (!P.side || P.side.dir !== sd) { wallBox(1, WALL_H, b - a, x, WALL_H / 2, cz); continue; }
      wallBox(1, WALL_H, cz - SIDE_DOOR - a, x, WALL_H / 2, (a + cz - SIDE_DOOR) / 2); wallBox(1, WALL_H, b - cz - SIDE_DOOR, x, WALL_H / 2, (cz + SIDE_DOOR + b) / 2);
      wallBox(1, WALL_H - 2.8, SIDE_DOOR * 2, x, 2.8 + (WALL_H - 2.8) / 2, cz);
      room.sideDoor = { dir: sd, z: cz };
    }
    wallRow(northZ - 0.5, WALL_H, dn);
    if (dn !== null) wallBox(DOOR * 2, WALL_H - 3.0, 1, dn, 3.0 + (WALL_H - 3.0) / 2, northZ - 0.5);
    // The south wall stays low so the high camera can see in; posts and a lintel frame its open doorway
    wallRow(southZ + 0.5, 0.7, ds);
    if (ds !== null) {
      for (const s of [-1, 1]) wallBox(0.5, 3.1, 1.1, ds + s * (DOOR + 0.25), 1.55, southZ + 0.5, trimM);
      wallBox(DOOR * 2 + 1, 0.45, 1.1, ds, 3.1, southZ + 0.5, trimM);
      for (const s of [-1, 1]) wallBox(1, WALL_H, CORR_LEN, ds + s * (DOOR + 0.5), WALL_H / 2, southZ + CORR_LEN / 2);
    }
    // The south doorway frame turns see-through while the camera is behind it
    room.occluders = [trimM];

    // The guardian's lair: a dark archway in the far wall that the guardian comes out of
    if (last) {
      const dark = M(0x020103), stone = M(rgbHex(th.wall, 10));
      add(new THREE.PlaneGeometry(3.2, 2.8), dark, 0, 1.4, northZ + 0.02, false);
      for (const s of [-1, 1]) wallBox(0.7, 3.4, 0.9, s * 1.95, 1.7, northZ + 0.1, stone);
      wallBox(4.6, 0.7, 0.9, 0, 3.15, northZ + 0.1, stone);
      add(new THREE.ConeGeometry(0.35, 0.6, 4), stone, 0, 3.75, northZ + 0.1).rotation.y = Math.PI / 4;
      room.lairAt = new THREE.Vector3(cx, 0, northZ + 2.2);
    }

    // Pillar stumps
    if (def.pillars) {
      const stone = M(rgbHex(th.wall, 14));
      for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = px * hw * 0.55, z = cz + pz * hd * 0.45, h = 1.2 + Math.random() * 0.8;
        add(new THREE.BoxGeometry(1.7, 0.35, 1.7), stone, x, 0.175, z);
        add(new THREE.CylinderGeometry(CFG.pillarR * 0.85, CFG.pillarR * 0.95, h, 8), stone, x, 0.35 + h / 2, z);
        add(new THREE.CylinderGeometry(CFG.pillarR * 0.6, CFG.pillarR * 0.85, 0.35, 8), stone, x + 0.1, 0.5 + h, z).rotation.z = 0.25;
        add(new THREE.DodecahedronGeometry(0.35, 0), stone, x + 0.9, 0.25, z + 0.6);
        room.pillars.push([x + cx, z]);
      }
    }

    // Torches: on the side walls, either side of the far doorway (or the lair), and in the passage
    const flameM = new THREE.MeshBasicMaterial({ color: th.torch }); room.mats.push(flameM);
    const stickM = M(0x3a2a1a);
    function torch(x, z, ry) {
      const g = new THREE.Group(); g.position.set(x, 2.2, z); g.rotation.y = ry; group.add(g);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 6), stickM); st.position.set(0, 0, 0.25); st.rotation.x = 0.6; g.add(st);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 6), flameM); fl.position.set(0, 0.28, 0.4); g.add(fl);
      room.geos.push(st.geometry, fl.geometry);
      const pos = new THREE.Vector3(cx + x + Math.sin(ry) * 0.6, 2.6, z + Math.cos(ry) * 0.6);
      room.torches.push({ pos, fl, seed: Math.random() * 10, color: th.torch });
    }
    for (const s of [-1, 1]) {
      for (const f of [-0.6, 0, 0.6]) if (!(f === 0 && P.side && P.side.dir === s)) torch(s * (hw - 0.05), cz + hd * f, -s * Math.PI / 2);
      torch((dn === null ? 0 : dn) + s * (DOOR + 1.4), northZ + 0.05, 0);
    }
    if (ds !== null) torch(ds - (DOOR - 0.05), southZ + CORR_LEN / 2, Math.PI / 2);

    // Scattered decor in the theme of the stage, kept off the path between the doorways
    const pathA = [ds === null ? (dn === null ? 0 : dn) : ds, southZ], pathB = [dn === null ? 0 : dn, northZ];
    const offPath = (x, z) => { const t = Math.max(0, Math.min(1, (z - pathA[1]) / (pathB[1] - pathA[1]))); return Math.abs(x - (pathA[0] + (pathB[0] - pathA[0]) * t)) > DOOR + 0.6; };
    const decorM = th.decor === 'bones' ? M(0xcfc6aa) : th.decor === 'crates' ? M(0x6a4a2c) : th.decor === 'court' ? M(0x8a8690) : M(rgbHex(th.wall, 4));
    const decorM2 = M(rgbHex(th.wall, -6));
    const webM = M(0xd8d8e8, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), goldM = M(0xc9a23a, { metalness: 0.6, roughness: 0.4 });
    const candleM = new THREE.MeshBasicMaterial({ color: 0xfff0c0 }); room.mats.push(candleM);
    const waterM = M(0x2a6a6a, { transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.3 }), reedM = M(0x3a5a2a);
    const iceM = M(0xbfe8ff, { roughness: 0.15, metalness: 0.1, emissive: 0x2a4a6a }), snowM = M(0xe8f0f8);
    const anvilM = M(0x2a2a30, { metalness: 0.7, roughness: 0.4 }), emberM = new THREE.MeshBasicMaterial({ color: 0xff6a1a }); room.mats.push(emberM);
    const boneM = M(0xd8cfb4);
    for (let k = 0; k < Math.round(hw * hd * 0.3); k++) {
      const x = (Math.random() * 2 - 1) * (hw - 0.8), z = cz + (Math.random() * 2 - 1) * (hd - 0.8);
      if (!offPath(x, z)) continue;
      if (room.pillars.some(([px, pz]) => Math.hypot(x + cx - px, z - pz) < 1.4)) continue;
      if (last && Math.abs(x) < 3 && z < northZ + 4) continue;                // keep the lair mouth clear
      const r = Math.random();
      if (th.decor === 'bones') {
        if (r < 0.4) add(new THREE.SphereGeometry(0.12, 6, 5), decorM, x, 0.1, z, false).scale.set(1, 0.9, 1.15);
        else if (r < 0.8) add(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 5), decorM, x, 0.03, z, false).rotation.set(Math.PI / 2, 0, Math.random() * 3);
        else add(new THREE.DodecahedronGeometry(0.2, 0), decorM2, x, 0.1, z);
      } else if (th.decor === 'crates') {
        if (Math.abs(x) > hw - 2.2 && r < 0.6) {                          // crates and barrels stack along the walls
          if (r < 0.3) add(new THREE.BoxGeometry(0.7, 0.7, 0.7), decorM, x, 0.35, z).rotation.y = Math.random();
          else add(new THREE.CylinderGeometry(0.32, 0.32, 0.8, 9), decorM, x, 0.4, z);
        } else add(new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.15, 0), decorM2, x, 0.08, z);
      } else if (th.decor === 'webs') {
        if (r < 0.35) { const sac = add(new THREE.SphereGeometry(0.22 + Math.random() * 0.12, 8, 6), webM, x, 0.2, z, false); sac.scale.y = 1.3; }
        else if (r < 0.6) { const w = add(new THREE.PlaneGeometry(1.4, 1.0), webM, x, 0.9, z, false); w.rotation.set(0, Math.random() * 3, (Math.random() - 0.5) * 0.6); }
        else add(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.3, 0), decorM2, x, 0.12, z).rotation.set(Math.random(), Math.random(), 0);
      } else if (th.decor === 'water') {                                // drowned: still pools, reeds, a fallen column
        if (r < 0.4) add(new THREE.CircleGeometry(0.5 + Math.random() * 0.7, 14).rotateX(-Math.PI / 2), waterM, x, 0.015, z, false);
        else if (r < 0.75) for (let q = 0; q < 4; q++) add(new THREE.ConeGeometry(0.025, 0.5 + Math.random() * 0.4, 4), reedM, x + (Math.random() - 0.5) * 0.3, 0.3, z + (Math.random() - 0.5) * 0.3, false);
        else add(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 8), decorM2, x, 0.22, z).rotation.set(0, Math.random() * 3, Math.PI / 2);
      } else if (th.decor === 'ice') {                                  // frost: ice shards and drifts
        if (r < 0.55) { const n = 2 + Math.floor(Math.random() * 3); for (let q = 0; q < n; q++) { const c = add(new THREE.ConeGeometry(0.08 + Math.random() * 0.1, 0.4 + Math.random() * 0.7, 5), iceM, x + (Math.random() - 0.5) * 0.4, 0.25, z + (Math.random() - 0.5) * 0.4); c.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6); } }
        else add(new THREE.SphereGeometry(0.5, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), snowM, x, 0, z, false).scale.set(1.4, 0.35, 1);
      } else if (th.decor === 'forge') {                                // a dead forge: anvils, slag and glowing embers
        if (Math.abs(x) > hw - 2.4 && r < 0.4) { add(new THREE.BoxGeometry(0.5, 0.35, 0.3), decorM2, x, 0.18, z); add(new THREE.BoxGeometry(0.8, 0.14, 0.32), anvilM, x, 0.42, z); }
        else if (r < 0.7) add(new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.12, 0), emberM, x, 0.06, z, false);
        else add(new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.25, 0), decorM2, x, 0.12, z).rotation.set(Math.random(), Math.random(), 0);
      } else if (th.decor === 'orchard') {                              // bone trees, skulls in the roots
        if (r < 0.3 && Math.abs(x) > 2.5) {
          const hgt = 1.6 + Math.random() * 1.2; add(new THREE.CylinderGeometry(0.06, 0.13, hgt, 6), boneM, x, hgt / 2, z);
          for (let q = 0; q < 3; q++) { const br = add(new THREE.CylinderGeometry(0.025, 0.05, 0.8, 5), boneM, x, hgt * (0.55 + q * 0.15), z); br.rotation.set((Math.random() - 0.5) * 1.6, Math.random() * 3, 0.9 + Math.random() * 0.5); }
        } else if (r < 0.6) add(new THREE.SphereGeometry(0.12, 6, 5), boneM, x, 0.1, z, false).scale.set(1, 0.9, 1.15);
        else add(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 5), boneM, x, 0.03, z, false).rotation.set(Math.PI / 2, 0, Math.random() * 3);
      } else if (th.decor === 'court') {
        if (Math.abs(x) > hw - 2.4 && r < 0.4) {                          // candelabras and broken statues line the walls
          add(new THREE.CylinderGeometry(0.04, 0.12, 1.4, 6), goldM, x, 0.7, z);
          for (const dx of [-0.15, 0, 0.15]) add(new THREE.ConeGeometry(0.03, 0.08, 5), candleM, x + dx, 1.48, z, false);
        } else if (r < 0.55 && Math.abs(x) > hw - 2.4) { add(new THREE.BoxGeometry(0.6, 0.5, 0.6), decorM, x, 0.25, z); add(new THREE.BoxGeometry(0.3, 0.9, 0.25), decorM, x, 0.95, z).rotation.z = 0.3; }
        else add(new THREE.BoxGeometry(0.3 + Math.random() * 0.3, 0.06, 0.2), decorM2, x, 0.03, z).rotation.y = Math.random() * 3;
      } else {
        add(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.35, 0), r < 0.5 ? decorM : decorM2, x, 0.12, z).rotation.set(Math.random(), Math.random(), 0);
      }
    }
    room.offPath = offPath;

    Rig.bake(room.group);                                                  // a few draw calls per section, not hundreds
    // Props stay separate meshes: pots break, traps move, the shrine glows
    Props.breakables(room);
    if (P.trap && ds !== null) Props.trap(room, P.trap, southZ + CORR_LEN * 0.5, P.doorS, DOOR * 2);
    if (P.mimic) {
      const sd = Math.random() < 0.5 ? -1 : 1, lx = sd * (hw - 1.6), mz = cz - hd * 0.3;
      Props.mimic(room, offPath(lx, mz) ? lx : -lx, mz, multOf(inf));
    }
    if (P.shrine) {
      const sd = P.side ? -P.side.dir : (Math.random() < 0.5 ? -1 : 1), lx = sd * (hw - 1.5);
      Props.shrine(room, lx, offPath(lx, cz + hd * 0.4) ? cz + hd * 0.4 : cz - hd * 0.4);
    }
    setFade(room, 1);
    rooms.push(room);
    if (P.side) buildSide(room, P.side);
    return room;
  }
  // ---------------- Side rooms ----------------
  // A dead end off a section's side wall, through a short passage: an elite's den (the guard drops a rich chest) or a
  // vault (a rich chest behind two spike plates). It is not on the path, so the minimap's compass ignores it.
  function buildSide(par, { dir, kind }) {
    const [shw, shd] = FE.sideSize, th = par.th, T = themeTex(par.inf.stage.theme);
    const sx = par.cx + dir * (par.hw + 2 + SIDE_LEN + shw), cz = par.cz;
    const group = new THREE.Group(); group.position.x = sx; scene.add(group);
    const room = {
      kind: 'side', sideKind: kind, dir, parent: par, i: par.i, j: par.j, inf: par.inf, th, hw: shw, hd: shd, cx: sx, cz,
      southZ: cz + shd, northZ: cz - shd, group, mats: [], geos: [], texs: [], torches: [], pillars: [], occluders: [],
      fade: 1, fadeDir: 1, occl: 1, state: kind === 'vault' ? 'vault' : 'ahead', t: 0, wave: 0, waveDelay: 0, offPath: () => true,
      rect: { x0: sx - shw, x1: sx + shw, z0: cz - shd, z1: cz + shd },
      corr: { x0: Math.min(par.cx + dir * (par.hw - 1), par.cx + dir * (par.hw + SIDE_LEN + 3)), x1: Math.max(par.cx + dir * (par.hw - 1), par.cx + dir * (par.hw + SIDE_LEN + 3)), z0: cz - SIDE_DOOR + 0.1, z1: cz + SIDE_DOOR - 0.1 },
      exitAt: new THREE.Vector3(par.cx + dir * (par.hw - 1.6), 0, cz), entryAt: new THREE.Vector3(par.cx + dir * (par.hw + 1 + SIDE_LEN / 2), 0, cz),
    };
    if (kind === 'den') { const main = par.inf.stage.rooms[0].waves[0][0]; room.waves = [[main]]; room.elite = true; }
    const M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9, flatShading: true }, o)); m.userData.op = 1; room.mats.push(m); return m; };
    const add = (geo, m, x, y, z, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; group.add(o); room.geos.push(geo); return o; };
    const texFor = (t, rx, ry) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); room.texs.push(c); return c; };
    const wallM = M(0xffffff, { map: T.wall, roughness: 0.95, flatShading: false });
    const box = (w, h, d, x, y, z) => {
      if (w <= 0.01 || d <= 0.01) return;
      const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const n = f * 4 + k; uv.setXY(n, uv.getX(n) * dims[f][0] / 3, uv.getY(n) * dims[f][1] / 3); }
      add(g, wallM, x, y, z);
    };
    // Floor: room and passage
    add(new THREE.PlaneGeometry(shw * 2 + 2, shd * 2 + 2).rotateX(-Math.PI / 2), M(0xffffff, { map: texFor(T.floor, (shw * 2 + 2) / 4, (shd * 2 + 2) / 4), roughness: 0.95, flatShading: false }), 0, 0, cz, false);
    const pc = -dir * (shw + 1 + SIDE_LEN / 2);                               // the passage's centre, in this room's x
    add(new THREE.PlaneGeometry(SIDE_LEN + 2, SIDE_DOOR * 2 + 2).rotateX(-Math.PI / 2), M(0xffffff, { map: texFor(T.floor, (SIDE_LEN + 2) / 4, 1), roughness: 0.95, flatShading: false }), pc, 0.001, cz, false);
    // Walls: far, north and (low, for the high camera) south; the near wall has the doorway
    box(1, WALL_H, shd * 2 + 2, dir * (shw + 0.5), WALL_H / 2, cz);
    box(shw * 2 + 2, WALL_H, 1, 0, WALL_H / 2, cz - shd - 0.5);
    box(shw * 2 + 2, 0.7, 1, 0, 0.35, cz + shd + 0.5);
    const nx = -dir * (shw + 0.5), a = cz - shd - 1, b = cz + shd + 1;
    box(1, WALL_H, cz - SIDE_DOOR - a, nx, WALL_H / 2, (a + cz - SIDE_DOOR) / 2); box(1, WALL_H, b - cz - SIDE_DOOR, nx, WALL_H / 2, (cz + SIDE_DOOR + b) / 2);
    box(1, WALL_H - 2.8, SIDE_DOOR * 2, nx, 2.8 + (WALL_H - 2.8) / 2, cz);
    for (const s of [-1, 1]) box(SIDE_LEN, WALL_H, 1, pc, WALL_H / 2, cz + s * (SIDE_DOOR + 0.5));
    // Torches on the north wall
    const flameM = new THREE.MeshBasicMaterial({ color: kind === 'vault' ? 0xffd040 : 0xff5030 }); room.mats.push(flameM);
    for (const s of [-1, 1]) {
      const fl = add(new THREE.ConeGeometry(0.1, 0.32, 6), flameM, s * shw * 0.5, 2.5, cz - shd + 0.1, false);
      room.torches.push({ pos: new THREE.Vector3(sx + s * shw * 0.5, 2.6, cz - shd + 0.7), fl, seed: Math.random() * 10, color: kind === 'vault' ? 0xffc060 : 0xff6040 });
    }
    // Rubble in the corners
    const rub = M(rgbHex(th.wall, 4));
    for (let k = 0; k < 6; k++) add(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.25, 0), rub, (Math.random() < 0.5 ? -1 : 1) * (shw - 0.6), 0.12, cz + (Math.random() < 0.5 ? -1 : 1) * (shd - 0.6 - Math.random()));
    Rig.bake(group);
    if (kind === 'vault') {
      // Two spike plates across the room, out of step with each other, guard a rich chest
      const t1 = Props.trap(room, 'spikes', cz, sx - dir * 1.7, 1.6, shd * 2 - 0.2), t2 = Props.trap(room, 'spikes', cz, sx + dir * 0.3, 1.6, shd * 2 - 0.2);
      t2.t = t1.t + (FE.spikes.idle + FE.spikes.warn + FE.spikes.up) / 2;
      addChest(room, false, { x: dir * (shw - 1.3), z: cz }, true);
    }
    setFade(room, 1);
    rooms.push(room); sides.push(room);
    return room;
  }
  function rgbHex(c, d = 0) { return ((Math.max(0, c[0] + d) | 0) << 16) | ((Math.max(0, c[1] + d) | 0) << 8) | (Math.max(0, c[2] + d) | 0); }

  function setFade(room, f) {
    room.fade = f;
    const see = f < 0.999;
    for (const m of room.mats) {
      const op = m.userData.op === undefined ? 1 : m.userData.op, t = see || op < 1;     // see-through materials (webs) keep their own opacity
      m.opacity = f * op;
      if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; }
    }
    room.group.visible = f > 0.01;
  }
  function dispose(room) {
    scene.remove(room.group);
    room.group.traverse(o => { if (o.isMesh || o.isPoints) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
    for (const g of room.geos) g.dispose();
    for (const m of room.mats) m.dispose();
    for (const t of room.texs) t.dispose();
    rooms.splice(rooms.indexOf(room), 1);
  }
  function clearAll() { for (const r of rooms.slice()) dispose(r); sections = []; sides = []; active = null; Props.clear(); }

  // ---------------- Walkable space ----------------
  const inRect = (q, x, z, pad = 0) => x > q.x0 - pad && x < q.x1 + pad && z > q.z0 - pad && z < q.z1 + pad;
  function walkRects() {
    const out = [];
    for (const r of rooms) { out.push(r.rect); if (r.corr) out.push(r.corr); }
    return out;
  }
  // Keep a body (position, radius) inside the walkable space
  function constrain(pos, rad) {
    let bx = pos.x, bz = pos.z, bd = Infinity;
    for (const q of walkRects()) {
      const x = Math.max(q.x0 + rad, Math.min(q.x1 - rad, pos.x)), z = Math.max(q.z0 + rad, Math.min(q.z1 - rad, pos.z));
      const d = (x - pos.x) ** 2 + (z - pos.z) ** 2;
      if (d < bd) { bd = d; bx = x; bz = z; if (d === 0) break; }
    }
    pos.x = bx; pos.z = bz;
    const push = ([px, pz, pr]) => {
      const dx = pos.x - px, dz = pos.z - pz, d = Math.hypot(dx, dz), min = (pr || CFG.pillarR) + rad;
      if (d < min && d > 1e-4) { pos.x = px + dx / d * min; pos.z = pz + dz / d * min; }
    };
    for (const r of rooms) r.pillars.forEach(push);
    Props.blockers().forEach(push);
  }
  // Is a point inside the built space (sections and passages)?
  function inSpace(x, z, pad = 0.5) { return walkRects().some(q => inRect(q, x, z, pad)); }
  // The section whose floor the given point is on (null in a passage)
  function roomOf(pos) { return rooms.find(r => inRect(r.rect, pos.x, pos.z)) || null; }
  // Where a point lies along the stage's path: section j is 2j, the passage leading into section j is 2j - 1
  function along(pos) {
    for (const r of sections) if (inRect(r.rect, pos.x, pos.z)) return r.j * 2;
    for (const r of sections) if (r.corr && inRect(r.corr, pos.x, pos.z)) return r.j * 2 - 1;
    return null;
  }
  // Enemies chasing the hero into another section head for the doorway on the way (null: go straight for them)
  const sideOf = pos => sides.find(s => inRect(s.rect, pos.x, pos.z) || inRect(s.corr, pos.x, pos.z)) || null;
  function route(from, to) {
    const fs = sideOf(from), ts = sideOf(to);
    if (fs && fs === ts) return null;
    if (fs) return fs.exitAt;                                              // leave a side room by its doorway first
    if (ts) { if (along(from) === ts.j * 2) return ts.entryAt; to = new THREE.Vector3(ts.parent.cx, 0, ts.parent.cz); }
    const a = along(from), b = along(to);
    if (a === null || b === null || a === b) return null;
    const j = Math.ceil(a / 2), r = sections[j], north = b > a;
    if (a % 2 === 0) return north ? new THREE.Vector3(r.doorN, 0, r.northZ - 1.5) : new THREE.Vector3(r.doorS, 0, r.southZ + 1.5);
    return north ? new THREE.Vector3(r.doorS, 0, r.southZ - 1.5) : new THREE.Vector3(r.doorS, 0, sections[j - 1].northZ + 1.5);
  }

  // How tough this stage's enemies are (damage / health multipliers)
  function multOf(inf) {
    return { mult: inf.mult || 1 + inf.loop * CFG.loopScale + (inf.si || 0) * CFG.stageScale, hpMult: inf.hpMult || 1 + (inf.si || 0) * CFG.stageHp };
  }
  // ---------------- Encounters ----------------
  function spawnWave(room) {
    const list = (room.waves || room.inf.room.waves)[room.wave], p = G.player;
    const mult = room.inf.mult || 1 + room.inf.loop * CFG.loopScale + (room.inf.si || 0) * CFG.stageScale;
    const hpMult = room.inf.hpMult || 1 + (room.inf.si || 0) * CFG.stageHp;
    // Spawn spots: across the section, away from the hero and the pillars
    const spots = [];
    for (let gx = -2; gx <= 2; gx++) for (let gz = 0; gz < 4; gz++) {
      const x = room.cx + gx / 2 * (room.hw - 1.8), z = room.northZ + 1.8 + gz * (room.hd * 2 - 3.6) / 3;
      if (Math.hypot(x - p.pos.x, z - p.pos.z) < 5) continue;
      if (room.pillars.some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.6)) continue;
      spots.push(new THREE.Vector3(x, 0, z));
    }
    spots.sort(() => Math.random() - 0.5);
    list.forEach((type, k) => {
      const guardian = room.kind !== 'side' && room.inf.room.guardian && room.wave === 0 && k === 0;
      const at = guardian && room.lairAt ? room.lairAt.clone() : spots[k % spots.length] || new THREE.Vector3(room.cx, 0, room.cz - 2);
      const champion = room.champion && room.wave === room.waves.length - 1 && k === 0;
      const far = room.kind === 'side' ? new THREE.Vector3(room.cx + room.dir * (room.hw - 1.5), 0, room.cz) : null;
      G.queue.push({ type, at: far || at, mult: mult * (guardian ? CFG.guardianMult : room.elite ? FE.eliteMult : 1), guardian: guardian && room.inf.stage.guardian, elite: !!room.elite, champion: champion ? room.champion : null, hpMult, room, t: G.time + (guardian ? 0.2 : 0.3 + k * 0.45) });
      if (!G.seen[type]) { G.seen[type] = true; showTip(CFG.tips[type]); }
    });
    if (room.champion && room.wave === room.waves.length - 1) { banner(room.champion.name.toUpperCase()); Snd.play('slam'); FX.shake(0.3); }
    else if (room.wave > 0) banner('MORE COME');
  }

  function enter(room) {
    if (room.kind === 'side') {
      banner(room.sideKind === 'den' ? "ELITE'S DEN" : 'TREASURE VAULT');
      if (room.sideKind === 'den') { room.state = 'start'; room.t = 0; }
      return;
    }
    room.state = 'start'; room.t = 0;
    active = room;
    const inf = room.inf;
    if (inf.room.guardian) { banner(inf.stage.guardian.toUpperCase()); Snd.play('slam'); FX.shake(0.35); G.rumble && G.rumble(0.5, 0.7, 600); }
    else banner('AREA ' + (inf.ri + 1) + ' / ' + inf.count);
  }

  function clearRoom(room) {
    room.state = 'cleared';
    const p = G.player; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * CFG.roomHeal);
    G.stats.rooms++;
    if (room.kind === 'side') { addChest(room, false, { x: room.dir * (room.hw - 1.3), z: room.cz }, true); banner('DEN CLEARED'); return; }
    const guardian = !!room.inf.room.guardian;
    addChest(room, guardian);
    banner(guardian ? (room.inf.custom ? 'FLOOR CLEARED' : 'STAGE CLEARED') : 'AREA CLEARED');
    // In the Endless Deep, a floor without a guardian is done when every section is
    if (room.inf.custom && !guardian && sections.every(r => r.state === 'cleared') && G.onFloorCleared) G.after(1.3, () => G.onFloorCleared());
  }

  // A chest left in each cleared section, beside the path; the guardian's is bigger and stands before the lair
  function addChest(room, big, at = null, rich = false) {
    const g = new THREE.Group(), s = big ? 1.35 : rich ? 1.15 : 1;
    let x = big ? 0 : (room.offPath(-3.6, room.cz) ? -Math.min(room.hw - 2, 3.6) : Math.min(room.hw - 2, 3.6)), z = big ? room.northZ + 4.5 : room.cz;
    if (!big && !room.offPath(x, z)) x = Math.sign(x) * (room.hw - 1.6);
    if (at) { x = at.x; z = at.z; }
    g.position.set(x, 0, z); g.rotation.y = big ? 0 : Math.PI / 2; g.scale.setScalar(s); room.group.add(g);
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4424, roughness: 0.85, flatShading: true }), band = new THREE.MeshStandardMaterial({ color: big || rich ? 0xd9a92a : 0x6a6d75, roughness: 0.4, metalness: 0.6, flatShading: true });
    room.mats.push(wood, band);
    const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); room.geos.push(geo); return o; };
    add(new THREE.BoxGeometry(0.9, 0.5, 0.6), wood, 0, 0.25, 0);
    for (const bx of [-0.35, 0.35]) add(new THREE.BoxGeometry(0.08, 0.52, 0.62), band, bx, 0.25, 0);
    const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3); g.add(lid);
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), wood, 0, 0, 0.3, lid);
    add(new THREE.BoxGeometry(0.12, 0.14, 0.05), band, 0, -0.02, 0.62, lid);
    room.chest = { g, lid, big, rich, opened: false, x: room.cx + x, z, t: 0 };
    room.pillars.push([room.cx + x, z, 0.55 * s]);
    FX.glint(new THREE.Vector3(room.cx + x, 0.9, z), big ? 0xffd040 : 0xfff0c0, 2, 0.6);
  }

  // ---------------- Per-frame ----------------
  function update(dt, cam) {
    const p = G.player;
    for (const r of rooms.slice()) {
      if (r.kind === 'camp') { Camp.update(r, dt, p && p.pos); continue; }
      if (r.chest) {
        const c = r.chest;
        if (!c.opened && p && p.state !== 'dead' && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 1.7) { c.opened = true; Snd.play('gate'); G.onChest(r); }
        if (c.opened && c.t < 1) { c.t = Math.min(1, c.t + dt * 2.5); c.lid.rotation.x = -1.9 * c.t; }
      }
      // Sections well beyond the fog are not drawn at all
      if (p && r.rect) {
        const dx = Math.max(r.rect.x0 - p.pos.x, 0, p.pos.x - r.rect.x1), dz = Math.max(r.rect.z0 - p.pos.z, 0, p.pos.z - (r.corr ? r.corr.z1 : r.rect.z1));
        const far = Math.hypot(dx, dz);
        r.group.visible = far < CULL_DIST;
        if (far < 14) r.seen = true;                                      // close enough to show on the minimap
      }
      const behind = cam && cam.z > r.southZ + 0.2 && cam.z < r.southZ + CORR_LEN && Math.abs(cam.x - r.cx) < r.hw + 1;
      r.occl += ((behind ? 0.15 : 1) - r.occl) * Math.min(1, dt * 8);
      for (const m of r.occluders) {
        const o = r.fade * r.occl, see = o < 0.999;
        m.opacity = o; if (m.transparent !== see) { m.transparent = see; m.needsUpdate = true; }
      }
    }
    if (p && G.state === 'play' && !halted) {
      const areas = sections.concat(sides);
      for (const r of areas) {
        if (r.state === 'ahead' && inRect(r.rect, p.pos.x, p.pos.z, -0.8)) enter(r);
        else if (r.state === 'vault' && inRect(r.rect, p.pos.x, p.pos.z, -0.8)) { enter(r); r.state = 'cleared'; }
      }
      for (const a of areas) {
        if (a.state === 'ahead' || a.state === 'cleared') continue;
        a.t += dt;
        if (a.state === 'start' && a.t > (a.inf.room.guardian && a.kind !== 'side' ? 1.2 : 0.6)) { a.state = 'fight'; a.wave = 0; spawnWave(a); }
        else if (a.state === 'fight') {
          const alive = G.enemies.some(e => e.room === a && e.state !== 'dead') || G.queue.some(q => q.room === a);
          if (!alive) {
            if (a.wave < (a.waves || a.inf.room.waves).length - 1) { a.waveDelay += dt; if (a.waveDelay > 1.2) { a.waveDelay = 0; a.wave++; spawnWave(a); } }
            else if (p.state !== 'dead') clearRoom(a);
          }
        }
      }
    }
    Props.update(dt);
    // Colours drift toward the new stage's fog and ambient light
    if (fogTo) { scene.fog.color.lerp(fogTo, Math.min(1, dt * 1.2)); scene.background.copy(scene.fog.color); }
    if (hemiTo) hemi.color.lerp(hemiTo, Math.min(1, dt * 1.2));
    updateLights(p ? p.pos : new THREE.Vector3(0, 0, 2));
  }

  // A fixed pool of point lights follows the torches nearest the hero (so the shader never recompiles)
  function updateLights(at) {
    const all = [];
    for (const r of rooms) for (const t of r.torches) all.push([t, r, (t.pos.x - at.x) ** 2 + (t.pos.z - at.z) ** 2]);
    all.sort((a, b) => a[2] - b[2]);
    const now = performance.now();
    for (const [t, r] of all) {
      const f = 0.85 + Math.sin(now / 90 + t.seed) * 0.08 + Math.sin(now / 37 + t.seed * 3) * 0.06;
      t.fl.scale.set(1, f * 1.1, 1);
    }
    lights.forEach((L, k) => {
      const e = all[k];
      if (!e) { L.intensity = 0; return; }
      const [t, r] = e, f = 0.85 + Math.sin(now / 90 + t.seed) * 0.08 + Math.sin(now / 37 + t.seed * 3) * 0.06;
      L.position.copy(t.pos); L.color.setHex(t.color); L.intensity = 1.5 * f * r.fade;
    });
  }

  function init(sc, hemiLight) {
    scene = sc; hemi = hemiLight;
    for (let k = 0; k < N_LIGHTS; k++) { const L = new THREE.PointLight(0xffa040, 0, 10, 1.6); scene.add(L); lights.push(L); }
  }
  // Tests: stop the dungeon sending enemies
  function halt() { halted = true; active = null; }
  function applyTheme(th) { scene.fog.color.setHex(th.fog); scene.background.setHex(th.fog); hemi.color.setHex(th.hemi); fogTo = hemiTo = null; }
  // Swap everything for the camp; returns where the hero should stand
  function enterCamp(levels) {
    clearAll();
    rooms.push(Camp.build(scene, levels || Items.S.camp));
    applyTheme(CFG.themes.camp);
    return Camp.spawn;
  }
  // Swap everything for stage k (running index: the stages repeat deeper down); returns the hero's start
  function startStage(k) {
    clearAll(); halted = false;
    const S = CFG.stages, per = S.reduce((n, s) => n + s.rooms.length, 0), loop = Math.floor(k / S.length), si = k % S.length;
    let idx = loop * per; for (let j = 0; j < si; j++) idx += S[j].rooms.length;
    return begin(Array.from({ length: S[si].rooms.length }, (_, j) => info(idx + j)));
  }
  // A stage built from a given definition (the Endless Deep): o.si picks the guardian, o.k the loot tier and elite
  // odds, o.mult how tough the enemies are
  function startCustom(def, o) {
    clearAll(); halted = false;
    return begin(def.rooms.map((room, ri) => ({ si: o.si, ri, loop: 0, k: o.k, stage: def, room, count: def.rooms.length, mult: o.mult, hpMult: o.hpMult, custom: true })));
  }
  function begin(infos) {
    sections = plan(infos).map(build);
    const r = sections[0]; applyTheme(r.th);
    active = r; r.state = 'start'; r.t = 0;
    banner(r.inf.stage.name.toUpperCase() + (r.inf.loop ? '  ·  DEPTH ' + (r.inf.loop + 1) : ''));
    return { x: r.cx, z: r.southZ - 3, facing: Math.PI };
  }
  const inCamp = () => rooms.some(r => r.kind === 'camp');
  const camp = () => rooms.find(r => r.kind === 'camp');

  function label() {
    if (inCamp()) return 'Deepward Camp';
    const r = active || sections[0]; if (!r) return '';
    return r.inf.stage.name + ' · ' + (r.inf.ri + 1) + '/' + r.inf.count + (r.inf.loop ? ' · depth ' + (r.inf.loop + 1) : '');
  }

  return {
    init, halt, update, constrain, inSpace, roomOf, route, label, info, enterCamp, startStage, startCustom, inCamp, camp,
    get active() { return active; }, get rooms() { return rooms; }, get sections() { return sections; }, get sides() { return sides; },
  };
})();
