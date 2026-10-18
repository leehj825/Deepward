// Deepward - scene, camera, input (keyboard / mouse / touch), HUD, game flow and the main loop.
// The dungeon itself (rooms, gates, progression) lives in world.js.
const G = {
  state: 'title', time: 0, player: null, enemies: [], queue: [],
  stats: { kills: 0, parries: 0, crits: 0, dodges: 0, hitsTaken: 0, rooms: 0 }, seen: {},
  onEnemyDeath(e) { G.stats.kills++; },
  onPlayerDeath() { setTimeout(showGameOver, 1600); Snd.play('lose'); },
};

// ---------------- Camera view ----------------
// 'behind': an orbit camera over the hero's shoulder (mouse / right-thumb drag turns it, the hero faces where it looks
// and moves by strafing). 'top': the fixed high quarter view, where the hero faces the way it walks.
const View = { mode: 'behind', yaw: 0, pitch: 0.42, dist: 7, LOOK_H: 1.5 };
try { if (localStorage.getItem('dw_view') === 'top') View.mode = 'top'; } catch (e) {}

// ---------------- Input ----------------
const Input = { move: { x: 0, z: 0 }, block: false, keys: {}, mouseBlock: false, touchBlock: false, stick: { x: 0, z: 0 } };
(function setupInput() {
  const KEYMAP = { KeyJ: 'light', KeyK: 'heavy', KeyQ: 'heavy', Space: 'dodge' };
  addEventListener('keydown', ev => {
    Snd.init();
    if (ev.repeat) return;
    Input.keys[ev.code] = true;
    if (ev.code === 'KeyM') toggleMute();
    if (ev.code === 'KeyB') toggleView();
    // (an Esc that just released the captured mouse has already paused)
    if ((ev.code === 'Escape' && performance.now() - (Input.unlockedAt || 0) > 200) || ev.code === 'KeyP') togglePause();
    if (ev.code === 'Enter' && G.state !== 'play') startGame();
    if (KEYMAP[ev.code] && G.state === 'play') { Player.press(G.player, KEYMAP[ev.code]); ev.preventDefault(); }
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
    if (ev.pointerType !== 'touch') return;
    if (ev.clientX > innerWidth * 0.45) { if (lookId === null) { lookId = ev.pointerId; lx = ev.clientX; ly = ev.clientY; } return; }
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
      if (act === 'block') Input.touchBlock = true; else Player.press(G.player, act);
    });
    const up = () => { b.classList.remove('on'); if (act === 'block') Input.touchBlock = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  }
})();
function readInput() {
  const k = Input.keys;
  let x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
  let z = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
  if (Math.abs(Input.stick.x) + Math.abs(Input.stick.z) > 0.1) { x = Input.stick.x; z = Input.stick.z; }
  if (View.mode === 'behind') {
    // Screen up = away from the camera, screen right = the camera's right
    const fx = -Math.sin(View.yaw), fz = -Math.cos(View.yaw), rx = Math.cos(View.yaw), rz = -Math.sin(View.yaw);
    const wx = rx * x - fx * z, wz = rz * x - fz * z; x = wx; z = wz;
  }
  Input.move.x = x; Input.move.z = z;
  Input.block = !!(k.KeyL || k.ShiftLeft || k.ShiftRight || Input.mouseBlock || Input.touchBlock);
}

// ---------------- Scene ----------------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
function aimMoon(at) { moon.position.set(at.x - 6, 16, at.z + 8); moon.target.position.set(at.x, 0, at.z); }

// Drifting dust motes that travel with the hero
const dust = (() => {
  const N = 160, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() * 2 - 1) * 11; pos[i * 3 + 1] = Math.random() * 4; pos[i * 3 + 2] = (Math.random() * 2 - 1) * 11; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const d = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd8a0, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(d); return d;
})();

World.init(scene, hemi);
World.reset();

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
  // The hero may use any open space; enemies stay inside the room they were spawned in
  for (const b of bodies) World.constrain(b.pos, rad(b), b === p ? null : b.room);
}

// ---------------- Spawning ----------------
// World queues enemies with a time; they appear here (so pausing and tests use game time)
function updateSpawns() {
  G.enemies = G.enemies.filter(e => { if (e.remove) { Enemy.dispose(e, scene); return false; } return true; });
  G.queue = G.queue.filter(q => {
    if (G.time < q.t) return true;
    const e = Enemy.spawn(scene, q.type, q.at, q.mult);
    e.room = q.room;
    if (q.guardian) { e.guardian = true; e.rig.root.scale.multiplyScalar(1.15); e.bar.classList.add('guardian'); }
    G.enemies.push(e);
    return false;
  });
  const alive = G.enemies.filter(e => e.state !== 'dead').length;
  document.getElementById('waveN').textContent = World.label();
  document.getElementById('foesN').textContent = alive ? alive + (alive === 1 ? ' foe' : ' foes') : '';
}

// ---------------- HUD ----------------
const $ = id => document.getElementById(id);
let bannerT = null, tipT = null;
function banner(txt) { const b = $('banner'); b.textContent = txt; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 1800); }
function showTip(txt) {
  if (!txt) return;
  if (document.body.classList.contains('touch')) txt = txt.replace(/\s*\([^)]*\)/g, '');   // key names in brackets mean nothing on a touch screen
  const t = $('tip'); t.textContent = txt; t.classList.add('show'); clearTimeout(tipT); tipT = setTimeout(() => t.classList.remove('show'), 7000); }
function updateHud() {
  const p = G.player;
  $('hpFill').style.width = p.hp / p.maxHp * 100 + '%';
  $('hpTxt').textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
  $('stFill').style.width = p.st / p.maxSt * 100 + '%';
  $('stBar').classList.toggle('empty', p.st < 1);
  for (const e of G.enemies) Enemy.updateBar(e);
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
$('resumeBtn').addEventListener('click', () => { togglePause(); if (View.mode === 'behind' && !document.body.classList.contains('touch')) { const cv = $('game'); if (cv.requestPointerLock) cv.requestPointerLock(); } });
function bestRooms() { try { return +localStorage.getItem('dw_best_rooms') || 0; } catch (e) { return 0; } }
function showGameOver() {
  G.state = 'over';
  if (document.pointerLockElement) document.exitPointerLock();
  const s = G.stats, best = Math.max(bestRooms(), s.rooms);
  try { localStorage.setItem('dw_best_rooms', best); } catch (e) {}
  $('overStats').innerHTML = `Fell in <b>${World.label()}</b><br>${s.rooms} rooms cleared (best ${best})<br>${s.kills} kills · ${s.parries} parries · ${s.crits} criticals · ${s.dodges} dodges`;
  $('over').classList.add('show');
}

// ---------------- Game flow ----------------
function startGame() {
  Snd.init();
  for (const e of G.enemies) Enemy.dispose(e, scene);
  G.enemies = []; G.queue = [];
  if (G.player) { scene.remove(G.player.rig.root); scene.remove(G.player.trail.mesh); }
  FX.clear();
  World.reset();
  G.player = Player.create(scene);
  G.time = 0; G.seen = {};
  G.stats = { kills: 0, parries: 0, crits: 0, dodges: 0, hitsTaken: 0, rooms: 0 };
  $('title').classList.remove('show'); $('over').classList.remove('show'); $('pause').classList.remove('show');
  G.state = 'play'; document.body.classList.add('playing');
  View.yaw = 0; View.pitch = 0.42; camTarget.copy(G.player.pos);
  World.begin();
}
$('startBtn').addEventListener('click', startGame);
$('retryBtn').addEventListener('click', startGame);

// ---------------- Camera ----------------
const camTarget = new THREE.Vector3(0, 0, 2);
function turnView(dx, dy) {
  View.yaw -= dx;
  View.pitch = Math.min(1.25, Math.max(0.08, View.pitch + dy));
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
  // Stay framed on the room the hero is in (in a corridor, just follow)
  const r = p && World.roomOf(p.pos);
  let tx = camTarget.x, tz = camTarget.z;
  if (r) { const lx = Math.max(0, r.hw - 4), lz = Math.max(0, r.hd - 3.5); tx = Math.max(-lx, Math.min(lx, tx)); tz = Math.max(r.cz - lz - 1, Math.min(r.cz + lz, tz)); }
  const k = portrait ? 1.3 : 1, s = FX.shakeAmt;
  camera.position.set(tx + (Math.random() - 0.5) * s, 10.8 * k + (Math.random() - 0.5) * s, tz + 8.2 * k);
  camera.lookAt(tx, 0.6, tz - 0.4);
}

function updateBehindCamera(dt) {
  const p = G.player, portrait = innerHeight > innerWidth;
  camTarget.lerp(p.pos, 1 - Math.exp(-14 * dt));
  setFov(portrait ? 72 : 55);
  let d = View.dist * (portrait ? 1.15 : 1);
  const cx = () => camTarget.x + Math.sin(View.yaw) * Math.cos(View.pitch) * d, cz = () => camTarget.z + Math.cos(View.yaw) * Math.cos(View.pitch) * d;
  // Pull in toward the hero rather than look through a wall
  for (let i = 0; i < 20 && !World.inSpace(cx(), cz()) && d > 1.5; i++) d *= 0.9;
  const s = FX.shakeAmt;
  camera.position.set(cx() + (Math.random() - 0.5) * s, View.LOOK_H + Math.sin(View.pitch) * d + (Math.random() - 0.5) * s, cz());
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
const idleRig = (() => { const r = Rig.build('hero'); r.root.position.set(0, 0, 2); r.root.rotation.y = 0.4; scene.add(r.root); return r; })();
function frame(now) {
  requestAnimationFrame(frame);
  const real = Math.min(0.05, (now - last) / 1000); last = now;
  step(real);
  renderer.render(scene, camera);
}
function step(real) {
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
    updateSpawns();
    FX.update(dt);
    updateHud();
    updateCamera(real);
  } else if (G.state === 'title') {
    World.update(real);
    Rig.animate(idleRig, { mode: 'idle', t: 0, speed: 0 }, real);
    camTarget.set(0, 0, 2); setFov(42);
    camera.position.set(2.5, 2.4, 6.6); camera.lookAt(0, 1.1, 2);
  } else if (G.state === 'over') {
    const dt = real; G.time += dt;
    Player.update(G.player, dt);
    for (const e of G.enemies) Enemy.update(e, dt);
    World.update(dt, camera.position); FX.update(dt); updateHud(); updateCamera(real);
  }
  if (G.state !== 'title' && idleRig.root.parent) scene.remove(idleRig.root);
}
requestAnimationFrame(frame);

// Test hook: lets automated tests drive the game without a real input device
window.__dw = {
  G, Input, CFG, step,
  start: startGame, View, World, scene, camera, renderer,
  sceneSize: () => scene.children.length,
  setView(m) { if (View.mode !== m) toggleView(); },
  spawn(type, x = 0, z = -3) { const e = Enemy.spawn(scene, type, new THREE.Vector3(x, 0, z), 1); G.enemies.push(e); return e; },
  press(act) { Player.press(G.player, act); },
  sim(seconds, fn) { for (let t = 0; t < seconds; t += 1 / 60) { if (fn && fn(t) === true) break; step(1 / 60); } renderer.render(scene, camera); },
};
