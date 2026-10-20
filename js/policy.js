// Deepward - the companions' battle policy: which of seven moves a companion makes next. The game and the offline trainer
// (tools/policy/) share this file, so what the network sees and chooses from is identical in both.
//   state s   a small description of the moment (health of the companion, warden and others, distances, danger, cooldowns)
//   classic   the hand-written rules (the companions' behaviour before there was a network, and the fallback)
//   choose    the learned network (weights in js/policy_weights.js, made by tools/policy/train.js): a 21 -> 20 -> 7 MLP,
//             a few hundred numbers, run a few times a second. Illegal moves are masked out, so it can only reorder legal ones.
// Following the warden comes before all of this (Party.think handles it); the policy decides what to do in a fight.
const Policy = (() => {
  const ACTIONS = ['attack', 'heavy', 'kite', 'regroup', 'heal', 'area', 'guard'];
  const CLS = ['warrior', 'archer', 'mage', 'cleric'];
  const A = Object.fromEntries(ACTIONS.map((n, i) => [n, i]));
  const N_IN = 21;
  const cl = (v, m) => Math.max(0, Math.min(1, v / m));
  // The state is plain numbers: hp, hero, other, lowest are shares of health (0..1); distances in metres; danger is the seconds
  // until the next blow aimed at this companion lands (3 when none); *Rdy are 0 or 1.
  function encode(s) {
    const v = new Array(N_IN).fill(0);
    v[CLS.indexOf(s.cls)] = 1;
    let i = 4;
    v[i++] = s.hp; v[i++] = s.hero; v[i++] = s.other; v[i++] = cl(s.downed, 2); v[i++] = cl(s.dHero, 20); v[i++] = cl(s.dEnemy, 20);
    v[i++] = cl(s.nNear, 5); v[i++] = cl(s.nHero, 5); v[i++] = cl(s.targeted, 3); v[i++] = cl(s.danger, 3);
    v[i++] = s.atkRdy; v[i++] = s.heavyRdy; v[i++] = s.healRdy; v[i++] = s.lowest; v[i++] = cl(s.hurtN, 3); v[i++] = s.hasTarget ? 1 : 0;
    return v;
  }
  // Which moves are possible right now
  function legal(s) {
    const m = new Array(ACTIONS.length).fill(false);
    m[A.attack] = !!s.hasTarget;
    m[A.heavy] = !!s.hasTarget && !!s.heavyRdy;
    m[A.kite] = s.dEnemy < 40;
    m[A.regroup] = true;
    m[A.heal] = s.cls === 'cleric' && !!s.atkRdy;
    m[A.area] = s.cls === 'cleric' && !!s.healRdy;
    m[A.guard] = s.cls === 'warrior';
    return m;
  }
  // The hand-written rules: the behaviour the companions had before the network
  function classic(s) {
    if (s.cls === 'cleric') {
      if (s.healRdy && (s.lowest < 0.4 || s.hurtN >= 2)) return A.area;
      if (s.atkRdy && s.lowest < 0.75) return A.heal;
      if (s.hasTarget && s.atkRdy && s.dEnemy < 11) return A.attack;
      return A.regroup;
    }
    if (!s.hasTarget) return A.regroup;
    if (s.cls === 'warrior') return A.attack;
    if (s.dEnemy < 4.2) return s.atkRdy && s.dEnemy > 1.6 ? A.attack : A.kite;
    if (s.atkRdy && s.heavyRdy && (s.cls === 'mage' || s.dEnemy < 7)) return A.heavy;
    return A.attack;
  }

  // ---------------- The network ----------------
  const W = () => (typeof DW_POLICY !== 'undefined' && DW_POLICY && DW_POLICY.W1) ? DW_POLICY : null;
  function forward(w, x) {
    const h = new Array(w.hid);
    for (let j = 0; j < w.hid; j++) { let a = w.b1[j]; for (let i = 0; i < w.in; i++) a += w.W1[j * w.in + i] * x[i]; h[j] = Math.tanh(a); }
    const o = new Array(w.out);
    for (let k = 0; k < w.out; k++) { let a = w.b2[k]; for (let j = 0; j < w.hid; j++) a += w.W2[k * w.hid + j] * h[j]; o[k] = a; }
    return o;
  }
  // The best legal move by the network (weights given, or the shipped ones); null if there are none
  function choose(s, w = W()) {
    if (!w) return null;
    const o = forward(w, encode(s)), m = legal(s);
    let best = -1;
    for (let k = 0; k < o.length; k++) if (m[k] && (best < 0 || o[k] > o[best])) best = k;
    return best < 0 ? null : best;
  }
  const api = { ACTIONS, A, CLS, N_IN, encode, legal, classic, forward, choose, get ready() { return !!W(); }, get info() { const w = W(); return w ? w.meta || {} : null; } };
  return api;
})();
if (typeof module !== 'undefined') module.exports = Policy;
