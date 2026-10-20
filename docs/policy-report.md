# Companion policy: training report

Trained 2026-10-20: 648 weights (23 inputs, 20 hidden, 8 moves), imitation of the hand-written rules on 71523 decisions, then 344 generations of evolution strategies (15 min).
Tested on 400 scenarios never used in training, rules and network on the same scenarios in `tools/policy/sim.js` (a simplified copy of the game's combat).

| | Rules | Network |
| --- | --- | --- |
| Mean reward | 45.3 | 44.7 |
| Fights won | 89.0% | 88.3% |
| Companions downed per fight | 0.01 | 0.01 |
| Warden died | 11.0% | 11.8% |
| Time to clear (s) | 34.9 | 35.1 |
| Warden damage taken (share of health) | 1.12 | 1.12 |
| Companion damage taken (share of health) | 0.19 | 0.19 |

Paired difference in reward (network minus rules): -0.69 ± 2.01 (95%).
Right after imitation alone: -2.19 ± 1.73.

The simulator is a sketch of the game, so the real test is `tools/policy_test.js` (the same fights in the real game, rules against network).
