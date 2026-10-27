/* Opening animation (issue #28), ~5 s, approved by the user: the cup is thrown in from the left spinning while the
   name rises from below, they land together as the logo, the logo's red opens from the centre behind it, then the
   logo shrinks away and the screen fades into the main menu (already drawn underneath).
   A tap skips it; automated tests (navigator.webdriver) never see it. When it is over `cafecb:introend` fires. */
(function () {
  const intro = document.getElementById('intro');
  if (!intro) return;
  const cup = document.getElementById('introCup'), text = document.getElementById('introText');
  const wave = document.getElementById('introWave'), logo = intro.querySelector('.intro-logo');
  let anims = [], done = false, started = false;

  function end() {
    if (done) return;
    done = true;
    anims.forEach(a => a.cancel()); anims = [];
    intro.hidden = true;
    window.dispatchEvent(new CustomEvent('cafecb:introend'));
  }

  // tap to skip: a short fade instead of the rest of the animation
  function skip(e) {
    e.preventDefault(); e.stopPropagation();
    if (done || !intro.animate) { end(); return; }
    intro.removeEventListener('pointerdown', skip);
    anims.forEach(a => a.pause());
    const f = intro.animate([{ opacity: getComputedStyle(intro).opacity }, { opacity: 0 }], { duration: 250, easing: 'ease-in', fill: 'both' });
    f.finished.then(end, end);
  }

  function run() {
    const T = { start: 300, land: 1400, wave: 2500 };
    const D = T.land - T.start;
    const fly = 'cubic-bezier(.25,.6,.35,1)';

    // 1) the cup: thrown from the left, arcing and spinning
    anims.push(cup.animate([
      { opacity: 1, transform: 'translate(-130%,-35%) rotate(-70deg) scale(.9)' },
      { opacity: 1, transform: 'translate(-55%,-28%) rotate(-30deg) scale(.97)', offset: .4 },
      { opacity: 1, transform: 'translate(5%,-4%) rotate(8deg) scale(1.03)', offset: .85 },
      { opacity: 1, transform: 'translate(0,0) rotate(0deg) scale(1)' }
    ], { duration: D, delay: T.start, easing: fly, fill: 'both' }));

    // 2) the name: rises from below at the same time and lands with the cup
    anims.push(text.animate([
      { opacity: 1, transform: 'translateY(110%)' },
      { opacity: 1, transform: 'translateY(-4%)', offset: .85 },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: D, delay: T.start, easing: fly, fill: 'both' }));

    // 3) landing: both squash and settle into one logo
    [cup, text].forEach(el => anims.push(el.animate([
      { scale: '1 1' }, { scale: '1.08 .93', offset: .25 }, { scale: '.97 1.04', offset: .55 }, { scale: '1.01 .99', offset: .8 }, { scale: '1 1' }
    ], { duration: 600, delay: T.land, easing: 'ease-out', composite: 'add' })));

    // 4) the red opens from the centre, behind the logo, until the screen is red
    anims.push(wave.animate([
      { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }
    ], { duration: 1000, delay: T.wave, easing: 'cubic-bezier(.55,.05,.3,1)', fill: 'both' }));

    // 5) a short wait, then the logo shrinks away and the screen fades out
    const fadeDelay = T.wave + 1000 + 500;
    anims.push(logo.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.92)', opacity: 0 }],
      { duration: 600, delay: fadeDelay, easing: 'ease-in', fill: 'both' }));
    const f = intro.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: fadeDelay + 250, easing: 'ease-in', fill: 'both' });
    anims.push(f);
    f.finished.then(end, () => {});
  }

  function play() {
    if (done || started) return;
    started = true;
    // no Web Animations, or something breaks: never leave the player stuck on the intro
    if (!cup.animate) { end(); return; }
    try { run(); } catch (e) { end(); }
  }

  if (navigator.webdriver) { end(); return; }
  intro.addEventListener('pointerdown', skip);
  // start once the pictures are ready (and start anyway if they cannot be decoded or take too long)
  Promise.all([cup, text].map(i => i.decode ? i.decode().catch(() => {}) : 0)).then(play, play);
  setTimeout(play, 3000);
})();
