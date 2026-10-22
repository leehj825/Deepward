// Headless check of Act II of the main story and the three endings (docs/STORY.md): the relics, the last words, the beats, the choices
// that open the endings, the epilogue, and Maren's empty chair after the Relief.
// Run: node tools/story3_test.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 620 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(300);
  const out = await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, F = () => I.S.flags || {};
    const boot = (flags, i) => {
      __dw.Items.wipe(); __dw.start('new'); __dw.sim(0.3);
      while (document.querySelector('.pcard.dialogue')) document.querySelector('#pcard .pb').click();
      if (document.querySelector('[data-act="pickclass"]')) document.querySelector('[data-act="pickclass"][data-arg="warrior"]').click();
      if (document.querySelector('[data-act="looksdone"]')) document.querySelector('[data-act="looksdone"]').click();
      const off = document.querySelector('.pcard.trainOffer [data-act="close"]'); if (off) off.click();
      __dw.sim(0.3); I.S.main = { i }; I.S.flags = Object.assign({}, flags);
      for (const st of CFG.mainStory.steps.slice(0, i)) I.S.flags['done_' + st.id] = true;
      for (const id of ['rookAsk', 'rookNoBanner', 'rookWarns', 'tildaRoads', 'bramPack', 'bramFragment', 'marenSlip', 'bramComes']) I.S.flags['seen_' + id] = true;      // Act I's beats are behind us
    };
    const play = (picks = []) => { let n = 0; for (let k = 0; k < 60 && Scene.active; k++) { __dw.sim(0.1); Scene.next(); __dw.sim(5); if (Scene.current && Scene.current.choices.length) Scene.pick(picks[n++] || 0); else Scene.next(); } return !Scene.active; };
    const talk = (who, picks) => Story.event('talk', who) ? play(picks) : false;
    boot({ bramKnows: true, maren_forgiven: true, haveFragment: true }, 10);
    G.state = 'play';
    // Relics in the new rings
    const keep = { main: I.S.main, flags: I.S.flags };
    const relicAt = si => { __dw.arena(si); I.S.main = keep.main; I.S.flags = keep.flags; __dw.World.startStage(si); return Props.relics.map(r => r.id); };
    o.mural = relicAt(5).includes('temple-mural'); o.orders = relicAt(6).includes('frost-orders'); o.mould = relicAt(7).includes('forge-mould');
    o.graves = relicAt(8).includes('orchard-graves'); o.crown = relicAt(9).includes('throne-crown');
    G.state = 'play'; __dw.sim(0.1);
    Story.event('find', 'temple-mural'); o.muralScene = play() && F().seen_f_mural === undefined && F()['seen_f-mural'] === true;
    // Ring 6
    Story.guardianFell(5, 0); o.prophetWord = /lamp/.test(document.getElementById('whisper').textContent);
    Story.event('guardian', 5); o.temple = I.S.main.i === 11;
    o.prophet = talk('elder', [0]) && F().marenToldAll === true && I.S.main.i === 12;
    o.rookTired = talk('guard') && F()['seen_rookTired'] === true;
    // Ring 7
    Story.event('guardian', 6); o.frost = I.S.main.i === 13;
    o.rookSalute = talk('guard') && F()['seen_rookSalute'] === true;
    o.bramForge = talk('smith') && F()['seen_bramForge'] === true;
    // Ring 8: the key
    Story.event('guardian', 7); o.forge = I.S.main.i === 14;
    o.bramKey = talk('smith', [0]) && F().bramKey === true && F().keyFound === true && !F().bramHid;
    o.tildaQuiet = talk('trader') && F()['seen_tildaQuiet'] === true;
    // Ring 9: Maren's grave
    Story.event('guardian', 8); o.orchard = I.S.main.i === 15;
    o.grave = talk('elder', [0]) && F().marenDescends === true && I.S.main.i === 16;
    // The ending: three choices; the Relief
    const shown = []; Story.ending(() => {});
    for (let k = 0; k < 60 && Scene.active; k++) { __dw.sim(0.1); Scene.next(); __dw.sim(5); if (Scene.current && Scene.current.choices.length) { shown.push(Scene.current.choices.length); Scene.pick(1); } else Scene.next(); }
    o.threeChoices = shown[0] === 3; o.relic = F().ending_relief === true && I.S.main.ending === 'relief';
    Story.event('guardian', 9); o.throne = I.S.main.i === 17 && /Endless/.test(Story.objective());
    Story.epilogue(); play(); o.epilogue = F().epilogueSeen === true && !Scene.active;
    // Maren's chair in a new camp
    __dw.World.enterCamp(I.S.camp); const camp = __dw.World.rooms.find(r => r.kind === 'camp');
    o.noMaren = !camp.npcs.some(n => n.id === 'elder') && camp.spots.find(s => s.id === 'elder').name === "Maren's chair";
    // The other endings: only the Watch without the flags; the Breaking with the key
    boot({}, 16); G.state = 'play'; const sh2 = []; Story.ending(() => {});
    for (let k = 0; k < 60 && Scene.active; k++) { __dw.sim(0.1); Scene.next(); __dw.sim(5); if (Scene.current && Scene.current.choices.length) { sh2.push(Scene.current.choices.length); Scene.pick(0); } else Scene.next(); }
    o.watchOnly = sh2[0] === 1 && I.S.main.ending === 'watch' && F().ending_watch === true;
    boot({ bramKey: true }, 16); G.state = 'play'; const sh3 = []; Story.ending(() => {});
    for (let k = 0; k < 60 && Scene.active; k++) { __dw.sim(0.1); Scene.next(); __dw.sim(5); if (Scene.current && Scene.current.choices.length) { sh3.push(Scene.current.choices.length); Scene.pick(1); } else Scene.next(); }
    o.breaking = sh3[0] === 2 && I.S.main.ending === 'breaking' && F().ending_breaking === true;
    Story.epilogue(); play(); o.epiBreaking = F().epilogueSeen === true;
    o.endedOnce = !Story.ending(() => {});                                     // not asked twice
    return o;
  });
  await b.close();
  const bad = Object.entries(out).filter(([, v]) => v !== true);
  const ok = !errs.length && !bad.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out)); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
