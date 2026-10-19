// Deepward - the minimap. A small map in the corner shows the sections you have seen (red while monsters are awake,
// grey once cleared), the passages between them, unopened chests, the guardian's lair, living enemies and the hero.
// In the behind view it turns so that where you look is up. A gold chevron on its rim points the way to the next
// uncleared area (or the lair), with the distance below. Tap it, or press N, for the whole stage.
const MiniMap = (() => {
  const cv = document.getElementById('minimap'), ctx = cv.getContext('2d'), info = document.getElementById('mapInfo');
  let big = false, size = 0, tick = 0;
  const C = { floor: 'rgba(120,112,100,0.55)', fight: 'rgba(200,60,40,0.65)', clear: 'rgba(110,120,110,0.45)', lair: 'rgba(150,40,40,0.75)', edge: 'rgba(255,230,190,0.35)' };

  function toggle() { big = !big; cv.classList.toggle('big', big); size = 0; }
  cv.addEventListener('click', ev => { ev.stopPropagation(); toggle(); });

  // The next place the hero should go: the first section along the path that is not cleared
  function goal(S) {
    const r = S.find(x => x.state !== 'cleared');
    if (!r) return null;
    return { r, at: r.lair && r.lairAt ? r.lairAt : new THREE.Vector3(r.cx, 0, r.cz) };
  }

  function draw(dt) {
    const p = G.player, S = World.sections, show = G.mode === 'dungeon' && p && S.length && G.state !== 'title';
    cv.style.display = info.style.display = show ? '' : 'none';
    if (!show) return;
    if ((tick += dt) < 1 / 20) return; tick = 0;                         // 20 times a second is plenty
    const px = Math.round(cv.clientWidth * Math.min(2, devicePixelRatio || 1));
    if (px !== size) { size = cv.width = cv.height = px; }
    const W = size, half = W / 2;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.beginPath(); ctx.arc(half, half, half - 1, 0, Math.PI * 2); ctx.fillStyle = 'rgba(8,6,10,0.72)'; ctx.fill(); ctx.clip();
    // World to map: the whole stage when big, about 46 m across around the hero otherwise
    let scale, cx = p.pos.x, cz = p.pos.z, rot = 0;
    if (big) {
      const K = S.filter(r => r.seen).concat(S[0]);                       // fit what has been found so far
      const x0 = Math.min(...K.map(r => r.rect.x0)), x1 = Math.max(...K.map(r => r.rect.x1)), z0 = Math.min(...K.map(r => r.rect.z0)), z1 = Math.max(...K.map(r => r.rect.z1));
      scale = (W * 0.86) / Math.max(x1 - x0, z1 - z0); cx = (x0 + x1) / 2; cz = (z0 + z1) / 2;
    } else { scale = W / 46; if (View.mode === 'behind') rot = View.yaw; }
    ctx.translate(half, half); ctx.rotate(rot); ctx.scale(scale, scale); ctx.translate(-cx, -cz);
    const rect = (q, fill) => { ctx.fillStyle = fill; ctx.fillRect(q.x0, q.z0, q.x1 - q.x0, q.z1 - q.z0); };
    for (const r of S) {
      if (!r.seen) continue;
      if (r.corr && (r.seen || (S[r.j - 1] && S[r.j - 1].seen))) rect(r.corr, C.floor);
      rect(r.rect, r.state === 'cleared' ? C.clear : r.state === 'fight' || r.state === 'start' ? C.fight : r.lair ? C.lair : C.floor);
      ctx.strokeStyle = C.edge; ctx.lineWidth = 1 / scale; ctx.strokeRect(r.rect.x0, r.rect.z0, r.rect.x1 - r.rect.x0, r.rect.z1 - r.rect.z0);
      if (r.chest && !r.chest.opened) { ctx.fillStyle = '#ffd040'; ctx.fillRect(r.chest.x - 0.7, r.chest.z - 0.5, 1.4, 1.0); }
      if (r.lair && r.lairAt) {                                           // a skull mark at the lair
        ctx.fillStyle = r.state === 'cleared' ? '#8a8a8a' : '#ff5040'; ctx.beginPath(); ctx.arc(r.lairAt.x, r.lairAt.z - 1.2, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(r.lairAt.x - 0.6, r.lairAt.z - 0.6, 1.2, 0.9);
      }
    }
    for (const e of G.enemies) {
      if (e.state === 'dead') continue;
      ctx.fillStyle = e.guardian ? '#ff3020' : '#e86050'; ctx.beginPath(); ctx.arc(e.pos.x, e.pos.z, e.guardian ? 1.0 : 0.55, 0, Math.PI * 2); ctx.fill();
    }
    // The hero: an arrow the way they face
    ctx.save(); ctx.translate(p.pos.x, p.pos.z); ctx.rotate(-p.facing + Math.PI);
    ctx.fillStyle = '#9ad8ff'; ctx.beginPath(); ctx.moveTo(0, -1.6); ctx.lineTo(1.0, 1.0); ctx.lineTo(0, 0.4); ctx.lineTo(-1.0, 1.0); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    // Compass: a chevron on the rim toward the goal, and how far it is
    const g = goal(S);
    let txt = '';
    if (g) {
      const inside = World.roomOf(p.pos) === g.r, dx = g.at.x - p.pos.x, dz = g.at.z - p.pos.z, d = Math.hypot(dx, dz);
      txt = g.r.lair ? (g.r.state === 'ahead' ? 'Guardian ahead' : 'Slay the guardian') : inside ? 'Clear the area' : 'Next area';
      if (!inside || g.r.state === 'ahead') {
        txt += ' · ' + Math.round(d) + ' m';
        if (!big) {
          // the direction of (dx, dz) on the map, after the map's rotation
          const mx = dx * Math.cos(rot) - dz * Math.sin(rot), mz = dx * Math.sin(rot) + dz * Math.cos(rot), ml = Math.hypot(mx, mz) || 1;
          const ux = mx / ml, uz = mz / ml, R = half - 7;
          ctx.save(); ctx.translate(half + ux * R, half + uz * R); ctx.rotate(Math.atan2(uz, ux) + Math.PI / 2);
          ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); ctx.restore();
        }
      }
    } else txt = 'Stage cleared';
    info.textContent = txt;
    ctx.beginPath(); ctx.arc(half, half, half - 1, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(242,210,122,0.45)'; ctx.lineWidth = 2; ctx.stroke();
  }
  return { draw, toggle, get big() { return big; } };
})();
