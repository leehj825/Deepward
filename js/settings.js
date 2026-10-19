// Deepward - player settings (volume, camera, screen shake), kept in the browser apart from the saved game.
const Settings = (() => {
  const D = { master: 0.8, music: 0.6, sfx: 0.9, sens: 1, invertY: false, shake: true, quality: 'auto', difficulty: 'normal', cues: false, hitstop: true, slowmo: true, haptics: true };
  const s = { ...D }, subs = [];
  try { Object.assign(s, JSON.parse(localStorage.getItem('dw_settings') || '{}')); } catch (e) {}
  return {
    D,
    get: k => s[k],
    set(k, v) {
      s[k] = v;
      try { localStorage.setItem('dw_settings', JSON.stringify(s)); } catch (e) {}
      subs.forEach(f => f(k, v));
    },
    reset() { for (const k in D) this.set(k, D[k]); },
    on(f) { subs.push(f); },
    // The current difficulty's numbers
    get diff() { return CFG.difficulty[s.difficulty] || CFG.difficulty.normal; },
  };
})();
