// Deepward - the main story: a chain of objectives (CFG.mainStory.steps) that move on with what the warden does. game.js reports
// events ('talk' with a camp person, a 'guardian' falling); the step that was waiting for it completes, its scene plays (js/scene.js),
// and the next objective shows in the HUD. Progress is Items.S.main (saved with the game).
const Story = (() => {
  const M = () => CFG.mainStory;
  const state = () => { const S = Items.S; S.main = S.main || { i: 0 }; return S.main; };
  const cur = () => (Items.S ? M().steps[state().i] || null : null);
  const objective = () => { const c = cur(); return c ? c.obj : ''; };
  // Report something the warden did. Returns true when a scene took over (done runs when it ends)
  function event(kind, arg, done) {
    if (!Items.S) return false;
    const c = cur(); if (!c || !c.on || c.on[0] !== kind || c.on[1] !== arg) return false;
    state().i++; Items.save();
    const after = () => { const n = cur(); if (n && typeof UI !== 'undefined') UI.toast('New objective: ' + n.obj, '#f2d27a'); if (done) done(); };
    if (c.scene && M().scenes[c.scene] && Scene.play(M().scenes[c.scene], after)) return true;
    after(); return !!done ? true : false;
  }
  // A person with nothing new to say speaks their usual lines as a scene too
  const talk = (who, name, lines, done) => Scene.play({ who, name, steps: lines.map(t => (typeof t === 'string' ? { text: t } : { name: t[0], text: t[1] })) }, done);
  return { event, objective, talk, get step() { return cur(); } };
})();
