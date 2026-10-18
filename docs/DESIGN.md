# Deepward: Game Design

A quarter-view action dungeon crawler. You enter a dungeon, fight through its rooms and a boss, take the loot, then level up and refit. There's no town building and no army, only the fight.

## Pillars

1. **Telegraph, read, react.** Every enemy attack has a visible wind-up, and the player chooses the answer.
2. **Each dungeon teaches a skill.** Difficulty comes from new demands, not only bigger numbers.
3. **Everything is built in code.** Rigs, gear, animation and sound are procedural, the same approach as Nightfall Settlement.

## Combat (built in milestone 1)

| Action | What it does |
| --- | --- |
| Light attack | Fast 3-hit combo (slash, backhand, overhead) with low posture damage |
| Heavy attack | Slow; breaks shield guards; staggers even brutes when they aren't swinging |
| Block | Absorbs 85% of damage and drains stamina; a guard break stuns |
| Parry | A block raised within 0.2 s of impact: no damage, big posture damage, enemy staggered. Mashing block doesn't parry. |
| Dodge roll | Invulnerable for most of the roll; rolls pass through enemies |
| Riposte | Any hit on a posture-broken enemy is a 3× critical |

- **Stamina** pays for attacks, rolls and blocked hits. It regenerates after a short pause, and more slowly while you block.
- **Posture:** enemies fill a posture bar from hits, blocks and parries. It drains when they're left alone, and when it's full they're broken.
- **Telegraphs:**
  - A white glint means blockable.
  - Red means unblockable, so dodge.
  - Area attacks draw a filling red ring on the floor.
  - Enemies track you during the wind-up but commit 0.22 s before the hit, which is the moment to roll sideways.
- **Attack tokens:** at most two enemies wind up or swing at once, so crowds stay readable.
- **Feel:** hit-stop on impact, slow motion on a parry, screen shake, swing trails, sparks and floating numbers.

## Progression through the dungeon (built)

- The dungeon is a chain of rooms heading north, joined by short corridors with a portcullis at each end.
- **Entering a room** drops the gate behind you. The room then sends its waves.
- **Clearing a room** heals 35% of your health and raises the far gate. The next room is built and fades in beyond it.
- **Stepping into the next room** closes its gate behind you. The room you left fades out and is unloaded, so only the current room and the one ahead exist at a time.
- **Stages** are four rooms each, with the last room a guardian room: its first enemy is a larger elite with 1.7× health and damage. Each stage has its own theme (stone and brick colours, torch colour, fog, ambient light, decor), and fog and light drift to the new theme as you cross into it.
- **Lighting:** a fixed pool of six point lights follows the torches nearest the hero, so rooms coming and going never force a shader recompile.
- **Camera:** the south doorway turns see-through while the camera is behind it.

## Animation (built)

- Characters play Nightfall Settlement's Mixamo motion capture: idle, walk, run, strafe and walk-back loops, four sword attacks and slashes, a jump smash, a looping shield block, hit reactions and deaths. The brute uses the great-sword set.
- Nightfall mirrors Mixamo so its sword sits in the +X hand. Deepward holds the sword in the anatomically right hand (-X), so the extractor mirrors it back.
- **Attacks:** each clip is time-warped so its recorded moment of impact lands exactly on the game's hit frame. Short wind-ups feel snappy, and long enemy wind-ups play the same swing slowly, which is the telegraph.
- **Movement:** all walking clips share one stride phase driven by real ground speed, so switching between walk, strafe, back and run doesn't hitch.
- **Blocking while moving:** the upper body plays the block and the legs keep walking.
- **Hand-made poses** remain for the dodge roll, stagger, guard break and posture break.

## Dungeon tiers (planned)

| Tier | Dungeon | New threat | Skill it forces |
|---|---|---|---|
| 1 | Crypt | Slow skeletons | Basic attacks and spacing |
| 2 | Goblin Warren | Fast swarms, archers | Dodge |
| 3 | Iron Keep | Shield knights | Block and heavy attacks |
| 4 | Spider Depths | Pounces that can only be parried | Parry timing |
| 5 | Forge of Golems | Unblockable slams mixed with blockable swings | Telling blockable from unblockable |
| 6 | Shadow Court | Feints and delayed attacks | Patience |
| 7 | Dragon's Maw | Multi-phase boss | Everything |

Each dungeon has 5 to 8 rooms from hand-tuned templates, one optional elite, and a boss. Cleared dungeons can be replayed at higher ranks for better loot.

## Story, camp and gear (built)

- **Story:** an opening (the Deep under Varrow Hill; Deepward, the last camp on its rim). Maren speaks before each stage, again after each guardian falls, and at every new depth as the stages repeat. The guardians are the Bone Warden, Sir Aldric the Hollow and the Den Mother; each has a boss bar.
- **Camp:** a hub between stages. You talk to Maren, Bram (forge, upgrade, salvage) and Tilda (buy and sell), use the ledger to build up the forge, apothecary and training yard, and take the gate down to any unlocked stage. Each building's level shows in the camp.
- **Loop:** clearing a stage's guardian offers a choice: return to camp, banking gold, or press on. Falling wakes you in camp with half the trip's gold lost. Progress saves in the browser.
- **Gear as built:**
  - Five slots: weapon, shield, armour, helm and trinket.
  - Weapon types: sword, axe, mace and longsword.
  - Tiers by depth, four rarities, eight bonus types, and smith upgrades up to +8 with the best forge.
  - Gear changes the hero's look: blade, weapon model, tunic colour, plate, helm style, shield face and amulet.

## Gear (original plan, partly built)

- **Slots:** weapon, off-hand, helm, chest, gloves, boots, ring, amulet.
- **Weapon types:** sword (balanced), greataxe (posture), daggers (long combos), spear (reach), mace (stuns armour). Each has its own combo poses.
- **Rarity:** Common, Rare, Epic and Legendary, with random bonuses (crit, stamina regen, parry window, lifesteal, elemental damage). Legendaries carry unique effects.
- **Weight** slows the roll, so you trade nimbleness against tankiness.
- **Forge** (a single menu screen between dungeons): upgrade, salvage, or reroll one bonus.
- Every equipped piece is built as a mesh on the rig.

## Progression (planned)

- **Character level:** raises health, stamina and power, and gives a talent point.
- **Weapon mastery:** each weapon type levels with use and unlocks new combo moves.
- **Expertise trees:** Guardian (block/parry), Duelist (dodge/counter/crit), Berserker (low-health damage, posture) and Arcanist (infusions, ranged skill). Each tree has an ultimate.
- **Death** loses half the run's unbanked loot.

## Milestones

1. **Combat feel (done):** an arena with hero, skeleton, shield knight and brute; light/heavy attacks, block, parry, dodge, stamina, posture, telegraphs, waves, touch controls, headless combat tests.
2. **Enemy roster:** archers, swarms, pouncers, feints, more telegraph types.
3. **Dungeon generation:** room templates, tiers 1 to 3, the first boss.
4. **Gear and loot:** slots, rarity, bonuses, gear meshes, inventory.
5. **Progression:** levels, weapon mastery, expertise trees and ultimates.
6. **Tiers 4 to 7:** bosses, saving, polish, single-file and mobile builds.
