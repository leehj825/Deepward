// Deepward - enemies: approach and circle the player, take turns attacking (attack tokens), telegraph every hit,
// and react to damage with flinches, guard blocks and posture breaks.
// States: spawn, hunt, attack, stagger, broken, roar (a guardian changing phase), dead.
const Enemy = (() => {
  const GLOW_OK = 0xfff0c0, GLOW_RED = 0xff2a10, GLOW_AMBER = 0xffa010;   // blockable / unblockable / parry-only
  const glowOf = h => h.unblockable ? GLOW_RED : h.parryOnly ? GLOW_AMBER : GLOW_OK;
  const BONE = { skeleton: 1, archer: 1 };

  function spawn(scene, type, pos, mult = 1) {
    const def = CFG.enemies[type], rig = Rig.build(def.rig || type);
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
  }

  function pickAttack(e) {
    const list = e.def.attacks, total = list.reduce((s, a) => s + a.weight, 0);
    let r = Math.random() * total;
    for (const a of list) { r -= a.weight; if (r <= 0) return a; }
    return list[0];
  }
  function startAttack(e) {
    e.atk = pickAttack(e); e.hitIdx = 0;
    setState(e, 'attack'); beginHit(e);
  }
  function beginHit(e) {
    const h = e.atk.hits[e.hitIdx];
    e.phase = 'wind'; e.phaseT = 0; e.struck = false;
    if (h.blink) blink(e);
    // The telegraph: a glint on the weapon (white = blockable, red = unblockable) and a floor ring for area attacks
    const tipPos = () => e.rig.weapon.tip.getWorldPosition(new THREE.Vector3());
    FX.glint(tipPos(), glowOf(h), h.unblockable || h.parryOnly ? 2.2 : 1.3, Math.min(0.5, h.wind * 0.6), tipPos);
    if (h.unblockable) {
      Snd.play('warn'); FX.text(Combat.chestPos(e.pos, 2.6 * e.def.scale), '!', 'danger');
      Rig.flash(e.rig, GLOW_RED, 0.5); e.flashT = 0.25;
    } else if (h.parryOnly) {
      Snd.play('warn'); FX.text(Combat.chestPos(e.pos, 1.8 * e.def.scale), '!', 'amber');
      Rig.flash(e.rig, GLOW_AMBER, 0.45); e.flashT = 0.25;
    } else Snd.play('glint');
    if (h.aoe) e.ring = FX.ring(aoeCenter(e, h), h.aoe.r, GLOW_RED, h.wind + h.active, { r0: 0.2, fill: true, fade: false });
  }

  function update(e, dt) {
    e.t += dt; e.postureT += dt;
    const p = G.player, d = Combat.dist(e.pos, p.pos), toP = Combat.yawTo(e.pos, p.pos), def = e.def;
    const before = e.pos.clone();
    if (e.state !== 'broken' && e.postureT > 1.2) e.posture = Math.max(0, e.posture - def.postureRegen * dt);
    const turn = (want, rate) => { e.facing += Combat.wrap(want - e.facing) * Math.min(1, rate * dt); };
    const step = (ang, sp) => { e.pos.x += Math.sin(ang) * sp * dt; e.pos.z += Math.cos(ang) * sp * dt; };

    if (e.state === 'spawn') {
      e.rig.root.position.y = -1.9 * def.scale * Math.max(0, 1 - e.t / 0.9);
      turn(toP, 6);
      if (e.t >= 0.9) { e.rig.root.position.y = 0; setState(e, 'hunt'); }
    } else if (e.state === 'hunt') {
      e.cooldown -= dt; e.strafeT -= dt;
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
      else if (playerOK && e.cooldown <= 0 && d <= reach && attacking() < CFG.maxAttackers) startAttack(e);
      else if (!playerOK) { /* stand and gloat */ }
      else if (e.cooldown <= 0 && d > reach) step(toP, def.speed);
      else if (d > def.approach + 1.2) step(toP, def.speed);
      else if (d < def.approach - 0.4) step(toP + Math.PI, def.speed * 0.5);
      else step(toP + Math.PI / 2 * e.strafeDir, def.speed * 0.4);
    } else if (e.state === 'attack') {
      const h = e.atk.hits[e.hitIdx]; e.phaseT += dt;
      if (e.phase === 'wind') {
        // Tracks the player until shortly before the hit, then commits (that is the moment to roll sideways)
        if (e.phaseT < h.wind - 0.22) turn(toP, 6);
        Rig.glow(e.rig, glowOf(h), 0.2 + 1.3 * Math.min(1, e.phaseT / h.wind));
        if (e.phaseT > h.wind * 0.65 && d > def.radius + 0.8 && !h.leap) step(e.facing, h.lunge / (h.wind * 0.35 + h.active));
        // A feint: the swing stops short, the weapon drops, and the real blow comes quickly after
        if (h.feint && e.phaseT >= h.wind) { e.phase = 'recover'; e.phaseT = 0; endTelegraph(e); return finishUpdate(e, dt, before); }
        if (e.ring && h.aoe) { const c = aoeCenter(e, h); e.ring.m.position.set(c.x, 0.03, c.z); if (e.ring.fill) e.ring.fill.position.set(c.x, 0.025, c.z); }
        if (e.phaseT >= h.wind) { e.phase = 'active'; e.phaseT = 0; Snd.play('swing'); }
      } else if (e.phase === 'active') {
        if (d > def.radius + 0.8) step(e.facing, h.leap ? h.lunge / h.active : h.lunge / (h.wind * 0.35 + h.active));
        if (!e.struck && e.phaseT >= h.active * (h.leap ? 0.8 : 0.5)) {
          e.struck = true;
          if (h.projectile) shoot(e, h); else Combat.enemyStrike(e, h);
          if (e.state !== 'attack') return finishUpdate(e, dt, before);
        }
        if (e.phaseT >= h.active) { e.phase = 'recover'; e.phaseT = 0; endTelegraph(e); }
      } else if (e.phase === 'recover') {
        if (e.phaseT >= h.recover) {
          if (e.hitIdx < e.atk.hits.length - 1) { e.hitIdx++; beginHit(e); }
          else { e.cooldown = def.cooldown[0] + Math.random() * (def.cooldown[1] - def.cooldown[0]); setState(e, 'hunt'); }
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
    const h = e.state === 'roar' ? ROAR[e.type === 'spider' ? 'spider' : 'other'] : e.atk && e.atk.hits[e.hitIdx];
    if (e.state === 'roar') { mode = 'attack'; e.phase = 'wind'; e.phaseT = e.t; }
    Rig.animate(r, {
      mode, t: e.t, speed: e.speedK, mps: e.speedK * e.def.speed, cycle: e.cycle, dirF: e.dirF, dirS: e.dirS,
      atk: h && h.pose, phase: e.phase, p: e.phase === 'recover' && h ? e.phaseT / h.recover : 0,
      phaseT: e.phaseT, wind: h && h.wind, active: h && h.active, recover: h && h.recover,
      windRate: h ? 2.6 / h.wind : 12,
    }, dt);
    if (r.weapon) Rig.updateTrail(e.trail, r.weapon, e.state === 'attack' && e.phase === 'active' && !(h && h.projectile), h && (h.unblockable || h.parryOnly) ? glowOf(h) : undefined);
    if (e.flashT > 0) { e.flashT -= dt; if (e.flashT <= 0) Rig.flash(r, e.enraged ? 0x5a0c06 : 0, e.enraged ? 1 : 0); }
  }

  function hurtFlash(e, c = 0xffffff, a = 0.45) { Rig.flash(e.rig, c, a); e.flashT = 0.1; }
  function stun(e, t) { setState(e, 'stagger'); e.stunFor = t; e.rig.hurtVar = Math.random() < 0.5; }
  function addPosture(e, n) {
    e.posture = Math.min(e.def.posture * e.mult, e.posture + n); e.postureT = 0;
    if (e.posture >= e.def.posture * e.mult && e.state !== 'dead') {
      setState(e, 'broken');
      FX.text(Combat.chestPos(e.pos, 2.4 * e.def.scale), 'BROKEN!', 'crit'); Snd.play('guardBreak');
      FX.glint(Combat.chestPos(e.pos, 1.5 * e.def.scale), 0xffd040, 3, 0.4);
      return true;
    }
    return false;
  }

  // The player's attack reaches this enemy. Returns 'crit', 'hit', 'blocked' or null.
  function receive(e, atk, p) {
    if (!targetable(e) || e.state === 'roar') return null;
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
    const dmg = atk.dmg * (back ? 1.3 : 1) * (1 + (atk.fire || 0));
    if (atk.fire) FX.burst(at, 0xff8a2a, 8, 4, 0.4);                      // Ember Edge
    FX.burst(at, BONE[e.type] ? 0xe8e0c8 : e.type === 'spider' ? 0x7aff6a : 0xc0201a, 10, 5);
    hurtFlash(e);
    damage(e, dmg, back ? 'back' : '');
    if (e.state === 'dead' || e.state === 'roar') return 'hit';
    if (addPosture(e, atk.posture)) return 'hit';
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
    G.onEnemyDeath(e);
    // A fallen guardian takes its summoned adds with it
    if (e.boss) { G.queue = G.queue.filter(q => !q.add); for (const o of G.enemies) if (o.add && o.state !== 'dead') die(o); }
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
    e.bar.firstChild.firstChild.style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
    const pk = e.posture / (e.def.posture * e.mult);
    const pf = e.bar.lastChild.firstChild; pf.style.width = pk * 100 + '%';
    pf.style.background = e.state === 'broken' ? '#ffd040' : pk > 0.7 ? '#ff7a30' : '#e8c060';
    e.bar.classList.toggle('broken', e.state === 'broken');
  }

  function dispose(e, scene) {
    scene.remove(e.rig.root); scene.remove(e.trail.mesh); if (e.bar) e.bar.remove(); endTelegraph(e);
    if (e.dropped) scene.remove(e.dropped);
  }

  // ---------------- Guardians ----------------
  // A guardian is its kind grown into a boss (CFG.bosses): bigger, tougher, with its own moves and phases.
  const ROAR = { other: { pose: 'heavy', wind: 1.4, active: 0.1, recover: 0.1 }, spider: { pose: 'pounce', wind: 1.4, active: 0.1, recover: 0.1 } };
  const clone = o => JSON.parse(JSON.stringify(o));
  function scaleHits(attacks, reach) {
    for (const a of attacks) for (const h of a.hits) { h.range *= reach; if (h.aoe) { h.aoe.fwd *= reach; h.aoe.r *= reach; } }
    return attacks;
  }
  function makeBoss(e, si) {
    const B = CFG.bosses[si];
    if (!B) { e.rig.root.scale.multiplyScalar(1.15); return; }
    const def = e.def = clone(e.def);                                       // this one enemy gets its own copy to grow and change
    def.scale *= B.scale; def.radius *= B.scale; def.posture *= B.posture;
    def.attacks = scaleHits(clone(B.attacks || def.attacks).concat(clone(B.add || [])), B.reach);
    e.hp = e.maxHp = e.maxHp * B.hp;
    e.rig.root.scale.multiplyScalar(B.scale);
    e.boss = { B, next: 0 };
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
    const p = G.player, to = new THREE.Vector3(p.pos.x, 1.15, p.pos.z), dir = to.sub(from).normalize();
    const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x8a6a40 }), iron = new THREE.MeshStandardMaterial({ color: 0xd8d8e0, emissive: 0x606060 });
    g.add(new THREE.Mesh(arrowGeo[0], wood), new THREE.Mesh(arrowGeo[1], iron));
    g.position.copy(from); g.lookAt(from.clone().add(dir)); e.rig.root.parent.add(g);
    arrows.push({ g, pos: from.clone(), origin: from.clone(), dir, speed: h.projectile.speed, hit: h, mult: e.mult, gone: 0, mats: [wood, iron] });
    Snd.play('swing');
  }
  function updateArrows(dt) {
    const p = G.player;
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i]; let done = false;
      a.pos.addScaledVector(a.dir, a.speed * dt); a.gone += a.speed * dt; a.g.position.copy(a.pos);
      if (p && p.state !== 'dead' && Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) < 0.55 && Math.abs(a.pos.y - 1.1) < 0.9) {
        const res = Player.receive(p, { pos: a.origin, mult: a.mult }, a.hit);
        if (res === 'parry') FX.text(Combat.chestPos(p.pos, 2.4), 'DEFLECTED', 'parry');
        if (res !== 'dodge') done = true;
      }
      if (a.gone > 18 || a.pos.y < 0 || !World.inSpace(a.pos.x, a.pos.z, 0.2)) done = true;
      if (done) { a.g.parent && a.g.parent.remove(a.g); a.mats.forEach(m => m.dispose()); arrows.splice(i, 1); }
    }
  }
  function clearArrows() { for (const a of arrows) { a.g.parent && a.g.parent.remove(a.g); a.mats.forEach(m => m.dispose()); } arrows.length = 0; }

  return { spawn, makeBoss, update, receive, parried, targetable, aoeCenter, updateBar, dispose, updateArrows, clearArrows };
})();
