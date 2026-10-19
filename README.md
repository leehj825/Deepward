# Deepward

A quarter-view 3D action dungeon crawler that runs in the browser (Three.js r128, no build step). No town, no army: the whole game is the fight. Every enemy attack is telegraphed, and each dungeon tier demands a skill the last one didn't: spacing, then dodging, blocking, parrying, and reading feints.

Every model is built in code from primitives, and there are no model, texture or sound files. Characters move with the same motion-capture animations as Nightfall Settlement. Those clips come from Mixamo, were retargeted to Nightfall's stick-figure rig, and are copied here as joint rotations by `tools/extract_anims.js`. They cover sword-and-shield idle, walking, running and strafing in every direction, combo attacks, a jump smash, a shield block (also while walking), hit reactions and deaths, plus great-sword moves for the brute. The dash and the stagger poses are still hand-made.

**Gear screen.** Open it with I (or Tab, d-pad down on a controller, GEAR on touch):

- **The hero in 3D,** wearing exactly what you have on. It turns slowly; drag it to turn it yourself. The five slots sit around it (helm, armour and trinket on the left; weapon and shield on the right), each showing a rendered picture of the piece, its upgrade level and its sockets. Your numbers (health, stamina, damage, posture, block, armour, critical chance, flasks) sit below the weapon.
- **The bag** is a grid of pictures, framed in the rarity's colour (orange for uniques). A green ▲ marks a piece that beats what you wear in that slot.
- **Details:** select a piece to see everything about it, with Equip or Take off. Selecting it again (A on a controller, Enter on the keyboard) does the same.
- **Comparison:** under the details, green ▲ and red ▼ show exactly how your numbers would change if you wore it instead (health, stamina, damage, posture, swing speed, reach, block, armour, critical chance, parry window, stamina regen, life on hit, gold found, flasks), and whether a two-handed weapon would leave your shield unused. For a worn piece it shows what taking it off would cost.
- **Sort and filter:** chips above the bag show one slot at a time; the sort button cycles Newest, Rarity, Slot and Best first.
- **Salvage:** in camp, the details offer Salvage for scrap right there (uniques only at Bram's).
- Bram's and Tilda's lists show the same pictures.

**Codex and achievements.** Open the codex with O, from the gear screen, or from the pause screen.

- **Bestiary:** an enemy's entry opens at your first kill. It lists how each of its attacks is telegraphed and how to answer it, along with the guardians' phases and the champions' traits.
- **Uniques:** the ones you've found.
- **Achievements:** 32 of them, such as First Blood, Unbroken Guard, Untouched (a guardian without taking a hit), The Collector and No Bottom. Each pays gold the moment you earn it, and that gold is never at risk.
- **Records:** lifetime numbers such as foes felled, parries, executions, falls and the deepest Endless floor.

**Training yard.** Sergeant Hobb spars with you in camp through six lessons:

1. Light attacks
2. Heavy attacks
3. Blocking the white glint
4. Parrying at the moment of impact
5. Dashing through a red, unblockable slam
6. Breaking his posture and executing him

A box at the top says what to press in your own controls (keyboard, controller or touch) and counts your progress. You can skip a lesson or leave at any time. A new game offers the training after the opening story, and the trainer at the yard sign runs it again whenever you like. Finishing it the first time pays 150 gold.

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
  - Seven weapon types play differently:
    - **Sword:** the all-rounder.
    - **Axe:** more posture damage.
    - **Mace:** even more posture damage, short reach.
    - **Longsword:** more reach, slower.
    - **Greatsword:** two-handed (below).
    - **Spear:** used with a shield. Its light combo is thrust, thrust, then a wide sweep reaching 3 m, and its heavy is a lunging thrust.
    - **Twin daggers:** a blade in each hand and no shield. A fast five-cut combo, a spinning heavy, and dashes that cost 40% less, but the blades block only 60% of a blow.
  - Bram forges a greatsword, spear or twin daggers on request.
  - The greatsword deals 1.5× damage with more posture and reach, and swaps the hero to the great-sword motion capture with both hands on the hilt. It leaves no room for a shield: the blade blocks only 55% of a blow, blocking costs more stamina, and you take 10% more damage. Bram forges one on request.
  - Rarities run from Common to Legendary, with random bonuses: critical chance, posture, stamina regen, health, stamina, parry window, life on hit and gold find.
  - Gear power rises with the stage it came from, and what you wear shows on the hero.
- **Uniques:** nine named legendaries (shown in orange), each with an effect of its own. Each one turns up once before any repeats.
  - **Where they drop:** a guardian's chest has a 30% chance, a rich chest 10%, and Tilda sometimes has one for sale.

  | Unique | Slot | Effect |
  | --- | --- | --- |
  | Dawnbreaker | sword | A parry looses a blade of light down the line |
  | Widowmaker | daggers | +60% damage to foes below 30% health |
  | Grave Oath | greatsword | Every kill heals 5% |
  | Skypiercer | spear | The heavy thrust reaches 2 m further and pierces the line |
  | Emberwake Mail | armour | Dashing leaves burning ground |
  | Crown of Thorns | helm | Blocked blows hurt the attacker for half their damage |
  | Aegis of the Pale | shield | Parries give back 25 stamina; parry window +0.04 s |
  | Gambler's Coin | trinket | +15% critical chance, 10% less health |
  | Heart of the Deep | trinket | One more flask, which heals 15% more |

- **Gems and sockets:** rare-and-better weapons, armour and helms roll sockets: Rare up to 1, Epic 1 to 2, Legendary 2.
  - **Drops:** chests have a 35% chance of a gem and a guardian's chest gives two; elites 15%, pots 3%.
  - **Kinds:** Ruby +6% damage, Sapphire +10 stamina, Emerald +15 health, Topaz +4% critical chance, Onyx 2.5% less damage taken.
  - **Bram's Gems tab:** set gems into sockets, pry them out for free, or cut a new socket (◆120 ⚙6, up to two per item).
- **Loot:** enemies drop gold, every cleared room leaves a chest, and guardians (the Bone Warden, Sir Aldric the Hollow, the Den Mother, the Brood Queen, the Pale Duelist) drop guaranteed rare-or-better gear and have a boss health bar.
- **Returning to camp:** after a stage's guardian, choose to **return to camp** (banks your gold; Maren has words) or **press on** into the next stage. The gate in camp descends to any stage you've unlocked.
- **Falling:** if you fall, you wake in camp having lost half the gold gathered on that trip.
- **Saving:** progress saves in the browser, and the title screen offers Continue.

**The Endless Deep.** Once the last guardian (the Hollow King) falls, the camp gate offers two more ways down:

- **The Endless Deep:** floor after floor of fresh dungeon, drawn from a random stage's look and enemies. It gets 18% tougher each floor and brings in enemies from every stage from floor 4.
  - Every third floor ends in that stage's guardian (with its phases); the other floors bring its champion mid-floor.
  - Between floors, choose to go deeper (you heal 30%) or go home and keep your gold. Fall, and you lose half of the trip's gold as usual.
  - Loot and elite odds keep rising with depth, and your deepest floor is kept.
- **Daily Descent:** the same climb seeded by the date, so every warden gets the same floors that day. Today's best is kept separately.

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

**Elites and champions.** Any enemy may come as an elite, more often deeper down. Elites are worth twice the XP and gold, and have a coloured aura ring and their name over the health bar:

| Elite | What it does |
| --- | --- |
| Armored (steel) | Light hits do 40% less; heavy attacks go straight through |
| Swift (cyan) | Moves 40% faster, winds up faster, attacks more often |
| Vampiric (crimson) | Heals when it hurts you |
| Volatile (orange) | After it falls, a red ring ticks for 1.3 s, then it bursts: get clear or dash |
| Warded (violet) | A bubble soaks four hits (heavies count double), then breaks; it comes back after 7 s |

The middle section of each stage ends with a **champion**: a named elite with its own boss bar, worth three times the reward.

| Stage | Champion |
| --- | --- |
| The Crypt | The Hollow Sentinel (armored knight) |
| The Iron Keep | The Gaoler (armored, vampiric brute) |
| The Ogre Den | Gorehide (swift brute) |
| The Spider Depths | The Widow (vampiric, swift spider) |
| The Shadow Court | The Black Herald (warded, swift duelist) |

**Guardians.** Each stage ends with a boss that fights in phases. At each mark on its health bar it roars (it can't be hurt, and the shockwave throws you back), then changes:

| Stage | Guardian | Phases |
| --- | --- | --- |
| The Crypt | **The Bone Warden**, a giant skeleton with an unblockable ground slam | 65%: raises two skeletons. 30%: calls an archer and a skeleton, and swings faster. |
| The Iron Keep | **Sir Aldric the Hollow**, a shield knight | 50%: throws his shield down and takes his sword in both hands: no more guard, heavy blows that cost a lot to block, and an unblockable spin. |
| The Ogre Den | **The Den Mother**, a huge brute with a goblin at her side | 65%: a pack of three goblins. 30%: she rages: red, faster, and an unblockable charge. |
| The Spider Depths | **The Brood Queen**, a spider twice your height | 66% and 33%: hatchlings; at 33% she also pounces twice in a row. |
| The Shadow Court | **The Pale Duelist** | 60%: vanishes and strikes from behind you. 30%: two shadow duelists join. |

When a guardian falls, the adds it summoned crumble with it.

**Act II.** Below the Shadow Court the stair goes on through five more stages, and the story ends at the Throne:

| Stage | Guardian | Phases |
| --- | --- | --- |
| The Sunken Temple | **The Drowned Prophet**, a caster throwing three-orb volleys | 66%: two acolytes. 33%: more raised dead, and faster volleys. |
| The Frost Halls | **The Frost Marshal**, a shield-bearer | 60%: a bearer and a knight. 30%: drops the shield for a two-handed stance with an unblockable spin. |
| The Ashen Forge | **The Furnace Lord**, a brute with a huge fire slam | 65%: goblins. 30%: rages and calls a bearer. |
| The Bone Orchard | **The Bone Gardener**, a bone caller | 66%: skeletons and an archer. 33%: two knights, and it raises up to six. |
| The Throne of the Deep | **The Hollow King**, the first warden | 70%: two-handed, with a parry-only overhead. 40%: a duelist and a caster join, and he blinks behind you. 15%: rages. |

New enemies:

- **Drowned Acolyte:** keeps its distance and throws slow glowing orbs. Block them, dash, or parry at the last moment to send the orb back for heavy damage.
- **Shieldbearer:** a blue knight with a faint blue circle. Allies inside the circle take 45% less damage, so kill it first.
- **Bone Caller:** raises up to four skeletons from the floor (they crumble when it dies) and throws cursed orbs.
- **Mimic:** one chest per Act II stage isn't a chest. It springs when you come close, and pays a gem and often rare gear.

Each Act II stage has its own champion: the Tidecaller, the Ice Bulwark, the Slagborn, the Gravetender and the King's Hand.

**Dungeon progression.** Each stage is one large, winding dungeon with no gates:

- **Sections:** five wide halls, each 30% bigger than the old rooms, set off to the side of one another so the path bends. Open passages join them, so you can walk the whole stage freely.
- **Waves:** walking into a section wakes its monsters, wave after wave. Enemies chase you through the passages if you fall back or run ahead.
- **Chests and healing:** each cleared section heals you a little and leaves a chest beside the path.
- **Off the path:**
  - **Side rooms:** two per stage, through doorways in a section's side wall. An **elite's den** holds one tougher guard (orange health bar) who drops a rich chest. A **treasure vault** holds a rich chest behind two spike plates that strike out of step.
  - **Traps:** two passages per stage. **Spike plates** glow red and rattle before they strike. **Swinging blades** sweep across the passage. Both are unblockable, so time your crossing or dash through.
  - **Shrine:** one per stage, a glowing obelisk. Walk up and press E (A, or TALK on touch) to pray, then pick one of three blessings that last until you leave the stage. The choices are Wrath, Iron Skin, Swiftness, Vigor, Mending, Fortune, Thirst and Steady Hand. Your blessings show under the gold.
  - **Pots and crates:** they line the walls. Smash them for gold, and now and then a flask refill.
- **Minimap:** a round map in the top-right corner.
  - **Layout:** sections appear as you get near them, joined by their passages.
  - **Colours:** red while monsters are awake there, grey once cleared.
  - **Markers:** gold for chests you haven't opened, a red skull for the guardian's lair, red dots for enemies, and a blue arrow for you.
  - **Orientation:** in the behind view it turns so the way you look is up.
  - **Compass:** a gold chevron on its rim points to the next area you haven't cleared (or the lair), with the distance underneath.
  - **Full map:** tap it, or press N, to see the whole stage you've found so far.
- **The lair:** the last section ends in a dark archway. When you step in, the stage's guardian comes out of it.
- **After the guardian:** return to camp, or press on down the stair into the next stage.
- **The stages:** The Crypt, The Iron Keep, The Ogre Den, The Spider Depths and The Shadow Court, then Act II's Sunken Temple, Frost Halls, Ashen Forge, Bone Orchard and Throne of the Deep, each with its own stone, torchlight, fog and enemies. After the last one they repeat with tougher enemies.

See [docs/DESIGN.md](docs/DESIGN.md) for the full plan.

## Status and roadmap

Everything above is built and covered by the headless tests: ten stages in two acts, the Endless Deep, camp, gear with uniques and gems, growth, the codex, the training yard, difficulty and accessibility options, and customizable touch controls. Only a debug APK is built for now.

Next, in order (details in `docs/DESIGN.md` → Roadmap):

1. **V1:** play on a real phone: an FPS overlay, dynamic resolution and fixes from device testing.
2. **V2:** gear depth: gloves, boots and ring slots, weight, elemental bonuses, rerolling a bonus.
3. **V3:** save safety: versioned saves, export and import, save slots.
4. **V4:** remappable keyboard and controller buttons.
5. **V5:** Endless Deep curses for more gold.
6. **V6:** a weapon art per weapon type at mastery rank 3.
7. **V7:** a signed release build, when you want one.

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

**Atmosphere.**

- **Guardian music:** every guardian has a boss theme of its own (chords, scale and tempo); the Hollow King's is low and slow.
- **Weather:** each stage has its own:
  - **Crypt:** dust.
  - **Spider Depths:** violet spores.
  - **Sunken Temple:** falling drips.
  - **Frost Halls:** snow.
  - **Ashen Forge:** rising embers.
  - **Bone Orchard:** drifting ash.
  - **Throne:** gold motes.
- **Guardian entrances:** a guardian makes an entrance. The world pauses behind letterbox bars while the camera swings to it, and any key, tap or button skips it.
- **Sounds:** spike traps, orbs being cast and reflected, executions, mimics, elites, shrines and achievements each have their own.
- **Vibration:** on phones, hits, blocks and parries vibrate (Settings → Vibration).

**Settings** (from the title or the pause screen; Y on a controller):

- Master, music and effects volume.
- Look sensitivity (0.4× to 2.4×).
- Inverted vertical look.
- Screen shake on or off.
- Difficulty:
  - **Story:** half the damage, 25% softer foes, enemies attack 40% less often, and the parry window is 0.08 s wider.
  - **Normal:** as tuned.
  - **Hard:** 35% more damage, 20% tougher foes, quicker attacks, three may attack at once, and a tighter parry window.
- Telegraph words: ✖ DASH! over unblockable attacks and ▲ PARRY! over parry-only ones, so you don't have to rely on red and amber.
- Hit-stop and slow motion, each on or off.
- Graphics quality:
  - **Auto:** Medium on phones and tablets, High elsewhere.
  - **High:** sharp, with soft shadows.
  - **Medium:** 1.5× resolution and smaller shadows; enemies get a soft blob shadow instead of a real one.
  - **Low:** 1× resolution and no shadows.
- **Automatic resolution** (on by default): when frames run slow during a fight, the game draws fewer pixels (down to half) and creeps back up when there is room again.
- **Show performance:** a small readout at the bottom with FPS, frame time, draw calls, triangles, quality and the current resolution step. Handy for telling me how it runs on your phone.
- Touch controls (phones and tablets only):
  - Button size (0.7× to 1.5×) and opacity.
  - **Left-handed:** mirrors the buttons to the left side, with the move stick and camera drag swapped.
  - **Arrange buttons:** drag each button where your thumb wants it, then tap Done. Reset puts them all back. Positions are kept as a share of the screen, so they survive turning the phone.

Switching to another app (or tab) pauses the fight and holds the sound until you come back.

They are kept on the device, apart from the saved game. M still mutes everything.

## Camera views

There are two views; switch with **B** or the 🎥 button, and the game remembers your choice.

- **Behind (default):** an orbit camera over the hero's shoulder. Backed against a wall, it slides in smoothly and rises over the shoulder rather than clipping into the wall, like Nightfall Settlement's normal view. The mouse turns the camera (click once to capture it; Esc releases it and pauses). On touch, drag the right side of the screen (the left side in the left-handed layout). The scroll wheel zooms. The hero always faces where the camera looks, so WASD strafes and walks backward; backing up and sidestepping are a little slower. Attacks go where you look, with light aim assist.
- **Top-down:** the fixed high quarter view. The hero faces the way it walks and turns toward the nearest enemy while blocking.

## Controls

| Action | Keyboard / mouse | Xbox controller | Touch |
| --- | --- | --- | --- |
| Move (strafe in the behind view) | WASD / arrows | Left stick | Left thumb (floating stick) |
| Turn camera (behind view) | Mouse (click to capture) | Right stick (click to recentre) | Drag the right side |
| Lock on (again to let go) | C | Right-stick click | 🎯 |
| Switch camera | B | View | 🎥 |
| Full map | N | | Tap the minimap |
| Codex | O | from the gear menu | from GEAR |
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
- **Lock-on:** C (right-stick click, 🎯) locks onto the foe nearest where you look. A gold marker spins over it, the camera swings to keep it in view, the hero faces it and strafes around it, and attacks go to it. When it dies, the lock moves to the next foe nearby.
- **Execution:** when an enemy's posture breaks, its bar reads EXECUTE. A heavy attack close by finishes it with a slow-motion blow that nothing can interrupt. Ordinary foes die outright; guardians and champions take a huge critical instead.
- **Shield knights** block light attacks from the front, so use a heavy attack or get behind them. **Brutes** don't flinch while they swing.
- **Archers** keep their distance and shoot arrows you can block, parry or dash through. **Goblins** are fast and come in packs.
- **Duelists** feint: the raised overhead stops short and the real slash comes right after, so wait for it before parrying.

## Layout

| File | What it holds |
| --- | --- |
| `index.html` | Page markup (HUD, touch pad, screens) and script tags |
| `css/style.css` | All styles, including the touch and portrait layouts |
| `js/settings.js` | Player settings (volumes, look, screen shake, quality, difficulty, accessibility, vibration, touch layout), kept in the browser |
| `js/config.js` | `CFG`: every balance number (player moves, enemies and their attacks), the stages (rooms, sizes, waves, themes, guardians), gear tables, camp buildings and the story script |
| `js/items.js` | Gear generation (tiers, types, rarities, bonuses), what equipped gear does to the hero, inventory, gold and scrap, the saved game |
| `js/camp.js` | The code-built camp: palisade, campfire, forge, stall, ledger, tents, the stairway gate, NPCs, building upgrades |
| `js/ui.js` | Story dialogue and the menus (smithy, stall, ledger, gate, gear, stage cleared, fallen), with keyboard and controller navigation; boss bar, prompts, toasts |
| `js/audio.js` | Synthesized sound effects and the generative score (WebAudio) |
| `js/anims.js` | Motion-capture clips (generated by `tools/extract_anims.js` from Nightfall Settlement; do not edit) |
| `js/mocap.js` | Turns the clips into quaternions and samples them, mapping Nightfall's bone names onto this rig |
| `js/rig.js` | Code-built characters (hero, skeleton, knight, brute, archer, goblin, duelist, acolyte, shield-bearer, bone caller, an eight-legged spider and the mimic chest), spears, daggers, staffs, weapons, bows, shields; picks a clip per state, time-warps attacks so the impact frame lands on the game's hit, blends joints; hand-made poses for roll and stagger; swing trails |
| `js/fx.js` | Sparks, glints, floor rings, floating text, hit-stop, slow motion, screen shake |
| `js/combat.js` | Attack cones and hit resolution between player and enemies |
| `js/player.js` | The hero's state machine: move, attack combo, block/parry, roll, stagger |
| `js/enemies.js` | Enemy AI: approach/circle, ranged kiting, attack tokens, telegraphs (white, red, amber), feints, leaps, arrows, guard, posture, death |
| `js/world.js` | The dungeon: lays out each stage as winding sections joined by open passages, builds them in the stage's theme, walkable space, routing enemies through the passages, encounters and the guardian's lair, pooled torch lights |
| `js/props.js` | Breakable pots and crates, spike plates and swinging blades, shrines and their blessings, mimics |
| `js/endless.js` | The Endless Deep and Daily Descent: seeded random floors, the floor generator, records |
| `js/tutorial.js` | The training yard: Sergeant Hobb's six lessons, counted as you do them |
| `js/codex.js` | Lifetime records, the bestiary text and the achievements |
| `js/touchlayout.js` | Touch button size, opacity, the left-handed layout and the drag-to-arrange editor |
| `js/gearview.js` | The gear screen's pictures: the turning hero in their gear and a rendered picture of each item, from one small renderer |
| `js/map.js` | The minimap and compass |
| `js/game.js` | Scene, camera, input, HUD, game flow, main loop, `window.__dw` test hook |
| `tools/combat_test.js` | Headless checks of every combat mechanic (Playwright) |
| `tools/gamepad_test.js` | Headless check of controller support with a simulated Xbox pad |
| `tools/growth_test.js` | Headless check of levels, talent rules, every ultimate, mastery's fourth blow and respec |
| `tools/boss_test.js` | Headless check of all ten guardians: phases, roars, summons, stance changes, rages, blinks, and adds crumbling when the guardian falls |
| `tools/settings_test.js` | Headless check of the settings menu, that each setting applies and is kept, and the music moods |
| `tools/loot_test.js` | Headless check of uniques (each drops once, and each effect), gems in sockets, Bram's Gems tab and gem drops |
| `tools/endless_test.js` | Headless check of the Endless Deep: unlocking, seeded floors, toughness, the guardian every third floor, the choice between floors, records |
| `tools/tutorial_test.js` | Headless check of the training yard: the offer, all six lessons done for real, the reward, leaving early |
| `tools/codex_test.js` | Headless check of records, the bestiary, achievements paying once, and opening the codex from the gear and pause screens |
| `tools/touch_test.js` | Headless check of the touch controls on a phone screen: size, opacity, left-handed, dragging a button, keeping it, Reset |
| `tools/gear_test.js` | Headless check of the gear screen: the hero preview, a picture per item, details, equipping and taking off, and that every helm covers the head |
| `tools/camp_test.js` | Headless check of the camp loop: story, smith, gear, ledger, gate, guardian chest, return, falling, saving |
| `tools/make_icons.py` | Draws the icon in code and writes the web and store images (`icons/`) and the Android launcher icons and splash screens (`resources/android/res/`) |
| `tools/balance.js` | Balance bot: a scripted warden (casual and skilled profiles) plays every stage and some Endless floors with typical gear, and reports deaths, time, damage taken and boss times |
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
node tools/loot_test.js
node tools/endless_test.js
node tools/tutorial_test.js
node tools/codex_test.js
node tools/touch_test.js
node tools/gear_test.js
node tools/balance.js both 4   # balance report (slow); not a pass/fail test
```

It drives the game through `window.__dw` and checks, in both camera views, parry, block, taking a hit, dodging an area slam, unblockable attacks, strafing, the light combo, shield bounce, guard break, the riposte critical, blocking and taking arrows, the parry-only pounce, the duelist's feint and goblin speed. It also walks a whole stage: the path is open end to end, monsters wake when you enter a section and chase you through a passage, the guardian comes out of its lair, and pressing on leads into stage 2. It also checks that the side rooms are reachable, the den's elite chases you out, the vault's spikes hurt, pots break, and a shrine's blessing applies.
