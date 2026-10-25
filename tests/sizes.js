// Size test (issue #15): the drag ghost of every draggable thing keeps the size of the original (no sprite growing to
// its natural size while dragged), the machine keys fit their label on one line (EN + TR), desktop and phone; a phone
// held upright asks to be turned (issue #14).
// Run: node tests/sizes.js   (needs playwright-core and Microsoft Edge, like tests/e2e.js)
const path = require('path');
const pw = require(process.env.PW_CORE || 'playwright-core');

const URL = process.env.GAME_URL || 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };

// the box everything inside an element actually paints into (an overflowing <img> counts too)
const PAINT = `el => {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const n of [el, ...el.querySelectorAll('*')]) {
    const q = n.getBoundingClientRect();
    if (!q.width || !q.height || getComputedStyle(n).display === 'none') continue;
    l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
  }
  return { w: r - l, h: b - t };
}`;

// starts a drag on sel, measures the ghost against the original, then lets go where it started
async function ghostRatio(page, sel) {
  const loc = page.locator(sel).first();
  await loc.scrollIntoViewIfNeeded();
  const a = await loc.boundingBox();
  if (!a) return null;
  const x = a.x + a.width / 2, y = a.y + a.height / 2;
  const orig = await loc.evaluate(new Function('return ' + PAINT)());
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 12, y + 12); await page.mouse.move(x + 24, y + 24);
  // let the tilt and stretch from the move settle (on a small stage the same move is a fast one)
  await page.waitForTimeout(300);
  // the newest ghost: the one from the drag before may still be flying home
  const ghost = await page.evaluate(p => { const g = [...document.querySelectorAll('.drag-ghost')].pop(); return g && new Function('return ' + p)()(g); }, PAINT);
  await page.mouse.move(x, y); await page.mouse.up();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.drag-ghost'), null, { timeout: 3000 }).catch(() => {});
  if (!ghost) return null;
  return { r: Math.max(ghost.w / orig.w, ghost.h / orig.h), orig, ghost };
}

async function bench(browser, opts, tag) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('cafe-cb-save-v1', JSON.stringify({ lang: 'en', tutorialDone: true })); sessionStorage.setItem('seeded', '1'); } });
  await page.goto(URL); await page.waitForTimeout(300);
  await page.click('#startBtn');
  await page.waitForFunction(() => CB.G.state === 'ORDER_PENDING' && CB.G.cust && CB.G.cust.state === 'wait', null, { timeout: 10000 });
  await page.click('#takeBtn');
  await page.waitForFunction(() => CB.view() === 'barista' && !CB.switching());
  // put a cup on the tray, grounds in the portafilter and milk in the pitcher, so every sprite state gets a turn
  await page.evaluate(() => { CB.drop('newcup:M', 'tray'); CB.drop('pf', 'grinder'); });
  await page.waitForTimeout(100);

  const sels = await page.evaluate(() => [...document.querySelectorAll('.view-barista [data-drag], #barista [data-drag], [data-drag]')]
    .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); })
    .map(el => el.id ? '#' + el.id : `[data-drag="${el.dataset.drag}"]`)
    .filter((s, i, a) => a.indexOf(s) === i));
  ok(`${tag}: found the draggable things`, sels.includes('#pfObj') && sels.includes('#pitcherObj'), sels.join(' '));
  for (const s of sels) {
    const m = await ghostRatio(page, s);
    if (!m) continue;
    ok(`${tag}: drag ghost of ${s} keeps its size`, m.r <= 1.2, `${m.orig.w.toFixed(0)}x${m.orig.h.toFixed(0)} -> ${m.ghost.w.toFixed(0)}x${m.ghost.h.toFixed(0)}`);
  }
  // the same after the portafilter got grounds and the pitcher got milk
  await page.evaluate(() => { CB.drop('milk:whole', 'pitcher'); });
  await page.waitForTimeout(100);
  for (const s of ['#pfObj', '#pitcherObj']) {
    const m = await ghostRatio(page, s);
    ok(`${tag}: drag ghost of a filled ${s} keeps its size`, m && m.r <= 1.2, m ? `${m.orig.w.toFixed(0)}x${m.orig.h.toFixed(0)} -> ${m.ghost.w.toFixed(0)}x${m.ghost.h.toFixed(0)}` : 'no ghost');
  }

  // machine keys: the label sits on one line, in both languages
  for (const lang of ['en', 'tr']) {
    if (await page.evaluate(() => save.lang) !== lang) { await page.click('#langBtn'); await page.waitForTimeout(100); }
    const bad = await page.evaluate(() => [...document.querySelectorAll('.key')].filter(k => k.offsetParent).map(k => {
      const rg = document.createRange(); rg.selectNodeContents(k);
      const lines = new Set([...rg.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top))).size;
      return { t: k.textContent, lines, over: k.scrollWidth > k.clientWidth + 1 };
    }).filter(k => k.lines > 1 || k.over));
    ok(`${tag}: machine keys fit on one line (${lang})`, bad.length === 0, JSON.stringify(bad));
  }
  ok(`${tag}: no page errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  await bench(browser, { viewport: { width: 1366, height: 900 } }, 'desktop');
  await bench(browser, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }, 'phone landscape');
  // held upright, the game asks to turn the phone (issue #14)
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto(URL); await page.waitForTimeout(300);
    ok('phone portrait: no turn-the-phone screen blocks the game', await page.evaluate(() => getComputedStyle(document.querySelector('#rotateOv')).display === 'none'));
    await ctx.close();
  }
  await browser.close();
  for (const r of results) console.log(r.join('  '));
  const fails = results.filter(r => r[0] === 'FAIL').length;
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); for (const r of results) console.log(r.join('  ')); process.exit(1); });
