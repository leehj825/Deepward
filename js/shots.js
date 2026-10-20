// Deepward - what the ranged classes cast: the archer's arrows, the mage's bolts and fireballs, the cleric's holy bolts and healing.
// A blow with a `shot` (see CFG.player.combos / heavies / arts) fires projectiles when its swing lands; a blow with a `heal` mends
// the hero and, once there are any, the allies near it (G.allies: anyone with pos, hp and maxHp). Shots fly flat, stop at walls,
// and hit through Enemy.receive like a swing does, so guards, wards, posture, criticals and the elements all work as in melee.
const Shots = (() => {
  const live = [], UNDEAD = { skeleton: 1, archer: 1, necro: 1 };
  const MUZZLE = 1.25;
  let geos = null;
  const mats = new Map();
  const mat = (color, additive) => {
    const k = color + (additive ? 'a' : 's');
    if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial(additive ? { color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false } : { color }));
    return mats.get(k);
  };
  function G3() {
    if (!geos) geos = {
      shaft: new THREE.CylinderGeometry(0.014, 0.014, 0.8, 5).rotateX(Math.PI / 2), head: new THREE.ConeGeometry(0.04, 0.14, 4).rotateX(Math.PI / 2).translate(0, 0, 0.45),
      core: new THREE.SphereGeometry(0.1, 10, 8), halo: new THREE.SphereGeometry(0.26, 12, 10),
    };
    return geos;
  }
  function body(kind, color) {
    const g = new THREE.Group(), B = G3();
    if (kind === 'arrow') { g.add(new THREE.Mesh(B.shaft, mat(0x8a6a40)), new THREE.Mesh(B.head, mat(0xe0e0e8))); return g; }
    const s = kind === 'fireball' ? 1.9 : kind === 'holy' ? 0.8 : 1;
    const core = new THREE.Mesh(B.core, mat(0xffffff)), halo = new THREE.Mesh(B.halo, mat(color || 0x7ae8ff, true));
    core.scale.setScalar(s); halo.scale.setScalar(s); g.add(core, halo); return g;
  }

  // The swing landed: send the blow's projectiles
  function fire(p, atk) {
    const S = atk.shot, parent = p.rig.root.parent, n = S.count || 1;
    const base = p.target && Enemy.targetable(p.target) ? Combat.yawTo(p.pos, p.target.pos) : p.facing;
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i / (n - 1) - 0.5) * (S.spread || 0.6) : 0);
      const g = body(S.kind, S.color); g.rotation.y = a;
      const x = p.pos.x + Math.sin(a) * 0.7, z = p.pos.z + Math.cos(a) * 0.7;
      g.position.set(x, MUZZLE, z); parent.add(g);
      live.push({ g, x, z, dx: Math.sin(a), dz: Math.cos(a), speed: S.speed, dist: 0, max: atk.range, atk, S, hit: new Set(), p, t: 0 });
    }
    Snd.play(S.kind === 'arrow' ? 'swing' : 'cast');
    FX.burst(new THREE.Vector3(p.pos.x + Math.sin(base) * 0.8, MUZZLE, p.pos.z + Math.cos(base) * 0.8), S.color || 0xd8d0b8, 5, 2.5, 0.25);
    return 0;
  }

  // One enemy takes the shot. Returns what Enemy.receive said.
  function strikeOne(s, e, scale = 1) {
    let atk = s.atk;
    if (s.S.ignite) atk = Object.assign({}, atk, { burn: (atk.burn || 0) + 0.6 });          // the enemy's own burn: 60% of the blow, over 2 s
    const holy = s.S.undead && UNDEAD[e.type] ? s.S.undead : 1;
    if (scale !== 1 || holy !== 1) atk = Object.assign({}, atk, { dmg: atk.dmg * scale * holy });
    return Enemy.receive(e, atk, s.p);
  }
  // Stormcaller: the bolt leaps to the nearest other foe
  function chain(s, from) {
    let best = null, bd = 4.5;
    for (const o of G.enemies) { if (o === from || !Enemy.targetable(o)) continue; const d = Combat.dist(from.pos, o.pos); if (d < bd) { bd = d; best = o; } }
    if (!best) return 0;
    const a = Combat.chestPos(from.pos, 1.2), b = Combat.chestPos(best.pos, 1.2);
    for (let i = 0; i <= 5; i++) FX.glint(a.clone().lerp(b, i / 5), s.S.color || 0x7ae8ff, 0.9, 0.2);
    const r = strikeOne(s, best, 0.4);
    return r && r !== 'blocked' && r !== 'ward' ? 1 : 0;
  }
  function explode(s, x, z) {
    const R = s.S.splash;
    FX.ring(new THREE.Vector3(x, 0.05, z), R * 1.1, s.S.color || 0xff7a30, 0.45, { r0: 0.3 });
    FX.burst(new THREE.Vector3(x, 0.6, z), s.S.color || 0xff7a30, 26, 7, 0.5); FX.shake(0.3); Snd.play('slam');
    let landed = 0, crit = false;
    for (const e of G.enemies) {
      if (!Enemy.targetable(e) || Math.hypot(e.pos.x - x, e.pos.z - z) > R + e.def.radius) continue;
      const r = strikeOne(s, e);
      if (r && r !== 'blocked' && r !== 'ward') { landed++; if (r === 'crit') crit = true; }
    }
    if (landed) Combat.landed(s.p, s.atk, landed, crit);
    if (typeof Props !== 'undefined') Props.strike({ pos: { x, z }, facing: 0 }, { range: R, arc: 360 });
  }
  function remove(i) { const s = live[i]; s.g.parent && s.g.parent.remove(s.g); live.splice(i, 1); }
  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const s = live[i]; let done = false, steps = Math.max(1, Math.ceil(s.speed * dt / 0.35)), sd = s.speed * dt / steps;
      s.t += dt;
      for (let k = 0; k < steps && !done; k++) {
        s.x += s.dx * sd; s.z += s.dz * sd; s.dist += sd;
        if (!World.inSpace(s.x, s.z, 0.2) || s.dist > s.max) { done = true; if (s.S.splash) explode(s, s.x, s.z); break; }
        let landed = 0, crit = false, stopped = false;
        for (const e of G.enemies) {
          if (!Enemy.targetable(e) || s.hit.has(e) || Math.hypot(e.pos.x - s.x, e.pos.z - s.z) > e.def.radius + 0.25) continue;
          s.hit.add(e);
          if (s.S.splash) { explode(s, s.x, s.z); done = true; break; }
          const r = strikeOne(s, e);
          if (r === 'blocked' || r === 'ward') { stopped = true; }
          else if (r) { landed++; if (r === 'crit') crit = true; if (s.S.kind === 'bolt' && s.p.S.u && s.p.S.u.storm) landed += chain(s, e); if (s.p.S.u && s.p.S.u.dawnlight && s.S.kind === 'holy') mendSelf(s.p, 0.01); }
          if (!s.S.pierce) { stopped = true; break; }
        }
        if (landed) Combat.landed(s.p, s.atk, landed, crit);
        if (stopped) { done = true; FX.burst(new THREE.Vector3(s.x, MUZZLE, s.z), s.S.color || 0xd8d0b8, 6, 3, 0.25); }
      }
      s.g.position.set(s.x, MUZZLE, s.z);
      if (s.S.kind !== 'arrow' && Math.random() < dt * 40) FX.burst(new THREE.Vector3(s.x, MUZZLE, s.z), s.S.color || 0x7ae8ff, 1, 0.6, 0.3);
      if (done) remove(i);
    }
  }
  const mendSelf = (p, share) => { if (p.state !== 'dead') p.hp = Math.min(p.maxHp, p.hp + p.maxHp * share); };

  // ---------------- Healing ----------------
  // Everyone who can be healed: the hero first, then any allies
  const party = p => [p].concat((G.allies || []).filter(a => a.hp > 0));
  function mend(t, p, amount, selfShare) {
    const gain = Math.min(t.maxHp - t.hp, t.maxHp * amount * (t === p ? selfShare : 1));
    if (gain <= 0) return 0;
    t.hp += gain;
    FX.text(Combat.chestPos(t.pos, 2.1), '+' + Math.round(gain), 'heal'); FX.burst(Combat.chestPos(t.pos, 1.3), 0x7aff9a, 10, 3);
    return gain;
  }
  // The cast lands. heal.radius mends everyone within it; otherwise the hurt-most ally within reach (the hero if no one else is hurt more)
  function heal(p, atk) {
    const H = atk.heal, power = (p.S.mend || 1), amount = H.amount * power;
    p.healCd = H.cd || 0;
    const col = H.color || 0x9affc0;
    if (H.radius) {
      FX.ring(p.pos, H.ring || H.radius, col, 0.7, { r0: 0.4 }); FX.burst(Combat.chestPos(p.pos, 1.0), col, 24, 5, 0.6); Snd.play('cast');
      for (const t of party(p)) if (Combat.dist(p.pos, t.pos) <= H.radius) mend(t, p, amount, H.self);
    } else {
      let best = p, bf = p.hp / p.maxHp * (1 / (H.self || 1));         // the hero's own wounds count for less: it heals itself at a discount
      for (const a of party(p)) if (a !== p && Combat.dist(p.pos, a.pos) <= H.reach && a.hp / a.maxHp < bf) { best = a; bf = a.hp / a.maxHp; }
      FX.glint(Combat.chestPos(best.pos, 1.5), col, 1.6, 0.35); Snd.play('cast');
      mend(best, p, amount, H.self);
    }
    return 0;
  }

  function clear() { for (let i = live.length - 1; i >= 0; i--) remove(i); }
  return { fire, heal, update, clear, get live() { return live; }, party };
})();
