# Deepward

A quarter-view 3D action dungeon crawler that runs in the browser (Three.js r128, no build step). No town, no army: the whole game is the fight. Every enemy attack is telegraphed, and each dungeon tier demands a skill the last one didn't: spacing, then dodging, blocking, parrying, and reading feints.

Every model is built in code from primitives, and there are no model, texture or sound files. Characters move with the same motion-capture animations as Nightfall Settlement. Those clips come from Mixamo, were retargeted to Nightfall's stick-figure rig, and are copied here as joint rotations by `tools/extract_anims.js`. They cover sword-and-shield idle, walking, running and strafing in every direction, combo attacks, a jump smash, a shield block (also while walking), hit reactions and deaths, plus great-sword moves for the brute. The dodge roll and the stagger poses are still hand-made.

**Story and camp.** Forty winters ago the ground beneath Varrow Hill split open. You are the new warden of Deepward, the last camp on the rim of the Deep:

- **The people of the camp:**
  - **Maren**, the elder, tells the story before each stage and after its guardian falls.
  - **Bram the smith** forges new gear, upgrades what you wear (+levels, capped by the forge) and salvages spares into scrap.
  - **Tilda the quartermaster** sells three fresh pieces each time you return and buys what you don't need.
- **The camp ledger** turns gold into buildings, each with three levels that show in the camp:
  - **Forge:** better upgrades and better odds of rare work.
  - **Apothecary:** more and stronger healing flasks.
  - **Training yard:** more health and stamina.
- **Gear:** five slots (weapon, shield, armour, helm and trinket).
  - Four weapon types play differently: sword, axe (posture), mace (more posture, short) and longsword (reach, slower).
  - Rarities run from Common to Legendary, with random bonuses: critical chance, posture, stamina regen, health, stamina, parry window, life on hit and gold find.
  - Gear power rises with the stage it came from, and what you wear shows on the hero.
- **Loot:** enemies drop gold, every cleared room leaves a chest, and guardians (the Bone Warden, Sir Aldric the Hollow, the Den Mother) drop guaranteed rare-or-better gear and have a boss health bar.
- **Returning to camp:** after a stage's guardian, choose to **return to camp** (banks your gold; Maren has words) or **press on** into the next stage. The gate in camp descends to any stage you've unlocked.
- **Falling:** if you fall, you wake in camp having lost half the gold gathered on that trip.
- **Saving:** progress saves in the browser, and the title screen offers Continue.

**Dungeon progression.** You fight your way north through a chain of sealed rooms. Each cleared room raises its far gate and the next room fades in out of the dark. Once you step through, the gate drops behind you and the room you left fades out and is unloaded. Stages change every four rooms (The Crypt, The Iron Keep, The Ogre Den), each with its own stone, torchlight, fog and enemies, and each ends in a guardian room. After the last stage they repeat with tougher enemies. See [docs/DESIGN.md](docs/DESIGN.md) for the full plan.

## Run

Open `index.html` in a browser. Three.js is vendored in `vendor/`, so it works offline and from `file://`.

A single-file build goes to `dist/deepward-single.html`; regenerate it with `python3 tools/build_single.py`.

## Android

The Android app wraps the web game with [Capacitor](https://capacitorjs.com/).

**Getting a debug APK from GitHub Actions:** the workflow "Android debug APK" (`.github/workflows/android-debug.yml`) runs on every push to `main` or a `ccr-*` branch that changes the game, on `v*` tags, and from the Actions tab (Run workflow). When it finishes, open the run and download the **deepward-debug-apk** artifact. It's a zip holding `deepward-debug-<commit>.apk`. Copy that to your phone and install it; you may need to allow installs from unknown sources.

**What the workflow does:**

1. Copies the game into `www/` (`npm run www`).
2. Generates the Android project (`npx cap add android`).
3. Patches it for fullscreen with the screen kept on (`tools/android_patch.js`).
4. Builds with Gradle.

The `android/` folder isn't committed. To customise the project (icons, splash screen, signing), generate it once, adjust it, and commit it; the workflow then uses yours.

**Building locally** needs Node 22, JDK 17 and the Android SDK:

```bash
npm ci && npm run www && npx cap add android && node tools/android_patch.js && npx cap sync android
cd android && ./gradlew assembleDebug        # -> android/app/build/outputs/apk/debug/app-debug.apk
```

## Camera views

There are two views; switch with **B** or the 🎥 button, and the game remembers your choice.

- **Behind (default):** an orbit camera over the hero's shoulder, like Nightfall Settlement's normal view. The mouse turns the camera (click once to capture it; Esc releases it and pauses). On touch, drag the right side of the screen. The scroll wheel zooms. The hero always faces where the camera looks, so WASD strafes and walks backward; backing up and sidestepping are a little slower. Attacks go where you look, with light aim assist.
- **Top-down:** the fixed high quarter view. The hero faces the way it walks and turns toward the nearest enemy while blocking.

## Controls

| Action | Keyboard / mouse | Xbox controller | Touch |
| --- | --- | --- | --- |
| Move (strafe in the behind view) | WASD / arrows | Left stick | Left thumb (floating stick) |
| Turn camera (behind view) | Mouse (click to capture) | Right stick (click to recentre) | Drag the right side |
| Switch camera | B | View | 🎥 |
| Light attack (3-hit combo) | J / left-click | RB or X | ATTACK |
| Heavy attack (breaks guards) | K / Q / middle-click | RT or Y | HEAVY |
| Block (hold), parry (tap at impact) | L / Shift / right-click | LB or LT | BLOCK |
| Dodge roll (invulnerable mid-roll) | Space | A or B | DODGE |
| Healing flask | R | D-pad up | ⚗ |
| Talk / use (camp) | E | A (when a prompt shows) | ATTACK becomes TALK |
| Gear (equipment and bag) | I or Tab | D-pad down | GEAR |
| Menus | Arrows or W/S, Enter, Esc | D-pad or left stick, A, B | Tap |
| Pause / mute | Esc or P / M | Menu | ⏸ / 🔊 |

Any controller with the browser's standard layout works (Xbox, and PlayStation pads with the same positions). Plug it in or pair it, then press a button so the browser notices it. The on-screen hints switch to controller buttons, A or Menu starts the game and confirms menus, and the controller rumbles when you take a hit, block, parry or land a critical (on browsers that support rumble).

## How a fight works

- **White glint** on an enemy weapon: the attack can be blocked. Raise the block within 0.2 s of impact to **parry**. A parry takes no damage and deals heavy posture damage.
- **Red glow** (and a red floor ring for area attacks): the attack is **unblockable**, so roll through it.
- **Stamina** pays for attacks, rolls and every blocked hit. If a block runs out of stamina, your guard breaks and you're stunned.
- **Posture:** the yellow bar under an enemy's health. It fills from hits, parries and blocked blows. When it's full the enemy is **broken**, and your next hit is a 3× critical.
- **Shield knights** block light attacks from the front, so use a heavy attack or get behind them. **Brutes** don't flinch while they swing.

## Layout

| File | What it holds |
| --- | --- |
| `index.html` | Page markup (HUD, touch pad, screens) and script tags |
| `css/style.css` | All styles, including the touch and portrait layouts |
| `js/config.js` | `CFG`: every balance number (player moves, enemies and their attacks), the stages (rooms, sizes, waves, themes, guardians), gear tables, camp buildings and the story script |
| `js/items.js` | Gear generation (tiers, types, rarities, bonuses), what equipped gear does to the hero, inventory, gold and scrap, the saved game |
| `js/camp.js` | The code-built camp: palisade, campfire, forge, stall, ledger, tents, the stairway gate, NPCs, building upgrades |
| `js/ui.js` | Story dialogue and the menus (smithy, stall, ledger, gate, gear, stage cleared, fallen), with keyboard and controller navigation; boss bar, prompts, toasts |
| `js/audio.js` | Synthesized sound effects (WebAudio) |
| `js/anims.js` | Motion-capture clips (generated by `tools/extract_anims.js` from Nightfall Settlement; do not edit) |
| `js/mocap.js` | Turns the clips into quaternions and samples them, mapping Nightfall's bone names onto this rig |
| `js/rig.js` | Code-built characters (hero, skeleton, knight, brute), weapons, shields; picks a clip per state, time-warps attacks so the impact frame lands on the game's hit, blends joints; hand-made poses for roll and stagger; swing trails |
| `js/fx.js` | Sparks, glints, floor rings, floating text, hit-stop, slow motion, screen shake |
| `js/combat.js` | Attack cones and hit resolution between player and enemies |
| `js/player.js` | The hero's state machine: move, attack combo, block/parry, roll, stagger |
| `js/enemies.js` | Enemy AI: approach/circle, attack tokens, telegraphs, guard, posture, death |
| `js/world.js` | The dungeon: room and corridor building per stage theme, portcullis gates, fade-in/fade-out and unloading, walkable space, encounters, pooled torch lights |
| `js/game.js` | Scene, camera, input, HUD, game flow, main loop, `window.__dw` test hook |
| `tools/combat_test.js` | Headless checks of every combat mechanic (Playwright) |
| `tools/gamepad_test.js` | Headless check of controller support with a simulated Xbox pad |
| `tools/camp_test.js` | Headless check of the camp loop: story, smith, gear, ledger, gate, guardian chest, return, falling, saving |
| `tools/build_single.py` | Builds the single-file version |
| `tools/extract_anims.js` | Copies and mirrors clips from a Nightfall Settlement checkout: `node tools/extract_anims.js ../Nightfall-Settlement` |

## Testing

```bash
node tools/combat_test.js     # set NODE_PATH=$(npm root -g) if Playwright is installed globally
node tools/gamepad_test.js
node tools/camp_test.js
```

It drives the game through `window.__dw` and checks, in both camera views, parry, block, taking a hit, dodging an area slam, unblockable attacks, strafing, the light combo, shield bounce, guard break and the riposte critical. It also plays through five rooms into stage 2 and checks that the gates open and the rooms behind unload.
