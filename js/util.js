/* Shared helpers, palette and the save file. Loaded first; every other script uses these globals. */
'use strict';
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2, PI = Math.PI;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const ri = n => Math.floor(Math.random() * n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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
if (!Array.isArray(save.upgrades)) save.upgrades = [];
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const has = id => save.upgrades.includes(id);
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
