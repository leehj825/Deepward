// Balance bot: a scripted warden plays every stage (and some Endless floors) at a set skill level, with gear and
// levels typical for how far a player would have come, and reports deaths, time, damage taken and flasks per stage.
// Run: node tools/balance.js [casual|skilled|both] [endlessFloors]   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
const who = process.argv[2] || 'both', floors = +(process.argv[3] || 6);
const PROFILES = {
  // chance to parry / block / dash a telegraphed blow in time, and to answer a parry-only pounce with a parry
  casual: { parry: 0.12, block: 0.7, dash: 0.55, pounce: 0.35, aggro: 0.6 },
  skilled: { parry: 0.45, block: 0.95, dash: 0.88, pounce: 0.75, aggro: 0.85 },
};
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 800, height: 500 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
  await pg.waitForTimeout(300);
  await pg.evaluate(() => {
    // ---------------- The bot ----------------
    window.Bot = (() => {
      const G = __dw.G, W = __dw.World, In = __dw.Input;
      let prof, plan = new Map(), m;
      const press = a => __dw.press(a);
      function threat(p) {
        // The soonest blow that will reach the hero: an enemy winding up near enough, or an arrow on its way
        let best = null;
        for (const e of G.enemies) {
          if (e.state !== 'attack' || !e.atk) continue;
          const h = e.atk.hits[e.hitIdx], d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
          const reach = h.aoe ? h.aoe.fwd + h.aoe.r + 0.8 : h.projectile ? 99 : h.range + (h.lunge || 0) + 0.9;
          if (d > reach || h.feint) continue;
          const tt = e.phase === 'wind' ? h.wind - e.phaseT + h.active * (h.leap ? 0.8 : 0.5) : e.phase === 'active' ? h.active * (h.leap ? 0.8 : 0.5) - e.phaseT : 99;
          if (tt < 0 || tt > 1.2) continue;
          if (!best || tt < best.tt) best = { e, h, tt, key: e.atk === undefined ? 0 : e.atk + ':' + e.hitIdx + ':' + Math.round(G.time * 0) };
        }
        return best;
      }
      function decide(t) {
        const r = Math.random();
        if (t.h.unblockable) return r < prof.dash ? 'dash' : 'none';
        if (t.h.parryOnly) return r < prof.pounce ? 'parry' : r < prof.pounce + (1 - prof.pounce) * prof.dash ? 'dash' : 'block';
        if (r < prof.parry) return 'parry';
        return r < prof.parry + (1 - prof.parry) * prof.block ? 'block' : 'none';
      }
      function step() {
        const p = G.player; if (!p || G.state !== 'play') return;
        if (p.state === 'dead') { m.deaths++; p.hp = p.maxHp; p.state = 'free'; p.flasks = p.S.flasks; return; }
        In.stick.x = In.stick.z = 0; In.touchBlock = false;
        if (p.hp < m.lastHp) m.taken += m.lastHp - p.hp; m.lastHp = p.hp;
        const t = threat(p);
        if (t) {
          const id = t.e.atk.hits ? t.e.uid + ':' + t.e.atkN + ':' + t.e.hitIdx : '';
          if (!t.e.uid) t.e.uid = Math.random();
          if (t.e.phase === 'wind' && t.e.phaseT < 0.05) t.e.atkN = (t.e.atkN || 0) + (t.e._seen === t.e.atk ? 0 : 1), t.e._seen = t.e.atk;
          const key = t.e.uid + ':' + t.e.atkN + ':' + t.e.hitIdx;
          if (!plan.has(key)) plan.set(key, decide(t));
          const a = plan.get(key);
          if (a === 'parry' && t.tt < 0.14) In.touchBlock = true;
          else if (a === 'block' && t.tt < 0.45) In.touchBlock = true;
          else if (a === 'dash' && t.tt < 0.16 && p.state === 'free') { const s = Math.atan2(t.e.pos.x - p.pos.x, t.e.pos.z - p.pos.z) + Math.PI / 2; In.stick.x = Math.sin(s); In.stick.z = Math.cos(s); press('dodge'); }
          if (In.touchBlock || a === 'dash') return;
        }
        // Keep the parry window honest: let go of block between blows
        if (p.hp < p.maxHp * 0.35 && p.flasks > 0 && (!t || t.tt > 0.9)) { if (Player.drink(p)) m.flasks++; return; }
        // Fight: the nearest foe; execute the broken; heavy at shield knights
        let foe = null, fd = 1e9;
        for (const e of G.enemies) { if (!Enemy.targetable(e)) continue; const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < fd) { fd = d; foe = e; } }
        if (foe && fd < 14) {
          const via = W.route(p.pos, foe.pos), goal = via || foe.pos;
          if (Player.executable(p)) { press('heavy'); return; }
          if (fd > foe.def.radius + 1.6 || via) { const a = Math.atan2(goal.x - p.pos.x, goal.z - p.pos.z); In.stick.x = Math.sin(a); In.stick.z = Math.cos(a); }
          else if (p.st > 25 && Math.random() < prof.aggro * 0.25) press(foe.def.guard && Math.random() < 0.5 ? 'heavy' : 'light');
          return;
        }
        // Walk on: to the next section that is not cleared (and the den once its section is)
        const S = W.sections, next = S.find(r => r.state !== 'cleared');
        const den = W.sides.find(r => r.sideKind === 'den' && r.state !== 'cleared' && r.parent.state === 'cleared');
        const tgt = den ? new THREE.Vector3(den.cx, 0, den.cz) : next ? (next.lair && next.lairAt ? next.lairAt : new THREE.Vector3(next.cx, 0, next.cz)) : null;
        if (!tgt) return;
        const via = W.route(p.pos, tgt), goal = via || tgt, a = Math.atan2(goal.x - p.pos.x, goal.z - p.pos.z);
        if (Math.hypot(goal.x - p.pos.x, goal.z - p.pos.z) > 0.6) { In.stick.x = Math.sin(a); In.stick.z = Math.cos(a); }
        // Stuck on something (a pot, a pillar): wiggle free
        m.stuckT = (m.stuckT || 0) + 1 / 60;
        if (m.stuckT > 4) { if (p.pos.distanceTo(m.at || p.pos) < 0.5) { m.stuck++; m.wiggle = 1; m.wa = Math.random() * 6.28; } m.at = p.pos.clone(); m.stuckT = 0; }
        if (m.wiggle > 0) { m.wiggle -= 1 / 60; In.stick.x = Math.sin(m.wa); In.stick.z = Math.cos(m.wa); }
      }
      function begin(profile) { prof = profile; plan = new Map(); m = { deaths: 0, taken: 0, flasks: 0, stuck: 0, lastHp: G.player.hp }; }
      return { begin, step, get m() { return m; } };
    })();
    // A hero geared and levelled as a player would be on reaching stage k
    window.outfit = k => {
      const I = __dw.Items, S = I.S, tier = Math.min(k, 6), rar = k >= 2 ? 1 : 0;
      S.level = 1 + 2 * k; S.xp = 0; S.camp = { forge: Math.min(3, k), apothecary: Math.min(3, k), yard: Math.min(3, k) };
      for (const slot of ['weapon', 'shield', 'armor', 'helm']) { const it = I.generate(tier, { slot, type: slot === 'weapon' ? 'sword' : undefined, rarity: rar }); it.plus = Math.min(k, 4); it.gems = []; S.equip[slot] = it; }
      S.talents = {}; S.points = 0; for (const id of ['steady', 'keen', 'riposte', 'steady', 'keen', 'riposte', 'precision', 'precision', 'fury'].slice(0, Math.min(9, 2 * k))) S.talents[id] = (S.talents[id] || 0) + 1;
      __dw.G.onGearChanged(); __dw.G.player.hp = __dw.G.player.maxHp; __dw.G.player.flasks = __dw.G.player.S.flasks;
    };
    window.runStage = (kind, k, profile) => {
      const G = __dw.G, W = __dw.World;
      if (kind === 'stage') { W.startStage(k); G.stageK = k; }
      G.mode = 'dungeon'; G.state = 'play'; G.blessings = []; G.queue = [];
      const at = { x: W.sections[0].cx, z: W.sections[0].southZ - 3 }; G.player.pos.set(at.x, 0, at.z);
      Bot.begin(profile); const st0 = Object.assign({}, G.stats), t0 = G.time;
      const out = {};
      let lair = null;
      __dw.sim(900, () => {
        Bot.step();
        if (!out.champ && G.boss && G.boss.champion) out.champ = G.time;
        if (out.champ && !out.champDone && G.boss === null) out.champDone = G.time - out.champ;
        if (!lair && G.boss && G.boss.guardian && !G.boss.champion) { lair = G.time; out.bossDeaths0 = Bot.m.deaths; }
        if (W.sections.every(r => r.state === 'cleared')) return true;
        if (__dw.UI.open) __dw.UI.close();
      });
      out.time = Math.round(G.time - t0); out.deaths = Bot.m.deaths; out.taken = Math.round(Bot.m.taken); out.flasks = Bot.m.flasks; out.stuck = Bot.m.stuck;
      out.parries = G.stats.parries - st0.parries; out.hits = G.stats.hitsTaken - st0.hitsTaken;
      out.boss = lair ? Math.round(G.time - lair) + 's' : '-'; out.bossDeaths = lair ? Bot.m.deaths - out.bossDeaths0 : 0;
      out.champ = out.champDone ? Math.round(out.champDone) + 's' : '-';
      out.done = W.sections.every(r => r.state === 'cleared'); out.level = __dw.Items.S.level;
      delete out.champDone; delete out.bossDeaths0;
      return out;
    };
  });
  const rows = [];
  for (const name of who === 'both' ? ['casual', 'skilled'] : [who]) {
    for (let k = 0; k < 5; k++) {
      const r = await pg.evaluate(([k, prof]) => { __dw.setView('top'); __dw.arena(k); outfit(k); return runStage('stage', k, prof); }, [k, PROFILES[name]]);
      rows.push(Object.assign({ who: name, what: 'stage ' + (k + 1) }, r)); console.log(JSON.stringify(rows[rows.length - 1]));
    }
    for (let f = 1; f <= floors; f++) {
      const r = await pg.evaluate(([f, prof]) => {
        __dw.setView('top'); __dw.arena(4); outfit(4 + Math.floor(f / 2));
        const G = __dw.G; G.run = Endless.newRun(false); G.run.seed = 777; G.run.floor = f; Endless.start(G.run); G.stageK = 4 + f;
        return runStage('endless', 4 + f, prof);
      }, [f, PROFILES[name]]);
      rows.push(Object.assign({ who: name, what: 'endless ' + f }, r)); console.log(JSON.stringify(rows[rows.length - 1]));
    }
  }
  await b.close();
  if (errs.length) console.log('ERRORS', errs.slice(0, 5));
  console.log('\nwho      what        done  time  deaths  taken  flasks  parries  hits  champ  boss  bossDeaths  stuck  level');
  for (const r of rows) console.log([r.who.padEnd(8), r.what.padEnd(11), String(r.done).padEnd(5), String(r.time).padStart(4), String(r.deaths).padStart(7), String(r.taken).padStart(6), String(r.flasks).padStart(7), String(r.parries).padStart(8), String(r.hits).padStart(5), String(r.champ).padStart(6), String(r.boss).padStart(5), String(r.bossDeaths).padStart(11), String(r.stuck).padStart(6), String(r.level).padStart(6)].join(' '));
})();
