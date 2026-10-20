#!/usr/bin/env node
// Collects every English text the game can show, for translation: the texts in CFG (names, descriptions, story and
// lines), fixed strings in the code (banners, toasts, tips), the parts of item names, and whatever appears on the page
// while a headless browser opens every screen and tab. Numbers become {0}, {1}... as js/i18n.js matches them.
// Writes tools/i18n/strings.json; lists what js/lang_<lang>.js does not have yet with --missing <lang>.
//   NODE_PATH=$(npm root -g) node tools/i18n_harvest.js [--missing ko]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), NUM = /[-+−]?\d+(?:[.,]\d+)?/g;
const key = s => { s = s.trim(); if (!/[A-Za-z]{2}/.test(s)) return null; let i = 0; return s.replace(NUM, () => '{' + i++ + '}'); };
(async () => {
  const found = new Set(), add = s => { const k = typeof s === 'string' && key(s); if (k && k.length < 400) found.add(k); };
  // Fixed strings in the code
  for (const f of fs.readdirSync(path.join(ROOT, 'js'))) {
    if (!f.endsWith('.js') || /^(anims|anims_mutant|lang_|i18n)/.test(f)) continue;
    const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
    for (const re of [/(?:banner|showTip|UI\.toast|toast|FX\.text\([^,]+,)\(\s*'([^'\n]{3,})'/g, /(?:banner|showTip|UI\.toast|toast)\(\s*"([^"\n]{3,})"/g, /\[\s*'([A-Z][^'\n]{2,})',\s*'([^'\n]{3,})'\s*\]/g, /btn\(\s*'([^'\n]+)'/g, /verb: '([^']+)'/g, /name: '([^']+)'/g, /name: "([^"]+)"/g])
      for (const m of src.matchAll(re)) { add(m[1]); if (m[2]) add(m[2]); }
    for (const m of src.matchAll(/SUFFIX\s*=\s*\{([^}]+)\}/g)) for (const n of m[1].matchAll(/'(of [^']+)'/g)) add(n[1]);
  }
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 700 } });
  pg.on('pageerror', e => console.error('page error:', e.message));
  await pg.goto('file://' + path.join(ROOT, 'index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
  const texts = await pg.evaluate(async () => {
    const seen = new Set(), rec = n => { if (n.nodeType === 3) { if (n.data.trim()) seen.add(n.data); } else if (n.nodeType === 1) { for (const a of ['title', 'placeholder', 'aria-label']) { const v = n.getAttribute && n.getAttribute(a); if (v) seen.add(v); } for (let c = n.firstChild; c; c = c.nextSibling) rec(c); } };
    new MutationObserver(l => { for (const m of l) { if (m.type === 'characterData') rec(m.target); else m.addedNodes.forEach(rec); } }).observe(document.body, { childList: true, subtree: true, characterData: true });
    rec(document.body);
    // Every string in CFG
    const walk = (o, d) => { if (d > 8 || !o) return; if (typeof o === 'string') seen.add(o); else if (Array.isArray(o)) o.forEach(v => walk(v, d + 1)); else if (typeof o === 'object') for (const k in o) walk(o[k], d + 1); };
    walk(CFG, 0); walk(Bindings.ACTIONS, 0);
    const G = __dw.G, I = __dw.Items, sleep = ms => new Promise(r => setTimeout(r, ms));
    const close = () => { while (__dw.UI.open) __dw.UI.close(); };
    const clickAll = async sel => { for (const b of [...document.querySelectorAll(sel)]) { if (!document.body.contains(b)) continue; b.click(); await sleep(5); } };
    const panel = async (id, opt) => { close(); try { __dw.openPanel(id, opt); } catch (e) { console.warn('panel', id, e.message); return; } await sleep(10); const tabs = [...document.querySelectorAll('[data-act="tab"]')].map(b => b.dataset.arg); for (const t of tabs) { const b = document.querySelector(`[data-act="tab"][data-arg="${t}"]`); if (b) { b.click(); await sleep(10); } } };
    // A game well along, with something of everything
    __dw.start('new'); close(); G.state = 'play';
    I.S.gold = 99999; I.S.scrap = 999; I.S.stage = 10; I.S.level = 20; I.S.points = 5; I.S.mats = { pelt: 9, tusk: 9, bone: 9, ore: 9, herb: 9, silk: 9 }; I.S.gems = { ruby: 3, sapphire: 3, emerald: 3, topaz: 3, onyx: 3 };
    I.S.raids = 2; I.S.endless = { best: 6, daily: { date: '', best: 2 }, heat: { 1: 4 } }; I.S.bossKills = { ridgehorror: 1, mossback: 1, colossus: 1, mirelord: 1 }; I.S.rescued = []; I.rescue(); I.rescue();
    for (let r = 0; r < 4; r++) for (const s of CFG.gear.slots) I.add(I.generate(r + 2, { slot: s, rarity: r }));
    for (let k = 0; k < 3; k++) I.add(I.generateUnique(4));
    for (const k of Object.keys(CFG.enemies)) { const l = Codex.life(); l.kinds[k] = 3; }
    G.onGearChanged(true);
    for (const id of ['smith', 'trader', 'ledger', 'gate', 'gemcutter', 'herbalist', 'curio', 'board', 'arena', 'looks', 'trainOffer', 'trainer', 'settings', 'controls', 'saves', 'curses', 'talents', 'codex', 'classpick', 'party']) await panel(id);
    I.S.wander = { left: 1, items: [I.generate(3, { minRarity: 2 }), I.generate(3, { minRarity: 2 })], bundles: CFG.wanderer.bundles.slice(0, 3).map(x => Object.assign({}, x)), gem: 'ruby' }; await panel('wanderer');
    await panel('bag'); await clickAll('.icell, [data-act="sel"], [data-act="pick"]');
    await panel('talents'); await clickAll('[data-act="tsel"]');
    await panel('codex'); await clickAll('[data-act="beast"], [data-act="entry"]');
    for (const [id, opt] of [['cleared', { k: 0, guardian: 'The Bone Warden' }], ['fallen', { lost: 40, where: 'Fell in The Crypt' }], ['deeper', { floor: 3 }], ['shrine', { shrine: {}, offers: CFG.blessings.slice(0, 3) }], ['arenaWon', { name: 'The Bone Warden', gold: 300, gem: 'ruby', first: true }], ['looks', { first: true }]]) await panel(id, opt);
    close();
    // Stages, banners and the HUD in a dungeon, the Rim and the Fen
    for (const k of [0, 5, 9]) { G.descend(k); await sleep(1200); close(); __dw.sim(1); }
    G.returnToCamp(); await sleep(1200); close(); __dw.sim(1);
    __dw.openPanel('bag'); await sleep(20); close();
    return [...seen];
  });
  for (const t of texts) { add(t); for (const sep of [' · ', ': ']) if (t.includes(sep)) t.split(sep).forEach(add); }   // the parts too: js/i18n.js falls back to them
  await b.close();
  const list = [...found].filter(s => !/^[a-z]+$/.test(s) && !/^#?[0-9a-f]{6}$/i.test(s)).sort();
  fs.writeFileSync(path.join(__dirname, 'i18n', 'strings.json'), JSON.stringify(list, null, 1));
  console.log('strings:', list.length);
  const mi = process.argv.indexOf('--missing');
  if (mi > 0) {
    const l = process.argv[mi + 1], file = path.join(ROOT, 'js', `lang_${l}.js`);
    const have = fs.existsSync(file) ? new Function(fs.readFileSync(file, 'utf8') + `;return LANG_${l.toUpperCase()}`)() : {};
    const miss = list.filter(s => have[s] === undefined);
    fs.writeFileSync(path.join(__dirname, 'i18n', `missing_${l}.json`), JSON.stringify(miss, null, 1));
    console.log(`missing for ${l}:`, miss.length);
  }
})();
