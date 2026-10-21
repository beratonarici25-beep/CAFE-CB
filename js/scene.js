/* Café background: hangs the Edison bulbs and drifts the layers a little with the pointer (parallax). */
(function setupScene() {
  const scene = $('#scene');
  const bulbs = [[8, 30], [22, 46], [38, 26], [63, 40], [79, 28], [93, 44]];
  $('#bulbs').innerHTML = bulbs.map(([x, h], i) => `<i style="--x:${x}%;--h:${h}px;--d:${-i * 0.7}s"></i>`).join('');
  if (reduceMotion) return;
  const layers = [...scene.querySelectorAll('[data-depth]')];
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  function step() {
    x += (tx - x) * 0.08; y += (ty - y) * 0.08;
    for (const el of layers) {
      const d = +el.dataset.depth;
      el.style.setProperty('--px', (x * d).toFixed(2) + 'px');
      el.style.setProperty('--py', (y * d * 0.5).toFixed(2) + 'px');
    }
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(step) : 0;
  }
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    tx = (e.clientX / window.innerWidth - 0.5) * -1;
    ty = (e.clientY / window.innerHeight - 0.5) * -1;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
})();
