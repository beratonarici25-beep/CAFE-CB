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

const canAct = () => G.state === 'PREPARING';
// once the drink is out on the bar, the only thing left to move is the cup, onto the customer
const canDrag = spec => canAct() || (G.state === 'READY_TO_SERVE' && spec === 'cup');
function deny(key, el) {
  if (key === 'same') return;
  toast(t('err.' + key));
  sfx.error();
  if (el) fx('shake', el);
}

/* ---------------- what can go where ---------------- */
const TARGETS = {
  newcup: ['prep', 'tray'],
  cup: ['prep', 'tray', 'serving', 'trash', 'customer'],
  pf: ['grinder', 'group', 'pfrack', 'knockbox', 'trash'],
  tamper: ['pf'],
  milk: ['pitcher', 'cup'],
  pitcher: ['wand', 'pitcherrack', 'cup', 'trash'],
  syrup: ['cup'],
  top: ['cup'],
  // the recipe shop's drinks (issue #21): a scoop of ice, a spoon of cocoa
  ice: ['cup'],
  cocoa: ['cup'],
};
const PF_SPOT = { grinder: 'grinder', group: 'group', pfrack: 'rack' };
const PITCHER_SPOT = { wand: 'wand', pitcherrack: 'rack' };

// null when the drop is allowed, otherwise an STR.err key
function check(spec, target) {
  const [kind, arg] = spec.split(':');
  if (!(TARGETS[kind] || []).includes(target)) return 'nope';
  if (target === 'customer') return G.state === 'READY_TO_SERVE' ? Rules.handOver(B) : 'notReady';
  if (!canAct()) return 'nope';
  switch (kind) {
    case 'newcup': return Rules.placeNewCup(B);
    case 'cup': return target === 'trash' ? Rules.trashCup(B) : Rules.moveCup(B, target);
    case 'pf': return target === 'trash' || target === 'knockbox' ? Rules.dumpPf(B) : Rules.movePf(B, PF_SPOT[target]);
    case 'tamper': return Rules.tamp(B);
    // straight into the cup only once the iced latte is on the menu; before that a bottle only fills the pitcher
    case 'milk': return target === 'cup' ? (recipeOpen('iced') ? Rules.coldMilk(B) : 'nope') : Rules.fillPitcher(B);
    case 'pitcher': return target === 'cup' ? Rules.pour(B) : target === 'trash' ? Rules.dumpPitcher(B) : Rules.movePitcher(B, PITCHER_SPOT[target]);
    case 'syrup': return Rules.syrup(B);
    case 'top': return Rules.topping(B, arg);
    case 'ice': return recipeOpen('iced') ? Rules.ice(B) : 'nope';
    case 'cocoa': return recipeOpen('hotchoc') ? Rules.cocoa(B) : 'nope';
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
      if (target === 'customer') { serve(); return; }
      if (target === 'trash') { trashCup(from); return; }
      if (c.shotting) stopShot();
      c.at = target; sfx.clack(); layout({ cup: from }); fx('land', $('#cupObj'));
      break;
    case 'pf':
      if (target === 'trash' || target === 'knockbox') {
        // knocking the puck out: into the knock box (or the trash), the portafilter stays where it was
        if (B.pf.grinding) grindEnd();
        B.pf.dose = 0; B.pf.doseQ = 0; B.pf.tamped = false;
        if (target === 'knockbox') { sfx.tamp(); fx('dust', $('#knockBox'), '#5b3423'); fx('land', $('#knockBox')); }
        else { sfx.trash(); fx('lid'); fx('dust', $('#trashZone'), '#5b3423'); }
        break;
      }
      if (B.pf.grinding) grindEnd();
      B.pf.at = PF_SPOT[target]; sfx.clack(); layout({ pf: from }); fx('land', $('#pfObj'));
      break;
    case 'tamper':
      B.pf.tamped = true; sfx.tamp(); fx('tamp', $('#pfObj'));
      break;
    case 'milk':
      if (target === 'cup') {
        // straight from the bottle: cold milk, no foam (an iced latte)
        Object.assign(c, { milkPoured: true, milkType: arg, foamUsed: 'none', milkTemp: 6, cold: true, scorched: false });
        sfx.pour(); fx('pourInto', $('#cupObj'), MILK_COLORS[arg]);
        break;
      }
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
      B.pitcher.at = PITCHER_SPOT[target]; sfx.clack(); layout({ pitcher: from }); fx('land', $('#pitcherObj'));
      break;
    case 'syrup':
      c.syrups[arg] = (c.syrups[arg] || 0) + 1;
      sfx.pump(); fx('pump', document.querySelector(`[data-drag="syrup:${arg}"]`), $('#cupObj'), SYRUPS[arg].color);
      break;
    case 'top':
      c.tops.push(arg);
      sfx.click(); fx('sprinkle', $('#cupObj'), TOP_COLORS[arg]);
      break;
    case 'ice':
      c.ice++; sfx.clack(); fx('land', $('#cupObj'));
      break;
    case 'cocoa':
      c.choc++; sfx.click(); fx('sprinkle', $('#cupObj'), TOP_COLORS.cocoa);
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
// pressing a syrup bottle's pump head pumps straight into the cup on the bench (issue #7)
function pressPump(el) {
  const spec = el.dataset.press;
  sfx.init();
  const e = check(spec, 'cup');
  if (e) { deny(e, el.closest('.obj')); return; }
  clearHeld();
  apply(spec, 'cup');
}
function trashCup(from) {
  if (B.cup.shotting) stopShot();
  B.cup = newCup();
  sfx.trash(); fx('lid');
  layout(); render();
}
// the bell on the serving tray: the drink goes out to the bar and the view turns back to the customer
function sendOut() {
  if (!canAct()) return;
  const e = Rules.sendOut(B); if (e) { deny(e, $('#slotServe')); return; }
  if (B.pf.grinding) grindEnd();
  if (B.pitcher.steaming) steamEnd();
  stopAllSounds();
  sfx.ding();
  B.cup.at = 'hand';
  G.peek = false;
  setState('READY_TO_SERVE');
  layout({ cup: false });
  fx('land', $('#cupObj'), 420);
}

/* ---------------- placing objects in their slots ---------------- */
const SLOT = {
  cup: { prep: '#slotPrep', tray: '#slotTray', serving: '#slotServe', hand: '#slotHand' },
  pf: { rack: '#slotPfRack', grinder: '#slotGrinder', group: '#slotGroup' },
  pitcher: { rack: '#slotPitcherRack', wand: '#slotWand' },
};
function moveInto(el, parentSel, from) {
  const parent = $(parentSel);
  // from: a rect to glide from; false: appear in place; undefined: glide from wherever it was
  const before = from === false ? null : from || (el.isConnected && !el.hidden ? stageRect(el) : null);
  if (el.parentElement !== parent) parent.appendChild(el);
  if (before) fx('flip', el, before);
}
function layout(from = {}) {
  const cupEl = $('#cupObj'), wasHidden = cupEl.hidden;
  cupEl.hidden = !B.cup.size;
  if (B.cup.size) moveInto(cupEl, SLOT.cup[B.cup.at], 'cup' in from ? from.cup : wasHidden ? false : undefined);
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

// the ghost lives inside the stage, in stage coordinates, so it scales with the bench (issue #14)
function makeGhost(src) {
  const r = stageRect(src);
  const g = src.cloneNode(true);
  g.removeAttribute('id');
  g.querySelectorAll('[id]').forEach(n => { if (n.tagName.toLowerCase() !== 'clippath') n.removeAttribute('id'); });
  const srcCv = src.querySelectorAll('canvas'), gCv = g.querySelectorAll('canvas');
  srcCv.forEach((cv, i) => { gCv[i].width = cv.width; gCv[i].height = cv.height; gCv[i].getContext('2d').drawImage(cv, 0, 0); });
  g.classList.remove('selected', 'can-drop', 'drop-hover', 'dragging-src');
  g.classList.add('drag-ghost');
  // picked up from a shrunk machine (the phone bench): the copy keeps its layout size and is drawn as small
  const k = drawnScale(src);
  if (Math.abs(k - 1) > 0.01) { g.style.width = src.offsetWidth + 'px'; g.style.height = src.offsetHeight + 'px'; g.style.scale = k.toFixed(3); g.style.transformOrigin = '0 0'; }
  else { g.style.width = r.width + 'px'; g.style.height = r.height + 'px'; }
  g.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;
  $('#views').appendChild(g);
  const cv = src.id === 'cupObj' ? g.querySelector('canvas') : null;
  return { el: g, x: r.left, y: r.top, w: r.width, h: r.height, tilt: 0, sq: 0, cv, slosh: { a: 0, v: 0 } };
}

function onPointerDown(e) {
  if (e.button > 0 || drag) return;
  const press = e.target.closest('[data-press]');
  if (press && canAct()) { e.preventDefault(); pressPump(press); return; }
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
  if (!src || !canDrag(src.dataset.drag)) {
    const tapAway = () => { if (held && !e.target.closest('button, .key')) clearHeld(); };
    // on a phone a swipe over the bench pans the camera; only a tap puts a held object back
    if (!Cam.grab(e, tapAway)) tapAway();
    return;
  }
  e.preventDefault();
  sfx.init();
  // under a finger the dragged thing rides a little above it, so the finger does not hide it (issue #27)
  drag = { spec: src.dataset.drag, src, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, started: false, ghost: null, hover: null,
    lift: e.pointerType === 'touch' ? 34 : 0 };
}
function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  drag.x = e.clientX; drag.y = e.clientY;
  if (!drag.started) {
    if (Math.hypot(drag.x - drag.sx, drag.y - drag.sy) < 6) return;
    drag.started = true;
    clearHeld();
    const r = stageRect(drag.src), p = toStage(drag.sx, drag.sy);
    drag.offX = p.x - r.left; drag.offY = p.y - r.top;
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
  const ok = tgt && canDrag(d.spec) ? attempt(d.spec, tgt, from, d.src) : false;
  if (ok && ['cup', 'pf', 'pitcher', 'newcup'].includes(kind) && !(tgt.name === 'trash' || tgt.name === 'knockbox' || tgt.name === 'customer' || (kind === 'pitcher' && tgt.name === 'cup'))) {
    g.el.remove();                       // the real object glides in from the ghost (FLIP)
  } else if (ok && tgt.name === 'trash' && kind === 'cup') {
    fx('intoTrash', g.el, $('#bin'));
  } else if (ok && tgt.name === 'customer') {
    fx('handOver', g.el, $('#custZone'));
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
  if (!canDrag(src.dataset.drag)) return;
  const spec = src.dataset.drag;
  if (held && held.src === src) { clearHeld(); return; }
  setHeld(spec, src);
}
// keyboard: Enter/Space picks an object up, then Enter/Space on a target puts it down
function onKey(e) {
  if (e.key === 'Escape' && held) { clearHeld(); return; }
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = document.activeElement;
  if (!el || !el.closest || !el.closest('#counter, #scene')) return;
  if (held) {
    const tgt = resolveTarget(el, held.spec, held.src);
    if (tgt) { e.preventDefault(); const { spec, src } = held; clearHeld(); attempt(spec, tgt, null, src); return; }
  }
  if (el.dataset.drag) { e.preventDefault(); tap(el); }
}

// per-frame ghost follow with a little lag and tilt
function updateDrag() {
  if (!drag || !drag.started) return;
  const p = toStage(drag.x, drag.y - drag.lift);
  const g = drag.ghost, tx = p.x - drag.offX, ty = p.y - drag.offY;
  const k = reduceMotion ? 1 : 0.38;
  const vx = (tx - g.x) * k, vy = (ty - g.y) * k;
  g.x += vx; g.y += vy;
  g.tilt += (clamp(vx * 0.9, -16, 16) - g.tilt) * 0.25;
  if (reduceMotion) { g.el.style.transform = `translate3d(${g.x}px, ${g.y}px, 0) scale(1.06)`; return; }
  // stretch along the motion, settle back when it stops (issue #6)
  g.sq += (clamp(Math.hypot(vx, vy) * 0.006, 0, 0.1) - g.sq) * 0.3;
  const across = Math.abs(vx) > Math.abs(vy);
  const sx = 1.06 + (across ? g.sq : -g.sq * 0.6), sy = 1.06 + (across ? -g.sq * 0.6 : g.sq);
  g.el.style.transform = `translate3d(${g.x}px, ${g.y}px, 0) rotate(${g.tilt}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
  if (g.cv && B.cup.size) sloshGhost(g, vx);
}
// a dragged cup is redrawn every frame so its drink rocks against the tilt and spills a drop now and then.
// Purely visual: nothing is taken out of the drink.
function sloshGhost(g, vx) {
  const s = g.slosh, target = -g.tilt * PI / 180 * 0.9;
  s.v += ((target - s.a) * 90 - s.v * 7) * dtLast;
  s.a = clamp(s.a + s.v * dtLast, -0.45, 0.45);
  const cv = g.cv, W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  const ctx = cv.getContext('2d'), sc = Math.min(0.8, (H - 16) / 196);
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); ctx.clearRect(0, 0, W, H);
  drawCup(ctx, B.cup, W / 2, H - 8, sc, s.a);
  const c = B.cup;
  if ((c.shots.length || c.milkPoured) && Math.abs(vx) > 7 && Math.random() < 0.3) {
    const r = cv.getBoundingClientRect(), d = CUPD[c.size], k = sc * r.height / H;
    fx('add', { x: r.left + r.width / 2 - Math.sign(vx) * d.t * 0.42 * k, y: r.bottom - (8 / sc + d.h) * k,
      vx: -vx * 3 + rand(-20, 20), vy: rand(-90, -30), g: 900, r: rand(1.6, 2.6), color: c.milkPoured ? C.milk : C.espresso, life: 0.55, kind: 'drop' });
  }
}

/* ---------------- building the bench DOM ---------------- */
const MILK_COLORS = { whole: '#ffffff', oat: '#efe0c0', almond: '#f5e9da' };
const TOP_COLORS = { whip: '#ffffff', cocoa: '#6b3b26', cinnamon: '#b5652e' };
const BEAN_COLORS = { esp: '#5b3423', decaf: '#8a6a4a', dark: '#2e1a12' };
// bottles, syrups and shakers are rendered models (tools/blender/models.py -> assets/models)
// their pixel sizes, so the <img> keeps its shape before it loads and in the drag ghost
const BOTTLE_PX = { milk: [69, 152], syrup: [66, 184], 'top:whip': [56, 140], top: [76, 132] };
function bottle(spec, cls, color, extra = '') {
  const img = `assets/models/${spec.replace(':', '-')}.webp`;
  const [w, h] = BOTTLE_PX[spec] || BOTTLE_PX[spec.split(':')[0]];
  return `<button class="obj bottle-obj ${cls}" type="button" data-drag="${spec}" style="--c:${color}"><span class="glass"><img class="spr" src="${img}" width="${w}" height="${h}" alt="" draggable="false">${extra}</span><span class="nm"></span><span class="n"></span></button>`;
}
function makeChips(el, keys, fn) {
  el.innerHTML = '';
  for (const k of keys) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'key'; b.dataset.k = k;
    b.addEventListener('click', () => { sfx.init(); if (b.getAttribute('aria-pressed') !== 'true') sfx.button(); fn(k); });
    el.appendChild(b);
  }
}
function holdable(btn, onStart, onEnd) {
  let on = false;
  const start = () => { if (btn.disabled || on) return; on = true; btn.classList.add('active'); sfx.init(); sfx.button(); onStart(); };
  const end = () => { if (!on) return; on = false; btn.classList.remove('active'); onEnd(); };
  btn.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (_) {} start(); });
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('lostpointercapture', end);
  btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
  btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } });
  btn.addEventListener('blur', end);
  btn.addEventListener('contextmenu', e => e.preventDefault());
  // switching apps mid-hold never leaves the grinder or the steam wand running
  document.addEventListener('visibilitychange', () => { if (document.hidden) end(); });
}

function buildBench() {
  $('#milkBottles').innerHTML = MILK_KEYS.map(k => bottle('milk:' + k, 'milk', MILK_COLORS[k])).join('');
  $('#syrupBottles').innerHTML = Object.entries(SYRUPS).map(([k, s]) => bottle('syrup:' + k, 'syrup', s.color, `<span class="pumphead" data-press="syrup:${k}"></span>`)).join('');
  $('#topShakers').innerHTML = TOP_KEYS.map(k => bottle('top:' + k, 'shaker', TOP_COLORS[k])).join('');
  makeChips($('#beanChips'), BEAN_KEYS, pickBean);
  makeChips($('#foamChips'), FOAM_KEYS, setFoam);
  holdable($('#grindBtn'), grindStart, grindEnd);
  holdable($('#steamBtn'), steamStart, steamEnd);
  $('#brewBtn').addEventListener('click', () => { sfx.init(); sfx.button(); toggleShot(); });
  $('#serveBtn').addEventListener('click', () => { sfx.init(); sendOut(); });
  const ctr = $('#counter'), views = $('#views');
  views.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerdown', e => { if (held && !views.contains(e.target)) clearHeld(); });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  document.addEventListener('keydown', onKey);
  ctr.addEventListener('dragstart', e => e.preventDefault());
  // drop spots become keyboard-reachable
  views.querySelectorAll('.slot[data-drop], .zone[data-drop], #knockBox, #custZone').forEach(n => n.tabIndex = 0);
  // thermometer bands (0–90 °C) and the shot window (0–45 s)
  const map = { warm: '#bandWarm', normal: '#bandNormal', hot: '#bandHot' };
  for (const [k, b] of Object.entries(TEMPS)) {
    const el = $(map[k]); el.style.left = (b.lo / 90 * 100) + '%'; el.style.width = ((b.hi - b.lo) / 90 * 100) + '%';
  }
  $('#shotZone').style.left = (25 / 45 * 100) + '%';
  $('#shotZone').style.width = (5 / 45 * 100) + '%';
  layout();
}

// machine keys are narrow: a label that does not fit gets a smaller font instead of breaking mid-word (issue #15)
function fitKeys() {
  document.querySelectorAll('.key').forEach(k => {
    k.style.fontSize = '';
    if (!k.clientWidth) return;
    let fs = parseFloat(getComputedStyle(k).fontSize);
    while (k.scrollWidth > k.clientWidth && fs > 7) { fs -= 0.5; k.style.fontSize = fs + 'px'; }
  });
}
// again whenever the keys change size: a view coming back, a resize, the web fonts arriving
if (window.ResizeObserver) { const ro = new ResizeObserver(fitKeys); document.querySelectorAll('.keys').forEach(k => ro.observe(k)); }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitKeys);

function applyBenchLang() {
  const L = S();
  document.querySelectorAll('#cupStand b[data-size]').forEach(b => { b.textContent = L.sizes[b.dataset.size]; });
  $('#beanChips').querySelectorAll('button').forEach(b => { b.textContent = L.beanKey[b.dataset.k]; b.title = L.beans[b.dataset.k]; });
  $('#foamChips').querySelectorAll('button').forEach(b => { b.textContent = L.foamKey[b.dataset.k]; b.title = L.foams[b.dataset.k]; });
  fitKeys();
  document.querySelectorAll('[data-drag^="milk:"] .nm').forEach(n => { n.textContent = L.milks[n.parentElement.dataset.drag.split(':')[1]]; });
  document.querySelectorAll('[data-drag^="syrup:"] .nm').forEach(n => { n.textContent = L.syrupNames[n.parentElement.dataset.drag.split(':')[1]]; });
  document.querySelectorAll('[data-drag^="top:"] .nm').forEach(n => { n.textContent = L.tops[n.parentElement.dataset.drag.split(':')[1]]; });
  const sw = { warm: 'var(--butter)', normal: 'var(--blush)', hot: 'var(--blush-deep)' };
  $('#bandLabels').innerHTML = Object.entries(TEMPS).map(([k, b]) => `<span><i style="background:${sw[k]}"></i>${L.temps[k]} ${b.lo}–${b.hi}°</span>`).join('');
  if (held) $('#holding').textContent = t('obj.hold', objName(held.spec));
}

// swaps a rendered model image only when it changes (called every frame)
function setSprite(img, name) {
  if (img && img.dataset.spr !== name) { img.dataset.spr = name; img.src = `assets/models/${name}.webp`; }
}
// load every state of the models up front so swapping never flickers
['pf-empty', 'pf-ground', 'pf-tamped', 'pitcher-empty', 'pitcher-milk', 'pitcher-foam'].forEach(n => { const i = new Image(); i.src = `assets/models/${n}.webp`; });
const setPressed = (el, fn) => el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', fn(b.dataset.k) ? 'true' : 'false'));
function renderBench() {
  const L = S(), c = B.cup, p = B.pf, pt = B.pitcher;
  // the ice bucket and the cocoa tin stand on the bench once their drink is bought (issue #21)
  const ice = !recipeOpen('iced'), choc = !recipeOpen('hotchoc');
  if ($('#iceObj').hidden !== ice) $('#iceObj').hidden = ice;
  if ($('#cocoaObj').hidden !== choc) $('#cocoaObj').hidden = choc;
  if ($('#extras').hidden !== (ice && choc)) $('#extras').hidden = ice && choc;
  setPressed($('#beanChips'), k => p.bean === k);
  $('#beanChips').querySelectorAll('button').forEach(b => { b.disabled = p.dose > 0; });
  $('#hopper').dataset.bean = p.bean;
  const [lo, hi] = doseZone();
  $('#doseZoneTxt').textContent = t('sweetSpot', lo, hi);
  $('#doseZone').style.left = (lo / 25 * 100) + '%';
  $('#doseZone').style.width = ((hi - lo) / 25 * 100) + '%';
  const pfEl = $('#pfObj');
  pfEl.classList.toggle('has-grounds', p.dose > 0);
  pfEl.classList.toggle('tamped', p.tamped);
  setSprite($('#pfImg'), p.dose <= 0 ? 'pf-empty' : p.tamped ? 'pf-tamped' : 'pf-ground');
  $('#pfTag').textContent = p.dose > 0 ? fmt(p.tamped ? L.pfState.tamped : L.pfState.ground, p.dose.toFixed(1)) : L.pfState.empty;

  $('#brewCap').textContent = c.shotting ? L.stopBtn : L.brewBtn;
  $('#brewBtn').classList.toggle('on', c.shotting);
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
  $('#serveBtn').disabled = !canAct() || !c.size || c.at !== 'serving';
  $('#serveBtn').classList.toggle('ready', canAct() && c.at === 'serving' && !c.shotting);

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
  if (G.state === 'PREPARING') {
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
  $('#machine').classList.toggle('busy', c.shotting || pt.steaming);
  setFill($('#doseFill'), p.dose / 25);
  setText($('#doseTxt'), p.dose.toFixed(1) + ' g');
  const [lo, hi] = doseZone();
  setText($('#doseMsg'), p.grinding ? L.grinding : p.dose <= 0 ? L.holdGrind : p.dose < lo ? L.doseLight : p.dose > hi ? L.doseOver : L.perfectDose);
  setStyle($('#shotNeedle'), 'left', (Math.min(45, c.shotT) / 45 * 100).toFixed(1) + '%');
  setText($('#shotTxt'), Math.round(c.shotT) + ' ' + L.sec);
  setText($('#shotMsg'), c.shotting ? (c.shotT < 25 ? L.waitFor : c.shotT <= 30 ? L.now : L.tooLong)
    : p.at !== 'group' ? t('err.pfToGroup') : c.shots.length >= 3 ? L.max3 : L.ready);
  setFill($('#tempFill'), Math.min(90, pt.temp) / 90);
  setText($('#tempTxt'), Math.round(pt.temp) + ' °C');
  setText($('#tempMsg'), !pt.milk ? t('err.pitcherEmpty') : pt.scorched ? L.scorched : pt.steaming ? L.steaming : pt.temp >= 30 ? L.pourReady : L.holdSteam);
  if (p.grinding || pt.steaming) setText($(p.grinding ? '#pfTag' : '#pitcherTag'), p.grinding ? p.dose.toFixed(1) + ' g' : `${L.milks[pt.milk]}, ${Math.round(pt.temp)} °C`);
  // the pitcher model shows what is inside: empty, cold milk, or milk with foam on top once it is steamed
  setSprite($('#pitcherImg'), !pt.milk ? 'pitcher-empty' : pt.foam !== 'none' && pt.temp >= 30 ? 'pitcher-foam' : 'pitcher-milk');
  setSprite($('#pfImg'), p.dose <= 0 ? 'pf-empty' : p.tamped ? 'pf-tamped' : 'pf-ground');
  updateDrag();
}
