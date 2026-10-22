# Training the companions' battle policy (headless)

Everything runs in Node and a headless Chromium: no phone, no display. You need Node 22 and, for the real-game training, about
4 CPU cores (it runs three browsers at once).

> The network is 23 inputs, 20 hidden, 8 moves (the dodge move was added 2026-10-21). `js/policy.js` ignores weights of any other shape, so after changing the inputs or the moves, train again before shipping. The simulator (`tools/policy/sim.js`) mirrors `Party.stateOf` (danger, `aoe`, `dodgeRdy`) and randomizes enemy speed, damage and wind-ups by ±15% per fight.

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
| **Compare two weight files on the same randomized real fights** (before shipping new weights) | `node tools/policy/compare_real.js <candidate weights file> 200 3` | about 6 min for 200 fights |
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

## Without your own machine (GitHub Actions)

The workflow `.github/workflows/train-policy.yml` runs the same commands on a GitHub runner and uploads `js/policy_weights.js` and the
reports as an artifact (Actions, the run, **companion-policy** at the bottom). It commits nothing: read the report, and commit the
weights yourself if you accept them. Two ways to start it:

1. **From the Actions tab.** Actions, **Train companion policy**, Run workflow, pick the kind (`real` or `simulator`) and the minutes.
   GitHub only shows that button for workflows on the default branch, so this works once the branch with the workflow is merged into `main`.
2. **From a work branch, before any merge.** On GitHub open the branch, Add file, Create new file, name it
   `tools/policy/train-request.json`, put `{"kind": "real", "minutes": 45}` in it and commit to that same branch. The commit starts a run
   (Actions, All workflows, **Train companion policy**). To train again, edit the file (change the minutes) and commit. Minutes are capped at 110.

Hosted runners can be cut short (a first 45-minute run was stopped by GitHub after 26 minutes: "The runner has received a shutdown signal"),
so prefer runs of about 20 minutes. The real-game trainer keeps its best preferences so far in `tools/policy/real-checkpoint.json`, which the
workflow uploads even when the run is cut short (use the artifact `companion-policy`). To continue from a checkpoint, commit that file to the
branch (or main) and start another run: with `RESUME=1`, which the workflow sets, the trainer starts from it. On the runner it uses 2 browsers
(3 on a machine with 4 or more cores: `npm run policy:train:real -- 60 3`).
