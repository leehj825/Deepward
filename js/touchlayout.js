// Deepward - touch controls the player can arrange: button size and opacity, a left-handed (mirrored) layout, and an
// editor to drag each button where the thumb wants it. Positions are kept as fractions of the screen, so they survive
// turning the phone; a button never moved stays where the stylesheet puts it.
const TouchLayout = (() => {
  const pad = document.getElementById('pad'), bar = document.getElementById('arrangeBar');
  const buttons = () => [...pad.querySelectorAll('button[data-act]')];
  let defs = null, drag = null, editing = false;
  // Where each button sits by default, measured from the bottom-right corner of the screen
  function measure() {
    if (defs) return defs;
    defs = {};
    const pr = parseFloat(getComputedStyle(pad).right) || 16, pb = parseFloat(getComputedStyle(pad).bottom) || 18;
    for (const b of buttons()) { const cs = getComputedStyle(b); defs[b.dataset.act] = { r: pr + parseFloat(cs.right), b: pb + parseFloat(cs.bottom) }; }
    return defs;
  }
  function apply() {
    const D = measure(), L = Settings.get('padLayout') || {}, lefty = Settings.get('lefty'), s = Settings.get('padScale');
    pad.classList.add('free'); pad.style.opacity = Settings.get('padOpacity');
    for (const b of buttons()) {
      const a = b.dataset.act, c = L[a], r = c ? c.x * innerWidth : D[a].r, btm = c ? c.y * innerHeight : D[a].b;
      b.style.bottom = btm + 'px';
      if (lefty) { b.style.left = r + 'px'; b.style.right = 'auto'; } else { b.style.right = r + 'px'; b.style.left = 'auto'; }
      b.style.transform = `scale(${s})`;
    }
  }
  // The editor: drag buttons; Reset puts them back; Done saves
  function beginEdit() { editing = true; document.body.classList.add('arranging'); bar.classList.add('show'); apply(); }
  function endEdit() { editing = false; document.body.classList.remove('arranging'); bar.classList.remove('show'); apply(); }
  function reset() { Settings.set('padLayout', {}); apply(); }
  function setPos(act, clientX, clientY) {
    const b = pad.querySelector(`[data-act="${act}"]`), w = b.offsetWidth, h = b.offsetHeight, lefty = Settings.get('lefty');
    const fromSide = lefty ? clientX - w / 2 : innerWidth - clientX - w / 2, fromBottom = innerHeight - clientY - h / 2;
    const L = Object.assign({}, Settings.get('padLayout') || {});
    L[act] = { x: Math.max(0, Math.min(0.95, fromSide / innerWidth)), y: Math.max(0, Math.min(0.92, fromBottom / innerHeight)) };
    Settings.set('padLayout', L); apply();
  }
  pad.addEventListener('pointerdown', ev => {
    if (!editing) return;
    const b = ev.target.closest('button[data-act]'); if (!b) return;
    drag = b.dataset.act; b.setPointerCapture && b.setPointerCapture(ev.pointerId); ev.stopPropagation(); ev.preventDefault();
  }, true);
  addEventListener('pointermove', ev => { if (editing && drag) setPos(drag, ev.clientX, ev.clientY); });
  addEventListener('pointerup', () => { drag = null; });
  bar.addEventListener('click', ev => { const t = ev.target.closest('[data-pad]'); if (!t) return; if (t.dataset.pad === 'reset') reset(); else endEdit(); });
  addEventListener('resize', () => { if (pad.classList.contains('free')) apply(); });
  Settings.on(k => { if (k === 'padScale' || k === 'padOpacity' || k === 'lefty') apply(); });
  return { apply, beginEdit, endEdit, reset, setPos, get editing() { return editing; } };
})();
