/* Game flow: customers arrive, order, get served, the day ends. Owns the overlays, the HUD, the two views and the frame loop.
   One customer goes ORDER_PENDING (customer view) → PREPARING (barista view) → READY_TO_SERVE (customer view, cup on the bar)
   → COMPLETED (reaction, payment, leaving) → RESULT (score card), then the next customer. */

const G = {
  state: 'MENU', day: save.day, idx: 0, total: 0, ticket: 100,
  cust: null, order: null, typed: 0, patience: 1, patMax: 70, servedPatience: 1,
  chat: null, rudeN: 0, earned: 0, stars: [], result: null, served: null, resultTimer: 0, peek: false,
};
let T = 0;

/* ---------------- state machine ---------------- */
const OVERLAYS = { MENU: 'ovMenu', RESULT: 'ovResult', DAY_END: 'ovDay' };
function setState(s) {
  G.state = s;
  for (const [k, id] of Object.entries(OVERLAYS)) $('#' + id).hidden = k !== s;
  if (s !== 'PREPARING') { clearHeld(); G.peek = false; }
  // a new drink's intro ends the moment its drink goes out (not a frame later)
  if (s !== 'ORDER_PENDING' && s !== 'PREPARING' && typeof Intro !== 'undefined') Intro.stop();
  if (s === 'MENU') renderMenu();
  render();
}

/* ---------------- the two views (issue #5) ---------------- */
// The barista view is shown only while preparing (unless the player peeks at the customer); everything else
// happens in the customer view. Switching slides one view out and the other in, like a camera pan.
const viewFor = () => G.state === 'PREPARING' && !G.peek ? 'barista' : 'customer';
let curView = null, viewAnim = null;
function setView(v) {
  if (v === curView) return;
  if (viewAnim) viewAnim();
  const first = curView === null;
  curView = v;
  const inEl = v === 'barista' ? $('#bench') : $('#scene'), outEl = v === 'barista' ? $('#scene') : $('#bench');
  document.body.classList.toggle('view-barista', v === 'barista');
  document.body.classList.toggle('view-customer', v === 'customer');
  $(v === 'barista' ? '#benchTicket' : '#sceneTicket').appendChild($('#ticket'));
  inEl.classList.remove('view-off');
  if (first || reduceMotion) { outEl.classList.add('view-off'); fit(); return; }
  const views = $('#views'), dir = v === 'barista' ? 1 : -1;
  views.classList.add('switching');
  outEl.classList.add('view-leaving');
  fit();
  const opts = { duration: 520, easing: 'cubic-bezier(.65,0,.35,1)' };
  const a1 = outEl.animate([{ transform: 'none' }, { transform: `translateX(${-dir * 100}%)` }], opts);
  const a2 = inEl.animate([{ transform: `translateX(${dir * 100}%)` }, { transform: 'none' }], opts);
  sfx.whoosh();
  let done = false;
  const finish = () => {
    if (done) return; done = true; viewAnim = null;
    a1.cancel(); a2.cancel();
    outEl.classList.remove('view-leaving');
    if (outEl !== (curView === 'barista' ? $('#bench') : $('#scene'))) outEl.classList.add('view-off');
    views.classList.remove('switching');
    fit();
  };
  viewAnim = finish;
  a2.finished.then(finish, finish);
  setTimeout(finish, 900);
}
function peek(on) {
  if (G.state !== 'PREPARING') return;
  sfx.click();
  G.peek = on;
  render();
}

function startDay() {
  sfx.init();
  G.day = save.day; G.idx = 0; G.clock = OPEN_MIN; G.gap = 0; G.earned = 0; G.stars = [];
  G.sales = 0; G.tips = 0; G.cost = 0; G.top = null; G.sum = null;
  G.patMax = 70 * (has('stools') ? 1.25 : 1);
  G.cust = null;
  // the recipes bought since the last day are new on the menu today (issue #21)
  G.fresh = save.intros.filter(recipeOpen); save.intros = []; persist();
  if (!save.tutorialDone) Tutorial.start();
  else if (G.fresh.length) { toast(t('newOnMenu', G.fresh.map(drinkName).join(', '))); Intro.start(G.fresh[0]); }
  nextCustomer();
}
function nextCustomer() {
  G.cust = makeCustomer();
  // the shop is quiet in the morning and busy in the evening: the next guest waits outside, longer early in the day
  // (the tutorial and a new drink's intro start at once)
  G.gap = Tutorial.active || Intro.active ? 0 : gapAt(G.clock) / (1 + 0.1 * repGuests(save.rep));
  // now and then a guest starts rude: a short chat where you hear them out (they lose patience faster, but tip well) or show them the door
  G.chat = !Tutorial.active && !Intro.active && G.day >= 2 && Math.random() < 0.1 ? 'rude' : null;
  G.cust.rude = !!G.chat; G.rudeN = ri(3);
  // the first guest of the day orders the new drink, so the helper can show how it is made
  G.order = Tutorial.active && G.idx === 0 ? Tutorial.order() : makeOrder(G.day, G.fresh || [], Intro.active && G.idx === 0 ? Intro.drink : null);
  G.typed = 0; G.patience = 1; G.grace = 0; G.served = null; G.result = null; G.ticket++;
  resetBench();
  $('#say').textContent = '';
  $('#bubble').hidden = true;
  setState('ORDER_PENDING');
}
function onArrive() {
  sfx.bell();
  $('#bubble').hidden = false;
  $('#custName').textContent = G.cust.name;
}
function takeOrder() {
  if (G.state !== 'ORDER_PENDING' || G.chat) return;
  G.typed = Infinity;
  $('#say').textContent = curText();
  sfx.click();
  setState('PREPARING');
}
function hearOut() {
  if (G.state !== 'ORDER_PENDING' || G.chat !== 'rude') return;
  sfx.click();
  G.chat = null; G.typed = 0;
  $('#say').textContent = '';
  render();
}
function showDoor() {
  const mid = G.state === 'PREPARING' || G.state === 'READY_TO_SERVE';
  if ((G.state !== 'ORDER_PENDING' && !mid) || G.chat === 'kicked' || !G.cust || G.cust.state !== 'wait') return;
  sfx.click();
  // sent away mid-order: the half-made drink goes, and they say their piece at once (the customer view stays on screen)
  if (mid) { stopAllSounds(); B.cup = newCup(); layout(); G.peek = true; }
  G.chat = 'kicked'; G.typed = mid ? Infinity : 0;
  G.cust.mood = 'upset'; G.cust.react = 'shake'; G.cust.reactT = 0;
  G.kickStars = G.cust.rude ? 2 : 1;
  $('#say').textContent = mid ? curText() : '';
  render();
  setTimeout(() => {
    if (!G.cust || G.chat !== 'kicked') return;
    toast(t('kickedOut', G.cust.name));
    G.stars.push(G.kickStars); G.idx++; G.chat = null;
    G.cust.state = 'leave';
    $('#bubble').hidden = true;
    setState('COMPLETED');
  }, 2000);
}
// the cup was dropped on the customer: they check it, react, and leave their money on the bar
function serve() {
  if (G.state !== 'READY_TO_SERVE' || G.chat) return;
  const cup = B.cup;
  if (!cup.size) { toast(t('pickFirst')); return; }
  stopAllSounds();
  G.servedPatience = G.patience;
  const r = evaluate(G.order, cup, G.patience);
  if (G.cust.rude && r.stars >= 4) r.tip = cents(r.tip + r.pay * 0.5);
  G.result = r; G.served = cup;
  B.cup = newCup(); layout();
  G.cust.mood = r.stars >= 5 ? 'delighted' : r.stars === 4 ? 'happy' : r.stars === 3 ? 'neutral' : 'upset';
  G.cust.react = r.stars >= 3 ? 'bounce' : 'shake'; G.cust.reactT = 0;
  save.cash += r.pay + r.tip; save.served++; G.earned += r.pay + r.tip; G.stars.push(r.stars);
  G.sales += r.pay; G.tips += r.tip; G.cost = cents(G.cost + r.cost);
  if (!G.order.surprise && r.stars > (G.top ? G.top.stars : 3)) G.top = { drink: G.order.drink, stars: r.stars };
  persist();
  $('#say').textContent = r.quote;
  r.stars >= 3 ? sfx.coins(r.tip > 0) : sfx.sad();
  if (r.pay + r.tip > 0) fx('floatMoney', $('#custZone'), r.pay + r.tip, $('#hudCash'));
  setState('COMPLETED');
  clearTimeout(G.resultTimer);
  G.resultTimer = setTimeout(showResult, 1500);
}
// the patience bar has been empty for WALKOUT_GRACE seconds: the customer leaves without paying
const WALKOUT_GRACE = 4;
// The day runs on a clock: the café opens at 9:00 and the last guest is the one at the bar at 22:00.
const OPEN_MIN = 9 * 60, CLOSE_MIN = 22 * 60, CLOCK_RATE = 2; // game minutes per second
const gapAt = m => (15 + 5 * Math.random()) * Math.pow(1 - (m - OPEN_MIN) / (CLOSE_MIN - OPEN_MIN), 1.5); // seconds between guests: 15–20 s at opening, none at closing
const clockText = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.floor(m % 60 / 10) * 10).padStart(2, '0');
const closing = () => G.clock >= CLOSE_MIN;
function walkOut() {
  stopAllSounds();
  B.cup = newCup(); layout();
  G.peek = false;
  G.stars.push(1); G.idx++;
  G.cust.mood = 'upset'; G.cust.react = 'shake'; G.cust.reactT = 0; G.cust.state = 'leave';
  toast(t('walkedOut', G.cust.name));
  sfx.sad();
  $('#bubble').hidden = true;
  setState('COMPLETED');
}
function fillResult() {
  const r = G.result;
  $('#rStars').innerHTML = [1, 2, 3, 4, 5].map(i => `<span class="${i <= r.stars ? 'on' : ''}">★</span>`).join('');
  $('#rStars').setAttribute('aria-label', t('starsOf', r.stars));
  $('#rQuote').textContent = `“${r.quote}” — ${G.cust.name}`;
  $('#rChecks').innerHTML = r.checks.map(c => `<div class="check ${c.ok ? '' : 'no'}">${c.ok ? '✓' : '✗'} ${c.label}</div>`).join('');
  const L = S();
  const bars = [{ name: L.bars.order, v: r.acc, txt: Math.round(r.acc * 100) + '%' }, ...r.parts, { name: L.bars.speed, v: r.speed, txt: Math.round(r.speed * 100) + '%' }];
  $('#rBars').innerHTML = bars.map(b => `<div class="bar"><span>${b.name}</span><i><em style="width:${Math.round(b.v * 100)}%;background:${b.v >= 0.75 ? 'var(--mint)' : b.v >= 0.4 ? 'var(--butter)' : 'var(--blush-deep)'}"></em></i><span>${b.txt}</span></div>`).join('');
  $('#rMoney').innerHTML = `<span>+${money(r.pay)}</span>${r.tip ? `<span class="tip">${t('tip', money(r.tip))}</span>` : ''}`;
  $('#nextBtn').textContent = closing() ? t('closeShop') : t('nextCustomer');
}
function showResult() {
  if (G.state !== 'COMPLETED' || !G.cust || !G.result) return;
  fillResult();
  setState('RESULT');
  $('#nextBtn').focus({ preventScroll: true });
}
function afterResult() {
  if (G.state !== 'RESULT') return;
  sfx.click();
  if (Tutorial.active) Tutorial.complete();
  if (Intro.active) Intro.stop();
  G.idx++;
  G.cust.state = 'leave';
  $('#bubble').hidden = true;
  setState('COMPLETED');
}
function onLeft() {
  G.cust = null; G.served = null;
  if (closing()) endDay(); else nextCustomer();
}
function fillDay() {
  const u = G.sum;
  $('#dTitle').textContent = t('dayDone', G.day);
  const row = (k, v, cls = '') => `<div class="${cls}"><span>${k}</span><b>${v}</b></div>`;
  const signed = n => (n < 0 ? '−' : '+') + money(Math.abs(n));
  $('#dReceipt').innerHTML = [
    row(t('rSales', u.n), '+' + money(u.sales)),
    row(t('rTips'), '+' + money(u.tips)),
    row(t('rCost'), '−' + money(u.cost)),
    u.rent ? row(t('rRent'), '−' + money(u.rent)) : '',
    row(t('rNet'), signed(u.net), 'net'),
    row(t('savings'), money(u.cash)),
    u.debt ? row(t('rDebt'), money(u.debt), 'debt') : '',
    rentFor(save.day) ? row(t('rRentNext', save.day), money(rentFor(save.day)), 'soft') : '',
  ].join('');
  $('#dStars').textContent = u.avg.toFixed(1);
  $('#dMood').textContent = `${u.happy} / ${u.angry}`;
  $('#dRep').textContent = save.rep.toFixed(1);
  // the landlord's warning first, else the best drink of the day, else a word on the day
  $('#dNote').textContent = u.debt ? t('landlord', money(u.debt))
    : u.top ? t('noteTop', drinkName(u.top)) : t(u.avg >= 4 ? 'noteGreat' : u.avg >= 3 ? 'noteOk' : 'noteBad');
  $('#nextDayBtn').textContent = t('openDay', save.day);
  renderRecipes($('#dayRecipes'));
  renderShop($('#dayShop'));
}
function endDay() {
  const n = G.stars.length, avg = n ? G.stars.reduce((a, b) => a + b, 0) / n : 0;
  const s = settleDay(G.day, save.cash, save.debt, G.sales, G.tips, G.cost);
  G.sum = { ...s, sales: G.sales, tips: G.tips, cost: G.cost, n, avg, top: G.top && G.top.drink,
    happy: G.stars.filter(x => x >= 4).length, angry: G.stars.filter(x => x <= 2).length };
  save.cash = s.cash; save.debt = s.debt;
  if (n) save.rep = repAfter(save.rep, avg);
  save.best = Math.max(save.best, G.earned);
  save.day = G.day + 1;
  persist();
  resetBench();
  G.order = null;
  fillDay();
  setState('DAY_END');
}

/* ---------------- menus, HUD, language ---------------- */
$('#takeBtn').addEventListener('click', takeOrder);
$('#keepBtn').addEventListener('click', hearOut);
document.querySelectorAll('.kickbtn').forEach(b => b.addEventListener('click', showDoor));
$('#peekBtn').addEventListener('click', () => peek(true));
$('#backBtn').addEventListener('click', () => peek(false));
$('#nextBtn').addEventListener('click', afterResult);
$('#startBtn').addEventListener('click', startDay);
// replay the tutorial from the main menu: it runs on the first guest of the day
$('#tutBtn').addEventListener('click', () => { save.tutorialDone = false; persist(); startDay(); });
$('#nextDayBtn').addEventListener('click', startDay);
$('#toMenuBtn').addEventListener('click', () => setState('MENU'));
// the recipe book opens over the main menu or over the bar; its close button says where it goes back to (issue #8)
let bookFrom = 'bar';
let selectedRecipe = 'latte';
function openBook(from) {
  sfx.init(); sfx.click();
  bookFrom = from;
  $('#closeBookBtn').textContent = t(from === 'menu' ? 'backToMenu' : 'backToBar');
  renderBook();
  $('#ovBook').hidden = false;
  $('#closeBookBtn').focus({ preventScroll: true });
}
// the chalk menu on the back bar (issue #21): every drink in two columns; the ones not bought yet faint, with a lock
function renderChalk() {
  const esc = x => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let h = `<text x="160" y="32" text-anchor="middle" font-family="'Pacifico','Brush Script MT',cursive" font-size="19" fill="#ffd6dc">Cafe C&amp;B</text>`;
  Object.keys(DRINKS).forEach((k, i) => {
    const col = i < 4 ? 0 : 1, x = col ? 166 : 22, end = col ? 298 : 152, y = 54 + (i % 4) * 16, open = recipeOpen(k);
    h += `<g opacity="${open ? 1 : 0.38}"><text x="${x}" y="${y}">${esc(drinkName(k))}</text>` + (open
      ? `<text x="${end}" y="${y}" text-anchor="end">${DRINKS[k].price.toFixed(2)}</text>`
      : `<path d="M${end - 8} ${y - 6}h8v7h-8z M${end - 6.5} ${y - 6}v-2.2a2.5 2.5 0 0 1 5 0v2.2" fill="none" stroke="#f5efe6" stroke-width="1.4"/>`) + `</g>`;
  });
  $('#chalkMenu').innerHTML = `<g font-family="'Courier Prime','Courier New',monospace" font-weight="700" fill="#f5efe6" font-size="11.5">${h}</g>`;
}
// The recipe guide keeps the drink index, ingredients and preparation order together.
function renderBook() {
  const copy = S().recipeGuide;
  const keys = Object.keys(DRINKS);
  if (!keys.includes(selectedRecipe)) selectedRecipe = keys[0];
  $('#bookBody').innerHTML = `<div class="recipe-book-layout"><nav class="recipe-index" aria-label="${copy.listHeading}">` +
    `<h3>${copy.listHeading}</h3><div class="recipe-choices">` + keys.map(k => {
      const open = recipeOpen(k), chosen = selectedRecipe === k;
      const status = open ? copy.available : t('bookLocked', money(RECIPE_COST[k]));
      return `<button class="recipe-choice${chosen ? ' selected' : ''}${open ? '' : ' locked'}" type="button" data-recipe="${k}" aria-pressed="${chosen}">` +
        `<span>${drinkName(k)}</span><small>${status}</small></button>`;
    }).join('') + `</div></nav><section class="recipe-detail" id="recipeDetail" aria-live="polite"></section></div>`;
  $('#bookBody').querySelectorAll('[data-recipe]').forEach(b => b.addEventListener('click', () => {
    selectedRecipe = b.dataset.recipe;
    $('#bookBody').querySelectorAll('[data-recipe]').forEach(item => {
      const chosen = item.dataset.recipe === selectedRecipe;
      item.classList.toggle('selected', chosen);
      item.setAttribute('aria-pressed', String(chosen));
    });
    renderBookDetail();
  }));
  renderBookDetail();
}
function renderBookDetail() {
  const copy = S().recipeGuide, recipe = copy.recipes[selectedRecipe];
  const steps = copy.steps[selectedRecipe] || copy.steps.standard;
  const fields = [
    [copy.fields.cup, recipe.cup], [copy.fields.coffee, recipe.coffee],
    [copy.fields.milk, recipe.milk], [copy.fields.foam, recipe.foam], [copy.fields.extras, recipe.extras],
  ];
  $('#recipeDetail').innerHTML = `<div class="recipe-detail-head"><div><small>${copy.selected}</small><h3>${drinkName(selectedRecipe)}</h3></div>` +
    `<span class="recipe-status ${recipeOpen(selectedRecipe) ? 'available' : 'locked'}">${recipeOpen(selectedRecipe) ? copy.available : t('bookLocked', money(RECIPE_COST[selectedRecipe]))}</span></div>` +
    `<dl class="recipe-specs">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>` +
    `<h4>${copy.stepsHeading}</h4><ol class="recipe-steps">${steps.map(step => `<li><b>${step[0]}</b><span>${step[1]}</span></li>`).join('')}</ol>` +
    `<p class="recipe-note"><b>${copy.notesHeading}:</b> ${copy.notes}</p>`;
}
function closeBook() {
  if ($('#ovBook').hidden) return;
  $('#ovBook').hidden = true;
  const back = bookFrom === 'menu' ? $('#howBtn') : $('#bookBtn');
  if (back && back.offsetParent) back.focus({ preventScroll: true });
}
$('#howBtn').addEventListener('click', () => openBook('menu'));
$('#bookBtn').addEventListener('click', () => openBook(G.state === 'MENU' ? 'menu' : 'bar'));
$('#closeBookBtn').addEventListener('click', closeBook);
$('#menuBtn').addEventListener('click', () => {
  if (G.state === 'MENU') return;
  if (['ORDER_PENDING', 'PREPARING', 'READY_TO_SERVE', 'COMPLETED', 'RESULT'].includes(G.state)) toast(t('paused'));
  clearTimeout(G.resultTimer);
  G.cust = null; G.order = null; G.clock = null; resetBench(); $('#bubble').hidden = true; setState('MENU');
});
$('#muteBtn').addEventListener('click', () => {
  sfx.init(); save.muted = !save.muted; sfx.setMuted(save.muted); persist(); render();
});
function switchLang() {
  save.lang = save.lang === 'en' ? 'tr' : 'en';
  persist();
  applyLang();
}
$('#langBtn').addEventListener('click', switchLang);
$('#langBtn2').addEventListener('click', switchLang);
let resetArmed = false, resetTimer = 0;
$('#resetBtn').addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true; $('#resetBtn').textContent = t('resetConfirm');
    resetTimer = setTimeout(() => { resetArmed = false; $('#resetBtn').textContent = t('reset'); }, 3000);
    return;
  }
  clearTimeout(resetTimer); resetArmed = false;
  save = { ...DEFAULT_SAVE, muted: save.muted, lang: save.lang }; fixSave(); persist();
  $('#resetBtn').textContent = t('reset'); renderMenu(); render();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBook(); });

let toastTimer;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

// the recipe shop (issue #21): a card per drink, bought with the café's money; on the menu from the next day
function renderRecipes(el) {
  const L = S();
  el.innerHTML = `<h3>${L.recipes}</h3>` + Object.entries(RECIPE_COST).map(([k, cost]) => {
    const own = recipeOpen(k), short = cost - save.cash;
    return `<div class="upg rec${own ? ' own' : ''}" data-rec="${k}"><div><b>${drinkName(k)}</b><small>${L.recDesc[k]}</small></div>` +
      (own ? `<span class="tag good">${L.onMenu}</span>`
        : `<span class="buy"><button class="btn" type="button" data-r="${k}" ${short > 0 ? 'disabled' : ''}>${money(cost)}</button>` +
          (short > 0 ? `<small class="need">${t('needMore', money(short))}</small>` : '') + '</span>') + `</div>`;
  }).join('');
  el.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.r, cost = RECIPE_COST[k];
    if (recipeOpen(k) || save.cash < cost) return;
    sfx.init(); save.cash -= cost; save.recipes.push(k); save.intros.push(k); persist(); sfx.coin();
    toast(t('recipeBought', drinkName(k)));
    refreshShops();
    const card = document.querySelector(`#${el.id} [data-rec="${k}"]`);
    if (card) { card.classList.add('just-bought'); const r = card.getBoundingClientRect(); fx('confetti', r.left + r.width / 2, r.top + r.height / 2); }
  }));
}
function refreshShops() {
  render();
  renderChalk();
  if (G.state === 'DAY_END') fillDay(); else renderMenu();
}
function renderShop(el) {
  const L = S();
  el.innerHTML = `<h3>${L.upgrades}</h3>` + UPGRADES.map(u => {
    const [name, desc] = L.upg[u.id];
    return `<div class="upg"><div><b>${name}</b><small>${desc}</small></div>` +
      (has(u.id) ? `<span class="tag good">${L.owned}</span>` : `<button class="btn" type="button" data-u="${u.id}" ${save.cash < u.cost ? 'disabled' : ''}>${money(u.cost)}</button>`) + `</div>`;
  }).join('');
  el.querySelectorAll('[data-u]').forEach(b => b.addEventListener('click', () => {
    const u = UPGRADES.find(x => x.id === b.dataset.u);
    if (!u || has(u.id) || save.cash < u.cost) return;
    sfx.init(); save.cash -= u.cost; save.upgrades.push(u.id); persist(); sfx.coin();
    refreshShops();
  }));
}
function renderMenu() {
  $('#mCash').textContent = money(save.cash);
  $('#mDay').textContent = save.day;
  $('#mBest').textContent = money(save.best);
  $('#mRep').textContent = save.rep.toFixed(1);
  $('#startBtn').textContent = save.day > 1 ? t('openDay', save.day) : t('openCafe');
  renderRecipes($('#menuRecipes'));
  renderShop($('#menuShop'));
}

function applyLang() {
  const L = S();
  document.documentElement.lang = save.lang;
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  $('#langBtn').textContent = L.otherLang;
  $('#langBtn2').textContent = L.otherLangLong;
  renderBook();
  renderChalk();
  $('#closeBookBtn').textContent = t(bookFrom === 'menu' ? 'backToMenu' : 'backToBar');
  document.querySelectorAll('.patience').forEach(el => { el.title = L.patience; });
  applyBenchLang();
  if (resetArmed) $('#resetBtn').textContent = t('resetConfirm');
  // re-voice whatever the customer is currently saying
  if (G.order && G.cust && G.cust.state === 'wait') {
    if (G.result) {
      G.result = evaluate(G.order, G.served, G.servedPatience);
      $('#say').textContent = G.result.quote;
      if (G.state === 'RESULT') fillResult();
    } else {
      $('#say').textContent = curText().slice(0, Math.floor(Math.min(G.typed, 1e6)));
    }
  }
  if (G.state === 'DAY_END') fillDay();
  if (G.state === 'MENU') renderMenu();
  Helper.refresh();
  render();
}

function render() {
  const L = S();
  // bought upgrades show in the café (issue #21): html.upg-<id> (css/scene.css, css/bar.css)
  for (const u of UPGRADES) document.documentElement.classList.toggle('upg-' + u.id, has(u.id));
  $('#bench').classList.toggle('idle', G.state !== 'PREPARING');
  setView(viewFor());
  $('#hudDay').textContent = t('day', G.state === 'MENU' || G.state === 'DAY_END' ? save.day : G.day);
  $('#hudCust').textContent = G.clock != null && G.state !== 'MENU' && G.state !== 'DAY_END' ? clockText(Math.min(G.clock, CLOSE_MIN)) : L.closed;
  $('#hudCash').textContent = money(save.cash);
  $('#muteBtn').textContent = save.muted ? L.soundOff : L.soundOn;
  const waiting = G.cust && G.cust.state === 'wait';
  const talking = G.state === 'ORDER_PENDING' && waiting && G.chat !== 'kicked' && G.typed >= curText().length;
  $('#talkActions').hidden = !(G.state === 'ORDER_PENDING' && waiting) || G.chat === 'kicked' || (G.chat === 'rude' && !talking);
  $('#takeBtn').hidden = !!G.chat;
  $('#keepBtn').hidden = G.chat !== 'rude' || !talking;
  $('#kickBtn').hidden = !talking;
  $('#peekActions').hidden = G.state !== 'PREPARING' || G.chat === 'kicked';
  $('#serveActions').hidden = G.state !== 'READY_TO_SERVE' || !waiting || G.chat === 'kicked';
  $('#handHint').hidden = G.state !== 'READY_TO_SERVE' || G.chat === 'kicked';
  $('#custZone').hidden = G.state !== 'READY_TO_SERVE' || !waiting;
  const text = curText();
  // the ticket appears once the order has been said, and then stays pinned in both views until the drink is handed over
  const showTicket = G.order && waiting && !G.chat && G.typed >= text.length && G.state !== 'MENU';
  $('#ticket').hidden = !showTicket && curView === 'customer';
  $('#ticketNo').textContent = '#' + String(G.ticket).padStart(3, '0');
  $('#ticketText').textContent = showTicket ? `${G.cust.name}: “${text}”` : (G.state === 'MENU' || G.state === 'DAY_END' ? L.ticketIdle : L.ticketWait);
  renderBench();
  placeCustZone();
}

/* ---------------- canvases ---------------- */
const sceneCv = $('#sceneCv'), sceneG = sceneCv.getContext('2d');
const cupCv = $('#cupCv'), cupG = cupCv.getContext('2d');
const dims = { sw: 0, sh: 0, cw: 0, ch: 0, k: 1, counterH: 44, topD: 15 };
// scale the stage so the design height (or the narrowest bench width) fits the window (issue #14)
function fitStage() {
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  const top = Math.ceil($('.topbar').getBoundingClientRect().height);
  document.documentElement.style.setProperty('--top-h', top + 'px');
  const st = $('#stage'), r = st.getBoundingClientRect();
  if (!r.width || !r.height) return;
  // the helper may take a strip on the right for herself (issue #23)
  const w = r.width - (typeof Helper !== 'undefined' ? Helper.aside : 0);
  const fitAll = Math.min(r.height / STAGE_H, w / STAGE_MIN_W);
  // a phone: the whole bench would be drawn at under 3/4 size, so the close-up camera takes over (js/camera.js)
  const cam = fitAll < 0.75;
  // (at least CAM_MIN_W wide, so the customer's words and the ticket still fit side by side on a small phone)
  const s = cam ? Math.min(r.height / CAM_H, w / CAM_MIN_W) : fitAll;
  UI.s = s; UI.ox = r.left; UI.oy = r.top; UI.w = w / s; UI.h = r.height / s; UI.cam = cam;
  const v = $('#views');
  // the notch and home bar strips (css/stage.css), in stage pixels
  let probe = $('#safeProbe');
  if (!probe) { probe = document.createElement('div'); probe.id = 'safeProbe'; document.body.appendChild(probe); }
  const pc = getComputedStyle(probe);
  UI.safe = { l: parseFloat(pc.paddingLeft) / s || 0, r: parseFloat(pc.paddingRight) / s || 0, b: parseFloat(pc.paddingBottom) / s || 0 };
  for (const k of ['l', 'r', 'b']) v.style.setProperty('--safe-' + k, UI.safe[k].toFixed(1) + 'px');
  setStyle(v, 'width', UI.w + 'px'); setStyle(v, 'height', UI.h + 'px');
  setStyle(v, 'transform', `scale(${s})`);
  document.documentElement.classList.toggle('small-stage', cam);
  document.documentElement.classList.toggle('cam', cam);
  Cam.fit();
}
function fit() {
  fitStage();
  const dpr = pxRatio();
  // layout sizes (stage pixels); the backing stores follow the screen size so the drawing stays sharp
  const s = { width: sceneCv.clientWidth, height: sceneCv.clientHeight }, c = { width: cupCv.clientWidth, height: cupCv.clientHeight };
  if (s.width) {
    dims.sw = s.width; dims.sh = s.height;
    // the customer view is tall: a deeper bar seen slightly from above, and bigger customers (issue #6)
    dims.counterH = clamp(Math.round(s.height * 0.2), 44, 150);
    dims.topD = clamp(Math.round(dims.counterH * 0.42), 15, 58);
    dims.k = clamp(Math.min((s.height - dims.counterH) / 300, s.width / 330), 1, 1.7);
    const sc = $('#scene');
    sc.style.setProperty('--counter-h', dims.counterH + 'px');
    sc.style.setProperty('--top-d', dims.topD + 'px');
  }
  // a view that is switched off measures 0 × 0; keep the last real sizes until it comes back
  if (c.width) { dims.cw = c.width; dims.ch = c.height; cupCv.width = Math.round(c.width * dpr); cupCv.height = Math.round(c.height * dpr); }
  if (s.width) { sceneCv.width = Math.round(s.width * dpr); sceneCv.height = Math.round(s.height * dpr); }
  sceneG.setTransform(dpr, 0, 0, dpr, 0, 0); cupG.setTransform(dpr, 0, 0, dpr, 0, 0);
  fx('fit');
}
if (window.ResizeObserver) { const ro = new ResizeObserver(fit); ro.observe(sceneCv); ro.observe(cupCv); ro.observe($('#stage')); }
window.addEventListener('resize', fit);
// iPhone Safari: the toolbars grow and shrink without always firing a window resize
if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', () => window.scrollTo(0, 0)); }
window.addEventListener('scroll', () => { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); });

function drawCupObj() {
  const g = cupG, W = dims.cw, H = dims.ch;
  if (!W || !B.cup.size) return;
  g.clearRect(0, 0, W, H);
  const c = B.cup;
  const A = c._anim || (c._anim = { esp: 0, milk: 0, pumps: 0, levelPx: 0 });
  const k = reduceMotion ? 1 : 1 - Math.exp(-dtLast * 6);
  const espT = c.shots.length * 30 + (c.shotting ? Math.min(30, c.shotT) : 0);
  A.esp += (espT - A.esp) * (c.shotting ? 1 : k);
  A.milk += ((c.milkPoured ? 1 : 0) - A.milk) * (reduceMotion ? 1 : 1 - Math.exp(-dtLast * 3.2));
  A.pumps += (Object.values(c.syrups).reduce((a, b) => a + b, 0) - A.pumps) * k;
  drawCup(g, c, W / 2, H - 8, Math.min(0.8, (H - 16) / 196));
}

/* ---------------- main loop ---------------- */
function update(dt) {
  const c = G.cust;
  // the clock runs while the café is open for business (not on the menu, the score card, the tutorial or an intro)
  if (G.clock != null && c && G.state !== 'RESULT' && !Tutorial.active && !Intro.active) {
    const before = G.clock;
    G.clock += dt * CLOCK_RATE;
    if (Math.floor(before / 10) !== Math.floor(G.clock / 10)) render();
  }
  if (c) {
    if (c.state === 'enter') {
      if (G.gap > 0) {
        // nobody else comes after closing time
        if (closing()) { G.cust = null; endDay(); return; }
        G.gap -= dt;
        return;
      }
      const tx = custTargetX();
      c.x = Math.min(tx, c.x + 240 * dt);
      if (c.x >= tx) { c.state = 'wait'; onArrive(); render(); }
    } else if (c.state === 'leave') {
      c.x += 280 * dt;
      if (c.x > dims.sw + 120 * dims.k) { onLeft(); return; }
    } else {
      c.x = custTargetX();
      if (G.state === 'ORDER_PENDING') {
        const text = curText();
        if (G.typed < text.length) {
          G.typed = Math.min(text.length, G.typed + 48 * dt);
          $('#say').textContent = text.slice(0, Math.floor(G.typed));
          if (G.typed >= text.length) render();
        }
      }
      // no patience lost while the tutorial or a new drink's intro runs (issues #12, #21)
      if ((G.state === 'ORDER_PENDING' || G.state === 'PREPARING' || G.state === 'READY_TO_SERVE') && !Tutorial.active && !Intro.active && !G.chat) {
        G.patience = Math.max(0, G.patience - dt * (c.rude ? 1.5 : 1) / G.patMax);
        c.mood = G.patience > 0.55 ? 'happy' : G.patience > 0.25 ? 'neutral' : 'annoyed';
        if (G.patience === 0 && (G.grace += dt) >= WALKOUT_GRACE) walkOut();
      }
    }
    if (c.reactT != null) c.reactT += dt;
    const col = G.patience > 0.55 ? 'var(--mint)' : G.patience > 0.25 ? 'var(--butter)' : 'var(--blush-deep)';
    for (const pb of [$('#patBar'), $('#patBar2')]) { setFill(pb, G.patience); setStyle(pb, 'background', col); }
    placeCustZone();
  }
  updateBench(dt);
}
// the hand-over drop zone covers the customer standing at the bar; placed every frame and as soon as it is shown
function placeCustZone() {
  const z = $('#custZone'), c = G.cust;
  if (z.hidden || !c) return;
  const k = dims.k, cy = dims.sh - dims.counterH;
  setStyle(z, 'left', (c.x - 62 * k).toFixed(1) + 'px'); setStyle(z, 'top', (cy - 178 * k).toFixed(1) + 'px');
  setStyle(z, 'width', (124 * k).toFixed(1) + 'px'); setStyle(z, 'height', (178 * k + dims.topD).toFixed(1) + 'px');
}
let last = performance.now(), dtLast = 0.016;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; T += dt; dtLast = dt;
  try { update(dt); Cam.tick(dt); drawScene(); drawCupObj(); fx('frame', dt); Tutorial.tick(); Intro.tick(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}

// small debug/test hook
window.CB = { G, B, drop: (spec, target) => { const e = check(spec, target); if (!e) apply(spec, target); return e; }, cupState: () => cupSnapshot(B.cup),
  view: () => curView, switching: () => !!viewAnim, dragging: () => !!(drag && drag.started), tutorial: () => Tutorial.active, cam: Cam };

/* ---------------- phones (issue #27) ---------------- */
// in the background (another app, the screen off) the sound stops; the browser pauses the frame loop itself
document.addEventListener('visibilitychange', () => {
  if (sfx.ctx) document.hidden ? sfx.ctx.suspend() : sfx.ctx.resume();
});
// no long-press menu and no pinch zoom (iPhone ignores user-scalable) on the game
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
// ask the browser to keep the save even when space runs low
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
// offline play once opened (not from file://, where service workers do not run)
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

function start() {
  buildBench();
  resetBench();
  fit();
  sfx.setMuted(save.muted);
  applyLang();
  setState('MENU');
  requestAnimationFrame(frame);
  window.dispatchEvent(new CustomEvent('cafecb:game-ready'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
}
start();
