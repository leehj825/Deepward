// Balance bot: a scripted warden plays every stage (and some Endless floors) at a set skill level, with gear and
// levels typical for how far a player would have come, and reports deaths, time, damage taken and flasks per stage.
// Run: node tools/balance.js [casual|skilled|both] [endlessFloors] [fromStage] [toStage]   (needs Playwright)
//      node tools/balance.js story [casual|skilled] [warrior|archer|mage|cleric]   a whole campaign: camp, scenes, relics, ten guardians, the ending (PARTY=1: with Hobb and Aldo along)
const { chromium } = require('playwright');
const path = require('path');
const who = process.argv[2] || 'both', floors = +(process.argv[3] || 6), from = +(process.argv[4] || 0), to = +(process.argv[5] || 10);
const PROFILES = {
  // chance to parry / block / dash a telegraphed blow in time, and to answer a parry-only pounce with a parry
  casual: { parry: 0.12, block: 0.7, dash: 0.55, pounce: 0.35, aggro: 0.6 },
  skilled: { parry: 0.45, block: 0.95, dash: 0.88, pounce: 0.75, aggro: 0.85 },
};
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 800, height: 500 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html') + '?classes=1');
  if (process.env.LANGKO) {                                                      // LANGKO=1: play in Korean and list every text that stays English
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('dw_settings', JSON.stringify({ lang: 'ko' })); }); await pg.reload();
    await pg.evaluate(() => {
      window.__en = new Map();
      const ALLOW = /^(WASD|Esc|Space|Enter|Tab|Shift|Ctrl|LB|RB|LT|RT|LS|RS|View|Menu|Key[A-Z]|Arrow\w+|Digit\d|PNG|FPS|XP|HP|OK|[A-Z]|px|ms|x|vs|Deepward|English|Lv|J|K|L|R|F|E|I|T|B|C|N|M|P)$/;
      const bad = t => t && /[A-Za-z]{3}/.test(t) && t.split(/[^A-Za-z-]+/).filter(w => w.length >= 3).some(w => !ALLOW.test(w));
      const note = (t, where) => { if (bad(t)) { const k = t.trim(); window.__en.set(k, (window.__en.get(k) || [0, where])); window.__en.get(k)[0]++; } };
      const check = n => setTimeout(() => {
        if (n.nodeType === 3) { if (n.isConnected && !n.parentElement.closest('script,style,[translate=no],textarea')) note(n.data, n.parentElement.id || n.parentElement.className || n.parentElement.tagName); }
        else if (n.nodeType === 1 && n.isConnected) { for (const a of ['title', 'placeholder', 'aria-label']) note(n.getAttribute(a), a); for (const c of n.childNodes) check(c); }
      }, 60);
      new MutationObserver(l => { for (const m of l) { if (m.type === 'characterData') check(m.target); else if (m.type === 'attributes') check(m.target); else for (const a of m.addedNodes) check(a); } }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder', 'aria-label'] });
    });
  }
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
        // A cleric mends itself below 55% health (heal mode: a light cast heals), and goes back to smiting above 85%
        if (p.S.weaponType === 'scepter') {
          if (p.hp < p.maxHp * 0.55 && !p.healMode) Player.toggleMode(p); else if (p.hp > p.maxHp * 0.85 && p.healMode) Player.toggleMode(p);
          if (p.healMode && p.st > 12 && (!t || t.tt > 0.6)) { press('light'); return; }
        }
        // Fight: the nearest foe; execute the broken; heavy at shield knights
        let foe = null, fd = 1e9;
        for (const e of G.enemies) { if (!Enemy.targetable(e)) continue; const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < fd) { fd = d; foe = e; } }
        if (foe && fd < 14 && p.S.ranged) {
          // A ranged class: aim by lock-on, keep a middle distance (back off when close, close in when far), shoot or cast, a heavy now and then
          G.lock = foe; const a = Math.atan2(foe.pos.x - p.pos.x, foe.pos.z - p.pos.z);
          if (fd < 4.2) { In.stick.x = -Math.sin(a); In.stick.z = -Math.cos(a); }
          else if (fd > 9.5 || W.route(p.pos, foe.pos)) { const g = W.route(p.pos, foe.pos) || foe.pos, ga = Math.atan2(g.x - p.pos.x, g.z - p.pos.z); In.stick.x = Math.sin(ga); In.stick.z = Math.cos(ga); }
          else { const sa = a + Math.PI / 2 * (Math.floor(G.time / 3) % 2 ? 1 : -1); In.stick.x = Math.sin(sa) * 0.5; In.stick.z = Math.cos(sa) * 0.5; }
          if (p.st > 18 && Math.random() < prof.aggro * 0.3) press(Math.random() < 0.22 ? 'heavy' : 'light');
          return;
        }
        if (foe && fd < 14) {
          const via = W.route(p.pos, foe.pos), goal = via || foe.pos;
          if (Player.executable(p)) { press('heavy'); return; }
          if (fd > foe.def.radius + 1.6 || via) { const a = Math.atan2(goal.x - p.pos.x, goal.z - p.pos.z); In.stick.x = Math.sin(a); In.stick.z = Math.cos(a); }
          else if (p.st > 25 && Math.random() < prof.aggro * 0.25) press(foe.def.guard && Math.random() < 0.5 ? 'heavy' : 'light');
          return;
        }
        // A relic of the story in a cleared section: go and examine it
        const rel = Props.relics.find(r => !r.found && (W.roomOf({ x: r.x, z: r.z }) || {}).state === 'cleared');
        if (rel) {
          const d = Math.hypot(rel.x - p.pos.x, rel.z - p.pos.z);
          if (d < 1.4) { if (G.spot && G.spot.id === 'find') { __dw.interact(); m.relics = (m.relics || 0) + 1; } else rel.found = true; return; }
          m.relicT = (m.relicT || 0) + 1 / 60;
          if (m.relicT > 25) { rel.found = true; m.relicSkipped = (m.relicSkipped || 0) + 1; m.relicT = 0; return; }       // walked into a rock for too long: leave it
          const a = Math.atan2(rel.x - p.pos.x, rel.z - p.pos.z); In.stick.x = Math.sin(a); In.stick.z = Math.cos(a); return;
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
      const cls = S.cls || 'warrior', start = CFG.classes[cls].start || 'sword';
      for (const slot of ['weapon', 'shield', 'armor', 'helm']) { const it = I.generate(tier, { slot, type: slot === 'weapon' ? start : undefined, rarity: rar }); it.plus = Math.min(k, 4); it.gems = []; S.equip[slot] = it; }
      S.talents = {}; S.points = 0;
      if (cls === 'warrior') for (const id of ['steady', 'keen', 'riposte', 'steady', 'keen', 'riposte', 'precision', 'precision', 'fury'].slice(0, Math.min(9, 2 * k))) S.talents[id] = (S.talents[id] || 0) + 1;
      else {                                                                  // the class's own tree, first learnable talent first, two points a stage
        const ids = Object.keys(CFG.trees[{ archer: 'marksman', mage: 'spellweaver', cleric: 'devotion' }[cls]].talents);
        S.points = Math.min(18, 2 * k); for (let n = 0; n < 80 && S.points > 0; n++) { let got = false; for (const id of ids) { try { if (I.learn(id)) { got = true; break; } } catch (e) {} } if (!got) break; }
      }
      __dw.G.onGearChanged(); __dw.G.player.hp = __dw.G.player.maxHp; __dw.G.player.flasks = __dw.G.player.S.flasks;
    };
    // A scene on screen: read it as a player would (finish the typing, go on, answer a choice at random)
    window.autoScene = () => {
      if (!Scene.active) return false;
      const c = Scene.current, fin = Math.floor(c.t * 46) >= c.full.length;
      if (!fin) Scene.next(); else if (c.choices.length) Scene.pick(Math.floor(Math.random() * c.choices.length)); else Scene.next();
      window.__sceneLines = (window.__sceneLines || 0) + 1; return true;
    };
    window.runStage = (kind, k, profile) => {
      const G = __dw.G, W = __dw.World;
      if (kind === 'stage') { W.startStage(k); G.stageK = k; G.mode = 'dungeon'; G.state = 'play'; G.blessings = []; G.queue = []; }
      const at = { x: W.sections[0].cx, z: W.sections[0].southZ - 3 }; G.player.pos.set(at.x, 0, at.z);
      Bot.begin(profile); const st0 = Object.assign({}, G.stats), t0 = G.time;
      const out = {};
      let lair = null;
      __dw.sim(900, () => {
        if (autoScene()) return false;
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
      out.done = W.sections.every(r => r.state === 'cleared'); out.level = __dw.Items.S.level; out.relicSkipped = Bot.m.relicSkipped || 0; out.relics = Bot.m.relics || 0;
      delete out.champDone; delete out.bossDeaths0;
      return out;
    };
  });
  if (who === 'story') {
    const prof = PROFILES[process.argv[3] || 'skilled'], cls = process.argv[4] || 'warrior', rows = [];
    const closeAll = () => pg.evaluate(() => { for (let i = 0; i < 6 && __dw.UI.open; i++) __dw.UI.close(); if (__dw.G.state === 'menu') __dw.G.state = 'play'; });
    // A new warden of the class, through the opening
    await pg.evaluate(cls => {
      __dw.Items.wipe(); __dw.start('new'); __dw.sim(0.3);
      for (let i = 0; i < 12 && document.querySelector('.pcard.dialogue'); i++) document.querySelector('#pcard .pb').click();
      const pk = document.querySelector(`[data-act="pickclass"][data-arg="${cls}"]`); if (pk) pk.click();
      if (document.querySelector('[data-act="looksdone"]')) document.querySelector('[data-act="looksdone"]').click();
      const off = document.querySelector('.pcard.trainOffer [data-act="close"]'); if (off) off.click();
      __dw.sim(0.3);
    }, cls);
    if (process.env.PARTY) await pg.evaluate(() => { const I = __dw.Items; I.S.gold = 9999; I.S.rescued = [{ id: 'mira' }, { id: 'aldo' }]; Party.recruit('hobb'); Party.recruit('aldo'); __dw.sim(0.2); });      // PARTY=1: two companions along
    const campRound = () => pg.evaluate(() => {
      // Everyone the story speaks through, until a whole round brings no scene
      const G = __dw.G, p = G.player, camp = __dw.World.rooms.find(r => r.kind === 'camp'); let total = 0;
      for (let round = 0; round < 8; round++) {
        let any = 0;
        for (const id of ['elder', 'trainer', 'guard', 'trader', 'smith']) {
          const s = camp.spots.find(x => x.id === id); if (!s) continue;
          p.pos.set(s.x, 0, s.z + 0.9); __dw.sim(0.4);
          if (G.state !== 'play') continue;
          __dw.interact(); __dw.sim(0.1);
          if (Scene.active) { any++; for (let k = 0; k < 400 && Scene.active; k++) { autoScene(); __dw.sim(0.12); } __dw.sim(0.3); }
          for (let i = 0; i < 6 && __dw.UI.open; i++) __dw.UI.close(); if (G.state === 'menu') G.state = 'play';
        }
        total += any; if (!any) break;
      }
      return total;
    });
    let sceneTotal = 0;
    for (let k = 0; k < 10; k++) {
      sceneTotal += await campRound();
      await pg.evaluate(k => outfit(k), k);
      await pg.evaluate(k => { __dw.G.descend(k, false); }, k); await pg.waitForTimeout(750); await closeAll();
      const r = await pg.evaluate(([k, prof]) => { __dw.setView('top'); return runStage('live', k, prof); }, [k, prof]);
      // The guardian's chest, the cleared panel or (the last) the ending; then home
      await pg.evaluate(() => {
        const W = __dw.World, c = W.sections[W.sections.length - 1].chest; if (c && !c.opened) __dw.G.player.pos.set(c.x, 0, c.z + 1.2);      // the guardian's chest, as the warden would
        for (let i = 0; i < 60 && !__dw.UI.open; i++) { autoScene(); __dw.sim(0.3); }
      });
      const ended = await pg.evaluate(() => { const S = __dw.Items.S; return S.main && S.main.ending || null; });
      await closeAll(); await pg.evaluate(() => { __dw.G.returnToCamp(); }); await pg.waitForTimeout(800); await closeAll();
      await pg.evaluate(() => { for (let k = 0; k < 400 && Scene.active; k++) { autoScene(); __dw.sim(0.12); } __dw.G.state = 'play'; });
      const st = await pg.evaluate(() => ({ step: Story.step ? Story.step.id : 'end', i: __dw.Items.S.main.i, state: __dw.G.state }));
      rows.push(Object.assign({ stage: k + 1, ending: ended }, r, st)); console.log(JSON.stringify(rows[rows.length - 1]));
    }
    sceneTotal += await campRound();
    const fin = await pg.evaluate(() => {
      const S = __dw.Items.S, F = S.flags || {}, beats = CFG.mainStory.beats.map(b => b.id), unseen = beats.filter(id => !F['seen_' + id]);
      return { step: Story.step ? Story.step.id : 'end', i: S.main.i, steps: CFG.mainStory.steps.length, ending: S.main.ending || null, epilogue: !!F.epilogueSeen, unseenBeats: unseen, relicsFound: Object.keys(F).filter(k => k.startsWith('found_')).length, sceneLines: window.__sceneLines || 0, level: S.level, gold: S.gold, deaths: S.deaths };
    });
    console.log('\nSTORY', JSON.stringify(fin));
    if (process.env.LANGKO) console.log('\nENGLISH LEFT', JSON.stringify(await pg.evaluate(() => [...window.__en.entries()].map(([k, v]) => [k, v[0], v[1]])), null, 0));
    console.log('\nstage  done  time  deaths  taken  flasks  boss  bossDeaths  stuck  level  step');
    for (const r of rows) console.log([String(r.stage).padEnd(6), String(r.done).padEnd(5), String(r.time).padStart(4), String(r.deaths).padStart(7), String(r.taken).padStart(6), String(r.flasks).padStart(7), String(r.boss).padStart(5), String(r.bossDeaths).padStart(10), String(r.stuck).padStart(6), String(r.level).padStart(6), r.step].join('  '));
    await b.close(); if (errs.length) console.log('ERRORS', errs.slice(0, 5));
    return;
  }
  const rows = [];
  for (const name of who === 'both' ? ['casual', 'skilled'] : [who]) {
    for (let k = from; k < to; k++) {
      const r = await pg.evaluate(([k, prof, cls]) => { __dw.setView('top'); __dw.arena(k); if (cls) __dw.Items.setClass(cls); outfit(k); return runStage('stage', k, prof); }, [k, PROFILES[name], process.env.CLASS || '']);
      rows.push(Object.assign({ who: name, what: 'stage ' + (k + 1) }, r)); console.log(JSON.stringify(rows[rows.length - 1]));
    }
    for (let f = 1; f <= floors; f++) {
      const r = await pg.evaluate(([f, prof]) => {
        __dw.setView('top'); __dw.arena(9); outfit(9 + Math.floor(f / 2));
        const G = __dw.G; G.run = Endless.newRun(false); G.run.seed = 777; G.run.floor = f; Endless.start(G.run); G.stageK = 9 + f;
        return runStage('endless', 9 + f, prof);
      }, [f, PROFILES[name]]);
      rows.push(Object.assign({ who: name, what: 'endless ' + f }, r)); console.log(JSON.stringify(rows[rows.length - 1]));
    }
  }
  await b.close();
  if (errs.length) console.log('ERRORS', errs.slice(0, 5));
  console.log('\nwho      what        done  time  deaths  taken  flasks  parries  hits  champ  boss  bossDeaths  stuck  level');
  for (const r of rows) console.log([r.who.padEnd(8), r.what.padEnd(11), String(r.done).padEnd(5), String(r.time).padStart(4), String(r.deaths).padStart(7), String(r.taken).padStart(6), String(r.flasks).padStart(7), String(r.parries).padStart(8), String(r.hits).padStart(5), String(r.champ).padStart(6), String(r.boss).padStart(5), String(r.bossDeaths).padStart(11), String(r.stuck).padStart(6), String(r.level).padStart(6)].join(' '));
})();
