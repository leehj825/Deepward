# The Hollow Crown: a draft main story

Status: **draft for review, nothing here is built yet.** It keeps everything already in the game (the story text in `CFG.story`, the first main-story chain in `CFG.mainStory`, Rook's task, the Fen, the captives) and fills the gaps. The open questions are at the end (section 8): answer them and this file becomes the plan for the scenes.

## 1. The secret history (what the player slowly learns)

Under Varrow Hill lies **the Hollow**. It is not a monster or a place but a hunger. It keeps what it swallows, which is why the dead will not lie down and why "names are how things get their hold on us".

Forty winters ago the kingdom of Varrow was dying of a plague. **King Edric Varrow** lost his son and dug into the hill to bargain with whatever was under it. The ground split, and that was **the Deep**.

Edric realised his mistake too late. The Hollow could not be closed, only **held**. So he gathered the first wardens, his household and his sworn knights, and led them down. His smiths forged **the Crown**, a lock that binds the Hollow to one will. Edric put it on and sat the throne at the bottom, becoming the **Hollow King**.

Each ring of the Deep is a post held by one of his oath-sworn household. That is why the guardians are tragic, not evil: they are still keeping watch, "only facing the wrong way".

One person climbed out. **Maren was Edric's second**, the last first-warden. At the final hour he ordered her up to guard the camp and keep the lamps lit, and she obeyed. She has told everyone for forty years that she simply survived. In truth she **left him**.

The Crown is wearing thin after forty winters. The Deep has become louder and the bells in the Keep ring like a name being called. **That name is Edric's**, and he is the one ringing it. He is calling for a relief.

## 2. What the Hollow King wants

He does not want a fight. He wants **to be relieved**, because the watch has been unbearable for forty years. But the Hollow also whispers in him, and in his worst hours he wants to **go up into the light** and let the lock fail.

The player is not the villain's rival so much as his answer. The final fight is the King testing whether the warden is strong enough to hold the Crown. The Hollow wears his voice, and the player has to tell which one is speaking.

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
- *The fight:* phase one is the King, honourable and sad. Phase two is the Hollow wearing him, and the music changes.
- *The choice:* see the endings below.

## 6. The three endings

- **The Watch:** you take the Crown and become the lock. The Deep is quiet, but you do not come up. Maren lights a lamp for you every night. This is always available.
- **The Relief:** needs `marenDescends` and `maren_forgiven`. Maren takes the Crown and the King is finally released. She is at peace, and the camp loses its elder but keeps the Deep sealed.
- **The Breaking:** needs `bramKey`. Bram's key shatters the Crown. The Hollow is freed, but with no one holding it, it begins to fall apart. The Deep drains and closes, and the camp has to leave Varrow Hill. It is the bleakest ending, with the world safe and the home lost.

Each ending ends with the same line from Maren (or whoever is at the gate): "You came back up, warden. That was the one rule." In the Watch ending it is not true, and she says it anyway.

## 7. After the story

- **The Endless Deep** now sits on a cooled Hollow, and each curse is a memory the Hollow kept.
- **Side threads:** Rook's war-camp task continues as the goblins' flight. Captives bring news from the Rim. The Ring replays the guardians as memories.

## 8. Open questions (to answer later)

Write your answer under each one.

1. **Tone.** Is a bittersweet, melancholy story right, or should it be more heroic?
   - Answer:
2. **Maren.** Are you happy with her being the one who left the King, and with her being the best ending's choice?
   - Answer:
3. **Endings.** Do you want all three (the Watch, the Relief, the Breaking), or only two? Should a fourth be added?
   - Answer:
4. **Names.** "Edric Varrow" and "the Hollow" are placeholders. Keep them, or change them?
   - Answer:
5. **Companions.** Should the hired companions (Hobb, Mira, Aldo, Pell) comment on the story, or stay silent?
   - Answer:
6. **Scope.** A scene per ring is about twenty scenes. Should the first build cover only rings 1 to 5, or all ten?
   - Answer:
7. **Choices and flags.** Should choices change later dialogue only, or also change the game (prices, who is hireable, what Bram sells)?
   - Answer:
8. **Anything to cut or add** (new characters, a different villain, a twist you prefer).
   - Answer:

## 9. What already exists in the game that this builds on

- The intro and the before and after lines for every ring (`CFG.story` in `js/config.js`).
- The scene system, the objective chain and the flags (`js/scene.js`, `js/story.js`, `CFG.mainStory`, `Items.S.flags`): see `docs/DESIGN.md`, roadmap step H4.
- Today's chain covers meeting Maren, Hobb's yard, the Bone Warden, Sir Aldric and the first "Hollow King" choice (`toldKing`). This draft would extend it ring by ring.
- Rook's war-camp task, the Rim, the Fen, the captives and the Ring (`docs/DESIGN.md`).
