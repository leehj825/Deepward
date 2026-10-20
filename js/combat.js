// Deepward - combat geometry and hit resolution between the player and enemies.
// Facing is an angle around Y where 0 looks down +Z; forward = (sin f, 0, cos f).
const Combat = (() => {
  const wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  // Is "to" inside the attack cone of something at "from" facing "facing"? Target radius makes big enemies easier to hit.
  function inArc(from, facing, to, range, arcDeg, radius = 0) {
    const d = dist(from, to);
    if (d > range + radius) return false;
    if (arcDeg >= 360 || d < 0.6) return true;
    return Math.abs(wrap(yawTo(from, to) - facing)) <= (arcDeg / 2) * Math.PI / 180 + Math.atan2(radius, Math.max(d, 0.01));
  }
  function facingCheck(from, facing, to, coneDeg) { return Math.abs(wrap(yawTo(from, to) - facing)) <= (coneDeg / 2) * Math.PI / 180; }

  const tmp = new THREE.Vector3();
  function chestPos(pos, h = 1.2) { return tmp.set(pos.x, h, pos.z).clone(); }

  // Hit-stop, shake, sound, life on hit and mastery for blows that landed (a swing's, or a shot's)
  function landedFeel(p, atk, landed, crit) {
    FX.hitStop(crit ? 0.16 : atk.breaksGuard ? CFG.feel.heavyHitStop : CFG.feel.hitStop);
    FX.shake(crit || atk.breaksGuard ? CFG.feel.shake.heavy : CFG.feel.shake.hit);
    Snd.play(crit ? 'crit' : 'hit');
    G.rumble(crit ? 0.8 : atk.breaksGuard ? 0.5 : 0.15, crit ? 0.6 : 0.3, crit ? 220 : 70);
    if (p.S && p.S.lifesteal) p.hp = Math.min(p.maxHp, p.hp + atk.dmg * landed * p.S.lifesteal);
    if (G.onHits) G.onHits(landed, crit);
  }

  // The player's swing lands: every enemy in the cone takes it
  function playerStrike(p, atk) {
    if (atk.shot) return Shots.fire(p, atk);                                      // a ranged class's blow flies off instead
    if (atk.heal) return Shots.heal(p, atk);
    if (atk.exec) { Enemy.execute(atk.exec, atk, p); G.onHits && G.onHits(1, true); return 1; }
    let landed = 0, blocked = 0, crit = false;
    for (const e of G.enemies) {
      if (!Enemy.targetable(e)) continue;
      if (!inArc(p.pos, p.facing, e.pos, atk.range, atk.arc, e.def.radius)) continue;
      const widow = p.S && p.S.u && p.S.u.widow && e.hp < e.maxHp * 0.3;           // Widowmaker
      const r = Enemy.receive(e, widow ? Object.assign({}, atk, { dmg: atk.dmg * 1.6 }) : atk, p);
      if (r === 'blocked') blocked++; else if (r === 'ward') { /* soaked by a ward */ } else if (r) { landed++; if (r === 'crit') crit = true; }
    }
    const broke = typeof Props !== 'undefined' ? Props.strike(p, atk) : 0;
    if (broke && !landed) FX.hitStop(0.03);
    if (landed) landedFeel(p, atk, landed, crit);
    else if (blocked) {
      Player.recoil(p);
    }
    return landed;
  }

  // Dawnbreaker: a parry looses a blade of light down the line in front of the hero
  function wave(p) {
    const f = p.facing, L = 7;
    for (let d = 0.8; d <= L; d += 0.6) FX.glint(new THREE.Vector3(p.pos.x + Math.sin(f) * d, 1.1, p.pos.z + Math.cos(f) * d), 0xfff0b0, 1.2, 0.25 + d * 0.02);
    Snd.play('swing');
    for (const e of G.enemies) if (Enemy.targetable(e) && inArc(p.pos, f, e.pos, L, 22, e.def.radius)) Enemy.receive(e, { dmg: 16 * (p.S ? p.S.dmg : 1), posture: 18 }, p);
  }

  // An enemy's swing lands: everyone inside its reach (the warden, and any companion) takes it. The warden resolves block, parry
  // and dodge; a companion simply takes the damage (Party.hurt).
  function enemyStrike(e, hit) {
    const hero = G.player, R = CFG.player.radius;
    let c = null;
    if (hit.aoe) {
      c = e.aoeAt || Enemy.aoeCenter(e, hit);
      Snd.play('slam'); FX.shake(0.35); FX.ring(c, hit.aoe.r * 1.2, 0xff6a3a, 0.4, { r0: 0.3 });
      FX.burst(new THREE.Vector3(c.x, 0.2, c.z), 0xb09070, 22, 7, 0.5);
    }
    const reaches = t => hit.aoe ? Math.hypot(t.pos.x - c.x, t.pos.z - c.z) <= hit.aoe.r + R : inArc(e.pos, e.facing, t.pos, hit.range, hit.arc, R);
    for (const al of G.allies || []) if (al.state !== 'down' && reaches(al)) Party.hurt(al, e, hit);
    if (!hero || hero.state === 'dead' || !reaches(hero)) return;
    const res = Player.receive(hero, e, hit);
    if (res === 'parry') Enemy.parried(e);
    else if (res === 'hit' && e.leech) Enemy.leech(e, hit.dmg * e.mult);
  }

  return { wrap, yawTo, dist, inArc, facingCheck, chestPos, playerStrike, landed: landedFeel, enemyStrike, wave };
})();
