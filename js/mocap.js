// Deepward - plays the motion-capture clips in js/anims.js (DW_ANIMS) on the code-built rigs.
// Each frame of each clip is turned into quaternions once; sample() interpolates between frames.
// Clip bones use Nightfall's names; BONE_TO_JOINT maps them onto this game's rig joints.
const Mocap = (() => {
  const BONES = ['hips', 'spine', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR', 'hipL', 'hipR', 'kneeL', 'kneeR'];
  const BONE_TO_JOINT = { hips: 'hips', spine: 'spine', head: 'neck', shoulderL: 'shL', shoulderR: 'shR', elbowL: 'elL', elbowR: 'elR', handL: 'hdL', handR: 'hdR', hipL: 'hipL', hipR: 'hipR', kneeL: 'knL', kneeR: 'knR' };
  const UPPER = ['spine', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR'];
  const LOWER = ['hips', 'hipL', 'hipR', 'kneeL', 'kneeR'];
  const clips = {}, e = new THREE.Euler(), q = new THREE.Quaternion();
  for (const [name, c] of Object.entries(DW_ANIMS)) {
    const qs = {};
    for (const b of BONES) {
      const arr = new Float32Array((c.n + 1) * 4);
      c.t[b].forEach((v, i) => { e.set(v[0], v[1], v[2]); q.setFromEuler(e); arr[i * 4] = q.x; arr[i * 4 + 1] = q.y; arr[i * 4 + 2] = q.z; arr[i * 4 + 3] = q.w; });
      qs[b] = arr;
    }
    clips[name] = { d: c.d, n: c.n, loop: c.loop, hit: c.hit, q: qs, y: c.t.hipsY, z: c.t.hipsZ };
  }
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  // Writes the pose of clip `name` at `t` seconds into out.q[joint] (joint names of the rig) and out.hipsY / out.hipsZ.
  // bones limits which bones are written (for layering an upper-body clip over a lower-body one).
  function sample(name, t, out, bones = BONES) {
    const c = clips[name]; if (!c) return;
    let u = t / c.d; u = c.loop ? u - Math.floor(u) : Math.min(1, Math.max(0, u));
    const f = u * c.n, i = Math.min(c.n - 1, Math.floor(f)), k = f - i;
    for (const b of bones) {
      const a = c.q[b]; qa.fromArray(a, i * 4); qb.fromArray(a, (i + 1) * 4);
      out.q[BONE_TO_JOINT[b]].copy(qa).slerp(qb, k);
    }
    if (bones.includes('hips')) { out.hipsY = c.y[i] + (c.y[i + 1] - c.y[i]) * k; out.hipsZ = c.z[i] + (c.z[i + 1] - c.z[i]) * k; }
  }
  return { clips, sample, BONES, UPPER, LOWER, JOINTS: Object.values(BONE_TO_JOINT), has: n => !!clips[n] };
})();
