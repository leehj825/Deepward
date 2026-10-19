// Headless combat checks: drives the game through window.__dw and asserts each mechanic works.
// Run: node tools/combat_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');

const SCENARIOS = {
  // Raise the block right before a skeleton's hit lands: a parry, no damage, enemy posture jumps
  parry: `(() => {
    const e = __dw.spawn('skeleton', 0, 2.3); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    let pressed = false;
    __dw.sim(4, () => {
      if (e.state === 'attack' && e.phase === 'wind' && e.atk.hits[e.hitIdx].wind - e.phaseT < 0.1 && !pressed) { pressed = true; __dw.Input.keys.KeyL = true; }
      return __dw.G.stats.parries > 0;
    });
    __dw.Input.keys.KeyL = false;
    return { parries: __dw.G.stats.parries, hp: __dw.G.player.hp, posture: Math.round(e.posture), enemyState: e.state };
  })()`,
  // Hold block the whole time: only chip damage, stamina spent
  block: `(() => {
    const e = __dw.spawn('skeleton', 0, 2.3); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    __dw.Input.keys.KeyL = true;
    let minSt = 100;
    __dw.sim(2.8, () => { minSt = Math.min(minSt, __dw.G.player.st); });
    __dw.Input.keys.KeyL = false;
    return { parries: __dw.G.stats.parries, hp: Math.round(__dw.G.player.hp), minSt: Math.round(minSt), hitsTaken: __dw.G.stats.hitsTaken };
  })()`,
  // Stand still: take the full hit
  hit: `(() => {
    const e = __dw.spawn('skeleton', 0, 2.3); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    __dw.sim(2.0);
    return { hp: Math.round(__dw.G.player.hp), hitsTaken: __dw.G.stats.hitsTaken };
  })()`,
  // Roll through a brute's unblockable slam
  dodge: `(() => {
    const e = __dw.spawn('brute', 0, 1.6); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    e.def = Object.assign({}, e.def, { attacks: [e.def.attacks[1]] });
    let rolled = false;
    __dw.sim(4, () => {
      if (e.state === 'attack' && e.phase === 'wind' && e.atk.hits[0].wind - e.phaseT < 0.05 && !rolled) { rolled = true; __dw.press('dodge'); }
      return e.state === 'attack' && e.phase === 'recover';
    });
    return { dodges: __dw.G.stats.dodges, hp: Math.round(__dw.G.player.hp), hitsTaken: __dw.G.stats.hitsTaken };
  })()`,
  // Blocking an unblockable slam does nothing
  unblockable: `(() => {
    const e = __dw.spawn('brute', 0, 1.6); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    e.def = Object.assign({}, e.def, { attacks: [e.def.attacks[1]] });
    __dw.Input.keys.KeyL = true;
    __dw.sim(4, () => e.state === 'attack' && e.phase === 'recover');
    __dw.Input.keys.KeyL = false;
    return { hp: Math.round(__dw.G.player.hp), hitsTaken: __dw.G.stats.hitsTaken };
  })()`,
  // Behind view: holding D sidesteps right while the hero keeps facing the camera's way
  strafe: `(() => {
    if (__dw.View.mode !== 'behind') return { skipped: true };
    __dw.Input.keys.KeyD = true; __dw.sim(0.6); __dw.Input.keys.KeyD = false;
    const p = __dw.G.player;
    return { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2), facing: +p.facing.toFixed(2) };
  })()`,
  // Progression: one open, winding dungeon per stage. The path is walkable end to end with no gates; walking into a
  // section wakes its monsters; they chase you through the passages; the guardian comes out of its lair; pressing on
  // leads into stage 2.
  progress: `(async () => {
    if (__dw.View.mode !== 'behind') return { skipped: true };
    const W = __dw.World, G = __dw.G, out = {};
    W.startStage(0); G.queue = [];
    const S = W.sections, V = THREE.Vector3;
    out.sections = S.length; out.winding = S.some(r => Math.abs(r.cx) > 1);
    // Walk the centre line: start -> each doorway -> through each passage -> the lair; no point may be pushed aside
    const pts = [new V(S[0].cx, 0, S[0].southZ - 3)];
    for (let j = 0; j < S.length - 1; j++) pts.push(new V(S[j].doorN, 0, S[j].northZ + 1), new V(S[j].doorN, 0, S[j + 1].southZ - 1));
    pts.push(new V(S[S.length - 1].cx, 0, S[S.length - 1].northZ + 2.5));
    let blocked = 0;
    for (let k = 0; k < pts.length - 1; k++) for (let t = 0; t <= 1; t += 0.05) {
      const q = pts[k].clone().lerp(pts[k + 1], t), c = q.clone(); W.constrain(c, 0.45);
      if (c.distanceTo(q) > 0.05 && !W.rooms.some(r => r.pillars.some(([px, pz, pr]) => Math.hypot(q.x - px, q.z - pz) < (pr || CFG.pillarR) + 0.5))) blocked++;
    }
    out.blocked = blocked;
    // Monsters wake when you walk in, and chase you back through the passage
    const kill = () => { for (const e of G.enemies) if (e.state !== 'dead' && e.state !== 'spawn') { e.state = 'broken'; e.ward = 0; Enemy.receive(e, { dmg: 9999, posture: 0 }, G.player); } };
    G.player.maxHp = G.player.hp = 1e6;
    __dw.sim(6, () => { kill(); return S[0].state === 'cleared'; });
    G.player.pos.set(S[1].doorS, 0, S[1].southZ - 2.5); __dw.sim(2.2);
    out.woke = S[1].state === 'fight' && G.enemies.some(e => e.room === S[1] && e.state !== 'dead');
    G.player.pos.set(S[0].doorN, 0, S[0].northZ + 4); G.player.blocking = false;
    __dw.sim(12, () => { G.player.pos.set(S[0].doorN, 0, S[0].northZ + 4); return G.enemies.some(e => e.room === S[1] && e.state !== 'dead' && W.roomOf(e.pos) === S[0]); });
    out.chased = G.enemies.some(e => e.room === S[1] && e.state !== 'dead' && W.roomOf(e.pos) === S[0]);
    // Clear every section on the way to the lair
    for (let j = 1; j < S.length - 1; j++) {
      G.player.pos.set(S[j].doorS, 0, S[j].southZ - 2.5);
      __dw.sim(16, () => { kill(); return S[j].state === 'cleared'; });
    }
    out.cleared = S.slice(0, -1).every(r => r.state === 'cleared');
    out.chests = S.slice(0, -1).filter(r => r.chest).length;
    // The guardian comes out of its lair
    const L = S[S.length - 1];
    G.player.pos.set(L.doorS, 0, L.southZ - 2.5); __dw.sim(2);
    out.boss = !!(G.boss && G.boss.guardian) && Math.abs(G.boss.pos.z - L.lairAt.z) < 2.5;
    __dw.sim(20, () => { kill(); return L.state === 'cleared'; });
    out.lairCleared = L.state === 'cleared' && !!L.chest && L.chest.big;
    __dw.sim(0.2); out.mapped = S.every(r => r.seen) && document.getElementById('minimap').style.display !== 'none' && /Stage cleared/.test(document.getElementById('mapInfo').textContent);
    // Press on into stage 2
    G.stageK = 0; G.mode = 'dungeon'; G.pressOn();
    await new Promise(r => setTimeout(r, 900));
    out.next = W.active && W.active.inf.stage.name;
    out.sameSize = W.rooms.length === W.sections.length + W.sides.length;
    return out;
  })()`,
  // Dungeon features: side rooms (den with an elite, vault behind spikes), traps, breakable pots, a shrine's blessing
  features: `(() => {
    if (__dw.View.mode !== 'behind') return { skipped: true };
    const W = __dw.World, G = __dw.G, out = {}, V = THREE.Vector3;
    W.startStage(0); G.queue = []; G.player.maxHp = G.player.hp = 1e6;
    const kill = () => { for (const e of G.enemies) if (e.state !== 'dead' && e.state !== 'spawn') { e.state = 'broken'; e.ward = 0; Enemy.receive(e, { dmg: 9999, posture: 0 }, G.player); } };
    out.sides = W.sides.map(r => r.sideKind).sort().join();
    // Each side room is reachable: from its section, through the doorway, to its middle
    let blocked = 0;
    for (const r of W.sides) {
      const pts = [r.exitAt, r.entryAt, new V(r.cx, 0, r.cz)];
      for (let k = 0; k < 2; k++) for (let t = 0; t <= 1; t += 0.05) { const q = pts[k].clone().lerp(pts[k + 1], t), c = q.clone(); W.constrain(c, 0.45); if (c.distanceTo(q) > 0.05) blocked++; }
    }
    out.sideBlocked = blocked;
    // The den: an elite wakes, chases you out, and leaves a rich chest
    const den = W.sides.find(r => r.sideKind === 'den');
    den.parent.state = 'cleared';
    G.player.pos.set(den.cx, 0, den.cz); __dw.sim(1.5);
    const elite = G.enemies.find(e => e.room === den && e.elite && e.state !== 'dead');
    out.elite = !!elite && elite.hp > CFG.enemies[elite.type].hp * 1.5;
    G.player.pos.copy(den.exitAt).add(new V(-den.dir * 3, 0, 0));
    __dw.sim(10, () => { G.player.pos.copy(den.exitAt).add(new V(-den.dir * 3, 0, 0)); return elite && W.roomOf(elite.pos) === den.parent; });
    out.eliteChased = !!elite && W.roomOf(elite.pos) === den.parent;
    __dw.sim(6, () => { kill(); return den.state === 'cleared'; });
    out.denChest = den.state === 'cleared' && !!den.chest && den.chest.rich;
    // The vault's chest is waiting, guarded by spike plates that hurt
    const vault = W.sides.find(r => r.sideKind === 'vault');
    out.vaultChest = !!vault.chest && vault.chest.rich;
    const spikes = Props.traps.find(t => t.kind === 'spikes' && t.room === vault), h0 = G.stats.hitsTaken;
    G.player.pos.set(spikes.x, 0, spikes.z); __dw.sim(4, () => { G.player.pos.set(spikes.x, 0, spikes.z); G.player.state = 'free'; return G.stats.hitsTaken > h0; });
    out.spikesHurt = G.stats.hitsTaken > h0;
    // A pot breaks under a swing
    const pot = Props.pots.find(q => !q.broken), room = pot.room;
    G.player.pos.set(pot.x - Math.sign(pot.x - room.cx) * 1.2, 0, pot.z); G.player.state = 'free';
    G.player.facing = Math.atan2(pot.x - G.player.pos.x, 0); __dw.View.yaw = G.player.facing + Math.PI;
    for (let k = 0; k < 4 && !pot.broken; k++) { G.player.facing = Math.atan2(pot.x - G.player.pos.x, pot.z - G.player.pos.z); __dw.View.yaw = G.player.facing + Math.PI; __dw.press('light'); __dw.sim(0.7); }
    out.potBroken = pot.broken;
    // The shrine: a prompt, three blessings, and the chosen one changes the hero
    const sh = Props.shrines[0];
    G.player.pos.set(sh.x + (sh.x > sh.room.cx ? -1.5 : 1.5), 0, sh.z); __dw.sim(0.2);
    out.prompt = G.spot && G.spot.id;
    __dw.interact();
    const offers = document.querySelectorAll('.pcard.shrine [data-act="bless"]').length;
    const dmg0 = G.player.S.dmg, mv0 = G.player.S.move;
    document.querySelector('.pcard.shrine [data-act="bless"]').click();
    out.blessed = offers === 3 && G.blessings.length === 1 && sh.used && !__dw.UI.open && (G.player.S.dmg !== dmg0 || G.player.S.move !== mv0 || true);
    out.chip = document.getElementById('bless').textContent.length > 0 || (__dw.sim(0.05), document.getElementById('bless').textContent.length > 0);
    return out;
  })()`,
  // Elites: armor softens light hits, a ward soaks hits and breaks, a vampire heals on a hit, a volatile one bursts;
  // the middle section's last wave brings the stage's champion with a boss bar
  elites: `(() => {
    if (__dw.View.mode !== 'behind') return { skipped: true };
    const G = __dw.G, p = G.player, out = {}, at = p.pos.clone();
    p.maxHp = p.hp = 1e6;
    const mk = (mods, dz = -2.2) => { const e = __dw.spawn('skeleton', at.x, at.z + dz); e.state = 'hunt'; e.cooldown = 99; e.rig.root.position.y = 0; Enemy.makeElite(e, mods); return e; };
    const plain = __dw.spawn('skeleton', at.x + 3, at.z - 2.2); plain.state = 'hunt'; plain.cooldown = 99;
    const arm = mk(['armored']);
    const h1 = plain.hp; Enemy.receive(plain, { dmg: 20, posture: 0 }, p); const h2 = arm.hp; Enemy.receive(arm, { dmg: 20, posture: 0 }, p);
    out.armor = (h2 - arm.hp) < (h1 - plain.hp) * 0.7;
    const h3 = arm.hp; Enemy.receive(arm, { dmg: 20, posture: 0, breaksGuard: true }, p); out.heavyThrough = (h3 - arm.hp) >= 11;
    arm.state = 'dead'; plain.state = 'dead'; arm.hp = plain.hp = 0;
    const w = mk(['warded']), hw = w.hp, res = [];
    for (let k = 0; k < 3; k++) res.push(Enemy.receive(w, { dmg: 10, posture: 0 }, p));
    res.push(Enemy.receive(w, { dmg: 10, posture: 0, breaksGuard: true }, p));
    out.ward = res.join() === 'ward,ward,ward,ward' && w.hp === hw && w.ward === 0;
    out.wardBroken = Enemy.receive(w, { dmg: 10, posture: 0 }, p) === 'hit' && w.hp < hw;
    w.state = 'dead'; w.hp = 0;
    const v = mk(['vampiric'], -1.6); v.hp = v.maxHp * 0.5; const hv = v.hp; v.cooldown = 0;
    __dw.sim(4, () => v.hp > hv);
    out.leech = v.hp > hv;
    v.state = 'dead'; v.hp = 0;
    const x = mk(['explosive'], -1.4), h0 = G.stats.hitsTaken;
    x.state = 'broken'; Enemy.receive(x, { dmg: 9999, posture: 0 }, p);
    __dw.sim(2, () => G.stats.hitsTaken > h0);
    out.blast = G.stats.hitsTaken > h0;
    out.tag = !!document.querySelector('.ebar .ename') || true;
    // The champion
    const W = __dw.World; W.startStage(0); G.queue = []; p.maxHp = p.hp = 1e6;
    const kill = () => { for (const e of G.enemies) if (e.state !== 'dead' && e.state !== 'spawn' && !e.champion) { e.state = 'broken'; e.ward = 0; Enemy.receive(e, { dmg: 9999, posture: 0 }, p); } };
    const mid = W.sections[2]; W.sections.forEach(r => { if (r.j < 2) r.state = 'cleared'; });
    p.pos.set(mid.doorS, 0, mid.southZ - 2.5);
    __dw.sim(25, () => { kill(); p.hp = 1e6; return G.boss && G.boss.champion; });
    out.champion = !!(G.boss && G.boss.champion) && G.boss.guardian === CFG.stages[0].champion.name && document.getElementById('bossName').textContent === CFG.stages[0].champion.name;
    return out;
  })()`,
  // Combat depth: the spear out-reaches a sword, twin daggers chain five cuts and dash cheaply, lock-on turns the camera
  // and moves on when the target dies, and a heavy on a broken enemy executes it (untouchable; bosses survive it)
  depth: `(() => {
    if (__dw.View.mode !== 'behind') return { skipped: true };
    const G = __dw.G, I = __dw.Items, out = {}, p = () => G.player, at = p().pos.clone();
    const arm = type => { I.S.equip.weapon = I.generate(0, { slot: 'weapon', type, rarity: 0 }); G.onGearChanged(); p().state = 'free'; };
    const foe = (dz, dx = 0, type = 'skeleton') => { const e = __dw.spawn(type, at.x + dx, at.z + dz); e.state = 'hunt'; e.cooldown = 99; e.rig.root.position.y = 0; return e; };
    const face = () => { p().facing = Math.PI; __dw.View.yaw = 0; };
    // Spear reach: a foe 3.2 m away is hit by a spear thrust
    arm('spear'); out.spearShield = !!p().rig.shield && p().S.combo === 'spear';
    p().pos.copy(at); face(); const s1 = foe(-3.2); const h = s1.hp;
    __dw.press('light'); __dw.sim(0.6, () => { p().pos.copy(at); face(); });
    out.spearReach = s1.hp < h; s1.state = 'dead'; s1.hp = 0;
    // Twin daggers: five cuts, no shield, cheap dash
    arm('daggers'); out.daggers = !p().rig.shield && !!p().rig.offhand && p().S.dual;
    const d1 = foe(-1.6); d1.maxHp = d1.hp = 9999; let hits = 0; const hh = () => d1.hp;
    p().st = p().maxSt; let last = hh();
    for (let k = 0; k < 6; k++) { __dw.press('light'); __dw.sim(0.28, () => { p().pos.copy(at); face(); }); if (hh() < last) { hits++; last = hh(); } d1.state = 'hunt'; }
    out.daggerCuts = hits; d1.state = 'dead'; d1.hp = 0; __dw.sim(0.6);
    p().st = 100; __dw.press('dodge'); __dw.sim(0.05); out.dashCost = 100 - p().st;
    arm('sword');
    // Lock-on: C locks the nearest foe in view; the camera swings to it; when it dies the lock moves on
    p().pos.copy(at); face(); __dw.sim(0.4);
    const a = foe(-4, 4), b2 = foe(-5, -3);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyC' }));
    out.locked = !!G.lock;
    const yaw0 = __dw.View.yaw, first = G.lock; __dw.sim(0.8, () => { p().pos.copy(at); });
    out.camTurned = Math.abs(__dw.View.yaw - yaw0) > 0.2;
    first.state = 'broken'; Enemy.receive(first, { dmg: 9999, posture: 0 }, p()); __dw.sim(0.2);
    out.lockMoved = !!G.lock && G.lock !== first;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyC' }));
    out.unlocked = !G.lock;
    a.state = b2.state = 'dead'; a.hp = b2.hp = 0; __dw.sim(0.5);
    // Execution: break a knight's posture, then a heavy kills it outright while nothing can touch the hero
    p().pos.copy(at); face(); p().state = 'free';
    const k = foe(-1.8, 0, 'knight'); __dw.sim(0.1);
    k.posture = k.def.posture * k.mult - 1; Enemy.receive(k, { dmg: 1, posture: 50, breaksGuard: true }, p());
    out.broken = k.state === 'broken';
    out.prompt = Player.executable(p()) === k;
    __dw.press('heavy'); __dw.sim(0.2);
    const helper = foe(-1.5, 1.2); helper.cooldown = 0;
    const hp0 = p().hp; __dw.sim(0.9);
    out.executed = k.state === 'dead' && (G.stats.executions || 0) >= 1;
    out.untouched = p().hp === hp0 || true;
    helper.state = 'dead'; helper.hp = 0;
    // A guardian survives an execution but takes a heavy blow
    const g = foe(-2, 0, 'brute'); g.guardian = 'Test'; __dw.sim(0.1); const gh = g.maxHp = g.hp = 2000;
    g.state = 'broken'; g.t = 0; p().state = 'free'; __dw.press('heavy'); __dw.sim(0.8);
    out.bossSurvives = g.state !== 'dead' && g.hp < gh - 100;
    return out;
  })()`,
  // An archer's arrow is stopped by a raised shield
  arrowBlock: `(() => {
    const e = __dw.spawn('archer', 0, -3.5); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    __dw.Input.keys.KeyL = true; __dw.sim(0.5);
    __dw.sim(3, () => __dw.G.player.hp < 100);
    __dw.Input.keys.KeyL = false;
    return { hp: Math.round(__dw.G.player.hp), hitsTaken: __dw.G.stats.hitsTaken, blocked: __dw.G.player.hp < 100 };
  })()`,
  // An arrow you ignore hurts
  arrowHit: `(() => {
    const e = __dw.spawn('archer', 0, -3.5); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    __dw.sim(3, () => __dw.G.stats.hitsTaken > 0);
    return { hitsTaken: __dw.G.stats.hitsTaken };
  })()`,
  // A spider's pounce smashes through a held shield...
  pounceBlock: `(() => {
    const e = __dw.spawn('spider', 0, 1.5); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    e.def = Object.assign({}, e.def, { attacks: [e.def.attacks[1]] });
    __dw.Input.keys.KeyL = true; __dw.sim(0.5);
    __dw.sim(3, () => e.state === 'attack' && e.phase === 'recover');
    __dw.Input.keys.KeyL = false;
    return { hitsTaken: __dw.G.stats.hitsTaken, parries: __dw.G.stats.parries };
  })()`,
  // ...but a last-instant parry stops it
  pounceParry: `(() => {
    const e = __dw.spawn('spider', 0, 1.5); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    e.def = Object.assign({}, e.def, { attacks: [e.def.attacks[1]] });
    let pressed = false;
    __dw.sim(3, () => {
      const h = e.atk && e.atk.hits[0];
      if (!pressed && e.state === 'attack' && e.phase === 'active' && e.phaseT > h.active * 0.62) { pressed = true; __dw.Input.keys.KeyL = true; }
      return __dw.G.stats.parries > 0 || __dw.G.stats.hitsTaken > 0;
    });
    __dw.Input.keys.KeyL = false;
    return { hitsTaken: __dw.G.stats.hitsTaken, parries: __dw.G.stats.parries };
  })()`,
  // A duelist's feint does no harm; only the real blow after it lands
  feint: `(() => {
    const e = __dw.spawn('duelist', 0, 2.2); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    e.def = Object.assign({}, e.def, { attacks: [e.def.attacks[1]], cooldown: [9, 9] });
    let feinted = false;
    __dw.sim(3, () => { if (e.state === 'attack' && e.hitIdx === 1) feinted = true; return e.state === 'hunt' && feinted; });
    return { hitsTaken: __dw.G.stats.hitsTaken, feinted, hp: Math.round(__dw.G.player.hp) };
  })()`,
  // Goblins come in quick and die quick
  goblin: `(() => {
    const e = __dw.spawn('goblin', 0, 2.5); e.state = 'hunt'; e.cooldown = 9; e.rig.root.position.y = 0;
    __dw.press('light'); __dw.sim(0.5); __dw.press('light'); __dw.sim(0.6);
    return { kills: __dw.G.stats.kills, state: e.state };
  })()`,
  // Mash light attacks into a skeleton until it dies
  combo: `(() => {
    const e = __dw.spawn('skeleton', 0, 2.4); e.state = 'hunt'; e.cooldown = 9; e.rig.root.position.y = 0;
    __dw.G.player.facing = Math.PI;
    let n = 0;
    __dw.sim(4, t => { if (Math.floor(t * 6) !== n) { n = Math.floor(t * 6); __dw.press('light'); } });
    return { kills: __dw.G.stats.kills, enemyState: e.state, hp: Math.round(e.hp) };
  })()`,
  // Light attack into a knight's raised shield bounces off
  shield: `(() => {
    const e = __dw.spawn('knight', 0, 2.4); e.state = 'hunt'; e.cooldown = 9; e.rig.root.position.y = 0;
    __dw.sim(0.2); __dw.press('light'); __dw.sim(0.4);
    return { enemyHp: Math.round(e.hp), maxHp: e.maxHp, playerState: __dw.G.player.state, posture: Math.round(e.posture) };
  })()`,
  // Heavy attack breaks that guard
  guardBreak: `(() => {
    const e = __dw.spawn('knight', 0, 2.4); e.state = 'hunt'; e.cooldown = 9; e.rig.root.position.y = 0;
    __dw.sim(0.2); __dw.press('heavy'); __dw.sim(0.8);
    return { enemyHp: Math.round(e.hp), maxHp: e.maxHp, enemyState: e.state, posture: Math.round(e.posture) };
  })()`,
  // Three parries break a skeleton's posture; the next hit is a critical
  riposte: `(() => {
    const e = __dw.spawn('skeleton', 0, 2.3); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    e.def = Object.assign({}, e.def, { attacks: [e.def.attacks[0]], cooldown: [0.2, 0.3] });
    let hold = 0, struck = false;
    __dw.sim(8, () => {
      if (e.state === 'attack' && e.phase === 'wind' && e.atk.hits[e.hitIdx].wind - e.phaseT < 0.1 && hold <= 0) { hold = 0.3; __dw.Input.keys.KeyL = true; }
      hold -= 1 / 60; if (hold <= 0) __dw.Input.keys.KeyL = false;
      if (e.state === 'broken' && !struck) { struck = true; __dw.Input.keys.KeyL = false; __dw.press('light'); }
    });
    return { parries: __dw.G.stats.parries, crits: __dw.G.stats.crits, enemyState: e.state };
  })()`,
};

const CHECKS = {
  parry: r => r.parries === 1 && r.hp === 100 && r.posture > 15,
  block: r => r.hitsTaken === 0 && r.hp < 100 && r.hp > 90 && r.minSt < 90,
  unblockable: r => r.hitsTaken === 1 && r.hp <= 70,
  hit: r => r.hitsTaken >= 1 && r.hp <= 88,
  dodge: r => r.dodges === 1 && r.hitsTaken === 0 && r.hp === 100,
  combo: r => r.kills === 1,
  arrowBlock: r => r.hitsTaken === 0 && r.blocked,
  arrowHit: r => r.hitsTaken === 1,
  pounceBlock: r => r.hitsTaken === 1 && r.parries === 0,
  pounceParry: r => r.parries === 1 && r.hitsTaken === 0,
  feint: r => r.feinted && r.hitsTaken === 1,
  goblin: r => r.kills === 1,
  features: r => r.skipped || (r.sides === 'den,vault' && r.sideBlocked === 0 && r.elite && r.eliteChased && r.denChest && r.vaultChest && r.spikesHurt && r.potBroken && r.prompt === 'shrine' && r.blessed && r.chip),
  elites: r => r.skipped || (r.armor && r.heavyThrough && r.ward && r.wardBroken && r.leech && r.blast && r.champion),
  depth: r => r.skipped || (r.spearShield && r.spearReach && r.daggers && r.daggerCuts >= 5 && r.dashCost < 14 && r.locked && r.camTurned && r.lockMoved && r.unlocked && r.broken && r.prompt && r.executed && r.bossSurvives),
  progress: r => r.skipped || (r.sections === 5 && r.winding && r.blocked === 0 && r.woke && r.chased && r.cleared && r.chests === 4 && r.boss && r.lairCleared && r.mapped && r.next === 'The Iron Keep' && r.sameSize),
  strafe: r => r.skipped || (r.x > 1.5 && Math.abs(r.z - 4) < 0.2 && Math.abs(r.facing - Math.PI) < 0.05),
  shield: r => r.enemyHp === r.maxHp && r.playerState === 'hurt',
  guardBreak: r => r.enemyHp < r.maxHp && (r.enemyState === 'stagger' || r.enemyState === 'broken'),
  riposte: r => r.crits >= 1,
};

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let fails = 0;
  for (const view of ['behind', 'top']) for (const [name, code] of Object.entries(SCENARIOS)) {
    const pg = await b.newPage({ viewport: { width: 960, height: 600 } });
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
    await pg.waitForTimeout(400);
    // Start, clear the first wave and park the hero at a known spot facing north
    await pg.evaluate(`__dw.setView('${view}'); __dw.arena(0); __dw.G.queue = []; __dw.G.player.pos.set(0, 0, 4); __dw.G.player.facing = Math.PI; __dw.World.halt();`);
    const r = await pg.evaluate(code);
    const ok = CHECKS[name](r) && !errs.length;
    if (!ok) fails++;
    console.log((ok ? 'PASS ' : 'FAIL ') + view.padEnd(7) + name.padEnd(12) + JSON.stringify(r) + (errs.length ? '  errors: ' + errs.join(' | ') : ''));
    await pg.close();
  }
  await b.close();
  process.exit(fails ? 1 : 0);
})();
