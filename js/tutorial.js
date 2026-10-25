/* First-run tutorial (issue #12): one latte, start to finish, told by the helper (js/helper.js).
   It runs on the first customer when save.tutorialDone is false (a fresh save, or "Play the tutorial" in the menu).
   While it runs the customer never loses patience. Each step lights up the objects it talks about (the rest of the
   screen is dimmed) and moves on by itself once the bench is in the right state, so it works the same with drags,
   taps or the keyboard. A wrong move gets a gentle hint instead. Steps only read the game state (G, B), they never
   change it, so the real Rules stay in charge. */
const TUTORIAL_ORDER = () => ({
  drink: 'latte', surprise: false, size: 'M', bean: 'esp', shots: 2, milk: 'whole', temp: 'normal', syrups: {}, tops: [],
  r: { greet: 0, form: 2, q: 0, h: { size: false, temp: false, bean: false, milk: false, drink: false, dbl: false, x3: false, syrup: false, top: false } },
});

const Tutorial = (() => {
  const dim = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  dim.id = 'tutDim'; dim.setAttribute('aria-hidden', 'true');
  dim.innerHTML = '<path class="shade" fill-rule="evenodd"/><g class="rings"></g>';
  // inside the stage, so the dragged object (also in the stage) stays above the shade (issue #14)
  $('#views').appendChild(dim);
  dim.style.display = 'none';

  const cup = () => B.cup, pf = () => B.pf, pt = () => B.pitcher;
  const shotsDone = () => cup().size === 'M' && cup().shots.length >= 2 && !cup().shotting;
  const milkDone = () => cup().milkPoured;
  const inDose = () => { const [lo, hi] = doseZone(); return pf().dose >= lo && pf().dose <= hi; };

  // Bench steps are checked in order; the first one that is not done yet is the current one. Their "done" tests
  // also accept any later state, so going back (say, the cup went into the trash) simply re-opens the right step.
  const BENCH = [
    { key: 'cup', show: ['[data-drag="newcup:M"]', '#slotTray'],
      done: () => cup().size === 'M' && (cup().at === 'tray' || shotsDone()),
      hint: () => cup().size && cup().size !== 'M' ? ['hintCupSize', ['#cupObj', '#trashZone']] : cup().size === 'M' ? ['hintCupTray', ['#cupObj', '#slotTray']] : null },
    { key: 'pfGrinder', show: ['#pfObj', '#slotGrinder'], done: () => shotsDone() || pf().at === 'grinder' || pf().dose > 0 },
    { key: 'grind', show: ['#grindBtn', '#doseMeter'], done: () => shotsDone() || pf().tamped || (inDose() && !pf().grinding),
      hint: () => pf().dose > 0 && !pf().grinding && !inDose() ? ['hintDose', ['#pfObj', '#knockBox']] : null },
    { key: 'tamp', show: ['#tamperObj', '#pfObj'], done: () => shotsDone() || pf().tamped },
    { key: 'lock', show: ['#pfObj', '#slotGroup'], done: () => shotsDone() || pf().at === 'group' },
    { key: 'brew', show: ['#brewBtn', '#shotMeter'], done: shotsDone,
      hint: () => cup().shots.some(s => s.q < 0.6) && !cup().shotting ? ['hintShot', ['#brewBtn', '#shotMeter']] : null },
    { key: 'milk', show: ['[data-drag="milk:whole"]', '#pitcherObj'], done: () => milkDone() || pt().milk === 'whole',
      hint: () => pt().milk && pt().milk !== 'whole' ? ['hintMilk', ['#pitcherObj', '#trashZone']] : null },
    { key: 'wand', show: ['#pitcherObj', '#slotWand'], done: () => milkDone() || pt().at === 'wand' },
    { key: 'steam', show: ['#steamBtn', '#tempMeter'],
      done: () => milkDone() || (pt().temp >= TEMPS.normal.lo && !pt().steaming && !pt().scorched && pt().foam === 'light'),
      hint: () => pt().scorched ? ['hintScorched', ['#pitcherObj', '#trashZone']]
        : pt().foam !== 'light' ? ['hintFoam', ['#foamChips [data-k="light"]']]
        : !pt().steaming && pt().temp > 10 && pt().temp < TEMPS.normal.lo ? ['hintSteamMore', ['#steamBtn', '#tempMeter']] : null },
    { key: 'pour', show: ['#pitcherObj', '#cupObj'], done: milkDone },
    { key: 'serveTray', show: ['#cupObj', '#slotServe'], done: () => cup().at === 'serving' },
    { key: 'bell', show: ['#serveBtn'], done: () => false },
  ];

  let active = false, cur = null, saidAt = -1, praiseUntil = 0, skipArmed = 0;
  const els = sels => sels.map(s => document.querySelector(s)).filter(el => el && !el.hidden && el.getClientRects().length);

  // which step are we on right now?
  function current() {
    const st = G.state;
    if (st === 'ORDER_PENDING') {
      const said = G.cust && G.cust.state === 'wait' && G.typed >= curText().length;
      if (!said) { saidAt = -1; return { key: 'welcome', pose: 'wave', show: [] }; }
      if (saidAt < 0) saidAt = T;
      // give the player a moment to read the order and see the ticket pin up
      if (T - saidAt < 4.5) return { key: 'ticket', pose: 'point', show: ['#ticket'] };
      return { key: 'toBench', pose: 'point', show: ['#takeBtn'] };
    }
    if (st === 'PREPARING') {
      if (G.peek) return { key: 'peekBack', pose: 'point', show: ['#backBtn'] };
      const s = BENCH.find(x => !x.done()) || BENCH[BENCH.length - 1];
      const h = s.hint && s.hint();
      if (h) return { key: h[0], pose: 'warn', show: h[1], step: s.key };
      return { key: s.key, pose: 'point', show: s.show, step: s.key };
    }
    if (st === 'READY_TO_SERVE') return { key: 'hand', pose: 'point', show: ['#cupObj', '#custZone'] };
    if (st === 'COMPLETED') return { key: 'wait', pose: 'talk', show: [] };
    if (st === 'RESULT') return { key: 'finish', pose: 'cheer', show: [], buttons: [{ key: 'finishBtn', cls: 'go', onClick: () => { finish(true); afterResult(); } }] };
    return null;
  }

  // dim everything except the highlighted objects, and draw a pulsing ring around each
  function drawDim(list) {
    if (!list.length) { dim.style.display = 'none'; return; }
    const W = UI.w, H = UI.h;
    dim.style.display = '';
    dim.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let d = `M0 0H${W}V${H}H0Z`, rings = '';
    for (const el of list) {
      const r = stageRect(el), p = 7, x = r.left - p, y = r.top - p, w = r.width + p * 2, h = r.height + p * 2, rr = 14;
      d += `M${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${y + h - rr}Q${x + w} ${y + h} ${x + w - rr} ${y + h}H${x + rr}Q${x} ${y + h} ${x} ${y + h - rr}V${y + rr}Q${x} ${y} ${x + rr} ${y}Z`;
      rings += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}"/>`;
    }
    dim.querySelector('.shade').setAttribute('d', d);
    const g = dim.querySelector('.rings');
    if (g.dataset.n !== rings) { g.innerHTML = rings; g.dataset.n = rings; }
  }

  function finish(done) {
    if (!active) return;
    active = false; cur = null;
    if (done) { save.tutorialDone = true; persist(); }
    Helper.hide();
    dim.style.display = 'none';
  }

  return {
    get active() { return active; },
    start() {
      active = true; cur = null; saidAt = -1; skipArmed = 0;
    },
    // the order for the tutorial customer is always the same simple latte
    order: TUTORIAL_ORDER,
    complete() { finish(true); },
    skip() { if (active) { finish(true); toast(t('helper.skipped')); } },
    stop() { if (active) finish(false); },
    tick() {
      if (!active) return;
      if (G.state === 'MENU' || G.state === 'DAY_END') { finish(false); return; }
      const next = current();
      if (!next) return;
      const changed = !cur || cur.key !== next.key;
      // a short "well done" from the helper whenever a bench step is completed
      if (changed && cur && cur.step && next.step && cur.pose !== 'warn' && BENCH.findIndex(x => x.key === next.step) > BENCH.findIndex(x => x.key === cur.step)) {
        praiseUntil = T + 0.9;
        sfx.coin();
      }
      cur = next;
      const list = G.state === 'PREPARING' || G.state === 'READY_TO_SERVE' || next.key === 'ticket' || next.key === 'toBench' ? els(next.show) : [];
      const switching = window.CB && CB.switching();
      drawDim(switching ? [] : list);
      // skipping asks once more, so a stray tap near the bubble never ends the tutorial by accident
      const skipBtn = skipArmed > T ? { key: 'skipSure', cls: 'skip sure', onClick: () => Tutorial.skip() }
        : { key: 'skip', cls: 'skip', onClick: () => { skipArmed = T + 3; } };
      const buttons = next.buttons || [skipBtn];
      if (T < praiseUntil) Helper.say('praise', { pose: 'cheer', target: list, buttons });
      else Helper.say(next.key, { pose: next.pose, target: list, buttons });
    },
  };
})();
