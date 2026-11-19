// msc_test.js — executes the shipped math module against published anchors.
const MSC = require('./msc_core.js');

let fails = 0;
function ok(name, got, want, tol) {
  const pass = Math.abs(got - want) <= (tol == null ? 1 : tol);
  if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: got ${got.toFixed(3)} want ${want}${tol ? ' ±' + tol : ''}`);
}

// --- anchor 1: published level-30 warrior, clean Gladius (47 W.ATK), STR 132 / DEX 30, 1H sword 1.8, mastery 0
const base = { lv: 30, mode: 'stats', P: 132, Q: 30, WATK: 47, A: 0, ML: 0, W: 1.8, critRate: 0, critDmg: 0 };
const basic0 = MSC.rawRange(100, base);
ok('basic attack MIN (mastery 0)', basic0.min, 59, 0.6);
ok('basic attack MAX (mastery 0)', basic0.max, 172, 0.6);
const ps0 = MSC.rawRange(260, base);
ok('Power Strike MIN (mastery 0)', ps0.min, 154, 1);
ok('Power Strike MAX (mastery 0)', ps0.max, 449, 1);

// --- anchor 2: same warrior with max Sword Mastery (mastery level 10)
const mastered = Object.assign({}, base, { ML: 10 });
const basic10 = MSC.rawRange(100, mastered);
ok('basic attack MIN (mastery 10)', basic10.min, 137, 1);
ok('basic attack MAX (mastery 10)', basic10.max, 172, 0.6);
const ps10 = MSC.rawRange(260, mastered);
ok('Power Strike MIN (mastery 10)', ps10.min, 357, 1.5);
ok('Power Strike MAX (mastery 10)', ps10.max, 449, 1);

// --- anchor 3: defense curve  Raw * 100/(DEF+100)  — Curse Eye P.DEF 20 => x0.8333
const curseEye = { name: 'Curse Eye', lv: 33, hp: 1001, def: 20, exp: 63 };
const hit = MSC.applyTarget(ps10, curseEye, 30, mastered, 1);
ok('defense curve on 20 P.DEF', hit.defScale, 100 / 120, 1e-9);
ok('curse eye avg after def (lv gap 3)', hit.avg, MSC.rawRange(260, mastered).avg * (100 / 120) * MSC.levelScale(30, 33), 0.01);

// --- anchor 4: level gap scaling
ok('level gap 0 => x1', MSC.levelScale(30, 30), 1, 1e-12);
ok('level gap 3', MSC.levelScale(30, 33), 1 / (1 + 9 * 0.005), 1e-12);
ok('level gap 12', MSC.levelScale(30, 42), 1 / (1 + 12 * 0.05), 1e-12);

// --- anchor 5: damage cap
const whale = Object.assign({}, mastered, { WATK: 1999, P: 999, W: 2.5, critRate: 0 });
const capped = MSC.applyTarget(MSC.rawRange(260, whale), curseEye, 30, whale, 1);
ok('cap clamps per line at 99,999', capped.max, 99999, 1e-9);
console.log(`${capped.capped ? 'PASS' : 'FAIL'}  cap flagged (overflow ${capped.overflowPct.toFixed(0)}%)`);
if (!capped.capped) fails++;

// --- crossover logic, worked by hand
const S = {
  one: { name: 'Power Strike', pct: 260, hits: 1, cap: 1, ms: 720 },
  mob: { name: 'Slash Blast', pct: 130, hits: 1, cap: 6, ms: 720 }
};
const a = MSC.analyze(mastered, S, curseEye, 1, 1);
// per-target mobbing DPS = 130%/260% of 1v1 => break-even at 2 mobs
ok('break-even mob count', a.needed, 2, 0);
console.log(`${a.needed === 2 ? 'PASS' : 'FAIL'}  at N=1 mobbing loses (${a.mobWins})`);
if (a.mobWins) fails++;

const a2 = MSC.analyze(mastered, S, curseEye, 1, 3);
console.log(`${a2.mobWins ? 'PASS' : 'FAIL'}  at N=3 mobbing wins: ${Math.round(a2.dpsMob)} vs ${Math.round(a2.dpsOne)} dps (${a2.marginPct.toFixed(0)}%)`);
if (!a2.mobWins) fails++;

// 1v1 skill weaker than AoE => mobbing wins even on a single target (needed = 1)
const weak1v1 = { one: { name: 'basic', pct: 100, hits: 1, cap: 1, ms: 750 }, mob: S.mob };
const a3 = MSC.analyze(mastered, weak1v1, curseEye, 1, 1);
console.log(`${a3.needed === 1 ? 'PASS' : 'FAIL'}  weak 1v1 => break-even at 1 mob (got ${a3.needed})`);
if (a3.needed !== 1) fails++;

// --- ranking sanity
const rank = MSC.rankMobs(mastered, S, 1, { up: 8, down: 12 });
const sorted = rank.every((m, i) => i === 0 || rank[i - 1].epm >= m.epm);
console.log(`${sorted ? 'PASS' : 'FAIL'}  ranked ${rank.length} mobs, descending EXP/min`);
if (!sorted) fails++;
console.log(`       level-30 char, top 6: ` + rank.slice(0, 6).map(m => `${m.name} ${Math.round(m.epm)} exp/min`).join(' | '));

// --- a high-level character should prefer a different, higher mob
const lv60 = Object.assign({}, mastered, { lv: 60, P: 300, Q: 80, WATK: 90, ML: 10, W: 2.5, critRate: 5, critDmg: 20 });
const S60 = { one: { name: 'Power Strike', pct: 260, hits: 1, cap: 1, ms: 720 },
              mob: { name: 'Slash Blast', pct: 130, hits: 1, cap: 6, ms: 720 } };
const rank60 = MSC.rankMobs(lv60, S60, 1, { up: 8, down: 12 });
console.log(`       level-60 char, top 6: ` + rank60.slice(0, 6).map(m => `${m.name} ${Math.round(m.epm)} exp/min`).join(' | '));

console.log(fails === 0 ? '\nALL CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
