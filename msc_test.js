// msc_test.js — executes the shipped math module against published anchors.
const MSC = require('./msc_core.js');

let fails = 0;
function ok(name, got, want, tol) {
  const pass = Math.abs(got - want) <= (tol == null ? 1 : tol);
  if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: got ${got.toFixed(3)} want ${want}${tol ? ' ±' + tol : ''}`);
}

function eq(name, got, want) {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
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
  one: MSC.skillAt('power-strike', 20, { ms: 720 }),
  mob: MSC.skillAt('slash-blast', 20, { ms: 720 })
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
const rank = MSC.rankMobs(mastered, [S.one, S.mob], { up: 8, down: 12 });
const sorted = rank.every((m, i) => i === 0 || rank[i - 1].epm >= m.epm);
console.log(`${sorted ? 'PASS' : 'FAIL'}  ranked ${rank.length} mobs, descending EXP/min`);
if (!sorted) fails++;
console.log(`       level-30 char, top 5: ` + rank.slice(0, 5).map(m => `${m.name} ${Math.round(m.epm)} exp/min (${m.skill})`).join(' | '));

// --- F/P wizard: Fire Arrow vs Poison Breath, elements, DoT and MP bill
const mage = { lv: 40, mode: 'stats', klass: 'magic', INT: 300, MATK: 100, ML: 10, critRate: 0, critDmg: 0 };
const fireArrow = MSC.skillAt('fire-arrow', 30, { ms: 810 });
const poisonBreath = MSC.skillAt('poison-breath', 30, { ms: 810 });

eq('Fire Arrow Lv30 = 180% / 28 MP / burn 50 over 3s',
  [fireArrow.pct, fireArrow.mp, fireArrow.dotPct, fireArrow.dotSec], [180, 28, 50, 3]);
eq('Poison Breath Lv30 = 90% / 40 MP / 6 targets / 75% / poison 40 over 5s',
  [poisonBreath.pct, poisonBreath.mp, poisonBreath.targets, poisonBreath.dotChance, poisonBreath.dotPct, poisonBreath.dotSec],
  [90, 40, 6, 0.75, 40, 5]);

// element rules: Curse Eye resists poison, Fire Boar resists fire, Jr. Wraith is fire-weak
const fireBoar = MSC.MOBS.find(m => m.name === 'Fire Boar');
const jrWraith = MSC.MOBS.find(m => m.name === 'Jr. Wraith');
ok('Fire Arrow on a fire-resistant mob', MSC.elementMult(fireBoar, 'fire'), 0.75, 0);
ok('Fire Arrow on a fire-weak mob', MSC.elementMult(jrWraith, 'fire'), 1.25, 0);
const mobCE = MSC.MOBS.find(m => m.name === 'Curse Eye');
ok('Poison Breath on a poison-resistant mob', MSC.elementMult(mobCE, 'poison'), 0.75, 0);

const onCurseEye = MSC.compare(mage, [fireArrow, poisonBreath], mobCE, 1);
const faHit = onCurseEye.results[0], pbHit = onCurseEye.results[1];
console.log(`${pbHit.dotBlocked ? 'PASS' : 'FAIL'}  poison DoT is blocked on a poison-resistant mob`);
if (!pbHit.dotBlocked) fails++;
console.log(`${!faHit.dotBlocked ? 'PASS' : 'FAIL'}  fire burn still applies on a neutral-to-fire mob`);
if (faHit.dotBlocked) fails++;
ok('Fire Arrow MP per cast on Curse Eye', faHit.mpPerKill, 28, 0);
console.log(`${onCurseEye.best.skill.name === 'Fire Arrow' ? 'PASS' : 'FAIL'}  best skill on Curse Eye is Fire Arrow (${Math.round(onCurseEye.best.expPerMin)} vs ${Math.round(onCurseEye.results[1].expPerMin)} EXP/min)`);
if (onCurseEye.best.skill.name !== 'Fire Arrow') fails++;

// six monsters in range: Poison Breath's 6-target cap must out-earn Fire Arrow
const six = MSC.compare(mage, [fireArrow, poisonBreath], mobCE, 6);
console.log(`${six.best.skill.name === 'Poison Breath' ? 'PASS' : 'FAIL'}  6 targets flips it to Poison Breath (${Math.round(six.best.expPerMin)} EXP/min, ${Math.round(six.best.mpPerKill)} MP/kill)`);
if (six.best.skill.name !== 'Poison Breath') fails++;
console.log(`${six.best.expPerMin > onCurseEye.results[0].expPerMin ? 'PASS' : 'FAIL'}  multi-target EXP/min beats single-target (${Math.round(six.best.expPerMin)} vs ${Math.round(onCurseEye.results[0].expPerMin)})`);
if (six.best.expPerMin <= onCurseEye.results[0].expPerMin) fails++;

// magic formula identity from the MSCW explainer
const mageSw = MSC.rawRange(100, mage);
ok('magic MAX = (floor(INT/2)+MATK)*(1+INT/125)', mageSw.max, (150 + 100) * (1 + 300 / 125), 1);

// --- a high-level character should prefer a different, higher mob
const lv60 = Object.assign({}, mastered, { lv: 60, P: 300, Q: 80, WATK: 90, ML: 10, W: 2.5, critRate: 5, critDmg: 20 });
const S60 = { one: { name: 'Power Strike', pct: 260, hits: 1, cap: 1, ms: 720 },
              mob: { name: 'Slash Blast', pct: 130, hits: 1, cap: 6, ms: 720 } };
const rank60 = MSC.rankMobs(lv60, S60, 1, { up: 8, down: 12 });
console.log(`       level-60 char, top 6: ` + rank60.slice(0, 6).map(m => `${m.name} ${Math.round(m.epm)} exp/min`).join(' | '));

// --- anchor 6: MSCW damage-calculator reference block (2H sword 2.5 / STR 180 / DEX 60 / 70 W.ATK)
const calc = { lv: 50, mode: 'stats', P: 180, Q: 60, WATK: 70, A: 0, ML: 10, W: 2.5, critRate: 0, critDmg: 0 };
const psCalc = MSC.rawRange(260, calc);
ok('calc block MIN (2H sword, mastery 10)', psCalc.min, 885, 1);
ok('calc block MAX (2H sword, mastery 10)', psCalc.max, 1110, 1);
const pole0 = Object.assign({}, calc, { W: 2.7, ML: 0 });
const psPole0 = MSC.rawRange(260, pole0);
ok('calc block MIN (polearm, mastery 0)', psPole0.min, 316, 1);
ok('calc block MAX (polearm, mastery 0)', psPole0.max, 1175, 1);
const gear10 = Object.assign({}, calc, { W: 2.7, ML: 10, A: 10 });
const psGear = MSC.rawRange(260, gear10);
ok('calc block MIN (polearm, +10 attack power)', psGear.min, 972, 1);
ok('calc block MAX (polearm, +10 attack power)', psGear.max, 1212, 1);

// --- anchor 7: on-monster numbers the calculator reports
const ceHi = MSC.applyTarget(psCalc, curseEye, 50, calc, 1);
ok('Curse Eye MIN at level 50', ceHi.min, 737, 1);
ok('Curse Eye MAX at level 50', ceHi.max, 925, 1);
const ceLo = MSC.applyTarget(psCalc, curseEye, 20, calc, 1);
ok('Curse Eye MIN at level 20 (gap 13)', ceLo.min, 447, 1);
ok('Curse Eye MAX at level 20 (gap 13)', ceLo.max, 560, 1);

// --- anchor 8: calibration from an observed hit line
ok('implied % from a 1,110 max hit', Math.round(MSC.impliedPct(1110, calc) * 100) / 100, 260, 0.2);
const calibrated = { name: 'Power Strike', pct: 260, hits: 1, cap: 1, ms: 720, obsMin: 900, obsMax: 1110 };
const calRange = MSC.rawRange(calibrated, calc);
ok('calibrated skill MIN overrides formula', calRange.min, 900, 0);
ok('calibrated skill MAX overrides formula', calRange.max, 1110, 0);
console.log(`${MSC.impliedPct(1110, Object.assign({}, calc, { WATK: 0 })) === null ? 'PASS' : 'FAIL'}  implied % safe with zero W.ATK`);
if (MSC.impliedPct(1110, Object.assign({}, calc, { WATK: 0 })) !== null) fails++;

// --- anchor 9: live self-check must be clean
const sc = MSC.selfCheck();
console.log(`${sc.pass ? 'PASS' : 'FAIL'}  core self-check (${sc.cases.length} documented anchors)`);
sc.cases.filter(c => !c.pass).forEach(c => console.log('        mismatch:', JSON.stringify(c)));
if (!sc.pass) fails++;

console.log(fails === 0 ? '\nALL CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
