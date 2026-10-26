// Layout test (issue #14): at every window size the whole game fits the window. Nothing scrolls, every station and
// control of the bench is inside the window and not cut off, and one real order is brewed by drags (taps on phones).
// On a phone the close-up camera shows about half the bench: there every station must fit once the camera pans to it,
// and a swipe must pan.
// Screenshots of both views go to tests/layout-<size>-<view>.png (git-ignored).
// Run: node tests/layout.js   (needs playwright-core and Microsoft Edge, like tests/e2e.js; SIZES=844x390,... for a few)
const path = require('path');
const pw = require(process.env.PW_CORE || 'playwright-core');
const { arrive, brewOrder } = require('./e2e.js');

const URL = process.env.GAME_URL || 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const SHOTS = process.env.SHOT_DIR || __dirname;
const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };

// desktop sizes from the issue, then phones held sideways (iPhone SE, iPhone 14, big Android / Pro Max)
const SIZES = (process.env.SIZES || '1280x720,1366x768,1920x1080,2560x1440,3440x1440,667x375,844x390,932x430')
  .split(',').map(s => { const [w, h] = s.split('x').map(Number); return { w, h, phone: h < 500 }; });

// what does not fit: zones and controls that stick out of the window or out of their own zone. On a phone the close-up
// camera (js/camera.js) shows part of the bench: there every station must fit the window once the camera pans to it.
const misfits = page => page.evaluate(() => {
  const out = [], W = innerWidth, H = innerHeight;
  const scroll = Math.max(document.documentElement.scrollWidth - W, document.documentElement.scrollHeight - H);
  if (scroll > 0) out.push('page scrolls ' + scroll);
  const zones = [...document.querySelectorAll('#counter > .zone')];
  const pan0 = CB.cam.x;
  const outside = r => r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1;
  for (const z of zones) {
    if (UI.cam) CB.cam.show(z, true);
    const r = z.getBoundingClientRect();
    if (outside(r)) out.push('zone outside ' + z.className);
    if (z.scrollHeight > z.clientHeight + 2) out.push('zone cut off ' + z.className + ' ' + z.scrollHeight + '>' + z.clientHeight + ' [' + [...z.children].map(c => c.offsetHeight).join(' ') + ']');
    for (const el of z.querySelectorAll('button, [data-drag], [data-drop]')) {
      if (el.closest('[hidden]') || !el.offsetParent) continue;
      const q = el.getBoundingClientRect();
      if (q.width && outside(q)) out.push('outside ' + (el.id || el.dataset.drag || el.dataset.drop || el.className));
    }
  }
  // the strip over the counter does not pan
  for (const el of document.querySelectorAll('.benchhead button')) {
    const q = el.getBoundingClientRect();
    if (!el.closest('[hidden]') && q.width && outside(q)) out.push('outside ' + el.id);
  }
  if (UI.cam) CB.cam.set(pan0);
  return out;
});
// phones: a swipe on the bench pans the camera, and the whole bench is reachable (both ends)
const swipeWorks = page => page.evaluate(() => UI.cam).then(async cam => {
  if (!cam) return { cam: false };
  const t = await page.locator('#benchTicket').boundingBox(), y = t.y + t.height / 2, x0 = page.viewportSize().width * 0.8;
  // from the left end, swipe toward the right end of the bench
  await page.evaluate(() => CB.cam.set(0));
  await page.waitForFunction(() => CB.cam.settled(), null, { timeout: 3000 });
  const before = await page.evaluate(() => CB.cam.x);
  await page.mouse.move(x0, y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(x0 - 400 * i / 8, y); await page.waitForTimeout(25); }
  await page.mouse.up();
  await page.waitForFunction(() => CB.cam.settled(), null, { timeout: 3000 });
  const after = await page.evaluate(() => ({ x: CB.cam.x, max: CB.cam.max }));
  return { cam: true, before, ...after, ok: after.x > before + 100 && after.max > 200 };
});

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  for (const sz of SIZES) {
    const tag = `${sz.w}x${sz.h}`;
    const ctx = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, hasTouch: sz.phone, isMobile: sz.phone });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('cafe-cb-save-v1', JSON.stringify({ lang: 'tr', day: 3, tutorialDone: true })); sessionStorage.setItem('seeded', '1'); } });
    await page.goto(URL); await page.waitForTimeout(300);
    await page.click('#startBtn');
    await page.waitForFunction(() => !document.querySelector('#ticket').hidden && CB.G.cust && CB.G.cust.state === 'wait', null, { timeout: 12000 });
    const cust = await page.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight));
    ok(`${tag}: customer view does not scroll`, cust <= 0, 'overflow ' + cust);
    const takeIn = await page.evaluate(() => { const r = document.querySelector('#takeBtn').getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth; });
    ok(`${tag}: go-to-bench button on screen`, takeIn);
    await page.screenshot({ path: path.join(SHOTS, `layout-${tag}-customer.png`) }).catch(() => {});
    await arrive(page);
    const bad = await misfits(page);
    ok(`${tag}: whole bench fits`, bad.length === 0, bad.join(' | '));
    if (sz.phone) { const sw = await swipeWorks(page); ok(`${tag}: close-up camera, a swipe pans the bench`, sw.cam && sw.ok, JSON.stringify(sw)); }
    await page.screenshot({ path: path.join(SHOTS, `layout-${tag}-bench.png`) }).catch(() => {});
    const r = await brewOrder(page);
    ok(`${tag}: order brewed by drag gets 4+ stars`, r.stars >= 4, JSON.stringify(r));
    // resizing mid-game (F11, a bigger window, turning the phone) re-fits at once
    await page.click('#nextBtn');
    await arrive(page);
    await page.setViewportSize({ width: sz.h * 2, height: sz.h });
    await page.waitForTimeout(250);
    const after = await misfits(page);
    ok(`${tag}: still fits after a resize`, after.length === 0, after.join(' | '));
    ok(`${tag}: no page errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  for (const r of results) console.log(r.join('  '));
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); for (const r of results) console.log(r.join('  ')); process.exit(1); });
