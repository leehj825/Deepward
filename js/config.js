// Deepward - every balance number lives here. Times are in seconds, distances in metres, angles in degrees.
const CFG = {
  player: {
    hp: 100, stamina: 100,
    staminaRegen: 38, staminaDelay: 0.55,          // per second, after this long without spending any
    speed: 5.4, blockSpeed: 2.2, turnRate: 16,
    radius: 0.45,
    dodge: { time: 0.46, dist: 5.2, iStart: 0.03, iEnd: 0.34, cost: 20 },
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
      flinch: true, approach: 1.7, cooldown: [0.9, 1.7], xp: 10,
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
      flinch: true, guard: true, guardAngle: 130, approach: 1.9, cooldown: [1.1, 2.0], xp: 18,
      attacks: [
        { weight: 3, hits: [{ pose: 'thrust', wind: 0.6, active: 0.1, recover: 0.65, dmg: 15, posture: 16, range: 2.5, arc: 50, lunge: 1.6 }] },
        { weight: 2, hits: [{ pose: 'overhead', wind: 0.85, active: 0.12, recover: 0.75, dmg: 20, posture: 24, range: 2.2, arc: 70, lunge: 1.2 }] },
      ],
    },
    brute: {
      name: 'Brute', hp: 150, posture: 110, postureRegen: 10, speed: 2.1, radius: 0.85, scale: 1.5,
      flinch: false, hyperArmor: true, approach: 2.3, cooldown: [1.2, 2.2], xp: 35,
      attacks: [
        { weight: 3, hits: [{ pose: 'slashR', wind: 0.85, active: 0.14, recover: 0.8, dmg: 22, posture: 30, blockMult: 1.6, range: 2.9, arc: 140, lunge: 1.0 }] },
        { weight: 2, hits: [{ pose: 'heavy', wind: 1.15, active: 0.14, recover: 1.0, dmg: 34, posture: 0, range: 2.6, arc: 360, aoe: { fwd: 1.9, r: 2.3 }, unblockable: true, lunge: 0.6 }] },
      ],
    },
  },
  maxAttackers: 2,               // enemies that may be winding up or swinging at the same time
  // The dungeon is a chain of rooms heading north. Each stage is a run of rooms in its own theme, ending in a
  // guardian room (its first enemy is a tougher elite). After the last stage the stages repeat with tougher enemies.
  // size: [half width, half depth] in metres; waves: the groups that attack in turn inside the room.
  stages: [
    { name: 'The Crypt', theme: 'crypt', rooms: [
      { size: [7, 6], waves: [['skeleton']] },
      { size: [8, 7], waves: [['skeleton', 'skeleton']] },
      { size: [9, 7], pillars: true, waves: [['skeleton', 'skeleton'], ['skeleton', 'skeleton']] },
      { size: [9, 8], guardian: true, waves: [['skeleton', 'skeleton', 'skeleton']] },
    ] },
    { name: 'The Iron Keep', theme: 'keep', rooms: [
      { size: [8, 7], waves: [['knight']] },
      { size: [9, 7], waves: [['skeleton', 'knight']] },
      { size: [9, 8], pillars: true, waves: [['knight', 'skeleton'], ['knight']] },
      { size: [10, 8], guardian: true, waves: [['knight', 'knight', 'skeleton']] },
    ] },
    { name: 'The Ogre Den', theme: 'den', rooms: [
      { size: [9, 8], waves: [['brute']] },
      { size: [10, 8], pillars: true, waves: [['brute', 'skeleton']] },
      { size: [10, 9], waves: [['knight', 'brute'], ['skeleton', 'skeleton']] },
      { size: [11, 9], guardian: true, waves: [['brute', 'knight', 'knight']] },
    ] },
  ],
  // stone / wall: base RGB of floor slabs and bricks; torch: flame and light colour; fog: background and fog colour
  themes: {
    crypt: { stone: [58, 60, 70], wall: [46, 48, 58], torch: 0x8fd8ff, fog: 0x06070c, hemi: 0x6a7aa0, decor: 'bones' },
    keep: { stone: [70, 62, 54], wall: [62, 54, 46], torch: 0xffa040, fog: 0x0a0705, hemi: 0x9a8a70, decor: 'crates' },
    den: { stone: [70, 50, 42], wall: [58, 40, 34], torch: 0xff6a2a, fog: 0x0c0504, hemi: 0xa07060, decor: 'rocks' },
  },
  guardianMult: 1.7,             // guardian health and damage multiplier
  loopScale: 0.3,                // +30% enemy health and damage each time the stages repeat
  roomHeal: 0.35,                // share of max health restored when a room is cleared
  fadeTime: 1.4,                 // seconds for a room to fade in ahead of you, or out behind you
  tips: {
    skeleton: 'A WHITE glint means the attack can be blocked. Hold BLOCK (L / right-click) - or raise it right at impact to PARRY.',
    knight: 'Shields stop light attacks. A HEAVY attack (K) breaks the guard - or roll behind them.',
    brute: 'A RED glow is UNBLOCKABLE. DODGE (Space) through it - you are invulnerable mid-roll.',
  },
  pillarR: 0.75,
};
