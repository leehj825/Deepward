// Deepward - enemies: approach and circle the player, take turns attacking (attack tokens), telegraph every hit,
// and react to damage with flinches, guard blocks and posture breaks.
// States: spawn, hunt, attack, stagger, broken, dead.
const Enemy = (() => {
  const GLOW_OK = 0xfff0c0, GLOW_RED = 0xff2a10;

  function spawn(scene, type, pos, mult = 1) {
    const def = CFG.enemies[type], rig = Rig.build(type);
    scene.add(rig.root);
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

  const targetable = e => e.state !== 'dead' && e.state !== 'spawn';
  const attacking = () => G.enemies.reduce((n, o) => n + (o.state === 'attack' ? 1 : 0), 0);
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
    // The telegraph: a glint on the weapon (white = blockable, red = unblockable) and a floor ring for area attacks
    const tipPos = () => e.rig.weapon.tip.getWorldPosition(new THREE.Vector3());
    FX.glint(tipPos(), h.unblockable ? GLOW_RED : GLOW_OK, h.unblockable ? 2.2 : 1.3, Math.min(0.5, h.wind * 0.6), tipPos);
    if (h.unblockable) {
      Snd.play('warn'); FX.text(Combat.chestPos(e.pos, 2.6 * e.def.scale), '!', 'danger');
      Rig.flash(e.rig, GLOW_RED, 0.5); e.flashT = 0.25;
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
      turn(toP, 7);
      const reach = maxReach(e) * 0.85 + CFG.player.radius;
      const playerOK = p.state !== 'dead';
      if (playerOK && e.cooldown <= 0 && d <= reach && attacking() < CFG.maxAttackers) startAttack(e);
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
        Rig.glow(e.rig, h.unblockable ? GLOW_RED : GLOW_OK, 0.2 + 1.3 * Math.min(1, e.phaseT / h.wind));
        if (e.phaseT > h.wind * 0.65 && d > def.radius + 0.8) step(e.facing, h.lunge / (h.wind * 0.35 + h.active));
        if (e.ring && h.aoe) { const c = aoeCenter(e, h); e.ring.m.position.set(c.x, 0.03, c.z); if (e.ring.fill) e.ring.fill.position.set(c.x, 0.025, c.z); }
        if (e.phaseT >= h.wind) { e.phase = 'active'; e.phaseT = 0; Snd.play('swing'); }
      } else if (e.phase === 'active') {
        if (d > def.radius + 0.8) step(e.facing, h.lunge / (h.wind * 0.35 + h.active));
        if (!e.struck && e.phaseT >= h.active * 0.5) { e.struck = true; Combat.enemyStrike(e, h); if (e.state !== 'attack') return finishUpdate(e, dt, before); }
        if (e.phaseT >= h.active) { e.phase = 'recover'; e.phaseT = 0; endTelegraph(e); }
      } else if (e.phase === 'recover') {
        if (e.phaseT >= h.recover) {
          if (e.hitIdx < e.atk.hits.length - 1) { e.hitIdx++; beginHit(e); }
          else { e.cooldown = def.cooldown[0] + Math.random() * (def.cooldown[1] - def.cooldown[0]); setState(e, 'hunt'); }
        }
      }
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
    const moved = Math.hypot(e.pos.x - before.x, e.pos.z - before.z) / Math.max(dt, 1e-4);
    e.speedK += (Math.min(1, moved / Math.max(1, e.def.speed)) - e.speedK) * Math.min(1, 10 * dt);
    if (e.speedK > 0.05) e.cycle += dt * 9 * Math.max(0.5, e.speedK);
    const r = e.rig;
    r.root.position.x = e.pos.x; r.root.position.z = e.pos.z; r.root.rotation.y = e.facing;
    const near = Combat.dist(e.pos, G.player.pos) < 5;
    let mode = e.state;
    if (e.state === 'hunt' || e.state === 'spawn') mode = guardUp(e) && near ? 'block' : e.speedK > 0.08 ? 'move' : 'idle';
    const h = e.atk && e.atk.hits[e.hitIdx];
    Rig.animate(r, {
      mode, t: e.t, speed: e.speedK, cycle: e.cycle,
      atk: h && h.pose, phase: e.phase, p: e.phase === 'recover' && h ? e.phaseT / h.recover : 0,
      windRate: h ? 2.6 / h.wind : 12,
    }, dt);
    Rig.updateTrail(e.trail, r.weapon, e.state === 'attack' && e.phase === 'active', h && h.unblockable ? 0xff5030 : undefined);
    if (e.flashT > 0) { e.flashT -= dt; if (e.flashT <= 0) Rig.flash(r, 0, 0); }
  }

  function hurtFlash(e, c = 0xffffff, a = 0.9) { Rig.flash(e.rig, c, a); e.flashT = 0.1; }
  function stun(e, t) { setState(e, 'stagger'); e.stunFor = t; }
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
    if (!targetable(e)) return null;
    const def = e.def, frontal = Combat.facingCheck(e.pos, e.facing, p.pos, def.guardAngle || 140);
    const at = Combat.chestPos(e.pos, 1.2 * def.scale);
    if (e.state === 'broken') {
      // Riposte on a posture-broken enemy
      const dmg = atk.dmg * CFG.player.critMult;
      FX.text(Combat.chestPos(e.pos, 2.2 * def.scale), 'CRITICAL ' + Math.round(dmg), 'crit');
      FX.burst(at, 0xffd040, 26, 9); FX.glint(at, 0xffffff, 3.2, 0.3); FX.slowmo(0.25, 0.3);
      hurtFlash(e, 0xffe0a0, 1.2); G.stats.crits++;
      e.posture = 0; damage(e, dmg);
      if (e.state !== 'dead') stun(e, 0.6);
      return 'crit';
    }
    if (guardUp(e) && frontal) {
      const shield = at.clone().add(new THREE.Vector3(Math.sin(e.facing) * 0.5, 0.1, Math.cos(e.facing) * 0.5));
      if (atk.breaksGuard) {
        FX.text(Combat.chestPos(e.pos, 2.3 * def.scale), 'GUARD BREAK', 'crit'); FX.burst(shield, 0xffb060, 18, 7);
        Snd.play('guardBreak');
        damage(e, atk.dmg * 0.6);
        if (e.state !== 'dead' && !addPosture(e, atk.posture * 1.6)) stun(e, 0.9);
        return 'hit';
      }
      FX.burst(shield, 0xfff0d0, 10, 5);
      addPosture(e, atk.posture * 0.5);
      return 'blocked';
    }
    const back = !Combat.facingCheck(e.pos, e.facing, p.pos, 200);
    const dmg = atk.dmg * (back ? 1.3 : 1);
    FX.burst(at, e.type === 'skeleton' ? 0xe8e0c8 : 0xc0201a, 10, 5);
    hurtFlash(e);
    damage(e, dmg, back ? 'back' : '');
    if (e.state === 'dead') return 'hit';
    if (addPosture(e, atk.posture)) return 'hit';
    const armored = def.hyperArmor && e.state === 'attack';
    if ((def.flinch && !armored) || (atk.breaksGuard && e.state !== 'attack')) stun(e, atk.breaksGuard ? 0.6 : 0.35);
    return 'hit';
  }

  function damage(e, n, cls = '') {
    e.hp -= n;
    FX.text(Combat.chestPos(e.pos, 2.0 * e.def.scale), Math.round(n) + (cls === 'back' ? '!' : ''), 'dmg');
    if (e.hp <= 0) die(e);
  }
  function die(e) {
    e.hp = 0; setState(e, 'dead');
    Snd.play('die'); FX.burst(Combat.chestPos(e.pos, 1.0), e.type === 'skeleton' ? 0xd8cfb4 : 0x6a1a1a, 24, 6, 0.6);
    e.bar.remove();
    G.onEnemyDeath(e);
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
  }

  return { spawn, update, receive, parried, targetable, aoeCenter, updateBar, dispose };
})();
