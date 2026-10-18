// Deepward - scene, dungeon arena, camera, input (keyboard / mouse / touch), HUD, waves and the main loop.
// Milestone 1: a combat sandbox arena that sends waves of skeletons, shield knights and brutes.
const G = {
  state: 'title', time: 0, player: null, enemies: [], queue: [], wave: 0, waveT: 0, between: false,
  stats: { kills: 0, parries: 0, crits: 0, dodges: 0, hitsTaken: 0 }, seen: {},
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

scene.add(new THREE.HemisphereLight(0x6a7aa0, 0x1a1210, 0.55));
const moon = new THREE.DirectionalLight(0xaab8e0, 0.55);
moon.position.set(-6, 16, 8); moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
moon.shadow.bias = -0.0008;
scene.add(moon);

const torches = [];
(function buildArena() {
  const A = CFG.arena, H = A.half;
  const std = (c, r = 0.9, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, flatShading: true });
  const canvasTex = (draw, rep) => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; draw(cv.getContext('2d')); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.encoding = THREE.sRGBEncoding; return t; };
  // Flagstone floor: irregular slabs with dark grout and a few cracks
  const floorTex = canvasTex(c => {
    c.fillStyle = '#1c1a1e'; c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = 52 + Math.random() * 22 | 0, off = (y % 2) * 32;
      const sx = (x * 64 + off) % 256 + 3;
      c.fillStyle = `rgb(${v},${v - 3},${v + 4})`; c.fillRect(sx, y * 64 + 3, 58, 58);
      if (sx + 58 > 256) c.fillRect(sx - 256, y * 64 + 3, 58, 58);
      c.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 6; i++) c.fillRect((x * 64 + off + Math.random() * 58) % 256, y * 64 + Math.random() * 58, 3, 3);
    }
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { c.beginPath(); let px = Math.random() * 256, py = Math.random() * 256; c.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (Math.random() - 0.5) * 30; py += (Math.random() - 0.5) * 30; c.lineTo(px, py); } c.stroke(); }
  }, 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(H * 2 + 2, H * 2 + 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const brickTex = canvasTex(c => {
    c.fillStyle = '#16141a'; c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 5; x++) {
      const v = 44 + Math.random() * 20 | 0; c.fillStyle = `rgb(${v},${v - 4},${v + 2})`;
      c.fillRect((x * 56 + (y % 2) * 28) % 280 - 14, y * 32 + 2, 52, 28);
    }
  }, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95 });
  const wall = (w, h, d, x, z) => { brickTex.repeat.set(1, 1); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  wall(H * 2 + 2, 3.4, 1, 0, -H - 0.5); wall(1, 3.4, H * 2 + 2, -H - 0.5, 0); wall(1, 3.4, H * 2 + 2, H + 0.5, 0);
  wall(H * 2 + 2, 0.7, 1, 0, H + 0.5);                                      // low south wall keeps the camera's view open
  // North gate where enemies emerge
  const gateMat = std(0x0a0808);
  const gate = new THREE.Mesh(new THREE.BoxGeometry(3, 2.8, 0.2), gateMat); gate.position.set(0, 1.4, -H + 0.02); scene.add(gate);
  const iron = std(0x2a2a2e, 0.6, 0.6);
  for (let i = -5; i <= 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.6, 0.07), iron); b.position.set(i * 0.26, 1.3, -H + 0.15); scene.add(b); }
  for (const y of [0.8, 1.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.08), iron); b.position.set(0, y, -H + 0.15); scene.add(b); }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.25, 6, 12, Math.PI), std(0x3a363c)); arch.position.set(0, 2.6, -H + 0.1); scene.add(arch);
  // Pillars
  for (const [x, z] of A.pillars) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const stone = std(0x4a464e);
    const add = (geo, y) => { const m = new THREE.Mesh(geo, stone); m.position.y = y; m.castShadow = m.receiveShadow = true; g.add(m); };
    // Broken stumps rather than full columns, so they never hide the fight from the high camera
    const h = 1.2 + Math.random() * 0.8;
    add(new THREE.BoxGeometry(1.7, 0.35, 1.7), 0.175); add(new THREE.CylinderGeometry(A.pillarR * 0.85, A.pillarR * 0.95, h, 8), 0.35 + h / 2);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(A.pillarR * 0.6, A.pillarR * 0.85, 0.35, 8), stone); top.position.set(0.1, 0.5 + h, 0); top.rotation.z = 0.25; top.castShadow = true; g.add(top);
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), stone); chunk.position.set(0.9, 0.25, 0.6); chunk.castShadow = true; g.add(chunk);
  }
  // Torches on the walls, each with a flickering light
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  for (const [x, z, ry] of [[-5, -H + 0.05, 0], [5, -H + 0.05, 0], [-H + 0.05, -2, Math.PI / 2], [H - 0.05, -2, -Math.PI / 2], [-H + 0.05, 6, Math.PI / 2], [H - 0.05, 6, -Math.PI / 2]]) {
    const g = new THREE.Group(); g.position.set(x, 2.2, z); g.rotation.y = ry; scene.add(g);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 6), std(0x3a2a1a)); st.position.set(0, 0, 0.25); st.rotation.x = 0.6; g.add(st);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 6), flameMat); fl.position.set(0, 0.28, 0.4); g.add(fl);
    const light = new THREE.PointLight(0xff8a3a, 1.4, 9, 1.6); light.position.set(0, 0.4, 0.6); g.add(light);
    torches.push({ fl, light, seed: Math.random() * 10 });
  }
  // Scattered bones and rubble
  const bone = std(0xcfc6aa), rub = std(0x3a363c);
  for (let i = 0; i < 26; i++) {
    const x = (Math.random() * 2 - 1) * (H - 0.8), z = (Math.random() * 2 - 1) * (H - 0.8);
    if (Math.hypot(x, z) < 3) continue;
    if (i % 3 === 0) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), bone); m.position.set(x, 0.1, z); m.scale.set(1, 0.9, 1.15); scene.add(m); }
    else if (i % 3 === 1) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 5), bone); m.position.set(x, 0.03, z); m.rotation.set(Math.PI / 2, 0, Math.random() * 3); scene.add(m); }
    else { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.2, 0), rub); m.position.set(x, 0.08, z); m.rotation.set(Math.random(), Math.random(), 0); m.castShadow = true; scene.add(m); }
  }
  // Drifting dust motes
  const N = 160, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() * 2 - 1) * H; pos[i * 3 + 1] = Math.random() * 4; pos[i * 3 + 2] = (Math.random() * 2 - 1) * H; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffd8a0, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(dust); torches.dust = dust;
})();

// ---------------- Collisions ----------------
function resolveCollisions() {
  const A = CFG.arena, p = G.player;
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
  for (const b of bodies) {
    const r = rad(b), lim = A.half - r;
    b.pos.x = Math.max(-lim, Math.min(lim, b.pos.x)); b.pos.z = Math.max(-lim, Math.min(lim, b.pos.z));
    for (const [px, pz] of A.pillars) {
      const dx = b.pos.x - px, dz = b.pos.z - pz, d = Math.hypot(dx, dz), min = A.pillarR + r;
      if (d < min && d > 1e-4) { b.pos.x = px + dx / d * min; b.pos.z = pz + dz / d * min; }
    }
  }
}

// ---------------- Waves ----------------
const SPAWNS = [[0, -9], [-4, -8], [4, -8], [-8.5, -1], [8.5, -1], [-8, 7], [8, 7]];
function spawnWave() {
  const list = CFG.waves[G.wave % CFG.waves.length], loop = Math.floor(G.wave / CFG.waves.length), mult = 1 + loop * CFG.loopScale;
  const pts = SPAWNS.map(s => new THREE.Vector3(s[0], 0, s[1]))
    .filter(v => Combat.dist(v, G.player.pos) > 5)
    .sort(() => Math.random() - 0.5);
  list.forEach((type, i) => {
    const at = pts[i % pts.length] || new THREE.Vector3(0, 0, -9);
    G.queue.push({ type, at, mult, t: G.time + i * 0.45 });
    if (!G.seen[type]) { G.seen[type] = true; showTip(CFG.tips[type]); }
  });
  banner('WAVE ' + (G.wave + 1) + (loop ? '  ·  +' + Math.round(loop * CFG.loopScale * 100) + '%' : ''));
  Snd.play('wave');
}
function updateWaves(dt) {
  G.enemies = G.enemies.filter(e => { if (e.remove) { Enemy.dispose(e, scene); return false; } return true; });
  G.queue = G.queue.filter(q => { if (G.time < q.t) return true; G.enemies.push(Enemy.spawn(scene, q.type, q.at, q.mult)); return false; });
  const alive = G.enemies.filter(e => e.state !== 'dead').length;
  if (!G.between && !G.queue.length && alive === 0 && G.player.state !== 'dead') {
    G.between = true; G.waveT = 2.6;
    const p = G.player; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * CFG.waveHeal);
    banner('WAVE CLEARED');
  }
  if (G.between) { G.waveT -= dt; if (G.waveT <= 0) { G.between = false; G.wave++; spawnWave(); } }
  document.getElementById('waveN').textContent = 'Wave ' + (G.wave + 1);
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
function bestWave() { try { return +localStorage.getItem('dw_best') || 0; } catch (e) { return 0; } }
function showGameOver() {
  G.state = 'over';
  if (document.pointerLockElement) document.exitPointerLock();
  const reached = G.wave + 1, best = Math.max(bestWave(), reached);
  try { localStorage.setItem('dw_best', best); } catch (e) {}
  const s = G.stats;
  $('overStats').innerHTML = `Reached <b>wave ${reached}</b> (best ${best})<br>${s.kills} kills · ${s.parries} parries · ${s.crits} criticals · ${s.dodges} dodges`;
  $('over').classList.add('show');
}

// ---------------- Game flow ----------------
function startGame() {
  Snd.init();
  for (const e of G.enemies) Enemy.dispose(e, scene);
  G.enemies = []; G.queue = [];
  if (G.player) { scene.remove(G.player.rig.root); scene.remove(G.player.trail.mesh); }
  FX.clear();
  G.player = Player.create(scene);
  G.wave = 0; G.between = false; G.time = 0; G.seen = {};
  G.stats = { kills: 0, parries: 0, crits: 0, dodges: 0, hitsTaken: 0 };
  $('title').classList.remove('show'); $('over').classList.remove('show'); $('pause').classList.remove('show');
  G.state = 'play'; document.body.classList.add('playing');
  View.yaw = 0; View.pitch = 0.42; camTarget.copy(G.player.pos);
  spawnWave();
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
  const lim = CFG.arena.half - 4;
  const tx = Math.max(-lim, Math.min(lim, camTarget.x)), tz = Math.max(-lim - 1, Math.min(lim, camTarget.z));
  const k = portrait ? 1.3 : 1, s = FX.shakeAmt;
  camera.position.set(tx + (Math.random() - 0.5) * s, 10.8 * k + (Math.random() - 0.5) * s, tz + 8.2 * k);
  camera.lookAt(tx, 0.6, tz - 0.4);
}

function updateBehindCamera(dt) {
  const p = G.player, portrait = innerHeight > innerWidth, H = CFG.arena.half;
  camTarget.lerp(p.pos, 1 - Math.exp(-14 * dt));
  setFov(portrait ? 72 : 55);
  let d = View.dist * (portrait ? 1.15 : 1);
  const cx = () => camTarget.x + Math.sin(View.yaw) * Math.cos(View.pitch) * d, cz = () => camTarget.z + Math.cos(View.yaw) * Math.cos(View.pitch) * d;
  // Pull in toward the hero rather than look through a wall
  for (let i = 0; i < 20 && (Math.abs(cx()) > H - 0.3 || Math.abs(cz()) > H - 0.3) && d > 1.5; i++) d *= 0.9;
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
  for (const t of torches) {
    const f = 0.85 + Math.sin(performance.now() / 90 + t.seed) * 0.08 + Math.sin(performance.now() / 37 + t.seed * 3) * 0.06;
    t.light.intensity = 1.4 * f; t.fl.scale.set(1, f * 1.1, 1);
  }
  torches.dust.rotation.y += real * 0.01;
  if (G.state === 'play') {
    readInput();
    const dt = FX.scaleDt(real);
    G.time += dt;
    Player.update(G.player, dt);
    for (const e of G.enemies) Enemy.update(e, dt);
    resolveCollisions();
    updateWaves(dt);
    FX.update(dt);
    updateHud();
    updateCamera(real);
  } else if (G.state === 'title') {
    Rig.animate(idleRig, { mode: 'idle', t: 0, speed: 0 }, real);
    camTarget.set(0, 0, 2); setFov(42);
    camera.position.set(2.5, 2.4, 6.6); camera.lookAt(0, 1.1, 2);
  } else if (G.state === 'over') {
    const dt = real; G.time += dt;
    Player.update(G.player, dt);
    for (const e of G.enemies) Enemy.update(e, dt);
    FX.update(dt); updateHud(); updateCamera(real);
  }
  if (G.state !== 'title' && idleRig.root.parent) scene.remove(idleRig.root);
}
requestAnimationFrame(frame);

// Test hook: lets automated tests drive the game without a real input device
window.__dw = {
  G, Input, CFG, step,
  start: startGame, View,
  setView(m) { if (View.mode !== m) toggleView(); },
  spawn(type, x = 0, z = -3) { const e = Enemy.spawn(scene, type, new THREE.Vector3(x, 0, z), 1); G.enemies.push(e); return e; },
  press(act) { Player.press(G.player, act); },
  sim(seconds, fn) { for (let t = 0; t < seconds; t += 1 / 60) { if (fn && fn(t) === true) break; step(1 / 60); } renderer.render(scene, camera); },
};
