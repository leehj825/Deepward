// Reads learned-data codes from the game (Party panel, Share learned data) and prints the fight log: what the real fights look like.
//   node tools/policy/analyze.js <code or file> ...
const fs = require('fs');
const codes = [];
for (const arg of process.argv.slice(2)) { const t = fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : arg; for (const l of t.split(/\s+/)) if (l.startsWith('DWPOLICY1:')) codes.push(l); }
if (!codes.length) { console.error('usage: analyze.js <DWPOLICY1:... code | file>'); process.exit(1); }
for (const c of codes) {
  const d = JSON.parse(Buffer.from(c.slice(10), 'base64').toString('utf8'));
  console.log(`fights learned from: ${d.n}, running reward ${d.base.toFixed(1)} (spread ${d.sd.toFixed(1)})`);
  const biggest = Math.max(...Object.values(d.bias).flat().map(Math.abs));
  console.log(`largest preference change: ${biggest.toFixed(3)} (limit 2; about 1 is needed to change a choice)`);
  if (d.log && d.log.length) {
    console.log('reward  cleared  time  downs  hero-died  hero-lost  comp-lost  foes  party   where');
    for (const f of d.log) console.log(`${String(f.r).padStart(6)}  ${f.cl ? 'yes' : 'no '}      ${String(f.t).padStart(3)}s  ${String(f.dn).padStart(3)}    ${f.hd ? 'yes' : 'no '}        ${String(f.hl).padStart(5)}      ${String(f.cl2).padStart(5)}      ${String(f.foes).padStart(3)}   ${f.party}  ${f.mode || ''}`);
    const m = k => (d.log.reduce((s, f) => s + f[k], 0) / d.log.length).toFixed(2);
    console.log(`mean: reward ${m('r')}, cleared ${m('cl')}, time ${m('t')}s, downs ${m('dn')}, hero died ${m('hd')}, hero lost ${m('hl')}, companions lost ${m('cl2')}`);
  } else console.log('(no fight log in this code: it comes from an older build)');
}
