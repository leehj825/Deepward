// Deepward - menus and story panels: Maren's dialogue, Bram's smithy, Tilda's stall, the camp ledger, the gate down,
// the bag (inventory and equipment), the stage-cleared choice and the fall. One panel shows at a time; it works with the
// mouse and touch, the keyboard (arrows / W S, Enter, Esc) and a controller (d-pad or left stick, A, B).
const UI = (() => {
  const el = id => document.getElementById(id);
  let open = null, focus = 0, onClose = null, tab = {};
  const R = CFG.gear.rarities;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = () => `<div class="money"><span class="gold">◆ ${Items.S.gold}</span><span class="scrap">⚙ ${Items.S.scrap} scrap</span></div>`;
  // An item's picture (rendered by GearView), or a plain glyph when there is no WebGL
  const GLYPH = { weapon: '⚔', shield: '🛡', armor: '🧥', helm: '⛑', gloves: '🧤', boots: '👢', trinket: '📿', ring: '💍' };
  const pic = (it, cls = 'ipic') => { const u = typeof GearView !== 'undefined' ? GearView.icon(it) : ''; return u ? `<img class="${cls}" src="${u}" alt="">` : `<span class="${cls} glyph">${GLYPH[it.slot]}</span>`; };
  function itemRow(it, buttons, note = '') {
    const r = R[it.rarity];
    return `<div class="irow${it.uniq ? ' uniq' : ''}">${pic(it, 'ithumb')}<div class="iinfo"><b style="color:${Items.colorOf(it)}">${esc(Items.fullName(it))}</b> <small>${Items.slotName(it.slot)} · ${it.uniq ? 'Unique' : r.name}${note}</small>
      <div class="istats">${Items.describe(it).map(esc).join(' · ')}</div></div><div class="ibtns">${buttons}</div></div>`;
  }
  const btn = (label, act, arg = '', disabled = false, cls = '') => `<button class="pb ${cls}" data-act="${act}" data-arg="${arg}"${disabled ? ' disabled' : ''}>${label}</button>`;
  const tabs = (name, list) => `<div class="tabs">${list.map(([id, label]) => btn(label, 'tab', name + ':' + id, false, tab[name] === id ? 'on' : '')).join('')}</div>`;

  // ---------------- Expertise nodes ----------------
  const ICON = { steady: '🛡', keen: '👁', riposte: '⚔', bulwark: '🏰', feet: '👣', counter: '🌀', precision: '🎯', dance: '💫',
    fury: '💢', breaker: '🔨', thirst: '🩸', rage: '👹', ember: '🔥', ward: '❄', focus: '🔮', nova: '💥' };
  const talentById = id => { for (const [k, t] of Object.entries(CFG.trees)) { const x = t.talents.find(y => y.id === id) || (t.ult.id === id && t.ult); if (x) return { x, k, t, ult: x === t.ult }; } };
  function firstOpenTalent() {
    for (const t of Object.values(CFG.trees)) for (const x of [...t.talents, t.ult]) if (!Items.blocked(x.id)) return x.id;
    return CFG.trees.guardian.talents[0].id;
  }
  function node(x, r, max, ult) {
    const why = Items.blocked(x.id), state = r >= max ? 'full' : r > 0 ? 'part' : !why ? 'open' : 'locked';
    const pips = ult ? '' : `<span class="pips">${[0, 1, 2].map(i => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</span>`;
    return `<button class="pb tnode ${state}${ult ? ' ult' : ''}${tab.talent === x.id ? ' sel' : ''}" data-act="tsel" data-arg="${x.id}" title="${esc(x.name)}"><span class="ic">${ICON[x.id] || '✦'}</span>${pips}</button><div class="tname">${esc(x.name)}</div>`;
  }
  // "+4% damage per rank" at rank 2 reads "+8% damage"
  const atRank = (desc, r) => desc.replace(/(\d+(?:\.\d+)?)(%| s)/, (m, n, u) => +(n * r).toFixed(2) + u).replace(/ per rank/, '');
  function talentDetail(id) {
    const f = talentById(id); if (!f) return '';
    const { x, t, ult } = f, S = Items.S, r = Items.rank(id), max = ult ? 1 : 3, why = Items.blocked(id);
    let h = `<div class="tdetail" style="--tc:${t.color}"><div class="tdh"><span class="ic">${ICON[id] || '✦'}</span><div><b>${esc(x.name)}</b><small>${t.name} · ${ult ? `ultimate · ${x.cd} s cooldown` : `rank ${r} / 3`}</small></div></div>`;
    h += `<p>${esc(x.desc)}</p>`;
    if (!ult) h += `<div class="tnums">${r ? `<span>Now: ${esc(atRank(x.desc, r))}</span>` : ''}${r < 3 ? `<span>${r ? 'Next' : 'Rank 1'}: ${esc(atRank(x.desc, r + 1))}</span>` : ''}</div>`;
    if (ult && !r) h += `<p class="dim">Needs ${CFG.progress.ultimateNeeds} points spent in ${t.name} (${Items.spentIn(f.k)} so far). Use it with F, Y on a controller, or the ULT button.</p>`;
    let b;
    if (ult && r) b = S.ult === id ? '<small class="goldc">Equipped (F / Y)</small>' : btn('Equip', 'ult', id);
    else if (r >= max) b = '<small class="goldc">Mastered</small>';
    else b = btn(`Learn${ult ? '' : ' rank ' + (r + 1)} · 1 point`, 'learn', id, !!why, why ? '' : 'hot') + (why && why !== 'Mastered' ? ` <small class="warnc">${esc(why)}</small>` : '');
    return h + `<div class="tact">${b}</div></div>`;
  }

  const QNAME = { auto: 'Auto', high: 'High', medium: 'Medium', low: 'Low' };
  const LIM = { master: [0, 1, 0.1], music: [0, 1, 0.1], sfx: [0, 1, 0.1], sens: [0.4, 2.4, 0.2], padScale: [0.7, 1.5, 0.1], padOpacity: [0.3, 1, 0.1] };      // min, max, step

  // ---------------- Gear screen helpers ----------------
  // The selected piece: { it, equipped, slot } from tab.gsel ('e:<slot>' or 'i:<id>')
  function gearSel() {
    const S = Items.S, [k, v] = String(tab.gsel || '').split(':');
    if (k === 'e') return { it: S.equip[v] || null, equipped: true, slot: v };
    const it = S.inv.find(x => x.id === +v); return it ? { it, equipped: false, slot: it.slot } : null;
  }
  const gemDots = it => it.gems && it.gems.length ? `<span class="gems">${it.gems.map(g => `<i class="${g || 'none'}"></i>`).join('')}</span>` : '';
  // The one number each slot is mostly about, to mark bag pieces that beat what is worn
  function power(it) {
    if (!it) return 0;
    const m = Items.main(it);
    return it.slot === 'weapon' ? m.dmg * CFG.gear.weapons[it.type].dmg : it.slot === 'shield' ? m.block : it.slot === 'armor' ? m.hp * (1 + m.dr * 4) : it.slot === 'helm' ? m.hp + m.stamina : it.aff.length + it.rarity;
  }
  // The bag as shown: only one slot's pieces if filtered, in the chosen order
  function bagView(inv, sort, filt) {
    const list = inv.filter(it => filt === 'all' || it.slot === filt), order = CFG.gear.slots;
    if (sort === 'rarity') list.sort((a, b) => (b.uniq ? 4 : b.rarity) - (a.uniq ? 4 : a.rarity) || b.tier - a.tier);
    else if (sort === 'slot') list.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot) || power(b) - power(a));
    else if (sort === 'power') list.sort((a, b) => (better(b) - better(a)) || power(b) / (power(Items.S.equip[b.slot]) || 1) - power(a) / (power(Items.S.equip[a.slot]) || 1));
    else list.reverse();                                                     // newest first
    return list;
  }
  const better = it => { const cur = Items.S.equip[it.slot]; return !cur || power(it) > power(cur) * 1.02; };
  // What wearing a piece would change, as green and red differences in the hero's numbers (all are better higher)
  // Each row: stat key, name, and the unit its difference is shown in: n a number, x a multiplier, p percentage
  // points, s seconds, m metres
  const CMP = [['maxHp', 'Health', 'n'], ['maxSt', 'Stamina', 'n'], ['dmg', 'Damage', 'x'], ['posture', 'Posture damage', 'x'], ['speed', 'Swing speed', 'p'],
    ['range', 'Reach', 'm'], ['block', 'Block', 'p'], ['dr', 'Armour', 'p'], ['crit', 'Critical chance', 'p'], ['parry', 'Parry window', 's'],
    ['regen', 'Stamina regen', 'p'], ['lifesteal', 'Life on hit', 'p'], ['goldFind', 'Gold found', 'p'], ['flasks', 'Flasks', 'n'], ['burn', 'Fire', 'p'], ['chill', 'Frost', 'p'], ['shock', 'Shock', 'p'],
    ['move', 'Walk speed', 'p'], ['dashDist', 'Dash reach', 'p'], ['dashCost', 'Dash stamina', 'p', true], ['load', 'Load', 'w', true]];
  const UNIT = { w: d => d.toFixed(1), n: d => Math.round(d), x: d => d.toFixed(2), p: d => Math.round(d * 100) + '%', s: d => d.toFixed(3) + ' s', m: d => d.toFixed(2) + ' m' };
  function compare(a, b) {
    const rows = [];
    for (const [k, name, u, lowGood] of CMP) {
      const d = (b[k] || 0) - (a[k] || 0), shown = UNIT[u](Math.abs(d)), good = lowGood ? d < 0 : d > 0;
      if (!parseFloat(shown)) continue;                                    // too small to show
      rows.push(`<span class="${good ? 'cup' : 'cdown'}">${good ? '▲' : '▼'} ${name} ${d > 0 ? '+' : '−'}${shown}</span>`);
    }
    if (!a.twoHanded && !a.dual && (b.twoHanded || b.dual)) rows.push('<span class="cdown">✋ Both hands full: the shield goes unused</span>');
    if ((a.twoHanded || a.dual) && !b.twoHanded && !b.dual) rows.push('<span class="cup">🛡 The shield is used again</span>');
    return rows.length ? `<div class="cmp">${rows.join('')}</div>` : '<div class="cmp dim">No change to your numbers</div>';
  }
  function gearDetail(st) {
    const g = gearSel(), C = CFG.gear;
    if (!g || !g.it) return `<div class="gdetail empty"><span class="ipic glyph">${GLYPH[g ? g.slot : 'weapon']}</span><div><b>${Items.slotName(g ? g.slot : 'weapon')}</b><p class="dim">Nothing worn here. Pick a piece from the bag below.</p></div></div>`;
    const it = g.it, cur = g.equipped ? null : Items.S.equip[it.slot];
    let h = `<div class="gdetail${it.uniq ? ' uq' : ''}" style="--rc:${Items.colorOf(it)}">${pic(it, 'ipic big')}<div class="gdtext"><b style="color:${Items.colorOf(it)}">${esc(Items.fullName(it))}</b>`;
    h += `<small>${Items.slotName(it.slot)} · ${it.uniq ? 'Unique' : R[it.rarity].name} · ${C.tierNames[it.tier]}${g.equipped ? ' · worn' : ''}</small>`;
    h += `<div class="istats">${Items.describe(it).map(esc).join('<br>')}</div>`;
    if (g.equipped && it.slot === 'shield' && (st.twoHanded || st.dual)) h += '<div class="warnc">Unused while both hands are full</div>';
    if (!g.equipped) h += `<div class="gcmp">${cur ? `Instead of <b style="color:${Items.colorOf(cur)}">${esc(Items.fullName(cur))}</b>:` : 'Wearing it:'}${compare(st, Items.statsWith(it.slot, it))}</div>`;
    else h += `<div class="gcmp">Taking it off:${compare(st, Items.statsWith(it.slot, null))}</div>`;
    h += `<div class="tact">${g.equipped ? btn('Take off', 'unequip', it.slot, Items.S.inv.length >= C.invSize) : btn(cur ? 'Equip (swap)' : 'Equip', 'equip', it.id, false, 'hot')
      + (World.inCamp() ? ' ' + btn(`Salvage ⚙${CFG.camp.salvage[it.rarity]}`, 'bagsalvage', it.id, !!it.uniq) : '')}</div>${!g.equipped && it.uniq && World.inCamp() ? '<small class="dim">Uniques are not salvaged here; Bram will take one at the forge.</small>' : ''}</div></div>`;
    return h;
  }

  // The materials carried, as a short line
  const matLine = () => { const M = Items.S.mats || {}; const have = Object.keys(CFG.materials).filter(k => M[k] > 0); return have.length ? 'Materials: ' + have.map(k => `${CFG.materials[k].icon} ${CFG.materials[k].name} ×${M[k]}`).join(' · ') : '<span class="dim">No materials yet: hunt on the Rim, gather herbs and ore.</span>'; };
  const brewNeed = t => Object.assign({ herb: t.herbs }, t.ore ? { ore: t.ore } : {});
  // Setting, prying and socketing gems in worn gear (Bram's Gems tab and Nell's bench)
  function gemsBody(say) {
    const S = Items.S, GM = CFG.gear.gems, SC = CFG.gear.sockets;
    let h = `<p>${say} · Your gems: ${Object.keys(GM).map(k => `${GM[k].icon} ${S.gems[k] || 0}`).join(' · ')}</p>`;
    h += `<p class="dim">${Object.values(GM).map(g => g.icon + ' ' + g.desc).join(' · ')}</p>`;
    for (const slot of SC.slots) {
      const it = S.equip[slot]; if (!it) continue;
      const holes = it.gems || [], empty = holes.indexOf(null) >= 0, c = SC.addCost;
      let b = Object.keys(GM).filter(k => S.gems[k] > 0).map(k => btn(GM[k].icon, 'gem', it.id + ':' + k, !empty)).join('');
      if (holes.some(Boolean)) b += btn('Pry out', 'pry', it.id);
      if (holes.length < SC.max) b += btn(`+ Socket · ◆${c.gold} ⚙${c.scrap}`, 'socket', it.id, S.gold < c.gold || S.scrap < c.scrap);
      h += itemRow(it, b || '<small class="dim">No gems</small>');
    }
    return h;
  }

  // ---------------- Panels ----------------
  const PANELS = {
    dialogue(o) {
      const [who, text] = o.lines[o.i];
      return `<div class="dlg">${who ? `<div class="who">${esc(who)}</div>` : ''}<p>${esc(text)}</p>${btn(o.i < o.lines.length - 1 ? 'Continue' : (o.last || 'Close'), 'next')}</div>`;
    },
    smith() {
      const S = Items.S, t = tab.smith || (tab.smith = 'upgrade'), tier = Math.min(S.stage, CFG.gear.tierNames.length - 1);
      let h = `<h2>Bram's Forge</h2><p class="sub">"Bring me gold and scrap and I'll make that steel sing." · Forge level ${S.camp.forge}, upgrades up to +${Items.maxPlus()}</p>${money()}`;
      h += tabs('smith', [['upgrade', 'Upgrade'], ['forge', 'Forge new'], ['craft', 'Craft'], ['gems', 'Gems'], ['reroll', 'Reroll'], ['salvage', 'Salvage']]);
      if (t === 'upgrade') {
        const eq = CFG.gear.slots.map(s => S.equip[s]).filter(Boolean);
        h += eq.length ? eq.map(it => { const c = Items.upgradeCost(it), max = it.plus >= Items.maxPlus(), ok = !max && S.gold >= c.gold && S.scrap >= c.scrap;
          const T = CFG.temper, tOk = !max && Items.hasMats({ ore: T.ore }) && S.scrap >= T.scrap;
          return itemRow(it, max ? '<small class="dim">Needs a better forge</small>' : btn(`+${it.plus + 1} · ◆${c.gold} ⚙${c.scrap}`, 'upgrade', it.id, !ok) + btn(`Temper · ${CFG.materials.ore.icon}${T.ore} ⚙${T.scrap}`, 'temper', it.id, !tOk)); }).join('') : '<p class="dim">Nothing equipped.</p>';
      } else if (t === 'forge') {
        const cost = CFG.camp.forgeCost[tier];
        h += `<p>Bram forges a new piece at your depth (${CFG.gear.tierNames[tier]}). A better forge raises the odds of rare work.</p>`;
        for (const slot of CFG.gear.slots) {
          h += `<div class="irow"><div class="iinfo"><b>${Items.slotName(slot)}</b> <small>random ${slot === 'weapon' ? 'weapon of any kind' : 'piece'}</small></div><div class="ibtns">${btn('◆ ' + cost, 'forge', slot, S.gold < cost)}</div></div>`;
          if (slot === 'weapon') for (const [type, note] of [['greatsword', 'two-handed: big hits and reach, no shield'], ['spear', 'long thrusts and a wide sweep, with a shield'], ['daggers', 'a fast five-cut combo and cheap dashes, no shield']].filter(([t]) => CFG.classes[Items.cls()].weapons.includes(t)))
            h += `<div class="irow"><div class="iinfo"><b>${CFG.gear.weapons[type].name}</b> <small>${note}</small></div><div class="ibtns">${btn('◆ ' + Math.round(cost * 1.3), 'forge', type, S.gold < cost * 1.3)}</div></div>`;
        }
      } else if (t === 'reroll') {
        h += '<p>"Don\'t like a bonus? I\'ll rework it." Bram swaps one bonus of a worn piece for a different kind, rolled fresh for its tier. Each rework of the same piece costs more.</p>';
        const eq = CFG.gear.slots.map(s => S.equip[s]).filter(it => it && it.aff.length);
        if (!eq.length) h += '<p class="dim">Nothing you wear has a bonus to rework.</p>';
        for (const it of eq) {
          const c = Items.rerollCost(it), ok = S.gold >= c.gold && S.scrap >= c.scrap;
          h += itemRow(it, it.aff.map((a, i) => btn(`${CFG.gear.affixes[a.k].name.split(' (')[0]} · ◆${c.gold} ⚙${c.scrap}`, 'reroll', it.id + ':' + i, !ok)).join(''));
        }
      } else if (t === 'craft') {
        h += `<p>"Bring me what the Rim gives up, and I'll make something of it." · ${matLine()}</p>`;
        for (const r of CFG.crafts) {
          const ok = Items.hasMats(r.need) && S.gold >= r.gold && S.inv.length < CFG.gear.invSize, Rr = CFG.gear.rarities[r.rarity];
          const need = Object.entries(r.need).map(([k, n]) => `${CFG.materials[k].icon}${n}`).join(' ');
          h += `<div class="irow"><div class="iinfo"><b style="color:${Rr.color}">${esc(r.name)}</b> <small>${Items.slotName(r.slot)}${r.wc !== undefined ? ' · ' + CFG.gear.weightNames[r.wc] : ''} · ${Rr.name}</small><div class="istats">${r.aff.map(k => CFG.gear.affixes[k].name).join(', ')}</div></div><div class="ibtns">${btn(`${need} · ◆${r.gold}`, 'craft', r.id, !ok)}</div></div>`;
        }
      } else if (t === 'gems') {
        h += gemsBody(`"A stone in the steel. I'll set it, pry it, or cut you a new socket."`);
      } else {
        h += S.inv.length ? S.inv.map(it => itemRow(it, btn(`Salvage ⚙${CFG.camp.salvage[it.rarity]}`, 'salvage', it.id))).join('') : '<p class="dim">Your bag is empty. Equipped gear cannot be salvaged.</p>';
      }
      return h + btn('Leave', 'close', '', false, 'leave');
    },
    trader() {
      const S = Items.S, t = tab.trader || (tab.trader = 'buy');
      let h = `<h2>Tilda's Stall</h2><p class="sub">"Fresh from dead men's packs. Mostly fresh."</p>${money()}` + tabs('trader', [['buy', 'Buy'], ['sell', 'Sell']]);
      if (t === 'buy') h += S.stock.length ? S.stock.map((it, i) => { const price = Items.value(it) * 3; return itemRow(it, btn('◆ ' + price, 'buy', i, S.gold < price || S.inv.length >= CFG.gear.invSize)); }).join('') : '<p class="dim">Sold out until your next return.</p>';
      else h += S.inv.length ? S.inv.map(it => itemRow(it, btn('Sell ◆' + Items.value(it), 'sell', it.id))).join('') : '<p class="dim">Nothing to sell. Equipped gear stays on you.</p>';
      return h + btn('Leave', 'close', '', false, 'leave');
    },
    ledger() {
      const S = Items.S, B = CFG.camp.buildings;
      let h = `<h2>Camp Ledger</h2><p class="sub">What Deepward could be, with enough gold.</p>${money()}`;
      for (const [id, b] of Object.entries(B)) {
        const lv = S.camp[id], cost = b.costs[lv];
        h += `<div class="irow"><div class="iinfo"><b>${b.name}</b> <small>level ${lv} / ${b.max}</small><div class="istats">${esc(b.desc)}</div></div><div class="ibtns">${lv >= b.max ? '<small class="dim">Complete</small>' : btn('Build · ◆' + cost, 'build', id, S.gold < cost)}</div></div>`;
      }
      return h + btn('Close', 'close', '', false, 'leave');
    },
    gate() {
      const S = Items.S, st = CFG.stages;
      let h = `<h2>The Deep</h2><p class="sub">The stair goes down into the dark. Where will you go?</p>`;
      for (let k = 0; k <= S.stage; k++) {
        const s = st[k % st.length], depth = Math.floor(k / st.length), cleared = k < S.stage;
        h += `<div class="irow"><div class="iinfo"><b>${s.name}</b> <small>${depth ? 'Depth ' + (depth + 1) + ' · ' : ''}${cleared ? 'cleared' : 'not yet cleared'}</small><div class="istats">Guardian: ${esc(s.guardian)}</div></div><div class="ibtns">${btn(cleared ? 'Descend' : 'Descend ▸', 'descend', k, false, cleared ? '' : 'hot')}</div></div>`;
      }
      // The Endless Deep, once the fifth guardian has fallen
      const E = S.endless || { best: 0, daily: {} }, daily = E.daily && E.daily.date === Endless.today() ? E.daily.best : 0;
      if (Endless.unlocked()) {
        h += `<h3>Below the five</h3><div class="irow uniq"><div class="iinfo"><b>The Endless Deep</b> <small>deepest floor ${E.best || '-'}</small><div class="istats">Floor after floor, each tougher. A guardian every third floor; go home between floors to keep your gold.</div></div><div class="ibtns">${btn('Choose curses…', 'open', 'curses', false, 'hot')}</div></div>`;
        const dc = CFG.curses.find(c => c.id === Endless.dailyCurse());
        h += `<div class="irow uniq"><div class="iinfo"><b>Daily Descent</b> <small>${Endless.today()} · today's best ${daily || '-'}</small><div class="istats">The same floors for every warden today, under today's curse: ${dc.icon} ${dc.name} (${esc(dc.desc.toLowerCase())}), +${Math.round(dc.gold * 100)}% gold.</div></div><div class="ibtns">${btn('Descend', 'endless', 1)}</div></div>`;
      } else h += `<p class="dim">Below the last stage lies the Endless Deep. Defeat ${esc(CFG.stages[CFG.stages.length - 1].guardian)} to open it.</p>`;
      return h + btn('Stay in camp', 'close', '', false, 'leave');
    },
    codex() {
      const S = Items.S, l = Codex.life(), t = tab.codex || (tab.codex = 'beasts'), ach = S.ach || {};
      let h = `<h2>Codex</h2><p class="sub">What the Deep has taught you.</p>` + tabs('codex', [['beasts', 'Bestiary'], ['uniques', 'Uniques'], ['ach', `Achievements ${Object.keys(ach).length}/${Codex.list.length}`], ['records', 'Records']]);
      if (t === 'beasts') {
        for (const [k, d] of Object.entries(CFG.enemies)) {
          if (k === 'sparring') continue;
          const kills = l.kinds[k] || 0;
          h += kills ? `<div class="irow"><div class="iinfo"><b>${esc(d.name)}</b> <small>slain ${kills}</small><div class="istats">${Codex.attacks(d).map(esc).join(' · ')}</div>${CFG.tips[k] ? `<div class="istats dim">${esc(CFG.tips[k])}</div>` : ''}</div></div>`
            : `<div class="irow empty"><div class="iinfo"><b>???</b> <small>not yet met</small></div></div>`;
        }
        h += '<h3>Guardians and champions</h3>';
        for (const B of CFG.bosses) { const k = l.guardians[B.name] || 0; h += `<div class="irow${k ? '' : ' empty'}"><div class="iinfo"><b>${k ? esc(B.name) : '???'}</b> <small>${k ? 'defeated ' + k + '×' : 'a guardian of the Deep'}</small>${k ? `<div class="istats">${B.phases.map(ph => Math.round(ph.at * 100) + '%: ' + esc(ph.shout.toLowerCase())).join(' · ')}</div>` : ''}</div></div>`; }
        for (const st of CFG.stages) { const c = st.champion, k = l.champs[c.name]; h += `<div class="irow${k ? '' : ' empty'}"><div class="iinfo"><b>${k ? esc(c.name) : '???'}</b> <small>champion of ${esc(st.name)}</small>${k ? `<div class="istats">${c.mods.map(m => CFG.elites.mods[m].name + ': ' + CFG.elites.mods[m].desc).map(esc).join(' · ')}</div>` : ''}</div></div>`; }
      } else if (t === 'uniques') {
        for (const u of CFG.gear.uniques.filter(x => !x.cls || x.cls === Items.cls())) { const got = S.uniques.includes(u.id); h += `<div class="irow${got ? ' uniq' : ' empty'}"><div class="iinfo"><b style="color:${got ? CFG.gear.uniqueColor : ''}">${got ? esc(u.name) : '???'}</b> <small>${CFG.gear.slotNames[u.slot]}${u.type ? ' · ' + CFG.gear.weapons[u.type].name : ''}</small>${got ? `<div class="istats">★ ${esc(u.desc)}</div>` : ''}</div></div>`; }
      } else if (t === 'ach') {
        for (const a of Codex.list) h += `<div class="irow${ach[a.id] ? ' got' : ' empty'}"><div class="iinfo"><b>${ach[a.id] ? '🏆 ' : ''}${esc(a.name)}</b> <small>${ach[a.id] ? 'earned' : '+' + a.gold + ' ◆'}</small><div class="istats">${esc(a.desc)}</div></div></div>`;
      } else {
        const E = S.endless || {}, rows = [['Foes felled', l.kills], ['Elites slain', l.elites], ['Guardians defeated', Object.values(l.guardians).reduce((a, b) => a + b, 0)], ['Champions slain', Object.keys(l.champs).length], ['Parries', l.parries], ['Blocks', l.blocks], ['Dashes through blows', l.dodges], ['Executions', l.executions], ['Criticals', l.crits], ['Blows taken', l.hitsTaken], ['Falls', S.deaths], ['Flawless guardians', l.flawless], ['Shrine blessings', l.shrines], ['Deepest Endless floor', E.best], ['Level', S.level]];
        h += '<div class="recs">' + rows.map(([k, v]) => `<div><span>${k}</span><b>${v || 0}</b></div>`).join('') + '</div>';
      }
      return h + btn('Close', 'close', '', false, 'leave');
    },
    trainer() {
      const S = Items.S;
      return `<h2>Training yard</h2><p class="sub">Sergeant Hobb leans on his wooden sword. "Again, warden?"</p>
        ${btn(S.trained ? 'Spar with Hobb (six lessons)' : 'Train with Hobb (six lessons, 150 gold the first time)', 'train', '', false, 'hot')}${btn('Expertise: talents and respec', 'open', 'talents')}${btn('Leave', 'close', '', false, 'leave')}`;
    },
    // The party: who walks with the warden (recruit and dismiss in the Hold)
    party() {
      const S = Items.S, camp = G.mode === 'camp';
      let h = `<h2>Party</h2><p class="sub">${S.party.length} of ${Party.max} walk with you. They follow, and fight what is near.${camp ? '' : ' Recruit in the Hold.'}</p>`;
      for (const d of Party.defs) {
        const st = Party.status(d.id), full = S.party.length >= Party.max;
        const note = st === 'locked' ? 'Free them from the Deep first' : st === 'hire' ? `Hire for ◆ ${d.hire}` + (d.rescue ? ' (free if you free them from the Deep)' : '') : st === 'in' ? 'In your party' : 'Ready to join';
        const b = st === 'in' ? btn('Dismiss', 'dismiss', d.id, !camp) : st === 'locked' ? '' : btn(st === 'hire' ? '◆ ' + d.hire : 'Recruit', 'recruit', d.id, !camp || full || (st === 'hire' && S.gold < d.hire), 'hot');
        h += `<div class="irow"><div class="iinfo"><b>${Party.GLYPH[d.cls]} ${esc(d.name)}</b> <small>${esc(CFG.classes[d.cls].name)} · ${esc(note)}</small><p class="dim">${esc(d.blurb)}</p></div><div class="ibtns">${b}</div></div>`;
      }
      const n = Party.fights();
      h += `<p class="dim">${n ? `They have learned from ${n} fight${n === 1 ? '' : 's'}.` : 'They have not learned from your fights yet.'}</p>`;
      if (n && tab.policyShow) h += `<div class="savecode"><textarea readonly rows="3" onfocus="this.select()">${esc(Party.exportData())}</textarea></div><p class="dim">Copy this text and send it to the developer: it can be folded into the shipped companion network.</p>`;
      return h + (n ? btn('Share learned data', 'policyshare', '', false, 'hot') + ' ' + btn('Copy', 'policycopy', '') + ' ' + btn(tab.policyShow ? 'Hide the text' : 'Show the text', 'policyshow', '') + ' ' + btn('Forget what they learned', 'forget', '') + ' ' : '') + btn('Back', 'open', 'bag');
    },
    // A new warden picks a class (weapons, off-hand piece and play style; the choice is final for this save)
    classpick() {
      let h = `<h2>Choose your calling</h2><p class="sub">The Deep takes all kinds. This choice stays with this warden.</p>`;
      for (const [id, c] of Object.entries(CFG.classes)) {
        const w = CFG.gear.weapons[c.start].name, o = CFG.gear.offhands[c.offhand].label;
        h += `<div class="irow"><div class="iinfo"><b>${esc(c.name)}</b> <small>${esc(c.role)} · ${esc(w)} and ${esc(o)}</small><p class="dim">${esc(c.desc)}</p></div><div class="ibtns">${btn('Choose', 'pickclass', id, false, id === 'warrior' ? 'hot' : '')}</div></div>`;
      }
      return h;
    },
    // The warden's looks: skin, hair colour, hair, beard, with the turning hero beside them
    looks(o = {}) {
      const A = CFG.appearance, L = Items.S.looks = Items.S.looks || { skin: 0, hair: 0, style: 0, beard: 0 };
      const hex = c => '#' + c.toString(16).padStart(6, '0');
      const sw = (k, list) => list.map((c, i) => `<button class="pb swatch${L[k] === i ? ' on' : ''}" data-act="look" data-arg="${k}:${i}" style="background:${hex(c)}" aria-label="${k} ${i + 1}"></button>`).join('');
      const opts = (k, list) => list.map(([, name], i) => btn(name, 'look', k + ':' + i, false, L[k] === i ? 'on' : '')).join('');
      let h = `<h2>Appearance</h2><p class="sub">${o.first ? 'Before you take up the watch: how does the new warden look?' : 'Change how the warden looks. Gear covers some of it.'}</p>`;
      h += `<div class="gwrap"><div class="gleft"><div class="gdoll looksdoll"></div></div><div class="gright looks">`;
      h += `<b>Skin</b><div class="swatches">${sw('skin', A.skins)}</div><b>Hair colour</b><div class="swatches">${sw('hair', A.hairs)}</div>`;
      h += `<b>Hair</b><div>${opts('style', A.styles)}</div><b>Beard</b><div>${opts('beard', A.beards)}</div></div></div>`;
      return h + btn(o.first ? 'Take up the watch' : 'Done', o.first ? 'looksdone' : 'open', o.first ? '' : 'bag', false, 'hot');
    },
    trainOffer() {
      return `<h2>Before the Deep</h2><p>Maren: "Hobb runs the training yard by the east fence. Six lessons - strike, block, parry, dash, and how to finish a staggered foe. Go to him first, if you've any sense."</p>
        ${btn('Train now', 'train', '', false, 'hot')}${btn('Later', 'close')}`;
    },
    deeper(o) {
      const S = Items.S, next = o.floor + 1, lair = next % CFG.endless.lairEvery === 0;
      return `<h2>Floor ${o.floor} cleared</h2><p class="sub">${o.daily ? 'Daily Descent' : 'The Endless Deep'} · deepest ${o.daily ? (S.endless.daily.best) : S.endless.best}</p>${money()}
        ${G.run && G.run.curses.length ? `<p class="dim">Carrying: ${G.run.curses.map(id => { const c = CFG.curses.find(x => x.id === id); return c.icon + ' ' + c.name; }).join(', ')} · +${Math.round(Endless.curseGold(G.run.curses) * 100)}% gold</p>` : ''}<p>The stair keeps going. Floor ${next} is ${Math.round(CFG.endless.perFloor * 100)}% tougher${lair ? ', and a guardian waits at its end' : ''}. Go home now and the gold is safe; fall and you lose half of this trip's.</p>
        ${btn('Go deeper · floor ' + next, 'deeper', '', false, 'hot')}${btn('Return to camp', 'camp')}`;
    },
    // The gear screen: the hero in their gear between the five slots, the numbers, the selected item's details, and the
    // bag as a grid of pictures. Selecting a piece shows it; selecting it again (or the button) equips or takes it off.
    bag() {
      const S = Items.S, st = Items.stats(), inCamp = World.inCamp(), C = CFG.gear;
      if (!tab.gsel || !gearSel()) tab.gsel = S.inv.length ? 'i:' + S.inv[0].id : 'e:weapon';
      const sel = tab.gsel;
      const slot = s => { const it = S.equip[s], unused = s === 'shield' && it && (st.twoHanded || st.dual);
        return `<button class="pb gslot${it ? ' r' + it.rarity + (it.uniq ? ' uq' : '') : ' empty'}${sel === 'e:' + s ? ' sel' : ''}${unused ? ' unused' : ''}" data-act="gsel" data-arg="e:${s}" title="${Items.slotName(s)}">`
          + (it ? pic(it) + (it.plus ? `<span class="plus">+${it.plus}</span>` : '') + gemDots(it) : `<span class="ipic glyph">${GLYPH[s]}</span>`) + `<span class="slab">${Items.slotName(s)}</span></button>`; };
      let h = `<h2>Gear</h2>${money()}<div class="gwrap"><div class="gleft"><div class="gear"><div class="gcol">${slot('helm')}${slot('armor')}${slot('gloves')}${slot('boots')}</div><div class="gdoll"></div><div class="gcol">${slot('weapon')}${slot('shield')}${slot('trinket')}${slot('ring')}`;
      h += `<div class="gnums"><span>❤ ${st.maxHp}</span><span>⚡ ${st.maxSt}</span><span>⚔ ×${st.dmg.toFixed(2)}</span><span>◈ ×${st.posture.toFixed(2)}</span><span>🛡 ${Math.round(st.block * 100)}%</span><span>⛨ ${Math.round(st.dr * 100)}%</span>${st.crit ? `<span>✦ ${Math.round(st.crit * 100)}%</span>` : ''}<span>⚗ ${st.flasks}</span></div></div></div><div class="gload l${st.loadClass}">⚖ ${CFG.gear.weightNames[st.loadClass]} load ${st.load} · dash ${Math.round(st.dashDist * 100)}% reach, ${Math.round(st.dashCost * 100)}% stamina · walk ${Math.round(st.move * 100)}%</div></div><div class="gright">`;
      const SORTS = { new: 'Newest', rarity: 'Rarity', slot: 'Slot', power: 'Best first' }, sort = tab.bagSort || 'new', filt = tab.bagFilter || 'all';
      h += `<h3>Bag (${S.inv.length} / ${C.invSize})</h3><div class="bagbar">`
        + ['all', ...C.slots].map(k => btn(k === 'all' ? 'All' : GLYPH[k], 'bagfilter', k, false, 'chip' + (filt === k ? ' on' : ''))).join('')
        + btn('⇅ ' + SORTS[sort], 'bagsort', '', false, 'chip sort') + '</div><div class="igrid">';
      for (const it of bagView(S.inv, sort, filt)) h += `<button class="pb icell r${it.rarity}${it.uniq ? ' uq' : ''}${sel === 'i:' + it.id ? ' sel' : ''}" data-act="gsel" data-arg="i:${it.id}" title="${esc(Items.fullName(it))}">${pic(it)}${it.plus ? `<span class="plus">+${it.plus}</span>` : ''}${better(it) ? '<span class="up">▲</span>' : ''}${gemDots(it)}</button>`;
      if (filt === 'all') for (let i = S.inv.length; i < Math.min(C.invSize, S.inv.length + 4); i++) h += '<i class="icell none"></i>';      // a few open places, not the whole bag
      h += '</div>';
      if (!S.inv.length) h += '<p class="dim">Chests and guardians drop gear; Bram and Tilda make and sell it.</p>';
      h += gearDetail(st) + '</div></div>';
      const GM = C.gems, held = Object.keys(GM).filter(k => S.gems[k] > 0);
      h += `<div class="statline">${matLine()}</div>`;
      h += `<div class="statline">Gems: ${held.length ? held.map(k => `${GM[k].icon} ×${S.gems[k]}`).join(' · ') + ' <small class="dim">(Bram sets them)</small>' : '<span class="dim">none yet</span>'} · Uniques found ${S.uniques.length} / ${C.uniques.length}</div>`;
      if (!inCamp) h += '<p class="dim">Changing gear here is free, but the fight waits while you look.</p>';
      h += btn(`Expertise${S.points ? ' (' + S.points + ' to spend)' : ''}`, 'open', 'talents') + ' ' + btn('Codex', 'open', 'codex') + ' ' + btn('Appearance', 'open', 'looks') + ' ' + btn('Party', 'open', 'party');
      return h + btn('Close', 'close', '', false, 'leave');
    },
    // Expertise as a skill tree: four columns of nodes (three talents, then the ultimate) joined by lines that fill as you
    // learn. Clicking (or confirming) a node shows its details below, with the Learn / Equip button.
    talents(o) {
      const S = Items.S, T = CFG.trees, need = CFG.progress.xpFor(S.level), used = Items.treesUsed();
      const sel = tab.talent || (tab.talent = firstOpenTalent());
      let h = `<h2>Expertise</h2><p class="sub">Level ${S.level} · ${S.xp} / ${need} XP · <b class="goldc">${S.points} talent point${S.points === 1 ? '' : 's'}</b> to spend · up to ${CFG.progress.maxTrees} trees</p><div class="tgrid">`;
      for (const [k, t] of Object.entries(T)) {
        if (!Items.treeFor(k)) continue;
        const spent = Items.spentIn(k), shut = !used.includes(k) && used.length >= CFG.progress.maxTrees;
        h += `<div class="tcol${shut ? ' shut' : ''}" style="--tc:${t.color}"><div class="thead"><b>${t.name}</b><small>${shut ? 'closed' : spent + ' spent'}</small></div>`;
        t.talents.forEach((x, i) => {
          const r = Items.rank(x.id), lit = i === 0 ? spent > 0 : Items.rank(t.talents[i - 1].id) > 0;
          if (i) h += `<i class="tlink${lit ? ' lit' : ''}"></i>`;
          h += node(x, r, 3, false);
        });
        h += `<i class="tlink tolt${spent >= CFG.progress.ultimateNeeds ? ' lit' : ''}"><em>${Math.min(spent, CFG.progress.ultimateNeeds)}/${CFG.progress.ultimateNeeds}</em></i>` + node(t.ult, Items.rank(t.ult.id), 1, true) + '</div>';
      }
      h += '</div>' + talentDetail(sel);
      h += '<h3>Weapon mastery</h3><div class="mgrid">' + Object.entries(CFG.gear.weapons).filter(([k]) => CFG.classes[Items.cls()].weapons.includes(k)).map(([k, w]) => {
        const r = Items.masteryRank(k), n = S.mastery[k] || 0, nx = CFG.progress.mastery[r], prev = r ? CFG.progress.mastery[r - 1] : 0;
        const pct = nx ? Math.min(100, (n - prev) / (nx - prev) * 100) : 100;
        return `<div class="mrow"><b>${w.name}</b><span class="mbar"><i style="width:${pct}%"></i></span><small>rank ${r}${nx ? ` · ${n}/${nx}` : ' · max'}</small></div>`;
      }).join('') + '</div><p class="dim">Rank 1: +4% damage · rank 2: a fourth, finishing blow · rank 3: +8% posture damage and the weapon\'s art (hold block and press heavy). Land hits with a weapon to train it.</p>'
        + '<div class="arts">' + Object.entries(CFG.player.arts).map(([k, a]) => `<div class="${Items.masteryRank(k) >= 3 ? 'got' : 'dim'}"><b>${esc(CFG.gear.weapons[k].name)}: ${esc(a.name)}</b> <small>${esc(a.desc)} · ${a.cd} s</small></div>`).join('') + '</div>';
      const cost = CFG.progress.respecCost * S.level;
      if (o.trainer) h += btn(`Unlearn all talents · ◆${cost}`, 'respec', '', S.gold < cost || !Object.keys(S.talents).length);
      return h + btn('Close', 'close', '', false, 'leave');
    },
    // Before an Endless climb: pick any curses (each harder, each more gold), then descend
    curses() {
      const S = Items.S, E = S.endless || {}, on = tab.curses || (tab.curses = (E.lastCurses || []).slice()), gold = Endless.curseGold(on);
      let h = '<h2>Curses of the Deep</h2><p class="sub">Carry curses into the Endless Deep for more gold. They last the whole climb, and they add up.</p>';
      for (const c of CFG.curses) {
        const sel = on.includes(c.id);
        h += `<div class="irow curse${sel ? ' got' : ''}"><div class="iinfo"><b>${c.icon} ${esc(c.name)}</b> <small class="goldc">+${Math.round(c.gold * 100)}% gold</small><div class="istats">${esc(c.desc)}</div></div><div class="ibtns">${btn(sel ? 'Carried' : 'Carry', 'curse', c.id, false, sel ? 'on' : '')}</div></div>`;
      }
      const heat = E.heat || {}, rec = Object.keys(heat).sort((a, b) => a - b).map(n => `${n} curse${n > 1 ? 's' : ''}: floor ${heat[n]}`).join(' · ');
      h += `<p>${on.length ? `<b>${on.length} curse${on.length > 1 ? 's' : ''}</b> · <b class="goldc">+${Math.round(gold * 100)}% gold</b>` : 'No curses: the plain climb.'}${rec ? `<br><span class="dim">Deepest with curses — ${rec}</span>` : ''}</p>`;
      return h + `<div class="tact">${btn('Descend', 'endlessgo', '', false, 'hot')}${btn('Back', 'open', 'gate')}</div>`;
    },
    // The three save slots: play or start one, export it as a code, import a code into it, delete it (asked twice)
    saves() {
      const ago = t => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
      let h = '<h2>Saves</h2><p class="sub">Three wardens, kept on this device. Export a save as a code to keep it safe or move it to another device.</p>';
      for (let n = 1; n <= Items.SLOTS; n++) {
        const s = Items.slotInfo(n), st = s && CFG.stages[Math.min(s.stage, CFG.stages.length - 1)];
        h += `<div class="irow save${n === Items.slot ? ' cur' : ''}"><div class="iinfo"><b>Slot ${n}</b>${n === Items.slot ? ' <small class="goldc">last played</small>' : ''}`
          + (s ? `<div class="istats">Level ${s.level} · ${esc(st ? st.name : '')} · ◆ ${s.gold}${s.best ? ' · deepest floor ' + s.best : ''} · saved ${ago(s.savedAt)}</div>` : '<div class="istats dim">Empty</div>')
          + `</div><div class="ibtns">${s ? btn('Play', 'saveplay', n, false, 'hot') + btn('Export', 'saveexport', n) + btn('Import', 'saveimport', n) + btn(tab.saveDel === n ? 'Sure? Delete' : 'Delete', 'savedel', n, false, tab.saveDel === n ? 'warn' : '')
            : btn('New game', 'savenew', n, false, 'hot') + btn('Import', 'saveimport', n)}</div></div>`;
        if (tab.saveExport === n) h += `<div class="savecode"><textarea readonly rows="3">${esc(Items.exportSlot(n))}</textarea><div class="tact">${btn('Copy', 'savecopy', n)}${(navigator.share || (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share)) ? btn('Share', 'saveshare', n) : ''}<small class="dim">Keep this code somewhere safe; Import puts it back.</small></div></div>`;
        if (tab.saveImport === n) h += `<div class="savecode"><textarea rows="3" placeholder="Paste a DEEPWARD1: code here"></textarea><div class="tact">${btn(s ? 'Load (replaces this slot)' : 'Load', 'saveimportgo', n, false, 'hot')}${tab.importBad ? '<small class="warnc">That code does not work.</small>' : ''}</div></div>`;
      }
      return h + btn('Back', 'close', '', false, 'leave');
    },
    shrine(o) {
      let h = `<h2>Shrine of the Deep</h2><p class="sub">The stone hums. Choose one blessing; it holds until you leave this stage.</p>`;
      for (const b of o.offers) h += `<div class="irow"><div class="iinfo"><b>${b.icon} ${esc(b.name)}</b><div class="istats">${esc(b.desc)}</div></div><div class="ibtns">${btn('Choose', 'bless', b.id, false, 'hot')}</div></div>`;
      return h + btn('Leave it be', 'close', '', false, 'leave');
    },
    settings() {
      const pct = v => Math.round(v * 100) + '%';
      const row = (k, label, fmt) => {
        const v = Settings.get(k), [lo, hi, st] = LIM[k];
        return `<div class="irow srow"><div class="iinfo"><b>${label}</b></div><div class="ibtns">${btn('−', 'set', k + ':-1', v <= lo + 1e-6)}<span class="sval"><i style="width:${(v - lo) / (hi - lo) * 100}%"></i><em>${fmt(v)}</em></span>${btn('+', 'set', k + ':1', v >= hi - 1e-6)}</div></div>`;
      };
      const tog = (k, label, on, off) => `<div class="irow srow"><div class="iinfo"><b>${label}</b></div><div class="ibtns">${btn(Settings.get(k) ? on : off, 'toggle', k, false, Settings.get(k) ? 'on' : '')}</div></div>`;
      const langs = I18N.NAMES.filter(([l]) => I18N.has(l)).map(([l, n]) => `<button class="pb${I18N.lang === l ? ' on' : ''}" data-act="lang" data-arg="${l}" translate="no">${n}</button>`).join('');
      return `<h2>Settings</h2><p class="sub">Kept on this device.</p><h3>Language</h3><div class="tact">${langs}</div><h3>Sound</h3>` + row('master', 'Master volume', pct) + row('music', 'Music', pct) + row('sfx', 'Effects', pct)
        + `<h3>Gameplay</h3><div class="irow srow"><div class="iinfo"><b>Difficulty</b><div class="istats">${esc(Settings.diff.desc)}</div></div><div class="ibtns">${btn(Settings.diff.name, 'difficulty', '', false, 'on')}</div></div>`
        + tog('cues', 'Telegraph words (DASH! / PARRY! over special attacks)', 'On', 'Off') + tog('learnedAI', 'Companions use the learned battle policy (Off: the plain rules)', 'On', 'Off') + tog('learnOnline', 'Companions keep learning from your fights', 'On', 'Off') + tog('companionDodge', 'Companions dash out of telegraphed blows', 'On', 'Off') + tog('timingRing', 'Timing circle on enemy blows (shrinks to the moment of impact)', 'On', 'Off') + tog('hitstop', 'Hit-stop on impact', 'On', 'Off') + tog('haptics', 'Vibration (phones)', 'On', 'Off') + tog('slowmo', 'Slow motion on parries', 'On', 'Off')
        + (document.body.classList.contains('touch') ? '<h3>Touch controls</h3>' + row('padScale', 'Button size', v => v.toFixed(1) + '×') + row('padOpacity', 'Button opacity', pct)
          + tog('lefty', 'Left-handed layout (buttons on the left, move with the right thumb)', 'On', 'Off')
          + `<div class="tact">${btn('Arrange buttons', 'arrange')}${btn('Reset button positions', 'padreset')}</div>` : '')
        + `<h3>Graphics</h3><div class="irow srow"><div class="iinfo"><b>Quality</b><div class="istats">Lower it if the game stutters: Low turns shadows off and draws fewer pixels.</div></div><div class="ibtns">${btn(QNAME[Settings.get('quality')] + (Settings.get('quality') === 'auto' ? ' (' + QNAME[G.quality()] + ')' : ''), 'quality', '', false, 'on')}</div></div>`
        + tog('autoRes', 'Automatic resolution (draws fewer pixels when frames run slow)', 'On', 'Off') + tog('perf', 'Show performance (FPS, frame time, draw calls)', 'On', 'Off')
        + `<h3>Controls</h3><div class="irow srow"><div class="iinfo"><b>Keyboard and controller</b><div class="istats">Change the key or button for any action.</div></div><div class="ibtns">${btn('Change…', 'open', 'controls', false, 'on')}</div></div>`
        + '<h3>Camera</h3>' + row('sens', 'Look sensitivity', v => v.toFixed(1) + '×') + tog('invertY', 'Vertical look', 'Inverted', 'Normal') + tog('shake', 'Screen shake', 'On', 'Off')
        + `<div class="tact">${btn('Restore defaults', 'sreset')}</div>` + btn('Done', 'close', '', false, 'leave');
    },
    // Nell the gem cutter: the same setting and prying as Bram, and three stones of a kind cut into one of another kind
    gemcutter() {
      const S = Items.S, GM = CFG.gear.gems, t = tab.gem || (tab.gem = 'cut');
      let h = `<h2>Nell's Bench</h2><p class="sub">"Every stone wants to be something. I just help it decide."</p>${money()}` + tabs('gem', [['cut', 'Cut'], ['set', 'Set and pry']]);
      if (t === 'set') return h + gemsBody('"Hold still, warden. Steel first, stone second."') + btn('Close', 'close', '', false, 'leave');
      h += '<p>Three stones of one kind become one stone of another kind you choose.</p>';
      for (const k of Object.keys(GM)) {
        const n = S.gems[k] || 0, ok = n >= 3;
        h += `<div class="irow"><div class="iinfo"><b>${GM[k].icon} ${GM[k].name}</b> <small>×${n}</small><div class="istats">${esc(GM[k].desc)}</div></div><div class="ibtns">${Object.keys(GM).filter(j => j !== k).map(j => btn('→ ' + GM[j].icon, 'gemcut', k + ':' + j, !ok)).join('')}</div></div>`;
      }
      return h + btn('Close', 'close', '', false, 'leave');
    },
    // Ysolde the herbalist: tonics bought now are drunk at the start of the next trip
    herbalist() {
      const S = Items.S, have = S.tonics || [];
      let h = `<h2>Ysolde's Stall</h2><p class="sub">"Drink it on the stair, not before. It keeps for one trip and no longer."</p>${money()}`;
      h += `<p>${have.length ? 'Packed for your next trip: ' + have.map(id => { const t = CFG.camp.tonics.find(x => x.id === id); return t.icon + ' ' + t.name; }).join(', ') : 'Nothing packed yet.'}</p>`;
      h += `<p class="dim">Bring herbs and she brews it for a fraction of the price. ${matLine()}</p>`;
      for (const t of CFG.camp.tonics) {
        const got = have.includes(t.id), need = brewNeed(t), canBrew = Items.hasMats(need) && S.gold >= Math.round(t.cost * 0.2);
        const brew = btn(`Brew · ${Object.entries(need).map(([k, n]) => CFG.materials[k].icon + n).join(' ')} ◆${Math.round(t.cost * 0.2)}`, 'brew', t.id, !canBrew);
        h += `<div class="irow${got ? ' got' : ''}"><div class="iinfo"><b>${t.icon} ${esc(t.name)}</b><div class="istats">${esc(t.desc)} · next trip</div></div><div class="ibtns">${got ? '<small class="goldc">Packed</small>' : btn('◆ ' + t.cost, 'tonic', t.id, S.gold < t.cost) + brew}</div></div>`;
      }
      return h + btn('Close', 'close', '', false, 'leave');
    },
    // Odo the curio dealer: one rare-or-better piece a day
    curio() {
      const S = Items.S, c = curioOfDay(), price = c.item ? Items.value(c.item) * CFG.camp.curioMult : 0;
      let h = `<h2>Odo's Wagon</h2><p class="sub">"One treasure a day, warden. Today's is a fine one. They always are."</p>${money()}`;
      h += c.item ? itemRow(c.item, btn('◆ ' + price, 'curiobuy', '', S.gold < price || S.inv.length >= CFG.gear.invSize, 'hot')) : '<p class="dim">Sold out until tomorrow. Odo is polishing an empty shelf.</p>';
      return h + btn('Close', 'close', '', false, 'leave');
    },
    // Settings → Controls: each action's key and controller button. Pick one, then press the new key or button.
    controls() {
      const L = Bindings.listening;
      let h = '<h2>Controls</h2><p class="sub">Pick a key or button, then press the new one. Esc or Menu cancels. Menus, Esc and Menu always work as they are.</p>';
      if (L) h += `<div class="listen">Press a ${L.dev === 'pad' ? 'controller button' : 'key'} for <b>${esc(Bindings.ACTIONS.find(a => a[0] === L.act)[1])}</b>…</div>`;
      h += '<div class="ctlgrid"><b></b><b>Keyboard</b><b>Controller</b>';
      for (const [a, name] of Bindings.ACTIONS) {
        const move = ['up', 'down', 'left', 'right'].includes(a);
        h += `<span>${esc(name)}</span>${btn(esc(Bindings.label(a, 'key')), 'bindkey', a, false, L && L.act === a && L.dev === 'key' ? 'hot' : '')}`
          + (move ? '<small class="dim">left stick</small>' : btn(esc(Bindings.label(a, 'pad')), 'bindpad', a, false, L && L.act === a && L.dev === 'pad' ? 'hot' : ''));
      }
      h += `</div><p class="dim">The mouse stays as it is: left-click attacks, right-click blocks, middle-click is a heavy attack.</p><div class="tact">${btn('Restore default controls', 'bindreset')}</div>`;
      return h + btn('Back', 'open', 'settings', false, 'leave');
    },
    // Sefa's caravan: gear a tier above, bundles of materials, a gem; she buys spare materials
    wanderer() {
      const S = Items.S, W = S.wander, C = CFG.wanderer, lines = CFG.townsfolk.wanderer[1], full = S.inv.length >= CFG.gear.invSize;
      let h = `<h2>Sefa's Caravan</h2><p class="sub">"${esc(lines[(S.jobsDone || 0) % lines.length])}"</p>${money()}`;
      if (!W) return h + '<p class="dim">The caravan has moved on.</p>' + btn('Close', 'close', '', false, 'leave');
      W.items.forEach((it, i) => { if (it) { const price = Math.round(Items.value(it) * C.itemMult); h += itemRow(it, btn('◆ ' + price, 'wbuy', i, S.gold < price || full, 'hot')); } });
      W.bundles.forEach((b, i) => { const M = CFG.materials[b.id]; h += `<div class="irow${b.sold ? ' empty' : ''}"><div class="iinfo"><b>${M.icon} ${M.name} ×${b.n}</b></div><div class="ibtns">${b.sold ? '<small class="dim">Sold</small>' : btn('◆ ' + b.gold, 'wbundle', i, S.gold < b.gold)}</div></div>`; });
      if (W.gem) { const g = CFG.gear.gems[W.gem]; h += `<div class="irow"><div class="iinfo"><b>${g.icon} ${esc(g.name)}</b> <small class="dim">a loose gem</small></div><div class="ibtns">${btn('◆ ' + C.gem, 'wgem', '', S.gold < C.gem)}</div></div>`; }
      const have = Object.keys(CFG.materials).filter(k => (S.mats || {})[k] > 0);
      if (have.length) h += `<p>She buys materials at ◆ ${C.buys} each: ` + have.map(k => btn(`${CFG.materials[k].icon} ${S.mats[k]} · sell 1`, 'wsell', k)).join('') + '</p>';
      return h + btn('Close', 'close', '', false, 'leave');
    },
    // The notice board by the fire: three jobs, turned in here for gold (and sometimes a gem)
    board() {
      const S = Items.S;
      let h = `<h2>Notice Board</h2><p class="sub">Pinned by the fire: work for anyone with a blade. ${S.jobsDone ? `Jobs done: ${S.jobsDone}` : ''}</p>${money()}`;
      for (const j of Jobs.list()) {
        const pr = Jobs.progress(j), ok = Jobs.done(j);
        h += `<div class="irow${ok ? ' got' : ''}"><div class="iinfo"><b>${esc(j.title)}</b> <small class="goldc">◆ ${j.gold}${j.gem ? ' + a gem' : ''}</small><div class="istats">${pr} / ${j.need}${j.kind === 'gather' ? ' in hand' : ''}</div></div>`
          + `<div class="ibtns">${btn('Turn in', 'jobin', j.id, !ok, ok ? 'hot' : '')}${btn('Tear down', 'jobdrop', j.id)}</div></div>`;
      }
      h += `<p class="dim">Hunts count from when the job was pinned. A torn-down job is replaced with a fresh one. ${matLine()}</p>`;
      return h + btn('Close', 'close', '', false, 'leave');
    },
    // The Ring: Varga's arena. Old guardians and the big monsters of the Rim, fought again for gold and a gem.
    arena() {
      let h = `<h2>The Ring</h2><p class="sub">"Any foe you have beaten, I can find again. For a price paid in blood, and paid out in gold." · Varga</p>${money()}`;
      for (const A of G.arenaList()) {
        h += `<div class="irow${A.final ? ' uniq' : ''}${A.locked ? ' empty' : ''}"><div class="iinfo"><b>${esc(A.name)}</b> ${A.locked ? '' : `<small class="goldc">◆ ${G.arenaGold(A)} + a gem${A.won ? '' : ' (first win)'}</small>`}<div class="istats">${A.locked ? esc(A.locked) : A.won ? `Won ${A.won}×` : A.monster ? 'A great beast, not yet fought here' : 'A guardian, fought again'}</div></div>`
          + `<div class="ibtns">${btn('Fight', 'ring', A.id, !!A.locked, A.locked ? '' : 'hot')}</div></div>`;
      }
      if (!G.arenaList().length) h += '<p class="dim">Beat a guardian of the Deep first. Varga only brings back what you have already beaten.</p>';
      return h + btn('Close', 'close', '', false, 'leave');
    },
    arenaWon(o) {
      const g = CFG.gear.gems[o.gem];
      return `<h2>Victory in the Ring</h2><p class="sub">${esc(o.name)} falls${o.first ? ' for the first time here' : ''}. The Hold roars.</p>${money()}<p>Won <b class="goldc">◆ ${o.gold}</b> and a gem: ${g.icon} ${esc(g.name)}.</p>${btn('Back to the Hold', 'ringhome', '', false, 'hot')}`;
    },
    cleared(o) {
      const next = CFG.stages[(o.k + 1) % CFG.stages.length];
      return `<h2>Stage cleared</h2><p class="sub">${esc(o.guardian)} has fallen. The way deeper is open.</p>${money()}
        <p>Return to camp to bank your gold, mend your gear and spend it, or press on into ${esc(next.name)} while the blood is hot.</p>
        ${btn('Return to camp', 'camp', '', false, 'hot')}${btn('Press on to ' + esc(next.name), 'onward')}`;
    },
    fallen(o) {
      return `<h2>You have fallen</h2><p class="sub">Tilda's people drag you back up the stair.</p><p>Lost <b class="goldc">◆ ${o.lost}</b>, half the gold gathered on this trip.</p><p class="dim">${esc(o.where)}</p>${btn('Wake in camp', 'wake', '', false, 'hot')}`;
    },
  };

  // ---------------- Actions ----------------
  function act(a, arg) {
    const S = Items.S;
    if (a === 'close') return close();
    if (a === 'tab') { const [n, id] = arg.split(':'); tab[n] = id; render(); focus = buttons().findIndex(b => b.dataset.arg === arg); return highlight(); }
    if (a === 'wbuy') { const W = S.wander, it = W && W.items[+arg], price = it && Math.round(Items.value(it) * CFG.wanderer.itemMult); if (it && S.gold >= price && Items.add(it)) { S.gold -= price; W.items[+arg] = null; Snd.play('glint'); toast('Bought: ' + Items.fullName(it), Items.colorOf(it)); changed(); } return render(); }
    if (a === 'wbundle') { const b = S.wander && S.wander.bundles[+arg]; if (b && !b.sold && S.gold >= b.gold) { S.gold -= b.gold; Items.addMat(b.id, b.n); b.sold = true; Snd.play('glint'); Items.save(); } return render(); }
    if (a === 'wgem') { const W = S.wander; if (W && W.gem && S.gold >= CFG.wanderer.gem) { S.gold -= CFG.wanderer.gem; Items.addGem(W.gem); toast('Gem: ' + CFG.gear.gems[W.gem].name, '#9ad8ff'); W.gem = null; Snd.play('glint'); Items.save(); } return render(); }
    if (a === 'wsell') { if ((S.mats[arg] || 0) > 0) { S.mats[arg]--; S.gold += CFG.wanderer.buys; Items.save(); } return render(); }
    if (a === 'look') { const [k, i] = arg.split(':'); S.looks = S.looks || {}; S.looks[k] = +i; Items.save(); G.onGearChanged(false); render(); focus = buttons().findIndex(b => b.dataset.arg === arg); return highlight(); }
    if (a === 'recruit') { if (Party.recruit(arg)) { Snd.play('glint'); toast('Joined the party: ' + Party.defs.find(d => d.id === arg).name, '#9affc8'); } return render(); }
    if (a === 'policyshare' || a === 'policycopy') {
      const text = 'Deepward companion learning\n' + Party.exportData();
      (a === 'policycopy' ? (async () => { try { await navigator.clipboard.writeText(text); return 'copied'; } catch (e) { return shareText('Deepward companion learning', text); } })() : shareText('Deepward companion learning', text))
        .then(r => toast(r === 'shared' ? 'Learned data sent to the share sheet' : r === 'copied' ? 'Learned data copied' : 'Could not copy: use Show the text', '#9affc8'));
      return;
    }
    if (a === 'policyshow') { tab.policyShow = !tab.policyShow; return render(); }
    if (a === 'forget') { Party.forget(); Items.save(); return render(); }
    if (a === 'dismiss') { Party.dismiss(arg); return render(); }
    if (a === 'pickclass') { if (Items.setClass(arg)) { G.onGearChanged(false); close(); return show('looks', { first: true }); } return; }
    if (a === 'looksdone') { close(); return show('trainOffer'); }
    if (a === 'jobin') { const r = Jobs.turnIn(+arg); if (r) { Snd.play('glint'); toast(`Job done: ◆ ${r.gold}` + (r.gem ? ` and ${CFG.gear.gems[r.gem].icon} ${CFG.gear.gems[r.gem].name}` : ''), '#ffd040'); changed(); } return render(); }
    if (a === 'jobdrop') { Jobs.drop(+arg); Items.save(); return render(); }
    if (a === 'ring') { const A = G.arenaList().find(x => x.id === arg); if (A && !A.locked) { close(); G.enterArena(A); } return; }
    if (a === 'next') { const o = open.opt; if (o.i < o.lines.length - 1) { o.i++; return render(); } return close(); }
    if (a === 'upgrade') { const it = CFG.gear.slots.map(s => S.equip[s]).find(x => x && x.id === +arg), c = it && Items.upgradeCost(it); if (it && S.gold >= c.gold && S.scrap >= c.scrap && it.plus < Items.maxPlus()) { S.gold -= c.gold; S.scrap -= c.scrap; it.plus++; Snd.play('block'); toast(`${Items.fullName(it)}`, R[it.rarity].color); changed(); } return render(); }
    if (a === 'forge') {
      const tier = Math.min(S.stage, CFG.gear.tierNames.length - 1), two = !!CFG.gear.weapons[arg], cost = Math.round(CFG.camp.forgeCost[tier] * (two ? 1.3 : 1));
      if (S.gold < cost || S.inv.length >= CFG.gear.invSize) { if (S.inv.length >= CFG.gear.invSize) toast('Your bag is full'); return render(); }
      S.gold -= cost; const it = Items.generate(tier, two ? { slot: 'weapon', type: arg, boost: S.camp.forge * 0.6 } : { slot: arg, boost: S.camp.forge * 0.6 }); Items.add(it);
      Snd.play('parry'); toast('Forged: ' + Items.fullName(it), R[it.rarity].color); changed(); return render();
    }
    if (a === 'reroll') {
      const [id, i] = String(arg).split(':'), it = CFG.gear.slots.map(s => S.equip[s]).find(x => x && x.id === +id);
      if (it && Items.reroll(it, +i)) { Snd.play('parry'); toast('Reworked: ' + Items.describe(it).slice(-it.aff.length)[+i], R[it.rarity].color); changed(); }
      return render();
    }
    if (a === 'gem' || a === 'pry' || a === 'socket') {
      const [id, kind] = String(arg).split(':'), it = CFG.gear.slots.map(s => S.equip[s]).find(x => x && x.id === +id);
      if (!it) return render();
      const ok = a === 'gem' ? Items.setGem(it, kind) : a === 'pry' ? (Items.pryGems(it), true) : Items.addSocket(it);
      if (ok) { Snd.play(a === 'socket' ? 'parry' : 'glint'); changed(); }
      return render();
    }
    if (a === 'salvage') { const it = Items.remove(+arg); if (it) { S.scrap += CFG.camp.salvage[it.rarity]; Snd.play('guardBreak'); changed(); } return render(); }
    if (a === 'buy') { const it = S.stock[+arg], price = it && Items.value(it) * 3; if (it && S.gold >= price && Items.add(it)) { S.gold -= price; S.stock.splice(+arg, 1); if (it.uniq && !S.uniques.includes(it.uniq)) S.uniques.push(it.uniq); Snd.play('wave'); toast('Bought: ' + Items.fullName(it), R[it.rarity].color); changed(); } return render(); }
    if (a === 'sell') { const it = Items.remove(+arg); if (it) { S.gold += Items.value(it); Snd.play('glint'); changed(); } return render(); }
    if (a === 'build') { const b = CFG.camp.buildings[arg], lv = S.camp[arg], cost = b.costs[lv]; if (lv < b.max && S.gold >= cost) { S.gold -= cost; S.camp[arg]++; Snd.play('wave'); toast(`${b.name} built up to level ${S.camp[arg]}`); changed(true); } return render(); }
    if (a === 'equip') { const it = Items.S.inv.find(x => x.id === +arg); Items.equip(+arg); if (it) tab.gsel = 'e:' + it.slot; Snd.play('block'); changed(); return render(); }
    if (a === 'bagfilter') { tab.bagFilter = arg; const v = bagView(S.inv, tab.bagSort || 'new', arg); tab.gsel = v.length ? 'i:' + v[0].id : arg !== 'all' ? 'e:' + arg : tab.gsel; Snd.play('glint'); return render(); }
    if (a === 'bagsort') { const o = ['new', 'rarity', 'slot', 'power']; tab.bagSort = o[(o.indexOf(tab.bagSort || 'new') + 1) % o.length]; Snd.play('glint'); return render(); }
    if (a === 'bagsalvage') {
      const v = bagView(S.inv, tab.bagSort || 'new', tab.bagFilter || 'all'), i = v.findIndex(x => x.id === +arg), it = Items.remove(+arg);
      if (it) { S.scrap += CFG.camp.salvage[it.rarity]; Snd.play('guardBreak'); toast(`Salvaged for ⚙${CFG.camp.salvage[it.rarity]}`); const nx = v[i + 1] || v[i - 1]; tab.gsel = nx ? 'i:' + nx.id : 'e:' + it.slot; changed(); }
      return render();
    }
    if (a === 'bindkey' || a === 'bindpad') { Bindings.startListen(arg, a === 'bindkey' ? 'key' : 'pad', () => { if (open && open.id === 'controls') { Snd.play('glint'); render(); } }); return render(); }
    if (a === 'bindreset') { Bindings.reset(); Snd.play('glint'); return render(); }
    if (a === 'craft') { const r = CFG.crafts.find(x => x.id === arg), it = r && Items.craft(r); if (it) { Snd.play('parry'); toast('Crafted: ' + Items.fullName(it), R[it.rarity].color); changed(); } return render(); }
    if (a === 'temper') { const it = CFG.gear.slots.map(s => S.equip[s]).find(x => x && x.id === +arg), T = CFG.temper; if (it && it.plus < Items.maxPlus() && S.scrap >= T.scrap && Items.spendMats({ ore: T.ore })) { S.scrap -= T.scrap; it.plus++; Snd.play('block'); toast('Tempered: ' + Items.fullName(it), R[it.rarity].color); changed(); } return render(); }
    if (a === 'brew') { const t = CFG.camp.tonics.find(x => x.id === arg), g = t && Math.round(t.cost * 0.2); S.tonics = S.tonics || []; if (t && !S.tonics.includes(t.id) && S.gold >= g && Items.spendMats(brewNeed(t))) { S.gold -= g; S.tonics.push(t.id); Snd.play('glint'); changed(); } return render(); }
    if (a === 'gemcut') { const [from, to] = arg.split(':'); if ((S.gems[from] || 0) >= 3) { S.gems[from] -= 3; Items.addGem(to); Snd.play('parry'); toast(`Cut: ${CFG.gear.gems[to].icon} ${CFG.gear.gems[to].name}`, '#9ad8ff'); changed(); } return render(); }
    if (a === 'tonic') { const t = CFG.camp.tonics.find(x => x.id === arg); S.tonics = S.tonics || []; if (t && S.gold >= t.cost && !S.tonics.includes(t.id)) { S.gold -= t.cost; S.tonics.push(t.id); Snd.play('glint'); changed(); } return render(); }
    if (a === 'curiobuy') { const c = curioOfDay(), price = c.item && Items.value(c.item) * CFG.camp.curioMult; if (c.item && S.gold >= price && Items.add(c.item)) { S.gold -= price; if (c.item.uniq && !S.uniques.includes(c.item.uniq)) S.uniques.push(c.item.uniq); toast('Bought: ' + Items.fullName(c.item), R[c.item.rarity].color); S.curio.item = null; Snd.play('wave'); changed(); } return render(); }
    if (a === 'saveplay') return G.playSlot(+arg, false);
    if (a === 'savenew') return G.playSlot(+arg, true);
    if (a === 'savedel') { if (tab.saveDel === +arg) { Items.deleteSlot(+arg); tab.saveDel = 0; Snd.play('guardBreak'); toast('Slot ' + arg + ' deleted'); } else tab.saveDel = +arg; return render(); }
    if (a === 'saveexport') { tab.saveExport = tab.saveExport === +arg ? 0 : +arg; tab.saveImport = 0; return render(); }
    if (a === 'saveimport') { tab.saveImport = tab.saveImport === +arg ? 0 : +arg; tab.saveExport = 0; tab.importBad = false; return render(); }
    if (a === 'savecopy') { const t = el('pcard').querySelector('.savecode textarea'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand && document.execCommand('copy'); } toast('Save code copied'); return; }
    if (a === 'saveshare') { shareText('Deepward save', Items.exportSlot(+arg)); return; }
    if (a === 'saveimportgo') {
      const t = el('pcard').querySelector('.savecode textarea'), ok = Items.importSlot(+arg, t ? t.value : '');
      tab.importBad = !ok; if (ok) { tab.saveImport = 0; Snd.play('parry'); toast('Save imported into slot ' + arg); }
      return render();
    }
    if (a === 'gsel') { tab.gsel = arg; Snd.play('glint'); return render(); }
    if (a === 'lang') { if (arg !== I18N.lang) { I18N.set(arg); render(); } return; }
    if (a === 'set') { const [k, d] = arg.split(':'), [lo, hi, st] = LIM[k]; Settings.set(k, Math.min(hi, Math.max(lo, Math.round((Settings.get(k) + st * d) * 100) / 100))); Snd.play('glint'); return render(); }
    if (a === 'bless') { const sh = open.opt.shrine; close(); return G.bless(arg, sh); }
    if (a === 'arrange') { close(); return TouchLayout.beginEdit(); }
    if (a === 'padreset') { TouchLayout.reset(); Snd.play('glint'); return render(); }
    if (a === 'difficulty') { const order = Object.keys(CFG.difficulty); Settings.set('difficulty', order[(order.indexOf(Settings.get('difficulty')) + 1) % order.length]); Snd.play('glint'); return render(); }
    if (a === 'quality') { const order = ['auto', 'high', 'medium', 'low']; Settings.set('quality', order[(order.indexOf(Settings.get('quality')) + 1) % order.length]); Snd.play('glint'); return render(); }
    if (a === 'toggle') { Settings.set(arg, !Settings.get(arg)); Snd.play('glint'); return render(); }
    if (a === 'sreset') { Settings.reset(); Snd.play('glint'); return render(); }
    if (a === 'tsel') { tab.talent = arg; Snd.play('glint'); return render(); }
    if (a === 'learn') { if (Items.learn(arg)) { Snd.play('parry'); changed(); } return render(); }
    if (a === 'ult') { S.ult = arg; changed(); return render(); }
    if (a === 'respec') { const cost = CFG.progress.respecCost * S.level; if (S.gold >= cost) { S.gold -= cost; Items.respec(); Snd.play('guardBreak'); toast('Talents unlearned: points returned'); changed(); } return render(); }
    if (a === 'open') { open.opt = open.id === 'trainer' ? { trainer: true } : {}; open.id = arg; focus = -1; return render(); }
    if (a === 'unequip') { const it = Items.S.equip[arg]; Items.unequip(arg); if (it && !Items.S.equip[arg]) tab.gsel = 'i:' + it.id; changed(); return render(); }
    if (a === 'descend') { const k = +arg; close(); return G.descend(k); }
    if (a === 'train') { close(); return G.startTraining(); }
    if (a === 'endless') { close(); return G.enterEndless(+arg === 1); }
    if (a === 'curse') { const on = tab.curses || (tab.curses = []), i = on.indexOf(arg); if (i >= 0) on.splice(i, 1); else on.push(arg); Snd.play(i >= 0 ? 'glint' : 'warn'); return render(); }
    if (a === 'endlessgo') { const S = Items.S; S.endless = S.endless || { best: 0, daily: {} }; S.endless.lastCurses = (tab.curses || []).slice(); close(); return G.enterEndless(false, S.endless.lastCurses); }
    if (a === 'deeper') { close(); return G.goDeeper(); }
    if (a === 'camp') { close(); return G.returnToCamp(); }
    if (a === 'ringhome') { close(); return G.wakeInCamp(); }
    if (a === 'onward') { close(); return G.pressOn(); }
    if (a === 'wake') { close(); return G.wakeInCamp(); }
  }
  // Odo's piece of the day: rolled once per day at the warden's depth, rare or better
  function curioOfDay() {
    const S = Items.S, today = Endless.today();
    if (!S.curio || S.curio.date !== today) S.curio = { date: today, item: Items.generate(Math.min(S.stage + 1, CFG.gear.tierNames.length - 1), { rarity: Math.random() < 0.3 ? 3 : 2 }) };
    return S.curio;
  }
  // Gear or camp changed: save, refresh the hero's numbers and looks (and the camp's buildings)
  function changed(camp) { Items.save(); G.onGearChanged(camp); }

  // ---------------- Showing ----------------
  function render() {
    const card = el('pcard');
    card.className = 'pcard ' + open.id;
    card.innerHTML = PANELS[open.id](open.opt || {});
    const doll = card.querySelector('.gdoll'); if (doll && typeof GearView !== 'undefined') GearView.mount(doll);
    const bs = buttons();
    if (focus < 0) focus = open && open.id === 'looks' ? bs.findIndex(b => b.classList.contains('hot'))   // a controller confirms the looks straight away
      : Math.max(0, bs.findIndex(b => !b.disabled && b.dataset.act !== 'tab'));
    focus = Math.max(0, Math.min(focus, bs.length - 1));
    // Keep focus on an enabled button
    if (bs[focus] && bs[focus].disabled) { const i = bs.findIndex(b => !b.disabled); if (i >= 0) focus = i; }
    highlight();
  }
  const buttons = () => [...el('pcard').querySelectorAll('.pb')];
  function highlight() { buttons().forEach((b, i) => b.classList.toggle('focus', i === focus)); const b = buttons()[focus]; if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' }); }
  function show(id, opt, done) {
    open = { id, opt }; onClose = done || null; focus = -1;
    el('panel').classList.add('show');
    render();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function close() {
    if (!open) return;
    open = null; el('panel').classList.remove('show');
    const f = onClose; onClose = null; if (f) f();
  }
  el('pcard').addEventListener('click', ev => {
    const b = ev.target.closest('.pb'); if (!b || b.disabled || !open) return;
    focus = buttons().indexOf(b); Snd.init(); act(b.dataset.act, b.dataset.arg);
  });
  // Arrow / d-pad navigation: dir -1 up, +1 down
  function nav(dir) {
    const bs = buttons(); if (!bs.length) return;
    for (let k = 0; k < bs.length; k++) { focus = (focus + dir + bs.length) % bs.length; if (!bs[focus].disabled) break; }
    highlight();
  }
  function confirm() {
    const b = buttons()[focus]; if (!open || !b || b.disabled) return;
    // On a controller or keyboard, confirming the node that is already selected learns it
    if (b.dataset.act === 'tsel' && tab.talent === b.dataset.arg && !Items.blocked(b.dataset.arg)) return act('learn', b.dataset.arg);
    // ...and confirming the selected piece of gear equips it (or takes it off)
    if (b.dataset.act === 'gsel' && tab.gsel === b.dataset.arg) { const [k, v] = b.dataset.arg.split(':'); return act(k === 'e' ? 'unequip' : 'equip', v); }
    act(b.dataset.act, b.dataset.arg);
  }
  function back() { if (!open) return; if (open.id === 'fallen') return confirm(); if (open.id === 'cleared' || open.id === 'deeper' || open.id === 'arenaWon') return; if (open.id === 'dialogue') return act('next'); close(); }

  // ---------------- HUD bits ----------------
  let toastT = null;
  // Send text out of the app: the phone's share sheet (the Capacitor Share plugin in the Android app, else the browser's), else the
  // clipboard. Returns 'shared' or 'copied' (or '' if neither worked).
  async function shareText(title, text) {
    const C = window.Capacitor;
    try { if (C && C.Plugins && C.Plugins.Share) { await C.Plugins.Share.share({ title, text, dialogTitle: title }); return 'shared'; } } catch (e) { if (e && /cancel/i.test(String(e.message || e))) return 'shared'; }
    try { if (navigator.share) { await navigator.share({ title, text }); return 'shared'; } } catch (e) { if (e && e.name === 'AbortError') return 'shared'; }
    try { await navigator.clipboard.writeText(text); return 'copied'; } catch (e) {}
    try { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); const ok = document.execCommand && document.execCommand('copy'); t.remove(); return ok ? 'copied' : ''; } catch (e) { return ''; }
  }
  function toast(text, color) {
    const t = el('toast'); t.textContent = text; t.style.color = color || ''; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function prompt(text) { const p = el('prompt'); if (text) { p.innerHTML = text; p.classList.add('show'); } else p.classList.remove('show'); }
  function boss(e) {
    const b = el('bossBar');
    if (!e || e.state === 'dead') { b.classList.remove('show'); return; }
    b.classList.add('show'); el('bossName').textContent = e.guardian;
    if (b.dataset.for !== e.guardian) {                                    // a tick on the bar where each phase begins
      b.dataset.for = e.guardian; const tr = b.querySelector('.track');
      tr.querySelectorAll('.tick').forEach(t => t.remove());
      for (const ph of e.boss ? e.boss.B.phases : []) { const t = document.createElement('b'); t.className = 'tick'; t.style.left = ph.at * 100 + '%'; tr.appendChild(t); }
    }
    el('bossFill').style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
    el('bossPost').style.width = Math.min(100, e.posture / (e.def.posture * e.mult) * 100) + '%';
  }

  return { show, close, nav, confirm, back, toast, prompt, boss, get open() { return open; }, render };
})();
