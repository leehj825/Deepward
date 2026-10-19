# Deepward

A quarter-view 3D action dungeon crawler that runs in the browser (Three.js r128, no build step). No town, no army: the whole game is the fight. Every enemy attack is telegraphed, and each dungeon tier demands a skill the last one didn't: spacing, then dodging, blocking, parrying, and reading feints.

Every model is built in code from primitives, and there are no model, texture or sound files. Characters move with the same motion-capture animations as Nightfall Settlement. Those clips come from Mixamo, were retargeted to Nightfall's stick-figure rig, and are copied here as joint rotations by `tools/extract_anims.js`. They cover sword-and-shield idle, walking, running and strafing in every direction, combo attacks, a jump smash, a shield block (also while walking), hit reactions and deaths, plus great-sword moves for the brute. The dash and the stagger poses are still hand-made.

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
  - Five weapon types play differently: sword, axe (posture), mace (more posture, short), longsword (reach, slower), and the two-handed **greatsword**.
  - The greatsword deals 1.5× damage with more posture and reach, and swaps the hero to the great-sword motion capture with both hands on the hilt. It leaves no room for a shield: the blade blocks only 55% of a blow, blocking costs more stamina, and you take 10% more damage. Bram forges one on request.
  - Rarities run from Common to Legendary, with random bonuses: critical chance, posture, stamina regen, health, stamina, parry window, life on hit and gold find.
  - Gear power rises with the stage it came from, and what you wear shows on the hero.
- **Loot:** enemies drop gold, every cleared room leaves a chest, and guardians (the Bone Warden, Sir Aldric the Hollow, the Den Mother, the Brood Queen, the Pale Duelist) drop guaranteed rare-or-better gear and have a boss health bar.
- **Returning to camp:** after a stage's guardian, choose to **return to camp** (banks your gold; Maren has words) or **press on** into the next stage. The gate in camp descends to any stage you've unlocked.
- **Falling:** if you fall, you wake in camp having lost half the gold gathered on that trip.
- **Saving:** progress saves in the browser, and the title screen offers Continue.

**Growth.**

- **Levels:** kills give XP (guardians six times as much). Each level adds health, stamina and 2.5% power, and grants a talent point.
- **Weapon mastery:** each weapon type ranks up with the hits it lands. Rank 1 gives +4% damage, rank 2 adds a fourth finishing blow to the light combo, and rank 3 gives +8% posture damage.
- **Expertise:** talent points go into four trees, and you can mix at most two. Each tree has three talents of three ranks, then an ultimate once four points are spent in it:

  | Tree | Talents | Ultimate (F or Y) |
  | --- | --- | --- |
  | Guardian | cheaper blocks, wider parry window, harder ripostes | **Bulwark:** 3 s of free blocks from every side |
  | Duelist | cheaper dashes, a counter after dashing through a blow, critical chance | **Blade Dance:** six untouchable strikes between nearby foes |
  | Berserker | more damage (double below 40% health), posture damage, life on hit | **Bloodrage:** 8 s of +40% damage, faster swings, no stagger |
  | Arcanist | fire damage, damage reduction, stamina regen | **Nova:** a blast of force that hurts, breaks guards and throws foes back |

- **The Expertise screen** draws each tree as a column of nodes joined by lines that light up as you learn. Nodes you can learn now pulse, and dots under a node show its rank. Click a node (or select it with the d-pad and press A) to see its details below the trees: what it does now, what the next rank adds, and what is stopping you, with the Learn or Equip button. Pressing A again on the selected node learns it.
- **Respec:** the training yard in camp shows everything and unlearns talents for gold. T opens Expertise anywhere.

**Guardians.** Each stage ends with a boss that fights in phases. At each mark on its health bar it roars (it can't be hurt, and the shockwave throws you back), then changes:

| Stage | Guardian | Phases |
| --- | --- | --- |
| The Crypt | **The Bone Warden**, a giant skeleton with an unblockable ground slam | 65%: raises two skeletons. 30%: calls an archer and a skeleton, and swings faster. |
| The Iron Keep | **Sir Aldric the Hollow**, a shield knight | 50%: throws his shield down and takes his sword in both hands: no more guard, heavy blows that cost a lot to block, and an unblockable spin. |
| The Ogre Den | **The Den Mother**, a huge brute with a goblin at her side | 65%: a pack of three goblins. 30%: she rages: red, faster, and an unblockable charge. |
| The Spider Depths | **The Brood Queen**, a spider twice your height | 66% and 33%: hatchlings; at 33% she also pounces twice in a row. |
| The Shadow Court | **The Pale Duelist** | 60%: vanishes and strikes from behind you. 30%: two shadow duelists join. |

When a guardian falls, the adds it summoned crumble with it.

**Dungeon progression.** Each stage is one large, winding dungeon with no gates:

- **Sections:** five wide halls, each 30% bigger than the old rooms, set off to the side of one another so the path bends. Open passages join them, so you can walk the whole stage freely.
- **Waves:** walking into a section wakes its monsters, wave after wave. Enemies chase you through the passages if you fall back or run ahead.
- **Chests and healing:** each cleared section heals you a little and leaves a chest beside the path.
- **Minimap:** a round map in the top-right corner.
  - **Layout:** sections appear as you get near them, joined by their passages.
  - **Colours:** red while monsters are awake there, grey once cleared.
  - **Markers:** gold for chests you haven't opened, a red skull for the guardian's lair, red dots for enemies, and a blue arrow for you.
  - **Orientation:** in the behind view it turns so the way you look is up.
  - **Compass:** a gold chevron on its rim points to the next area you haven't cleared (or the lair), with the distance underneath.
  - **Full map:** tap it, or press N, to see the whole stage you've found so far.
- **The lair:** the last section ends in a dark archway. When you step in, the stage's guardian comes out of it.
- **After the guardian:** return to camp, or press on down the stair into the next stage.
- **The stages:** The Crypt, The Iron Keep, The Ogre Den, The Spider Depths and The Shadow Court, each with its own stone, torchlight, fog and enemies. After the last one they repeat with tougher enemies.

See [docs/DESIGN.md](docs/DESIGN.md) for the full plan.

## Run

Open `index.html` in a browser. Three.js is vendored in `vendor/`, so it works offline and from `file://`.

A single-file build goes to `dist/deepward-single.html`; regenerate it with `python3 tools/build_single.py`.

## Android

The Android app wraps the web game with [Capacitor](https://capacitorjs.com/).

**Getting a debug APK from GitHub Actions:** the workflow "Android debug APK" (`.github/workflows/android-debug.yml`) runs on every push to `main` or a `ccr-*` branch that changes the game, on `v*` tags, and from the Actions tab (Run workflow). When it finishes, open the run and download the **deepward-debug-apk** artifact. It's a zip holding `deepward-debug-<commit>.apk`. Copy that to your phone and install it; you may need to allow installs from unknown sources.

**What the workflow does:**

1. Copies the game into `www/` (`npm run www`).
2. Generates the Android project (`npx cap add android`).
3. Patches it (`tools/android_patch.js`): fullscreen with the screen kept on, Deepward's icons and splash screens, and a dark Android 12+ splash.
4. Builds with Gradle.

The `android/` folder isn't committed. It's generated on every build, and the patch applies the customisations. The icon is drawn in code by `tools/make_icons.py`.

**Building locally** needs Node 22, JDK 17 and the Android SDK:

```bash
npm ci && npm run www && npx cap add android && node tools/android_patch.js && npx cap sync android
cd android && ./gradlew assembleDebug        # -> android/app/build/outputs/apk/debug/app-debug.apk
```

## Music and settings

**Music.** The score is generated live, like the sound effects. Chords change every bar and its layers (a pad, a plucked arpeggio, a wandering bell line, bass, drums and brass) fade in and out with the mood:

- **Camp:** warm and major.
- **Dungeon:** sparse and minor.
- **Combat:** drums and bass join, and the tempo rises. It lingers for four seconds after the last foe falls.
- **Guardian:** faster, with darker chords and brass.

**Settings** (from the title or the pause screen; Y on a controller):

- Master, music and effects volume.
- Look sensitivity (0.4× to 2.4×).
- Inverted vertical look.
- Screen shake on or off.
- Graphics quality:
  - **Auto:** Medium on phones and tablets, High elsewhere.
  - **High:** sharp, with soft shadows.
  - **Medium:** 1.5× resolution and smaller shadows; enemies get a soft blob shadow instead of a real one.
  - **Low:** 1× resolution and no shadows.

They are kept on the device, apart from the saved game. M still mutes everything.

## Camera views

There are two views; switch with **B** or the 🎥 button, and the game remembers your choice.

- **Behind (default):** an orbit camera over the hero's shoulder. Backed against a wall, it slides in smoothly and rises over the shoulder rather than clipping into the wall, like Nightfall Settlement's normal view. The mouse turns the camera (click once to capture it; Esc releases it and pauses). On touch, drag the right side of the screen. The scroll wheel zooms. The hero always faces where the camera looks, so WASD strafes and walks backward; backing up and sidestepping are a little slower. Attacks go where you look, with light aim assist.
- **Top-down:** the fixed high quarter view. The hero faces the way it walks and turns toward the nearest enemy while blocking.

## Controls

| Action | Keyboard / mouse | Xbox controller | Touch |
| --- | --- | --- | --- |
| Move (strafe in the behind view) | WASD / arrows | Left stick | Left thumb (floating stick) |
| Turn camera (behind view) | Mouse (click to capture) | Right stick (click to recentre) | Drag the right side |
| Switch camera | B | View | 🎥 |
| Full map | N | | Tap the minimap |
| Light attack (3-hit combo) | J / left-click | RB or X | ATTACK |
| Heavy attack (breaks guards) | K / Q / middle-click | RT | HEAVY |
| Block (hold), parry (tap at impact) | L / Shift / right-click | LB or LT | BLOCK |
| Dash in any direction (invulnerable for most of it) | Space | A or B | DASH |
| Healing flask | R | D-pad up | ⚗ |
| Ultimate (once learned) | F | Y | ULT |
| Expertise (talents) | T | from the gear menu | from GEAR |
| Talk / use (camp) | E | A (when a prompt shows) | ATTACK becomes TALK |
| Gear (equipment and bag) | I or Tab | D-pad down | GEAR |
| Menus | Arrows or W/S, Enter, Esc | D-pad or left stick, A, B | Tap |
| Pause / mute | Esc or P / M | Menu | ⏸ / 🔊 |

Any controller with the browser's standard layout works (Xbox, and PlayStation pads with the same positions). Plug it in or pair it, then press a button so the browser notices it. The on-screen hints switch to controller buttons, A or Menu starts the game and confirms menus, and the controller rumbles when you take a hit, block, parry or land a critical (on browsers that support rumble).

## How a fight works

- **White glint** on an enemy weapon: the attack can be blocked. Raise the block within 0.2 s of impact to **parry**. A parry takes no damage and deals heavy posture damage.
- **Red glow** (and a red floor ring for area attacks): the attack is **unblockable**, so **dash** through it. The dash covers about 2.6 m in 0.3 s, leaves after-images, and in the behind view keeps you facing forward, so you can dash sideways or back.
- **Stamina** pays for attacks, dashes and every blocked hit. If a block runs out of stamina, your guard breaks and you're stunned.
- **Posture:** the yellow bar under an enemy's health. It fills from hits, parries and blocked blows. When it's full the enemy is **broken**, and your next hit is a 3× critical.
- **Amber glow:** the attack can only be **parried** (or dashed). A plain block is smashed aside and the hit lands anyway. Spiders pounce like this.
- **Shield knights** block light attacks from the front, so use a heavy attack or get behind them. **Brutes** don't flinch while they swing.
- **Archers** keep their distance and shoot arrows you can block, parry or dash through. **Goblins** are fast and come in packs.
- **Duelists** feint: the raised overhead stops short and the real slash comes right after, so wait for it before parrying.

## Layout

| File | What it holds |
| --- | --- |
| `index.html` | Page markup (HUD, touch pad, screens) and script tags |
| `css/style.css` | All styles, including the touch and portrait layouts |
| `js/settings.js` | Player settings (volumes, look sensitivity, invert, screen shake), kept in the browser |
| `js/config.js` | `CFG`: every balance number (player moves, enemies and their attacks), the stages (rooms, sizes, waves, themes, guardians), gear tables, camp buildings and the story script |
| `js/items.js` | Gear generation (tiers, types, rarities, bonuses), what equipped gear does to the hero, inventory, gold and scrap, the saved game |
| `js/camp.js` | The code-built camp: palisade, campfire, forge, stall, ledger, tents, the stairway gate, NPCs, building upgrades |
| `js/ui.js` | Story dialogue and the menus (smithy, stall, ledger, gate, gear, stage cleared, fallen), with keyboard and controller navigation; boss bar, prompts, toasts |
| `js/audio.js` | Synthesized sound effects and the generative score (WebAudio) |
| `js/anims.js` | Motion-capture clips (generated by `tools/extract_anims.js` from Nightfall Settlement; do not edit) |
| `js/mocap.js` | Turns the clips into quaternions and samples them, mapping Nightfall's bone names onto this rig |
| `js/rig.js` | Code-built characters (hero, skeleton, knight, brute, archer, goblin, duelist, and an eight-legged spider), weapons, bows, shields; picks a clip per state, time-warps attacks so the impact frame lands on the game's hit, blends joints; hand-made poses for roll and stagger; swing trails |
| `js/fx.js` | Sparks, glints, floor rings, floating text, hit-stop, slow motion, screen shake |
| `js/combat.js` | Attack cones and hit resolution between player and enemies |
| `js/player.js` | The hero's state machine: move, attack combo, block/parry, roll, stagger |
| `js/enemies.js` | Enemy AI: approach/circle, ranged kiting, attack tokens, telegraphs (white, red, amber), feints, leaps, arrows, guard, posture, death |
| `js/world.js` | The dungeon: lays out each stage as winding sections joined by open passages, builds them in the stage's theme, walkable space, routing enemies through the passages, encounters and the guardian's lair, pooled torch lights |
| `js/map.js` | The minimap and compass |
| `js/game.js` | Scene, camera, input, HUD, game flow, main loop, `window.__dw` test hook |
| `tools/combat_test.js` | Headless checks of every combat mechanic (Playwright) |
| `tools/gamepad_test.js` | Headless check of controller support with a simulated Xbox pad |
| `tools/growth_test.js` | Headless check of levels, talent rules, every ultimate, mastery's fourth blow and respec |
| `tools/boss_test.js` | Headless check of all five guardians: phases, roars, summons, Aldric's stance change, the Den Mother's rage, the Pale Duelist's blink |
| `tools/settings_test.js` | Headless check of the settings menu, that each setting applies and is kept, and the music moods |
| `tools/camp_test.js` | Headless check of the camp loop: story, smith, gear, ledger, gate, guardian chest, return, falling, saving |
| `tools/make_icons.py` | Draws the icon in code and writes the web and store images (`icons/`) and the Android launcher icons and splash screens (`resources/android/res/`) |
| `tools/build_single.py` | Builds the single-file version |
| `tools/extract_anims.js` | Copies and mirrors clips from a Nightfall Settlement checkout: `node tools/extract_anims.js ../Nightfall-Settlement` |

## Testing

```bash
node tools/combat_test.js     # set NODE_PATH=$(npm root -g) if Playwright is installed globally
node tools/gamepad_test.js
node tools/camp_test.js
node tools/growth_test.js
node tools/boss_test.js
node tools/settings_test.js
```

It drives the game through `window.__dw` and checks, in both camera views, parry, block, taking a hit, dodging an area slam, unblockable attacks, strafing, the light combo, shield bounce, guard break, the riposte critical, blocking and taking arrows, the parry-only pounce, the duelist's feint and goblin speed. It also walks a whole stage: the path is open end to end, monsters wake when you enter a section and chase you through a passage, the guardian comes out of its lair, and pressing on leads into stage 2.
