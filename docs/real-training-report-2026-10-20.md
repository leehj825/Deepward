# Companion preferences trained against the real game

2026-10-20: 7 generations of evolution strategies over the 28 per-class move preferences (weights.cb), 2048 real fights in headless browsers (20 min of training).
Test: 120 fresh randomized fights, the same scenarios three ways.

| | Reward | Fights won | Companions downed per fight | Warden died |
| --- | --- | --- | --- | --- |
| Plain rules | 23.8 | 47% | 0.36 | 16% |
| Network as shipped (no preferences) | 33.7 | 55% | 0.26 | 11% |
| Network + trained preferences | 34.6 | 56% | 0.25 | 11% |

Paired differences in reward: trained minus no preferences 0.93 ± 7.16; trained minus rules 10.85 ± 7.41; network minus rules 9.92 ± 7.18 (95%).
The run wrote `weights.cb` into its own copy of `js/policy_weights.js`. **Not adopted in the repository**: the gain from the preferences (+0.93 ± 7.16) is noise, and after 7 generations the preferences are still close to their random starting steps. The shipped weights (the network without `cb`) are kept.

The result that matters is the middle row against the first: on 120 fresh randomized real fights the shipped network beats the plain rules by 9.92 ± 7.18 reward points (a significant gain; 55% of fights won against 47%, fewer companions downed, the warden dying less).
