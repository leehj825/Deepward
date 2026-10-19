// Deepward - the dungeon: a chain of rooms heading north (-Z), joined by short corridors closed by portcullis gates.
// Only the room you are in and the one ahead exist at a time. Clearing a room raises its far gate and the next room
// fades in out of the dark; stepping into it drops the gate behind you, and the room you left fades out and is unloaded.
// States of a room: ahead (built, not entered) -> start (a short breath) -> fight (waves) -> cleared.
const World = (() => {
  const CORR_LEN = 7, DOOR = 1.6, WALL_H = 3.4, N_LIGHTS = 6;
  let scene, hemi, rooms = [], nextIndex = 0, cursorZ = 6, lights = [], fogTo = null, hemiTo = null, active = null;
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

  // ---------------- Building a room ----------------
  function build(i) {
    const inf = info(i), def = inf.room, th = CFG.themes[inf.stage.theme], T = themeTex(inf.stage.theme);
    const [hw, hd] = def.size, southZ = cursorZ, northZ = southZ - hd * 2, cz = southZ - hd;
    cursorZ = northZ - CORR_LEN;
    const group = new THREE.Group(); scene.add(group);
    const room = {
      i, inf, th, hw, hd, southZ, northZ, cz, group, mats: [], geos: [], texs: [], torches: [], pillars: [],
      fade: 0, fadeDir: 1, occl: 1, state: 'ahead', t: 0, wave: 0, waveDelay: 0,
      rect: { x0: -hw, x1: hw, z0: northZ, z1: southZ },
      // The corridor south of the room overlaps both rooms by a metre so you can walk from one rectangle into the next
      corr: i > 0 ? { x0: -DOOR + 0.1, x1: DOOR - 0.1, z0: southZ - 1, z1: southZ + CORR_LEN + 1 } : null,
    };
    const M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9, flatShading: true }, o)); m.userData.op = o.opacity === undefined ? 1 : o.opacity; room.mats.push(m); return m; };
    const add = (geo, m, x, y, z, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; group.add(o); room.geos.push(geo); return o; };
    const texFor = (t, rx, ry) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); room.texs.push(c); return c; };

    // Floor (room + corridor)
    const floorM = M(0xffffff, { map: texFor(T.floor, (hw * 2 + 2) / 4, (hd * 2 + 2) / 4), roughness: 0.95, flatShading: false });
    add(new THREE.PlaneGeometry(hw * 2 + 2, hd * 2 + 2).rotateX(-Math.PI / 2), floorM, 0, 0, cz, false);
    if (room.corr) {
      const cm = M(0xffffff, { map: texFor(T.floor, (DOOR * 2 + 2) / 4, CORR_LEN / 4), roughness: 0.95, flatShading: false });
      add(new THREE.PlaneGeometry(DOOR * 2 + 2, CORR_LEN).rotateX(-Math.PI / 2), cm, 0, 0.001, southZ + CORR_LEN / 2, false);
    }

    // Walls: brick boxes whose texture repeats by size
    const wallM = M(0xffffff, { map: T.wall, roughness: 0.95, flatShading: false }), trimM = M(rgbHex(th.wall, -8));
    function wallBox(w, h, d, x, y, z, m = wallM) {
      const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
      const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const n = f * 4 + k; uv.setXY(n, uv.getX(n) * dims[f][0] / 3, uv.getY(n) * dims[f][1] / 3); }
      return add(g, m, x, y, z);
    }
    const seg = hw + 1 - DOOR;
    wallBox(1, WALL_H, hd * 2 + 2, -hw - 0.5, WALL_H / 2, cz); wallBox(1, WALL_H, hd * 2 + 2, hw + 0.5, WALL_H / 2, cz);
    for (const s of [-1, 1]) wallBox(seg, WALL_H, 1, s * (DOOR + seg / 2), WALL_H / 2, northZ - 0.5);
    wallBox(DOOR * 2, WALL_H - 2.9, 1, 0, 2.9 + (WALL_H - 2.9) / 2, northZ - 0.5);
    // The south wall stays low so the high camera can see in; posts and a lintel frame its gate
    for (const s of [-1, 1]) {
      wallBox(seg, 0.7, 1, s * (DOOR + seg / 2), 0.35, southZ + 0.5);
      wallBox(0.5, 3.1, 1.1, s * (DOOR + 0.25), 1.55, southZ + 0.5, trimM);
    }
    wallBox(DOOR * 2 + 1, 0.45, 1.1, 0, 3.1, southZ + 0.5, trimM);
    if (room.corr) for (const s of [-1, 1]) wallBox(1, WALL_H, CORR_LEN, s * (DOOR + 0.5), WALL_H / 2, southZ + CORR_LEN / 2);

    // Portcullis gates at both doorways
    const iron = M(0x2a2a2e, { roughness: 0.6, metalness: 0.6 }), ironS = M(0x2a2a2e, { roughness: 0.6, metalness: 0.6 });
    function gate(z, iron) {
      const g = new THREE.Group(); g.position.set(0, 0, z); group.add(g);
      const bar = new THREE.BoxGeometry(0.07, 2.9, 0.07), rail = new THREE.BoxGeometry(DOOR * 2, 0.08, 0.08), spike = new THREE.ConeGeometry(0.05, 0.16, 4);
      room.geos.push(bar, rail, spike);
      for (let k = -5; k <= 5; k++) {
        const b = new THREE.Mesh(bar, iron); b.position.set(k * DOOR / 5.5, 1.45 + 0.08, 0); b.castShadow = true; g.add(b);
        const sp = new THREE.Mesh(spike, iron); sp.position.set(k * DOOR / 5.5, 0.05, 0); sp.rotation.x = Math.PI; g.add(sp);
      }
      for (const y of [0.7, 1.7, 2.7]) { const r = new THREE.Mesh(rail, iron); r.position.y = y; g.add(r); }
      return { g, open: false, y: 0 };
    }
    room.gateS = gate(southZ + 0.5, ironS); room.gateN = gate(northZ - 0.5, iron);
    // The south doorway (frame and gate) turns see-through while the camera is behind it
    room.occluders = [trimM, ironS];

    // Pillar stumps
    if (def.pillars) {
      const stone = M(rgbHex(th.wall, 14));
      for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = px * hw * 0.55, z = cz + pz * hd * 0.45, h = 1.2 + Math.random() * 0.8;
        add(new THREE.BoxGeometry(1.7, 0.35, 1.7), stone, x, 0.175, z);
        add(new THREE.CylinderGeometry(CFG.pillarR * 0.85, CFG.pillarR * 0.95, h, 8), stone, x, 0.35 + h / 2, z);
        add(new THREE.CylinderGeometry(CFG.pillarR * 0.6, CFG.pillarR * 0.85, 0.35, 8), stone, x + 0.1, 0.5 + h, z).rotation.z = 0.25;
        add(new THREE.DodecahedronGeometry(0.35, 0), stone, x + 0.9, 0.25, z + 0.6);
        room.pillars.push([x, z]);
      }
    }

    // Torches: on the side walls and either side of the far gate, plus a pair in the corridor
    const flameM = new THREE.MeshBasicMaterial({ color: th.torch }); room.mats.push(flameM);
    const stickM = M(0x3a2a1a);
    function torch(x, z, ry) {
      const g = new THREE.Group(); g.position.set(x, 2.2, z); g.rotation.y = ry; group.add(g);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 6), stickM); st.position.set(0, 0, 0.25); st.rotation.x = 0.6; g.add(st);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 6), flameM); fl.position.set(0, 0.28, 0.4); g.add(fl);
      room.geos.push(st.geometry, fl.geometry);
      const pos = new THREE.Vector3(x + Math.sin(ry) * 0.6, 2.6, z + Math.cos(ry) * 0.6);
      room.torches.push({ pos, fl, seed: Math.random() * 10, color: th.torch });
    }
    for (const s of [-1, 1]) {
      torch(s * (hw - 0.05), cz - hd * 0.45, -s * Math.PI / 2); torch(s * (hw - 0.05), cz + hd * 0.45, -s * Math.PI / 2);
      torch(s * (DOOR + 1.4), northZ + 0.05, 0);
    }
    if (room.corr) torch(-(DOOR - 0.05), southZ + CORR_LEN / 2, Math.PI / 2);

    // Scattered decor in the theme of the stage
    const decorM = th.decor === 'bones' ? M(0xcfc6aa) : th.decor === 'crates' ? M(0x6a4a2c) : th.decor === 'court' ? M(0x8a8690) : M(rgbHex(th.wall, 4));
    const decorM2 = M(rgbHex(th.wall, -6));
    const webM = M(0xd8d8e8, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }), goldM = M(0xc9a23a, { metalness: 0.6, roughness: 0.4 });
    const candleM = new THREE.MeshBasicMaterial({ color: 0xfff0c0 }); room.mats.push(candleM);
    for (let k = 0; k < Math.round(hw * hd * 0.35); k++) {
      const x = (Math.random() * 2 - 1) * (hw - 0.8), z = cz + (Math.random() * 2 - 1) * (hd - 0.8);
      if (Math.abs(x) < DOOR + 0.6) continue;                             // keep the walkway between the gates clear
      if (room.pillars.some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.4)) continue;
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

    setFade(room, 0);
    rooms.push(room);
    nextIndex = i + 1;
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

  // ---------------- Walkable space ----------------
  const roomAt = i => rooms.find(r => r.i === i);
  function corrOpen(r) { const prev = roomAt(r.i - 1); return r.corr && r.gateS.open && prev && prev.gateN && prev.gateN.open; }
  function walkRects() {
    const out = [];
    for (const r of rooms) { out.push(r.rect); if (corrOpen(r)) out.push(r.corr); }
    return out;
  }
  // Keep a body (position, radius) inside the walkable space; enemies pass their own room to stay in it
  function constrain(pos, rad, room) {
    const rs = room ? [room.rect] : walkRects();
    let bx = pos.x, bz = pos.z, bd = Infinity;
    for (const q of rs) {
      const x = Math.max(q.x0 + rad, Math.min(q.x1 - rad, pos.x)), z = Math.max(q.z0 + rad, Math.min(q.z1 - rad, pos.z));
      const d = (x - pos.x) ** 2 + (z - pos.z) ** 2;
      if (d < bd) { bd = d; bx = x; bz = z; if (d === 0) break; }
    }
    pos.x = bx; pos.z = bz;
    for (const r of rooms) for (const [px, pz, pr] of r.pillars) {
      const dx = pos.x - px, dz = pos.z - pz, d = Math.hypot(dx, dz), min = (pr || CFG.pillarR) + rad;
      if (d < min && d > 1e-4) { pos.x = px + dx / d * min; pos.z = pz + dz / d * min; }
    }
  }
  // Is a camera position inside the built space (rooms and corridors, gates ignored)?
  function inSpace(x, z, pad = 0.5) {
    for (const r of rooms) {
      for (const q of r.corr ? [r.rect, r.corr] : [r.rect]) if (x > q.x0 - pad && x < q.x1 + pad && z > q.z0 - pad && z < q.z1 + pad) return true;
    }
    return false;
  }
  // The room whose floor the given point is on (null in a corridor)
  function roomOf(pos) { return rooms.find(r => pos.z <= r.southZ && pos.z >= r.northZ) || null; }

  // ---------------- Encounters ----------------
  function spawnWave(room) {
    const list = room.inf.room.waves[room.wave], p = G.player;
    const mult = 1 + room.inf.loop * CFG.loopScale;
    // Spawn spots: across the far two thirds of the room, away from the hero and the pillars
    const spots = [];
    for (let gx = -2; gx <= 2; gx++) for (let gz = 0; gz < 3; gz++) {
      const x = gx / 2 * (room.hw - 1.8), z = room.northZ + 1.8 + gz * (room.hd * 2 - 3.6) / 3;
      if (Math.hypot(x - p.pos.x, z - p.pos.z) < 5) continue;
      if (room.pillars.some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.6)) continue;
      spots.push(new THREE.Vector3(x, 0, z));
    }
    spots.sort(() => Math.random() - 0.5);
    list.forEach((type, k) => {
      const guardian = room.inf.room.guardian && room.wave === 0 && k === 0;
      G.queue.push({ type, at: spots[k % spots.length] || new THREE.Vector3(0, 0, room.cz - 2), mult: mult * (guardian ? CFG.guardianMult : 1), guardian: guardian && room.inf.stage.guardian, room, t: G.time + 0.3 + k * 0.45 });
      if (!G.seen[type]) { G.seen[type] = true; showTip(CFG.tips[type]); }
    });
    if (room.wave > 0) banner('MORE COME');
  }

  function enter(room) {
    const prev = roomAt(room.i - 1);
    room.state = 'start'; room.t = 0;
    room.gateS.open = false; if (prev) prev.gateN.open = false;
    Snd.play('gate');
    if (prev) prev.fadeDir = -1;                                          // the room behind fades out and is unloaded
    active = room;
    const inf = room.inf;
    if (inf.ri === 0) {
      banner(inf.stage.name.toUpperCase() + (inf.loop ? '  ·  DEPTH ' + (inf.loop + 1) : ''));
      fogTo = new THREE.Color(room.th.fog); hemiTo = new THREE.Color(room.th.hemi);
    } else if (inf.room.guardian) banner(inf.stage.guardian.toUpperCase());
    else banner('ROOM ' + (inf.ri + 1) + ' / ' + inf.count);
  }

  function clearRoom(room) {
    room.state = 'cleared';
    const p = G.player; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * CFG.roomHeal);
    G.stats.rooms++;
    const guardian = !!room.inf.room.guardian;
    addChest(room, guardian);
    banner(guardian ? 'STAGE CLEARED' : 'ROOM CLEARED');
    if (guardian) return;                                                 // the hero chooses: back to camp, or press on (pressOn)
    pressOn(room);
  }
  // Raise the far gate and let the next room fade in beyond it
  function pressOn(room = active) {
    if (!room || room.kind === 'camp') return;
    const nx = build(nextIndex);
    room.gateN.open = true; nx.gateS.open = true;
    Snd.play('gate');
  }

  // A chest left in the middle of each cleared room; the guardian's is bigger
  function addChest(room, big) {
    const g = new THREE.Group(), s = big ? 1.35 : 1, x = -Math.min(room.hw - 2, 3.6); g.position.set(x, 0, room.cz); g.rotation.y = Math.PI / 2; g.scale.setScalar(s); room.group.add(g);
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4424, roughness: 0.85, flatShading: true }), band = new THREE.MeshStandardMaterial({ color: big ? 0xd9a92a : 0x6a6d75, roughness: 0.4, metalness: 0.6, flatShading: true });
    room.mats.push(wood, band);
    const add = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); room.geos.push(geo); return o; };
    add(new THREE.BoxGeometry(0.9, 0.5, 0.6), wood, 0, 0.25, 0);
    for (const x of [-0.35, 0.35]) add(new THREE.BoxGeometry(0.08, 0.52, 0.62), band, x, 0.25, 0);
    const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3); g.add(lid);
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), wood, 0, 0, 0.3, lid);
    add(new THREE.BoxGeometry(0.12, 0.14, 0.05), band, 0, -0.02, 0.62, lid);
    room.chest = { g, lid, big, opened: false, x, z: room.cz, t: 0 };
    room.pillars.push([x, room.cz, 0.55 * s]);
    FX.glint(new THREE.Vector3(x, 0.9, room.cz), big ? 0xffd040 : 0xfff0c0, 2, 0.6);
  }

  // ---------------- Per-frame ----------------
  function update(dt, cam) {
    const p = G.player;
    for (const r of rooms.slice()) {
      if (r.fadeDir > 0 && r.fade < 1) setFade(r, Math.min(1, r.fade + dt / CFG.fadeTime));
      if (r.fadeDir < 0) { setFade(r, Math.max(0, r.fade - dt / CFG.fadeTime)); if (r.fade <= 0) { dispose(r); continue; } }
      if (r.kind === 'camp') { Camp.update(r, dt, p && p.pos); continue; }
      if (r.chest) {
        const c = r.chest;
        if (!c.opened && p && p.state !== 'dead' && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < 1.7) { c.opened = true; Snd.play('gate'); G.onChest(r); }
        if (c.opened && c.t < 1) { c.t = Math.min(1, c.t + dt * 2.5); c.lid.rotation.x = -1.9 * c.t; }
      }
      const behind = cam && cam.z > r.southZ + 0.2 && Math.abs(cam.x) < r.hw + 1;
      r.occl += ((behind ? 0.15 : 1) - r.occl) * Math.min(1, dt * 8);
      for (const m of r.occluders) {
        const o = r.fade * r.occl, see = o < 0.999;
        m.opacity = o; if (m.transparent !== see) { m.transparent = see; m.needsUpdate = true; }
      }
      for (const gt of [r.gateS, r.gateN]) { gt.y += ((gt.open ? 2.75 : 0) - gt.y) * Math.min(1, dt * (gt.open ? 2.2 : 9)); gt.g.position.y = gt.y; }
    }
    if (p && G.state === 'play') {
      const ahead = rooms.find(r => r.state === 'ahead' && r.i > 0);
      if (ahead && p.pos.z < ahead.southZ - 1.2) enter(ahead);
      const a = active;
      if (a) {
        a.t += dt;
        if (a.state === 'start' && a.t > 0.9) { a.state = 'fight'; a.wave = 0; spawnWave(a); }
        else if (a.state === 'fight') {
          const alive = G.enemies.some(e => e.state !== 'dead') || G.queue.length;
          if (!alive) {
            if (a.wave < a.inf.room.waves.length - 1) { a.waveDelay += dt; if (a.waveDelay > 1.2) { a.waveDelay = 0; a.wave++; spawnWave(a); } }
            else if (p.state !== 'dead') clearRoom(a);
          }
        }
      }
    }
    // Colours drift toward the new stage's fog and ambient light
    if (fogTo) { scene.fog.color.lerp(fogTo, Math.min(1, dt * 1.2)); scene.background.copy(scene.fog.color); }
    if (hemiTo) hemi.color.lerp(hemiTo, Math.min(1, dt * 1.2));
    updateLights(p ? p.pos : new THREE.Vector3(0, 0, 2));
  }

  // A fixed pool of point lights follows the torches nearest the hero (so the shader never recompiles as rooms come and go)
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
  // Tear everything down and build the entrance room (fully visible, gates shut)
  function reset() {
    for (const r of rooms.slice()) dispose(r);
    cursorZ = 6; nextIndex = 0; active = null;
    const r0 = build(0); setFade(r0, 1);
    applyTheme(r0.th);
    return r0;
  }
  function halt() { active = null; }
  function applyTheme(th) { scene.fog.color.setHex(th.fog); scene.background.setHex(th.fog); hemi.color.setHex(th.hemi); fogTo = hemiTo = null; }
  // Swap everything for the camp; returns where the hero should stand
  function enterCamp(levels) {
    for (const r of rooms.slice()) dispose(r);
    active = null;
    rooms.push(Camp.build(scene, levels || Items.S.camp));
    applyTheme(CFG.themes.camp);
    return Camp.spawn;
  }
  // Swap everything for the first room of stage k (running index: 3 stages per depth); returns the hero's start
  function startStage(k) {
    for (const r of rooms.slice()) dispose(r);
    const S = CFG.stages, per = S.reduce((n, s) => n + s.rooms.length, 0), loop = Math.floor(k / S.length), si = k % S.length;
    let idx = loop * per; for (let j = 0; j < si; j++) idx += S[j].rooms.length;
    cursorZ = 6; nextIndex = idx;
    const r = build(idx); setFade(r, 1); applyTheme(r.th);
    active = r; r.state = 'start'; r.t = 0;
    banner(r.inf.stage.name.toUpperCase() + (r.inf.loop ? '  ·  DEPTH ' + (r.inf.loop + 1) : ''));
    return { x: 0, z: r.southZ - 3, facing: Math.PI };
  }
  const inCamp = () => rooms.some(r => r.kind === 'camp');
  const camp = () => rooms.find(r => r.kind === 'camp');                                     // tests: stop the dungeon sending enemies
  function begin() { const r0 = roomAt(0); active = r0; r0.state = 'start'; r0.t = 0; banner(r0.inf.stage.name.toUpperCase()); }

  function label() {
    if (inCamp()) return 'Deepward Camp';
    const r = active || roomAt(0); if (!r) return '';
    return r.inf.stage.name + ' · ' + (r.inf.ri + 1) + '/' + r.inf.count + (r.inf.loop ? ' · depth ' + (r.inf.loop + 1) : '');
  }

  return {
    init, reset, begin, halt, update, constrain, inSpace, roomOf, label, info, enterCamp, startStage, pressOn, inCamp, camp,
    get active() { return active; }, get rooms() { return rooms; },
  };
})();
