// A worker for train.js: scores candidate weight vectors on a list of scenario seeds (mean reward each).
const { parentPort } = require('worker_threads');
const { run, makeScenario, Policy } = require('./sim.js');
const IN = Policy.N_IN, HID = 20, OUT = Policy.ACTIONS.length, NP = HID * IN + HID + OUT * HID + OUT;
const unpack = th => ({ in: IN, hid: HID, out: OUT, W1: th.slice(0, HID * IN), b1: th.slice(HID * IN, HID * IN + HID), W2: th.slice(HID * IN + HID, HID * IN + HID + OUT * HID), b2: th.slice(NP - OUT) });
parentPort.on('message', ({ id, cands, seeds }) => {
  const scs = seeds.map(makeScenario), out = cands.map(th => { const w = unpack(Array.from(th)), f = s => Policy.choose(s, w); let sum = 0; for (const sc of scs) sum += run(sc, f).reward; return sum / scs.length; });
  parentPort.postMessage({ id, out });
});
