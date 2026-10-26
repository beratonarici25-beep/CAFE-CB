/* Visual feedback (issue #3). Pure presentation: game logic never waits on any of this, and particles are
   skipped (other effects shortened) when the player prefers reduced motion.
   - one-shot effects use the Web Animations API on transform/opacity only
   - liquids, steam, dust and drops are particles on one full-window canvas (#fxCv) */

const EASE_POP = 'cubic-bezier(.34,1.56,.64,1)';
// remove a ghost once its animation is over; the timer is a fallback for when `finished` never settles
function dropGhost(a, ghost, ms) {
  const kill = () => ghost.remove();
  if (a) a.finished.then(kill, kill);
  setTimeout(kill, (reduceMotion ? 0 : ms) + 60);
}
const rectOf = el => el && el.isConnected && !el.hidden ? el.getBoundingClientRect() : null;
const centerOf = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

const FX = {
  parts: [],        // live particles
  streams: [],      // timed pours: { from(), to(), color, width, until }
  cv: null, g: null, dirty: false,

  anim(el, frames, opts) {
    if (!el || !el.animate) return null;
    return el.animate(frames, { duration: 300, easing: EASE_POP, ...opts, ...(reduceMotion ? { duration: 1 } : {}) });
  },

  /* ---------- object movement ---------- */
  // glide an element from where it used to be (FLIP)
  flip(el, from) {
    if (!from || reduceMotion) return;
    const r = stageRect(el), k = drawnScale(el);
    // inside a shrunk machine (the phone bench) the move is drawn k times smaller, so it is k times longer here
    const dx = (from.left - r.left) / k, dy = (from.top - r.top) / k;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    this.anim(el, [{ transform: `translate(${dx}px, ${dy}px) scale(1.06)` }, { transform: 'none' }], { duration: 320 });
  },
  // squash & stretch when something is set down
  land(el, delay = 330) {
    // after the 320 ms FLIP glide, not on top of it
    this.anim(el, [{ transform: 'scale(1.08, .9)' }, { transform: 'scale(.96, 1.05)', offset: .5 }, { transform: 'none' }], { duration: 360, delay });
  },
  shake(el) {
    this.anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' },
      { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 320, easing: 'ease-out' });
  },
  ghostTransform(g) { return g.style.transform || 'none'; },
  // dragged ghost returns home, then disappears
  flyBack(ghost, home, delay = 0, from = this.ghostTransform(ghost)) {
    const r = stageRect(home);
    const a = this.anim(ghost, [{ transform: from }, { transform: `translate3d(${r.left}px, ${r.top}px, 0)` }],
      { duration: 280, delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    dropGhost(a, ghost, 280 + delay);
  },
  // the cup is taken by the customer: it hops toward their hands and shrinks away
  handOver(ghost, zone) {
    const z = rectOf(zone) && stageRect(zone), g = stageRect(ghost);
    if (!z) { this.fadeOut(ghost); return; }
    const x = z.left + z.width * 0.75 - g.width / 2, y = z.top + z.height * 0.55 - g.height / 2;
    const a = this.anim(ghost, [{ transform: this.ghostTransform(ghost), opacity: 1 },
      { transform: `translate3d(${x}px, ${y - 24}px, 0) scale(.8, .9)`, opacity: 1, offset: .55 },
      { transform: `translate3d(${x}px, ${y}px, 0) scale(.35)`, opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
    dropGhost(a, ghost, 380);
  },
  fadeOut(ghost) {
    const a = this.anim(ghost, [{ transform: this.ghostTransform(ghost), opacity: 1 }, { transform: this.ghostTransform(ghost) + ' translateY(-30px) scale(.8)', opacity: 0 }],
      { duration: 320, easing: 'ease-in', fill: 'forwards' });
    dropGhost(a, ghost, 320);
  },
  // wrong cup: shrinks, tips over and drops into the bin while the lid flaps
  intoTrash(ghost, bin) {
    const r = stageRect(bin), g = stageRect(ghost);
    const x = r.left + r.width / 2 - g.width / 2, y = r.top + 10 - g.height / 2;
    const a = this.anim(ghost, [{ transform: this.ghostTransform(ghost), opacity: 1 },
      { transform: `translate3d(${x}px, ${y - 30}px, 0) rotate(-20deg) scale(.55)`, opacity: 1, offset: 0.6 },
      { transform: `translate3d(${x}px, ${y + 16}px, 0) rotate(-35deg) scale(.15)`, opacity: 0 }],
      { duration: 420, easing: 'ease-in', fill: 'forwards' });
    dropGhost(a, ghost, 420);
  },
  lid() {
    this.anim(document.querySelector('#bin .lid'), [{ transform: 'none' }, { transform: 'rotate(-38deg)', offset: .3 },
      { transform: 'rotate(-38deg)', offset: .55 }, { transform: 'rotate(6deg)', offset: .8 }, { transform: 'none' }], { duration: 650, easing: 'ease-in-out' });
    this.anim($('#bin'), [{ transform: 'none' }, { transform: 'rotate(-4deg)', offset: .6 }, { transform: 'rotate(3deg)', offset: .8 }, { transform: 'none' }], { duration: 650 });
  },
  // the pitcher ghost tips over the cup, pours, then goes back to the wand or rack
  tiltPour(ghost, cupEl, home) {
    const c = rectOf(cupEl) && stageRect(cupEl), gr = stageRect(ghost);
    if (!c || reduceMotion) { this.flyBack(ghost, home); return; }
    const x = c.left + c.width / 2 - 8, y = c.top - gr.height * 0.55;
    const a = this.anim(ghost, [{ transform: this.ghostTransform(ghost) },
      { transform: `translate3d(${x}px, ${y}px, 0) rotate(0deg)`, offset: .25 },
      { transform: `translate3d(${x}px, ${y}px, 0) rotate(-48deg)`, offset: .4 },
      { transform: `translate3d(${x}px, ${y}px, 0) rotate(-52deg)`, offset: .85 },
      { transform: `translate3d(${x}px, ${y}px, 0) rotate(0deg)` }], { duration: 900, easing: 'ease-in-out', fill: 'forwards' });
    // spout is at the top-left once tipped
    this.stream(() => toScreen(x + 6, y + gr.height * 0.22), () => this.surface(cupEl), C.milk, 7, 0.35, 0.8);
    // return from above the cup, where the pour ended, not from the drop point
    a ? a.finished.then(() => { a.cancel(); this.flyBack(ghost, home, 0, `translate3d(${x}px, ${y}px, 0)`); }, () => ghost.remove()) : ghost.remove();
    setTimeout(() => ghost.isConnected && ghost.remove(), 2000);
  },

  /* ---------- station effects ---------- */
  tamp(pfEl) {
    this.anim(pfEl, [{ transform: 'none' }, { transform: 'scale(1.06, .86) translateY(4px)', offset: .3 }, { transform: 'none' }], { duration: 300 });
    this.anim($('#counter'), [{ transform: 'none' }, { transform: 'translate(1.5px, 1px)' }, { transform: 'translate(-1.5px, -1px)' },
      { transform: 'translate(1px, 0)' }, { transform: 'none' }], { duration: 180, easing: 'linear' });
    const r = rectOf(pfEl.querySelector('.pf-ring') || pfEl);
    if (r) this.puff(r.left + r.width / 2, r.top + r.height / 2, '#8a5a3c', 14);
  },
  dust(el, color) { const r = rectOf(el); if (r) this.puff(r.left + r.width / 2, r.top + r.height * 0.4, color, 12); },
  pump(bottleEl, cupEl, color) {
    if (bottleEl) {
      this.anim(bottleEl.querySelector('.pumphead'), [{ transform: 'none' }, { transform: 'translateY(7px) scaleY(.6)', offset: .35 }, { transform: 'none' }], { duration: 320 });
      this.anim(bottleEl.querySelector('.glass'), [{ transform: 'none' }, { transform: 'scale(1.08, .9)', offset: .35 }, { transform: 'scale(.97, 1.04)', offset: .7 }, { transform: 'none' }], { duration: 380 });
    }
    const s = this.surface(cupEl);
    if (s) for (let i = 0; i < 3; i++) this.add({ x: s.x + rand(-6, 6), y: s.y - 40 - i * 12, vx: 0, vy: 60 + i * 10, g: 900, r: 3.2, color, life: 0.6, stopY: s.y, kind: 'drop' });
  },
  sprinkle(cupEl, color) {
    const s = this.surface(cupEl);
    if (!s) return;
    const n = color === '#ffffff' ? 0 : 18;
    for (let i = 0; i < n; i++) this.add({ x: s.x + rand(-s.w * 0.4, s.w * 0.4), y: s.y - rand(30, 60), vx: rand(-15, 15), vy: rand(20, 60), g: 500, r: rand(1.2, 2.2), color, life: 0.7, stopY: s.y + rand(-2, 3) });
    if (!n) this.puff(s.x, s.y - 6, '#ffffff', 10);
    this.land(cupEl);
  },
  pourInto(el, color) {
    const s = this.surface(el);
    if (!s) return;
    this.stream(() => ({ x: s.x, y: s.y - 70 }), () => this.surface(el), color, 7, 0.4, 0);
  },
  // top of the liquid (or rim) of a cup / pitcher element, in client coordinates
  surface(el) {
    const r = rectOf(el);
    if (!r) return null;
    if (el.id === 'cupObj' && B.cup.size) {
      const k = r.height / dims.ch || 1, s = Math.min(0.8, (dims.ch - 16) / 196);
      const d = CUPD[B.cup.size];
      const level = B.cup._anim ? B.cup._anim.levelPx : 0;
      return { x: r.left + r.width / 2, y: r.top + (dims.ch - 8 - Math.max(level, 6) * s) * k, w: d.t * s * k };
    }
    return { x: r.left + r.width * 0.45, y: r.top + r.height * 0.25, w: r.width * 0.6 };
  },

  /* ---------- money ---------- */
  floatMoney(fromEl, amount, hudEl) {
    const r = rectOf(fromEl);
    if (r) {
      const el = document.createElement('div');
      el.className = 'float-money';
      el.textContent = '+' + money(amount);
      el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = (r.top + 30) + 'px';
      document.body.appendChild(el);
      const a = this.anim(el, [{ transform: 'translate(-50%, 10px) scale(.6)', opacity: 0 }, { transform: 'translate(-50%, -14px) scale(1.15)', opacity: 1, offset: .2 },
        { transform: 'translate(-50%, -70px) scale(1)', opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      dropGhost(a, el, 1100);
      for (let i = 0; i < 8; i++) this.add({ x: r.left + r.width / 2 + rand(-20, 20), y: r.top + 40, vx: rand(-80, 80), vy: rand(-260, -160), g: 700, r: 3.5, color: '#f2b636', life: 0.9, kind: 'coin' });
    }
    if (hudEl) this.anim(hudEl, [{ transform: 'none' }, { transform: 'scale(1.25)', offset: .4 }, { transform: 'none' }], { duration: 450, delay: 350 });
  },

  /* ---------- particles ---------- */
  add(p) { if (reduceMotion) return; p.t = 0; this.parts.push(p); },
  puff(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(30, 90);
      this.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 30, g: -10, r: rand(2, 4.5), color, life: rand(0.4, 0.7), drag: 3, fade: true });
    }
  },
  stream(from, to, color, width, dur, delay) {
    if (reduceMotion) return;
    const t0 = performance.now() / 1000 + delay;
    this.streams.push({ from, to, color, width, start: t0, until: t0 + dur });
  },
  fit() {
    if (!this.cv) {
      this.cv = document.createElement('canvas');
      this.cv.id = 'fxCv'; this.cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.cv);
      this.g = this.cv.getContext('2d');
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(innerWidth * dpr); this.cv.height = Math.round(innerHeight * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr;
  },
  // continuous effects driven by the bench state
  emit(dt) {
    if (reduceMotion || G.state !== 'PREPARING') return;
    const p = B.pf, c = B.cup, pt = B.pitcher;
    if (p.grinding) {
      const r = rectOf($('.chute'));
      if (r && Math.random() < 0.9) this.add({ x: r.left + r.width / 2 + rand(-3, 3), y: r.bottom, vx: rand(-8, 8), vy: 40, g: 600, r: rand(1.2, 2.2), color: pick(['#5b3423', '#6b3b26', '#4a2a1c']), life: 0.35, stopY: r.bottom + 30 });
    }
    // a fresh shot steams a little above the cup (issue #6)
    if (c.shotting && Math.random() < 0.35) {
      const s = this.surface($('#cupObj'));
      if (s) this.add({ x: s.x + rand(-s.w * 0.3, s.w * 0.3), y: s.y - 6, vx: rand(-8, 8), vy: rand(-45, -25), g: -12, r: rand(2, 3.5), color: 'rgba(255,255,255,.55)', life: rand(0.6, 1), drag: 1, fade: true, grow: 6 });
    }
    if (pt.steaming) {
      const r = rectOf($('.wand-pipe'));
      // puffs escape around the wand tip, inside the pitcher, and drift up
      if (r && Math.random() < 0.7) this.add({ x: r.left + r.width / 2 + rand(-10, 10), y: r.bottom + 8, vx: rand(-25, 25), vy: rand(-80, -50), g: -30, r: rand(2.5, 5), color: 'rgba(255,255,255,.6)', life: rand(0.5, 0.9), drag: 1.4, fade: true, grow: 7 });
    }
  },
  frame(dt) {
    if (!this.cv) return;
    this.emit(dt);
    const g = this.g, now = performance.now() / 1000;
    const live = this.parts.length || this.streams.length || (B.cup.shotting && G.state === 'PREPARING');
    if (!live && !this.dirty) return;
    g.clearRect(0, 0, innerWidth, innerHeight);
    this.dirty = !!live;
    // espresso: a thin wavering stream from the group head while a shot runs
    if (B.cup.shotting && !reduceMotion) {
      const head = rectOf($('#slotGroup')), s = this.surface($('#cupObj'));
      if (head && s) {
        this.drawStream(head.left + head.width / 2 - 26 + 26, head.bottom - 6, s.x, s.y, C.espresso, 3.5, now);
        if (Math.random() < 0.3) this.add({ x: s.x + rand(-4, 4), y: s.y - 2, vx: rand(-20, 20), vy: rand(-40, -10), g: 300, r: 1.6, color: C.crema, life: 0.25 });
      }
    }
    this.streams = this.streams.filter(st => now < st.until);
    for (const st of this.streams) {
      if (now < st.start) continue;
      const a = st.from(), b = st.to();
      if (a && b) this.drawStream(a.x, a.y, b.x, b.y, st.color, st.width * Math.min(1, (st.until - now) * 6), now);
    }
    this.parts = this.parts.filter(p => (p.t += dt) < p.life);
    for (const p of this.parts) {
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.stopY != null && p.y > p.stopY) { p.y = p.stopY; p.vx = 0; p.vy = 0; p.g = 0; }
      const k = p.t / p.life;
      g.globalAlpha = p.fade ? 1 - k : Math.min(1, (1 - k) * 3);
      g.fillStyle = p.color;
      g.beginPath();
      if (p.kind === 'drop') g.ellipse(p.x, p.y, p.r * 0.8, p.r * 1.3, 0, 0, TAU);
      else g.arc(p.x, p.y, p.r + (p.grow || 0) * k, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  },
  drawStream(x1, y1, x2, y2, color, w, now) {
    const g = this.g;
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1);
    const n = 12;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      g.lineTo(x1 + (x2 - x1) * u + Math.sin(now * 22 + u * 9) * 1.3 * u, y1 + (y2 - y1) * u);
    }
    g.stroke();
    // a couple of falling beads make it read as liquid
    g.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      const u = ((now * 2.2 + i / 3) % 1);
      g.beginPath(); g.arc(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, w * 0.75, 0, TAU); g.fill();
    }
  },
};
