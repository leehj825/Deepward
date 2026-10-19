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
  - Five slots: weapon, shield, armour, helm and trinket.
  - Weapon types: sword, axe, mace, longsword and the two-handed greatsword.
  - Tiers by depth, four rarities, eight bonus types, and smith upgrades up to +8 with the best forge.
  - Gear changes the hero's look: blade, weapon model, tunic colour, plate, helm style, shield face and amulet.

## Gear: the original plan against what's built

| Planned | Status |
| --- | --- |
| Eight slots (weapon, off-hand, helm, chest, gloves, boots, ring, amulet) | Five built (weapon, shield, armour, helm, trinket); gloves, boots and a ring are on the roadmap (V2) |
| Weapon types with their own moves | Built: sword, axe, mace, longsword, greatsword, spear and twin daggers; spear and daggers have their own combos and heavies |
| Four rarities with random bonuses; legendaries with unique effects | Built, plus nine named uniques and gem sockets. Elemental damage is not built (V2) |
| Weight slows the dash | Not built (V2) |
| Forge: upgrade, salvage, reroll one bonus | Upgrade, salvage, gems and sockets built; reroll is not (V2) |
| Every equipped piece shown on the rig | Built |

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

## Roadmap

The next steps, in the order I'd take them. Each is sized like one of the S or T steps: one commit, its own test, and a debug APK.

**V1. Play on a real phone.** Everything so far was measured headless. Install the debug APK on a mid-range Android phone and fix what shows up.
- An FPS and draw-call overlay (Settings → Show performance), and dynamic resolution that drops a step when the frame time stays above 20 ms.
- Check touch reach, text size, safe areas (notches) and the pause on app switch (Capacitor `appStateChange`).
- Exit criterion: 50+ FPS on Medium through a full Act II stage.

**V2. Gear depth.** Finish the original gear plan.
- Gloves, boots and a ring slot (eight slots total), with their own looks on the rig.
- Weight: heavy armour slows the dash and costs more stamina; light gear the reverse.
- Elemental bonuses (fire burns over time, frost slows, shock breaks posture faster) using the existing burn hook.
- Bram rerolls one bonus for gold and scrap.

**V3. Save safety.** The save is one `localStorage` key.
- Versioned saves with a migration step, so future changes never wipe progress.
- Export and import the save as text (and Android share) for moving between devices.
- Three save slots.

**V4. Controls everywhere.** Remap keyboard and controller buttons in Settings, with the training yard and prompts showing the new bindings.

**V5. Endless Deep with modifiers.** Optional curses that make a run harder for more gold and a separate leaderboard on the device: no flasks, enemies always elite, double speed, glass hero. The Daily Descent gets one fixed curse.

**V6. Weapon arts.** One special move per weapon type, unlocked at mastery rank 3: a sword riposte stance, an axe leap, a mace ground shock, a longsword thrust charge, a greatsword spin, a spear vault and a dagger flurry.

**V7. Release build (when wanted).** A signed APK and .aab from repository secrets, a version number per tag, and a store listing. Not started on purpose: debug APKs only for now.

Smaller ideas kept for later: hero appearance options, a photo mode, more Act II side-room types (a gauntlet room, a trap puzzle), and translations.
