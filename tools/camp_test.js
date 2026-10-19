// Headless check of the camp loop: story, smith, gear, ledger, gate, stage clear, return, death, save.
// Run: node tools/camp_test.js   (needs Playwright; NODE_PATH=$(npm root -g) if it is installed globally)
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 650 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
  await pg.waitForTimeout(300);
  const shot = n => process.env.SHOTS ? pg.screenshot({ path: path.join(process.env.SHOTS, n + '.png') }) : null;
  await shot('0_title');
  const r = {};
  const ev = async (k, code) => { r[k] = await pg.evaluate(code); };
  await ev('intro', `(() => { __dw.Items.wipe(); __dw.start('new'); __dw.sim(0.3); return __dw.G.state === 'menu' && document.querySelector('.dlg') !== null; })()`);
  await shot('1_intro');
  await ev('introDone', `(() => { while (document.querySelector('.pcard.dialogue')) document.querySelector('#pcard .pb').click(); const offer = !!document.querySelector('.pcard.trainOffer'); document.querySelector('.pcard.trainOffer [data-act="close"]').click(); __dw.sim(0.2); return offer && __dw.G.state === 'play' && __dw.G.mode === 'camp'; })()`);
  await shot('2_camp');
  // Walk to Bram and open the smithy
  await ev('smithPrompt', `(() => { const p = __dw.G.player; p.pos.set(-12.6, 0, -1.8); __dw.sim(0.3); return !!__dw.G.spot && __dw.G.spot.id; })()`);
  await shot('3_smith_near');
  await ev('smithOpen', `(() => { __dw.Items.S.gold = 900; __dw.Items.S.scrap = 20; __dw.interact(); __dw.sim(0.1); return document.querySelector('.pcard.smith') !== null; })()`);
  await ev('forged', `(() => { document.querySelector('[data-arg="smith:forge"]').click(); document.querySelector('[data-act="forge"][data-arg="weapon"]').click(); return __dw.Items.S.inv.length === 1 && __dw.Items.S.gold < 900; })()`);
  await shot('4_forge');
  await ev('upgraded', `(() => { document.querySelector('[data-arg="smith:upgrade"]').click(); const b = document.querySelector('[data-act="upgrade"]'); b.click(); return __dw.Items.S.equip.weapon.plus === 1; })()`);
  await ev('equipped', `(() => { __dw.UI.close(); __dw.sim(0.1); const it = __dw.Items.S.inv[0]; __dw.openPanel('bag'); document.querySelector('[data-act="equip"]').click(); return __dw.Items.S.equip.weapon.id === it.id; })()`);
  await shot('5_bag');
  await ev('built', `(() => { __dw.UI.close(); __dw.openPanel('ledger'); document.querySelector('[data-act="build"][data-arg="yard"]').click(); __dw.UI.close(); __dw.sim(0.2); return __dw.Items.S.camp.yard === 1 && __dw.G.player.maxHp === 112 + (__dw.Items.stats().maxHp - 112); })()`);
  await shot('6_camp_built');
  // The gate down
  await ev('gate', `(() => { const p = __dw.G.player; p.pos.set(0, 0, -15.4); __dw.sim(0.3); const id = __dw.G.spot && __dw.G.spot.id; __dw.interact(); return id === 'gate' && document.querySelector('.pcard.gate') !== null; })()`);
  await shot('7_gate');
  await pg.evaluate(`document.querySelector('[data-act="descend"]').click()`);
  await pg.waitForTimeout(700);
  await ev('descended', `(() => { __dw.sim(0.2); return __dw.G.mode === 'dungeon' && __dw.World.active && __dw.World.active.inf.k === 0 && __dw.G.state === 'menu'; })()`);
  await shot('8_pre_story');
  // Skip to the guardian room, clear it, open its chest
  await ev('guardian', `(() => {
    while (__dw.UI.open) document.querySelector('#pcard .pb').click();
    __dw.World.startStage(0); const W = __dw.World, G = __dw.G;
    const kill = () => { for (const e of G.enemies) if (e.state !== 'dead' && e.state !== 'spawn') { e.state = 'broken'; e.ward = 0; Enemy.receive(e, { dmg: 9999, posture: 0 }, G.player); } };
    const L = W.sections[W.sections.length - 1]; G.player.pos.set(L.doorS, 0, L.southZ - 2.5);
    __dw.sim(3);
    const boss = G.boss && G.boss.guardian;
    __dw.sim(14, () => { kill(); G.player.hp = 999; return W.active.state === 'cleared'; });
    const c = W.active.chest; G.player.pos.set(c.x + 1.2, 0, c.z); __dw.sim(2.0, () => !!document.querySelector('.pcard.cleared') && __dw.UI.open);
    return { boss, unlocked: __dw.Items.S.stage, panel: !!document.querySelector('.pcard.cleared'), gold: __dw.Items.S.gold, bag: __dw.Items.S.inv.length };
  })()`);
  await shot('9_cleared');
  await pg.evaluate(`document.querySelector('[data-act="camp"]').click()`);
  await pg.waitForTimeout(700);
  await ev('backInCamp', `(() => { __dw.sim(0.2); return __dw.G.mode === 'camp' && !!document.querySelector('.dlg') && __dw.Items.S.tripGold === 0; })()`);
  await shot('10_post_story');
  // Fall in stage 2 and wake in camp
  await ev('fall', `(() => {
    while (__dw.UI.open) document.querySelector('#pcard .pb').click();
    __dw.G.descend(1); return true; })()`);
  await pg.waitForTimeout(700);
  await ev('fallen', `(() => {
    while (__dw.UI.open) document.querySelector('#pcard .pb').click();
    const G = __dw.G; __dw.Items.addGold(100); const before = __dw.Items.S.gold; G.player.hp = 1; G.player.st = 0;
    const e = __dw.spawn('knight', G.player.pos.x, G.player.pos.z - 1.8); e.state = 'hunt'; e.cooldown = 0; e.rig.root.position.y = 0;
    __dw.sim(6, () => G.player.state === 'dead');
    __dw.sim(2.0, () => __dw.UI.open);
    return { dead: G.player.state === 'dead', panel: !!document.querySelector('.pcard.fallen'), lost: before - __dw.Items.S.gold };
  })()`);
  await shot('11_fallen');
  await pg.evaluate(`document.querySelector('[data-act="wake"]').click()`);
  await pg.waitForTimeout(700);
  await ev('woke', `(() => { __dw.sim(0.2); return __dw.G.mode === 'camp' && __dw.G.player.state === 'free' && __dw.G.player.hp === __dw.G.player.maxHp; })()`);
  // Reload: the save survives
  await pg.reload(); await pg.waitForTimeout(400);
  await ev('saved', `(() => ({ cont: getComputedStyle(document.getElementById('contBtn')).display !== 'none', stage: __dw.Items.load() && __dw.Items.S.stage, yard: __dw.Items.S.camp.yard }))()`);
  const ok = r.intro && r.introDone && r.smithPrompt === 'smith' && r.smithOpen && r.forged && r.upgraded && r.equipped && r.built && r.gate && r.descended
    && r.guardian.boss === 'The Bone Warden' && r.guardian.unlocked === 1 && r.guardian.panel && r.backInCamp && r.fallen.dead && r.fallen.panel && r.fallen.lost === 50 && r.woke
    && r.saved.cont && r.saved.stage === 1 && r.saved.yard === 1 && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(r) + (errs.length ? ' errors: ' + errs.join(' | ') : ''));
  await b.close();
  process.exit(ok ? 0 : 1);
})();
