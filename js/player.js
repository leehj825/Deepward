// Deepward - the hero: movement, stamina, light/heavy attacks with a combo chain, block and parry, dodge roll.
// States: free (moving / blocking), attack, roll, hurt, guardbreak, dead.
const Player = (() => {
  const P = CFG.player;

  // Gear numbers (Items.stats); plain defaults when there is no saved game (tests)
  const BASE = { maxHp: P.hp, maxSt: P.stamina, dmg: 1, posture: 1, speed: 1, range: 0, crit: 0, block: P.block.reduce, guard: 1, parry: P.block.parryWindow, regen: 1, dr: 0, lifesteal: 0, goldFind: 1, flasks: 3, flaskHeal: 0.4, twoHanded: false,
    critMult: P.critMult, dashCost: 1, dashDist: 1, load: 0, loadClass: 0, burn: 0, chill: 0, shock: 0, counter: 0, fury: 0, fire: 0, finisher: false, weaponType: 'sword', ult: null, ranged: false, mend: 1, cls: 'warrior' };
  // Gear, levels and talents, then any shrine blessings for this stage
  function gearStats() {
    const S = Object.assign({ move: 1 }, (typeof Items !== 'undefined' && Items.S) ? Items.stats() : BASE);
    S.parry = Math.max(0.08, S.parry + Settings.diff.parry);
    for (const b of (G.blessings || [])) {
      if (b === 'wrath') S.dmg *= 1.2; else if (b === 'iron') S.dr = 1 - (1 - S.dr) * 0.85; else if (b === 'swift') S.move *= 1.12;
      else if (b === 'vigor') S.regen *= 1.4; else if (b === 'fortune') S.goldFind *= 1.5; else if (b === 'thirst') S.lifesteal += 0.04;
      else if (b === 'steady') S.parry += 0.05; else if (b === 'mending') S.mending = 0.06;
    }
    // Ysolde's tonics, drunk for this trip
    for (const t of (G.tonics || [])) {
      if (t === 'stamina') S.regen *= 1.3; else if (t === 'iron') S.dr = 1 - (1 - S.dr) * 0.9; else if (t === 'flask') S.flasks += 1; else if (t === 'edge') S.dmg *= 1.1;
    }
    // The people freed from the Deep: Ilsa's cooking, Brother Aldo's blessing, and a share of gold for every one
    if (typeof Items !== 'undefined' && Items.S && Items.S.rescued) {
      if (Items.rescued('ilsa')) S.flaskHeal *= 1.1;
      if (Items.rescued('aldo')) S.maxHp = Math.round(S.maxHp * 1.05);
      S.goldFind *= 1 + Math.min(CFG.rescues.goldMax, Items.S.rescued.length * CFG.rescues.gold);
    }
    // Curses of an Endless climb, and the gold they pay
    if (G.run && G.run.curses && G.run.curses.length) {
      const c = id => G.run.curses.includes(id);
      if (c('dry')) S.flasks = 0;
      if (c('glass')) S.maxHp = Math.round(S.maxHp * 0.5);
      if (c('brittle')) S.block *= 0.6;
      S.goldFind *= 1 + Endless.curseGold(G.run.curses);
    }
    return S;
  }
  const gearLook = () => (typeof Items !== 'undefined' && Items.S) ? Items.look() : {};

  function create(scene) {
    const rig = Rig.build('hero', { look: gearLook() }), S = gearStats();
    scene.add(rig.root);
    return {
      rig, trail: Rig.makeTrail(scene, 0xbfe4ff),
      pos: new THREE.Vector3(0, 0, 4), facing: Math.PI, kb: new THREE.Vector3(),
      S, hp: S.maxHp, maxHp: S.maxHp, st: S.maxSt, maxSt: S.maxSt, stDelay: 0, flasks: S.flasks, drinkT: 0,
      state: 'free', t: 0, blocking: false, blockT: 9, lastBlockPress: -9,
      atk: null, atkKind: null, phase: null, phaseT: 0, combo: 0, comboT: 9, target: null,
      buffer: null, rollDir: 0, rollFrom: new THREE.Vector3(), cycle: 0, speedK: 0,
    };
  }

  function setState(p, s) { p.state = s; p.t = 0; }
  function spend(p, n) { p.st = Math.max(0, p.st - n); p.stDelay = P.staminaDelay; }
  // Heavy while holding block is the weapon art, once the weapon has earned it (an execution still comes first)
  function press(p, act) { if (act === 'heavy' && Input.block && p.S.art && !executable(p)) act = 'art'; p.buffer = { act, t: 0 }; }

  // The enemy that an attack should snap toward: nearest one roughly in the direction the player is pushing
  function pickTarget(p, maxD = 5) {
    // Behind view: attacks go where the camera looks, with a little aim assist; top-down: toward the stick
    const behind = View.mode === 'behind', m = Input.move, hasDir = !behind && Math.hypot(m.x, m.z) > 0.2;
    const dir = behind ? View.yaw + Math.PI : hasDir ? Math.atan2(m.x, m.z) : p.facing, cone = behind ? 0.75 : 1.9;
    // A locked target always wins while it is in reach
    if (G.lock && Enemy.targetable(G.lock) && Combat.dist(p.pos, G.lock.pos) <= maxD + G.lock.def.radius) return { target: G.lock, dir: Combat.yawTo(p.pos, G.lock.pos) };
    let best = null, bestS = Infinity;
    for (const e of G.enemies) {
      if (!Enemy.targetable(e)) continue;
      const d = Combat.dist(p.pos, e.pos); if (d > maxD + e.def.radius) continue;
      const da = Math.abs(Combat.wrap(Combat.yawTo(p.pos, e.pos) - dir));
      if (da > cone) continue;
      const s = d + da * 1.5;
      if (s < bestS) { bestS = s; best = e; }
    }
    return { target: best, dir };
  }

  function tryAct(p) {
    const b = p.buffer; if (!b) return false;
    if (b.act === 'dodge') { if (p.st <= 0) return false; startRoll(p); p.buffer = null; return true; }
    if (b.act === 'art') {
      p.buffer = null;
      if (p.artCd > 0) { FX.text(Combat.chestPos(p.pos, 2.1), Math.ceil(p.artCd) + 's', 'warn'); return false; }
      if (p.st <= 0) return false;
      const art = P.arts[p.S.art], seq = art.hits.map((h, i) => Object.assign({}, h, { cost: i ? 0 : art.cost }));
      p.artQueue = seq.slice(1); p.artCd = art.cd; p.combo = 0; p.blocking = false;
      FX.text(Combat.chestPos(p.pos, 2.5), art.name.toUpperCase(), 'crit'); G.rumble(0.5, 0.5, 160); Snd.play('warn');
      if (G.onArt) G.onArt(p.S.art);
      startAttack(p, 'art', seq[0]); return true;
    }
    if (b.act === 'light' || b.act === 'heavy') {
      if (p.st <= 0) return false;
      let data;
      const ex = b.act === 'heavy' && executable(p);
      if (ex) { data = Object.assign({}, heavyOf(p), P.execute, { exec: ex, lunge: 0, cost: 0, breaksGuard: true }); p.combo = 0; }
      else if (b.act === 'heavy') { data = heavyOf(p); p.combo = 0; }
      else {
        // Weapon mastery rank 2 adds a finishing blow to the light combo
        const L = lightOf(p), len = comboLen(p);
        if (p.comboT > P.comboReset || p.combo >= len) p.combo = 0;
        data = p.combo < L.length ? L[p.combo] : CFG.progress.finisher; p.combo++;
      }
      if (data.heal && p.healCd > 0) { FX.text(Combat.chestPos(p.pos, 2.1), Math.ceil(p.healCd) + 's', 'warn'); p.buffer = null; return false; }
      startAttack(p, b.act, data); p.buffer = null; return true;
    }
    return false;
  }

  // The cleric's light blow follows the mode (holy bolt or a heal); everything else follows the weapon
  const lightOf = p => (p.S.combo && P.combos[p.S.combo + (p.S.combo === 'scepter' && p.healMode ? 'Heal' : '')]) || P.light;
  const heavyOf = p => (p.S.combo && P.heavies[p.S.combo]) || P.heavy;
  const comboLen = p => lightOf(p).length + (p.S.finisher ? 1 : 0);
  // A posture-broken enemy close in front (or locked) can be executed with a heavy attack
  function executable(p) {
    if (p.S.ranged) return null;                                    // the ranged classes do not step in for an execution
    let best = null, bd = Infinity;
    for (const e of G.enemies) {
      if (e.state !== 'broken') continue;
      const d = Combat.dist(p.pos, e.pos);
      if (d > P.execute.range + e.def.radius) continue;
      if (G.lock !== e && View.mode === 'behind' && Math.abs(Combat.wrap(Combat.yawTo(p.pos, e.pos) - (View.yaw + Math.PI))) > 1.2) continue;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function startAttack(p, kind, data) {
    spend(p, data.cost * (data.shot && p.S.u && p.S.u.wind ? 0.75 : 1));                       // Windrunner
    const { target, dir } = data.exec ? { target: data.exec, dir: 0 } : data.heal ? { target: null, dir: p.facing } : pickTarget(p, data.shot ? data.range : 5);
    p.target = target;
    p.facing = target ? Combat.yawTo(p.pos, target.pos) : dir;
    // The weapon and its bonuses scale the move: damage, posture, swing speed and reach; criticals roll per swing
    // Talents: Fury (more below 40% health), Counter (after dashing through a blow), Bloodrage (faster and harder)
    const S = p.S, crit = Math.random() < S.crit, low = p.hp < p.maxHp * 0.4;
    const counter = p.counterT > 0 ? S.counter : 0; p.counterT = 0;
    const rage = p.rageT > 0, mult = (1 + S.fury * (low ? 2 : 1)) * (1 + counter) * (rage ? 1.4 : 1), spd = S.speed * (rage ? 1.3 : 1);
    if (kind === 'heavy' && S.u && S.u.sky && !data.exec) data = Object.assign({}, data, { range: data.range + 2, arc: 26 });    // Skypiercer
    p.atk = Object.assign({}, data, {
      dmg: data.dmg * S.dmg * mult * (crit ? 1.6 : 1), posture: data.posture * S.posture, crit, critMult: S.critMult, fire: S.fire, burn: S.burn, chill: S.chill, shock: S.shock,
      wind: data.wind / spd, active: data.active / spd, recover: data.recover / spd, range: data.range + S.range,
    });
    if (counter) FX.text(Combat.chestPos(p.pos, 2.2), 'COUNTER', 'parry');
    if (data.exec) { FX.slowmo(0.55, 0.35); Snd.play('warn'); }
    p.atkKind = kind; p.phase = 'wind'; p.phaseT = 0; p.struck = false;
    setState(p, 'attack');
  }

  // The dash (state 'roll'): a short burst along the stick. In the behind view the hero keeps facing the camera's way,
  // so it can dash sideways or backwards; in the top-down view it turns to face the dash.
  function startRoll(p) {
    spend(p, P.dodge.cost * p.S.dashCost);
    const m = Input.move;
    p.rollDir = Math.hypot(m.x, m.z) > 0.2 ? Math.atan2(m.x, m.z) : p.facing;
    if (View.mode !== 'behind') p.facing = p.rollDir;
    const rel = p.rollDir - p.facing; p.dashF = Math.cos(rel); p.dashS = Math.sin(rel);
    p.rollFrom.copy(p.pos); p.ghosts = 0;
    p.blocking = false; p.combo = 0;
    setState(p, 'roll');
    Snd.play('roll');
    FX.burst(new THREE.Vector3(p.pos.x, 0.1, p.pos.z), 0x9a8e7a, 10, 3, 0.35);
  }

  // Burning ground (Emberwake Mail): patches that scorch enemies standing in them
  function dropFire(p) { (p.fires = p.fires || []).push({ x: p.pos.x, z: p.pos.z, life: 2.2, tick: 0 }); if (p.fires.length > 14) p.fires.shift(); }
  function updateFires(p, dt) {
    if (!p.fires) return;
    for (const f of p.fires) {
      f.life -= dt; f.tick -= dt;
      if (Math.random() < dt * 9) FX.burst(new THREE.Vector3(f.x + (Math.random() - 0.5) * 0.6, 0.15, f.z + (Math.random() - 0.5) * 0.6), Math.random() < 0.5 ? 0xff7a20 : 0xffc040, 1, 1.6, 0.45);
      if (f.tick <= 0) { f.tick = 0.4; for (const e of G.enemies) if (Enemy.targetable(e) && Math.hypot(e.pos.x - f.x, e.pos.z - f.z) < 0.9 + e.def.radius) Enemy.burn(e, 5 * p.S.dmg, 0xff7a20); }
    }
    p.fires = p.fires.filter(f => f.life > 0);
  }

  function update(p, dt) {
    p.t += dt; p.comboT += dt;
    updateFires(p, dt);
    for (const k of ['ultCd', 'artCd', 'healCd', 'bulwarkT', 'rageT', 'counterT']) if (p[k] > 0) p[k] = Math.max(0, p[k] - dt);
    if (p.rageT > 0 && Math.random() < dt * 8) FX.burst(Combat.chestPos(p.pos, 0.6 + Math.random()), 0xff4a2a, 1, 1.5, 0.4);
    if (p.state === 'dance') { danceStep(p, dt); return; }
    if (p.buffer) { p.buffer.t += dt; if (p.buffer.t > P.bufferTime) p.buffer = null; }
    if (p.state !== 'dead') {
      if (p.stDelay > 0) p.stDelay -= dt;
      else if (p.state === 'free' || p.state === 'drink') p.st = Math.min(p.maxSt, p.st + P.staminaRegen * p.S.regen * dt * (p.blocking ? P.block.regenMult : 1));
    }
    let moveSpeed = 0;
    const m = Input.move, mlen = Math.min(1, Math.hypot(m.x, m.z));

    if (p.state === 'free') {
      const wantBlock = Input.block;
      if (wantBlock && !p.blocking) {
        // Mashing block does not parry: a press too soon after the last one skips the parry window
        p.blockT = (G.time - p.lastBlockPress < 0.45) ? p.S.parry + 0.01 : 0;
        p.lastBlockPress = G.time;
      }
      p.blocking = wantBlock;
      if (p.blocking) p.blockT += dt;
      // Which way the step goes relative to the body: forward / back / sideways (strafing slows you a little)
      const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
      p.dirF = mlen > 0.05 ? (m.x * fx + m.z * fz) / mlen : 1; p.dirS = mlen > 0.05 ? (m.x * fz - m.z * fx) / mlen : 0;
      const behind = View.mode === 'behind', dirMul = behind ? (p.dirF < -0.3 ? 0.72 : p.dirF < 0.5 ? 0.86 : 1) : 1;
      const sp = (p.blocking ? P.blockSpeed : P.speed) * dirMul * (p.S.move || 1);
      if (mlen > 0.05) { p.pos.x += m.x / Math.max(1, mlen) * sp * dt; p.pos.z += m.z / Math.max(1, mlen) * sp * dt; moveSpeed = mlen * sp; }
      let want = null;
      if (behind) want = View.yaw + Math.PI;                         // the body faces where the camera looks
      else {
        if (G.lock && Enemy.targetable(G.lock)) want = Combat.yawTo(p.pos, G.lock.pos);
        else if (p.blocking) { const t = nearest(p, 7); if (t) want = Combat.yawTo(p.pos, t.pos); }
        if (want === null && mlen > 0.1) want = Math.atan2(m.x, m.z);
      }
      if (want !== null) p.facing += Combat.wrap(want - p.facing) * Math.min(1, (behind ? 20 : P.turnRate) * dt);
      if (mlen > 0.05) p.cycle += dt * (p.blocking ? 6 : 10.5) * Math.max(0.5, mlen);
      tryAct(p);
    } else if (p.state === 'attack') {
      const a = p.atk; p.phaseT += dt;
      if (p.phase === 'wind' || p.phase === 'active') {
        // Lunge forward, stopping short of the target
        const lungeV = a.lunge / (a.wind + a.active);
        const close = p.target && Combat.dist(p.pos, p.target.pos) < p.target.def.radius + 0.95;
        if (!close) { p.pos.x += Math.sin(p.facing) * lungeV * dt; p.pos.z += Math.cos(p.facing) * lungeV * dt; }
        if (p.target && p.phase === 'wind' && Enemy.targetable(p.target)) p.facing += Combat.wrap(Combat.yawTo(p.pos, p.target.pos) - p.facing) * Math.min(1, 20 * dt);
      }
      if (p.phase === 'wind' && p.phaseT >= a.wind) {
        p.phase = 'active'; p.phaseT = 0;
        Snd.play(p.atkKind === 'light' ? 'swing' : 'heavySwing');
      }
      if (p.phase === 'active' && !p.struck && p.phaseT >= a.active * 0.5) {
        p.struck = true; Combat.playerStrike(p, a);
        if (a.ring) { FX.ring(p.pos, a.ring, 0xffc870, 0.45, { r0: 0.4 }); FX.shake(0.35); Snd.play('slam'); }   // an art's shockwave
      }
      if (p.phase === 'active' && p.phaseT >= a.active) { p.phase = 'recover'; p.phaseT = 0; }
      if (p.phase === 'recover' && p.atkKind === 'art' && p.artQueue && p.artQueue.length) { startAttack(p, 'art', p.artQueue.shift()); }   // the art's next hit (now winding up again)
      if (p.phase === 'recover') {
        const prog = p.phaseT / a.recover;
        // Cancels: dodge at any point of the recovery, next combo hit after a moment, block late in the recovery
        if (p.buffer && p.buffer.act === 'dodge') { p.comboT = 0; tryAct(p); }
        else if (p.buffer && p.buffer.act === 'light' && p.atkKind === 'light' && prog > 0.25 && p.combo < comboLen(p)) { p.comboT = 0; tryAct(p); }
        else if (p.buffer && prog > 0.6) { p.comboT = 0; tryAct(p); }
        else if (Input.block && prog > 0.5) { p.comboT = 0; p.combo = 0; setState(p, 'free'); }
        else if (p.phaseT >= a.recover) { p.comboT = 0; if (p.combo >= comboLen(p) || p.atkKind !== 'light') p.combo = 0; setState(p, 'free'); }
      }
    } else if (p.state === 'roll') {
      const D = P.dodge, k = Math.min(1, p.t / D.time), ease = 1 - Math.pow(1 - k, 2.2);
      const reach = D.dist * (p.S.dashDist || 1);                          // a heavy load shortens the dash
      p.pos.x = p.rollFrom.x + Math.sin(p.rollDir) * reach * ease;
      p.pos.z = p.rollFrom.z + Math.cos(p.rollDir) * reach * ease;
      moveSpeed = P.speed;
      if (View.mode === 'behind') p.facing += Combat.wrap(View.yaw + Math.PI - p.facing) * Math.min(1, 20 * dt);
      // Emberwake: the dash leaves burning ground
      if (p.S.u && p.S.u.ember && Math.floor(p.t / 0.07) !== Math.floor((p.t - dt) / 0.07)) dropFire(p);
      // Fading after-images mark the dash
      if (p.ghosts < 3 && p.t > p.ghosts * 0.07 + 0.02) { p.ghosts++; FX.ghost(p.rig.root, 0x9ad8ff, 0.22); }
      if (p.t >= D.time) { setState(p, 'free'); tryAct(p); }
    } else if (p.state === 'drink') {
      // A slow walk while the flask goes down; the healing lands partway through, so a hit early on wastes it
      if (mlen > 0.05) { p.pos.x += m.x / Math.max(1, mlen) * P.blockSpeed * 0.8 * dt; p.pos.z += m.z / Math.max(1, mlen) * P.blockSpeed * 0.8 * dt; moveSpeed = mlen * P.blockSpeed * 0.8; }
      if (View.mode === 'behind') p.facing += Combat.wrap(View.yaw + Math.PI - p.facing) * Math.min(1, 20 * dt);
      if (!p.healed && p.t > 0.45) {
        p.healed = true; const h = p.maxHp * p.S.flaskHeal; p.hp = Math.min(p.maxHp, p.hp + h);
        FX.text(Combat.chestPos(p.pos, 2.1), '+' + Math.round(h), 'heal'); FX.burst(Combat.chestPos(p.pos, 1.4), 0x7aff9a, 14, 3);
      }
      if (p.t >= 0.85) setState(p, 'free');
    } else if (p.state === 'hurt') {
      if (p.t >= (p.hurtFor || P.hurtStun)) setState(p, 'free');
    } else if (p.state === 'guardbreak') {
      if (p.t >= P.block.breakStun) setState(p, 'free');
    }
    if (p.state !== 'free') p.blocking = false;

    // Knockback slides off quickly
    p.pos.addScaledVector(p.kb, dt); p.kb.multiplyScalar(Math.exp(-9 * dt));
    p.speedK += (Math.min(1, moveSpeed / P.speed) - p.speedK) * Math.min(1, 10 * dt);

    const r = p.rig;
    r.root.position.copy(p.pos); r.root.rotation.y = p.facing;
    const mode = p.state === 'free' ? (p.blocking ? 'block' : (p.speedK > 0.08 ? 'move' : 'idle')) : p.state === 'hurt' ? 'hurt' : p.state === 'roll' ? 'dash' : p.state;
    Rig.animate(r, {
      mode, t: p.t, speed: p.speedK, mps: p.speedK * P.speed, calm: G.mode === 'camp', cycle: p.cycle, blockT: p.blockT,
      dirF: p.state === 'free' ? p.dirF : p.state === 'roll' ? p.dashF : 1, dirS: p.state === 'free' ? p.dirS : p.state === 'roll' ? p.dashS : 0,
      phaseT: p.phaseT, wind: p.atk && p.atk.wind, active: p.atk && p.atk.active, recover: p.atk && p.atk.recover,
      p: p.state === 'roll' ? p.t / P.dodge.time : p.state === 'attack' && p.phase === 'recover' ? p.phaseT / p.atk.recover : 0,
      atk: p.atk && p.atk.pose, phase: p.phase, windRate: p.atk ? 3.2 / p.atk.wind : 12,
    }, dt);
    const swinging = p.state === 'attack' && !(p.atk.shot || p.atk.heal) && (p.phase === 'active' || (p.phase === 'recover' && p.phaseT < 0.06));
    Rig.updateTrail(p.trail, r.weapon, swinging, p.atkKind === 'heavy' ? 0xffc870 : 0xbfe4ff);
    if (p.flashT > 0) { p.flashT -= dt; Rig.flash(r, p.flashC, Math.max(0, p.flashT / 0.2) * 0.8); if (p.flashT <= 0) Rig.flash(r, 0, 0); }
  }

  function nearest(p, maxD) {
    let best = null, bd = maxD;
    for (const e of G.enemies) { if (!Enemy.targetable(e)) continue; const d = Combat.dist(p.pos, e.pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }

  function flash(p, c) { p.flashT = 0.2; p.flashC = c; }
  function damage(p, n, from) {
    n *= (1 - p.S.dr) * Settings.diff.dmg;                                // armour, then the difficulty
    p.hp = Math.max(0, p.hp - n);
    FX.text(Combat.chestPos(p.pos, 2.0), '-' + Math.round(n), 'hurt');
    if (p.hp <= 0) { p.rig.dieVar = Math.random() < 0.5; setState(p, 'dead'); p.blocking = false; G.onPlayerDeath(); return true; }
    return false;
  }
  function knock(p, from, amount) {
    const a = Combat.yawTo(from, p.pos); p.kb.set(Math.sin(a) * amount, 0, Math.cos(a) * amount);
  }

  // An enemy's attack reaches the player. Returns what happened: dodge, parry, block, guardbreak or hit.
  function receive(p, e, hit) {
    if (p.state === 'dead') return null;
    const D = P.dodge, dmg = hit.dmg * e.mult;
    const shieldPos = Combat.chestPos(p.pos, 1.25).add(new THREE.Vector3(Math.sin(p.facing) * 0.5, 0, Math.cos(p.facing) * 0.5));
    if (p.state === 'attack' && p.atk && p.atk.exec) return 'dodge';           // an execution is untouchable
    if ((p.state === 'roll' && p.t >= D.iStart && p.t <= D.iEnd) || p.state === 'dance') {
      FX.text(Combat.chestPos(p.pos, 2.1), 'DODGE', 'dodge');
      G.stats.dodges++;
      if (p.S.counter) p.counterT = 1.5;
      return 'dodge';
    }
    // Bulwark: every blockable hit is turned aside for free, from any side
    if (p.bulwarkT > 0 && !hit.unblockable && !hit.parryOnly) {
      Snd.play('block'); FX.burst(shieldPos, 0x9ad8ff, 10, 5); knock(p, e.pos, 1.5);
      return 'block';
    }
    const facingOK = Combat.facingCheck(p.pos, p.facing, e.pos, P.block.angle);
    if (p.state === 'free' && p.blocking && facingOK) {
      if (hit.unblockable) {
        FX.text(Combat.chestPos(p.pos, 2.4), 'UNBLOCKABLE', 'warn');
      } else if (p.blockT <= p.S.parry) {
        Snd.play('parry'); FX.glint(shieldPos, 0xfff2b0, 2.4, 0.35); FX.burst(shieldPos, 0xffe08a, 16, 7);
        FX.text(Combat.chestPos(p.pos, 2.2), 'PARRY', 'parry');
        FX.slowmo(CFG.feel.parrySlowmo, CFG.feel.parrySlowScale); FX.shake(CFG.feel.shake.parry); G.rumble(0.3, 0.8, 120);
        G.stats.parries++;
        if (p.S.u && p.S.u.aegis) p.st = Math.min(p.maxSt, p.st + 25);
        if (p.S.u && p.S.u.dawn) Combat.wave(p);
        if (p.S.mending) { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * p.S.mending); FX.text(Combat.chestPos(p.pos, 2.6), '+' + Math.round(p.maxHp * p.S.mending), 'heal'); }
        return 'parry';
      } else if (hit.parryOnly) {
        FX.text(Combat.chestPos(p.pos, 2.4), 'SHIELD SMASHED', 'warn'); FX.burst(shieldPos, 0xffa010, 12, 6);      // only a parry stops a pounce
      } else {
        const cost = dmg * P.block.staminaPerDmg * p.S.guard * (hit.blockMult || 1);
        if (p.st >= cost) {
          spend(p, cost);
          Snd.play('block'); FX.burst(shieldPos, 0xfff0d0, 8, 5); knock(p, e.pos, 3); FX.shake(0.08); G.rumble(0.2, 0.4, 90);
          damage(p, dmg * (1 - p.S.block), e.pos); G.stats.blocks = (G.stats.blocks || 0) + 1;
          if (p.S.u && p.S.u.thorns && e.def) Enemy.burn(e, dmg * 0.5, 0xc8ff6a);   // Crown of Thorns
          return 'block';
        }
        p.st = 0; p.stDelay = P.staminaDelay * 2;
        Snd.play('guardBreak'); FX.text(Combat.chestPos(p.pos, 2.2), 'GUARD BROKEN', 'warn'); FX.burst(shieldPos, 0xff9a5a, 14, 6);
        knock(p, e.pos, 5); flash(p, 0xff3a1a); G.rumble(0.9, 0.6, 300);
        if (!damage(p, dmg * 0.5, e.pos)) setState(p, 'guardbreak');
        return 'guardbreak';
      }
    }
    Snd.play('hurt'); flash(p, 0xff2a1a); FX.shake(CFG.feel.shake.hurt); G.rumble(hit.aoe ? 1 : 0.7, 0.5, hit.aoe ? 350 : 200);
    FX.burst(Combat.chestPos(p.pos, 1.2), 0xc0201a, 10, 4);
    knock(p, e.pos, hit.aoe ? 9 : 5);
    G.stats.hitsTaken++;
    if (!damage(p, dmg, e.pos) && !(p.rageT > 0)) { p.hurtFor = hit.aoe ? 0.6 : P.hurtStun; setState(p, 'hurt'); p.combo = 0; p.rig.hurtVar = Math.random() < 0.5; }
    return 'hit';
  }

  // The swing bounced off a shield
  function recoil(p) {
    Snd.play('block'); FX.text(Combat.chestPos(p.pos, 2.0), 'BLOCKED', 'warn');
    p.kb.set(-Math.sin(p.facing) * 4, 0, -Math.cos(p.facing) * 4);
    p.hurtFor = 0.35; setState(p, 'hurt'); p.combo = 0;
  }

  // Healing flask: only when free to act
  function drink(p) {
    if (p.state !== 'free' || p.flasks <= 0) { if (p.flasks <= 0) FX.text(Combat.chestPos(p.pos, 2.1), 'NO FLASKS', 'warn'); return false; }
    p.flasks--; p.healed = false; p.blocking = false; setState(p, 'drink'); Snd.play('roll');
    return true;
  }
  // New gear: fresh numbers and a rebuilt look; keeps position, facing and the share of health left
  function refit(p, scene, full) {
    const S = gearStats(), share = p.maxHp ? p.hp / p.maxHp : 1;
    p.S = S; p.maxHp = S.maxHp; p.maxSt = S.maxSt; p.hp = full ? S.maxHp : Math.max(1, Math.round(S.maxHp * share)); p.st = Math.min(p.st, S.maxSt);
    if (full) { p.st = S.maxSt; p.flasks = S.flasks; }
    scene.remove(p.rig.root);
    p.rig = Rig.build('hero', { look: gearLook() }); scene.add(p.rig.root);
    p.rig.root.position.copy(p.pos); p.rig.root.rotation.y = p.facing;
  }
  // The cleric's toggle: holy bolts or healing for the light attack (the heavy cast always heals the area)
  function toggleMode(p) {
    if (!p || p.S.weaponType !== 'scepter' || p.state === 'dead') return false;
    p.healMode = !p.healMode; p.combo = 0;
    FX.text(Combat.chestPos(p.pos, 2.4), p.healMode ? '✚ HEAL' : '✦ SMITE', p.healMode ? 'heal' : 'crit'); Snd.play('glint');
    if (G.onMode) G.onMode(p);
    return true;
  }
  function revive(p) { setState(p, 'free'); p.kb.set(0, 0, 0); p.buffer = null; p.blocking = false; p.combo = 0; }

  // ---------------- Ultimates ----------------
  function ultimate(p) {
    const id = p.S.ult; if (!id || p.state === 'dead') return false;
    if (p.ultCd > 0) { FX.text(Combat.chestPos(p.pos, 2.1), Math.ceil(p.ultCd) + 's', 'warn'); return false; }
    if (p.state !== 'free' && p.state !== 'attack') return false;
    const tree = Object.values(CFG.trees).find(t => t.ult.id === id), at = Combat.chestPos(p.pos, 1.2);
    p.ultCd = tree.ult.cd; G.rumble(0.6, 0.6, 200);
    FX.text(Combat.chestPos(p.pos, 2.5), tree.ult.name.toUpperCase(), 'crit');
    if (id === 'bulwark') { p.bulwarkT = 3; Snd.play('parry'); FX.ring(p.pos, 1.6, 0x9ad8ff, 3, { r0: 1.6 }); FX.glint(at, 0x9ad8ff, 3, 0.5); }
    if (id === 'rage') { p.rageT = 8; Snd.play('guardBreak'); FX.burst(at, 0xff4a2a, 30, 6); flash(p, 0xff2a10); }
    if (id === 'nova') {
      Snd.play('slam'); FX.shake(0.4); FX.ring(p.pos, 4, 0xc8a0ff, 0.5, { r0: 0.3 }); FX.burst(at, 0xc8a0ff, 40, 9, 0.6);
      for (const e of G.enemies) {
        if (!Enemy.targetable(e) || Combat.dist(p.pos, e.pos) > 4 + e.def.radius) continue;
        Enemy.receive(e, { dmg: 40 * p.S.dmg, posture: 70, breaksGuard: true, critMult: p.S.critMult }, p);
        const a = Combat.yawTo(p.pos, e.pos); e.pos.x += Math.sin(a) * 1.6; e.pos.z += Math.cos(a) * 1.6;
      }
    }
    if (id === 'dance') { setState(p, 'dance'); p.danceN = 0; p.danceNext = 0; p.blocking = false; Snd.play('swing'); }
    return true;
  }
  // Blade Dance: six strikes on the nearest foes, flickering between them, untouchable throughout
  function danceStep(p, dt) {
    p.danceNext -= dt;
    if (p.danceNext <= 0) {
      if (p.danceN >= 6) { setState(p, 'free'); return; }
      p.danceN++; p.danceNext = 0.18;
      let best = null, bd = 5;
      for (const e of G.enemies) { if (!Enemy.targetable(e)) continue; const d = Combat.dist(p.pos, e.pos); if (d < bd) { bd = d; best = e; } }
      if (best) {
        FX.ghost(p.rig.root, 0x9affc8, 0.3);
        const a = Combat.yawTo(best.pos, p.pos) + (p.danceN % 2 ? 0.9 : -0.9);
        p.pos.set(best.pos.x + Math.sin(a) * (best.def.radius + 0.9), 0, best.pos.z + Math.cos(a) * (best.def.radius + 0.9));
        p.facing = Combat.yawTo(p.pos, best.pos);
        Enemy.receive(best, { dmg: 13 * p.S.dmg, posture: 12, critMult: p.S.critMult }, p);
        Snd.play('hit'); FX.hitStop(0.03);
      }
    }
    const r = p.rig; r.root.position.copy(p.pos); r.root.rotation.y = p.facing;
    Rig.animate(r, { mode: 'attack', t: p.t, speed: 0, atk: p.danceN % 2 ? 'slashR' : 'slashL', phase: p.danceNext > 0.12 ? 'active' : 'recover', phaseT: 0.18 - p.danceNext, wind: 0.02, active: 0.06, recover: 0.12, p: 0.5 }, dt);
    Rig.updateTrail(p.trail, r.weapon, true, 0x9affc8);
  }

  return { create, update, press, receive, recoil, drink, refit, revive, ultimate, executable, gearStats, toggleMode };
})();
