// A fast, headless copy of a Deepward fight for training the companions' policy (no graphics, no browser). It is a faithful
// sketch, not the game: the same enemies (health, speed, wind-ups, damage, reach, tokens), the same aggro rule, the same
// companion moves and numbers (CFG.player combos, heals, CFG.party), a scripted warden. What matters is that the choices
// the network is asked to make (Policy.A) have the same consequences as in the game: wind-ups can be stepped out of, heals
// land after a delay, a downed friend lies there, the tank draws blows.
// Used by train.js; run `node tools/policy/sim.js` for a quick check (classic rules on 200 scenarios).
const fs = require('fs'), path = require('path');
global.THREE = {};
const CFG = new Function(fs.readFileSync(path.join(__dirname, '../../js/config.js'), 'utf8') + ';return CFG;')();
const Policy = require('../../js/policy.js');
const A = Policy.A, P = CFG.player, CP = CFG.party;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const inArc = (from, facing, to, range, arcDeg, rad) => { const d = dist(from, to); if (d > range + rad) return false; if (arcDeg >= 360 || d < 0.6) return true; return Math.abs(wrap(yawTo(from, to) - facing)) <= arcDeg / 2 * Math.PI / 180 + Math.atan2(rad, Math.max(d, 0.01)); };

const HPM = { warrior: 1.5, archer: 0.85, mage: 0.75, cleric: 0.95 }, DRM = { warrior: 0.25, archer: 0.05, mage: 0.05, cleric: 0.08 };
const DT = 0.05, DECIDE = 0.3, LIMIT = 70;
// What each class's moves are (the game's own numbers: CFG.player combos / heavies)
const MOVES = {
  warrior: { light: P.light[0], heavy: P.heavy, lightCd: 0.55, heavyCd: 5, reach: 2.3 },
  archer: { light: P.combos.bow[0], heavy: P.heavies.bow, lightCd: 1.0, heavyCd: 6, far: 9 },
  mage: { light: P.combos.staff[0], heavy: P.heavies.staff, lightCd: 1.3, heavyCd: 9, far: 10 },
  cleric: { light: P.combos.scepter[0], heavy: P.heavies.scepter, lightCd: 1.6, heavyCd: 8, far: 11 },
};

function makeScenario(seed) {
  const r = rng(seed), pick = a => a[Math.floor(r() * a.length)];
  const tier = Math.floor(r() * 4), classes = pick([['warrior'], ['cleric'], ['archer'], ['mage'], ['warrior', 'cleric'], ['warrior', 'archer'], ['warrior', 'mage'], ['archer', 'cleric'], ['mage', 'cleric'], ['archer', 'mage'], ['warrior', 'cleric'], ['archer', 'cleric']]);
  const waves = [], nw = 2 + Math.floor(r() * 2);
  for (let w = 0; w < nw; w++) {
    const list = [], n = 2 + Math.floor(r() * 2) + (tier > 1 ? 1 : 0);
    for (let i = 0; i < n; i++) list.push(pick(['skeleton', 'skeleton', 'skeleton', 'wolf', 'knight', 'archer', 'archer']));
    if (r() < 0.3) list.push('brute');
    waves.push({ at: w * 14 + (w ? r() * 4 : 0), list, ang: (r() - 0.5) * 1.6 });
  }
  return { seed, tier, classes, waves };
}

function newWorld(sc, seed2) {
  const r = rng(sc.seed * 7919 + (seed2 || 0)), tier = sc.tier;
  const w = { t: 0, r, sc, hero: null, allies: [], enemies: [], shots: [], blasts: [], log: { dmgEnemy: 0, enemyHp: 0, heroDmg: 0, compDmg: 0, compMax: 0, downs: 0, heroDied: false, cleared: false, time: LIMIT } };
  w.hero = { id: 'hero', x: 0, z: 0, hp: 100 + 14 * tier, maxHp: 100 + 14 * tier, facing: 0, cd: 0, flaskT: 0, flasks: 2, hero: true, state: 'free' };
  const hpBase = 80 + 6 * tier * 2 + 14 * tier, pow = CFG.progress.perLevel.power * tier * 2, S = CP.dmg * (1 + pow) * (1 + 0.16 * tier);
  sc.classes.forEach((cls, i) => {
    const mh = Math.round(hpBase * HPM[cls]);
    const a = { id: cls + i, cls, ally: true, tank: cls === 'warrior', x: Math.sin(2 + i * 1.6) * 2.5, z: Math.cos(2 + i * 1.6) * 2.5, hp: mh, maxHp: mh, dr: DRM[cls], dmg: S, mend: 1 + 0.05 * tier, state: 'free', facing: 0,
      cd: 1, heavyCd: 3, healCd: 0, guardT: 0, dodgeCd: 0, rollT: 0, rollDir: 0, rollFrom: null, threat: null, phase: null, phaseT: 0, atk: null, struck: false, tgt: null, downT: 0, hurtT: 0, hitT: 9, decT: 0, act: A.regroup, slot: i, goal: null };
    w.allies.push(a); w.log.compMax += mh;
  });
  w.hpMult = 1 + 0.25 * tier; w.heroDmg = 17 * (1 + 0.16 * tier);
  return w;
}

// Each scenario perturbs the enemies a little (speed, damage, wind-up time by up to +-15%), so a policy cannot fit one exact version of them
function jitterDef(d, w) {
  const f = () => 0.85 + 0.3 * w.r(), sp = f(), dm = f(), wd = f();
  return Object.assign({}, d, { speed: d.speed * sp, attacks: d.attacks.map(a => Object.assign({}, a, { hits: a.hits.map(h => Object.assign({}, h, { dmg: h.dmg * dm, wind: h.wind * wd })) })) });
}
function spawnWave(w, wave) {
  const ang = wave.ang;
  wave.list.forEach((type, i) => {
    const d = jitterDef(CFG.enemies[type], w), dd = 13 + w.r() * 3, a = ang + (w.r() - 0.5) * 0.9;
    const hp = d.hp * w.hpMult;
    const e = { type, d, x: w.hero.x - Math.sin(a) * dd - Math.sin(a + 1.5) * i * 0.4, z: w.hero.z - Math.cos(a) * dd, hp, maxHp: hp, mult: w.hpMult, facing: 0, state: 'hunt', cd: 0.6 + w.r() * 1.2, atk: null, hitIdx: 0, phase: null, phaseT: 0, tgt: null, tgtT: 0, threat: new Map(), strafe: w.r() < 0.5 ? 1 : -1, aim: null, struck: false };
    w.enemies.push(e); w.log.enemyHp += hp;
  });
}

const aliveC = c => c.hero ? c.state !== 'dead' : c.state !== 'down';
const cands = w => [w.hero].concat(w.allies).filter(aliveC);

function dmgTo(w, c, n, e) {
  if (!aliveC(c)) return;
  if (c.state === 'roll' && c.rollT >= P.dodge.iStart && c.rollT <= P.dodge.iEnd) { w.log.dodges = (w.log.dodges || 0) + 1; return; }       // the dash is untouchable for most of it
  if (c.hero) { n *= (1 - 0.05); c.hp -= n; w.log.heroDmg += n; if (c.hp <= 0) { c.state = 'dead'; w.log.heroDied = true; } return; }
  n *= (1 - c.dr) * (c.guardT > 0 ? 0.5 : 1);
  const before = c.hp; c.hp = Math.max(0, c.hp - n); c.hitT = 0; w.log.compDmg += before - c.hp;
  if (c.hp <= 0) { c.state = 'down'; c.downT = 0; c.atk = null; c.phase = null; c.tgt = null; w.log.downs++; }
  else if (n > c.maxHp * 0.12) { c.state = 'hurt'; c.hurtT = 0.28; c.atk = null; c.phase = null; }
}
function threat(e, who, n) { if (n > 0) e.threat.set(who, (e.threat.get(who) || 0) + n); }
function hurtEnemy(w, e, n, who) { if (e.hp <= 0) return; const dn = Math.min(e.hp, n); e.hp -= dn; w.log.dmgEnemy += dn; threat(e, who, n); if (e.hp <= 0) e.state = 'dead'; }
const liveEnemies = w => w.enemies.filter(e => e.state !== 'dead');

// ---------------- Enemies ----------------
function pickTgt(w, e, dt) {
  for (const [k, v] of e.threat) { const nv = v * Math.exp(-0.3 * dt); if (nv < 1 || !aliveC(k)) e.threat.delete(k); else e.threat.set(k, nv); }
  e.tgtT -= dt;
  if (e.tgt && aliveC(e.tgt) && (e.tgtT > 0 || e.state === 'attack')) return e.tgt;
  e.tgtT = 0.45; let best = null, bs = -1e9;
  for (const c of cands(w)) { const s = Math.min(60, e.threat.get(c) || 0) + (14 - Math.min(14, dist(e, c))) * 1.5 + (c.tank ? 9 : 0) + (c === e.tgt ? 5 : 0); if (s > bs) { bs = s; best = c; } }
  return (e.tgt = best);
}
function attackers(w) { let n = 0; for (const e of w.enemies) if (e.state === 'attack') n++; return n; }
function enemyStep(w, e, dt) {
  if (e.state === 'dead') return;
  const p = pickTgt(w, e, dt); if (!p) return;
  const d0 = dist(e, p), d = e.d, ang = yawTo(e, p), step = (a, sp) => { e.x += Math.sin(a) * sp * dt; e.z += Math.cos(a) * sp * dt; };
  const maxReach = Math.max(...d.attacks.flatMap(a => a.hits.map(h => h.range))), reach = (d.ranged ? 12 : maxReach) * 0.85 + P.radius;
  if (e.state === 'hunt') {
    e.cd -= dt; e.facing += wrap(ang - e.facing) * Math.min(1, 7 * dt);
    if (d.ranged) {
      const [near, far] = d.ranged;
      if (e.cd <= 0 && d0 <= far + 1.5 && d0 > 2) begin(w, e);
      else if (d0 < near) step(ang + Math.PI + 0.4 * e.strafe, d.speed * 0.85); else if (d0 > far) step(ang, d.speed); else step(ang + Math.PI / 2 * e.strafe, d.speed * 0.45);
    } else if (e.cd <= 0 && d0 <= reach && attackers(w) < CFG.maxAttackers) begin(w, e);
    else if (e.cd <= 0 && d0 > reach) step(ang, d.speed);
    else if (d0 > d.approach + 1.2) step(ang, d.speed);
    else if (d0 < d.approach - 0.4) step(ang + Math.PI, d.speed * 0.5);
    else step(ang + Math.PI / 2 * e.strafe, d.speed * 0.4);
  } else if (e.state === 'attack') {
    const h = e.atk.hits[e.hitIdx]; e.phaseT += dt;
    if (e.phase === 'wind') {
      if (e.phaseT < h.wind - 0.22) e.facing += wrap(ang - e.facing) * Math.min(1, 6 * dt);
      if (e.phaseT > h.wind * 0.65 && d0 > d.radius + 0.8 && !h.aoe && !h.projectile) step(e.facing, (h.lunge || 1.5) / (h.wind * 0.35 + h.active));
      if (e.phaseT >= h.wind) { e.phase = 'active'; e.phaseT = 0; }
    } else if (e.phase === 'active') {
      if (!e.struck && e.phaseT >= h.active * 0.5) { e.struck = true; strike(w, e, h); }
      if (e.phaseT >= h.active) { e.phase = 'recover'; e.phaseT = 0; }
    } else if (e.phase === 'recover' && e.phaseT >= h.recover) {
      if (e.hitIdx < e.atk.hits.length - 1) { e.hitIdx++; e.phase = 'wind'; e.phaseT = 0; e.struck = false; aimRing(e); }
      else { e.cd = (d.cooldown[0] + w.r() * (d.cooldown[1] - d.cooldown[0])); e.state = 'hunt'; e.atk = null; }
    }
  }
}
function begin(w, e) {
  const list = e.d.attacks, tot = list.reduce((s, a) => s + a.weight, 0); let x = w.r() * tot, pick = list[0];
  for (const a of list) { x -= a.weight; if (x <= 0) { pick = a; break; } }
  e.atk = pick; e.hitIdx = 0; e.phase = 'wind'; e.phaseT = 0; e.struck = false; e.state = 'attack'; aimRing(e);
}
// A ring on the floor is aimed once, when its wind-up starts, at where the target stands
function aimRing(e) { const h = e.atk.hits[e.hitIdx]; if (h.aoe && e.tgt) e.aim = { x: e.tgt.x, z: e.tgt.z }; }
function strike(w, e, h) {
  if (h.projectile) { const p = e.tgt; if (p) w.shots.push({ x: e.x, z: e.z, tx: p.x, tz: p.z, t: dist(e, p) / 14, dmg: h.dmg * e.mult, enemy: true }); return; }
  for (const c of cands(w)) {
    const hit = h.aoe ? dist(c, e.aim || e) <= h.aoe.r + P.radius : inArc(e, e.facing, c, h.range, h.arc, P.radius);
    if (hit) dmgTo(w, c, h.dmg * e.mult, e);
  }
}

// ---------------- Companions ----------------
function tgtOf(w, a) {
  const hero = w.hero;
  if (a.tgt && a.tgt.state !== 'dead' && dist(a, a.tgt) < CP.aggro + 3 && dist(hero, a.tgt) < CP.aggro + 6) return a.tgt;
  let best = null, bd = CP.aggro;
  for (const e of liveEnemies(w)) { const d = dist(a, e); if (d < bd && dist(hero, e) < CP.aggro + 6) { bd = d; best = e; } }
  return best;
}
function homeOf(w, a) { const ang = w.hero.facing + Math.PI + (a.slot % 2 ? 0.8 : -0.8); return { x: w.hero.x + Math.sin(ang) * CP.follow, z: w.hero.z + Math.cos(ang) * CP.follow }; }
function stateOf(w, a) {
  const hero = w.hero, tg = a.tgt, party = [hero].concat(w.allies), near = party.filter(m => m !== a && dist(a, m) < 8);
  const frac = m => m.state === 'down' ? 0 : m.hp / m.maxHp, grp = [a].concat(near);
  let nearest = 99; for (const e of liveEnemies(w)) nearest = Math.min(nearest, dist(a, e));
  let danger = 3, targeted = 0, aoe = 0, threat = null;
  const note = (t, kind, e, cx, cz) => { if (t < danger) { danger = t; aoe = kind === 'aoe' ? 1 : 0; threat = { kind, e, cx, cz }; } };
  for (const e of liveEnemies(w)) {
    if (e.tgt === a) targeted++;
    if (e.state !== 'attack') continue;
    const h = e.atk.hits[e.hitIdx];
    let t = e.phase === 'wind' ? Math.max(0, h.wind - e.phaseT) + h.active * 0.5 : e.phase === 'active' && !e.struck ? Math.max(0, h.active * 0.5 - e.phaseT) : -1;
    if (t < 0 || h.projectile) continue;
    if (h.aoe) { const c = e.aim || e; if (dist(a, c) <= h.aoe.r + 0.9) note(t, 'aoe', e, c.x, c.z); }
    else if (e.tgt === a && dist(a, e) <= h.range + 1.0 + P.radius) note(t, 'melee', e, e.x, e.z);
  }
  for (const s of w.shots) if (s.enemy && dist({ x: s.tx, z: s.tz }, a) < 1.5) note(s.t, 'shot', null, s.tx, s.tz);
  a.threat = threat;
  const dodgeRdy = a.dodgeCd <= 0 && (a.state === 'free' || (a.state === 'attack' && a.phase === 'recover')) ? 1 : 0;
  const others = w.allies.filter(m => m !== a);
  return {
    cls: a.cls, hp: a.hp / a.maxHp, hero: Math.max(0, hero.hp / hero.maxHp), other: others.length ? Math.min(...others.map(frac)) : 1, downed: others.filter(m => m.state === 'down').length,
    dHero: dist(a, hero), dEnemy: tg ? dist(a, tg) : nearest, nNear: liveEnemies(w).filter(e => dist(a, e) < 7).length, nHero: liveEnemies(w).filter(e => dist(hero, e) < 7).length, targeted, danger, aoe, dodgeRdy,
    atkRdy: a.cd <= 0 ? 1 : 0, heavyRdy: a.heavyCd <= 0 && a.cd <= 0 ? 1 : 0, healRdy: a.healCd <= 0 && a.cd <= 0 ? 1 : 0,
    lowest: Math.min(...grp.filter(m => dist(a, m) < 8).map(frac)), hurtN: grp.filter(m => m.state === 'down' || m.hp / m.maxHp < 0.6).length, hasTarget: !!tg,
  };
}
function beginAtk(a, data, extra) { a.atk = Object.assign({}, data, extra || {}); a.phase = 'wind'; a.phaseT = 0; a.struck = false; a.state = 'attack'; }
function mendTo(w, a, t, amount, selfShare) {
  if (t.state === 'down') { t.state = 'free'; t.hp = Math.max(1, Math.round(t.maxHp * Math.max(0.3, amount))); return t.maxHp * 0.3; }
  const gain = Math.min(t.maxHp - t.hp, t.maxHp * amount * (t === a ? selfShare : 1)); if (gain > 0) t.hp += gain; return Math.max(0, gain);
}
function aggroHeal(w, a, n) { if (n > 0) for (const e of liveEnemies(w)) if (dist(e, a) < 14) threat(e, a, n * 0.8); }
function strikeAlly(w, a) {
  const k = a.atk, M = MOVES[a.cls];
  if (k.kind === 'heal1') {
    const H = P.combos.scepterHeal[0].heal, group = [w.hero].concat(w.allies).filter(m => m.hero ? m.state !== 'dead' : true);
    let best = a, bf = a.hp / a.maxHp / H.self;
    for (const m of group) { if (m === a || dist(a, m) > H.reach) continue; const f = m.state === 'down' ? -1 : m.hp / m.maxHp; if (f < bf) { best = m; bf = f; } }
    aggroHeal(w, a, mendTo(w, a, best, H.amount * a.mend, H.self)); return;
  }
  if (k.kind === 'area') {
    const H = P.heavies.scepterHeal.heal; let sum = 0;
    for (const m of [w.hero].concat(w.allies)) if ((m.hero ? m.state !== 'dead' : true) && dist(a, m) <= H.radius) sum += mendTo(w, a, m, H.amount * a.mend, H.self);
    aggroHeal(w, a, sum); return;
  }
  const t = a.tgt; if (!t || t.state === 'dead') return;
  const base = k.dmg * a.dmg;
  if (a.cls === 'warrior') { for (const e of liveEnemies(w)) if (inArc(a, a.facing, e, k.range, k.arc, e.d.radius)) hurtEnemy(w, e, base, a); return; }
  if (a.cls === 'archer' && k.heavyKind) {                                   // the fan: arrows hit nearer foes more often
    const d = dist(a, t), n = Math.max(1, Math.round(7 * Math.min(1, 2.4 / (0.75 * d + 0.5))));
    hurtEnemy(w, t, base * n, a);
    for (const e of liveEnemies(w)) if (e !== t && Math.abs(wrap(yawTo(a, e) - yawTo(a, t))) < 0.35 && dist(a, e) < 14) hurtEnemy(w, e, base * Math.max(1, n - 2), a);
    return;
  }
  if (a.cls === 'mage' && k.heavyKind) { w.blasts.push({ x: t.x, z: t.z, t: 0.45, dmg: base, r: 3, who: a }); return; }
  hurtEnemy(w, t, base, a);
  if (a.cls === 'cleric' && k.heavyKind) for (const e of liveEnemies(w)) if (e !== t && dist(e, t) < 1.8) hurtEnemy(w, e, base * 0.6, a);
}
// Execute a chosen move; returns a movement goal {x,z,run} or null
function execute(w, a, act, s) {
  const M = MOVES[a.cls], t = a.tgt, home = homeOf(w, a), toward = (e, run = true) => ({ x: e.x, z: e.z, run });
  a.guardT = act === A.guard ? 0.6 : a.guardT;
  switch (act) {
    case A.attack: {
      if (!t) return goHome(a, home);
      const d = dist(a, t);
      if (a.cls === 'warrior') { if (d < M.reach && a.cd <= 0) { beginAtk(a, M.light, { kind: 'light' }); a.cd = M.lightCd; a.facing = yawTo(a, t); return null; } return d > 1.7 ? toward(t) : null; }
      if (a.cls === 'cleric') { if (a.cd <= 0 && d < M.far) { beginAtk(a, M.light, { kind: 'light' }); a.cd = M.lightCd; a.facing = yawTo(a, t); return null; } return d > M.far ? toward(t) : null; }
      if (d > M.far) return toward(t);
      if (a.cd <= 0 && d > 1.6) { beginAtk(a, M.light, { kind: 'light' }); a.cd = M.lightCd; a.facing = yawTo(a, t); }
      return null;
    }
    case A.heavy: {
      if (!t) return goHome(a, home);
      const d = dist(a, t);
      if (a.cls === 'warrior' && d > 2.4) return toward(t);
      if (a.cd <= 0 && a.heavyCd <= 0) { beginAtk(a, M.heavy, { kind: 'heavy', heavyKind: true }); a.heavyCd = M.heavyCd; a.cd = 1.0; a.facing = yawTo(a, t); return null; }
      return null;
    }
    case A.kite: {
      let ne = null, nd = 99; for (const e of liveEnemies(w)) { const d = dist(a, e); if (d < nd) { nd = d; ne = e; } }
      if (!ne) return goHome(a, home);
      const k = 3 / Math.max(0.1, nd); return { x: a.x + (a.x - ne.x) * k, z: a.z + (a.z - ne.z) * k, run: true };
    }
    case A.regroup: return goHome(a, home);
    case A.heal: if (a.cd <= 0) { beginAtk(a, P.combos.scepterHeal[0], { kind: 'heal1', dmg: 0 }); a.cd = 2.2; } return null;
    case A.area: if (a.cd <= 0 && a.healCd <= 0) { beginAtk(a, P.heavies.scepterHeal, { kind: 'area', dmg: 0 }); a.cd = 1.2; a.healCd = 7; } return null;
    case A.guard: return null;
    case A.dodge: startRoll(w, a); return null;
  }
  return null;
}
// The dash: away from a ring's middle, else sideways to the blow on the side with fewer foes
function startRoll(w, a) {
  const th = a.threat; if (a.dodgeCd > 0 || !th) return;
  let dx = a.x - th.cx, dz = a.z - th.cz, d = Math.hypot(dx, dz);
  if (th.kind === 'aoe') { if (d < 1e-3) { dx = Math.sin(a.facing); dz = Math.cos(a.facing); d = 1; } dx /= d; dz /= d; }
  else {
    const fx = d < 1e-3 ? Math.sin(a.facing) : dx / d, fz = d < 1e-3 ? Math.cos(a.facing) : dz / d;
    const side = sg => { const px = -fz * sg, pz = fx * sg; let m = 99; for (const e of liveEnemies(w)) m = Math.min(m, Math.hypot(e.x - (a.x + px * 2.6), e.z - (a.z + pz * 2.6))); return m; };
    const sg = side(1) >= side(-1) ? 1 : -1; dx = -fz * sg; dz = fx * sg;
  }
  a.rollDir = Math.atan2(dx, dz); a.rollT = 0; a.rollFrom = { x: a.x, z: a.z }; a.dodgeCd = 1.8; a.state = 'roll'; a.atk = null; a.phase = null;
}
const goHome = (a, home) => (dist(a, home) > 1.0 ? { x: home.x, z: home.z, run: dist(a, home) > 6 } : null);

function allyStep(w, a, dt, policyFn) {
  a.hitT += dt;
  if (a.state === 'down') { a.downT += dt; if (a.downT > CP.downFor) { a.state = 'free'; a.hp = Math.round(a.maxHp * 0.25); a.cd = 1; } return; }
  if (a.state === 'free' && a.hitT > 5 && a.hp < a.maxHp) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.015 * dt);
  a.cd -= dt; a.heavyCd -= dt; a.healCd -= dt; a.guardT -= dt; a.dodgeCd -= dt;
  const hero = w.hero; let goal = null;
  if (a.state === 'attack') {
    const k = a.atk; a.phaseT += dt;
    if (a.phase === 'wind' && a.phaseT >= k.wind) { a.phase = 'active'; a.phaseT = 0; }
    if (a.phase === 'active' && !a.struck && a.phaseT >= k.active * 0.5) { a.struck = true; strikeAlly(w, a); }
    if (a.phase === 'active' && a.phaseT >= k.active) { a.phase = 'recover'; a.phaseT = 0; }
    if (a.phase === 'recover' && a.phaseT >= k.recover) { a.state = 'free'; a.atk = null; a.phase = null; }
    else if (a.phase === 'recover' && w.hero.state !== 'dead') {                       // a dash can cut the recovery short
      a.decT -= dt;
      if (a.decT <= 0) { const s = stateOf(w, a); a.decT = s.danger < 0.9 ? 0.06 : DECIDE; if (s.danger < 0.9) { const m = Policy.legal(s); let act = policyFn(s); if (act == null || !m[act]) act = Policy.classic(s); if (act === A.dodge) { a.act = act; startRoll(w, a); } } }
    }
  } else if (a.state === 'roll') {
    a.rollT += dt; const f = Math.min(1, a.rollT / P.dodge.time), e = f * (2 - f), dd = P.dodge.dist * e;
    a.x = a.rollFrom.x + Math.sin(a.rollDir) * dd; a.z = a.rollFrom.z + Math.cos(a.rollDir) * dd;
    if (a.rollT >= P.dodge.time) { a.state = 'free'; a.cd = Math.max(a.cd, 0.2); }
  } else if (a.state === 'hurt') { a.hurtT -= dt; if (a.hurtT <= 0) a.state = 'free'; }
  else if (hero.state !== 'dead') {
    a.decT -= dt;
    const dp = dist(a, hero), home = homeOf(w, a);
    if (dp > CP.far) goal = goHome(a, home);
    else {
      a.tgt = tgtOf(w, a);
      if (a.decT <= 0) { const s = stateOf(w, a), m = Policy.legal(s); a.decT = s.danger < 0.9 ? 0.06 : DECIDE; let act = policyFn(s); if (act == null || !m[act]) act = Policy.classic(s); a.act = act; }
      goal = execute(w, a, a.act, null);
      if (a.act === A.guard) goal = null;
    }
  }
  if (goal) {
    const dx = goal.x - a.x, dz = goal.z - a.z, dd = Math.hypot(dx, dz);
    if (dd > 0.05) { const sp = goal.run ? P.speed * 1.05 : P.speed * 0.8, st = Math.min(dd, sp * dt); a.x += dx / dd * st; a.z += dz / dd * st; a.facing += wrap(Math.atan2(dx, dz) - a.facing) * Math.min(1, 12 * dt); }
  }
  const sx = a.x - hero.x, sz = a.z - hero.z, sd = Math.hypot(sx, sz); if (sd < 1 && sd > 1e-4) { a.x += sx / sd * (1 - sd) * 0.5; a.z += sz / sd * (1 - sd) * 0.5; }
}

// ---------------- The scripted warden ----------------
function heroStep(w, dt) {
  const h = w.hero; if (h.state === 'dead') return;
  h.cd -= dt; h.flaskT -= dt;
  let ne = null, nd = 99; for (const e of liveEnemies(w)) { const d = dist(h, e); if (d < nd) { nd = d; ne = e; } }
  if (ne && nd < 14) {
    h.facing += wrap(yawTo(h, ne) - h.facing) * Math.min(1, 12 * dt);
    if (nd > 2.0) { const a = yawTo(h, ne), sp = P.speed * 0.8; h.x += Math.sin(a) * sp * dt; h.z += Math.cos(a) * sp * dt; }
    else if (h.cd <= 0) { hurtEnemy(w, ne, w.heroDmg, h); h.cd = 0.8; }
  }
  if (h.hp < h.maxHp * 0.35 && h.flasks > 0 && h.flaskT <= 0) { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.4); h.flasks--; h.flaskT = 6; }
}

// ---------------- Running a scenario ----------------
function run(sc, policyFn, seed2) {
  const w = newWorld(sc, seed2); let nextWave = 0;
  while (w.t < LIMIT) {
    while (nextWave < sc.waves.length && w.t >= sc.waves[nextWave].at) spawnWave(w, sc.waves[nextWave++]);
    heroStep(w, DT);
    for (const a of w.allies) allyStep(w, a, DT, policyFn);
    for (const e of w.enemies) enemyStep(w, e, DT);
    for (let i = w.shots.length - 1; i >= 0; i--) { const s = w.shots[i]; s.t -= DT; if (s.t <= 0) { for (const c of cands(w)) if (Math.hypot(c.x - s.tx, c.z - s.tz) < 0.8) dmgTo(w, c, s.dmg, null); w.shots.splice(i, 1); } }
    for (let i = w.blasts.length - 1; i >= 0; i--) { const b = w.blasts[i]; b.t -= DT; if (b.t <= 0) { for (const e of liveEnemies(w)) if (dist(e, b) < b.r + e.d.radius) hurtEnemy(w, e, b.dmg * 1.6, b.who); w.blasts.splice(i, 1); } }
    w.t += DT;
    if (w.hero.state === 'dead') break;
    if (nextWave >= sc.waves.length && liveEnemies(w).length === 0) { w.log.cleared = true; w.log.time = w.t; break; }
  }
  const L = w.log, n = Math.max(1, w.allies.length);
  const frac = L.enemyHp > 0 ? Math.min(1, L.dmgEnemy / L.enemyHp) : 1;
  const reward = 40 * frac + (L.cleared ? 30 + 0.3 * (LIMIT - L.time) : 0) - 25 * L.downs - (L.heroDied ? 60 : 0) - 20 * L.heroDmg / w.hero.maxHp - 8 * L.compDmg / Math.max(1, L.compMax);
  return { reward, cleared: L.cleared, time: L.time, downs: L.downs, heroDied: L.heroDied, heroDmg: L.heroDmg / w.hero.maxHp, compDmg: L.compDmg / Math.max(1, L.compMax), frac };
}

const classicFn = s => Policy.classic(s);
module.exports = { run, makeScenario, classicFn, Policy, CFG, rng, LIMIT, DECIDE };

if (require.main === module) {
  const t0 = Date.now(), N = 200, agg = { reward: 0, cleared: 0, downs: 0, heroDied: 0, time: 0 };
  for (let i = 0; i < N; i++) { const r = run(makeScenario(i + 1), classicFn); agg.reward += r.reward; agg.cleared += r.cleared ? 1 : 0; agg.downs += r.downs; agg.heroDied += r.heroDied ? 1 : 0; agg.time += r.time; }
  console.log(`classic on ${N} scenarios: reward ${(agg.reward / N).toFixed(1)}, cleared ${(agg.cleared / N * 100).toFixed(0)}%, downs/run ${(agg.downs / N).toFixed(2)}, hero died ${(agg.heroDied / N * 100).toFixed(0)}%, time ${(agg.time / N).toFixed(1)} s  (${((Date.now() - t0) / N).toFixed(1)} ms per run)`);
}
