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
  - A white ring closing in means blockable (the cross-shaped light on the weapon was removed: the ring is the only telegraph).
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
- **Rescues:** a vault rolls `CFG.rescues.chance` for a captive (`Props.captive`: an NPC rig chained to a post). Freeing one calls `Items.rescue()`, which adds the next of `CFG.rescues.people` (or a named townsperson) to `S.rescued`; `Camp.build` gets the list and adds a walker for each (up to eight), who remembers where it was found (`where`, the stage's name) and says so in its greeting. Perks are read where they act: `Player.gearStats` (Ilsa, Aldo, gold found), `World.begin` (Pell marks every section seen) and the Rim's aggro range (Mira, ×0.75).
- **The Ring:** `G.arenaList()` lists beaten guardians and the `CFG.arena.monsters` (open once their field boss is in `S.bossKills`; the Abomination once the other three are in `S.arena`). `G.enterArena` builds a one-section custom stage with only the lair (`stage.monster` makes the guardian spawn take `CFG.monsterBosses[monster]`), with the strength of the foe's depth. Its big chest pays through `arenaPay` (gold by depth, ×`first` for a first win, a gem) instead of unlocking a stage, and the hero walks home from the `arenaWon` panel. `G.arena` keeps captives out of the Ring and is cleared on every trip and at home.
- **Raids:** `enterCamp` rolls `CFG.raid.chance` (from stage `from`) into `G.raid` with a start time; `G.startRaid` queues the band for the stage (`bands`) on the Rim road with `raid: true` and a zone at the gate, the first one an elite "Raid Chief". Raiders wander toward the gate at a march (0.7 speed), are never let go by `Field.update`, and while not roused and at the gate they wear it down (`batter` per second each) and swing at it. `updateRaid` shows the band and the gate in the HUD, pays `gold` (by stage) and `mats` when none are left, or takes `steal` of the gold (up to `stealMax`) and removes the band when the gate reaches 0. `clearEnemies` drops any raid. The horn and the gate bell (`room.bell`, swung in `Camp.update`) sound at the start; the minimap draws a pulsing ring at the gate and the band in red. Rook and the sentry (`guard` NPCs) walk out to posts beyond the gate (`defend`) and thrust at the nearest raider in reach every 2–3 s for 12% of its health, then walk home when the raid ends.
- **Sefa's caravan:** `wandererComes` (on every homecoming) keeps `S.wander` for `stays` homecomings or rolls `chance` for a new one: two pieces a tier up (rare or better, priced ×`itemMult`), three of the `bundles`, a gem. `Camp.build` adds the wagon, Sefa and her spot when `lv.wanderer`.
- **Rook's task** (`CFG.rookQuest`, `S.quest.rook.step` 0–5): Rook's talk (`rookTalk`) opens it once `S.raids >= 1`, and moves it on at steps 2 and 4. Steps that change the Rim rebuild the camp and fields (`G.onGearChanged(true)`). `Field.build` (`rookQuest`) adds goblin tracks as a spot at step 1, and at step 3 the war camp: its zone (registered before the trees, rocks and nodes are placed, so they keep out), tents, stakes, totems as spots (burned ones are remembered in `q.totems`) and its chief as an extra field boss (`room.bosses`). `G.quest()` checks the camp is done (chief in `S.bossKills`, all totems burned). The HUD shows `goals[step]` under the label, and the minimap shows a gold diamond at the next place. Done: gold by depth, a trinket named Rook's Warhorn, and `raidCut` on the raid chance.
- **The Fen:** `Field.buildFen` lays out a second field east of the Hold (`CFG.fen`: zones placed by `out` from the near edge and `side` along the wall from the gate), built only once `S.stage >= fen.unlock` (`World.fenOpen`); until then the east gate is barred (doors and a spot where Rook explains). Field logic is shared and works from the field's side (`room.side`, `Field.inward`, `Field.at`): spawning near the warden, letting far beasts go (each beast keeps its `home` field), the barrier at the near edge, bosses from `room.def.bosses`, regrowth from `room.def.nodes`. `World.fieldAt` gives the field the warden is out in (mode, label, gathering), and the minimap draws every field. The Mirelord is a `monsterBosses` troll and a Ring monster (`fen: true`). Silk drops from spiders; two crafts use it. Jobs can ask for Fen bosses once it is open (pay ×1.3).
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

## Languages (built)

- The code stays in English. `I18N` (js/i18n.js) watches the page (a MutationObserver on text nodes and the title / placeholder / aria-label attributes) and swaps each text for the chosen language's from its table, caching results. Lookup order: the exact text; the text with its numbers as {0}, {1}...; phrases with name slots ("Slay {0} {a}s", "Swift {a}", the longest pattern first, the name translated in its turn); an item name (tier and piece, the "of ..." suffix moved to the front for Korean); an icon in front or punctuation at the end; and finally the parts between " · ", ": ", " — ".
- Settings → Language (`lang`, Korean by default on Korean devices). Switching back to English reloads the page. `translate="no"` keeps an element as written (the language names).
- `tools/i18n_harvest.js` opens every screen headless and collects every text (plus CFG's strings, fixed strings in the code, and the parts of each line); `--missing ko` writes what the table lacks. `tools/i18n_merge.py` merges translated parts into the table and drops entries whose placeholders do not match. CSS-drawn texts (`::after`) have their own `html[lang]` rules. A Korean font stack and `word-break: keep-all`.

## Appearance (built)

- `S.looks` holds indices into `CFG.appearance` (skins, hair colours, styles, beards); `Items.look()` adds `skin`, `hair`, `hairStyle` and `beard` to the hero's look, so the rig, the gear screen's turning hero and refits all follow it. Hair styles are a few boxes on the head (a helm leaves only a tuft, or a longer fall for long hair); beards show under helms.
- The looks panel comes after the opening story (then the training offer) and from the gear screen; on a controller it opens on its confirm button.

## Skinned bodies (built)

- `Rig.skin` merges every plain mesh of a character into one `SkinnedMesh` whose bones are the rig's own joints (each vertex bound wholly to its joint, colours per vertex). The joints animate exactly as before; the body draws in one call. Glowing, textured and see-through parts (weapons, shields, eyes) stay apart, and `rig.mats` holds the one body material, so hit flashes still work.
- Every NPC, enemy, beast, spider and mimic is skinned; the hero is not (gear swaps rebuild parts, and dash after-images clone the parts).
- Measured headless (draw calls / triangles): the Hold 624 → 125, the Rim 577 → 147, a raid at the gate 780 → 174, a dungeon section about 100. Herb patches and ore veins on the Rim are baked per node too. `tools/world_test.js` keeps the Hold under 200 calls.

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

### Gauntlet and rune vault (built)

- Each stage's two side rooms are one treasure room (`vault` or `puzzle`) and one fight (`den` or `gauntlet`), picked at random.
- **Gauntlet:** three waves (2, 3, 3) drawn from the stage's own enemies. Entering drops the portcullis (a group kept out of the bake) and adds `seal` pillars across the doorway; clearing lifts both and leaves a rich chest.
- **Rune vault** (`state: 'runes'`): three runes on the far wall and three floor plates in matching colours; `runes()` lights the runes in `seq` order on a loop, counts plates stepped in order, and on a wrong plate hurts the warden (unblockable, 12 + 4 × depth) and resets. The full order opens a rich chest.

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

### Full playthrough and balance pass (hordes, natural spaces, the story)

`node tools/balance.js story [casual|skilled] [class]` plays a whole campaign in the headless game with the scripted warden: a new warden, the camp round (Maren, Hobb's yard, Rook, Tilda, Bram, every scene read and every choice answered at random), then for each of the ten stages the gear and level of a typical player, the dungeon with its relics examined, the guardian, its chest (and the ending after the Hollow King), the way home and the epilogue. `PARTY=1` brings Hobb and Aldo along.

| Run | Stages cleared | Deaths | Ending | Notes |
| --- | --- | --- | --- | --- |
| Skilled, alone | 10 / 10 | 6 | the Watch | every beat seen except Rook's no-banner line (the banner was found); 11 relics; the final boss 110 s |
| Casual, alone | 10 / 10 | 10 | the Relief | the last stage takes 419 s, the Hollow King 144 s and one death |
| Skilled, with Hobb and Aldo | 10 / 10 | 1 | the Watch | companions soak up damage; stages are 30 to 40% quicker |

What the runs found and what changed:
- A relic placed behind rocks could trap the bot for the whole run (a hang of 900 s in the Spider Depths): the bot gives up on a relic after 25 s now; `tools/cave_test.js` also checks by a grid flood that every relic can be reached (all ten styled and plain stages, four layouts each).
- The bot never opened the last guardian's chest, so the ending never played: the playthrough walks to the chest as the warden would.
- **A real bug:** the story only noted a guardian when the warden went home, so pressing on to the next stage, or talking to Maren later than the story expected, could leave the chain waiting for an event that never came again. A guardian step now completes whenever that stage has been cleared (`Story.sync`, from `Items.S.stage`), and the event also fires when the guardian's chest is opened.
- Balance stands as tuned (extras at 70%, three attackers at once): the skilled warrior dies 0 to 4 times in a stage (the Iron Keep's town was the roughest in Act I), the casual one a little more in the first three stages and the last two.

### The world above (tuned against stage gold)

A full stage pays about 490 gold at the Crypt and 3200 at the Throne (enemies, chests, a vault, the guardian). Against that:

| | Crypt | Spider Depths | Throne |
|---|---|---|---|
| The Ring, rematch (`arena.gold` 70 × depth) | 70 | 196 | 448 |
| The Ring, first win (× `first` 3.5) | 245 | 686 | 1568 |
| A hunt job of 7 (`(15 + 9n) × (1 + 0.6·stage)`) | 78 | 218 | 499 |
| A boss job | 120 | 336 | 768 |
| A raid beaten (`90 × (1 + 0.5·stage)`, plus kills) | 90 | 225 | 495 |
| Sefa's piece, a tier up (`itemMult` 3) | 108 | 422 | 739 |

A Ring rematch pays about a seventh of a stage for a one-minute fight (and a gem), so it never beats going down; a first win about half. Jobs keep the same share of a stage at every depth. Sefa's gear costs about Bram's forge price for the next tier.

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

## Classes (built: archer, mage, cleric)

A new warden chooses a calling after the intro and before the looks screen (`CFG.classes`, `Items.setClass`, saved as `S.cls`; older saves are warriors). The choice is final for that save. Every class keeps the dash, stamina, posture, telegraph reading, gear slots, mastery and talents; a class changes the weapons it finds, its off-hand piece, a few base numbers and what the light and heavy attacks do. Light and heavy attacks of the ranged classes cost stamina like any swing.

| Class | Weapon | Off hand | Light | Heavy | Notes |
| --- | --- | --- | --- | --- | --- |
| Warrior | sword, axe, mace, spear... | Shield | the melee combos | the melee heavy | as before |
| Archer | Bow | Quiver (+damage, +crit) | arrow, 22 m, rapid | a fan of seven arrows (0.7 rad): point blank they all strike one foe, far off they spread over several | health ×0.9, stamina ×1.1, dash −10% |
| Mage | Staff | Orb (+damage, +stamina regen) | arcane bolt, 16 m | a fireball called down on the target (the locked or nearest foe, else a spot ahead): a 0.45 s warning ring, then a 3 m blast and a burn | health ×0.8; the hardest hitter |
| Cleric | Scepter | Tome (+healing power) | **mode**: holy bolt (8 damage, ×1.4 against skeletons, archers and necromancers) or a single heal | **mode**: a stronger smite (a bright orb that bursts, ×1.5 against the undead) or the area heal (22%, 5.5 m, 9 s cooldown) | weaker than the mage in a fight |

- **Cleric toggle:** `V` (controller LS, touch MODE button) switches the light and heavy attacks between SMITE (holy bolt, stronger smite) and HEAL (single heal, area heal). The HUD shows the mode beside the XP bar. A heal on yourself is worth half (`heal.self`), and each heal has a cooldown (`healCd`: 1.6 s light, 9 s heavy), so a lone cleric sustains itself without out-healing the damage. Allies (`G.allies`: anything with `pos`, `hp`, `maxHp`) are healed at full value, the lowest health first.
- **Projectiles** (`js/shots.js`): a blow with a `shot` fires when its swing lands. Shots fly flat, stop at walls, and hit through `Enemy.receive`, so guards, wards, posture, criticals, elements and life on hit work as in melee. `pierce` continues through foes, `splash` bursts, `count` and `spread` fan out. A blow with `heal` mends instead. Arts exist for each class at weapon mastery 3: Piercing Shot (one heavy arrow through everything in line), Arcane Nova (a blast all around), Sanctuary (a 40% mend within 7 m).
- **Ranged rules:** no finishing blow at mastery 2 and no executions (the ranged classes do not step in), a Windrunner bow makes arrows a quarter cheaper, Stormcaller bolts leap to a second foe for 40%, Dawnlight makes healing 30% stronger.
- **Gear for the classes:** weapon drops (chests, shops, Bram) roll only the class's own types. The off-hand slot (still `shield` internally, with `it.kind`) is a shield, quiver, orb or tome and is named so in every screen. New bonuses `power` (arrow and spell damage, all three ranged classes) and `mend` (healing power, cleric) roll only for those classes; each has one named unique weapon (Windrunner, Stormcaller, Dawnlight) found only by its class. Armour is shared: the light pieces suit casters and archers.
- **Animation:** the archer uses the bow clips. The mage and cleric use the Pro Magic Pack (Mixamo): a caster stance (idle, walk and run in four directions, block, hit reactions, deaths) and the spell moves (staff bolt, fireball, nova; scepter bolt, heal, blessing, sanctuary). `tools/extract_magic.js` turns the retargeted pack into `js/anims_magic.js`; each spell clip is cut to the second before its impact and half a second after, and the rig time-warps it onto the attack's own timings. Poses `shoot`, `overhead`, `nova`, `thrust`, `heal`, `bless`, `sanct` select the clips (`rig.set = 'mg'`).
- **Tests:** `tools/class_test.js` (starting gear, class-only drops and affixes, arrows, pierce, splash and burn, holy bolt weaker than the mage's, heal modes and cooldowns, pictures, the class panel).

## Talents for the classes (built)

- **Same trees, same rules** for everyone: Guardian, Duelist, Berserker and Arcanist work through stat multipliers, so arrows, bolts, fireballs and heals use them like melee blows do. Up to two trees; an ultimate needs four points in its tree.
- **A tree for each ranged class**, shown to that class only (`tree.cls`, `Items.treeFor`; a warrior sees four trees, an archer five): **Marksman** (Volley: +1 arrow in the heavy fan per rank; Long Shot: +8% damage beyond 8 m; Quick Draw: 6% faster shooting; ultimate Arrow Storm: for 6 s every arrow is a burst of three), **Spellweaver** (Conduit: +8% damage; Wildfire: burns 30% harder; Wide Blast: +0.4 m blast; ultimate Meteor Shower: five fireballs on the foes around you), **Devotion** (Mercy: +10% healing; Swift Prayer: heal cooldowns −10%; Radiance: whoever you heal takes 6% less damage for 4 s; ultimate Halo: mends everyone near for 45% and burns the foes in it).
- **Weapon mastery rank 2** (the melee weapons' fourth finishing blow) is, for the ranged classes: two more arrows in the heavy fan (bow), +0.5 m fireball blast (staff), healing +10% (scepter). The mastery list shows only the class's own weapons.

## Party play (first step built: recruit, follow, fight)

*Built:* `js/party.js`, the Party panel (Gear screen, then Party) and the party chips under the purse. Recruit in the Hold only. Anyone can be hired once for gold: Sergeant Hobb (warrior) 150, Mira (archer) 220, Pell (mage) 260, Brother Aldo (cleric) 220. A captive freed from the Deep (Mira, Pell, Aldo) joins free instead. Two at most (`CFG.party.max`). Each companion follows (first priority: back to the warden's side beyond 8 m, a warp beyond 18 m), then attacks the nearest foe within 9 m (training dummies are left alone, and so is everything during the training lessons). The warrior closes in and swings; the archer and mage hold 4–10 m, shoot, and now and then use their heavy; the cleric mends the warden below 75% (an area heal below 45%) and smites when everyone is well. They hit for about half of what a warden of their level and depth would, they use the same moves and Shots as the classes, and kills are credited to the warden. **Aggro:** every foe picks its target (`Enemy.pickTarget`, `e.tgt`, re-chosen every 0.45 s, not mid-blow) among the warden and the companions: score = threat (damage dealt to it, and a share of any healing done near it, fading with a 2.3 s half-life) + nearness (up to 21) + 9 for a tank (the warrior) + 5 for the current target. Swings and area blows hit everyone inside their reach (`Combat.enemyStrike`); arrows and orbs hit the first friend they touch; a bone caller's blast hits them too. **Companion health:** `80 + 6 per level + 14 per depth`, times 1.5 (warrior, also 25% less damage taken), 0.95 (cleric), 0.85 (archer), 0.75 (mage). A hard blow staggers; at zero they are **down** (not targeted, lying still) and get up by themselves after 25 s at 25%, at once when a heal lands (a downed friend comes first for the single heal; the area heal lifts everyone), and at full on entering the Hold or a stage. They catch their breath (1.5% a second) after 5 s unhurt. **Seeing it:** the party list under the purse shows each companion's bar, numbers and DOWN state, and a small bar floats over their heads (that is where the cleric aims). The cleric companion heals the lowest in the party and uses the area heal when two are hurt or one is below 40%. Saved as `S.party` and `S.hired`. `tools/party_test.js` covers it.

*Still planned, and the decisions behind it:*

Team play with companions on top of the classes. Decisions so far:
- **Optional:** companions are recruited in camp (the freed captives first) and join a run only if chosen. The hero stays the main character, and solo stays fully playable.
- **Size:** the hero and up to two companions, built for N but balanced for three.
- **Control:** fully automatic. Staying close to the hero is the top priority; healing, taunting and shooting score below it (utility AI per role).
- **Downed, not dead:** a companion who falls is downed until revived (a heal-channel by the cleric, hero or companion) and is back at camp after the run.
- **Scaling:** a companion adds about 40–60% of a hero's damage with less health; rewards are not split; bosses gain about 25% health per companion without changing their timings; the attack-token cap rises from 2 to 3 only with a full party. Checked with the balance bots, with and without companions.
- **No multiplayer** for now, but combatants and targets are kept general (`Combatant`, a target for each foe) so it is not ruled out.
- **Order:** (1) the refactor: enemies pick a target (`e.target`) instead of always `G.player`, with every test unchanged; (2) a tank companion; (3) downed and revive; (4) a healer companion; (5) ranged companions (they reuse `Shots`); (6) the recruit screen and party bar; (7) a balance pass.

## Companion policy (built: a tiny trained network, learning as you play)

What it is: for each companion, a 21 → 20 → 7 network (587 numbers, `js/policy_weights.js`, about 8 KB) picks the next **move** in a fight: attack, heavy skill, back away (kite), regroup, heal, area heal, guard (the warrior braces: half damage, no attacks). Moving and attacking stay as they were; only the choice is learned. It runs about three times a second per companion. Following the warden still comes first (a companion more than 8 m away just regroups), and training dummies and the tutorial are left alone.
- **One shared file** (`js/policy.js`) holds what the network sees (`encode`: class, own and the warden's and the others' health, who is down, distances, how many foes are near, how many aim at it, seconds until the next blow lands, which moves are ready), which moves are legal (`legal`: only a cleric heals, only a warrior guards, nothing attacks without a target; the network can only reorder legal moves), the hand-written rules (`classic`) and the forward pass. The game and the trainer both use it, so they cannot disagree.
- **Training, headless** (`node tools/policy/train.js [minutes]`): `tools/policy/sim.js` is a fast copy of the fight with no graphics (2 ms per fight: the real enemies, wind-ups, tokens, aggro rule, companion moves and numbers; a scripted warden). Step 1, imitation: the network copies the rules (99.6% agreement). Step 2, evolution strategies on three cores: random nudges that scored better in the simulator are kept (centred ranks, Adam, a pull toward the imitation weights), scored on fresh scenarios each generation; the best generation on 160 held-out scenarios is kept. Step 3, the test on 400 scenarios never used in training, paired with the rules (`docs/policy-report.md`). The fight is scored by clearing it (+), enemy health removed (+), time (−), companions downed (−25 each), the warden's death (−60), health lost.
- **Result, 14 minutes of training:** in the simulator the network scores 3.5 ± 2.7 reward points above the rules (36.0 against 32.6) and clears 84% of fights against 82%. That is a modest gain, not a different league: the rules were already reasonable. The simulator is a sketch of the game, so the real check is `tools/policy_test.js`: the same fights in the real game (a tank and a healer, two shooters, against a wave with a brute and an archer, the warden fighting too), rules against network, which must not be worse. **In the real game the two are about level**, not better: over 8 fights each, tank and healer 0.78 (rules) against 0.88 (network, lower is better; clears 6 of 8 against 5 of 8), two shooters 2.17 against 1.63 (clears 2 of 8 against 4 of 8), well inside the noise of so few fights. **A larger test settled it: the network is better than the rules in the real game.** `tools/policy/real_train.js` plays randomized real fights (a party of one or two companions of random classes, a fighting warden, two or three waves, depth 0-3); on 120 fresh ones the shipped network scored 33.7 against the rules' 23.8, a paired difference of +9.9 ± 7.2 (fights won 55% against 47%, companions downed per fight 0.26 against 0.36, the warden dead 11% against 16%; `docs/real-training-report-2026-10-20.md`). The 8-fight comparison above was simply too small. (Training the per-class preferences against the real game for 20 minutes added +0.9 ± 7.2 on top: noise, not adopted.) Before that larger test, the picture looked like this: the simulator's 3.5 points did not show up clearly in the game: the simulator's physics, the enemies' movement and the scripted warden differ from the real ones. A first version of the test, with the warden standing still, showed the network losing more companions than the rules did; a warden that stands still is far from what it trained on, and the test now has the warden fight. Closing that gap (a more faithful simulator, or training against the game itself) is the next step for this work.
- **Re-tested with more fights (`tools/policy/compare_real.js`, 200 paired randomized real fights): the simulator-trained candidate is not better.** Shipped network 28.9 against rules 23.7 (+5.3 ± 6.0; with the earlier 120-fight test the gain over the rules is about +7); the 20- and 30-minute simulator continuation (the same weights: training is deterministic and found nothing better after the first 20 minutes) 25.6, which is +1.9 ± 5.7 over the rules and −3.3 ± 5.8 against the shipped network. So the shipped weights stay.
- **Real-game training of the per-class preferences, 30 minutes on a hosted runner (14 generations, 3,676 fights):** its own test on 120 fresh fights said trained preferences +3.4 ± 6.3 over the network without them (not significant, so the trainer did not write them). Re-tested with the shipped network plus that checkpoint on 200 paired fights (`compare_real.js`): rules 28.0, shipped network 28.4, with preferences 25.9, so −2.5 ± 5.2 against the shipped network: no gain. **How noisy this measurement is:** the same 200 scenario seeds gave rules 23.7 and the shipped network 28.9 in one run (+5.3), and 28.0 and 28.4 in the next (+0.45), because the game itself is not deterministic. Pooling the real-game comparisons so far (+9.9 over 120 fights, +5.3 and +0.45 over 200 each) the shipped network is ahead of the rules by roughly 4 reward points, with an uncertainty of about ±4: probably a small real edge, nothing more. A gain of 3 points needs on the order of a thousand paired fights to see.
- **A longer run was rejected.** Continuing the training for 20 more minutes (`--continue`) raised the simulator score to 37.2 (+4.6 ± 2.9 over the rules), but in the real game it did worse than both the rules and the shipped weights (tank and healer: 4 of 8 fights cleared against 6 of 8, cost 1.19 against 0.69; two shooters 1.59 against 1.30), so `tools/policy_test.js` failed and the shipped weights were kept. The longer the network trains against the simulator, the more it fits the simulator's quirks. Until the simulator is closer to the game (or there is real-game data to train on) more simulator training is not worth shipping; the real-game test is the gate.
- **Learning while you play** (`Policy.Learner`, Settings → "Companions keep learning from your fights", on by default). The network stays as trained; on top sits a table of preferences, 7 numbers per class, in units of the network's own typical gap between first and second choice. A fight (a foe near the party until none is left for 2.5 s, or the warden falls) is scored like the trainer scores it, and the choices made in a fight that went better than usual become a little likelier, those in a worse one a little less (REINFORCE with a running baseline, step 0.25, clipped at ±2). While learning, a move is sampled (mostly the network's first choice, now and then another legal one); otherwise the best move is taken. Saved in the game (`S.policyAdapt`), shown in the Party panel ("learned from N fights"), and can be forgotten there. `node tools/policy/learn_check.js` plays sequences of 300 simulated fights with and without it: about +1 reward point (1.1 ± 0.9), a little in the first third, a little more by the last. It is a gentle nudge, not a transformation, and it is clipped so it cannot spoil the network.
- **Where what is learned lives, and how to keep it.** The run-time preferences are saved with the save slot (`S.policyAdapt`, in the browser's or app's storage), so they survive restarts but belong to that slot on that device; a new slot, cleared app data or another copy of the game starts empty. A fight's lesson is saved when the fight ends (and a fight longer than 75 s is scored in parts). To make it part of the shipped model: Gear, Party, **Share learned data** sends the text through the phone's share sheet (the Capacitor Share plugin in the Android app, the browser's share in a browser, else the clipboard; **Copy** and **Show the text** are beside it; the save screen's Share uses the same route), and you pass it on; `node tools/policy/bake.js <code or file of codes>` averages the codes (weighted by fights) and adds them to the network's per-class output bias (`weights.cb`, in `js/policy_weights.js`); then press **Forget** in the game so the same lessons are not counted twice. 
- **What the first real data showed.** Nine fights from a phone left the preferences almost unmoved (largest change 0.05 of a possible 2) and a running reward of −22.9 with a spread of 89, against about +30 in the simulator. In a long real fight the damage taken adds up to several times a health bar, which swamped the score and made the learner's steps about ten times too small. Fixes: each part of the score is capped (downs 3, health lost 1.5 bars each) and the whole kept in −100..100; the spread used to scale a step is capped at 30; the running reward starts at 25 and the first fight learns too. The learned data now also carries a log of the last 30 fights (reward, share cleared, time, downs, deaths, health lost, party, where); `node tools/policy/analyze.js <code>` prints it, so the real fights can be looked at before anything is trained on them. Nine fights are far too few to bake; a few hundred are a start.
- **Training more, headless:** `node tools/policy/train.js 20 --continue` continues from the shipped weights for 20 minutes and replaces them only if the result scores at least 0.5 higher than the shipped weights on 400 unseen simulated scenarios (otherwise it keeps them). Without `--continue` it starts again from imitation of the rules. `node tools/policy_test.js` is the check in the real game before shipping weights.
- **Switches:** Settings → "Companions use the learned battle policy" (off: the plain rules); learning has its own switch. With no weights file the rules run.
- **Ideas that follow:** train per party composition; give the network the warden's recent habits (always rushing in, always standing back); let companions dodge (step out of a red ring) as a move; train against the real game with a few thousand fights at night on a build machine.

## Polish for the party (built)

The minimap shows companions as dots (green; amber under 40% health; red when down). The warden's flask spills over: companions within 7 m take half of its healing (a share of their own health; the downed stay down). Gold and XP stay the warden's: companions scale with the warden's level and the depth, so they share its progress without taking a cut.

## Small AI in the app (ideas)

Rule of thumb: models write words and tune numbers; the game's rules stay deterministic and tested. Three sizes, from the cheapest:
1. **Tiny learned policies (a few KB, no download).** Train offline in the headless harness (the balance bots already play through `__dw`), export the weights as JSON, and run a small MLP or a utility table in JS at 4–5 Hz. First uses: companions picking an action (heal now? step back? which target?), enemy attack choice biased by the player's habits (`pickAttack`), and a skill estimate that nudges difficulty. Always keep the plain rules as the fallback and the safety clamp (a policy may reorder legal moves, never create an unreadable one).
2. **A small language model for text (opt-in download).** Villager barks, companion chatter, notice-board flavour, a death recap. Candidates: SmolLM2-135M or 360M, Gemma 3 270M, Qwen2.5-0.5B (best for Korean, heaviest). Run in a Web Worker (wllama or Transformers.js on the web; the MediaPipe LLM Inference API or a llama.cpp plugin through Capacitor on Android), only when idle, 24 tokens at most, constrained output, a filter, and a cache of results in the save. Every call site keeps its static string, so the game is identical with the feature off.
3. **Tools, not shipping weight.** Use a model at build time for translation drafts (P12) and an RL bot to balance party and class combinations.
Packaging: never in the APK or the single-file build; a Settings toggle ("Living words, ~100 MB") downloads once into the Cache API or the app's files. One interface (`LM.say(kind, facts)` returning text or null; `Policy.choose(state)` returning an action or null) so callers never care whether a model exists.

## Photo mode (removed)

Photo mode (the frozen free camera, filters and Save picture) was removed from the game: the pause button, the H / D-pad-left binding, `G.photo` and its camera, the bar and its styles, the Korean texts and `tools/photo_test.js` are gone.

## Roadmap

Each step is sized like the earlier S, T and V steps: one commit, its own test, and a debug APK.

### Done

- **V1–V6.** Phone overlay and dynamic resolution (V1; the check on a real phone is still open, see P1), gear depth, save safety, controls everywhere, Endless curses, weapon arts.
- **W1–W6. The world above.** A bigger Hold with walking villagers; the Rim (zones, beasts, leash, day and night, field bosses); materials and crafting; the notice board, captives and the Ring; raids on the gate and Sefa's caravan; the big monsters (mutant, troll, golem) as field bosses, Endless champions and Ring fights.
- **N1–N8.** The gate road fixed; natural postures (sitting, kneeling, everyday idles); skinned bodies (Hold 624 → 125 draw calls); balance against stage gold; horn, bell, guards fighting raiders; the Fen through the east gate; Captain Rook's war-camp task; appearance, the gauntlet and the rune vault, and Korean.

### Next: the list after the hack-and-slash dungeon (ranked; updated 2026-10-22)

H1 to H4 are built (see below). What is left, in the order to do it:

**R1. Check on a real phone.** Everything below was tested headless. Play the debug APK on a phone and a tablet and look at: the ad strip and the banner's position after turning the device (the banner is put up again when the width changes), the Korean text and the speech levels, the scene camera on a tall and a wide screen, the feel of the new combat (no stagger on ordinary blows), and frame rate with a full horde in the cave, forest and town stages (P1's exit criterion: 50+ FPS on Medium).

**R2. Guard against the bug class we hit.** The scene system once overwrote `G.scene`, a field another system used, and the sparring lesson broke after Hobb's scene. Add a test that every `G.*` field is written by one module only, and run the bot through "scene, then shop / lesson / descent" for each scene type.

**R3. Ads before any release.** The consent prompt for the EU and UK, the ads declaration in the Play Console, `testing: false` only in the store build, and an ad-free first-run check.

**R4. Class balance** (`docs/class-balance-report-2026-10-22.md`). Solo, the cleric cannot finish stages and the archer loses time to armored foes. Try: the cleric's smite and heavy smite +40%; ranged hits ignore part of armor (cut by 25% instead of 40%); then re-run all four classes, the cleric with a party (`PARTY=1`), and the casual profile. Before judging further, teach the ranged bot to dodge and to give up on a foe it cannot reach.

**R5. Difficulty.** The skilled bot clears every stage with 0 to 4 deaths, so Normal may be easy for a good player. Wait for real play notes, then tune (horde size, the last stages, the Hollow King's second phase).

**R6. Story depth.**
- Scenes for more people: Bram, Tilda, Rook and the rescued captives only speak at set moments; villagers could react to the ending; companions could comment on more of the story.
- A journal screen: finished objectives and what the warden learned.
- Cheap consequences for choices (so far three change anything: Rook's banner, Bram's key, Maren's forgiveness): for example a discount from Bram after he was trusted.
- English character voices: Korean has a voice per character (`docs/KOREAN_STYLE.md`), English does not. It means editing the story text in `js/config.js`, so the Korean keys change with it.

**R7. Level design (the rest of H2 and H3).** Winding cave tunnels and curved outlines (walkable space as shapes for `inSpace` and the camera), cave decor (pools, mushrooms, stalactites), houses you can walk into, streets that bend, and new stages (a village above the Orchard) instead of restyled ones.

**R8. Polish.** A native read of the rewritten Korean lines (Rook's 하게체, Odo's 하오체 were written without a reviewer); ambient sound for the Hold, the Rim and the Fen (P5), and hearing the Under's boss theme; the signed release build, the icon and the store listing (V7).

### Done: the hack-and-slash dungeon (H1 to H4)

Ordinary blows no longer stagger the warden (built: only unblockable, area, boss and heavy blows do, and not during the warden's own heavy swing; `CFG.player.staggerPosture`). The steps below build on that.

**H1. Hordes (built).** Bigger packs (5 to 8 foes: many light ones, one or two strong), more foes attacking at once (`maxAttackers` 2 to about 4 on Normal, the rest circling), waves that chain when the last is nearly cleared, a kill-streak that feeds the ultimate and drops health orbs, a cap on live foes for phones.
- Built (`CFG.horde`, `tools/horde_test.js`): a wave gains 0.6 extra light foes per foe (plus one every two sections; half on Story, 1.3x on Hard) of its own light kinds, at most 12 alive from one section; the extras have 70% of the usual health and damage (a first try with full-strength extras and four attackers made the bot take about 7x the damage in the Bone Orchard); the next wave comes when 2 are left (not in side rooms); attackers at once 3 on Normal (2 Story, 4 Hard); every 5 kills within 4 s of each other: 3% health and 3 s off the ultimate; extras pay 40% xp and gold so a stage pays about what it did. The balance bot clears stages 1-4 with 0-6 deaths (casual), as before.
- Still open: 50+ FPS on a real phone with a full horde (P1).

**H2. Natural spaces: caves (first pass built).** Walkable space becomes shapes (circles, blobs, tunnels of varying width) instead of rectangles: `World.inSpace`, the camera's wall push, the movement limits of heroes, foes and companions, and the walls follow the shape. First theme: caves (chambers, winding tunnels, stalactites, glowing crystals, pools). Rectangular rooms stay as they are; a stage can mix styles.
- First pass built (`theme.style: 'cave'` on the Ogre Den, Spider Depths and Frost Halls; `tools/cave_test.js`): the section keeps its rectangle as a frame, but rock bulges out of the walls, rock formations stand in the open (blockers, so the walkable space is no longer a plain rectangle, with a lane left open and a 0.5 m grid flood proving a way through), glowing crystals replace torches, mottled earth and rock textures replace flagstones and brick, boulders are never more than 2.3 m tall so the camera looks over them. The bot plays all three stages through.
- Still open for a fuller H2: tunnels that wind and change width (passages are still straight), true curved chamber outlines (walkable space as circles and polygons for `inSpace` and the camera), cave-only decor (pools, mushrooms, stalactites).

**H3. Forest and abandoned town (first pass built).** The same blocker system as the caves: the Bone Orchard is a forest (a dense rim of trees, thickets in from the walls, bare trees, fallen logs and bushes in the open, wisp lanterns, grass and bark textures) and the Iron Keep a ruined town (sagging-roof houses with empty windows along both walls, rubble along the far wall, a broken fountain, wells, carts and crates in the square, lamp posts). Tested with `tools/cave_test.js` (a way through every section, doorways clear); the bot plays both. The town is also the place for the story's NPCs (H4).
- Still open: houses you can walk into, streets that bend, outdoor sky and ground that is not a rectangle, new stages (a village above the Orchard) rather than restyled ones.

**H4. Story and natural NPCs (first step built: scenes, objectives, a first chain).** A quest-state system first (acts tied to the stages, guardians as beats, saved with the game); then short in-engine scenes with the camera framing the speaker, NPCs that turn to you, gesture and speak with a typed caption and choices, NPCs and companions that react as the story moves on.
- Built (`js/scene.js`, `js/story.js`, `CFG.mainStory`, `tools/story_test.js`): **Scenes** play in the world: the camera frames the speaker over the warden's shoulder with the letterbox, the speaker turns to the warden and sways a little while the words are typed (Enter, click, E or A finishes the line and then goes on; Esc or B skips), and a line can offer choices (1 to 4, arrows, click) that jump to labels in the script, with an optional flag saved in `Items.S.flags`. **The main story** is a chain of objectives (shown in the HUD under the health bars, saved as `Items.S.main`) that move on when the warden talks to a camp person or a guardian falls; a step can play a scene when it completes. The first chain: meet Maren (choices about the Deep), Hobb's yard, the Bone Warden, report to Maren (a choice), Sir Aldric, report again (a choice that sets `toldKing`). Maren's usual lines are scenes too.
- Act I of `docs/STORY.md` is built: relics to examine in the first rings (`Props.relic`, `find` events; shown once, then gone), guardians' last words as a caption (`Story.guardianFell`), beats (`CFG.mainStory.beats`: scenes with `needs`/`not`/`set`/`reward`) for Captain Rook (a banner to fetch and a 150 gold reward), Tilda, Bram (his brother's pack, a mould fragment and a choice) and Maren (a slip, then her confession and a choice), flag-gated scene lines (`if:`), narration lines, and Hobb as a figure at the yard. Tested with `tools/story2_test.js`; Korean for the new lines in `tools/i18n/ko_part11.json`.
- Act II and the endings are built too (`tools/story3_test.js`): rings 6 to 10 with their relics, last words and beats (the mural and Maren's reply, Rook's tiredness and salute, Bram's forge scene and the lock-key choice, Maren's grave and her choice to come down), the ending scene after the Hollow King falls (`Story.ending`: the Watch always; the Relief needs `marenDescends` and `maren_forgiven`; the Breaking needs `bramKey`; the choices that are open depend on the flags), and an epilogue per ending when the warden is back in camp (`Story.epilogue`). The Relief leaves Maren's chair empty in the camp. The Watch leads into the Endless Deep.
- The Hollow King fights in two phases (`CFG.bosses[9]`, `tools/story4_test.js`): the King from the start (the old sergeant's two-handed set, a caption as he wakes), then at half health the Under takes him (a dark tint kept by the guardian, its own theme in the music, faster, a blink thrust and a void ring, shades from the floor, a caption). Hired companions comment at three key moments (Maren's confession, the Crown, the ending; up to two of them, one caption after the other, `CFG.mainStory.banter`).
- Still open: more people with scenes (the captives), gestures from the clips (pointing, nodding) instead of a sway, the story's middle and end (the Den to the Throne), scenes in the dungeon (a companion speaking as a guardian wakes), companions and villagers that comment on the flags, voices or sound cues, a journal screen listing finished objectives, the abandoned town as the place of the story's second act.

### Then: check what is built

**P1. Real-phone pass.** Every number so far is headless. Install the debug APK on a mid-range Android phone and play the Hold, the Rim during a raid, the Fen at night and a boss fight.
- Frame rate, touch reach, text size, safe areas, and the Korean font.
- Exit criterion: 50+ FPS on Medium in the Hold, the Fen and an Act II stage.

**P2.** (Photo mode was removed from the game, so there is no photo saving to do.)

**P3. Korean polish.** (Done since: no honorifics in text to the player, a speech level per character, one spelling per name, `docs/KOREAN_STYLE.md`; open: a native read, see R8.)
- Texts built from pieces in code (key hints, tutorial lines, "Go deeper · floor 3") become whole sentences with numbered slots, so Korean word order comes out right.
- A native read of the story lines and boss names.
- The i18n test fails when new English shows up.

**P4. Balance bot on the new content.** Run tools/balance.js (casual and skilled) through the Fen, the gauntlet, the Ring monsters and raids; tune health and damage where it dies too often or never.

**P14. Class pass.** (The balance bot has now run all four classes: see R4 and `docs/class-balance-report-2026-10-22.md`.) Balance the three new classes with the bots (solo clears of the stages, the Fen, the Ring and raids); give the archer and mage their own caster-friendly gear in Bram's craft tab; look over the class-picker and mode-toggle text with a native reader for Korean (the new strings are not in `lang_ko.js` yet).

### Then: feel

**P5. Sound pass.** Ambient loops for the Hold (fire, chatter), the Rim (wind, birds) and the Fen (frogs, dripping water); footsteps on different ground; a boss theme for field bosses.

**P6. Weather.** Rain and fog on the Rim and the Fen, changing with the day and shortening how far you see.

**P7. Hold life.** Villagers gather at the fire at night and go into the cabins; shops close after dark; people react when a raid starts (run inside, Wenna stops playing).

### Then: content

**P8. Act III.** A third set of stages below the Throne of the Deep, with new enemy types and a final boss; the Endless Deep starts after it.

**P9. More side quests like Rook's.** Maren's (the story), Bram's (a legendary forge recipe) and Ysolde's (rare herbs in the Fen at night).

**P10. Companions.** A freed captive can follow the warden below as a light helper (Mira with a bow, Brother Aldo healing): see Party play above. Needs the target refactor first.

**P11. Set items.** A few gear sets with bonuses for wearing two and four pieces, dropped by field bosses and Ring fights.

### Later

- **P12.** More languages (Japanese, Simplified Chinese, Spanish): one table each with tools/i18n_harvest.js and tools/i18n_merge.py.
- **P13.** Cloud save, or export to a file and the Android share sheet.
- **V7. Release build (when wanted).** A signed APK and .aab from repository secrets, a version number per tag, and a store listing. Not started on purpose: debug APKs only for now.
