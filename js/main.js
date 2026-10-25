/* Game flow: customers arrive, order, get served, the day ends. Owns the overlays, the HUD, the two views and the frame loop.
   One customer goes ORDER_PENDING (customer view) → PREPARING (barista view) → READY_TO_SERVE (customer view, cup on the bar)
   → COMPLETED (reaction, payment, leaving) → RESULT (score card), then the next customer. */

const G = {
  state: 'MENU', day: save.day, idx: 0, total: 0, ticket: 100,
  cust: null, order: null, typed: 0, patience: 1, patMax: 70, servedPatience: 1,
  earned: 0, stars: [], result: null, served: null, resultTimer: 0, peek: false,
};
let T = 0;

/* ---------------- state machine ---------------- */
const OVERLAYS = { MENU: 'ovMenu', RESULT: 'ovResult', DAY_END: 'ovDay' };
function setState(s) {
  G.state = s;
  for (const [k, id] of Object.entries(OVERLAYS)) $('#' + id).hidden = k !== s;
  if (s !== 'PREPARING') { clearHeld(); G.peek = false; }
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
  G.day = save.day; G.idx = 0; G.total = Math.min(4 + G.day, 9); G.earned = 0; G.stars = [];
  G.patMax = 70 * (has('stools') ? 1.25 : 1);
  G.cust = null;
  if (!save.tutorialDone) Tutorial.start();
  nextCustomer();
}
function nextCustomer() {
  G.cust = makeCustomer();
  G.order = Tutorial.active && G.idx === 0 ? Tutorial.order() : makeOrder(G.day);
  G.typed = 0; G.patience = 1; G.served = null; G.result = null; G.ticket++;
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
  if (G.state !== 'ORDER_PENDING') return;
  G.typed = Infinity;
  $('#say').textContent = curText();
  sfx.click();
  setState('PREPARING');
}
// the cup was dropped on the customer: they check it, react, and leave their money on the bar
function serve() {
  if (G.state !== 'READY_TO_SERVE') return;
  const cup = B.cup;
  if (!cup.size) { toast(t('pickFirst')); return; }
  stopAllSounds();
  G.servedPatience = G.patience;
  const r = evaluate(G.order, cup, G.patience);
  G.result = r; G.served = cup;
  B.cup = newCup(); layout();
  G.cust.mood = r.stars >= 5 ? 'delighted' : r.stars === 4 ? 'happy' : r.stars === 3 ? 'neutral' : 'upset';
  G.cust.react = r.stars >= 3 ? 'bounce' : 'shake'; G.cust.reactT = 0;
  save.cash += r.pay + r.tip; save.served++; G.earned += r.pay + r.tip; G.stars.push(r.stars);
  persist();
  $('#say').textContent = r.quote;
  r.stars >= 3 ? sfx.coins(r.tip > 0) : sfx.sad();
  if (r.pay + r.tip > 0) fx('floatMoney', $('#custZone'), r.pay + r.tip, $('#hudCash'));
  setState('COMPLETED');
  clearTimeout(G.resultTimer);
  G.resultTimer = setTimeout(showResult, 1500);
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
  $('#nextBtn').textContent = G.idx + 1 >= G.total ? t('closeShop') : t('nextCustomer');
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
  G.idx++;
  G.cust.state = 'leave';
  $('#bubble').hidden = true;
  setState('COMPLETED');
}
function onLeft() {
  G.cust = null; G.served = null;
  if (G.idx >= G.total) endDay(); else nextCustomer();
}
function fillDay() {
  const avg = G.stars.length ? G.stars.reduce((a, b) => a + b, 0) / G.stars.length : 0;
  $('#dTitle').textContent = t('dayDone', G.day);
  $('#dEarn').textContent = money(G.earned);
  $('#dStars').textContent = avg.toFixed(1);
  $('#dCash').textContent = money(save.cash);
  $('#nextDayBtn').textContent = t('openDay', save.day);
  renderShop($('#dayShop'));
}
function endDay() {
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
function openBook(from) {
  sfx.init(); sfx.click();
  bookFrom = from;
  $('#closeBookBtn').textContent = t(from === 'menu' ? 'backToMenu' : 'backToBar');
  $('#ovBook').hidden = false;
  $('#closeBookBtn').focus({ preventScroll: true });
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
  G.cust = null; G.order = null; G.total = 0; resetBench(); $('#bubble').hidden = true; setState('MENU');
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
  save = { ...DEFAULT_SAVE, muted: save.muted, lang: save.lang }; persist();
  $('#resetBtn').textContent = t('reset'); renderMenu(); render();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBook(); });

let toastTimer;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
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
    renderShop(el); render();
    if (el.id === 'dayShop') $('#dCash').textContent = money(save.cash);
    else renderMenu();
  }));
}
function renderMenu() {
  $('#mCash').textContent = money(save.cash);
  $('#mDay').textContent = save.day;
  $('#mBest').textContent = money(save.best);
  $('#startBtn').textContent = save.day > 1 ? t('openDay', save.day) : t('openCafe');
  renderShop($('#menuShop'));
}

function applyLang() {
  const L = S();
  document.documentElement.lang = save.lang;
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  $('#langBtn').textContent = L.otherLang;
  $('#langBtn2').textContent = L.otherLangLong;
  $('#bookBody').innerHTML = L.howSteps + L.book;
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
  $('#bench').classList.toggle('idle', G.state !== 'PREPARING');
  setView(viewFor());
  $('#hudDay').textContent = t('day', G.state === 'MENU' || G.state === 'DAY_END' ? save.day : G.day);
  $('#hudCust').textContent = G.total && G.state !== 'MENU' && G.state !== 'DAY_END' ? t('guest', Math.min(G.idx + 1, G.total), G.total) : L.closed;
  $('#hudCash').textContent = money(save.cash);
  $('#muteBtn').textContent = save.muted ? L.soundOff : L.soundOn;
  const waiting = G.cust && G.cust.state === 'wait';
  $('#talkActions').hidden = G.state !== 'ORDER_PENDING' || !waiting;
  $('#peekActions').hidden = G.state !== 'PREPARING';
  $('#handHint').hidden = G.state !== 'READY_TO_SERVE';
  $('#custZone').hidden = G.state !== 'READY_TO_SERVE' || !waiting;
  const text = curText();
  // the ticket appears once the order has been said, and then stays pinned in both views until the drink is handed over
  const showTicket = G.order && waiting && G.typed >= text.length && G.state !== 'MENU';
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
  const top = Math.ceil($('.topbar').getBoundingClientRect().height);
  document.documentElement.style.setProperty('--top-h', top + 'px');
  const st = $('#stage'), r = st.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const s = Math.min(r.height / STAGE_H, r.width / STAGE_MIN_W);
  UI.s = s; UI.ox = r.left; UI.oy = r.top; UI.w = r.width / s; UI.h = r.height / s;
  const v = $('#views');
  v.style.width = UI.w + 'px'; v.style.height = UI.h + 'px';
  v.style.transform = `scale(${s})`;
  document.documentElement.classList.toggle('small-stage', s < 0.75);
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
if (window.visualViewport) visualViewport.addEventListener('resize', fit);

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
  if (c) {
    if (c.state === 'enter') {
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
      // no patience lost while the tutorial runs (issue #12)
      if ((G.state === 'ORDER_PENDING' || G.state === 'PREPARING' || G.state === 'READY_TO_SERVE') && !Tutorial.active) {
        G.patience = Math.max(0, G.patience - dt / G.patMax);
        c.mood = G.patience > 0.55 ? 'happy' : G.patience > 0.25 ? 'neutral' : 'annoyed';
      }
    }
    if (c.reactT != null) c.reactT += dt;
    const col = G.patience > 0.55 ? 'var(--mint)' : G.patience > 0.25 ? 'var(--butter)' : 'var(--blush-deep)';
    for (const pb of [$('#patBar'), $('#patBar2')]) { pb.style.width = (G.patience * 100) + '%'; pb.style.background = col; }
    placeCustZone();
  }
  updateBench(dt);
}
// the hand-over drop zone covers the customer standing at the bar; placed every frame and as soon as it is shown
function placeCustZone() {
  const z = $('#custZone'), c = G.cust;
  if (z.hidden || !c) return;
  const k = dims.k, cy = dims.sh - dims.counterH;
  z.style.left = (c.x - 62 * k) + 'px'; z.style.top = (cy - 178 * k) + 'px';
  z.style.width = (124 * k) + 'px'; z.style.height = (178 * k + dims.topD) + 'px';
}
let last = performance.now(), dtLast = 0.016;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; T += dt; dtLast = dt;
  try { update(dt); drawScene(); drawCupObj(); fx('frame', dt); Tutorial.tick(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}

// small debug/test hook
window.CB = { G, B, drop: (spec, target) => { const e = check(spec, target); if (!e) apply(spec, target); return e; }, cupState: () => cupSnapshot(B.cup),
  view: () => curView, switching: () => !!viewAnim, dragging: () => !!(drag && drag.started), tutorial: () => Tutorial.active };

function start() {
  buildBench();
  resetBench();
  fit();
  sfx.setMuted(save.muted);
  applyLang();
  setState('MENU');
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
}
start();
