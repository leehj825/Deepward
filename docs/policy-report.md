# Companion policy: training report

Trained 2026-10-20: 587 weights (21 inputs, 20 hidden, 7 moves), imitation of the hand-written rules on 57971 decisions, then 401 generations of evolution strategies (14 min).
Tested on 400 scenarios never used in training, rules and network on the same scenarios in `tools/policy/sim.js` (a simplified copy of the game's combat).

| | Rules | Network |
| --- | --- | --- |
| Mean reward | 32.6 | 36.0 |
| Fights won | 82.3% | 84.3% |
| Companions downed per fight | 0.10 | 0.09 |
| Warden died | 17.8% | 15.8% |
| Time to clear (s) | 37.2 | 36.3 |
| Warden damage taken (share of health) | 1.18 | 1.15 |
| Companion damage taken (share of health) | 0.41 | 0.38 |

Paired difference in reward (network minus rules): 3.46 ± 2.72 (95%).
Right after imitation alone: 0.78 ± 1.15.

The simulator is a sketch of the game, so the real test is `tools/policy_test.js` (the same fights in the real game, rules against network).
