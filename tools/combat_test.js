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
    const kill = () => { for (const e of G.enemies) if (e.state !== 'dead' && e.state !== 'spawn') { e.state = 'broken'; Enemy.receive(e, { dmg: 9999, posture: 0 }, G.player); } };
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
    out.sameSize = W.rooms.length === W.sections.length;
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
