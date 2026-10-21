# The Under Crown: a draft main story

Status: **decisions made (section 8); the scene plan for rings 1 to 5 is in section 10. Nothing here is built yet.** It keeps everything already in the game (the story text in `CFG.story`, the first main-story chain in `CFG.mainStory`, Rook's task, the Fen, the captives) and fills the gaps. Names: the King is **Orrin Varrow**, the hunger under the hill is **the Under**, and the King's title stays **the Hollow King**.

## 1. The secret history (what the player slowly learns)

Under Varrow Hill lies **the Under**. It is not a monster or a place but a hunger. It keeps what it swallows, which is why the dead will not lie down and why "names are how things get their hold on us".

Forty winters ago the kingdom of Varrow was dying of a plague. **King Orrin Varrow** lost his son and dug into the hill to bargain with whatever was under it. The ground split, and that was **the Deep**.

Orrin realised his mistake too late. The Under could not be closed, only **held**. So he gathered the first wardens, his household and his sworn knights, and led them down. His smiths forged **the Crown**, a lock that binds the Under to one will. Orrin put it on and sat the throne at the bottom, becoming the **Hollow King**.

Each ring of the Deep is a post held by one of his oath-sworn household. That is why the guardians are tragic, not evil: they are still keeping watch, "only facing the wrong way".

One person climbed out. **Maren was Orrin's second**, the last first-warden. At the final hour he ordered her up to guard the camp and keep the lamps lit, and she obeyed. She has told everyone for forty years that she simply survived. In truth she **left him**.

The Crown is wearing thin after forty winters. The Deep has become louder and the bells in the Keep ring like a name being called. **That name is Orrin's**, and he is the one ringing it. He is calling for a relief.

## 2. What the Hollow King wants

He does not want a fight. He wants **to be relieved**, because the watch has been unbearable for forty years. But the Under also whispers in him, and in his worst hours he wants to **go up into the light** and let the lock fail.

The player is not the villain's rival so much as his answer. The final fight is the King testing whether the warden is strong enough to hold the Crown. The Under wears his voice, and the player has to tell which one is speaking.

## 3. The cast and how they fit

- **Maren** is the keeper of the secret. She is gruff, warm and evasive. Her arc is from silence to confession. She is the one who can take the Crown in the best ending.
- **Bram**, the smith, descends from the family that forged the Crown. His brother died in the Spider Depths trying to recover the **lock-key**, a piece of the Crown's mould. Bram does not know the Crown's real purpose until Act II. He holds the one tool that can break it.
- **Captain Rook** commanded the garrison that marched down to the Keep and was ordered to hold the gate on the way back. His old comrade was **Sir Aldric**. His arc is guilt turned to duty, and his war-camp task is about the goblins the Deep is driving up onto the Rim.
- **Hobb** stands for the ordinary, practical view. He is the first to say: "You do not need a reason to hold a line. You need a good stance."
- **Tilda** has no secret. She is the voice of the living world worth saving. Her price is always a little too fair.
- **The captives** you free show that the Deep still keeps people.

## 4. The structure

- **Act I, rings 1 to 5:** you learn what the Deep does. Each guardian is a post that has been held too long.
- **Act II, rings 6 to 10:** you learn why it exists. The secret history comes out ring by ring, ending at the throne.
- **After:** the Endless Deep and the Rim go on as before.

Every ring gets four beats:
1. **Before:** a short scene at camp.
2. **Discovery:** a scrap of lore in the ring, such as a journal page, a ghost or a carved wall.
3. **The guardian:** a short line as it wakes or falls.
4. **After:** a scene at camp, usually with a choice that sets a flag.

## 5. Ring by ring

**1. The Crypt. Guardian: the Bone Warden.**
- *Before:* Hobb on stance, and Maren's warning that "the dead there are slow, but they never tire".
- *Discovery:* an old roll of names carved on the wall, with the last line scratched out.
- *Guardian:* the Warden says one word as it falls: "Relieved?"
- *After (Maren, existing choice):* "It was waiting for something." / "It said nothing." Maren flinches at the word.

**2. The Iron Keep (the ruined town). Guardian: Sir Aldric.**
- *Before:* Rook asks you to look for his company's banner.
- *Discovery:* a bell with a name cast in the bronze, scratched off.
- *Guardian:* Aldric's last words are the Hollow King's name.
- *After (Maren, existing choice):* "A name: the Hollow King." sets `toldKing`.
- *Rook beat:* if you found the banner you can return it, and Rook breaks down. This sets `rookBanner`.

**3. The Ogre Den (cave). Guardian: the Den Mother.**
- *Before:* Rook warns that goblins are fleeing something. "Nothing runs from the dark that way unless something worse is behind it."
- *Discovery:* the goblins' cave paintings show a crown and a man kneeling.
- *Guardian:* she roars; the ground shakes.
- *After:* Tilda says the Rim's prices have doubled because the roads are scared. Rook says the war camp is a symptom.

**4. The Spider Depths (cave). Guardian: the Brood Queen.**
- *Before:* Bram quietly asks you to look for his brother's pack.
- *Discovery:* the pack. Inside is a mould fragment shaped like a crown's rim.
- *Guardian:* silence, then web.
- *After (Bram, choice):* you give him the fragment. If you tell him what it is, `bramKnows`. If you keep it secret, `bramLied`. Either way he is shaken: "My family made this. Why?"

**5. The Shadow Court (cave). Guardian: the Pale Duelist.**
- *Before:* Maren hesitates: "From here down, I cannot tell you what to expect." Her first slip.
- *Discovery:* a portrait gallery with one frame turned to the wall.
- *Guardian:* she bows before the fight, and again before she falls.
- *After (end of Act I, Maren):* "I climbed out. I was his second." A short confession. The choice: "Why did you leave?" / "You did what you were told." This sets `maren_forgiven` or `maren_blamed`.

**6. The Sunken Temple. Guardian: the Drowned Prophet.**
- *Before:* Bram brings the key fragment and asks to come with you. A companion beat if Hobb is hired.
- *Discovery:* a mural of the plague, then the digging.
- *Guardian:* the Prophet says: "He dug it himself. We only held the lamp."
- *After:* Maren already knew. She asks what the mural showed. You can tell her all or some.

**7. The Frost Halls. Guardian: the Frost Marshal.**
- *Before:* Rook is thinner and has stopped sleeping.
- *Discovery:* orders in the Marshal's hand: "Hold until relieved."
- *Guardian:* "Relieved?" again, quietly.
- *After:* the Marshal's frozen company stands down. Rook salutes them.

**8. The Ashen Forge. Guardian: the Furnace Lord.**
- *Before:* Bram tells you the Forge's crown mould is the origin of his family trade.
- *Discovery:* the mould itself, and a plaque saying the Crown was made to bind, not to rule.
- *Guardian:* the Lord has been feeding the Crown's fire for forty winters.
- *After:* Bram can reveal the **lock-key**, the tool that can break it (`keyFound`). He asks whether to use it or hide it. The choice sets `bramKey`.

**9. The Bone Orchard (forest). Guardian: the Bone Gardener.**
- *Before:* Tilda says the Rim is quiet, "too quiet to be good".
- *Discovery:* every tree is a former household member's grave. One bears the name Maren.
- *Guardian:* the Gardener calls it "the harvest he cannot stop".
- *After (Maren):* "That is my grave. He planted it for me." Her final confession scene: she asks to go down with you. The choice: "Come with me." / "Stay and keep the lamp." This sets `marenDescends`.

**10. The Throne of the Deep. Guardian: the Hollow King.**
- *Before:* a short send-off at the gate, with whoever you have trusted.
- *Discovery:* the crown, the throne, and a voice that is two voices.
- *The fight:* phase one is the King, honourable and sad. Phase two is the Under wearing him, and the music changes.
- *The choice:* see the endings below.

## 6. The three endings

- **The Watch:** you take the Crown and become the lock. The Deep is quiet, but you do not come up. Maren lights a lamp for you every night. This is always available.
- **The Relief:** needs `marenDescends` and `maren_forgiven`. Maren takes the Crown and the King is finally released. She is at peace, and the camp loses its elder but keeps the Deep sealed.
- **The Breaking:** needs `bramKey`. Bram's key shatters the Crown. The Under is freed, but with no one holding it, it begins to fall apart. The Deep drains and closes, and the camp has to leave Varrow Hill. It is the bleakest ending, with the world safe and the home lost.

Each ending ends with the same line from Maren (or whoever is at the gate): "You came back up, warden. That was the one rule." In the Watch ending it is not true, and she says it anyway.

## 7. After the story

- **The Endless Deep** now sits on a quieted Under, and each curse is a memory it kept.
- **Epilogue per ending:** a short scene at the camp afterwards (the lamp, the empty chair, the packed carts), different for each ending.
- **Side threads:** Rook's war-camp task continues as the goblins' flight. Captives bring news from the Rim.

## 8. Decisions (the open questions, answered)

1. **Tone.** Is a bittersweet, melancholy story right, or should it be more heroic?
   - Answer: **Bittersweet underneath, heroic in play: the sadness is in what you learn, the victories (hordes, streaks, bosses) feel good. A little dry humour from Hobb and Tilda so it is not grim all the way down.**
2. **Maren.** Are you happy with her being the one who left the King, and with her being the best ending's choice?
   - Answer: **Yes. Maren is the one who left the King. Keep her sympathetic: she obeyed his last order, and the guilt is what she carries. She is the Relief ending's choice.**
3. **Endings.** Do you want all three (the Watch, the Relief, the Breaking), or only two? Should a fourth be added?
   - Answer: **Three endings: the Watch (always available), the Relief (needs `marenDescends` and `maren_forgiven`), the Breaking (needs `bramKey`). No fourth. The final scene shows a hint (Maren looking at the Crown) so the Relief is discoverable.**
4. **Names.** "Orrin Varrow" and "the Under" are placeholders. Keep them, or change them?
   - Answer: **Keep "the Hollow King" (it is in the game and the achievements). The King is **Orrin Varrow** (was Edric) and the hunger is **the Under** (was "the Hollow"), because "Hollow" is already in many guardian and item names.**
5. **Companions.** Should the hired companions (Hobb, Mira, Aldo, Pell) comment on the story, or stay silent?
   - Answer: **A few lines only, at key moments: Maren's confession, the throne, and the ending. Not in every scene. Hobb's practical line suits him.**
6. **Scope.** A scene per ring is about twenty scenes. Should the first build cover only rings 1 to 5, or all ten?
   - Answer: **Build rings 1 to 5 first (Act I, about ten scenes); write rings 6 to 10 after Act I has been tested.**
7. **Choices and flags.** Should choices change later dialogue only, or also change the game (prices, who is hireable, what Bram sells)?
   - Answer: **Dialogue first, plus three real effects: Rook's banner gives a one-time reward, Bram's key unlocks the Breaking, Maren's forgiveness unlocks the Relief. No price or hiring changes yet (balance and saves).**
8. **Anything to cut or add** (new characters, a different villain, a twist you prefer).
   - Answer: **Cut the Ring-replays-the-guardians idea for now. Add a short **epilogue per ending** showing the camp afterwards (cheap, and it makes the endings feel different).**

## 9. What already exists in the game that this builds on

- The intro and the before and after lines for every ring (`CFG.story` in `js/config.js`).
- The scene system, the objective chain and the flags (`js/scene.js`, `js/story.js`, `CFG.mainStory`, `Items.S.flags`): see `docs/DESIGN.md`, roadmap step H4.
- Today's chain covers meeting Maren, Hobb's yard, the Bone Warden, Sir Aldric and the first "Hollow King" choice (`toldKing`). This draft would extend it ring by ring.
- Rook's war-camp task, the Rim, the Fen, the captives and the Ring (`docs/DESIGN.md`).

## 10. Scene plan: rings 1 to 5 (Act I)

How each scene is built, with the existing systems (`js/scene.js`, `js/story.js`, `CFG.mainStory`): a **step** is an objective that completes on an event (`talk` with a person, `guardian` falling, and the new `find` for a discovery); a completed step can play a **scene** (speaker, lines, choices with `go` labels and `flag`). Flags are saved in `Items.S.flags`. New pieces needed are marked **(new)**.

New engine pieces for Act I:
- **(new) `find` event and discovery props.** A glowing wall carving, banner, pack or portrait in the ring that the warden walks up to and presses E on (it is an interact spot like a captive). It fires `Story.event('find', id)` and plays a short narration scene (no speaker, the camera on the warden).
- **(new) Guardian lines.** A `guardianLine` per guardian: one line shown as a caption when it wakes and one when it falls (the existing boss bar and entrance scene stay).
- **(new) Flag-gated lines.** A line or choice can have `if: 'flagName'` so Maren, Rook and Bram answer differently later.
- **(new) One-time rewards.** A `reward` on a step or choice (gold or an item), used for Rook's banner.
- **(new) Hobb in the camp.** Hobb has no camp figure today (only the yard spot). Give him one at the yard so scenes can frame him; he can still be a hireable companion.

### Ring 1: The Crypt (Bone Warden)

Steps (already in the game, extended):
1. `talk elder` -> **greet** (as built: the Deep, "louder", where to start).
2. `talk trainer` -> **yard** (Hobb; as built). **Add** Hobb's line: "You do not need a reason to hold a line. You need a good stance."
3. `find crypt-roll` **(new)** -> narration: *A roll of names is cut into the wall, hundreds of them, each struck through but the last. That one has been scratched out so hard the stone is white.*
4. `guardian 0` -> the Warden's falling line (caption): **"Relieved?"**
5. `talk elder` -> **report** (as built, the choice "It was waiting for something." / "It said nothing."). **Add** after the choice: *Maren's hand stops on the cup. She does not look at you.* and set `heardRelieved` if the player reports the word.

### Ring 2: The Iron Keep (ruined town) (Sir Aldric)

6. `talk guard` (Captain Rook) **(new)** before the descent -> **rookBanner**: Rook asks for his company's banner. "Grey, with a bar of red. If it is still down there, it is not mine to leave." Sets `rookAsked`.
7. `find keep-bell` **(new)**, a bell cast with a name, scratched out -> narration: *A bell lies on its side in the square. Someone has chiselled a name from its rim, then, in a different hand, tried to carve it back.*
8. `find keep-banner` **(new)**, optional, a grey banner with a red bar on a lamp post in the town -> narration and `bannerFound`.
9. `guardian 1` -> Aldric's falling line: **"Orrin."** (He says the King's name, not "the Hollow King": the name is what the Under wanted.)
10. `talk elder` -> **king** (as built, the choice "A name: the Hollow King." sets `toldKing`). **Change** the choice text to "A name: Orrin." and Maren's reply to: *"...So the bells were his. I had hoped they were only the dead. Names are how the Under gets its hold on us."* Maren should not say "the Under" aloud until Act II, so use "the Deep" here.
11. `talk guard` -> **rookReturn**: if `bannerFound`, Rook takes the banner (breaks down, a one-time reward: 150 gold, sets `rookBanner`); if not, he nods and says he will go himself one day.

### Ring 3: The Ogre Den (cave) (Den Mother)

12. `talk guard` -> **rookWarns**: *"Goblins are coming up the Rim by the dozen. Nothing runs from the dark that way unless something worse is behind it."* Gives context for his war-camp task.
13. `find den-paintings` **(new)** -> narration: *Soot paintings along the cave wall: small figures kneeling around a larger one with a ring on its head. The ring is the only thing the goblins painted in red.*
14. `guardian 2` -> the Den Mother's falling line: **"He is awake. He is so tired."**
15. `talk trader` (Tilda) **(new)** -> **tildaRoads**: Tilda says the roads are scared and her prices are up, and that she does not mind: "It means the world up here is still worth the trouble." This is a light scene with a joke (and the first line from the "voice of the living world" in the cast).

### Ring 4: The Spider Depths (cave) (Brood Queen)

16. `talk smith` (Bram) **(new)** -> **bramPack**: Bram asks quietly for his brother's pack. "He went to the Depths for a piece of a mould. He never said what for." Sets `bramAsked`.
17. `find depths-pack` **(new)** -> narration and an item: *Inside the pack, wrapped in cloth, is a curved piece of dark iron: part of the rim of something round.* Sets `haveFragment`.
18. `guardian 3` -> the Brood Queen has no line (silence, then the web). The silence is the beat.
19. `talk smith` -> **bramFragment**, the choice that matters:
   - "Tell him what you guess it is." -> Bram: *"My family made this. ...Why would we make a crown?"* Sets `bramKnows`.
   - "Say only that you found it." -> Bram holds it a long time. *"Thank you."* Sets `bramLied` (he learns the truth later, in Act II, and is hurt).
   - Either way Bram keeps the fragment.

### Ring 5: The Shadow Court (cave) (Pale Duelist)

20. `talk elder` -> **marenSlip**: before the descent Maren stops short: *"From here down I cannot tell you what to expect."* Hobb (if present) glances at her. This is the first crack.
21. `find court-portraits` **(new)** -> narration: *A long gallery of portraits. One frame has been turned to face the wall. On its back, in chalk: "ORRIN".*
22. `guardian 4` -> the Pale Duelist bows before the fight and again as she falls; line: **"A good watch. Please, be kinder to him."**
23. `talk elder` -> **marenConfesses** (the end of Act I, the heart of this plan):
   - Maren: *"You have seen the portraits. You were always going to. ...I was his second. I was the last of his wardens. I climbed out."*
   - Choice: **"Why did you leave?"** (go `why`) / **"You did what you were told."** (go `told`).
   - `why`: *"He ordered me up to keep the lamps lit. I could have refused. I did not. I told myself it was an order."* -> set `maren_blamed`.
   - `told`: *"That is kind. It is also not true, but I will keep it."* -> set `maren_forgiven`.
   - Both: *"The King's name is Orrin. Please do not say it near the gate. The bells are listening."* Ends Act I and unlocks the Sunken Temple objective.

### Flags used in Act I

| Flag | Set by | Used for |
| --- | --- | --- |
| `heardRelieved` | Ring 1 report | Maren's Act II lines |
| `toldKing` | Ring 2 (now "Orrin") | Maren's tone later |
| `rookAsked`, `bannerFound`, `rookBanner` | Ring 2 | Rook's reward and Act II lines |
| `bramAsked`, `haveFragment` | Ring 4 | Bram's Act II scenes |
| `bramKnows` / `bramLied` | Ring 4 choice | the Breaking ending and Bram's Forge scene |
| `maren_blamed` / `maren_forgiven` | Ring 5 choice | the Relief ending |

### Build order for Act I

1. Engine: the `find` event and discovery spots, guardian lines, flag-gated lines, one-time rewards, a camp figure for Hobb.
2. Rings 1 and 2 scenes and flags (they extend what already exists).
3. Rook, Tilda and Bram scenes (rings 2 to 4).
4. Ring 5, the confession.
5. A test that walks every branch (like `tools/story_test.js`) and Korean strings for all new lines.
