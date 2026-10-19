// Deepward - the training yard: Sergeant Hobb spars with the hero in camp through six lessons (strike, heavy, block,
// parry, dash, break and execute). A box at the top says what to do in the hero's own controls and counts progress;
// each lesson can be skipped, and the whole thing left at any time. The first time it is finished, it pays.
const Tutorial = (() => {
  const AREA = { x: 4, z: -4 };
  const SLOW = { pose: 'overhead', wind: 1.05, active: 0.12, recover: 1.0, dmg: 6, posture: 4, range: 2.5, arc: 100, lunge: 0.5 };
  const SLAM = { pose: 'heavy', wind: 1.2, active: 0.14, recover: 1.1, dmg: 8, posture: 0, range: 2.6, arc: 360, aoe: { fwd: 1.0, r: 2.3 }, unblockable: true, lunge: 0 };
  // text: [keyboard, controller, touch]
  const LESSONS = [
    { id: 'light', need: 5, title: 'Strike', text: ['Hit Hobb with light attacks: J or left-click.', 'Hit Hobb with light attacks: RB or X.', 'Hit Hobb with ATTACK.'], attack: null },
    { id: 'heavy', need: 2, title: 'Heavy blow', text: ['Land heavy attacks: K. They break guards and posture.', 'Land heavy attacks: RT. They break guards and posture.', 'Land HEAVY attacks. They break guards and posture.'], attack: null },
    { id: 'block', need: 3, title: 'Block', text: ['A WHITE glint means you can block. Hold L or right-click as he swings.', 'A WHITE glint means you can block. Hold LB as he swings.', 'A WHITE glint means you can block. Hold BLOCK as he swings.'], attack: SLOW },
    { id: 'parry', need: 3, title: 'Parry', text: ['Raise the block right at the moment of impact - not early - to PARRY. Tap L just as the blade lands.', 'Raise the block right at impact to PARRY. Tap LB just as the blade lands.', 'Tap BLOCK right as the blade lands to PARRY.'], attack: SLOW },
    { id: 'dash', need: 2, title: 'Dash', text: ['RED glow and a red ring: unblockable. Dash out with Space (plus a direction) just before it lands.', 'RED glow: unblockable. Dash with A (plus a direction) just before it lands.', 'RED glow: unblockable. Tap DASH just before it lands.'], attack: SLAM },
    { id: 'exec', need: 1, title: 'Break and execute', text: ['Fill his posture bar (parries and heavies), then hit K close by to EXECUTE him.', 'Fill his posture bar (parries and heavies), then RT close by to EXECUTE him.', 'Fill his posture bar (parries and heavies), then HEAVY close by to EXECUTE him.'], attack: SLOW },
  ];
  let on = false, i = 0, n = 0, foe = null, base = null, lastHp = 0, pending = false;
  const box = document.getElementById('lesson');
  const style = () => document.body.classList.contains('pad') ? 1 : document.body.classList.contains('touch') ? 2 : 0;

  function spawnFoe(L) {
    if (foe) Enemy.dispose(foe, G.scene), G.enemies.splice(G.enemies.indexOf(foe), 1);
    foe = Enemy.spawn(G.scene, 'sparring', new THREE.Vector3(AREA.x, 0, AREA.z), 1);
    foe.def = JSON.parse(JSON.stringify(foe.def));
    foe.def.attacks = L.attack ? [{ weight: 1, hits: [Object.assign({}, L.attack)] }] : foe.def.attacks;
    foe.cooldown = L.attack ? 1.2 : 1e9; if (!L.attack) foe.def.cooldown = [1e9, 1e9];
    if (L.id === 'exec') foe.def.posture = 30;
    G.enemies.push(foe); lastHp = foe.hp;
  }
  function begin(k = 0) {
    on = true; i = k; n = 0; pending = false; G.training = true;
    const p = G.player; p.pos.set(AREA.x, 0, AREA.z + 3.2); p.facing = Math.PI; View.yaw = 0;
    p.hp = p.maxHp; p.st = p.maxSt;
    base = { parries: G.stats.parries, dodges: G.stats.dodges, blocks: G.stats.blocks || 0, exec: G.stats.executions || 0 };
    spawnFoe(LESSONS[i]); show(); Snd.play('wave');
  }
  function next() {
    i++; n = 0;
    if (i >= LESSONS.length) return finish();
    base = { parries: G.stats.parries, dodges: G.stats.dodges, blocks: G.stats.blocks || 0, exec: G.stats.executions || 0 };
    G.player.hp = G.player.maxHp; G.player.st = G.player.maxSt;
    spawnFoe(LESSONS[i]); show(); Snd.play('wave'); FX.text(Combat.chestPos(G.player.pos, 2.6), 'LESSON ' + (i + 1), 'xp');
  }
  function finish() {
    const S = Items.S, first = !S.trained;
    stop();
    S.trained = true; if (first) Items.addGold(150); Items.save();
    UI.toast(first ? 'Training complete: Hobb tosses you 150 gold' : 'Training complete', '#ffd040');
    G.onTrained && G.onTrained();
  }
  function stop() {
    on = false; G.training = false; box.classList.remove('show');
    if (foe) { Enemy.dispose(foe, G.scene); const k = G.enemies.indexOf(foe); if (k >= 0) G.enemies.splice(k, 1); foe = null; }
  }
  function show() {
    const L = LESSONS[i];
    box.innerHTML = `<div class="lt">Lesson ${i + 1} / ${LESSONS.length} · ${L.title} <b>${Math.min(n, L.need)} / ${L.need}</b></div><div class="lx">${L.text[style()]}</div>
      <div class="lb"><button data-t="skip">Skip lesson</button><button data-t="leave">Leave training</button></div>`;
    box.classList.add('show');
  }
  box.addEventListener('click', ev => { const b = ev.target.closest('[data-t]'); if (!b || !on) return; if (b.dataset.t === 'skip') next(); else stop(); });

  // Count what the lesson asks for
  function update() {
    if (!on) return;
    const p = G.player, L = LESSONS[i]; let got = n;
    if (p.hp < p.maxHp * 0.4) p.hp = p.maxHp;                                 // Hobb pulls his blows
    if (foe && foe.state !== 'dead' && foe.hp < lastHp) {
      if (L.id === 'light' && p.atkKind === 'light') got++;
      if (L.id === 'heavy' && p.atkKind === 'heavy') got++;
      lastHp = foe.hp;
    }
    if (L.id === 'block') got = (G.stats.blocks || 0) - base.blocks + (G.stats.parries - base.parries);
    if (L.id === 'parry') got = G.stats.parries - base.parries;
    if (L.id === 'dash') got = G.stats.dodges - base.dodges;
    if (L.id === 'exec') got = (G.stats.executions || 0) - base.exec;
    if (got !== n && !pending) { n = got; show(); if (n < L.need) Snd.play('glint'); }
    if (n >= L.need && !pending) { pending = true; G.after(0.8, () => { pending = false; if (on && LESSONS[i] === L) next(); }); }
    if (foe && foe.state === 'dead' && L.id !== 'exec') spawnFoe(L);
  }
  return { begin, stop, update, get active() { return on; }, get index() { return i; }, LESSONS };
})();
