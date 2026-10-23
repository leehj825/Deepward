// Headless check of the story's depth: the journal, the three effects of choices, the people's lines after the ending, the scenes for the people
// the warden frees, and the companions' comments on more moments.
// Run: node tools/story5_test.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 620 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html')); await pg.waitForTimeout(300);
  const o = await pg.evaluate(() => {
    const o = {}, G = __dw.G, I = __dw.Items, F = () => I.S.flags;
    I.wipe(); __dw.start('new'); __dw.sim(0.3);
    while (document.querySelector('.pcard.dialogue')) document.querySelector('#pcard .pb').click();
    if (document.querySelector('[data-act="pickclass"]')) document.querySelector('[data-act="pickclass"][data-arg="warrior"]').click();
    if (document.querySelector('[data-act="looksdone"]')) document.querySelector('[data-act="looksdone"]').click();
    const off = document.querySelector('.pcard.trainOffer [data-act="close"]'); if (off) off.click(); __dw.sim(0.3);
    const play = (picks = []) => { let n = 0; for (let k = 0; k < 60 && Scene.active; k++) { __dw.sim(0.1); Scene.next(); __dw.sim(5); if (Scene.current && Scene.current.choices.length) Scene.pick(picks[n++] || 0); else Scene.next(); } return !Scene.active; };
    const lines = () => { const L = []; let n = 0; for (let k = 0; k < 60 && Scene.active; k++) { __dw.sim(0.1); L.push(Scene.current.full); Scene.next(); __dw.sim(5); Scene.next(); } return L.join(' | '); };
    // The journal
    I.S.flags = { 'found_crypt-roll': true }; I.S.main = { i: 3 };
    __dw.openPanel('journal'); __dw.sim(0.1);
    const txt = document.getElementById('pcard').textContent;
    o.journalSteps = /Speak with Maren/.test(txt) && /Tell Maren what you found in the Crypt/.test(txt);
    o.journalFinds = /A roll of names/.test(txt) && /scratched out/.test(txt);
    o.journalNoEffects = /Nothing yet/.test(txt);
    while (__dw.UI.open) __dw.UI.close(); G.state = 'play';
    // Effects of choices
    const it = I.generate(2, { slot: 'weapon', rarity: 1 }); const base = I.upgradeCost(it).gold, baseR = I.rerollCost(it).gold;
    F().bramKnows = true; o.bramDiscount = I.upgradeCost(it).gold === Math.round(base * 0.9) && I.rerollCost(it).gold <= baseR;
    const hp0 = Player.gearStats ? 0 : 0; const f0 = G.player.S.flaskHeal; F().maren_forgiven = true; G.onGearChanged(true); o.flaskBlessing = Math.abs(G.player.S.flaskHeal / f0 - 1.1) < 0.01;
    F().rookBanner = true; I.S.stage = 3; G.startRaid && (G.raid = null, G.startRaid()); o.rookGate = G.raid && G.raid.max > CFG.raid.gate * 1.2; G.raid = null; G.queue = []; G.state = 'play';
    __dw.openPanel('journal'); __dw.sim(0.1); const t2 = document.getElementById('pcard').textContent;
    o.journalEffects = /Bram trusts you/.test(t2) && /Maren's blessing/.test(t2) && /Rook's gate/.test(t2); while (__dw.UI.open) __dw.UI.close(); G.state = 'play';
    // After the ending: the people's lines per ending
    I.S.flags = { epilogueSeen: true, ending_relief: true }; I.S.main = { i: 17, ending: 'relief' };
    o.bram = Story.event('talk', 'smith') && /new lamp/.test(lines());
    o.tilda = Story.event('talk', 'trader') && /flowers/.test(lines());
    I.S.flags = { epilogueSeen: true, ending_breaking: true }; I.S.main = { i: 17, ending: 'breaking' };
    o.rook = Story.event('talk', 'guard') && /walking away from a post/.test(lines());
    o.hobb = Story.event('talk', 'trainer') && /dummies/.test(lines());
    I.S.flags = { epilogueSeen: true, ending_watch: true }; I.S.main = { i: 17, ending: 'watch' };
    o.wenna = Story.event('talk', 'bard') && /new song/.test(lines());
    o.onlyOnce = !Story.event('talk', 'bard');
    // The people the warden frees
    I.S.flags = {}; I.S.main = { i: 0 }; G.state = 'play';
    const seen = []; for (const id of ['pell', 'ilsa', 'aldo', 'mira']) { const hit = Story.event('rescue', id, () => seen.push(id)); const l = lines(); seen.push(hit && /[A-Za-z]/.test(l)); }
    o.rescues = seen.filter(x => x === true).length === 4 && seen.filter(x => typeof x === 'string').length === 4;
    // More banter moments
    I.S.party = ['hobb', 'aldo']; window.__s = []; const w = document.getElementById('whisper'); new MutationObserver(() => window.__s.push(w.textContent)).observe(w, { childList: true, subtree: true, characterData: true });
    I.S.flags = {}; o.banterStarts = Story.event('find', 'frost-orders') && (lines(), true);
    return o;
  });
  await pg.waitForTimeout(6800);
  const o2 = await pg.evaluate(() => { const t = (window.__s || []).join(' | '); return { frostBanter: /Orders written to be obeyed/.test(t) && /Forty winters of waiting/.test(t) }; });
  await b.close();
  const out = Object.assign(o, o2), bad = Object.entries(out).filter(([, v]) => v !== true), ok = !errs.length && !bad.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(out)); if (errs.length) console.log('ERRORS', errs);
  process.exit(ok ? 0 : 1);
})();
