// Recipe shop test (issue #21): a new game only orders espresso and latte; a recipe is bought with the café's money
// from the menu or the day-end screen (not without enough money); the next day it is announced, the helper introduces
// it on its first guest (skippable, no patience lost) and it starts being ordered; the recipe book greys out locked
// drinks; an old save keeps every drink it had; reset goes back to the two starters. TR and EN.
// Run: node tests/recipes.js   (needs playwright-core and Microsoft Edge, like tests/e2e.js)
const path = require('path');
const pw = require(process.env.PW_CORE || 'playwright-core');
const { arrive, brewOrder } = require('./e2e.js');

const URL = process.env.GAME_URL || 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };

// the drinks makeOrder() can come up with, over many tries
const orderable = (page, day, fresh = []) => page.evaluate(([d, f]) => {
  const seen = new Set();
  for (let i = 0; i < 3000; i++) { const o = makeOrder(d, f); if (!o.surprise) seen.add(o.drink); }
  return [...seen].sort();
}, [day, fresh]);

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const newPage = async (init, opts = { viewport: { width: 1366, height: 900 } }) => {
    const ctx = await browser.newContext(opts);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { if (s) localStorage.setItem('cafe-cb-save-v1', s); sessionStorage.setItem('seeded', '1'); } }, init);
    await p.goto(URL); await p.waitForTimeout(300);
    return p;
  };
  const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('cafe-cb-save-v1') || '{}'));

  // ---- a new game ----
  const page = await newPage(JSON.stringify({ lang: 'en', tutorialDone: true, cash: 15 }));
  ok('new game: only espresso and latte open', JSON.stringify(await page.evaluate(() => save.recipes)) === '["espresso","latte"]');
  ok('new game: day 1 orders only espresso and latte', JSON.stringify(await orderable(page, 1)) === '["espresso","latte"]');
  ok('new game: day 5 orders only espresso and latte', JSON.stringify(await orderable(page, 5)) === '["espresso","latte"]');
  // the menu shop: a card per recipe; too expensive ones are disabled and say what is missing
  const cards = await page.evaluate(() => [...document.querySelectorAll('#menuRecipes [data-rec]')].map(c => ({
    k: c.dataset.rec, dis: !!(c.querySelector('button') || {}).disabled, need: (c.querySelector('.need') || {}).textContent || '' })));
  ok('menu: a card for every recipe', cards.map(c => c.k).join() === 'cappuccino,hotchoc,flatwhite,iced,mocha', JSON.stringify(cards));
  const card = k => cards.find(c => c.k === k) || {};
  ok('menu: $15 buys a cappuccino ($10)', !card('cappuccino').dis);
  // the recipe book greys out what is not bought yet
  await page.click('#howBtn');
  const book = await page.evaluate(() => [...document.querySelectorAll('#bookBody tr[data-d]')].map(tr => tr.dataset.d + ':' + tr.classList.contains('locked')).join());
  ok('book: locked drinks greyed out', book === 'espresso:false,latte:false,cappuccino:true,flatwhite:true,mocha:true,hotchoc:true,iced:true', book);
  await page.click('#closeBookBtn');
  // buy the cappuccino
  await page.click('#menuRecipes [data-r="cappuccino"]');
  const after = await saved(page);
  ok('buy: money taken and the recipe saved', after.cash === 5 && after.recipes.includes('cappuccino') && after.intros.includes('cappuccino'), JSON.stringify(after));
  ok('buy: card now says on the menu, celebration and toast', await page.evaluate(() => {
    const c = document.querySelector('#menuRecipes [data-rec="cappuccino"]');
    return c.classList.contains('own') && !document.querySelector('#toast').hidden;
  }));
  ok('buy: HUD and menu savings show the new cash', (await page.textContent('#mCash')) === '$5.00' && (await page.textContent('#hudCash')) === '$5.00');
  const mocha = await page.evaluate(() => { const c = document.querySelector('#menuRecipes [data-rec="mocha"]'); return { dis: c.querySelector('button').disabled, need: (c.querySelector('.need') || {}).textContent || '' }; });
  ok('menu: mocha ($10) disabled with $5, $5 short', mocha.dis && mocha.need.includes('5.00'), JSON.stringify(mocha));
  await page.evaluate(() => document.querySelector('#menuRecipes [data-r="mocha"]').click());
  ok('menu: a disabled recipe cannot be bought', (await page.evaluate(() => save.cash)) === 5 && !(await page.evaluate(() => save.recipes.includes('mocha'))));
  // ---- the next day: announced, introduced on its first guest, then ordered ----
  await page.click('#startBtn');
  ok('next day: announced', /Cappuccino/.test(await page.textContent('#toast')));
  ok('next day: the first guest orders a cappuccino', await page.evaluate(() => CB.G.order.drink === 'cappuccino' && Intro.active));
  ok('next day: the helper introduces it', await page.waitForFunction(() => { const h = document.querySelector('.helper'); return !h.hidden && /cappuccino/i.test(h.textContent); }, null, { timeout: 8000 }).then(() => true, () => false));
  await arrive(page);
  const steps = [];
  for (let i = 0; i < 4 && await page.evaluate(() => Intro.active); i++) {
    await page.waitForTimeout(300);
    steps.push(await page.evaluate(() => Helper.key));
    await page.click('.hl-btns .btn.go');
  }
  ok('intro: two lines at the bench, then she leaves', steps.join() === 'intro_cappuccino1,intro_cappuccino2' && !(await page.evaluate(() => Intro.active)), steps.join());
  ok('intro: no patience lost while she talked', await page.evaluate(() => CB.G.patience > 0.97), String(await page.evaluate(() => CB.G.patience)));
  const r = await brewOrder(page);
  ok('intro: the cappuccino can be brewed to 4+ stars', r.stars >= 4, JSON.stringify(r));
  ok('next day: cappuccino now in the order pool', (await orderable(page, 2)).includes('cappuccino'));
  ok('next day: intro done, not shown again', (await saved(page)).intros.length === 0);

  // ---- skipping an intro, Turkish, from the day-end screen ----
  const tr = await newPage(JSON.stringify({ lang: 'tr', tutorialDone: true, cash: 300, recipes: ['espresso', 'latte'], served: 3, day: 2 }));
  ok('save with recipes: not widened by the old-save rule', JSON.stringify(await tr.evaluate(() => save.recipes)) === '["espresso","latte"]');
  ok('TR: shop card text in Turkish', /Menüde|eksik|\$/.test(await tr.textContent('#menuRecipes')) && (await tr.textContent('#menuRecipes h3')) === 'Tarifler');
  await tr.click('#menuRecipes [data-r="mocha"]');
  await tr.click('#menuRecipes [data-r="flatwhite"]');
  await tr.click('#startBtn');
  ok('TR: both announced', await tr.evaluate(() => /Mocha/.test(document.querySelector('#toast').textContent) && /Flat white/i.test(document.querySelector('#toast').textContent)), await tr.textContent('#toast'));
  await tr.waitForFunction(() => !document.querySelector('.helper').hidden, null, { timeout: 8000 });
  ok('TR: the helper speaks Turkish', /menüde yeni/i.test(await tr.textContent('.helper .hl-text')));
  await tr.click('.hl-btns .btn.skip');
  ok('TR: the intro can be skipped', !(await tr.evaluate(() => Intro.active)) && await tr.evaluate(() => document.querySelector('.helper').hidden));
  const pool = await orderable(tr, 2, ['mocha', 'flatwhite']);
  ok('TR: both bought drinks are ordered', pool.includes('mocha') && pool.includes('flatwhite') && !pool.includes('cappuccino'), pool.join());

  // ---- the two new drinks, each with a step of its own: brewed for real ----
  const nd = await newPage(JSON.stringify({ lang: 'en', tutorialDone: true, cash: 260, day: 3, served: 9 }));
  ok('new drinks: not on the bench before they are bought', await nd.evaluate(() => document.querySelector('#extras').hidden && document.querySelector('#iceObj').hidden));
  ok('new drinks: cold milk refused before the iced latte is bought', await nd.evaluate(() => { B.cup = { ...newCup(), size: 'M' }; const e = check('milk:whole', 'cup'); B.cup = newCup(); return e === 'nope'; }));
  await nd.click('#menuRecipes [data-r="iced"]');
  await nd.click('#menuRecipes [data-r="hotchoc"]');
  ok('new drinks: both bought ($10 + $10)', await nd.evaluate(() => save.cash === 240 && save.recipes.includes('iced') && save.recipes.includes('hotchoc')));
  await nd.click('#startBtn');
  for (const drink of ['iced', 'hotchoc']) {
    if (drink === 'hotchoc') { await nd.click('#nextBtn'); }
    await nd.waitForFunction(() => CB.G.state === 'ORDER_PENDING' && CB.G.cust && CB.G.cust.state === 'wait', null, { timeout: 12000 });
    // the first guest orders the first new drink (intro); the next one is set to the other
    await nd.evaluate(d => { CB.G.order = makeOrder(CB.G.day, [], d); CB.G.typed = 1e9; render(); }, drink);
    await nd.evaluate(() => Intro.stop());
    await arrive(nd);
    if (drink === 'iced') ok('iced latte: ice bucket and cocoa tin on the bench', await nd.evaluate(() => !document.querySelector('#iceObj').hidden && !document.querySelector('#cocoaObj').hidden));
    const res = await brewOrder(nd);
    ok(`${drink}: brewed with its new step to 4+ stars`, res.stars >= 4, JSON.stringify(res));
  }
  ok('hot chocolate: never hinted as a coffee, never asks for beans', await nd.evaluate(() => {
    for (let i = 0; i < 500; i++) { const o = makeOrder(7, [], 'hotchoc'); const tx = orderText(o, 'en'); if (/coffee|decaf|dark roast|shot|hot hot/i.test(tx) || /sıcak sıcak/i.test(orderText(o, 'tr')) || o.shots) return false; }
    return true;
  }));
  ok('iced latte: never asks for a temperature', await nd.evaluate(() => { for (let i = 0; i < 300; i++) if (makeOrder(7, [], 'iced').temp) return false; return true; }));
  // wrong-way checks: hot milk in an iced latte, coffee in a hot chocolate, ice in a latte
  const wrong = await nd.evaluate(() => {
    const o = d => ({ ...makeOrder(4, [], d), size: 'M', bean: 'esp', syrups: {}, tops: [], milk: 'whole' });
    const cup = x => ({ ...newCup(), size: 'M', ...x });
    const shots = [{ t: 27, q: 1 }, { t: 27, q: 1 }];
    const hotIced = evaluate({ ...o('iced'), shots: 2 }, cup({ shots, ice: 1, milkPoured: true, milkType: 'whole', foamUsed: 'light', milkTemp: 63 }), 1);
    const espChoc = evaluate(o('hotchoc'), cup({ shots, choc: 1, milkPoured: true, milkType: 'whole', foamUsed: 'light', milkTemp: 63 }), 1);
    const iceLatte = evaluate({ ...o('latte'), shots: 2, temp: 'normal' }, cup({ shots, ice: 1, milkPoured: true, milkType: 'whole', foamUsed: 'light', milkTemp: 63 }), 1);
    return [hotIced, espChoc, iceLatte].map(r => r.checks.filter(c => !c.ok).map(c => c.label).join('+'));
  });
  ok('scoring: hot milk in an iced latte, coffee in a hot chocolate, ice in a latte are all caught',
    wrong[0] === 'Cold milk' && wrong[1] === 'No coffee' && wrong[2] === 'No ice', JSON.stringify(wrong));

  // ---- an old save from before the recipe shop keeps its drinks; reset goes back to the starters ----
  const old = await newPage(JSON.stringify({ lang: 'en', day: 4, cash: 50, served: 12, tutorialDone: true, upgrades: ['stools'] }));
  ok('old save: every drink it had is open', (await old.evaluate(() => save.recipes.length)) === 5);
  ok('old save: progress kept', await old.evaluate(() => save.cash === 50 && save.day === 4 && has('stools')));
  ok('old save: all cards show on the menu', await old.evaluate(() => document.querySelectorAll('#menuRecipes .rec.own').length === 3));
  await old.click('#resetBtn'); await old.click('#resetBtn');
  ok('reset: back to the two starter recipes and no upgrades', await old.evaluate(() => save.recipes.join() === 'espresso,latte' && save.upgrades.length === 0 && save.cash === 0));
  // buying an upgrade after a reset must not leak into the defaults (DEFAULT_SAVE used to share its array)
  ok('reset: defaults untouched', await old.evaluate(() => DEFAULT_SAVE.upgrades.length === 0 && !('recipes' in DEFAULT_SAVE)));

  // ---- phone: the shop fits and buys by tap ----
  const phone = await newPage(JSON.stringify({ lang: 'tr', tutorialDone: true, cash: 80 }), { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const b = await phone.locator('#menuRecipes [data-r="cappuccino"]').boundingBox();
  await phone.locator('#menuRecipes [data-r="cappuccino"]').scrollIntoViewIfNeeded();
  await phone.tap('#menuRecipes [data-r="cappuccino"]');
  ok('phone: recipe bought by tap', await phone.evaluate(() => save.recipes.includes('cappuccino')), JSON.stringify(b));

  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  for (const x of results) console.log(x.join('  '));
  const fails = results.filter(x => x[0] === 'FAIL').length;
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); for (const x of results) console.log(x.join('  ')); process.exit(1); });
