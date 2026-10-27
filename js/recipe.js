/* Recipes, orders, scoring and the live state of everything on the bench.
   Nothing here touches the DOM: station.js asks the Rules below whether a move is allowed. */
/* ---------------- data ---------------- */
const SIZES = { S: { cap: 240, mult: 1 }, M: { cap: 350, mult: 1.25 }, L: { cap: 470, mult: 1.5 } };
const BEAN_KEYS = ['esp', 'decaf', 'dark'];
const MILK_KEYS = ['whole', 'oat', 'almond'];
const FOAM_KEYS = ['none', 'light', 'thick'];
const SYRUPS = { vanilla: { color: '#f3e2a8' }, caramel: { color: '#d9964a' }, hazelnut: { color: '#a9714a' } };
const TOP_KEYS = ['whip', 'cocoa', 'cinnamon'];
const TEMPS = { warm: { lo: 50, hi: 57 }, normal: { lo: 60, hi: 67 }, hot: { lo: 70, hi: 76 } };
const DRINKS = {
  espresso: { milk: false, foam: null, price: 2.5, tops: [] },
  latte: { milk: true, foam: 'light', price: 4, tops: [] },
  cappuccino: { milk: true, foam: 'thick', price: 4.25, tops: [] },
  flatwhite: { milk: true, foam: 'none', price: 4, tops: [] },
  mocha: { milk: true, foam: 'light', price: 5, tops: ['cocoa', 'whip'] },
  // from the recipe shop (issue #21), each with a step of its own: ice and cold milk straight from the bottle
  // (no steaming); a spoon of cocoa and steamed milk, no espresso at all
  iced: { milk: true, foam: 'none', price: 4.5, tops: [], iced: true },
  hotchoc: { milk: true, foam: 'light', price: 4, tops: [], noEsp: true, choc: true },
};
const UPGRADES = [{ id: 'stools', cost: 40 }, { id: 'grinder', cost: 70 }, { id: 'tipjar', cost: 90 }, { id: 'gauge', cost: 120 }];
// The recipe shop (issue #21): espresso and latte are on the menu from the start, every other drink is bought with the
// café's money (all prices here). A locked drink is never ordered.
const RECIPE_COST = { cappuccino: 10, hotchoc: 10, flatwhite: 10, iced: 10, mocha: 10 };
const recipeOpen = k => !(k in RECIPE_COST) || save.recipes.includes(k);
const drinkName = k => cap1(PH[save.lang].drink[k], save.lang);
const SURPRISE_KEYS = ['decaf', 'oat', 'almond', 'vanilla', 'cinnamon', 'L'];
const NAMES = ['Mira', 'Theo', 'Ada', 'Jun', 'Rosa', 'Felix', 'Noor', 'Kai', 'Lena', 'Omar', 'Ivy', 'Bastian', 'Yuki', 'Sam', 'Priya', 'Elif', 'Mateo', 'Hana', 'Leo', 'Zara', 'Deniz', 'Ola', 'Can', 'Ayşe', 'Mert', 'Zeynep'];
const SKIN = ['#f6d3b8', '#ecbd98', '#c98b62', '#9b6544', '#6e4630', '#f2c9a5'];
const HAIR = ['#3b2a24', '#6b4430', '#d9a35b', '#1f1b1a', '#b5533c', '#9aa0a8', '#e8d2a0'];
const EYES = ['#5b3a24', '#3b6a8a', '#4f7a4a', '#2e1f17', '#7a5a2e'];
const SHIRT = ['#f2b5b8', '#a9c7ea', '#f6d88c', '#b9dcb0', '#d5b8ea', '#f4c095', '#9fd3cf'];

/* ---------------- bench state ---------------- */
// cup.at: 'prep' (mat) | 'tray' (under the group head) | 'serving' (serving tray) | 'hand' (out on the bar, waiting to be handed over);
// null size means no cup on the bench
function newCup() {
  return { size: null, at: 'prep', bean: 'esp', dose: 0, doseQ: 0, shotting: false, shotT: 0, shots: [],
    scorched: false, milkPoured: false, milkType: null, foamUsed: null, milkTemp: 0, syrups: {}, tops: [],
    // cold: the milk went in straight from the bottle; ice: scoops of ice; choc: spoons of cocoa in the cup (issue #21)
    cold: false, ice: 0, choc: 0 };
}
// pf.at: 'rack' | 'grinder' | 'group'
function newPortafilter() { return { at: 'rack', bean: 'esp', dose: 0, doseQ: 0, grinding: false, tamped: false }; }
// pitcher.at: 'rack' | 'wand'
function newPitcher() { return { at: 'rack', milk: null, foam: 'light', temp: 6, steaming: false, scorched: false }; }

// The summary shape the issue tracker talks about; handy for debugging (window.CB.cupState()).
function cupStatus(c) {
  if (!c.size) return 'none';
  if (c.shotting) return 'brewing';
  return c.shots.length || c.milkPoured ? 'ready' : 'empty';
}
function cupSnapshot(c) {
  return { size: c.size, espressoShots: c.shots.length, milkState: c.milkPoured ? (c.foamUsed === 'none' ? 'steamed' : 'foamed') : 'none',
    milk: c.milkType, syrup: Object.keys(c.syrups)[0] || null, syrups: { ...c.syrups }, toppings: [...c.tops], status: cupStatus(c) };
}

// Each rule returns null when the move is fine, or the i18n key (under STR.err) of what went wrong.
const Rules = {
  placeNewCup: (b) => b.cup.size ? 'cupAlready' : null,
  moveCup: (b, to) => !b.cup.size ? 'noCup' : b.cup.at === to ? 'same' : null,
  grind: (b) => b.pf.at !== 'grinder' ? 'pfToGrinder' : b.pf.dose > 0 ? 'dumpOld' : null,
  tamp: (b) => b.pf.dose <= 0 ? 'pfEmpty' : b.pf.tamped ? 'tampedAlready' : b.pf.at === 'group' ? 'pfLocked' : null,
  movePf: (b, to) => b.cup.shotting ? 'shotRunning' : b.pf.at === to ? 'same'
    : to === 'group' && b.pf.dose <= 0 ? 'pfEmpty' : to === 'group' && !b.pf.tamped ? 'tampFirst' : null,
  dumpPf: (b) => b.cup.shotting && b.pf.at === 'group' ? 'shotRunning' : b.pf.dose <= 0 ? 'pfEmpty' : null,
  brew: (b) => b.pf.at !== 'group' ? 'pfToGroup' : !b.cup.size ? 'noCup' : b.cup.at !== 'tray' ? 'cupToTray'
    : b.cup.shots.length >= 3 ? 'max3' : null,
  fillPitcher: (b) => b.pitcher.milk ? 'pitcherFull' : null,
  movePitcher: (b, to) => b.pitcher.steaming ? 'steamRunning' : b.pitcher.at === to ? 'same' : null,
  steam: (b) => b.pitcher.at !== 'wand' ? 'pitcherToWand' : !b.pitcher.milk ? 'pitcherEmpty' : null,
  pour: (b) => !b.cup.size ? 'noCup' : !b.pitcher.milk ? 'pitcherEmpty' : b.pitcher.steaming ? 'steamRunning'
    : b.pitcher.temp < 30 ? 'steamFirst' : b.cup.milkPoured ? 'milkAlready' : null,
  dumpPitcher: (b) => b.pitcher.steaming ? 'steamRunning' : !b.pitcher.milk ? 'pitcherEmpty' : null,
  syrup: (b) => !b.cup.size ? 'noCup' : Object.values(b.cup.syrups).reduce((a, n) => a + n, 0) >= 6 ? 'plenty' : null,
  topping: (b, k) => !b.cup.size ? 'noCup' : b.cup.tops.includes(k) ? 'topAlready' : null,
  ice: (b) => !b.cup.size ? 'noCup' : b.cup.ice ? 'iceAlready' : null,
  cocoa: (b) => !b.cup.size ? 'noCup' : b.cup.choc ? 'cocoaAlready' : null,
  // a milk bottle tipped straight into the cup: cold milk
  coldMilk: (b) => !b.cup.size ? 'noCup' : b.cup.milkPoured ? 'milkAlready' : null,
  // the bell takes the cup on the serving tray out to the customer; then it is dragged onto them
  sendOut: (b) => !b.cup.size ? 'noCup' : b.cup.shotting ? 'shotRunning' : b.cup.at !== 'serving' ? 'cupToServeTray' : null,
  handOver: (b) => !b.cup.size ? 'noCup' : b.cup.at !== 'hand' ? 'notReady' : null,
  trashCup: (b) => !b.cup.size ? 'noCup' : null,
};

/* ---------------- customers & orders ---------------- */
function makeCustomer() {
  return {
    name: pick(NAMES), skin: pick(SKIN), hair: pick(HAIR), shirt: pick(SHIRT), hat: pick(SHIRT),
    hairStyle: ri(6), glasses: Math.random() < 0.3, seed: rand(0, 6),
    eye: pick(EYES), collar: Math.random() < 0.5, acc: pick(['none', 'none', 'scarf', 'earrings', 'beard', 'cap']),
    x: -90, state: 'enter', mood: 'happy',
  };
}

// fresh: drinks bought for today, ordered more often on their first day; force: this drink, whatever the odds
function makeOrder(day, fresh = [], force = null) {
  const h = Math.min(0.15 + (day - 1) * 0.12, 0.7), H = () => Math.random() < h;
  const r = { greet: ri(6), form: ri(4), q: ri(6) };
  if (!force && day >= 3 && Math.random() < 0.14) return { surprise: true, constraint: pick(SURPRISE_KEYS), temp: 'normal', r };
  const pool = (day === 1 ? ['latte', 'cappuccino', 'espresso', 'latte'] : Object.keys(DRINKS)).filter(recipeOpen);
  for (const k of fresh) if (recipeOpen(k)) pool.push(k, k);
  const dk = force || pick(pool), D = DRINKS[dk];
  const o = { drink: dk, surprise: false, r };
  o.size = (dk === 'espresso' || dk === 'flatwhite') ? 'S' : pick(['S', 'M', 'M', 'L']);
  // (a hot chocolate has no coffee in it, so no beans or shots to ask for; an iced latte no temperature)
  o.bean = !D.noEsp && Math.random() < (day === 1 ? 0.2 : 0.4) ? pick(['decaf', 'dark']) : 'esp';
  o.shots = D.noEsp ? 0 : dk === 'espresso' ? (Math.random() < 0.5 ? 2 : 1) : (day >= 2 && Math.random() < 0.2 ? 3 : 2);
  o.milk = D.milk ? (Math.random() < 0.45 ? 'whole' : pick(['oat', 'almond'])) : null;
  o.temp = D.milk && !D.iced ? (Math.random() < 0.6 ? 'normal' : pick(['warm', 'hot'])) : null;
  o.syrups = {};
  if (D.milk && day >= 2 && Math.random() < 0.45) o.syrups[pick(Object.keys(SYRUPS))] = pick([1, 1, 2, 2, 3]);
  o.tops = [...D.tops];
  if (D.milk && day >= 2 && Math.random() < 0.3) o.tops.push(pick(TOP_KEYS.filter(k => !o.tops.includes(k))));
  // which details the customer only hints at
  r.h = { size: H(), temp: H(), bean: H(), milk: H(), drink: H(), dbl: H(), x3: H(), syrup: H(), top: H() };
  return o;
}

function orderText(o, L) {
  const P = PH[L], r = o.r;
  const greet = P.greets[r.greet];
  if (o.surprise) return `${greet} ${P.surprise} ${STR[L].surprise[o.constraint][0]}`;
  const D = DRINKS[o.drink], adj = [], extra = [], tail = [];
  if (o.drink !== 'espresso' && o.drink !== 'flatwhite') {
    if (r.h.size) extra.push(P.sizeHint[o.size]); else adj.push(P.sizeAdj[o.size]);
  }
  // ("an extra-hot hot chocolate": a hot chocolate says how hot in a sentence of its own)
  if (o.temp && o.temp !== 'normal') { if (r.h.temp || D.choc) extra.push(P.tempHint[o.temp]); else adj.push(P.tempAdj[o.temp]); }
  if (o.bean !== 'esp' && !D.noEsp) { if (r.h.bean) extra.push(P.beanHint[o.bean]); else adj.push(P.beanAdj[o.bean]); }
  if (o.milk && o.milk !== 'whole') { if (r.h.milk) extra.push(P.milkHint[o.milk]); else adj.push(P.milkAdj[o.milk]); }
  let name = P.drink[o.drink], hinted = false;
  // (a hot chocolate is never hinted as "a coffee")
  if (r.h.drink && !D.noEsp) { name = P.coffee; hinted = true; extra.unshift(P.drinkHint[o.drink]); }
  if (o.drink === 'espresso' && o.shots === 2) {
    if (r.h.dbl) extra.push(P.dblHint); else name = hinted ? P.dbl.coffee : P.dbl.espresso;
  }
  if (o.drink !== 'espresso' && o.shots === 3) { if (r.h.x3) extra.push(P.x3Hint); else tail.push(P.x3Tail); }
  for (const [k, n] of Object.entries(o.syrups)) { if (r.h.syrup) extra.push(P.syrupHint(n, k, P)); else tail.push(P.syrupTail(n, k, P)); }
  for (const k of o.tops.filter(x => !D.tops.includes(x))) { if (r.h.top) extra.push(P.topHint[k]); else tail.push(P.topTail[k]); }
  const main = P.build([...adj, name].join(' '), tail, r.form);
  return [greet, main, ...extra].join(' ');
}
const curText = () => G.order ? orderText(G.order, save.lang) : '';

/* ---------------- scoring ---------------- */
function evaluate(o, c, patience) {
  const L = STR[save.lang], checks = [];
  const shotsN = c.shots.length;
  const sumSyr = obj => Object.values(obj).reduce((a, b) => a + b, 0);
  if (o.surprise) {
    const k = o.constraint, sp = L.surprise[k];
    checks.push({ label: L.chk.hasMilk, ok: !!c.milkType, say: L.say.saidMilk });
    checks.push({ label: L.chk.hasEsp, ok: shotsN > 0, say: L.say.noCoffee });
    const ok = { decaf: c.bean === 'decaf' && shotsN > 0, oat: c.milkType === 'oat', almond: c.milkType === 'almond',
      vanilla: (c.syrups.vanilla || 0) >= 1, cinnamon: c.tops.includes('cinnamon'), L: c.size === 'L' }[k];
    checks.push({ label: sp[1], ok, say: sp[2] });
  } else {
    const D = DRINKS[o.drink];
    checks.push({ label: fmt(L.chk.size, L.sizes[o.size]), ok: c.size === o.size, say: fmt(L.say.size, L.sizes[o.size].toLocaleLowerCase(save.lang)) });
    if (D.noEsp) {
      // hot chocolate (issue #21): no coffee, a spoon of cocoa in the cup
      checks.push({ label: L.chk.noEsp, ok: shotsN === 0, say: L.say.noEspWanted });
      checks.push({ label: L.chk.cocoaIn, ok: c.choc > 0, say: L.say.whereChoc });
    } else {
      checks.push({ label: fmt(L.chk.beans, L.beans[o.bean]), ok: c.bean === o.bean && shotsN > 0, say: shotsN ? L.say.beans : L.say.noCoffee });
      checks.push({ label: L.chk.shots(o.shots), ok: shotsN === o.shots, say: shotsN > o.shots ? L.say.strong : L.say.weak });
      if (c.choc) checks.push({ label: L.chk.noCocoaIn, ok: false, say: L.say.chocWhy });
    }
    // iced latte: ice and cold milk; ice in any other drink is a mistake
    if (D.iced) {
      checks.push({ label: L.chk.ice, ok: c.ice > 0, say: L.say.notCold });
      checks.push({ label: L.chk.coldMilk, ok: !!c.milkType && c.cold, say: c.milkType ? L.say.hotMilkIced : L.say.whereMilk });
    } else if (c.ice) checks.push({ label: L.chk.noIce, ok: false, say: L.say.iceWhy });
    if (D.iced) {
      checks.push({ label: L.milkLabel[o.milk], ok: c.milkType === o.milk, say: c.milkType ? L.say.milk : L.say.whereMilk });
    } else if (D.milk) {
      checks.push({ label: L.milkLabel[o.milk], ok: c.milkType === o.milk, say: c.milkType ? L.say.milk : L.say.whereMilk });
      checks.push({ label: L.foams[D.foam], ok: !!c.milkType && c.foamUsed === D.foam, say: c.milkType ? L.say.foam : L.say.whereMilk });
    } else {
      checks.push({ label: L.chk.noMilk, ok: !c.milkType, say: L.say.noMilk });
    }
    const wantS = Object.keys(o.syrups);
    const syrOk = Object.keys(SYRUPS).every(k => (o.syrups[k] || 0) === (c.syrups[k] || 0));
    checks.push({ label: wantS.length ? wantS.map(k => `${L.syrupNames[k]} ×${o.syrups[k]}`).join(', ') : L.chk.noSyrup, ok: syrOk,
      say: sumSyr(c.syrups) > sumSyr(o.syrups) ? L.say.sweet : L.say.sweetOff });
    const topOk = o.tops.length === c.tops.length && o.tops.every(x => c.tops.includes(x));
    checks.push({ label: o.tops.length ? o.tops.map(x => L.tops[x]).join(' + ') : L.chk.plainTop, ok: topOk, say: L.say.top });
  }
  const acc = checks.filter(x => x.ok).length / checks.length;

  const parts = [];
  if (shotsN) {
    parts.push({ name: L.bars.dose, v: c.doseQ, txt: c.dose.toFixed(1) + ' g' });
    const avg = c.shots.reduce((a, s) => a + s.q, 0) / shotsN;
    parts.push({ name: L.bars.shots, v: avg, txt: c.shots.map(s => Math.round(s.t) + ' ' + L.sec).join(' · ') });
  }
  const iced = !o.surprise && DRINKS[o.drink].iced;
  if (c.milkType && iced) {
    // an iced latte's milk is right when it is cold
    parts.push({ name: L.bars.milk, v: c.cold ? 1 : 0, txt: c.cold ? L.bars.cold : Math.round(c.milkTemp) + ' °C' });
  } else if (c.milkType) {
    const band = TEMPS[o.temp || 'normal'], tm = c.milkTemp;
    const dist = tm < band.lo ? band.lo - tm : tm > band.hi ? tm - band.hi : 0;
    parts.push({ name: L.bars.milk, v: c.scorched ? 0 : Math.max(0, 1 - dist * 0.1), txt: Math.round(tm) + ' °C' + (c.scorched ? L.bars.scorched : '') });
  }
  const quality = parts.length ? parts.reduce((a, p) => a + p.v, 0) / parts.length : 0;
  const speed = Math.min(1, clamp(patience, 0, 1) * 1.4);
  const score = 0.55 * acc + 0.27 * quality + 0.18 * speed;
  const empty = !shotsN && !c.milkType;
  const stars = empty ? 1 : clamp(Math.round(score * 5), 1, 5);
  const base = (o.surprise ? 4.5 : DRINKS[o.drink].price) * SIZES[c.size].mult;
  // a badly wrong drink gets a reluctant partial payment, an empty cup nothing and a late one is paid short;
  // a quick, decent drink earns a little extra on top of the star tip
  const late = patience <= 0, fast = !late && patience >= 0.6 && stars >= 3;
  const pay = empty ? 0 : Math.round((acc >= 0.6 ? base : acc >= 0.3 ? base * 0.4 : 0) * (late ? 0.6 : 1) * 4) / 4;
  const tip = Math.round(((stars >= 4 ? base * (stars === 5 ? 0.35 : 0.15) : 0) + (fast ? base * 0.1 : 0)) * (has('tipjar') ? 1.5 : 1) * 4) / 4;

  let quote;
  const miss = checks.find(x => !x.ok), q = o.r.q;
  if (stars === 5) quote = L.q5[q % L.q5.length];
  else if (stars === 4) quote = miss ? fmt(L.though, low1(miss.say, save.lang)) : L.q4[q % L.q4.length];
  else if (miss) quote = miss.say;
  else if (patience <= 0) quote = L.forever;
  else quote = L.meh[q % L.meh.length];
  return { checks, acc, parts, quality, speed, stars, pay, tip, fast, late, quote };
}
