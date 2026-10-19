// Deepward - the Rim: the open field outside Deepward Hold's south gate. A grassy stretch with a stream and a bridge,
// the Meadow (wolves and boars), Thornwood to the east (goblin scouts), the Old Graveyard to the west (the dead), and
// the Broken Ridge at the far end (the worst of them). Field.build returns a room-like object that World walks like the
// camp (one big rectangle and the road to the gate, with trees, rocks and stones as obstacles); Field.update keeps each
// zone stocked with beasts, which wander until the warden comes close and give up if led too far from home.
const Field = (() => {
  const F = CFG.field;
  let grassTex = null;
  function grass() {
    if (grassTex) return grassTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
    c.fillStyle = '#2e3a22'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) { const v = Math.random(); c.fillStyle = v < 0.45 ? 'rgba(70,96,46,0.6)' : v < 0.8 ? 'rgba(34,46,26,0.6)' : 'rgba(96,90,56,0.5)'; c.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 2 + Math.random() * 5); }
    grassTex = new THREE.CanvasTexture(cv); grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.encoding = THREE.sRGBEncoding;
    return grassTex;
  }

  function build(scene) {
    const HD = Camp.HD, [hw, depth] = F.size, z0 = HD + F.gap, z1 = z0 + depth;
    const group = new THREE.Group(); scene.add(group);
    const room = {
      i: -2, kind: 'field', group, mats: [], geos: [], texs: [], torches: [], pillars: [], keep: [], fade: 1, occl: 1, occluders: [], state: 'field',
      rect: { x0: -hw, x1: hw, z0, z1 }, corr: { x0: -2.6, x1: 2.6, z0: HD - 0.5, z1: z0 + 0.5 }, cx: 0, cz: (z0 + z1) / 2, hw, southZ: z1, northZ: z0,
      zones: F.zones.map(z => Object.assign({}, z, { x: z.x, z: z0 + z.z, next: 0, filled: false })),
    };
    const M = (c, o = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.95, flatShading: true }, o)); room.mats.push(m); return m; };
    const add = (geo, m, x, y, z, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; group.add(o); room.geos.push(geo); return o; };
    const block = (x, z, r) => room.pillars.push([x, z, r]);
    const torch = (x, y, z, color) => { const fm = new THREE.MeshBasicMaterial({ color }); room.mats.push(fm); room.keep.push(fm); const fl = add(new THREE.ConeGeometry(0.12, 0.4, 6), fm, x, y, z, false); room.torches.push({ pos: new THREE.Vector3(x, y + 0.4, z), fl, seed: Math.random() * 10, color }); };
    const R = (a, b) => a + Math.random() * (b - a);
    const zone = id => room.zones.find(z => z.id === id);
    const nearZone = (x, z, pad) => room.zones.some(q => Math.hypot(x - q.x, z - q.z) < q.r * pad);

    // Ground: grass over the whole field and well beyond it, the road up to the gate
    const gt = grass().clone(); gt.needsUpdate = true; gt.repeat.set(26, 24); room.texs.push(gt);
    const gs = HD + 0.9, ge = z1 + 30;                                       // from just outside the palisade (the Hold keeps its own ground)
    add(new THREE.PlaneGeometry(hw * 2 + 60, ge - gs).rotateX(-Math.PI / 2), M(0xffffff, { map: gt, flatShading: false }), 0, 0.02, (gs + ge) / 2, false);
    const road = M(0x2a2218, { roughness: 1 });
    add(new THREE.PlaneGeometry(3.6, F.gap + 24).rotateX(-Math.PI / 2), road, 0, 0.03, HD + (F.gap + 24) / 2, false);
    // The stream across the field, with a wooden bridge where the road crosses
    const sz = z0 + 42, water = M(0x2a5a7a, { roughness: 0.2, metalness: 0.3 });
    for (let x = -hw; x < hw; x += 6) add(new THREE.PlaneGeometry(6.4, 3 + Math.sin(x * 0.3) * 0.6).rotateX(-Math.PI / 2), water, x + 3, 0.04, sz + Math.sin(x * 0.12) * 2.5, false);
    const plank = M(0x6a4a2c);
    for (let k = -4; k <= 4; k++) add(new THREE.BoxGeometry(3.6, 0.1, 0.45), plank, 0, 0.15, sz + k * 0.5);
    for (const sd of [-1, 1]) add(new THREE.BoxGeometry(0.12, 0.6, 4.6), plank, sd * 1.8, 0.4, sz);

    // Trees: a dark wall around the edges, scattered pines and birches on the field, and the close-set Thornwood
    const pine = M(0x1e2a22), pine2 = M(0x26341f), trunk = M(0x2a1e14), birch = M(0xc8c0b0), leaf = M(0x4a6a2a);
    const tree = (x, z, s = 1, kind = 0) => {
      const h = (4 + Math.random() * 4) * s;
      if (kind === 1) { add(new THREE.CylinderGeometry(0.12, 0.16, h * 0.7, 5), birch, x, h * 0.35, z); add(new THREE.DodecahedronGeometry(1.2 * s, 0), leaf, x, h * 0.75, z); }
      else { add(new THREE.CylinderGeometry(0.2, 0.3, 1.2, 5), trunk, x, 0.6, z); add(new THREE.ConeGeometry((1.3 + Math.random()) * s, h, 6), Math.random() < 0.5 ? pine : pine2, x, 1 + h / 2, z); }
      block(x, z, 0.55 * s);
    };
    for (let i = 0; i < 90; i++) {                                         // the edge
      const t = Math.random(), side = Math.floor(Math.random() * 3);
      if (side === 0) tree(-hw - R(1, 10), z0 + t * depth, 1.2); else if (side === 1) tree(hw + R(1, 10), z0 + t * depth, 1.2); else tree(-hw + t * hw * 2, z1 + R(1, 10), 1.2);
    }
    for (let i = 0; i < 18; i++) { const x = R(-hw, hw), z = z0 - R(1, 8); if (Math.abs(x) > 26) tree(x, z, 1.1); }   // the wood beside the palisade
    for (let i = 0; i < 70; i++) {
      const x = R(-hw + 3, hw - 3), z = R(z0 + 4, z1 - 3);
      if (Math.abs(x) < 4 || Math.abs(z - sz) < 3 || nearZone(x, z, 0.75)) continue;
      tree(x, z, R(0.8, 1.1), Math.random() < 0.35 ? 1 : 0);
    }
    const wood = zone('wood');
    for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, r = R(4, wood.r + 6), x = wood.x + Math.sin(a) * r, z = wood.z + Math.cos(a) * r; if (Math.abs(x) < hw - 2 && z < z1 - 2) tree(x, z, R(0.9, 1.3)); }
    // Rocks, and tall grass in the Meadow
    const rock = M(0x6a6660);
    for (let i = 0; i < 40; i++) { const x = R(-hw + 2, hw - 2), z = R(z0 + 3, z1 - 2), s = R(0.4, 1.4); if (Math.abs(x) < 3) continue; const r = add(new THREE.DodecahedronGeometry(s, 0), rock, x, s * 0.4, z); r.rotation.set(R(0, 3), R(0, 3), 0); if (s > 0.7) block(x, z, s * 0.85); }
    const tuft = M(0x5a7a32);
    const mead = zone('meadow');
    for (let i = 0; i < 120; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * mead.r * 1.3; add(new THREE.ConeGeometry(0.12, R(0.4, 0.8), 4), tuft, mead.x + Math.sin(a) * r, 0.25, mead.z + Math.cos(a) * r, false); }
    // The Old Graveyard: a broken stone wall, leaning stones, a dead tree and a crypt door
    const gy = zone('graves'), grey = M(0x7a7a78), mossy = M(0x5a6a58);
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; if (k % 7 === 3) continue; add(new THREE.BoxGeometry(2.4, R(0.6, 1.1), 0.5), mossy, gy.x + Math.sin(a) * (gy.r + 1), 0.4, gy.z + Math.cos(a) * (gy.r + 1)).rotation.y = a; }
    for (let i = 0; i < 26; i++) {
      const x = gy.x + R(-gy.r * 0.8, gy.r * 0.8), z = gy.z + R(-gy.r * 0.8, gy.r * 0.8); if (Math.hypot(x - gy.x, z - gy.z) > gy.r * 0.85) continue;
      const st = add(new THREE.BoxGeometry(0.6, R(0.8, 1.3), 0.18), grey, x, 0.5, z); st.rotation.set(R(-0.2, 0.2), R(-0.4, 0.4), R(-0.2, 0.2)); block(x, z, 0.4);
    }
    add(new THREE.BoxGeometry(3, 2.6, 2.2), grey, gy.x, 1.3, gy.z - gy.r * 0.6); add(new THREE.BoxGeometry(1.2, 1.8, 0.1), M(0x0a0a0c), gy.x, 0.9, gy.z - gy.r * 0.6 + 1.12); block(gy.x - 0.8, gy.z - gy.r * 0.6, 1.3); block(gy.x + 0.8, gy.z - gy.r * 0.6, 1.3);
    const dead = M(0x3a3028); add(new THREE.CylinderGeometry(0.2, 0.35, 4, 5), dead, gy.x + 5, 2, gy.z + 3); for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.05, 0.1, 1.8, 4), dead, gy.x + 5 + Math.sin(k * 1.7) * 0.6, 3.2 + k * 0.2, gy.z + 3 + Math.cos(k * 1.7) * 0.6).rotation.set(Math.cos(k) * 0.9, 0, Math.sin(k * 1.7) * 0.9); block(gy.x + 5, gy.z + 3, 0.5);
    // The ruined watchtower on the Broken Ridge
    const rg = zone('ridge');
    for (const [dx, dz, h] of [[-1.5, -1.5, 6], [1.5, -1.5, 4.2], [-1.5, 1.5, 3], [1.5, 1.5, 5]]) add(new THREE.BoxGeometry(1, h, 1), grey, rg.x + 8 + dx, h / 2, rg.z - 6 + dz);
    block(rg.x + 8, rg.z - 6, 2.6);
    for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, r = R(rg.r * 0.5, rg.r + 4), s = R(1, 2.2); add(new THREE.DodecahedronGeometry(s, 0), rock, rg.x + Math.sin(a) * r, s * 0.5, rg.z + Math.cos(a) * r).rotation.y = a; block(rg.x + Math.sin(a) * r, rg.z + Math.cos(a) * r, s * 0.9); }
    // Lanterns along the road from the gate
    for (const z of [HD + 3, z0 + 8, z0 + 20]) for (const sd of [-1, 1]) { add(new THREE.CylinderGeometry(0.07, 0.08, 2, 6), trunk, sd * 2.6, 1, z); torch(sd * 2.6, 2, z, 0xffb060); block(sd * 2.6, z, 0.25); }
    // Zone markers: a weathered sign at each zone's edge facing the road
    const sign = M(0x6a4a2c);
    for (const q of room.zones) { const a = Math.atan2(-q.x, room.cz - q.z), x = q.x + Math.sin(a) * (q.r + 1.5), z = q.z + Math.cos(a) * (q.r + 1.5); add(new THREE.BoxGeometry(0.1, 1.5, 0.1), trunk, x, 0.75, z); add(new THREE.BoxGeometry(0.9, 0.4, 0.06), sign, x, 1.35, z).rotation.y = a; }
    Rig.bake(group, false, room.keep);
    // Herb patches and ore veins to gather (kept apart from the baked meshes: they vanish when picked and grow back)
    room.nodes = [];
    const herbM = M(0x6aa83a), flowerM = new THREE.MeshBasicMaterial({ color: 0xd8f070 }), oreM = M(0x5a5a5e), veinM = new THREE.MeshBasicMaterial({ color: 0xd88a4a });
    room.mats.push(flowerM, veinM);
    const N = F.nodes;
    for (const [kind, n] of [['herb', N.herb], ['ore', N.ore]]) for (let k = 0, tries = 0; k < n && tries < 400; tries++) {
      const x = R(-hw + 4, hw - 4), z = R(z0 + 6, z1 - 4);
      if (Math.abs(x) < 4 || room.pillars.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr + 1.2) || room.nodes.some(q => Math.hypot(q.x - x, q.z - z) < 6)) continue;
      const g = new THREE.Group(); g.position.set(x, 0, z); group.add(g);
      if (kind === 'herb') for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2; const st = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 4), herbM); st.position.set(Math.sin(a) * 0.2, 0.25, Math.cos(a) * 0.2); g.add(st); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), flowerM); fl.position.set(Math.sin(a) * 0.2, 0.52, Math.cos(a) * 0.2); g.add(fl); room.geos.push(st.geometry, fl.geometry); }
      else { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), oreM); r.position.y = 0.3; r.castShadow = true; g.add(r); room.geos.push(r.geometry); for (let j = 0; j < 4; j++) { const v = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), veinM); v.position.set(Math.sin(j * 1.6) * 0.45, 0.35 + (j % 2) * 0.2, Math.cos(j * 1.6) * 0.45); g.add(v); room.geos.push(v.geometry); } room.pillars.push([x, z, 0.6]); }
      room.nodes.push({ kind, x, z, g, ready: true, t: 0 }); k++;
    }
    return room;
  }

  // How tough the Rim is: zone by zone, and growing with the warden's progress below
  function multOf(z) { const S = Items.S, k = Math.min(S ? S.stage : 0, CFG.stages.length - 1); return { mult: z.mult * (1 + CFG.stageScale * k * 0.6), hpMult: 1 + CFG.stageHp * k * 0.6 }; }
  // A free spot in a zone, away from the hero (beasts do not appear under the warden's nose)
  function spotIn(room, z, hero) {
    for (let k = 0; k < 12; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * z.r, x = z.x + Math.sin(a) * r, zz = z.z + Math.cos(a) * r;
      if (hero && Math.hypot(x - hero.x, zz - hero.z) < 10) continue;
      if (room.pillars.some(([px, pz, pr]) => Math.hypot(x - px, zz - pz) < pr + 0.8)) continue;
      if (x < room.rect.x0 + 1 || x > room.rect.x1 - 1 || zz < room.rect.z0 + 1 || zz > room.rect.z1 - 1) continue;
      return new THREE.Vector3(x, 0, zz);
    }
    return null;
  }
  // Keep each zone stocked while the warden is anywhere near it; beasts far behind are let go (they come back later)
  function update(room, dt, p) {
    for (const n of room.nodes) if (!n.ready && (n.t -= dt) <= 0) { n.ready = true; n.g.visible = true; }
    if (!p || G.state !== 'play' || G.training) return;
    const here = p.pos.z > room.rect.z0 - 3;
    const night = G.isNight ? G.isNight() : false;
    for (const z of room.zones) {
      // The dead keep to the night: at dawn they crumble back into their graves
      if (z.night && !night) { for (const e of G.enemies) if (e.zone === z && e.state !== 'dead' && !e.fieldBoss) { e.remove = true; FX.burst(Combat.chestPos(e.pos, 1), 0xd8cfb4, 14, 4, 0.5); } G.queue = G.queue.filter(q => q.zone !== z); continue; }
      const cap = night && z.nightCap ? z.nightCap : z.cap, mobs = night && z.nightMobs ? z.nightMobs : z.mobs;
      const alive = G.enemies.filter(e => e.zone === z && e.state !== 'dead' && !e.fieldBoss).length + G.queue.filter(q => q.zone === z && !q.fieldBoss).length;
      const near = here && Math.hypot(p.pos.x - z.x, p.pos.z - z.z) < z.r + 25;
      if (!near) continue;
      if (alive >= cap) { z.filled = true; continue; }
      if (G.time < z.next) continue;
      const at = spotIn(room, z, p.pos); if (!at) continue;
      const type = mobs[Math.floor(Math.random() * mobs.length)], m = multOf(z);
      G.queue.push({ type, at, mult: m.mult, hpMult: m.hpMult, zone: z, t: G.time });
      z.next = G.time + (z.filled ? z.respawn : 0.25);
    }
    // Field bosses: each in its zone at its time of day, back a while (real time) after it falls
    const S = Items.S; S.fieldBoss = S.fieldBoss || {};
    for (const B of F.bosses) {
      const z = room.zones.find(q => q.id === B.zone), up = B.when === 'any' || (B.when === 'night' ? night : !night);
      const alive = G.enemies.find(e => e.fieldBoss === B && e.state !== 'dead'), queued = G.queue.some(q => q.fieldBoss === B);
      if (alive && !up && !alive.aggro) { alive.remove = true; continue; }           // gone with the dawn (or the dusk)
      if (alive || queued || !up || Date.now() < (S.fieldBoss[B.id] || 0)) continue;
      if (Math.hypot(p.pos.x - z.x, p.pos.z - z.z) > z.r + 25 || !here) continue;
      const at = spotIn(room, z, p.pos); if (!at) continue;
      const m = multOf(z); G.queue.push({ type: B.type, at, mult: m.mult, hpMult: m.hpMult, zone: z, fieldBoss: B, t: G.time });
    }
    // Beasts left far behind (or the warden back in the Hold) are let go
    for (const e of G.enemies) if (e.zone && e.state !== 'dead' && (!here || Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) > 70)) { e.remove = true; if (G.lock === e) G.lock = null; }
    // ...and no beast follows the warden through the gate
    for (const e of G.enemies) if (e.zone && e.pos.z < room.rect.z0 + 0.5) { e.pos.z = room.rect.z0 + 0.5; if (e.aggro && p.pos.z < room.rect.z0 - 1) { e.aggro = false; e.wanderT = 0; } }
  }
  // A ready herb patch or ore vein within reach of the hero, as a spot to interact with
  function nearest(room, pos) {
    let best = null, bd = 1.8;
    for (const n of room.nodes) { if (!n.ready) continue; const d = Math.hypot(pos.x - n.x, pos.z - n.z); if (d < bd) { bd = d; best = n; } }
    return best && { id: 'gather', node: best, name: best.kind === 'herb' ? 'Herbs' : 'Iron ore', verb: best.kind === 'herb' ? 'Gather' : 'Mine', x: best.x, z: best.z };
  }
  // Pick it: one to three of the material, and it grows back in a while
  function gather(node) {
    if (!node.ready) return 0;
    const n = 1 + Math.floor(Math.random() * (node.kind === 'herb' ? 3 : 2));
    Items.addMat(node.kind, n); node.ready = false; node.t = F.nodes.regrow; node.g.visible = false;
    return n;
  }
  // The zone the hero stands in (for the label and the map)
  function zoneAt(room, pos) { return room.zones.find(z => Math.hypot(pos.x - z.x, pos.z - z.z) < z.r + 2) || null; }
  return { build, update, zoneAt, multOf, nearest, gather };
})();
