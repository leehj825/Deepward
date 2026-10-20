// Deepward - the party: companions who walk with the warden. They follow (that comes first), and attack, shoot or heal what
// is near: a warrior closes in and swings, an archer keeps her distance and shoots (a fan of arrows now and then), a mage
// casts bolts and a fireball, a cleric mends whoever is hurt and smites when no one is. No planning yet: each is a few plain
// rules (see `think`). Foes pick them as targets like the warden (see Enemy aggro), so they take damage, can be downed, and are
// mended by the cleric (the warden or a companion). A downed companion gets up by itself after a while, or at once when healed.
// Who is in the party is S.party (ids from CFG.companions); S.hired remembers whom the warden paid.
const Party = (() => {
  const CP = CFG.party, DEFS = CFG.companions, P = CFG.player;
  const def = id => DEFS.find(d => d.id === id);
  const S = () => Items.S;
  const GLYPH = { warrior: '⚔', archer: '🏹', mage: '✦', cleric: '✚' };
  const OFFHAND = { archer: 'quiver', mage: 'orb', cleric: 'tome' };

  // ---------------- Recruiting ----------------
  // 'in' (in the party), 'locked' (a captive still to be freed), 'hire' (costs gold the first time), 'ready'
  function status(id) {
    const d = def(id), s = S();
    if (!d || !s) return 'locked';
    if (s.party.includes(id)) return 'in';
    if (d.rescue && Items.rescued(d.rescue)) return 'ready';                      // freed from the Deep: joins free
    if (d.hire && !s.hired[id]) return 'hire';
    if (d.rescue && !s.hired[id]) return 'locked';
    return 'ready';
  }
  function recruit(id) {
    const d = def(id), s = S(), st = status(id);
    if (!d || (st !== 'ready' && st !== 'hire') || s.party.length >= CP.max) return false;
    if (st === 'hire') { if (s.gold < d.hire) return false; s.gold -= d.hire; s.hired[id] = true; }
    s.party.push(id); Items.save(); sync(); return true;
  }
  function dismiss(id) {
    const s = S(); if (!s || !s.party.includes(id)) return false;
    s.party = s.party.filter(x => x !== id); Items.save(); sync(); return true;
  }

  // ---------------- Bodies ----------------
  function lookFor(d) {
    const w = CFG.gear.weapons[d.weapon], L = Object.assign({}, Items.look(), {
      weapon: d.weapon, weaponLen: w.len, caster: !!w.caster, twoHanded: false, dual: false, blade: 0x9ac8ff, glow: 0,
      shield: d.cls === 'warrior', shieldFace: 0x4a2a2a, offhand: OFFHAND[d.cls] || '', armor: d.cloth, plate: d.cls === 'warrior', mail: false,
      helm: -1, gloves: -1, boots: -1, trinket: false, ring: false,
    }, d.look);
    return L;
  }
  // What a companion hits for: a share of the warden's own strength, growing with level and depth (they carry no gear)
  const HP = { warrior: 1.5, archer: 0.85, mage: 0.75, cleric: 0.95 }, DR = { warrior: 0.25, archer: 0.05, mage: 0.05, cleric: 0.08 };
  function power() {
    const s = S(), tier = Math.min(s.stage, CFG.gear.tierNames.length - 1);
    return { dmg: CP.dmg * (1 + CFG.progress.perLevel.power * (s.level - 1)) * (1 + 0.16 * tier), mend: 1 + 0.05 * tier, hp: 80 + 6 * (s.level - 1) + 14 * tier };
  }
  function spawn(d) {
    const p = G.player, rig = Rig.build('hero', { look: lookFor(d) }), pw = power();
    p.rig.root.parent.add(rig.root);
    const a = {
      id: d.id, def: d, cls: d.cls, ally: true, tank: d.cls === 'warrior', rig, pos: p.pos.clone(), facing: p.facing, hp: Math.round(pw.hp * HP[d.cls]), maxHp: Math.round(pw.hp * HP[d.cls]), dr: DR[d.cls], state: 'free', t: 0, hitT: 9, downT: 0, hurtT: 0,
      phase: null, phaseT: 0, atk: null, struck: false, target: null, cd: 1, heavyCd: 3, healCd: 0, guardT: 0, decT: 0, shots: 0, speedK: 0, cycle: 0,
      S: { dmg: pw.dmg, mend: pw.mend, u: {}, healCd: 1, critMult: P.critMult, burn: 0, fire: 0 }, slot: 0,
    };
    a.pos.x += Math.sin(p.facing + 1.5) * 1.5; a.pos.z += Math.cos(p.facing + 1.5) * 1.5;
    FX.ring(a.pos, 1.2, 0x9affc8, 0.6, { r0: 0.2 }); FX.burst(new THREE.Vector3(a.pos.x, 0.2, a.pos.z), 0x9affc8, 12, 3, 0.5);
    return a;
  }
  function removeBody(a) { a.rig.root.parent && a.rig.root.parent.remove(a.rig.root); if (a.bar) { a.bar.remove(); a.bar = null; } }
  // Make the bodies match S.party (called when the party changes, and every frame it is cheap to check)
  function sync() {
    const s = S(), p = G.player; if (!s || !p) return;
    G.allies = G.allies || [];
    for (let i = G.allies.length - 1; i >= 0; i--) if (!s.party.includes(G.allies[i].id)) { removeBody(G.allies[i]); G.allies.splice(i, 1); }
    for (const id of s.party) if (!G.allies.some(a => a.id === id)) G.allies.push(spawn(def(id)));
    G.allies.forEach((a, i) => { a.slot = i; });
    chips();
  }
  function clear() { for (const a of G.allies || []) removeBody(a); G.allies = []; chips(); }
  // Refit after the warden's looks or gear change (their own look is taken from Items.look for the shared parts)
  function refit() { const keep = (G.allies || []).map(a => a.id); clear(); G.allies = []; sync(); return keep; }

  // ---------------- Taking damage ----------------
  function hurt(a, e, hit) {
    if (a.state === 'down') return;
    const n = hit.dmg * (e.mult || 1) * (1 - a.dr) * (a.guardT > 0 ? 0.5 : 1) * Settings.diff.dmg;           // a guarding warrior takes half
    a.hp = Math.max(0, a.hp - n); a.hitT = 0;
    FX.text(Combat.chestPos(a.pos, 2.0), '-' + Math.round(n), 'hurt'); Snd.play('hit');
    FX.burst(Combat.chestPos(a.pos, 1.2), 0xc0201a, 6, 3, 0.3);
    if (a.hp <= 0) { down(a); return; }
    if (hit.dmg * (e.mult || 1) > a.maxHp * 0.12) { a.state = 'hurt'; a.hurtT = 0.28; a.atk = null; a.phase = null; }          // a hard blow staggers
    if (e.pos) { const ang = Combat.yawTo(e.pos, a.pos); a.pos.x += Math.sin(ang) * 0.25; a.pos.z += Math.cos(ang) * 0.25; }
  }
  function down(a) {
    a.state = 'down'; a.downT = 0; a.hp = 0; a.atk = null; a.phase = null; a.target = null;
    FX.text(Combat.chestPos(a.pos, 2.4), a.def.short + ' DOWN', 'warn'); Snd.play('lose');
  }
  // Back on their feet at this share of health
  function revive(a, frac = 0.3) {
    if (a.state !== 'down') return false;
    a.state = 'free'; a.hp = Math.max(1, Math.round(a.maxHp * frac)); a.hitT = 0; a.cd = 1;
    FX.ring(a.pos, 1.4, 0x9affc0, 0.7, { r0: 0.3 }); FX.burst(Combat.chestPos(a.pos, 1.0), 0x9affc0, 20, 4, 0.6); FX.text(Combat.chestPos(a.pos, 2.4), 'UP', 'heal'); Snd.play('glint');
    return true;
  }
  // Camp, a new stage: everyone stands, rested (full), or a stage's first steps on a climb (add: a share of health)
  function restore(full = true, add = 0.3) {
    for (const a of G.allies || []) {
      if (a.state === 'down') revive(a, full ? 1 : add);
      else a.hp = Math.min(a.maxHp, full ? a.maxHp : a.hp + a.maxHp * add);
      a.state = a.state === 'hurt' ? 'free' : a.state;
    }
  }

  // The hero's flask spills over: companions within 7 m take half of its healing (a share of their own health; the downed stay down)
  function flask(p, share) {
    for (const a of G.allies || []) {
      if (a.state === 'down' || Combat.dist(a.pos, p.pos) > 7 || a.hp >= a.maxHp) continue;
      const h = Math.min(a.maxHp - a.hp, a.maxHp * share * 0.5); a.hp += h;
      FX.text(Combat.chestPos(a.pos, 2.1), '+' + Math.round(h), 'heal'); FX.burst(Combat.chestPos(a.pos, 1.4), 0x7aff9a, 8, 3);
    }
  }

  // The names under the purse: who walks with you
  function chips() {
    const el = document.getElementById('party'); if (!el) return;
    el.innerHTML = (G.allies || []).map(a => `<div class="pm" data-id="${a.id}"><b>${GLYPH[a.cls]} ${a.def.short}</b><div class="pbar"><i></i></div><span class="pn"></span></div>`).join('');
    el.style.display = (G.allies || []).length ? '' : 'none';
    const bars = document.getElementById('bars');
    for (const a of G.allies || []) if (!a.bar && bars) { a.bar = document.createElement('div'); a.bar.className = 'abar'; a.bar.innerHTML = '<span></span><div class="hp"><i></i></div>'; a.bar.firstChild.textContent = a.def.short; bars.appendChild(a.bar); }
  }
  // Their health, in the party list and over their heads (where you aim your heals)
  function updateBars() {
    for (const a of G.allies || []) {
      const f = Math.max(0, a.hp / a.maxHp), down = a.state === 'down';
      const row = document.querySelector(`#party .pm[data-id="${a.id}"]`);
      if (row) {
        row.querySelector('.pbar i').style.width = f * 100 + '%';
        const t = down ? 'DOWN · heal to revive' : `${Math.ceil(a.hp)} / ${a.maxHp}`; const n = row.querySelector('.pn'); if (n.textContent !== t) n.textContent = t;
        row.classList.toggle('down', down); row.classList.toggle('low', !down && f < 0.4);
      }
      if (a.bar) {
        const s = FX.project(Combat.chestPos(a.pos, 2.3));
        a.bar.style.transform = `translate(${s.x - 24}px, ${s.y}px)`; a.bar.style.display = s.vis ? '' : 'none';
        a.bar.querySelector('.hp i').style.width = f * 100 + '%'; a.bar.classList.toggle('down', down); a.bar.classList.toggle('low', !down && f < 0.4);
      }
    }
  }

  // ---------------- What they do ----------------
  const usable = e => Enemy.targetable(e) && e.type !== 'sparring';
  function pickTarget(a, p) {
    if (a.target && usable(a.target) && Combat.dist(a.pos, a.target.pos) < CP.aggro + 3 && Combat.dist(p.pos, a.target.pos) < CP.aggro + 6) return a.target;
    let best = null, bd = CP.aggro;
    for (const e of G.enemies) {
      if (!usable(e)) continue;
      const d = Combat.dist(a.pos, e.pos); if (d < bd && Combat.dist(p.pos, e.pos) < CP.aggro + 6) { bd = d; best = e; }
    }
    return best;
  }
  // Where a companion likes to stand: beside and behind the warden, the second one on the other side
  function homeOf(a, p) {
    const ang = p.facing + Math.PI + (a.slot % 2 ? 0.8 : -0.8);
    return { x: p.pos.x + Math.sin(ang) * CP.follow, z: p.pos.z + Math.cos(ang) * CP.follow };
  }
  const D = (a, tgt) => Combat.dist(a.pos, tgt.pos);
  // Starting a blow: `data` is a copy of the hero's own move for the class, scaled down to the companion's strength
  function begin(a, data, extra = {}) {
    a.atk = Object.assign({}, data, { dmg: data.dmg * a.S.dmg, critMult: P.critMult }, extra);
    a.phase = 'wind'; a.phaseT = 0; a.struck = false; a.state = 'attack';
    if (a.target) a.facing = Combat.yawTo(a.pos, a.target.pos);
  }
  function strike(a) {
    const atk = a.atk;
    if (atk.shot) { Shots.fire(a, atk); return; }
    if (atk.heal) { Shots.heal(a, atk); return; }
    let hit = 0;
    for (const e of G.enemies) {
      if (!usable(e) || !Combat.inArc(a.pos, a.facing, e.pos, atk.range, atk.arc, e.def.radius)) continue;
      const r = Enemy.receive(e, atk, a); if (r && r !== 'blocked' && r !== 'ward') hit++;
    }
    if (hit) { Snd.play('hit'); }
  }
  // ---------------- Learning from fights ----------------
  // A fight starts when a foe is near the party and ends when none is left within 25 m for 2.5 s (or the warden falls). It is scored
  // like the trainer's simulator scores a fight (Policy.Learner.score), and Policy.Learner turns the score into a small adjustment
  // of the companions' preferences, kept in the save (S.policyAdapt).
  let L = null, Lfor = null, fight = null;
  const learner = () => { const s = S(); if (!L || Lfor !== s) { L = Policy.Learner.make(s && s.policyAdapt); Lfor = s; } return L; };
  const learning = () => Settings.get('learnedAI') !== false && Settings.get('learnOnline') !== false && Policy.ready;
  function trackFight(dt, p) {
    const foes = G.enemies.filter(e => usable(e) && Combat.dist(e.pos, p.pos) < 25 && e.state !== 'spawn'), A = G.allies || [];
    const hpAll = [p].concat(A);
    if (!fight) {
      if (!foes.some(e => Combat.dist(e.pos, p.pos) < 14) || !A.length) return;
      fight = { t: 0, quiet: 0, foes: new Map(), last: new Map(hpAll.map(m => [m, m.hp])), heroLost: 0, compLost: 0, downs: 0, down: new Map(A.map(a => [a, a.state === 'down'])), heroMax: p.maxHp, compMax: A.reduce((s, a) => s + a.maxHp, 0), on: learning() };
      learner().ep = [];
    }
    fight.t += dt;
    for (const e of foes) if (!fight.foes.has(e)) fight.foes.set(e, e.maxHp);
    for (const m of hpAll) {
      const was = fight.last.get(m); if (was === undefined) { fight.last.set(m, m.hp); continue; }
      if (m.hp < was) { if (m === p) fight.heroLost += was - m.hp; else fight.compLost += was - m.hp; }
      fight.last.set(m, m.hp);
      if (m !== p) { const d = m.state === 'down'; if (d && !fight.down.get(m)) fight.downs++; fight.down.set(m, d); }
    }
    fight.quiet = foes.length ? 0 : fight.quiet + dt;
    if (fight.quiet > 2.5 || p.state === 'dead' || fight.t > 75) endFight(p);                  // a very long fight is scored in parts, so its lessons are saved
  }
  function endFight(p) {
    const f = fight; fight = null; if (!f || !f.on || !learning() || f.t < 4) { learner().ep = []; return; }
    let removed = 0, total = 0, alive = 0;
    for (const [e, mx] of f.foes) { total += mx; removed += mx - Math.max(0, e.state === 'dead' ? 0 : e.hp); if (e.state !== 'dead' && usable(e)) alive++; }
    const res = { frac: total ? Math.min(1, removed / total) : 1, cleared: alive === 0, time: f.t, downs: f.downs, heroDied: p.state === 'dead', heroLost: f.heroLost / f.heroMax, compLost: f.compLost / Math.max(1, f.compMax) };
    const Ln = learner(); if (!Ln.ep.length) return;
    Policy.Learner.end(Ln, Policy.Learner.score(res));
    S().policyAdapt = Policy.Learner.dump(Ln); Items.save();
  }
  // The learned preferences as text to copy out (tools/policy/bake.js folds them into the shipped network)
  const exportData = () => { const a = S() && S().policyAdapt; return a ? 'DWPOLICY1:' + btoa(JSON.stringify(a)) : ''; };
  const forget = () => { const s = S(); if (s) s.policyAdapt = null; L = null; fight = null; };
  const fights = () => (S() && S().policyAdapt ? S().policyAdapt.n : 0);

  // ---------------- Deciding ----------------
  // What a companion sees of the moment (see js/policy.js for the meaning of each number)
  const frac = m => m.state === 'down' ? 0 : Math.max(0, m.hp / m.maxHp);
  function stateOf(a, p) {
    const t = a.target, party = Shots.party(a), near = party.filter(m => m !== a && Combat.dist(a.pos, m.pos) < 8), grp = [a].concat(near);
    const foes = G.enemies.filter(usable), others = (G.allies || []).filter(m => m !== a);
    let nearest = 99, ne = null, danger = 3, targeted = 0;
    for (const e of foes) {
      const d = Combat.dist(a.pos, e.pos); if (d < nearest) { nearest = d; ne = e; }
      if (e.tgt !== a) continue;
      targeted++;
      if (e.state === 'attack' && e.phase === 'wind' && e.atk) danger = Math.min(danger, Math.max(0, e.atk.hits[e.hitIdx].wind - e.phaseT));
    }
    for (const ar of Enemy.arrows) {                                               // an arrow or orb on its way to this companion
      if (ar.back) continue;
      const dx = a.pos.x - ar.pos.x, dz = a.pos.z - ar.pos.z, d = Math.hypot(dx, dz);
      if (d < 16 && (dx * ar.dir.x + dz * ar.dir.z) / Math.max(d, 0.01) > 0.93) danger = Math.min(danger, d / ar.speed);
    }
    a.nearest = ne;
    return {
      cls: a.cls, hp: frac(a), hero: frac(p), other: others.length ? Math.min(...others.map(frac)) : 1, downed: others.filter(m => m.state === 'down').length,
      dHero: Combat.dist(a.pos, p.pos), dEnemy: t ? D(a, t) : nearest, nNear: foes.filter(e => Combat.dist(a.pos, e.pos) < 7).length, nHero: foes.filter(e => Combat.dist(p.pos, e.pos) < 7).length,
      targeted, danger, atkRdy: a.cd <= 0 ? 1 : 0, heavyRdy: a.heavyCd <= 0 && a.cd <= 0 ? 1 : 0, healRdy: a.healCd <= 0 && a.cd <= 0 ? 1 : 0,
      lowest: Math.min(...grp.filter(m => Combat.dist(a.pos, m.pos) < 8).map(frac)), hurtN: grp.filter(m => m.state === 'down' || frac(m) < 0.6).length, hasTarget: !!t,
    };
  }
  // Doing the chosen move: starts a blow when it is ready, and returns a movement goal {x, z, run} (or null to stand)
  function execute(a, act, p) {
    const A = Policy.A, t = a.target, home = homeOf(a, p), toward = (e, run = true) => ({ x: e.pos.x, z: e.pos.z, run });
    const goHome = () => (Combat.dist(a.pos, home) > 1.0 ? { x: home.x, z: home.z, run: Combat.dist(a.pos, p.pos) > 6 } : null);
    if (act === A.guard) { a.guardT = 0.6; return null; }
    if (act === A.regroup) return goHome();
    if (act === A.kite) {
      const e = a.nearest; if (!e) return goHome();
      const d = Math.max(0.1, Combat.dist(a.pos, e.pos)), k = 3 / d;
      return { x: a.pos.x + (a.pos.x - e.pos.x) * k, z: a.pos.z + (a.pos.z - e.pos.z) * k, run: true };
    }
    if (act === A.heal) { if (a.cd <= 0) { begin(a, P.combos.scepterHeal[0], { dmg: 0 }); a.cd = 2.2; } return null; }
    if (act === A.area) { if (a.cd <= 0 && a.healCd <= 0) { begin(a, P.heavies.scepterHeal, { dmg: 0 }); a.cd = 1.2; a.healCd = 7; } return null; }
    if (!t) return goHome();
    const d = D(a, t), cls = a.cls, far = cls === 'archer' ? 9 : cls === 'cleric' ? 11 : 10;
    if (act === A.heavy) {
      if (cls === 'warrior' && d > 2.4) return toward(t);
      if (a.cd <= 0 && a.heavyCd <= 0) {
        const H = cls === 'warrior' ? P.heavy : cls === 'archer' ? P.heavies.bow : cls === 'mage' ? P.heavies.staff : P.heavies.scepter;
        begin(a, H); a.heavyCd = cls === 'warrior' ? 5 : cls === 'archer' ? 6 : cls === 'mage' ? 9 : 8; a.cd = 1.0;
      }
      return null;
    }
    // attack
    if (cls === 'warrior') { if (d < 2.3 && a.cd <= 0) { begin(a, P.light[a.shots++ % 3]); a.cd = 0.55; return null; } return d > 1.7 ? toward(t) : null; }
    if (cls === 'cleric') { if (a.cd <= 0 && d < far) { begin(a, P.combos.scepter[0]); a.cd = 1.6; return null; } return d > far ? toward(t) : null; }
    if (d > far) return toward(t);
    if (a.cd <= 0 && d > 1.6) { begin(a, cls === 'archer' ? P.combos.bow[0] : P.combos.staff[0]); a.cd = cls === 'archer' ? 1.0 : 1.3; }
    return null;
  }
  // Following comes first; in a fight the learned policy (or, with it off or missing, the rules) picks the move
  function think(a, p, dt) {
    const dp = Combat.dist(a.pos, p.pos), home = homeOf(a, p), noFight = Tutorial.active;
    a.cd -= dt; a.heavyCd -= dt; a.healCd -= dt; a.guardT -= dt; a.decT -= dt;
    if (dp > CP.far || a.state === 'attack' || noFight) return Combat.dist(a.pos, home) > 1.0 ? { x: home.x, z: home.z, run: dp > 6 } : null;
    a.target = pickTarget(a, p);
    if (a.decT <= 0 || a.act === undefined) {
      a.decT = 0.3; const s = stateOf(a, p), legal = Policy.legal(s);
      let act = Settings.get('learnedAI') !== false ? Policy.Learner.pick(learner(), s, undefined, !!(fight && fight.on)) : null;
      if (act == null || !legal[act]) act = Policy.classic(s);
      a.act = act;
    }
    return execute(a, a.act, p);
  }

  function update(dt) {
    const s = S(), p = G.player; if (!s || !p) return;
    if (!G.allies || G.allies.length !== s.party.length) sync();
    if (!G.allies || !G.allies.length) return;
    const dead = p.state === 'dead';
    trackFight(dt, p);
    for (const a of G.allies) {
      a.t += dt; a.hitT += dt;
      if (a.state === 'down') {                                                      // lies still until healed (or a while passes)
        a.downT += dt; if (a.downT > CP.downFor) revive(a, 0.25);
        a.rig.root.position.copy(a.pos); a.rig.root.rotation.y = a.facing;
        Rig.animate(a.rig, { mode: 'dead', t: a.downT, speed: 0, mps: 0, dirF: 1, dirS: 0, calm: false }, dt);
        continue;
      }
      if (a.state === 'free' && a.hitT > 5 && a.hp < a.maxHp) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.015 * dt);   // they catch their breath out of a fight
      if (Combat.dist(a.pos, p.pos) > CP.leash) {                                  // left behind (a gate, a fall): catch up
        const h = homeOf(a, p); a.pos.set(h.x, 0, h.z); FX.burst(new THREE.Vector3(a.pos.x, 0.3, a.pos.z), 0x9affc8, 10, 3, 0.4);
      }
      let goal = null, moving = 0;
      if (a.state === 'attack') {
        const k = a.atk; a.phaseT += dt;
        if (a.phase === 'wind' && a.phaseT >= k.wind) { a.phase = 'active'; a.phaseT = 0; }
        if (a.phase === 'active' && !a.struck && a.phaseT >= k.active * 0.5) { a.struck = true; strike(a); }
        if (a.phase === 'active' && a.phaseT >= k.active) { a.phase = 'recover'; a.phaseT = 0; }
        if (a.phase === 'recover' && a.phaseT >= k.recover) { a.state = 'free'; a.phase = null; a.atk = null; }
        if (a.target && Enemy.targetable(a.target) && a.phase === 'wind') a.facing += Combat.wrap(Combat.yawTo(a.pos, a.target.pos) - a.facing) * Math.min(1, 14 * dt);
      } else if (a.state === 'hurt') { a.hurtT -= dt; if (a.hurtT <= 0) a.state = 'free'; }
      else if (!dead) goal = think(a, p, dt);
      if (goal) {
        const dx = goal.x - a.pos.x, dz = goal.z - a.pos.z, dist = Math.hypot(dx, dz);
        if (dist > 0.05) {
          const sp = goal.run ? P.speed * 1.05 : P.speed * 0.8, step = Math.min(dist, sp * dt);
          a.pos.x += dx / dist * step; a.pos.z += dz / dist * step; moving = Math.min(1, sp / P.speed);
          a.facing += Combat.wrap(Math.atan2(dx, dz) - a.facing) * Math.min(1, 12 * dt);
          a.cycle += dt * (goal.run ? 10.5 : 7);
        }
      }
      // a little room around the warden, and inside the walls
      const sx = a.pos.x - p.pos.x, sz = a.pos.z - p.pos.z, sd = Math.hypot(sx, sz);
      if (sd < 1.0 && sd > 1e-4) { a.pos.x += sx / sd * (1.0 - sd) * 0.5; a.pos.z += sz / sd * (1.0 - sd) * 0.5; }
      World.constrain(a.pos, P.radius);
      a.speedK += (moving - a.speedK) * Math.min(1, 10 * dt);
      const r = a.rig; r.root.position.copy(a.pos); r.root.rotation.y = a.facing;
      const atk = a.state === 'attack' ? a.atk : null;
      Rig.animate(r, {
        mode: a.state === 'hurt' ? 'hurt' : atk ? 'attack' : a.guardT > 0 && a.state === 'free' ? 'block' : a.speedK > 0.08 ? 'move' : 'idle', t: a.t, speed: a.speedK, mps: a.speedK * P.speed, calm: G.mode === 'camp', cycle: a.cycle, blockT: 9, dirF: 1, dirS: 0,
        phaseT: a.phaseT, wind: atk && atk.wind, active: atk && atk.active, recover: atk && atk.recover, p: atk && a.phase === 'recover' ? a.phaseT / atk.recover : 0,
        atk: atk && atk.pose, phase: a.phase, windRate: atk ? 3.2 / atk.wind : 12,
      }, dt);
    }
    updateBars();
  }

  return { status, recruit, hurt, revive, restore, flask, forget, fights, exportData, dismiss, sync, clear, refit, update, chips, GLYPH, defs: DEFS, get max() { return CP.max; } };
})();
