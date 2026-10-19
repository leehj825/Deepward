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
          h += `<div class="irow"><div class="iinfo"><b>${CFG.gear.slotNames[slot]}</b> <small>random ${slot === 'weapon' ? 'sword, axe, mace, longsword or greatsword' : 'piece'}</small></div><div class="ibtns">${btn('◆ ' + cost, 'forge', slot, S.gold < cost)}</div></div>`;
          if (slot === 'weapon') h += `<div class="irow"><div class="iinfo"><b>Greatsword</b> <small>two-handed: big hits and reach, no shield</small></div><div class="ibtns">${btn('◆ ' + Math.round(cost * 1.3), 'forge', 'greatsword', S.gold < cost * 1.3)}</div></div>`;
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
      return h + btn('Close', 'close', '', false, 'leave');
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
      const tier = Math.min(S.stage, CFG.gear.tierNames.length - 1), two = arg === 'greatsword', cost = Math.round(CFG.camp.forgeCost[tier] * (two ? 1.3 : 1));
      if (S.gold < cost || S.inv.length >= CFG.gear.invSize) { if (S.inv.length >= CFG.gear.invSize) toast('Your bag is full'); return render(); }
      S.gold -= cost; const it = Items.generate(tier, two ? { slot: 'weapon', type: 'greatsword', boost: S.camp.forge * 0.6 } : { slot: arg, boost: S.camp.forge * 0.6 }); Items.add(it);
      Snd.play('parry'); toast('Forged: ' + Items.fullName(it), R[it.rarity].color); changed(); return render();
    }
    if (a === 'salvage') { const it = Items.remove(+arg); if (it) { S.scrap += CFG.camp.salvage[it.rarity]; Snd.play('guardBreak'); changed(); } return render(); }
    if (a === 'buy') { const it = S.stock[+arg], price = it && Items.value(it) * 3; if (it && S.gold >= price && Items.add(it)) { S.gold -= price; S.stock.splice(+arg, 1); Snd.play('wave'); toast('Bought: ' + Items.fullName(it), R[it.rarity].color); changed(); } return render(); }
    if (a === 'sell') { const it = Items.remove(+arg); if (it) { S.gold += Items.value(it); Snd.play('glint'); changed(); } return render(); }
    if (a === 'build') { const b = CFG.camp.buildings[arg], lv = S.camp[arg], cost = b.costs[lv]; if (lv < b.max && S.gold >= cost) { S.gold -= cost; S.camp[arg]++; Snd.play('wave'); toast(`${b.name} built up to level ${S.camp[arg]}`); changed(true); } return render(); }
    if (a === 'equip') { Items.equip(+arg); changed(); return render(); }
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
  function confirm() { const b = buttons()[focus]; if (open && b && !b.disabled) act(b.dataset.act, b.dataset.arg); }
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
    el('bossFill').style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
    el('bossPost').style.width = Math.min(100, e.posture / (e.def.posture * e.mult) * 100) + '%';
  }

  return { show, close, nav, confirm, back, toast, prompt, boss, get open() { return open; }, render };
})();
