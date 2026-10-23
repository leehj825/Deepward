# Korean text: speech levels and character voices

Rule: **no honorific (존댓말) in text that speaks to the player.** Characters each have their own way of speaking.

## Text that speaks to the player (menus, tips, tutorial, descriptions, toasts, narration)

Plain written style (해라체): descriptions end in 한다 / 이다, instructions in 하라, titles are noun phrases or plain sentences.
- "흰 고리가 좁혀 들면 막을 수 있는 공격이다. 막기(@block)를 누르고 있거나 … 패링하라."
- Never 합니다 / 하세요 / 해요 in this text.

## The player's own lines (choices in a scene)

해요체, because the warden is the newcomer speaking to people who have been here longer ("그냥 주웠어요.").

## The characters

| Who | Speech level | Feel | Example |
| --- | --- | --- | --- |
| Maren (elder) | 해체 / 해라체 | gruff and warm, an elder speaking down | "쉬어라, 파수꾼." |
| Hobb (trainer, companion) | 해라체 (military) | short, flat, a sergeant | "자세를 잡아, 감시자." |
| Bram (smith) | short 해체 | few words | "가져와. 만들어 주지." |
| Tilda (trader) | 해요체 | friendly, businesslike | "가격은 보지 마세요." |
| Captain Rook | 하게체 | an older captain to a younger officer | "달려오게, 파수꾼." |
| Mira (scout, companion) | blunt 해체 | cold, brief | "두 목소리라니. 마음에 안 들어." |
| Pell (cartographer, companion) | 합쇼체 (formal) | scholarly, stiff | "지도에 적어 두겠습니다." |
| Aldo (brother, companion) | 하오체 | gentle, clerical | "쉬는 것도 잊지 마시오." |
| Wenna (bard) | tale in 해라체, chat in 해체 | lyrical | |
| Nell (gem cutter) | 해체 | curious | |
| Ysolde (herbalist) | 해요체 | soft | |
| Odo (curio dealer) | 하오체 | mysterious | "보물은 하루에 하나라오." |
| Varga (arena master) | 해라체, loud | "다시 데려올 수 있다!" | |
| Sefa (wanderer) | 해체 | breezy | |
| The Pale Duelist | 합쇼체 | courteous to the end | "부디 그분께 더 다정하게 대해 주십시오." |
| The Hollow King | 하게체 | dignified, tired | "제대로 하게." |
| The Under, other guardians | 해라체 | cold | "그는 지쳤다. 나는 아니다." |

## Names (one spelling each)

마렌 (Maren), 홉 (Hobb), 브람 (Bram), 틸다 (Tilda), 루크 (Rook), 미라 (Mira), 펠 (Pell), 알도 (Aldo), 알드릭 (Aldric), 오린 (Orrin).

## How the translation files work

`tools/i18n/ko_part*.json` are merged by `python3 tools/i18n_merge.py ko` into `js/lang_ko.js`, in file-name order, so a later file overrides an earlier one. The style pass lives in `ko_partz1_fix.json` (missing strings), `ko_partz2_style.json` (the speech-level pass) and `ko_partz3_names.json` (one spelling per name): name new override files so that they sort after those (`ko_partz4_...`).

Text with a key label inside it is translated first and the key fills the `@block`-style slot afterwards (`showTip`, the tutorial box), so the table holds the `@heavy` form.

Other translation files since: `ko_part10` to `ko_part13` (story lines, objectives and companion comments), `ko_partz4_r6` (the journal, effects, endings' reactions, captives' scenes). New English text must get a Korean line before the i18n test is run: `node tools/i18n_test.js` lists what is left over, and `LANGKO=1 node tools/balance.js story skilled warrior` plays a whole campaign in Korean and prints every text that stayed English.
