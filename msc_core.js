/* msc_core.js — MapleStory Classic World damage + training math.
   Pure functions, no DOM. Loaded by msc_train_calc.html and by msc_test.js (Node). */
(function (root) {
  const CAP = 99999;

  /* name, level, HP, P.DEF, EXP — static starter table, levels 1-80 (edit in-game as needed) */
  const MOBS = [
    ["Snail",1,45,0,2],["Blue Snail",2,51,0,4],["Shroom",3,62,0,6],["Red Snail",4,68,15,8],
    ["Stump",5,133,30,10],["Slime",6,115,10,12],["Pig",7,128,0,13],["Orange Mushroom",8,142,0,15],
    ["Ribbon Pig",10,172,0,19],["Dark Stump",11,236,30,21],["Octopus",12,191,0,23],
    ["Green Mushroom",14,233,0,26],["Bubbling",15,259,20,28],["Axe Stump",17,371,30,32],
    ["Blue Mushroom",19,342,10,35],["Ghost Stump",19,404,15,35],["Stirge",20,296,5,37],
    ["Jr. Necki",21,272,15,39],["Horny Mushroom",22,403,10,41],["Dark Axe Stump",23,547,30,43],
    ["Wooden Mask",23,462,0,43],["Zombie Mushroom",24,436,10,45],["Rocky Mask",24,479,30,45],
    ["Wild Boar",25,510,20,46],["Evil Eye",27,606,10,50],["Fairy",29,593,0,54],
    ["Ligator",31,853,10,58],["Fire Boar",32,842,10,60],["Curse Eye",33,1001,20,63],
    ["Jr. Wraith",34,982,30,66],["Jr. Boogie",35,1395,50,69],["Lupin",37,1336,5,75],
    ["Lorang",38,1714,20,78],["Glowshroom",39,1377,15,82],["Cold Eye",40,1894,10,85],
    ["Raffle",40,1722,20,85],["Zombie Lupin",41,1774,5,89],["Golden Stirge",42,1278,15,93],
    ["Aqumander",43,2069,20,98],["Skeledog",44,2134,15,102],["Copper Drake",45,2379,15,107],
    ["Echopus",45,2163,10,107],["Tortie",46,2226,30,111],["Rafflesia",47,2285,20,117],
    ["Mummydog",47,2513,15,117],["Wraith",48,2350,30,122],["Clang",49,2657,20,127],
    ["Drake",50,2950,15,133],["Duskmander",50,2682,10,133],["Croco",52,3136,10,146],
    ["Myewood",54,3924,20,160],["Malady",55,2998,5,167],["Stone Golem",56,5134,25,175],
    ["Rotten Mushroom",56,3520,20,183],["Skeleton Soldier",57,3872,15,183],
    ["Dark Stone Golem",58,5428,5,192],["Sporewood",59,4834,20,201],["Red Drake",60,5184,15,211],
    ["Wild Kargo",62,5057,30,231],["Officer Skeleton",63,5976,15,242],["Tauromacis",70,9328,25,337],
    ["Commander Skeleton",73,11915,15,390],["Taurospear",75,12535,5,429],
    ["Mano (boss)",20,7420,20,148],["King Slime (boss)",32,16820,15,2400],
    ["Stumpy (boss)",35,19220,20,276],["Mushmom (boss)",40,34440,15,340],
    ["Shade (boss)",48,47000,30,488],["Zombie Mushmom (boss)",55,66640,10,668],
    ["Rotten Mushmom (boss)",60,86400,20,844],["Jr. Balrog (boss)",80,325400,15,2188]
  ];

  /* C = character: {lv, P, Q, WATK, A, ML, W, critRate, critDmg, mode, obsMin, obsMax}
     Skill = {name, pct, hits, cap, ms} */

  function mastery(ML) {
    const ml = Math.max(0, Math.min(10, ML || 0));
    return (ml / 10 + 0.1) * 0.7;
  }

  /* raw per-hit range BEFORE monster defense. mode 'observed' scales the stat-window range by skill %. */
  function rawRange(pct, C) {
    const S = pct / 100;
    if (C.mode === 'observed') {
      return { min: C.obsMin * S, max: C.obsMax * S, avg: (C.obsMin + C.obsMax) / 2 * S };
    }
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

  /* full analysis for one mob + one "mobs on screen" count */
  function analyze(C, S, mob, elemMult, N) {
    const n = Math.max(1, N || 1);
    const rawOne = rawRange(S.one.pct, C);
    const rawMob = rawRange(S.mob.pct, C);
    const one = applyTarget(rawOne, mob, C.lv, C, elemMult);
    const mobH = applyTarget(rawMob, mob, C.lv, C, elemMult);

    const castOne = S.one.hits * one.avg;                       // single target
    const perTargetMob = S.mob.hits * mobH.avg;                 // one target hit by the AoE skill
    const targets = Math.min(n, S.mob.cap);
    const castMob = perTargetMob * targets;

    const dpsOne = castOne * 1000 / S.one.ms;
    const dpsMob = castMob * 1000 / S.mob.ms;
    const dpsMobPerTarget = perTargetMob * 1000 / S.mob.ms;

    const neededRaw = dpsMobPerTarget > 0 ? dpsOne / dpsMobPerTarget : Infinity;
    const needed = Math.ceil(neededRaw - 1e-9);
    const neverWins = !isFinite(needed) || needed > S.mob.cap;

    // time-to-kill + exp/min on this mob, each skill alone
    function ttk(skill, perCastDamage) {
      if (perCastDamage <= 0) return { casts: Infinity, ms: Infinity, epm: 0 };
      const casts = Math.ceil((mob.hp || 1) / perCastDamage);
      const ms = casts * skill.ms;
      return { casts, ms, epm: (mob.exp || 0) / (ms / 60000) };
    }
    const rOne = ttk(S.one, castOne);
    const rMob = ttk(S.mob, castMob);

    return {
      rawOne, rawMob, one, mobH,
      castOne, perTargetMob, targets, castMob,
      dpsOne, dpsMob, dpsMobPerTarget,
      needed, neverWins,
      mobWins: dpsMob > dpsOne,
      marginPct: dpsOne > 0 ? (dpsMob / dpsOne - 1) * 100 : 0,
      ttkOne: rOne, ttkMob: rMob,
      basic: applyTarget(rawRange(100, C), mob, C.lv, C, elemMult),
      statWindow: rawRange(100, C)
    };
  }

  /* rank every non-boss mob in the level window by EXP/min using its better skill */
  function rankMobs(C, S, elemMult, opts) {
    const o = opts || {};
    const up = o.up == null ? 8 : o.up;
    const down = o.down == null ? 12 : o.down;
    const out = [];
    for (const row of MOBS) {
      const [name, lv, hp, def, exp] = row;
      if (/boss/i.test(name)) continue;
      const gap = lv - C.lv;
      if (gap > up || gap < -down) continue;
      const mob = { name, lv, hp, def, exp };
      const a = analyze(C, S, mob, elemMult, 1);
      const useMob = a.ttkMob.epm >= a.ttkOne.epm;
      const pick = useMob ? a.ttkMob : a.ttkOne;
      out.push({
        name, lv, hp, def, exp,
        epm: pick.epm, casts: pick.casts, ttkMs: pick.ms,
        skill: useMob ? S.mob.name : S.one.name,
        which: useMob ? 'mob' : 'one'
      });
    }
    out.sort((x, y) => y.epm - x.epm);
    return out;
  }

  const api = { CAP, MOBS, mastery, rawRange, levelScale, applyTarget, analyze, rankMobs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MSC = api;
})(typeof window !== 'undefined' ? window : globalThis);
