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
  // The network's scores for this state: the forward pass plus the class's own bias table (w.cb, filled by tools/policy/bake.js
  // from what companions learned in play; absent in a freshly trained file)
  function logits(w, s) {
    const o = forward(w, encode(s));
    if (w.cb && w.cb[s.cls]) for (let k = 0; k < o.length; k++) o[k] += w.cb[s.cls][k];
    return o;
  }
  // The best legal move by the network (weights given, or the shipped ones); null if there are none
  function choose(s, w = W()) {
    if (!w) return null;
    const o = logits(w, s), m = legal(s);
    let best = -1;
    for (let k = 0; k < o.length; k++) if (m[k] && (best < 0 || o[k] > o[best])) best = k;
    return best < 0 ? null : best;
  }
  // ---------------- Learning while playing ----------------
  // The network itself stays as trained. On top sits a small table of preferences per class (a bias for each move, in units of the
  // network's own typical gap between its first and second choice), nudged after every fight by REINFORCE: the moves chosen in a
  // fight that went better than usual become a little likelier, those in a fight that went worse a little less likely. While
  // learning, moves are sampled (mostly the network's first choice, now and then another legal one); otherwise the best move is
  // taken. The table is small (4 x 7 numbers), clipped, saved with the game, and can be forgotten.
  const Learner = (() => {
    const params = { LR: 0.25, CLIP: 2, EXPLORE: 0.25 };
    const make = saved => {
      const L = { bias: {}, base: 25, sd: 12, n: 0, ep: [], log: [] };
      for (const c of CLS) L.bias[c] = (saved && saved.bias && saved.bias[c]) ? saved.bias[c].slice() : new Array(ACTIONS.length).fill(0);
      if (saved) { L.base = Math.max(-60, Math.min(90, saved.base === undefined ? 25 : saved.base)); L.sd = Math.min(30, saved.sd || 12); L.n = saved.n || 0; L.log = Array.isArray(saved.log) ? saved.log.slice(-30) : []; }
      return L;
    };
    const dump = L => ({ bias: L.bias, base: L.base, sd: L.sd, n: L.n, log: L.log });
    const gapOf = w => (w && w.meta && w.meta.gap) || 4;
    // One decision: the chosen move (null if none is legal). With learn, moves are sampled and remembered for the fight's update.
    function pick(L, s, w = W(), learn = false, rand = Math.random) {
      if (!w) return null;
      const o = logits(w, s), m = legal(s), tau = gapOf(w) * params.EXPLORE, b = L ? L.bias[s.cls] : null;
      const z = o.map((x, k) => (m[k] ? x / tau + (b ? b[k] : 0) : -1e9));
      let mx = -1e9; for (const v of z) if (v > mx) mx = v;
      let sum = 0; const p = z.map(v => { const e = Math.exp(v - mx); sum += e; return e; }).map(e => e / sum);
      let act = 0; for (let k = 1; k < p.length; k++) if (p[k] > p[act]) act = k;
      if (!m[act]) return null;
      if (learn && L) {
        let x = rand(); for (let k = 0; k < p.length; k++) { x -= p[k]; if (x <= 0) { act = k; break; } }
        L.ep.push({ cls: s.cls, p, act });
      }
      return act;
    }
    // The fight is over with this reward: learn from it
    function end(L, reward) {
      const adv = Math.max(-2, Math.min(2, (reward - L.base) / Math.min(30, Math.max(8, L.sd))));
      {
        const per = {};
        for (const d of L.ep) (per[d.cls] = per[d.cls] || []).push(d);
        for (const c in per) {
          const g = new Array(ACTIONS.length).fill(0);
          for (const d of per[c]) for (let k = 0; k < g.length; k++) g[k] += ((k === d.act ? 1 : 0) - d.p[k]) / per[c].length;
          for (let k = 0; k < g.length; k++) L.bias[c][k] = Math.max(-params.CLIP, Math.min(params.CLIP, L.bias[c][k] + params.LR * adv * g[k]));
        }
      }
      L.sd = 0.85 * L.sd + 0.15 * Math.abs(reward - L.base);
      L.base = 0.85 * L.base + 0.15 * reward;
      L.n++; L.ep = [];
    }
    // The fight's score: the same as the trainer's simulator uses
    // (a long fight can take several times a health bar in damage, so each part is capped; the whole is kept in -100..100)
    function score(f) {
      const s = 40 * f.frac + (f.cleared ? 30 + 0.3 * Math.max(0, 70 - f.time) : 0) - 25 * Math.min(3, f.downs) - (f.heroDied ? 60 : 0) - 20 * Math.min(1.5, f.heroLost) - 8 * Math.min(1.5, f.compLost);
      return Math.max(-100, Math.min(100, s));
    }
    return { make, dump, pick, end, score, params };
  })();
  const api = { Learner, logits, ACTIONS, A, CLS, N_IN, encode, legal, classic, forward, choose, get ready() { return !!W(); }, get info() { const w = W(); return w ? w.meta || {} : null; } };
  return api;
})();
if (typeof module !== 'undefined') module.exports = Policy;
