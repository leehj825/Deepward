// Headless check of Act I of the main story (docs/STORY.md): relics in the first rings, guardians' last words, the beats with Rook, Tilda,
// Bram and Maren in order, the choices that set flags, one-time rewards, and the final confession.
// Run: node tools/story2_test.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 620 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, F = () => I.S.flags || {};
    __dw.Items.wipe(); __dw.start('new'); __dw.sim(0.3);
    while (document.querySelector('.pcard.dialogue')) document.querySelector('#pcard .pb').click();
    if (document.querySelector('[data-act="pickclass"]')) document.querySelector('[data-act="pickclass"][data-arg="warrior"]').click();
    if (document.querySelector('[data-act="looksdone"]')) document.querySelector('[data-act="looksdone"]').click();
    const off = document.querySelector('.pcard.trainOffer [data-act="close"]'); if (off) off.click();
    __dw.sim(0.3);
    // Play the scene on screen to its end; `picks` answers the choices in order (indices among those shown)
    const lines = []; const watch = () => { const st = Scene.current; if (st) lines.push(st.full); };
    const play = (picks = []) => { let n = 0; for (let k = 0; k < 40 && Scene.active; k++) { __dw.sim(0.1); watch(); Scene.next(); __dw.sim(4); if (Scene.current && Scene.current.choices.length) { const c = picks[n++] || 0; Scene.pick(c); } else Scene.next(); } return !Scene.active; };
    const talk = (who, picks) => { const hit = Story.event('talk', who); if (hit) return play(picks); return false; };
    o.hobbFigure = !!__dw.World.rooms.find(r => r.kind === 'camp').npcs.find(n => n.id === 'hobb');
    // The opening chain
    o.greet = talk('elder', [2]) && I.S.main.i === 1;
    o.yard = talk('trainer') && I.S.main.i === 2 && F().done_yard === true;
    o.noBeatEarly = !Story.event('talk', 'trader') && !Story.event('talk', 'smith');
    // A relic in the Crypt
    const keep = { main: I.S.main, flags: I.S.flags }; __dw.arena(0); I.S.main = keep.main; I.S.flags = keep.flags;      // (the test arena wipes the save)
    const p = G.player; p.maxHp = p.hp = 1e7; __dw.World.startStage(0);
    const R = Props.relics.find(r => r.id === 'crypt-roll'); o.relicPlaced = !!R && R.label === 'A roll of names';
    if (R) { p.pos.set(R.x, 0, R.z + 0.8); __dw.sim(0.3); o.relicPrompt = !!G.spot && G.spot.id === 'find'; __dw.interact(); __dw.sim(0.2); o.relicScene = G.state === 'scene' && /names/.test(Scene.current.full); play(); o.relicDone = F()['found_crypt-roll'] === true && F()['seen_f-roll'] === true && R.found; }
    __dw.World.startStage(0); o.relicGone = !Props.relics.some(r => r.id === 'crypt-roll');                              // not placed again once found
    // The Warden falls: its word, the step, then Rook asks for the banner
    Story.guardianFell(0, 0); o.whisper = /Relieved/.test(document.getElementById('whisper').textContent);
    Story.guardianFell(0, 1); Story.event('guardian', 0); o.crypt = I.S.main.i === 3 && F().done_crypt === true;
    G.state = 'play'; __dw.sim(0.1);
    o.rookAsk = talk('guard') && F().rookAsked === true;
    o.rookNothing = !Story.event('talk', 'guard');
    // The report: the word
    o.report = talk('elder', [0]) && F().heardRelieved === true && I.S.main.i === 4;
    // The Keep: the banner, Aldric, the name
    Story.event('find', 'keep-banner'); play(); o.banner = F().bannerFound === true;
    Story.event('guardian', 1); o.aldric = I.S.main.i === 5;
    const g0 = I.S.gold; o.rookBanner = talk('guard') && F().rookBanner === true && I.S.gold >= g0 + 150;
    o.rookWarns = talk('guard') && F().seen_rookWarns === true;
    o.king = talk('elder', [0]) && F().toldKing === true && I.S.main.i === 6;
    o.rookDone = !Story.event('talk', 'guard');
    // The Den: Tilda and Bram; the Depths: the pack, the fragment, the choice
    Story.event('guardian', 2); o.den = I.S.main.i === 7;
    o.tilda = talk('trader') && F().seen_tildaRoads === true;
    o.bramAsk = talk('smith') && F().bramAsked === true;
    o.noFragmentYet = !Story.event('talk', 'smith');
    Story.event('find', 'depths-pack'); play(); o.pack = F().haveFragment === true;
    o.bramFragment = talk('smith', [0]) && F().bramKnows === true && !F().bramLied;
    Story.event('guardian', 3); o.spiders = I.S.main.i === 8;
    o.slip = talk('elder') && F().seen_marenSlip === true && I.S.main.i === 8;
    Story.event('find', 'court-portraits'); play(); Story.event('guardian', 4); o.court = I.S.main.i === 9;
    // The confession and its choice
    o.confess = talk('elder', [1]) && F().maren_forgiven === true && !F().maren_blamed && I.S.main.i === 10;
    o.end = Story.objective() !== '' && /Temple/.test(Story.objective());
    o.saved = (() => { Items.save(); return true; })();
    return o;
  });
  await b.close();
  const bad = Object.entries(out).filter(([, v]) => v !== true);
  const ok = !errs.length && !bad.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out)); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
