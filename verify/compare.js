// verify/compare.js — model vs harvested MSCW calculator output.
// Every case in anchors.json was read off the MSCW damage calculator one input at a time.
// Exit code 0 only when every case matches; run it after any formula change.
const MSC = require('../msc_core.js');
const A = require('./anchors.json');

const TOLERANCE = 1; // per-hit truncation can differ by one point at most

function buildC(c) {
  const f = c.fields;
  const base = { mode: 'stats', lv: f['Your level'], critRate: f['Critical Rate %'], critDmg: f['Critical Damage %'] };
  if (c.kind === 'magic') {
    return Object.assign(base, {
      klass: 'magic', INT: f['Total INT'], MATK: f['Magic Attack'], ML: f['Spell mastery level'], spellMastery: f['Spell mastery level']
    });
  }
  return Object.assign(base, {
    klass: 'physical', P: f['Total STR'], Q: f['Total DEX'], WATK: f['Weapon Attack'],
    A: f['Attack from gear and buffs'], ML: f['Weapon mastery level'], W: c.mult || 2.5
  });
}

let fail = 0;
const rows = [];
A.cases.forEach((c, i) => {
  const C = buildC(c);
  const pct = c.kind === 'magic' ? c.fields['Basic Attack'] : c.fields['Damage %'];
  const spec = { pct, spellMastery: C.spellMastery };
  const raw = MSC.rawRange(spec, C);
  const preOk = Math.abs(raw.min - c.pre[0]) <= TOLERANCE && Math.abs(raw.max - c.pre[1]) <= TOLERANCE;
  let postOk = true, postGot = null;
  if (c.post) {
    const real = MSC.MOBS.find(m => m.name === c.mob.name) || c.mob;   // use the measured P.DEF / M.DEF row
    const p = MSC.applyTarget(raw, real, C.lv, C, 1, c.kind === 'magic' ? 'magic' : 'physical');
    postGot = [p.min, p.max];
    postOk = Math.abs(p.min - c.post[0]) <= TOLERANCE && Math.abs(p.max - c.post[1]) <= TOLERANCE;
  }
  const ok = preOk && postOk;
  if (!ok) fail++;
  rows.push({ i, ok, kind: c.kind, attack: c.attack, want: c.pre.join('-'), got: raw.min + '-' + raw.max, wantPost: c.post ? c.post.join('-') : '', gotPost: postGot ? postGot.join('-') : '' });
});

const w = (s, n) => String(s).padEnd(n);
console.log(w('#', 3) + w('case', 26) + w('model', 14) + w('calculator', 14) + w('post model', 14) + w('post calc', 12) + 'result');
rows.forEach(r => {
  console.log(
    w(r.i, 3) + w(r.attack + ' (' + r.kind + ')', 26) + w(r.got, 14) + w(r.want, 14) +
    w(r.gotPost || '—', 14) + w(r.wantPost || '—', 12) + (r.ok ? 'ok' : 'MISMATCH')
  );
});
console.log(`\n${rows.length - fail}/${rows.length} cases match the MSCW calculator`);
process.exit(fail === 0 ? 0 : 1);
