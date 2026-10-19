// Deepward - what fills a stage besides monsters: breakable pots and crates (gold, now and then a flask), traps in the
// passages (spike plates that peek before they strike; blades swinging across the way), and shrines where the hero
// prays for one of three blessings that last until the stage is left. World builds them into a section's group;
// this module keeps them working.
const Props = (() => {
  const F = CFG.features;
  let pots = [], traps = [], shrines = [], mimics = [];
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, flatShading: true }, o));
  const put = (parent, geo, m, x, y, z, cast = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o; };
  function clear() { pots = []; traps = []; shrines = []; mimics = []; }

  // ---------------- Breakables ----------------
  // Along the walls, off the path and away from pillars and doorways
  function breakables(room) {
    const n = F.breakables[0] + Math.floor(Math.random() * (F.breakables[1] - F.breakables[0] + 1));
    const clay = mat(room.th.decor === 'crates' ? 0x6a4a2c : 0x8a5a3a), wood = mat(0x6a4a2c), dark = mat(0x3a2a1e);
    for (let k = 0, tries = 0; k < n && tries < 40; tries++) {
      const side = Math.random() < 0.5 ? -1 : 1, lx = side * (room.hw - 0.9 - Math.random() * 1.4), z = room.cz + (Math.random() * 2 - 1) * (room.hd - 1.2);
      const x = room.cx + lx;
      if (!room.offPath(lx, z) || room.pillars.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < (pr || CFG.pillarR) + 1)) continue;
      if (pots.some(q => Math.hypot(q.x - x, q.z - z) < 1.1) || (room.sideDoor && Math.abs(z - room.sideDoor.z) < 2.6)) continue;
      const g = new THREE.Group(); g.position.set(lx, 0, z); room.group.add(g);
      const crate = Math.random() < 0.35;
      if (crate) { put(g, new THREE.BoxGeometry(0.7, 0.7, 0.7), wood, 0, 0.35, 0).rotation.y = Math.random(); put(g, new THREE.BoxGeometry(0.74, 0.08, 0.74), dark, 0, 0.5, 0); }
      else {
        put(g, new THREE.CylinderGeometry(0.2, 0.17, 0.12, 8), clay, 0, 0.06, 0);
        put(g, new THREE.SphereGeometry(0.3, 8, 6), clay, 0, 0.38, 0).scale.y = 1.15;
        put(g, new THREE.CylinderGeometry(0.13, 0.16, 0.18, 8), clay, 0, 0.74, 0);
      }
      pots.push({ g, room, x, z, r: crate ? 0.5 : 0.38, crate, broken: false });
      k++;
    }
  }
  function smash(q) {
    q.broken = true; q.room.group.remove(q.g);
    const at = new THREE.Vector3(q.x, 0.5, q.z);
    FX.burst(at, q.crate ? 0x8a6a40 : 0xa06a44, 16, 5, 0.7); Snd.play(q.crate ? 'guardBreak' : 'hit');
    if (G.mode !== 'dungeon' || !Items.S) return;
    const p = G.player, r = Math.random();
    if (Math.random() < CFG.gear.gemDrop.pot) { const k = Items.randomGem(); Items.addGem(k); FX.text(at.clone().setY(2.0), CFG.gear.gems[k].icon + ' ' + CFG.gear.gems[k].name, 'gold'); }
    if (r < F.potFlask && p.flasks < p.S.flasks) { p.flasks++; FX.text(at.clone().setY(1.6), '+1 ⚗', 'heal'); Snd.play('wave'); }
    else if (r < F.potFlask + F.potGoldChance) {
      const g = Items.addGold((F.potGold[0] + Math.random() * (F.potGold[1] - F.potGold[0])) * (1 + G.stageK * 0.5) * p.S.goldFind);
      FX.text(at.clone().setY(1.6), '+' + g + ' ◆', 'gold');
    }
  }
  // The hero's swing: pots and crates in its arc break. Returns how many.
  function strike(p, atk) {
    let n = 0;
    for (const q of pots) if (!q.broken && Combat.inArc(p.pos, p.facing, q, atk.range, atk.arc, q.r)) { smash(q); n++; }
    return n;
  }

  // ---------------- Traps ----------------
  // A spike plate across a passage at z, or a blade swinging across it
  function trap(room, kind, z, x0 = room.doorS, w = 3.6, L = 2.4) {
    const lx = x0 - room.cx, iron = mat(0x3a3a40, { roughness: 0.5, metalness: 0.6 }), steel = mat(0xb8bec8, { roughness: 0.3, metalness: 0.8 });
    if (kind === 'spikes') {
      put(room.group, new THREE.BoxGeometry(w, 0.06, L), iron, lx, 0.03, z, false);
      const holes = mat(0x101012); put(room.group, new THREE.PlaneGeometry(w - 0.3, L - 0.3).rotateX(-Math.PI / 2), holes, lx, 0.065, z, false);
      const sp = new THREE.Group(); sp.position.set(lx, -0.45, z); room.group.add(sp);
      const cone = new THREE.ConeGeometry(0.06, 0.5, 4);
      const nx = Math.max(2, Math.round(w / 0.55)), nz = Math.max(2, Math.round(L / 0.55));
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) put(sp, cone, steel, (i / (nx - 1) - 0.5) * (w - 0.4), 0.25, (j / (nz - 1) - 0.5) * (L - 0.4), false);
      Rig.bake(sp);
      const t = { kind, room, x: x0, z, w, L, sp, steel, phase: 'idle', t: Math.random() * F.spikes.idle, hit: new Set() };
      traps.push(t); return t;
    }
    // Blade: hangs from a beam, swings across the passage (along x)
    const pivot = new THREE.Group(); pivot.position.set(lx, 3.3, z); room.group.add(pivot);
    put(room.group, new THREE.BoxGeometry(w + 0.6, 0.25, 0.3), iron, lx, 3.35, z, false);
    const Lr = 2.5;
    put(pivot, new THREE.CylinderGeometry(0.04, 0.04, Lr, 6), iron, 0, -Lr / 2, 0);
    // a half moon, its sharp curve hanging down, flat side across the passage
    put(pivot, new THREE.CylinderGeometry(0.8, 0.8, 0.06, 18, 1, false, -Math.PI / 2, Math.PI), steel, 0, -Lr + 0.05, 0).rotation.x = Math.PI / 2;
    const t = { kind, room, x: x0, z, w, Lr, pivot, steel, t: Math.random() * F.blade.period, cd: 0, whoosh: 0 };
    traps.push(t); return t;
  }
  const dmgMult = () => 1 + Math.floor((G.stageK || 0) / CFG.stages.length) * CFG.loopScale + (G.stageK || 0) % CFG.stages.length * 0.12;
  function hurt(t, from, dmg) {
    const p = G.player;
    if (!p || p.state === 'dead' || G.mode !== 'dungeon') return;
    Player.receive(p, { pos: from, mult: dmgMult() }, { dmg, posture: 0, unblockable: true, aoe: true });
  }
  function updateTraps(dt) {
    const p = G.player;
    for (const t of traps) {
      t.t += dt;
      if (t.kind === 'spikes') {
        const S = F.spikes, near = p && Math.abs(p.pos.x - t.x) < t.w / 2 + 0.2 && Math.abs(p.pos.z - t.z) < t.L / 2 + 0.2;
        if (t.phase === 'idle' && t.t > S.idle) { t.phase = 'warn'; t.t = 0; if (p && Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < 8) Snd.play('glint'); }
        else if (t.phase === 'warn' && t.t > S.warn) { t.phase = 'up'; t.t = 0; t.hit.clear(); if (p && Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < 10) Snd.play('spikes'); }
        else if (t.phase === 'up' && t.t > S.up) { t.phase = 'idle'; t.t = 0; }
        const want = t.phase === 'warn' ? -0.33 : t.phase === 'up' ? 0.02 : -0.45;
        t.sp.position.y += (want - t.sp.position.y) * Math.min(1, dt * (t.phase === 'up' ? 30 : 10));
        t.steel.emissive.setHex(t.phase === 'warn' ? 0xff2a10 : 0x000000).multiplyScalar(t.phase === 'warn' ? 0.6 : 0);
        if (t.phase === 'up' && near && !t.hit.has('p')) { t.hit.add('p'); hurt(t, new THREE.Vector3(t.x, 0, t.z + (p.pos.z > t.z ? -2 : 2)), S.dmg); }
      } else {
        const B = F.blade, th = Math.sin(t.t / B.period * Math.PI * 2) * 1.15, bx = t.x + Math.sin(th) * t.Lr, by = 3.3 - Math.cos(th) * t.Lr;
        t.pivot.rotation.z = th;
        t.cd -= dt; t.whoosh -= dt;
        if (Math.abs(th) < 0.25 && t.whoosh <= 0 && p && Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < 9) { Snd.play('heavySwing'); t.whoosh = B.period / 2 - 0.1; }
        if (p && t.cd <= 0 && by < 1.7 && Math.abs(p.pos.x - bx) < 0.6 && Math.abs(p.pos.z - t.z) < 0.6) { t.cd = 0.8; hurt(t, new THREE.Vector3(bx - Math.sign(Math.cos(t.t / B.period * Math.PI * 2)) * 2, 0, t.z), B.dmg); }
      }
    }
  }

  // ---------------- Shrines ----------------
  function shrine(room, lx, z) {
    const stone = mat(0x6a6a78), rune = new THREE.MeshStandardMaterial({ color: 0x9ad8ff, emissive: 0x4ab0ff, emissiveIntensity: 1.2, roughness: 0.3 });
    const g = new THREE.Group(); g.position.set(lx, 0, z); room.group.add(g);
    put(g, new THREE.CylinderGeometry(0.9, 1.0, 0.3, 8), stone, 0, 0.15, 0);
    put(g, new THREE.BoxGeometry(0.6, 1.8, 0.6), stone, 0, 1.2, 0).scale.set(1, 1, 1);
    put(g, new THREE.ConeGeometry(0.45, 0.5, 4), stone, 0, 2.35, 0).rotation.y = Math.PI / 4;
    const gem = put(g, new THREE.OctahedronGeometry(0.22, 0), rune, 0, 1.4, 0.33, false);
    const s = { g, gem, rune, room, x: room.cx + lx, z, r: 0.9, used: false };
    shrines.push(s); return s;
  }
  function updateShrines(dt) {
    const now = performance.now() / 1000;
    for (const s of shrines) { s.gem.rotation.y += dt * 1.5; s.gem.position.y = 1.4 + Math.sin(now * 2) * 0.05; s.rune.emissiveIntensity = s.used ? 0.1 : 1 + Math.sin(now * 3) * 0.3; }
  }
  // The shrine the hero is standing at, as a prompt spot
  function nearest(pos) {
    const s = shrines.find(s => !s.used && Math.hypot(pos.x - s.x, pos.z - s.z) < 2.3);
    return s ? { id: 'shrine', name: 'Shrine of the Deep', verb: 'Pray', shrine: s } : null;
  }
  // Three blessings to choose from, none the hero already has
  function offer() {
    const have = G.blessings || [], pool = CFG.blessings.filter(b => !have.includes(b.id));
    return pool.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  // ---------------- Mimics ----------------
  // A chest that is not a chest: it waits beside the path and springs when the hero comes close
  function mimic(room, lx, z, mult) {
    const g = new THREE.Group(); g.position.set(lx, 0, z); g.rotation.y = Math.PI / 2; room.group.add(g);
    const wood = mat(0x6a4424), band = mat(0xd9a92a, { roughness: 0.4, metalness: 0.6 });
    put(g, new THREE.BoxGeometry(0.9, 0.5, 0.6), wood, 0, 0.25, 0);
    for (const x of [-0.35, 0.35]) put(g, new THREE.BoxGeometry(0.08, 0.52, 0.62), band, x, 0.25, 0);
    put(g, new THREE.CylinderGeometry(0.3, 0.3, 0.9, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), wood, 0, 0.5, 0);
    mimics.push({ g, room, x: room.cx + lx, z, mult, sprung: false });
  }
  function updateMimics() {
    const p = G.player; if (!p || p.state === 'dead') return;
    for (const m of mimics) {
      if (m.sprung || Math.hypot(p.pos.x - m.x, p.pos.z - m.z) > 1.9) continue;
      m.sprung = true; m.room.group.remove(m.g);
      FX.text(new THREE.Vector3(m.x, 1.6, m.z), 'MIMIC!', 'danger'); Snd.play('mimic'); FX.shake(0.25);
      G.queue.push({ type: 'mimic', at: new THREE.Vector3(m.x, 0, m.z), mult: m.mult.mult, hpMult: m.mult.hpMult, room: m.room, mimic: true, t: G.time });
    }
  }
  function update(dt) { updateTraps(dt); updateShrines(dt); updateMimics(); }
  // Unbroken pots, crates and shrines are solid
  function blockers() {
    const out = [];
    for (const q of pots) if (!q.broken) out.push([q.x, q.z, q.r]);
    for (const s of shrines) out.push([s.x, s.z, s.r]);
    for (const m of mimics) if (!m.sprung) out.push([m.x, m.z, 0.55]);
    return out;
  }
  return { clear, breakables, strike, trap, shrine, mimic, get mimics() { return mimics; }, nearest, offer, update, blockers, get pots() { return pots; }, get traps() { return traps; }, get shrines() { return shrines; } };
})();
