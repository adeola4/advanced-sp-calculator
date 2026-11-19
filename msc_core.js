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
      hits: def.hits || 1, targets: def.targets || 1,
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

  const api = {
    CAP, MOBS, MOB_ELEM, SKILLS, ELEM_MULT,
    mastery, magicTotal, rawRange, impliedPct, elementMult, levelScale, applyTarget,
    skillAt, atLevel, evaluate, analyze, compare, rankMobs, selfCheck
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MSC = api;
})(typeof window !== "undefined" ? window : globalThis);
