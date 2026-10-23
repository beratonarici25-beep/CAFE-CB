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
  // stand on the side away from what she is talking about, so she never covers it
  function place(target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    let s = side, v = vert;
    if (r && (r.width || r.height)) {
      s = r.left + r.width / 2 < window.innerWidth / 2 ? 'right' : 'left';
      v = r.top + r.height / 2 > window.innerHeight * 0.58 ? 'top' : 'bottom';
    } else { s = 'left'; v = 'bottom'; }
    if (s !== side) { root.classList.toggle('side-left', s === 'left'); root.classList.toggle('side-right', s === 'right'); side = s; }
    if (v !== vert) { root.classList.toggle('at-top', v === 'top'); vert = v; }
    // on a narrow screen the bubble may still land on the thing she talks about: then stand at the other end
    if (r && !root.hidden) {
      const b = $q('.hl-bubble').getBoundingClientRect();
      if (b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top) {
        vert = vert === 'top' ? 'bottom' : 'top'; root.classList.toggle('at-top', vert === 'top');
      }
    }
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
