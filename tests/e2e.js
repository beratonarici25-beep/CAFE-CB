// End-to-end check: plays real orders with mouse drags in headless Edge.
// Run: node tests/e2e.js   (needs playwright-core; set PW_CORE to its path if it is not resolvable)
const path = require('path');
const pw = require(process.env.PW_CORE || 'playwright-core');

const URL = process.env.GAME_URL || 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };

async function drag(page, from, to) {
  // a real player scrolls a little when the thing they want is below the fold
  const pre = await page.locator(from).first().boundingBox();
  const vh = page.viewportSize().height;
  if (pre && pre.y + pre.height / 2 > vh - 20) {
    await page.evaluate(dy => window.scrollBy(0, dy), Math.ceil(pre.y + pre.height - vh + 30));
    await page.waitForTimeout(50);
  }
  const a = await page.locator(from).first().boundingBox();
  const b = await page.locator(to).first().boundingBox();
  if (!a || !b) throw new Error(`no box for ${!a ? from : to}`);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(a.x + a.width / 2 + (b.x + b.width / 2 - a.x - a.width / 2) * i / steps,
      a.y + a.height / 2 + (b.y + b.height / 2 - a.y - a.height / 2) * i / steps);
  }
  await page.waitForTimeout(40);
  await page.mouse.up();
  await page.waitForTimeout(60);
}
async function hold(page, sel, untilFn) {
  const b = await page.locator(sel).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  try { await page.waitForFunction(untilFn, null, { timeout: 15000 }); }
  catch (e) {
    console.log('hold failed on', sel, await page.evaluate(() => JSON.stringify({ pf: window.CB.B.pf, pitcher: window.CB.B.pitcher, y: scrollY,
      toast: document.querySelector('#toast').textContent, state: window.CB.G.state })));
    throw e;
  }
  await page.mouse.up();
}
const st = (page, fn) => page.evaluate(fn);

// waits until the view slide is over, so drags hit things where they will stay
const settled = (page, view) => page.waitForFunction(v => window.CB.view() === v && !window.CB.switching(), view, { timeout: 5000 });
async function arrive(page) {
  await page.waitForFunction(() => window.CB.G.state === 'ORDER_PENDING' && window.CB.G.cust && window.CB.G.cust.state === 'wait', null, { timeout: 10000 });
  await page.click('#takeBtn');
  await page.waitForFunction(() => window.CB.G.state === 'PREPARING');
  await settled(page, 'barista');
}
// serving tray -> bell -> back in the customer view, drag the cup onto the customer
async function handOver(page) {
  await drag(page, '#cupObj', '#slotServe');
  await page.click('#serveBtn');
  await page.waitForFunction(() => window.CB.G.state === 'READY_TO_SERVE');
  await settled(page, 'customer');
  await drag(page, '#cupObj', '#custZone');
}

// brews whatever the current order asks for, using drags for every object move
async function brewOrder(page) {
  const o = await st(page, () => window.CB.G.order);
  const want = o.surprise ? { size: o.constraint === 'L' ? 'L' : 'M', bean: o.constraint === 'decaf' ? 'decaf' : 'esp', shots: 2,
    milk: ['oat', 'almond'].includes(o.constraint) ? o.constraint : 'whole', foam: 'light', temp: 'normal',
    syrups: o.constraint === 'vanilla' ? { vanilla: 1 } : {}, tops: o.constraint === 'cinnamon' ? ['cinnamon'] : [] }
    : { size: o.size, bean: o.bean, shots: o.shots, milk: o.milk, foam: o.milk ? { latte: 'light', cappuccino: 'thick', flatwhite: 'none', mocha: 'light' }[o.drink] : null,
      temp: o.temp, syrups: o.syrups, tops: o.tops };
  await drag(page, `[data-drag="newcup:${want.size}"]`, '#slotTray');
  await drag(page, '#pfObj', '#slotGrinder');
  await page.click(`#beanChips [data-k="${want.bean}"]`);
  await hold(page, '#grindBtn', () => window.CB.B.pf.dose >= 17.6);
  await drag(page, '#tamperObj', '#pfObj');
  await drag(page, '#pfObj', '#slotGroup');
  for (let i = 0; i < want.shots; i++) {
    await page.click('#brewBtn');
    await page.waitForFunction(() => window.CB.B.cup.shotT >= 26.5);
    await page.click('#brewBtn');
  }
  if (want.milk) {
    await drag(page, `[data-drag="milk:${want.milk}"]`, '#pitcherObj');
    await drag(page, '#pitcherObj', '#slotWand');
    await page.click(`#foamChips [data-k="${want.foam}"]`);
    const target = { warm: 53, normal: 63, hot: 72 }[want.temp || 'normal'];
    await hold(page, '#steamBtn', `window.CB.B.pitcher.temp >= ${target}`);
    await drag(page, '#pitcherObj', '#cupObj');
  }
  for (const [k, n] of Object.entries(want.syrups || {})) for (let i = 0; i < n; i++) await drag(page, `[data-drag="syrup:${k}"]`, '#cupObj');
  for (const k of want.tops || []) {
    await drag(page, `[data-drag="top:${k}"]`, '#cupObj');
    const tops = await st(page, () => window.CB.B.cup.tops.join(','));
    if (!tops.includes(k)) console.log('topping drag missed', k, tops, await page.textContent('#toast'));
  }
  await handOver(page);
  const floated = await page.locator('.float-money').count();
  await page.waitForFunction(() => window.CB.G.state === 'RESULT', null, { timeout: 5000 })
    .catch(async e => { console.log('no result:', await page.evaluate(() => JSON.stringify({ st: CB.G.state, cup: CB.cupState(), at: CB.B.cup.at, view: CB.view(), toast: document.querySelector('#toast').textContent }))); throw e; });
  return st(page, () => ({ stars: window.CB.G.result.stars, checks: window.CB.G.result.checks.filter(c => !c.ok).map(c => c.label) }))
    .then(r => ({ ...r, floated }));
}

module.exports = { drag, hold, arrive, settled, brewOrder };
if (require.main === module) (async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|favicon/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => localStorage.setItem('cafe-cb-save-v1', JSON.stringify({ lang: 'en', day: 3, cash: 0, tutorialDone: true })));
  await page.goto(URL);
  await page.waitForTimeout(300);
  ok('menu visible on load', await page.isVisible('#ovMenu'));

  // issue #5: customer view first, ticket appears once the order is said, then the bench slides in
  await page.click('#startBtn');
  await page.waitForFunction(() => window.CB.G.state === 'ORDER_PENDING' && window.CB.G.cust && window.CB.G.cust.state === 'wait', null, { timeout: 10000 });
  ok('order starts in the customer view', await page.evaluate(() => CB.view() === 'customer' && document.querySelector('#bench').classList.contains('view-off')));
  await page.waitForFunction(() => !document.querySelector('#ticket').hidden, null, { timeout: 8000 });
  ok('order ticket shows in the customer view', await page.evaluate(() => !!document.querySelector('#scene #ticket') && document.querySelector('#ticketText').textContent.includes('\u201c')));
  ok('go-to-barista button is offered', await page.isVisible('#takeBtn'));
  await page.click('#takeBtn');
  await settled(page, 'barista');
  ok('barista view replaces the customer view', await page.evaluate(() => document.querySelector('#scene').classList.contains('view-off') && !!document.querySelector('#bench #ticket')));
  ok('serve bell is off until a cup is on the tray', await page.isDisabled('#serveBtn'));
  // issue #7: controls live on the machines, there are no loose hold buttons
  ok('grind button is on the grinder', await page.evaluate(() => !!document.querySelector('.grinder-body #grindBtn') && !!document.querySelector('.grinder-body #beanChips')));
  ok('brew + steam buttons are on the machine', await page.evaluate(() => !!document.querySelector('.machine #brewBtn') && !!document.querySelector('.machine #steamBtn') && !!document.querySelector('.machine #foamChips')));
  ok('no loose hold buttons', (await page.locator('.btn.hold, .chip').count()) === 0);
  await page.click('#peekBtn');
  await settled(page, 'customer');
  ok('peek shows the customer while preparing', await page.evaluate(() => CB.G.state === 'PREPARING' && CB.view() === 'customer'));
  await page.click('#backBtn');
  await settled(page, 'barista');
  await drag(page, '[data-drag="newcup:S"]', '#slotPrep');
  ok('cup cannot go to the customer before the bell', await page.evaluate(() => CB.drop('cup', 'customer') === 'notReady'));
  await page.click('[data-drag="syrup:vanilla"] .pumphead');
  ok('pressing a syrup pump head pumps into the cup', await page.evaluate(() => CB.B.cup.syrups.vanilla === 1));
  await drag(page, '#cupObj', '#slotServe');
  ok('cup sits on the serving tray', await page.evaluate(() => CB.B.cup.at === 'serving'));
  ok('serve bell lights up', await page.evaluate(() => !document.querySelector('#serveBtn').disabled && document.querySelector('#serveBtn').classList.contains('ready')));
  await page.click('#serveBtn');
  await page.waitForFunction(() => window.CB.G.state === 'READY_TO_SERVE');
  await settled(page, 'customer');
  ok('cup waits on the tray at the bar', await page.evaluate(() => !!document.querySelector('#custTray #cupObj') && !document.querySelector('#cupObj').hidden));
  ok('hint to drag the cup is shown', await page.isVisible('#handHint'));
  // a slow, wobbly drag so the slosh redraw and the spill drops run
  {
    const a = await page.locator('#cupObj').boundingBox(), b = await page.locator('#custZone').boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    for (let i = 1; i <= 24; i++) {
      await page.mouse.move(a.x + a.width / 2 + (b.x + b.width / 2 - a.x - a.width / 2) * i / 24, a.y + a.height / 2 + (b.y + b.height / 2 - a.y - a.height / 2) * i / 24 + Math.sin(i) * 30);
      await page.waitForTimeout(16);
    }
    ok('dragged cup is a live redrawn ghost', await page.evaluate(() => !!document.querySelector('.drag-ghost canvas')));
    await page.mouse.up();
  }
  await page.waitForFunction(() => window.CB.G.state === 'COMPLETED' || window.CB.G.state === 'RESULT', null, { timeout: 3000 });
  ok('dropping the cup on the customer serves it', await page.evaluate(() => !!CB.G.result && CB.G.cust.react != null));
  await page.waitForFunction(() => window.CB.G.state === 'RESULT', null, { timeout: 5000 });
  await page.click('#nextBtn');

  // full orders with drags
  for (let i = 0; i < 3; i++) {
    await arrive(page);
    const r = await brewOrder(page);
    ok(`order ${i + 1} brewed by drag gets 4+ stars`, r.stars >= 4, JSON.stringify(r));
    ok(`order ${i + 1} shows floating earnings`, r.floated > 0);
    await page.click('#nextBtn');
  }

  // sequence errors give feedback
  await arrive(page);
  await page.click('#brewBtn');
  ok('brew without portafilter shows a hint', (await page.textContent('#toast')).includes('portafilter'));
  await drag(page, '#tamperObj', '#pfObj');
  ok('tamping an empty portafilter is refused', !(await st(page, () => window.CB.B.pf.tamped)));
  await drag(page, '[data-drag="syrup:vanilla"]', '#slotPrep');
  ok('syrup with no cup does nothing', await st(page, () => !window.CB.B.cup.size));

  // tap-to-place
  await page.click('[data-drag="newcup:M"]');
  ok('tap selects an object', await page.isVisible('#holding'));
  await page.click('#slotPrep');
  ok('tap on target places it', await st(page, () => window.CB.B.cup.size === 'M' && window.CB.B.cup.at === 'prep'));
  await page.click('[data-drag="syrup:caramel"]');
  await page.click('#cupObj');
  ok('tap syrup then cup adds a pump', await st(page, () => window.CB.B.cup.syrups.caramel === 1));
  await drag(page, '#cupObj', '#trashZone');
  ok('dragging the cup to the trash clears it', await st(page, () => !window.CB.B.cup.size));
  await page.waitForTimeout(500);
  ok('no leftover drag ghosts', (await page.locator('.drag-ghost').count()) === 0,
    await page.evaluate(() => [...document.querySelectorAll('.drag-ghost')].map(g => g.className + ' ' + (g.dataset.drag || '')).join(', ')));

  // language
  await page.click('#langBtn');
  ok('Turkish labels on the bench', (await page.textContent('.z-machine h3')).includes('Espresso makinesi'));
  await page.click('#brewBtn');
  ok('Turkish error message', (await page.textContent('#toast')).includes('Portafiltre'));
  await page.click('#langBtn');

  // phone held sideways, both views: nothing scrolls (issue #14; every size is in tests/layout.js)
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  const scrolls = () => page.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight));
  let overflow = await scrolls();
  ok('no page scroll at 844x390 (bench)', overflow <= 0, 'overflow ' + overflow);
  await page.click('#peekBtn');
  await settled(page, 'customer');
  overflow = await scrolls();
  ok('no page scroll at 844x390 (customer)', overflow <= 0, 'overflow ' + overflow);
  try { await page.screenshot({ path: path.join(process.env.SHOT_DIR || __dirname, 'shot-mobile-customer.png'), timeout: 8000 }); } catch (e) {}
  await page.click('#backBtn');
  await settled(page, 'barista');
  await page.setViewportSize({ width: 1366, height: 900 });

  try { await page.screenshot({ path: path.join(process.env.SHOT_DIR || __dirname, 'shot-desktop.png'), fullPage: true, timeout: 8000 }); }
  catch (e) { console.log('(screenshot skipped: ' + e.message.split(/\r?\n/)[0] + ')'); }
  ok('particle canvas present', (await page.locator('#fxCv').count()) === 1);
  ok('no page errors', errors.length === 0, errors.join(' | '));

  // the whole flow still works with reduced motion (no particles, instant moves)
  const rm = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  const rmErrors = [];
  rm.on('pageerror', e => rmErrors.push(e.message));
  await rm.addInitScript(() => localStorage.setItem('cafe-cb-save-v1', JSON.stringify({ lang: 'tr', day: 2, cash: 0, tutorialDone: true })));
  await rm.goto(URL);
  await rm.click('#startBtn');
  await arrive(rm);
  const rr = await brewOrder(rm);
  ok('reduced motion: order brewed by drag gets 4+ stars', rr.stars >= 4, JSON.stringify(rr));
  ok('reduced motion: no page errors', rmErrors.length === 0, rmErrors.join(' | '));

  // a whole day: serve quick (wrong) drinks until the shop closes, then open the next day
  await rm.click('#nextBtn');
  for (let guard = 0; guard < 12; guard++) {
    const stt = await rm.evaluate(() => window.CB.G.state);
    if (stt === 'DAY_END') break;
    await arrive(rm);
    await rm.evaluate(() => { CB.drop('newcup:S', 'prep'); CB.drop('cup', 'serving'); document.querySelector('#serveBtn').click(); CB.drop('cup', 'customer'); });
    await rm.waitForFunction(() => window.CB.G.state === 'RESULT');
    await rm.click('#nextBtn');
    await rm.waitForFunction(() => window.CB.G.state !== 'RESULT');
    await rm.waitForFunction(() => ['ORDER_PENDING', 'DAY_END'].includes(window.CB.G.state), null, { timeout: 10000 });
  }
  ok('day ends after the last guest', await rm.evaluate(() => window.CB.G.state === 'DAY_END'));
  await rm.click('#nextDayBtn');
  ok('next day opens', await rm.evaluate(() => window.CB.G.state === 'ORDER_PENDING' && window.CB.G.day === 3));
  ok('full day: no page errors', rmErrors.length === 0, rmErrors.join(' | '));
  await browser.close();
  for (const r of results) console.log(r.join('  '));
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); for (const r of results) console.log(r.join('  ')); process.exit(1); });
