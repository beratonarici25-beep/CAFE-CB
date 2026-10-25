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
  // the spotlight is drawn in stage coordinates (issue #14)
  const r = stageRect(el); const d = document.querySelector('#tutDim');
  if (d.style.display === 'none') return false;
  return [...d.querySelectorAll('.rings rect')].some(q => Math.abs(+q.getAttribute('x') + 7 - r.left) < 3 && Math.abs(+q.getAttribute('y') + 7 - r.top) < 3);
}, sel);

// buttons the helper (her figure or bubble) is drawn over: she must never hide a control (issue #15)
const covered = page => page.evaluate(() => {
  const h = document.querySelector('.helper');
  if (!h || h.hidden) return [];
  const parts = [...h.querySelectorAll('.hl-figure, .hl-bubble')].map(e => e.getBoundingClientRect());
  const hit = r => parts.some(q => Math.min(q.right, r.right) - Math.max(q.left, r.left) > 2 && Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top) > 2);
  // what the spotlight lights up (the thing to touch next)
  const d = document.querySelector('#tutDim');
  const lit = d.style.display === 'none' ? [] : [...d.querySelectorAll('.rings rect')].map(q => q.getBoundingClientRect());
  // a big target (the customer) may lose an edge, but its middle stays free and most of it shows
  const hidden = r => {
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, area = (r.right - r.left) * (r.bottom - r.top);
    const a = parts.reduce((s, q) => s + Math.max(0, Math.min(q.right, r.right) - Math.max(q.left, r.left)) * Math.max(0, Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top)), 0);
    return a > area * 0.25 || parts.some(q => cx > q.left && cx < q.right && cy > q.top && cy < q.bottom);
  };
  const out = lit.filter(hidden).map(r => `LIT@${Math.round(r.left)},${Math.round(r.top)}`);
  for (const b of document.querySelectorAll('button')) {
    if (h.contains(b) || b.closest('[hidden]') || !b.offsetParent) continue;
    const st = getComputedStyle(b);
    if (st.visibility === 'hidden' || +st.opacity === 0) continue;
    const r = b.getBoundingClientRect();
    if (!r.width || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
    // bench objects ([data-drag]) are kept apart: on a phone the bench does not fit yet (#14)
    if (hit(r)) out.push((b.dataset.drag ? 'obj:' : '') + (b.id || b.dataset.drag || b.dataset.k || b.className));
  }
  return out;
});
// on a phone the bench scrolls and is crowded until #14 makes it fit and #23 sizes her for it: there a cover is only
// noted (NOTE lines), on desktop it fails
const clear = async (page, tag, step, touch) => {
  await page.waitForTimeout(350);   // her bubble pops in
  const c = await covered(page);
  if (touch) { if (c.length) results.push(['NOTE', `${tag}: helper covers (${step}), see #14/#23`, c.join(' ')]); return; }
  ok(`${tag}: helper covers no button (${step})`, c.length === 0, c.join(' '));
};

async function playTutorial(page, tag, touch) {
  const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `tut-${tag}-${n}.png`), timeout: 10000 }).catch(() => {}); };
  await page.click('#startBtn');
  ok(`${tag}: tutorial starts on a fresh save`, await page.evaluate(() => CB.tutorial()));
  ok(`${tag}: helper waves hello`, await waitKey(page, 'welcome') && await page.evaluate(() => document.querySelector('.helper').classList.contains('pose-wave')));
  await clear(page, tag, 'welcome', touch);
  ok(`${tag}: helper is called Ülkü in Turkish`, (await page.textContent('.helper .hl-name')) === 'Ülkü' && (await page.textContent('#hlName')) === 'Ülkü');
  ok(`${tag}: fixed latte order`, await page.evaluate(() => CB.G.order.drink === 'latte' && CB.G.order.size === 'M' && CB.G.order.milk === 'whole'));
  ok(`${tag}: ticket step points at the ticket`, await waitKey(page, 'ticket', 10000) && await lit(page, '#ticket'));
  await clear(page, tag, 'ticket', touch);
  await shot('1-ticket');
  ok(`${tag}: then the go-to-bench button`, await waitKey(page, 'toBench', 8000) && await lit(page, '#takeBtn'));
  await clear(page, tag, 'toBench', touch);
  await page.click('#takeBtn');
  await page.waitForFunction(() => CB.view() === 'barista' && !CB.switching());
  ok(`${tag}: cup step highlights the medium cup`, await waitKey(page, 'cup') && await lit(page, '[data-drag="newcup:M"]'));
  await clear(page, tag, 'cup', touch);
  await shot('2-cup');
  // a wrong cup gets a gentle hint
  await place(page, '[data-drag="newcup:L"]', '#slotTray', touch);
  ok(`${tag}: wrong cup size shows a hint`, await waitKey(page, 'hintCupSize') && await page.evaluate(() => document.querySelector('.helper').classList.contains('pose-warn')));
  await clear(page, tag, 'hintCupSize', touch);
  await shot('3-hint');
  await place(page, '#cupObj', '#trashZone', touch);
  await place(page, '[data-drag="newcup:M"]', '#slotTray', touch);
  ok(`${tag}: correct cup moves on (with praise)`, await waitKey(page, 'pfGrinder', 3000));
  await clear(page, tag, 'pfGrinder', touch);
  await place(page, '#pfObj', '#slotGrinder', touch);
  ok(`${tag}: grind step`, await waitKey(page, 'grind'));
  await clear(page, tag, 'grind', touch);
  await hold(page, '#grindBtn', () => CB.B.pf.dose >= 17.6);
  ok(`${tag}: tamp step`, await waitKey(page, 'tamp'));
  await clear(page, tag, 'tamp', touch);
  await place(page, '#tamperObj', '#pfObj', touch);
  ok(`${tag}: lock step`, await waitKey(page, 'lock'));
  await clear(page, tag, 'lock', touch);
  await place(page, '#pfObj', '#slotGroup', touch);
  ok(`${tag}: brew step`, await waitKey(page, 'brew') && await lit(page, '#brewBtn'));
  await clear(page, tag, 'brew', touch);
  await shot('4-brew');
  for (let i = 0; i < 2; i++) {
    const b = await center(page, '#brewBtn'); await page.mouse.click(b.x, b.y);
    await page.waitForFunction(() => CB.B.cup.shotT >= 26.5, null, { timeout: 15000 }).catch(async e => {
      console.log('brew failed:', await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return JSON.stringify({ hit: el.tagName + '#' + el.id + '.' + el.className, toast: document.querySelector('#toast').textContent, cup: CB.B.cup.at, pf: CB.B.pf.at, view: CB.view() }); }, [b.x, b.y]));
      throw e;
    });
    await page.mouse.click(b.x, b.y);
  }
  ok(`${tag}: milk step`, await waitKey(page, 'milk'));
  await clear(page, tag, 'milk', touch);
  await place(page, '[data-drag="milk:whole"]', '#pitcherObj', touch);
  ok(`${tag}: wand step`, await waitKey(page, 'wand'));
  await clear(page, tag, 'wand', touch);
  await place(page, '#pitcherObj', '#slotWand', touch);
  ok(`${tag}: steam step`, await waitKey(page, 'steam'));
  await clear(page, tag, 'steam', touch);
  await hold(page, '#steamBtn', () => CB.B.pitcher.temp >= 63);
  ok(`${tag}: pour step`, await waitKey(page, 'pour'));
  await clear(page, tag, 'pour', touch);
  await place(page, '#pitcherObj', '#cupObj', touch);
  ok(`${tag}: serving tray step`, await waitKey(page, 'serveTray'));
  await clear(page, tag, 'serveTray', touch);
  await place(page, '#cupObj', '#slotServe', touch);
  ok(`${tag}: bell step`, await waitKey(page, 'bell') && await lit(page, '#serveBtn'));
  await clear(page, tag, 'bell', touch);
  const b = await center(page, '#serveBtn'); await page.mouse.click(b.x, b.y);
  await page.waitForFunction(() => CB.view() === 'customer' && !CB.switching());
  ok(`${tag}: hand-over step`, await waitKey(page, 'hand'));
  await clear(page, tag, 'hand', touch);
  await shot('5-hand');
  ok(`${tag}: patience never dropped`, await page.evaluate(() => CB.G.patience === 1));
  await place(page, '#cupObj', '#custZone', touch);
  await page.waitForFunction(() => CB.G.state === 'RESULT', null, { timeout: 6000 });
  ok(`${tag}: finish line with a cheer`, await waitKey(page, 'finish') && await page.evaluate(() => document.querySelector('.helper').classList.contains('pose-cheer')));
  await clear(page, tag, 'finish', touch);
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
  ok('skip asks to confirm first', await page.waitForSelector('.hl-btns .btn.skip.sure', { timeout: 2000 }).then(() => true, () => false) && await page.evaluate(() => CB.tutorial()));
  await page.click('.hl-btns .btn.skip.sure');
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

  // phone, touch: tap-to-place all the way, on a small phone held sideways (the game is played sideways, #14)
  const phone = await newPage({ viewport: { width: 667, height: 375 }, hasTouch: true, isMobile: true }, JSON.stringify({ lang: 'tr' }));
  await playTutorial(phone, 'phone', true);
  const overflow = await phone.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight));
  ok('phone: the page does not scroll', overflow <= 0, 'overflow ' + overflow);

  // the demo is played on phones held sideways
  const wide = await newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }, JSON.stringify({ lang: 'tr' }));
  await playTutorial(wide, 'phone landscape', true);

  ok('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  for (const r of results) console.log(r.join('  '));
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); for (const r of results) console.log(r.join('  ')); process.exit(1); });
