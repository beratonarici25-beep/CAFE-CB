/* Game flow: customers arrive, order, get served, the day ends. Owns the overlays, the HUD and the frame loop. */

const G = {
  state: 'MENU', day: save.day, idx: 0, total: 0, ticket: 100,
  cust: null, order: null, typed: 0, patience: 1, patMax: 70, servedPatience: 1,
  earned: 0, stars: [], result: null, served: null, resultTimer: 0,
};
let T = 0;

/* ---------------- state machine ---------------- */
const OVERLAYS = { MENU: 'ovMenu', RESULT: 'ovResult', DAY_END: 'ovDay' };
function setState(s) {
  G.state = s;
  for (const [k, id] of Object.entries(OVERLAYS)) $('#' + id).hidden = k !== s;
  if (s !== 'BREWING') clearHeld();
  if (s === 'MENU') renderMenu();
  render();
}

function startDay() {
  sfx.init();
  G.day = save.day; G.idx = 0; G.total = Math.min(4 + G.day, 9); G.earned = 0; G.stars = [];
  G.patMax = 70 * (has('stools') ? 1.25 : 1);
  G.cust = null;
  nextCustomer();
}
function nextCustomer() {
  G.cust = makeCustomer();
  G.order = makeOrder(G.day);
  G.typed = 0; G.patience = 1; G.served = null; G.result = null; G.ticket++;
  resetBench();
  $('#say').textContent = '';
  $('#bubble').hidden = true;
  setState('ORDERING');
}
function onArrive() {
  sfx.bell();
  $('#bubble').hidden = false;
  $('#custName').textContent = G.cust.name;
}
function takeOrder() {
  if (G.state !== 'ORDERING') return;
  G.typed = Infinity;
  $('#say').textContent = curText();
  sfx.click();
  setState('BREWING');
}
function serve() {
  if (G.state !== 'BREWING') return;
  const cup = B.cup;
  if (!cup.size) { toast(t('pickFirst')); return; }
  if (cup.shotting) stopShot();
  if (B.pf.grinding) grindEnd();
  if (B.pitcher.steaming) steamEnd();
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
  r.stars >= 3 ? sfx.coin() : sfx.sad();
  if (r.pay + r.tip > 0) fx('floatMoney', $('#serveZone'), r.pay + r.tip, $('#hudCash'));
  setState('SERVING');
  clearTimeout(G.resultTimer);
  G.resultTimer = setTimeout(showResult, 1300);
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
  if (G.state !== 'SERVING' || !G.cust || !G.result) return;
  fillResult();
  setState('RESULT');
  $('#nextBtn').focus({ preventScroll: true });
}
function afterResult() {
  if (G.state !== 'RESULT') return;
  sfx.click();
  G.idx++;
  G.cust.state = 'leave';
  $('#bubble').hidden = true;
  setState('SERVING');
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
$('#nextBtn').addEventListener('click', afterResult);
$('#startBtn').addEventListener('click', startDay);
$('#nextDayBtn').addEventListener('click', startDay);
$('#toMenuBtn').addEventListener('click', () => setState('MENU'));
$('#howBtn').addEventListener('click', () => { $('#ovBook').hidden = false; });
$('#bookBtn').addEventListener('click', () => { $('#ovBook').hidden = false; });
$('#closeBookBtn').addEventListener('click', () => { $('#ovBook').hidden = true; });
$('#menuBtn').addEventListener('click', () => {
  if (G.state === 'MENU') return;
  if (['ORDERING', 'BREWING', 'SERVING', 'RESULT'].includes(G.state)) toast(t('paused'));
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
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#ovBook').hidden = true; });

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
  $('.patience').title = L.patience;
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
  render();
}

function render() {
  const L = S();
  $('#bench').classList.toggle('idle', G.state !== 'BREWING');
  $('#hudDay').textContent = t('day', G.state === 'MENU' || G.state === 'DAY_END' ? save.day : G.day);
  $('#hudCust').textContent = G.total && G.state !== 'MENU' && G.state !== 'DAY_END' ? t('guest', Math.min(G.idx + 1, G.total), G.total) : L.closed;
  $('#hudCash').textContent = money(save.cash);
  $('#muteBtn').textContent = save.muted ? L.soundOff : L.soundOn;
  $('#talkActions').hidden = G.state !== 'ORDERING' || !G.cust || G.cust.state !== 'wait';
  const text = curText();
  const showTicket = G.order && G.cust && G.cust.state === 'wait' && G.typed >= text.length && G.state !== 'MENU';
  $('#ticketNo').textContent = '#' + String(G.ticket).padStart(3, '0');
  $('#ticketText').textContent = showTicket ? `${G.cust.name}: “${text}”` : (G.state === 'MENU' || G.state === 'DAY_END' ? L.ticketIdle : L.ticketWait);
  renderBench();
}

/* ---------------- canvases ---------------- */
const sceneCv = $('#sceneCv'), sceneG = sceneCv.getContext('2d');
const cupCv = $('#cupCv'), cupG = cupCv.getContext('2d');
const dims = { sw: 0, sh: 0, cw: 0, ch: 0 };
function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const s = sceneCv.getBoundingClientRect(), c = cupCv.getBoundingClientRect();
  dims.sw = s.width; dims.sh = s.height;
  if (c.width) { dims.cw = c.width; dims.ch = c.height; cupCv.width = Math.round(c.width * dpr); cupCv.height = Math.round(c.height * dpr); }
  sceneCv.width = Math.round(s.width * dpr); sceneCv.height = Math.round(s.height * dpr);
  sceneG.setTransform(dpr, 0, 0, dpr, 0, 0); cupG.setTransform(dpr, 0, 0, dpr, 0, 0);
  fx('fit');
}
if (window.ResizeObserver) { const ro = new ResizeObserver(fit); ro.observe(sceneCv); ro.observe(cupCv); }
window.addEventListener('resize', fit);

function drawCupObj() {
  const g = cupG, W = dims.cw, H = dims.ch;
  if (!W || !B.cup.size) return;
  g.clearRect(0, 0, W, H);
  drawCup(g, B.cup, W / 2, H - 8, Math.min(0.8, (H - 16) / 196));
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
      if (c.x > dims.sw + 120) { onLeft(); return; }
    } else {
      c.x = custTargetX();
      if (G.state === 'ORDERING') {
        const text = curText();
        if (G.typed < text.length) {
          G.typed = Math.min(text.length, G.typed + 48 * dt);
          $('#say').textContent = text.slice(0, Math.floor(G.typed));
          if (G.typed >= text.length) render();
        }
      }
      if (G.state === 'ORDERING' || G.state === 'BREWING') {
        G.patience = Math.max(0, G.patience - dt / G.patMax);
        c.mood = G.patience > 0.55 ? 'happy' : G.patience > 0.25 ? 'neutral' : 'annoyed';
      }
    }
    if (c.reactT != null) c.reactT += dt;
    const pb = $('#patBar');
    pb.style.width = (G.patience * 100) + '%';
    pb.style.background = G.patience > 0.55 ? 'var(--mint)' : G.patience > 0.25 ? 'var(--butter)' : 'var(--blush-deep)';
  }
  updateBench(dt);
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; T += dt;
  try { update(dt); drawScene(); drawCupObj(); fx('frame', dt); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}

// small debug/test hook
window.CB = { G, B, drop: (spec, target) => { const e = check(spec, target); if (!e) apply(spec, target); return e; }, cupState: () => cupSnapshot(B.cup) };

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
