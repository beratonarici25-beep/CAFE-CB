/* The helper character (issue #12): Jesica (EN) / Ülkü (TR), the café's head barista. A reusable module: the tutorial
   uses it now, and later features can call it too (new drink intros, hints, the day summary, the upgrade shop).

   Helper.say(key, { pose, target, args, buttons })  shows her with a speech bubble.
     key      text under STR[lang].helper (e.g. 'welcome', {0} = her name); an array there picks one line at random
     pose     'talk' | 'point' | 'cheer' | 'warn' | 'wave'
     target   element (or selector) she stands away from and points toward
     buttons  [{ key, cls, onClick }] shown in the bubble
   Helper.pose(p), Helper.hide(), Helper.refresh() (after a language switch), Helper.name()
   Her name and lines come from js/i18n.js, so they follow the language. */
const Helper = (() => {
  const root = document.createElement('div');
  root.className = 'helper side-left';
  root.hidden = true;
  root.innerHTML = `<div class="hl-figure">${HELPER_ART}</div>
    <div class="hl-bubble" role="status" aria-live="polite">
      <div class="hl-who"><b class="hl-name"></b><span class="hl-role"></span></div>
      <p class="hl-text"></p>
      <div class="hl-btns"></div>
    </div>`;
  document.body.appendChild(root);
  const $q = s => root.querySelector(s);
  let cur = null, talkTimer = 0, side = 'left', vert = 'bottom';

  const POSES = ['talk', 'point', 'cheer', 'warn', 'wave'];
  function setPose(p) {
    for (const k of POSES) root.classList.toggle('pose-' + k, k === p);
  }
  const name = () => t('helper.name');
  function render() {
    if (!cur) return;
    $q('.hl-name').textContent = name();
    $q('.hl-role').textContent = t('helper.role');
    $q('#hlName').textContent = name();
    const v = S().helper[cur.key];
    $q('.hl-text').textContent = Array.isArray(v) ? v[cur.picked % v.length] : t('helper.' + cur.key, name(), ...(cur.args || []));
    const box = $q('.hl-btns');
    box.innerHTML = '';
    for (const b of cur.buttons || []) {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'btn ' + (b.cls || ''); el.textContent = t('helper.' + b.key);
      el.addEventListener('click', e => { e.stopPropagation(); sfx.init(); sfx.click(); b.onClick(); });
      box.appendChild(el);
    }
    box.hidden = !box.children.length;
  }
  const setSpot = (s, v) => {
    if (s !== side) { root.classList.toggle('side-left', s === 'left'); root.classList.toggle('side-right', s === 'right'); side = s; }
    if (v !== vert) { root.classList.toggle('at-top', v === 'top'); vert = v; }
  };
  const visible = q => q.width > 0 && q.height > 0 && q.right > 0 && q.bottom > 0 && q.left < window.innerWidth && q.top < window.innerHeight;
  // stand in the corner where she covers nothing: not what she talks about, and no other button either (issue #15)
  let placedFor = null, placedAt = 0;
  function place(target) {
    const all = (Array.isArray(target) ? target : [target]).map(x => typeof x === 'string' ? document.querySelector(x) : x).filter(Boolean);
    // called every frame: only look again when the line or the targets change, or a few times a second (scrolling)
    const sig = cur && cur.key + '|' + all.length + '|' + window.innerWidth + 'x' + window.innerHeight;
    const now = performance.now();
    if (sig === placedFor && now - placedAt < 250) return;
    placedFor = sig; placedAt = now;
    const el = all[0];
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    // first guess: the side away from the thing she talks about
    let s = 'left', v = 'bottom';
    if (r && (r.width || r.height)) {
      s = r.left + r.width / 2 < window.innerWidth / 2 ? 'right' : 'left';
      v = r.top + r.height / 2 > window.innerHeight * 0.58 ? 'top' : 'bottom';
    }
    if (root.hidden) { setSpot(s, v); return; }
    // grown by the tutorial spotlight's ring around them
    const tgt = all.map(x => { const q = x.getBoundingClientRect(); return { left: q.left - 9, top: q.top - 9, right: q.right + 9, bottom: q.bottom + 9 }; });
    const others = [...document.querySelectorAll('button, [data-drag]')]
      .filter(b => !root.contains(b) && !all.includes(b) && b.offsetParent && !b.closest('[hidden]'))
      .map(b => b.getBoundingClientRect()).filter(visible);
    const parts = [$q('.hl-figure'), $q('.hl-bubble')];
    // the first target is the one to touch next: covering it costs far more than the other targets, which cost more
    // than any other button
    const cost = () => {
      const ps = parts.map(p => p.getBoundingClientRect());
      const over = q => ps.reduce((a, b) => a + Math.max(0, Math.min(q.right, b.right) - Math.max(q.left, b.left) - 2) * Math.max(0, Math.min(q.bottom, b.bottom) - Math.max(q.top, b.top) - 2), 0);
      let sum = 0;
      tgt.forEach((q, i) => { const a = over(q); if (a > 0) sum += (i === 0 ? 1e7 : 1e5) + a; });
      for (const q of others) { const a = over(q); if (a > 0) sum += 1e3 + a; }
      return sum;
    };
    const flip = x => x === 'left' ? 'right' : x === 'right' ? 'left' : x === 'top' ? 'bottom' : 'top';
    // every corner at full size, then every corner smaller (a small screen may have no room for her otherwise)
    let best = null;
    for (const small of [false, true]) {
      root.classList.toggle('compact', small);
      for (const [cs, cv] of [[s, v], [s, flip(v)], [flip(s), v], [flip(s), flip(v)]]) {
        setSpot(cs, cv);
        const c = cost();
        if (!best || c < best.c) best = { c, s: cs, v: cv, small };
        if (c === 0) break;
      }
      if (best.c === 0) break;
    }
    root.classList.toggle('compact', best.small);
    setSpot(best.s, best.v);
  }
  root.classList.add('side-left');

  return {
    el: root,
    name,
    say(key, opts = {}) {
      const same = cur && cur.key === key;
      // called every frame by the tutorial: only re-render when something actually changed
      if (same && cur.pose === (opts.pose || 'talk') && cur.btnSig === (opts.buttons || []).map(b => b.key).join() && !root.hidden) { place(opts.target); return; }
      const v = S().helper && S().helper[key];
      cur = { key, args: opts.args, buttons: opts.buttons, pose: opts.pose || 'talk', btnSig: (opts.buttons || []).map(b => b.key).join(), target: opts.target, picked: same ? cur.picked : Array.isArray(v) ? ri(v.length) : 0 };
      setPose(opts.pose || 'talk');
      root.hidden = false;
      render();
      place(opts.target);
      if (!same) {
        // a little "talking" animation whenever she starts a new line
        root.classList.remove('talking'); void root.offsetWidth; root.classList.add('talking');
        clearTimeout(talkTimer); talkTimer = setTimeout(() => root.classList.remove('talking'), 1400);
        root.classList.remove('bubble-in'); void root.offsetWidth; root.classList.add('bubble-in');
      }
    },
    pose: setPose,
    place,
    hide() { root.hidden = true; cur = null; clearTimeout(talkTimer); root.classList.remove('talking'); },
    refresh() { render(); },
    get shown() { return !root.hidden; },
    get key() { return cur && cur.key; },
  };
})();
