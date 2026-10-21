/* The barista bench: every object you can drag (or tap, then tap a target) and what happens when it lands.
   State lives in B (see recipe.js for its shape and for the Rules that allow or refuse each move). */

const B = { cup: newCup(), pf: newPortafilter(), pitcher: newPitcher() };
let stopGrindSnd = null, stopSteamSnd = null, stopShotSnd = null;
const fx = (name, ...a) => { try { return typeof FX !== 'undefined' && FX[name] ? FX[name](...a) : undefined; } catch (e) { console.error(e); } };

function stopAllSounds() {
  [stopGrindSnd, stopSteamSnd, stopShotSnd].forEach(f => f && f());
  stopGrindSnd = stopSteamSnd = stopShotSnd = null;
}
function resetBench() {
  stopAllSounds();
  B.cup = newCup(); B.pf = newPortafilter(); B.pitcher = newPitcher();
  clearHeld();
  layout();
}
// legacy name used by the main loop and tests
Object.defineProperty(window, 'cup', { get: () => B.cup });

const canAct = () => G.state === 'BREWING';
function deny(key, el) {
  if (key === 'same') return;
  toast(t('err.' + key));
  sfx.error();
  if (el) fx('shake', el);
}

/* ---------------- what can go where ---------------- */
const TARGETS = {
  newcup: ['prep', 'tray'],
  cup: ['prep', 'tray', 'serve', 'trash'],
  pf: ['grinder', 'group', 'pfrack', 'trash'],
  tamper: ['pf'],
  milk: ['pitcher'],
  pitcher: ['wand', 'pitcherrack', 'cup', 'trash'],
  syrup: ['cup'],
  top: ['cup'],
};
const PF_SPOT = { grinder: 'grinder', group: 'group', pfrack: 'rack' };
const PITCHER_SPOT = { wand: 'wand', pitcherrack: 'rack' };

// null when the drop is allowed, otherwise an STR.err key
function check(spec, target) {
  const [kind, arg] = spec.split(':');
  if (!(TARGETS[kind] || []).includes(target)) return 'nope';
  switch (kind) {
    case 'newcup': return Rules.placeNewCup(B);
    case 'cup': return target === 'serve' ? Rules.serve(B) : target === 'trash' ? Rules.trashCup(B) : Rules.moveCup(B, target);
    case 'pf': return target === 'trash' ? Rules.dumpPf(B) : Rules.movePf(B, PF_SPOT[target]);
    case 'tamper': return Rules.tamp(B);
    case 'milk': return Rules.fillPitcher(B);
    case 'pitcher': return target === 'cup' ? Rules.pour(B) : target === 'trash' ? Rules.dumpPitcher(B) : Rules.movePitcher(B, PITCHER_SPOT[target]);
    case 'syrup': return Rules.syrup(B);
    case 'top': return Rules.topping(B, arg);
  }
  return 'nope';
}

// Performs an allowed drop. `from` is where the dragged ghost was, so the real object can glide from there.
function apply(spec, target, from) {
  const [kind, arg] = spec.split(':');
  const c = B.cup;
  switch (kind) {
    case 'newcup':
      B.cup = { ...newCup(), size: arg, at: target };
      sfx.clack(); layout({ cup: from }); fx('land', $('#cupObj'));
      break;
    case 'cup':
      if (target === 'serve') { serve(); return; }
      if (target === 'trash') { trashCup(from); return; }
      if (c.shotting) stopShot();
      c.at = target; sfx.clack(); layout({ cup: from });
      break;
    case 'pf':
      if (target === 'trash') {
        if (B.pf.grinding) grindEnd();
        B.pf.dose = 0; B.pf.doseQ = 0; B.pf.tamped = false;
        sfx.trash(); fx('lid'); fx('dust', $('#trashZone'), '#5b3423');
        break;
      }
      if (B.pf.grinding) grindEnd();
      B.pf.at = PF_SPOT[target]; sfx.clack(); layout({ pf: from });
      break;
    case 'tamper':
      B.pf.tamped = true; sfx.tamp(); fx('tamp', $('#pfObj'));
      break;
    case 'milk':
      B.pitcher.milk = arg; B.pitcher.temp = 6; B.pitcher.scorched = false;
      sfx.pour(); fx('pourInto', $('#pitcherObj'), C.milk);
      break;
    case 'pitcher':
      if (target === 'cup') { pourMilk(); if (!from) fx('pourInto', $('#cupObj'), C.milk); break; }
      if (target === 'trash') {
        B.pitcher = { ...newPitcher(), at: B.pitcher.at, foam: B.pitcher.foam };
        sfx.trash(); fx('lid');
        break;
      }
      B.pitcher.at = PITCHER_SPOT[target]; sfx.clack(); layout({ pitcher: from });
      break;
    case 'syrup':
      c.syrups[arg] = (c.syrups[arg] || 0) + 1;
      sfx.pump(); fx('pump', document.querySelector(`[data-drag="syrup:${arg}"]`), $('#cupObj'), SYRUPS[arg].color);
      break;
    case 'top':
      c.tops.push(arg);
      sfx.click(); fx('sprinkle', $('#cupObj'), TOP_COLORS[arg]);
      break;
  }
  render();
}

/* ---------------- station actions (buttons) ---------------- */
function pickBean(k) { if (!canAct() || B.pf.dose > 0 || B.pf.grinding) return; B.pf.bean = k; sfx.click(); render(); }
const doseZone = () => has('grinder') ? [16, 20] : [17, 19];
function grindStart() {
  if (!canAct()) return;
  const e = Rules.grind(B); if (e) { deny(e, $('#pfObj')); return; }
  B.pf.grinding = true; stopGrindSnd = sfx.grind();
}
function grindEnd() {
  const p = B.pf;
  if (!p.grinding) return;
  p.grinding = false; if (stopGrindSnd) stopGrindSnd(); stopGrindSnd = null;
  if (p.dose > 0.3) {
    const [lo, hi] = doseZone();
    const dist = p.dose < lo ? lo - p.dose : p.dose > hi ? p.dose - hi : 0;
    p.doseQ = Math.max(0, 1 - dist * 0.35);
  } else p.dose = 0;
  render();
}
function toggleShot() {
  if (B.cup.shotting) { stopShot(); return; }
  if (!canAct()) return;
  const e = Rules.brew(B); if (e) { deny(e, $('#brewBtn')); return; }
  const c = B.cup;
  c.shotting = true; c.shotT = 0; c.bean = B.pf.bean; c.dose = B.pf.dose; c.doseQ = B.pf.doseQ;
  stopShotSnd = sfx.drip(); render();
}
function stopShot() {
  const c = B.cup;
  if (!c.shotting) return;
  c.shotting = false; if (stopShotSnd) stopShotSnd(); stopShotSnd = null;
  const tm = c.shotT, dist = tm < 25 ? 25 - tm : tm > 30 ? tm - 30 : 0;
  c.shots.push({ t: tm, q: Math.max(0, 1 - dist * 0.08) });
  render();
}
function steamStart() {
  if (!canAct()) return;
  const e = Rules.steam(B); if (e) { deny(e, $('#pitcherObj')); return; }
  B.pitcher.steaming = true; stopSteamSnd = sfx.steam();
}
function steamEnd() {
  if (!B.pitcher.steaming) return;
  B.pitcher.steaming = false; if (stopSteamSnd) stopSteamSnd(); stopSteamSnd = null; render();
}
function setFoam(k) { if (!canAct()) return; B.pitcher.foam = k; sfx.click(); render(); }
function pourMilk() {
  const c = B.cup, p = B.pitcher;
  c.milkPoured = true; c.milkType = p.milk; c.foamUsed = p.foam; c.milkTemp = p.temp; c.scorched = p.scorched;
  B.pitcher = { ...newPitcher(), at: p.at, foam: p.foam };
  sfx.pour();
}
function trashCup(from) {
  if (B.cup.shotting) stopShot();
  B.cup = newCup();
  sfx.trash(); fx('lid');
  layout(); render();
}
function serveFromButton() {
  if (!canAct()) return;
  const e = Rules.serve(B); if (e) { deny(e, $('#serveZone')); return; }
  serve();
}

/* ---------------- placing objects in their slots ---------------- */
const SLOT = {
  cup: { prep: '#slotPrep', tray: '#slotTray' },
  pf: { rack: '#slotPfRack', grinder: '#slotGrinder', group: '#slotGroup' },
  pitcher: { rack: '#slotPitcherRack', wand: '#slotWand' },
};
function moveInto(el, parentSel, from) {
  const parent = $(parentSel);
  // from: a rect to glide from; false: appear in place; undefined: glide from wherever it was
  const before = from === false ? null : from || (el.isConnected && !el.hidden ? el.getBoundingClientRect() : null);
  if (el.parentElement !== parent) parent.appendChild(el);
  if (before) fx('flip', el, before);
}
function layout(from = {}) {
  const cupEl = $('#cupObj'), wasHidden = cupEl.hidden;
  cupEl.hidden = !B.cup.size;
  if (B.cup.size) moveInto(cupEl, SLOT.cup[B.cup.at], from.cup || (wasHidden ? false : undefined));
  moveInto($('#pfObj'), SLOT.pf[B.pf.at], from.pf);
  moveInto($('#pitcherObj'), SLOT.pitcher[B.pitcher.at], from.pitcher);
  document.querySelectorAll('.slot').forEach(s => s.classList.toggle('filled', [...s.children].some(ch => ch.classList.contains('obj') && !ch.hidden)));
}

/* ---------------- drag & drop / tap-to-place ---------------- */
let drag = null;   // active pointer drag
let held = null;   // tap-selected object waiting for a tap on its target

const kindOf = spec => spec.split(':')[0];
function resolveTarget(el, spec, src) {
  const list = TARGETS[kindOf(spec)] || [];
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n === src) continue;
    const d = n.dataset && n.dataset.drop;
    if (d && list.includes(d) && !(n.hidden)) return { el: n, name: d };
  }
  return null;
}
function markTargets(spec, src) {
  clearMarks();
  document.querySelectorAll('[data-drop]').forEach(n => {
    if (n === src || n.hidden || n.closest('[hidden]')) return;
    if (check(spec, n.dataset.drop) === null) n.classList.add('can-drop');
  });
}
function clearMarks() { document.querySelectorAll('.can-drop, .drop-hover').forEach(n => n.classList.remove('can-drop', 'drop-hover')); }
function objName(spec) {
  const [kind, arg] = spec.split(':'), L = S();
  return kind === 'newcup' ? fmt(L.cupWord, L.sizes[arg]) : kind === 'milk' ? L.milkLabel[arg] : kind === 'syrup' ? L.syrupNames[arg]
    : kind === 'top' ? L.tops[arg] : L.obj[kind] || kind;
}
function setHeld(spec, src) {
  clearHeld();
  held = { spec, src };
  src.classList.add('selected');
  markTargets(spec, src);
  $('#holding').hidden = false;
  $('#holding').textContent = t('obj.hold', objName(spec));
  sfx.pickup();
}
function clearHeld() {
  if (held) held.src.classList.remove('selected');
  held = null;
  clearMarks();
  const h = $('#holding'); if (h) h.hidden = true;
}

function attempt(spec, target, from, src) {
  const e = check(spec, target.name);
  if (e) { deny(e, target.el); return false; }
  apply(spec, target.name, from);
  return true;
}

function makeGhost(src) {
  const r = src.getBoundingClientRect();
  const g = src.cloneNode(true);
  g.removeAttribute('id');
  g.querySelectorAll('[id]').forEach(n => { if (n.tagName.toLowerCase() !== 'clippath') n.removeAttribute('id'); });
  const srcCv = src.querySelectorAll('canvas'), gCv = g.querySelectorAll('canvas');
  srcCv.forEach((cv, i) => { gCv[i].width = cv.width; gCv[i].height = cv.height; gCv[i].getContext('2d').drawImage(cv, 0, 0); });
  g.classList.remove('selected', 'can-drop', 'drop-hover', 'dragging-src');
  g.classList.add('drag-ghost');
  g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
  g.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;
  document.body.appendChild(g);
  return { el: g, x: r.left, y: r.top, w: r.width, h: r.height, tilt: 0 };
}

function onPointerDown(e) {
  if (e.button > 0 || drag) return;
  if (held) {
    const tgt = resolveTarget(e.target, held.spec, held.src);
    if (tgt) {
      e.preventDefault();
      const spec = held.spec, src = held.src;
      clearHeld();
      attempt(spec, tgt, null, src);
      return;
    }
  }
  const src = e.target.closest('[data-drag]');
  if (!src || !canAct()) { if (held && !e.target.closest('button, .chip')) clearHeld(); return; }
  e.preventDefault();
  sfx.init();
  drag = { spec: src.dataset.drag, src, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, started: false, ghost: null, hover: null };
}
function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  drag.x = e.clientX; drag.y = e.clientY;
  if (!drag.started) {
    if (Math.hypot(drag.x - drag.sx, drag.y - drag.sy) < 6) return;
    drag.started = true;
    clearHeld();
    const r = drag.src.getBoundingClientRect();
    drag.offX = drag.sx - r.left; drag.offY = drag.sy - r.top;
    drag.ghost = makeGhost(drag.src);
    drag.src.classList.add('dragging-src');
    document.body.classList.add('is-dragging');
    markTargets(drag.spec, drag.src);
    sfx.pickup();
  }
  updateHover();
}
function updateHover() {
  const under = document.elementFromPoint(drag.x, drag.y);
  const tgt = under ? resolveTarget(under, drag.spec, drag.src) : null;
  if ((tgt && tgt.el) !== (drag.hover && drag.hover.el)) {
    if (drag.hover) drag.hover.el.classList.remove('drop-hover');
    if (tgt) tgt.el.classList.add('drop-hover');
    drag.hover = tgt;
  }
}
function onPointerUp(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (!d.started) { tap(d.src); return; }
  document.body.classList.remove('is-dragging');
  d.src.classList.remove('dragging-src');
  clearMarks();
  const g = d.ghost;
  const from = { left: g.x, top: g.y, width: g.w, height: g.h };
  const tgt = d.hover;
  const kind = kindOf(d.spec);
  const ok = tgt && canAct() ? attempt(d.spec, tgt, from, d.src) : false;
  if (ok && ['cup', 'pf', 'pitcher', 'newcup'].includes(kind) && !(tgt.name === 'trash' || tgt.name === 'serve' || (kind === 'pitcher' && tgt.name === 'cup'))) {
    g.el.remove();                       // the real object glides in from the ghost (FLIP)
  } else if (ok && tgt.name === 'trash' && kind === 'cup') {
    fx('intoTrash', g.el, $('#bin'));
  } else if (ok && tgt.name === 'serve') {
    fx('fadeOut', g.el);
  } else if (ok && (kind === 'pitcher' && tgt.name === 'cup')) {
    fx('tiltPour', g.el, $('#cupObj'), d.src);
  } else {
    fx('flyBack', g.el, d.src);          // tools return to their spot; refused drops bounce home
  }
}
function onPointerCancel(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  document.body.classList.remove('is-dragging');
  d.src.classList.remove('dragging-src');
  clearMarks();
  if (d.ghost) d.ghost.el.remove();
}
function tap(src) {
  if (!canAct()) return;
  const spec = src.dataset.drag;
  if (held && held.src === src) { clearHeld(); return; }
  setHeld(spec, src);
}
// keyboard: Enter/Space picks an object up, then Enter/Space on a target puts it down
function onKey(e) {
  if (e.key === 'Escape' && held) { clearHeld(); return; }
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = document.activeElement;
  if (!el || !el.closest || !el.closest('#counter')) return;
  if (held) {
    const tgt = resolveTarget(el, held.spec, held.src);
    if (tgt) { e.preventDefault(); const { spec, src } = held; clearHeld(); attempt(spec, tgt, null, src); return; }
  }
  if (el.dataset.drag && el.tagName !== 'BUTTON') { e.preventDefault(); tap(el); }
  else if (el.dataset.drag) { e.preventDefault(); tap(el); }
}

// per-frame ghost follow with a little lag and tilt
function updateDrag() {
  if (!drag || !drag.started) return;
  // scroll the page when the object is held near the top or bottom edge
  const edge = 70, vh = window.innerHeight;
  // only once the pointer has travelled toward that edge, so grabbing something low on screen does not scroll
  const dy = drag.y < edge && drag.y < drag.sy - 12 ? -(edge - drag.y) / 4
    : drag.y > vh - edge && drag.y > drag.sy + 12 ? (drag.y - (vh - edge)) / 4 : 0;
  if (dy) { window.scrollBy(0, Math.round(dy)); updateHover(); }
  const g = drag.ghost, tx = drag.x - drag.offX, ty = drag.y - drag.offY;
  const k = reduceMotion ? 1 : 0.38;
  const vx = (tx - g.x) * k;
  g.x += vx; g.y += (ty - g.y) * k;
  g.tilt += (clamp(vx * 0.9, -16, 16) - g.tilt) * 0.25;
  g.el.style.transform = `translate3d(${g.x}px, ${g.y}px, 0) rotate(${reduceMotion ? 0 : g.tilt}deg) scale(1.06)`;
}

/* ---------------- building the bench DOM ---------------- */
const MILK_COLORS = { whole: '#ffffff', oat: '#efe0c0', almond: '#f5e9da' };
const TOP_COLORS = { whip: '#ffffff', cocoa: '#6b3b26', cinnamon: '#b5652e' };
const BEAN_COLORS = { esp: '#5b3423', decaf: '#8a6a4a', dark: '#2e1a12' };
function bottle(spec, cls, color, extra = '') {
  return `<button class="obj bottle-obj ${cls}" type="button" data-drag="${spec}" style="--c:${color}"><span class="glass">${extra}</span><span class="nm"></span><span class="n"></span></button>`;
}
function makeChips(el, keys, fn) {
  el.innerHTML = '';
  for (const k of keys) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.k = k;
    b.addEventListener('click', () => { sfx.init(); fn(k); });
    el.appendChild(b);
  }
}
function holdable(btn, onStart, onEnd) {
  let on = false;
  const start = () => { if (btn.disabled || on) return; on = true; btn.classList.add('active'); sfx.init(); onStart(); };
  const end = () => { if (!on) return; on = false; btn.classList.remove('active'); onEnd(); };
  btn.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (_) {} start(); });
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('lostpointercapture', end);
  btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
  btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } });
  btn.addEventListener('blur', end);
  btn.addEventListener('contextmenu', e => e.preventDefault());
}

function buildBench() {
  $('#milkBottles').innerHTML = MILK_KEYS.map(k => bottle('milk:' + k, 'milk', MILK_COLORS[k])).join('');
  $('#syrupBottles').innerHTML = Object.entries(SYRUPS).map(([k, s]) => bottle('syrup:' + k, 'syrup', s.color, '<span class="pumphead"></span>')).join('');
  $('#topShakers').innerHTML = TOP_KEYS.map(k => bottle('top:' + k, 'shaker', TOP_COLORS[k])).join('');
  makeChips($('#beanChips'), BEAN_KEYS, pickBean);
  makeChips($('#foamChips'), FOAM_KEYS, setFoam);
  holdable($('#grindBtn'), grindStart, grindEnd);
  holdable($('#steamBtn'), steamStart, steamEnd);
  $('#brewBtn').addEventListener('click', () => { sfx.init(); toggleShot(); });
  $('#serveBtn').addEventListener('click', serveFromButton);
  const ctr = $('#counter');
  ctr.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerdown', e => { if (held && !ctr.contains(e.target)) clearHeld(); });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  document.addEventListener('keydown', onKey);
  ctr.addEventListener('dragstart', e => e.preventDefault());
  // drop spots become keyboard-reachable
  ctr.querySelectorAll('.slot[data-drop], .zone[data-drop]').forEach(n => n.tabIndex = 0);
  // thermometer bands (0–90 °C) and the shot window (0–45 s)
  const map = { warm: '#bandWarm', normal: '#bandNormal', hot: '#bandHot' };
  for (const [k, b] of Object.entries(TEMPS)) {
    const el = $(map[k]); el.style.left = (b.lo / 90 * 100) + '%'; el.style.width = ((b.hi - b.lo) / 90 * 100) + '%';
  }
  $('#shotZone').style.left = (25 / 45 * 100) + '%';
  $('#shotZone').style.width = (5 / 45 * 100) + '%';
  layout();
}

function applyBenchLang() {
  const L = S();
  document.querySelectorAll('#cupStand b[data-size]').forEach(b => { b.textContent = L.sizes[b.dataset.size]; });
  $('#beanChips').querySelectorAll('button').forEach(b => { b.textContent = L.beans[b.dataset.k]; });
  $('#foamChips').querySelectorAll('button').forEach(b => { b.textContent = L.foams[b.dataset.k]; });
  document.querySelectorAll('[data-drag^="milk:"] .nm').forEach(n => { n.textContent = L.milks[n.parentElement.dataset.drag.split(':')[1]]; });
  document.querySelectorAll('[data-drag^="syrup:"] .nm').forEach(n => { n.textContent = L.syrupNames[n.parentElement.dataset.drag.split(':')[1]]; });
  document.querySelectorAll('[data-drag^="top:"] .nm').forEach(n => { n.textContent = L.tops[n.parentElement.dataset.drag.split(':')[1]]; });
  const sw = { warm: 'var(--butter)', normal: 'var(--blush)', hot: 'var(--blush-deep)' };
  $('#bandLabels').innerHTML = Object.entries(TEMPS).map(([k, b]) => `<span><i style="background:${sw[k]}"></i>${L.temps[k]} ${b.lo}–${b.hi}°</span>`).join('');
  if (held) $('#holding').textContent = t('obj.hold', objName(held.spec));
}

const setPressed = (el, fn) => el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', fn(b.dataset.k) ? 'true' : 'false'));
function renderBench() {
  const L = S(), c = B.cup, p = B.pf, pt = B.pitcher;
  setPressed($('#beanChips'), k => p.bean === k);
  $('#beanChips').querySelectorAll('button').forEach(b => { b.disabled = p.dose > 0; });
  $('#hopper').style.setProperty('--bean', BEAN_COLORS[p.bean]);
  const [lo, hi] = doseZone();
  $('#doseZoneTxt').textContent = t('sweetSpot', lo, hi);
  $('#doseZone').style.left = (lo / 25 * 100) + '%';
  $('#doseZone').style.width = ((hi - lo) / 25 * 100) + '%';
  const pfEl = $('#pfObj');
  pfEl.classList.toggle('has-grounds', p.dose > 0);
  pfEl.classList.toggle('tamped', p.tamped);
  $('#pfTag').textContent = p.dose > 0 ? fmt(p.tamped ? L.pfState.tamped : L.pfState.ground, p.dose.toFixed(1)) : L.pfState.empty;

  const brew = $('#brewBtn');
  brew.textContent = c.shotting ? L.stopBtn : L.brewBtn;
  brew.classList.toggle('on', c.shotting);
  $('#shotList').innerHTML = c.shots.map((s, i) => {
    const cls = s.q >= 0.9 ? 'good' : s.q < 0.5 ? 'bad' : '';
    const word = s.t < 25 ? L.sour : s.t > 30 ? L.bitter : L.perfect;
    return `<span class="tag ${cls}">${t('shotTag', i + 1, Math.round(s.t), word)}</span>`;
  }).join('') || `<span class="tag">${L.noShots}</span>`;

  setPressed($('#foamChips'), k => pt.foam === k);
  $('#pitcherTag').textContent = pt.milk ? fmt(L.pitcherState.milk, L.milks[pt.milk], Math.round(pt.temp)) : L.pitcherState.empty;

  document.querySelectorAll('[data-drag^="syrup:"]').forEach(b => {
    const n = c.syrups[b.dataset.drag.split(':')[1]] || 0;
    b.querySelector('.n').textContent = n ? L.pumps(n) : '';
  });
  document.querySelectorAll('[data-drag^="top:"]').forEach(b => {
    b.querySelector('.n').textContent = c.tops.includes(b.dataset.drag.split(':')[1]) ? '✓' : '';
  });
  $('#serveBtn').disabled = !canAct() || !c.size;

  const info = [];
  if (c.size) info.push(fmt(L.cupWord, L.sizes[c.size]));
  if (c.shots.length) info.push(`${c.shots.length} × ${L.beans[c.bean]}`);
  if (c.milkPoured) info.push(fmt(L.milkInfo, L.milkLabel[c.milkType], Math.round(c.milkTemp), L.foams[c.foamUsed].toLocaleLowerCase(save.lang)));
  for (const [k, n] of Object.entries(c.syrups)) info.push(`${L.syrupNames[k]} ×${n}`);
  for (const k of c.tops) info.push(L.tops[k]);
  $('#cupInfo').textContent = info.length ? info.join(' · ') : (c.size ? '' : L.noCup);
}

// per-frame: timers, meters and the pitcher's milk level
function updateBench(dt) {
  const L = S(), c = B.cup, p = B.pf, pt = B.pitcher;
  if (G.state === 'BREWING') {
    if (p.grinding) {
      p.dose = Math.min(25, p.dose + 7 * dt);
      if (p.dose >= 25) grindEnd();
    }
    if (c.shotting) {
      c.shotT += (has('gauge') ? 7.7 : 11) * dt;
      if (c.shotT >= 45) stopShot();
    }
    if (pt.steaming) {
      pt.temp = Math.min(95, pt.temp + 15 * dt);
      if (pt.temp > 82) pt.scorched = true;
    }
  }
  $('#pfObj').classList.toggle('has-grounds', p.dose > 0);
  $('#doseFill').style.width = (p.dose / 25 * 100) + '%';
  $('#doseTxt').textContent = p.dose.toFixed(1) + ' g';
  const [lo, hi] = doseZone();
  $('#doseMsg').textContent = p.grinding ? L.grinding : p.dose <= 0 ? L.holdGrind : p.dose < lo ? L.doseLight : p.dose > hi ? L.doseOver : L.perfectDose;
  $('#shotNeedle').style.left = (Math.min(45, c.shotT) / 45 * 100) + '%';
  $('#shotTxt').textContent = Math.round(c.shotT) + ' ' + L.sec;
  $('#shotMsg').textContent = c.shotting ? (c.shotT < 25 ? L.waitFor : c.shotT <= 30 ? L.now : L.tooLong)
    : p.at !== 'group' ? t('err.pfToGroup') : c.shots.length >= 3 ? L.max3 : L.ready;
  $('#tempFill').style.width = (Math.min(90, pt.temp) / 90 * 100) + '%';
  $('#tempTxt').textContent = Math.round(pt.temp) + ' °C';
  $('#tempMsg').textContent = !pt.milk ? t('err.pitcherEmpty') : pt.scorched ? L.scorched : pt.steaming ? L.steaming : pt.temp >= 30 ? L.pourReady : L.holdSteam;
  if (p.grinding || pt.steaming) $(p.grinding ? '#pfTag' : '#pitcherTag').textContent = p.grinding ? p.dose.toFixed(1) + ' g' : `${L.milks[pt.milk]}, ${Math.round(pt.temp)} °C`;
  // pitcher contents: milk level, foam grows while steaming
  const milkH = pt.milk ? 34 : 0;
  const foamH = pt.milk ? { none: 2, light: 8, thick: 18 }[pt.foam] * clamp((pt.temp - 6) / 54, 0, 1) : 0;
  const mEl = $('#ptMilk'), fEl = $('#ptFoam');
  mEl.setAttribute('y', 84 - milkH); mEl.setAttribute('height', milkH);
  fEl.setAttribute('y', 84 - milkH - foamH); fEl.setAttribute('height', foamH);
  updateDrag();
}
