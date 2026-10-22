// Monkey test: thousands of random drops, taps, holds and menu presses; fails on any page error,
// leftover drag ghost, or bench state that breaks an invariant.
// Run: node tests/fuzz.js [steps]
const path = require('path');
const pw = require(process.env.PW_CORE || 'playwright-core');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const STEPS = +process.argv[2] || 1500;

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|favicon/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => localStorage.setItem('cafe-cb-save-v1', JSON.stringify({ lang: 'tr', day: 4, cash: 500 })));
  await page.goto(URL);
  await page.waitForTimeout(300);

  const bad = await page.evaluate(async (steps) => {
    const SPECS = ['newcup:S', 'newcup:M', 'newcup:L', 'cup', 'pf', 'tamper', 'milk:whole', 'milk:oat', 'pitcher', 'syrup:vanilla', 'syrup:caramel', 'top:whip', 'top:cinnamon'];
    const TGT = ['prep', 'tray', 'serving', 'serving', 'customer', 'trash', 'grinder', 'group', 'pfrack', 'pf', 'pitcher', 'wand', 'pitcherrack', 'cup'];
    const BTN = ['#brewBtn', '#brewBtn', '#langBtn', '#serveBtn', '#serveBtn', '#bookBtn', '#closeBookBtn', '#peekBtn', '#backBtn'];
    const press = sel => { const b = document.querySelector(sel); if (b && !b.disabled && b.offsetParent !== null) b.click(); };
    const stats = { serves: 0, days: 0, menus: 0, bells: 0 };
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const problems = [];
    const holdBtn = async (sel) => {
      const b = document.querySelector(sel);
      if (!b || b.offsetParent === null) return;
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 9 }));
      await wait(Math.random() * 400);
      b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 9 }));
    };
    for (let i = 0; i < steps; i++) {
      const r = Math.random();
      try {
        const st = CB.G.state;
        if (st === 'MENU') document.querySelector('#startBtn').click();
        else if (st === 'DAY_END') { stats.days++; document.querySelector('#nextDayBtn').click(); }
        else if (st === 'RESULT') { stats.serves++; document.querySelector('#nextBtn').click(); }
        else if (st === 'ORDER_PENDING') { const b = document.querySelector('#takeBtn'); if (b.offsetParent) b.click(); else await wait(50); }
        else if (st === 'COMPLETED') await wait(60);
        else if (st === 'READY_TO_SERVE') {
          // mostly hand it over; sometimes try moves that must be refused while the cup is out on the bar
          if (r < 0.5) CB.drop('cup', 'customer'); else if (r < 0.8) CB.drop(pick(SPECS), pick(TGT)); else press(pick(BTN));
        }
        else if (r < 0.003) { stats.menus++; document.querySelector('#menuBtn').click(); }
        else if (r < 0.03) { CB.drop(pick(['newcup:S', 'newcup:M']), 'prep'); CB.drop('cup', 'serving'); press('#serveBtn'); if (CB.G.state === 'READY_TO_SERVE') stats.bells++; }
        else if (r < 0.55) CB.drop(pick(SPECS), pick(TGT));
        else if (r < 0.62) await holdBtn('#grindBtn');
        else if (r < 0.69) await holdBtn('#steamBtn');
        else if (r < 0.72) document.querySelector(pick(['#beanChips', '#foamChips']) + ' button:nth-child(' + (1 + Math.floor(Math.random() * 3)) + ')').click();
        else if (r < 0.75) document.querySelector('[data-press="syrup:' + pick(['vanilla', 'caramel', 'hazelnut']) + '"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
        else press(pick(BTN));
      } catch (e) { problems.push('throw: ' + e.message); }
      if (i % 7 === 0) await wait(30);
      const B = CB.B, c = B.cup;
      const st2 = CB.G.state;
      if (c.size && st2 === 'PREPARING' && !['prep', 'tray', 'serving'].includes(c.at)) problems.push('cup.at ' + c.at + ' while preparing');
      if (st2 === 'READY_TO_SERVE' && (!c.size || c.at !== 'hand')) problems.push('ready to serve without a cup on the bar');
      if (c.size && c.at === 'hand' && st2 !== 'READY_TO_SERVE') problems.push('cup left on the bar in ' + st2);
      if (!CB.switching() && CB.view() !== (st2 === 'PREPARING' && !CB.G.peek ? 'barista' : 'customer')) problems.push('wrong view ' + CB.view() + ' in ' + st2);
      if (!['rack', 'grinder', 'group'].includes(B.pf.at)) problems.push('pf.at ' + B.pf.at);
      if (B.pf.tamped && B.pf.dose <= 0) problems.push('tamped empty pf');
      if (B.pf.at === 'group' && !B.pf.tamped) problems.push('untamped pf in group');
      if (c.shots.length > 3) problems.push('more than 3 shots');
      if (c.shotting && (B.pf.at !== 'group' || c.at !== 'tray')) problems.push('shot running without pf/cup in place');
      if (B.pitcher.steaming && B.pitcher.at !== 'wand') problems.push('steaming off the wand');
      if (Object.values(c.syrups).reduce((a, b) => a + b, 0) > 6) problems.push('too many pumps');
      if (new Set(c.tops).size !== c.tops.length) problems.push('duplicate topping');
      const cupEl = document.querySelector('#cupObj');
      if (cupEl.hidden !== !c.size && ['PREPARING', 'READY_TO_SERVE'].includes(CB.G.state)) problems.push('cup element visibility out of sync');
      if (c.size && !cupEl.parentElement.matches({ prep: '#slotPrep', tray: '#slotTray', serving: '#slotServe', hand: '#slotHand' }[c.at])) problems.push('cup element in the wrong slot');
      if (!Number.isFinite(document.querySelector('#hudCash').textContent.replace(/[$,]/g, '') * 1)) problems.push('cash NaN');
      if (problems.length > 20) break;
    }
    return { problems: [...new Set(problems)], stats };
  }, STEPS).then(r => { console.log('stats:', JSON.stringify(r.stats)); return r.problems; });

  await page.waitForTimeout(800);
  const ghosts = await page.locator('.drag-ghost').count();
  const state = await page.evaluate(() => CB.G.state + ' day ' + CB.G.day + ' ' + document.querySelector('#hudCash').textContent);
  await browser.close();
  console.log('final:', state);
  console.log('invariant problems:', bad.length ? bad.join(' | ') : 'none');
  console.log('page errors:', errors.length ? [...new Set(errors)].join(' | ') : 'none');
  console.log('leftover ghosts:', ghosts);
  process.exit(bad.length || errors.length || ghosts ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
