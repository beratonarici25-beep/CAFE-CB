/* The close-up camera (phones). On a phone held sideways the whole bench was drawn at under half size. Instead the
   stage is drawn bigger (CAM_H in js/util.js), the stations stand in one long row (.cam in css/stage.css) and the camera
   shows about half of it, panning left and right:
   - swipe over the bench (not on an object or a button) to pan;
   - drag an object near the left or right edge and the camera follows;
   - the tutorial pans what the helper talks about into view (show()).
   Panning moves only the counter (the CSS `translate` property, so fx shakes on its `transform` still compose). The
   ticket strip and the stage stay put, so stage coordinates (stageRect, ghosts, the spotlight) stay right. */
'use strict';
const Cam = (() => {
  let px = 0, to = 0, max = 0, swipe = null;
  const counter = () => document.getElementById('counter');
  const on = () => UI.cam && window.CB && CB.view() === 'barista';
  function apply() {
    const c = counter(); if (!c) return;
    setStyle(c, 'translate', px ? `${(-px).toFixed(1)}px 0` : '');
  }
  // the stage size changed: how far can it pan, and keep the pan inside that
  function fit() {
    const c = counter(); if (!c) return;
    // the machines that would not fit the short phone stage are drawn smaller (--k in css/stage.css); their layout box
    // shrinks with them
    for (const el of c.querySelectorAll('.zone > .barmat')) {
      const k = UI.cam ? parseFloat(getComputedStyle(el).getPropertyValue('--k')) || 1 : 1;
      setStyle(el, 'marginRight', k === 1 ? '' : (-el.offsetWidth * (1 - k)).toFixed(1) + 'px');
      setStyle(el, 'marginBottom', k === 1 ? '' : (-el.offsetHeight * (1 - k)).toFixed(1) + 'px');
    }
    if (!UI.cam) { px = to = max = 0; apply(); return; }
    max = Math.max(0, c.offsetLeft + c.offsetWidth + 18 + (UI.safe ? UI.safe.r : 0) - UI.w);
    px = clamp(px, 0, max); to = clamp(to, 0, max);
    apply();
  }
  const set = x => { to = clamp(x, 0, max); };
  // pan so these elements (the first one above all) are on screen, with a margin
  function show(list, now) {
    if (!UI.cam) return;
    const els = (Array.isArray(list) ? list : [list]).map(x => typeof x === 'string' ? document.querySelector(x) : x)
      .filter(el => el && counter().contains(el) && el.getClientRects().length);
    if (!els.length) return;
    const sf = UI.safe || { l: 0, r: 0 }, ml = 40 + sf.l, mr = 40 + sf.r, rs = els.map(el => stageRect(el));
    // everything at once when it fits, otherwise just the first
    const all = { left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)) };
    const r = all.right - all.left <= UI.w - ml - mr ? all : rs[0];
    // stageRect is measured with the current pan; the target pan is relative to that
    let x = to;
    if (r.left < ml) x = px + r.left - ml;
    else if (r.right > UI.w - mr) x = px + r.right - (UI.w - mr);
    set(x);
    if (now) { px = to; apply(); }
  }
  // a finger or the mouse went down on the bench but not on anything to drag: maybe a swipe
  function grab(e, onTap) {
    if (!on() || !e.target.closest('#bench') || e.target.closest('button, .key, [data-press], .meter')) return false;
    swipe = { id: e.pointerId, x: e.clientX, start: to, moved: false, onTap, v: 0, lastX: e.clientX, lastT: performance.now() };
    return true;
  }
  window.addEventListener('pointermove', e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const dx = e.clientX - swipe.x;
    if (!swipe.moved && Math.abs(dx) < 8) return;
    swipe.moved = true;
    const now = performance.now(), dt = Math.max(1, now - swipe.lastT);
    swipe.v = (e.clientX - swipe.lastX) / dt; swipe.lastX = e.clientX; swipe.lastT = now;
    set(swipe.start - dx / UI.s);
    px = to; apply();
  }, { passive: true });
  const release = e => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const s = swipe; swipe = null;
    if (!s.moved) { if (e.type === 'pointerup') s.onTap(); return; }
    // a flick keeps going a little
    if (!reduceMotion) set(to - s.v * 220 / UI.s);
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  // the browser scrolls clipped boxes by itself to show a focused (or test-clicked) control; only the camera may move
  // the bench, or stage coordinates go wrong
  document.addEventListener('scroll', e => {
    const t = e.target;
    if (t && t.nodeType === 1 && t.closest('#stage') && (t.scrollLeft || t.scrollTop)) { t.scrollLeft = 0; t.scrollTop = 0; }
  }, true);

  // every frame: follow a drag held near an edge, and ease toward the target pan
  function tick(dt) {
    if (!UI.cam) return;
    if (typeof drag !== 'undefined' && drag && drag.started && on()) {
      const edge = Math.min(110, window.innerWidth * 0.14), x = drag.x;
      const push = x < edge ? -(1 - x / edge) : x > window.innerWidth - edge ? (1 - (window.innerWidth - x) / edge) : 0;
      if (push) { set(to + push * 1100 * dt); px = to; apply(); updateHover(); return; }
    }
    if (Math.abs(to - px) < 0.5) { if (px !== to) { px = to; apply(); } return; }
    px += (to - px) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 10));
    apply();
  }
  return {
    fit, show, grab, tick, set,
    get x() { return px; }, get max() { return max; },
    settled: () => Math.abs(to - px) < 0.5 && !swipe,
  };
})();
