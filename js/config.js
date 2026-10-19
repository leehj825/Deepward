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
      flinch: true, approach: 3.2, cooldown: [1.1, 1.9], xp: 14, gold: 9,
      attacks: [
        { weight: 2, hits: [{ pose: 'bite', wind: 0.5, active: 0.1, recover: 0.45, dmg: 10, posture: 10, range: 1.9, arc: 90, lunge: 0.8 }] },
        { weight: 3, hits: [{ pose: 'pounce', wind: 0.8, active: 0.3, recover: 0.75, dmg: 18, posture: 20, range: 2.2, arc: 120, lunge: 5.5, leap: true, parryOnly: true }] },
      ],
    },
    // Feints: the first glint may be a fake, the real blow comes fast after it
    duelist: {
      name: 'Hollow Duelist', hp: 62, posture: 60, postureRegen: 18, speed: 3.0, radius: 0.45, scale: 1.02,
      flinch: true, approach: 2.0, cooldown: [0.9, 1.6], xp: 20, gold: 14,
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
  maxAttackers: 2,               // enemies that may be winding up or swinging at the same time
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
    { name: 'The Spider Depths', theme: 'depths', guardian: 'The Brood Queen', champion: { kind: 'spider', name: 'The Widow', mods: ['vampiric', 'swift'] }, rooms: [
      { size: [9, 8], waves: [['spider']] },
      { size: [10, 8], pillars: true, waves: [['spider', 'spider']] },
      { size: [10, 9], waves: [['spider', 'goblin', 'goblin'], ['spider', 'spider']] },
      { size: [9, 8], pillars: true, waves: [['spider', 'spider', 'archer']] },
      { size: [11, 9], guardian: true, waves: [['spider']] },
    ] },
    { name: 'The Shadow Court', theme: 'court', guardian: 'The Pale Duelist', champion: { kind: 'duelist', name: 'The Black Herald', mods: ['warded', 'swift'] }, rooms: [
      { size: [9, 8], waves: [['duelist']] },
      { size: [10, 8], pillars: true, waves: [['duelist', 'archer']] },
      { size: [10, 9], waves: [['duelist', 'knight'], ['duelist', 'duelist']] },
      { size: [9, 8], pillars: true, waves: [['duelist', 'spider', 'archer']] },
      { size: [11, 9], guardian: true, waves: [['duelist']] },
    ] },
  ],

  // Guardians: the first enemy of each stage's last room, grown into a boss. scale: size on top of its kind; hp / posture:
  // multipliers on top of guardianMult; reach: hit range multiplier; attacks: replace the kind's moves.
  // Each phase starts when health drops to `at`: the boss roars (untouchable, a shockwave throws you back), then takes
  // the phase's changes: summon (adds that crumble when it falls), def (overrides), attacks, faster (wind-ups x), stance, enrage.
  bosses: [
    { name: 'The Bone Warden', scale: 1.4, hp: 1.6, posture: 1.4, reach: 1.25,
      add: [{ weight: 2, hits: [{ pose: 'heavy', wind: 1.1, active: 0.14, recover: 0.9, dmg: 24, posture: 0, range: 2.6, arc: 360, aoe: { fwd: 1.6, r: 2.2 }, unblockable: true, lunge: 0.8 }] }],
      phases: [
        { at: 0.65, shout: 'RISE, MY DEAD', summon: ['skeleton', 'skeleton'] },
        { at: 0.3, shout: 'THE CRYPT ANSWERS', summon: ['archer', 'skeleton'], faster: 0.85, def: { cooldown: [0.6, 1.2], speed: 3.2 } },
      ] },
    { name: 'Sir Aldric the Hollow', scale: 1.2, hp: 1.7, posture: 1.3, reach: 1.15,
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
    { name: 'The Den Mother', scale: 1.15, hp: 1.4, posture: 1.3, reach: 1.1,
      phases: [
        { at: 0.65, shout: 'THE PACK COMES', summon: ['goblin', 'goblin', 'goblin'] },
        { at: 0.3, shout: 'THE DEN MOTHER RAGES', enrage: true, faster: 0.75, def: { speed: 3.3, cooldown: [0.5, 1.0] },
          add: [{ weight: 2, hits: [{ pose: 'slashR', wind: 0.9, active: 0.3, recover: 0.9, dmg: 26, posture: 0, range: 2.6, arc: 120, unblockable: true, lunge: 6.5 }] }] },
      ] },
    { name: 'The Brood Queen', scale: 1.75, hp: 2.2, posture: 1.5, reach: 1.35,
      phases: [
        { at: 0.66, shout: 'THE BROOD HATCHES', summon: ['spider', 'spider'] },
        { at: 0.33, shout: 'THE QUEEN SHRIEKS', summon: ['spider', 'spider'], faster: 0.85,
          add: [{ weight: 3, hits: [
            { pose: 'pounce', wind: 0.75, active: 0.3, recover: 0.2, dmg: 18, posture: 20, range: 2.2, arc: 120, lunge: 5.5, leap: true, parryOnly: true },
            { pose: 'pounce', wind: 0.45, active: 0.3, recover: 0.8, dmg: 18, posture: 20, range: 2.2, arc: 120, lunge: 5.5, leap: true, parryOnly: true },
          ] }] },
      ] },
    { name: 'The Pale Duelist', scale: 1.12, hp: 2.0, posture: 1.4, reach: 1.1,
      phases: [
        { at: 0.6, shout: 'NOW YOU SEE ME', faster: 0.9,
          add: [{ weight: 3, hits: [{ pose: 'thrust', wind: 0.55, active: 0.1, recover: 0.6, dmg: 18, posture: 18, range: 2.6, arc: 60, lunge: 1.4, blink: true }] }] },
        { at: 0.3, shout: 'SHADOWS, TO ME', summon: ['duelist', 'duelist'], faster: 0.85, def: { cooldown: [0.6, 1.1] } },
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
  },
  guardianMult: 1.7,             // guardian health and damage multiplier
  loopScale: 0.3,                // +30% enemy health and damage each time the stages repeat
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
  championMult: 1.35,            // the mid-stage champion: this much tougher (on top of its modifiers), and bigger
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
    skeleton: 'A WHITE glint means the attack can be blocked. Hold BLOCK (L / right-click) - or raise it right at impact to PARRY.',
    knight: 'Shields stop light attacks. A HEAVY attack (K) breaks the guard - or dash behind them.',
    archer: 'Archers keep their distance. BLOCK the arrows or DASH aside, then close in fast.',
    goblin: 'Goblins are quick but fragile. Keep moving - do not let a pack surround you.',
    spider: 'An AMBER flash is a POUNCE: it smashes through a raised shield. PARRY it at the very last instant, or DASH.',
    duelist: 'Duelists FEINT: the first glint may be a fake. Wait for the real swing before you parry.',
    brute: 'A RED glow is UNBLOCKABLE. DASH (Space) through it - you are invulnerable mid-dash.',
  },
  pillarR: 0.75,

  // ---------------- Gear ----------------
  // Item power grows with tier (the stage depth it was found at); rarity adds a multiplier and random bonuses.
  gear: {
    slots: ['weapon', 'shield', 'armor', 'helm', 'trinket'],
    slotNames: { weapon: 'Weapon', shield: 'Shield', armor: 'Armour', helm: 'Helm', trinket: 'Trinket' },
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
    },
    shields: ['Buckler', 'Heater', 'Kite Shield'],
    armors: ['Jerkin', 'Hauberk', 'Brigandine'],
    helms: ['Cap', 'Helm', 'Great Helm'],
    trinkets: ['Ring', 'Amulet', 'Charm'],
    // Random bonuses: [min, max] per tier step added on top
    affixes: {
      crit: { name: 'Critical chance', unit: '%', min: 4, max: 8, step: 0.6 },
      posture: { name: 'Posture damage', unit: '%', min: 8, max: 15, step: 1 },
      regen: { name: 'Stamina regen', unit: '%', min: 10, max: 20, step: 1.5 },
      hp: { name: 'Health', unit: '', min: 8, max: 18, step: 4 },
      stamina: { name: 'Stamina', unit: '', min: 6, max: 12, step: 2 },
      parry: { name: 'Parry window', unit: 's', min: 0.02, max: 0.04, step: 0.004 },
      lifesteal: { name: 'Life on hit', unit: '%', min: 2, max: 4, step: 0.3 },
      gold: { name: 'Gold found', unit: '%', min: 10, max: 22, step: 2 },
    },
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
    ],
    post: [
      ['The Bone Warden is dust? Then the Crypt sleeps for a while.', 'Bram says the iron you hauled up is good. Spend your gold on the camp: a better forge makes better blades.'],
      ['Sir Aldric... I knew him. He swore to hold the line. He held it, only facing the wrong way.', 'Rest. Mend your gear. The Den waits below the Keep.'],
      ['The Den Mother is dead, and still the Deep breathes. The stone below is warmer than it should be.', 'Below the Den the walls are webbed. Rest first, warden.'],
      ['The Brood Queen... Bram will drink to that tonight, for his brother.', 'One ring remains that we know of. The Court. Go carefully.'],
      ['The Pale Duelist bowed before she fell, they say. Courteous to the end.', 'The rings have no bottom, warden. Every time you go down, they will be stronger. But Deepward stands because of you.'],
    ],
    depth: 'Depth {n}. The rings have shifted again and their dead have grown stronger. Take care, warden.',
  },
};
