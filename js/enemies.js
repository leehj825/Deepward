// Deepward - enemies: approach and circle the player, take turns attacking (attack tokens), telegraph every hit,
// and react to damage with flinches, guard blocks and posture breaks.
// States: spawn, hunt, attack, stagger, broken, roar (a guardian changing phase), dead.
const Enemy = (() => {
  const GLOW_OK = 0xfff0c0, GLOW_RED = 0xff2a10, GLOW_AMBER = 0xffa010;   // blockable / unblockable / parry-only
  const glowOf = h => h.unblockable ? GLOW_RED : h.parryOnly ? GLOW_AMBER : GLOW_OK;
  const BONE = { skeleton: 1, archer: 1 };

  function spawn(scene, type, pos, mult = 1) {
    const def = CFG.enemies[type], rig = Rig.build(def.rig || type, def.look || {});
    scene.add(rig.root);
    // Below high quality, enemies leave the shadow pass and get a soft blob under their feet instead
    if (G.quality && G.quality() !== 'high') { rig.root.traverse(o => { o.castShadow = false; }); rig.root.add(blob()); }
    const e = {
      type, def, rig, trail: Rig.makeTrail(scene, type === 'brute' ? 0xff7a50 : 0xfff0c0),
      pos: pos.clone(), facing: Math.PI, mult,
      hp: def.hp * mult, maxHp: def.hp * mult, posture: 0, postureT: 9,
      state: 'spawn', t: 0, cooldown: 0.6 + Math.random() * 0.8, atk: null, hitIdx: 0, phase: null, phaseT: 0, struck: false,
      strafeDir: Math.random() < 0.5 ? 1 : -1, strafeT: 0, speedK: 0, cycle: 0, ring: null, glint: null, flashT: 0,
    };
    e.facing = Combat.yawTo(e.pos, G.player.pos);
    const bar = document.createElement('div'); bar.className = 'ebar';
    bar.innerHTML = '<div class="hp"><i></i></div><div class="post"><i></i></div>';
    document.getElementById('bars').appendChild(bar); e.bar = bar;
    if (def.ward) {                                                       // the shield-bearer's sheltering circle
      const ring = new THREE.Mesh(new THREE.RingGeometry(def.ward.r - 0.06, def.ward.r, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6a9aff, transparent: true, opacity: 0.22, depthWrite: false }));
      ring.position.y = 0.03; ring.scale.setScalar(1 / rig.root.scale.x || 1); rig.root.add(ring); e.wardRing = ring;
    }
    FX.ring(e.pos, 1.4, 0x7fe8ff, 0.9, { r0: 0.2 });
    FX.burst(new THREE.Vector3(e.pos.x, 0.1, e.pos.z), 0x8a7a66, 14, 4, 0.6);
    return e;
  }

  let blobGeo = null, blobMat = null;
  function blob() {
    if (!blobGeo) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), gr = c.createRadialGradient(32, 32, 4, 32, 32, 31);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
      blobGeo = new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2);
      blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false });
    }
    const m = new THREE.Mesh(blobGeo, blobMat); m.position.y = 0.03; m.renderOrder = -1; return m;
  }
  const targetable = e => e.state !== 'dead' && e.state !== 'spawn';
  const attacking = () => G.enemies.reduce((n, o) => n + (o.state === 'attack' && !o.def.solo ? 1 : 0), 0);
  const guardUp = e => e.def.guard && e.state === 'hunt';
  function aoeCenter(e, h) { return new THREE.Vector3(e.pos.x + Math.sin(e.facing) * h.aoe.fwd, 0, e.pos.z + Math.cos(e.facing) * h.aoe.fwd); }
  function maxReach(e) { return Math.max(...e.def.attacks.flatMap(a => a.hits.map(h => h.aoe ? h.aoe.fwd + h.aoe.r * 0.5 : h.range))); }

  function setState(e, s) {
    if (e.state === 'attack' && s !== 'attack') endTelegraph(e);
    e.state = s; e.t = 0;
  }
  function endTelegraph(e) {
    Rig.glow(e.rig, 0, 0);
    if (e.ring) { FX.killRing(e.ring); e.ring = null; }
    if (e.tmark) { if (!e.struck) e.tmark.kill(); e.tmark = null; }                  // a blow that never lands (stunned, parried, dead): the circle goes; one that landed finishes its flash
  }

  function pickAttack(e) {
    const list = e.def.attacks, total = list.reduce((s, a) => s + a.weight, 0);
    let r = Math.random() * total;
    for (const a of list) { r -= a.weight; if (r <= 0) return a; }
    return list[0];
  }
  function startAttack(e, idx) {
    e.atk = idx !== undefined ? e.def.attacks[idx] : pickAttack(e); e.hitIdx = 0;
    setState(e, 'attack'); beginHit(e);
  }
  function beginHit(e) {
    const h = e.atk.hits[e.hitIdx];
    e.phase = 'wind'; e.phaseT = 0; e.struck = false;
    if (h.blink) blink(e);
    // The telegraph: the timing circle (white = blockable, red = unblockable, amber = parry-only; see beginHit) and a floor ring for area attacks
    if (h.unblockable) {
      Snd.play('warn'); FX.text(Combat.chestPos(e.pos, 2.6 * e.def.scale), Settings.get('cues') ? '✖ DASH!' : '!', 'danger');
      Rig.flash(e.rig, GLOW_RED, 0.5); e.flashT = 0.25;
    } else if (h.parryOnly) {
      Snd.play('warn'); FX.text(Combat.chestPos(e.pos, 1.8 * e.def.scale), Settings.get('cues') ? '▲ PARRY!' : '!', 'amber');
      Rig.flash(e.rig, GLOW_AMBER, 0.45); e.flashT = 0.25;
    } else Snd.play('glint');
    // An area blow is aimed once, as it starts: at the warden, landing where the body will end up after its lunge or
    // leap. The ring stays put and the blow lands on it, so a dash out of it works whatever the body does next.
    e.aoeAt = e.aoeTo = null;
    if (h.aoe) {
      const p = e.tgt || G.player, yaw = Combat.yawTo(e.pos, p.pos), dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const go = Math.min(h.lunge, Math.max(0, Combat.dist(e.pos, p.pos) - e.def.radius - 0.8));
      e.aoeTo = e.pos.clone().addScaledVector(dir, go); e.aoeTo.y = 0;
      e.aoeAt = e.aoeTo.clone().addScaledVector(dir, h.aoe.fwd); e.aimYaw = yaw;
    }
    if (h.aoe) e.ring = FX.ring(e.aoeAt, h.aoe.r, GLOW_RED, h.wind + h.active, { r0: 0.2, fill: true, fade: false });
    // The timing circle: shrinks onto a small circle and arrives exactly when the blow lands (not for a feint, which never lands, nor
    // for a shot, which has its own flight). Only for blows meant for the warden.
    const hero = G.player;
    if (!h.feint && !h.projectile && Settings.get('timingRing') !== false && hero && hero.state !== 'dead' && (e.tgt === hero || Combat.dist(e.pos, hero.pos) < (h.range || 2.5) + 2.5)) {
      const sc = e.def.scale, hitT = h.wind + h.active * (h.leap ? 0.8 : 0.5), col = h.unblockable ? GLOW_RED : h.parryOnly ? GLOW_AMBER : GLOW_OK;
      e.tmark = FX.timing(() => new THREE.Vector3(e.pos.x + Math.sin(e.facing) * e.def.radius * 0.5, 1.5 * sc + 0.25, e.pos.z + Math.cos(e.facing) * e.def.radius * 0.5), col, hitT, 0.7 + 0.45 * sc, 0.22 + 0.1 * sc, hero.S ? hero.S.parry : 0.2);
    }
  }

  // ---------------- Aggro ----------------
  // A foe goes for whoever scores best: the nearer, the more damage (or healing) they have done to it lately (threat, which fades),
  // and a tank is hard to ignore. It sticks to its pick for a moment, and does not change its mind in the middle of a blow.
  // The warden and the companions (G.allies) are all candidates; those who are down are not.
  const alive = c => c === G.player ? c.state !== 'dead' : c.state !== 'down';
  function addThreat(e, who, n) { if (!who || !(n > 0)) return; e.threat = e.threat || new Map(); e.threat.set(who, (e.threat.get(who) || 0) + n); }
  function pickTarget(e, dt) {
    const hero = G.player;
    if (e.threat) for (const [k, v] of e.threat) { const nv = v * Math.exp(-0.3 * dt); if (nv < 1 || !alive(k)) e.threat.delete(k); else e.threat.set(k, nv); }
    if (!G.allies || !G.allies.length) return (e.tgt = hero);
    e.tgtT = (e.tgtT || 0) - dt;
    if (e.tgt && alive(e.tgt) && (e.tgtT > 0 || e.state === 'attack')) return e.tgt;
    e.tgtT = 0.45;
    let best = null, bs = -Infinity;
    for (const c of [hero].concat(G.allies)) {
      if (!alive(c)) continue;
      const d = Combat.dist(e.pos, c.pos);
      const s = Math.min(60, (e.threat && e.threat.get(c)) || 0) + (14 - Math.min(14, d)) * 1.5 + (c.tank ? 9 : 0) + (c === e.tgt ? 5 : 0);
      if (s > bs) { bs = s; best = c; }
    }
    return (e.tgt = best || hero);
  }

  function update(e, dt) {
    e.t += dt; e.postureT += dt;
    const p = pickTarget(e, dt), d = Combat.dist(e.pos, p.pos), toP = Combat.yawTo(e.pos, p.pos), def = e.def;
    const before = e.pos.clone();
    if (e.state !== 'broken' && e.postureT > 1.2) e.posture = Math.max(0, e.posture - def.postureRegen * dt);
    if (def.regen && e.state !== 'dead' && e.postureT > 3 && e.hp < e.maxHp) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * def.regen * dt); updateBar(e); }   // a troll knits back together when left alone
    const turn = (want, rate) => { e.facing += Combat.wrap(want - e.facing) * Math.min(1, rate * dt); };
    // Frost slows every step; burning ticks twice a second until its damage is spent
    const slow = e.chillT > 0 ? 1 - e.chill : 1;
    if (e.chillT > 0 && (e.chillT -= dt) <= 0) e.chill = 0;
    if (e.burnT > 0 && e.state !== 'dead') {
      e.burnTick = (e.burnTick || 0) + dt; e.burnT -= dt;
      if (e.burnTick >= 0.5 || e.burnT <= 0) { const n = e.burnLeft * Math.min(1, e.burnTick / Math.max(0.5, e.burnT + e.burnTick)); e.burnLeft -= n; e.burnTick = 0; if (n >= 0.5) burn(e, n, 0xff6a1a); }
      if (e.burnT <= 0) e.burnLeft = 0;
    }
    const step = (ang, sp) => { e.pos.x += Math.sin(ang) * sp * slow * dt; e.pos.z += Math.cos(ang) * sp * slow * dt; };

    if (e.state === 'spawn') {
      e.rig.root.position.y = -1.9 * def.scale * Math.max(0, 1 - e.t / 0.9);
      turn(toP, 6);
      if (e.t >= 0.9) { e.rig.root.position.y = 0; setState(e, 'hunt'); }
    } else if (e.state === 'hunt' && e.zone && !e.aggro) {
      // A beast of the Rim minds its own business until the warden comes close (or a packmate is roused)
      e.wanderT = (e.wanderT || 0) - dt;
      if (e.wanderT <= 0) { const a = Math.random() * Math.PI * 2, r = Math.random() * e.zone.r * 0.8; e.wanderTo = { x: e.zone.x + Math.sin(a) * r, z: e.zone.z + Math.cos(a) * r }; e.wanderT = 3 + Math.random() * 5; }
      const w = e.wanderTo, wd = w ? Math.hypot(w.x - e.pos.x, w.z - e.pos.z) : 0;
      if (w && wd > 0.5 && (e.wanderT < 6 || e.raid)) { const a = Math.atan2(w.x - e.pos.x, w.z - e.pos.z); turn(a, 4); step(a, def.speed * (e.raid ? 0.7 : 0.3)); }   // raiders march
      if (p.state !== 'dead' && d < (def.aggro || 9) * (Items.rescued && Items.rescued('mira') ? 0.75 : 1)) rouse(e);   // Mira taught the warden to move quietly
    } else if (e.state === 'hunt') {
      e.cooldown -= dt; e.strafeT -= dt;
      // Led too far from home, a beast of the Rim gives up and goes back, mending as it goes
      if (e.zone && Math.hypot(e.pos.x - e.zone.x, e.pos.z - e.zone.z) > e.zone.r + CFG.field.leash && d > 6) { e.aggro = false; e.wanderTo = { x: e.zone.x, z: e.zone.z }; e.wanderT = 6; e.hp = e.maxHp; e.posture = 0; updateBar(e); if (e.fieldBoss && G.onFieldBoss) G.onFieldBoss(e, false); }
      if (e.strafeT <= 0) { e.strafeT = 1.5 + Math.random() * 2; if (Math.random() < 0.5) e.strafeDir *= -1; }
      const reach = maxReach(e) * 0.85 + CFG.player.radius;
      const playerOK = p.state !== 'dead';
      // The hero is in another section: run for the doorway on the way
      const via = playerOK && d > reach ? World.route(e.pos, p.pos) : null;
      if (via) { const a = Combat.yawTo(e.pos, via); turn(a, 9); step(a, def.speed * 1.1); }
      else turn(toP, 7);
      if (via) { /* on the way */ }
      else if (def.ranged) {
        // Archers hold the middle distance: back off when crowded, close in when too far, shoot whenever ready
        const [near, far] = def.ranged;
        if (playerOK && e.cooldown <= 0 && d <= far + 1.5 && d > 2) startAttack(e);
        else if (d < near) step(toP + Math.PI + 0.4 * e.strafeDir, def.speed * 0.85);
        else if (d > far) step(toP, def.speed);
        else step(toP + Math.PI / 2 * e.strafeDir, def.speed * 0.45);
      }
      else if (def.charge && playerOK && e.cooldown <= 0 && d > def.charge[0] && d < def.charge[1] && attacking() < CFG.maxAttackers + Settings.diff.attackers) startAttack(e, def.charge[2]);   // a boar's charge from afar
      else if (playerOK && e.cooldown <= 0 && d <= reach && attacking() < CFG.maxAttackers + Settings.diff.attackers) startAttack(e);
      else if (!playerOK) { /* stand and gloat */ }
      else if (e.cooldown <= 0 && d > reach) step(toP, def.speed);
      else if (d > def.approach + 1.2) step(toP, def.speed);
      else if (d < def.approach - 0.4) step(toP + Math.PI, def.speed * 0.5);
      else step(toP + Math.PI / 2 * e.strafeDir, def.speed * 0.4);
    } else if (e.state === 'attack') {
      const h = e.atk.hits[e.hitIdx]; e.phaseT += dt;
      // The lunge: an area blow goes to its planned spot and no further; any other closes on the warden
      const lunge = sp => {
        if (!e.aoeTo) { if (d > def.radius + 0.8) step(e.facing, sp); return; }
        const rx = e.aoeTo.x - e.pos.x, rz = e.aoeTo.z - e.pos.z, rem = Math.hypot(rx, rz); if (rem < 0.01) return;
        const k = Math.min(sp * slow * dt, rem) / rem; e.pos.x += rx * k; e.pos.z += rz * k;
      };
      if (e.phase === 'wind') {
        // Tracks the player until shortly before the hit, then commits (that is the moment to roll sideways)
        if (e.phaseT < h.wind - 0.22) turn(e.aoeAt ? e.aimYaw : toP, 6);   // an area blow keeps to its ring
        Rig.glow(e.rig, glowOf(h), 0.2 + 1.3 * Math.min(1, e.phaseT / h.wind));
        if (e.phaseT > h.wind * 0.65 && !h.leap) lunge(h.lunge / (h.wind * 0.35 + h.active));
        // A feint: the swing stops short, the weapon drops, and the real blow comes quickly after
        if (h.feint && e.phaseT >= h.wind) { e.phase = 'recover'; e.phaseT = 0; endTelegraph(e); return finishUpdate(e, dt, before); }
        if (e.phaseT >= h.wind) { e.phase = 'active'; e.phaseT = 0; Snd.play('swing'); }
      } else if (e.phase === 'active') {
        lunge(h.leap ? h.lunge / (h.active * 0.8) : h.lunge / (h.wind * 0.35 + h.active));   // a leap lands as it strikes
        if (!e.struck && e.phaseT >= h.active * (h.leap ? 0.8 : 0.5)) {
          e.struck = true;
          if (h.projectile) shoot(e, h); else if (h.raise) raise(e, h.raise); else Combat.enemyStrike(e, h);
          if (e.state !== 'attack') return finishUpdate(e, dt, before);
        }
        if (e.phaseT >= h.active) { e.phase = 'recover'; e.phaseT = 0; endTelegraph(e); }
      } else if (e.phase === 'recover') {
        if (e.phaseT >= h.recover) {
          if (e.hitIdx < e.atk.hits.length - 1) { e.hitIdx++; beginHit(e); }
          else { e.cooldown = (def.cooldown[0] + Math.random() * (def.cooldown[1] - def.cooldown[0])) * Settings.diff.cooldown * (e.frenzy ? 0.7 : 1); setState(e, 'hunt'); }
        }
      }
    } else if (e.state === 'roar') {
      // A guardian changes phase: rears up untouchable, the shockwave throws the hero back, then the changes take hold
      turn(toP, 4);
      if (e.t >= 0.5 && !e.roared) { e.roared = true; applyPhase(e, e.roarPh); }
      if (e.t >= 1.4) { setState(e, 'hunt'); e.cooldown = 0.4; }
    } else if (e.state === 'stagger') {
      if (e.t >= e.stunFor) setState(e, 'hunt');
    } else if (e.state === 'broken') {
      if (Math.floor(e.t * 3) !== Math.floor((e.t - dt) * 3)) FX.glint(Combat.chestPos(e.pos, 2.3 * def.scale), 0xffd040, 1.0, 0.3);
      if (e.t >= 2.4) { e.posture = 0; setState(e, 'hunt'); e.cooldown = 0.3; }
    } else if (e.state === 'dead') {
      if (e.blast && !e.blown) {
        if (Math.floor(e.t * 6) !== Math.floor((e.t - dt) * 6)) Snd.play('glint');
        if (e.t >= e.blast.fuse) explode(e);
      }
      if (e.t > 2.2) e.rig.root.position.y = -(e.t - 2.2) * 1.2;
      if (e.t > 3.6) e.remove = true;
    }
    finishUpdate(e, dt, before);
  }

  function finishUpdate(e, dt, before) {
    const mx = e.pos.x - before.x, mz = e.pos.z - before.z, ml = Math.hypot(mx, mz), moved = ml / Math.max(dt, 1e-4);
    if (ml > 1e-5) { const fx = Math.sin(e.facing), fz = Math.cos(e.facing); e.dirF = (mx * fx + mz * fz) / ml; e.dirS = (mx * fz - mz * fx) / ml; }
    e.speedK += (Math.min(1, moved / Math.max(1, e.def.speed)) - e.speedK) * Math.min(1, 10 * dt);
    if (e.speedK > 0.05) e.cycle += dt * 9 * Math.max(0.5, e.speedK);
    const r = e.rig;
    r.root.position.x = e.pos.x; r.root.position.z = e.pos.z; r.root.rotation.y = e.facing;
    // A pounce arcs through the air
    const hh = e.atk && e.atk.hits[e.hitIdx];
    if (e.state === 'attack' && e.phase === 'active' && hh && hh.leap) r.root.position.y = Math.sin(Math.min(1, e.phaseT / hh.active) * Math.PI) * 0.9;
    else if (e.state !== 'spawn' && e.state !== 'dead') r.root.position.y = 0;
    const near = Combat.dist(e.pos, G.player.pos) < 5;
    let mode = e.state;
    if (e.state === 'hunt' || e.state === 'spawn') mode = guardUp(e) && near ? 'block' : e.speedK > 0.08 ? 'move' : 'idle';
    const h = e.state === 'roar' ? ROAR[e.type === 'spider' ? 'spider' : e.type === 'mutant' ? 'mutant' : 'other'] : e.atk && e.atk.hits[e.hitIdx];
    if (e.state === 'roar') { mode = 'attack'; e.phase = 'wind'; e.phaseT = e.t; }
    Rig.animate(r, {
      mode, t: e.t, speed: e.speedK, mps: e.speedK * e.def.speed, cycle: e.cycle, dirF: e.dirF, dirS: e.dirS,
      atk: h && h.pose, phase: e.phase, p: e.phase === 'recover' && h ? e.phaseT / h.recover : 0,
      phaseT: e.phaseT, wind: h && h.wind, active: h && h.active, recover: h && h.recover,
      windRate: h ? 2.6 / h.wind : 12,
    }, dt);
    if (r.weapon) Rig.updateTrail(e.trail, r.weapon, e.state === 'attack' && e.phase === 'active' && !(h && h.projectile), h && (h.unblockable || h.parryOnly) ? glowOf(h) : undefined);
    if (e.aura) { e.aura.material.opacity = e.state === 'dead' ? 0 : 0.45 + Math.sin(e.t * 5) * 0.2; }
    if (e.bubble) {
      if (e.ward <= 0 && e.state !== 'dead') { e.wardT += dt; if (e.wardT >= e.mods.warded.wardBack) { e.ward = e.mods.warded.ward; FX.text(Combat.chestPos(e.pos, 2.4 * e.def.scale), 'WARD', 'amber'); } }
      e.bubble.visible = e.ward > 0 && e.state !== 'dead';
      e.bubble.material.opacity = 0.18 + Math.sin(e.t * 4) * 0.05;
    }
    if (e.flashT > 0) { e.flashT -= dt; if (e.flashT <= 0) Rig.flash(r, e.tint || (e.enraged ? 0x5a0c06 : 0), e.tint || e.enraged ? 1 : 0); }
  }

  function hurtFlash(e, c = 0xffffff, a = 0.45) { Rig.flash(e.rig, c, a); e.flashT = 0.1; }
  function stun(e, t) { setState(e, 'stagger'); e.stunFor = t; e.rig.hurtVar = Math.random() < 0.5; }
  function addPosture(e, n) {
    e.posture = Math.min(e.def.posture * e.mult, e.posture + n); e.postureT = 0;
    if (e.posture >= e.def.posture * e.mult && e.state !== 'dead') {
      setState(e, 'broken');
      FX.text(Combat.chestPos(e.pos, 2.4 * e.def.scale), 'BROKEN!', 'crit'); Snd.play('guardBreak');
      FX.glint(Combat.chestPos(e.pos, 1.5 * e.def.scale), 0xffd040, 3, 0.4);
      if (G.onBroken) G.onBroken(e);
      return true;
    }
    return false;
  }

  // The player's attack reaches this enemy. Returns 'crit', 'hit', 'blocked' or null.
  // Rouse a beast of the Rim, and its pack nearby
  function rouse(e) {
    if (e.aggro) return; e.aggro = true; e.cooldown = Math.max(e.cooldown, 0.4);
    if (e.fieldBoss && G.onFieldBoss) G.onFieldBoss(e, true);
    if (e.def.pack) for (const o of G.enemies) if (o !== e && o.zone === e.zone && !o.aggro && o.state !== 'dead' && Combat.dist(o.pos, e.pos) < 12) rouse(o);
  }
  function receive(e, atk, p) {
    if (!targetable(e) || e.state === 'roar') return null;
    if (e.zone) rouse(e);
    addThreat(e, p, atk.dmg);
    // A ward soaks the blow (heavy attacks crack it twice as fast)
    if (e.ward > 0) {
      e.ward = Math.max(0, e.ward - (atk.breaksGuard ? 2 : 1)); e.wardT = 0;
      FX.burst(Combat.chestPos(e.pos, 1.3 * e.def.scale), 0xa070ff, 12, 5);
      if (e.ward === 0) { FX.text(Combat.chestPos(e.pos, 2.4 * e.def.scale), 'WARD BROKEN', 'crit'); Snd.play('guardBreak'); } else Snd.play('block');
      return 'ward';
    }
    if (e.armored && !atk.breaksGuard && e.state !== 'broken') atk = Object.assign({}, atk, { dmg: atk.dmg * 0.6 });
    const def = e.def, frontal = Combat.facingCheck(e.pos, e.facing, p.pos, def.guardAngle || 140);
    const at = Combat.chestPos(e.pos, 1.2 * def.scale);
    if (e.state === 'broken') {
      // Riposte on a posture-broken enemy
      const dmg = atk.dmg * (atk.critMult || CFG.player.critMult);
      FX.text(Combat.chestPos(e.pos, 2.2 * def.scale), 'CRITICAL ' + Math.round(dmg), 'crit');
      FX.burst(at, 0xffd040, 26, 9); FX.glint(at, 0xffffff, 3.2, 0.3); FX.slowmo(0.25, 0.3);
      hurtFlash(e, 0xffe0a0, 1.2); G.stats.crits++;
      e.posture = 0; damage(e, dmg);
      if (e.state !== 'dead' && e.state !== 'roar') stun(e, 0.6);
      return 'crit';
    }
    if (guardUp(e) && frontal) {
      const shield = at.clone().add(new THREE.Vector3(Math.sin(e.facing) * 0.5, 0.1, Math.cos(e.facing) * 0.5));
      if (atk.breaksGuard) {
        FX.text(Combat.chestPos(e.pos, 2.3 * def.scale), 'GUARD BREAK', 'crit'); FX.burst(shield, 0xffb060, 18, 7);
        Snd.play('guardBreak');
        damage(e, atk.dmg * 0.6);
        if (e.state !== 'dead' && e.state !== 'roar' && !addPosture(e, atk.posture * 1.6)) stun(e, 0.9);
        return 'hit';
      }
      FX.burst(shield, 0xfff0d0, 10, 5);
      addPosture(e, atk.posture * 0.5);
      return 'blocked';
    }
    const back = !Combat.facingCheck(e.pos, e.facing, p.pos, 200);
    const shelter = sheltered(e);
    const dmg = atk.dmg * (back ? 1.3 : 1) * (1 + (atk.fire || 0)) * (shelter ? 1 - shelter.def.ward.cut : 1) * (1 - (def.dr || 0));   // dr: a stone hide
    if (shelter) FX.burst(Combat.chestPos(e.pos, 1.3 * def.scale), 0x6a9aff, 8, 4);
    if (atk.fire) FX.burst(at, 0xff8a2a, 8, 4, 0.4);                      // Ember Edge
    FX.burst(at, BONE[e.type] ? 0xe8e0c8 : e.type === 'spider' ? 0x7aff6a : 0xc0201a, 10, 5);
    hurtFlash(e);
    damage(e, dmg, back ? 'back' : '');
    if (e.state === 'dead' || e.state === 'roar') return 'hit';
    const jolt = elements(e, atk, dmg);
    if (addPosture(e, atk.posture)) return 'hit';
    if (jolt) { stun(e, 0.45); return 'hit'; }
    const armored = def.hyperArmor && e.state === 'attack';
    if ((def.flinch && !armored) || (atk.breaksGuard && e.state !== 'attack')) stun(e, atk.breaksGuard ? 0.6 : 0.35);
    return 'hit';
  }

  function damage(e, n, cls = '') {
    e.hp -= n;
    FX.text(Combat.chestPos(e.pos, 2.0 * e.def.scale), Math.round(n) + (cls === 'back' ? '!' : ''), 'dmg');
    if (e.hp <= 0) die(e); else if (e.boss) checkPhase(e);
  }
  function die(e) {
    e.hp = 0; e.rig.dieVar = Math.random() < 0.5; setState(e, 'dead');
    Snd.play('die'); FX.burst(Combat.chestPos(e.pos, 1.0), BONE[e.type] ? 0xd8cfb4 : e.type === 'spider' ? 0x4a8a3a : 0x6a1a1a, 24, 6, 0.6);
    e.bar.remove();
    if (e.blast) { FX.ring(new THREE.Vector3(e.pos.x, 0, e.pos.z), e.blast.r, 0xff3010, e.blast.fuse, { r0: 0.3, fill: true, fade: false }); FX.text(Combat.chestPos(e.pos, 2.0), '!', 'danger'); Snd.play('warn'); }
    G.onEnemyDeath(e);
    // A bone caller's risen fall with it
    for (const o of G.enemies) if (o.raisedBy === e && o.state !== 'dead') die(o);
    // A fallen guardian takes its summoned adds with it
    if (e.boss) { G.queue = G.queue.filter(q => !q.add); for (const o of G.enemies) if (o.add && o.state !== 'dead') die(o); }
  }

  // A weapon's elements on a landed hit: fire burns for a share of the hit over 2 s, frost slows the foe for 2 s, shock
  // may jolt it (a short stun; guardians and champions only shudder). Returns true for a jolt.
  function elements(e, atk, dmg) {
    const at = Combat.chestPos(e.pos, 1.2 * e.def.scale);
    if (atk.burn) { e.burnLeft = (e.burnLeft || 0) + dmg * atk.burn; e.burnT = 2; FX.burst(at, 0xff6a1a, 6, 3, 0.4); }
    if (atk.chill) { e.chill = Math.max(e.chill || 0, atk.chill); e.chillT = 2; FX.burst(at, 0x9ae0ff, 6, 3, 0.4); }
    if (atk.shock && Math.random() < atk.shock) {
      FX.burst(at, 0xd8e8ff, 12, 6, 0.3); FX.text(Combat.chestPos(e.pos, 2.4 * e.def.scale), 'JOLT', 'parry');
      return !e.boss && !e.champion && e.state !== 'broken';
    }
    return false;
  }
  // Damage that bypasses guard and flinch (burning ground, thorns)
  function burn(e, n, color = 0xff7a20) {
    if (!targetable(e) || e.state === 'roar' || !e.def) return;
    FX.burst(Combat.chestPos(e.pos, 0.9 * e.def.scale), color, 6, 3, 0.4); hurtFlash(e, color, 0.5);
    damage(e, n);
  }
  // A shield-bearer standing near shelters an ally (not itself)
  function sheltered(e) {
    for (const o of G.enemies) if (o !== e && o.def.ward && o.state !== 'dead' && Combat.dist(o.pos, e.pos) < o.def.ward.r) return o;
    return null;
  }
  // A bone caller raises skeletons from the floor around it (up to raiseMax at once); they crumble when it dies
  function raise(e, n) {
    const have = G.enemies.filter(o => o.raisedBy === e && o.state !== 'dead').length + G.queue.filter(q => q.raisedBy === e).length;
    const k = Math.min(n, (e.def.raiseMax || 4) - have);
    FX.ring(e.pos, 2.4, 0xb06aff, 0.7, { r0: 0.4 }); Snd.play('warn');
    for (let i = 0; i < k; i++) {
      const a = Math.random() * Math.PI * 2, at = new THREE.Vector3(e.pos.x + Math.sin(a) * 2, 0, e.pos.z + Math.cos(a) * 2);
      if (!World.inSpace(at.x, at.z, 0.5)) at.set(e.pos.x, 0, e.pos.z + 1);
      FX.burst(new THREE.Vector3(at.x, 0.2, at.z), 0xb06aff, 14, 3, 0.6);
      G.queue.push({ type: 'skeleton', at, mult: e.mult * 0.6, room: e.room, raisedBy: e, t: G.time + 0.3 + i * 0.3 });
    }
  }
  // An execution: an untouchable finishing blow on a posture-broken enemy. Ordinary foes die; guardians and champions
  // take a heavy critical instead.
  function execute(e, atk, p) {
    if (e.state === 'dead') return;
    e.ward = 0;
    const at = Combat.chestPos(e.pos, 1.2 * e.def.scale);
    FX.text(Combat.chestPos(e.pos, 2.6 * e.def.scale), 'EXECUTION', 'crit'); FX.burst(at, 0xffd040, 40, 10, 0.8); FX.glint(at, 0xffffff, 4, 0.4);
    FX.shake(0.5); FX.hitStop(0.2); Snd.play('execute'); G.rumble(1, 0.8, 350); G.stats.crits++;
    hurtFlash(e, 0xffe0a0, 1.4);
    if (e.guardian) { damage(e, atk.dmg * (atk.critMult || CFG.player.critMult) * CFG.player.execute.execMult); if (e.state !== 'dead' && e.state !== 'roar') { e.posture = 0; stun(e, 1.0); } }
    else damage(e, e.hp + 1);
    if (G.stats) G.stats.executions = (G.stats.executions || 0) + 1;
  }

  // The player parried this enemy's hit: heavy posture damage and an opening
  function parried(e) {
    FX.burst(Combat.chestPos(e.pos, 1.3 * e.def.scale), 0xffe08a, 12, 6);
    if (!addPosture(e, e.def.posture * e.mult * 0.45)) stun(e, 0.75);
  }

  function updateBar(e) {
    if (!e.bar || e.state === 'dead') return;
    const s = FX.project(Combat.chestPos(e.pos, 2.15 * e.def.scale + 0.15));
    e.bar.style.transform = `translate(${s.x - 30}px, ${s.y}px)`;
    e.bar.style.display = s.vis ? '' : 'none';
    e.bar.querySelector('.hp i').style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
    const pk = e.posture / (e.def.posture * e.mult);
    const pf = e.bar.querySelector('.post i'); pf.style.width = pk * 100 + '%';
    pf.style.background = e.state === 'broken' ? '#ffd040' : pk > 0.7 ? '#ff7a30' : '#e8c060';
    e.bar.classList.toggle('broken', e.state === 'broken');
    e.bar.classList.toggle('exec', e.state === 'broken' && G.player && Combat.dist(G.player.pos, e.pos) < CFG.player.execute.range + e.def.radius + 0.8);
  }

  function dispose(e, scene) {
    scene.remove(e.rig.root); scene.remove(e.trail.mesh); if (e.bar) e.bar.remove(); endTelegraph(e);
    if (e.dropped) scene.remove(e.dropped);
  }

  // ---------------- Guardians ----------------
  // A guardian is its kind grown into a boss (CFG.bosses): bigger, tougher, with its own moves and phases.
  const ROAR = { other: { pose: 'heavy', wind: 1.4, active: 0.1, recover: 0.1 }, mutant: { pose: 'roar', wind: 1.4, active: 0.1, recover: 0.1 }, spider: { pose: 'pounce', wind: 1.4, active: 0.1, recover: 0.1 } };
  const clone = o => JSON.parse(JSON.stringify(o));
  function scaleHits(attacks, reach) {
    for (const a of attacks) for (const h of a.hits) { h.range *= reach; if (h.aoe) { h.aoe.fwd *= reach; h.aoe.r *= reach; } }
    return attacks;
  }
  function makeBoss(e, si) {
    const B = typeof si === 'object' ? si : CFG.bosses[si];                 // a stage's guardian, or a boss given whole (the big monsters)
    if (!B) { e.rig.root.scale.multiplyScalar(1.15); return; }
    const def = e.def = clone(e.def);                                       // this one enemy gets its own copy to grow and change
    def.scale *= B.scale; def.radius *= B.scale; def.posture *= B.posture; def.flinch = false;      // guardians shrug off light hits
    def.attacks = scaleHits(clone(B.attacks || def.attacks).concat(clone(B.add || [])), B.reach);
    e.hp = e.maxHp = e.maxHp * B.hp;
    e.rig.root.scale.multiplyScalar(B.scale);
    e.boss = { B, next: 0 }; if (typeof si === 'number') e.bossIdx = si;
    if (B.start) { if (B.start.def) Object.assign(def, clone(B.start.def)); if (B.start.stance === 'twoHanded') dropShield(e); }      // a guardian that starts in its first form
  }
  function checkPhase(e) {
    const ph = e.boss.B.phases[e.boss.next];
    if (!ph || e.hp > e.maxHp * ph.at) return;
    e.boss.next++; e.roarPh = ph; e.roared = false; e.atk = null; e.posture = 0;
    setState(e, 'roar');
    Rig.flash(e.rig, ph.enrage ? 0xff2010 : 0xffe0a0, 0.9); e.flashT = 1.2;
    Snd.play('warn'); FX.shake(0.3);
    if (G.onBossPhase) G.onBossPhase(e, ph);
  }
  function applyPhase(e, ph) {
    const def = e.def, B = e.boss.B, p = G.player;
    if (ph.def) Object.assign(def, clone(ph.def));
    if (ph.attacks) def.attacks = scaleHits(clone(ph.attacks), B.reach);
    if (ph.add) def.attacks = def.attacks.concat(scaleHits(clone(ph.add), B.reach));
    if (ph.faster) for (const a of def.attacks) for (const h of a.hits) h.wind *= ph.faster;
    if (ph.stance === 'twoHanded') dropShield(e);
    if (ph.enrage) e.enraged = true;
    if (ph.tint) e.tint = ph.tint;                                         // a colour the guardian keeps
    if (ph.music !== undefined) e.musicTheme = ph.music;                   // and a theme of its own in the music
    // Shockwave
    const d = Combat.dist(e.pos, p.pos);
    FX.ring(e.pos, 4.5, ph.enrage ? 0xff4020 : 0xffd0a0, 0.6, { r0: 0.5 }); FX.burst(Combat.chestPos(e.pos, 1.2 * def.scale), 0xffe0a0, 30, 8, 0.6);
    FX.shake(0.5); Snd.play('slam');
    if (d < 4.5 && p.state !== 'dead') { const a = Combat.yawTo(e.pos, p.pos), k = 10 * (1 - d / 6); p.kb.set(Math.sin(a) * k, 0, Math.cos(a) * k); }
    // Summoned adds climb out of the floor around the guardian
    (ph.summon || []).forEach((type, i, all) => {
      const a = e.facing + Math.PI / 2 + i * Math.PI * 2 / all.length, r = 2.6 * B.scale;
      const at = new THREE.Vector3(e.pos.x + Math.sin(a) * r, 0, e.pos.z + Math.cos(a) * r);
      if (!World.inSpace(at.x, at.z, 0.6)) at.set(e.pos.x + (Math.random() - 0.5) * 2, 0, e.pos.z + (Math.random() - 0.5) * 2);
      G.queue.push({ type, at, mult: e.mult / CFG.guardianMult * CFG.addMult, room: e.room, add: true, t: G.time + 0.2 + i * 0.35 });
    });
  }
  // Sir Aldric casts his shield aside and takes his sword in both hands
  function dropShield(e) {
    const r = e.rig; r.set = 'gs'; r.twoHand = true;
    if (!r.shield) return;
    const s = r.shield, w = s.getWorldPosition(new THREE.Vector3());
    s.parent.remove(s); r.root.parent.add(s); r.shield = null; e.dropped = s;
    s.position.set(w.x, 0.06, w.z); s.rotation.set(-Math.PI / 2, 0, Math.random() * 6); s.scale.copy(r.root.scale);
  }
  // The Pale Duelist steps through the dark and strikes from behind the hero
  function blink(e) {
    const p = G.player, a = p.facing + Math.PI, x = p.pos.x + Math.sin(a) * 2.1, z = p.pos.z + Math.cos(a) * 2.1;
    if (!World.inSpace(x, z, e.def.radius)) return;
    FX.burst(Combat.chestPos(e.pos, 1.0), 0x8070b0, 24, 5, 0.6);
    e.pos.set(x, 0, z); e.facing = Combat.yawTo(e.pos, p.pos);
    FX.burst(Combat.chestPos(e.pos, 1.0), 0x8070b0, 24, 5, 0.6); FX.ring(e.pos, 1.2, 0x9080d0, 0.5, { r0: 0.2 });
    Snd.play('warn');
  }

  // ---------------- Elites ----------------
  // Modifiers from CFG.elites: tougher numbers, a behaviour, an aura ring of their colour, and a name over the bar
  const EL = CFG.elites, auraGeo = new THREE.RingGeometry(0.62, 0.86, 28).rotateX(-Math.PI / 2), auraMats = {};
  function makeElite(e, mods, title) {
    const def = e.def = JSON.parse(JSON.stringify(e.def));
    e.mods = {}; e.elite = true;
    for (const id of mods) {
      const m = EL.mods[id]; if (!m) continue;
      e.mods[id] = m;
      e.hp *= m.hp; e.maxHp *= m.hp; if (m.posture) def.posture *= m.posture;
      if (m.speed) def.speed *= m.speed;
      if (m.wind) for (const a of def.attacks) for (const h of a.hits) h.wind *= m.wind;
      if (m.cooldown) def.cooldown = def.cooldown.map(c => c * m.cooldown);
      if (id === 'armored') e.armored = true;
      if (id === 'vampiric') e.leech = m.leech;
      if (id === 'explosive') e.blast = m.blast;
      if (id === 'warded') { e.ward = m.ward; e.wardT = 0; }
    }
    const color = EL.mods[mods[0]] ? EL.mods[mods[0]].color : 0xffb040;
    if (!auraMats[color]) auraMats[color] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    e.aura = new THREE.Mesh(auraGeo, auraMats[color].clone()); e.aura.position.y = 0.04; e.aura.scale.setScalar(def.radius / 0.55 / e.rig.root.scale.x); e.rig.root.add(e.aura);      // about the body's footprint
    if (e.ward > 0) {
      e.bubble = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 10), new THREE.MeshBasicMaterial({ color: 0xa070ff, transparent: true, opacity: 0.2, depthWrite: false }));
      const k = 1 / e.rig.root.scale.x; e.bubble.position.y = 1.0; e.bubble.scale.set(def.radius * 1.8 * k, 1.25, def.radius * 1.8 * k); e.rig.root.add(e.bubble);
    }
    const name = title || mods.map(id => EL.mods[id] && EL.mods[id].name).filter(Boolean).join(' ') + ' ' + def.name;
    e.title = name;
    const tag = document.createElement('div'); tag.className = 'ename'; tag.textContent = name;
    tag.style.color = '#' + new THREE.Color(color).getHexString(); e.bar.prepend(tag); e.bar.classList.add('elite');
    if (!title) Snd.play('elite');
  }
  // A volatile elite bursts a moment after it falls
  function explode(e) {
    e.blown = true;
    const B = e.blast, p = G.player, at = new THREE.Vector3(e.pos.x, 0, e.pos.z);
    FX.ring(at, B.r, 0xff7a20, 0.5, { r0: 0.3 }); FX.burst(Combat.chestPos(e.pos, 0.8), 0xff8a30, 40, 9, 0.8); FX.shake(0.45); Snd.play('slam');
    e.rig.root.visible = false;
    for (const al of G.allies || []) if (al.state !== 'down' && Combat.dist(al.pos, at) < B.r + CFG.player.radius) Party.hurt(al, e, { dmg: B.dmg });
    if (p && p.state !== 'dead' && Combat.dist(p.pos, at) < B.r + CFG.player.radius) Player.receive(p, { pos: at, mult: e.mult }, { dmg: B.dmg, posture: 0, unblockable: true, aoe: true });
  }
  // A vampiric elite's blow landed
  function leech(e, dmg) {
    if (!e.leech || e.state === 'dead') return;
    const n = dmg * e.leech; e.hp = Math.min(e.maxHp, e.hp + n);
    FX.text(Combat.chestPos(e.pos, 2.3 * e.def.scale), '+' + Math.round(n), 'heal');
  }
  // Which modifiers a new enemy gets: none for most, more often deeper down
  function rollElite(k, sure) {
    const si = k % CFG.stages.length, loop = Math.floor(k / CFG.stages.length);
    if (!sure && Math.random() >= EL.chance[si] + loop * EL.loopBonus) return null;
    const ids = Object.keys(EL.mods).sort(() => Math.random() - 0.5);
    return ids.slice(0, sure && loop > 0 ? 2 : 1);
  }

  // ---------------- Arrows ----------------
  // Real projectiles: they fly from the bow toward where the hero stood, and can be blocked, parried (knocked aside) or dashed through
  const arrows = [];
  let arrowGeo = null;
  function shoot(e, h) {
    if (!arrowGeo) {
      const shaft = new THREE.CylinderGeometry(0.012, 0.012, 0.7, 5).rotateX(Math.PI / 2), head = new THREE.ConeGeometry(0.035, 0.12, 4).rotateX(Math.PI / 2).translate(0, 0, 0.4);
      arrowGeo = [shaft, head];
    }
    const from = e.rig.weapon.group.getWorldPosition(new THREE.Vector3()); from.y = Math.max(1.1, from.y);
    const p = e.tgt || G.player, to = new THREE.Vector3(p.pos.x, 1.15, p.pos.z), dir = to.sub(from).normalize();
    const g = new THREE.Group(), P = h.projectile;
    let mats;
    if (P.orb) {
      // A glowing orb, slower than an arrow, that a parry sends back
      const core = new THREE.MeshBasicMaterial({ color: 0xffffff }), halo = new THREE.MeshBasicMaterial({ color: P.orb, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), core), new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), halo));
      mats = [core, halo]; Snd.play('cast');
    } else {
      const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a40 }), iron = new THREE.MeshStandardMaterial({ color: 0xd8d8e0, emissive: 0x606060 });
      g.add(new THREE.Mesh(arrowGeo[0], wood), new THREE.Mesh(arrowGeo[1], iron)); mats = [wood, iron]; Snd.play('swing');
    }
    g.position.copy(from); g.lookAt(from.clone().add(dir)); e.rig.root.parent.add(g);
    arrows.push({ g, pos: from.clone(), origin: from.clone(), dir, speed: P.speed, hit: h, mult: e.mult, gone: 0, mats, owner: e, orb: P.orb });
  }
  // An enemy arrow or orb that meets a companion hurts them (the first one it touches)
  function hitAlly(a) {
    if (a.back) return false;
    for (const al of G.allies || []) if (al.state !== 'down' && Math.hypot(a.pos.x - al.pos.x, a.pos.z - al.pos.z) < 0.55 && Math.abs(a.pos.y - 1.1) < 0.9) { return Party.hurt(al, { pos: a.origin, mult: a.mult, owner: a.owner }, a.hit) !== 'dodge'; }
    return false;
  }
  function updateArrows(dt) {
    const p = G.player;
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i]; let done = false;
      a.pos.addScaledVector(a.dir, a.speed * dt); a.gone += a.speed * dt; a.g.position.copy(a.pos);
      if (a.orb && Math.random() < dt * 30) FX.burst(a.pos.clone(), a.back ? 0xffd040 : a.orb, 1, 0.6, 0.3);
      if (a.back) {
        // A reflected orb flies at enemies instead
        for (const e of G.enemies) if (targetable(e) && Math.hypot(a.pos.x - e.pos.x, a.pos.z - e.pos.z) < e.def.radius + 0.35) {
          receive(e, { dmg: a.hit.dmg * a.mult * 2.2, posture: 40, breaksGuard: true }, p); FX.burst(a.pos.clone(), 0xffd040, 20, 6); Snd.play('crit'); done = true;
          if (e.state === 'dead' && typeof Codex !== 'undefined' && Items.S) Codex.add('reflectKills');
          break;
        }
      } else if (hitAlly(a)) {
        done = true;
      } else if (p && p.state !== 'dead' && Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) < 0.55 && Math.abs(a.pos.y - 1.1) < 0.9) {
        const res = Player.receive(p, { pos: a.origin, mult: a.mult }, a.hit);
        if (res === 'parry' && a.hit.projectile.reflect) {
          // Parried: back the way it came, at its caster (or wherever they stood), faster and golden
          const to = a.owner && a.owner.state !== 'dead' ? Combat.chestPos(a.owner.pos, 1.1 * a.owner.def.scale) : a.origin;
          a.dir = to.sub(a.pos).normalize(); a.speed *= 1.6; a.back = true; a.gone = 0;
          a.mats[1] && a.mats[1].color && a.mats[1].color.setHex(0xffd040);
          FX.text(Combat.chestPos(p.pos, 2.4), 'REFLECTED', 'parry'); Snd.play('reflect');
        } else {
          if (res === 'parry') FX.text(Combat.chestPos(p.pos, 2.4), 'DEFLECTED', 'parry');
          if (res !== 'dodge') done = true;
        }
      }
      if (a.gone > 20 || a.pos.y < 0 || !World.inSpace(a.pos.x, a.pos.z, 0.2)) done = true;
      if (done) { a.g.parent && a.g.parent.remove(a.g); a.mats.forEach(m => m.dispose()); arrows.splice(i, 1); }
    }
  }
  function clearArrows() { for (const a of arrows) { a.g.parent && a.g.parent.remove(a.g); a.mats.forEach(m => m.dispose()); } arrows.length = 0; }

  return { get arrows() { return arrows; }, addThreat, spawn, rouse, startAttack, makeBoss, makeElite, rollElite, leech, execute, burn, update, receive, parried, targetable, aoeCenter, updateBar, dispose, updateArrows, clearArrows };
})();
