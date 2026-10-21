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

async function arrive(page) {
  await page.waitForFunction(() => window.CB.G.state === 'ORDERING' && window.CB.G.cust && window.CB.G.cust.state === 'wait', null, { timeout: 10000 });
  await page.click('#takeBtn');
  await page.waitForFunction(() => window.CB.G.state === 'BREWING');
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
  await drag(page, '#cupObj', '#serveZone');
  const floated = await page.locator('.float-money').count();
  await page.waitForFunction(() => window.CB.G.state === 'RESULT', null, { timeout: 5000 });
  return st(page, () => ({ stars: window.CB.G.result.stars, checks: window.CB.G.result.checks.filter(c => !c.ok).map(c => c.label) }))
    .then(r => ({ ...r, floated }));
}

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|favicon/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => localStorage.setItem('cafe-cb-save-v1', JSON.stringify({ lang: 'en', day: 3, cash: 0 })));
  await page.goto(URL);
  await page.waitForTimeout(300);
  ok('menu visible on load', await page.isVisible('#ovMenu'));

  // full orders with drags
  await page.click('#startBtn');
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

  // mobile layout
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok('no horizontal scroll at 375px', overflow <= 0, 'overflow ' + overflow);
  await page.setViewportSize({ width: 1366, height: 900 });

  try { await page.screenshot({ path: path.join(process.env.SHOT_DIR || __dirname, 'shot-desktop.png'), fullPage: true, timeout: 8000 }); }
  catch (e) { console.log('(screenshot skipped: ' + e.message.split(/\r?\n/)[0] + ')'); }
  ok('particle canvas present', (await page.locator('#fxCv').count()) === 1);
  ok('no page errors', errors.length === 0, errors.join(' | '));

  // the whole flow still works with reduced motion (no particles, instant moves)
  const rm = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  const rmErrors = [];
  rm.on('pageerror', e => rmErrors.push(e.message));
  await rm.addInitScript(() => localStorage.setItem('cafe-cb-save-v1', JSON.stringify({ lang: 'tr', day: 2, cash: 0 })));
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
    await rm.evaluate(() => { window.CB.drop('newcup:S', 'prep'); window.CB.drop('cup', 'serve'); });
    await rm.waitForFunction(() => window.CB.G.state === 'RESULT');
    await rm.click('#nextBtn');
    await rm.waitForFunction(() => window.CB.G.state !== 'RESULT');
    await rm.waitForFunction(() => ['ORDERING', 'DAY_END'].includes(window.CB.G.state), null, { timeout: 10000 });
  }
  ok('day ends after the last guest', await rm.evaluate(() => window.CB.G.state === 'DAY_END'));
  await rm.click('#nextDayBtn');
  ok('next day opens', await rm.evaluate(() => window.CB.G.state === 'ORDERING' && window.CB.G.day === 3));
  ok('full day: no page errors', rmErrors.length === 0, rmErrors.join(' | '));
  await browser.close();
  for (const r of results) console.log(r.join('  '));
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); for (const r of results) console.log(r.join('  ')); process.exit(1); });
