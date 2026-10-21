// Deepward - scenes: a person speaks to the warden in the world instead of in a panel. The camera frames the speaker over the
// warden's shoulder, the speaker turns to the warden and moves a little as they talk, the words are typed in a caption at the
// bottom (any key finishes the line, then goes on), and a line can offer choices. Script:
//   { who: 'elder' | null, steps: [ { name, text, label?, choices?: [{ text, go: label | 'end' }], go?: label | 'end', flag? } ] }
// who is a camp person's id (null: narration, the camera stays on the warden). A step with `go` jumps there instead of to the next.
const Scene = (() => {
  const CPS = 46;                                                            // characters per second
  let S = null, box = null;
  const $ = id => document.getElementById(id);
  const tr = s => (typeof I18N !== 'undefined' && I18N.tr ? I18N.tr(s) : s);
  const camp = () => (typeof World !== 'undefined' && World.rooms ? World.rooms.find(r => r.kind === 'camp') : null);
  const npcOf = id => { const c = camp(); return c && id ? c.npcs.find(n => n.id === id) || null : null; };

  function play(script, done) {
    if (S || G.state !== 'play') { if (done) done(); return false; }
    box = box || $('sceneBox');
    S = { script, i: 0, t: 0, npc: npcOf(script.who), sel: 0, done, cam: null, label: {} };
    script.steps.forEach((st, k) => { if (st.label) S.label[st.label] = k; });
    G.scene = S; G.state = 'scene'; Input.keys = {};
    $('letterbox').classList.add('on'); document.body.classList.add('cine', 'scene');
    if (document.pointerLockElement) document.exitPointerLock();
    show();
    return true;
  }
  const step = () => S.script.steps[S.i];
  function show() {
    const st = step(); S.t = 0; S.sel = 0; S.full = tr(st.text);
    box.querySelector('.sn').textContent = tr(st.name === undefined ? (S.script.name || '') : st.name);
    box.querySelector('.sc').innerHTML = '';
    box.classList.add('show'); box.classList.remove('done');
    render();
  }
  function render() {
    const st = step(), n = Math.min(S.full.length, Math.floor(S.t * CPS)), fin = n >= S.full.length;
    box.querySelector('.st').textContent = S.full.slice(0, n);
    box.classList.toggle('done', fin);
    const ch = box.querySelector('.sc');
    if (fin && st.choices && !ch.children.length) {
      st.choices.forEach((c, k) => { const b = document.createElement('button'); b.textContent = tr(c.text); b.dataset.k = k; b.className = k === S.sel ? 'on' : ''; b.onclick = () => choose(k); ch.appendChild(b); });
    }
  }
  function choose(k) { const st = step(), c = st.choices[k]; if (!c) return; if (c.flag) flag(c.flag); jump(c.go); }
  function flag(f) { if (typeof Items !== 'undefined' && Items.S) { Items.S.flags = Items.S.flags || {}; Items.S.flags[f] = true; Items.save(); } }
  function jump(go) {
    if (go === undefined || go === null) S.i++;
    else if (go === 'end') S.i = Infinity;
    else S.i = S.label[go] === undefined ? S.i + 1 : S.label[go];
    if (S.i >= S.script.steps.length) return end();
    show();
  }
  // Advance: finish the typing, or go on to the next line (a line with choices waits for one)
  function next() {
    if (!S) return;
    const st = step(), fin = Math.floor(S.t * CPS) >= S.full.length;
    if (!fin) { S.t = 1e3; render(); return; }
    if (st.flag) flag(st.flag);
    if (st.choices) { choose(S.sel); return; }
    jump(st.go);
  }
  function pick(k) { if (S && step().choices && Math.floor(S.t * CPS) >= S.full.length) { if (k >= 0 && k < step().choices.length) choose(k); } }
  function nav(d) { if (!S || !step().choices) return; const n = step().choices.length; S.sel = (S.sel + d + n) % n; [...box.querySelectorAll('.sc button')].forEach((b, k) => b.classList.toggle('on', k === S.sel)); }
  function end() {
    if (!S) return;
    const d = S.done; box.classList.remove('show', 'done');
    if (S.npc) { S.npc.rig.root.rotation.z = 0; }
    $('letterbox').classList.remove('on'); document.body.classList.remove('cine', 'scene');
    if (G.state === 'scene') G.state = 'play';
    S = null; G.scene = null;
    if (d) d();
  }
  const skip = () => { if (S) { S.i = Infinity; end(); } };

  // Every frame of a scene: the typing, the speaker turning and moving, the camera
  function update(dt, camera) {
    if (!S) return;
    S.t += dt; render();
    const p = G.player, n = S.npc, fin = Math.floor(S.t * CPS) >= S.full.length;
    if (n) {
      const want = Math.atan2(p.pos.x - n.x, p.pos.z - n.z); let df = want - n.face; df = Math.atan2(Math.sin(df), Math.cos(df)); n.face += df * Math.min(1, dt * 5);
      n.rig.root.rotation.y = n.face;
      const talk = !fin; const k = talk ? Math.sin(S.t * 9) : 0;               // a lean and a sway while the words come
      n.rig.root.rotation.z = (n.rig.root.rotation.z || 0) * 0.85 + (talk ? k * 0.03 : 0) * 0.15;
      n.rig.root.position.y = talk ? Math.abs(Math.sin(S.t * 6)) * 0.015 : 0;
      // the warden turns to them
      const hw = Math.atan2(n.x - p.pos.x, n.z - p.pos.z); let dh = hw - p.facing; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); p.facing += dh * Math.min(1, dt * 5);
      p.rig.root.rotation.y = p.facing;
    }
    Rig.animate(p.rig, { mode: 'idle', t: 0, speed: 0, calm: true }, dt);
    // The shot: behind and to the side of the warden, the speaker in the frame; narration looks at the warden from the front-left
    const tx = n ? n.x : p.pos.x, tz = n ? n.z : p.pos.z, dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    const want = new THREE.Vector3(p.pos.x - ux * 2.3 - uz * 0.9, 1.55, p.pos.z - uz * 2.3 + ux * 0.9);
    if (!n) want.set(p.pos.x + Math.sin(p.facing) * 2.8 - Math.cos(p.facing) * 1.0, 1.5, p.pos.z + Math.cos(p.facing) * 2.8 + Math.sin(p.facing) * 1.0);
    camera.position.lerp(want, Math.min(1, dt * 3.2));
    const look = n ? new THREE.Vector3(n.x, 0.95, n.z) : new THREE.Vector3(p.pos.x, 0.85, p.pos.z);
    if (!S.cam) S.cam = look.clone(); S.cam.lerp(look, Math.min(1, dt * 5));
    camera.lookAt(S.cam);
  }
  return { play, next, pick, nav, skip, update, end, get active() { return !!S; }, get current() { return S; } };
})();
