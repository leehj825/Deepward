# Class balance report: the balance bot with all four classes

Date: 2026-10-22. Nothing in the game was changed because of this report; it only records what the bot found and what I would try next.

## How it was run

`node tools/balance.js story skilled <class>` plays a whole campaign in the headless game with the scripted warden: a new warden of the class, the camp round (every scene read, choices answered at random), then for each of the ten stages the gear and level a typical player would have, the dungeon with its relics, the guardian and its chest, the ending after the Hollow King, and the way home. A stage that is not cleared in 900 s of game time counts as not cleared (a timeout).

Setup per class:
- **Gear:** the class's own weapon and off-hand (bow and quiver, staff and orb, scepter and tome), gear tier and upgrades by stage as for the warrior, and two talent points per stage spent in the class's own tree (marksman, spellweaver, devotion), first learnable talent first. The warrior keeps the older fixed talent list.
- **Fighting:** the warrior walks up and attacks. The ranged classes lock onto the nearest foe, back off when it is closer than about 4 m, close in when it is farther than about 9.5 m, and otherwise strafe, casting or shooting with a heavy attack now and then. All classes block, parry and dash the same way, with the skilled profile's chances.
- **Cleric, second run:** below 55% health the bot switches to heal mode and casts healing, and goes back to smiting above 85%.
- **Not included:** companions (except the warrior's earlier run with Hobb and Aldo), the Endless Deep, and the ultimate.

The bot is a rough player. It does not dodge as a person would, its ranged movement is a simple rule, and it plays the cleric alone, which is the cleric's worst case.

## Results (skilled profile, alone)

| Class | Stages cleared | Total deaths | Ending reached | Notes |
| --- | --- | --- | --- | --- |
| Warrior | 10 of 10 | 6 | the Watch | every beat seen; the last boss 110 s |
| Mage | 10 of 10 | 9 | the Watch | close to the warrior; stage 10 was hardest, 3 deaths, the Hollow King took 81 s |
| Archer | 9 of 10 | 27 | the Watch | the Ashen Forge (stage 7) timed out at 892 s; stage 10 cost 12 deaths and 11,606 damage taken |
| Cleric, smiting only | 8 of 10 | 42 | none | stages 9 and 10 timed out at about 825 s; stage 10 had 20 deaths and 10 on the boss |
| Cleric, with self-healing | 6 of 10 | 42 | none | stages 2, 7, 8, 9 and 10 timed out; slower than smiting only |

The extra detail:

| Stage | Warrior time (s) | Mage | Archer | Cleric (smite) |
| --- | --- | --- | --- | --- |
| 1 Crypt | 121 | 152 | 128 | 181 |
| 4 Spider Depths | 142 | 109 | 98 | 186 |
| 7 Ashen Forge | 226 | 188 | 892 (timeout) | 564 |
| 8 Bone Orchard | 361 | 227 | 278 | 692 |
| 10 Throne | 329 | 296 | 479 | 827 (timeout) |

## What the numbers say

1. **Warrior and mage are in good shape.** They clear every stage with few deaths. The mage is a little faster in the middle stages and about as safe in the last.
2. **The archer loses time to armored foes.** A rerun of the Ashen Forge on its own cleared it, but the champion alone took 435 s (a warrior takes 30 to 60 s). The Forge's champion is armored, and armor cuts damage by 40%; the archer's light arrows lose the most to that. The final stage also hurt (12 deaths): the archer is frail and the horde reaches it.
3. **The cleric cannot finish stages alone.** It deals too little damage to kill a section's foes before the 900 s limit in the later stages, and when it is hurt the bot's healing costs more time than it saves. The healing run was worse than the smiting-only run.
4. **The cleric is built for a party.** Its design is "weaker than the mage" and its heal is meant for allies. A bot that plays it alone shows its worst case, not how it plays with companions.
5. **Possible bot effects.** Timeouts can also come from the bot walking into rocks in the cave and forest stages. The bot gives up on a relic after 25 s, but it has no such rule for foes it cannot reach. The numbers for the ranged classes are therefore an upper bound on how bad it is.

## What I would try (not done)

In order of how sure I am:
1. **Cleric damage:** raise the damage of the smite and the heavy smite by about 40%, so it can finish a stage alone while still being clearly behind the mage.
2. **Armor:** let ranged hits (arrows, bolts, smites) ignore part of the armor reduction, so armored champions do not take minutes. For example armor cuts ranged damage by 25% instead of 40%.
3. **A party run for the cleric:** run `PARTY=1` with the cleric, to see how it does with Hobb along (the way it is meant to be played).
4. **Bot work before judging further:** teach the bot to dodge for the ranged classes, to give up on a foe it cannot reach, and to use the heavy cast and the ultimate. Then re-run all four classes and compare.
5. **Re-run with the casual profile** for all four classes, since the casual numbers are closer to a new player's.

## Re-running it

```
node tools/balance.js story skilled archer            # one class, a whole campaign (about 25 minutes)
PARTY=1 node tools/balance.js story skilled cleric    # with Hobb and Aldo along
CLASS=archer node tools/balance.js skilled 0 6 7      # one stage with a class (stage 7 here)
```

The logs of these runs were not kept in the repository; the tables above are the record.
