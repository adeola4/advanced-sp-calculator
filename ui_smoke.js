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
    textContent: '', innerHTML: '', max: 30, style: {}, _attrs: {},
    selectedOptions: [{ textContent: 'Curse Eye' }],
    _l: {},
    addEventListener(ev, fn) { (this._l[ev] = this._l[ev] || []).push(fn); },
    fire(ev) { (this._l[ev] || []).forEach(f => f()); },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k] === undefined ? null : this._attrs[k]; }
  });
}

// '#host button' -> buttons parsed out of the host's innerHTML, cached so listeners stick
function buttonsIn(hostId) {
  const host = el(hostId);
  if (host._btnCache && host._btnCacheHtml === host.innerHTML) return host._btnCache;
  const out = [];
  for (const tag of host.innerHTML.match(/<button[^>]*>/g) || []) {
    const attrs = {};
    for (const a of tag.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    out.push({
      _l: {}, _attrs: attrs,
      getAttribute(k) { return this._attrs[k] === undefined ? null : this._attrs[k]; },
      get textContent() { return this._attrs['data-class'] || this._attrs['data-job'] || ''; },
      addEventListener(ev, fn) { (this._l[ev] = this._l[ev] || []).push(fn); },
      click() { (this._l.click || []).forEach(f => f()); }
    });
  }
  host._btnCache = out; host._btnCacheHtml = host.innerHTML;
  return out;
}

const document = {
  getElementById: el,
  querySelector: () => null,
  querySelectorAll(sel) {
    const m = /^#(\w+) button$/.exec(sel);
    return m ? buttonsIn(m[1]) : [];
  },
  readyState: 'complete'
};
const sandbox = { document, window: {}, console, Math, parseFloat, isFinite, String, Number, Object, Array, JSON, MSC };
vm.createContext(sandbox);

let fails = 0;
const check = (name, ok, extra) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };
const plain = s => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const rows = id => (el(id).innerHTML.match(/<tr/g) || []).length;
const clickClass = id => buttonsIn('classBar').find(b => b.getAttribute('data-class') === id).click();
const clickJob = id => buttonsIn('jobBar').find(b => b.getAttribute('data-job') === id).click();
const optionIds = id => [...el(id).innerHTML.matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);

try {
  vm.runInContext(inline, sandbox, { filename: 'app_inline.js' });
  console.log('PASS  page script executed without throwing');
} catch (e) {
  console.log('FAIL  page script threw: ' + e.message);
  process.exit(1);
}

let verdict = plain(el('verdictWrap').innerHTML);
console.log('       verdict  : ' + verdict.slice(0, 150));
console.log('       skillA   : ' + plain(el('s1info').innerHTML));
console.log('       skillB   : ' + plain(el('s2info').innerHTML));

check('five class buttons rendered', buttonsIn('classBar').length === 5);
check('magician jobs listed', buttonsIn('jobBar').length === 4);
check('default class is Magician / F-P Wizard', el('klass').value === 'magician' && el('job').value === 'fp');
check('default pair is Fire Arrow vs Poison Breath', /Fire Arrow/.test(el('s1head').textContent) && /Poison Breath/.test(el('s2head').textContent));
check('verdict recommends Fire Arrow on Curse Eye (poison resist)', /Use Fire Arrow on Curse Eye/.test(verdict), verdict.slice(0, 60));
check('poison resistance is called out', /resists poison|blocked/.test(verdict));
check('both skill cards rendered', (el('cards').innerHTML.match(/class="card/g) || []).length === 2);
check('per-skill MP per kill shown', /MP per kill/.test(el('cards').innerHTML));
check('ranked table has 18 monsters + header', rows('bestTable') === 19, rows('bestTable') + ' rows');
check('verification table has 10 anchors + header', rows('checkTable') === 11, rows('checkTable') + ' rows');
check('all anchors match', /All anchors match/.test(el('checkNote').innerHTML));

// six monsters in range must flip the recommendation to the 6-target skill
el('nMobs').value = '6'; el('nMobs').fire('input');
const v6 = plain(el('verdictWrap').innerHTML);
console.log('       at 6 mobs: ' + v6.slice(0, 130));
check('6 monsters flips to Poison Breath', /Use Poison Breath/.test(v6));
el('nMobs').value = '1'; el('nMobs').fire('input');

// class buttons re-scope stats, weapons and the skill list
clickClass('warrior');
verdict = plain(el('verdictWrap').innerHTML);
console.log('       warrior  : ' + verdict.slice(0, 130));
check('warrior class switches to physical stats', el('physBlock').style.display === 'block' && el('magicBlock').style.display === 'none');
check('warrior default pair is Power Strike vs Slash Blast', /power-strike/.test(el('s1id').value) && /slash-blast/.test(el('s2id').value));
check('warrior weapon list is melee only', optionIds('W').includes('2.7') && optionIds('W').includes('1.8'), optionIds('W').join(','));
check('warrior skill list excludes magician skills', !optionIds('s1id').includes('fire-arrow'), optionIds('s1id').join(','));
check('warrior jobs rendered', buttonsIn('jobBar').length === 4);

clickJob('spearman');
check('spearman adds spear/polearm weapons', /Spear/.test(el('W').innerHTML) && /Polearm/.test(el('W').innerHTML));
check('spearman offers Rush as the mobbing skill', /rush/.test(el('s2id').value), el('s2id').value);
check('secondary label follows the weapon', /DEX/.test(el('Qlabel').textContent), el('Qlabel').textContent);

clickClass('thief');
check('thief uses LUK primary', /LUK/.test(el('Plabel').textContent), el('Plabel').textContent);
check('thief secondary reads STR + DEX', /STR \+ DEX/.test(el('Qlabel').textContent), el('Qlabel').textContent);
check('thief default pair is Lucky Seven vs Double Stab', el('s1id').value === 'lucky-seven' && el('s2id').value === 'double-stab');
clickJob('assassin');
check('assassin claw multiplier is 3.0', el('W').value === '3', el('W').value);

clickClass('bowman');
check('bowman default pair is Arrow Blow vs Double Shot', el('s1id').value === 'arrow-blow' && el('s2id').value === 'double-shot');
clickJob('crossbowman');
check('crossbowman offers Iron Arrow', optionIds('s2id').includes('iron-arrow'), optionIds('s2id').join(','));

clickClass('magician'); clickJob('fp');
check('back to F/P restores Fire Arrow', el('s1id').value === 'fire-arrow');
check('spell mastery input is live', el('spML').value === '10');

// potion bill: mesos/hour appears once a potion is priced
el('potMP').value = '100';
el('potPrice').value = '5000';
el('potPrice').fire('input');
check('potion cost appears in the card', /Meso \/ hour/.test(el('cards').innerHTML) && /[1-9]/.test(plain(el('cards').innerHTML).split('Meso / hour')[1].slice(0, 12)));

// --- buffs: own levels vs party max
clickClass('magician'); clickJob('fp');
check('F/P buff tiles show Meditation', /Meditation/.test(el('buffTiles').innerHTML));
check('Meditation is marked party', /party/.test(el('buffTiles').innerHTML));
check('scenario table has 3 scenarios + header', (el('buffTable').innerHTML.match(/<tr/g) || []).length === 4, (el('buffTable').innerHTML.match(/<tr/g) || []).length + ' rows');
const rowEpm = label => {
  const row = el('buffTable').innerHTML.split('<tr').find(r => r.indexOf(label) >= 0) || '';
  const cells = [...row.matchAll(/<td>([\d,]+)<\/td>/g)].map(m => +m[1].replace(/,/g, ''));
  return cells.length ? Math.max.apply(null, cells) : 0;
};
el('mhp').value = '20000'; el('mhp').fire('input');
const unbuffed = rowEpm('Nobody buffs'), partyMax = rowEpm('Party max');
el('buf_meditation').value = '20'; el('buf_meditation').fire('input');
const mine = rowEpm('My own levels');
console.log('       meditation 20: unbuffed ' + unbuffed + ' / mine ' + mine + ' / party max ' + partyMax + ' EXP/min');
check('party max beats unbuffed', partyMax > unbuffed);
check('my own max matches party max', mine === partyMax);
check('meditation lifts the damage range', /1,185/.test(el('buffTable').innerHTML), 'looking for 1,185');

check('buffing lifts the verdict number', /Use Fire Arrow/.test(plain(el('verdictWrap').innerHTML)));
check('gain column appears', /\+/.test(el('buffTable').innerHTML.split('Party max')[1] || ''));

clickClass('warrior');
check('warrior buff tiles show Rage', /Rage/.test(el('buffTiles').innerHTML));
clickJob('spearman');
check('Rage survives a job switch', /Rage/.test(el('buffTiles').innerHTML));

// --- screenshot parser (runs without the OCR engine: feeds OCR-shaped text in)
const parsed = sandbox.parseStatWindow('STR 132\nDEX 30\nINT 4\nLUK 4\nW.ATK 47\nDAMAGE 1,234 - 5,678');
console.log('       parsed   : ' + JSON.stringify(parsed));
check('parser reads STR/DEX/W.ATK', parsed.STR === 132 && parsed.DEX === 30 && parsed.WATK === 47);
check('parser reads the damage range', parsed.obsMin === 1234 && parsed.obsMax === 5678);
const parsedMage = sandbox.parseStatWindow('INT 300\nLUK 4\nM.ATK 105\nMagic Attack 105');
check('parser reads MATK', parsedMage.MATK === 105, JSON.stringify(parsedMage));
const noisy = sandbox.parseStatWindow('STR 132\nDEX 3O\nW.ATK a7\n1O,OOO - 12,345');
check('parser survives OCR digit noise (a7 -> 47, 3O -> 30)', noisy.WATK === 47 && noisy.DEX === 30, JSON.stringify(noisy));
sandbox.applyImport(parsed);
check('import fills the right stat field for the job', String(el('P').value) === '132' || String(el('P').value) === '132', 'P=' + el('P').value + ' Q=' + el('Q').value);
check('import fills W.ATK for physical jobs', String(el('WATK').value) === '47', String(el('WATK').value));
check('import reports the weapon attack it read', /W\.ATK 47/.test(el('importNote').innerHTML), el('importNote').innerHTML.slice(0, 120));
check('import switches to observed mode', el('mode').value === 'observed');
check('import reports what it read', /Read from your screenshot/.test(el('importNote').innerHTML));

// --- cast timing comes from MSCW's animation table, not a guess
clickClass('magician'); clickJob('fp');
check('magician cast time is the fixed 810 ms', /cast 810 ms/.test(plain(el('s1msOut').innerHTML)), plain(el('s1msOut').innerHTML));
check('magician timing is labelled fixed', /magic, fixed/.test(plain(el('s1msOut').innerHTML)));
el('spellBooster').value = '11'; el('spellBooster').fire('change');
check('Spell Booster 11+ drops the cast to 720 ms', /cast 720 ms/.test(plain(el('s1msOut').innerHTML)), plain(el('s1msOut').innerHTML));
const boostedEpm = rowEpm('My own levels');
el('spellBooster').value = '0'; el('spellBooster').fire('change');
check('losing Spell Booster slows the DPS back down', rowEpm('My own levels') < boostedEpm, boostedEpm + ' -> ' + rowEpm('My own levels'));

clickClass('warrior');
check('sword warrior casts Power Strike at 750 ms (Fast 5)', /cast 750 ms/.test(plain(el('s1msOut').innerHTML)), plain(el('s1msOut').innerHTML));
el('wtier').value = '4'; el('wtier').fire('change');
el('booster').value = '1'; el('booster').fire('change');
check('Fast (4) weapon + Booster = 600 ms', /cast 600 ms/.test(plain(el('s1msOut').innerHTML)), plain(el('s1msOut').innerHTML));
el('booster').value = ''; el('booster').fire('change');

clickJob('spearman');
check('spear is Slow (7) at 870 ms for Power Strike', /cast 870 ms/.test(plain(el('s1msOut').innerHTML)), plain(el('s1msOut').innerHTML));
check('Rush is a faster animation on the same weapon', /cast 450 ms/.test(plain(el('s2msOut').innerHTML)), plain(el('s2msOut').innerHTML));

el('s1ms').value = '700'; el('s1ms').fire('input');
check('a typed value is shown as measured, with the model beside it', /your measured value/.test(plain(el('s1msOut').innerHTML)) && /model says/.test(plain(el('s1msOut').innerHTML)), plain(el('s1msOut').innerHTML));

console.log(fails === 0 ? '\nUI SMOKE TEST PASSED' : `\n${fails} UI CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
