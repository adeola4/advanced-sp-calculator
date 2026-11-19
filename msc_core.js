/* msc_core.js — MapleStory Classic World (MSCW) damage + training math.
   Pure functions, no DOM. Loaded by msc_train_calc.html and by msc_test.js (Node).

   Everything here is MSCW-specific. Old-MapleStory / pre-Big-Bang formulas are NOT used:
   MSCW has its own weapon multipliers, its own mastery curve, and its own element rules. */
(function (root) {
  const CAP = 99999;

  /* --- elements ------------------------------------------------------------ */
  const ELEM_MULT = { weak: 1.25, enhanced: 1.5, resist: 0.75, half: 0.5, quarter: 0.25, immune: 0 };

  /* --- monsters: name, level, HP, P.DEF, EXP ---------------------------------
     Element states come from the MSCW monster database (weak / resist / immune). */
  const MOB_ROWS = [
    ["Snail", 1, 45, 0, 2], ["Blue Snail", 2, 51, 0, 4], ["Shroom", 3, 62, 0, 6], ["Red Snail", 4, 68, 15, 8],
    ["Stump", 5, 133, 30, 10], ["Slime", 6, 115, 10, 12], ["Pig", 7, 128, 0, 13], ["Orange Mushroom", 8, 142, 0, 15],
    ["Ribbon Pig", 10, 172, 0, 19], ["Dark Stump", 11, 236, 30, 21], ["Octopus", 12, 191, 0, 23],
    ["Green Mushroom", 14, 233, 0, 26], ["Bubbling", 15, 259, 20, 28], ["Axe Stump", 17, 371, 30, 32],
    ["Blue Mushroom", 19, 342, 10, 35], ["Ghost Stump", 19, 404, 15, 35], ["Stirge", 20, 296, 5, 37],
    ["Jr. Necki", 21, 272, 15, 39], ["Horny Mushroom", 22, 403, 10, 41], ["Dark Axe Stump", 23, 547, 30, 43],
    ["Wooden Mask", 23, 462, 0, 43], ["Zombie Mushroom", 24, 436, 10, 45], ["Rocky Mask", 24, 479, 30, 45],
    ["Wild Boar", 25, 510, 20, 46], ["Evil Eye", 27, 606, 10, 50], ["Fairy", 29, 593, 0, 54],
    ["Ligator", 31, 853, 10, 58], ["Fire Boar", 32, 842, 10, 60], ["Curse Eye", 33, 1001, 20, 63],
    ["Jr. Wraith", 34, 982, 30, 66], ["Jr. Boogie", 35, 1395, 50, 69], ["Lupin", 37, 1336, 5, 75],
    ["Lorang", 38, 1714, 20, 78], ["Glowshroom", 39, 1377, 15, 82], ["Cold Eye", 40, 1894, 10, 85],
    ["Raffle", 40, 1722, 20, 85], ["Zombie Lupin", 41, 1774, 5, 89], ["Golden Stirge", 42, 1278, 15, 93],
    ["Aqumander", 43, 2069, 20, 98], ["Skeledog", 44, 2134, 15, 102], ["Copper Drake", 45, 2379, 15, 107],
    ["Echopus", 45, 2163, 10, 107], ["Tortie", 46, 2226, 30, 111], ["Rafflesia", 47, 2285, 20, 117],
    ["Mummydog", 47, 2513, 15, 117], ["Wraith", 48, 2350, 30, 122], ["Clang", 49, 2657, 20, 127],
    ["Drake", 50, 2950, 15, 133], ["Duskmander", 50, 2682, 10, 133], ["Croco", 52, 3136, 10, 146],
    ["Myewood", 54, 3924, 20, 160], ["Malady", 55, 2998, 5, 167], ["Stone Golem", 56, 5134, 25, 175],
    ["Rotten Mushroom", 56, 3520, 20, 183], ["Skeleton Soldier", 57, 3872, 15, 183],
    ["Dark Stone Golem", 58, 5428, 5, 192], ["Sporewood", 59, 4834, 20, 201], ["Red Drake", 60, 5184, 15, 211],
    ["Wild Kargo", 62, 5057, 30, 231], ["Officer Skeleton", 63, 5976, 15, 242], ["Tauromacis", 70, 9328, 25, 337],
    ["Commander Skeleton", 73, 11915, 15, 390], ["Taurospear", 75, 12535, 5, 429],
    ["Mano (boss)", 20, 7420, 20, 148], ["King Slime (boss)", 32, 16820, 15, 2400],
    ["Stumpy (boss)", 35, 19220, 20, 276], ["Mushmom (boss)", 40, 34440, 15, 340],
    ["Shade (boss)", 48, 47000, 30, 488], ["Zombie Mushmom (boss)", 55, 66640, 10, 668],
    ["Rotten Mushmom (boss)", 60, 86400, 20, 844], ["Jr. Balrog (boss)", 80, 325400, 15, 2188]
  ];

  const MOB_ELEM = {
    "Stump": { fire: "weak" }, "Slime": { lightning: "weak" }, "Dark Stump": { fire: "weak" },
    "Octopus": { lightning: "weak" }, "Green Mushroom": { poison: "immune" }, "Bubbling": { lightning: "weak" },
    "Axe Stump": { fire: "weak" }, "Ghost Stump": { fire: "weak" }, "Dark Axe Stump": { fire: "weak" },
    "Zombie Mushroom": { holy: "weak" }, "Fairy": { holy: "resist", lightning: "resist", poison: "weak" },
    "Ligator": { fire: "weak", ice: "resist" }, "Fire Boar": { fire: "resist", ice: "weak" },
    "Curse Eye": { poison: "resist" }, "Jr. Wraith": { holy: "weak", fire: "weak" },
    "Jr. Boogie": { poison: "resist" }, "Lorang": { lightning: "weak" },
    "Cold Eye": { fire: "weak", ice: "resist" }, "Raffle": { fire: "weak", ice: "resist" },
    "Zombie Lupin": { holy: "weak" }, "Aqumander": { ice: "resist", lightning: "weak" },
    "Skeledog": { holy: "weak" }, "Copper Drake": { fire: "resist", ice: "weak" },
    "Echopus": { lightning: "weak" }, "Rafflesia": { fire: "weak", ice: "resist", poison: "resist" },
    "Mummydog": { holy: "weak" }, "Wraith": { holy: "weak" }, "Clang": { lightning: "weak" },
    "Drake": { fire: "resist", ice: "resist" }, "Duskmander": { ice: "weak", poison: "resist" },
    "Croco": { fire: "weak", ice: "resist" }, "Myewood": { fire: "weak", lightning: "resist" },
    "Malady": { holy: "weak", fire: "resist", ice: "resist" }, "Stone Golem": { poison: "resist" },
    "Rotten Mushroom": { holy: "weak", poison: "resist" }, "Skeleton Soldier": { holy: "weak" },
    "Dark Stone Golem": { holy: "weak", fire: "resist", poison: "resist" },
    "Sporewood": { holy: "weak", fire: "weak", poison: "resist" },
    "Red Drake": { fire: "resist", ice: "weak" }, "Officer Skeleton": { holy: "weak" },
    "Tauromacis": { ice: "weak", lightning: "resist" },
    "Commander Skeleton": { holy: "weak", ice: "resist", poison: "immune" },
    "Taurospear": { ice: "weak", lightning: "resist" }
  };

  const MOBS = MOB_ROWS.map(([name, lv, hp, def, exp]) =>
    ({ name, lv, hp, def, exp, elem: MOB_ELEM[name] || {} }));

  /* --- skill library --------------------------------------------------------
     Level tables transcribed from the MSCW skill database (henesys.gg skill pages):
     Basic Attack % = the skill's damage %, MP = cost per cast, mastery level scales the MIN roll.
     dotPct/dotSec = damage-over-time quoted as "% of a basic attack over N seconds".
     For skills where only Lv1 and max were published, the array is interpolated and flagged. */
  const SKILLS = {
    "power-strike": {
      name: "Power Strike", klass: "physical", element: "neutral", maxLevel: 20, hits: 1, targets: 1,
      pct: [160, 260], mp: [4, 12], interpolated: true,
      source: "MSCW skill DB: Lv1 160% / Lv20 260%, MP 4-12"
    },
    "slash-blast": {
      name: "Slash Blast", klass: "physical", element: "neutral", maxLevel: 20, hits: 1, targets: 6,
      pct: [70, 130], mp: [6, 14], interpolated: true,
      source: "MSCW skill DB: Lv1 70% / Lv20 130%, 6 targets, MP 6-14"
    },
    "fire-arrow": {
      name: "Fire Arrow", klass: "magic", element: "fire", maxLevel: 30, hits: 1, targets: 1,
      pct: [120, 122, 124, 126, 128, 130, 132, 134, 136, 138, 140, 142, 144, 146, 148, 150, 152, 154, 156, 158, 160, 162, 164, 166, 168, 170, 172, 174, 176, 180],
      mp: [14, 14, 14, 15, 15, 15, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 28],
      dotPct: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 50],
      dotSec: 3, dotChance: 1,
      source: "MSCW skill DB: Lv30 180%, MP 28, burn 50 over 3 sec; cannot burn fire-resistant mobs"
    },
    "poison-breath": {
      name: "Poison Breath", klass: "magic", element: "poison", maxLevel: 30, hits: 1, targets: 6,
      pct: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 90],
      mp: [20, 20, 22, 22, 22, 24, 24, 24, 26, 26, 26, 28, 28, 28, 30, 30, 30, 32, 32, 32, 34, 34, 34, 36, 36, 36, 38, 38, 38, 40],
      dotPct: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40],
      dotChanceList: [0.45, 0.46, 0.47, 0.48, 0.49, 0.50, 0.51, 0.52, 0.53, 0.54, 0.55, 0.56, 0.57, 0.58, 0.59, 0.60, 0.61, 0.62, 0.63, 0.64, 0.65, 0.66, 0.67, 0.68, 0.69, 0.70, 0.71, 0.72, 0.73, 0.75],
      dotSec: 5,
      source: "MSCW skill DB: Lv30 90%, MP 40, 6 targets, 75% chance, poison 40 over 5 sec; cannot poison poison-resistant mobs"
    },
    "magic-claw": {
      name: "Magic Claw", klass: "magic", element: "neutral", maxLevel: 20, hits: 2, targets: 1,
      pct: [45, 65], mp: [10, 20], interpolated: true,
      source: "MSCW skill DB: 2 hits, Lv1 45% / Lv20 65% per hit, MP 10-20"
    },
    "energy-bolt": {
      name: "Energy Bolt", klass: "magic", element: "neutral", maxLevel: 20, hits: 1, targets: 1,
      pct: [90, 130], mp: [8, 16], interpolated: true,
      source: "MSCW skill DB: Lv1 90% / Lv20 130%, MP 8-16"
    }
  };

  function atLevel(arr, lv, maxLevel) {
    if (!arr) return 0;
    const L = Math.max(1, Math.min(maxLevel || arr.length, lv || 1));
    if (arr.length >= (maxLevel || arr.length)) return arr[L - 1];
    // two-point table: linear between Lv1 and max
    const a = arr[0], b = arr[1];
    return a + (b - a) * (L - 1) / ((maxLevel || 2) - 1);
  }

  /* resolve a library skill at a level into a flat, ready-to-use skill object */
  function skillAt(id, lv, overrides) {
    const def = typeof id === "string" ? SKILLS[id] : id;
    if (!def) return null;
    const L = Math.max(1, Math.min(def.maxLevel, lv || def.maxLevel));
    const masteryByLevel = Math.min(10, 1 + Math.floor((L - 1) * 10 / (def.maxLevel - 1)));
    const sk = {
      id: typeof id === "string" ? id : def.id,
      name: def.name, klass: def.klass, element: def.element,
      level: L, pct: atLevel(def.pct, L, def.maxLevel),
      mp: atLevel(def.mp, L, def.maxLevel),
      hits: def.hitsByLevel ? Math.round(atLevel(def.hitsByLevel, L, def.maxLevel)) : (def.hits || 1),
      targets: def.targets || 1,
      spellMastery: masteryByLevel,
      dotPct: def.dotPct ? atLevel(def.dotPct, L, def.maxLevel) : 0,
      dotSec: def.dotSec || 0,
      dotChance: def.dotChanceList ? atLevel(def.dotChanceList, L, def.maxLevel) : (def.dotChance || 0),
      source: def.source
    };
    return Object.assign(sk, overrides || {});
  }

  /* --- core damage formulas ------------------------------------------------ */
  function mastery(ML) {
    const ml = Math.max(0, Math.min(10, ML == null ? 0 : ML));
    return (ml / 10 + 0.1) * 0.7;
  }

  function magicTotal(C) { return Math.floor((C.INT || 0) / 2) + (C.MATK || 0); }

  /* raw per-hit range BEFORE monster defense.
     spec = skill % number, or a skill object (pct / obsMin / obsMax). */
  function rawRange(spec, C) {
    const skill = (typeof spec === "number") ? { pct: spec } : (spec || {});
    const pct = skill.pct == null ? 100 : skill.pct;
    const S = pct / 100;

    // exact calibration: numbers read off your own damage lines (pre-defense)
    if (skill.obsMax > 0) {
      const lo = skill.obsMin > 0 ? skill.obsMin : skill.obsMax;
      return { min: Math.trunc(lo), max: Math.trunc(skill.obsMax), avg: (lo + skill.obsMax) / 2, observed: true };
    }
    if (C.mode === "observed") {
      return { min: C.obsMin * S, max: C.obsMax * S, avg: (C.obsMin + C.obsMax) / 2 * S, observed: true };
    }

    if (C.klass === "magic") {
      // MSCW magic: MAX = BA% x (floor(INT/2) + MATK) x (1 + INT/125); mastery only lifts MIN
      const mt = magicTotal(C);
      const int = C.INT || 0;
      const m = mastery(skill.spellMastery != null ? skill.spellMastery : C.ML);
      const span = (int) => S * mt * (1 + int / 125);
      return {
        min: Math.trunc(S * mt * (1 + int * m / 125)),
        max: Math.trunc(span(int)),
        avg: (S * mt * (1 + int * m / 125) + S * mt * (1 + int / 125)) / 2
      };
    }

    // physical
    const m = mastery(C.ML);
    const A = C.A || 0;
    const base = (roll, mf) => S * C.WATK * (roll + (C.P * mf * C.W + C.Q) / 100 + A / 50);
    return {
      // the client truncates each hit to an integer, so the stat window shows truncated corners
      min: Math.trunc(base(0.8, m)),
      max: Math.trunc(base(1.0, 1)),
      avg: S * C.WATK * (0.9 + (C.P * ((m + 1) / 2) * C.W + C.Q) / 100 + A / 50)
    };
  }

  /* what damage % does an observed hit line imply, given the stat block? */
  function impliedPct(obsMax, C) {
    const unit = C.klass === "magic"
      ? magicTotal(C)
      : C.WATK * (1 + (C.P * C.W + C.Q) / 100 + (C.A || 0) / 50);
    return unit > 0 ? obsMax / unit * 100 : null;
  }

  function elementMult(mob, element) {
    if (!element || element === "neutral") return 1;
    const state = (mob.elem || {})[element];
    return state && ELEM_MULT[state] != null ? ELEM_MULT[state] : 1;
  }

  function levelScale(playerLv, mobLv) {
    const gap = mobLv - playerLv;
    if (gap <= 0) return 1;
    if (gap < 10) return 1 / (1 + gap * gap * 0.005);
    return 1 / (1 + gap * 0.05);
  }

  /* raw -> on-mob per-hit numbers */
  function applyTarget(raw, mob, playerLv, C, elemMult) {
    const edef = Math.max(0, mob.def || 0);
    const defScale = 100 / (edef + 100);
    const ls = levelScale(playerLv, mob.lv);
    const c = (C.critRate || 0) / 100, d = (C.critDmg || 0) / 100;
    const crit = 1 + c * d;
    const e = elemMult == null ? 1 : elemMult;
    const post = v => Math.min(CAP, Math.max(1, v * defScale * e * ls * crit));
    const rawMaxPost = raw.max * defScale * e * ls * crit;
    return {
      // final on-screen damage is an integer per line
      min: Math.trunc(post(raw.min)), max: Math.trunc(post(raw.max)), avg: post(raw.avg),
      defScale, ls, elemMult: e, crit,
      capped: rawMaxPost > CAP,
      overflowPct: rawMaxPost > CAP ? (rawMaxPost / CAP - 1) * 100 : 0
    };
  }

  /* --- one skill vs one mob ------------------------------------------------ */
  /* sk: flat skill {name, element, pct, hits, targets, ms, mp, dotPct, dotSec, dotChance}
     N : how many mobs are actually in range */
  function evaluate(C, sk, mob, N) {
    const n = Math.max(1, N || 1);
    const em = elementMult(mob, sk.element);
    const raw = rawRange(sk, C);
    const hit = applyTarget(raw, mob, C.lv, C, em);

    const targets = Math.min(n, sk.targets || 1);
    const directPerCast = (sk.hits || 1) * hit.avg * targets;

    // DoT: quoted as "% of a basic attack", ignores monster defence (MSCW rule), keeps the element
    let dotTotal = 0, dotApplied = 0;
    if (sk.dotPct > 0) {
      const basicRaw100 = rawRange(100, C).avg;
      const dotRaw = (sk.dotPct / 100) * basicRaw100 * em;
      const blocked = sk.element === "fire" ? em < 1 : sk.element === "poison" ? em < 1 : false;
      dotApplied = blocked ? 0 : dotRaw * (sk.dotChance == null ? 1 : sk.dotChance);
      dotTotal = dotRaw;
    }

    const perCast = directPerCast + dotApplied;
    const dps = perCast * 1000 / (sk.ms || 750);
    const dotDps = sk.dotSec > 0 ? dotApplied / sk.dotSec : 0;
    // per-target killing speed: every target in range takes the same damage each cast
    const perTargetPerCast = perCast / targets;
    const casts = mob.hp > 0 ? Math.ceil(mob.hp / Math.max(perTargetPerCast, 1e-9)) : Infinity;
    const ttkMs = casts * (sk.ms || 750);
    const mpPerKill = targets > 0 ? casts * (sk.mp || 0) / targets : 0;
    const mpPerMin = (sk.mp || 0) * 60000 / (sk.ms || 750);
    const expPerMin = mob.exp > 0 ? (mob.exp * targets) / (ttkMs / 60000) : 0;

    return {
      skill: sk, raw, hit, elementMult: em,
      targets, directPerCast, dotTotal, dotApplied, dotDps,
      perCast, dps, casts, ttkMs, mpPerKill, mpPerMin,
      expPerMin, mpPerExp: expPerMin > 0 ? mpPerMin / expPerMin : 0,
      dotBlocked: sk.dotPct > 0 && dotApplied === 0,
      capWarning: hit.capped
    };
  }

  /* --- legacy two-skill analysis (1v1 vs mob attack), physical or magic ---- */
  function analyze(C, S, mob, elemOrN, maybeN) {
    // tolerate the old signature analyze(C,S,mob,elemMult,N) used by earlier tests
    const N = maybeN != null ? maybeN : (typeof elemOrN === "number" ? elemOrN : 1);
    const a = evaluate(C, S.one, mob, 1);
    const perTarget = evaluate(C, S.mob, mob, 1);
    const b = evaluate(C, S.mob, mob, N);
    const cap = S.mob.targets || 1;
    const needed = perTarget.dps > 0 ? Math.ceil(a.dps / perTarget.dps - 1e-9) : Infinity;
    return {
      rawOne: a.raw, rawMob: b.raw, one: a.hit, mobH: b.hit,
      castOne: a.directPerCast, perTargetMob: perTarget.directPerCast, targets: b.targets, castMob: b.perCast,
      dpsOne: a.dps, dpsMob: b.dps, dpsMobPerTarget: perTarget.dps,
      needed,
      neverWins: !isFinite(needed) || needed > cap,
      mobWins: b.dps > a.dps,
      marginPct: a.dps > 0 ? (b.dps / a.dps - 1) * 100 : 0,
      ttkOne: { casts: a.casts, ms: a.ttkMs, epm: a.expPerMin },
      ttkMob: { casts: b.casts, ms: b.ttkMs, epm: b.expPerMin },
      basic: applyTarget(rawRange(100, C), mob, C.lv, C, 1),
      statWindow: rawRange(100, C)
    };
  }

  /* --- compare any two skills on one mob (the F/P use case) ---------------- */
  function compare(C, skills, mob, N) {
    const results = skills.map(sk => evaluate(C, sk, mob, N));
    const best = results.slice().sort((x, y) => y.expPerMin - x.expPerMin)[0];
    return { results, best };
  }

  /* rank every non-boss mob in the level window by EXP/min for the best of the given skills */
  function rankMobs(C, skills, opts) {
    const o = opts || {};
    const up = o.up == null ? 8 : o.up;
    const down = o.down == null ? 12 : o.down;
    const list = Array.isArray(skills) ? skills : [skills];
    const out = [];
    for (const mob of MOBS) {
      if (/boss/i.test(mob.name)) continue;
      const gap = mob.lv - C.lv;
      if (gap > up || gap < -down) continue;
      const evals = list.map(sk => evaluate(C, sk, mob, o.n || 1));
      const best = evals.slice().sort((x, y) => y.expPerMin - x.expPerMin)[0];
      out.push({
        name: mob.name, lv: mob.lv, hp: mob.hp, def: mob.def, exp: mob.exp, elem: mob.elem,
        skills: evals, best,
        epm: best.expPerMin, casts: best.casts, ttkMs: best.ttkMs,
        skill: best.skill.name, which: best.skill.id || best.skill.name,
        elementMult: best.elementMult, mpPerKill: best.mpPerKill
      });
    }
    out.sort((x, y) => y.epm - x.epm);
    return out;
  }

  /* --- self-check against documented MSCW numbers -------------------------- */
  function selfCheck() {
    const ref = { lv: 30, mode: "stats", klass: "physical", P: 132, Q: 30, WATK: 47, A: 0, ML: 0, W: 1.8, critRate: 0, critDmg: 0 };
    const refMastered = Object.assign({}, ref, { ML: 10 });
    const b0 = rawRange(100, ref), p0 = rawRange(260, ref);
    const b10 = rawRange(100, refMastered), p10 = rawRange(260, refMastered);

    // MSCW damage-calculator reference block: 2H sword 2.5, STR 180 / DEX 60 / 70 W.ATK, mastery 10
    const calc = { lv: 50, mode: "stats", klass: "physical", P: 180, Q: 60, WATK: 70, A: 0, ML: 10, W: 2.5, critRate: 0, critDmg: 0 };
    const ps = rawRange(260, calc);
    const polearm0 = Object.assign({}, calc, { W: 2.7, ML: 0 });
    const psPole0 = rawRange(260, polearm0);
    const polearmGear = Object.assign({}, calc, { W: 2.7, ML: 10, A: 10 });
    const psPoleGear = rawRange(260, polearmGear);

    // magic: MAX = BA% x (floor(INT/2) + MATK) x (1 + INT/125)
    const mage = { lv: 40, mode: "stats", klass: "magic", INT: 300, MATK: 100, ML: 10, spellMastery: 10 };
    const fireArrow = skillAt("fire-arrow", 30);
    const faMax = rawRange(Object.assign({}, fireArrow, { spellMastery: 10 }), mage);

    const cases = [
      { name: "basic attack, mastery 0", got: [b0.min, b0.max], want: [59, 172], src: "MSCW formula write-up" },
      { name: "Power Strike 260%, mastery 0", got: [p0.min, p0.max], want: [154, 449], src: "MSCW formula write-up" },
      { name: "basic attack, mastery 10", got: [b10.min, b10.max], want: [137, 172], src: "MSCW formula write-up" },
      { name: "Power Strike 260%, mastery 10", got: [p10.min, p10.max], want: [357, 449], src: "MSCW formula write-up" },
      { name: "Power Strike 260%, 2H sword block", got: [ps.min, ps.max], want: [885, 1110], src: "MSCW damage calculator output" },
      { name: "Polearm x2.7, mastery 0", got: [psPole0.min, psPole0.max], want: [316, 1175], src: "MSCW damage calculator output" },
      { name: "Polearm x2.7, +10 attack power", got: [psPoleGear.min, psPoleGear.max], want: [972, 1212], src: "MSCW damage calculator output" },
      { name: "WDEF 20 curve", got: [applyTarget(ps, { lv: 33, def: 20 }, 50, calc, 1).defScale], want: [0.8333], src: "MSCW damage calculator modifier" },
      { name: "level gap 13", got: [levelScale(20, 33)], want: [1 / 1.65], src: "MSCW damage calculator modifier" },
      { name: "Fire Arrow 180%, INT 300 / MATK 100 (MAX)", got: [faMax.max], want: [1.8 * (150 + 100) * (1 + 300 / 125)], src: "MSCW magic formula" }
    ].map(c => {
      const pass = c.got.every((g, i) => Math.abs(g - c.want[i]) <= (Math.abs(c.want[i]) < 2 ? 0.001 : 1));
      return Object.assign({ pass }, c);
    });
    return { cases, pass: cases.every(c => c.pass) };
  }


  /* --- class / subclass structure (MSCW launch: Beginner + 4 branches) ----- */
  const CLASSES = [
    { id: "beginner", name: "Beginner", klass: "physical", jobs: [{ id: "beginner", name: "Beginner" }] },
    { id: "warrior", name: "Warrior", klass: "physical", jobs: [
      { id: "warrior", name: "Warrior" }, { id: "fighter", name: "Fighter" },
      { id: "page", name: "Page" }, { id: "spearman", name: "Spearman" }] },
    { id: "magician", name: "Magician", klass: "magic", jobs: [
      { id: "magician", name: "Magician" }, { id: "fp", name: "F/P Wizard" },
      { id: "il", name: "I/L Wizard" }, { id: "cleric", name: "Cleric" }] },
    { id: "bowman", name: "Bowman", klass: "physical", jobs: [
      { id: "archer", name: "Archer" }, { id: "hunter", name: "Hunter" },
      { id: "crossbowman", name: "Crossbowman" }] },
    { id: "thief", name: "Thief", klass: "physical", jobs: [
      { id: "rogue", name: "Rogue" }, { id: "assassin", name: "Assassin" },
      { id: "bandit", name: "Bandit" }] }
  ];

  /* Weapon action multipliers read one at a time off the MSCW damage calculator.
     MSCW uses a single mixed-action average per weapon - there is no swing/stab split. */
  const WEAPON_LIST = [
    { id: "sword1h", name: "One-Handed Sword", w: 1.8, primary: "STR", secondary: "DEX", classes: ["beginner", "warrior", "fighter", "page"] , tier: 5, tierRange: [4, 5] },
    { id: "sword2h", name: "Two-Handed Sword", w: 2.5, primary: "STR", secondary: "DEX", classes: ["warrior", "fighter", "page"] , tier: 6, tierRange: [5, 6] },
    { id: "axe1h", name: "One-Handed Axe", w: 1.92, primary: "STR", secondary: "DEX", classes: ["beginner", "warrior", "fighter", "page"] , tier: 5, tierRange: [4, 5] },
    { id: "axe2h", name: "Two-Handed Axe", w: 2.6, primary: "STR", secondary: "DEX", classes: ["warrior", "fighter", "spearman"] , tier: 6, tierRange: [5, 6] },
    { id: "blunt1h", name: "One-Handed Blunt", w: 1.92, primary: "STR", secondary: "DEX", classes: ["beginner", "warrior", "page"] , tier: 5, tierRange: [4, 5] },
    { id: "blunt2h", name: "Two-Handed Blunt", w: 2.6, primary: "STR", secondary: "DEX", classes: ["warrior", "page"] , tier: 7, tierRange: [6, 7] },
    { id: "spear", name: "Spear", w: 2.3, primary: "STR", secondary: "DEX", classes: ["warrior", "spearman"] , tier: 7, tierRange: [6, 7] },
    { id: "polearm", name: "Polearm", w: 2.7, primary: "STR", secondary: "DEX", classes: ["warrior", "spearman"] , tier: 8, tierRange: [7, 8] },
    { id: "bow", name: "Bow", w: 2.5, primary: "DEX", secondary: "STR", classes: ["archer", "hunter"] , tier: 6, tierRange: [5, 6] },
    { id: "crossbow", name: "Crossbow", w: 2.5, primary: "DEX", secondary: "STR", classes: ["archer", "crossbowman"] , tier: 7, tierRange: [6, 7] },
    { id: "claw", name: "Claw", w: 3.0, primary: "LUK", secondary: "STR + DEX", classes: ["rogue", "assassin"] , tier: 5, tierRange: [3, 5] },
    { id: "dagger", name: "Dagger", w: 2.0, primary: "LUK", secondary: "STR + DEX", classes: ["rogue", "bandit"] , tier: 4, tierRange: [3, 4] },
    { id: "wand", name: "Wand / Staff", w: 0, primary: "INT", secondary: "MATK", magic: true, tier: 6, tierRange: [6, 7], classes: ["magician", "fp", "il", "cleric"] }
  ];

  /* attack skills that are not in the base library above.
     Values are the MSCW skill database's Lv1 -> max line; MP is per cast. */
  const MORE_SKILLS = {
    regular: { name: "Regular attack", klass: "physical", element: "neutral", maxLevel: 1, hits: 1, targets: 1,
      pct: [100, 100], mp: [0, 0], interpolated: false, source: "MSCW: unskilled weapon swing, 100%" },
    rush: { name: "Rush", klass: "physical", element: "neutral", maxLevel: 20, hits: 1, targets: 6,
      pct: [60, 80], mp: [35, 15], interpolated: true, source: "MSCW skill DB: 60-80% on 6 targets, MP 35-15" },
    "arrow-blow": { name: "Arrow Blow", klass: "physical", element: "neutral", maxLevel: 20, hits: 1, targets: 1,
      pct: [160, 240], mp: [6, 14], interpolated: true, source: "MSCW skill DB: 160-240%, MP 6-14" },
    "double-shot": { name: "Double Shot", klass: "physical", element: "neutral", maxLevel: 20, hits: 2, targets: 2,
      pct: [80, 120], mp: [8, 16], interpolated: true,
      source: "MSCW skill DB: two shots, 80-120% each, 'up to 2 targets', MP 8-16" },
    "arrow-bomb": { name: "Arrow Bomb", klass: "physical", element: "neutral", maxLevel: 30, hits: 1, targets: 6,
      pct: [70, 130], mp: [14, 28], interpolated: true, source: "MSCW skill DB: 70-130% on 6 targets, MP 14-28" },
    "iron-arrow": { name: "Iron Arrow", klass: "physical", element: "neutral", maxLevel: 30, hits: 1, targets: 6,
      pct: [120, 180], mp: [14, 28], interpolated: true, source: "MSCW skill DB: 120-180% on 6 targets, MP 14-28" },
    "cold-beam": { name: "Cold Beam", klass: "magic", element: "ice", maxLevel: 30, hits: 1, targets: 1,
      pct: [110, 170], mp: [11, 22], interpolated: true, source: "MSCW skill DB: 110-170%, MP 11-22" },
    "thunder-bolt": { name: "Thunder Bolt", klass: "magic", element: "lightning", maxLevel: 30, hits: 1, targets: 6,
      pct: [50, 80], mp: [20, 40], interpolated: true, source: "MSCW skill DB: 50-80% on 6 targets, MP 20-40" },
    "holy-arrow": { name: "Holy Arrow", klass: "magic", element: "holy", maxLevel: 30, hits: 1, targets: 1,
      pct: [100, 160], mp: [14, 28], interpolated: true, source: "MSCW skill DB: 100-160%, MP 14-28" },
    "lucky-seven": { name: "Lucky Seven", klass: "physical", element: "neutral", maxLevel: 20, hits: 2, targets: 1,
      pct: [60, 140], mp: [8, 16], interpolated: true, source: "MSCW skill DB: 60-140% per star, MP 8-16" },
    "double-stab": { name: "Double Stab", klass: "physical", element: "neutral", maxLevel: 20, hits: 2, targets: 1,
      pct: [80, 160], mp: [8, 16], interpolated: true, source: "MSCW skill DB: 80-160% per stab, MP 8-16" },
    "savage-blow": { name: "Savage Blow", klass: "physical", element: "neutral", maxLevel: 30, hits: 6, targets: 1,
      hitsByLevel: [4, 6], pct: [65, 75], mp: [14, 28], interpolated: true,
      source: "MSCW skill DB: 4 hits at Lv1 rising to 6 hits, 65-75% per hit, MP 14-28" },
    drain: { name: "Drain", klass: "physical", element: "neutral", maxLevel: 30, hits: 1, targets: 1,
      pct: [180, 240], mp: [14, 28], interpolated: true, source: "MSCW skill DB: 180-240%, MP 14-28" }
  };

  const SKILL_JOBS = {
    regular: ["all"],
    "power-strike": ["warrior", "fighter", "page", "spearman"],
    "slash-blast": ["warrior", "fighter", "page", "spearman"],
    rush: ["fighter", "page", "spearman"],
    "arrow-blow": ["archer", "hunter", "crossbowman"],
    "double-shot": ["archer", "hunter", "crossbowman"],
    "arrow-bomb": ["hunter"],
    "iron-arrow": ["crossbowman"],
    "energy-bolt": ["magician", "fp", "il", "cleric"],
    "magic-claw": ["magician", "fp", "il", "cleric"],
    "fire-arrow": ["fp"],
    "poison-breath": ["fp"],
    "cold-beam": ["il"],
    "thunder-bolt": ["il"],
    "holy-arrow": ["cleric"],
    "lucky-seven": ["rogue", "assassin", "bandit"],
    "double-stab": ["rogue", "bandit"],
    "savage-blow": ["bandit"],
    drain: ["assassin"]
  };

  /* the pair each job actually trains with: [1v1 skill, mobbing skill] */
  const JOB_DEFAULTS = {
    beginner: ["regular", "regular"],
    warrior: ["power-strike", "slash-blast"], fighter: ["power-strike", "rush"],
    page: ["power-strike", "rush"], spearman: ["power-strike", "rush"],
    magician: ["energy-bolt", "magic-claw"], fp: ["fire-arrow", "poison-breath"],
    il: ["cold-beam", "thunder-bolt"], cleric: ["holy-arrow", "magic-claw"],
    archer: ["arrow-blow", "double-shot"], hunter: ["arrow-bomb", "arrow-blow"],
    crossbowman: ["iron-arrow", "arrow-blow"],
    rogue: ["lucky-seven", "double-stab"], assassin: ["drain", "lucky-seven"],
    bandit: ["savage-blow", "double-stab"]
  };

  /* the weapon each job is normally built around */
  const JOB_WEAPON = {
    beginner: "sword1h", warrior: "sword1h", fighter: "sword2h", page: "sword1h", spearman: "spear",
    magician: "wand", fp: "wand", il: "wand", cleric: "wand",
    archer: "bow", hunter: "bow", crossbowman: "crossbow",
    rogue: "dagger", assassin: "claw", bandit: "dagger"
  };

  Object.assign(SKILLS, MORE_SKILLS);
  Object.keys(SKILL_JOBS).forEach(k => { if (SKILLS[k]) SKILLS[k].jobs = SKILL_JOBS[k]; });

  function classById(id) { return CLASSES.find(c => c.id === id) || CLASSES[0]; }
  function jobById(classId, jobId) {
    const c = classById(classId);
    return c.jobs.find(j => j.id === jobId) || c.jobs[0];
  }
  function weaponsFor(classId, jobId) {
    return WEAPON_LIST.filter(w => w.classes.indexOf(jobId) >= 0 || w.classes.indexOf(classId) >= 0);
  }
  /* skills available to a job: its own, its class's 1st-job skills, and universal ones */
  function skillsFor(classId, jobId) {
    return Object.keys(SKILLS).filter(k => {
      const j = SKILLS[k].jobs || [];
      return j.indexOf("all") >= 0 || j.indexOf(jobId) >= 0 || j.indexOf(classId) >= 0;
    });
  }


  /* --- buffs that change damage -------------------------------------------
     Meditation and Rage are party-wide in MSCW; the rest are your own passives.
     Values are the skill database's Lv1 -> max line, interpolated per level. */
  const BUFFS = {
    rage: {
      name: "Rage", party: true, maxLevel: 30, jobs: ["warrior", "fighter", "page", "spearman"],
      effects: [{ stat: "A", from: 10, to: 40 }],
      note: "Attack Power +10 → +40, party-wide"
    },
    meditation: {
      name: "Meditation", party: true, maxLevel: 20, jobs: ["magician", "fp", "il", "cleric"],
      effects: [{ stat: "MATK", from: 5, to: 25 }],
      note: "Party Magic Attack +5 → +25"
    },
    "claw-mastery": {
      name: "Claw Mastery", maxLevel: 20, jobs: ["assassin"],
      effects: [{ stat: "A", from: 1, to: 20 }], note: "Passive: Attack Power +1 → +20"
    },
    "precise-strikes": {
      name: "Precise Strikes", maxLevel: 15, jobs: ["warrior", "fighter", "page", "spearman"],
      effects: [{ stat: "critRate", from: 1, to: 5 }], note: "Passive: critical rate +1 → +5%"
    },
    "critical-shot": {
      name: "Critical Shot", maxLevel: 15, jobs: ["archer", "hunter", "crossbowman"],
      effects: [{ stat: "critRate", from: 5, to: 20 }, { stat: "critDmg", from: 1, to: 15 }],
      note: "Passive: +5 → +20% crit rate, +1 → +15% crit damage"
    },
    "critical-throw": {
      name: "Critical Throw", maxLevel: 30, jobs: ["assassin", "bandit"],
      effects: [{ stat: "critDmg", from: 5, to: 35 }, { stat: "critRate", from: 1, to: 15 }],
      note: "Passive: critical damage +5 → +35%, rate +1 → +15%"
    },
    "crossbow-mastery": {
      name: "Crossbow Mastery", maxLevel: 20, jobs: ["crossbowman"],
      effects: [{ stat: "critDmg", from: 1, to: 20 }], note: "Passive: critical damage +1 → +20%"
    },
    "dagger-mastery": {
      name: "Dagger Mastery", maxLevel: 20, jobs: ["rogue", "bandit"],
      effects: [{ stat: "critRate", from: 1, to: 20 }], note: "Passive: critical rate +1 → +20%"
    },
    "blunt-mastery": {
      name: "Blunt Weapon Mastery", maxLevel: 20, jobs: ["page"],
      effects: [{ stat: "critDmg", from: 1, to: 20 }], note: "Passive: critical damage +1 → +20%"
    }
  };

  function buffValue(def, eff, lv) {
    const L = Math.max(1, Math.min(def.maxLevel, lv));
    if (def.maxLevel <= 1) return eff.to;
    return eff.from + (eff.to - eff.from) * (L - 1) / (def.maxLevel - 1);
  }

  function buffsFor(classId, jobId) {
    return Object.keys(BUFFS).filter(k => {
      const j = BUFFS[k].jobs || [];
      return j.indexOf("all") >= 0 || j.indexOf(jobId) >= 0 || j.indexOf(classId) >= 0;
    });
  }

  /* the part of the damage formula a stat buff actually multiplies */
  function buffUnit(C) {
    if (C.klass === "magic") return magicTotal(C);
    return 1 + ((((C.P || 0) * (C.W || 0)) + (C.Q || 0)) / 100) + ((C.A || 0) / 50);
  }

  /* levels = { buffId: level }; 0 or missing = inactive */
  function applyBuffs(C, levels) {
    const out = Object.assign({}, C);
    const before = buffUnit(out);
    const applied = [];
    Object.keys(levels || {}).forEach(id => {
      const def = BUFFS[id], lv = levels[id];
      if (!def || !lv || lv <= 0) return;
      def.effects.forEach(e => {
        const v = buffValue(def, e, lv);
        out[e.stat] = (out[e.stat] || 0) + v;
        if (e.stat === "critRate") out.critRate = Math.min(100, out.critRate);
        applied.push({ id, name: def.name, stat: e.stat, value: v, level: lv });
      });
    });
    // observed ranges already contain the player's own buffs, so a buff can only be modelled
    // as the share of the attack term it adds
    if (out.mode === "observed") {
      const k = before > 0 ? buffUnit(out) / before : 1;
      if (out.obsMin > 0) out.obsMin = out.obsMin * k;
      if (out.obsMax > 0) out.obsMax = out.obsMax * k;
      out.buffScale = k;
    }
    return { C: out, applied };
  }


  /* --- cast / animation timing (MSCW) -------------------------------------
     Speed ladder in milliseconds per tier, straight off the MSCW attack-speed guide.
     Every magician spell is a fixed 810 ms with any weapon; Spell Booster 1-10 750 ms,
     11+ 720 ms. Weapon skills follow the ladder for their weapon tier, and the Booster
     moves two tiers. Skill-specific times are the guide's own rows. */
  const SPEED_LADDER = [510, 570, 600, 660, 720, 750, 810, 870, 900, 960, 1020];
  const SPEED_LABEL = ["Super Fast (0)", "Super Fast (1)", "Very Fast (2)", "Very Fast (3)", "Fast (4)",
    "Fast (5)", "Average (6)", "Slow (7)", "Slow (8)", "Very Slow (9)", "Super Slow (10+)"];

  const ANIM_MAPS = {
    "power-strike": { 5: 750, 4: 720 },
    "slash-blast": { 5: 750, 4: 720 },
    rush: { 8: 450, 4: 360 },
    "double-stab": { 4: 720, 3: 660 },
    "lucky-seven": { 5: 750, 3: 660 },
    drain: { 5: 750, 3: 660 },
    "savage-blow": { 4: 840, 3: 780 },
    "arrow-blow": { 6: 810, 5: 750 },
    "double-shot": { 6: 810, 5: 750 },
    "arrow-bomb": { 6: 810, 5: 750 },
    "iron-arrow": { 7: 870, 6: 840 },
    regular: { 6: 810 }
  };
  const MAGIC_CAST_MS = 810;
  const SPELL_BOOSTER_MS = { 0: 810, 1: 750, 11: 720 };

  function ladderMs(tier) {
    const t = Math.max(0, Math.min(SPEED_LADDER.length - 1, Math.round(tier)));
    return SPEED_LADDER[t];
  }
  /* a skill's animation as a multiple of the weapon-speed ladder, anchored on the
     published row (guide rounds to 30 ms, so a transformed value is a model, not a measurement) */
  function animFactor(id) {
    const map = ANIM_MAPS[id];
    if (!map) return 1;
    const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
    let sum = 0, n = 0;
    keys.forEach(t => { const l = ladderMs(t); if (l > 0) { sum += map[t] / l; n++; } });
    return n ? sum / n : 1;
  }
  /* ms for one cast of this skill
     opts: { tier: weapon speed tier, booster: bool, spellBooster: 0|level } */
  function castTime(id, opts) {
    const o = opts || {};
    const def = SKILLS[id];
    const magic = def ? def.klass === "magic" : false;
    if (magic) {
      if (id === "heal") return 600;
      const sb = o.spellBooster || 0;
      return sb >= 11 ? SPELL_BOOSTER_MS[11] : sb >= 1 ? SPELL_BOOSTER_MS[1] : MAGIC_CAST_MS;
    }
    const tier = Math.max(0, Math.min(10, (o.tier == null ? 6 : o.tier) - (o.booster ? 2 : 0)));
    const ms = ladderMs(tier) * animFactor(id);
    return Math.max(300, Math.min(1050, Math.round(ms / 30) * 30));
  }

  const api = {
    CAP, MOBS, MOB_ELEM, SKILLS, ELEM_MULT, CLASSES, WEAPON_LIST, SKILL_JOBS, JOB_DEFAULTS, JOB_WEAPON, BUFFS, SPEED_LADDER, SPEED_LABEL, MAGIC_CAST_MS,
    castTime, ladderMs, animFactor, buffValue, buffsFor, applyBuffs, buffUnit,
    classById, jobById, weaponsFor, skillsFor,
    mastery, magicTotal, rawRange, impliedPct, elementMult, levelScale, applyTarget,
    skillAt, atLevel, evaluate, analyze, compare, rankMobs, selfCheck
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MSC = api;
})(typeof window !== "undefined" ? window : globalThis);
