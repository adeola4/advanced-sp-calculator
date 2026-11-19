// dom_smoke.js — runs the page's real inline script against a minimal DOM stub
// built from the HTML's own default values, then exercises compute() end to end.
const fs = require('fs');
const vm = require('vm');
const MSC = require('./msc_core.js');

const html = fs.readFileSync(process.argv[2] || 'msc_train_calc.html', 'utf8');
const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].pop()[1];

// id -> default value, scraped from the markup
const defaults = {};
for (const m of html.matchAll(/<input[^>]*id="([^"]+)"[^>]*>/g)) {
  const v = /value="([^"]*)"/.exec(m[0]);
  defaults[m[1]] = v ? v[1] : '';
}
for (const m of html.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
  const first = /<option value="([^"]*)"/.exec(m[2]);
  defaults[m[1]] = first ? first[1] : '';
}
// select whose first option is a placeholder: emulate the page picking Curse Eye
const els = {};
const log = [];
function el(id) {
  if (els[id]) return els[id];
  const e = {
    id, value: defaults[id] !== undefined ? defaults[id] : '',
    textContent: '', innerHTML: '', style: {},
    selectedOptions: [{ textContent: 'Curse Eye' }],
    _listeners: {},
    addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
    fire(ev) { (this._listeners[ev] || []).forEach(f => f()); }
  };
  els[id] = e;
  return e;
}
const document = { getElementById: el, querySelector: () => null, readyState: 'complete' };
el('mobSel').value = String(MSC.MOBS.findIndex(m => m[0] === 'Curse Eye'));
el('mobSel').selectedOptions = [{ textContent: 'Curse Eye' }];

const sandbox = { document, window: {}, console, Math, parseFloat, isFinite, String, Number, Object, Array, JSON, MSC };
vm.createContext(sandbox);
try {
  vm.runInContext(inline, sandbox, { filename: 'msc_train_calc_inline.js' });
  console.log('PASS  page script executed without throwing (MSC core + UI wiring)');
} catch (e) {
  console.log('FAIL  page script threw: ' + e.message);
  process.exit(1);
}

// what did compute() render?
const verdict = el('verdictWrap').innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const rows = (el('perHit').innerHTML.match(/<tr/g) || []).length - 0;
const best = (el('bestTable').innerHTML.match(/<tr/g) || []).length;
const cross = (el('crossTable').innerHTML.match(/<tr/g) || []).length;
const range = el('rangeOut').innerHTML.replace(/<[^>]+>/g, '').trim();

console.log('       stat window : ' + range);
console.log('       verdict     : ' + verdict);
console.log(`       tables      : perHit ${rows} rows, crossover ${cross} rows, best-mobs ${best} rows`);

const checks = [
  ['stat window shows the published 59-172 range', /59\s*[–-]\s*172/.test(range)],
  ['verdict rendered', verdict.length > 40],
  ['per-hit table has 3 body rows + header', rows === 4],
  ['crossover table filled', cross === 7],
  ['best-mob table filled', best === 16],
  ['live model verification table rendered', (el('checkTable').innerHTML.match(/<tr/g) || []).length === 9]
];
let fails = 0;
for (const [name, okv] of checks) { if (!okv) fails++; console.log(`${okv ? 'PASS' : 'FAIL'}  ${name}`); }

// change an input the way a user would and re-render
el('nMobs').value = '4';
el('nMobs').fire('input');
const v4 = el('verdictWrap').innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
console.log(`       at 4 mobs   : ${v4.slice(0, 120)}`);
const mobWin = /Use Slash Blast/.test(v4);
if (!mobWin) fails++;
console.log(`${mobWin ? 'PASS' : 'FAIL'}  switching mob count to 4 flips the verdict to mobbing`);
if (!mobWin) fails++;

// calibration path: load the reference stat block, then type an observed hit line
[['plv','50'],['P','180'],['Q','60'],['WATK','70'],['ML','10'],['W','2.5']].forEach(([id,v]) => { el(id).value = v; });
el('W').fire('change');
el('s1obsMin').value = '900';
el('s1obsMax').value = '1110';
el('s1obsMax').fire('input');
const calMsg = el('s1implied').innerHTML.replace(/<[^>]+>/g, '').trim();
console.log('       calibration : ' + calMsg);
const calOk = /Calibrated/.test(calMsg) && /2[56]\d(\.\d)?%/.test(calMsg);
if (!calOk) fails++;
console.log(`${calOk ? 'PASS' : 'FAIL'}  observed hit line back-solves to the skill damage %`);

console.log(fails === 0 ? '\nUI SMOKE TEST PASSED' : `\n${fails} UI CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
