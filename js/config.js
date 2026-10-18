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
  },
  maxAttackers: 2,               // enemies that may be winding up or swinging at the same time
  // The dungeon is a chain of rooms heading north. Each stage is a run of rooms in its own theme, ending in a
  // guardian room (its first enemy is a tougher elite). After the last stage the stages repeat with tougher enemies.
  // size: [half width, half depth] in metres; waves: the groups that attack in turn inside the room.
  stages: [
    { name: 'The Crypt', theme: 'crypt', guardian: 'The Bone Warden', rooms: [
      { size: [7, 6], waves: [['skeleton']] },
      { size: [8, 7], waves: [['skeleton', 'skeleton']] },
      { size: [9, 7], pillars: true, waves: [['skeleton', 'skeleton'], ['skeleton', 'skeleton']] },
      { size: [9, 8], guardian: true, waves: [['skeleton', 'skeleton', 'skeleton']] },
    ] },
    { name: 'The Iron Keep', theme: 'keep', guardian: 'Sir Aldric the Hollow', rooms: [
      { size: [8, 7], waves: [['knight']] },
      { size: [9, 7], waves: [['skeleton', 'knight']] },
      { size: [9, 8], pillars: true, waves: [['knight', 'skeleton'], ['knight']] },
      { size: [10, 8], guardian: true, waves: [['knight', 'knight', 'skeleton']] },
    ] },
    { name: 'The Ogre Den', theme: 'den', guardian: 'The Den Mother', rooms: [
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
    camp: { stone: [60, 52, 40], wall: [60, 52, 40], torch: 0xff8a3a, fog: 0x0b1224, hemi: 0x8098c8, decor: '' },
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
      ['Past the Keep the tunnels open into the Den. Something big has been feeding there.', 'When its weapon burns red, do not block. Roll through it.'],
    ],
    post: [
      ['The Bone Warden is dust? Then the Crypt sleeps for a while.', 'Bram says the iron you hauled up is good. Spend your gold on the camp: a better forge makes better blades.'],
      ['Sir Aldric... I knew him. He swore to hold the line. He held it, only facing the wrong way.', 'Rest. Mend your gear. The Den waits below the Keep.'],
      ['The Den Mother is dead, and still the Deep breathes. The stone below is warmer than it should be.', 'There are deeper rings, warden. Older things. Every time you go down, they will be stronger.'],
    ],
    depth: 'Depth {n}. The rings have shifted again and their dead have grown stronger. Take care, warden.',
  },
};
