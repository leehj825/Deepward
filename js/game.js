// Deepward - scene, camera, input (keyboard / mouse / touch), HUD, game flow and the main loop.
// The dungeon itself (rooms, gates, progression) lives in world.js.
// G.state: title | play | pause | menu (a panel is open) · G.mode: camp | dungeon
const G = {
  state: 'title', mode: 'camp', time: 0, player: null, enemies: [], queue: [], boss: null, spot: null, timers: [],
  stats: { kills: 0, parries: 0, crits: 0, dodges: 0, hitsTaken: 0, rooms: 0 }, seen: {},
};

// ---------------- Camera view ----------------
// 'behind': an orbit camera over the hero's shoulder (mouse / right-thumb drag turns it, the hero faces where it looks
// and moves by strafing). 'top': the fixed high quarter view, where the hero faces the way it walks.
const View = { mode: 'behind', yaw: 0, pitch: 0.42, dist: 7, LOOK_H: 1.5 };
try { if (localStorage.getItem('dw_view') === 'top') View.mode = 'top'; } catch (e) {}

// ---------------- Input ----------------
const Input = { move: { x: 0, z: 0 }, block: false, keys: {}, mouseBlock: false, touchBlock: false, stick: { x: 0, z: 0 } };
(function setupInput() {
  addEventListener('keydown', ev => {
    Snd.init();
    if (ev.target && /^(TEXTAREA|INPUT)$/.test(ev.target.tagName)) return;   // typing a save code
    if (!ev.repeat && Bindings.captureKey(ev.code)) { ev.preventDefault(); return; }   // Settings → Controls is waiting for a key
    if (UI.open) {                                                        // menus: arrows / W S move, Enter / Space / E pick, Esc back
      const c = ev.code;
      if (c === 'ArrowUp' || c === 'KeyW' || c === 'ArrowLeft' || c === 'KeyA') UI.nav(-1);
      else if (c === 'ArrowDown' || c === 'KeyS' || c === 'ArrowRight' || c === 'KeyD' || c === 'Tab') UI.nav(1);
      else if (!ev.repeat && (c === 'Enter' || c === 'Space' || c === 'KeyE' || c === 'KeyJ')) UI.confirm();
      else if (!ev.repeat && (c === 'Escape' || c === 'Backspace' || c === 'KeyI')) UI.back();
      ev.preventDefault(); return;
    }
    if (ev.repeat) return;
    if (G.state === 'cine') { endCine(); return; }                         // any key skips a guardian's entrance
    Input.keys[ev.code] = true;
    const A = Bindings.actionsOf(ev.code), has = a => A.includes(a);
    if (has('mute')) toggleMute();
    if (has('camera')) toggleView();
    if (has('map')) MiniMap.toggle();
    if (has('codex') && G.state === 'play') openPanel('codex');
    if (has('lock') && G.state === 'play') toggleLock();
    // Esc always pauses (an Esc that just released the captured mouse has already paused); so does P unless it is bound
    if ((ev.code === 'Escape' && performance.now() - (Input.unlockedAt || 0) > 200) || (ev.code === 'KeyP' && !A.length)) togglePause();
    if (ev.code === 'Enter' && G.state === 'title') titleGo();
    if (G.state !== 'play') return;
    if (has('interact')) interact();
    if (has('flask')) Player.drink(G.player);
    if (has('ult')) Player.ultimate(G.player);
    if (has('talents')) openPanel('talents');
    if (has('gear')) { openPanel('bag'); ev.preventDefault(); }
    for (const a of ['light', 'heavy', 'dodge']) if (has(a)) { Player.press(G.player, a); ev.preventDefault(); }
    if (A.length) ev.preventDefault();
  });
  addEventListener('keyup', ev => { Input.keys[ev.code] = false; });
  addEventListener('blur', () => { Input.keys = {}; Input.mouseBlock = false; });
  const cv = document.getElementById('game');
  cv.addEventListener('mousedown', ev => {
    Snd.init();
    if (G.state !== 'play') return;
    // In the behind view the first click captures the mouse for looking around; it does not attack
    if (View.mode === 'behind' && document.pointerLockElement !== cv && cv.requestPointerLock) { cv.requestPointerLock(); return; }
    if (ev.button === 0) Player.press(G.player, 'light');
    if (ev.button === 2) Input.mouseBlock = true;
    if (ev.button === 1) { Player.press(G.player, 'heavy'); ev.preventDefault(); }
  });
  addEventListener('mouseup', ev => { if (ev.button === 2) Input.mouseBlock = false; });
  cv.addEventListener('contextmenu', ev => ev.preventDefault());
  addEventListener('mousemove', ev => {
    if (document.pointerLockElement !== cv || View.mode !== 'behind') return;
    turnView(ev.movementX * 0.0032, ev.movementY * 0.0026);
  });
  cv.addEventListener('wheel', ev => { ev.preventDefault(); View.dist = Math.min(12, Math.max(3.5, View.dist * Math.exp(ev.deltaY * 0.001))); }, { passive: false });
  // Esc releases the captured mouse before the page sees the key, so losing the capture mid-fight pauses
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== cv) { Input.unlockedAt = performance.now(); if (G.state === 'play' && View.mode === 'behind') togglePause(); }
  });

  // Touch: a floating joystick on the left half, action buttons on the right
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  document.body.classList.toggle('touch', isTouch);
  const stickEl = document.getElementById('stick'), knob = document.getElementById('knob');
  let stickId = null, sx = 0, sy = 0;
  let lookId = null, lx = 0, ly = 0;
  cv.addEventListener('pointerdown', ev => {
    if (G.state === 'cine') { endCine(); return; }                          // a tap skips a guardian's entrance
    if (ev.pointerType !== 'touch') return;
    // The look side is the right of the screen, or the left in the left-handed layout
    if (Settings.get('lefty') ? ev.clientX < innerWidth * 0.55 : ev.clientX > innerWidth * 0.45) { if (lookId === null) { lookId = ev.pointerId; lx = ev.clientX; ly = ev.clientY; } return; }
    if (stickId !== null) return;
    stickId = ev.pointerId; sx = ev.clientX; sy = ev.clientY;
    stickEl.style.display = 'block'; stickEl.style.left = sx + 'px'; stickEl.style.top = sy + 'px'; knob.style.transform = '';
  });
  addEventListener('pointermove', ev => {
    if (ev.pointerId === lookId) {
      if (View.mode === 'behind') turnView((ev.clientX - lx) * 0.006, (ev.clientY - ly) * 0.004);
      lx = ev.clientX; ly = ev.clientY; return;
    }
    if (ev.pointerId !== stickId) return;
    let dx = ev.clientX - sx, dy = ev.clientY - sy; const l = Math.hypot(dx, dy), R = 56;
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    Input.stick.x = dx / R; Input.stick.z = dy / R;
  });
  const endStick = ev => { if (ev.pointerId === lookId) lookId = null; if (ev.pointerId !== stickId) return; stickId = null; Input.stick.x = Input.stick.z = 0; stickEl.style.display = 'none'; };
  addEventListener('pointerup', endStick); addEventListener('pointercancel', endStick);
  for (const b of document.querySelectorAll('[data-act]')) {
    const act = b.dataset.act;
    b.addEventListener('pointerdown', ev => {
      ev.preventDefault(); Snd.init(); b.classList.add('on');
      if (G.state !== 'play') return;
      if (act === 'light' && G.spot) interact();
      else if (act === 'flask') Player.drink(G.player);
      else if (act === 'ult') Player.ultimate(G.player);
      else if (act === 'bag') openPanel('bag');
      else if (act === 'lock') toggleLock();
      else if (act === 'block') Input.touchBlock = true; else Player.press(G.player, act);
    });
    const up = () => { b.classList.remove('on'); if (act === 'block') Input.touchBlock = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  }
})();
// ---------------- Game controller (Xbox layout, standard mapping) ----------------
// Left stick move · right stick camera · RB / X light · RT heavy · Y ultimate · LB / LT block · A / B dash
// View (back) switches camera · Menu (start) pauses and confirms menus · right-stick click recentres the camera
const Pad = { id: null, prev: [], move: { x: 0, z: 0 }, block: false };
const PAD_BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, RS: 11 };
const dead = (x, y, dz = 0.2) => { const l = Math.hypot(x, y); if (l < dz) return [0, 0]; const k = Math.min(1, (l - dz) / (1 - dz)) / l; return [x * k, y * k]; };
function pollPad(real) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of pads) if (p && p.connected && (p.mapping === 'standard' || !gp)) { gp = p; if (p.mapping === 'standard') break; }
  if (!gp) { if (Pad.id) { Pad.id = null; document.body.classList.remove('pad'); } Pad.move.x = Pad.move.z = 0; Pad.block = false; return; }
  if (Pad.id !== gp.id) { Pad.id = gp.id; Pad.prev = []; document.body.classList.add('pad'); showTip(Bindings.fmt('Controller connected: left stick move, right stick camera, @light attack, @heavy heavy, @block block, @dodge dash.', 'pad')); }
  const btn = i => { const b = gp.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };
  const now = gp.buttons.map((_, i) => btn(i)), prev = Pad.prev, down = i => now[i] && !prev[i];
  Pad.prev = now;
  // Settings → Controls is waiting for a button
  if (Bindings.listening && Bindings.listening.dev === 'pad') { const i = now.findIndex((v, j) => v && !prev[j]); if (i >= 0) Bindings.captureButton(i); Pad.move.x = Pad.move.z = 0; return; }
  const pressed = act => Bindings.padButtons(act).some(down), holding = act => Bindings.padButtons(act).some(btn);
  const [mx, my] = dead(gp.axes[0] || 0, gp.axes[1] || 0), [cx, cy] = dead(gp.axes[2] || 0, gp.axes[3] || 0, 0.15);
  Pad.move.x = mx; Pad.move.z = my;
  Pad.block = holding('block');
  if (now.some(Boolean)) Snd.init();
  // Panels: d-pad / left stick to move (with repeat), A picks, B goes back
  if (UI.open) {
    const v = (now[12] ? -1 : now[13] ? 1 : 0) || (my < -0.5 ? -1 : my > 0.5 ? 1 : 0);
    if (v && (v !== Pad.navDir || performance.now() > Pad.navNext)) { UI.nav(v); Pad.navNext = performance.now() + (v === Pad.navDir ? 120 : 350); }
    Pad.navDir = v;
    if (down(PAD_BTN.A)) UI.confirm(); else if (down(PAD_BTN.B)) UI.back();
    Pad.move.x = Pad.move.z = 0; return;
  }
  if (G.state === 'cine') { if (down(PAD_BTN.A) || down(PAD_BTN.B) || down(PAD_BTN.MENU)) endCine(); return; }
  if (G.state === 'title') { if (down(PAD_BTN.Y)) openSettings(); else if (down(PAD_BTN.A) || down(PAD_BTN.MENU)) titleGo(); return; }
  if (G.state === 'pause') { if (down(PAD_BTN.Y)) openSettings(); else if (down(PAD_BTN.A) || down(PAD_BTN.MENU) || down(PAD_BTN.B)) togglePause(); return; }
  if (G.state !== 'play') return;
  if (down(PAD_BTN.MENU)) { togglePause(); return; }
  // Actions on the player's buttons (Settings → Controls); talking takes the button when something is near
  if (pressed('camera')) toggleView();
  if (pressed('light')) Player.press(G.player, 'light');
  if (pressed('heavy')) Player.press(G.player, 'heavy');
  if (pressed('ult')) Player.ultimate(G.player);
  if (pressed('interact') && G.spot) interact();
  else if (pressed('dodge')) Player.press(G.player, 'dodge');
  if (pressed('flask')) Player.drink(G.player);
  if (pressed('gear')) openPanel('bag');
  if (pressed('talents')) openPanel('talents');
  if (pressed('codex')) openPanel('codex');
  if (pressed('map')) MiniMap.toggle();
  if (View.mode === 'behind') {
    if (pressed('lock')) toggleLock();                                   // lock on (or recentre when nothing is near)
    turnView(cx * 3.2 * real, cy * 1.8 * real);          // radians per second at full tilt
  }
}
// Rumble on the controller, if it has motors: strong / weak in 0..1, duration in ms
G.rumble = (strong, weak, ms) => {
  // Phones buzz too (Settings: Vibration)
  if (!Pad.id && document.body.classList.contains('touch') && Settings.get('haptics') && navigator.vibrate) { try { navigator.vibrate(Math.max(10, Math.round(ms * Math.max(strong, weak) * 0.5))); } catch (e) {} }
  if (!Pad.id) return;
  const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(p => p && p.id === Pad.id);
  const act = gp && gp.vibrationActuator;
  if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
};

function readInput() {
  const k = Input.keys;
  const H = a => Bindings.held(k, a);
  let x = (H('right') ? 1 : 0) - (H('left') ? 1 : 0);
  let z = (H('down') ? 1 : 0) - (H('up') ? 1 : 0);
  if (Math.abs(Input.stick.x) + Math.abs(Input.stick.z) > 0.1) { x = Input.stick.x; z = Input.stick.z; }
  if (Pad.move.x || Pad.move.z) { x = Pad.move.x; z = Pad.move.z; }
  if (View.mode === 'behind') {
    // Screen up = away from the camera, screen right = the camera's right
    const fx = -Math.sin(View.yaw), fz = -Math.cos(View.yaw), rx = Math.cos(View.yaw), rz = -Math.sin(View.yaw);
    const wx = rx * x - fx * z, wz = rz * x - fz * z; x = wx; z = wz;
  }
  Input.move.x = x; Input.move.z = z;
  Input.block = !!(H('block') || Input.mouseBlock || Input.touchBlock || Pad.block);
}

// ---------------- Scene ----------------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07060a);
scene.fog = new THREE.Fog(0x07060a, 18, 38);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
FX.init(scene, camera, document.getElementById('floaters'));

const hemi = new THREE.HemisphereLight(0x6a7aa0, 0x1a1210, 0.55);
scene.add(hemi);
// The moon light follows the hero so its shadow map always covers the fight
const moon = new THREE.DirectionalLight(0xaab8e0, 0.5);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
moon.shadow.bias = -0.0008;
scene.add(moon, moon.target);
// Graphics quality: high (sharp, soft 2048 shadows), medium (1.5x, 1024 shadows) or low (1x, no shadows).
// 'auto' picks medium on touch devices (phones and tablets) and high elsewhere.
const QUALITY = { high: { pr: 2, shadow: 2048, soft: true }, medium: { pr: 1.5, shadow: 1024, soft: false }, low: { pr: 1, shadow: 0 } };
function quality() { const q = Settings.get('quality'); return q === 'auto' ? (('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 'medium' : 'high') : q; }
// Automatic resolution: when frames run long the game draws fewer pixels (down to half), and creeps back up when
// there is room again. resScale multiplies the quality's pixel ratio.
let resScale = 1;
function applyQuality() {
  const Q = QUALITY[quality()] || QUALITY.high, on = Q.shadow > 0;
  renderer.setPixelRatio(Math.min(Q.pr, devicePixelRatio) * resScale); renderer.setSize(innerWidth, innerHeight, false);
  if (on && moon.shadow.mapSize.x !== Q.shadow) { moon.shadow.mapSize.set(Q.shadow, Q.shadow); if (moon.shadow.map) { moon.shadow.map.dispose(); moon.shadow.map = null; } }
  const type = Q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  if (renderer.shadowMap.enabled !== on || renderer.shadowMap.type !== type) {
    renderer.shadowMap.enabled = on; renderer.shadowMap.type = type;
    scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
  }
}
applyQuality();
Settings.on(k => { if (k === 'quality') applyQuality(); if (k === 'autoRes' && !Settings.get('autoRes')) { resScale = 1; applyQuality(); } if (k === 'perf') $('perf').classList.toggle('show', !!Settings.get('perf')); if (k === 'difficulty' && G.player) Player.refit(G.player, scene, false); });
G.quality = quality;
function aimMoon(at) { moon.position.set(at.x - 6, 16, at.z + 8); moon.target.position.set(at.x, 0, at.z); }

// Drifting dust motes that travel with the hero
const dust = (() => {
  const N = 160, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() * 2 - 1) * 11; pos[i * 3 + 1] = Math.random() * 4; pos[i * 3 + 2] = (Math.random() * 2 - 1) * 11; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const d = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd8a0, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(d); return d;
})();

// The air of each place: what drifts in it (colour, size, fall speed - negative falls, positive rises - and sway)
const AIR = {
  crypt: [0xffd8a0, 0.05, -0.05, 0.1, 0.5], keep: [0xffc890, 0.05, -0.04, 0.1, 0.45], den: [0xff9a5a, 0.05, 0.25, 0.25, 0.6],
  camp: [0xffd8a0, 0.04, -0.03, 0.15, 0.45], depths: [0xb8a0ff, 0.07, 0.1, 0.35, 0.6], court: [0xe8e0ff, 0.04, 0.02, 0.15, 0.45],
  temple: [0x8ae8ff, 0.05, -3.5, 0, 0.7], frost: [0xffffff, 0.09, -0.7, 0.6, 0.9], forge: [0xff7a2a, 0.07, 1.0, 0.45, 0.9],
  orchard: [0xcfc8b0, 0.06, -0.3, 0.7, 0.6], throne: [0xffd070, 0.05, 0.06, 0.2, 0.5],
};
let airKey = null;
function updateAir(dt) {
  const th = World.theme, key = th && Object.keys(CFG.themes).find(k => CFG.themes[k] === th) || 'crypt', A = AIR[key] || AIR.crypt;
  if (key !== airKey) { airKey = key; dust.material.color.setHex(A[0]); dust.material.size = A[1]; dust.material.opacity = A[4]; }
  const pos = dust.geometry.attributes.position, a = pos.array, t = G.time || performance.now() / 1000;
  for (let i = 0; i < a.length; i += 3) {
    a[i + 1] += A[2] * dt;
    if (a[i + 1] < 0) a[i + 1] += 4; else if (a[i + 1] > 4) a[i + 1] -= 4;
    if (A[3]) a[i] += Math.sin(t * 0.8 + i) * A[3] * dt;
  }
  pos.needsUpdate = true;
}
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) setTimeout(() => TouchLayout.apply(), 0);
World.init(scene, hemi);
G.scene = scene;
World.enterCamp({ forge: 0, apothecary: 0, yard: 0 });                    // the title screen looks out over the camp

// ---------------- Collisions ----------------
function resolveCollisions() {
  const p = G.player;
  const bodies = [p, ...G.enemies.filter(e => e.state !== 'dead')];
  const rad = b => b === p ? CFG.player.radius : b.def.radius;
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const a = bodies[i], b = bodies[j];
    if (a === p && p.state === 'roll') continue;                       // rolls pass through enemies
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = rad(a) + rad(b);
    if (d >= min || d < 1e-4) continue;
    const push = (min - d), nx = dx / d, nz = dz / d, wa = a === p ? 0.7 : 0.5;
    a.pos.x -= nx * push * wa; a.pos.z -= nz * push * wa; b.pos.x += nx * push * (1 - wa); b.pos.z += nz * push * (1 - wa);
  }
  // Everyone stays inside the dungeon's sections and passages
  for (const b of bodies) World.constrain(b.pos, rad(b));
}

// ---------------- Spawning ----------------
// World queues enemies with a time; they appear here (so pausing and tests use game time)
function updateSpawns() {
  G.enemies = G.enemies.filter(e => { if (e.remove) { Enemy.dispose(e, scene); return false; } return true; });
  G.queue = G.queue.filter(q => {
    if (G.time < q.t) return true;
    const e = Enemy.spawn(scene, q.type, q.at, q.mult);
    e.room = q.room;
    const hm = (q.hpMult || 1) * Settings.diff.hp; e.hp *= hm; e.maxHp *= hm;
    if (q.guardian) { G.bossHits = G.stats.hitsTaken; startCine(e); e.guardian = q.guardian; Enemy.makeBoss(e, q.room.inf.stage.monster ? CFG.monsterBosses[q.room.inf.stage.monster] : q.room.inf.si); e.bar.style.display = 'none'; e.bar.classList.add('guardian'); G.boss = e; }
    if (q.add) e.add = true;
    if (q.fieldBoss) {                                                    // a field boss: a named elite, bigger, with a boss bar once roused
      const B = q.fieldBoss;
      if (B.boss) Enemy.makeBoss(e, CFG.monsterBosses[B.boss]);             // a big monster: grown, with phases
      else { Enemy.makeElite(e, B.mods, B.name); e.hp *= B.hp; e.maxHp *= B.hp; e.def.scale *= B.scale; e.def.radius *= B.scale; e.rig.root.scale.multiplyScalar(B.scale); e.def.flinch = false; }
      e.champion = true; e.guardian = B.name; e.fieldBoss = B; e.bar.style.display = 'none';
    }
    if (q.zone) { e.zone = q.zone; e.home = q.home; e.state = 'hunt'; e.rig.root.position.y = 0; e.aggro = false; e.facing = Math.random() * Math.PI * 2; }   // a beast of the Rim, already about its business
    if (q.raisedBy) e.raisedBy = q.raisedBy;
    if (q.raid) e.raid = true;                                             // a raider on the Rim road
    if (q.champion) {
      // The mid-stage champion: a named elite with its own boss bar
      const C = q.champion; Enemy.makeElite(e, C.mods, C.name);
      const cm = CFG.championMult * (C.hp || 1); e.hp *= cm; e.maxHp *= cm; e.def.scale *= 1.25; e.def.radius *= 1.25; e.rig.root.scale.multiplyScalar(1.25);
      e.def.flinch = false; e.champion = true; e.guardian = C.name; e.bar.style.display = 'none'; G.boss = e;
    } else if (q.elite) { Enemy.makeElite(e, Enemy.rollElite(G.stageK || 0, true), q.raid ? 'Raid Chief' : undefined); e.rig.root.scale.multiplyScalar(1.18); }
    else if (!q.guardian && !q.add && !q.raisedBy && !q.mimic && G.mode === 'dungeon') { const m = Enemy.rollElite(G.stageK || 0, G.cursed('hunted')); if (m) Enemy.makeElite(e, m); }
    if (G.cursed('frenzy')) { e.def.speed *= 1.25; e.frenzy = true; }                 // a curse of the Endless Deep
    G.enemies.push(e);
    return false;
  });
  const alive = G.enemies.filter(e => e.state !== 'dead' && (!e.zone || e.aggro)).length;            // beasts of the Rim count once roused
  document.getElementById('waveN').textContent = World.label();
  document.getElementById('foesN').textContent = alive ? alive + (alive === 1 ? ' foe' : ' foes') : '';
}

// ---------------- HUD ----------------
const $ = id => document.getElementById(id);
let bannerT = null, tipT = null;
function banner(txt) { const b = $('banner'); b.textContent = txt; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 1800); }
function showTip(txt) {
  if (!txt) return;
  txt = Bindings.fmt(txt);                                                // @heavy and the like become the player's own keys
  if (document.body.classList.contains('touch') && !document.body.classList.contains('pad')) txt = txt.replace(/\s*\([^)]*\)/g, '');   // key names in brackets mean nothing on a touch screen
  const t = $('tip'); t.textContent = txt; t.classList.add('show'); clearTimeout(tipT); tipT = setTimeout(() => t.classList.remove('show'), 7000); }
function updateHud() {
  const p = G.player;
  $('hpFill').style.width = p.hp / p.maxHp * 100 + '%';
  $('hpTxt').textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
  $('stFill').style.width = p.st / p.maxSt * 100 + '%';
  $('stBar').classList.toggle('empty', p.st < 1);
  for (const e of G.enemies) Enemy.updateBar(e);
  if (G.boss && G.boss.bar) G.boss.bar.style.display = 'none';
  UI.boss(G.boss);
  $('goldN').textContent = Items.S ? Items.S.gold : 0;
  if (Items.S) {
    const S = Items.S; $('xpFill').style.width = Math.min(100, S.xp / CFG.progress.xpFor(S.level) * 100) + '%'; $('lvN').textContent = S.level;
    $('lvBox').classList.toggle('pts', S.points > 0);
    const u = $('ultBox'); u.style.display = p.S.ult ? '' : 'none';
    if (p.S.ult) { const ready = !(p.ultCd > 0); u.classList.toggle('ready', ready); u.textContent = ready ? '✦' : Math.ceil(p.ultCd); }
    document.querySelector('.b-ult').style.display = p.S.ult ? '' : 'none';
  }
  $('flaskN').textContent = p.flasks;
  // In camp, the nearest person or place you can use; in the dungeon, a shrine (none while training)
  const spot = p.state === 'dead' || G.training ? null : G.mode === 'camp' ? Camp.nearest(World.camp(), p.pos) : G.mode === 'field' ? Field.nearest(World.fieldAt(p.pos) || World.field(), p.pos) : Props.nearest(p.pos);
  const bl = (G.blessings || []).join();
  if (bl !== G.shownBless) {
    G.shownBless = bl;
    $('bless').innerHTML = (G.blessings || []).map(id => { const b = CFG.blessings.find(x => x.id === id); return `<span title="${b.name}: ${b.desc}">${b.icon} ${b.name}</span>`; }).join('');
  }
  if (spot !== G.spot) {
    G.spot = spot;
    const pad = document.body.classList.contains('pad'), touch = document.body.classList.contains('touch');
    UI.prompt(spot ? `<b>${touch && !pad ? 'TALK' : Bindings.label('interact', pad ? 'pad' : 'key')}</b> ${spot.verb} · ${spot.name}` : '');
    document.querySelector('.b-light').textContent = spot ? 'TALK' : 'ATTACK';
  }
}
function toggleMute() { const m = Snd.toggleMute(); $('muteBtn').textContent = m ? '🔇' : '🔊'; }
$('muteBtn').textContent = Snd.muted ? '🔇' : '🔊';
$('muteBtn').addEventListener('click', () => { Snd.init(); toggleMute(); });
$('pauseBtn').addEventListener('click', () => togglePause());
$('viewBtn').addEventListener('click', () => { Snd.init(); toggleView(); });
updateViewUi();
function togglePause() {
  if (G.state === 'play') { G.state = 'pause'; $('pause').classList.add('show'); if (document.pointerLockElement) document.exitPointerLock(); }
  else if (G.state === 'pause') { G.state = 'play'; $('pause').classList.remove('show'); }
}
// Settings open over the title or the pause screen and return to it
function openSettings() {
  if (UI.open) return;
  const from = G.state, scr = from === 'title' ? $('title') : from === 'pause' ? $('pause') : null;
  if (scr) scr.classList.remove('show');
  G.state = 'menu';
  UI.show('settings', {}, () => { G.state = from === 'menu' ? 'play' : from; if (scr) scr.classList.add('show'); });
}
$('setBtn').addEventListener('click', () => { Snd.init(); openSettings(); });
$('codexBtn').addEventListener('click', () => { if (G.state !== 'pause') return; $('pause').classList.remove('show'); G.state = 'menu'; UI.show('codex', {}, () => { G.state = 'pause'; $('pause').classList.add('show'); }); });
$('titleSetBtn').addEventListener('click', () => { Snd.init(); openSettings(); });
// The score follows the action: camp, quiet dungeon, a fight (lingering 4 s after it ends), a guardian
function musicMood() {
  if (G.state === 'title' || G.mode === 'camp') return 'camp';
  if (G.boss && G.boss.state !== 'dead') return 'boss';
  if (G.enemies.some(e => e.state !== 'dead' && (!e.zone || e.aggro)) || G.queue.some(q => !q.zone)) G.calmAt = G.time;
  return G.time - (G.calmAt === undefined ? -99 : G.calmAt) < 4 ? 'combat' : 'dungeon';
}
$('resumeBtn').addEventListener('click', () => { togglePause(); if (View.mode === 'behind' && !document.body.classList.contains('touch')) { const cv = $('game'); if (cv.requestPointerLock) cv.requestPointerLock(); } });
// ---------------- Game flow ----------------
// Title -> (story) -> camp -> descend into a stage -> rooms -> guardian -> back to camp or press on. Falling wakes you in camp.
function fadeTo(fn) {
  const f = $('fade'); f.classList.add('on');
  setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 60); }, 420);
}
function openPanel(id, opt, done) {
  if (UI.open) return;
  G.state = 'menu';
  UI.show(id, opt, () => { if (G.state === 'menu') G.state = 'play'; if (done) done(); });
}
const say = (lines, done, last) => openPanel('dialogue', { lines, i: 0, last }, done);
// ---------------- Guardian entrances ----------------
function startCine(e) {
  if (G.state !== 'play') return;
  G.cine = { e, t: 0, dur: 2.4 }; G.state = 'cine'; $('letterbox').classList.add('on'); document.body.classList.add('cine'); Input.keys = {};
  if (document.pointerLockElement) document.exitPointerLock();
}
function endCine() {
  if (G.state !== 'cine') return;
  G.state = 'play'; G.cine = null; $('letterbox').classList.remove('on'); document.body.classList.remove('cine');
}
// ---------------- Lock-on ----------------
// C, the right-stick click or 🎯 locks onto the foe nearest where you look: the camera swings to keep it in view, the
// hero faces it and strafes around it, and attacks go to it. A gold marker spins over it. When it dies, the lock
// moves to the next foe nearby; pressing again lets go.
const lockMark = (() => {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 4).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, depthTest: false }));
  m.renderOrder = 10; m.visible = false; scene.add(m); return m;
})();
function pickLock(exclude, maxD = 16) {
  const p = G.player; if (!p) return null;
  const fwd = View.mode === 'behind' ? View.yaw + Math.PI : p.facing;
  let best = null, bs = Infinity;
  for (const e of G.enemies) {
    if (!Enemy.targetable(e) || e === exclude) continue;
    const d = Combat.dist(p.pos, e.pos); if (d > maxD) continue;
    const s = d + Math.abs(Combat.wrap(Combat.yawTo(p.pos, e.pos) - fwd)) * 6;
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}
function toggleLock() {
  if (G.lock) { G.lock = null; return; }
  G.lock = pickLock();
  if (G.lock) Snd.play('glint');
  else if (View.mode === 'behind' && G.player) { View.yaw = G.player.facing + Math.PI; View.pitch = 0.42; }   // nothing near: recentre
}
function updateLock(dt) {
  const p = G.player; let L = G.lock;
  if (L && (L.state === 'dead' || L.remove || Combat.dist(p.pos, L.pos) > 20)) L = G.lock = L.state === 'dead' ? pickLock(L, 10) : null;
  lockMark.visible = !!L;
  if (!L) return;
  lockMark.position.set(L.pos.x, 2.15 * L.def.scale + 0.7 + Math.sin(G.time * 5) * 0.06, L.pos.z); lockMark.rotation.y += dt * 3;
  if (View.mode === 'behind' && Combat.dist(p.pos, L.pos) > 0.8) {
    const want = Math.atan2(p.pos.x - L.pos.x, p.pos.z - L.pos.z);           // the camera on the far side of the hero
    View.yaw += Combat.wrap(want - View.yaw) * Math.min(1, dt * 7);
  }
}
G.onBroken = () => { if (!G.seen.exec) { G.seen.exec = true; showTip(CFG.tips.execute); } };
function clearEnemies() {
  G.raid = null; G.lock = null; Enemy.clearArrows(); for (const e of G.enemies) Enemy.dispose(e, scene); G.enemies = []; G.queue = []; G.boss = null; G.timers = []; FX.clear(); }
function placeHero(at) {
  const p = G.player; p.pos.set(at.x, 0, at.z); p.facing = at.facing; p.kb.set(0, 0, 0);
  View.yaw = at.facing + Math.PI; View.pitch = 0.42; camTarget.copy(p.pos);
}
// Into the camp: everything restored, Tilda's stock refreshed, the game saved
function enterCamp(atSpawn = true) {
  if (Tutorial.active) Tutorial.stop();
  clearEnemies(); G.blessings = []; G.run = null; G.arena = null; G.tonics = []; curseWorld();
  if (atSpawn) wandererComes();
  const at = World.enterCamp();
  G.mode = 'camp';
  const S = Items.S; S.tripGold = 0;
  if (atSpawn) rollRaid();
  if (World.fenOpen() && !S.fenSeen) { S.fenSeen = true; Items.save(); G.after(1.2, () => say([['Captain Rook', 'Five guardians down. I have unbarred the east gate: the Fen is yours to walk now.'], ['Captain Rook', 'Spiders the size of dogs in the Black Mire, the drowned dead in the Hollow at night, goblins working the old quarry. Bring silk back for Bram.']])); }
  const tier = Math.min(S.stage, CFG.gear.tierNames.length - 1);
  if (atSpawn) {
    S.stock = [0, 1, 2].map(() => Items.generate(tier, { boost: 0.4 }));
    if (Math.random() < CFG.gear.uniqueStock && S.uniques.length < CFG.gear.uniques.length) {
      const n = S.uniques.length; S.stock[0] = Items.generateUnique(tier); S.uniques.length = n;          // not "found" until bought
    }
  }
  Items.save();
  Player.refit(G.player, scene, true); Player.revive(G.player);
  if (atSpawn) placeHero(at);
  $('waveN').textContent = World.label(); $('foesN').textContent = '';
}
function titleGo() { if (Items.hasSave() && Items.load()) startGame('continue'); else if (anySave()) openSaves(); else startGame('new'); }
function startGame(how = 'new') {
  Snd.init();
  if (how === 'new' || !Items.load()) Items.newGame();
  if (G.player) { scene.remove(G.player.rig.root); scene.remove(G.player.trail.mesh); }
  G.player = Player.create(scene);
  G.time = 0; G.seen = {};
  G.stats = { kills: 0, parries: 0, crits: 0, dodges: 0, hitsTaken: 0, rooms: 0 };
  $('title').classList.remove('show'); $('pause').classList.remove('show');
  G.state = 'play'; document.body.classList.add('playing');
  enterCamp();
  const S = Items.S;
  if (!S.story.intro) { S.story.intro = true; Items.save(); say(CFG.story.intro, () => openPanel('trainOffer')); }
}
// Run fn after `sec` seconds of game time (so pausing, slow motion and tests all respect it)
G.after = (sec, fn) => G.timers.push({ t: G.time + sec, fn });
function runTimers() { const due = G.timers.filter(t => G.time >= t.t); G.timers = G.timers.filter(t => G.time < t.t); for (const t of due) t.fn(); }
// Down into stage k (onward: pressing on from the last guardian, so the trip's gold stays at risk)
// ---------------- Day and night (the Hold and the Rim) ----------------
// S.clock runs while the warden is in the Hold or on the Rim; 0 is dawn, 0.25 noon, 0.5 dusk, 0.75 midnight. The sky,
// fog, light and sun follow it; below, the dungeon keeps its own light.
const DAY = CFG.day, BASE_LIGHT = { hemi: 0.55, moon: 0.5, moonC: 0xaab8e0 };
const dayT = () => { const S = Items.S; return S && S.clock !== undefined ? (S.clock / DAY.length) % 1 : DAY.start; };
const sunUp = () => Math.sin(dayT() * Math.PI * 2);                       // > 0 by day
G.isNight = () => sunUp() < -0.12;
G.timeName = () => { const s = sunUp(), t = dayT(); return s > 0.35 ? 'Day' : s < -0.12 ? 'Night' : t < 0.25 || t > 0.75 ? 'Dawn' : 'Dusk'; };
let dayOn = false, wasNight = null;
const cA = new THREE.Color(), cB = new THREE.Color();
function updateDay(dt) {
  const inWorld = World.inCamp() && G.state !== 'title';
  if (!inWorld) {
    if (dayOn) { dayOn = false; hemi.intensity = BASE_LIGHT.hemi; moon.intensity = BASE_LIGHT.moon; moon.color.setHex(BASE_LIGHT.moonC); G.torchK = 1; curseWorld(); }
    return;
  }
  dayOn = true;
  const S = Items.S; if (S.clock === undefined) S.clock = DAY.start * DAY.length;
  if (G.state === 'play') S.clock = (S.clock + dt) % DAY.length;
  const s = sunUp(), L = Math.max(0, Math.min(1, (s + 0.12) / 0.47)), warm = Math.max(0, 1 - Math.abs(s) / 0.3) * (s > -0.2 ? 1 : 0);
  // Sky and fog: night to day, with a warm band at dawn and dusk
  cA.setHex(DAY.sky.night).lerp(cB.setHex(DAY.sky.day), L).lerp(cB.setHex(DAY.sky.dusk), warm * 0.55);
  scene.fog.color.copy(cA); scene.background.copy(cA);
  hemi.color.setHex(DAY.hemi.night[0]).lerp(cB.setHex(DAY.hemi.day[0]), L); hemi.intensity = DAY.hemi.night[1] + (DAY.hemi.day[1] - DAY.hemi.night[1]) * L;
  moon.color.setHex(DAY.sun.night[0]).lerp(cB.setHex(DAY.sun.day[0]), L).lerp(cB.setHex(DAY.sun.dusk[0]), warm * 0.6);
  moon.intensity = DAY.sun.night[1] + (DAY.sun.day[1] - DAY.sun.night[1]) * L;
  scene.fog.near = DAY.fog.night[0] + (DAY.fog.day[0] - DAY.fog.night[0]) * L; scene.fog.far = DAY.fog.night[1] + (DAY.fog.day[1] - DAY.fog.night[1]) * L;
  G.torchK = 1 - L * 0.65;
  // Tell the warden when night falls and when the sun comes back
  const night = G.isNight();
  if (wasNight !== null && night !== wasNight && G.state === 'play') UI.toast(night ? '☾ Night falls. The dead stir in the Old Graveyard, and the wolves grow bold.' : '☀ Dawn. The dead go back to their graves.', night ? '#9aa8ff' : '#ffd890');
  wasNight = night;
}
G.onFieldBoss = (e, roused) => { if (roused) { G.boss = e; banner(e.fieldBoss.name.toUpperCase()); Snd.play('slam'); } else if (G.boss === e) G.boss = null; };
// Through the south gate and back: out on the Rim is a trip of its own (tonics drunk, gold at a little risk); back in
// the Hold the gold is banked and the tonics wear off
function checkRim() {
  const f = World.fieldAt(G.player.pos), out = !!f, want = out ? 'field' : 'camp';
  if (want === G.mode || Tutorial.active) return;
  G.mode = want;
  if (out) { Items.S.tripGold = 0; drinkTonics(); banner(f.name.toUpperCase()); }
  else { const g = Items.S.tripGold; Items.S.tripGold = 0; G.tonics = []; if (g) UI.toast(`Back in the Hold: ◆ ${g} banked`, '#ffd040'); }
  Player.refit(G.player, scene, false); Items.save(); $('waveN').textContent = World.label();
}
// Ysolde's tonics are drunk at the start of a trip and last until the warden is back in camp
function drinkTonics() { const S = Items.S; G.tonics = (S.tonics || []).slice(); S.tonics = []; if (G.tonics.length) UI.toast('Tonics: ' + G.tonics.map(id => CFG.camp.tonics.find(t => t.id === id).name).join(', '), '#9aff8a'); }
G.descend = (k, onward) => fadeTo(() => {
  clearEnemies(); G.blessings = []; G.run = null; G.arena = null; if (!onward) drinkTonics();
  const at = World.startStage(k); curseWorld();
  G.mode = 'dungeon'; G.stageK = k; if (!onward) Items.S.tripGold = 0;
  Player.refit(G.player, scene, true); Player.revive(G.player); placeHero(at);
  G.state = 'play'; $('waveN').textContent = World.label();
  const S = Items.S, st = CFG.story, si = k % CFG.stages.length, depth = Math.floor(k / CFG.stages.length);
  if (!S.story.pre[k]) {
    S.story.pre[k] = true; Items.save();
    const lines = st.pre[si].map(t => ['Maren', t]);
    if (depth) lines.unshift(['Maren', st.depth.replace('{n}', depth + 1)]);
    say(lines, null, 'Into the dark');
  }
});
// A guardian enters a new phase
G.onBossPhase = (e, ph) => { banner(ph.shout); G.rumble(0.6, 0.9, 500); };
// Gold from fallen enemies
G.onEnemyDeath = e => {
  G.stats.kills++; Codex.onKill(e);
  if (G.boss === e) G.boss = null;
  if (!Items.S || G.mode === 'camp') return;
  const xp = e.def.xp * e.mult * (e.champion ? 3 : e.guardian ? CFG.progress.guardianXp : e.elite ? CFG.elites.reward : 1), up = Items.addXp(xp);
  FX.text(Combat.chestPos(e.pos, 2.8), '+' + Math.round(xp) + ' xp', 'xp');
  if (up) levelUp(up);
  const g = Items.addGold(e.def.gold * e.mult * G.player.S.goldFind * (e.champion ? 3 : e.guardian ? 5 : e.elite ? CFG.elites.reward : 1));
  FX.text(Combat.chestPos(e.pos, 2.4), '+' + g + ' ◆', 'gold');
  if (e.elite && Math.random() < CFG.gear.gemDrop.elite) gemFound(1);
  // A field boss: its spoils, and when it comes back
  if (e.fieldBoss) {
    const B = e.fieldBoss, S = Items.S; S.fieldBoss = S.fieldBoss || {}; S.fieldBoss[B.id] = Date.now() + B.respawn * 1000;
    S.bossKills = S.bossKills || {}; S.bossKills[B.id] = (S.bossKills[B.id] || 0) + 1;
    for (const [k, n] of Object.entries(B.drops)) Items.addMat(k, n);
    const it = Items.generate(Math.min(S.stage + 1, CFG.gear.tierNames.length - 1), { minRarity: 2, boost: 1 });
    if (Items.add(it)) UI.toast(`${B.name} falls: ${Items.fullName(it)}`, Items.colorOf(it));
    gemFound(1); banner(B.name.toUpperCase() + ' FALLS'); Items.save();
  }
  // Materials: beasts of the Rim drop them; the dead below now and then
  for (const [k, ch] of (CFG.matDrops[e.type] || [])) if (Math.random() < ch * (e.zone ? 1 : 0.33)) { Items.addMat(k); const M = CFG.materials[k]; FX.text(Combat.chestPos(e.pos, 2.0), `+${M.icon} ${M.name}`, 'xp'); }
  if (e.type === 'mimic') {                                                // what a mimic swallowed
    gemFound(1);
    if (Math.random() < 0.6) { const it = Items.generate(Math.min(G.stageK || 0, CFG.gear.tierNames.length - 1), { minRarity: 1, boost: 0.6 }); if (Items.add(it)) UI.toast('The mimic coughs up: ' + Items.fullName(it), Items.colorOf(it)); }
  }
  const p = G.player; if (p.S.u && p.S.u.oath && p.state !== 'dead') { const h = p.maxHp * 0.05; p.hp = Math.min(p.maxHp, p.hp + h); FX.text(Combat.chestPos(p.pos, 2.4), '+' + Math.round(h), 'heal'); }
};
function levelUp(n) {
  const S = Items.S, p = G.player;
  banner('LEVEL ' + S.level); Snd.play('wave'); G.rumble(0.4, 0.8, 300);
  FX.ring(p.pos, 2.2, 0xffd040, 0.8, { r0: 0.3 }); FX.burst(Combat.chestPos(p.pos, 1.2), 0xffd040, 30, 6, 0.7);
  Player.refit(p, scene, false); p.hp = p.maxHp; p.st = p.maxSt;
  UI.toast(`Level ${S.level}: +${n} talent point${n > 1 ? 's' : ''} (T opens Expertise)`, '#ffd040');
  Items.save();
}
// Landed hits train the weapon type in hand
G.onHits = (n, crit) => {
  if (!Items.S || G.mode === 'camp') return;
  const p = G.player, r = Items.addMastery(p.S.weaponType, n * (crit ? 2 : 1));
  if (r) {
    const w = CFG.gear.weapons[p.S.weaponType].name, art = CFG.player.arts[p.S.weaponType];
    const perk = ['', '+4% damage', 'a fourth, finishing blow in the light combo', `+8% posture damage and the art ${art ? art.name : ''} (hold block, press heavy)`][r];
    UI.toast(`${w} mastery rank ${r}: ${perk}`, '#9ad8ff'); Player.refit(p, scene, false);
  }
};
// A cleared room's chest: gold, maybe gear; the guardian's chest always holds gear and unlocks the next stage
G.onChest = room => {
  const S = Items.S, big = room.chest.big, rich = room.chest.rich, k = room.inf.k, C = CFG.chest;
  const gold = Items.addGold((C.gold[0] + Math.random() * (C.gold[1] - C.gold[0])) * (1 + k * 0.6) * (big ? 4 : rich ? 2.5 : 1) * G.player.S.goldFind);
  FX.text(new THREE.Vector3(room.chest.x, 1.8, room.chest.z), '+' + gold + ' ◆', 'gold');
  FX.burst(new THREE.Vector3(room.chest.x, 0.8, room.chest.z), 0xffd040, 24, 5);
  let it = null;
  const tier = Math.min(k, CFG.gear.tierNames.length - 1), GC = CFG.gear;
  if ((big && Math.random() < GC.uniqueChance) || (rich && Math.random() < GC.uniqueRich)) it = Items.generateUnique(tier);
  else if (big || rich || Math.random() < C.itemChance) it = Items.generate(tier, { minRarity: big || rich ? 1 : 0, boost: big ? 1 : rich ? 0.7 : 0 });
  if (it) {
    if (Items.add(it)) UI.toast((it.uniq ? '★ UNIQUE: ' : 'Found: ') + Items.fullName(it) + (it.uniq ? '' : ' (' + GC.rarities[it.rarity].name + ')'), Items.colorOf(it));
    else UI.toast('Bag full: ' + Items.fullName(it) + ' broken down for scrap');
    if (it.uniq) { FX.ring(G.player.pos, 2.4, 0xff7a2a, 0.9, { r0: 0.3 }); Snd.play('wave'); }
  }
  if (Math.random() < GC.gemDrop.chest || big) G.after(it ? 1.2 : 0.2, () => gemFound(big ? GC.gemDrop.bigChest : 1));
  if (big && G.arena) { const A = G.arena, r = arenaPay(A); G.after(1.3, () => { if (G.arena) openPanel('arenaWon', Object.assign({ name: A.name }, r)); }); }
  else if (big && G.run) { Items.save(); G.after(1.3, () => { if (G.mode === 'dungeon' && G.run) G.onFloorCleared(); }); }
  else if (big) {
    S.stage = Math.max(S.stage, k + 1); S.best = Math.max(S.best, S.stage); Items.save();
    G.after(1.3, () => { if (G.mode === 'dungeon') openPanel('cleared', { k, guardian: room.inf.stage.guardian }); });
  } else Items.save();
};
// ---------------- World events: a raid on the gate, Sefa's caravan ----------------
// Now and then, a while after the warden comes home, a band marches up the Rim road and batters the south gate
function rollRaid() {
  const S = Items.S, R = CFG.raid;
  if (S.stage < R.from || Tutorial.active || Math.random() >= R.chance) return;
  G.raid = { on: false, at: G.time + R.delay[0] + Math.random() * (R.delay[1] - R.delay[0]) };
}
G.startRaid = () => {
  const f = World.field(), R = CFG.raid, S = Items.S, B = R.bands.find(b => S.stage <= b.upTo), gz = f.rect.z0 + 2.5;
  const zone = { id: 'gate', name: 'The south gate', x: 0, z: gz, r: 3 }, m = Field.multOf({ mult: 1 });
  G.raid = { on: true, gate: R.gate, zone, n: B.band.length + 1 };
  [B.chief].concat(B.band).forEach((type, k) => G.queue.push({ type, at: new THREE.Vector3((k % 3 - 1) * 2.4, 0, gz + 24 + Math.floor(k / 3) * 2.6), mult: m.mult, hpMult: m.hpMult, zone, raid: true, elite: k === 0, t: G.time + k * 0.15 }));
  banner('RAIDERS AT THE GATE'); Snd.play('horn'); G.after(1.8, () => Snd.play('bell')); G.rumble && G.rumble(0.5, 0.7, 500);
  UI.toast('Captain Rook: Raiders on the Rim road! To the south gate!', '#ff7a2a');
};
function updateRaid(dt) {
  const R = G.raid; if (!R || G.mode === 'dungeon') return;
  if (!R.on) { if (G.time >= R.at && G.state === 'play' && !UI.open && World.field()) G.startRaid(); return; }
  const band = G.enemies.filter(e => e.raid && e.state !== 'dead'), coming = G.queue.some(q => q.raid);
  // Raiders at the gate batter it (they turn on the warden when the warden comes out)
  for (const e of band) {
    if (e.aggro || Math.hypot(e.pos.x - R.zone.x, e.pos.z - R.zone.z) > R.zone.r + 1.5) continue;
    R.gate -= CFG.raid.batter * dt; e.batter = (e.batter || 0) - dt;
    if (e.batter <= 0 && e.state === 'hunt') { e.batter = 1.4 + Math.random(); e.facing = Math.PI; Enemy.startAttack(e, 0); if (Combat.dist(e.pos, G.player.pos) < 22) Snd.play('block'); }
  }
  const S = Items.S;
  if (!band.length && !coming) {                                         // the band is beaten: the Hold pays its warden
    const g = Items.addGold(CFG.raid.gold * (1 + S.stage * CFG.raid.perStage) * G.player.S.goldFind);
    for (const [k, n] of Object.entries(CFG.raid.mats)) Items.addMat(k, n);
    S.raids = (S.raids || 0) + 1; G.raid = null; Items.save();
    banner('THE GATE HOLDS'); Snd.play('achieve'); UI.toast(`The raiders are beaten: ◆ ${g}, ${Object.entries(CFG.raid.mats).map(([k, n]) => CFG.materials[k].icon + n).join(' ')}`, '#ffd040');
    return;
  }
  if (R.gate <= 0) {                                                     // the gate breaks: they grab what they can and run
    const lost = Math.min(CFG.raid.stealMax, Math.floor(S.gold * CFG.raid.steal)); S.gold -= lost;
    for (const e of band) { e.remove = true; FX.burst(Combat.chestPos(e.pos, 1), 0x8a7a5a, 10, 3); if (G.lock === e) G.lock = null; }
    G.queue = G.queue.filter(q => !q.raid); G.raid = null; Items.save();
    banner('THE GATE IS BROKEN'); Snd.play('lose'); UI.toast(`The raiders broke the gate and ran off with ◆ ${lost}`, '#ff5a4a');
    return;
  }
  $('foesN').textContent = `Raid: ${band.length + G.queue.filter(q => q.raid).length} · gate ${Math.ceil(R.gate / CFG.raid.gate * 100)}%`;
}
// Sefa's caravan: now and then camped in the Hold when the warden comes home, for two homecomings
function wandererComes() {
  const S = Items.S, W = CFG.wanderer;
  if (S.wander && S.wander.left > 0) { S.wander.left--; return; }
  S.wander = null;
  if (S.stage < W.from || Math.random() >= W.chance) return;
  const tier = Math.min(S.stage + 1, CFG.gear.tierNames.length - 1), b = W.bundles.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  S.wander = { left: W.stays - 1, items: [0, 1].map(() => Items.generate(tier, { minRarity: 2, boost: 0.8 })), bundles: b.map(x => Object.assign({}, x)), gem: Items.randomGem() };
  G.after(2, () => UI.toast("Sefa's caravan has stopped in the Hold (north-west, by the smithy)", '#5ad8c8'));
}
// ---------------- The Ring ----------------
// Varga's arena by the dummies: one lair, one foe. Guardians already beaten, the big monsters of the Rim once one has
// fallen out there, and the Abomination for whoever has beaten all three in the Ring.
G.arenaList = () => {
  const S = Items.S, won = S.arena || {}, kills = S.bossKills || {}, out = [], top = Math.min(S.stage, CFG.stages.length);
  CFG.stages.slice(0, top).forEach((st, si) => out.push({ id: 'g' + si, name: st.guardian, si, lvl: si, theme: st.theme, won: won['g' + si] || 0 }));
  for (const M of CFG.arena.monsters) {
    const B = CFG.monsterBosses[M.id], beaten = CFG.arena.monsters.filter(m => !m.final).every(m => won[m.id]);
    const open = M.final ? beaten : (kills[M.unlock] || 0) > 0, hint = M.final ? 'Beat the others in the Ring' : 'Fell ' + ((CFG.field.bosses.concat(CFG.fen.bosses).find(b => b.id === M.unlock) || {}).name || '').replace(/^The /, 'the ') + (M.fen ? ' in the Fen' : ' on the Rim');
    out.push({ id: M.id, name: B.name, monster: M.id, kind: M.kind, lvl: Math.max(0, top - 1) + (M.final ? 2 : 0), theme: M.theme, won: won[M.id] || 0, locked: !open && hint, final: !!M.final });
  }
  return out;
};
const arenaGold = A => Math.round(CFG.arena.gold * (1 + A.lvl * 0.6) * (A.won ? 1 : CFG.arena.first) * (A.final ? 2 : 1));
function arenaPay(A) {
  const S = Items.S; S.arena = S.arena || {}; const first = !S.arena[A.id];
  S.arena[A.id] = (S.arena[A.id] || 0) + 1;
  const gold = Items.addGold(arenaGold(A) * G.player.S.goldFind), gem = Items.randomGem(); Items.addGem(gem); Items.save();
  return { gold, gem, first };
}
G.enterArena = A => fadeTo(() => {
  clearEnemies(); G.blessings = []; G.run = null; drinkTonics(); Items.S.tripGold = 0;
  const st = A.si !== undefined ? CFG.stages[A.si] : null, g = st && st.rooms.find(r => r.guardian);
  const def = { name: 'The Ring · ' + A.name, theme: A.theme, guardian: A.name, monster: A.monster, rooms: [{ size: g ? g.size.slice() : [10, 9], guardian: true, waves: g ? g.waves.map(w => w.slice()) : [[A.kind]] }] };
  G.arena = A;
  const at = World.startCustom(def, { si: A.si || 0, k: A.lvl, mult: 1 + CFG.stageScale * A.lvl, hpMult: 1 + CFG.stageHp * A.lvl });
  G.mode = 'dungeon'; G.stageK = A.lvl; curseWorld();
  Player.refit(G.player, scene, true); Player.revive(G.player); placeHero(at);
  G.state = 'play'; $('waveN').textContent = World.label();
});
G.arenaGold = arenaGold;
// ---------------- The Endless Deep ----------------
// A climb (G.run): floor after floor from Endless.start; between floors, deeper or home
G.enterEndless = (daily, curses) => { G.arena = null; drinkTonics(); G.run = Endless.newRun(daily, curses); Items.S.tripGold = 0; G.goFloor(); };
// Is this curse on the current Endless climb?
G.cursed = id => !!(G.run && G.run.curses && G.run.curses.includes(id));
// Lightless closes the fog in and hides the map; anywhere else the air is as usual
function curseWorld() {
  const dark = G.cursed('dark');
  scene.fog.near = dark ? 5 : 18; scene.fog.far = dark ? 15 : 38;
  document.body.classList.toggle('lightless', dark);
}
G.goFloor = () => fadeTo(() => {
  clearEnemies(); G.blessings = [];
  const at = Endless.start(G.run);
  G.mode = 'dungeon'; G.stageK = CFG.stages.length - 1 + G.run.floor;
  Endless.record(G.run); Items.save();
  Player.refit(G.player, scene, G.run.floor === 1); Player.revive(G.player);
  if (G.run.floor > 1) { const p = G.player; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3); if (!G.cursed('dry')) p.flasks = Math.max(p.flasks, 1); }
  placeHero(at); G.state = 'play'; $('waveN').textContent = World.label(); curseWorld();
  if (G.run.curses.length) UI.toast('Cursed: ' + G.run.curses.map(id => { const c = CFG.curses.find(x => x.id === id); return c.icon + ' ' + c.name; }).join(', ') + ` · +${Math.round(Endless.curseGold(G.run.curses) * 100)}% gold`, '#c06aff');
  if (at.lair) UI.toast('A guardian waits at the end of this floor', '#ff7a2a');
});
G.onFloorCleared = () => { if (G.run && !UI.open) openPanel('deeper', { floor: G.run.floor, daily: G.run.daily }); };
G.goDeeper = () => { G.run.floor++; G.goFloor(); };
// Loose gems go to the pouch; Bram sets them into sockets
function gemFound(n) {
  const got = [];
  for (let i = 0; i < n; i++) { const k = Items.randomGem(); Items.addGem(k); got.push(CFG.gear.gems[k].icon + ' ' + CFG.gear.gems[k].name); }
  UI.toast('Gem: ' + got.join(', '), '#9ad8ff'); Items.save();
}
G.returnToCamp = () => fadeTo(() => {
  const k = G.stageK; enterCamp(); G.state = 'play';
  const S = Items.S, si = k % CFG.stages.length;
  if (!S.story.post[k] && k < CFG.stages.length) { S.story.post[k] = true; Items.save(); say(CFG.story.post[si].map(t => ['Maren', t])); }
  else { S.story.post[k] = true; Items.save(); }
});
// Press on: down the stair behind the fallen guardian into the next stage
G.pressOn = () => G.descend(G.stageK + 1, true);
G.onPlayerDeath = () => {
  Snd.play('lose'); Items.S.deaths++;
  G.after(1.6, () => {
    const S = Items.S, lost = Math.floor(S.tripGold * (G.mode === 'field' ? CFG.field.deathGoldLoss : CFG.camp.deathGoldLoss));   // the Rim costs less
    S.gold = Math.max(0, S.gold - lost); S.tripGold = 0; Items.save();
    openPanel('fallen', { lost, where: 'Fell in ' + World.label() });
  });
};
G.wakeInCamp = () => fadeTo(() => { enterCamp(); G.state = 'play'; });
// Gear changed in a menu: new numbers and looks; a camp building rebuilds the camp around the hero
G.onGearChanged = campChanged => {
  const inCamp = G.mode === 'camp';
  Player.refit(G.player, scene, inCamp);
  if (campChanged && inCamp) { World.enterCamp(); }
};
// Talk to whoever is near in camp
function interact() {
  const s = G.spot; if (!s || G.state !== 'play') return;
  Player.revive(G.player);
  if (s.id === 'elder') {
    const S = Items.S, k = S.stage, si = k % CFG.stages.length, depth = Math.floor(k / CFG.stages.length);
    const lines = [['Maren', depth ? CFG.story.depth.replace('{n}', depth + 1) : 'Next is ' + CFG.stages[si].name + '.'], ...CFG.story.pre[si].map(t => ['Maren', t])];
    if (S.gold >= 90) lines.push(['Maren', 'You carry gold. The ledger by the fire turns gold into a stronger camp.']);
    return say(lines);
  }
  if (s.id === 'shrine') return openPanel('shrine', { shrine: s.shrine, offers: Props.offer() });
  if (s.id === 'captive') {                                               // freed: they make their way to the Hold
    Props.free(s.captive); const who = Items.rescue(), P = CFG.rescues.people.find(p => p.id === who.id);
    Items.S.rescued[Items.S.rescued.length - 1].where = World.label().split(' · ')[0];      // remembered: where the warden found them
    Snd.play('shrine'); Codex.add && Codex.add('rescues'); Items.save(); G.spot = null;
    return say([[who.name, P ? 'You came for me? I thought the Deep had me for good. I will find my way to the Hold.' : 'Thank you, warden. I will go home to the Hold.']].concat(P ? [['', 'Rescued ' + who.name + ': ' + P.perk + '.']] : []));
  }
  if (s.id === 'gather') {                                                // a herb patch or an ore vein on the Rim
    const n = Field.gather(s.node), M = CFG.materials[s.node.kind];
    if (n) { Snd.play('glint'); FX.text(Combat.chestPos(G.player.pos, 2.2), `+${n} ${M.icon} ${M.name}`, 'xp'); Items.save(); }
    return;
  }
  if (s.id === 'bard' || s.id === 'guard') {                              // the townsfolk say their lines in turn
    const S = Items.S, [who, lines] = CFG.townsfolk[s.id]; S.talk = S.talk || {}; const i = (S.talk[s.id] || 0) % lines.length; S.talk[s.id] = i + 1;
    return say([[who, lines[i]]]);
  }
  if (s.id === 'trainer') return openPanel('trainer');
  if (s.id === 'eastgate') return say([['Captain Rook', `The east gate stays barred until the first ${CFG.fen.unlock} guardians are down. The Fen is no place for a new warden.`]]);
  openPanel(s.id);
}
// The training yard: Hobb's six lessons, in camp
G.startTraining = () => { if (G.mode !== 'camp') return; G.state = 'play'; Tutorial.begin(); };
G.onTrained = () => showTip('Ready. The gate north of the fire leads down into the Deep. Bram, Tilda and Maren can help before you go.');
// A blessing chosen at a shrine: it lasts until the hero leaves the stage
G.bless = (id, shrine) => {
  (G.blessings = G.blessings || []).push(id); if (shrine) shrine.used = true; Codex.add('shrines');
  Player.refit(G.player, scene, false); Snd.play('shrine');
  const b = CFG.blessings.find(x => x.id === id); UI.toast(`${b.icon} ${b.name}: ${b.desc}`, '#9ad8ff');
  FX.ring(G.player.pos, 2, 0x9ad8ff, 0.8, { r0: 0.3 });
};
// The title: Continue plays the last-used slot; Saves (or Begin, with no saves at all) opens the three slots
function anySave() { for (let n = 1; n <= Items.SLOTS; n++) if (Items.slotInfo(n)) return true; return false; }
function titleButtons() {
  const cont = Items.hasSave() && !!Items.slotInfo(Items.slot);
  $('contBtn').style.display = cont ? '' : 'none';
  $('startBtn').textContent = anySave() ? 'Saves' : 'Begin'; $('startBtn').classList.toggle('quiet', cont);
}
function openSaves() {
  if (UI.open) return;
  $('title').classList.remove('show'); G.state = 'menu';
  UI.show('saves', {}, () => { if (G.state === 'menu') { G.state = 'title'; $('title').classList.add('show'); titleButtons(); } });
}
// From the saves screen: play a slot, or start a new game in it
G.playSlot = (n, fresh) => { Items.useSlot(n); while (UI.open) UI.close(); startGame(fresh ? 'new' : 'continue'); };
$('startBtn').addEventListener('click', () => { Snd.init(); if (anySave()) openSaves(); else startGame('new'); });
$('contBtn').addEventListener('click', () => startGame('continue'));
titleButtons();
// The keyboard hint line along the bottom follows the player's keys
function keysBar() {
  const k = a => `<b>${Bindings.label(a, 'key')}</b>`;
  $('keys').innerHTML = `<span class="vb">Mouse look · </span>${['up', 'left', 'down', 'right'].map(a => Bindings.label(a, 'key')).join('')} move · ${k('light')}/click attack · ${k('heavy')} heavy · ${k('block')}/right-click block · ${k('dodge')} dash · ${k('flask')} flask · ${k('ult')} ultimate · ${k('interact')} talk · ${k('gear')} gear · ${k('talents')} talents · ${k('camera')} camera · ${k('lock')} lock on`;
}
keysBar(); Settings.on(key => { if (key === 'keys') keysBar(); });

// ---------------- Camera ----------------
const camTarget = new THREE.Vector3(0, 0, 2);
function turnView(dx, dy) {
  const k = Settings.get('sens');
  if (!G.lock) View.yaw -= dx * k;                                         // while locked on, the camera keeps the target in view
  View.pitch = Math.min(1.25, Math.max(0.08, View.pitch + dy * k * (Settings.get('invertY') ? -1 : 1)));
}
function toggleView() {
  View.mode = View.mode === 'behind' ? 'top' : 'behind';
  try { localStorage.setItem('dw_view', View.mode); } catch (e) {}
  if (View.mode === 'top' && document.pointerLockElement) document.exitPointerLock();
  if (View.mode === 'behind' && G.player) View.yaw = G.player.facing + Math.PI;     // start behind the hero
  updateViewUi();
  if (G.state === 'play') showTip(View.mode === 'behind' ? 'Behind view: the mouse (or a drag on the right side) turns the camera, and you move by strafing. Press B for the top-down view.' : 'Top-down view: you face the way you walk. Press B for the behind view.');
}
function updateViewUi() {
  $('viewBtn').textContent = View.mode === 'behind' ? '🎥' : '🗺';
  $('viewBtn').title = (View.mode === 'behind' ? 'Behind view' : 'Top-down view') + ' - switch (B)';
  document.body.classList.toggle('behind', View.mode === 'behind');
}
const camLook = new THREE.Vector3();
// The behind view uses a wider lens, wider still on a tall phone screen so enemies at the sides stay in frame
function setFov(f) { if (camera.fov !== f) { camera.fov = f; camera.updateProjectionMatrix(); } }
function updateCamera(dt) {
  if (View.mode === 'behind') return updateBehindCamera(dt);
  const p = G.player, portrait = innerHeight > innerWidth;
  setFov(42);
  const want = p ? p.pos : new THREE.Vector3(0, 0, 0);
  camTarget.lerp(want, 1 - Math.exp(-6 * dt));
  // Stay framed on the section the hero is in (in a passage, just follow)
  const r = p && World.roomOf(p.pos);
  let tx = camTarget.x, tz = camTarget.z;
  if (r && r.kind !== 'field') { const lx = Math.max(0, r.hw - 4), lz = Math.max(0, r.hd - 3.5), cx = r.cx || 0; tx = Math.max(cx - lx, Math.min(cx + lx, tx)); tz = Math.max(r.cz - lz - 1, Math.min(r.cz + lz, tz)); }
  const k = portrait ? 1.3 : 1, s = FX.shakeAmt;
  camera.position.set(tx + (Math.random() - 0.5) * s, 10.8 * k + (Math.random() - 0.5) * s, tz + 8.2 * k);
  camera.lookAt(tx, 0.6, tz - 0.4);
}

function updateBehindCamera(dt) {
  const p = G.player, portrait = innerHeight > innerWidth;
  camTarget.lerp(p.pos, 1 - Math.exp(-14 * dt));
  setFov(portrait ? 72 : 55);
  const want = View.dist * (portrait ? 1.15 : 1), sy = Math.sin(View.yaw) * Math.cos(View.pitch), sz = Math.cos(View.yaw) * Math.cos(View.pitch);
  // Near a wall the camera slides in toward the hero instead of looking through it: find (by halving) the longest
  // distance that keeps it a little inside the room, then ease toward it - quickly when a wall closes in, gently when
  // it opens up again - so backing into a wall is a smooth push-in, not a flicker between distances.
  const inside = d => World.inSpace(camTarget.x + sy * d, camTarget.z + sz * d, -0.35);
  let fit = want;
  if (!inside(want)) { let lo = 0.8, hi = want; for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (inside(mid)) lo = mid; else hi = mid; } fit = lo; }
  View.curDist = View.curDist || want;
  View.curDist += (fit - View.curDist) * Math.min(1, dt * (fit < View.curDist ? 16 : 3));
  const d = Math.min(View.curDist, fit + 0.05), close = Math.max(0, 1 - d / want);
  const s = FX.shakeAmt;
  camera.position.set(camTarget.x + sy * d + (Math.random() - 0.5) * s, View.LOOK_H + Math.sin(View.pitch) * d + close * 0.9 + (Math.random() - 0.5) * s, camTarget.z + sz * d);
  camLook.set(camTarget.x, View.LOOK_H, camTarget.z);
  camera.lookAt(camLook);
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------------- Main loop ----------------
let last = performance.now();
const idleRig = (() => { const r = Rig.build('hero', { look: Items.S ? Items.look() : {} }); r.root.position.set(1.7, 0, 3.3); r.root.rotation.y = -2.5; scene.add(r.root); return r; })();
// Frame timing: an average frame time for the performance readout and the automatic resolution. Each second is one
// window; two slow windows in a row (over 22 ms, under ~45 FPS) drop the resolution a step, six quick ones (under
// 17.5 ms) raise it. Only frames in play count, and a frame over 0.25 s (the app was away) is ignored.
const Perf = { ms: 16.7, win: 0, n: 0, sum: 0, slow: 0, quick: 0, shown: 0 };
function perfTick(ms) {
  if (ms > 250) return;
  Perf.ms += (ms - Perf.ms) * 0.05;
  if (G.state === 'play') { Perf.sum += ms; Perf.n++; }
  if ((Perf.win += ms) < 1000) return;
  const avg = Perf.n ? Perf.sum / Perf.n : 0;
  Perf.win = Perf.sum = Perf.n = 0;
  if (avg && Settings.get('autoRes')) {
    if (avg > 22) { Perf.quick = 0; if (++Perf.slow >= 2 && resScale > 0.5) { resScale = Math.max(0.5, +(resScale - 0.15).toFixed(2)); Perf.slow = 0; applyQuality(); } }
    else if (avg < 17.5) { Perf.slow = 0; if (++Perf.quick >= 6 && resScale < 1) { resScale = Math.min(1, +(resScale + 0.1).toFixed(2)); Perf.quick = 0; applyQuality(); } }
    else Perf.slow = Perf.quick = 0;
  }
  if (Settings.get('perf')) {
    const info = renderer.info.render;
    $('perf').textContent = `${Math.round(1000 / Perf.ms)} FPS · ${Perf.ms.toFixed(1)} ms · ${info.calls} draws · ${Math.round(info.triangles / 1000)}k tris · ${quality()} ×${resScale.toFixed(2)} res`;
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const ms = Math.max(0, now - last), real = Math.min(0.05, ms / 1000); last = now;
  step(real);
  renderer.render(scene, camera);
  perfTick(ms);
}
// Switching away from the app (or the tab) pauses the fight and holds the sound until you come back
$('perf').classList.toggle('show', !!Settings.get('perf'));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (G.state === 'play') togglePause(); Snd.hold(true); }
  else Snd.hold(false);
});
function step(real) {
  pollPad(real);
  Snd.music(musicMood(), G.boss && G.boss.bossIdx !== undefined ? G.boss.bossIdx : null);
  updateAir(real);
  const focus = G.player && G.state !== 'title' ? G.player.pos : new THREE.Vector3(0, 0, 2);
  dust.position.set(focus.x, 0, focus.z); dust.rotation.y += real * 0.01;
  aimMoon(focus);
  if (G.state === 'play') {
    readInput();
    const dt = FX.scaleDt(real);
    G.time += dt;
    Player.update(G.player, dt);
    for (const e of G.enemies) Enemy.update(e, dt);
    resolveCollisions();
    World.update(dt, camera.position);
    if (World.inCamp()) checkRim();
    updateDay(dt);
    updateSpawns(); updateRaid(dt);
    Enemy.updateArrows(dt);
    runTimers();
    FX.update(dt);
    updateHud();
    Tutorial.update();
    Codex.check(real);
    updateLock(real);
    updateCamera(real);
    MiniMap.draw(real);
  } else if (G.state === 'cine') {
    // A guardian's entrance: the world holds its breath, the camera swings to it, then hands back
    const c = G.cine; c.t += real; G.time += real;
    Enemy.update(c.e, real); World.update(real, camera.position); updateSpawns(); FX.update(real); updateHud();
    Rig.animate(G.player.rig, { mode: 'idle', t: c.t, speed: 0 }, real);
    const e = c.e, f = e.facing, k = Math.min(1, c.t / 0.6), out = Math.max(0, (c.t - c.dur + 0.5) / 0.5);
    const want = new THREE.Vector3(e.pos.x + Math.sin(f) * 5.5 + Math.cos(f) * 1.5, 1.6 + 1.2 * e.def.scale, e.pos.z + Math.cos(f) * 5.5 - Math.sin(f) * 1.5);
    camera.position.lerp(want, Math.min(1, real * 4 * (1 - out) + k * 0.02));
    camera.lookAt(e.pos.x, 1.2 * e.def.scale, e.pos.z);
    if (c.t >= c.dur) endCine();
  } else if (G.state === 'title' || !G.player) {                          // the title scene (also behind settings opened from it)
    World.update(real);
    Rig.animate(idleRig, { mode: 'idle', t: 0, speed: 0, calm: true }, real);
    camTarget.set(0, 0, 2); setFov(42);
    camera.position.set(-0.6, 2.2, 7.8); camera.lookAt(0.2, 1.2, 2.4);
  } else if (G.state === 'menu') {
    World.update(real, camera.position);                                 // gates, fades and the camp keep moving behind menus
    updateCamera(real);
  }
  if (G.state !== 'title' && G.player && idleRig.root.parent) scene.remove(idleRig.root);
}
requestAnimationFrame(frame);

// Test hook: lets automated tests drive the game without a real input device
window.__dw = {
  G, Input, CFG, step,
  start: startGame, openSettings, musicMood, View, World, scene, camera, renderer, Items, UI, interact, openPanel,
  // Tests: a fresh hero standing in the first room of stage k, no story, no fade
  arena(k = 0) { Items.wipe(); startGame('new'); while (UI.open) UI.close(); clearEnemies(); const at = World.startStage(k); G.mode = 'dungeon'; G.stageK = k; placeHero(at); G.state = 'play'; },
  sceneSize: () => scene.children.length,
  openSaves, titleButtons,
  perf: () => ({ resScale, pr: renderer.getPixelRatio(), text: $('perf').textContent }), perfTick, togglePause,
  setView(m) { if (View.mode !== m) toggleView(); },
  spawn(type, x = 0, z = -3) { const e = Enemy.spawn(scene, type, new THREE.Vector3(x, 0, z), 1); G.enemies.push(e); return e; },
  press(act) { Player.press(G.player, act); },
  sim(seconds, fn) { for (let t = 0; t < seconds; t += 1 / 60) { if (fn && fn(t) === true) break; step(1 / 60); } renderer.render(scene, camera); },
};
