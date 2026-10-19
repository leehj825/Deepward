// Deepward - gear, gold and the saved game: item generation, what equipped gear does to the hero, the inventory,
// the smith's and trader's sums, camp building levels and story progress. Everything persists in localStorage.
const Items = (() => {
  const C = CFG.gear, SAVE_KEY = 'dw_save_v1';
  let S = null;                                     // the saved state (see fresh())

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function fresh() {
    return {
      gold: 0, scrap: 0, inv: [], equip: {}, nextId: 1,
      camp: { forge: 0, apothecary: 0, yard: 0 },
      stage: 0,                                     // highest stage unlocked (running index: 3 per depth)
      story: { intro: false, pre: {}, post: {} },
      tripGold: 0, stock: [], best: 0, deaths: 0,
      level: 1, xp: 0, points: 0, talents: {}, ult: null, mastery: {},
    };
  }

  // ---------------- Growth ----------------
  const PR = CFG.progress, T = CFG.trees;
  const rank = id => S.talents[id] || 0;
  const treeOf = id => Object.keys(T).find(k => T[k].ult.id === id || T[k].talents.some(t => t.id === id));
  const spentIn = tree => T[tree].talents.reduce((n, t) => n + rank(t.id), 0) + rank(T[tree].ult.id);
  const treesUsed = () => Object.keys(T).filter(k => spentIn(k) > 0);
  // Why a talent cannot be learned right now ('' when it can)
  function blocked(id) {
    const tree = treeOf(id), isUlt = T[tree].ult.id === id;
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
  const SUFFIX = { crit: 'of Ruin', posture: 'of the Ram', regen: 'of Second Wind', hp: 'of the Oak', stamina: 'of the Long Road', parry: 'of the Wall', lifesteal: 'of Thirst', gold: 'of Fortune' };
  function generate(tier, opt = {}) {
    tier = Math.max(0, Math.min(C.tierNames.length - 1, tier));
    const slot = opt.slot || pick(C.slots), rarity = opt.rarity !== undefined ? opt.rarity : rollRarity(opt.minRarity || 0, opt.boost || 0);
    const it = { id: S ? S.nextId++ : 0, slot, tier, rarity, plus: 0, aff: [] };
    const tn = C.tierNames[tier], band = Math.min(2, Math.floor(tier / 2));
    if (slot === 'weapon') { it.type = opt.type || pick(Object.keys(C.weapons)); it.name = tn + ' ' + C.weapons[it.type].name; }
    else if (slot === 'shield') it.name = tn + ' ' + C.shields[band];
    else if (slot === 'armor') it.name = tn + ' ' + C.armors[band];
    else if (slot === 'helm') { it.style = band; it.name = tn + ' ' + C.helms[band]; }
    else it.name = tn + ' ' + pick(C.trinkets);
    const nAff = C.rarities[rarity].affixes + (slot === 'trinket' ? 1 : 0), keys = Object.keys(C.affixes).sort(() => Math.random() - 0.5).slice(0, nAff);
    for (const k of keys) { const a = C.affixes[k]; it.aff.push({ k, v: Math.round((rand(a.min, a.max) + a.step * tier) * (a.unit === 's' ? 1000 : 1)) / (a.unit === 's' ? 1000 : 1) }); }
    if (rarity >= 2 && it.aff.length) it.name += ' ' + SUFFIX[it.aff[0].k];
    return it;
  }
  // Main stats of an item after rarity and upgrades
  function main(it) {
    const m = C.rarities[it.rarity].mult * (1 + C.upgradeStep * it.plus), t = it.tier;
    if (it.slot === 'weapon') return { dmg: (1 + 0.16 * t) * m };
    if (it.slot === 'shield') return { block: Math.min(0.95, 0.7 + 0.035 * t * m + 0.03 * (m - 1)), guard: Math.max(0.5, 1.2 - 0.07 * t * m - 0.2 * (m - 1)) };
    if (it.slot === 'armor') return { hp: Math.round((14 + 12 * t) * m), dr: Math.min(0.3, (0.03 + 0.02 * t) * m) };
    if (it.slot === 'helm') return { hp: Math.round((8 + 7 * t) * m), stamina: Math.round((5 + 4 * t) * m) };
    return {};
  }
  // Short text lines describing an item
  function describe(it) {
    const m = main(it), L = [];
    if (it.slot === 'weapon') {
      const w = C.weapons[it.type]; L.push(`Damage x${(m.dmg * w.dmg).toFixed(2)}`, `Posture x${w.posture.toFixed(2)}`, w.speed < 1 ? `Swing speed ${Math.round(w.speed * 100)}%` : 'Swing speed 100%'); if (w.range) L.push(`Reach ${w.range > 0 ? '+' : ''}${w.range} m`);
      if (w.twoHanded) L.push(`Two-handed: no shield, blade blocks ${Math.round(w.block * 100)}%, +${Math.round(w.exposed * 100)}% damage taken`);
      if (w.dual) L.push(`Twin blades: five-cut combo, dashes cost ${Math.round((1 - w.dash) * 100)}% less, no shield, blades block ${Math.round(w.block * 100)}%`);
      if (w.combo === 'spear') L.push('Spear: long thrusts and a wide sweep; heavy is a lunging thrust');
    }
    if (it.slot === 'shield') L.push(`Blocks ${Math.round(m.block * 100)}% of damage`, `Stamina per block x${m.guard.toFixed(2)}`);
    if (it.slot === 'armor') L.push(`+${m.hp} health`, `${Math.round(m.dr * 100)}% damage reduction`);
    if (it.slot === 'helm') L.push(`+${m.hp} health`, `+${m.stamina} stamina`);
    for (const a of it.aff) { const d = C.affixes[a.k]; L.push(`+${a.v}${d.unit === 's' ? ' s' : d.unit} ${d.name.toLowerCase()}`); }
    return L;
  }
  const value = it => Math.round(12 * (it.tier + 1) * (1 + it.rarity * 0.9) * (1 + 0.3 * it.plus));
  const fullName = it => it.name + (it.plus ? ' +' + it.plus : '');

  // ---------------- What the gear does ----------------
  // Everything the hero's numbers depend on, from gear, affixes and the camp's buildings
  function stats() {
    const E = S.equip, w = E.weapon, wt = C.weapons[w ? w.type : 'sword'], two = !!wt.twoHanded, free = two || !!wt.dual, sh = free ? null : E.shield, cp = S.camp;
    const A = {}; for (const k in C.affixes) A[k] = 0;
    for (const s of C.slots) if (E[s] && !(s === 'shield' && free)) for (const a of E[s].aff) A[a.k] += a.v;
    const arm = E.armor ? main(E.armor) : { hp: 0, dr: 0 }, hel = E.helm ? main(E.helm) : { hp: 0, stamina: 0 }, shm = sh ? main(sh) : null;
    const lv = S.level - 1, L = PR.perLevel, type = w ? w.type : 'sword', mr = masteryRank(type), R = rank;
    return {
      maxHp: Math.round(CFG.player.hp + cp.yard * 12 + arm.hp + hel.hp + A.hp + lv * L.hp),
      maxSt: Math.round(CFG.player.stamina + cp.yard * 8 + hel.stamina + A.stamina + lv * L.stamina),
      dmg: (w ? main(w).dmg : 0.85) * wt.dmg * (1 + lv * L.power) * (1 + (mr >= 1 ? PR.masteryDmg : 0)),
      posture: wt.posture * (1 + A.posture / 100) * (1 + 0.1 * R('breaker')) * (mr >= 3 ? 1.08 : 1), speed: wt.speed, range: wt.range,
      crit: A.crit / 100 + 0.04 * R('precision'), block: free ? wt.block : shm ? shm.block : 0.5,
      guard: (free ? wt.guard : shm ? shm.guard : 1.7) * (1 - 0.1 * R('steady')), parry: CFG.player.block.parryWindow + A.parry + 0.03 * R('keen'),
      regen: (1 + A.regen / 100) * (1 + 0.1 * R('focus')), dr: arm.dr - (two ? wt.exposed : 0) + 0.05 * R('ward'), twoHanded: two,
      lifesteal: A.lifesteal / 100 + 0.02 * R('thirst'), goldFind: 1 + A.gold / 100,
      flasks: CFG.camp.flasks + cp.apothecary, flaskHeal: CFG.camp.flaskHeal + 0.08 * cp.apothecary,
      // talents the fight reads directly
      critMult: CFG.player.critMult * (1 + 0.25 * R('riposte')), dashCost: (1 - 0.15 * R('feet')) * (wt.dash || 1), counter: 0.3 * R('counter'),
      fury: 0.04 * R('fury'), fire: 0.06 * R('ember'), finisher: mr >= 2, weaponType: type, ult: S.ult, combo: wt.combo || null, dual: !!wt.dual,
    };
  }
  // How the hero should look in this gear (read by Rig.build)
  function look() {
    const E = S.equip, rc = i => [0x8a8f99, 0x9ac8ff, 0xd7a8ff, 0xffcf70][i];
    return {
      weapon: E.weapon ? E.weapon.type : 'sword', weaponLen: E.weapon ? C.weapons[E.weapon.type].len : 0.92,
      blade: E.weapon ? rc(E.weapon.rarity) : 0x8a8f99, glow: E.weapon && E.weapon.rarity >= 2 ? rc(E.weapon.rarity) : 0,
      twoHanded: !!(E.weapon && C.weapons[E.weapon.type].twoHanded),
      dual: !!(E.weapon && C.weapons[E.weapon.type].dual),
      shield: !!E.shield && !(E.weapon && (C.weapons[E.weapon.type].twoHanded || C.weapons[E.weapon.type].dual)), shieldFace: E.shield ? [0x6a4a2c, 0x2f4a6b, 0x5a2a6b, 0x8a5a14][E.shield.rarity] : 0,
      armor: E.armor ? [0x5a4632, 0x2f4a6b, 0x4a3a6a, 0x6a4a1a][E.armor.rarity] : 0x6a5a48, plate: !!E.armor && E.armor.tier >= 2,
      helm: E.helm ? E.helm.style : -1, trinket: !!E.trinket,
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
  function upgradeCost(it) { return { gold: Math.round(40 * (it.tier + 1) * (1 + it.rarity * 0.5) * (1 + it.plus * 0.6)), scrap: 2 + it.plus * 2 + it.rarity }; }
  const maxPlus = () => C.maxUpgrade[S.camp.forge];

  // ---------------- Saving ----------------
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function load() {
    try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (d && d.equip && d.camp) { S = Object.assign(fresh(), d); return true; } } catch (e) {}
    return false;
  }
  function newGame() {
    S = fresh();
    S.equip.weapon = generate(0, { slot: 'weapon', type: 'sword', rarity: 0 });
    S.equip.shield = generate(0, { slot: 'shield', rarity: 0 });
    save();
  }
  function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  return {
    get S() { return S; }, generate, main, describe, value, fullName, stats, look, add, equip, unequip, remove, addGold,
    upgradeCost, maxPlus, save, load, hasSave, newGame, wipe, rollRarity,
    rank, blocked, learn, respec, addXp, masteryRank, addMastery, spentIn, treesUsed,
  };
})();
