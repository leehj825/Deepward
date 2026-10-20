# Training the companions' battle policy (headless)

Everything runs in Node and a headless Chromium: no phone, no display. You need Node 22 and, for the real-game training, about
4 CPU cores (it runs three browsers at once).

## One-time setup

```
npm ci
npm install --no-save playwright@1.56.1
npx playwright install chromium          # on Linux add --with-deps
```

## Commands

| What | Command | Time |
| --- | --- | --- |
| Train in the fast simulator, from imitation of the rules | `npm run policy:train -- 15` (minutes) | 15 min + 2 min of tests |
| Keep training the shipped weights in the simulator | `npm run policy:train -- 20 --continue` | 20 min |
| **Train against the real game** (the per-class move preferences, `weights.cb`) | `npm run policy:train:real -- 60 3` (minutes, browsers) | 60 min + about 8 min of tests |
| Check the shipped weights in the real game (rules against network) | `npm run policy:test -- 8` (fights per case) | 5 to 10 min |
| Does learning while playing help? (simulator) | `npm run policy:learn-check -- 8 300` | 1 min |
| Fold learned data from a phone into the weights | `node tools/policy/bake.js <code or file>` | seconds |
| Read the fight log in learned data from a phone | `node tools/policy/analyze.js <code or file>` | seconds |

## What they write

- `js/policy_weights.js`: the network (and the per-class preferences). The simulator trainer writes it when it beats the plain rules
  on 400 unseen scenarios (with `--continue`: when it beats the shipped weights by 0.5); the real-game trainer writes it only if the
  trained preferences are not worse than the network without them and not clearly worse than the rules, on 120 fresh real fights.
  Set `DRY=1` to run without writing anything (`TEST_N=6` shortens the final test).
- `docs/policy-report.md` (simulator) and `docs/real-training-report.md` (real game): the numbers behind the decision.

## Before you ship new weights

Run `npm run policy:test -- 8`. It must pass (the network no worse than the plain rules in real fights). A run that is better in the
simulator but fails here is not shipped: that is what happened with the 20-minute simulator continuation (see the design doc). Then
commit `js/policy_weights.js`; the debug APK build starts on its own when `js/**` changes.

## Without your own machine

Actions, **Train companion policy**, Run workflow (inputs: kind and minutes). It runs the same commands on a GitHub runner and
uploads `js/policy_weights.js` and the reports as an artifact; download it, check the report, and commit the weights if you accept them.
