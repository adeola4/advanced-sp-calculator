// ui_smoke.js — runs the page's real inline script against a minimal DOM stub
// built from the markup's own default values, then exercises compute() end to end.
const fs = require('fs');
const vm = require('vm');
const MSC = require('./msc_core.js');

const html = fs.readFileSync(process.argv[2] || 'app.html', 'utf8');
const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].pop()[1];

const defaults = {};
for (const m of html.matchAll(/<input[^>]*id="([^"]+)"[^>]*>/g)) {
  const v = /value="([^"]*)"/.exec(m[0]);
  defaults[m[1]] = v ? v[1] : '';
}
for (const m of html.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
  const first = /<option value="([^"]*)"/.exec(m[2]);
  defaults[m[1]] = first ? first[1] : '';
}

const els = {};
function el(id) {
  if (els[id]) return els[id];
  return (els[id] = {
    id, value: defaults[id] !== undefined ? defaults[id] : '',
    textContent: '', innerHTML: '', max: 30, style: {},
    selectedOptions: [{ textContent: 'Curse Eye' }],
    _l: {},
    addEventListener(ev, fn) { (this._l[ev] = this._l[ev] || []).push(fn); },
    fire(ev) { (this._l[ev] || []).forEach(f => f()); }
  });
}
const document = { getElementById: el, querySelector: () => null, readyState: 'complete' };
const sandbox = { document, window: {}, console, Math, parseFloat, isFinite, String, Number, Object, Array, JSON, MSC };
vm.createContext(sandbox);

let fails = 0;
const check = (name, ok, extra) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };

try {
  vm.runInContext(inline, sandbox, { filename: 'app_inline.js' });
  console.log('PASS  page script executed without throwing');
} catch (e) {
  console.log('FAIL  page script threw: ' + e.message);
  process.exit(1);
}

const plain = s => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const rows = id => (el(id).innerHTML.match(/<tr/g) || []).length;

const verdict = plain(el('verdictWrap').innerHTML);
console.log('       verdict  : ' + verdict.slice(0, 150));
console.log('       skillA   : ' + plain(el('s1info').innerHTML));
console.log('       skillB   : ' + plain(el('s2info').innerHTML));

check('default pair is Fire Arrow vs Poison Breath', /Fire Arrow/.test(el('s1head').textContent) && /Poison Breath/.test(el('s2head').textContent));
check('verdict recommends Fire Arrow on Curse Eye (poison resist)', /Use Fire Arrow on Curse Eye/.test(verdict), verdict.slice(0, 60));
check('poison resistance is called out', /resists poison|blocked/.test(verdict));
check('both skill cards rendered', (el('cards').innerHTML.match(/class="card/g) || []).length === 2);
check('per-skill MP per kill shown', /MP per kill/.test(el('cards').innerHTML));
check('ranked table has 18 monsters + header', rows('bestTable') === 19, rows('bestTable') + ' rows');
check('verification table has 10 anchors + header', rows('checkTable') === 11, rows('checkTable') + ' rows');
check('all anchors match', /All anchors match/.test(el('checkNote').innerHTML));

// six monsters in range must flip the recommendation to the 6-target skill
el('nMobs').value = '6';
el('nMobs').fire('input');
const v6 = plain(el('verdictWrap').innerHTML);
console.log('       at 6 mobs: ' + v6.slice(0, 130));
check('6 monsters flips to Poison Breath', /Use Poison Breath/.test(v6));

// switching to the physical branch rebuilds the skill list and re-renders
el('nMobs').value = '1'; el('nMobs').fire('input');
el('klass').value = 'physical';
el('klass').fire('change');
const vP = plain(el('verdictWrap').innerHTML);
console.log('       physical : ' + vP.slice(0, 130));
check('physical branch renders a verdict', vP.length > 40 && /Power Strike|Slash Blast/.test(vP));
check('physical branch hides magic inputs', el('magicBlock').style.display === 'none');

// potion bill: mesos/hour appears once a potion is priced
el('potMP').value = '100';
el('potPrice').value = '5000';
el('potPrice').fire('input');
check('potion cost appears in the card', /Meso \/ hour/.test(el('cards').innerHTML) && /[1-9]/.test(plain(el('cards').innerHTML).split('Meso / hour')[1].slice(0, 12)), plain(el('cards').innerHTML).split('Meso / hour')[1]?.slice(0, 12));

console.log(fails === 0 ? '\nUI SMOKE TEST PASSED' : `\n${fails} UI CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
