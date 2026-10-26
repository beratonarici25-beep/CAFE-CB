// Recipe shop balance (issue #21): over the 7-day demo (issue #25), what can a good and an average player unlock?
// Plays many runs inside the real game page (its orders, prices, cup sizes and pay formula) with a simple player:
//   good:    every drink 5 stars and fast (full pay, the 5-star tip and the speed bonus);
//   average: 4 stars 60% of the time, otherwise 3 (full pay, a small tip at 4 stars, never fast);
// buying the cheapest recipe it can afford at the end of each day (no upgrades), or, with BUY=upgrades, an upgrade
// first and then recipes. Prints the median day each recipe gets unlocked and the money left at the end of day 7.
// Run: node tools/balance.js   (needs playwright-core and Microsoft Edge, like the tests)
const path = require('path');
const pw = require(process.env.PW_CORE || 'playwright-core');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const DAYS = +(process.env.DAYS || 7), RUNS = +(process.env.RUNS || 400);

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('cafe-cb-save-v1', JSON.stringify({ lang: 'en', tutorialDone: true })));
  await page.goto(URL);
  const out = await page.evaluate(([DAYS, RUNS, upgFirst]) => {
    const pay = (o, prof) => {
      const size = o.surprise ? (o.constraint === 'L' ? 'L' : 'M') : o.size;
      const base = (o.surprise ? 4.5 : DRINKS[o.drink].price) * SIZES[size].mult;
      const stars = prof === 'good' ? 5 : Math.random() < 0.6 ? 4 : 3, fast = prof === 'good';
      const tip = (stars >= 4 ? base * (stars === 5 ? 0.35 : 0.15) : 0) + (fast ? base * 0.1 : 0);
      return Math.round(base * 4) / 4 + Math.round(tip * 4) / 4;
    };
    const res = {};
    for (const prof of ['good', 'average']) {
      const when = {}, left = [], earned = [];
      for (let run = 0; run < RUNS; run++) {
        save.recipes = ['espresso', 'latte']; save.upgrades = [];
        let cash = 0, total = 0;
        for (let day = 1; day <= DAYS; day++) {
          const n = Math.min(4 + day, 9);
          for (let i = 0; i < n; i++) { const p = pay(makeOrder(day), prof); cash += p; total += p; }
          // the shop at the end of the day
          if (upgFirst && !save.upgrades.length && cash >= UPGRADES[0].cost) { cash -= UPGRADES[0].cost; save.upgrades.push(UPGRADES[0].id); }
          for (const [k, c] of Object.entries(RECIPE_COST).sort((a, b) => a[1] - b[1])) {
            if (!save.recipes.includes(k) && cash >= c) { cash -= c; save.recipes.push(k); (when[k] = when[k] || []).push(day); }
          }
        }
        left.push(cash); earned.push(total);
      }
      const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
      res[prof] = {
        earnedIn7Days: Math.round(med(earned)),
        recipes: Object.fromEntries(Object.keys(RECIPE_COST).map(k => [k, (when[k] || []).length >= RUNS / 2 ? 'day ' + med(when[k]) : 'not in the demo'])),
        recipesBoughtMedian: med(Array.from({ length: RUNS }, (_, i) => Object.values(when).filter(a => a.length > i).length)),
        cashLeft: Math.round(med(left)),
      };
    }
    return res;
  }, [DAYS, RUNS, process.env.BUY === 'upgrades']);
  console.log(`prices: ${JSON.stringify(await page.evaluate(() => RECIPE_COST))}, ${DAYS} days, ${RUNS} runs, ${process.env.BUY === 'upgrades' ? 'first upgrade bought first' : 'recipes only'}`);
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
