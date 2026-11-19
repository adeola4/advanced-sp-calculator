# Advanced SP Calculator — MapleStory Classic World

Live: https://advanced-sp-calculator.vercel.app

A calculator for **MapleStory Classic World (MSCW)** that answers three questions with arithmetic
instead of vibes:

1. **What is my exact damage on this mob?** — full MSCW pipeline: physical and magic, per hit, per line.
2. **Which of my two skills do I cast here?** — element multiplier, damage-over-time, target cap and
   MP bill, compared per monster (the F/P wizard case: Fire Arrow vs Poison Breath).
3. **What does it cost?** — MP per cast / per kill / per minute, potions per hour, mesos per hour.

## F/P wizard example (the one that motivated the build)

Fire Arrow Lv30: 180%, 28 MP, single target, fire, burns 50% of a basic attack over 3 s.
Poison Breath Lv30: 90%, 40 MP, 6 targets, poison, 75% chance to poison for 40% over 5 s.

- On **Curse Eye** (poison-resistant, neutral to fire): Fire Arrow wins 4,667 vs 1,556 EXP/min —
  poison takes ×0.75 and **cannot poison a poison-resistant monster at all**, so Poison Breath loses
  its DoT entirely.
- On **Jr. Wraith** (fire-weak): Fire Arrow's burn also gets ×1.25.
- With **6 monsters in range**: Poison Breath flips ahead, 9,333 vs 4,667 EXP/min at 20 MP per kill
  instead of 28 — the target cap is the only reason to ever cast it on a poison-resistant mob.

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

## Data provenance (MSCW only, never global MapleStory)

- Skill damage %, MP cost, hit count, target cap, mastery level per level and DoT values are
  transcribed from the MSCW skill database (Fire Arrow, Poison Breath, Power Strike, Slash Blast,
  Magic Claw, Energy Bolt — level by level).
- Monster HP / EXP / P.DEF and element states (fire weak, poison resist, poison immune, …) come from
  the MSCW monster database.
- Element multipliers: weak ×1.25, resist ×0.75, immune ×0. DoT ignores monster defence (MSCW rule)
  and is blocked on a monster resistant to that element.

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
- DoT is modelled as its quoted total ("50 Basic Attack over 3 sec" = 50% of your basic attack),
  ignoring defence, multiplied by the element, applied once per cast at the quoted success rate.
  Tick timing inside the 3/5 s window is not modelled.
- Power Strike / Slash Blast / Magic Claw / Energy Bolt only have their Lv1 and max values published
  in the source, so intermediate levels are linearly interpolated and flagged; Fire Arrow and
  Poison Breath use exact per-level tables.

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

## Damage accuracy: the verification loop

Every formula in `msc_core.js` is now gated by a harvested ground-truth file, not by hand-picked
examples. `verify/anchors.json` holds 45 cases read **one input at a time** off the MSCW damage
calculator (`henesys.gg/damage`), covering:

- mastery 0 / 3 / 4 / 5 / 7 / 10 on both physical and magic
- W.ATK, primary stat, secondary stat and Attack-Power sweeps
- damage % from 100 to 400
- 14 randomised stat blocks across levels 30 / 50 / 70
- defence: measured per monster, physical **and** magic
- level gap: gap 13 → ×0.606, gap 20 → ×0.5 (Tauromacis), gap 30 → ×0.4 (Jr. Balrog)
- crit: range must NOT move when crit rate/damage change (crit is a separate roll per hit)

Run the gate after any change:

```bash
./verify/loop.sh      # 45/45 calculator cases → anchors → build → UI smoke
```

Current state: **45/45 cases match exactly** (±1 from their truncation order).

### What the audit changed

- **Crit was inside the damage range.** MSCW shows the non-crit roll and rolls crit separately
  (`critical = normal × (1 + d)`, `expected = normal × (1 + c × d)`). The range no longer moves
  when you enter crit rate/damage; a separate "expected average (incl. crit)" drives DPS/EXP.
- **Monsters have two defences.** Every monster's P.DEF and M.DEF was measured by reading a
  neutral attack's post-defence line on the calculator, then dividing out the level scale.
  Curse Eye: 20 P.DEF / 10 M.DEF — using 20 for magic was under-reporting magic damage by ~9%.
- **Effective DEF** now follows `max(0, flat + trunc((1 + pct/100) × base))`.
- **Modifier order** documented and enforced: defence → element → level gap → crit → clamp 1…99,999.

## Two views

- **Advanced** — the full workbench: skill-vs-skill, buffs, MP economics, verification panel.
- **Simple** — one screen, iOS-style: class icons, four tabs of numbers, buff sliders, and the
  best monster to farm with EXP/min on each tile.

MIMP: monsters are buttons now — a filterable grid of icons in Advanced, ranked icon tiles in Simple.
