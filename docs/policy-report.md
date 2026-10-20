# Companion policy: training report

Trained 2026-10-20: 587 weights (21 inputs, 20 hidden, 7 moves), imitation of the hand-written rules on 57971 decisions, then 23 generations of evolution strategies (1 min).
Tested on 400 scenarios never used in training, rules and network on the same scenarios in `tools/policy/sim.js` (a simplified copy of the game's combat).

| | Rules | Network |
| --- | --- | --- |
| Mean reward | 32.6 | 34.8 |
| Fights won | 82.3% | 84.0% |
| Companions downed per fight | 0.10 | 0.09 |
| Warden died | 17.8% | 16.0% |
| Time to clear (s) | 37.2 | 36.6 |
| Warden damage taken (share of health) | 1.18 | 1.18 |
| Companion damage taken (share of health) | 0.41 | 0.41 |

Paired difference in reward (network minus rules): 2.22 ± 2.05 (95%).
Right after imitation alone: 0.78 ± 1.15.

The simulator is a sketch of the game, so the real test is `tools/policy_test.js` (the same fights in the real game, rules against network).
