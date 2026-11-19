# Advanced SP Calculator — MapleStory Classic World

Live: https://advanced-sp-calculator.vercel.app

A training calculator for **MapleStory Classic World (MSCW)** that answers two questions with
arithmetic instead of vibes:

1. **What is my exact damage on this mob?** — full MSCW damage pipeline, per hit, per line.
2. **When do I use my mob attack instead of my 1v1?** — the break-even mob count, plus a ranked
   list of the mobs *your* current damage kills for the most EXP per minute.

## Why this is not just another MapleStory calculator

MSCW does **not** use the old MapleStory or pre-Big-Bang formulas. Every other calculator that
imports global-Maple numbers gets MSCW wrong. This one is built only from MSCW sources and is
checked against them on every page load (see the "Model verification" panel — 8 anchors, live).

Model:

```
m    = (masteryLv / 10 + 0.1) * 0.7
MIN  = S * W.ATK * (0.8 + (P*m*W + Q)/100 + A/50)
MAX  = S * W.ATK * (1.0 + (P*W   + Q)/100 + A/50)
AVG  = S * W.ATK * (0.9 + (P*(m+1)/2*W + Q)/100 + A/50)
then  Raw × 100/(P.DEF+100) → element → level gap → crit ×(1+c·d) → trunc, clamp 1…99,999
level gap:  gap ≤ 0 → ×1 · gap 1-9 → 1/(1+gap²·0.005) · gap ≥ 10 → 1/(1+gap·0.05)
```

MSCW weapon multipliers (its own set, not old Maple's): 1H sword 1.8 · 2H sword 2.5 ·
1H axe/blunt 1.92 mixed · 2H axe/blunt 2.60 mixed · spear 2.30 mixed · polearm 2.70 mixed ·
dagger 1.40 mixed · bow/crossbow/claw 2.5.

## Verified anchors (all reproduced in `msc_test.js`)

| Input | Expected MSCW output | This app |
|---|---|---|
| 47 W.ATK, STR 132/DEX 30, 1H sword, mastery 0 | basic 59–172 | 59–172 |
| same, Power Strike 260% | 154–449 | 154–449 |
| same, mastery 10 | basic 137–172 · PS 357–449 | 137–172 · 357–449 |
| 70 W.ATK, STR 180/DEX 60, 2H sword 2.5, mastery 10, PS 260% | 885–1,110 | 885–1,110 |
| same, polearm 2.7, mastery 0 | 316–1,175 | 316–1,175 |
| same, +10 attack power buff | 972–1,212 | 972–1,212 |
| Curse Eye (WDEF 20) at level 50 | 737–925 (×0.833) | 737–925 |
| Curse Eye at level 20 (gap 13) | 447–560 (×0.606) | 446–560 |

Sources: the MSCW damage-formula write-up (meowdb.com/msclassic, updated 2026-11-18) for the
stat-block anchors, and the MSCW damage calculator's own printed output for the 885–1,110 block,
the mastery-0 minimum, the WDEF curve and the level-gap scale. Mob HP/EXP/P.DEF cross-checked on
two independent MSCW databases (Curse Eye: Lv 33 · 1,001 HP · 20 P.DEF · 63 EXP on both).

## Calibration — beats any table

Any preset can be wrong at your skill level. So the app also accepts **observed hit lines**: type
the min/max damage you actually see on a 0-defence monster and the model is pinned to your client.
It back-solves what damage % your numbers imply (e.g. 1,110 max on the reference block → 260%).

## The math behind the recommendation

```
casts to kill   = ceil(mob HP / per-cast damage)
kill time       = casts × cast ms
EXP/min         = mob EXP / (kill time / 60000)
break-even N*   = ceil(1v1 DPS / per-target mobbing DPS)
```

Ranking by EXP/min (not by HP/EXP ratio) is what makes "best mobs" correct for a specific
character: a mob whose HP sits just under a multiple of your cast damage dies in fewer casts than
its HP suggests, and overkill is wasted damage.

## Limitations (stated, not hidden)

- **Accuracy / miss chance is not modelled.** Stay within ±5 levels of the mob for trustworthy numbers.
- Skill damage %, hit counts and cast times are editable inputs. Presets are conveniences; the
  in-game skill tooltip is the authority, or use calibration.
- Mob table is a static starter set (Lv 1–80, bosses tagged); every field is editable.
- Crit is modelled as an expected multiplier `(1 + rate × damage)`; it does not model crit streaks.

## Files

- `msc_core.js` — all math, no DOM (used by the page and by the tests)
- `msc_train_calc.html` — the UI, loads `msc_core.js`
- `build.py` — inlines the core into `index.html` (single-file deploy)
- `msc_test.js` — 37 assertions against the documented anchors above
- `dom_smoke.js` — runs the page's real script against a DOM stub and checks the rendered output

```
node msc_test.js && python3 build.py && node dom_smoke.js index.html
```

Deploy: `vercel --prod` from the repo root (static site, `vercel.json` sets `cleanUrls`).
