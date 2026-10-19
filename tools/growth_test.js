// Headless check of levels, talents, ultimates and weapon mastery.
// Run: node tools/growth_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
  await pg.waitForTimeout(300);
  const r = await pg.evaluate(() => {
    const out = {}, G = __dw.G, I = __dw.Items;
    __dw.setView('behind'); __dw.arena(0); __dw.World.halt(); G.queue = [];
    const p = () => G.player, S = I.S;
    const fresh = (type, x = 0, z = 2.3) => { const e = __dw.spawn(type, x, z); e.state = 'hunt'; e.cooldown = 99; e.rig.root.position.y = 0; return e; };
    // Kills give XP; enough XP levels up and gives points
    const hp0 = p().maxHp;
    for (let i = 0; i < 8; i++) { const e = fresh('skeleton'); e.state = 'broken'; Enemy.receive(e, { dmg: 9999, posture: 0 }, p()); __dw.sim(0.05); }
    out.level = S.level; out.points = S.points; out.maxHpUp = p().maxHp > hp0;
    // Talents: two trees max, ultimate needs 4 points in its tree
    S.points = 12;
    out.ultBlocked = I.blocked('bulwark');
    ['steady', 'keen', 'keen', 'riposte'].forEach(id => I.learn(id));
    out.ultLearned = I.learn('bulwark') && S.ult === 'bulwark';
    out.secondTree = I.learn('precision');
    out.thirdTreeBlocked = I.blocked('fury');
    __dw.G.onGearChanged();
    out.parryUp = +p().S.parry.toFixed(2);
    // Bulwark turns a hit aside from behind, free of stamina
    p().pos.set(0, 0, 4); p().facing = Math.PI; __dw.sim(0.1);
    Player.ultimate(p()); const st0 = p().st, h0 = p().hp;
    const back = __dw.spawn('skeleton', 0, 5.8); back.state = 'hunt'; back.cooldown = 0; back.rig.root.position.y = 0;
    __dw.sim(2.2);
    out.bulwark = p().hp === h0 && G.stats.hitsTaken === 0;
    back.state = 'dead'; back.hp = 0; __dw.sim(4);
    // Nova: damage and push in 4 m, cooldown
    S.talents = {}; S.ult = null; S.points = 8; ['ember', 'ember', 'ward', 'focus'].forEach(id => I.learn(id)); I.learn('nova'); __dw.G.onGearChanged(); p().ultCd = 0;
    const n1 = fresh('knight', 1.5, 3.2), hpN = n1.hp;
    out.nova = Player.ultimate(p()) && n1.hp < hpN && p().ultCd > 20;
    out.novaCooldownRefuses = !Player.ultimate(p());
    n1.state = 'dead'; n1.hp = 0; __dw.sim(4);
    // Blade Dance: six strikes, untouchable
    I.respec(); S.points = 8; ['feet', 'feet', 'counter', 'precision'].forEach(id => I.learn(id)); I.learn('dance'); __dw.G.onGearChanged(); p().ultCd = 0;
    const d1 = fresh('brute', 0, 1.8), hpD = d1.hp; Player.ultimate(p()); __dw.sim(1.4);
    out.dance = d1.hp < hpD - 50 && p().state === 'free';
    d1.state = 'dead'; d1.hp = 0; __dw.sim(4);
    // Bloodrage: faster swings, no stagger
    I.respec(); S.points = 8; ['fury', 'breaker', 'thirst', 'fury'].forEach(id => I.learn(id)); I.learn('rage'); __dw.G.onGearChanged(); p().ultCd = 0;
    Player.ultimate(p()); __dw.press('light'); __dw.sim(0.02);
    out.rageFaster = p().atk.wind < CFG.player.light[0].wind;
    // Mastery rank 2 gives a fourth combo blow
    S.mastery.sword = 200; __dw.G.onGearChanged();
    __dw.sim(1); const tgt = fresh('brute', 0, 2.2); tgt.def = Object.assign({}, tgt.def, { flinch: false });
    let hits = 0, last = null;
    __dw.sim(3, t => { if (p().state === 'attack' && p().atk !== last) { last = p().atk; hits++; } if (Math.floor(t * 7) !== Math.floor((t - 1/60) * 7)) __dw.press('light'); });
    out.comboHits = hits;
    out.finisherSeen = last && last.pose === CFG.progress.finisher.pose;
    // Respec at the yard costs gold and returns every point
    S.gold = 5000; const spent = Object.values(S.talents).reduce((a, b) => a + b, 0), pts = S.points;
    __dw.openPanel('talents', { trainer: true }); document.querySelector('[data-act="respec"]').click(); __dw.UI.close();
    out.respec = S.points === pts + spent && S.gold < 5000;
    I.save(); out.saved = JSON.parse(localStorage.getItem('dw_save_v1')).level === S.level;
    return out;
  });
  const ok = r.level >= 2 && r.points >= 1 && r.maxHpUp && r.ultBlocked && r.ultLearned && r.secondTree && r.thirdTreeBlocked && r.parryUp > 0.2 && r.bulwark
    && r.nova && r.novaCooldownRefuses && r.dance && r.rageFaster && r.comboHits >= 4 && r.finisherSeen && r.respec && r.saved && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r) + (errs.length ? ' errors: ' + errs.join(' | ') : ''));
  await b.close(); process.exit(ok ? 0 : 1);
})();
