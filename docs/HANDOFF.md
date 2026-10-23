# Handoff: where the project stands (2026-10-22)

Read `README.md` first, then `docs/DESIGN.md` (roadmap R1 to R8). This page is the short list for a new session.

## State
- Branch: `ccr-2d9fd8cb-e6wx40` (push only there, `git push -u origin ccr-2d9fd8cb-e6wx40`). No pull requests unless asked.
- Done: companion policy with dodge (23 to 20 to 8 network), the hack-and-slash dungeon and hordes (R6), the main story with three endings (STORY.md section 11), cave, forest and town dungeon styles (R7 first part), Korean translation with speech levels, the AdMob banner (`testing:true`), the balance bot with all classes.
- Class balance report: `docs/class-balance-report-2026-10-22.md`. Nothing was changed because of it yet.

## Conventions
- Commit messages end with the two attribution lines from the session reminder. No model names in repo files.
- Do not change trackpad or touch feel (mouse settings are separate).
- Korean: no honorifics toward the player; per-NPC speech levels in `docs/KOREAN_STYLE.md`. New override files must sort last (`tools/i18n/ko_partz*`), then run `tools/i18n_merge.py`.
- Scene code must never write `G.scene`.

## Tests
Playwright scripts in `tools/`, driven through `window.__dw`. Run them one at a time (parallel runs starve each other; `combat_test` takes minutes and prints 45 PASS lines when complete). Known flakes that pass on rerun: `controls_test` padHeavy, `party_test` clericHeals.

## Open items (see DESIGN.md for detail)
- R1 real-phone check (ad centring after rotation, scene camera, Korean tone, frame rate with hordes).
- R2 test that no two systems write the same `G.*` field.
- R3 ad consent prompt, Play Console declaration, `testing:false` for the store build.
- R4 class balance: cleric smite about +40%, let ranged hits ignore part of armor, party run for the cleric, bot dodging.
- R5 difficulty. R6 remainder: English per-character voices. R7 remainder: curved cave outlines, bending streets, a new stage. R8 polish: native Korean read, ambient sound, signed release build.

## Release build
- Warrior only: `CFG.warriorOnly` (js/config.js) skips the class panel; `?classes=1` restores it (used by `tutorial_test` and `balance.js`). The party is unchanged.
- Signing: not set up yet (V7 in DESIGN.md); the user will supply the keystore details.
