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

- **One dungeon per stage:** a winding run of five sections heading north. Each section is a wide hall, sized from `CFG.stages` times `sectionScale` (1.3) and shifted sideways from the last so the path bends. Straight open passages (4 m wide, 8 m long) join them. There are no gates, and the whole stage is built when you arrive.
- **Encounters:** walking into a section wakes it. After a short breath its waves come in turn, spawning away from the hero. Several sections can be awake at once if you run ahead.
- **Clearing a section** heals 35% of your health and leaves a chest beside the path.
- **Chasing:** enemies roam the whole dungeon. If the hero is in another section, they head for the doorway on the way: each point is placed along the path (sections even, passages odd) and they step toward the next doorway.
- **The lair:** the last section ends in a dark archway in its far wall. Stepping in shakes the ground, its banner shows, and the guardian comes out of the archway. Its big chest stands before the lair.
- **After the guardian:** you choose between returning to camp and pressing on. Pressing on fades into the next stage, with the trip's gold still at risk.
- **Themes:** each stage has its own stone and brick colours, torch colour, fog, ambient light and decor. Decor is kept off the path between the doorways.
- **Lighting:** a fixed pool of six point lights follows the torches nearest the hero, so the shaders never recompile.
- **Camera:** the frame of a section's south doorway turns see-through while the camera is behind it.

## Animation (built)

- Characters play Nightfall Settlement's Mixamo motion capture: idle, walk, run, strafe and walk-back loops, four sword attacks and slashes, a jump smash, a looping shield block, hit reactions and deaths. The brute uses the great-sword set.
- Nightfall mirrors Mixamo so its sword sits in the +X hand. Deepward holds the sword in the anatomically right hand (-X), so the extractor mirrors it back.
- **Attacks:** each clip is time-warped so its recorded moment of impact lands exactly on the game's hit frame. Short wind-ups feel snappy, and long enemy wind-ups play the same swing slowly, which is the telegraph.
- **Movement:** all walking clips share one stride phase driven by real ground speed, so switching between walk, strafe, back and run doesn't hitch.
- **Blocking while moving:** the upper body plays the block and the legs keep walking.
- **Hand-made poses** remain for the dodge roll, stagger, guard break and posture break.

## Stages and enemies (built)

| Stage | Theme | Enemies | Skill it forces | Guardian |
|---|---|---|---|---|
| 1 | The Crypt | Skeletons, skeleton archers | Spacing; closing on or blocking arrows | The Bone Warden |
| 2 | The Iron Keep | Shield knights, archers | Block and heavy attacks | Sir Aldric the Hollow |
| 3 | The Ogre Den | Goblin swarms, brutes | Dash; crowd reading | The Den Mother |
| 4 | The Spider Depths | Spiders whose pounce can only be parried | Parry timing | The Brood Queen |
| 5 | The Shadow Court | Feinting duelists | Patience | The Pale Duelist |

- **Archers** keep 5.5 to 10 m away, back off when you close in, and loose an arrow after a long draw. Arrows can be blocked, parried or dashed through. Archers don't take one of the two attack tokens, so they add pressure on top of the melee foes.
- **Goblins** are small and fast, with quick thrusts and two-hit slashes; they come in packs.
- **Spiders** are code-built eight-legged rigs. Their bite is ordinary, but the pounce glows **amber**: a block alone is smashed aside and the hit lands anyway. Only a parry (or a dash) answers it.
- **Duelists** open with a raised overhead that is a **feint**: the wind-up stops short and the real slash follows quickly. Raising the guard on the feint wastes the parry window.
- After the fifth stage the stages repeat with tougher enemies.

## Guardians (built)

- The first enemy of each stage's last room is grown into a boss from `CFG.bosses`: bigger, with more health, posture and reach, sometimes extra moves, and a boss bar with a tick at each phase mark.
- **Phases:** when health drops past a mark, the guardian roars for 1.4 s. It can't be hurt, and halfway through a shockwave throws the hero back. Then the phase's changes apply: summoned adds (60% strength, crumbling when the guardian dies), stat overrides, new or replacement attacks, faster wind-ups, a stance change, or a rage tint.
- **The five:**
  - **Bone Warden:** a ground slam, then adds twice.
  - **Sir Aldric:** drops the shield at half health (it stays on the floor) and switches to the great-sword motion capture with an unblockable spin.
  - **Den Mother:** goblins, then rage with an unblockable charge.
  - **Brood Queen:** hatchlings, then a double pounce (both parry-only).
  - **Pale Duelist:** a blink that reappears behind the hero before a thrust, then two shadow duelists.

## Story, camp and gear (built)

- **Story:** an opening (the Deep under Varrow Hill; Deepward, the last camp on its rim). Maren speaks before each stage, again after each guardian falls, and at every new depth as the stages repeat. The guardians are the Bone Warden, Sir Aldric the Hollow, the Den Mother, the Brood Queen and the Pale Duelist; each has a boss bar.
- **Camp:** a hub between stages. You talk to Maren, Bram (forge, upgrade, salvage) and Tilda (buy and sell), use the ledger to build up the forge, apothecary and training yard, and take the gate down to any unlocked stage. Each building's level shows in the camp.
- **Loop:** clearing a stage's guardian offers a choice: return to camp, banking gold, or press on. Falling wakes you in camp with half the trip's gold lost. Progress saves in the browser.
- **Gear as built:**
  - Five slots: weapon, shield, armour, helm and trinket.
  - Weapon types: sword, axe, mace, longsword and the two-handed greatsword.
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

## Release polish (built)

- **Expertise screen:** each tree is a column of nodes (three talents, then the ultimate) joined by lines that light up as you learn. Clicking a node shows its details: the effect now and at the next rank, what blocks it, and Learn or Equip.
- **Music:** a generative WebAudio score with a pad, arpeggio, bell line, bass, drums and brass. Its mix and tempo follow the mood (camp, dungeon, combat, guardian) and change on bar lines. There are no audio files.
- **Settings:** master, music and effects volume, look sensitivity, inverted vertical look and screen shake. They are kept apart from the save.
- **Icon and splash:** drawn in code by `tools/make_icons.py` and copied into the generated Android project by `tools/android_patch.js`.
- **Android:** only a debug APK is built for now (the "Android debug APK" workflow).

## Performance (built)

- **Static geometry:** each section's walls, floors, pillars and decor are baked into one mesh per material, so a section costs a handful of draw calls.
- **Characters:** parts that share a joint are baked together, and their plain colours become vertex colours. Glowing weapon materials stay apart.
- **Culling:** sections more than 40 m away (past the fog) aren't drawn.
- **Graphics quality:** sets resolution and shadow-map size, and turns enemy shadows into blobs on Medium or shadows off entirely on Low.
- **Measured:** a fight with four enemies at the dungeon entrance went from about 400 draw calls to about 290 on High, 190 on Medium and 155 on Low.

## Minimap (built)

- **Canvas:** a round canvas in the corner, redrawn 20 times a second. A section is "seen" once the hero comes within 14 m of it.
- **Colours:** sections are coloured by state (awake, cleared, the lair), with chests, enemies and the hero drawn on top.
- **Orientation:** in the behind view the map rotates with the camera so up is where you look; the top view stays north-up.
- **Compass:** a chevron on the rim points to the first section along the path that isn't cleared, or to the lair, and the text shows the distance.
- **Full map:** tap or N fits everything found so far.
