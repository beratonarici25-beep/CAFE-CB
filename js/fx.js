/* Visual feedback. Pure presentation: game logic never waits on any of this, and everything is skipped
   or shortened when the player prefers reduced motion. */

const EASE_POP = 'cubic-bezier(.34,1.56,.64,1)';
// remove a ghost once its animation is over; the timer is a fallback for when `finished` never settles
function dropGhost(a, ghost, ms) {
  const kill = () => ghost.remove();
  if (a) a.finished.then(kill, kill);
  setTimeout(kill, (reduceMotion ? 0 : ms) + 60);
}
const FX = {
  anim(el, frames, opts) {
    if (!el || !el.animate) return null;
    return el.animate(frames, { duration: 300, easing: EASE_POP, ...opts, ...(reduceMotion ? { duration: 1 } : {}) });
  },
  // glide an element from where it used to be (FLIP)
  flip(el, from) {
    if (!from || reduceMotion) return;
    const r = el.getBoundingClientRect();
    const dx = from.left - r.left, dy = from.top - r.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    this.anim(el, [{ transform: `translate(${dx}px, ${dy}px) scale(1.06)` }, { transform: 'none' }], { duration: 320 });
  },
  shake(el) {
    this.anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' },
      { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 320, easing: 'ease-out' });
  },
  ghostTransform(g) { return g.style.transform || 'none'; },
  // dragged ghost returns home, then disappears
  flyBack(ghost, home) {
    const r = home.getBoundingClientRect();
    const a = this.anim(ghost, [{ transform: this.ghostTransform(ghost) }, { transform: `translate3d(${r.left}px, ${r.top}px, 0)` }],
      { duration: 280, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    dropGhost(a, ghost, 280);
  },
  fadeOut(ghost) {
    const a = this.anim(ghost, [{ transform: this.ghostTransform(ghost), opacity: 1 }, { transform: this.ghostTransform(ghost) + ' translateY(-30px) scale(.8)', opacity: 0 }],
      { duration: 320, easing: 'ease-in', fill: 'forwards' });
    dropGhost(a, ghost, 320);
  },
  intoTrash(ghost, bin) {
    const r = bin.getBoundingClientRect(), g = ghost.getBoundingClientRect();
    const x = r.left + r.width / 2 - g.width / 2, y = r.top + 10 - g.height / 2;
    const a = this.anim(ghost, [{ transform: this.ghostTransform(ghost), opacity: 1 },
      { transform: `translate3d(${x}px, ${y - 30}px, 0) rotate(-20deg) scale(.55)`, opacity: 1, offset: 0.6 },
      { transform: `translate3d(${x}px, ${y + 16}px, 0) rotate(-35deg) scale(.15)`, opacity: 0 }],
      { duration: 420, easing: 'ease-in', fill: 'forwards' });
    dropGhost(a, ghost, 420);
  },
  tiltPour(ghost, cupEl, home) { this.flyBack(ghost, home); },
};
