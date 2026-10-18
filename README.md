# Deepward

A quarter-view 3D action dungeon crawler that runs in the browser (Three.js r128, no build step). No town, no army: the whole game is the fight. Every enemy attack is telegraphed, and each dungeon tier demands a skill the last one didn't: spacing, then dodging, blocking, parrying, and reading feints.

Every model and animation is built in code from primitives. There are no model, texture or sound files.

**Status: milestone 1 plus forward progression.** You fight your way north through a chain of sealed rooms. Each cleared room raises its far gate and the next room fades in out of the dark. Once you step through, the gate drops behind you and the room you left fades out and is unloaded. Stages change every four rooms (The Crypt, The Iron Keep, The Ogre Den), each with its own stone, torchlight, fog and enemies, and each ends in a guardian room. After the last stage they repeat with tougher enemies. See [docs/DESIGN.md](docs/DESIGN.md) for the full plan.

## Run

Open `index.html` in a browser. Three.js is vendored in `vendor/`, so it works offline and from `file://`.

A single-file build goes to `dist/deepward-single.html`; regenerate it with `python3 tools/build_single.py`.

## Camera views

There are two views; switch with **B** or the 🎥 button, and the game remembers your choice.

- **Behind (default):** an orbit camera over the hero's shoulder, like Nightfall Settlement's normal view. The mouse turns the camera (click once to capture it; Esc releases it and pauses). On touch, drag the right side of the screen. The scroll wheel zooms. The hero always faces where the camera looks, so WASD strafes and walks backward; backing up and sidestepping are a little slower. Attacks go where you look, with light aim assist.
- **Top-down:** the fixed high quarter view. The hero faces the way it walks and turns toward the nearest enemy while blocking.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move (strafe in the behind view) | WASD / arrows | Left thumb (floating stick) |
| Turn camera (behind view) | Mouse (click to capture) | Drag the right side |
| Switch camera | B | 🎥 |
| Light attack (3-hit combo) | J / left-click | ATTACK |
| Heavy attack (breaks guards) | K / Q / middle-click | HEAVY |
| Block (hold), parry (tap at impact) | L / Shift / right-click | BLOCK |
| Dodge roll (invulnerable mid-roll) | Space | DODGE |
| Pause / mute | Esc or P / M | ⏸ / 🔊 |

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
| `js/config.js` | `CFG`: every balance number (player moves, enemies and their attacks) and the stages: rooms, sizes, waves, themes |
| `js/audio.js` | Synthesized sound effects (WebAudio) |
| `js/rig.js` | Code-built characters (hero, skeleton, knight, brute), weapons, shields, procedural poses, swing trails |
| `js/fx.js` | Sparks, glints, floor rings, floating text, hit-stop, slow motion, screen shake |
| `js/combat.js` | Attack cones and hit resolution between player and enemies |
| `js/player.js` | The hero's state machine: move, attack combo, block/parry, roll, stagger |
| `js/enemies.js` | Enemy AI: approach/circle, attack tokens, telegraphs, guard, posture, death |
| `js/world.js` | The dungeon: room and corridor building per stage theme, portcullis gates, fade-in/fade-out and unloading, walkable space, encounters, pooled torch lights |
| `js/game.js` | Scene, camera, input, HUD, game flow, main loop, `window.__dw` test hook |
| `tools/combat_test.js` | Headless checks of every combat mechanic (Playwright) |
| `tools/build_single.py` | Builds the single-file version |

## Testing

```bash
node tools/combat_test.js     # set NODE_PATH=$(npm root -g) if Playwright is installed globally
```

It drives the game through `window.__dw` and checks, in both camera views, parry, block, taking a hit, dodging an area slam, unblockable attacks, strafing, the light combo, shield bounce, guard break and the riposte critical. It also plays through five rooms into stage 2 and checks that the gates open and the rooms behind unload.
