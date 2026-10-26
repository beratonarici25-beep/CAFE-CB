/* Shared helpers, palette and the save file. Loaded first; every other script uses these globals. */
'use strict';
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2, PI = Math.PI;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const ri = n => Math.floor(Math.random() * n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// per-frame writes only when the value changed: an unchanged write still makes the browser lay the page out again,
// which is what made the bench stutter on phones
const setText = (el, v) => { if (el.textContent !== v) el.textContent = v; };
const setStyle = (el, k, v) => { if (el.style[k] !== v) el.style[k] = v; };
// a bar that fills from the left, moved with a transform (no layout at all)
const setFill = (el, f) => setStyle(el, 'transform', `scaleX(${clamp(f, 0, 1).toFixed(3)})`);
const money = n => '$' + n.toFixed(2);

const C = {
  ink: '#4b2e2b', paper: '#fffaf3', wall: '#d4ebe0', wall2: '#c8e4d7', blush: '#f4b9b2',
  butter: '#f6d88c', mint: '#8cc7ae', sky: '#acc9ec', wood: '#d39c78', woodTop: '#e8b994',
  espresso: '#5b3423', crema: '#c98b4f', milk: '#f3e3cc', foam: '#fffaf0',
};

/* ---------------- save ---------------- */
const SAVE_KEY = 'cafe-cb-save-v1';
// tutorialDone (issue #12): old saves without it get the tutorial once, like a fresh save
const DEFAULT_SAVE = { cash: 0, day: 1, best: 0, served: 0, upgrades: [], muted: false, lang: null, tutorialDone: false };
let save = { ...DEFAULT_SAVE };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === 'object') save = { ...save, ...s }; } catch (e) {}
if (save.lang !== 'en' && save.lang !== 'tr') save.lang = /^tr/i.test(navigator.language || '') ? 'tr' : 'en';
// fills in what an older (or a just reset) save is missing; also called after "Reset progress"
function fixSave() {
  // own copies: the arrays in DEFAULT_SAVE must never be the ones that get pushed to
  save.upgrades = Array.isArray(save.upgrades) ? [...save.upgrades] : [];
  // the recipes bought in the recipe shop (issue #21). A save from before the shop keeps every drink it already had.
  if (!Array.isArray(save.recipes)) save.recipes = save.served > 0 || save.day > 1 ? ['espresso', 'latte', 'cappuccino', 'flatwhite', 'mocha'] : ['espresso', 'latte'];
  else save.recipes = [...save.recipes];
  // bought but not yet introduced: the helper shows them at the start of the next day
  save.intros = Array.isArray(save.intros) ? [...save.intros] : [];
}
fixSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const has = id => save.upgrades.includes(id);
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------------- the stage (issue #14) ----------------
   The two views are laid out at a fixed design height (STAGE_H) and scaled to the window with one transform, so
   the whole bench always fits. UI.s is that scale; UI.ox/oy is where the stage starts on screen. Things placed
   inside the stage (drag ghosts, glides, the tutorial spotlight) use stage coordinates; stageRect() turns a screen
   rect into one. The particles, the helper and the overlays stay in screen coordinates. */
const STAGE_H = 770, STAGE_MIN_W = 1560;
// phones: the close-up camera (js/camera.js) lays the bench out in one row at this shorter design height, so the
// stage scale is STAGE_H / CAM_H (about 1.4x) bigger and the camera pans along the bench
const CAM_H = 540, CAM_MIN_W = 1150;
const UI = { s: 1, ox: 0, oy: 0, w: 0, h: 0, cam: false };
function stageRect(el) {
  const r = el.getBoundingClientRect(), s = UI.s;
  return { left: (r.left - UI.ox) / s, top: (r.top - UI.oy) / s, width: r.width / s, height: r.height / s,
    right: (r.right - UI.ox) / s, bottom: (r.bottom - UI.oy) / s };
}
const toStage = (x, y) => ({ x: (x - UI.ox) / UI.s, y: (y - UI.oy) / UI.s });
const toScreen = (x, y) => ({ x: x * UI.s + UI.ox, y: y * UI.s + UI.oy });
// how much bigger or smaller an element is drawn than its own layout size (a machine shrunk on the phone bench)
const drawnScale = el => { const w = el.offsetWidth; return w ? el.getBoundingClientRect().width / UI.s / w : 1; };
// canvas backing-store pixels per layout pixel: sharp on screen at any stage scale; at most 2 on a phone, where a
// bigger canvas only costs frames
const pxRatio = () => Math.min((window.devicePixelRatio || 1) * UI.s, UI.cam ? 2 : 3);
