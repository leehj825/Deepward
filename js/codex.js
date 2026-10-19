// Deepward - the codex and achievements. Lifetime records add up across every trip (synced from the per-trip stats,
// plus kills by kind, elites, champions, guardians). The bestiary opens an entry at the first kill of a kind and lists
// how each of its attacks is telegraphed and answered. Achievements pay gold the moment they are earned.
const Codex = (() => {
  const LIFE = ['kills', 'parries', 'dodges', 'executions', 'blocks', 'crits', 'hitsTaken'];
  let last = null, t = 0;
  function L() { const S = Items.S; S.life = S.life || {}; S.life.kinds = S.life.kinds || {}; S.life.champs = S.life.champs || {}; S.life.guardians = S.life.guardians || {}; S.ach = S.ach || {}; return S.life; }
  const n = k => L()[k] || 0;
  const add = (k, v = 1) => { const l = L(); l[k] = (l[k] || 0) + v; };

  // Per-trip stats flow into the lifetime records
  function sync() {
    if (!Items.S || !G.stats) return;
    if (!last || last.ref !== G.stats) last = { ref: G.stats, v: {} };
    for (const k of LIFE) { const now = G.stats[k] || 0, was = last.v[k] || 0; if (now > was) add(k, now - was); last.v[k] = now; }
  }
  function onKill(e) {
    if (!Items.S || e.type === 'sparring') return;
    const l = L(); l.kinds[e.type] = (l.kinds[e.type] || 0) + 1;
    if (e.elite) add('elites');
    if (e.champion) l.champs[e.guardian] = true;
    else if (e.guardian) {
      l.guardians[e.guardian] = (l.guardians[e.guardian] || 0) + 1;
      if (G.bossHits !== undefined && G.stats.hitsTaken === G.bossHits) add('flawless');
      if (Settings.get('difficulty') === 'hard') add('hardBosses');
    }
  }

  // ---------------- Achievements ----------------
  const S = () => Items.S, gems = () => CFG.gear.slots.reduce((a, s) => a + ((S().equip[s] && S().equip[s].gems) || []).filter(Boolean).length, 0);
  const A = [
    ['first', 'First Blood', 'Fell your first foe', () => n('kills') >= 1, 20],
    ['hunter', 'Hunter', 'Fell 100 foes', () => n('kills') >= 100, 80],
    ['slayer', 'Slayer of the Deep', 'Fell 1000 foes', () => n('kills') >= 1000, 400],
    ['parry10', 'Steel on Steel', 'Parry 10 blows', () => n('parries') >= 10, 40],
    ['parry100', 'Unbroken Guard', 'Parry 100 blows', () => n('parries') >= 100, 200],
    ['dash25', 'Ghost Step', 'Dash through 25 blows', () => n('dodges') >= 25, 60],
    ['exec1', 'Mercy Stroke', 'Execute a broken foe', () => n('executions') >= 1, 30],
    ['exec50', 'Headsman', 'Execute 50 broken foes', () => n('executions') >= 50, 250],
    ['elite10', 'Marked Men', 'Slay 10 elites', () => n('elites') >= 10, 120],
    ['champ1', 'Champion Slayer', 'Slay a champion', () => Object.keys(L().champs).length >= 1, 80],
    ['champ5', 'Five Banners', 'Slay all five champions', () => Object.keys(L().champs).length >= 5, 400],
    ['st1', 'Bones at Rest', 'Defeat the Bone Warden', () => S().stage >= 1, 60],
    ['st2', 'The Hollow Knight Falls', 'Defeat Sir Aldric the Hollow', () => S().stage >= 2, 90],
    ['st3', 'Den Cleared', 'Defeat the Den Mother', () => S().stage >= 3, 120],
    ['st4', 'Silk and Ash', 'Defeat the Brood Queen', () => S().stage >= 4, 150],
    ['st5', 'Court Adjourned', 'Defeat the Pale Duelist', () => S().stage >= 5, 250],
    ['st6', 'Dry Land', 'Defeat the Drowned Prophet', () => S().stage >= 6, 250],
    ['st7', 'Thaw', 'Defeat the Frost Marshal', () => S().stage >= 7, 280],
    ['st8', 'Banked Fires', 'Defeat the Furnace Lord', () => S().stage >= 8, 300],
    ['st9', 'Fallow', 'Defeat the Bone Gardener', () => S().stage >= 9, 320],
    ['st10', 'The Crown Falls', 'Defeat the Hollow King', () => S().stage >= 10, 600],
    ['mimic', 'Not a Chest', 'Slay a mimic', () => (L().kinds.mimic || 0) >= 1, 60],
    ['reflect', 'Return to Sender', 'Kill a foe with its own reflected orb', () => n('reflectKills') >= 1, 80],
    ['champ10', 'All the Banners', 'Slay all ten champions', () => Object.keys(L().champs).length >= 10, 600],
    ['flawless', 'Untouched', 'Defeat a guardian without taking a hit', () => n('flawless') >= 1, 300],
    ['hard', 'Iron Will', 'Defeat a guardian on Hard', () => n('hardBosses') >= 1, 200],
    ['unique1', 'Storied Steel', 'Find a unique', () => S().uniques.length >= 1, 60],
    ['unique9', 'The Collector', 'Find all nine uniques', () => S().uniques.length >= CFG.gear.uniques.length, 500],
    ['gems5', 'Jeweller', 'Wear five set gems at once', () => gems() >= 5, 120],
    ['rich', 'Hoard', 'Hold 2000 gold', () => S().gold >= 2000, 100],
    ['camp', 'Deepward Stands', 'Build every camp building to the top', () => Object.entries(CFG.camp.buildings).every(([k, b]) => S().camp[k] >= b.max), 300],
    ['lv10', 'Seasoned', 'Reach level 10', () => S().level >= 10, 100],
    ['lv20', 'Veteran of the Deep', 'Reach level 20', () => S().level >= 20, 300],
    ['ult', 'Ultimate', 'Learn an ultimate', () => !!S().ult, 60],
    ['master', 'Weapon Master', 'Reach mastery rank 3 with a weapon', () => Object.keys(CFG.gear.weapons).some(k => Items.masteryRank(k) >= 3), 150],
    ['shrine5', 'Devout', 'Take five shrine blessings', () => n('shrines') >= 5, 80],
    ['end5', 'Further Down', 'Reach floor 5 of the Endless Deep', () => (S().endless || {}).best >= 5, 150],
    ['end10', 'No Bottom', 'Reach floor 10 of the Endless Deep', () => (S().endless || {}).best >= 10, 400],
    ['daily', 'Daily Bread', 'Clear a floor of the Daily Descent', () => ((S().endless || {}).daily || {}).best >= 2, 80],
    ['trained', "Hobb's Pupil", 'Finish the training yard', () => !!S().trained, 30],
    ['rescue1', 'Not Left Behind', 'Free a captive from the Deep', () => (S().rescued || []).length >= 1, 60],
    ['rescue4', 'Homecoming', 'Bring Pell, Ilsa, Aldo and Mira home', () => CFG.rescues.people.every(p => Items.rescued(p.id)), 250],
    ['jobs10', 'Odd Jobs', 'Turn in ten jobs at the notice board', () => (S().jobsDone || 0) >= 10, 150],
    ['ring1', 'Into the Ring', 'Win a fight in the Ring', () => Object.keys(S().arena || {}).length >= 1, 60],
    ['raid1', 'The Gate Holds', 'Beat a raid on the south gate', () => (S().raids || 0) >= 1, 80],
    ['raid5', 'Wall of the Hold', 'Beat five raids', () => (S().raids || 0) >= 5, 250],
    ['abom', 'Abomination', 'Defeat the Abomination in the Ring', () => !!(S().arena || {}).abomination, 500],
  ].map(([id, name, desc, test, gold]) => ({ id, name, desc, test, gold }));

  function check(dt) {
    if (!Items.S) return;
    sync();
    if ((t += dt) < 0.5) return; t = 0;
    const got = S().ach || (S().ach = {});
    for (const a of A) {
      if (got[a.id]) continue;
      let ok = false; try { ok = a.test(); } catch (e) {}
      if (!ok) continue;
      got[a.id] = Date.now(); Items.addGold(a.gold); S().tripGold -= a.gold;      // rewards are never at risk
      UI.toast(`🏆 ${a.name} · +${a.gold} ◆`, '#ffd040'); Snd.play('achieve'); Items.save();
    }
  }

  // ---------------- Bestiary text ----------------
  function answer(h) {
    if (h.feint) return 'a FEINT (the wind-up stops short - wait for the real blow)';
    if (h.projectile) return 'an ARROW (block, parry to knock aside, or dash)';
    if (h.unblockable) return `RED${h.aoe ? ' with a floor ring' : ''}: unblockable - dash out or through`;
    if (h.parryOnly) return 'AMBER: only a parry (or a dash) stops it - a plain block is smashed aside';
    return 'WHITE: block or parry';
  }
  function attacks(def) {
    return def.attacks.map(a => a.hits.map(answer).join(', then ')).filter((x, i, arr) => arr.indexOf(x) === i);
  }
  return { check, sync, onKill, add, attacks, get list() { return A; }, life: L };
})();
