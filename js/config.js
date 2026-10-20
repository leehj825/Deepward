// Deepward - every balance number lives here. Times are in seconds, distances in metres, angles in degrees.
const CFG = {
  player: {
    hp: 100, stamina: 100,
    staminaRegen: 38, staminaDelay: 0.55,          // per second, after this long without spending any
    speed: 5.4, blockSpeed: 2.2, turnRate: 16,
    radius: 0.45,
    // A quick ground dash in any direction (keeps facing the camera in the behind view); invulnerable for most of it
    dodge: { time: 0.3, dist: 2.6, iStart: 0.02, iEnd: 0.24, cost: 18 },
    block: {
      reduce: 0.85,              // share of damage a block absorbs
      staminaPerDmg: 1.15,       // stamina lost per point of damage blocked
      parryWindow: 0.2,          // a block raised this soon before impact is a parry
      angle: 120,                // a block only covers this cone in front of you
      breakStun: 1.1,            // stunned this long when a block runs out of stamina
      regenMult: 0.45,           // stamina regen while holding block
    },
    // Light attacks chain into a three-hit combo; a press during the recovery buffers the next one.
    light: [
      { pose: 'slashR', wind: 0.12, active: 0.09, recover: 0.32, dmg: 12, posture: 10, cost: 11, range: 2.2, arc: 120, lunge: 1.4 },
      { pose: 'slashL', wind: 0.11, active: 0.09, recover: 0.32, dmg: 12, posture: 10, cost: 11, range: 2.2, arc: 120, lunge: 1.4 },
      { pose: 'overhead', wind: 0.18, active: 0.1, recover: 0.45, dmg: 20, posture: 18, cost: 15, range: 2.4, arc: 80, lunge: 1.8 },
    ],
    heavy: { pose: 'heavy', wind: 0.42, active: 0.12, recover: 0.5, dmg: 32, posture: 45, cost: 26, range: 2.6, arc: 150, lunge: 2.2, breaksGuard: true },
    // Light combos and heavy attacks for weapons that move differently (the rest use light / heavy above)
    combos: {
      // A lone shot per press, so a ranged class fires as fast as stamina lasts
      bow: [{ pose: 'shoot', wind: 0.2, active: 0.08, recover: 0.26, dmg: 11, posture: 7, cost: 8, range: 22, arc: 0, lunge: 0, shot: { kind: 'arrow', speed: 34 } }],
      staff: [{ pose: 'shoot', wind: 0.22, active: 0.1, recover: 0.3, dmg: 13, posture: 8, cost: 9, range: 16, arc: 0, lunge: 0, shot: { kind: 'bolt', speed: 26, color: 0x7ae8ff } }],
      // The cleric's light blow is a holy bolt (weaker than the mage's, a third more against the undead) or, in heal mode, a single heal
      scepter: [{ pose: 'thrust', wind: 0.2, active: 0.1, recover: 0.3, dmg: 8, posture: 6, cost: 9, range: 13, arc: 0, lunge: 0, shot: { kind: 'holy', speed: 24, color: 0xfff0b0, undead: 1.4 } }],
      scepterHeal: [{ pose: 'heal', wind: 0.28, active: 0.1, recover: 0.36, dmg: 0, posture: 0, cost: 14, range: 0, arc: 0, lunge: 0, heal: { amount: 0.10, self: 0.5, reach: 8, cd: 1.6, color: 0x9affc0 } }],
      spear: [
        { pose: 'thrust', wind: 0.13, active: 0.08, recover: 0.3, dmg: 12, posture: 9, cost: 11, range: 3.0, arc: 40, lunge: 1.2 },
        { pose: 'thrust', wind: 0.11, active: 0.08, recover: 0.3, dmg: 12, posture: 9, cost: 11, range: 3.0, arc: 40, lunge: 1.2 },
        { pose: 'slashR', wind: 0.2, active: 0.12, recover: 0.45, dmg: 18, posture: 16, cost: 15, range: 2.9, arc: 170, lunge: 0.8 },
      ],
      daggers: [
        { pose: 'slashR', wind: 0.07, active: 0.06, recover: 0.2, dmg: 7, posture: 5, cost: 6, range: 1.9, arc: 110, lunge: 1.3 },
        { pose: 'slashL', wind: 0.07, active: 0.06, recover: 0.2, dmg: 7, posture: 5, cost: 6, range: 1.9, arc: 110, lunge: 1.3 },
        { pose: 'slashR', wind: 0.07, active: 0.06, recover: 0.2, dmg: 7, posture: 5, cost: 6, range: 1.9, arc: 110, lunge: 1.3 },
        { pose: 'slashL', wind: 0.07, active: 0.06, recover: 0.2, dmg: 7, posture: 5, cost: 6, range: 1.9, arc: 110, lunge: 1.3 },
        { pose: 'thrust', wind: 0.12, active: 0.08, recover: 0.4, dmg: 14, posture: 10, cost: 9, range: 2.1, arc: 50, lunge: 2.0 },
      ],
    },
    heavies: {
      // Ranged classes: `shot` makes the blow a projectile (see js/shots.js); `heal` makes it a healing spell. range is how far it flies / reaches.
      // The archer's heavy is a fan of seven arrows: point blank they all strike one foe, far off they spread over several
      bow: { pose: 'shoot', wind: 0.45, active: 0.1, recover: 0.45, dmg: 10, posture: 10, cost: 26, range: 14, arc: 0, lunge: 0, shot: { kind: 'arrow', speed: 34, count: 7, spread: 0.7 } },
      // The mage's heavy calls a fireball down on the target (the locked or nearest foe, else a spot ahead): the blast and the burn are there, not at the hero
      staff: { pose: 'overhead', wind: 0.5, active: 0.12, recover: 0.5, dmg: 32, posture: 30, cost: 28, range: 15, arc: 0, lunge: 0, breaksGuard: true, shot: { kind: 'meteor', splash: 3, ignite: true, color: 0xff7a30, delay: 0.45 } },
      // The cleric's heavy follows her mode: a stronger smite (a bright orb that bursts), or in heal mode the area heal below
      scepter: { pose: 'overhead', wind: 0.45, active: 0.12, recover: 0.5, dmg: 22, posture: 30, cost: 24, range: 14, arc: 0, lunge: 0, breaksGuard: true, shot: { kind: 'holy', speed: 20, splash: 1.8, size: 1.5, color: 0xfff0b0, undead: 1.5 } },
      scepterHeal: { pose: 'bless', wind: 0.5, active: 0.12, recover: 0.5, dmg: 0, posture: 0, cost: 28, range: 0, arc: 0, lunge: 0, heal: { amount: 0.22, self: 0.5, radius: 5.5, cd: 9, color: 0x9affc0 } },
      spear: { pose: 'thrust', wind: 0.38, active: 0.14, recover: 0.5, dmg: 30, posture: 42, cost: 24, range: 3.6, arc: 35, lunge: 3.2, breaksGuard: true },
      daggers: { pose: 'heavy', wind: 0.3, active: 0.12, recover: 0.42, dmg: 24, posture: 34, cost: 22, range: 2.2, arc: 220, lunge: 1.8, breaksGuard: true },
    },
    // Weapon arts: a special move for each weapon type once its mastery reaches rank 3. Hold block and press heavy.
    // Each is a list of hits played one after another; ring draws a shockwave of that radius when a hit lands.
    arts: {
      bow: { name: 'Piercing Shot', cost: 30, cd: 9, desc: 'One heavy arrow that pierces everything in line', hits: [
        { pose: 'shoot', wind: 0.45, active: 0.1, recover: 0.5, dmg: 46, posture: 40, range: 28, arc: 0, lunge: 0, breaksGuard: true, shot: { kind: 'arrow', speed: 46, pierce: true } }] },
      staff: { name: 'Arcane Nova', cost: 32, cd: 9, desc: 'A blast of raw magic all around you', hits: [
        { pose: 'nova', wind: 0.5, active: 0.14, recover: 0.55, dmg: 36, posture: 60, range: 4.2, arc: 360, lunge: 0, breaksGuard: true, ring: 4.2 }] },
      scepter: { name: 'Sanctuary', cost: 34, cd: 14, desc: 'A great light that mends everyone near', hits: [
        { pose: 'sanct', wind: 0.6, active: 0.14, recover: 0.5, dmg: 0, posture: 0, range: 0, arc: 0, lunge: 0, heal: { amount: 0.4, self: 0.6, radius: 7, cd: 0, color: 0xfff0b0, ring: 7 } }] },
      sword: { name: 'Falling Star', cost: 30, cd: 8, desc: 'A leaping overhead that breaks guards', hits: [
        { pose: 'overhead', wind: 0.34, active: 0.12, recover: 0.5, dmg: 46, posture: 62, range: 2.7, arc: 100, lunge: 3.2, breaksGuard: true }] },
      axe: { name: 'Cleaving Leap', cost: 32, cd: 9, desc: 'Leap in and split the ground around you', hits: [
        { pose: 'heavy', wind: 0.44, active: 0.14, recover: 0.55, dmg: 40, posture: 52, range: 2.8, arc: 360, lunge: 4.2, breaksGuard: true, ring: 2.8 }] },
      mace: { name: 'Earthshaker', cost: 32, cd: 9, desc: 'A ground shock that shatters posture all around', hits: [
        { pose: 'heavy', wind: 0.5, active: 0.14, recover: 0.6, dmg: 30, posture: 95, range: 3.6, arc: 360, lunge: 0.4, breaksGuard: true, ring: 3.6 }] },
      longsword: { name: 'Piercing Lunge', cost: 28, cd: 7, desc: 'A long dashing thrust that strikes from afar', hits: [
        { pose: 'thrust', wind: 0.24, active: 0.1, recover: 0.45, dmg: 40, posture: 40, range: 4.4, arc: 30, lunge: 4.6 }] },
      greatsword: { name: 'Whirlwind', cost: 34, cd: 9, desc: 'Two full spins that cut everything near', hits: [
        { pose: 'slashR', wind: 0.3, active: 0.14, recover: 0.04, dmg: 30, posture: 34, range: 3.1, arc: 360, lunge: 0.6 },
        { pose: 'slashR', wind: 0.12, active: 0.14, recover: 0.55, dmg: 34, posture: 40, range: 3.1, arc: 360, lunge: 0.6, breaksGuard: true }] },
      spear: { name: 'Skewer', cost: 28, cd: 7, desc: 'A thrust that reaches five metres and breaks guards', hits: [
        { pose: 'thrust', wind: 0.3, active: 0.12, recover: 0.5, dmg: 38, posture: 46, range: 5.0, arc: 22, lunge: 2.0, breaksGuard: true }] },
      daggers: { name: 'Flurry', cost: 26, cd: 7, desc: 'Six cuts faster than the eye', hits: [0, 1, 2, 3, 4, 5].map(i => (
        { pose: i % 2 ? 'slashL' : 'slashR', wind: i ? 0.05 : 0.12, active: 0.05, recover: i < 5 ? 0.03 : 0.4, dmg: 9, posture: 8, range: 2.1, arc: 120, lunge: 0.6 })) },
    },
    // A heavy attack on a posture-broken enemy close by is an execution: an untouchable finishing blow that kills
    // outright (guardians and champions take execMult times a critical instead)
    execute: { range: 2.6, wind: 0.32, active: 0.12, recover: 0.5, execMult: 0.8 },
    comboReset: 0.55,            // the combo starts over if you wait this long after a hit
    bufferTime: 0.3,             // how long a pressed button waits for the current move to finish
    critMult: 3,                 // damage multiplier on a posture-broken enemy (riposte)
    hurtStun: 0.32,
  },
  feel: {
    hitStop: 0.06, heavyHitStop: 0.11, parrySlowmo: 0.35, parrySlowScale: 0.25,
    shake: { hit: 0.12, heavy: 0.25, hurt: 0.3, parry: 0.2 },
  },
  // Every enemy attack is a list of hits; each hit winds up (telegraph), strikes, then recovers.
  // unblockable hits glow red and must be dodged; the rest glow white and can be blocked or parried.
  enemies: {
    skeleton: {
      name: 'Skeleton', hp: 46, posture: 50, postureRegen: 14, speed: 2.7, radius: 0.45, scale: 1,
      flinch: true, approach: 1.7, cooldown: [0.9, 1.7], xp: 10, gold: 6,
      attacks: [
        { weight: 3, hits: [{ pose: 'slashR', wind: 0.72, active: 0.1, recover: 0.6, dmg: 12, posture: 14, range: 2.1, arc: 100, lunge: 1.2 }] },
        { weight: 2, hits: [
          { pose: 'slashR', wind: 0.62, active: 0.1, recover: 0.14, dmg: 10, posture: 12, range: 2.1, arc: 100, lunge: 0.9 },
          { pose: 'slashL', wind: 0.32, active: 0.1, recover: 0.7, dmg: 10, posture: 12, range: 2.1, arc: 100, lunge: 0.9 },
        ] },
      ],
    },
    knight: {
      name: 'Shield Knight', hp: 72, posture: 70, postureRegen: 16, speed: 2.4, radius: 0.5, scale: 1.08,
      flinch: true, guard: true, guardAngle: 130, approach: 1.9, cooldown: [1.1, 2.0], xp: 18, gold: 12,
      attacks: [
        { weight: 3, hits: [{ pose: 'thrust', wind: 0.6, active: 0.1, recover: 0.65, dmg: 15, posture: 16, range: 2.5, arc: 50, lunge: 1.6 }] },
        { weight: 2, hits: [{ pose: 'overhead', wind: 0.85, active: 0.12, recover: 0.75, dmg: 20, posture: 24, range: 2.2, arc: 70, lunge: 1.2 }] },
      ],
    },
    brute: {
      name: 'Brute', hp: 150, posture: 110, postureRegen: 10, speed: 2.1, radius: 0.85, scale: 1.5,
      flinch: false, hyperArmor: true, approach: 2.3, cooldown: [1.2, 2.2], xp: 35, gold: 22,
      attacks: [
        { weight: 3, hits: [{ pose: 'slashR', wind: 0.85, active: 0.14, recover: 0.8, dmg: 22, posture: 30, blockMult: 1.6, range: 2.9, arc: 140, lunge: 1.0 }] },
        { weight: 2, hits: [{ pose: 'heavy', wind: 1.15, active: 0.14, recover: 1.0, dmg: 34, posture: 0, range: 2.6, arc: 360, aoe: { fwd: 1.9, r: 2.3 }, unblockable: true, lunge: 0.6 }] },
      ],
    },
    // ---- The Rim (the field outside the south gate) ----
    // Wolves run in packs and circle; the pounce leaps in from range
    wolf: {
      name: 'Grey Wolf', rig: 'wolf', hp: 38, posture: 40, postureRegen: 16, speed: 4.4, radius: 0.5, scale: 1,
      flinch: true, approach: 1.9, cooldown: [0.9, 1.8], xp: 12, gold: 5, aggro: 10, pack: true,
      attacks: [
        { weight: 3, hits: [{ pose: 'bite', wind: 0.42, active: 0.1, recover: 0.5, dmg: 9, posture: 10, range: 1.9, arc: 80, lunge: 1.4 }] },
        { weight: 2, hits: [{ pose: 'pounce', wind: 0.75, active: 0.16, recover: 0.7, dmg: 14, posture: 16, range: 2.3, arc: 60, lunge: 3.2, leap: true }] },
      ],
    },
    // Boars gore up close; from 5-10 m they lower the head and CHARGE in a straight line (unblockable: dash aside)
    boar: {
      name: 'Tusked Boar', rig: 'boar', hp: 85, posture: 80, postureRegen: 12, speed: 3.0, radius: 0.7, scale: 1,
      flinch: false, hyperArmor: true, approach: 2.0, cooldown: [1.2, 2.2], xp: 22, gold: 10, aggro: 8, charge: [4.5, 10, 1],
      attacks: [
        { weight: 3, hits: [{ pose: 'gore', wind: 0.6, active: 0.12, recover: 0.6, dmg: 15, posture: 18, range: 2.0, arc: 90, lunge: 1.2 }] },
        { weight: 0, hits: [{ pose: 'charge', wind: 0.95, active: 0.45, recover: 0.9, dmg: 24, posture: 0, range: 2.2, arc: 70, lunge: 8.5, unblockable: true }] },
      ],
    },
    // Goblin scouts keep their distance and throw spears (block, parry or dash them)
    scout: {
      name: 'Goblin Scout', rig: 'scout', hp: 30, posture: 30, postureRegen: 14, speed: 3.6, radius: 0.42, scale: 0.9,
      flinch: true, ranged: [6, 11], solo: true, approach: 8, cooldown: [1.6, 2.6], xp: 12, gold: 8, aggro: 12,
      attacks: [{ weight: 1, hits: [{ pose: 'shoot', wind: 0.8, active: 0.1, recover: 0.7, dmg: 11, posture: 10, range: 13, arc: 30, lunge: 0, projectile: { speed: 12 } }] }],
    },
    // A hulking mutant from the Deep (its motion capture is the Creature Pack): claw swipes and punches, a leaping slam
    // that shakes the ground around it (unblockable), and from 5-11 m a long leap onto the warden
    mutant: {
      name: 'Deep Mutant', rig: 'mutant', look: { variant: 'horror' }, hp: 260, posture: 160, postureRegen: 12, speed: 3.2, radius: 1.1, scale: 1.5,
      flinch: false, hyperArmor: true, approach: 2.5, cooldown: [1.0, 1.8], xp: 80, gold: 50, aggro: 13, charge: [5, 11, 3],
      attacks: [
        { weight: 3, hits: [{ pose: 'swipe', wind: 0.75, active: 0.14, recover: 0.7, dmg: 26, posture: 30, range: 3.0, arc: 150, lunge: 1.2 }] },
        { weight: 3, hits: [
          { pose: 'punch', wind: 0.55, active: 0.1, recover: 0.2, dmg: 18, posture: 22, range: 2.8, arc: 70, lunge: 1.4 },
          { pose: 'swipe', wind: 0.45, active: 0.14, recover: 0.7, dmg: 22, posture: 26, range: 3.0, arc: 150, lunge: 1.0 },
        ] },
        { weight: 2, hits: [{ pose: 'slam', wind: 1.1, active: 0.22, recover: 1.0, dmg: 38, posture: 0, range: 3.2, arc: 360, aoe: { fwd: 2.0, r: 2.8 }, unblockable: true, lunge: 3.0, leap: true }] },
        { weight: 0, hits: [{ pose: 'leap', wind: 0.9, active: 0.4, recover: 0.9, dmg: 30, posture: 0, range: 3.0, arc: 360, aoe: { fwd: 0.6, r: 3.0 }, unblockable: true, lunge: 9, leap: true }] },
      ],
    },
    // The same great body as a cave troll: knuckle-fists in long combos, a ground slam, and it regenerates when left alone
    troll: {
      name: 'Cave Troll', rig: 'mutant', look: { variant: 'troll' }, hp: 300, posture: 150, postureRegen: 14, speed: 3.0, radius: 1.15, scale: 1.55,
      flinch: false, hyperArmor: true, approach: 2.5, cooldown: [1.0, 1.9], xp: 85, gold: 50, aggro: 11, regen: 0.02,
      attacks: [
        { weight: 3, hits: [
          { pose: 'punch', wind: 0.6, active: 0.1, recover: 0.18, dmg: 18, posture: 24, range: 2.9, arc: 70, lunge: 1.4 },
          { pose: 'punch', wind: 0.4, active: 0.1, recover: 0.18, dmg: 18, posture: 24, range: 2.9, arc: 70, lunge: 1.2 },
          { pose: 'swipe', wind: 0.5, active: 0.14, recover: 0.8, dmg: 26, posture: 32, range: 3.1, arc: 150, lunge: 1.0 },
        ] },
        { weight: 2, hits: [{ pose: 'slam', wind: 1.15, active: 0.22, recover: 1.1, dmg: 40, posture: 0, range: 3.2, arc: 360, aoe: { fwd: 2.0, r: 3.0 }, unblockable: true, lunge: 2.6, leap: true }] },
      ],
    },
    // ...and as a stone golem: slow boulder-fists that crush a guard, a quake that reaches far, and a stone hide (dr)
    golem: {
      name: 'Stone Golem', rig: 'mutant', look: { variant: 'golem' }, hp: 360, posture: 240, postureRegen: 10, speed: 2.3, radius: 1.25, scale: 1.65,
      flinch: false, hyperArmor: true, approach: 2.6, cooldown: [1.3, 2.2], xp: 95, gold: 60, aggro: 10, dr: 0.25,
      attacks: [
        { weight: 3, hits: [{ pose: 'punch', wind: 0.9, active: 0.12, recover: 0.8, dmg: 30, posture: 40, blockMult: 1.8, range: 3.0, arc: 80, lunge: 1.4 }] },
        { weight: 2, hits: [{ pose: 'swipe', wind: 1.0, active: 0.16, recover: 0.9, dmg: 28, posture: 36, blockMult: 1.5, range: 3.3, arc: 170, lunge: 0.8 }] },
        { weight: 2, hits: [{ pose: 'slam', wind: 1.3, active: 0.24, recover: 1.2, dmg: 44, posture: 0, range: 3.4, arc: 360, aoe: { fwd: 1.6, r: 3.8 }, unblockable: true, lunge: 1.6, leap: true }] },
      ],
    },
    // ---- Act II ----
    // Throws slow orbs from afar; a parry sends an orb back at the caster
    caster: {
      name: 'Drowned Acolyte', hp: 40, posture: 40, postureRegen: 14, speed: 2.4, radius: 0.42, scale: 1,
      flinch: true, ranged: [6, 11], solo: true, approach: 8, cooldown: [1.8, 2.8], xp: 18, gold: 12,
      attacks: [{ weight: 1, hits: [{ pose: 'shoot', wind: 1.0, active: 0.1, recover: 0.8, dmg: 14, posture: 12, range: 13, arc: 30, lunge: 0, projectile: { speed: 8, orb: 0x4ae8d0, reflect: true } }] }],
    },
    // Shelters every ally within ward.r: they take ward.cut less damage while it stands
    bearer: {
      name: 'Shieldbearer', rig: 'knight', look: { colors: { cloth: 0x2a3a6a } }, hp: 110, posture: 90, postureRegen: 14, speed: 2.1, radius: 0.55, scale: 1.18,
      flinch: false, guard: true, guardAngle: 160, approach: 2.0, cooldown: [1.4, 2.2], xp: 28, gold: 18, ward: { r: 5, cut: 0.45 },
      attacks: [
        { weight: 3, hits: [{ pose: 'thrust', wind: 0.7, active: 0.12, recover: 0.7, dmg: 16, posture: 22, range: 2.4, arc: 70, lunge: 1.4 }] },
        { weight: 2, hits: [{ pose: 'overhead', wind: 0.95, active: 0.12, recover: 0.8, dmg: 24, posture: 26, blockMult: 1.4, range: 2.4, arc: 80, lunge: 1.0 }] },
      ],
    },
    // Raises skeletons from the floor (they crumble when it dies) and throws a cursed orb
    necro: {
      name: 'Bone Caller', hp: 55, posture: 45, postureRegen: 14, speed: 2.4, radius: 0.42, scale: 1.05,
      flinch: true, ranged: [5, 9], solo: true, approach: 7, cooldown: [2.2, 3.2], xp: 26, gold: 16, raiseMax: 4,
      attacks: [
        { weight: 2, hits: [{ pose: 'overhead', wind: 1.2, active: 0.1, recover: 1.0, dmg: 0, posture: 0, range: 14, arc: 360, lunge: 0, raise: 2 }] },
        { weight: 1, hits: [{ pose: 'shoot', wind: 0.9, active: 0.1, recover: 0.8, dmg: 16, posture: 14, range: 12, arc: 30, lunge: 0, projectile: { speed: 9, orb: 0xb06aff, reflect: true } }] },
      ],
    },
    // Looks like a chest until you come close
    mimic: {
      name: 'Mimic', rig: 'mimic', hp: 90, posture: 60, postureRegen: 16, speed: 3.6, radius: 0.55, scale: 1,
      flinch: false, approach: 1.5, cooldown: [0.8, 1.4], xp: 40, gold: 45,
      attacks: [
        { weight: 3, hits: [{ pose: 'bite', wind: 0.45, active: 0.1, recover: 0.45, dmg: 16, posture: 14, range: 1.9, arc: 90, lunge: 0.8 }] },
        { weight: 2, hits: [{ pose: 'pounce', wind: 0.7, active: 0.3, recover: 0.8, dmg: 24, posture: 20, range: 2.2, arc: 110, lunge: 4.5, leap: true, parryOnly: true }] },
      ],
    },
    // Sergeant Hobb, who spars with the hero in the training yard (the tutorial gives him one move at a time)
    sparring: {
      name: 'Sergeant Hobb', rig: 'knight', hp: 99999, posture: 60, postureRegen: 0, speed: 1.4, radius: 0.5, scale: 1.0,
      flinch: false, approach: 2.0, cooldown: [1.4, 1.9], xp: 0, gold: 0,
      attacks: [{ weight: 1, hits: [{ pose: 'overhead', wind: 1.05, active: 0.12, recover: 1.0, dmg: 6, posture: 4, range: 2.5, arc: 100, lunge: 0.5 }] }],
    },
    // Keeps its distance and looses arrows (blockable; a parry just knocks the arrow aside). Does not wait its turn.
    archer: {
      name: 'Skeleton Archer', hp: 30, posture: 35, postureRegen: 14, speed: 2.6, radius: 0.42, scale: 1,
      flinch: true, ranged: [5.5, 10], solo: true, approach: 8, cooldown: [1.5, 2.5], xp: 12, gold: 7,
      attacks: [{ weight: 1, hits: [{ pose: 'shoot', wind: 0.9, active: 0.08, recover: 0.7, dmg: 11, posture: 10, range: 12, arc: 30, lunge: 0, projectile: { speed: 16 } }] }],
    },
    // Small, quick and fragile; comes in packs
    goblin: {
      name: 'Goblin', hp: 22, posture: 26, postureRegen: 18, speed: 4.3, radius: 0.36, scale: 0.72,
      flinch: true, approach: 1.4, cooldown: [0.5, 1.1], xp: 6, gold: 4,
      attacks: [
        { weight: 3, hits: [{ pose: 'thrust', wind: 0.42, active: 0.08, recover: 0.4, dmg: 7, posture: 6, range: 1.6, arc: 80, lunge: 1.6 }] },
        { weight: 2, hits: [
          { pose: 'slashR', wind: 0.4, active: 0.08, recover: 0.12, dmg: 6, posture: 5, range: 1.5, arc: 100, lunge: 0.8 },
          { pose: 'slashL', wind: 0.22, active: 0.08, recover: 0.55, dmg: 6, posture: 5, range: 1.5, arc: 100, lunge: 0.8 },
        ] },
      ],
    },
    // Skitters and pounces. The pounce (amber) smashes through a raised shield: parry it at the last instant, or dash.
    spider: {
      name: 'Cave Spider', hp: 40, posture: 40, postureRegen: 16, speed: 3.9, radius: 0.6, scale: 1, rig: 'spider',
      flinch: false, approach: 3.2, cooldown: [1.1, 1.9], xp: 14, gold: 9,
      attacks: [
        { weight: 2, hits: [{ pose: 'bite', wind: 0.5, active: 0.1, recover: 0.45, dmg: 10, posture: 10, range: 1.9, arc: 90, lunge: 0.8 }] },
        { weight: 3, hits: [{ pose: 'pounce', wind: 0.8, active: 0.3, recover: 0.75, dmg: 18, posture: 20, range: 2.2, arc: 120, lunge: 5.5, leap: true, parryOnly: true }] },
      ],
    },
    // Feints: the first glint may be a fake, the real blow comes fast after it
    duelist: {
      name: 'Hollow Duelist', hp: 62, posture: 60, postureRegen: 18, speed: 3.0, radius: 0.45, scale: 1.02,
      flinch: false, approach: 2.0, cooldown: [0.9, 1.6], xp: 20, gold: 14,
      attacks: [
        { weight: 2, hits: [{ pose: 'thrust', wind: 0.5, active: 0.1, recover: 0.55, dmg: 14, posture: 14, range: 2.6, arc: 50, lunge: 1.6 }] },
        { weight: 3, hits: [
          { pose: 'overhead', wind: 0.6, active: 0.05, recover: 0.28, feint: true, dmg: 0, posture: 0, range: 2.2, arc: 70, lunge: 0.3 },
          { pose: 'slashR', wind: 0.3, active: 0.1, recover: 0.65, dmg: 16, posture: 16, range: 2.3, arc: 110, lunge: 1.3 },
        ] },
        { weight: 2, hits: [
          { pose: 'slashR', wind: 0.45, active: 0.1, recover: 0.15, dmg: 11, posture: 10, range: 2.2, arc: 100, lunge: 0.9 },
          { pose: 'slashL', wind: 0.28, active: 0.1, recover: 0.5, dmg: 11, posture: 10, range: 2.2, arc: 100, lunge: 0.9 },
          { pose: 'thrust', wind: 0.75, active: 0.1, recover: 0.7, dmg: 16, posture: 16, range: 2.6, arc: 50, lunge: 1.8 },
        ] },
      ],
    },
  },
  maxAttackers: 2,
  // Difficulty (Settings): damage the hero takes, enemy health, how long enemies wait between attacks, extra enemies
  // allowed to attack at once, and a change to the parry window
  difficulty: {
    story: { name: 'Story', dmg: 0.5, hp: 0.75, cooldown: 1.4, attackers: 0, parry: 0.08, desc: 'Half the damage, softer foes, a generous parry window' },
    normal: { name: 'Normal', dmg: 1, hp: 1, cooldown: 1, attackers: 0, parry: 0, desc: 'As intended' },
    hard: { name: 'Hard', dmg: 1.35, hp: 1.2, cooldown: 0.8, attackers: 1, parry: -0.03, desc: 'Harder hits, tougher foes, three may attack at once, a tight parry window' },
  },               // enemies that may be winding up or swinging at the same time
  // Each stage is one winding dungeon heading north: a run of open sections in its own theme, joined by passages
  // (no gates), ending in the guardian's lair (its first enemy is the guardian). After the last stage the stages
  // repeat with tougher enemies. size: [half width, half depth] in metres (times sectionScale); waves: the groups
  // that wake in turn when you walk into the section.
  stages: [
    { name: 'The Crypt', theme: 'crypt', guardian: 'The Bone Warden', champion: { kind: 'knight', name: 'The Hollow Sentinel', mods: ['armored'] }, rooms: [
      { size: [7, 6], waves: [['skeleton']] },
      { size: [8, 7], waves: [['skeleton', 'archer']] },
      { size: [9, 7], pillars: true, waves: [['skeleton', 'skeleton'], ['skeleton', 'archer']] },
      { size: [8, 6], waves: [['skeleton', 'skeleton', 'archer']] },
      { size: [9, 8], guardian: true, waves: [['skeleton', 'skeleton']] },
    ] },
    { name: 'The Iron Keep', theme: 'keep', guardian: 'Sir Aldric the Hollow', champion: { kind: 'brute', name: 'The Gaoler', mods: ['armored', 'vampiric'] }, rooms: [
      { size: [8, 7], waves: [['knight']] },
      { size: [9, 7], waves: [['knight', 'archer']] },
      { size: [9, 8], pillars: true, waves: [['knight', 'skeleton'], ['knight', 'archer', 'archer']] },
      { size: [8, 7], waves: [['knight', 'knight'], ['skeleton', 'archer']] },
      { size: [10, 8], guardian: true, waves: [['knight']] },
    ] },
    { name: 'The Ogre Den', theme: 'den', guardian: 'The Den Mother', champion: { kind: 'brute', name: 'Gorehide', mods: ['swift'] }, rooms: [
      { size: [9, 8], waves: [['goblin', 'goblin', 'goblin']] },
      { size: [10, 8], pillars: true, waves: [['brute', 'goblin', 'goblin']] },
      { size: [10, 9], waves: [['goblin', 'goblin', 'goblin', 'goblin'], ['brute', 'archer']] },
      { size: [9, 7], pillars: true, waves: [['brute', 'brute']] },
      { size: [11, 9], guardian: true, waves: [['brute', 'goblin']] },
    ] },
    { name: 'The Spider Depths', theme: 'depths', guardian: 'The Brood Queen', champion: { kind: 'spider', name: 'The Widow', mods: ['vampiric', 'swift'], hp: 3.2 }, rooms: [
      { size: [9, 8], waves: [['spider']] },
      { size: [10, 8], pillars: true, waves: [['spider', 'spider']] },
      { size: [10, 9], waves: [['spider', 'goblin', 'goblin'], ['spider', 'spider']] },
      { size: [9, 8], pillars: true, waves: [['spider', 'spider', 'archer']] },
      { size: [11, 9], guardian: true, waves: [['spider']] },
    ] },
    { name: 'The Shadow Court', theme: 'court', guardian: 'The Pale Duelist', champion: { kind: 'duelist', name: 'The Black Herald', mods: ['warded', 'swift'], hp: 2.6 }, rooms: [
      { size: [9, 8], waves: [['duelist']] },
      { size: [10, 8], pillars: true, waves: [['duelist', 'archer']] },
      { size: [10, 9], waves: [['duelist', 'knight'], ['duelist', 'duelist']] },
      { size: [9, 8], pillars: true, waves: [['duelist', 'spider', 'archer']] },
      { size: [11, 9], guardian: true, waves: [['duelist']] },
    ] },
    // ---- Act II ----
    { name: 'The Sunken Temple', theme: 'temple', guardian: 'The Drowned Prophet', champion: { kind: 'caster', name: 'The Tidecaller', mods: ['warded'], hp: 3 }, rooms: [
      { size: [9, 8], waves: [['caster', 'skeleton']] },
      { size: [10, 8], pillars: true, waves: [['caster', 'caster', 'skeleton']] },
      { size: [10, 9], waves: [['spider', 'caster'], ['skeleton', 'skeleton', 'caster']] },
      { size: [9, 8], pillars: true, waves: [['caster', 'duelist', 'caster']] },
      { size: [11, 9], guardian: true, waves: [['caster']] },
    ] },
    { name: 'The Frost Halls', theme: 'frost', guardian: 'The Frost Marshal', champion: { kind: 'bearer', name: 'The Ice Bulwark', mods: ['armored'] }, rooms: [
      { size: [9, 8], waves: [['bearer', 'knight']] },
      { size: [10, 8], pillars: true, waves: [['bearer', 'archer', 'archer']] },
      { size: [10, 9], waves: [['knight', 'knight', 'bearer'], ['archer', 'caster']] },
      { size: [9, 8], pillars: true, waves: [['bearer', 'duelist', 'knight']] },
      { size: [11, 9], guardian: true, waves: [['bearer']] },
    ] },
    { name: 'The Ashen Forge', theme: 'forge', guardian: 'The Furnace Lord', champion: { kind: 'brute', name: 'The Slagborn', mods: ['explosive', 'armored'] }, rooms: [
      { size: [10, 8], waves: [['goblin', 'goblin', 'bearer']] },
      { size: [10, 9], pillars: true, waves: [['brute', 'goblin', 'goblin']] },
      { size: [11, 9], waves: [['brute', 'bearer'], ['goblin', 'goblin', 'goblin', 'caster']] },
      { size: [10, 8], pillars: true, waves: [['brute', 'brute', 'bearer']] },
      { size: [12, 10], guardian: true, waves: [['brute', 'goblin']] },
    ] },
    { name: 'The Bone Orchard', theme: 'orchard', guardian: 'The Bone Gardener', champion: { kind: 'necro', name: 'The Gravetender', mods: ['vampiric'], hp: 2.5 }, rooms: [
      { size: [9, 8], waves: [['necro', 'skeleton']] },
      { size: [10, 8], pillars: true, waves: [['necro', 'archer', 'skeleton']] },
      { size: [10, 9], waves: [['necro', 'knight'], ['skeleton', 'skeleton', 'necro']] },
      { size: [9, 8], pillars: true, waves: [['necro', 'spider', 'archer']] },
      { size: [11, 9], guardian: true, waves: [['necro']] },
    ] },
    { name: 'The Throne of the Deep', theme: 'throne', guardian: 'The Hollow King', champion: { kind: 'duelist', name: "The King's Hand", mods: ['swift', 'warded'], hp: 3 }, rooms: [
      { size: [10, 8], waves: [['duelist', 'bearer']] },
      { size: [10, 9], pillars: true, waves: [['knight', 'caster', 'necro']] },
      { size: [11, 9], waves: [['brute', 'bearer', 'caster'], ['duelist', 'duelist', 'spider']] },
      { size: [10, 8], pillars: true, waves: [['necro', 'bearer', 'duelist']] },
      { size: [12, 10], guardian: true, waves: [['knight']] },
    ] },
  ],

  // Guardians: the first enemy of each stage's last room, grown into a boss. scale: size on top of its kind; hp / posture:
  // multipliers on top of guardianMult; reach: hit range multiplier; attacks: replace the kind's moves.
  // Each phase starts when health drops to `at`: the boss roars (untouchable, a shockwave throws you back), then takes
  // the phase's changes: summon (adds that crumble when it falls), def (overrides), attacks, faster (wind-ups x), stance, enrage.
  bosses: [
    { name: 'The Bone Warden', scale: 1.4, hp: 4.5, posture: 2.8, reach: 1.25,
      add: [{ weight: 2, hits: [{ pose: 'heavy', wind: 1.1, active: 0.14, recover: 0.9, dmg: 24, posture: 0, range: 2.6, arc: 360, aoe: { fwd: 1.6, r: 2.2 }, unblockable: true, lunge: 0.8 }] }],
      phases: [
        { at: 0.65, shout: 'RISE, MY DEAD', summon: ['skeleton', 'skeleton'] },
        { at: 0.3, shout: 'THE CRYPT ANSWERS', summon: ['archer', 'skeleton'], faster: 0.85, def: { cooldown: [0.6, 1.2], speed: 3.2 } },
      ] },
    { name: 'Sir Aldric the Hollow', scale: 1.2, hp: 4.2, posture: 2.6, reach: 1.15,
      phases: [
        { at: 0.5, shout: 'THE SHIELD FALLS', stance: 'twoHanded',
          def: { guard: false, flinch: false, hyperArmor: true, speed: 3.1, cooldown: [0.7, 1.3] },
          attacks: [
            { weight: 3, hits: [
              { pose: 'slashR', wind: 0.6, active: 0.12, recover: 0.16, dmg: 18, posture: 22, blockMult: 1.5, range: 2.7, arc: 130, lunge: 1.2 },
              { pose: 'slashL', wind: 0.4, active: 0.12, recover: 0.75, dmg: 18, posture: 22, blockMult: 1.5, range: 2.7, arc: 130, lunge: 1.2 },
            ] },
            { weight: 2, hits: [{ pose: 'overhead', wind: 0.9, active: 0.12, recover: 0.8, dmg: 30, posture: 34, blockMult: 2, range: 2.6, arc: 70, lunge: 1.6 }] },
            { weight: 2, hits: [{ pose: 'heavy', wind: 1.0, active: 0.2, recover: 1.0, dmg: 28, posture: 0, range: 2.8, arc: 360, aoe: { fwd: 0, r: 2.8 }, unblockable: true, lunge: 0.4 }] },
          ] },
      ] },
    { name: 'The Den Mother', scale: 1.15, hp: 3.4, posture: 2.6, reach: 1.1,
      phases: [
        { at: 0.65, shout: 'THE PACK COMES', summon: ['goblin', 'goblin', 'goblin'] },
        { at: 0.3, shout: 'THE DEN MOTHER RAGES', enrage: true, faster: 0.75, def: { speed: 3.3, cooldown: [0.5, 1.0] },
          add: [{ weight: 2, hits: [{ pose: 'slashR', wind: 0.9, active: 0.3, recover: 0.9, dmg: 26, posture: 0, range: 2.6, arc: 120, unblockable: true, lunge: 6.5 }] }] },
      ] },
    { name: 'The Brood Queen', scale: 1.75, hp: 6.5, posture: 3.0, reach: 1.35,
      phases: [
        { at: 0.66, shout: 'THE BROOD HATCHES', summon: ['spider', 'spider'] },
        { at: 0.33, shout: 'THE QUEEN SHRIEKS', summon: ['spider', 'spider'], faster: 0.85,
          add: [{ weight: 3, hits: [
            { pose: 'pounce', wind: 0.75, active: 0.3, recover: 0.2, dmg: 18, posture: 20, range: 2.2, arc: 120, lunge: 5.5, leap: true, parryOnly: true },
            { pose: 'pounce', wind: 0.45, active: 0.3, recover: 0.8, dmg: 18, posture: 20, range: 2.2, arc: 120, lunge: 5.5, leap: true, parryOnly: true },
          ] }] },
      ] },
    { name: 'The Pale Duelist', scale: 1.12, hp: 6.0, posture: 2.8, reach: 1.1,
      phases: [
        { at: 0.6, shout: 'NOW YOU SEE ME', faster: 0.9,
          add: [{ weight: 3, hits: [{ pose: 'thrust', wind: 0.55, active: 0.1, recover: 0.6, dmg: 18, posture: 18, range: 2.6, arc: 60, lunge: 1.4, blink: true }] }] },
        { at: 0.3, shout: 'SHADOWS, TO ME', summon: ['duelist', 'duelist'], faster: 0.85, def: { cooldown: [0.6, 1.1] } },
      ] },
    // ---- Act II ----
    { name: 'The Drowned Prophet', scale: 1.45, hp: 7, posture: 3, reach: 1.0,
      add: [{ weight: 2, hits: [{ pose: 'shoot', wind: 0.75, active: 0.08, recover: 0.12, dmg: 16, posture: 12, range: 14, arc: 30, lunge: 0, projectile: { speed: 9, orb: 0x4ae8d0, reflect: true } }, { pose: 'shoot', wind: 0.3, active: 0.08, recover: 0.12, dmg: 16, posture: 12, range: 14, arc: 30, lunge: 0, projectile: { speed: 9, orb: 0x4ae8d0, reflect: true } }, { pose: 'shoot', wind: 0.3, active: 0.08, recover: 0.9, dmg: 16, posture: 12, range: 14, arc: 30, lunge: 0, projectile: { speed: 9, orb: 0x4ae8d0, reflect: true } }] }],
      phases: [
        { at: 0.66, shout: 'THE TIDE RISES', summon: ['caster', 'caster'] },
        { at: 0.33, shout: 'DROWN WITH ME', summon: ['skeleton', 'spider'], faster: 0.8, def: { cooldown: [1.0, 1.6] } },
      ] },
    { name: 'The Frost Marshal', scale: 1.25, hp: 5, posture: 2.6, reach: 1.1,
      phases: [
        { at: 0.6, shout: 'HOLD THE LINE', summon: ['bearer', 'knight'] },
        { at: 0.3, shout: 'THE MARSHAL ADVANCES', stance: 'twoHanded', def: { guard: false, hyperArmor: true, speed: 3.0, cooldown: [0.7, 1.2] },
          attacks: [
            { weight: 3, hits: [
              { pose: 'slashR', wind: 0.6, active: 0.12, recover: 0.16, dmg: 22, posture: 24, blockMult: 1.5, range: 2.7, arc: 130, lunge: 1.2 },
              { pose: 'slashL', wind: 0.4, active: 0.12, recover: 0.8, dmg: 22, posture: 24, blockMult: 1.5, range: 2.7, arc: 130, lunge: 1.2 },
            ] },
            { weight: 2, hits: [{ pose: 'heavy', wind: 1.0, active: 0.2, recover: 1.0, dmg: 32, posture: 0, range: 2.8, arc: 360, aoe: { fwd: 0, r: 3.0 }, unblockable: true, lunge: 0.4 }] },
          ] },
      ] },
    { name: 'The Furnace Lord', scale: 1.35, hp: 5.5, posture: 2.6, reach: 1.15,
      add: [{ weight: 2, hits: [{ pose: 'heavy', wind: 1.15, active: 0.16, recover: 1.0, dmg: 36, posture: 0, range: 3, arc: 360, aoe: { fwd: 1.6, r: 3.2 }, unblockable: true, lunge: 0.6 }] }],
      phases: [
        { at: 0.65, shout: 'STOKE THE FIRES', summon: ['goblin', 'goblin', 'goblin'] },
        { at: 0.3, shout: 'THE FURNACE ROARS', enrage: true, faster: 0.75, def: { speed: 3.4, cooldown: [0.5, 1.0] }, summon: ['bearer'] },
      ] },
    { name: 'The Bone Gardener', scale: 1.45, hp: 5.5, posture: 3, reach: 1.0,
      phases: [
        { at: 0.66, shout: 'THE ORCHARD WAKES', summon: ['skeleton', 'archer', 'skeleton'] },
        { at: 0.33, shout: 'REAP', summon: ['knight', 'knight'], faster: 0.8, def: { cooldown: [1.2, 1.8], raiseMax: 6 } },
      ] },
    { name: 'The Hollow King', scale: 1.35, hp: 9, posture: 3, reach: 1.15,
      phases: [
        { at: 0.7, shout: 'KNEEL', stance: 'twoHanded', def: { guard: false, hyperArmor: true, speed: 3.1, cooldown: [0.7, 1.3] },
          attacks: [
            { weight: 3, hits: [
              { pose: 'slashR', wind: 0.55, active: 0.12, recover: 0.14, dmg: 24, posture: 24, blockMult: 1.5, range: 2.8, arc: 140, lunge: 1.3 },
              { pose: 'slashL', wind: 0.35, active: 0.12, recover: 0.7, dmg: 24, posture: 24, blockMult: 1.5, range: 2.8, arc: 140, lunge: 1.3 },
            ] },
            { weight: 2, hits: [{ pose: 'overhead', wind: 0.8, active: 0.12, recover: 0.8, dmg: 36, posture: 36, blockMult: 2, range: 2.7, arc: 70, lunge: 1.6, parryOnly: true }] },
            { weight: 2, hits: [{ pose: 'heavy', wind: 1.0, active: 0.2, recover: 1.0, dmg: 34, posture: 0, range: 2.9, arc: 360, aoe: { fwd: 0, r: 3.0 }, unblockable: true, lunge: 0.4 }] },
          ] },
        { at: 0.4, shout: 'THE CROWN COMMANDS', summon: ['duelist', 'caster'],
          add: [{ weight: 2, hits: [{ pose: 'thrust', wind: 0.55, active: 0.1, recover: 0.6, dmg: 26, posture: 22, range: 2.7, arc: 60, lunge: 1.4, blink: true }] }] },
        { at: 0.15, shout: 'I AM THE DEEP', enrage: true, faster: 0.8, def: { speed: 3.6, cooldown: [0.4, 0.9] } },
      ] },
  ],
  addMult: 0.6,                  // summoned adds are this strong relative to the room's normal enemies

  // stone / wall: base RGB of floor slabs and bricks; torch: flame and light colour; fog: background and fog colour
  themes: {
    crypt: { stone: [58, 60, 70], wall: [46, 48, 58], torch: 0x8fd8ff, fog: 0x06070c, hemi: 0x6a7aa0, decor: 'bones' },
    keep: { stone: [70, 62, 54], wall: [62, 54, 46], torch: 0xffa040, fog: 0x0a0705, hemi: 0x9a8a70, decor: 'crates' },
    den: { stone: [70, 50, 42], wall: [58, 40, 34], torch: 0xff6a2a, fog: 0x0c0504, hemi: 0xa07060, decor: 'rocks' },
    camp: { stone: [60, 52, 40], wall: [60, 52, 40], torch: 0xff8a3a, fog: 0x0b1224, hemi: 0x8098c8, decor: '' },
    depths: { stone: [42, 44, 58], wall: [34, 36, 52], torch: 0xa07aff, fog: 0x05040a, hemi: 0x6a60a0, decor: 'webs' },
    court: { stone: [72, 68, 76], wall: [42, 38, 48], torch: 0xe8e0ff, fog: 0x07060c, hemi: 0x9090b0, decor: 'court' },
    temple: { stone: [40, 66, 64], wall: [34, 56, 56], torch: 0x5affd0, fog: 0x03080a, hemi: 0x5a9a9a, decor: 'water' },
    frost: { stone: [86, 96, 110], wall: [70, 82, 98], torch: 0xbfe8ff, fog: 0x0a0e14, hemi: 0xa0b8d8, decor: 'ice' },
    forge: { stone: [52, 40, 36], wall: [44, 32, 28], torch: 0xff5a1a, fog: 0x0e0503, hemi: 0xc06a40, decor: 'forge' },
    orchard: { stone: [62, 58, 50], wall: [52, 48, 42], torch: 0xd8ff9a, fog: 0x080806, hemi: 0x9aa080, decor: 'orchard' },
    throne: { stone: [30, 26, 34], wall: [24, 20, 28], torch: 0xffc040, fog: 0x050307, hemi: 0x8a7aa0, decor: 'court' },
  },
  guardianMult: 1.7,             // guardian health and damage multiplier
  loopScale: 0.3,                // +30% enemy health and damage each time the stages repeat
  stageScale: 0.22,              // +22% enemy health and damage for each stage further down (tuned with tools/balance.js)
  stageHp: 0.18,                 // and a further +18% health per stage, as the hero's gear outgrows them
  roomHeal: 0.35,                // share of max health restored when a room is cleared
  sectionScale: 1.3,             // every section is built this much larger than its size above
  // What else fills a stage: side rooms off the path, traps in the passages, a shrine, breakable pots and crates
  features: {
    sideRooms: 2,                  // per stage, off middle sections; each is an elite's den or a trapped vault
    sideSize: [4.6, 4.2],          // half width, half depth
    eliteMult: 1.9,                // the den's guard: this much tougher than its kind
    vaultGold: [50, 110],          // the vault chest's gold (times the stage's depth bonus)
    traps: 2,                      // passages with a trap per stage
    spikes: { dmg: 16, idle: 1.7, warn: 0.6, up: 0.6 },     // a plate across the passage: the spikes peek out, then strike
    blade: { dmg: 22, period: 2.4 },                         // a blade swinging across the passage
    breakables: [3, 6],            // pots and crates per section
    potGold: [3, 9], potGoldChance: 0.55, potFlask: 0.08,
  },
  // Elites: an enemy with a modifier, an aura of its colour and its name over its health bar.
  // chance: per stage (index), plus loopBonus each time the stages repeat. Den guards always get one (two when deeper).
  elites: {
    chance: [0.06, 0.09, 0.12, 0.15, 0.18], loopBonus: 0.08, reward: 2,
    mods: {
      armored: { name: 'Armored', color: 0xb8c4d0, hp: 1.4, posture: 1.4, desc: 'Light hits do 40% less; heavy attacks go through' },
      swift: { name: 'Swift', color: 0x6ae8ff, hp: 1.0, speed: 1.4, wind: 0.8, cooldown: 0.7, desc: 'Moves and winds up faster' },
      vampiric: { name: 'Vampiric', color: 0xd01a3a, hp: 1.25, leech: 0.6, desc: 'Heals when it hurts you' },
      explosive: { name: 'Volatile', color: 0xff7a20, hp: 1.0, blast: { r: 3, dmg: 24, fuse: 1.3 }, desc: 'Bursts after it falls: get clear' },
      warded: { name: 'Warded', color: 0xa070ff, hp: 1.0, ward: 4, wardBack: 7, desc: 'A ward soaks hits (heavies break it faster) and returns' },
    },
  },
  championMult: 2.6,
  // The Endless Deep (after the fifth guardian): floors get perFloor tougher; a guardian every lairEvery floors
  endless: { perFloor: 0.18, lairEvery: 3, sections: [3], bigFrom: 4, mixFrom: 4, maxWave: 6 },            // the mid-stage champion: this much tougher (on top of its modifiers), and bigger
  // The Rim: the open field outside the south gate. Zones hold their own beasts (cap alive at once, respawn seconds
  // after one falls); mult is how tough they are. The far ridge is the dangerous end.
  field: {
    name: 'The Rim', side: 'south',
    size: [60, 100], gap: 5,       // half width and depth of the field; the road from the camp's south gate is gap long
    zones: [
      { id: 'meadow', name: 'The Meadow', x: 0, z: 30, r: 16, mobs: ['wolf', 'wolf', 'boar'], nightMobs: ['wolf', 'wolf', 'wolf', 'boar'], cap: 5, nightCap: 6, respawn: 25, mult: 1 },
      { id: 'wood', name: 'Thornwood', x: 36, z: 52, r: 18, mobs: ['scout', 'scout', 'wolf', 'spider'], cap: 5, respawn: 30, mult: 1.3 },
      { id: 'graves', name: 'Old Graveyard', x: -36, z: 50, r: 15, mobs: ['skeleton', 'skeleton', 'archer'], cap: 5, respawn: 30, mult: 1.4, night: true },   // the dead rise only at night
      { id: 'ridge', name: 'The Broken Ridge', x: 0, z: 88, r: 18, mobs: ['boar', 'wolf', 'scout', 'brute'], cap: 6, respawn: 40, mult: 1.9 },
    ],
    nodes: { herb: 12, ore: 8, regrow: 150 },   // herb patches and ore veins to gather; each grows back after regrow seconds
    // Field bosses: each keeps to its zone at its time of day, comes back respawn seconds (real time) after it falls
    bosses: [
      { id: 'oldtusk', name: 'Old Tusk', type: 'boar', zone: 'meadow', when: 'day', mods: ['armored'], hp: 6, scale: 1.7, respawn: 300, drops: { tusk: 4, pelt: 3 } },
      { id: 'ridgehorror', name: 'The Ridge Horror', type: 'mutant', boss: 'horror', zone: 'ridge', when: 'day', respawn: 420, drops: { bone: 4, ore: 4, tusk: 2 } },
      { id: 'colossus', name: 'The Forge Colossus', type: 'golem', boss: 'golem', zone: 'ridge', when: 'night', respawn: 420, drops: { ore: 8 } },
      { id: 'mossback', name: 'Mossback', type: 'troll', boss: 'troll', zone: 'wood', when: 'any', respawn: 360, drops: { pelt: 4, herb: 4, tusk: 2 } },
      { id: 'graveknight', name: 'The Grave Knight', type: 'knight', zone: 'graves', when: 'night', mods: ['vampiric'], hp: 6, scale: 1.35, respawn: 300, drops: { bone: 5, ore: 2 } },
    ],
    leash: 14,                     // a beast chases this far past its zone, then gives up and goes home
    deathGoldLoss: 0.1,            // falling on the Rim costs this share of the gold carried (less than below)
  },
  // The warden's looks: chosen after the opening story, changed any time from the gear screen
  appearance: {
    skins: [0xe2a982, 0xf1c9a0, 0xc88b63, 0xa86a40, 0x7a4a2a, 0x5a3a22],
    hairs: [0x3b2416, 0x1a1210, 0x6a4a2a, 0xa0703a, 0xd8b060, 0x8a2a1a, 0x9a9a9a, 0xe8e0d0],
    styles: [['short', 'Short'], ['long', 'Long'], ['tail', 'Tail'], ['shaved', 'Shaved']],
    beards: [['none', 'None'], ['short', 'Short beard'], ['long', 'Long beard']],
  },
  // Captain Rook's task: the raiders carry the Den Mother's mark. Steps: 1 find their trail by the Broken Ridge,
  // 2 tell Rook, 3 burn their war camp on the Rim (slay its chief, burn its totems), 4 report back, 5 done. Offered once
  // a raid has been beaten. Afterwards raids come half as often. Places are on the Rim (z from its near edge).
  rookQuest: {
    tracks: { x: -22, z: 82 },
    camp: { id: 'warcamp', name: 'The War Camp', x: -47, z: 84, r: 12, mobs: ['goblin', 'goblin', 'scout', 'goblin', 'brute'], cap: 7, respawn: 35, mult: 1.8 },
    chief: { id: 'gragnak', name: 'Gragnak, Hand of the Den Mother', type: 'brute', zone: 'warcamp', when: 'any', mods: ['armored', 'vampiric'], hp: 8, scale: 1.55, respawn: 1e9, drops: { ore: 4, tusk: 3 } },
    totems: 3, gold: 600, raidCut: 0.5,
    goals: ['', 'Find the raiders\' trail near the Broken Ridge', 'Tell Captain Rook what you found', 'Burn the war camp: slay Gragnak and burn its totems', 'Return to Captain Rook', ''],
  },
  // The Fen: a second field through the east gate, opened when the first five guardians have fallen (the end of Act I).
  // Black water, reeds, a drowned chapel and an old quarry; tougher than the Rim. Zones are placed by out (metres out
  // from the field's near edge) and side (metres along the wall from the gate, north negative).
  fen: {
    name: 'The Fen', side: 'east', unlock: 5, gateZ: -7, size: [-63, 20, 80], gap: 5,    // size: lateral from, to (z), depth (x); the Rim starts past z 23
    zones: [
      { id: 'reeds', name: 'The Reedbank', out: 20, side: 8, r: 14, mobs: ['goblin', 'goblin', 'scout', 'spider'], cap: 6, respawn: 25, mult: 1.7 },
      { id: 'mire', name: 'The Black Mire', out: 42, side: -26, r: 16, mobs: ['spider', 'spider', 'goblin', 'scout'], nightMobs: ['spider', 'spider', 'spider', 'wolf'], cap: 5, nightCap: 6, respawn: 30, mult: 2.0 },
      { id: 'hollow', name: 'The Drowned Hollow', out: 50, side: 12, r: 14, mobs: ['skeleton', 'archer', 'skeleton', 'necro'], cap: 6, respawn: 30, mult: 2.1, night: true },
      { id: 'quarry', name: 'The Old Quarry', out: 66, side: -12, r: 16, mobs: ['brute', 'goblin', 'scout', 'bearer'], cap: 6, respawn: 40, mult: 2.4 },
    ],
    nodes: { herb: 10, ore: 10, regrow: 150 },
    bosses: [
      { id: 'mirequeen', name: 'The Mire Queen', type: 'spider', zone: 'mire', when: 'day', mods: ['swift', 'vampiric'], hp: 7, scale: 2.0, respawn: 360, drops: { silk: 6, herb: 3 } },
      { id: 'mirelord', name: 'The Mirelord', type: 'troll', boss: 'mirelord', zone: 'mire', when: 'night', respawn: 420, drops: { silk: 4, pelt: 4, ore: 3 } },
      { id: 'bishop', name: 'The Drowned Bishop', type: 'necro', zone: 'hollow', when: 'night', mods: ['warded'], hp: 6, scale: 1.4, respawn: 300, drops: { bone: 6, silk: 2 } },
      { id: 'foreman', name: 'The Quarry Foreman', type: 'brute', zone: 'quarry', when: 'any', mods: ['armored'], hp: 6, scale: 1.4, respawn: 360, drops: { ore: 6, tusk: 2 } },
    ],
  },
  // The day in the Hold and on the Rim: length seconds from dawn to dawn (the dungeon below keeps no time). Day and
  // night colours for the sky and fog, the light, the sun or moon, and how far the fog lets you see.
  day: {
    length: 600, start: 0.08,
    sky: { day: 0x8aa2bc, dusk: 0xb07858, night: 0x0b1224 }, hemi: { day: [0xd8e4ff, 1.0], night: [0x8098c8, 0.55] },
    sun: { day: [0xfff0d8, 1.05], dusk: [0xffa060, 0.7], night: [0xaab8e0, 0.5] }, fog: { day: [30, 85], night: [18, 38] },
  },
  // Materials: dropped by beasts (and the dead below, less often) and gathered on the Rim; Bram crafts with them and
  // Ysolde brews tonics from herbs
  materials: {
    pelt: { name: 'Pelt', icon: '🐾' }, tusk: { name: 'Tusk', icon: '🦷' }, bone: { name: 'Bone', icon: '🦴' },
    ore: { name: 'Iron ore', icon: '⛏' }, herb: { name: 'Herbs', icon: '🌿' }, silk: { name: 'Silk', icon: '🕸' },
  },
  matDrops: {                      // chance per kill on the Rim; below, a third of it
    wolf: [['pelt', 0.6]], boar: [['tusk', 0.5], ['pelt', 0.35]], scout: [['ore', 0.35]], spider: [['silk', 0.45], ['herb', 0.2]],
    skeleton: [['bone', 0.5]], archer: [['bone', 0.4]], brute: [['ore', 0.5], ['tusk', 0.2]], goblin: [['ore', 0.2]], necro: [['bone', 0.6]],
  },
  // Bram's hunter work: gear made from materials (tier of the warden's depth, at least rare), and tempering with ore
  crafts: [
    { id: 'wolfwraps', name: 'Wolfhide Wraps', slot: 'gloves', wc: 0, rarity: 1, aff: ['crit'], need: { pelt: 4 }, gold: 40 },
    { id: 'tuskfists', name: 'Tuskbreaker Gauntlets', slot: 'gloves', wc: 2, rarity: 2, aff: ['posture', 'hp'], need: { tusk: 3, ore: 2 }, gold: 80 },
    { id: 'hunterboots', name: "Hunter's Boots", slot: 'boots', wc: 0, rarity: 1, aff: ['regen'], need: { pelt: 3, ore: 1 }, gold: 50 },
    { id: 'bonecharm', name: 'Bone Charm', slot: 'trinket', rarity: 2, aff: ['hp', 'lifesteal'], need: { bone: 6 }, gold: 60 },
    { id: 'packring', name: 'Ring of the Pack', slot: 'ring', rarity: 2, aff: ['crit', 'stamina'], need: { pelt: 3, tusk: 2, bone: 2 }, gold: 90 },
    { id: 'fenjerkin', name: 'Fensilk Jerkin', slot: 'armor', wc: 0, rarity: 2, aff: ['hp', 'regen'], need: { silk: 5, herb: 2 }, gold: 110 },
    { id: 'mireboots', name: 'Mirewalker Boots', slot: 'boots', wc: 0, rarity: 2, aff: ['stamina', 'parry'], need: { silk: 3, pelt: 2 }, gold: 90 },
    { id: 'tuskmail', name: 'Tusk-plated Hauberk', slot: 'armor', wc: 1, rarity: 2, aff: ['hp', 'parry'], need: { tusk: 4, ore: 4, pelt: 2 }, gold: 120 },
  ],
  temper: { ore: 3, scrap: 2 },    // Bram tempers a worn piece one + level with ore instead of gold
  // The big monsters as bosses (Enemy.makeBoss takes these whole): grown, with phases like the guardians
  monsterBosses: {
    horror: { name: 'The Ridge Horror', scale: 1.15, hp: 3.5, posture: 1.6, reach: 1.1,
      phases: [
        { at: 0.6, shout: 'THE HORROR ROARS', faster: 0.85, def: { speed: 3.8, cooldown: [0.7, 1.3] } },
        { at: 0.3, shout: 'IT TEARS LOOSE', enrage: true, faster: 0.85, summon: ['wolf', 'wolf'] },
      ] },
    troll: { name: 'Mossback', scale: 1.15, hp: 3.5, posture: 1.6, reach: 1.1,
      phases: [
        { at: 0.6, shout: 'MOSSBACK BELLOWS', def: { regen: 0.04 }, summon: ['scout', 'scout'] },
        { at: 0.3, shout: 'HE WILL NOT FALL', enrage: true, faster: 0.8, def: { speed: 3.6 } },
      ] },
    abomination: { name: 'The Abomination', scale: 1.45, hp: 6, posture: 2, reach: 1.3,
      phases: [
        { at: 0.7, shout: 'IT CALLS ITS KIN', summon: ['troll'], faster: 0.9 },
        { at: 0.45, shout: 'THE ARENA SHAKES', summon: ['wolf', 'wolf', 'scout'], def: { speed: 3.9, cooldown: [0.6, 1.2] } },
        { at: 0.2, shout: 'IT WILL NOT DIE', enrage: true, faster: 0.75, def: { regen: 0.015 } },
      ] },
    mirelord: { name: 'The Mirelord', scale: 1.25, hp: 4.5, posture: 1.8, reach: 1.15,
      phases: [
        { at: 0.65, shout: 'THE MIRE STIRS', summon: ['spider', 'spider'], def: { regen: 0.03 } },
        { at: 0.3, shout: 'IT RISES FROM THE BOG', enrage: true, faster: 0.8, summon: ['spider', 'goblin'], def: { speed: 3.6, cooldown: [0.7, 1.3] } },
      ] },
    golem: { name: 'The Forge Colossus', scale: 1.15, hp: 3.5, posture: 1.5, reach: 1.15,
      phases: [
        { at: 0.6, shout: 'THE CORE FLARES', faster: 0.85, def: { dr: 0.35 } },
        { at: 0.3, shout: 'IT BREAKS OPEN', enrage: true, faster: 0.75, def: { dr: 0.1, speed: 3.0, cooldown: [0.8, 1.4] } },
      ] },
  },
  // Captives in the dungeon's vaults: freed, they come to live in the Hold. The named ones bring a lasting perk; every
  // rescue adds a little to the gold found (up to goldMax).
  rescues: {
    chance: 0.4, gold: 0.02, goldMax: 0.1,
    people: [
      { id: 'pell', name: 'Pell the cartographer', perk: 'Every stage is mapped from the start', look: { cloth: 0x5a5a3a, hair: 0x8a6a3a } },
      { id: 'ilsa', name: 'Ilsa the cook', perk: 'Flasks heal 10% more', look: { cloth: 0x8a5a4a, hair: 0x3a2a1a, apron: true } },
      { id: 'aldo', name: 'Brother Aldo', perk: '+5% health', look: { cloth: 0x4a4a6a, hair: 0x9a9a9a, elder: true } },
      { id: 'mira', name: 'Mira the scout', perk: 'Beasts of the Rim notice you later', look: { cloth: 0x3a5a3a, hair: 0x6a3a1a } },
    ],
    names: ['Tomas', 'Edda', 'Rolf', 'Greta', 'Hal', 'Wynn', 'Oswin', 'Bera'],
  },
  // The Ring, Varga's arena: fight again any guardian already beaten, and the big monsters once their field kin have fallen. The
  // Abomination waits for whoever has beaten all three. Rewards: gold by depth, more the first time, and a gem.
  arena: {
    gold: 70, first: 3.5,
    monsters: [
      { id: 'horror', kind: 'mutant', unlock: 'ridgehorror', theme: 'den' }, { id: 'troll', kind: 'troll', unlock: 'mossback', theme: 'orchard' },
      { id: 'golem', kind: 'golem', unlock: 'colossus', theme: 'forge' }, { id: 'mirelord', kind: 'troll', unlock: 'mirelord', theme: 'temple', fen: true },
      { id: 'abomination', kind: 'mutant', final: true, theme: 'throne' },
    ],
  },
  // A raid on the south gate: now and then, a while after the warden comes home, a band marches up the Rim road and
  // batters the gate. Beat them all for a reward; if the gate breaks, they carry off a share of the gold and run.
  raid: {
    chance: 0.22, from: 1, delay: [25, 50], gate: 100, batter: 0.7, steal: 0.08, stealMax: 400,
    bands: [                                                      // by stage reached: the band, and its chief (an elite)
      { upTo: 2, band: ['goblin', 'goblin', 'goblin', 'scout', 'wolf'], chief: 'goblin' },
      { upTo: 5, band: ['goblin', 'goblin', 'scout', 'scout', 'wolf', 'wolf', 'boar'], chief: 'scout' },
      { upTo: 99, band: ['goblin', 'goblin', 'goblin', 'scout', 'scout', 'wolf', 'wolf', 'boar'], chief: 'troll' },
    ],
    gold: 90, perStage: 0.5, mats: { pelt: 2, ore: 2 },
  },
  // Sefa's caravan: now and then she is camped in the Hold when the warden comes home, and stays for two homecomings.
  // Gear a tier above the warden's depth, bundles of materials and a gem; she buys spare materials too.
  wanderer: {
    chance: 0.3, stays: 2, from: 1, itemMult: 3,
    bundles: [{ id: 'herb', n: 4, gold: 60 }, { id: 'ore', n: 3, gold: 75 }, { id: 'pelt', n: 3, gold: 70 }, { id: 'tusk', n: 2, gold: 80 }, { id: 'bone', n: 4, gold: 60 }],
    gem: 180, buys: 6,
  },
  // Curses for the Endless Deep: chosen before a climb, each makes it harder for more gold (they add up). The Daily
  // Descent carries one, the same for everyone that day. Records are kept by the number of curses.
  curses: [
    { id: 'dry', name: 'Dry Flasks', icon: '⚗', desc: 'No healing flasks', gold: 0.35 },
    { id: 'hunted', name: 'Hunted', icon: '☠', desc: 'Every foe is an elite', gold: 0.4 },
    { id: 'frenzy', name: 'Frenzy', icon: '⚡', desc: 'Foes move 25% faster and attack more often', gold: 0.3 },
    { id: 'glass', name: 'Glass Warden', icon: '◇', desc: 'Half your health', gold: 0.35 },
    { id: 'brittle', name: 'Brittle Guard', icon: '🛡', desc: 'Blocks stop 40% less damage', gold: 0.25 },
    { id: 'dark', name: 'Lightless', icon: '☾', desc: 'The dark closes in, and no map', gold: 0.2 },
  ],
  // Shrine blessings: pray at a shrine and pick one of three; it lasts until you leave the stage
  blessings: [
    { id: 'wrath', name: 'Wrath', icon: '🔥', desc: '+20% damage' },
    { id: 'iron', name: 'Iron Skin', icon: '🛡', desc: 'Take 15% less damage' },
    { id: 'swift', name: 'Swiftness', icon: '💨', desc: 'Move 12% faster' },
    { id: 'vigor', name: 'Vigor', icon: '⚡', desc: 'Stamina comes back 40% faster' },
    { id: 'mending', name: 'Mending', icon: '✚', desc: 'Every parry heals 6% of your health' },
    { id: 'fortune', name: 'Fortune', icon: '◆', desc: '+50% gold found' },
    { id: 'thirst', name: 'Thirst', icon: '🩸', desc: '4% of the damage you deal comes back as health' },
    { id: 'steady', name: 'Steady Hand', icon: '◎', desc: 'Parry window +0.05 s' },
  ],
  tips: {
    execute: 'BROKEN! Hit HEAVY (@heavy) close by to EXECUTE it: an untouchable finishing blow.',
    skeleton: 'A WHITE glint means the attack can be blocked. Hold BLOCK (@block) - or raise it right at impact to PARRY.',
    knight: 'Shields stop light attacks. A HEAVY attack (@heavy) breaks the guard - or dash behind them.',
    archer: 'Archers keep their distance. BLOCK the arrows or DASH aside, then close in fast.',
    goblin: 'Goblins are quick but fragile. Keep moving - do not let a pack surround you.',
    spider: 'An AMBER flash is a POUNCE: it smashes through a raised shield. PARRY it at the very last instant, or DASH.',
    duelist: 'Duelists FEINT: the first glint may be a fake. Wait for the real swing before you parry.',
    brute: 'A RED glow is UNBLOCKABLE. DASH (@dodge) through it - you are invulnerable mid-dash.',
  },
  pillarR: 0.75,

  // ---------------- Party ----------------
  // Companions walk with the warden (see js/party.js): they follow, and attack, shoot or heal what is near. For now they are
  // helpers. Anyone can be hired once for gold (hire); a captive freed from the Deep (rescue) joins free.
  party: { max: 2, follow: 2.6, far: 8, leash: 18, aggro: 9, dmg: 0.5, downFor: 25 },
  companions: [
    { id: 'hobb', short: 'Hobb', name: 'Sergeant Hobb', cls: 'warrior', weapon: 'sword', hire: 150, blurb: 'Keeps the line. A sword, a shield and thirty years of bad knees.', cloth: 0x7a3a2a, look: { skin: 0xd8a07a, hair: 0x6a6a6a, hairStyle: 'short', beard: 'long' } },
    { id: 'mira', short: 'Mira', name: 'Mira the scout', cls: 'archer', weapon: 'bow', hire: 220, rescue: 'mira', blurb: 'Quick arrows from the back, and a fan of them when a foe gets close.', cloth: 0x3a5a3a, look: { skin: 0xe2b088, hair: 0x6a3a1a, hairStyle: 'tail', beard: 'none' } },
    { id: 'pell', short: 'Pell', name: 'Pell the cartographer', cls: 'mage', weapon: 'staff', hire: 260, rescue: 'pell', blurb: 'Bolts, and now and then a fireball on the biggest foe.', cloth: 0x5a5a8a, look: { skin: 0xe8c9a8, hair: 0x8a6a3a, hairStyle: 'short', beard: 'none' } },
    { id: 'aldo', short: 'Aldo', name: 'Brother Aldo', cls: 'cleric', weapon: 'scepter', hire: 220, rescue: 'aldo', blurb: 'Mends you when you are hurt; smites when you are not.', cloth: 0xc8c0a8, look: { skin: 0xd8a07a, hair: 0x9a9a9a, hairStyle: 'shaved', beard: 'long' } },
  ],

  // ---------------- Classes ----------------
  // Chosen once, when a new warden takes up the watch (S.cls). A class sets the weapons it finds, its off-hand piece and a few
  // base numbers; light and heavy attacks, the dash and stamina work the same for all. hp / st multiply base health and stamina.
  classes: {
    warrior: { name: 'Warrior', role: 'Melee · tank', desc: 'Sword and shield. Block, parry and cut down whatever comes close.', weapons: ['sword', 'axe', 'mace', 'longsword', 'greatsword', 'spear', 'daggers'], start: 'sword', offhand: 'shield', hp: 1, st: 1, melee: true },
    archer: { name: 'Archer', role: 'Ranged · damage', desc: 'A bow and a quiver. Quick arrows from afar, and a fan of arrows that all strike a close foe.', weapons: ['bow'], start: 'bow', offhand: 'quiver', hp: 0.9, st: 1.1, dash: 0.9 },
    mage: { name: 'Mage', role: 'Ranged · damage', desc: 'A staff and an orb. Arcane bolts and a fireball that burns a crowd. The hardest hitter and the frailest.', weapons: ['staff'], start: 'staff', offhand: 'orb', hp: 0.8, st: 1 },
    cleric: { name: 'Cleric', role: 'Support · healer', desc: 'A scepter and a tome. Holy bolts or, with a toggle, healing; the heavy cast is a stronger smite or an area heal. Weaker than the mage in a fight.', weapons: ['scepter'], start: 'scepter', offhand: 'tome', hp: 1, st: 1 },
  },

  // ---------------- Gear ----------------
  // Item power grows with tier (the stage depth it was found at); rarity adds a multiplier and random bonuses.
  gear: {
    slots: ['weapon', 'shield', 'armor', 'helm', 'gloves', 'boots', 'trinket', 'ring'],
    slotNames: { weapon: 'Weapon', shield: 'Shield', armor: 'Armour', helm: 'Helm', gloves: 'Gloves', boots: 'Boots', trinket: 'Trinket', ring: 'Ring' },
    // Armour, helms, gloves and boots come light, medium or heavy (it.wc). Heavier pieces give more (mult), but the
    // load they add up to makes the dash cost more and reach less, and slows the walk a little (see Items.stats).
    weightSlots: ['armor', 'helm', 'gloves', 'boots'],
    weight: { armor: [1, 2, 3.2], helm: [0.4, 0.8, 1.2], gloves: [0.2, 0.4, 0.7], boots: [0.3, 0.6, 1.0] },
    weightMult: [0.8, 1, 1.25], weightNames: ['Light', 'Medium', 'Heavy'],
    load: { light: 2.5, heavy: 4.5, dashCost: 0.08, dashDist: 0.03, move: 0.02 },   // per point of load over 'light'
    rarities: [
      { id: 'common', name: 'Common', color: '#cfc8b8', mult: 1, affixes: 0, weight: 62 },
      { id: 'rare', name: 'Rare', color: '#5aa8ff', mult: 1.12, affixes: 1, weight: 27 },
      { id: 'epic', name: 'Epic', color: '#c47cff', mult: 1.25, affixes: 2, weight: 9 },
      { id: 'legendary', name: 'Legendary', color: '#ffb040', mult: 1.4, affixes: 3, weight: 2 },
    ],
    tierNames: ['Rusted', 'Iron', 'Steel', "Knight's", 'Runed', 'Deep-forged', 'Hollow-king'],
    // dmg / posture multiply the hero's attacks; speed > 1 swings faster; range adds reach in metres
    weapons: {
      sword: { name: 'Sword', dmg: 1, posture: 1, speed: 1, range: 0, len: 0.92 },
      axe: { name: 'Axe', dmg: 1.06, posture: 1.35, speed: 0.92, range: -0.05, len: 0.8 },
      mace: { name: 'Mace', dmg: 0.92, posture: 1.65, speed: 0.94, range: -0.1, len: 0.72 },
      longsword: { name: 'Longsword', dmg: 1.12, posture: 1.05, speed: 0.88, range: 0.45, len: 1.2 },
      // Two hands: big hits and reach, but no shield. The blade blocks only part of a blow, blocking costs more
      // stamina, and the bare off side takes extra damage.
      greatsword: { name: 'Greatsword', dmg: 1.5, posture: 1.45, speed: 0.84, range: 0.55, len: 1.4, twoHanded: true, block: 0.55, guard: 1.45, exposed: 0.1 },
      // Reach: thrusts that strike from beyond most blades, then a wide sweep; carried with a shield
      spear: { name: 'Spear', dmg: 1.0, posture: 1.1, speed: 0.95, range: 0, len: 1.9, combo: 'spear' },
      // A blade in each hand: a fast five-cut combo and cheap dashes, but no shield and a weak guard
      daggers: { name: 'Twin Daggers', dmg: 1.0, posture: 0.75, speed: 1.0, range: 0, len: 0.42, dual: true, block: 0.6, guard: 1.35, dash: 0.6, combo: 'daggers' },
      // The ranged classes (see classes below). Their blows are projectiles; `range` here is unused, `ranged` is read by the fight.
      bow: { name: 'Bow', dmg: 1.0, posture: 0.8, speed: 1.0, range: 0, len: 0.5, ranged: true, cls: 'archer', combo: 'bow' },
      staff: { name: 'Staff', dmg: 1.2, posture: 0.7, speed: 0.95, range: 0, len: 1.6, ranged: true, caster: true, cls: 'mage', combo: 'staff' },
      scepter: { name: 'Scepter', dmg: 0.72, posture: 0.6, speed: 1.0, range: 0, len: 0.7, ranged: true, caster: true, cls: 'cleric', combo: 'scepter' },
    },
    // The piece carried in the off hand (gear slot 'shield'): a shield for the warrior, something else for each other class
    offhands: {
      shield: { label: 'Shield', names: ['Buckler', 'Heater', 'Kite Shield'] },
      quiver: { label: 'Quiver', names: ['Satchel', 'Quiver', 'Great Quiver'], dmg: 0.05, crit: 0.02, block: 0.4, guard: 2.0 },
      orb: { label: 'Orb', names: ['Shard', 'Orb', 'Grand Orb'], dmg: 0.05, regen: 0.04, block: 0.4, guard: 2.0 },
      tome: { label: 'Tome', names: ['Prayer Book', 'Holy Tome', 'Reliquary'], mend: 0.06, dmg: 0.02, block: 0.55, guard: 1.6 },
    },
    shields: ['Buckler', 'Heater', 'Kite Shield'],
    armors: ['Jerkin', 'Hauberk', 'Brigandine'],
    helms: ['Cap', 'Helm', 'Great Helm'],
    gloves: ['Wraps', 'Gloves', 'Gauntlets'],
    boots: ['Shoes', 'Boots', 'Sabatons'],
    trinkets: ['Amulet', 'Charm'],
    rings: ['Band', 'Signet', 'Loop'],
    // Random bonuses: [min, max] per tier step added on top
    // Named legendaries, each with an effect of its own (the fight reads S.u). They drop from guardians' chests (uniqueChance)
    // and rich chests (uniqueRich), and Tilda now and then has one (uniqueStock). Each is found once before any repeats.
    uniques: [
      { id: 'dawn', name: 'Dawnbreaker', slot: 'weapon', type: 'sword', desc: 'A parry looses a blade of light down the line' },
      { id: 'widow', name: 'Widowmaker', slot: 'weapon', type: 'daggers', desc: '+60% damage to foes below 30% health' },
      { id: 'oath', name: 'Grave Oath', slot: 'weapon', type: 'greatsword', desc: 'Every kill heals 5% of your health' },
      { id: 'sky', name: 'Skypiercer', slot: 'weapon', type: 'spear', desc: 'The heavy thrust reaches 2 m further and pierces every foe in line' },
      { id: 'ember', name: 'Emberwake Mail', slot: 'armor', desc: 'Dashing leaves burning ground behind you' },
      { id: 'thorns', name: 'Crown of Thorns', slot: 'helm', desc: 'Blocked blows hurt the attacker for half their damage' },
      { id: 'aegis', name: 'Aegis of the Pale', slot: 'shield', desc: 'Parries give back 25 stamina; parry window +0.04 s' },
      { id: 'coin', name: "Gambler's Coin", slot: 'trinket', desc: '+15% critical chance, but 10% less health' },
      { id: 'wind', name: 'Windrunner', slot: 'weapon', type: 'bow', cls: 'archer', desc: 'Arrows cost a quarter less stamina' },
      { id: 'storm', name: 'Stormcaller', slot: 'weapon', type: 'staff', cls: 'mage', desc: 'Bolts leap to a second foe for 40% damage' },
      { id: 'dawnlight', name: 'Dawnlight', slot: 'weapon', type: 'scepter', cls: 'cleric', desc: 'Healing is 30% stronger, and holy bolts mend you a little' },
      { id: 'heart', name: 'Heart of the Deep', slot: 'trinket', desc: 'One more flask, and flasks heal 15% more' },
    ],
    uniqueColor: '#ff7a2a', uniqueChance: 0.3, uniqueRich: 0.1, uniqueStock: 0.12,
    // Sockets: rare-and-better weapons, armour and helms roll them (by rarity); Bram adds more, up to maxSockets
    sockets: { slots: ['weapon', 'armor', 'helm'], byRarity: [[0, 0], [0, 1], [1, 2], [2, 2]], max: 2, addCost: { gold: 120, scrap: 6 } },
    gems: {
      ruby: { name: 'Ruby', icon: '🔴', desc: '+6% damage' },
      sapphire: { name: 'Sapphire', icon: '🔷', desc: '+10 stamina' },
      emerald: { name: 'Emerald', icon: '🟢', desc: '+15 health' },
      topaz: { name: 'Topaz', icon: '🟡', desc: '+4% critical chance' },
      onyx: { name: 'Onyx', icon: '⚫', desc: '2.5% less damage taken' },
    },
    gemDrop: { chest: 0.35, bigChest: 2, elite: 0.15, pot: 0.03 },
    affixes: {
      crit: { name: 'Critical chance', unit: '%', min: 4, max: 8, step: 0.6 },
      posture: { name: 'Posture damage', unit: '%', min: 8, max: 15, step: 1 },
      regen: { name: 'Stamina regen', unit: '%', min: 10, max: 20, step: 1.5 },
      hp: { name: 'Health', unit: '', min: 8, max: 18, step: 4 },
      stamina: { name: 'Stamina', unit: '', min: 6, max: 12, step: 2 },
      parry: { name: 'Parry window', unit: 's', min: 0.02, max: 0.04, step: 0.004 },
      lifesteal: { name: 'Life on hit', unit: '%', min: 2, max: 4, step: 0.3 },
      gold: { name: 'Gold found', unit: '%', min: 10, max: 22, step: 2 },
      // Found by the ranged classes only (see `cls`)
      power: { name: 'Arrow and spell damage', unit: '%', min: 5, max: 10, step: 0.8, only: ['weapon', 'trinket', 'ring'], cls: ['archer', 'mage', 'cleric'] },
      mend: { name: 'Healing power', unit: '%', min: 8, max: 15, step: 1.2, only: ['trinket', 'ring', 'helm', 'shield'], cls: ['cleric'] },
      // Weapons only: elements carried by every hit that lands
      fire: { name: 'Fire (burns over 2 s)', unit: '%', min: 15, max: 25, step: 1.5, only: ['weapon'] },
      frost: { name: 'Frost (slows for 2 s)', unit: '%', min: 20, max: 30, step: 1, only: ['weapon'] },
      shock: { name: 'Shock (chance to jolt)', unit: '%', min: 8, max: 14, step: 0.8, only: ['weapon'] },
    },
    // Bram rerolls one bonus of a worn piece: base cost times (tier + 1), more each time that piece is rerolled
    reroll: { gold: 45, scrap: 3, growth: 0.5 },
    maxUpgrade: [2, 4, 6, 8],   // highest +level the smith can reach at each forge level (0-3)
    upgradeStep: 0.08,          // each +level adds 8% to the item's main stats
    invSize: 24,
  },

  // ---------------- Camp ----------------
  camp: {
    // Buildings bought from the camp ledger; each level costs gold
    buildings: {
      forge: { name: 'Forge', desc: 'Bram can forge and upgrade better gear', costs: [120, 320, 700], max: 3 },
      apothecary: { name: 'Apothecary', desc: '+1 healing flask and +8% flask healing per level', costs: [100, 260, 560], max: 3 },
      yard: { name: 'Training Yard', desc: '+12 health and +8 stamina per level', costs: [90, 240, 520], max: 3 },
    },
    flasks: 3, flaskHeal: 0.4,  // healing flasks per trip and share of max health each restores
    forgeCost: [60, 110, 180, 260, 360, 480, 620],   // Bram forging a new item, by tier
    salvage: [2, 4, 8, 15],     // scrap from salvaging an item, by rarity
    deathGoldLoss: 0.5,         // share of the gold gathered on a trip that is lost if you fall
    // Ysolde the herbalist's tonics: drunk in camp, they last for the next trip below (or out on the Rim)
    tonics: [
      { id: 'stamina', name: 'Wind Tonic', icon: '💨', desc: 'Stamina comes back 30% faster', cost: 60, herbs: 2 },
      { id: 'iron', name: 'Iron Draught', icon: '🛡', desc: 'Take 10% less damage', cost: 80, herbs: 3 },
      { id: 'flask', name: 'Spare Flask', icon: '⚗', desc: 'One more healing flask', cost: 70, herbs: 3 },
      { id: 'edge', name: 'Whetstone Oil', icon: '⚔', desc: '+10% damage', cost: 90, herbs: 2, ore: 1 },
    ],
    curioMult: 4,               // Odo the curio dealer: one rare-or-better piece a day, at this many times its value
  },
  // The people of Deepward Hold: what they say when spoken to (one line at a time, in turn)
  townsfolk: {
    wanderer: ['Sefa the wanderer', [
      'Roads, warden. All the roads lead past a hole in the ground eventually.',
      'Steel from the cities south, forged by people who have never seen a ghoul. Better, somehow.',
      'I buy what the Rim gives up. Pelts sell well where it snows.',
    ]],
    bard: ['Wenna the bard', [
      'They say the Bone Warden was the first warden of this camp. He went down to hold the stair, and never came up.',
      'Sir Aldric swore to guard the Keep until the king returned. The king never did. Aldric still waits.',
      'The Den Mother was a woodwife once, before the Deep took her children. She keeps the goblins now.',
      'Spiders spin in the dark, and the Brood Queen spins the spiders. Parry the pounce, warden, never just block it.',
      'The Pale Duelist fenced for a crown he never wore. Watch his first swing; it is always a lie.',
      'Below the court the stair goes on, past drowned temples and frozen halls, to a throne no one has seen.',
      'Sing with me? No? Then go and give me something to sing about.',
    ]],
    guard: ['Captain Rook', [
      'The south gate opens on the Rim: grass, wood and the old graveyard. Beasts, mostly. Good hunting for a warden.',
      'Wolves come in threes. Do not let them circle you.',
      'A boar that lowers its head is about to charge. Get out of its line, not in front of it.',
      'Goblin bands come up the road now and then to batter my gate. When the horn sounds, warden, come running.',
      'The east gate opens on the Fen. Black water, spiders as big as dogs, and the drowned dead at night. Mind your footing.',
    ]],
    gemcutter: ['Nell the gem cutter', [
      'Bring me stones. I set them, pry them, and cut three alike into one of another kind.',
    ]],
    villager: ['Villager', [
      'Welcome back, warden!', 'Mind the fire, it spits.', 'My brother went down the stair. Find him, if you can.', 'The Hold grows every season. Thanks to you.',
      'Nell cut me a ring once. I lost it in the Rim.', 'Rook says the wolves are bold this year.',
    ]],
  },
  chest: { gold: [24, 40], itemChance: 0.35 },

  // ---------------- Growth: levels, weapon mastery, expertise ----------------
  progress: {
    xpFor: n => Math.round(60 * Math.pow(n, 1.45)),    // XP needed to go from level n to n + 1
    perLevel: { hp: 6, stamina: 4, power: 0.025 },     // gained with every level after the first
    guardianXp: 6,                                     // a guardian is worth this many times its kind
    // Each weapon type ranks up with the hits it lands. Rank 1 +4% damage, rank 2 adds a fourth combo blow, rank 3 +8% posture
    mastery: [40, 130, 300], masteryDmg: 0.04,
    finisher: { pose: 'thrust', wind: 0.16, active: 0.1, recover: 0.5, dmg: 24, posture: 30, cost: 15, range: 2.6, arc: 120, lunge: 2.0 },
    respecCost: 40,                                    // gold per level to unlearn every talent at the training yard
    maxTrees: 2,                                       // talents may be learned in at most two trees
    ultimateNeeds: 4,                                  // points spent in a tree before its ultimate can be learned
  },
  // Four expertise trees: three talents of up to three ranks, then an ultimate (one rank)
  trees: {
    guardian: { name: 'Guardian', color: '#7fb8ff', talents: [
      { id: 'steady', name: 'Steady Guard', desc: 'Blocking costs 10% less stamina per rank' },
      { id: 'keen', name: 'Keen Eye', desc: 'Parry window +0.03 s per rank' },
      { id: 'riposte', name: 'Riposte', desc: 'Criticals on broken enemies deal +25% per rank' },
    ], ult: { id: 'bulwark', name: 'Bulwark', desc: 'For 3 s every blockable hit is turned aside, free of stamina', cd: 30 } },
    duelist: { name: 'Duelist', color: '#9affc8', talents: [
      { id: 'feet', name: 'Light Feet', desc: 'Dashing costs 15% less stamina per rank' },
      { id: 'counter', name: 'Counter', desc: 'After a dash through an attack, your next blow deals +30% per rank' },
      { id: 'precision', name: 'Precision', desc: '+4% critical chance per rank' },
    ], ult: { id: 'dance', name: 'Blade Dance', desc: 'Flicker between nearby foes striking six times, untouchable', cd: 30 } },
    berserker: { name: 'Berserker', color: '#ff7a5a', talents: [
      { id: 'fury', name: 'Fury', desc: '+4% damage per rank, doubled below 40% health' },
      { id: 'breaker', name: 'Breaker', desc: '+10% posture damage per rank' },
      { id: 'thirst', name: 'Bloodthirst', desc: '+2% of damage dealt returned as health per rank' },
    ], ult: { id: 'rage', name: 'Bloodrage', desc: 'For 8 s: +40% damage, swings 30% faster, hits do not stagger you', cd: 35 } },
    arcanist: { name: 'Arcanist', color: '#c8a0ff', talents: [
      { id: 'ember', name: 'Ember Edge', desc: 'Your weapon burns: +6% fire damage per rank' },
      { id: 'ward', name: 'Frost Ward', desc: '+5% damage reduction per rank' },
      { id: 'focus', name: 'Focus', desc: 'Stamina regenerates 10% faster per rank' },
    ], ult: { id: 'nova', name: 'Nova', desc: 'A blast of force around you: heavy damage and posture, throws foes back', cd: 25 } },
    // One tree for each ranged class, shown to that class only (cls); it counts toward the two trees a warden may learn
    marksman: { name: 'Marksman', cls: 'archer', color: '#ffd27a', talents: [
      { id: 'volley', name: 'Volley', desc: 'One more arrow in the heavy fan per rank' },
      { id: 'longshot', name: 'Long Shot', desc: '+8% damage per rank to foes more than 8 m away' },
      { id: 'quick', name: 'Quick Draw', desc: 'Shoot 6% faster per rank' },
    ], ult: { id: 'storm', name: 'Arrow Storm', desc: 'For 6 s every arrow is a burst of three', cd: 30 } },
    spellweaver: { name: 'Spellweaver', cls: 'mage', color: '#ff9a5a', talents: [
      { id: 'conduit', name: 'Conduit', desc: '+8% damage per rank' },
      { id: 'wildfire', name: 'Wildfire', desc: 'Fireballs burn 30% harder per rank' },
      { id: 'blast', name: 'Wide Blast', desc: 'The fireball blast is 0.4 m wider per rank' },
    ], ult: { id: 'meteors', name: 'Meteor Shower', desc: 'Five fireballs fall on the foes around you', cd: 35 } },
    devotion: { name: 'Devotion', cls: 'cleric', color: '#9affc0', talents: [
      { id: 'mercy', name: 'Mercy', desc: 'Healing is 10% stronger per rank' },
      { id: 'prayer', name: 'Swift Prayer', desc: 'Heal cooldowns are 10% shorter per rank' },
      { id: 'radiance', name: 'Radiance', desc: 'Whoever you heal takes 6% less damage per rank for 4 s' },
    ], ult: { id: 'halo', name: 'Halo', desc: 'A great light: mends everyone near for 45% and burns the foes in it', cd: 40 } },
  },

  // ---------------- Story ----------------
  // Maren speaks before each stage (pre) and after its guardian falls (post); depth lines for the stages that repeat.
  story: {
    intro: [
      ['', 'Forty winters ago the ground beneath Varrow Hill split open. The village called it the Deep.'],
      ['', 'What the Deep swallows, it sends back up: bones that walk, knights who forgot their oaths, beasts grown fat in the dark.'],
      ['', 'Deepward is the last camp on the rim. Its wardens go down to push the dark back. Most do not come up.'],
      ['Maren', 'Another warden. The last one went down with a lantern and a prayer. Bram has a blade for you at the forge.'],
      ['Maren', 'One rule here: come back up. The gate by the fire leads down. Go when you are ready.'],
    ],
    pre: [
      ['The Crypt is the first ring. The dead there are slow, but they never tire.', 'When steel glints white, raise your shield. Raise it at the last moment and you will throw them off balance.'],
      ['Below the Crypt stands the Iron Keep: the garrison that marched down to seal the Deep and never marched back.', 'Their shields still hold. A heavy blow breaks a guard, or get behind them.'],
      ['Past the Keep the tunnels open into the Den. Something big has been feeding there, and goblins scurry at its heels.', 'When its weapon burns red, do not block. Dash through it.'],
      ['Below the Den the stone turns to web. The Spider Depths. Bram lost a brother there.', 'Their pounce will smash a shield aside. Meet it with a parry, at the last heartbeat, or be elsewhere.'],
      ['The deepest ring we know of: the Shadow Court. Its duelists were nobles once. They still fight like it.', 'They lie with their blades. Watch the first swing, but answer the second.'],
      ['Below the Court there is water, warden. A temple, drowned long before Varrow Hill had a name.', 'Its acolytes throw light that hurts. Parry it at the last moment and it goes back the way it came.'],
      ['Under the temple the cold begins. The Frost Halls. Soldiers stand there still, behind great shields.', 'Kill the shield-bearers first. While they stand, every blade near them is hard to bite.'],
      ['Then heat again. A forge, still burning, with no one to feed it but the Deep itself.', 'Brutes, goblins, fire. You know them all by now. You have never met so many at once.'],
      ['Beneath the forge, an orchard of bone. Something there plants the dead and makes them grow.', 'Find the callers. Their skeletons fall when they do.'],
      ['The last ring. A throne, and a king who was the first warden of all, before he went down and did not come up.', 'Bring him back to the light, or put him to rest. Either way, come home.'],
    ],
    post: [
      ['The Bone Warden is dust? Then the Crypt sleeps for a while.', 'Bram says the iron you hauled up is good. Spend your gold on the camp: a better forge makes better blades.'],
      ['Sir Aldric... I knew him. He swore to hold the line. He held it, only facing the wrong way.', 'Rest. Mend your gear. The Den waits below the Keep.'],
      ['The Den Mother is dead, and still the Deep breathes. The stone below is warmer than it should be.', 'Below the Den the walls are webbed. Rest first, warden.'],
      ['The Brood Queen... Bram will drink to that tonight, for his brother.', 'One ring remains that we know of. The Court. Go carefully.'],
      ['The Pale Duelist bowed before she fell, they say. Courteous to the end.', 'And still the stair goes on. Water, below the Court. Rest, then go and see.'],
      ['The Prophet is drowned twice over. The water is already going down.', 'Below it, Bram swears he felt the cold through the gate. Take a cloak.'],
      ['The Frost Marshal held his hall for forty winters. You took it in an afternoon.', 'There is fire below the ice. Strange, the Deep.'],
      ['The Furnace Lord is out. For the first time in memory, the stair is cold all the way down.', 'One more ring before the last, they say. An orchard. I do not like the sound of it.'],
      ['The Gardener is buried in its own soil. The orchard will not grow again.', 'Below it, only the throne. You know who sits there now. So do I.'],
      ['It is over. The Hollow King lies at rest, and the Deep is quiet for the first time in forty years.', 'You came back up, warden. That was the one rule. The Endless Deep still goes down, if you ever want to look.'],
    ],
    depth: 'Depth {n}. The rings have shifted again and their dead have grown stronger. Take care, warden.',
  },
};
