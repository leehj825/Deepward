// Deepward - other languages. The game is written in English; this layer watches the page and swaps every text it
// shows for the chosen language's, so the game code stays as it is. A language is one table (js/lang_ko.js for Korean):
// English text -> translation. Numbers are matched as {0}, {1}... ("Lost {0} gold"), and texts not in the table are
// tried in parts (split at " · " and ": "), and as item names ("Runed Gauntlets of Fortune": tier, piece, "of ...").
// Settings > Language switches it; English needs no table.
const I18N = (() => {
  const TABLES = { ko: typeof LANG_KO !== 'undefined' ? LANG_KO : null };
  const NAMES = [['en', 'English'], ['ko', '한국어']];
  let T = null, lang = 'en', tmpl = null, pats = [], done = new WeakMap(), cache = new Map();
  const NUM = /[-+−]?\d+(?:[.,]\d+)?/g;
  function use(l) {
    lang = TABLES[l] ? l : 'en'; T = TABLES[lang]; cache.clear(); done = new WeakMap();
    tmpl = new Map(); pats = [];
    if (T) for (const k in T) {
      if (k.includes('{a}')) {                                                  // a phrase around names: "Slay {0} {a}s"
        const names = [], re = new RegExp('^' + k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\d|[a-c])\}/g, (_, n) => { names.push(n); return /\d/.test(n) ? '([-+]?\\d+(?:[.,]\\d+)?)' : '(.+?)'; }) + '$');
        pats.push({ re, names, to: T[k] });
      } else if (k.includes('{0}')) tmpl.set(k, T[k]);
    }
    pats.sort((a, b) => b.re.source.length - a.re.source.length);           // the more specific phrase first ("{a}s" before "{a}")
    document.documentElement.lang = lang;
  }
  // One text, translated (or itself when there is nothing to do)
  function tr(s) {
    if (!T || !s || !/[A-Za-z]/.test(s)) return s;
    if (cache.has(s)) return cache.get(s);
    const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0], core = s.trim();
    let r = find(core);
    r = r === null ? s : lead + r + tail;
    if (cache.size > 5000) cache.clear();
    cache.set(s, r); return r;
  }
  function find(c) {
    if (T[c] !== undefined) return T[c];
    // Numbers become {0}, {1}...
    const nums = c.match(NUM);
    if (nums) { const k = c.replace(NUM, (() => { let i = 0; return () => '{' + i++ + '}'; })()); if (tmpl.has(k)) return tmpl.get(k).replace(/\{(\d)\}/g, (_, i) => nums[+i]); }
    // An item's name: tier and piece, a suffix "of ..." in front, a "+N" kept
    const it = itemName(c); if (it) return it;
    // A phrase around names: the names translated in their turn
    for (const P of pats) {
      const m = c.match(P.re); if (!m) continue;
      const v = {}; P.names.forEach((n, i) => { v[n] = /\d/.test(n) ? m[i + 1] : (find(m[i + 1]) ?? m[i + 1]); });
      return P.to.replace(/\{(\d|[a-c])\}/g, (_, n) => v[n] ?? '');
    }
    // An icon or mark in front, punctuation at the end ("🏆 Bones at Rest", "🔴 Ruby.")
    const pre = c.match(/^([^A-Za-z0-9{"'(]+)(.+)$/u); if (pre) { const r = find(pre[2]); if (r !== null) return pre[1] + r; }
    const post = c.match(/^(.+?)([.:!,]+)$/); if (post) { const r = find(post[1]); if (r !== null) return r + post[2]; }
    // In parts
    for (const sep of [' · ', ': ', ' — ', ' - ']) {
      if (!c.includes(sep)) continue;
      const parts = c.split(sep), out = parts.map(p => { const t = p.trim() ? find(p.trim()) : p; return t === null ? null : t; });
      if (out.every(x => x !== null) || out.filter(x => x !== null).length >= Math.ceil(parts.length / 2)) return out.map((x, i) => x === null ? parts[i] : x).join(sep);
    }
    return null;
  }
  let itemRe = null;
  function itemName(c) {
    if (!itemRe) { const tiers = CFG.gear.tierNames.map(t => t.replace(/[.*+?^${}()|[\]\\']/g, m => '\\' + m)).join('|'); itemRe = new RegExp(`^(${tiers}) (.+?)(?: (of [A-Za-z' -]+?))?( \\+\\d+)?$`); }
    const m = c.match(itemRe); if (!m) return null;
    const tier = T[m[1]], piece = T[m[2]], of = m[3] ? T[m[3]] : '';
    if (tier === undefined || piece === undefined || of === undefined) return null;
    return (of ? of + ' ' : '') + tier + ' ' + piece + (m[4] || '');
  }
  // Every text node and a few attributes, now and whenever the page changes
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  function node(n) {
    if (n.nodeType === 3) {
      const v = n.data; if (done.get(n) === v) return;
      const t = tr(v); done.set(n, t); if (t !== v) n.data = t;
    } else if (n.nodeType === 1) {
      if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.tagName === 'CANVAS' || n.tagName === 'TEXTAREA' || n.getAttribute('translate') === 'no') return;
      for (const a of ATTRS) { const v = n.getAttribute && n.getAttribute(a); if (v) { const t = tr(v); if (t !== v) n.setAttribute(a, t); } }
      for (let c = n.firstChild; c; c = c.nextSibling) node(c);
    }
  }
  function start() {
    use(Settings.get('lang') || 'en');
    new MutationObserver(list => {
      if (!T) return;
      for (const m of list) {
        if (m.type === 'characterData') node(m.target);
        else if (m.type === 'attributes') node(m.target);
        else for (const a of m.addedNodes) node(a);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    if (T) node(document.body);
  }
  // Switch language: retranslate what is up now (English comes back with a reload of the page's own texts)
  function set(l) { Settings.set('lang', l); if (l === 'en' || !TABLES[l]) location.reload(); else { use(l); node(document.body); } }
  // Translate whatever is on the page now (tests read the page straight after changing it)
  const flush = () => { if (T) node(document.body); };
  return { start, set, tr, flush, get lang() { return lang; }, NAMES, has: l => l === 'en' || !!TABLES[l] };
})();
