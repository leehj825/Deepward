# Deepward: Game Design

A 3D action dungeon crawler, played over the shoulder or from a fixed high view. You enter a dungeon, fight through its rooms and a boss, take the loot, then level up and refit. There's no town building and no army, only the fight.

## Pillars

1. **Telegraph, read, react.** Every enemy attack has a visible wind-up, and the player chooses the answer.
2. **Each dungeon teaches a skill.** Difficulty comes from new demands, not only bigger numbers.
3. **Everything is built in code.** Rigs, gear, animation and sound are procedural, the same approach as Nightfall Settlement.

## Combat (built in milestone 1)

| Action | What it does |
| --- | --- |
| Light attack | Fast combo (three hits with a sword; each weapon type has its own) with low posture damage |
| Heavy attack | Slow; breaks shield guards; staggers even brutes when they aren't swinging |
| Block | Absorbs 85% of damage and drains stamina; a guard break stuns |
| Parry | A block raised within 0.2 s of impact: no damage, big posture damage, enemy staggered. Mashing block doesn't parry. |
| Dash | A short, low dash (2.6 m in 0.3 s) in any direction, invulnerable for most of it; dashes pass through enemies |
| Riposte | Any hit on a posture-broken enemy is a 3× critical |

- **Stamina** pays for attacks, dashes and blocked hits. It regenerates after a short pause, and more slowly while you block.
- **Posture:** enemies fill a posture bar from hits, blocks and parries. It drains when they're left alone, and when it's full they're broken.
- **Telegraphs:**
  - A white glint means blockable.
  - Red means unblockable, so dodge.
  - Area attacks draw a filling red ring on the floor.
  - Enemies track you during the wind-up but commit 0.22 s before the hit, which is the moment to dash sideways.
- **Attack tokens:** at most two enemies wind up or swing at once, so crowds stay readable.
- **Feel:** hit-stop on impact, slow motion on a parry, screen shake, swing trails, sparks and floating numbers.

- **Area blows are aimed once.** When a red area blow starts, the foe picks its aim at the warden and where its lunge or leap will end (`aoeTo`, never past the warden); the floor ring is drawn there (`aoeAt`) and does not move. The foe turns to that aim, lunges or leaps exactly to `aoeTo`, and the blow lands on the ring, so a dash out of the ring is always safe. `tools/aoe_test.js` checks it.
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
| 6 | The Sunken Temple | Acolytes (reflectable orbs), skeletons, spiders, duelists | Parrying orbs back | The Drowned Prophet |
| 7 | The Frost Halls | Shield-bearers, knights, archers, acolytes, duelists | Pulling foes out of a ward | The Frost Marshal |
| 8 | The Ashen Forge | Goblins, shield-bearers, brutes, acolytes | Dashing under pressure | The Furnace Lord |
| 9 | The Bone Orchard | Bone callers, skeletons, archers, knights, spiders | Killing the caller first | The Bone Gardener |
| 10 | The Throne of the Deep | Most kinds, with bearers and callers | Everything at once | The Hollow King |

- **Archers** keep 5.5 to 10 m away, back off when you close in, and loose an arrow after a long draw. Arrows can be blocked, parried or dashed through. Archers don't take one of the two attack tokens, so they add pressure on top of the melee foes.
- **Goblins** are small and fast, with quick thrusts and two-hit slashes; they come in packs.
- **Spiders** are code-built eight-legged rigs. Their bite is ordinary, but the pounce glows **amber**: a block alone is smashed aside and the hit lands anyway. Only a parry (or a dash) answers it.
- **Duelists** open with a raised overhead that is a **feint**: the wind-up stops short and the real slash follows quickly. Raising the guard on the feint wastes the parry window.
- After the tenth stage the stages repeat with tougher enemies (`loopScale`), alongside the Endless Deep.

## Guardians (built)

- The first enemy of each stage's last room is grown into a boss from `CFG.bosses`: bigger, with more health, posture and reach, sometimes extra moves, and a boss bar with a tick at each phase mark.
- **Phases:** when health drops past a mark, the guardian roars for 1.4 s. It can't be hurt, and halfway through a shockwave throws the hero back. Then the phase's changes apply: summoned adds (60% strength, crumbling when the guardian dies), stat overrides, new or replacement attacks, faster wind-ups, a stance change, or a rage tint.
- **Act I's five** (Act II's five are in `CFG.bosses` and the README):
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
  - Eight slots: weapon, shield, armour, helm, gloves, boots, trinket and ring.
  - Weapon types: sword, axe, mace, longsword and the two-handed greatsword.
  - Tiers by depth, four rarities, eight bonus types, and smith upgrades up to +8 with the best forge.
  - Gear changes the hero's look: blade, weapon model, tunic colour, plate, helm style, shield face and amulet.

## Gear: the original plan against what's built

| Planned | Status |
| --- | --- |
| Eight slots (weapon, off-hand, helm, chest, gloves, boots, ring, amulet) | Built: weapon, shield, armour, helm, gloves, boots, trinket and ring |
| Weapon types with their own moves | Built: sword, axe, mace, longsword, greatsword, spear and twin daggers; spear and daggers have their own combos and heavies |
| Four rarities with random bonuses; legendaries with unique effects | Built, plus nine named uniques, gem sockets and weapon elements (fire, frost, shock) |
| Weight slows the dash | Built: weight classes and load (below) |
| Forge: upgrade, salvage, reroll one bonus | Built, plus gems and sockets |
| Every equipped piece shown on the rig | Built |

## Gear depth (built)

- **Weight classes:** `it.wc` (0 light, 1 medium, 2 heavy) on armour, helms, gloves and boots; older saves derive it (helms from their style, armour from its tier band). `main()` multiplies the piece's numbers by `CFG.gear.weightMult`.
- **Load:** the sum of `CFG.gear.weight[slot][wc]` over worn pieces. Over `load.light`, `stats()` raises `dashCost` and lowers `dashDist` and `move`, each capped. The player's dash multiplies its distance by `dashDist`.
- **Elements:** affixes with `only: ['weapon']`. They ride on the attack (`atk.burn`, `chill`, `shock`), and `Enemy.receive` calls `elements()` on a landed hit: burning damage is spread over 2 s in half-second ticks, frost scales every enemy step, a shock jolt is a 0.45 s stagger except on guardians and champions.
- **Reroll:** `Items.reroll(it, i)` picks a kind that fits the slot and is not on the piece; cost grows with `it.rerolls`.
- **Looks:** gloves tint the hands and add cuffs (steel when heavy), boots recolour the lower legs (heavy adds greaves and sabaton plates), medium armour shows a mail shirt and heavy armour plate.

## Saves (built)

- **Slots:** `Items.useSlot(n)` picks one of three keys (slot 1 keeps the original `dw_save_v1`, so existing saves land there); `dw_slot` remembers the last played.
- **Versions:** each save stores `v`. `parse` runs `MIGRATE[v]` for every version up to the current one (v1 to v2 fixes weight classes on old pieces), then `withDefaults` fills in fields added since, one level into objects.
- **Backup:** a save that loads cleanly is copied to `<key>_bak`; if the main save is ever unreadable, `load` uses the backup.
- **Export:** `DEEPWARD1:` plus the save as base64 (UTF-8 safe). Import checks the prefix, decodes, parses and migrates before writing anything.
- Key presses inside the code box are ignored by the game's key handling.

## Controls (built)

- **Bindings:** `Bindings` maps each action to up to two key codes and a list of controller buttons (`Settings.keys` / `padKeys` hold only the player's changes over the defaults). The keyboard handler asks `actionsOf(code)`; movement and block read `held`; the controller asks `padButtons(act)`.
- **Rebinding:** `startListen(act, dev)`; the next key or button is captured before anything else sees it. A new key replaces the action's first key and is taken from any other action; a button becomes the action's only button (A stays shared by talk and dash). Esc, Enter and the Menu button can't be bound, and menu navigation is fixed, so nobody gets locked out.
- **Hints:** `Bindings.fmt` turns `@heavy` and the like into the player's key or button (with the mouse for attack, block and heavy), for tips, the talk prompt, the training yard and the hint line.

## Weapon arts (built)

- `CFG.player.arts[type]`: a name, stamina cost, cooldown and a list of hits in the usual attack format (plus `ring` for a shockwave). `Items.stats` sets `art` when the weapon's mastery is rank 3.
- `Player.press` turns heavy into `art` while block is held (an execution still wins). `tryAct` starts the first hit and queues the rest; each queued hit starts as the last one enters its recovery, so multi-hit arts flow without gaps. `artCd` ticks down with the other timers.

## Deepward Hold (built)

- `Camp.build` lays out a 48 × 36 m camp (`Camp.HW`, `HD`) in quarters joined by dirt paths. Static meshes are baked per material at the end (`Rig.bake`), keeping the flickering flames apart.
- **People:** fixed NPCs (with spots for their services) turn to watch the hero; walkers (`n.path`) loop between points, pause, wait if the hero stands in the way, and greet once per visit. NPC rigs take a `tool` (hammer, spear, lute, basket).
- **Postures:** each person has their own way of standing, sitting or kneeling (`npc.pose`, read by `Rig.posture`): an everyday clip from Nightfall's Mixamo library (relaxed, looking about, examining, holding, alert, kneeling, pulling plants, seated work) at their own pace and phase, played back and forth over part of a clip that does not loop, with fixed joint turns on top (`add` after the clip, `set` replacing it) and a pelvis height (`hipsY`). Sitting is hand-made legs and hands on the knees over a breathing clip; a worker at a bench keeps the clip's busy hands. The seated and kneeling (`still`) do not turn to watch the hero. Every rig idles at its own pace (`rig.pace`), and the hero idles at ease in the Hold.
- **Services:** bard and captain lines come from `CFG.townsfolk` in turn (`S.talk`). Nell's bench reuses Bram's gem setting and adds cutting (3 of a kind → 1 of another). Ysolde's tonics (`CFG.camp.tonics`) are packed into `S.tonics`, drunk into `G.tonics` when a trip starts (`drinkTonics`), read by `Player.gearStats`, and cleared in camp. Odo's piece (`S.curio`) is rolled once per date.

## The Rim (built)

- `Field.build` makes a room-like object that `World.enterCamp` adds beside the camp: one big rectangle (`CFG.field.size`) and a road (`corr`) through the palisade gap that overlaps the camp and the field by 2 m each (more than a body's width, or a walking hero would be pulled back at the joins), so `constrain` and `inSpace` work unchanged. Trees, rocks, gravestones and the watchtower are obstacles (`pillars`); everything static is baked per material.
- **Mode:** `checkRim()` switches `G.mode` between `camp` and `field` as the hero crosses the gate: out, tonics are drunk and `tripGold` starts at zero; in, it is banked. Kills, XP and mastery count anywhere but the camp. A fall on the Rim loses `CFG.field.deathGoldLoss`.
- **Zones:** `Field.update` tops each zone up to its `cap` while the hero is within 25 m of it (quickly at first, then every `respawn` seconds), never within 10 m of the hero; beasts more than 70 m away are let go, and none passes the gate.
- **Beasts:** an enemy with a `zone` wanders until the hero is within `def.aggro` (or it is hit) and then hunts; `pack` beasts rouse their packmates. Past `zone.r + leash` it gives up, heals and walks home. Wolves and boars are hand-posed quadrupeds (`Rig.buildBeast` / `animateBeast`); the boar's `charge: [min, max, attack]` starts its unblockable charge from range. Goblin scouts are goblins with spears that throw.
- **Materials:** `S.mats`; `CFG.matDrops` gives each kind's drops (full chance from a beast with a zone, a third below). `room.nodes` are herb patches and ore veins kept out of the bake so they can vanish when gathered (`Field.gather`) and grow back after `nodes.regrow` seconds. `CFG.crafts` are Bram's recipes (`Items.craft` rolls the piece at the warden's depth with the recipe's rarity, weight class and fixed affix kinds); tempering costs `CFG.temper`; Ysolde brews tonics from `herbs` (+ ore) and a fifth of the gold.
- **Day and night:** `S.clock` (seconds, `CFG.day.length` per day) runs in play while the camp scene is up. `updateDay` blends sky and fog colour (with a warm band at dawn and dusk), hemisphere light, the sun's colour and strength, fog distance and torch strength (`G.torchK`, read by `World.updateLights`); leaving for the dungeon restores the base light and `curseWorld()` sets the fog. `G.isNight()` / `G.timeName()` drive the label and the Rim.
- **Night zones and bosses:** a `night` zone (the graveyard) spawns only at night and crumbles at dawn; `nightMobs` / `nightCap` change a zone after dark. `CFG.field.bosses` each keep to a zone and a time of day; they spawn as named elites (`fieldBoss`, `champion`), get the boss bar when roused (`G.onFieldBoss`), and come back `respawn` seconds of real time after they fall (`S.fieldBoss`).
- **Big monsters:** the Creature Pack's Mixamo clips are retargeted with Nightfall's converter and mirrored into `js/anims_mutant.js` (jump attacks hit on landing). `Rig.build('mutant', { variant })` builds one heavy humanoid (claws for the horror, `fist()` for the troll and golem) whose `rig.set = 'mu'` picks the mutant clips (walk / run, idle, swipe, punch, slam, leap, roar, death; hand-made staggers). Enemy defs add `regen` (share of health per second after 3 s untouched) and `dr` (damage turned). `CFG.monsterBosses` are boss definitions passed whole to `Enemy.makeBoss`, so they grow and change phase like guardians without joining the stages' list.
- **Jobs:** `Jobs.list()` keeps three jobs in `S.jobs`. A hunt, guardian or field-boss job stores the lifetime count when pinned (`base`: `Codex.life().kinds`, `life().guardians`, `S.bossKills`) and measures from it; a gather job counts materials in hand and takes them when turned in. `Jobs.turnIn` pays gold (and a gem for boss jobs, a quarter of the time otherwise) and pins a fresh job; `S.jobsDone` counts them.
- **Rescues:** a vault rolls `CFG.rescues.chance` for a captive (`Props.captive`: an NPC rig chained to a post). Freeing one calls `Items.rescue()`, which adds the next of `CFG.rescues.people` (or a named townsperson) to `S.rescued`; `Camp.build` gets the list and adds a walker for each (up to eight). Perks are read where they act: `Player.gearStats` (Ilsa, Aldo, gold found), `World.begin` (Pell marks every section seen) and the Rim's aggro range (Mira, ×0.75).
- **The Ring:** `G.arenaList()` lists beaten guardians and the `CFG.arena.monsters` (open once their field boss is in `S.bossKills`; the Abomination once the other three are in `S.arena`). `G.enterArena` builds a one-section custom stage with only the lair (`stage.monster` makes the guardian spawn take `CFG.monsterBosses[monster]`), with the strength of the foe's depth. Its big chest pays through `arenaPay` (gold by depth, ×`first` for a first win, a gem) instead of unlocking a stage, and the hero walks home from the `arenaWon` panel. `G.arena` keeps captives out of the Ring and is cleared on every trip and at home.
- **Raids:** `enterCamp` rolls `CFG.raid.chance` (from stage `from`) into `G.raid` with a start time; `G.startRaid` queues the band for the stage (`bands`) on the Rim road with `raid: true` and a zone at the gate, the first one an elite "Raid Chief". Raiders wander toward the gate at a march (0.7 speed), are never let go by `Field.update`, and while not roused and at the gate they wear it down (`batter` per second each) and swing at it. `updateRaid` shows the band and the gate in the HUD, pays `gold` (by stage) and `mats` when none are left, or takes `steal` of the gold (up to `stealMax`) and removes the band when the gate reaches 0. `clearEnemies` drops any raid.
- **Sefa's caravan:** `wandererComes` (on every homecoming) keeps `S.wander` for `stays` homecomings or rolls `chance` for a new one: two pieces a tier up (rare or better, priced ×`itemMult`), three of the `bundles`, a gem. `Camp.build` adds the wagon, Sefa and her spot when `lv.wanderer`.
- **Map:** in the Hold and on the Rim the minimap shows the camp, the road, the field and its zones (red where beasts are roused), the camp's services, beasts and the hero.

## Progression (built)

- **Character level:** raises health, stamina and power, and gives a talent point.
- **Weapon mastery:** each weapon type ranks up with landed hits; rank 2 adds a fourth, finishing blow to the light combo.
- **Expertise trees:** Guardian (block/parry), Duelist (dash/counter/crit), Berserker (low-health damage, posture) and Arcanist (infusions). Up to two trees; each has an ultimate (Bulwark, Blade Dance, Bloodrage, Nova). Shown as a node tree with a details pane.
- **Falling** loses half the trip's unbanked gold.

## Milestones (all done)

1. **Combat feel:** hero, skeleton, shield knight and brute; light and heavy attacks, block, parry, dash, stamina, posture, telegraphs, touch controls, headless combat tests.
2. **Camp and gear:** the camp hub, Bram, Tilda, the ledger, five gear slots, rarities, saving.
3. **Growth:** levels, weapon mastery, four expertise trees with ultimates.
4. **Enemy roster:** archers, goblin swarms, parry-only spiders, feinting duelists.
5. **Guardians in phases**, then release polish (icon, splash, generative music, settings) and the debug APK.
6. **The open dungeon:** each stage one winding run of sections without gates.
7. **S1–S7:** performance, minimap and compass, side rooms/traps/shrines/pots, elites and champions, lock-on/spear/daggers/executions, uniques and gems, the Endless Deep and Daily Descent.
8. **T1–T7:** balance bot, difficulty and accessibility, training yard, codex and achievements, Act II, feel and atmosphere, touch-control customization.

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
- **Automatic resolution:** `perfTick` averages frame time over one-second windows while in play. Two windows over 22 ms drop `resScale` by 0.15 (down to 0.5), six under 17.5 ms raise it by 0.1; `applyQuality` multiplies the quality's pixel ratio by it. Frames over 0.25 s (the app was away) are ignored.
- **Performance readout:** Settings → Show performance writes FPS, frame time, `renderer.info` draw calls and triangles, quality and resolution step once a second.
- **Backgrounding:** `visibilitychange` pauses play and suspends the audio context (`Snd.hold`), which also covers the Android app going to the background.
- **Measured:** a fight with four enemies at the dungeon entrance went from about 400 draw calls to about 290 on High, 190 on Medium and 155 on Low.

## Minimap (built)

- **Canvas:** a round canvas in the corner, redrawn 20 times a second. A section is "seen" once the hero comes within 14 m of it.
- **Colours:** sections are coloured by state (awake, cleared, the lair), with chests, enemies and the hero drawn on top.
- **Orientation:** in the behind view the map rotates with the camera so up is where you look; the top view stays north-up.
- **Compass:** a chevron on the rim points to the first section along the path that isn't cleared, or to the lair, and the text shows the distance.
- **Full map:** tap or N fits everything found so far.

## Dungeon features (built)

Each stage's plan picks its extras (see `CFG.features`):

- **Side rooms:** two middle sections get one, off a random side wall through a 3.2 m doorway and a 4 m passage.
  - **Elite's den:** the stage's main enemy kind at 1.9× strength, which drops a rich chest (2.5× gold, rare-or-better gear).
  - **Vault:** the same rich chest, behind two spike plates whose cycles are half a beat apart.
  - **Chasing:** enemies leave a side room by its doorway and enter it the same way.
- **Traps:** two passages get one.
  - **Spike plates** (idle 1.7 s, red warning 0.6 s, strike 0.6 s) and **blades** (2.4 s swing) both deal unblockable damage that rises with depth.
  - A dash's invulnerability gets you through either.
- **Shrine:** one middle section without a side room gets one. It offers three of eight blessings, which stack into the hero's stats until the stage is left.
- **Breakables:** 3 to 6 per section along the walls, off the path. They're solid until struck. Each gives a 55% chance of gold and an 8% chance of a flask refill (only if you're below your maximum).

## Elites and champions (built)

- **Chance:** a regular spawn rolls `CFG.elites.chance[stage]`, plus 8% for each repeat of the stages. Den guards always get one modifier, or two when deeper.
- **Modifiers:** each changes the enemy's numbers and behaviour (armour, speed, life leech, death blast, a regenerating ward). Each also adds an additive aura ring of its colour and a name tag over the bar. Elites are worth 2× XP and gold.
- **Champion:** the middle section's last wave adds the stage's champion from `CFG.stages[].champion`. It's a named elite at 1.35× strength and 1.25× size, it shows the boss bar, and it's worth 3×.

## Combat depth (built)

- **Lock-on:** `G.lock` holds the target. The behind camera eases its yaw so the hero stands between it and the target, and mouse or stick yaw input is ignored while locked. The player's aim and top-view facing prefer the lock. On the target's death the lock moves to the nearest foe within 10 m; it lets go past 20 m.
- **Weapon movesets:** `CFG.player.combos` and `heavies` give the spear (two thrusts and a sweep, a lunging thrust) and twin daggers (five quick cuts, a spinning heavy) their own moves. Daggers take the off hand, so there's no shield, and they cut dash cost by 40%.
- **Executions:** a heavy attack within 2.6 m of a posture-broken enemy becomes an execution (`CFG.player.execute`). There's a slow-motion wind-up, and the hero can't be hurt during it. The blow kills ordinary foes and deals 1.5× a critical to guardians and champions. The enemy's bar shows EXECUTE while you're in range, and the first break shows a tip.

## Uniques and gems (built)

- **Uniques** (`CFG.gear.uniques`): legendary items with a fixed name, slot and type, and an effect the fight reads from `S.u`.
  - **Where the effects live:** the parry wave and burning ground are in `combat.js` and `player.js`; thorns and life-on-kill go through `Enemy.burn` and `G.onEnemyDeath`.
  - **Repeats:** `S.uniques` lists the ones found, so all nine drop before any repeats. One in Tilda's stock only counts as found once bought.
- **Sockets:** an item's `gems` array holds a gem kind or null for each socket, and the stats add the gems from equipped items. Bram sets, pries and adds sockets. Loose gems live in `S.gems`.

## The Endless Deep (built)

- **Unlock:** opens when `S.stage` reaches the number of stages.
- **Floors:** `Endless.floorDef(floor, rng)` makes a stage definition. It picks a random stage for the theme, guardian and champion, takes section shapes from that stage's rooms, and builds waves from its enemies (every kind from floor 4). The last section is the guardian's lair every third floor; otherwise it's a two-wave fight, with the champion in the middle section.
- **Building:** `World.startCustom` builds it. While it does, `Math.random` is swapped for the run's seeded generator, so the layout, side rooms, traps and pots repeat too. The Daily Descent seed is a hash of the date.
- **Toughness:** enemies get `1 + 0.18 × floor`. The loot tier and elite odds use the virtual stage index (4 + floor).
- **Between floors:** a floor is done when its guardian's chest opens, or when every section is cleared. The "deeper" panel can't be dismissed: go deeper (heal 30%, at least one flask) or return to camp.
- **Records:** `S.endless.best` and `S.endless.daily` (date and best) are updated at the start of each floor.

- **Curses:** `G.run.curses` (ids from `CFG.curses`). `Player.gearStats` applies Dry Flasks, Glass Warden and Brittle Guard and multiplies gold found by `1 + Endless.curseGold`; spawns roll a sure elite under Hunted and get faster steps and 30% shorter cooldowns under Frenzy; `curseWorld()` pulls the fog in and hides the map under Lightless, and restores both anywhere else. The Daily Descent's curse comes from a hash of the date. `S.endless.heat[n]` keeps the deepest floor for n curses; the last chosen set is remembered.

## Balance (tuned with tools/balance.js)

`tools/balance.js` plays each stage and four Endless floors with a scripted warden.

- **Gear:** level 1 + 2 per stage, gear of the stage's tier (rare from stage 3) upgraded +1 per stage, and two talents per stage.
- **Behaviour:** it reacts to every telegraph by rolling its profile's chances to parry, block or dash, executes broken foes, drinks below 35% health, and walks section to section, including the den.

What the first runs showed, and what changed:

| Problem | Change |
| --- | --- |
| Enemies didn't scale between stages, so nothing ever died | Enemies get +22% health and damage per stage, plus +18% health (`stageScale`, `stageHp`) |
| Bosses fell in 5–25 s | Guardian health roughly ×3, posture ×2 |
| Executing a guardian was too strong | It now deals 0.8× a critical instead of 1.5× |
| Champions fell in seconds | Champions at 2.6× (the Widow and the Black Herald more) |
| Spiders, duelists, guardians and champions were stunlocked | They no longer flinch from light hits |
| Endless floor 1 was easier than stage 5 | Endless now starts above stage 5 |
| A broken or staggered archer, goblin or duelist crashed the game (no hand-made stance) | Fixed; now covered by the `poses` test |

Result on Normal:

- **Stages:** each takes about 2–4 minutes of bot time.
- **Guardians:** fights last 20–60 s.
- **Champions:** 10–75 s.
- **Deaths:** the casual profile dies now and then to early guardians; the skilled one rarely.

Real players are slower to react than the bot, so expect more deaths.

## Difficulty and accessibility (built)

- **Difficulty:** `CFG.difficulty` scales damage taken (`Player.damage`), enemy health at spawn, enemy cooldowns and the number allowed to attack at once, and shifts the parry window. It can change at any time from Settings and applies to new spawns.
- **Telegraph words:** text over red and amber telegraphs, for colour-blind players.
- **Effects:** hit-stop and slow motion can each be turned off, and `FX` respects both settings.

## Training yard (built)

- **Hobb:** `Tutorial` spawns him (the `sparring` enemy: a knight rig, huge health and slow steps) beside the camp fire. Each lesson gives him one move: none for the striking lessons, a slow blockable overhead for block and parry, and an unblockable slam for the dash.
- **Counting progress:** the lessons count real events (`G.stats.blocks`, `parries`, `dodges`, `executions`, and Hobb's health falling during light or heavy attacks), so the only way through is to do each move.
- **While training:** camp prompts are off, and Hobb pulls his blows, so you can't fall.

## Codex and achievements (built)

- **Lifetime records:** `S.life` is fed every frame from the per-trip `G.stats`. Kill hooks add counts by kind, elites, champions and guardians, flawless guardians (no hits taken since the guardian appeared) and guardians beaten on Hard.
- **Bestiary:** the attack lines are generated from the enemy definitions, so new enemies document themselves.
- **Achievements:** `Codex.list` holds 32 tests, checked twice a second. Each pays its gold once and keeps it out of the trip's at-risk gold.

## Act II (built)

- **Stages:** five more (6–10), each with a theme of its own (decor: pools and reeds, ice shards and drifts, anvils and embers, bone trees, a dark court), a champion and a guardian. Enemy toughness keeps climbing per stage. The Endless Deep opens after the tenth guardian and starts above stage 10.
- **New mechanics:**
  - **Reflectable orbs:** an orb parried within the window turns around at its caster, deals 2.2× damage and breaks guard.
  - **Shelter:** a `ward` enemy cuts damage to allies within its radius.
  - **Raising:** a `raise` hit summons skeletons tied to their caster, which crumble when it dies.
  - **Mimic:** a chest prop that becomes an enemy when the hero comes close.
- **Balance:** a bot run of stages 6–10 gives guardian fights of 30 s to 3 min. The skilled profile dies once or twice to the Hollow King, and that's intended for the final boss.

## Feel and atmosphere (built)

- **Boss music:** `Snd.music(mood, theme)` takes the guardian's index. The boss mood then uses that guardian's chords, scale and tempo from `BOSS_THEMES`.
- **Weather:** the drifting points follow `AIR[theme]`: colour, size, fall or rise speed, sway and opacity. `World.theme` says which theme is current.
- **Entrances:** a guardian's spawn starts the `cine` game state for 2.4 s. Only the guardian, the world and the effects update, the camera frames the guardian from in front, and letterbox bars close in. Any input ends it.
- **Vibration:** `G.rumble` also uses `navigator.vibrate` on touch devices (with a setting), and the Android patch adds the VIBRATE permission.

## Touch controls (built)

- `TouchLayout` measures where the stylesheet puts each button, then positions them itself (`#pad.free`) so they can move one by one.
- Size is a `scale()` on each button and opacity is set on the pad. The left-handed layout mirrors each button's distance from the right edge onto the left, and the touch input swaps the stick and look halves of the screen.
- Arrange mode (Settings → Arrange buttons) shows the pad over everything and drags buttons with a capture-phase pointer listener, so a drag never triggers the action. Positions are saved in `Settings.padLayout` as fractions of the screen; a button with no entry keeps its default spot.

## Gear screen (built)

- **Pictures:** `Rig.item(Items.itemLook(it))` builds a piece of gear on its own from the same parts the hero wears (the same weapon builders, `roundShield`, the cuirass, `helmet`, and trinket models). `GearView.icon` renders it once into a 112 px PNG, keyed by its look, so a bag of 24 costs at most a few dozen renders the first time and nothing after.
- **The hero:** `GearView.mount` puts a turning copy of the hero (rebuilt only when `Items.look()` changes) into the panel. It runs its own animation frame loop that stops when the panel closes. The pictures and the hero share one small WebGL renderer and scene apart from the game's; the hero is hidden while a picture renders (it once showed up behind items), which `gear_test` checks.
- **Comparison:** `Items.statsWith(slot, it)` swaps the piece in, computes the hero's full numbers and swaps back, so every effect (two hands leaving the shield unused, gems, uniques, affixes) is counted. The detail pane lists each number that changes.
- **Bag order:** `bagView` filters by slot and sorts (newest, rarity, slot, or best first, meaning pieces that beat what is worn, by how much).
- **Selection:** `tab.gsel` is `e:<slot>` or `i:<id>`. Confirming the selected piece equips it or takes it off, so a controller needs only the d-pad and A.
- **Helms:** the hero's head is a box whose top corners reach 0.19 m from its middle, so the old round helms (0.15–0.16 m) let them poke through. `helmet()` now builds three squared helms to match the blocky heads: a fitted leather cap, an open steel helm (box shell, brim above the eyes, nasal guard, cheek plates and neck guard), and a closed great helm whose front clears the nose. Under a helm only a short tuft of hair is built. Domes are double-sided so their insides show from below. `gear_test` casts rays at the head's corners to check each helm covers them.

## Roadmap

The next steps, in the order I'd take them. Each is sized like one of the S or T steps: one commit, its own test, and a debug APK.

**V1. Play on a real phone.** Everything so far was measured headless. Install the debug APK on a mid-range Android phone and fix what shows up.
- An FPS and draw-call overlay (Settings → Show performance), and dynamic resolution that drops a step when the frame time stays above 20 ms.
- Check touch reach, text size, safe areas (notches) and the pause on app switch (Capacitor `appStateChange`).
- Exit criterion: 50+ FPS on Medium through a full Act II stage.

**V2. Gear depth (done).** Finish the original gear plan.
- Gloves, boots and a ring slot (eight slots total), with their own looks on the rig.
- Weight: heavy armour slows the dash and costs more stamina; light gear the reverse.
- Elemental bonuses (fire burns over time, frost slows, shock breaks posture faster) using the existing burn hook.
- Bram rerolls one bonus for gold and scrap.

**V3. Save safety (done).** The save was one `localStorage` key.
- Versioned saves with a migration step, so future changes never wipe progress.
- Export and import the save as text (and Android share) for moving between devices.
- Three save slots.

**V4. Controls everywhere (done).** Remap keyboard and controller buttons in Settings, with the training yard and prompts showing the new bindings.

**V5. Endless Deep with modifiers (done).** Optional curses that make a run harder for more gold and a separate leaderboard on the device: no flasks, enemies always elite, double speed, glass hero. The Daily Descent gets one fixed curse.

**V6. Weapon arts (done).** One special move per weapon type, unlocked at mastery rank 3: a sword riposte stance, an axe leap, a mace ground shock, a longsword thrust charge, a greatsword spin, a spear vault and a dagger flurry.

**V7. Release build (when wanted).** A signed APK and .aab from repository secrets, a version number per tag, and a store listing. Not started on purpose: debug APKs only for now.

Smaller ideas kept for later: hero appearance options, a photo mode, more Act II side-room types (a gauntlet room, a trap puzzle), and translations.
