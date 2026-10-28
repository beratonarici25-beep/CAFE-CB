// Issue #19: plays 30 days of the café's money with three kinds of barista (node tests/economy.js).
// The guests' pay comes from the same price list as the game; the player types differ in the stars they earn.
global.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const { ECON, rentFor, repTipMult, repGuests, repAfter, settleDay } = require('../js/economy.js');
const PRICE = 4.25;   // an average drink
const PLAYERS = { good: { stars: 4.7, acc: 1 }, medium: { stars: 3.4, acc: 0.85 }, bad: { stars: 2.2, acc: 0.5 } };
let fails = 0;
const ok = (name, c) => { console.log((c ? 'ok   ' : 'FAIL ') + name); if (!c) fails++; };

function play(p) {
  let cash = 0, debt = 0, rep = ECON.repStart, rows = [];
  for (let day = 1; day <= 30; day++) {
    const guests = Math.max(3, Math.min(4 + day, 9) + repGuests(rep));
    const sales = guests * PRICE * p.acc;
    const tip = p.stars >= 4 ? guests * PRICE * (p.stars >= 4.5 ? 0.35 : 0.15) * repTipMult(rep) : 0;
    cash += sales + tip;
    const s = settleDay(day, cash, debt, sales, tip, guests * PRICE * ECON.costRate);
    cash = s.cash; debt = s.debt; rep = repAfter(rep, p.stars);
    rows.push({ day, cash, debt, rep, net: s.net });
  }
  return rows;
}
const R = Object.fromEntries(Object.entries(PLAYERS).map(([k, p]) => [k, play(p)]));
for (const [k, rows] of Object.entries(R)) {
  console.log(k.padEnd(7) + [1, 5, 10, 20, 30].map(d => `d${d}: $${rows[d - 1].cash.toFixed(0)}${rows[d - 1].debt ? ' (owes $' + rows[d - 1].debt.toFixed(0) + ')' : ''} ★${rows[d - 1].rep.toFixed(1)}`).join('  '));
}
const last = k => R[k][29];
ok('good player ends rich and clear of debt', last('good').cash > 400 && last('good').debt === 0);
ok('medium player keeps afloat and saves', last('medium').debt === 0 && last('medium').cash > 100);
ok('bad player struggles (little cash) but is never negative', last('bad').cash < last('medium').cash && R.bad.every(r => r.cash >= 0 && r.debt >= 0));
ok('first day has no rent', rentFor(1) === 0 && rentFor(2) > 0 && rentFor(99) === ECON.rentMax);
ok('what the till cannot cover becomes debt', settleDay(5, 3, 0, 3, 0, 1).debt > 0 && settleDay(5, 3, 0, 3, 0, 1).cash === 0);
ok('debt is paid off first from later takings', settleDay(5, 20, 6, 0, 0, 0).debt === 0);
process.exit(fails ? 1 : 0);
