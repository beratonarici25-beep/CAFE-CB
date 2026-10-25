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
  const SIZES = ['l', 'm', 's'];
  const setSize = z => { for (const k of SIZES) root.classList.toggle('size-' + k, k === z); };
  // her own strip beside the stage (issue #23): main.js fitStage() keeps the stage out of these pixels
  let aside = 0, asideView = null;
  const asideWidth = () => Math.round(clamp(window.innerWidth * 0.22, 180, 320));
  function setAside(w) {
    if (w === aside) return;
    aside = w;
    root.classList.toggle('aside', !!w);
    if (w) root.style.setProperty('--aside-w', w + 'px');
    if (typeof fit === 'function') fit();
  }
  const view = () => window.CB && CB.view ? CB.view() : null;
  // the pointing arm turns toward the first lit target (0deg hangs down, positive turns clockwise)
  function aim(r) {
    if (!r) { root.style.removeProperty('--arm'); return; }
    const f = $q('.hl-figure').getBoundingClientRect(), right = side === 'right';
    const sx = f.left + f.width * (right ? 39 : 121) / 160, sy = f.top + f.height * 149 / 222;
    const deg = Math.atan2(-(r.left + r.width / 2 - sx), r.top + r.height / 2 - sy) * 180 / PI;
    root.style.setProperty('--arm', (right ? clamp(deg, 25, 170) : clamp(deg, -170, -25)).toFixed(0) + 'deg');
  }
  // stand where she covers nothing: not what she talks about, and no other button either (issues #15, #23).
  // Biggest first: every corner at full size, then smaller; if even the smallest covers something, the strip.
  let placedFor = null, placedAt = 0;
  function place(target) {
    const all = (Array.isArray(target) ? target : [target]).map(x => typeof x === 'string' ? document.querySelector(x) : x).filter(Boolean);
    // called every frame: only look again when the line, the targets, the view or the window change, or a few times a
    // second (things move: the cup glides, a view slides in)
    const sig = cur && cur.key + '|' + all.length + '|' + view() + '|' + window.innerWidth + 'x' + window.innerHeight;
    const now = performance.now();
    if (sig === placedFor && now - placedAt < 250) return;
    placedFor = sig; placedAt = now;
    if (aside && asideView !== view()) setAside(0);
    const el = all[0];
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    if (aside) { setSpot('right', 'bottom'); aim(r); return; }
    // first guess: the side away from the thing she talks about
    let s = 'left', v = 'bottom';
    if (r && (r.width || r.height)) {
      s = r.left + r.width / 2 < window.innerWidth / 2 ? 'right' : 'left';
      v = r.top + r.height / 2 > window.innerHeight * 0.58 ? 'top' : 'bottom';
    }
    if (root.hidden) { setSpot(s, v); return; }
    const was = SIZES.find(k => root.classList.contains('size-' + k)) + side + vert;
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
      // off the window (a bubble too tall for a short screen) counts like covering a button
      for (const q of ps) if (q.top < 0 || q.bottom > window.innerHeight + 1) sum += 1e3;
      return sum;
    };
    const flip = x => x === 'left' ? 'right' : x === 'right' ? 'left' : x === 'top' ? 'bottom' : 'top';
    let best = null;
    for (const z of SIZES) {
      setSize(z);
      for (const [cs, cv] of [[s, v], [s, flip(v)], [flip(s), v], [flip(s), flip(v)]]) {
        setSpot(cs, cv);
        const c = cost();
        if (!best || c < best.c) best = { c, s: cs, v: cv, z };
        if (c === 0) break;
      }
      if (best.c === 0) break;
    }
    if (best.c > 0) {
      // no free corner at any size: the stage makes room and she stands beside it until the view changes
      asideView = view();
      setSize('l');
      setSpot('right', 'bottom');
      setAside(asideWidth());
      aim(el && el.getBoundingClientRect());
      return;
    }
    const grew = was !== best.z + best.s + best.v;
    setSize(best.z);
    setSpot(best.s, best.v);
    aim(r);
    if (grew) pop();
  }
  // she slides in from her edge when she appears, and pops a little when she changes size or corner
  let anim = null;
  function slideIn() {
    if (reduceMotion || !root.animate) return;
    if (anim) anim.cancel();
    const dx = side === 'right' ? 60 : -60;
    anim = $q('.hl-figure').animate([{ transform: `translateX(${dx}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)' });
  }
  function pop() {
    if (reduceMotion || !root.animate || (anim && anim.playState === 'running')) return;
    anim = $q('.hl-figure').animate([{ transform: 'scale(.9)', transformOrigin: '50% 100%' }, { transform: 'none', transformOrigin: '50% 100%' }], { duration: 280, easing: 'cubic-bezier(.34,1.56,.64,1)' });
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
      const appear = root.hidden;
      root.hidden = false;
      render();
      if (appear) placedFor = null;
      place(opts.target);
      if (appear) slideIn();
      if (!same) {
        // a little "talking" animation whenever she starts a new line
        root.classList.remove('talking'); void root.offsetWidth; root.classList.add('talking');
        clearTimeout(talkTimer); talkTimer = setTimeout(() => root.classList.remove('talking'), 1400);
        root.classList.remove('bubble-in'); void root.offsetWidth; root.classList.add('bubble-in');
      }
    },
    pose: setPose,
    place,
    hide() { root.hidden = true; cur = null; clearTimeout(talkTimer); root.classList.remove('talking'); setAside(0); },
    // the strip she takes beside the stage (0 when she stands over it)
    get aside() { return aside; },
    refresh() { render(); },
    get shown() { return !root.hidden; },
    get key() { return cur && cur.key; },
  };
})();
