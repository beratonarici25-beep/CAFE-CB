// Tutorial test (issue #12): a fresh save plays the whole tutorial with real drags, the helper explains each step,
// patience does not drop, hints show on mistakes; skip and replay from the menu work; desktop and phone (touch).
// Run: node tests/tutorial.js   (needs playwright-core and Microsoft Edge, like tests/e2e.js)
const path = require('path');
const pw = require(process.env.PW_CORE || 'playwright-core');

const URL = process.env.GAME_URL || 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };
const SHOTS = process.env.SHOT_DIR;

async function center(page, sel) {
  const loc = page.locator(sel).first();
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  const b = await loc.boundingBox();
  if (!b) throw new Error('no box for ' + sel);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function drag(page, from, to) {
  const a = await center(page, from);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  // the target may be off screen: move a bit, then find it (the page scrolls while dragging near an edge)
  await page.mouse.move(a.x + 10, a.y + 10);
  const tb = await page.locator(to).first().boundingBox();
  const b = tb ? { x: tb.x + tb.width / 2, y: tb.y + tb.height / 2 } : a;
  for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + (b.x - a.x) * i / 8, a.y + (b.y - a.y) * i / 8);
  await page.waitForTimeout(40); await page.mouse.up(); await page.waitForTimeout(80);
}
// tap-to-place, the phone way: tap the object, then tap where it goes
async function place(page, from, to, touch) {
  if (!touch) return drag(page, from, to);
  const a = await center(page, from); await page.mouse.click(a.x, a.y);
  const b = await center(page, to); await page.mouse.click(b.x, b.y);
  await page.waitForTimeout(80);
}
async function hold(page, sel, until) {
  const a = await center(page, sel);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.waitForFunction(until, null, { timeout: 15000 });
  await page.mouse.up();
}
const helperKey = page => page.evaluate(() => {
  const h = document.querySelector('.helper');
  return h && !h.hidden ? document.querySelector('.helper .hl-text').textContent : null;
});
const waitKey = (page, key, ms = 6000) => page.waitForFunction(k => {
  const h = document.querySelector('.helper');
  const L = STR[save.lang].helper[k];
  return h && !h.hidden && (Array.isArray(L) ? false : document.querySelector('.helper .hl-text').textContent === fmt(L, STR[save.lang].helper.name));
}, key, { timeout: ms }).then(() => true, () => false);
const lit = (page, sel) => page.evaluate(s => {
  const el = document.querySelector(s); if (!el) return false;
  const r = el.getBoundingClientRect(); const d = document.querySelector('#tutDim');
  if (d.style.display === 'none') return false;
  return [...d.querySelectorAll('.rings rect')].some(q => Math.abs(+q.getAttribute('x') + 7 - r.left) < 3 && Math.abs(+q.getAttribute('y') + 7 - r.top) < 3);
}, sel);

async function playTutorial(page, tag, touch) {
  const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `tut-${tag}-${n}.png`), timeout: 10000 }).catch(() => {}); };
  await page.click('#startBtn');
  ok(`${tag}: tutorial starts on a fresh save`, await page.evaluate(() => CB.tutorial()));
  ok(`${tag}: helper waves hello`, await waitKey(page, 'welcome') && await page.evaluate(() => document.querySelector('.helper').classList.contains('pose-wave')));
  ok(`${tag}: helper is called Ülkü in Turkish`, (await page.textContent('.helper .hl-name')) === 'Ülkü' && (await page.textContent('#hlName')) === 'Ülkü');
  ok(`${tag}: fixed latte order`, await page.evaluate(() => CB.G.order.drink === 'latte' && CB.G.order.size === 'M' && CB.G.order.milk === 'whole'));
  ok(`${tag}: ticket step points at the ticket`, await waitKey(page, 'ticket', 10000) && await lit(page, '#ticket'));
  await shot('1-ticket');
  ok(`${tag}: then the go-to-bench button`, await waitKey(page, 'toBench', 8000) && await lit(page, '#takeBtn'));
  await page.click('#takeBtn');
  await page.waitForFunction(() => CB.view() === 'barista' && !CB.switching());
  ok(`${tag}: cup step highlights the medium cup`, await waitKey(page, 'cup') && await lit(page, '[data-drag="newcup:M"]'));
  await shot('2-cup');
  // a wrong cup gets a gentle hint
  await place(page, '[data-drag="newcup:L"]', '#slotTray', touch);
  ok(`${tag}: wrong cup size shows a hint`, await waitKey(page, 'hintCupSize') && await page.evaluate(() => document.querySelector('.helper').classList.contains('pose-warn')));
  await shot('3-hint');
  await place(page, '#cupObj', '#trashZone', touch);
  await place(page, '[data-drag="newcup:M"]', '#slotTray', touch);
  ok(`${tag}: correct cup moves on (with praise)`, await waitKey(page, 'pfGrinder', 3000));
  await place(page, '#pfObj', '#slotGrinder', touch);
  ok(`${tag}: grind step`, await waitKey(page, 'grind'));
  await hold(page, '#grindBtn', () => CB.B.pf.dose >= 17.6);
  ok(`${tag}: tamp step`, await waitKey(page, 'tamp'));
  await place(page, '#tamperObj', '#pfObj', touch);
  ok(`${tag}: lock step`, await waitKey(page, 'lock'));
  await place(page, '#pfObj', '#slotGroup', touch);
  ok(`${tag}: brew step`, await waitKey(page, 'brew') && await lit(page, '#brewBtn'));
  await shot('4-brew');
  for (let i = 0; i < 2; i++) {
    const b = await center(page, '#brewBtn'); await page.mouse.click(b.x, b.y);
    await page.waitForFunction(() => CB.B.cup.shotT >= 26.5);
    await page.mouse.click(b.x, b.y);
  }
  ok(`${tag}: milk step`, await waitKey(page, 'milk'));
  await place(page, '[data-drag="milk:whole"]', '#pitcherObj', touch);
  ok(`${tag}: wand step`, await waitKey(page, 'wand'));
  await place(page, '#pitcherObj', '#slotWand', touch);
  ok(`${tag}: steam step`, await waitKey(page, 'steam'));
  await hold(page, '#steamBtn', () => CB.B.pitcher.temp >= 63);
  ok(`${tag}: pour step`, await waitKey(page, 'pour'));
  await place(page, '#pitcherObj', '#cupObj', touch);
  ok(`${tag}: serving tray step`, await waitKey(page, 'serveTray'));
  await place(page, '#cupObj', '#slotServe', touch);
  ok(`${tag}: bell step`, await waitKey(page, 'bell') && await lit(page, '#serveBtn'));
  const b = await center(page, '#serveBtn'); await page.mouse.click(b.x, b.y);
  await page.waitForFunction(() => CB.view() === 'customer' && !CB.switching());
  ok(`${tag}: hand-over step`, await waitKey(page, 'hand'));
  await shot('5-hand');
  ok(`${tag}: patience never dropped`, await page.evaluate(() => CB.G.patience === 1));
  await place(page, '#cupObj', '#custZone', touch);
  await page.waitForFunction(() => CB.G.state === 'RESULT', null, { timeout: 6000 });
  ok(`${tag}: finish line with a cheer`, await waitKey(page, 'finish') && await page.evaluate(() => document.querySelector('.helper').classList.contains('pose-cheer')));
  await shot('6-finish');
  ok(`${tag}: tutorial latte gets 5 stars`, await page.evaluate(() => CB.G.result.stars === 5), await page.evaluate(() => JSON.stringify(CB.G.result.checks.filter(c => !c.ok))));
  await page.click('.hl-btns .btn.go');
  ok(`${tag}: tutorial is marked done`, await page.evaluate(() => !CB.tutorial() && JSON.parse(localStorage.getItem('cafe-cb-save-v1')).tutorialDone === true));
  ok(`${tag}: helper and spotlight gone`, await page.evaluate(() => document.querySelector('.helper').hidden && document.querySelector('#tutDim').style.display === 'none'));
}

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  const newPage = async (opts, init) => {
    const ctx = await browser.newContext(opts);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|favicon/.test(m.text())) errors.push(m.text()); });
    await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('cafe-cb-save-v1', s); sessionStorage.setItem('seeded', '1'); } }, init);
    await p.goto(URL); await p.waitForTimeout(300);
    return p;
  };

  // desktop, mouse drags
  const page = await newPage({ viewport: { width: 1366, height: 900 } }, JSON.stringify({ lang: 'tr' }));
  await playTutorial(page, 'desktop', false);
  // next guest is a normal one, and the tutorial does not come back
  await page.waitForFunction(() => CB.G.state === 'ORDER_PENDING' && CB.G.cust.state === 'wait', null, { timeout: 10000 });
  ok('no tutorial for the next guest', await page.evaluate(() => !CB.tutorial() && document.querySelector('.helper').hidden));
  await page.click('#menuBtn');
  await page.reload(); await page.waitForTimeout(300);
  await page.click('#startBtn');
  await page.waitForTimeout(600);
  ok('no tutorial after reload', await page.evaluate(() => !CB.tutorial()));

  // replay from the main menu, switch language mid-way (name changes), then skip
  await page.click('#menuBtn');
  await page.click('#tutBtn');
  ok('menu button replays the tutorial', await page.evaluate(() => CB.tutorial()) && await waitKey(page, 'welcome'));
  await page.click('#langBtn');
  ok('name follows the language (Jesica in English)', (await page.textContent('.helper .hl-name')) === 'Jesica' && (await page.textContent('#hlName')) === 'Jesica');
  await page.click('#langBtn');
  await page.click('.hl-btns .btn.skip');
  ok('skip ends the tutorial', await page.evaluate(() => !CB.tutorial() && document.querySelector('.helper').hidden && JSON.parse(localStorage.getItem('cafe-cb-save-v1')).tutorialDone === true));
  await page.waitForTimeout(1500);
  ok('patience runs again after skipping', await page.evaluate(() => CB.G.patience < 1));

  // the helper can be used outside the tutorial too
  ok('Helper.say works on its own', await page.evaluate(() => { Helper.say('praise', { pose: 'cheer' }); const v = !document.querySelector('.helper').hidden; Helper.hide(); return v; }));

  // an old save without the field gets the tutorial once
  const old = await newPage({ viewport: { width: 1366, height: 900 } }, JSON.stringify({ lang: 'en', day: 4, cash: 50, served: 12 }));
  await old.click('#startBtn');
  ok('old save without tutorialDone sees it once', await old.evaluate(() => CB.tutorial()));
  ok('English helper is Jesica', await waitKey(old, 'welcome') && (await old.textContent('.helper .hl-name')) === 'Jesica');

  // phone, touch: tap-to-place all the way
  const phone = await newPage({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true }, JSON.stringify({ lang: 'tr' }));
  await playTutorial(phone, 'phone', true);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok('phone: no horizontal scroll', overflow <= 0, 'overflow ' + overflow);

  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  for (const r of results) console.log(r.join('  '));
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); for (const r of results) console.log(r.join('  ')); process.exit(1); });
