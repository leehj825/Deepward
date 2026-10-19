// Deepward - characters built entirely in code: a joint hierarchy of Groups dressed with primitive meshes,
// weapons and shields as child meshes, and procedural poses (no model or animation files).
// Conventions: feet at y=0, facing +Z, right hand on -X. Shoulders and hips use Euler order YXZ:
// z = out to the side, x = raise forward (negative), y = swing left (+) / right (-).
const Rig = (() => {
  const std = (c, rough = 0.85, metal = 0, emissive = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, emissive, flatShading: true });
  const glowMat = c => new THREE.MeshBasicMaterial({ color: c });

  function mesh(geo, m, parent, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o;
  }
  function joint(parent, x, y, z, order) {
    const g = new THREE.Group(); g.position.set(x, y, z); if (order) g.rotation.order = order; parent.add(g); return g;
  }
  // A limb segment hanging down from its joint
  function limb(parent, len, rTop, rBot, m, seg = 8) { return mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg), m, parent, 0, -len / 2, 0); }
  const ball = (parent, r, m, x = 0, y = 0, z = 0, w = 10, h = 8) => mesh(new THREE.SphereGeometry(r, w, h), m, parent, x, y, z);
  const box = (parent, w, h, d, m, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), m, parent, x, y, z);

  // ---------------- Weapons ----------------
  // Weapons point along the hand's +Z (forward when the arm hangs down). tip/base mark the blade for the swing trail.
  function sword(hand, o) {
    const g = joint(hand, 0, -0.03, 0);
    const steel = std(o.blade || 0xc9ced6, 0.35, 0.6), grip = std(o.grip || 0x3a2416), guard = std(o.guard || 0xb08a3a, 0.5, 0.4);
    const len = o.len || 0.92, two = !!o.twoHanded, gl = two ? 0.46 : 0.2, bw = two ? 0.1 : o.thin ? 0.035 : 0.075;     // a two-handed grip is long enough for both fists
    mesh(new THREE.CylinderGeometry(0.024, 0.024, gl, 6).rotateX(Math.PI / 2), grip, g, 0, 0, 0.1 - gl / 2);
    ball(g, two ? 0.045 : 0.035, guard, 0, 0, 0.09 - gl, 6, 5);
    box(g, two ? 0.4 : 0.26, 0.045, 0.06, guard, 0, 0, 0.11);
    const blade = box(g, bw, 0.02, len, steel, 0, 0, 0.13 + len / 2);
    mesh(new THREE.ConeGeometry(0.053, 0.16, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).scale(1, 0.34, 1), steel, g, 0, 0, 0.13 + len + 0.08);
    box(g, 0.012, 0.022, len * 0.85, std(0x8a9099, 0.4, 0.5), 0, 0, 0.13 + len * 0.45);   // fuller
    const tip = joint(g, 0, 0, 0.13 + len + 0.12), base = joint(g, 0, 0, 0.16);
    return { group: g, glowMats: [steel], tip, base, blade };
  }
  // A spear held near its balance point: a long ash shaft with an iron leaf blade and a butt cap
  function spear(hand, o) {
    const g = joint(hand, 0, -0.03, 0), steel = std(o.blade || 0xc0c6d0, 0.35, 0.6), wood = std(0x6a4a2a);
    mesh(new THREE.CylinderGeometry(0.022, 0.026, 2.0, 7).rotateX(Math.PI / 2), wood, g, 0, 0, 0.55);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 7).rotateX(Math.PI / 2), std(0x4a4a50, 0.5, 0.5), g, 0, 0, -0.45);
    mesh(new THREE.OctahedronGeometry(0.1, 0).scale(0.55, 0.18, 2.1), steel, g, 0, 0, 1.68);
    mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 7).rotateX(Math.PI / 2), steel, g, 0, 0, 1.5);
    const tip = joint(g, 0, 0, 1.9), base = joint(g, 0, 0, 1.45);
    return { group: g, glowMats: [steel], tip, base };
  }
  function club(hand, o) {
    const g = joint(hand, 0, -0.03, 0);
    const wood = std(0x5a3a22), iron = std(0x4a4a50, 0.5, 0.5);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 7).rotateX(Math.PI / 2), std(0x2a1a10), g, 0, 0, 0);
    mesh(new THREE.CylinderGeometry(0.15, 0.06, 0.95, 8).rotateX(Math.PI / 2), wood, g, 0, 0, 0.6);
    mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 8).rotateX(Math.PI / 2), iron, g, 0, 0, 0.98);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, s = mesh(new THREE.ConeGeometry(0.035, 0.14, 5), iron, g, Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.8 + (i % 2) * 0.12);
      s.rotation.z = a - Math.PI / 2;
    }
    const tip = joint(g, 0, 0, 1.08), base = joint(g, 0, 0, 0.3);
    return { group: g, glowMats: [wood, iron], tip, base };
  }
  function axe(hand, o) {
    const g = joint(hand, 0, -0.03, 0), steel = std(o.blade || 0xb8bec8, 0.4, 0.6), wood = std(0x5a3a22);
    mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.85, 7).rotateX(Math.PI / 2), wood, g, 0, 0, 0.3);
    const hm = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, -0.09), new THREE.Vector2(0, 0.09), new THREE.Vector2(-0.26, 0.17), new THREE.Vector2(-0.26, -0.17)]), { depth: 0.03, bevelEnabled: false }), steel);
    hm.rotation.y = Math.PI / 2; hm.position.set(-0.015, 0, 0.66); hm.castShadow = true; g.add(hm);
    mesh(new THREE.BoxGeometry(0.06, 0.06, 0.1), steel, g, 0, 0, 0.66);
    const tip = joint(g, 0, 0.26, 0.66), base = joint(g, 0, 0.05, 0.6);
    return { group: g, glowMats: [steel], tip, base };
  }
  function mace(hand, o) {
    const g = joint(hand, 0, -0.03, 0), steel = std(o.blade || 0xa8aeb8, 0.4, 0.6);
    mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 7).rotateX(Math.PI / 2), std(0x3a2416), g, 0, 0, 0.24);
    ball(g, 0.1, steel, 0, 0, 0.64, 8, 6);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; box(g, 0.03, 0.08, 0.16, steel, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.64).rotation.z = a; }
    const tip = joint(g, 0, 0, 0.74), base = joint(g, 0, 0, 0.5);
    return { group: g, glowMats: [steel], tip, base };
  }
  function hammer(hand) {
    const g = joint(hand, 0, -0.03, 0), iron = std(0x4a4a50, 0.5, 0.6);
    mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.5, 6).rotateX(Math.PI / 2), std(0x5a3a22), g, 0, 0, 0.18);
    box(g, 0.1, 0.1, 0.22, iron, 0, 0, 0.42).rotation.y = Math.PI / 2;
    return { group: g, glowMats: [iron], tip: joint(g, 0, 0, 0.5), base: joint(g, 0, 0, 0.3) };
  }
  // A bow held at its middle; when the arm points forward the limbs stand upright (hand +Z) and the string is near the body
  function bow(hand) {
    const g = joint(hand, 0, -0.03, 0), wood = std(0x4a3420), R = 0.5;
    mesh(new THREE.TorusGeometry(R, 0.025, 5, 16, Math.PI).rotateY(-Math.PI / 2).rotateX(Math.PI).translate(0, R * 0.92, 0), wood, g, 0, 0, 0);
    box(g, 0.008, 0.008, R * 2, std(0xd8d0b8), 0, R * 0.92, 0);
    const tip = joint(g, 0, R * 0.92, R), base = joint(g, 0, R * 0.92, -R);
    return { group: g, glowMats: [wood], tip, base };
  }
  function roundShield(hand, c) {
    const g = new THREE.Group(); hand.add(g);
    const face = std(c, 0.8), rim = std(0x8a8f99, 0.45, 0.5), boss = std(0xc9a23a, 0.4, 0.5);
    mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 14).rotateX(Math.PI / 2), face, g, 0, 0, 0.06);
    mesh(new THREE.TorusGeometry(0.36, 0.025, 5, 18), rim, g, 0, 0, 0.09);
    ball(g, 0.07, boss, 0, 0, 0.1, 8, 6).scale.z = 0.6;
    box(g, 0.05, 0.6, 0.012, std(0xd9b45a, 0.7), 0, 0, 0.088);
    box(g, 0.6, 0.05, 0.012, std(0xd9b45a, 0.7), 0, 0, 0.088);
    return g;
  }
  function towerShield(hand, c) {
    const g = new THREE.Group(); hand.add(g);
    const face = std(c, 0.7, 0.3), rim = std(0x2a2a30, 0.5, 0.6);
    box(g, 0.62, 0.95, 0.06, face, 0, -0.05, 0.07);
    box(g, 0.68, 0.06, 0.08, rim, 0, 0.43, 0.07); box(g, 0.68, 0.06, 0.08, rim, 0, -0.53, 0.07);
    box(g, 0.06, 1.0, 0.08, rim, 0.33, -0.05, 0.07); box(g, 0.06, 1.0, 0.08, rim, -0.33, -0.05, 0.07);
    box(g, 0.14, 0.42, 0.02, std(0xc9a23a, 0.5, 0.4), 0, -0.02, 0.11); box(g, 0.34, 0.12, 0.02, std(0xc9a23a, 0.5, 0.4), 0, 0.08, 0.11);
    return g;
  }

  // ---------------- Bodies ----------------
  // One humanoid skeleton of joints; "kind" picks proportions, materials and armour.
  // o.look (hero): gear appearance from Items.look(); o.npc (kind 'npc'): { cloth, hair, beard, elder, apron, tool }
  function build(kind, o = {}) {
    if (kind === 'spider') return buildSpider();
    const L = o.look || {}, N = o.npc || {};
    const S = {
      npc: { skin: N.skin || 0xd9a47a, cloth: N.cloth || 0x6a5a40, pants: 0x3a3028, boot: 0x2b1d14, w: 1, limbR: 1 },
      hero: { skin: 0xe2a982, cloth: L.armor || 0x2f4a6b, pants: 0x3a3028, boot: 0x2b1d14, w: 1, limbR: 1 },
      skeleton: { skin: 0xd8cfb4, cloth: 0x3a2f2a, pants: 0x3a2f2a, boot: 0xd8cfb4, w: 0.85, limbR: 0.55 },
      archer: { skin: 0xcfc6aa, cloth: 0x2e3a2a, pants: 0x2e3a2a, boot: 0xcfc6aa, w: 0.85, limbR: 0.55 },
      goblin: { skin: 0x6a8a3a, cloth: 0x4a3a2a, pants: 0x3a2e22, boot: 0x2a2018, w: 0.92, limbR: 0.85 },
      duelist: { skin: 0xe8e2d8, cloth: 0x2a2032, pants: 0x1e1a24, boot: 0x16141a, w: 0.95, limbR: 0.92 },
      knight: { skin: 0x5a606c, cloth: 0x6a1a1a, pants: 0x3a3e48, boot: 0x2a2c32, w: 1.08, limbR: 1.1 },
      brute: { skin: 0x7d8a5a, cloth: 0x4a3420, pants: 0x4a3420, boot: 0x3a2a1a, w: 1.35, limbR: 1.45 },
    }[kind];
    const rig = { kind, j: {}, mats: [], glowMats: [], trail: null };
    const root = new THREE.Group(), body = joint(root, 0, 0.5, 0), hips = joint(body, 0, 0.45, 0);
    rig.root = root; rig.body = body; rig.j.hips = hips;
    const skin = std(S.skin, kind === 'knight' ? 0.45 : 0.8, kind === 'knight' ? 0.55 : 0), cloth = std(S.cloth), pants = std(S.pants), boot = std(S.boot, 0.9);
    const steel = std(0x9ca2ad, 0.45, 0.55), leather = std(0x6a4a2c), dark = std(0x1e1a18);
    const w = S.w, R = S.limbR, bony = kind === 'skeleton' || kind === 'archer';

    // Pelvis and legs
    if (bony) { box(hips, 0.26, 0.1, 0.12, skin, 0, -0.02, 0); mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.34, 7, 1, true), std(0x3a2f2a, 1), hips, 0, -0.14, 0).material.side = THREE.DoubleSide; }
    else {
      mesh(new THREE.CylinderGeometry(0.16 * w, 0.17 * w, 0.18, 9), pants, hips, 0, -0.02, 0);
      mesh(new THREE.CylinderGeometry(0.175 * w, 0.24 * w, 0.32, 9, 1, true), cloth, hips, 0, -0.13, 0).material.side = THREE.DoubleSide;
      mesh(new THREE.TorusGeometry(0.168 * w, 0.025, 5, 14).rotateX(Math.PI / 2), leather, hips, 0, 0.04, 0);
      box(hips, 0.07, 0.06, 0.03, std(0xc9a23a, 0.4, 0.5), 0, 0.04, 0.17 * w);
    }
    for (const side of [1, -1]) {
      const n = side > 0 ? 'L' : 'R';
      const hip = joint(hips, 0.1 * w * side, -0.05, 0, 'YXZ');
      limb(hip, 0.42, 0.085 * R, 0.068 * R, bony ? skin : pants);
      const knee = joint(hip, 0, -0.42, 0);
      ball(knee, 0.07 * R, bony ? skin : (kind === 'knight' ? steel : pants), 0, 0, 0.01);
      limb(knee, 0.4, 0.07 * R, 0.058 * R, bony ? skin : boot);
      if (!bony) mesh(new THREE.CylinderGeometry(0.078 * R, 0.07 * R, 0.16, 8), boot, knee, 0, -0.08, 0);
      const ankle = joint(knee, 0, -0.42, 0);
      box(ankle, 0.11 * R, 0.08, 0.25, boot, 0, 0.0, 0.05);
      rig.j['hip' + n] = hip; rig.j['kn' + n] = knee;
    }

    // Spine, chest, head
    const spine = joint(hips, 0, 0.05, 0, 'YXZ'); rig.j.spine = spine;
    if (bony) {
      for (let i = 0; i < 4; i++) box(spine, 0.05, 0.05, 0.05, skin, 0, 0.03 + i * 0.07, -0.04);
    } else mesh(new THREE.CylinderGeometry(0.15 * w, 0.155 * w, 0.24, 9), kind === 'brute' ? skin : cloth, spine, 0, 0.1, 0);
    if (kind === 'brute') ball(spine, 0.21, skin, 0, 0.1, 0.06, 10, 8).scale.set(1.15, 0.9, 1);       // belly
    const chest = joint(spine, 0, 0.28, 0); rig.j.chest = chest;
    if (bony) {
      for (let i = 0; i < 4; i++) {
        const r = mesh(new THREE.TorusGeometry(0.13 - i * 0.012, 0.016, 4, 12, Math.PI * 1.6), skin, chest, 0, 0.15 - i * 0.07, 0.0);
        r.rotation.set(Math.PI / 2, 0, Math.PI * 0.7);
      }
      box(chest, 0.04, 0.24, 0.04, skin, 0, 0.06, 0.11);
      box(chest, 0.36, 0.04, 0.05, skin, 0, 0.21, 0);
    } else {
      const torso = mesh(new THREE.CylinderGeometry(0.2 * w, 0.16 * w, 0.36, 9), kind === 'brute' ? skin : cloth, chest, 0, 0.08, 0);
      torso.scale.z = 0.72;
      if (kind === 'hero') {
        if (L.plate) { const pl = mesh(new THREE.CylinderGeometry(0.21, 0.165, 0.34, 9), steel, chest, 0, 0.09, 0); pl.scale.z = 0.76; for (const s of [1, -1]) ball(chest, 0.12, steel, 0.21 * s, 0.22, 0, 8, 6).scale.set(1, 0.65, 1); }
        else { const strap = box(chest, 0.06, 0.48, 0.03, leather, 0, 0.08, 0.13); strap.rotation.z = 0.7; ball(chest, 0.12, steel, 0.19, 0.22, 0, 8, 6, 0).scale.set(1, 0.65, 1); }
        box(chest, 0.34, 0.06, 0.24, std(0x7a2a22), 0, 0.27, 0);             // scarf
        if (L.trinket) { ball(chest, 0.035, std(0xd9a92a, 0.3, 0.6), 0, 0.12, 0.15, 6, 5); ball(chest, 0.018, glowMat(0x7fe8ff), 0, 0.12, 0.18, 5, 4); }
      }
      if (kind === 'duelist') {
        mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.9, 10, 1, true), cloth, chest, 0, -0.42, -0.02).material.side = THREE.DoubleSide;   // long coat
        box(chest, 0.26, 0.2, 0.03, std(0xc9a23a, 0.4, 0.5), 0, 0.12, 0.13);                     // gilded breast
        box(chest, 0.36, 0.16, 0.26, cloth, 0, 0.3, -0.02);                                        // high collar
      }
      if (kind === 'goblin') { const v = box(chest, 0.34, 0.3, 0.26, std(0x5a4430), 0, 0.06, 0); v.rotation.z = 0.08; }
      if (kind === 'npc') {
        if (N.apron) box(chest, 0.3, 0.55, 0.03, std(0x4a3420), 0, -0.05, 0.15);
        if (N.elder) mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.75, 9, 1, true), cloth, chest, 0, -0.32, 0).material.side = THREE.DoubleSide;   // long robe
        box(chest, 0.34, 0.05, 0.24, std(N.scarf || 0x5a4a30), 0, 0.27, 0);
      }
      if (kind === 'knight') {
        const plate = mesh(new THREE.CylinderGeometry(0.22 * w, 0.17 * w, 0.38, 9), steel, chest, 0, 0.08, 0); plate.scale.z = 0.78;
        box(chest, 0.2, 0.42, 0.02, cloth, 0, 0.0, 0.15);                     // tabard
        for (const s of [1, -1]) ball(chest, 0.13, steel, 0.22 * s, 0.22, 0, 8, 6).scale.set(1, 0.7, 1.05);
      }
      if (kind === 'brute') {
        const strap = box(chest, 0.08, 0.55, 0.04, leather, 0, 0.08, 0.15); strap.rotation.z = -0.6;
        ball(chest, 0.16, std(0x5a5048, 0.6, 0.3), -0.25, 0.22, 0, 8, 6).scale.set(1, 0.7, 1);
        for (let i = 0; i < 3; i++) mesh(new THREE.ConeGeometry(0.03, 0.12, 5), std(0xd8cfb4), chest, -0.25 + i * 0.04, 0.33, -0.02 + i * 0.03);
      }
    }
    const neck = joint(chest, 0, 0.26, 0, 'YXZ'); rig.j.neck = neck;
    limb(neck, 0.1, 0.05 * R, 0.06 * R, skin).position.y = 0.03;
    const head = joint(neck, 0, 0.14, 0); rig.j.head = head;
    if (bony) {
      ball(head, 0.13, skin, 0, 0.02, 0, 10, 8).scale.set(1, 1.05, 1.1);
      box(head, 0.16, 0.07, 0.12, skin, 0, -0.1, 0.04);
      for (const s of [1, -1]) { ball(head, 0.035, dark, 0.05 * s, 0.02, 0.11, 6, 5); ball(head, 0.016, glowMat(0x7fe8ff), 0.05 * s, 0.02, 0.135, 5, 4); }
      box(head, 0.03, 0.04, 0.02, dark, 0, -0.04, 0.135);
      if (kind === 'archer') { const hood = mesh(new THREE.SphereGeometry(0.17, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), cloth, head, 0, 0.03, -0.02); hood.scale.set(1, 1.1, 1.15); mesh(new THREE.ConeGeometry(0.1, 0.18, 6), cloth, head, 0, 0.0, -0.17).rotation.x = -1.9; }
    } else if (kind === 'goblin') {
      box(head, 0.24, 0.22, 0.22, skin, 0, 0, 0);
      for (const sd of [1, -1]) { const ear = mesh(new THREE.ConeGeometry(0.05, 0.26, 5), skin, head, 0.15 * sd, 0.04, -0.02); ear.rotation.z = -sd * 1.3; ball(head, 0.025, glowMat(0xffd040), 0.06 * sd, 0.03, 0.115, 5, 4); }
      mesh(new THREE.ConeGeometry(0.035, 0.12, 5), skin, head, 0, -0.02, 0.15).rotation.x = Math.PI / 2;
      const hood = mesh(new THREE.SphereGeometry(0.15, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), std(0x3a2a1e), head, 0, 0.05, -0.01); hood.scale.set(1, 0.9, 1.1);
    } else if (kind === 'duelist') {
      box(head, 0.22, 0.26, 0.23, std(0x2a2026), 0, 0, 0);
      const mask = box(head, 0.2, 0.22, 0.04, std(0xf2eee6, 0.25, 0.1), 0, -0.01, 0.12);
      for (const sd of [1, -1]) box(head, 0.05, 0.015, 0.02, dark, 0.05 * sd, 0.03, 0.142);
      mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12), std(0x1a161e), head, 0, 0.14, 0);
      mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 10), std(0x1a161e), head, 0, 0.22, 0);
    } else {
      box(head, 0.23, 0.26, 0.24, skin, 0, 0, 0);
      if (kind === 'knight') {
        mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 10), std(0x6a707c, 0.4, 0.6), head, 0, 0.01, 0);
        box(head, 0.2, 0.025, 0.04, dark, 0, 0.03, 0.14);
        mesh(new THREE.ConeGeometry(0.155, 0.12, 10), std(0x6a707c, 0.4, 0.6), head, 0, 0.23, 0);
        mesh(new THREE.BoxGeometry(0.03, 0.18, 0.22), cloth, head, 0, 0.3, -0.02);
      } else {
        for (const s of [1, -1]) box(head, 0.035, 0.035, 0.02, dark, 0.055 * s, 0.02, 0.121);
        box(head, 0.05, 0.06, 0.04, skin, 0, -0.03, 0.13);
        if (kind === 'hero' || kind === 'npc') {
          const hair = std(kind === 'npc' ? (N.hair || 0x5a3a1e) : 0x3b2416, 0.8);
          box(head, 0.25, 0.09, 0.26, hair, 0, 0.12, -0.005); box(head, 0.25, 0.2, 0.06, hair, 0, 0.03, -0.11);
          for (const s of [1, -1]) box(head, 0.03, 0.12, 0.2, hair, 0.12 * s, 0.05, -0.02);
          if (N.beard) { box(head, 0.2, 0.12, 0.06, hair, 0, -0.1, 0.11); box(head, 0.12, 0.08, 0.05, hair, 0, -0.18, 0.1); }
          if (kind === 'hero' && L.helm === 0) { const cap = mesh(new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), leather, head, 0, 0.06, 0); cap.scale.set(1, 0.9, 1.05); }
          else if (kind === 'hero' && L.helm === 1) {
            const hm = mesh(new THREE.SphereGeometry(0.16, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.6), steel, head, 0, 0.04, 0); hm.scale.set(1, 1.05, 1.08);
            box(head, 0.03, 0.14, 0.03, steel, 0, 0.0, 0.15);                  // nasal guard
          } else if (kind === 'hero' && L.helm === 2) {
            mesh(new THREE.CylinderGeometry(0.155, 0.15, 0.33, 10), steel, head, 0, 0.01, 0);
            box(head, 0.2, 0.025, 0.04, dark, 0, 0.03, 0.145);
            mesh(new THREE.ConeGeometry(0.16, 0.1, 10), steel, head, 0, 0.22, 0);
          } else if (kind === 'hero') box(head, 0.255, 0.035, 0.255, std(0x7a2a22), 0, 0.07, 0);           // headband
        }
        if (kind === 'brute') {
          box(head, 0.24, 0.05, 0.06, dark, 0, 0.06, 0.1);                       // heavy brow
          for (const s of [1, -1]) mesh(new THREE.ConeGeometry(0.025, 0.08, 5), std(0xe8e0c8), head, 0.06 * s, -0.08, 0.13).rotation.x = Math.PI;   // tusks
          const helm = mesh(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), std(0x4a4a50, 0.5, 0.5), head, 0, 0.06, 0);
          helm.scale.set(1, 0.8, 1.05);
          for (const s of [1, -1]) { const h = mesh(new THREE.ConeGeometry(0.045, 0.3, 6), std(0xe8e0c8), head, 0.17 * s, 0.17, 0); h.rotation.z = -0.9 * s; }
        }
      }
    }

    // Arms
    for (const side of [1, -1]) {
      const n = side > 0 ? 'L' : 'R';
      const sh = joint(chest, 0.22 * w * side + (kind === 'brute' ? 0.06 * side : 0), 0.2, 0, 'YXZ');
      ball(sh, 0.075 * R, bony ? skin : (kind === 'knight' ? steel : cloth));
      limb(sh, 0.3, 0.068 * R, 0.058 * R, bony ? skin : (kind === 'brute' ? skin : cloth));
      const el = joint(sh, 0, -0.3, 0);
      ball(el, 0.058 * R, bony ? skin : (kind === 'knight' ? steel : skin));
      limb(el, 0.27, 0.056 * R, 0.048 * R, skin);
      if (kind === 'hero' || kind === 'brute' || kind === 'npc') mesh(new THREE.CylinderGeometry(0.064 * R, 0.058 * R, 0.13, 8), leather, el, 0, -0.17, 0);
      const hd = joint(el, 0, -0.29, 0);
      ball(hd, 0.058 * R, kind === 'knight' ? std(0x3a3e48, 0.5, 0.5) : skin, 0, 0, 0.0, 8, 6);
      rig.j['sh' + n] = sh; rig.j['el' + n] = el; rig.j['hd' + n] = hd;
    }

    // Cape for the hero: hangs from the shoulders and flutters with speed
    if (kind === 'hero') {
      const cape = joint(chest, 0, 0.23, -0.15); rig.j.cape = cape;
      const geo = new THREE.BoxGeometry(0.42, 0.85, 0.02, 1, 4, 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 + (0.425 - y) * 0.45)); }
      geo.translate(0, -0.425, 0); geo.computeVertexNormals();
      mesh(geo, std(0x6a1f1a, 0.95), cape);
    }

    // Weapons and shields
    let wpn = null;
    if (kind === 'brute') wpn = club(rig.j.hdR, {});
    else if (kind === 'npc') { if (N.tool === 'hammer') wpn = hammer(rig.j.hdR); }
    else if (kind === 'archer') wpn = bow(rig.j.hdL);
    else if (kind === 'goblin') wpn = sword(rig.j.hdR, { blade: 0x6a5a48, guard: 0x3a2a1a, len: 0.42 });
    else if (kind === 'duelist') wpn = sword(rig.j.hdR, { blade: 0xe0e4ee, guard: 0xc9a23a, len: 1.05, thin: true });
    else if (kind === 'hero' && L.weapon === 'axe') wpn = axe(rig.j.hdR, { blade: L.blade });
    else if (kind === 'hero' && L.weapon === 'mace') wpn = mace(rig.j.hdR, { blade: L.blade });
    else if (kind === 'hero' && L.weapon === 'spear') wpn = spear(rig.j.hdR, { blade: L.blade ? (L.blade | 0x404040) : undefined });
    else if (kind === 'hero' && L.weapon === 'daggers') {
      wpn = sword(rig.j.hdR, { blade: L.blade ? (L.blade | 0x404040) : undefined, len: 0.42, thin: true });
      const off = sword(rig.j.hdL, { blade: L.blade ? (L.blade | 0x404040) : undefined, len: 0.42, thin: true }); rig.offhand = off; rig.glowMats.push(...off.glowMats);
    }
    else wpn = sword(rig.j.hdR, kind === 'skeleton' ? { blade: 0x8a7a66, guard: 0x5a4a3a, len: 0.8 } : kind === 'knight' ? { len: 1.0, guard: 0x4a4e58 } : { blade: L.blade ? (L.blade | 0x404040) : undefined, len: L.weaponLen, twoHanded: L.twoHanded });
    rig.weapon = wpn; if (wpn) rig.glowMats.push(...wpn.glowMats);
    if (wpn && L.glow) for (const m of wpn.glowMats) { m.emissive.setHex(L.glow); m.emissiveIntensity = 0.25; }     // rare-and-better weapons shimmer faintly
    if (kind === 'hero' && L.shield !== false) rig.shield = roundShield(rig.j.hdL, L.shieldFace || 0x2f4a6b);
    if (kind === 'knight') rig.shield = towerShield(rig.j.hdL, 0x3a3e48);
    // Motion capture drives every rig: sword-and-shield clips for people, great-sword clips for the two-handed brute.
    // The shield rides on the outside of the forearm, where the clips expect it (mirrored from Nightfall's rig).
    // A two-handed hero uses the great-sword clips, with the left hand held on the grip (gripIK)
    rig.mocap = typeof Mocap !== 'undefined'; rig.set = kind === 'brute' || L.twoHanded ? 'gs' : 'ss'; rig.calm = kind === 'npc'; rig.twoHand = kind === 'hero' && !!L.twoHanded;
    if (rig.mocap && rig.shield) {
      rig.j.elL.add(rig.shield); rig.shield.position.set(0.14, -0.2, 0.02);
      rig.shield.rotation.set(0, Math.PI / 2, kind === 'knight' ? Math.PI / 2 : 0);    // face outward; a tall shield stands across the forearm
    }
    rig.tq = {}; for (const n of ['hips', ...JOINTS]) rig.tq[n] = new THREE.Quaternion();
    rig.loco = 0;
    bake(root, true, rig.glowMats);

    root.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && !rig.mats.includes(o.material)) rig.mats.push(o.material); });
    rig.baseEmissive = rig.mats.map(m => m.emissive.getHex());
    rig.time = Math.random() * 10;
    rig.shieldYaw = 0;
    if (CFG.enemies[kind] && CFG.enemies[kind].scale) root.scale.setScalar(CFG.enemies[kind].scale);
    return rig;
  }

  // ---------------- The spider (no skeleton clips: legs and body are posed by hand) ----------------
  function buildSpider() {
    const rig = { kind: 'spider', j: {}, mats: [], glowMats: [], spider: true, legs: [], time: Math.random() * 10, loco: 0 };
    const root = new THREE.Group(), body = joint(root, 0, 0.55, 0); rig.root = root; rig.body = body;
    const chitin = std(0x2a2232, 0.5, 0.2), mark = std(0x6a3a8a, 0.6), fangM = std(0xe8e0c8, 0.4);
    ball(body, 0.3, chitin, 0, 0, 0.05, 10, 8).scale.set(1, 0.7, 1.1);
    const abd = ball(body, 0.46, chitin, 0, 0.12, -0.6, 12, 9); abd.scale.set(1, 0.82, 1.2);
    for (let k = 0; k < 3; k++) box(body, 0.3 - k * 0.07, 0.03, 0.06, mark, 0, 0.5 - k * 0.04, -0.45 - k * 0.2);
    const head = joint(body, 0, 0.0, 0.36); rig.j.head = head;
    ball(head, 0.17, chitin, 0, 0, 0, 9, 7);
    for (const [x, y] of [[0.06, 0.06], [-0.06, 0.06], [0.11, 0.02], [-0.11, 0.02], [0.04, 0.11], [-0.04, 0.11]]) ball(head, 0.025, glowMat(0xff3a2a), x, y, 0.15, 5, 4);
    for (const sd of [1, -1]) { const f = mesh(new THREE.ConeGeometry(0.035, 0.18, 5), fangM, head, 0.06 * sd, -0.1, 0.13); f.rotation.x = Math.PI - 0.4; }
    const tip = joint(head, 0, -0.16, 0.2), base = joint(head, 0, 0, 0);
    rig.weapon = { group: head, tip, base, glowMats: [fangM] }; rig.glowMats.push(fangM);
    const upG = new THREE.CylinderGeometry(0.045, 0.035, 0.6, 6).rotateZ(-Math.PI / 2).translate(0.3, 0, 0), loG = new THREE.CylinderGeometry(0.035, 0.012, 0.85, 6).rotateZ(-Math.PI / 2).translate(0.42, 0, 0);
    [0.24, 0.08, -0.08, -0.24].forEach((z, i) => {
      for (const side of [1, -1]) {
        const hip = joint(body, 0.16 * side, 0, z, 'YXZ'), base = side > 0 ? [-0.7, -0.25, 0.25, 0.7][i] : Math.PI + [0.7, 0.25, -0.25, -0.7][i];
        hip.rotation.y = base;
        const up = joint(hip, 0, 0, 0); mesh(upG, chitin, up); const knee = joint(up, 0.6, 0, 0); mesh(loG, chitin, knee);
        ball(up, 0.05, chitin, 0.6, 0, 0, 6, 5);
        rig.legs.push({ hip, up, knee, base, phase: i * 1.6 + (side > 0 ? 0 : Math.PI), front: i === 0 });
      }
    });
    bake(root, true, rig.glowMats);
    root.traverse(m => { if (m.isMesh && m.material && m.material.isMeshStandardMaterial && !rig.mats.includes(m.material)) rig.mats.push(m.material); });
    rig.baseEmissive = rig.mats.map(m => m.emissive.getHex());
    return rig;
  }
  function animateSpider(rig, st, dt) {
    rig.time += dt; const T = rig.time, m = st.mode, sp = Math.min(1, st.speed || 0);
    rig.loco += dt * (2 + 13 * sp);
    let y = 0.55 + Math.sin(T * 2) * 0.01, pitch = 0, roll = 0, lift = 0, frontLift = 0, splay = 0, headZ = 0.36;
    if (m === 'attack') {
      if (st.phase === 'wind') { y = 0.38; pitch = st.atk === 'pounce' ? -0.35 : 0.1; frontLift = st.atk === 'pounce' ? 0.9 : 0.5; }
      else if (st.phase === 'active') { y = 0.5; pitch = 0.3; frontLift = 0.6; splay = 0.4; headZ = st.atk === 'bite' ? 0.52 : 0.36; }
      else { y = 0.5; pitch = 0.05; }
    } else if (m === 'stagger') { roll = Math.sin(T * 40) * 0.15 * Math.max(0, 1 - st.t * 2); y = 0.45; }
    else if (m === 'broken') { y = 0.28; splay = 0.5; pitch = 0.2; }
    else if (m === 'dead') { y = 0.32; roll = Math.PI * Math.min(1, st.t * 2); lift = 1.0; }
    const k = 1 - Math.exp(-14 * dt), b = rig.body;
    b.position.y += (y + (m === 'move' ? Math.abs(Math.sin(rig.loco)) * 0.03 * sp : 0) - b.position.y) * k;
    b.rotation.x += (pitch - b.rotation.x) * k; b.rotation.z += (roll - b.rotation.z) * k;
    rig.j.head.position.z += (headZ - rig.j.head.position.z) * Math.min(1, dt * 20);
    for (const L of rig.legs) {
      const ph = rig.loco + L.phase, walk = m === 'move' || m === 'idle' ? sp : 0;
      const swing = Math.sin(ph) * 0.4 * walk, up = Math.max(0, Math.cos(ph)) * 0.45 * walk;
      L.hip.rotation.y += (L.base + swing * (L.base > 1 ? -1 : 1) - L.hip.rotation.y) * k;
      const wantUp = 0.6 + up + lift + (L.front ? frontLift : 0) + splay * 0.3;
      L.up.rotation.z += (wantUp - L.up.rotation.z) * k;
      L.knee.rotation.z += ((-2.0 - lift * 0.8 + splay * 0.4) - L.knee.rotation.z) * k;
    }
  }

  // ---------------- Flash and glow ----------------
  function flash(rig, color, amount) {
    rig.mats.forEach((m, i) => { if (amount > 0) m.emissive.setHex(color).multiplyScalar(amount); else m.emissive.setHex(rig.baseEmissive[i]); });
  }
  function glow(rig, color, amount) {
    for (const m of rig.glowMats) m.emissive.setHex(color).multiplyScalar(amount);
  }

  // ---------------- Poses ----------------
  // A pose is { joint: [x, y, z] } plus body offsets (by = height, brx = forward spin, bfz = forward shift).
  // Attack poses come in pairs: "wind" (the telegraph) and "strike" (follow-through).
  const STANCE = {
    hero: {
      spine: [0.1, -0.2, 0], neck: [-0.05, 0.2, 0],
      shR: [-0.45, 0, -0.18], elR: [-0.75, 0, 0], hdR: [0.25, 0, 0],
      shL: [-0.5, 0.35, 0.25], elL: [-1.1, 0, 0], hdL: [0, 0, 0],
      hipL: [-0.3, 0.15, 0.06], knL: [0.35, 0, 0], hipR: [0.2, -0.1, -0.06], knR: [0.3, 0, 0], by: -0.05,
    },
    skeleton: {
      spine: [0.18, -0.15, 0], neck: [-0.1, 0.15, 0.1],
      shR: [-0.35, 0, -0.25], elR: [-0.6, 0, 0], hdR: [0.4, 0, 0],
      shL: [-0.2, 0, 0.3], elL: [-0.5, 0, 0], hdL: [0, 0, 0],
      hipL: [-0.25, 0.1, 0.08], knL: [0.4, 0, 0], hipR: [0.2, -0.1, -0.08], knR: [0.35, 0, 0], by: -0.06,
    },
    knight: {
      spine: [0.05, -0.25, 0], neck: [0, 0.25, 0],
      shR: [-0.3, 0, -0.15], elR: [-0.9, 0, 0], hdR: [0.6, 0, 0],
      shL: [-0.65, 0.5, 0.2], elL: [-1.2, 0, 0], hdL: [0, 0, 0],
      hipL: [-0.3, 0.15, 0.06], knL: [0.3, 0, 0], hipR: [0.2, -0.1, -0.06], knR: [0.25, 0, 0], by: -0.04,
    },
    brute: {
      spine: [0.4, 0, 0], neck: [-0.4, 0, 0],
      shR: [-0.3, 0, -0.35], elR: [-0.5, 0, 0], hdR: [0.6, 0, 0],
      shL: [-0.3, 0, 0.4], elL: [-0.4, 0, 0], hdL: [0, 0, 0],
      hipL: [-0.2, 0.2, 0.15], knL: [0.35, 0, 0], hipR: [0.15, -0.2, -0.15], knR: [0.3, 0, 0], by: -0.08,
    },
  };
  const ATTACKS = {
    slashR: {   // horizontal swing from the right side across to the left
      wind: { spine: [0.05, -0.85, 0], shR: [-1.35, -1.15, -0.2], elR: [-0.5, 0, 0], hdR: [1.1, 0, 0.3], shL: [-0.6, 0.6, 0.3], hipL: [-0.45, 0, 0], knL: [0.3, 0, 0], hipR: [0.35, 0, 0], knR: [0.4, 0, 0] },
      strike: { spine: [0.15, 0.75, 0], shR: [-1.45, 0.9, -0.1], elR: [-0.1, 0, 0], hdR: [1.35, 0, -0.2], shL: [-0.3, 0.2, 0.5], hipL: [-0.6, 0.2, 0], knL: [0.45, 0, 0], hipR: [0.45, 0, 0], knR: [0.2, 0, 0], bfz: 0.1 },
    },
    slashL: {   // backhand: from the left side back to the right
      wind: { spine: [0.05, 0.7, 0], shR: [-1.3, 0.95, -0.1], elR: [-1.1, 0, 0], hdR: [1.2, 0, -0.4], shL: [-0.4, 0.3, 0.4], hipL: [-0.35, 0, 0], knL: [0.35, 0, 0], hipR: [0.3, 0, 0], knR: [0.3, 0, 0] },
      strike: { spine: [0.15, -0.8, 0], shR: [-1.5, -1.2, -0.25], elR: [-0.05, 0, 0], hdR: [1.35, 0, 0.3], shL: [-0.6, 0.6, 0.3], hipL: [-0.5, 0, 0], knL: [0.3, 0, 0], hipR: [0.5, 0, 0], knR: [0.35, 0, 0], bfz: 0.1 },
    },
    overhead: { // raised high, brought straight down
      wind: { spine: [-0.25, -0.15, 0], shR: [-2.9, 0, -0.2], elR: [-0.4, 0, 0], hdR: [0.3, 0, 0], shL: [-0.3, 0.3, 0.6], hipL: [-0.2, 0, 0], knL: [0.2, 0, 0], hipR: [0.3, 0, 0], knR: [0.3, 0, 0], by: 0.02 },
      strike: { spine: [0.55, 0.05, 0], shR: [-0.95, 0.15, -0.05], elR: [-0.05, 0, 0], hdR: [0.85, 0, 0], shL: [-0.5, 0.4, 0.4], hipL: [-0.75, 0, 0], knL: [0.6, 0, 0], hipR: [0.5, 0, 0], knR: [0.25, 0, 0], by: -0.14, bfz: 0.15 },
    },
    thrust: {   // pulled back to the hip, then straight forward
      wind: { spine: [0.0, -0.6, 0], shR: [-0.3, -0.4, -0.2], elR: [-1.7, 0, 0], hdR: [1.5, 0, 0], hipL: [-0.4, 0, 0], knL: [0.35, 0, 0], hipR: [0.35, 0, 0], knR: [0.35, 0, 0] },
      strike: { spine: [0.25, 0.25, 0], shR: [-1.5, 0.1, -0.05], elR: [0, 0, 0], hdR: [1.5, 0, 0], hipL: [-0.8, 0, 0], knL: [0.5, 0, 0], hipR: [0.55, 0, 0], knR: [0.1, 0, 0], by: -0.1, bfz: 0.2 },
    },
    heavy: {    // a leaping two-handed smash
      wind: { spine: [-0.4, -0.1, 0], neck: [0.2, 0, 0], shR: [-3.0, 0.2, -0.1], elR: [-0.6, 0, 0], hdR: [0.4, 0, 0], shL: [-2.9, -0.3, 0.1], elL: [-0.6, 0, 0], hipL: [-0.5, 0, 0], knL: [0.9, 0, 0], hipR: [0.2, 0, 0], knR: [0.9, 0, 0], by: -0.12 },
      strike: { spine: [0.75, 0, 0], neck: [-0.4, 0, 0], shR: [-0.7, 0.3, 0], elR: [0, 0, 0], hdR: [0.9, 0, 0], shL: [-0.7, -0.3, 0], elL: [0, 0, 0], hipL: [-0.9, 0, 0], knL: [0.9, 0, 0], hipR: [0.6, 0, 0], knR: [0.3, 0, 0], by: -0.22, bfz: 0.25 },
    },
  };
  const BLOCK = {
    hero: { shL: [-1.15, -0.55, 0.1], elL: [-1.2, 0, 0], spine: [0.15, 0.1, 0], shR: [-0.55, 0, -0.35], elR: [-0.9, 0, 0], hdR: [0.4, 0, 0] },
    knight: { shL: [-1.05, -0.45, 0.1], elL: [-1.1, 0, 0], spine: [0.15, 0.1, 0] },
    skeleton: { shR: [-1.2, 0.7, 0], elR: [-1.0, 0, 0], hdR: [0.2, 0, 1.4] },
    brute: { shR: [-1.2, 0.5, 0], elR: [-1.5, 0, 0], shL: [-1.2, -0.5, 0], elL: [-1.5, 0, 0] },
  };

  const JOINTS = ['spine', 'neck', 'shL', 'elL', 'hdL', 'shR', 'elR', 'hdR', 'hipL', 'knL', 'hipR', 'knR'];
  const Z3 = [0, 0, 0];
  function merge(base, over) { const o = Object.assign({}, base); for (const k in over) o[k] = over[k]; return o; }

  // st: { mode, t (time in mode), p (0..1 progress), speed (0..1 of run), atk (pose name), phase: wind|active|recover }
  // Returns the pose and how fast joints chase it (higher = snappier).
  function poseFor(rig, st) {
    const stance = STANCE[rig.kind], T = rig.time;
    let pose = merge(stance, {}), rate = 12;
    const breathe = Math.sin(T * 2.2) * 0.03;
    pose.spine = [stance.spine[0] + breathe, stance.spine[1], stance.spine[2]];

    if (st.mode === 'move' || (st.mode === 'block' && st.speed > 0.05)) {
      // dirF / dirS: the step direction relative to the body (1,0 = forward; -1,0 = backward; 0,±1 = sidestep)
      const ph = st.cycle, s = Math.min(1, st.speed), sw = Math.sin(ph) * 0.75 * s;
      const f = st.dirF === undefined ? 1 : st.dirF, side = st.dirS || 0;
      pose.hipL = [-sw * f - 0.1 * s, 0, 0.03 + sw * side * 0.45]; pose.hipR = [sw * f - 0.1 * s, 0, -0.03 - sw * side * 0.45];
      pose.knL = [0.15 + Math.max(0, Math.sin(ph + 1.4)) * 1.1 * s, 0, 0]; pose.knR = [0.15 + Math.max(0, Math.sin(ph + 1.4 + Math.PI)) * 1.1 * s, 0, 0];
      pose.spine = [stance.spine[0] + 0.12 * s, stance.spine[1] * (1 - s * 0.6) + Math.sin(ph) * 0.12 * s, 0];
      pose.shR = [stance.shR[0] + sw * 0.35, stance.shR[1], stance.shR[2]];
      if (st.mode !== 'block') pose.shL = [stance.shL[0] - sw * 0.35, stance.shL[1], stance.shL[2]];
      pose.by = stance.by - Math.abs(Math.cos(ph)) * 0.05 * s;
      rate = 14;
    }
    if (st.mode === 'block') { pose = merge(pose, BLOCK[rig.kind] || {}); rate = 22; }
    if (st.mode === 'attack') {
      const a = ATTACKS[st.atk] || ATTACKS.slashR;
      if (st.phase === 'wind') { pose = merge(pose, a.wind); rate = st.windRate || 14; }
      else if (st.phase === 'active') { pose = merge(pose, a.strike); rate = 34; }
      else { pose = merge(pose, st.p < 0.4 ? a.strike : {}); rate = st.p < 0.4 ? 30 : 7; }
    }
    if (st.mode === 'roll') {
      const p = st.p, tuck = Math.sin(Math.min(1, p * 1.25) * Math.PI);
      pose = merge(pose, {
        spine: [0.9 * tuck + 0.1, 0, 0], neck: [0.5 * tuck, 0, 0],
        shR: [-1.2 * tuck, 0, -0.2], elR: [-1.5 * tuck, 0, 0], shL: [-1.2 * tuck, 0, 0.2], elL: [-1.5 * tuck, 0, 0],
        hipL: [-1.9 * tuck, 0, 0.1], knL: [2.2 * tuck, 0, 0], hipR: [-1.7 * tuck, 0, -0.1], knR: [2.2 * tuck, 0, 0],
        by: -0.18 * tuck, brx: p < 0.85 ? p / 0.85 * Math.PI * 2 : Math.PI * 2,
      });
      rate = 40;
    }
    if (st.mode === 'dash') {
      // Low and leaning into the dash, whichever way it goes relative to the body (dirF forward, dirS toward +X)
      const k = Math.sin(Math.min(1, st.p * 1.15) * Math.PI), f = st.dirF === undefined ? 1 : st.dirF, sd = st.dirS || 0;
      pose = merge(pose, {
        spine: [0.15 + 0.4 * f * k, 0, -0.35 * sd * k], neck: [-0.25 * f * k, 0, 0.25 * sd * k],
        shR: [0.5 * f * k - 0.2, 0, -0.55 * k - 0.1], elR: [-0.7, 0, 0], shL: [0.5 * f * k - 0.2, 0, 0.55 * k + 0.1], elL: [-0.7, 0, 0],
        hipL: [-0.75 * f * k - 0.25 * k, 0, 0.4 * sd * k], knL: [0.95 * k, 0, 0], hipR: [0.55 * f * k - 0.2 * k, 0, 0.4 * sd * k], knR: [0.7 * k, 0, 0],
        by: -0.17 * k,
      });
      rate = 36;
    }
    if (st.mode === 'stagger' || st.mode === 'hurt') {
      const k = Math.max(0, 1 - st.t * 2.5);
      pose = merge(pose, { spine: [-0.45 * k + 0.05, 0.25 * k, 0], neck: [-0.3 * k, 0, 0], shR: [-0.6, 0, -0.9 * k - 0.2], shL: [-0.4, 0, 0.9 * k + 0.2], by: -0.06 });
      rate = 18;
    }
    if (st.mode === 'broken' || st.mode === 'guardbreak') {
      const sway = Math.sin(T * 3) * 0.08;
      pose = merge(pose, {
        spine: [0.55 + sway, 0.2, 0.1], neck: [0.5, 0, 0.2], shR: [0.1, 0, -0.3], elR: [-0.2, 0, 0], shL: [0.1, 0, 0.3], elL: [-0.2, 0, 0], hdR: [0.6, 0, 0],
        hipL: [-0.4, 0, 0.1], knL: [1.0, 0, 0], hipR: [-0.2, 0, -0.1], knR: [0.9, 0, 0], by: -0.25,
      });
      rate = 10;
    }
    if (st.mode === 'drink') {
      const k = Math.min(1, st.t * 4) * (st.t > 0.7 ? Math.max(0, (0.85 - st.t) / 0.15) : 1);
      pose = merge(pose, { spine: [-0.15 * k, 0, 0], neck: [-0.45 * k, 0, 0], shL: [-2.3 * k, -0.7 * k, 0.2], elL: [-1.7 * k, 0, 0] });
      rate = 16;
    }
    if (st.mode === 'dead') {
      pose = merge(pose, { spine: [-0.3, 0, 0], neck: [-0.4, 0.4, 0], shR: [-2.6, 0, -0.6], elR: [0, 0, 0], shL: [-2.6, 0, 0.6], elL: [0, 0, 0], hipL: [-0.2, 0, 0.2], knL: [0.2, 0, 0], hipR: [-0.1, 0, -0.2], knR: [0.4, 0, 0], brx: -Math.PI / 2, by: -0.4 });
      rate = 7;
    }
    return { pose, rate };
  }

  // ---------------- Motion capture ----------------
  // Attack poses map onto clips; the clip is time-warped so its moment of impact lands exactly on the game's hit frame.
  const MOCAP_ATTACK = {
    ss: { slashR: 'attack1', slashL: 'attack2', overhead: 'attack3', thrust: 'slash5', heavy: 'attackJump', shoot: 'shoot' },
    gs: { slashR: 'gsSlash', slashL: 'gsSlash5', overhead: 'gsAttack', thrust: 'gsAttack', heavy: 'gsJumpAttack' },
    gsHero: { slashR: 'gsSlash', slashL: 'gsSlash5', overhead: 'gsAttack', heavy: 'gsSpin' },
  };
  function locoClip(rig, st) {
    const gs = rig.set === 'gs', run = (st.mps || 0) > 2.8, f = st.dirF === undefined ? 1 : st.dirF, side = st.dirS || 0;
    if (gs) {
      if (f > 0.5 || (rig.calm || st.calm)) return { name: run ? 'gsRun' : 'gsWalk', ref: run ? 4.5 : 1.5 };
      if (f < -0.5) return { name: run ? 'gsRunB' : 'gsWalkB', ref: run ? 3.6 : 1.4 };
      return { name: (run ? 'gsStrafeRun' : 'gsStrafeWalk') + (side > 0 ? 'N' : 'P'), ref: run ? 3.6 : 1.5 };
    }
    if ((rig.calm || st.calm) && f > 0.5) return { name: run ? 'runCalm' : 'walkCalm', ref: run ? 4.6 : 1.6 };
    if (f > 0.5) return { name: run ? 'run' : 'walk', ref: run ? 4.6 : 1.6 };
    if (f < -0.5) return { name: run ? 'runB' : 'walkB', ref: run ? 3.6 : 1.4 };
    return { name: (run ? 'strafeRun' : 'strafeWalk') + (side > 0 ? 'N' : 'P'), ref: run ? 3.6 : 1.5 };
  }
  const out = { q: null, hipsY: 0.9, hipsZ: 0 };
  // Fills rig.tq with the clip pose for this state; returns the blend rate, or 0 when a hand-made pose should be used
  function mocapPose(rig, st, dt) {
    const gs = rig.set === 'gs', m = st.mode;
    out.q = rig.tq; out.hipsY = 0.9; out.hipsZ = 0;
    const moving = (m === 'move' || m === 'block') && (st.speed || 0) > 0.05;
    if (moving) {
      // One shared stride phase, advanced by real ground speed, so walk / strafe / run swap without a hitch
      const lc = locoClip(rig, st), c = Mocap.clips[lc.name];
      rig.loco += dt * Math.min(1.8, Math.max(0.4, (st.mps || 1.5) / lc.ref)) / c.d;
      Mocap.sample(lc.name, rig.loco * c.d, out);
    }
    if (m === 'idle' || m === 'spawn' || (m === 'move' && !moving)) Mocap.sample(gs ? 'gsIdle' : (rig.calm || st.calm) ? 'idleCalm' : 'idle', rig.time, out);
    if (m === 'block') {                                                    // guard up; the legs keep walking underneath when moving
      if (gs && !rig.twoHand) return 0;
      if (gs) Mocap.sample('gsBlock', Math.min(st.blockT || 0, 0.45), out, moving ? Mocap.UPPER : Mocap.BONES);
      else Mocap.sample('blockIdle', rig.time, out, moving ? Mocap.UPPER : Mocap.BONES);
      return 20;
    }
    if (m === 'idle' || m === 'move' || m === 'spawn') return 16;
    if (m === 'attack') {
      const name = MOCAP_ATTACK[rig.twoHand ? 'gsHero' : rig.set][st.atk] || (gs ? 'gsSlash' : 'attack1'), c = Mocap.clips[name];
      const W = st.wind, A = st.active, R = st.recover, el = st.phase === 'wind' ? st.phaseT : st.phase === 'active' ? W + st.phaseT : W + A + st.phaseT;
      const hitAt = W + A * 0.5, hitT = c.hit * c.d;
      const ct = el <= hitAt ? hitT * el / hitAt : hitT + (c.d - hitT) * Math.min(1, (el - hitAt) / (A * 0.5 + R));
      Mocap.sample(name, ct, out);
      out.hipsZ = 0;                                                        // the game moves the body itself (lunges)
      return 30;
    }
    if (m === 'hurt' || m === 'stagger') { Mocap.sample(gs ? 'gsImpact' : (rig.hurtVar ? 'impact2' : 'impact'), Math.min(st.t * 1.6, 0.75), out); out.hipsZ = 0; return 22; }
    if (m === 'dead') { Mocap.sample(gs ? 'gsDie' : rig.dieVar ? 'die2' : 'die', st.t * 1.5, out); return 14; }
    return 0;                                                                // roll, broken, guard break: hand-made poses
  }

  const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), yawQ = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), tmpE = new THREE.Euler(), ID = new THREE.Quaternion();
  function animate(rig, st, dt) {
    if (rig.spider) return animateSpider(rig, st, dt);
    rig.time += dt;
    let rate = rig.mocap ? mocapPose(rig, st, dt) : 0, pose = null;
    const b = rig.body, hips = rig.j.hips;
    if (rate) {
      // Clip-driven: the pelvis takes the clip's height (scaled to these slightly shorter legs) and the body stays put
      const k = 1 - Math.exp(-rate * dt);
      for (const n of ['hips', ...JOINTS]) { const jt = rig.j[n]; if (jt) jt.quaternion.slerp(rig.tq[n], k); }
      hips.position.y += (0.45 + (out.hipsY - 0.9) * 0.95 - hips.position.y) * k;
      hips.position.z += (out.hipsZ - hips.position.z) * k;
      b.position.y += (0.5 - b.position.y) * k; b.position.z += (0 - b.position.z) * k; b.rotation.x = 0;
    } else {
      const pr = poseFor(rig, st); pose = pr.pose; rate = pr.rate;
      const k = 1 - Math.exp(-rate * dt);
      for (const n of JOINTS) {
        const jt = rig.j[n]; if (!jt) continue;
        const t = pose[n] || Z3;
        tmpE.set(t[0], t[1], t[2], jt.rotation.order); tmpQ.setFromEuler(tmpE);
        jt.quaternion.slerp(tmpQ, k);
      }
      hips.quaternion.slerp(ID, k); hips.position.y += (0.45 - hips.position.y) * k; hips.position.z += (0 - hips.position.z) * k;
      b.position.y += (0.5 + (pose.by || 0) - b.position.y) * k;
      b.position.z += ((pose.bfz || 0) - b.position.z) * k;
      // The roll spin must not ease back through zero, so it is set directly
      if (st.mode === 'roll') b.rotation.x = pose.brx; else if (st.mode === 'dead') b.rotation.x += (pose.brx - b.rotation.x) * k;
      else b.rotation.x = 0;
      if (st.mode === 'dead') b.position.y += (0.18 - b.position.y) * k;
    }
    // Two-handed grip: the left fist is drawn onto the hilt below the right one
    if (rig.twoHand) {
      const on = st.mode === 'idle' || st.mode === 'move' || st.mode === 'block' || st.mode === 'attack';
      rig.ikW = (rig.ikW || 0) + ((on ? 1 : 0) - (rig.ikW || 0)) * Math.min(1, dt * 12);
      gripIK(rig, rig.ikW);
    }
    if (rig.j.cape) {
      const target = 0.15 + (st.speed || 0) * 0.7 + Math.sin(rig.time * 6) * 0.05 * (0.3 + (st.speed || 0));
      rig.j.cape.rotation.x += (target - rig.j.cape.rotation.x) * (1 - Math.exp(-8 * dt));
    }
    // Without motion capture, shields always face the way the chest faces, turned outward unless blocking
    if (rig.shield && !rig.mocap) {
      const want = st.mode === 'block' ? -0.15 : 0.75;
      rig.shieldYaw += (want - rig.shieldYaw) * (1 - Math.exp(-18 * dt));
      rig.root.updateMatrixWorld(true);
      rig.j.chest.getWorldQuaternion(tmpQ);
      rig.j.hdL.getWorldQuaternion(tmpQ2);
      yawQ.setFromAxisAngle(Y, rig.shieldYaw);
      rig.shield.quaternion.copy(tmpQ2.invert().multiply(tmpQ).multiply(yawQ));
    }
  }

  // ---------------- Two-bone arm IK ----------------
  // Puts the left hand on the two-handed grip: solves the elbow from the arm lengths with the elbow bent down and out,
  // then aims the upper arm and forearm at it (twist is not needed for these round limbs). w blends from the clip pose.
  const ikS = new THREE.Vector3(), ikT = new THREE.Vector3(), ikE = new THREE.Vector3(), ikU = new THREE.Vector3(), ikP = new THREE.Vector3(), ikD = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0);
  const iqA = new THREE.Quaternion(), iqB = new THREE.Quaternion();
  function aimLimb(jt, dir, w) {
    jt.parent.getWorldQuaternion(iqA); iqB.setFromUnitVectors(DOWN, dir);
    jt.quaternion.slerp(iqA.invert().multiply(iqB), w);
    jt.updateMatrixWorld(true);
  }
  function gripIK(rig, w) {
    if (w < 0.01 || !rig.weapon) return;
    const sh = rig.j.shL, el = rig.j.elL, a = 0.3, b = 0.29;
    rig.root.updateMatrixWorld(true);
    ikT.set(0, 0, -0.2); rig.weapon.group.localToWorld(ikT);
    sh.getWorldPosition(ikS);
    ikU.subVectors(ikT, ikS); const raw = ikU.length(); ikU.divideScalar(raw || 1);
    const d = Math.min(a + b - 0.005, Math.max(Math.abs(a - b) + 0.01, raw));
    const cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    rig.root.getWorldQuaternion(iqA); ikP.set(0.5, -1, -0.2).applyQuaternion(iqA);       // pole: down and out to the left side
    ikP.addScaledVector(ikU, -ikP.dot(ikU)).normalize();
    ikE.copy(ikS).addScaledVector(ikU, a * cosA).addScaledVector(ikP, a * sinA);
    aimLimb(sh, ikD.subVectors(ikE, ikS).normalize(), w);
    el.getWorldPosition(ikE);
    aimLimb(el, ikD.subVectors(ikT, ikE).normalize(), w);
  }

  // ---------------- Fewer draw calls ----------------
  // Bakes the meshes directly under a node that share a material (and shadow setting) into one mesh; with deep, does
  // the same under every joint. Joints, weapons and shields keep moving as before; only their parts are combined.
  // With keep (a list of materials that must stay apart, such as glowing weapons), plain coloured materials that differ
  // only in colour are combined too: each part's colour is baked into the mesh as vertex colours.
  const mergeM = new THREE.Matrix4(), mergeC = new THREE.Color();
  function mergeKey(o, keep) {
    const m = o.material, sh = (o.castShadow ? 's' : '') + (o.receiveShadow ? 'r' : '');
    if (!keep || keep.includes(m) || !m.isMeshStandardMaterial || m.map || m.vertexColors) return m.uuid + sh;
    return ['v', Math.round(m.roughness * 4), Math.round(m.metalness * 2), m.emissive.getHex(), m.transparent, m.opacity, m.side, m.flatShading, sh].join('|');      // near enough roughness and metal share one material
  }
  function bake(node, deep = false, keep = null) {
    if (deep) for (const c of node.children.slice()) if (!c.isMesh) bake(c, true, keep);
    const groups = new Map();
    for (const o of node.children) {
      if (!o.isMesh || o.children.length || !o.geometry.attributes.normal) continue;
      const key = mergeKey(o, keep);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    }
    for (const [key, list] of groups) {
      if (list.length < 2) continue;
      const colours = key[0] === 'v' && list.some(o => !o.material.color.equals(list[0].material.color));
      let n = 0; const parts = [];
      for (const o of list) {
        o.updateMatrix(); mergeM.copy(o.matrix);
        const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(mergeM);
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        parts.push([g, o.material.color]); n += g.attributes.position.count;
      }
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = colours ? new Float32Array(n * 3) : null;
      let k = 0;
      for (const [g, c] of parts) {
        const cnt = g.attributes.position.count;
        pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); uv.set(g.attributes.uv.array, k * 2);
        if (col) for (let v = 0; v < cnt; v++) { col[(k + v) * 3] = c.r; col[(k + v) * 3 + 1] = c.g; col[(k + v) * 3 + 2] = c.b; }
        k += cnt; g.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      let mat = list[0].material;
      if (col) { geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); mat = mat.clone(); mat.color.setHex(0xffffff); mat.vertexColors = true; }
      geo.computeBoundingSphere();
      const mm = new THREE.Mesh(geo, mat); mm.castShadow = list[0].castShadow; mm.receiveShadow = list[0].receiveShadow;
      node.add(mm);
      for (const o of list) node.remove(o);                                // never drawn, so nothing on the GPU to free
    }
  }

  // ---------------- Swing trail ----------------
  // A ribbon between the blade's base and tip over the last few frames, fading out (additive blending).
  function makeTrail(scene, color) {
    const N = 10, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 2 * 3), col = new Float32Array(N * 2 * 3), idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.frustumCulled = false; scene.add(m);
    return { mesh: m, N, pts: [], color: new THREE.Color(color), on: false };
  }
  const va = new THREE.Vector3(), vb = new THREE.Vector3();
  function updateTrail(tr, wpn, on, color) {
    if (color !== undefined) tr.color.setHex(color);
    if (on) { wpn.base.getWorldPosition(va); wpn.tip.getWorldPosition(vb); tr.pts.unshift([va.clone(), vb.clone()]); }
    else tr.pts.shift();
    if (tr.pts.length > tr.N) tr.pts.length = tr.N;
    const pos = tr.mesh.geometry.attributes.position, col = tr.mesh.geometry.attributes.color;
    for (let i = 0; i < tr.N; i++) {
      const p = tr.pts[Math.min(i, tr.pts.length - 1)], f = tr.pts.length ? (1 - i / tr.N) * 0.9 : 0;
      for (let s = 0; s < 2; s++) {
        const v = p ? p[s] : va; pos.setXYZ(i * 2 + s, v.x, v.y, v.z);
        const fs = f * (s ? 1 : 0.15); col.setXYZ(i * 2 + s, tr.color.r * fs, tr.color.g * fs, tr.color.b * fs);
      }
    }
    pos.needsUpdate = col.needsUpdate = true;
    tr.mesh.visible = tr.pts.length > 1;
  }

  return { build, animate, flash, glow, makeTrail, updateTrail, bake, ATTACKS };
})();
