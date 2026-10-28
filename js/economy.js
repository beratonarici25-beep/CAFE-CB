/* The café's money and name (issue #19). Every number that tunes the economy is in ECON; tests/economy.js reuses
   these functions to play 30 days with three kinds of barista. */
'use strict';
const ECON = {
  costRate: 0.25,   // ingredients: this share of what the drink would cost, whatever the guest paid
  freeDays: 1,      // the first day (the tutorial) has no rent
  rentBase: 4, rentPerDay: 0.5, rentMax: 10,   // rent is due at the end of every day
  repKeep: 0.7,     // reputation is a running average: a day's stars count for the other 30%
  repStart: 3,
};
const cents = n => Math.round(n * 100) / 100;
const rentFor = day => day <= ECON.freeDays ? 0 : Math.round(Math.min(ECON.rentMax, ECON.rentBase + ECON.rentPerDay * day));
// a good name brings a little more in tips, and one more guest a day (a bad one, one fewer)
const repTipMult = rep => 0.7 + 0.1 * rep;
const repGuests = rep => rep >= 4.5 ? 1 : rep < 2.5 ? -1 : 0;
const repAfter = (rep, avgStars) => clamp(rep * ECON.repKeep + avgStars * (1 - ECON.repKeep), 1, 5);
// closing the books. `cash` already holds the day's sales and tips. Whatever the till cannot cover (ingredients, rent,
// an older debt) stays as debt for the next day; the game never ends over it.
function settleDay(day, cash, debt, sales, tips, cost) {
  const rent = rentFor(day), due = cents(cost + rent + debt), paid = Math.min(cash, due);
  return { rent, net: cents(sales + tips - cost - rent), cash: cents(cash - paid), debt: cents(due - paid) };
}
if (typeof module !== 'undefined') module.exports = { ECON, rentFor, repTipMult, repGuests, repAfter, settleDay };
