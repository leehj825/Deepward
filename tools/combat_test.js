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
    await pg.evaluate(`__dw.setView('${view}'); __dw.start(); __dw.G.queue = []; __dw.G.player.pos.set(0, 0, 4); __dw.G.player.facing = Math.PI; __dw.G.wave = 99; __dw.G.between = true; __dw.G.waveT = 999;`);
    const r = await pg.evaluate(code);
    const ok = CHECKS[name](r) && !errs.length;
    if (!ok) fails++;
    console.log((ok ? 'PASS ' : 'FAIL ') + view.padEnd(7) + name.padEnd(12) + JSON.stringify(r) + (errs.length ? '  errors: ' + errs.join(' | ') : ''));
    await pg.close();
  }
  await b.close();
  process.exit(fails ? 1 : 0);
})();
