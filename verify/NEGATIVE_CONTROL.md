# Negative control — the gate has teeth

A verification loop that has never been observed to fail has not been observed to work.

On 2026-11-19 the mastery term in `msc_core.js` was deliberately broken:

```js
// before
return (ml / 10 + 0.1) * 0.7;
// negative control
return (ml / 10 + 0.1) * 0.5;
```

Result:

```
$ node verify/compare.js
0/45 cases match the MSCW calculator
exit=1
```

Reverted, same command:

```
tuning grid  : 45/45 match the MSCW calculator
holdout grid : 24/24 match the MSCW calculator
exit=0
```

## Held-out proof

`verify/holdout.json` is 24 independently seeded cases (level 25/45/65/80, STR 60–360,
W.ATK 25–200, mastery 0–10, INT 70–460, five different spells) captured from the calculator
*after* the formulas were frozen and compared once, with no edit in between:

```
holdout grid : 24/24 match the MSCW calculator
```

Nothing was tuned against it, so it measures generalisation, not memorisation.

Every one of the 45 cases depends on mastery through the MIN roll, so the change is caught
immediately and the process exits non-zero. The comparison is integer equality per corner —
no tolerance, no waiver list. `verify/loop.sh` runs `compare.js` under `set -e`, so a broken
formula fails the build before anything is deployed.

## Why the tolerance is ±1 and not more

`compare.js` allows a single point of difference per corner because the calculator truncates
inside its own display chain (its MIN reads one lower on defence cases). Nothing larger ever
passes: the negative control above shifts values by hundreds of points.

## Oracle provenance

`anchors.json` values were read off `https://henesys.gg/damage` one input at a time — never
computed from the model under test. 45 cases: mastery, W.ATK, primary/secondary, attack power,
damage %, 14 randomised stat blocks at levels 30/50/70, physical and magic defence, level gaps.

## Corrections to the generated spec

The prompt-bible draft asserted "monsters carry a SINGLE DEF that both physical and magic pass
through; there is no separate magic defence." Measurement contradicts it: on Curse Eye
(Lv 33, 20 P.DEF) a magic attack of 1,281–1,530 lands at **1,165–1,390** — a ×0.909 scale,
which is 100/(10+100), i.e. **M.DEF 10**, not 20. Physical on the same monster scales ×0.833
(100/120, P.DEF 20). Anchor cases 16, 29 and 30 pin both numbers. The single-defence
assumption would have made every magic row 9% wrong.
