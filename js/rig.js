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
  // A caster's staff: a long crooked shaft with a glowing orb (or, for bone callers, a skull) at its head
  function staff(hand, color, skull) {
    const g = joint(hand, 0, -0.03, 0), wood = std(0x3a2a1e), orbM = std(color, 0.3); orbM.emissive.setHex(color); orbM.emissiveIntensity = 0.8;     // lit from within, and can still flash for telegraphs
    mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.6, 6).rotateX(Math.PI / 2), wood, g, 0, 0, 0.45);
    if (skull) { ball(g, 0.09, std(0xd8cfb4), 0, 0, 1.3, 8, 6); ball(g, 0.03, orbM, 0, 0.03, 1.38, 5, 4); }
    else { mesh(new THREE.TorusGeometry(0.1, 0.018, 5, 10), wood, g, 0, 0, 1.32).rotation.y = Math.PI / 2; ball(g, 0.075, orbM, 0, 0, 1.32, 8, 6); }
    const tip = joint(g, 0, 0, 1.35), base = joint(g, 0, 0, 1.0);
    return { group: g, glowMats: [orbM], tip, base };
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
  // A mutant's claws: three hooked talons along the hand
  function claws(hand) {
    const g = joint(hand, 0, -0.06, 0), bone = std(0xd8d0bc, 0.4), glow = std(0x3affd8, 0.4); glow.emissive.setHex(0x1a8a70);
    for (let k = -1; k <= 1; k++) { const c = mesh(new THREE.ConeGeometry(0.025, 0.24, 5).rotateX(Math.PI / 2), k ? bone : glow, g, k * 0.04, 0, 0.14); c.rotation.x = -0.25; }
    return { group: g, glowMats: [bone, glow], tip: joint(g, 0, -0.04, 0.27), base: joint(g, 0, 0, 0.05) };
  }
  // A big fist: a troll's knuckles or a golem's boulder (its glowing runes are what telegraphs)
  function fist(hand, VAR) {
    const g = joint(hand, 0, -0.05, 0), golem = VAR === 'golem', m = std(golem ? 0x5a5650 : 0x4e6640, 0.9);
    const f = golem ? box(g, 0.28, 0.26, 0.3, m, 0, -0.04, 0.04) : ball(g, 0.15, m, 0, -0.03, 0.04, 8, 6); if (!golem) f.scale.set(1.1, 0.9, 1.2);
    const glow = std(golem ? 0xff8a2a : 0xe8e0c8, 0.5); if (golem) glow.emissive.setHex(0x8a3a10);
    for (let k = -1; k <= 1; k++) box(g, 0.05, 0.05, 0.05, glow, k * 0.07, -0.02, golem ? 0.2 : 0.17);
    return { group: g, glowMats: [m, glow], tip: joint(g, 0, -0.04, 0.22), base: joint(g, 0, 0, 0) };
  }
  // A bard's lute and a villager's basket, held in the left hand
  function lute(hand) {
    const g = joint(hand, 0, -0.03, 0), wood = std(0x8a5a2a), dark = std(0x3a2416);
    const body = ball(g, 0.16, wood, 0, 0, 0.12, 9, 7); body.scale.set(1, 0.45, 1.25);
    box(g, 0.05, 0.03, 0.42, dark, 0, 0.02, 0.42); box(g, 0.08, 0.04, 0.1, dark, 0, 0.02, 0.66).rotation.x = 0.5;
    return { group: g, glowMats: [wood], tip: joint(g, 0, 0, 0.6), base: joint(g, 0, 0, 0.2) };
  }
  function basket(hand) {
    const g = joint(hand, 0, -0.1, 0), wicker = std(0xa07a3a);
    mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.18, 8, 1, true), wicker, g, 0, -0.08, 0).material.side = THREE.DoubleSide;
    mesh(new THREE.TorusGeometry(0.15, 0.015, 4, 10, Math.PI), wicker, g, 0, 0.02, 0);
    for (let k = 0; k < 3; k++) ball(g, 0.05, std([0xc04a2a, 0x7aa03a, 0xd8b04a][k]), -0.06 + k * 0.06, 0.0, 0.02, 6, 5);
    return { group: g, glowMats: [wicker], tip: joint(g, 0, 0, 0.1), base: joint(g, 0, 0, 0) };
  }
  // A bow held at its middle; when the arm points forward the limbs stand upright (hand +Z) and the string is near the body
  function bow(hand) {
    const g = joint(hand, 0, -0.03, 0), wood = std(0x4a3420), R = 0.5;
    mesh(new THREE.TorusGeometry(R, 0.025, 5, 16, Math.PI).rotateY(-Math.PI / 2).rotateX(Math.PI).translate(0, R * 0.92, 0), wood, g, 0, 0, 0);
    box(g, 0.008, 0.008, R * 2, std(0xd8d0b8), 0, R * 0.92, 0);
    const tip = joint(g, 0, R * 0.92, R), base = joint(g, 0, R * 0.92, -R);
    return { group: g, glowMats: [wood], tip, base };
  }
  // The cleric's scepter: a short gilded rod ending in a sunburst around a glowing heart
  function scepter(hand, o) {
    const g = joint(hand, 0, -0.03, 0), gold = std(0xd9a92a, 0.3, 0.6), wood = std(0xe8e0d0, 0.6, 0.1);
    const heartM = std(o.glow || 0xfff0b0, 0.3); heartM.emissive.setHex(o.glow || 0xfff0b0); heartM.emissiveIntensity = 0.9;
    mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.8, 7).rotateX(Math.PI / 2), wood, g, 0, 0, 0.3);
    mesh(new THREE.TorusGeometry(0.085, 0.014, 5, 12), gold, g, 0, 0, 0.78);
    ball(g, 0.055, heartM, 0, 0, 0.78, 8, 6);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const r = mesh(new THREE.ConeGeometry(0.018, 0.1, 4), gold, g, Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.78); r.rotation.z = a - Math.PI / 2; }
    const tip = joint(g, 0, 0, 0.9), base = joint(g, 0, 0, 0.6);
    return { group: g, glowMats: [heartM], tip, base };
  }
  // Off-hand pieces of the ranged classes: a quiver on the back, an orb or a book held in the left hand
  function quiver(parent) {
    const g = joint(parent, 0.06, 0.22, -0.2), leather = std(0x5a3a22), wood = std(0x8a6a40);
    g.rotation.set(0, 0, -0.35);
    mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.5, 8), leather, g, 0, 0.05, 0);
    for (let i = 0; i < 3; i++) box(g, 0.04, 0.12, 0.012, std(0xe8e0d0), (i - 1) * 0.035, 0.36, (i - 1) * 0.01);
    box(g, 0.012, 0.012, 0.0, wood, 0, 0.3, 0);
    return g;
  }
  function orb(hand, color) {
    const g = joint(hand, 0, -0.08, 0.1), m = std(color || 0x7ae8ff, 0.3); m.emissive.setHex(color || 0x7ae8ff); m.emissiveIntensity = 0.9;
    ball(g, 0.1, m, 0, 0, 0.06, 10, 8); mesh(new THREE.TorusGeometry(0.13, 0.012, 5, 14), std(0xd9a92a, 0.3, 0.6), g, 0, 0, 0.06).rotation.x = 1.2;
    return { group: g, glowMats: [m] };
  }
  function tome(hand, color) {
    const g = joint(hand, 0, -0.08, 0.1), cover = std(color || 0x6a2a2a, 0.8), pages = std(0xe8e0c8, 0.9), gold = std(0xd9a92a, 0.3, 0.6);
    box(g, 0.2, 0.05, 0.26, cover, 0, 0, 0.1); box(g, 0.18, 0.035, 0.24, pages, 0, 0.003, 0.1); box(g, 0.05, 0.056, 0.05, gold, 0, 0, 0.1);
    return { group: g, glowMats: [] };
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

  // ---------------- Helms ----------------
  // The hero's head is a 0.23 x 0.26 x 0.24 box centred on the head joint. Each helm fully covers its top half:
  // 0 a leather cap, 1 a squared steel helm with a nasal guard, 2 a closed great helm with a visor slit.
  function helmet(head, style, m) {
    const shell = mat => { const c = mat.clone(); c.side = THREE.DoubleSide; return c; };          // seen from below, the inside shows
    // The rims sit at 0.065, above the eyes (0.02), and the domes clear the head's top corners
    if (style === 0) {                                                     // a padded leather cap, fitted to the square head
      box(head, 0.27, 0.11, 0.28, m.leather, 0, 0.11, 0);
      const top = mesh(new THREE.SphereGeometry(0.15, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), shell(m.leather), head, 0, 0.165, 0); top.scale.set(0.95, 0.35, 0.98);
      box(head, 0.285, 0.025, 0.295, m.dark, 0, 0.065, 0);                   // stitched band
    } else if (style === 1) {                                              // a squared steel helm, open-faced
      box(head, 0.28, 0.15, 0.29, m.steel, 0, 0.13, 0);                      // the shell over the crown, rim above the eyes
      box(head, 0.31, 0.022, 0.32, m.steel, 0, 0.06, 0.005);                 // brim
      box(head, 0.035, 0.11, 0.03, m.steel, 0, 0.01, 0.16);                  // nasal guard, down between the eyes
      for (const s of [1, -1]) box(head, 0.025, 0.15, 0.17, m.steel, 0.145 * s, -0.01, -0.04);   // cheek plates
      box(head, 0.28, 0.14, 0.025, m.steel, 0, 0.0, -0.148);                  // neck guard
      box(head, 0.03, 0.03, 0.3, m.dark, 0, 0.215, 0);                       // a dark ridge along the top
    } else {
      box(head, 0.29, 0.34, 0.33, m.steel, 0, 0.015, 0.01);                   // front at 0.175, clear of the nose
      box(head, 0.22, 0.03, 0.02, m.dark, 0, 0.03, 0.175);                   // visor slit
      for (let i = -2; i <= 2; i++) box(head, 0.012, 0.012, 0.02, m.dark, i * 0.035, -0.05, 0.176);   // breaths
      box(head, 0.03, 0.04, 0.3, m.steel, 0, 0.2, 0);                        // crest
      box(head, 0.31, 0.03, 0.32, m.dark, 0, -0.14, 0);                      // rim
    }
  }

  // ---------------- Single items (the gear screen's pictures) ----------------
  // One piece of gear on its own, from Items.itemLook: the same parts the hero wears, posed to be seen from the front
  // (+Z toward the viewer, up is +Y). Weapons stand diagonally, blade up.
  function item(L) {
    const root = new THREE.Group(), hold = new THREE.Group(); root.add(hold);
    const steel = std(0x9ca2ad, 0.45, 0.55), leather = std(0x6a4a2c), dark = std(0x1e1a18), gold = std(0xd9a92a, 0.3, 0.6);
    if (L.slot === 'weapon') {
      hold.rotation.set(-Math.PI / 2, 0, 0); root.rotation.z = -Math.PI / 4;        // the weapon's +Z points up, then leans right
      const o = { blade: L.blade | 0x404040, len: L.len, twoHanded: L.twoHanded };
      let w;
      if (L.type === 'axe') { w = axe(hold, { blade: L.blade }); w.group.rotation.z = Math.PI / 2; }      // the head's flat side to the viewer
      else if (L.type === 'mace') w = mace(hold, { blade: L.blade });
      else if (L.type === 'spear') w = spear(hold, o);
      else if (L.type === 'bow') { w = bow(hold); w.group.rotation.set(0, 0, 0); }
      else if (L.type === 'staff') w = staff(hold, L.glow || 0x4ae8d0);
      else if (L.type === 'scepter') w = scepter(hold, { glow: L.glow });
      else if (L.type === 'daggers') {
        w = sword(hold, Object.assign(o, { len: 0.42, thin: true })); w.group.position.x = -0.09; w.group.rotation.y = 0.35;
        const off = sword(hold, o); off.group.position.x = 0.09; off.group.rotation.y = -0.35;
        if (L.glow) for (const m of off.glowMats) { m.emissive.setHex(L.glow); m.emissiveIntensity = 0.35; }
      } else w = sword(hold, o);
      if (L.glow) for (const m of w.glowMats) { m.emissive.setHex(L.glow); m.emissiveIntensity = 0.35; }
    } else if (L.slot === 'shield') {
      if (L.kind === 'quiver') { const q = quiver(hold); q.position.set(0, -0.2, 0); q.rotation.set(0, 0.4, 0); }
      else if (L.kind === 'orb') orb(hold, L.glow || 0x7ae8ff).group.position.set(0, 0, 0);
      else if (L.kind === 'tome') tome(hold, L.face).group.rotation.set(-0.9, 0.5, 0);
      else roundShield(hold, L.face);
    } else if (L.slot === 'armor') {
      const cloth = std(L.armor);
      const torso = mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.36, 9), cloth, hold, 0, 0, 0); torso.scale.z = 0.72;
      mesh(new THREE.CylinderGeometry(0.175, 0.24, 0.3, 9, 1, true), cloth, hold, 0, -0.32, 0).material.side = THREE.DoubleSide;   // skirt
      mesh(new THREE.TorusGeometry(0.168, 0.025, 5, 14).rotateX(Math.PI / 2), leather, hold, 0, -0.18, 0);
      if (L.plate) { const pl = mesh(new THREE.CylinderGeometry(0.21, 0.165, 0.34, 9), steel, hold, 0, 0.01, 0); pl.scale.z = 0.76; for (const s of [1, -1]) ball(hold, 0.12, steel, 0.21 * s, 0.14, 0, 8, 6).scale.set(1, 0.65, 1); }
      else { const strap = box(hold, 0.06, 0.48, 0.03, leather, 0, 0, 0.13); strap.rotation.z = 0.7; ball(hold, 0.12, steel, 0.19, 0.14, 0, 8, 6).scale.set(1, 0.65, 1); }
      hold.rotation.y = 0.35;
    } else if (L.slot === 'helm') {
      const wood = std(0x3a2c24, 0.9);                                       // a dark wooden stand's head, so the helm reads as worn
      box(hold, 0.23, 0.26, 0.24, wood, 0, 0, 0); mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 8), wood, hold, 0, -0.18, 0);
      helmet(hold, L.helm, { steel, leather, dark }); hold.rotation.y = 0.5;
    } else if (L.slot === 'gloves') {                                     // a pair: wraps, leather gloves or steel gauntlets
      const m = [leather, std(0x3a2a1e), steel][L.wc];
      for (const sd of [-1, 1]) {
        const h = new THREE.Group(); hold.add(h); h.position.x = sd * 0.11; h.rotation.z = sd * 0.15;
        box(h, 0.12, 0.13, 0.05, m, 0, 0, 0); mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.1, 8), m, h, 0, -0.11, 0);
        for (let f = 0; f < 4; f++) box(h, 0.024, 0.07, 0.04, m, -0.045 + f * 0.03, 0.095, 0);
        box(h, 0.03, 0.06, 0.04, m, sd * -0.075, 0.02, 0.01).rotation.z = sd * 0.6;                        // thumb
        if (L.wc === 2) box(h, 0.13, 0.04, 0.06, dark, 0, -0.03, 0.005);
      }
      hold.rotation.x = -0.2;
    } else if (L.slot === 'boots') {                                      // a pair: shoes, boots or sabatons
      const m = [leather, std(0x3a2618), steel][L.wc], tall = [0.1, 0.24, 0.26][L.wc];
      for (const sd of [-1, 1]) {
        const b = new THREE.Group(); hold.add(b); b.position.x = sd * 0.09;
        mesh(new THREE.CylinderGeometry(0.065, 0.06, tall, 8), m, b, 0, tall / 2, 0);
        box(b, 0.11, 0.07, 0.24, m, 0, 0.035, 0.06);
        if (L.wc === 2) { box(b, 0.12, 0.2, 0.03, steel, 0, 0.15, 0.065); box(b, 0.12, 0.03, 0.2, dark, 0, 0.075, 0.08); }
      }
      hold.rotation.y = 0.6;
    } else {
      const gem = glowMat(L.uniq === 'heart' ? 0xff4a4a : 0x7fe8ff);
      if (L.trinket === 'Ring') { mesh(new THREE.TorusGeometry(0.1, 0.026, 8, 18), gold, hold); ball(hold, 0.035, gem, 0, 0.12, 0, 8, 6); hold.rotation.x = 0.5; }
      else if (L.trinket === 'Coin') { mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.025, 16).rotateX(Math.PI / 2), gold, hold); box(hold, 0.05, 0.05, 0.03, std(0x8a6a14), 0, 0, 0.012).rotation.z = Math.PI / 4; hold.rotation.y = 0.4; }
      else if (L.trinket === 'Charm') { const t = mesh(new THREE.ConeGeometry(0.05, 0.2, 6), std(0xe8e0c8), hold, 0, -0.06, 0); t.rotation.z = Math.PI; mesh(new THREE.TorusGeometry(0.03, 0.01, 5, 10), gold, hold, 0, 0.06, 0); ball(hold, 0.02, gem, 0, -0.02, 0.04, 6, 5); }
      else { mesh(new THREE.TorusGeometry(0.15, 0.008, 4, 24, Math.PI).rotateZ(Math.PI), gold, hold, 0, 0.12, 0); ball(hold, 0.055, gold, 0, -0.03, 0, 8, 6); ball(hold, 0.032, gem, 0, -0.03, 0.04, 8, 6); }
    }
    root.updateMatrixWorld(true);
    return root;
  }

  // ---------------- Bodies ----------------
  // One humanoid skeleton of joints; "kind" picks proportions, materials and armour.
  // o.look (hero): gear appearance from Items.look(); o.npc (kind 'npc'): { cloth, hair, beard, elder, apron, tool }
  function build(kind, o = {}) {
    if (kind === 'spider') return buildSpider();
    if (kind === 'mimic') return buildMimic();
    if (kind === 'wolf' || kind === 'boar') return buildBeast(kind);
    const scout = kind === 'scout'; if (scout) kind = 'goblin';                // a goblin with throwing spears
    const L = o.look || {}, N = o.npc || {}, VAR = o.variant || 'horror';       // VAR: a big monster's form (horror / troll / golem)
    const S = {
      npc: { skin: N.skin || 0xd9a47a, cloth: N.cloth || 0x6a5a40, pants: 0x3a3028, boot: 0x2b1d14, w: 1, limbR: 1 },
      hero: { skin: L.skin || 0xe2a982, cloth: L.armor || 0x2f4a6b, pants: 0x3a3028, boot: [0x2b1d14, 0x6a4a2c, 0x3a2618, 0x8a909a][(L.boots === undefined ? -1 : L.boots) + 1], w: 1, limbR: 1 },
      skeleton: { skin: 0xd8cfb4, cloth: 0x3a2f2a, pants: 0x3a2f2a, boot: 0xd8cfb4, w: 0.85, limbR: 0.55 },
      archer: { skin: 0xcfc6aa, cloth: 0x2e3a2a, pants: 0x2e3a2a, boot: 0xcfc6aa, w: 0.85, limbR: 0.55 },
      goblin: { skin: 0x6a8a3a, cloth: 0x4a3a2a, pants: 0x3a2e22, boot: 0x2a2018, w: 0.92, limbR: 0.85 },
      duelist: { skin: 0xe8e2d8, cloth: 0x2a2032, pants: 0x1e1a24, boot: 0x16141a, w: 0.95, limbR: 0.92 },
      knight: { skin: 0x5a606c, cloth: 0x6a1a1a, pants: 0x3a3e48, boot: 0x2a2c32, w: 1.08, limbR: 1.1 },
      brute: { skin: 0x7d8a5a, cloth: 0x4a3420, pants: 0x4a3420, boot: 0x3a2a1a, w: 1.35, limbR: 1.45 },
      caster: { skin: 0x8aa898, cloth: 0x1e4a4a, pants: 0x1a3434, boot: 0x14201e, w: 0.95, limbR: 0.9 },
      necro: { skin: 0xd8cfb4, cloth: 0x3a1e4a, pants: 0x3a1e4a, boot: 0xd8cfb4, w: 0.85, limbR: 0.55 },
      mutant: { horror: { skin: 0x46505a, cloth: 0x24202a, pants: 0x2a2630, boot: 0x46505a, w: 1.5, limbR: 1.8 }, troll: { skin: 0x5a7048, cloth: 0x4a3a28, pants: 0x4a3a28, boot: 0x5a7048, w: 1.6, limbR: 1.9 }, golem: { skin: 0x6e6a64, cloth: 0x4a4642, pants: 0x4a4642, boot: 0x6e6a64, w: 1.75, limbR: 2.1 } }[VAR],
    }[kind];
    if (o.colors) Object.assign(S, o.colors);                              // a recoloured variant (the shield-bearer is a knight in blue)
    const rig = { kind, j: {}, mats: [], glowMats: [], trail: null };
    const root = new THREE.Group(), body = joint(root, 0, 0.5, 0), hips = joint(body, 0, 0.45, 0);
    rig.root = root; rig.body = body; rig.j.hips = hips;
    const skin = std(S.skin, kind === 'knight' ? 0.45 : 0.8, kind === 'knight' ? 0.55 : 0), cloth = std(S.cloth), pants = std(S.pants), boot = std(S.boot, 0.9);
    const steel = std(0x9ca2ad, 0.45, 0.55), leather = std(0x6a4a2c), dark = std(0x1e1a18);
    const w = S.w, R = S.limbR, bony = kind === 'skeleton' || kind === 'archer' || kind === 'necro', robed = kind === 'caster' || kind === 'necro';

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
      if (kind === 'hero' && L.boots === 2) box(knee, 0.11, 0.3, 0.05, steel, 0, -0.2, 0.06);           // greaves
      const ankle = joint(knee, 0, -0.42, 0);
      box(ankle, 0.11 * R, 0.08, 0.25, boot, 0, 0.0, 0.05);
      if (kind === 'hero' && L.boots === 2) box(ankle, 0.13, 0.04, 0.2, steel, 0, 0.05, 0.08);         // sabaton plate
      rig.j['hip' + n] = hip; rig.j['kn' + n] = knee;
    }

    // Spine, chest, head
    const spine = joint(hips, 0, 0.05, 0, 'YXZ'); rig.j.spine = spine;
    if (bony) {
      for (let i = 0; i < 4; i++) box(spine, 0.05, 0.05, 0.05, skin, 0, 0.03 + i * 0.07, -0.04);
    } else mesh(new THREE.CylinderGeometry(0.15 * w, 0.155 * w, 0.24, 9), kind === 'brute' || kind === 'mutant' ? skin : cloth, spine, 0, 0.1, 0);
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
      const torso = mesh(new THREE.CylinderGeometry(0.2 * w, 0.16 * w, 0.36, 9), kind === 'brute' || kind === 'mutant' ? skin : cloth, chest, 0, 0.08, 0);
      torso.scale.z = 0.72;
      if (kind === 'hero') {
        if (L.plate) { const pl = mesh(new THREE.CylinderGeometry(0.21, 0.165, 0.34, 9), steel, chest, 0, 0.09, 0); pl.scale.z = 0.76; for (const s of [1, -1]) ball(chest, 0.12, steel, 0.21 * s, 0.22, 0, 8, 6).scale.set(1, 0.65, 1); }
        else { const strap = box(chest, 0.06, 0.48, 0.03, leather, 0, 0.08, 0.13); strap.rotation.z = 0.7; ball(chest, 0.12, steel, 0.19, 0.22, 0, 8, 6, 0).scale.set(1, 0.65, 1); }
        if (L.mail) { const ml = mesh(new THREE.CylinderGeometry(0.205, 0.17, 0.3, 9), std(0x7a7e86, 0.6, 0.45), chest, 0, 0.04, 0); ml.scale.z = 0.75; }   // a mail shirt under the strap
        box(chest, 0.34, 0.06, 0.24, std(0x7a2a22), 0, 0.27, 0);             // scarf
        if (L.trinket) { ball(chest, 0.035, std(0xd9a92a, 0.3, 0.6), 0, 0.12, 0.15, 6, 5); ball(chest, 0.018, glowMat(0x7fe8ff), 0, 0.12, 0.18, 5, 4); }
      }
      if (kind === 'duelist') {
        mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.9, 10, 1, true), cloth, chest, 0, -0.42, -0.02).material.side = THREE.DoubleSide;   // long coat
        box(chest, 0.26, 0.2, 0.03, std(0xc9a23a, 0.4, 0.5), 0, 0.12, 0.13);                     // gilded breast
        box(chest, 0.36, 0.16, 0.26, cloth, 0, 0.3, -0.02);                                        // high collar
      }
      if (kind === 'goblin') { const v = box(chest, 0.34, 0.3, 0.26, std(0x5a4430), 0, 0.06, 0); v.rotation.z = 0.08; }
      if (kind === 'caster') box(chest, 0.08, 0.4, 0.03, std(0x8ae8d0, 0.4), 0, 0.05, 0.13);       // a pale stole
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
      if (kind === 'mutant' && VAR === 'troll') {                          // a troll: mossy shoulders, a hide kilt, a rope belt of bones
        const moss = std(0x3a5a2a);
        for (const sd of [1, -1]) { ball(chest, 0.21, skin, 0.27 * sd, 0.2, -0.02, 9, 7).scale.set(1.1, 0.8, 1.0); for (let k = 0; k < 3; k++) ball(chest, 0.07, moss, 0.27 * sd + (k - 1) * 0.06, 0.33, -0.04 + k * 0.03, 5, 4); }
        box(chest, 0.44, 0.22, 0.32, std(0x4a3a28), 0, -0.28, 0);
        for (let k = 0; k < 3; k++) mesh(new THREE.ConeGeometry(0.025, 0.12, 4), std(0xe8e0c8), chest, -0.12 + k * 0.12, -0.38, 0.17).rotation.x = Math.PI;
      } else if (kind === 'mutant' && VAR === 'golem') {                   // a golem: stone plates, a burning rune core
        const core = glowMat(0xff8a2a), plate = std(0x5a5650, 0.95);
        for (const sd of [1, -1]) { const sp = box(chest, 0.34, 0.24, 0.36, plate, 0.3 * sd, 0.22, 0); sp.rotation.z = -0.3 * sd; }
        box(chest, 0.4, 0.34, 0.06, plate, 0, 0.05, 0.16); ball(chest, 0.07, core, 0, 0.06, 0.2, 7, 6);
        for (const sd of [1, -1]) box(chest, 0.02, 0.18, 0.02, core, 0.1 * sd, -0.05, 0.195);
        box(chest, 0.5, 0.18, 0.36, plate, 0, -0.28, 0);
      } else if (kind === 'mutant') {                                      // a hunched hulk: heavy shoulders, back spikes, glowing teal veins
        const vein = glowMat(0x3affd8);
        for (const sd of [1, -1]) { ball(chest, 0.2, skin, 0.27 * sd, 0.2, -0.02, 9, 7).scale.set(1.1, 0.8, 1.0); box(chest, 0.03, 0.26, 0.02, vein, 0.12 * sd, 0.06, 0.15).rotation.z = 0.35 * sd; }
        box(chest, 0.22, 0.03, 0.02, vein, 0, 0.18, 0.152);
        for (let k = 0; k < 4; k++) mesh(new THREE.ConeGeometry(0.05, 0.2, 5), std(0x2a3038), chest, 0, 0.3 - k * 0.1, -0.2).rotation.x = -0.9;
        box(chest, 0.42, 0.2, 0.3, std(0x24202a), 0, -0.28, 0);            // a ragged loincloth belt
      }
      if (kind === 'brute') {
        const strap = box(chest, 0.08, 0.55, 0.04, leather, 0, 0.08, 0.15); strap.rotation.z = -0.6;
        ball(chest, 0.16, std(0x5a5048, 0.6, 0.3), -0.25, 0.22, 0, 8, 6).scale.set(1, 0.7, 1);
        for (let i = 0; i < 3; i++) mesh(new THREE.ConeGeometry(0.03, 0.12, 5), std(0xd8cfb4), chest, -0.25 + i * 0.04, 0.33, -0.02 + i * 0.03);
      }
    }
    // Long robes for the casters (bony callers wear theirs over the ribs)
    if (robed) {
      mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.95, 10, 1, true), cloth, chest, 0, -0.42, -0.01).material.side = THREE.DoubleSide;
      box(chest, 0.34, 0.14, 0.26, cloth, 0, 0.25, -0.02);
    }
    const neck = joint(chest, 0, 0.26, 0, 'YXZ'); rig.j.neck = neck;
    limb(neck, 0.1, 0.05 * R, 0.06 * R, skin).position.y = 0.03;
    const head = joint(neck, 0, 0.14, 0); rig.j.head = head;
    if (kind === 'mutant' && VAR === 'troll') {                            // a long-nosed troll head with tusks and a tuft of hair
      box(head, 0.26, 0.24, 0.26, skin, 0, 0, 0.02); box(head, 0.08, 0.14, 0.12, skin, 0, -0.02, 0.17);
      box(head, 0.2, 0.1, 0.2, std(0x2a2018), 0, 0.15, -0.03);
      for (const sd of [1, -1]) { ball(head, 0.022, glowMat(0xffd040), 0.07 * sd, 0.04, 0.14, 5, 4); const t = mesh(new THREE.ConeGeometry(0.025, 0.12, 5), std(0xe8e0c8), head, 0.08 * sd, -0.1, 0.13); t.rotation.set(0, 0, -0.2 * sd); mesh(new THREE.ConeGeometry(0.05, 0.16, 4), skin, head, 0.15 * sd, 0.04, 0).rotation.z = -1.2 * sd; }
    } else if (kind === 'mutant' && VAR === 'golem') {                     // a blocky stone head with a burning eye slit
      box(head, 0.3, 0.26, 0.28, std(0x5a5650, 0.95), 0, 0.02, 0); box(head, 0.2, 0.035, 0.02, glowMat(0xff8a2a), 0, 0.04, 0.142);
    } else if (kind === 'mutant') {                                        // small for the body: a heavy brow, a jaw of teeth, glowing eyes
      box(head, 0.24, 0.22, 0.24, skin, 0, 0, 0.02);
      box(head, 0.26, 0.06, 0.08, std(0x2e343c), 0, 0.07, 0.12);
      box(head, 0.2, 0.08, 0.14, skin, 0, -0.12, 0.08);
      for (const sd of [1, -1]) { ball(head, 0.025, glowMat(0x3affd8), 0.06 * sd, 0.03, 0.14, 5, 4); mesh(new THREE.ConeGeometry(0.02, 0.07, 4), std(0xe8e0c8), head, 0.05 * sd, -0.1, 0.16).rotation.x = Math.PI; }
    } else if (bony) {
      ball(head, 0.13, skin, 0, 0.02, 0, 10, 8).scale.set(1, 1.05, 1.1);
      box(head, 0.16, 0.07, 0.12, skin, 0, -0.1, 0.04);
      for (const s of [1, -1]) { ball(head, 0.035, dark, 0.05 * s, 0.02, 0.11, 6, 5); ball(head, 0.016, glowMat(0x7fe8ff), 0.05 * s, 0.02, 0.135, 5, 4); }
      box(head, 0.03, 0.04, 0.02, dark, 0, -0.04, 0.135);
      if (kind === 'necro') {                                              // a hood and a crown of thorns
        const hood = mesh(new THREE.SphereGeometry(0.17, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), cloth, head, 0, 0.03, -0.02); hood.scale.set(1, 1.1, 1.15);
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; mesh(new THREE.ConeGeometry(0.02, 0.12, 4), std(0xc9a23a, 0.4, 0.5), head, Math.sin(a) * 0.13, 0.17, Math.cos(a) * 0.13); }
      }
      if (kind === 'archer') { const hood = mesh(new THREE.SphereGeometry(0.17, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), cloth, head, 0, 0.03, -0.02); hood.scale.set(1, 1.1, 1.15); mesh(new THREE.ConeGeometry(0.1, 0.18, 6), cloth, head, 0, 0.0, -0.17).rotation.x = -1.9; }
    } else if (kind === 'caster') {
      box(head, 0.21, 0.24, 0.22, skin, 0, 0, 0);
      for (const sd of [1, -1]) ball(head, 0.025, glowMat(0x4ae8d0), 0.05 * sd, 0.02, 0.115, 5, 4);
      const hood = mesh(new THREE.SphereGeometry(0.18, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.65), cloth, head, 0, 0.03, -0.03); hood.scale.set(1, 1.15, 1.2);
      mesh(new THREE.ConeGeometry(0.12, 0.22, 6), cloth, head, 0, 0.0, -0.2).rotation.x = -1.9;
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
          const hair = std(kind === 'npc' ? (N.hair || 0x5a3a1e) : (L.hair || 0x3b2416), 0.8), helmed = kind === 'hero' && L.helm >= 0;
          const style = kind === 'hero' ? L.hairStyle || 'short' : 'short', beard = kind === 'npc' ? (N.beard ? 'short' : 'none') : L.beard || 'none';
          // Under a helm only a short tuft shows at the back; the helm encloses the rest (the head is a box, so its
          // corners reach 0.19 m from the middle and a round helm must be wider than that)
          if (helmed) { if (style !== 'shaved') box(head, 0.2, 0.12, 0.05, hair, 0, -0.03, -0.115); if (style === 'long') box(head, 0.22, 0.2, 0.05, hair, 0, -0.17, -0.12); }
          else if (style === 'shaved') box(head, 0.252, 0.03, 0.252, hair, 0, 0.115, 0);                  // a close crop
          else {
            box(head, 0.25, 0.09, 0.26, hair, 0, 0.12, -0.005); box(head, 0.25, 0.2, 0.06, hair, 0, 0.03, -0.11);
            for (const s of [1, -1]) box(head, 0.03, 0.12, 0.2, hair, 0.12 * s, 0.05, -0.02);
            if (style === 'long') { box(head, 0.25, 0.26, 0.06, hair, 0, -0.16, -0.12); for (const s of [1, -1]) box(head, 0.035, 0.24, 0.12, hair, 0.125 * s, -0.08, -0.06); }
            if (style === 'tail') { box(head, 0.07, 0.07, 0.08, hair, 0, 0.06, -0.16); box(head, 0.06, 0.24, 0.05, hair, 0, -0.08, -0.19); }
          }
          if (beard !== 'none') { box(head, 0.2, 0.12, 0.06, hair, 0, -0.1, 0.11); box(head, 0.12, beard === 'long' ? 0.18 : 0.08, 0.05, hair, 0, beard === 'long' ? -0.23 : -0.18, 0.1); }
          if (helmed) helmet(head, L.helm, { steel, leather, dark });
          else if (kind === 'hero') box(head, 0.255, 0.035, 0.255, std(0x7a2a22), 0, 0.07, 0);           // headband
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
      const sh = joint(chest, 0.22 * w * side + (kind === 'brute' || kind === 'mutant' ? 0.06 * side : 0), 0.2, 0, 'YXZ');
      ball(sh, 0.075 * R, bony ? skin : (kind === 'knight' ? steel : cloth));
      limb(sh, 0.3, 0.068 * R, 0.058 * R, bony ? skin : (kind === 'brute' || kind === 'mutant' ? skin : cloth));
      const el = joint(sh, 0, -0.3, 0);
      ball(el, 0.058 * R, bony ? skin : (kind === 'knight' ? steel : skin));
      limb(el, 0.27, 0.056 * R, 0.048 * R, skin);
      if (kind === 'hero' || kind === 'brute' || kind === 'npc') mesh(new THREE.CylinderGeometry(0.064 * R, 0.058 * R, 0.13, 8), leather, el, 0, -0.17, 0);
      const hd = joint(el, 0, -0.29, 0);
      const glove = kind === 'hero' && L.gloves >= 0 ? [leather, std(0x3a2a1e), steel][L.gloves] : null;
      ball(hd, 0.058 * R, kind === 'knight' ? std(0x3a3e48, 0.5, 0.5) : glove || skin, 0, 0, 0.0, 8, 6);
      if (glove) mesh(new THREE.CylinderGeometry(0.07, 0.062, 0.09, 8), glove, el, 0, -0.25, 0);         // cuff
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
    else if (kind === 'mutant') { const hand = VAR === 'horror' ? claws : h => fist(h, VAR); wpn = hand(rig.j.hdR); const off = hand(rig.j.hdL); rig.offhand = off; rig.glowMats.push(...off.glowMats); }
    else if (kind === 'npc') {
      if (N.tool === 'hammer') wpn = hammer(rig.j.hdR);
      else if (N.tool === 'spear') wpn = spear(rig.j.hdR, {});
      else if (N.tool === 'lute') wpn = lute(rig.j.hdL);
      else if (N.tool === 'basket') wpn = basket(rig.j.hdL);
    }
    else if (kind === 'archer') wpn = bow(rig.j.hdL);
    else if (kind === 'caster') wpn = staff(rig.j.hdR, 0x4ae8d0);
    else if (kind === 'necro') wpn = staff(rig.j.hdR, 0xb06aff, true);
    else if (scout) wpn = spear(rig.j.hdR, { blade: 0x7a6a58 });
    else if (kind === 'goblin') wpn = sword(rig.j.hdR, { blade: 0x6a5a48, guard: 0x3a2a1a, len: 0.42 });
    else if (kind === 'duelist') wpn = sword(rig.j.hdR, { blade: 0xe0e4ee, guard: 0xc9a23a, len: 1.05, thin: true });
    else if (kind === 'hero' && L.weapon === 'axe') wpn = axe(rig.j.hdR, { blade: L.blade });
    else if (kind === 'hero' && L.weapon === 'mace') wpn = mace(rig.j.hdR, { blade: L.blade });
    else if (kind === 'hero' && L.weapon === 'bow') wpn = bow(rig.j.hdL);
    else if (kind === 'hero' && L.weapon === 'staff') wpn = staff(rig.j.hdR, L.glow || 0x4ae8d0);
    else if (kind === 'hero' && L.weapon === 'scepter') wpn = scepter(rig.j.hdR, { glow: L.glow });
    else if (kind === 'hero' && L.weapon === 'spear') wpn = spear(rig.j.hdR, { blade: L.blade ? (L.blade | 0x404040) : undefined });
    else if (kind === 'hero' && L.weapon === 'daggers') {
      wpn = sword(rig.j.hdR, { blade: L.blade ? (L.blade | 0x404040) : undefined, len: 0.42, thin: true });
      const off = sword(rig.j.hdL, { blade: L.blade ? (L.blade | 0x404040) : undefined, len: 0.42, thin: true }); rig.offhand = off; rig.glowMats.push(...off.glowMats);
    }
    else wpn = sword(rig.j.hdR, kind === 'skeleton' ? { blade: 0x8a7a66, guard: 0x5a4a3a, len: 0.8 } : kind === 'knight' ? { len: 1.0, guard: 0x4a4e58 } : { blade: L.blade ? (L.blade | 0x404040) : undefined, len: L.weaponLen, twoHanded: L.twoHanded });
    rig.weapon = wpn; if (wpn) rig.glowMats.push(...wpn.glowMats);
    if (wpn && L.glow) for (const m of wpn.glowMats) { m.emissive.setHex(L.glow); m.emissiveIntensity = 0.25; }     // rare-and-better weapons shimmer faintly
    if (kind === 'hero' && L.shield !== false) rig.shield = roundShield(rig.j.hdL, L.shieldFace || 0x2f4a6b);
    if (kind === 'hero' && L.offhand) {
      if (L.offhand === 'quiver') quiver(rig.j.spine);
      else { const oh = L.offhand === 'orb' ? orb(rig.j.hdL, 0x7ae8ff) : tome(rig.j.hdL, 0x6a2a2a); rig.glowMats.push(...oh.glowMats); }
    }
    if (kind === 'knight') rig.shield = towerShield(rig.j.hdL, 0x3a3e48);
    // Motion capture drives every rig: sword-and-shield clips for people, great-sword clips for the two-handed brute.
    // The shield rides on the outside of the forearm, where the clips expect it (mirrored from Nightfall's rig).
    // A two-handed hero uses the great-sword clips, with the left hand held on the grip (gripIK)
    rig.mocap = typeof Mocap !== 'undefined'; rig.set = kind === 'mutant' ? 'mu' : kind === 'hero' && L.caster ? 'mg' : kind === 'brute' || L.twoHanded ? 'gs' : 'ss'; rig.calm = kind === 'npc'; rig.twoHand = kind === 'hero' && !!L.twoHanded;
    if (rig.mocap && rig.shield) {
      rig.j.elL.add(rig.shield); rig.shield.position.set(0.14, -0.2, 0.02);
      rig.shield.rotation.set(0, Math.PI / 2, kind === 'knight' ? Math.PI / 2 : 0);    // face outward; a tall shield stands across the forearm
    }
    rig.tq = {}; for (const n of ['hips', ...JOINTS]) rig.tq[n] = new THREE.Quaternion();
    rig.loco = 0;
    bake(root, true, rig.glowMats);

    root.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && !rig.mats.includes(o.material)) rig.mats.push(o.material); });
    rig.baseEmissive = rig.mats.map(m => m.emissive.getHex());
    rig.time = Math.random() * 10; rig.pace = 0.85 + Math.random() * 0.3;            // no two idle quite in step
    if (N.pose) rig.posture = N.pose;
    if (kind !== 'hero') skinRig(rig);                                          // one draw call per body (the hero keeps parts: gear swaps, after-images)
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
    skinRig(rig);
    return rig;
  }
  // ---------------- Four-legged beasts of the Rim: the wolf and the boar ----------------
  // A body, a head on a neck joint (the weapon: bites and tusks), four two-part legs and a tail. Posed by hand.
  function buildBeast(kind) {
    const wolf = kind === 'wolf';
    const rig = { kind, j: {}, mats: [], glowMats: [], beast: true, legs: [], time: Math.random() * 10, loco: 0 };
    const root = new THREE.Group(), H = wolf ? 0.62 : 0.6, body = joint(root, 0, H, 0); rig.root = root; rig.body = body;
    const fur = std(wolf ? 0x6a6a70 : 0x4a3426, 0.95), dark = std(wolf ? 0x3a3a40 : 0x2a1c14, 0.95), pale = std(wolf ? 0xa8a8ae : 0x6a5040, 0.95);
    const bone = std(0xe8e0c8, 0.4), eye = glowMat(wolf ? 0xffd040 : 0xff5a2a);
    if (wolf) {
      const torso = ball(body, 0.3, fur, 0, 0, 0, 10, 8); torso.scale.set(0.85, 0.85, 1.9);
      ball(body, 0.24, pale, 0, -0.08, 0.32, 8, 6).scale.set(0.8, 0.7, 1.0);              // chest ruff
    } else {
      const torso = ball(body, 0.42, fur, 0, 0.05, 0, 10, 8); torso.scale.set(0.95, 0.95, 1.45);
      for (let k = 0; k < 5; k++) mesh(new THREE.ConeGeometry(0.05, 0.22, 4), dark, body, 0, 0.42 - Math.abs(k - 2) * 0.03, 0.35 - k * 0.18).rotation.x = -0.4;   // bristles
    }
    const neck = joint(body, 0, wolf ? 0.12 : 0.02, wolf ? 0.5 : 0.55, 'YXZ'); rig.j.neck = neck;
    const head = joint(neck, 0, 0, wolf ? 0.12 : 0.05); rig.j.head = head;
    if (wolf) {
      box(head, 0.26, 0.24, 0.26, fur, 0, 0.02, 0.06);
      box(head, 0.14, 0.12, 0.26, pale, 0, -0.04, 0.28);                                  // muzzle
      box(head, 0.07, 0.05, 0.05, dark, 0, -0.0, 0.42);                                    // nose
      for (const sd of [1, -1]) { mesh(new THREE.ConeGeometry(0.06, 0.16, 4), fur, head, 0.08 * sd, 0.2, 0.0); ball(head, 0.025, eye, 0.07 * sd, 0.07, 0.19, 5, 4); }
    } else {
      box(head, 0.36, 0.34, 0.36, fur, 0, 0, 0.1);
      box(head, 0.22, 0.2, 0.22, pale, 0, -0.06, 0.35);                                   // snout
      box(head, 0.18, 0.14, 0.04, dark, 0, -0.06, 0.47);
      for (const sd of [1, -1]) {
        const t = mesh(new THREE.ConeGeometry(0.035, 0.26, 5), bone, head, 0.13 * sd, -0.08, 0.38); t.rotation.set(-0.9, 0, -0.5 * sd);   // tusks
        mesh(new THREE.ConeGeometry(0.07, 0.14, 4), fur, head, 0.14 * sd, 0.2, 0.0).rotation.z = -0.5 * sd;
        ball(head, 0.025, eye, 0.12 * sd, 0.06, 0.26, 5, 4);
      }
    }
    const tip = joint(head, 0, -0.05, wolf ? 0.45 : 0.5), base = joint(head, 0, 0, 0.1);
    rig.weapon = { group: head, tip, base, glowMats: [wolf ? pale : bone] }; rig.glowMats.push(wolf ? pale : bone);
    const tail = joint(body, 0, wolf ? 0.08 : 0.15, wolf ? -0.55 : -0.6, 'YXZ'); rig.j.tail = tail;
    if (wolf) { const tl = mesh(new THREE.CylinderGeometry(0.07, 0.03, 0.5, 6), fur, tail, 0, -0.18, -0.12); tl.rotation.x = 0.8; }
    else mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.2, 4), dark, tail, 0, -0.08, -0.03);
    const legLen = wolf ? [0.3, 0.32] : [0.26, 0.3], legR = wolf ? 0.055 : 0.08;
    for (const [z, front] of [[wolf ? 0.36 : 0.36, true], [wolf ? -0.38 : -0.36, false]]) for (const side of [1, -1]) {
      const hip = joint(body, (wolf ? 0.14 : 0.22) * side, -0.05, z, 'XYZ');
      limb(hip, legLen[0], legR, legR * 0.8, fur);
      const knee = joint(hip, 0, -legLen[0], 0); limb(knee, legLen[1], legR * 0.8, legR * 0.6, dark);
      box(knee, legR * 2, 0.05, legR * 2.6, dark, 0, -legLen[1], 0.03);
      rig.legs.push({ hip, knee, front, phase: (front ? 0 : Math.PI) + (side > 0 ? 0 : Math.PI * (wolf ? 0.5 : 1)) });
    }
    rig.H = H;
    bake(root, true, rig.glowMats);
    root.traverse(m => { if (m.isMesh && m.material && m.material.isMeshStandardMaterial && !rig.mats.includes(m.material)) rig.mats.push(m.material); });
    rig.baseEmissive = rig.mats.map(m => m.emissive.getHex());
    skinRig(rig);
    return rig;
  }
  // Trot and gallop with the speed, crouch to wind up, spring or lower the head to strike, sprawl when stunned or dead
  function animateBeast(rig, st, dt) {
    rig.time += dt; const T = rig.time, m = st.mode, sp = Math.min(1, st.speed || 0), wolf = rig.kind === 'wolf';
    rig.loco += dt * (3 + 11 * sp);
    let y = rig.H, pitch = 0, roll = 0, neckX = 0.1, headZ = wolf ? 0.12 : 0.05, legFold = 0, tailX = wolf ? -0.3 : 0.2;
    if (m === 'attack') {
      const charge = st.atk === 'charge', pounce = st.atk === 'pounce';
      if (st.phase === 'wind') { y = rig.H * (pounce ? 0.75 : 0.85); pitch = pounce ? -0.15 : charge ? 0.25 : 0.1; neckX = charge ? 0.6 : 0.3; legFold = 0.35; tailX = wolf ? 0.4 : 0.6; }
      else if (st.phase === 'active') { y = rig.H * (pounce ? 1.05 : 1); pitch = pounce ? -0.25 : 0.15; neckX = charge ? 0.55 : -0.2; headZ += 0.12; legFold = pounce ? 0.6 : 0; }
      else { pitch = 0.05; neckX = 0.15; }
    } else if (m === 'stagger' || m === 'hurt') { roll = Math.sin(T * 40) * 0.15; y = rig.H * 0.9; neckX = 0.4; }
    else if (m === 'broken') { y = rig.H * 0.55; legFold = 0.9; neckX = 0.6; }
    else if (m === 'dead') { y = rig.H * 0.45; roll = Math.PI / 2 * Math.min(1, st.t * 3); legFold = 0.3; }
    const k = 1 - Math.exp(-14 * dt), b = rig.body, walk = m === 'move' ? sp : 0;
    b.position.y += (y + (walk ? Math.abs(Math.sin(rig.loco)) * 0.05 * walk : Math.sin(T * 2) * 0.008) - b.position.y) * k;
    b.rotation.x += (pitch - b.rotation.x) * k; b.rotation.z += (roll - b.rotation.z) * k;
    rig.j.neck.rotation.x += (neckX + (walk ? Math.sin(rig.loco * 2) * 0.05 : 0) - rig.j.neck.rotation.x) * k;
    rig.j.head.position.z += (headZ - rig.j.head.position.z) * Math.min(1, dt * 18);
    rig.j.tail.rotation.x += (tailX - rig.j.tail.rotation.x) * k; rig.j.tail.rotation.y = Math.sin(T * (walk ? 9 : 2.5)) * (wolf ? 0.35 : 0.2);
    for (const L of rig.legs) {
      const ph = rig.loco + L.phase, swing = Math.sin(ph) * 0.65 * walk, lift = Math.max(0, Math.cos(ph)) * 0.7 * walk;
      L.hip.rotation.x += (swing + (L.front ? -legFold : legFold) * 0.6 - L.hip.rotation.x) * k;
      L.knee.rotation.x += ((L.front ? -lift : lift) + (L.front ? 1 : -1) * legFold * 0.9 - L.knee.rotation.x) * k;
    }
  }

  // ---------------- The mimic: a chest with teeth (lid as jaw), hopping on stubby feet ----------------
  function buildMimic() {
    const rig = { kind: 'mimic', j: {}, mats: [], glowMats: [], mimic: true, time: Math.random() * 10, loco: 0 };
    const root = new THREE.Group(), body = joint(root, 0, 0.3, 0); rig.root = root; rig.body = body;
    const wood = std(0x6a4424), band = std(0xd9a92a, 0.4, 0.6), tooth = std(0xeee6d6, 0.5), flesh = std(0x6a1a1a, 0.8);
    box(body, 0.9, 0.5, 0.62, wood, 0, 0, 0);
    for (const x of [-0.35, 0.35]) box(body, 0.08, 0.52, 0.64, band, x, 0, 0);
    box(body, 0.7, 0.04, 0.5, flesh, 0, 0.24, 0);                                        // the mouth's floor
    for (let i = 0; i < 7; i++) mesh(new THREE.ConeGeometry(0.035, 0.12, 4), tooth, body, -0.36 + i * 0.12, 0.3, 0.29);
    for (const x of [-0.32, 0.32]) for (const z of [-0.2, 0.2]) { const f = box(body, 0.12, 0.16, 0.12, std(0x3a2a1a), x, -0.3, z); f.userData.foot = true; }
    const lid = joint(body, 0, 0.25, -0.31); rig.j.lid = lid;
    mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.9, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), wood, lid, 0, 0, 0.31);
    for (const x of [-0.35, 0.35]) mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), band, lid, x, 0, 0.31);
    for (let i = 0; i < 7; i++) mesh(new THREE.ConeGeometry(0.035, 0.12, 4), tooth, lid, -0.36 + i * 0.12, -0.04, 0.6).rotation.x = Math.PI;
    for (const sd of [1, -1]) ball(lid, 0.05, glowMat(0xffd040), 0.18 * sd, 0.12, 0.55, 6, 5);
    const tongue = box(body, 0.16, 0.05, 0.4, std(0xb03040, 0.7), 0, 0.27, 0.15); rig.j.tongue = tongue;
    const tip = joint(lid, 0, -0.1, 0.62), base = joint(lid, 0, 0, 0.3);
    rig.weapon = { group: lid, tip, base, glowMats: [tooth] }; rig.glowMats.push(tooth);
    bake(root, true, rig.glowMats);
    root.traverse(m => { if (m.isMesh && m.material && m.material.isMeshStandardMaterial && !rig.mats.includes(m.material)) rig.mats.push(m.material); });
    rig.baseEmissive = rig.mats.map(m => m.emissive.getHex());
    skinRig(rig);
    return rig;
  }
  function animateMimic(rig, st, dt) {
    rig.time += dt; const m = st.mode, sp = Math.min(1, st.speed || 0);
    rig.loco += dt * (3 + 9 * sp);
    let y = 0.3, open = -0.15 - Math.max(0, Math.sin(rig.time * 1.7)) * 0.12, pitch = 0, roll = 0;
    if (m === 'move') { y = 0.3 + Math.abs(Math.sin(rig.loco)) * 0.28 * sp; open = -0.35; }
    if (m === 'attack') { if (st.phase === 'wind') { open = -1.3; pitch = -0.25; y = 0.36; } else if (st.phase === 'active') { open = -0.05; pitch = 0.2; y = 0.5; } else open = -0.4; }
    else if (m === 'stagger') { roll = Math.sin(rig.time * 40) * 0.1; open = -0.6; }
    else if (m === 'broken') { open = -1.0; y = 0.24; pitch = 0.15; }
    else if (m === 'dead') { open = -1.9; roll = Math.min(1, st.t * 2) * 1.2; y = 0.26; }
    else if (m === 'spawn') open = -0.02;
    const k = 1 - Math.exp(-16 * dt), b = rig.body;
    b.position.y += (y - b.position.y) * k; b.rotation.x += (pitch - b.rotation.x) * k; b.rotation.z += (roll - b.rotation.z) * k;
    rig.j.lid.rotation.x += (open - rig.j.lid.rotation.x) * Math.min(1, dt * (st.phase === 'active' ? 40 : 14));
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
    const stance = STANCE[rig.kind] || (rig.kind === 'archer' ? STANCE.skeleton : STANCE.hero), T = rig.time;      // kinds without their own stance borrow one
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
    mg: { shoot: 'mgBolt', overhead: 'mgFire', nova: 'mgNova', thrust: 'mgHoly', heal: 'mgHeal', bless: 'mgBless', sanct: 'mgSanct', slashR: 'mgHoly', slashL: 'mgHoly', heavy: 'mgFire' },
    gs: { slashR: 'gsSlash', slashL: 'gsSlash5', overhead: 'gsAttack', thrust: 'gsAttack', heavy: 'gsJumpAttack' },
    gsHero: { slashR: 'gsSlash', slashL: 'gsSlash5', overhead: 'gsAttack', heavy: 'gsSpin' },
    mu: { swipe: 'brawlSwipe', punch: 'brawlPunch', slam: 'mJumpAttack', leap: 'mJumpAttack2', roar: 'mRoar', slashR: 'brawlSwipe', heavy: 'mJumpAttack' },
  };
  function locoClip(rig, st) {
    if (rig.set === 'mu') return (st.mps || 0) > 2.8 ? { name: 'mRun', ref: 4.2 } : { name: 'mWalk', ref: 1.5 };
    const gs = rig.set === 'gs', run = (st.mps || 0) > 2.8, f = st.dirF === undefined ? 1 : st.dirF, side = st.dirS || 0;
    if (rig.set === 'mg') {                                                 // the caster stance (Pro Magic Pack)
      if (f > 0.5) return { name: run ? 'mgRun' : 'mgWalk', ref: run ? 4.6 : 1.6 };
      if (f < -0.5) return { name: run ? 'mgRunB' : 'mgWalkB', ref: run ? 3.6 : 1.4 };
      return { name: (run ? 'mgRun' : 'mgWalk') + (side > 0 ? 'N' : 'P'), ref: run ? 3.6 : 1.5 };
    }
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
  // A posture: a clip (an everyday idle, kneeling, seated work) at the person's own pace and phase, played back and forth
  // over part of it when it is not a loop, with fixed turns of some joints on top (P.add: joint -> Euler, applied after
  // the clip's own rotation; P.set: joint -> Euler, replacing it)
  const pq = new THREE.Quaternion(), pe = new THREE.Euler();
  function posture(rig, P) {
    const c = Mocap.clips[P.clip]; if (!c) return Mocap.sample('idleCalm', rig.time, out);
    let t = rig.time * (P.rate || 1) + (P.phase || 0);
    if (!c.loop) { const a = (P.from || 0) * c.d, d = Math.max(0.1, ((P.to || 1) - (P.from || 0)) * c.d), u = t % (2 * d); t = a + (u < d ? u : 2 * d - u); }
    Mocap.sample(P.clip, t, out);
    if (P.add) for (const j in P.add) { const e = P.add[j]; pe.set(e[0], e[1], e[2]); out.q[j].multiply(pq.setFromEuler(pe)); }
    if (P.set) for (const j in P.set) { const e = P.set[j]; pe.set(e[0], e[1], e[2]); out.q[j].setFromEuler(pe); }
    if (P.hipsY !== undefined) out.hipsY = P.hipsY;
  }
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
    if (m === 'idle' || m === 'spawn' || (m === 'move' && !moving)) {
      if (rig.posture && m !== 'spawn') posture(rig, rig.posture);                // a person's own way of standing, sitting or kneeling
      else if (st.calm && !rig.calm && rig.set === 'ss') Mocap.sample('idleEase', rig.time, out);   // the hero at ease in the Hold
      else Mocap.sample(rig.set === 'mu' ? 'mIdle' : rig.set === 'mg' ? 'mgIdle' : gs ? 'gsIdle' : rig.calm ? 'idleCalm' : 'idle', rig.time * (rig.pace || 1), out);
    }
    if (m === 'block') {                                                    // guard up; the legs keep walking underneath when moving
      if (gs && !rig.twoHand) return 0;
      if (gs) Mocap.sample('gsBlock', Math.min(st.blockT || 0, 0.45), out, moving ? Mocap.UPPER : Mocap.BONES);
      else Mocap.sample(rig.set === 'mg' ? 'mgBlock' : 'blockIdle', rig.time, out, moving ? Mocap.UPPER : Mocap.BONES);
      return 20;
    }
    if (m === 'idle' || m === 'move' || m === 'spawn') return 16;
    if (m === 'attack') {
      const name = MOCAP_ATTACK[rig.twoHand ? 'gsHero' : rig.set][st.atk] || (gs ? 'gsSlash' : rig.set === 'mg' ? 'mgBolt' : 'attack1'), c = Mocap.clips[name];
      const W = st.wind, A = st.active, R = st.recover, el = st.phase === 'wind' ? st.phaseT : st.phase === 'active' ? W + st.phaseT : W + A + st.phaseT;
      const hitAt = W + A * 0.5, hitT = c.hit * c.d;
      const ct = el <= hitAt ? hitT * el / hitAt : hitT + (c.d - hitT) * Math.min(1, (el - hitAt) / (A * 0.5 + R));
      Mocap.sample(name, ct, out);
      out.hipsZ = 0;                                                        // the game moves the body itself (lunges)
      return 30;
    }
    if (rig.set === 'mu' && (m === 'hurt' || m === 'stagger' || m === 'broken')) return 0;   // no clip: the hand-made stagger
    if (m === 'hurt' || m === 'stagger') { Mocap.sample(rig.set === 'mg' ? (rig.hurtVar ? 'mgImpact2' : 'mgImpact') : gs ? 'gsImpact' : (rig.hurtVar ? 'impact2' : 'impact'), Math.min(st.t * 1.6, 0.75), out); out.hipsZ = 0; return 22; }
    if (m === 'dead') { Mocap.sample(rig.set === 'mu' ? 'mDie' : rig.set === 'mg' ? (rig.dieVar ? 'mgDie2' : 'mgDie') : gs ? 'gsDie' : rig.dieVar ? 'die2' : 'die', st.t * (rig.set === 'mu' ? 1.0 : 1.5), out); return 14; }
    return 0;                                                                // roll, broken, guard break: hand-made poses
  }

  const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), yawQ = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), tmpE = new THREE.Euler(), ID = new THREE.Quaternion();
  function animate(rig, st, dt) {
    if (rig.spider) return animateSpider(rig, st, dt);
    if (rig.beast) return animateBeast(rig, st, dt);
    if (rig.mimic) return animateMimic(rig, st, dt);
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

  // ---------------- One skinned mesh per character ----------------
  // A rig is a tree of joints, each holding a few rigid meshes: one draw call per mesh. skinRig() merges every plain mesh
  // into a single SkinnedMesh whose bones are the joints themselves (each vertex bound wholly to its joint), with the
  // colours carried per vertex, so the joints animate exactly as before and the whole body is drawn at once.
  // Glowing, textured and see-through parts (weapons, shields) stay as they are.
  const skM = new THREE.Matrix4(), skInv = new THREE.Matrix4(), skC = new THREE.Color();
  function skinRig(rig) {
    const root = rig.root; root.updateMatrixWorld(true); skInv.copy(root.matrixWorld).invert();
    const meshes = [];
    root.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.geometry.attributes.normal && !o.material.map && !o.material.transparent && !(rig.glowMats || []).includes(o.material) && o.material.isMeshStandardMaterial) meshes.push(o); });
    if (meshes.length < 2) return;
    const bones = [], boneOf = new Map();
    let n = 0; const parts = [];
    for (const o of meshes) {
      if (!boneOf.has(o.parent)) { boneOf.set(o.parent, bones.length); bones.push(o.parent); }
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(skM.multiplyMatrices(skInv, o.matrixWorld));                     // into the root's space, as posed now
      parts.push([g, o.material.color, boneOf.get(o.parent)]); n += g.attributes.position.count;
    }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    let k = 0;
    for (const [g, c, b] of parts) {
      const cnt = g.attributes.position.count, vc = g.attributes.color;
      pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3);
      for (let v = 0; v < cnt; v++) {
        if (vc) skC.setRGB(vc.getX(v) * c.r, vc.getY(v) * c.g, vc.getZ(v) * c.b); else skC.copy(c);
        col[(k + v) * 3] = skC.r; col[(k + v) * 3 + 1] = skC.g; col[(k + v) * 3 + 2] = skC.b;
        si[(k + v) * 4] = b; sw[(k + v) * 4] = 1;
      }
      k += cnt; g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    geo.computeBoundingSphere(); geo.boundingSphere.radius += 0.6;                     // room for the limbs to swing
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.85, flatShading: true, skinning: true });
    const body = new THREE.SkinnedMesh(geo, mat); body.castShadow = true; body.receiveShadow = true;
    root.add(body); body.updateMatrixWorld(true);
    body.bind(new THREE.Skeleton(bones), body.matrixWorld);
    for (const o of meshes) { o.parent.remove(o); o.geometry.dispose(); }
    rig.mats = rig.mats.filter(m => !meshes.some(o => o.material === m)).concat(mat); rig.baseEmissive = rig.mats.map(m => m.emissive.getHex());
    rig.body3 = body;
  }

  return { build, item, animate, flash, glow, makeTrail, updateTrail, bake, skin: skinRig, ATTACKS };
})();
