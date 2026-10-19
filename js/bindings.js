// Deepward - the player's key and controller bindings. Every gameplay action has up to two keys and one or more
// controller buttons; the player can change them in Settings → Controls. Menu navigation (arrows, Enter, Esc / d-pad,
// A, B) and pausing with Esc or Menu stay fixed so a bad binding can never lock anyone out.
const Bindings = (() => {
  const ACTIONS = [
    ['up', 'Move forward'], ['down', 'Move back'], ['left', 'Move left'], ['right', 'Move right'],
    ['light', 'Attack'], ['heavy', 'Heavy attack'], ['block', 'Block / parry'], ['dodge', 'Dash'],
    ['flask', 'Healing flask'], ['ult', 'Ultimate'], ['interact', 'Talk / use'], ['lock', 'Lock on'],
    ['gear', 'Gear'], ['talents', 'Expertise'], ['codex', 'Codex'], ['camera', 'Switch camera'], ['map', 'Full map'], ['mute', 'Mute'],
  ];
  const KEYS = {
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    light: ['KeyJ'], heavy: ['KeyK', 'KeyQ'], block: ['KeyL', 'ShiftLeft'], dodge: ['Space'], flask: ['KeyR'], ult: ['KeyF'], interact: ['KeyE'],
    lock: ['KeyC'], gear: ['KeyI', 'Tab'], talents: ['KeyT'], codex: ['KeyO'], camera: ['KeyB'], map: ['KeyN'], mute: ['KeyM'],
  };
  // Standard-mapping button numbers. A both talks (when something is near) and dashes; movement is on the stick.
  const PAD = { light: [5, 2], heavy: [7], block: [4, 6], dodge: [0, 1], interact: [0], ult: [3], flask: [12], gear: [13], camera: [8], lock: [11] };
  const PADNAME = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'];
  const FIXED_KEYS = ['Escape', 'Enter'], FIXED_PAD = [9];                 // pause / confirm stay where they are
  const MOUSE = { light: 'left-click', block: 'right-click', heavy: 'middle-click' };

  const keys = () => Object.assign({}, KEYS, Settings.get('keys') || {});
  const pad = () => Object.assign({}, PAD, Settings.get('padKeys') || {});
  let index = null;                                                         // key code -> actions, rebuilt on change
  function build() { index = {}; for (const [a, codes] of Object.entries(keys())) for (const c of codes) (index[c] = index[c] || []).push(a); }
  Settings.on(k => { if (k === 'keys') index = null; });

  // Which actions a key code does
  function actionsOf(code) { if (!index) build(); return index[code] || []; }
  const is = (code, act) => actionsOf(code).includes(act);
  // Is any key of this action held (keys: the held-keys map)
  const held = (heldKeys, act) => keys()[act].some(c => heldKeys[c]);
  const padHas = (act, i) => (pad()[act] || []).includes(i);
  const padButtons = act => pad()[act] || [];

  // A readable name for a key code
  function keyName(c) {
    if (!c) return '—';
    if (c.startsWith('Key')) return c.slice(3);
    if (c.startsWith('Digit')) return c.slice(5);
    if (c.startsWith('Arrow')) return { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[c];
    if (c.startsWith('Numpad')) return 'Num ' + c.slice(6);
    return { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Right Shift', ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Alt', AltRight: 'Right Alt', Tab: 'Tab', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', CapsLock: 'Caps' }[c] || c;
  }
  // How an action is labelled for a device ('key' or 'pad'); with mouse, keyboard labels mention the mouse too
  function label(act, dev = 'key', mouse = false) {
    if (dev === 'pad') { const b = padButtons(act); return b.length ? b.map(i => PADNAME[i] || 'B' + i).join(' / ') : '—'; }
    const k = keys()[act] || [];
    return [keyName(k[0]), mouse && MOUSE[act]].filter(Boolean).join(' / ') || '—';
  }
  // Fill @action tokens in a hint with the player's own bindings (the device in use: controller or keyboard)
  const device = () => document.body.classList.contains('pad') ? 'pad' : 'key';
  const fmt = (txt, dev = device()) => String(txt).replace(/@(\w+)/g, (m, a) => KEYS[a] || PAD[a] ? label(a, dev, true) : m);

  // ---------------- Rebinding ----------------
  // listen: { act, dev } while waiting for the next key or button; the Controls panel shows it
  let listen = null, onDone = null;
  function startListen(act, dev, done) { listen = { act, dev }; onDone = done || null; }
  function stopListen() { listen = null; const f = onDone; onDone = null; if (f) f(); }
  // A key arrived while listening. Esc cancels. The key becomes this action's first key (taken from any other action).
  function captureKey(code) {
    if (!listen || listen.dev !== 'key') return false;
    if (code === 'Escape') { stopListen(); return true; }
    if (FIXED_KEYS.includes(code)) return true;
    const K = JSON.parse(JSON.stringify(keys())), act = listen.act;
    for (const a in K) if (a !== act) K[a] = K[a].filter(c => c !== code);
    K[act] = [code, ...K[act].slice(1).filter(c => c !== code)];             // the new key replaces the first; a second key stays
    Settings.set('keys', K); stopListen(); return true;
  }
  // A controller button arrived while listening. Menu cancels. The button becomes this action's only button; another
  // action that used it gives it up (A keeps both talk and dash together).
  function captureButton(i) {
    if (!listen || listen.dev !== 'pad') return false;
    if (FIXED_PAD.includes(i)) { stopListen(); return true; }
    const P = JSON.parse(JSON.stringify(pad())), act = listen.act;
    for (const a in P) if (a !== act && !(i === 0 && ((a === 'interact' && act === 'dodge') || (a === 'dodge' && act === 'interact')))) P[a] = P[a].filter(b => b !== i);
    P[act] = [i];
    Settings.set('padKeys', P); stopListen(); return true;
  }
  function reset() { Settings.set('keys', {}); Settings.set('padKeys', {}); }

  return { ACTIONS, actionsOf, is, held, padHas, padButtons, label, keyName, fmt, startListen, stopListen, captureKey, captureButton, reset,
    get listening() { return listen; }, PADNAME };
})();
