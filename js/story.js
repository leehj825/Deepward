// Deepward - the main story (docs/STORY.md): objectives (CFG.mainStory.steps) that move on with what the warden does, and beats (scenes
// that come once their conditions hold). game.js reports events: 'talk' with a camp person, a 'guardian' falling, a 'find' (a relic
// examined in the dungeon). A step that was waiting for the event completes and plays its scene; otherwise the first beat whose
// conditions hold plays. Flags (Items.S.flags) record what happened: done_<step>, seen_<beat>, found_<relic>, and the story's own
// (toldKing, bannerFound...). Progress is Items.S.main (saved with the game).
const Story = (() => {
  const M = () => CFG.mainStory;
  const state = () => { const S = Items.S; S.main = S.main || { i: 0 }; return S.main; };
  const flags = () => { const S = Items.S; S.flags = S.flags || {}; return S.flags; };
  const has = f => (f.charAt(0) === '!' ? !flags()[f.slice(1)] : !!flags()[f]);
  const set = f => { if (f) flags()[f] = true; };
  const cur = () => (Items.S ? M().steps[state().i] || null : null);
  const objective = () => { const c = cur(); return c ? c.obj : ''; };
  const toast = t => { if (typeof UI !== 'undefined') UI.toast(t, '#f2d27a'); };

  // Play a scene; `after` runs when it ends (at once if one cannot play now). Returns true when a scene took over
  function play(id, after) {
    const sc = M().scenes[id];
    if (sc && Scene.play(sc, after)) return true;
    if (after) after(); return false;
  }
  function reward(r) {
    if (!r) return;
    if (r.gold) { const g = Items.addGold(r.gold); toast('+' + g + ' ◆'); }
    Items.save();
  }
  // Report something the warden did. Returns true when a scene took over (done runs when it ends)
  function event(kind, arg, done) {
    if (!Items.S) return false;
    if (kind === 'find') set('found_' + arg);
    const c = cur();
    if (c && c.on && c.on[0] === kind && c.on[1] === arg) {
      state().i++; set('done_' + c.id); Items.save();
      const next = () => { const n = cur(); if (n) toast('New objective: ' + n.obj); if (done) done(); };
      if (c.scene) { play(c.scene, next); return Scene.active; }
      next(); return !!done;
    }
    const b = M().beats.find(b => b.on[0] === kind && b.on[1] === arg && !flags()['seen_' + b.id] && (b.needs || []).every(has) && (b.not || []).every(f => !flags()[f]));
    if (!b) return false;
    set('seen_' + b.id); (b.set || []).forEach(set); Items.save();
    const after = () => { reward(b.reward); if (done) done(); };
    play(b.scene, after); return Scene.active;
  }
  // A person with nothing new to say speaks their usual lines as a scene too
  const talk = (who, name, lines, done) => Scene.play({ who, name, steps: lines.map(t => (typeof t === 'string' ? { text: t } : { name: t[0], text: t[1] })) }, done);
  // A line that fades in and out at the foot of the screen (a guardian's last word)
  function whisper(who, text) {
    const el = document.getElementById('whisper'); if (!el) return;
    el.innerHTML = ''; const a = document.createElement('small'), b = document.createElement('div');
    a.textContent = (typeof I18N !== 'undefined' ? I18N.tr(who) : who); b.textContent = '"' + (typeof I18N !== 'undefined' ? I18N.tr(text) : text) + '"';
    el.append(a, b); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(whisper.t); whisper.t = setTimeout(() => el.classList.remove('show'), 5200);
  }
  // A guardian of the first rings has fallen: its last word
  function guardianFell(si, loop) {
    if (!Items.S || loop > 0) return;
    const l = M().guardianLines[si]; if (l) whisper(l[0], l[1]);
  }
  // Relics to place in a stage (those not found yet), for js/world.js
  const relicsFor = si => (Items.S ? (M().relics[si] || []).filter(r => !flags()['found_' + r.id]) : []);
  return { event, objective, talk, whisper, guardianFell, relicsFor, has, set, get step() { return cur(); } };
})();
