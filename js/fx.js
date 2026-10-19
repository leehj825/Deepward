// Deepward - combat feedback: sparks, glints, ground rings, floating text, screen shake, hit-stop and slow motion.
const FX = (() => {
  let scene, camera, layer;
  const sparks = [], rings = [], glints = [], texts = [];
  const sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.22);
  const time = { stop: 0, slow: 0, slowScale: 1 }, cam = { shake: 0 };

  const starTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(30, 0, 4, 64); c.fillRect(0, 30, 64, 4);
    return new THREE.CanvasTexture(cv);
  })();

  function init(s, c, el) { scene = s; camera = c; layer = el; }

  function burst(pos, color, n = 10, speed = 6, life = 0.35) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < n; i++) {
      const o = new THREE.Mesh(sparkGeo, m); o.position.copy(pos);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.1, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      o.lookAt(pos.clone().add(v)); scene.add(o);
      sparks.push({ o, v, life, max: life });
    }
  }
  function glint(pos, color, size = 0.9, life = 0.28, follow = null) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    s.position.copy(pos); s.scale.setScalar(size); scene.add(s);
    glints.push({ s, life, max: life, size, follow });
    return s;
  }
  // A flat ring on the floor. grow: radius animates from r0 to r over the lifetime (used to telegraph area attacks).
  function ring(pos, r, color, life, opts = {}) {
    const geo = new THREE.RingGeometry(0.85, 1, 40); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opts.opacity || 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(pos.x, 0.03, pos.z); scene.add(m);
    let fill = null;
    if (opts.fill) {
      const fg = new THREE.CircleGeometry(1, 40); fg.rotateX(-Math.PI / 2);
      fill = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
      fill.position.copy(m.position); fill.position.y = 0.025; fill.scale.setScalar(r); scene.add(fill);
    }
    const o = { m, fill, r, r0: opts.r0 !== undefined ? opts.r0 : r, life, max: life, fade: opts.fade !== false };
    m.scale.setScalar(o.r0); rings.push(o);
    return o;
  }
  function killRing(o) { o.life = 0; }
  // An after-image: a frozen copy of a character in one see-through glowing material, fading out (geometry is shared)
  const ghosts = [];
  function ghost(root, color, life) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const g = root.clone(); g.traverse(o => { if (o.isMesh) { o.material = m; o.castShadow = false; } });
    scene.add(g); ghosts.push({ g, m, life, max: life });
  }

  function text(pos, str, cls = '') {
    const d = document.createElement('div'); d.className = 'ftxt ' + cls; d.textContent = str; layer.appendChild(d);
    texts.push({ d, pos: pos.clone(), life: 0.9, max: 0.9, dx: (Math.random() - 0.5) * 30 });
  }

  const v = new THREE.Vector3();
  function project(p) {
    v.copy(p).project(camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, vis: v.z < 1 };
  }

  function update(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.life -= dt;
      s.v.y -= 14 * dt; s.o.position.addScaledVector(s.v, dt);
      s.o.scale.setScalar(Math.max(0.01, s.life / s.max));
      if (s.life <= 0) { scene.remove(s.o); sparks.splice(i, 1); }
    }
    for (let i = glints.length - 1; i >= 0; i--) {
      const g = glints[i]; g.life -= dt; const k = g.life / g.max;
      g.s.scale.setScalar(g.size * (0.4 + Math.sin(k * Math.PI) * 0.9)); g.s.material.opacity = Math.min(1, k * 2);
      if (g.follow) g.s.position.copy(g.follow());
      if (g.life <= 0) { scene.remove(g.s); g.s.material.dispose(); glints.splice(i, 1); }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.life -= dt; const k = Math.max(0, r.life / r.max);
      r.m.scale.setScalar(r.r0 + (r.r - r.r0) * (1 - k));
      if (r.fade) r.m.material.opacity = 0.8 * k;
      if (r.fill) r.fill.material.opacity = 0.1 + 0.25 * (1 - k);
      if (r.life <= 0) { scene.remove(r.m); r.m.geometry.dispose(); if (r.fill) { scene.remove(r.fill); r.fill.geometry.dispose(); } rings.splice(i, 1); }
    }
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const h = ghosts[i]; h.life -= dt; h.m.opacity = 0.35 * Math.max(0, h.life / h.max);
      if (h.life <= 0) { scene.remove(h.g); h.m.dispose(); ghosts.splice(i, 1); }
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i]; t.life -= dt; const k = 1 - t.life / t.max;
      const s = project(t.pos);
      t.d.style.transform = `translate(${s.x + t.dx * k - 50}px, ${s.y - 40 * k - 20}px) scale(${1 + Math.max(0, 0.3 - k) * 1.5})`;
      t.d.style.opacity = t.life < 0.3 ? t.life / 0.3 : 1;
      if (t.life <= 0) { t.d.remove(); texts.splice(i, 1); }
    }
    cam.shake = Math.max(0, cam.shake - dt * 1.6);
  }

  // Returns the time step the game should simulate this frame (hit-stop freezes, slow motion stretches)
  function scaleDt(dt) {
    if (time.stop > 0) { time.stop -= dt; return dt * 0.04; }
    if (time.slow > 0) { time.slow -= dt; return dt * time.slowScale; }
    return dt;
  }

  return {
    init, burst, glint, ring, killRing, ghost, text, update, scaleDt, project,
    shake(a) { if (!Settings.get('shake')) return; cam.shake = Math.min(0.6, Math.max(cam.shake, a)); },
    hitStop(t) { if (Settings.get('hitstop')) time.stop = Math.max(time.stop, t); },
    slowmo(t, s) { if (Settings.get('slowmo')) { time.slow = t; time.slowScale = s; } },
    get shakeAmt() { return cam.shake; },
    clear() {
      for (const s of sparks) scene.remove(s.o); sparks.length = 0;
      for (const r of rings) { scene.remove(r.m); if (r.fill) scene.remove(r.fill); } rings.length = 0;
      for (const g of glints) scene.remove(g.s); glints.length = 0;
      for (const t of texts) t.d.remove(); texts.length = 0;
      for (const h of ghosts) { scene.remove(h.g); h.m.dispose(); } ghosts.length = 0;
      time.stop = time.slow = 0;
    },
  };
})();
