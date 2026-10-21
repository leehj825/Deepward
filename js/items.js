// Deepward - gear, gold and the saved game: item generation, what equipped gear does to the hero, the inventory,
// the smith's and trader's sums, camp building levels and story progress. Everything persists in localStorage.
const Items = (() => {
  const C = CFG.gear;
  // Three save slots. Slot 1 keeps the original key so older saves land there. Each save carries a version; loading
  // runs every migration from its version up, then fills in anything missing from a fresh save. A copy of the last save
  // that loaded cleanly is kept as a backup and used if the main one is ever unreadable.
  const VERSION = 2, SLOTS = 3, keyOf = n => n === 1 ? 'dw_save_v1' : 'dw_save_' + n;
  let slot = 1; try { slot = Math.min(SLOTS, Math.max(1, +localStorage.getItem('dw_slot') || 1)); } catch (e) {}
  const SAVE_KEY_OF = () => keyOf(slot);
  let S = null;                                     // the saved state (see fresh())

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function fresh() {
    return {
      gold: 0, scrap: 0, inv: [], equip: {}, nextId: 1, looks: { skin: 0, hair: 0, style: 0, beard: 0 },
      camp: { forge: 0, apothecary: 0, yard: 0 },
      stage: 0,                                     // highest stage unlocked (running index: 3 per depth)
      story: { intro: false, pre: {}, post: {} }, main: { i: 0 }, flags: {},
      tripGold: 0, stock: [], best: 0, deaths: 0,
      level: 1, xp: 0, points: 0, talents: {}, ult: null, mastery: {}, cls: 'warrior', party: [], hired: {}, policyAdapt: null,
      gems: {}, uniques: [], mats: {}, rescued: [],                        // loose gems by kind; uniques found so far
    };
  }

  // ---------------- Growth ----------------
  const PR = CFG.progress, T = CFG.trees;
  const rank = id => S.talents[id] || 0;
  const treeOf = id => Object.keys(T).find(k => T[k].ult.id === id || T[k].talents.some(t => t.id === id));
  const spentIn = tree => T[tree].talents.reduce((n, t) => n + rank(t.id), 0) + rank(T[tree].ult.id);
  const treesUsed = () => Object.keys(T).filter(k => spentIn(k) > 0);
  const treeFor = k => !T[k].cls || T[k].cls === (S && S.cls);                  // a class's own tree is shown (and learned) by that class only
  // Why a talent cannot be learned right now ('' when it can)
  function blocked(id) {
    const tree = treeOf(id), isUlt = T[tree].ult.id === id;
    if (!treeFor(tree)) return 'Another calling';
    if (S.points < 1) return 'No talent points';
    if (rank(id) >= (isUlt ? 1 : 3)) return 'Mastered';
    if (!treesUsed().includes(tree) && treesUsed().length >= PR.maxTrees) return 'Two trees already chosen';
    if (isUlt && spentIn(tree) < PR.ultimateNeeds) return `Needs ${PR.ultimateNeeds} points in ${T[tree].name}`;
    return '';
  }
  function learn(id) {
    if (blocked(id)) return false;
    S.talents[id] = rank(id) + 1; S.points--;
    const tree = treeOf(id); if (T[tree].ult.id === id && !S.ult) S.ult = id;
    return true;
  }
  function respec() { S.points += Object.values(S.talents).reduce((a, b) => a + b, 0); S.talents = {}; S.ult = null; }
  // Adds XP; returns how many levels were gained
  function addXp(n) {
    S.xp += Math.round(n); let up = 0;
    while (S.xp >= PR.xpFor(S.level)) { S.xp -= PR.xpFor(S.level); S.level++; S.points++; up++; }
    return up;
  }
  const masteryRank = type => PR.mastery.filter(x => (S.mastery[type] || 0) >= x).length;
  // Adds mastery to a weapon type; returns the new rank if it went up, else 0
  function addMastery(type, n) { const r0 = masteryRank(type); S.mastery[type] = (S.mastery[type] || 0) + n; const r1 = masteryRank(type); return r1 > r0 ? r1 : 0; }

  // ---------------- Generating gear ----------------
  function rollRarity(minR = 0, boost = 0) {
    const R = C.rarities, w = R.map((r, i) => i < minR ? 0 : r.weight * (i > 0 ? 1 + boost : 1)), tot = w.reduce((a, b) => a + b, 0);
    let x = Math.random() * tot;
    for (let i = 0; i < R.length; i++) { x -= w[i]; if (x <= 0) return i; }
    return minR;
  }
  const SUFFIX = { crit: 'of Ruin', posture: 'of the Ram', regen: 'of Second Wind', hp: 'of the Oak', stamina: 'of the Long Road', parry: 'of the Wall', lifesteal: 'of Thirst', gold: 'of Fortune', fire: 'of Embers', frost: 'of Rime', shock: 'of Storms' };
  // A piece's weight class: 0 light, 1 medium, 2 heavy (older saves: helms by style, armour by tier band)
  const wcOf = it => it.wc !== undefined ? it.wc : it.slot === 'helm' ? (it.style || 0) : Math.min(2, Math.floor(it.tier / 2));
  // The warden's class (older saves are all warriors), and what it carries in the off hand
  const cls = () => (S && CFG.classes[S.cls]) ? S.cls : 'warrior';
  const classDef = () => CFG.classes[cls()];
  const offhandOf = it => it && it.slot === 'shield' ? (it.kind || 'shield') : '';
  // The label for a gear slot: the off-hand slot is a shield, a quiver, an orb or a tome by class
  const slotName = slot => slot === 'shield' ? C.offhands[classDef().offhand].label : C.slotNames[slot];
  // A random bonus that may go on this slot, rolled for the tier (some bonuses are for certain classes only)
  const affixKeys = slot => Object.keys(C.affixes).filter(k => (!C.affixes[k].only || C.affixes[k].only.includes(slot)) && (!C.affixes[k].cls || C.affixes[k].cls.includes(cls())));
  function rollAffix(k, tier) { const a = C.affixes[k]; return { k, v: Math.round((rand(a.min, a.max) + a.step * tier) * (a.unit === 's' ? 1000 : 1)) / (a.unit === 's' ? 1000 : 1) }; }
  function generate(tier, opt = {}) {
    tier = Math.max(0, Math.min(C.tierNames.length - 1, tier));
    const slot = opt.slot || pick(C.slots), rarity = opt.rarity !== undefined ? opt.rarity : rollRarity(opt.minRarity || 0, opt.boost || 0);
    const it = { id: S ? S.nextId++ : 0, slot, tier, rarity, plus: 0, aff: [] };
    const tn = C.tierNames[tier], band = Math.min(2, Math.floor(tier / 2));
    if (slot === 'weapon') { it.type = opt.type || pick(classDef().weapons); it.name = tn + ' ' + C.weapons[it.type].name; }
    else if (slot === 'shield') { it.kind = opt.kind || classDef().offhand; it.name = tn + ' ' + C.offhands[it.kind].names[band]; }
    else if (slot === 'armor') it.name = tn + ' ' + C.armors[band];
    else if (slot === 'trinket') it.name = tn + ' ' + pick(C.trinkets);
    else if (slot === 'ring') it.name = tn + ' ' + pick(C.rings);
    if (C.weightSlots.includes(slot)) {                                     // light, medium or heavy
      it.wc = opt.wc !== undefined ? opt.wc : Math.floor(Math.random() * 3);
      const names = { armor: C.armors, helm: C.helms, gloves: C.gloves, boots: C.boots }[slot];
      it.name = tn + ' ' + names[it.wc]; if (slot === 'helm') it.style = it.wc;
    }
    const nAff = C.rarities[rarity].affixes + (slot === 'trinket' || slot === 'ring' ? 1 : 0), keys = affixKeys(slot).sort(() => Math.random() - 0.5).slice(0, nAff);
    for (const k of keys) it.aff.push(rollAffix(k, tier));
    if (rarity >= 2 && it.aff.length) it.name += ' ' + SUFFIX[it.aff[0].k];
    if (C.sockets.slots.includes(slot)) { const [a, b] = C.sockets.byRarity[rarity]; it.gems = new Array(a + Math.floor(Math.random() * (b - a + 1))).fill(null); }
    return it;
  }
  // A named legendary (one not yet found, while any are left)
  function generateUnique(tier, opt = {}) {
    const mine = C.uniques.filter(u => (!u.cls || u.cls === cls()) && (u.slot !== 'weapon' || classDef().weapons.includes(u.type)));                // a class finds only its own weapons
    const left = mine.filter(u => !S.uniques.includes(u.id) && (!opt.slot || u.slot === opt.slot));
    const u = opt.id ? C.uniques.find(x => x.id === opt.id) : pick(left.length ? left : mine.filter(x => !opt.slot || x.slot === opt.slot).length ? mine.filter(x => !opt.slot || x.slot === opt.slot) : mine);
    const it = generate(tier, { slot: u.slot, type: u.type, rarity: 3, kind: u.slot === 'shield' ? u.kind : undefined });
    it.name = u.name; it.uniq = u.id;
    if (!S.uniques.includes(u.id)) S.uniques.push(u.id);
    return it;
  }
  const isUnique = it => !!(it && it.uniq);
  const colorOf = it => it.uniq ? C.uniqueColor : C.rarities[it.rarity].color;
  // A random gem kind
  const randomGem = () => pick(Object.keys(C.gems));
  function addGem(kind, n = 1) { S.gems[kind] = (S.gems[kind] || 0) + n; }
  // Materials (pelts, tusks, bones, ore, herbs)
  function addMat(kind, n = 1) { S.mats = S.mats || {}; S.mats[kind] = (S.mats[kind] || 0) + n; }
  const hasMats = need => Object.entries(need || {}).every(([k, n]) => ((S.mats || {})[k] || 0) >= n);
  function spendMats(need) { if (!hasMats(need)) return false; for (const [k, n] of Object.entries(need || {})) S.mats[k] -= n; return true; }
  // Bram's hunter work: a piece from a recipe, at the warden's depth
  function craft(r) {
    if (!hasMats(r.need) || S.gold < r.gold || S.inv.length >= C.invSize) return null;
    spendMats(r.need); S.gold -= r.gold;
    const it = generate(Math.min(S.stage, C.tierNames.length - 1), { slot: r.slot, wc: r.wc, rarity: r.rarity });
    it.name = r.name; it.aff = r.aff.map(k => rollAffix(k, it.tier)); add(it); return it;
  }
  // Set a loose gem into an item's first empty socket, or take one out
  function setGem(it, kind) { const i = (it.gems || []).indexOf(null); if (i < 0 || !(S.gems[kind] > 0)) return false; it.gems[i] = kind; S.gems[kind]--; return true; }
  function pryGems(it) { for (let i = 0; i < (it.gems || []).length; i++) if (it.gems[i]) { addGem(it.gems[i]); it.gems[i] = null; } }
  function addSocket(it) {
    const c = C.sockets.addCost; it.gems = it.gems || [];
    if (it.gems.length >= C.sockets.max || S.gold < c.gold || S.scrap < c.scrap) return false;
    S.gold -= c.gold; S.scrap -= c.scrap; it.gems.push(null); return true;
  }
  // Main stats of an item after rarity and upgrades
  function main(it) {
    const m = C.rarities[it.rarity].mult * (1 + C.upgradeStep * it.plus), t = it.tier;
    if (it.slot === 'weapon') return { dmg: (1 + 0.16 * t) * m };
    if (it.slot === 'shield' && it.kind && it.kind !== 'shield') {                      // quiver, orb, tome: a weak guard and a bonus of their own
      const o = C.offhands[it.kind], k = (1 + 0.3 * t) * m;
      return { block: Math.min(0.8, o.block + 0.02 * t * m), guard: Math.max(0.8, o.guard - 0.1 * t * m), dmg: (o.dmg || 0) * k, crit: (o.crit || 0) * k, regen: (o.regen || 0) * k, mend: (o.mend || 0) * k };
    }
    if (it.slot === 'shield') return { block: Math.min(0.95, 0.7 + 0.035 * t * m + 0.03 * (m - 1)), guard: Math.max(0.5, 1.2 - 0.07 * t * m - 0.2 * (m - 1)) };
    const wm = C.weightSlots.includes(it.slot) ? C.weightMult[wcOf(it)] : 1;
    if (it.slot === 'armor') return { hp: Math.round((14 + 12 * t) * m * wm), dr: Math.min(0.3, (0.03 + 0.02 * t) * m * wm) };
    if (it.slot === 'helm') return { hp: Math.round((8 + 7 * t) * m * wm), stamina: Math.round((5 + 4 * t) * m) };
    if (it.slot === 'gloves') return { dmg: (0.02 + 0.008 * t) * m * wm, posture: (0.03 + 0.01 * t) * m * wm };
    if (it.slot === 'boots') return { hp: Math.round((5 + 4 * t) * m * wm), stamina: Math.round((4 + 3 * t) * m) };
    return {};
  }
  // Short text lines describing an item
  function describe(it) {
    const m = main(it), L = [];
    if (it.uniq) L.push('★ ' + C.uniques.find(u => u.id === it.uniq).desc);
    if (it.gems && it.gems.length) L.push('Sockets: ' + it.gems.map(g => g ? C.gems[g].icon : '◇').join(' '));
    if (it.slot === 'weapon') {
      const w = C.weapons[it.type]; L.push(`Damage x${(m.dmg * w.dmg).toFixed(2)}`, `Posture x${w.posture.toFixed(2)}`, w.speed < 1 ? `Swing speed ${Math.round(w.speed * 100)}%` : 'Swing speed 100%'); if (w.range) L.push(`Reach ${w.range > 0 ? '+' : ''}${w.range} m`);
      if (w.twoHanded) L.push(`Two-handed: no shield, blade blocks ${Math.round(w.block * 100)}%, +${Math.round(w.exposed * 100)}% damage taken`);
      if (w.dual) L.push(`Twin blades: five-cut combo, dashes cost ${Math.round((1 - w.dash) * 100)}% less, no shield, blades block ${Math.round(w.block * 100)}%`);
      if (w.combo === 'spear') L.push('Spear: long thrusts and a wide sweep; heavy is a lunging thrust');
      if (w.combo === 'bow') L.push('Bow: quick arrows from afar; heavy is a fan of arrows');
      if (w.combo === 'staff') L.push('Staff: arcane bolts; heavy calls a fireball down on the target');
      if (w.combo === 'scepter') L.push('Scepter: holy bolts (more against the undead) or a heal, by mode; heavy is a stronger smite or an area heal');
    }
    if (it.slot === 'shield') {
      if (m.dmg) L.push(`+${Math.round(m.dmg * 100)}% damage`); if (m.crit) L.push(`+${Math.round(m.crit * 100)}% critical chance`);
      if (m.regen) L.push(`+${Math.round(m.regen * 100)}% stamina regen`); if (m.mend) L.push(`+${Math.round(m.mend * 100)}% healing power`);
      L.push(`Blocks ${Math.round(m.block * 100)}% of damage`, `Stamina per block x${m.guard.toFixed(2)}`);
    }
    if (it.slot === 'armor') L.push(`+${m.hp} health`, `${Math.round(m.dr * 100)}% damage reduction`);
    if (it.slot === 'helm') L.push(`+${m.hp} health`, `+${m.stamina} stamina`);
    if (it.slot === 'gloves') L.push(`+${Math.round(m.dmg * 100)}% damage`, `+${Math.round(m.posture * 100)}% posture damage`);
    if (it.slot === 'boots') L.push(`+${m.hp} health`, `+${m.stamina} stamina`);
    if (C.weightSlots.includes(it.slot)) L.push(`${C.weightNames[wcOf(it)]} · weight ${C.weight[it.slot][wcOf(it)]}`);
    for (const a of it.aff) { const d = C.affixes[a.k]; L.push(`+${a.v}${d.unit === 's' ? ' s' : d.unit} ${d.name.toLowerCase()}`); }
    return L;
  }
  const value = it => Math.round(12 * (it.tier + 1) * (1 + it.rarity * 0.9) * (1 + 0.3 * it.plus) * (it.uniq ? 2 : 1));
  const fullName = it => it.name + (it.plus ? ' +' + it.plus : '');

  // ---------------- What the gear does ----------------
  // Everything the hero's numbers depend on, from gear, affixes and the camp's buildings
  function stats() {
    const E = S.equip, w = E.weapon, wt = C.weapons[w ? w.type : 'sword'], two = !!wt.twoHanded, free = two || !!wt.dual, sh = free ? null : E.shield, cp = S.camp;
    const A = {}; for (const k in C.affixes) A[k] = 0;
    for (const s of C.slots) if (E[s] && !(s === 'shield' && free)) for (const a of E[s].aff) A[a.k] += a.v;
    const arm = E.armor ? main(E.armor) : { hp: 0, dr: 0 }, hel = E.helm ? main(E.helm) : { hp: 0, stamina: 0 }, shm = sh ? main(sh) : null;
    const glv = E.gloves ? main(E.gloves) : { dmg: 0, posture: 0 }, bts = E.boots ? main(E.boots) : { hp: 0, stamina: 0 };
    // The load of what is worn: over 'light' it makes the dash dearer and shorter and the walk a little slower
    let load = 0; for (const s of C.weightSlots) if (E[s]) load += C.weight[s][wcOf(E[s])];
    const LD = C.load, over = load - LD.light;
    const lv = S.level - 1, L = PR.perLevel, type = w ? w.type : 'sword', mr = masteryRank(type), R = rank;
    // Gems in equipped sockets, and the uniques worn
    const G2 = { ruby: 0, sapphire: 0, emerald: 0, topaz: 0, onyx: 0 }, u = {};
    for (const s of C.slots) { const it = E[s]; if (!it || (s === 'shield' && free)) continue; for (const g of it.gems || []) if (g) G2[g]++; if (it.uniq) u[it.uniq] = true; }
    const CL = classDef(), rangedW = !!wt.ranged;
    const out = {
      maxHp: Math.round((CFG.player.hp + cp.yard * 12 + arm.hp + hel.hp + bts.hp + A.hp + lv * L.hp) * CL.hp),
      maxSt: Math.round((CFG.player.stamina + cp.yard * 8 + hel.stamina + bts.stamina + A.stamina + lv * L.stamina) * CL.st),
      dmg: (w ? main(w).dmg : 0.85) * wt.dmg * (1 + lv * L.power) * (1 + (mr >= 1 ? PR.masteryDmg : 0)) * (1 + glv.dmg),
      posture: wt.posture * (1 + A.posture / 100 + glv.posture) * (1 + 0.1 * R('breaker')) * (mr >= 3 ? 1.08 : 1), speed: wt.speed * (1 + 0.06 * R('quick')), range: wt.range,
      load: +load.toFixed(1), loadClass: load <= LD.light ? 0 : load <= LD.heavy ? 1 : 2,
      dashDist: Math.min(1.06, Math.max(0.88, 1 - LD.dashDist * over)), move: Math.min(1.03, Math.max(0.94, 1 - LD.move * over)),
      burn: A.fire / 100, chill: A.frost / 100, shock: A.shock / 100,
      crit: A.crit / 100 + 0.04 * R('precision') + (shm && shm.crit || 0), block: free ? wt.block : shm ? shm.block : 0.5,
      guard: (free ? wt.guard : shm ? shm.guard : 1.7) * (1 - 0.1 * R('steady')), parry: CFG.player.block.parryWindow + A.parry + 0.03 * R('keen'),
      regen: (1 + A.regen / 100) * (1 + 0.1 * R('focus')) * (1 + (shm && shm.regen || 0)), dr: arm.dr - (two ? wt.exposed : 0) + 0.05 * R('ward'), twoHanded: two,
      lifesteal: A.lifesteal / 100 + 0.02 * R('thirst'), goldFind: 1 + A.gold / 100,
      flasks: CFG.camp.flasks + cp.apothecary, flaskHeal: CFG.camp.flaskHeal + 0.08 * cp.apothecary,
      // talents the fight reads directly
      critMult: CFG.player.critMult * (1 + 0.25 * R('riposte')), dashCost: (1 - 0.15 * R('feet')) * (wt.dash || 1) * (CL.dash || 1) * Math.min(1.3, Math.max(0.85, 1 + LD.dashCost * over)), counter: 0.3 * R('counter'),
      fury: 0.04 * R('fury'), fire: 0.06 * R('ember'), finisher: mr >= 2 && !rangedW, ranged: rangedW, cls: cls(), mend: 1 + A.mend / 100 + (shm && shm.mend || 0) + 0.1 * R('mercy') + (mr >= 2 && type === 'scepter' ? 0.1 : 0), fan: R('volley') + (mr >= 2 && type === 'bow' ? 2 : 0), blast: 0.4 * R('blast') + (mr >= 2 && type === 'staff' ? 0.5 : 0), longshot: 0.08 * R('longshot'), wildfire: R('wildfire'), healCd: 1 - 0.1 * R('prayer'), radiance: 0.06 * R('radiance'), art: mr >= 3 && CFG.player.arts[type] ? type : null, weaponType: type, ult: S.ult, combo: wt.combo || null, dual: !!wt.dual, u,
    };
    out.dmg *= (1 + A.power / 100) * (1 + (shm && shm.dmg || 0)) * (1 + 0.08 * R('conduit'));
    out.dmg *= 1 + 0.06 * G2.ruby; out.maxSt += 10 * G2.sapphire; out.maxHp += 15 * G2.emerald; out.crit += 0.04 * G2.topaz; out.dr += 0.025 * G2.onyx;
    if (u.aegis) out.parry += 0.04;
    if (u.dawnlight) { out.mend += 0.3; out.lifesteal += 0.03; }
    if (u.coin) { out.crit += 0.15; out.maxHp = Math.round(out.maxHp * 0.9); }
    if (u.heart) { out.flasks += 1; out.flaskHeal += 0.15; }
    return out;
  }
  // The hero's numbers if it were worn in place of what is in its slot (or with that slot empty when it is null)
  function statsWith(slot, it) {
    const old = S.equip[slot];
    if (it) S.equip[slot] = it; else delete S.equip[slot];
    try { return stats(); } finally { if (old) S.equip[slot] = old; else delete S.equip[slot]; }
  }
  // How the hero should look in this gear (read by Rig.build)
  const rc = i => [0x8a8f99, 0x9ac8ff, 0xd7a8ff, 0xffcf70][i];
  const SHIELD_FACE = [0x6a4a2c, 0x2f4a6b, 0x5a2a6b, 0x8a5a14], ARMOR_CLOTH = [0x5a4632, 0x2f4a6b, 0x4a3a6a, 0x6a4a1a];
  // How one item looks on its own (read by Rig.item for the gear screen's pictures)
  function itemLook(it) {
    const w = it.slot === 'weapon' ? C.weapons[it.type] : null;
    return { slot: it.slot, type: it.type, kind: offhandOf(it), len: w ? w.len : 0, twoHanded: !!(w && w.twoHanded), blade: rc(it.rarity), glow: it.rarity >= 2 ? rc(it.rarity) : 0,
      face: SHIELD_FACE[it.rarity], armor: ARMOR_CLOTH[it.rarity], plate: C.weightSlots.includes(it.slot) ? wcOf(it) === 2 : it.tier >= 2, helm: it.slot === 'helm' ? wcOf(it) : 0, wc: C.weightSlots.includes(it.slot) ? wcOf(it) : 0,
      trinket: it.slot === 'ring' || / Ring$| Ring /.test(it.name) ? 'Ring' : it.slot === 'trinket' ? (C.trinkets.find(t => it.name.includes(t)) || (it.uniq === 'coin' ? 'Coin' : 'Amulet')) : '', uniq: it.uniq || '' };
  }
  function look() {
    const E = S.equip, AP = CFG.appearance, lk = S.looks || {};
    return {
      weapon: E.weapon ? E.weapon.type : 'sword', caster: !!(E.weapon && C.weapons[E.weapon.type].caster), weaponLen: E.weapon ? C.weapons[E.weapon.type].len : 0.92,
      blade: E.weapon ? rc(E.weapon.rarity) : 0x8a8f99, glow: E.weapon && E.weapon.rarity >= 2 ? rc(E.weapon.rarity) : 0,
      twoHanded: !!(E.weapon && C.weapons[E.weapon.type].twoHanded),
      dual: !!(E.weapon && C.weapons[E.weapon.type].dual),
      shield: !!E.shield && offhandOf(E.shield) === 'shield' && !(E.weapon && (C.weapons[E.weapon.type].twoHanded || C.weapons[E.weapon.type].dual)), offhand: E.shield && offhandOf(E.shield) !== 'shield' ? offhandOf(E.shield) : '', shieldFace: E.shield ? SHIELD_FACE[E.shield.rarity] : 0,
      armor: E.armor ? ARMOR_CLOTH[E.armor.rarity] : 0x6a5a48, plate: !!E.armor && wcOf(E.armor) === 2, mail: !!E.armor && wcOf(E.armor) === 1,
      helm: E.helm ? wcOf(E.helm) : -1, trinket: !!E.trinket, ring: !!E.ring,
      gloves: E.gloves ? wcOf(E.gloves) : -1, boots: E.boots ? wcOf(E.boots) : -1,
      // the warden's own looks
      skin: AP.skins[lk.skin] || AP.skins[0], hair: AP.hairs[lk.hair] || AP.hairs[0], hairStyle: (AP.styles[lk.style] || AP.styles[0])[0], beard: (AP.beards[lk.beard] || AP.beards[0])[0],
    };
  }

  // ---------------- Inventory and money ----------------
  function add(it) { if (S.inv.length >= C.invSize) { S.scrap += CFG.camp.salvage[it.rarity]; return false; } S.inv.push(it); return true; }
  function equip(id) {
    const i = S.inv.findIndex(x => x.id === id); if (i < 0) return;
    const it = S.inv[i], old = S.equip[it.slot];
    S.inv.splice(i, 1); S.equip[it.slot] = it; if (old) S.inv.push(old);
  }
  function unequip(slot) { const it = S.equip[slot]; if (!it || S.inv.length >= C.invSize) return; delete S.equip[slot]; S.inv.push(it); }
  function remove(id) { const i = S.inv.findIndex(x => x.id === id); return i < 0 ? null : S.inv.splice(i, 1)[0]; }
  function addGold(n) { n = Math.round(n); S.gold += n; S.tripGold += n; return n; }
  // Bram rerolls one bonus: a different kind that fits the slot and is not already on the piece, rolled for its tier
  const rerollCost = it => { const R = C.reroll, k = 1 + R.growth * (it.rerolls || 0); return { gold: Math.round(R.gold * (it.tier + 1) * k), scrap: Math.round(R.scrap * k) }; };
  function reroll(it, i) {
    const c = rerollCost(it), cur = it.aff[i]; if (!cur || S.gold < c.gold || S.scrap < c.scrap) return false;
    const have = it.aff.map(a => a.k), keys = affixKeys(it.slot).filter(k => !have.includes(k));
    if (!keys.length) return false;
    S.gold -= c.gold; S.scrap -= c.scrap; it.rerolls = (it.rerolls || 0) + 1;
    it.aff[i] = rollAffix(pick(keys), it.tier);
    return true;
  }
  function upgradeCost(it) { return { gold: Math.round(40 * (it.tier + 1) * (1 + it.rarity * 0.5) * (1 + it.plus * 0.6)), scrap: 2 + it.plus * 2 + it.rarity }; }
  const maxPlus = () => C.maxUpgrade[S.camp.forge];

  // ---------------- Saving ----------------
  function save() { if (!S) return; S.v = VERSION; S.savedAt = Date.now(); try { localStorage.setItem(SAVE_KEY_OF(), JSON.stringify(S)); } catch (e) {} }
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  function hasSave(n = slot) { return !!read(keyOf(n)); }
  // Older saves step up one version at a time
  const MIGRATE = {
    1: d => {                                                               // v1 -> v2: weight classes are fixed on each piece
      for (const it of [...(d.inv || []), ...Object.values(d.equip || {}), ...(d.stock || [])]) if (it && C.weightSlots.includes(it.slot) && it.wc === undefined) it.wc = wcOf(it);
    },
  };
  // Fill in fields a newer version added, without touching what the save has (one level into plain objects)
  function withDefaults(d) {
    const f = fresh();
    for (const k in f) {
      if (d[k] === undefined) d[k] = f[k];
      else if (f[k] && typeof f[k] === 'object' && !Array.isArray(f[k]) && d[k] && typeof d[k] === 'object') for (const j in f[k]) if (d[k][j] === undefined) d[k][j] = f[k][j];
    }
    return d;
  }
  function parse(text) {
    try { const d = JSON.parse(text); if (!d || !d.equip || !d.camp) return null; for (let v = d.v || 1; v < VERSION; v++) if (MIGRATE[v]) MIGRATE[v](d); d.v = VERSION; return withDefaults(d); } catch (e) { return null; }
  }
  function load() {
    const k = SAVE_KEY_OF(), main = read(k);
    let d = main && parse(main);
    if (d) { try { localStorage.setItem(k + '_bak', main); } catch (e) {} }   // the last save that loaded cleanly
    else if (main) { const b = read(k + '_bak'); d = b && parse(b); }            // unreadable: fall back to the backup
    if (!d) return false;
    S = d; return true;
  }
  // ---------------- Save slots ----------------
  function useSlot(n) { slot = Math.min(SLOTS, Math.max(1, n)); try { localStorage.setItem('dw_slot', String(slot)); } catch (e) {} }
  // A summary of a slot for the saves screen (null when empty)
  function slotInfo(n) {
    const d = parse(read(keyOf(n)) || ''); if (!d) return null;
    return { level: d.level, stage: d.stage, gold: d.gold, savedAt: d.savedAt || 0, deaths: d.deaths || 0, best: d.endless ? d.endless.best : 0 };
  }
  function deleteSlot(n) { try { localStorage.removeItem(keyOf(n)); localStorage.removeItem(keyOf(n) + '_bak'); } catch (e) {} if (n === slot) S = null; }
  // Export: a text code to keep or move to another device; import checks it before writing it into a slot
  const PREFIX = 'DEEPWARD1:';
  function exportSlot(n) { const t = read(keyOf(n)); if (!t || !parse(t)) return ''; return PREFIX + btoa(unescape(encodeURIComponent(t))); }
  function importSlot(n, code) {
    code = String(code || '').trim().replace(/\s+/g, '');
    if (!code.startsWith(PREFIX)) return false;
    let text; try { text = decodeURIComponent(escape(atob(code.slice(PREFIX.length)))); } catch (e) { return false; }
    const d = parse(text); if (!d) return false;
    try { localStorage.setItem(keyOf(n), JSON.stringify(d)); } catch (e) { return false; }
    if (n === slot) S = d;
    return true;
  }
  function newGame(c = 'warrior') {
    S = fresh(); S.cls = CFG.classes[c] ? c : 'warrior';
    S.equip.weapon = generate(0, { slot: 'weapon', type: classDef().start, rarity: 0 });
    S.equip.shield = generate(0, { slot: 'shield', rarity: 0 });
    save();
  }
  // The new warden picks a class: the starting weapon and off-hand piece change to match (only before the first descent)
  function setClass(c) {
    if (!CFG.classes[c]) return false;
    S.cls = c; S.inv = []; S.equip = {};
    S.equip.weapon = generate(0, { slot: 'weapon', type: classDef().start, rarity: 0 });
    S.equip.shield = generate(0, { slot: 'shield', rarity: 0 });
    save(); return true;
  }
  function wipe() { try { localStorage.removeItem(SAVE_KEY_OF()); } catch (e) {} }

  // Has the warden freed this person from the Deep? (their perk applies for good)
  const rescued = id => !!(S && (S.rescued || []).some(r => r.id === id));
  // Free a captive: the next of the named people not yet home, or a townsperson by name. Returns who.
  function rescue() {
    const R = S.rescued = S.rescued || [], C = CFG.rescues;
    let who = C.people.find(p => !rescued(p.id));
    if (!who) { const n = C.names[R.length % C.names.length]; who = { id: 'f' + R.length, name: n, look: { cloth: [0x6a5a4a, 0x4a5a6a, 0x5a4a3a, 0x6a3a3a][R.length % 4], hair: [0x3a2a1a, 0x8a6a3a, 0x5a3a1a][R.length % 3] } }; }
    R.push({ id: who.id, name: who.name, look: who.look }); return who;
  }
  return {
    get S() { return S; }, rescued, rescue, addMat, hasMats, spendMats, craft, generate, generateUnique, isUnique, colorOf, randomGem, addGem, setGem, pryGems, addSocket, main, describe, value, fullName, stats, statsWith, look, itemLook, add, equip, unequip, remove, addGold,
    upgradeCost, maxPlus, rerollCost, reroll, wcOf, useSlot, slotInfo, deleteSlot, exportSlot, importSlot, get slot() { return slot; }, SLOTS, save, load, hasSave, newGame, setClass, cls, classDef, slotName, offhandOf, wipe, rollRarity,
    rank, blocked, learn, respec, treeFor, addXp, masteryRank, addMastery, spentIn, treesUsed,
  };
})();
