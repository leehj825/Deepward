// Deepward - pictures for the gear screen: the hero in their current gear, turning slowly (drag to turn), and a rendered
// picture of every item for the slots and the bag. One small WebGL renderer does both; item pictures are rendered once
// per look and kept as images.
const GearView = (() => {
  const ICON = 112;                                   // item picture size in pixels
  let R = null, scene = null, cam = null, size = [0, 0];
  const icons = new Map();
  let doll = null, dollKey = '', host = null, yaw = 0.45, spin = true, drag = null, last = 0;

  function init() {
    if (R) return true;
    try { R = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return false; }
    R.outputEncoding = THREE.sRGBEncoding; R.setClearColor(0x000000, 0);
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xc8d0e8, 0x2a2018, 0.9));
    const key = new THREE.DirectionalLight(0xffe8c8, 1.1); key.position.set(1.5, 2.5, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0x8aa0ff, 0.6); rim.position.set(-2, 1.5, -2.5); scene.add(rim);
    cam = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
    const cv = R.domElement; cv.className = 'gvcanvas';
    cv.addEventListener('pointerdown', ev => { drag = ev.clientX; spin = false; cv.setPointerCapture && cv.setPointerCapture(ev.pointerId); ev.preventDefault(); });
    cv.addEventListener('pointermove', ev => { if (drag === null) return; yaw += (ev.clientX - drag) * 0.012; drag = ev.clientX; });
    const up = () => { drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    return true;
  }
  function resize(w, h) { if (size[0] !== w || size[1] !== h) { R.setSize(w, h, false); size = [w, h]; } }
  function dispose(o) { o.traverse(m => { if (m.isMesh) { m.geometry.dispose(); } }); }

  // ---------------- Item pictures ----------------
  const keyOf = L => [L.slot, L.type, L.helm, L.trinket, L.blade, L.face, L.armor, L.plate, L.glow, L.uniq].join('|');
  // Frames an object from the front and a little above, filling the picture
  function frame(obj, dir, fill) {
    const b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3()), r = b.getBoundingSphere(new THREE.Sphere()).radius;
    const d = r / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2)) * fill;
    cam.position.copy(c).addScaledVector(dir.normalize(), d); cam.lookAt(c); cam.updateProjectionMatrix();
  }
  // A data URL for the item's picture ('' when WebGL is not available)
  function icon(it) {
    const L = Items.itemLook(it), k = keyOf(L);
    if (icons.has(k)) return icons.get(k);
    if (!init()) return '';
    const g = Rig.item(L); scene.add(g);
    cam.aspect = 1; frame(g, new THREE.Vector3(0, 0.25, 1), 0.92);
    const pr = R.getPixelRatio(); R.setPixelRatio(1); resize(ICON, ICON); R.render(scene, cam);
    const c2 = document.createElement('canvas'); c2.width = c2.height = ICON; c2.getContext('2d').drawImage(R.domElement, 0, 0);
    const url = c2.toDataURL('image/png');
    scene.remove(g); dispose(g); R.setPixelRatio(pr); size = [0, 0];
    icons.set(k, url);
    return url;
  }

  // ---------------- The hero ----------------
  // Puts the turning hero into el (an element in the gear panel); it stops by itself once el leaves the page
  function mount(el) {
    if (!init()) return false;
    const L = Items.look(), k = JSON.stringify(L);
    if (k !== dollKey) {
      if (doll) { scene.remove(doll.root); dispose(doll.root); }
      doll = Rig.build('hero', { look: L }); dollKey = k; scene.add(doll.root);
      for (let i = 0; i < 30; i++) Rig.animate(doll, { mode: 'idle', t: 0, speed: 0, calm: true }, 1 / 30);   // settle into the idle pose
    }
    host = el; el.appendChild(R.domElement);
    if (!last) { last = performance.now(); requestAnimationFrame(tick); }
    return true;
  }
  function tick(now) {
    if (!host || !host.isConnected) { host = null; last = 0; return; }
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;     // a frame's timestamp can be older than performance.now()
    if (spin) yaw += dt * 0.5;
    doll.root.rotation.y = yaw;
    Rig.animate(doll, { mode: 'idle', t: 0, speed: 0, calm: true }, dt);
    const w = host.clientWidth || 160, h = host.clientHeight || 240;
    resize(w, h); cam.aspect = w / h; cam.fov = 30;
    cam.position.set(0, 1.25, 4.6); cam.lookAt(0, 0.98, 0); cam.updateProjectionMatrix();
    R.render(scene, cam);
    requestAnimationFrame(tick);
  }
  return { icon, mount, get ready() { return !!R; } };
})();
