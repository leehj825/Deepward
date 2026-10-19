// Deepward - menus and story panels: Maren's dialogue, Bram's smithy, Tilda's stall, the camp ledger, the gate down,
// the bag (inventory and equipment), the stage-cleared choice and the fall. One panel shows at a time; it works with the
// mouse and touch, the keyboard (arrows / W S, Enter, Esc) and a controller (d-pad or left stick, A, B).
const UI = (() => {
  const el = id => document.getElementById(id);
  let open = null, focus = 0, onClose = null, tab = {};
  const R = CFG.gear.rarities;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = () => `<div class="money"><span class="gold">◆ ${Items.S.gold}</span><span class="scrap">⚙ ${Items.S.scrap} scrap</span></div>`;
  function itemRow(it, buttons, note = '') {
    const r = R[it.rarity];
    return `<div class="irow"><div class="iinfo"><b style="color:${r.color}">${esc(Items.fullName(it))}</b> <small>${CFG.gear.slotNames[it.slot]} · ${r.name}${note}</small>
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
  const LIM = { master: [0, 1, 0.1], music: [0, 1, 0.1], sfx: [0, 1, 0.1], sens: [0.4, 2.4, 0.2] };      // min, max, step

  // ---------------- Panels ----------------
  const PANELS = {
    dialogue(o) {
      const [who, text] = o.lines[o.i];
      return `<div class="dlg">${who ? `<div class="who">${esc(who)}</div>` : ''}<p>${esc(text)}</p>${btn(o.i < o.lines.length - 1 ? 'Continue' : (o.last || 'Close'), 'next')}</div>`;
    },
    smith() {
      const S = Items.S, t = tab.smith || (tab.smith = 'upgrade'), tier = Math.min(S.stage, CFG.gear.tierNames.length - 1);
      let h = `<h2>Bram's Forge</h2><p class="sub">"Bring me gold and scrap and I'll make that steel sing." · Forge level ${S.camp.forge}, upgrades up to +${Items.maxPlus()}</p>${money()}`;
      h += tabs('smith', [['upgrade', 'Upgrade'], ['forge', 'Forge new'], ['salvage', 'Salvage']]);
      if (t === 'upgrade') {
        const eq = CFG.gear.slots.map(s => S.equip[s]).filter(Boolean);
        h += eq.length ? eq.map(it => { const c = Items.upgradeCost(it), max = it.plus >= Items.maxPlus(), ok = !max && S.gold >= c.gold && S.scrap >= c.scrap;
          return itemRow(it, max ? '<small class="dim">Needs a better forge</small>' : btn(`+${it.plus + 1} · ◆${c.gold} ⚙${c.scrap}`, 'upgrade', it.id, !ok)); }).join('') : '<p class="dim">Nothing equipped.</p>';
      } else if (t === 'forge') {
        const cost = CFG.camp.forgeCost[tier];
        h += `<p>Bram forges a new piece at your depth (${CFG.gear.tierNames[tier]}). A better forge raises the odds of rare work.</p>`;
        for (const slot of CFG.gear.slots) {
          h += `<div class="irow"><div class="iinfo"><b>${CFG.gear.slotNames[slot]}</b> <small>random ${slot === 'weapon' ? 'weapon of any kind' : 'piece'}</small></div><div class="ibtns">${btn('◆ ' + cost, 'forge', slot, S.gold < cost)}</div></div>`;
          if (slot === 'weapon') for (const [type, note] of [['greatsword', 'two-handed: big hits and reach, no shield'], ['spear', 'long thrusts and a wide sweep, with a shield'], ['daggers', 'a fast five-cut combo and cheap dashes, no shield']])
            h += `<div class="irow"><div class="iinfo"><b>${CFG.gear.weapons[type].name}</b> <small>${note}</small></div><div class="ibtns">${btn('◆ ' + Math.round(cost * 1.3), 'forge', type, S.gold < cost * 1.3)}</div></div>`;
        }
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
      return h + btn('Stay in camp', 'close', '', false, 'leave');
    },
    bag() {
      const S = Items.S, st = Items.stats(), inCamp = World.inCamp();
      let h = `<h2>Gear</h2>${money()}<div class="statline">Health ${st.maxHp} · Stamina ${st.maxSt} · Damage x${st.dmg.toFixed(2)} · Posture x${st.posture.toFixed(2)} · Block ${Math.round(st.block * 100)}% · Armour ${Math.round(st.dr * 100)}%${st.crit ? ' · Crit ' + Math.round(st.crit * 100) + '%' : ''} · Flasks ${st.flasks}</div>`;
      h += '<h3>Equipped</h3>' + CFG.gear.slots.map(s => S.equip[s] ? itemRow(S.equip[s], btn('Take off', 'unequip', s), s === 'shield' && st.twoHanded ? ' · <b class="warnc">unused while you hold a two-handed weapon</b>' : '') : `<div class="irow empty"><div class="iinfo"><small>${CFG.gear.slotNames[s]} · empty</small></div></div>`).join('');
      h += `<h3>Bag (${S.inv.length} / ${CFG.gear.invSize})</h3>` + (S.inv.length ? S.inv.map(it => { const cur = S.equip[it.slot]; return itemRow(it, btn('Equip', 'equip', it.id), cur ? ' · replaces ' + esc(Items.fullName(cur)) : ''); }).join('') : '<p class="dim">Empty. Chests and guardians drop gear; Bram and Tilda make and sell it.</p>');
      if (!inCamp) h += '<p class="dim">Changing gear here is free, but the fight waits while you look.</p>';
      h += btn(`Expertise${S.points ? ' (' + S.points + ' to spend)' : ''}`, 'open', 'talents');
      return h + btn('Close', 'close', '', false, 'leave');
    },
    // Expertise as a skill tree: four columns of nodes (three talents, then the ultimate) joined by lines that fill as you
    // learn. Clicking (or confirming) a node shows its details below, with the Learn / Equip button.
    talents(o) {
      const S = Items.S, T = CFG.trees, need = CFG.progress.xpFor(S.level), used = Items.treesUsed();
      const sel = tab.talent || (tab.talent = firstOpenTalent());
      let h = `<h2>Expertise</h2><p class="sub">Level ${S.level} · ${S.xp} / ${need} XP · <b class="goldc">${S.points} talent point${S.points === 1 ? '' : 's'}</b> to spend · up to ${CFG.progress.maxTrees} trees</p><div class="tgrid">`;
      for (const [k, t] of Object.entries(T)) {
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
      h += '<h3>Weapon mastery</h3><div class="mgrid">' + Object.entries(CFG.gear.weapons).map(([k, w]) => {
        const r = Items.masteryRank(k), n = S.mastery[k] || 0, nx = CFG.progress.mastery[r], prev = r ? CFG.progress.mastery[r - 1] : 0;
        const pct = nx ? Math.min(100, (n - prev) / (nx - prev) * 100) : 100;
        return `<div class="mrow"><b>${w.name}</b><span class="mbar"><i style="width:${pct}%"></i></span><small>rank ${r}${nx ? ` · ${n}/${nx}` : ' · max'}</small></div>`;
      }).join('') + '</div><p class="dim">Rank 1: +4% damage · rank 2: a fourth, finishing blow · rank 3: +8% posture damage. Land hits with a weapon to train it.</p>';
      const cost = CFG.progress.respecCost * S.level;
      if (o.trainer) h += btn(`Unlearn all talents · ◆${cost}`, 'respec', '', S.gold < cost || !Object.keys(S.talents).length);
      return h + btn('Close', 'close', '', false, 'leave');
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
      return `<h2>Settings</h2><p class="sub">Kept on this device.</p><h3>Sound</h3>` + row('master', 'Master volume', pct) + row('music', 'Music', pct) + row('sfx', 'Effects', pct)
        + `<h3>Graphics</h3><div class="irow srow"><div class="iinfo"><b>Quality</b><div class="istats">Lower it if the game stutters: Low turns shadows off and draws fewer pixels.</div></div><div class="ibtns">${btn(QNAME[Settings.get('quality')] + (Settings.get('quality') === 'auto' ? ' (' + QNAME[G.quality()] + ')' : ''), 'quality', '', false, 'on')}</div></div>`
        + '<h3>Camera</h3>' + row('sens', 'Look sensitivity', v => v.toFixed(1) + '×') + tog('invertY', 'Vertical look', 'Inverted', 'Normal') + tog('shake', 'Screen shake', 'On', 'Off')
        + `<div class="tact">${btn('Restore defaults', 'sreset')}</div>` + btn('Done', 'close', '', false, 'leave');
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
    if (a === 'next') { const o = open.opt; if (o.i < o.lines.length - 1) { o.i++; return render(); } return close(); }
    if (a === 'upgrade') { const it = CFG.gear.slots.map(s => S.equip[s]).find(x => x && x.id === +arg), c = it && Items.upgradeCost(it); if (it && S.gold >= c.gold && S.scrap >= c.scrap && it.plus < Items.maxPlus()) { S.gold -= c.gold; S.scrap -= c.scrap; it.plus++; Snd.play('block'); toast(`${Items.fullName(it)}`, R[it.rarity].color); changed(); } return render(); }
    if (a === 'forge') {
      const tier = Math.min(S.stage, CFG.gear.tierNames.length - 1), two = !!CFG.gear.weapons[arg], cost = Math.round(CFG.camp.forgeCost[tier] * (two ? 1.3 : 1));
      if (S.gold < cost || S.inv.length >= CFG.gear.invSize) { if (S.inv.length >= CFG.gear.invSize) toast('Your bag is full'); return render(); }
      S.gold -= cost; const it = Items.generate(tier, two ? { slot: 'weapon', type: arg, boost: S.camp.forge * 0.6 } : { slot: arg, boost: S.camp.forge * 0.6 }); Items.add(it);
      Snd.play('parry'); toast('Forged: ' + Items.fullName(it), R[it.rarity].color); changed(); return render();
    }
    if (a === 'salvage') { const it = Items.remove(+arg); if (it) { S.scrap += CFG.camp.salvage[it.rarity]; Snd.play('guardBreak'); changed(); } return render(); }
    if (a === 'buy') { const it = S.stock[+arg], price = it && Items.value(it) * 3; if (it && S.gold >= price && Items.add(it)) { S.gold -= price; S.stock.splice(+arg, 1); Snd.play('wave'); toast('Bought: ' + Items.fullName(it), R[it.rarity].color); changed(); } return render(); }
    if (a === 'sell') { const it = Items.remove(+arg); if (it) { S.gold += Items.value(it); Snd.play('glint'); changed(); } return render(); }
    if (a === 'build') { const b = CFG.camp.buildings[arg], lv = S.camp[arg], cost = b.costs[lv]; if (lv < b.max && S.gold >= cost) { S.gold -= cost; S.camp[arg]++; Snd.play('wave'); toast(`${b.name} built up to level ${S.camp[arg]}`); changed(true); } return render(); }
    if (a === 'equip') { Items.equip(+arg); changed(); return render(); }
    if (a === 'set') { const [k, d] = arg.split(':'), [lo, hi, st] = LIM[k]; Settings.set(k, Math.min(hi, Math.max(lo, Math.round((Settings.get(k) + st * d) * 100) / 100))); Snd.play('glint'); return render(); }
    if (a === 'bless') { const sh = open.opt.shrine; close(); return G.bless(arg, sh); }
    if (a === 'quality') { const order = ['auto', 'high', 'medium', 'low']; Settings.set('quality', order[(order.indexOf(Settings.get('quality')) + 1) % order.length]); Snd.play('glint'); return render(); }
    if (a === 'toggle') { Settings.set(arg, !Settings.get(arg)); Snd.play('glint'); return render(); }
    if (a === 'sreset') { Settings.reset(); Snd.play('glint'); return render(); }
    if (a === 'tsel') { tab.talent = arg; Snd.play('glint'); return render(); }
    if (a === 'learn') { if (Items.learn(arg)) { Snd.play('parry'); changed(); } return render(); }
    if (a === 'ult') { S.ult = arg; changed(); return render(); }
    if (a === 'respec') { const cost = CFG.progress.respecCost * S.level; if (S.gold >= cost) { S.gold -= cost; Items.respec(); Snd.play('guardBreak'); toast('Talents unlearned: points returned'); changed(); } return render(); }
    if (a === 'open') { open.id = arg; open.opt = {}; focus = -1; return render(); }
    if (a === 'unequip') { Items.unequip(arg); changed(); return render(); }
    if (a === 'descend') { const k = +arg; close(); return G.descend(k); }
    if (a === 'camp') { close(); return G.returnToCamp(); }
    if (a === 'onward') { close(); return G.pressOn(); }
    if (a === 'wake') { close(); return G.wakeInCamp(); }
  }
  // Gear or camp changed: save, refresh the hero's numbers and looks (and the camp's buildings)
  function changed(camp) { Items.save(); G.onGearChanged(camp); }

  // ---------------- Showing ----------------
  function render() {
    const card = el('pcard');
    card.className = 'pcard ' + open.id;
    card.innerHTML = PANELS[open.id](open.opt || {});
    const bs = buttons();
    if (focus < 0) focus = Math.max(0, bs.findIndex(b => !b.disabled && b.dataset.act !== 'tab'));
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
    act(b.dataset.act, b.dataset.arg);
  }
  function back() { if (!open) return; if (open.id === 'fallen') return confirm(); if (open.id === 'cleared') return; if (open.id === 'dialogue') return act('next'); close(); }

  // ---------------- HUD bits ----------------
  let toastT = null;
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
