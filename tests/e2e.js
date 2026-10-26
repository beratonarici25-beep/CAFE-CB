// End-to-end check: plays real orders with mouse drags in headless Edge.
// Run: node tests/e2e.js   (needs playwright-core; set PW_CORE to its path if it is not resolvable)
const path = require('path');
const pw = require(process.env.PW_CORE || 'playwright-core');

const URL = process.env.GAME_URL || 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };

const onScreen = (b, vw) => b && b.x >= 0 && b.x + b.width <= vw;
// comfortably on screen: a player does not press a button half under the screen edge
const wellOn = (b, vw) => onScreen(b, vw) && b.x >= 20 && b.x + b.width <= vw - 20;
// the phone camera (js/camera.js): swipe the bench (from the ticket strip, which does not pan) until sel is on screen
async function reveal(page, sel) {
  const vw = page.viewportSize().width;
  for (let i = 0; i < 5; i++) {
    const b = await page.locator(sel).first().boundingBox();
    if (!b || wellOn(b, vw) || !(await page.evaluate(() => UI.cam && CB.view() === 'barista'))) return;
    const t = await page.locator('#benchTicket').boundingBox();
    const sx = t.x + t.width / 2, sy = t.y + t.height / 2;
    const dx = Math.max(-vw * 0.8, Math.min(vw * 0.8, vw / 2 - (b.x + b.width / 2)));
    await page.mouse.move(sx, sy); await page.mouse.down();
    for (let k = 1; k <= 6; k++) { await page.mouse.move(sx + dx * k / 6, sy); await page.waitForTimeout(30); }
    await page.waitForTimeout(60); await page.mouse.up();
    await page.waitForFunction(() => CB.cam.settled(), null, { timeout: 3000 });
  }
}
async function click(page, sel) { await reveal(page, sel); await page.click(sel); }
async function drag(page, from, to) {
  // a real player scrolls a little when the thing they want is below the fold
  const pre = await page.locator(from).first().boundingBox();
  const vh = page.viewportSize().height, vw = page.viewportSize().width;
  if (pre && pre.y + pre.height / 2 > vh - 20) {
    await page.evaluate(dy => window.scrollBy(0, dy), Math.ceil(pre.y + pre.height - vh + 30));
    await page.waitForTimeout(50);
  }
  await reveal(page, from);
  const a = await page.locator(from).first().boundingBox();
  let b = await page.locator(to).first().boundingBox();
  if (!a || !b) throw new Error(`no box for ${!a ? from : to}`);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  // on a phone the target may be off screen: hold the object at that edge until the camera brings it in
  if (!onScreen(b, vw)) {
    const ex = b.x < 0 ? 6 : vw - 6, ey = a.y + a.height / 2;
    for (let i = 1; i <= 4; i++) await page.mouse.move(a.x + a.width / 2 + (ex - a.x - a.width / 2) * i / 4, ey);
    // until its middle is clear of the edge strips where the camera follows
    const inMid = q => q && q.x + q.width / 2 > 150 && q.x + q.width / 2 < vw - 150;
    for (let i = 0; i < 120 && !inMid(b); i++) {
      await page.waitForTimeout(40); await page.mouse.move(ex, ey); b = await page.locator(to).first().boundingBox();
      // the camera is at the end of the bench: the target stays near the edge
      if (onScreen(b, vw) && await page.evaluate(() => CB.cam.x <= 0 || CB.cam.x >= CB.cam.max)) break;
    }
    // step off the edge so the camera stops
    await page.mouse.move(vw / 2, ey); await page.waitForTimeout(40);
    b = await page.locator(to).first().boundingBox();
    const m = { x: vw / 2, y: ey, width: 0, height: 0 };
    for (let i = 1; i <= 8; i++) await page.mouse.move(m.x + (b.x + b.width / 2 - m.x) * i / 8, m.y + (b.y + b.height / 2 - m.y) * i / 8);
    await page.waitForTimeout(40);
    await page.mouse.up();
    await page.waitForTimeout(60);
    return;
  }
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
  await reveal(page, sel);
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
  await click(page, '#serveBtn');
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
    : { size: o.size, bean: o.bean, shots: o.shots, milk: o.milk, foam: o.milk ? { latte: 'light', cappuccino: 'thick', flatwhite: 'none', mocha: 'light', hotchoc: 'light' }[o.drink] : null,
      temp: o.temp, syrups: o.syrups, tops: o.tops, iced: o.drink === 'iced', choc: o.drink === 'hotchoc' };
  await drag(page, `[data-drag="newcup:${want.size}"]`, '#slotTray');
  // a hot chocolate has no coffee (issue #21)
  if (want.shots) {
    await drag(page, '#pfObj', '#slotGrinder');
    await click(page, `#beanChips [data-k="${want.bean}"]`);
    await hold(page, '#grindBtn', () => window.CB.B.pf.dose >= 17.6);
    await drag(page, '#tamperObj', '#pfObj');
    await drag(page, '#pfObj', '#slotGroup');
  }
  for (let i = 0; i < want.shots; i++) {
    await click(page, '#brewBtn');
    await page.waitForFunction(() => window.CB.B.cup.shotT >= 26.5);
    await click(page, '#brewBtn');
  }
  if (want.choc) await drag(page, '#cocoaObj', '#cupObj');
  if (want.iced) {
    // ice, then cold milk straight from the bottle
    await drag(page, '#iceObj', '#cupObj');
    await drag(page, `[data-drag="milk:${want.milk}"]`, '#cupObj');
  } else if (want.milk) {
    await drag(page, `[data-drag="milk:${want.milk}"]`, '#pitcherObj');
    await drag(page, '#pitcherObj', '#slotWand');
    await click(page, `#foamChips [data-k="${want.foam}"]`);
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

module.exports = { drag, hold, arrive, settled, brewOrder, reveal, click };
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
  await click(page, '#serveBtn');
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

  // forgiving drops: a near miss still lands, a drop far from anything flies home; nothing is text-selected
  const dragTo = async (from, x, y) => {
    const a = await page.locator(from).first().boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + a.width / 2 + (x - a.x - a.width / 2) * i / 10, a.y + a.height / 2 + (y - a.y - a.height / 2) * i / 10);
    await page.waitForTimeout(350);   // the copy catches up with the pointer
    await page.mouse.up(); await page.waitForTimeout(450);
  };
  await drag(page, '[data-drag="newcup:M"]', '#slotPrep');
  const tray = await page.locator('#slotServe').boundingBox();
  await dragTo('#cupObj', tray.x + tray.width + 80, tray.y + tray.height / 2);
  ok('near miss: a cup dropped 80 px beside the serving tray lands on it', await st(page, () => window.CB.B.cup.at === 'serving'), await st(page, () => window.CB.B.cup.at));
  await dragTo('#cupObj', 30, 870);
  ok('a drop far from any target goes back home', await st(page, () => window.CB.B.cup.at === 'serving'));
  ok('no text gets selected while dragging', await page.evaluate(() => String(getSelection()) === '' && getComputedStyle(document.querySelector('#ticketText')).userSelect === 'none'));
  await drag(page, '#cupObj', '#trashZone');

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
