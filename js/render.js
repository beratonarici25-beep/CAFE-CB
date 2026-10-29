/* Canvas drawing: customers, the cup and small shape helpers. */
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
const custTargetX = () => clamp(dims.sw * 0.17 + 20, 64 * dims.k + 8, 240);

// shade a hex colour toward white (k > 0) or black (k < 0)
const shade = (hex, k) => mix(hex, k > 0 ? '#ffffff' : '#000000', Math.abs(k));
// a radial fill lit from the upper left (the one light of the whole game, issue #11)
function litFill(g, col, cx, cy, r) {
  const gr = g.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.08, cx, cy, r * 1.05);
  gr.addColorStop(0, shade(col, 0.28)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.22));
  return gr;
}

/* Rendered customer layers (tools/blender/models.py -> assets/models/cust-*.webp): grey, toon-shaded pieces that are
   tinted with each customer's colours and stacked once into a cached image; the face is drawn on top every frame. */
const HAIR_STYLES = ['short', 'bun', 'long', 'curly', 'beanie', 'straight'];   // by makeCustomer().hairStyle
const CUST_IMG = {};
['skin', 'torso', 'collar-round', 'collar-v', 'scarf', 'beard', 'hat-beanie', 'hat-pom', 'hat-cap',
  ...['short', 'bun', 'long', 'curly', 'straight'].map(h => `hair-${h}-front`), ...['long', 'curly', 'straight'].map(h => `hair-${h}-back`)]
  .forEach(n => { const i = new Image(); i.src = `assets/models/cust-${n}.webp`; CUST_IMG[n] = i; });
function tintLayer(img, col, W, H) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0, W, H);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(img, 0, 0, W, H);
  return cv;
}
function customerSprite(c) {
  if (c._spr) return c._spr;
  const st = HAIR_STYLES[c.hairStyle] || 'short', hairSt = st === 'beanie' ? 'short' : st;
  const L = [];
  if (CUST_IMG[`hair-${hairSt}-back`]) L.push([`hair-${hairSt}-back`, c.hair]);
  L.push(['torso', c.shirt], [c.collar ? 'collar-v' : 'collar-round', c.collar ? shade(c.shirt, 0.6) : shade(c.shirt, -0.12)], ['skin', c.skin]);
  if (c.acc === 'scarf') L.push(['scarf', c.hat]);
  if (c.acc === 'beard') L.push(['beard', c.hair]);
  L.push([`hair-${hairSt}-front`, c.hair]);
  if (st === 'beanie') L.push(['hat-beanie', c.hat], ['hat-pom', C.paper]);
  else if (c.acc === 'cap') L.push(['hat-cap', c.hat]);
  if (L.some(([n]) => !CUST_IMG[n].complete || !CUST_IMG[n].naturalWidth)) return null;
  const W = CUST_IMG.skin.naturalWidth, H = CUST_IMG.skin.naturalHeight;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  for (const [n, col] of L) g.drawImage(tintLayer(CUST_IMG[n], col, W, H), 0, 0);
  return (c._spr = cv);
}

// Customers (issue #9): rounded, shaded figures close to real proportions; they breathe, blink, look around,
// and their face follows their mood. Appearance comes from makeCustomer() (skin, hair style/colour, clothes, accessories).
function drawCustomer(g, c, x, y) {
  const walking = c.state !== 'wait';
  const bob = reduceMotion ? 0 : walking ? -Math.abs(Math.sin(T * 9)) * 5 : Math.sin(T * 1.6 + c.seed) * 1.5;
  const breath = reduceMotion || walking ? 0 : Math.sin(T * 1.9 + c.seed) * 0.014;
  // reactions: a happy hop after a good drink, a wobbly head-shake after a bad one, swaying when impatient
  let hop = 0, rot = 0;
  if (!reduceMotion && c.reactT != null && c.reactT < 1.5) {
    const t = c.reactT;
    if (c.react === 'bounce') hop = -Math.abs(Math.sin(t * 9)) * 16 * Math.exp(-t * 2.2);
    else rot = Math.sin(t * 22) * 0.08 * Math.exp(-t * 2.4);
  }
  const impatient = c.state === 'wait' && G.patience < 0.35 && ['ORDER_PENDING', 'PREPARING', 'READY_TO_SERVE'].includes(G.state);
  if (impatient && !reduceMotion) rot += Math.sin(T * 5 + c.seed) * 0.035;
  g.save(); g.translate(x, y + bob + hop);
  if (rot) { g.translate(0, -80); g.rotate(rot); g.translate(0, 80); }
  g.lineWidth = 3; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = C.ink;
  const skin = c.skin, hair = c.hair, shirt = c.shirt;

  const face = () => {
    // --- face: eyes with irises and catch-lights, brows, nose, cheeks, mouth
    const m = c.mood;
    const look = reduceMotion ? 0 : Math.sin(T * 0.7 + c.seed * 3) > 0.8 ? 1.6 : Math.sin(T * 0.5 + c.seed) < -0.85 ? -1.6 : 0;
    const blink = !reduceMotion && (T + c.seed) % 4 < 0.12;
    if (m === 'delighted') {
      g.lineWidth = 3.2;
      g.beginPath(); g.arc(-14, -110, 6, PI * 1.15, PI * 1.85); g.stroke();
      g.beginPath(); g.arc(14, -110, 6, PI * 1.15, PI * 1.85); g.stroke();
      g.lineWidth = 3;
    } else if (blink) {
      g.beginPath(); g.moveTo(-19, -113); g.quadraticCurveTo(-14, -110, -9, -113); g.moveTo(9, -113); g.quadraticCurveTo(14, -110, 19, -113); g.stroke();
    } else {
      for (const s of [-1, 1]) {
        g.fillStyle = '#fffdf9'; g.lineWidth = 2; g.beginPath(); g.ellipse(s * 14, -113, 6.2, 6.8, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = c.eye; circle(g, s * 14 + look, -112.5, 4); g.fill();
        g.fillStyle = C.ink; circle(g, s * 14 + look, -112.5, 2.2); g.fill();
        g.fillStyle = '#fff'; circle(g, s * 14 + look - 1.4, -114.2, 1.3); g.fill();
      }
      g.lineWidth = 3;
    }
    // brows follow the mood
    g.strokeStyle = shade(hair, -0.2); g.lineWidth = 3.2;
    const browTilt = m === 'annoyed' || m === 'upset' ? 4 : m === 'delighted' ? -3 : m === 'neutral' ? 0 : -1;
    g.beginPath(); g.moveTo(-21, -125 - browTilt * 0.3); g.lineTo(-8, -124 + browTilt);
    g.moveTo(21, -125 - browTilt * 0.3); g.lineTo(8, -124 + browTilt); g.stroke();
    g.strokeStyle = C.ink; g.lineWidth = 3;
    // nose: a soft shadow on the side away from the light
    g.strokeStyle = shade(skin, -0.32); g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(1, -110); g.quadraticCurveTo(6, -101, 0, -99); g.stroke();
    g.strokeStyle = C.ink; g.lineWidth = 3;
    g.globalAlpha = 0.6; g.fillStyle = C.blush;
    g.beginPath(); g.ellipse(-25, -100, 7.5, 4.5, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(25, -100, 7.5, 4.5, 0, 0, TAU); g.fill();
    g.globalAlpha = 1;
    g.beginPath();
    if (m === 'delighted') {
      g.moveTo(-10, -94); g.quadraticCurveTo(0, -80, 10, -94); g.closePath(); g.fillStyle = '#7a2e2a'; g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(-6, -94, 12, 3);
    } else if (m === 'happy') { g.arc(0, -96, 8, PI * 0.15, PI * 0.85); g.stroke(); }
    else if (m === 'neutral') { g.moveTo(-7, -91); g.lineTo(7, -91); g.stroke(); }
    else if (m === 'annoyed') { g.moveTo(-7, -89); g.lineTo(7, -92); g.stroke(); }
    else { g.arc(0, -84, 8, PI * 1.15, PI * 1.85); g.stroke(); }

  };
  const specs = () => {
    if (c.glasses) {
      g.lineWidth = 2.5; g.fillStyle = 'rgba(200,230,240,.18)';
      circle(g, -14, -113, 10); g.fill(); g.stroke(); circle(g, 14, -113, 10); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-4, -114); g.lineTo(4, -114); g.moveTo(-24, -115); g.lineTo(-37, -118); g.moveTo(24, -115); g.lineTo(37, -118); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(-14, -113, 6, PI * 1.1, PI * 1.4); g.stroke(); g.lineWidth = 3; g.strokeStyle = C.ink;
    }
  };
  // rendered 3D layers (Blender) when they are loaded; the vector drawing below is the fallback
  const spr = customerSprite(c);
  if (spr) {
    g.save(); g.translate(0, 50); g.scale(1 + breath * 0.6, 1 + breath); g.translate(0, -50);
    g.drawImage(spr, -80, -185, 160, 240);
    g.restore();
    if (c.acc === 'earrings') { g.fillStyle = '#f2c94c'; circle(g, -40, -103, 3.4); g.fill(); g.stroke(); circle(g, 40, -103, 3.4); g.fill(); g.stroke(); }
    face(); specs();
  } else {
    // --- torso: shoulders and arms, lit from the left, with a couple of soft folds
    g.save(); g.translate(0, 50); g.scale(1 + breath * 0.6, 1 + breath); g.translate(0, -50);
    const torso = new Path2D();
    torso.moveTo(-58, 52); torso.bezierCurveTo(-60, -20, -50, -70, -18, -78); torso.lineTo(18, -78);
    torso.bezierCurveTo(50, -70, 60, -20, 58, 52); torso.closePath();
    const tg = g.createLinearGradient(-58, -80, 58, 40);
    tg.addColorStop(0, shade(shirt, 0.3)); tg.addColorStop(0.45, shirt); tg.addColorStop(1, shade(shirt, -0.28));
    g.fillStyle = tg; g.fill(torso); g.stroke(torso);
    g.save(); g.clip(torso);
    g.strokeStyle = shade(shirt, -0.25); g.lineWidth = 2.5; g.globalAlpha = 0.7;
    g.beginPath(); g.moveTo(-34, -40); g.quadraticCurveTo(-30, 0, -36, 52); g.moveTo(34, -40); g.quadraticCurveTo(30, 0, 36, 52);
    g.moveTo(-12, 8); g.quadraticCurveTo(-4, 14, 6, 10); g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(-36, -50, 14, 24, -0.5, 0, TAU); g.fill();
    g.restore();
    // neckline: a V-neck shows a little undershirt, otherwise a round collar
    if (c.collar) {
      g.fillStyle = shade(shirt, 0.55); g.beginPath(); g.moveTo(-18, -77); g.lineTo(0, -44); g.lineTo(18, -77); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
    if (c.acc === 'scarf') {
      const sc = c.hat;
      g.fillStyle = litFill(g, sc, -10, -76, 50);
      rrect(g, -34, -88, 68, 22, 11); g.fill(); g.stroke();
      rrect(g, 8, -74, 16, 40, 6); g.fill(); g.stroke();
      g.strokeStyle = shade(sc, -0.3); g.lineWidth = 2; g.beginPath(); g.moveTo(10, -50); g.lineTo(22, -50); g.moveTo(10, -42); g.lineTo(22, -42); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = 3;
    }

    // --- neck with the shadow of the chin
    g.fillStyle = shade(skin, -0.12); rrect(g, -12, -94, 24, 22, 8); g.fill(); g.stroke();
    g.fillStyle = 'rgba(60,30,15,.18)'; g.beginPath(); g.ellipse(0, -88, 12, 5, 0, 0, TAU); g.fill();

    // --- hair behind the head (long styles)
    if (c.hairStyle === 2 || c.hairStyle === 5) {
      const long = c.hairStyle === 5;
      g.fillStyle = litFill(g, hair, 0, -110, 60);
      g.beginPath(); g.moveTo(-44, -120); g.bezierCurveTo(-52, -70, -50, long ? -40 : -66, long ? -38 : -30, long ? -30 : -60);
      g.lineTo(long ? 38 : 30, long ? -30 : -60); g.bezierCurveTo(50, long ? -40 : -66, 52, -70, 44, -120); g.closePath(); g.fill(); g.stroke();
    }
    if (c.hairStyle === 1) { g.fillStyle = litFill(g, hair, 0, -164, 16); circle(g, 0, -164, 16); g.fill(); g.stroke(); }

    // --- ears and head
    for (const s of [-1, 1]) {
      g.fillStyle = s < 0 ? shade(skin, 0.05) : shade(skin, -0.1); circle(g, s * 39, -114, 8.5); g.fill(); g.stroke();
      g.strokeStyle = shade(skin, -0.3); g.lineWidth = 2; g.beginPath(); g.arc(s * 39, -114, 4, s < 0 ? PI * 0.6 : -PI * 0.4, s < 0 ? PI * 1.4 : PI * 0.4); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = 3;
    }
    if (c.acc === 'earrings') { g.fillStyle = '#f2c94c'; circle(g, -40, -103, 3.4); g.fill(); g.stroke(); circle(g, 40, -103, 3.4); g.fill(); g.stroke(); }
    g.fillStyle = litFill(g, skin, 0, -118, 40);
    g.beginPath(); g.ellipse(0, -118, 38, 41, 0, 0, TAU); g.fill(); g.stroke();
    if (c.acc === 'beard') {
      g.fillStyle = litFill(g, hair, 0, -96, 30);
      g.beginPath(); g.moveTo(-36, -114); g.bezierCurveTo(-34, -70, 34, -70, 36, -114); g.bezierCurveTo(26, -96, -26, -96, -36, -114); g.fill(); g.stroke();
    }

    face();
    // --- hair on top, with a highlight strand where the light hits
    g.fillStyle = litFill(g, hair, -6, -140, 46);
    if (c.hairStyle === 3) {
      for (let i = 0; i <= 8; i++) { const a = PI + (i / 8) * PI; circle(g, Math.cos(a) * 36, -124 + Math.sin(a) * 34, 13); g.fill(); g.stroke(); }
    } else if (c.hairStyle === 4) {
      // knitted beanie
      g.fillStyle = litFill(g, c.hat, -6, -140, 46);
      g.beginPath(); g.arc(0, -122, 42, PI, 0); g.closePath(); g.fill(); g.stroke();
      g.save(); g.clip(); g.strokeStyle = shade(c.hat, -0.25); g.lineWidth = 2;
      for (let i = -36; i <= 36; i += 9) { g.beginPath(); g.moveTo(i, -128); g.lineTo(i * 0.7, -160); g.stroke(); }
      g.restore();
      g.fillStyle = shade(c.hat, -0.08); rrect(g, -45, -130, 90, 15, 7); g.fill(); g.stroke();
      circle(g, 0, -167, 9); g.fillStyle = litFill(g, C.paper, 0, -167, 9); g.fill(); g.stroke();
    } else {
      g.beginPath(); g.moveTo(-40, -110); g.bezierCurveTo(-48, -170, 48, -170, 40, -110);
      g.quadraticCurveTo(30, -138, 4, -137); g.quadraticCurveTo(-22, -135, -40, -110); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-26, -140); g.quadraticCurveTo(-12, -151, 6, -150); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = 3;
    }
    if (c.acc === 'cap' && c.hairStyle !== 4) {
      g.fillStyle = litFill(g, c.hat, -6, -146, 40);
      g.beginPath(); g.arc(0, -134, 38, PI * 1.02, PI * 1.98); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = shade(c.hat, -0.15); g.beginPath(); g.ellipse(-30, -133, 26, 6, -0.08, 0, TAU); g.fill(); g.stroke();
    }
    specs();
  }
  g.restore();
  if (impatient) drawClock(g, x + 46, y - 196 + hop);
}

// little thought bubble with a ticking clock
function drawClock(g, x, y) {
  g.save(); g.lineWidth = 2.5; g.strokeStyle = C.ink; g.fillStyle = C.paper;
  circle(g, x - 14, y + 26, 3); g.fill(); g.stroke();
  circle(g, x - 7, y + 17, 5); g.fill(); g.stroke();
  const pulse = reduceMotion ? 1 : 1 + Math.sin(T * 6) * 0.05;
  g.translate(x + 8, y); g.scale(pulse, pulse);
  circle(g, 0, 0, 14); g.fill(); g.stroke();
  g.lineWidth = 2; g.beginPath();
  const a = reduceMotion ? 1 : T * 4;
  g.moveTo(0, 0); g.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
  g.moveTo(0, 0); g.lineTo(0, -6); g.stroke();
  g.restore();
}

const CUPD = { S: { h: 92, t: 84, b: 64 }, M: { h: 116, t: 96, b: 70 }, L: { h: 140, t: 106, b: 76 } };
function mix(a, b, k) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
// slosh: angle (radians) the drink leans inside the cup while it is being carried
function drawCup(g, c, x, y, s, slosh = 0) {
  if (!c.size) return;
  const d = CUPD[c.size], h = d.h, ht = d.t / 2, hb = d.b / 2, cap = SIZES[c.size].cap;
  const halfAt = yy => hb + (ht - hb) * (-yy / h);
  g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = C.ink; g.lineWidth = 3;
  g.fillStyle = C.paper; g.beginPath(); g.ellipse(0, 2, hb + 26, 8, 0, 0, TAU); g.fill(); g.stroke();
  const hx = halfAt(-h * 0.55);
  g.beginPath(); g.ellipse(hx - 2, -h * 0.55, h * 0.15, h * 0.19, 0, -PI / 2, PI / 2);
  g.lineWidth = 12; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#e9f3f1'; g.stroke();
  g.strokeStyle = C.ink; g.lineWidth = 3;
  const body = new Path2D();
  body.moveTo(-ht, -h); body.lineTo(ht, -h); body.lineTo(hb, -5); body.quadraticCurveTo(hb, 0, hb - 6, 0);
  body.lineTo(-hb + 6, 0); body.quadraticCurveTo(-hb, 0, -hb, -5); body.closePath();
  g.fillStyle = 'rgba(233,243,241,.75)'; g.fill(body);

  g.save(); g.clip(body);
  if (slosh) { g.translate(0, -h * 0.45); g.rotate(slosh); g.translate(0, h * 0.45); }
  // fills run wider than the cup (and the bottom one deeper) so a leaning drink never shows a gap at the walls
  const X0 = -ht - 40, XW = d.t + 80, below = () => (yy === 0 ? 40 : 0);
  const full = h * 0.97, px = ml => ml / cap * full;
  let yy = 0;
  const layer = (ml, fill) => { const hh = px(ml); g.fillStyle = fill; g.fillRect(X0, yy - hh, XW, hh + 0.6 + below()); yy -= hh; };
  // c._anim (bench cup only) eases the levels so liquids rise smoothly instead of jumping
  const A = c._anim;
  const pumpsReal = Object.values(c.syrups).reduce((a, b) => a + b, 0);
  const pumps = A ? A.pumps : pumpsReal;
  if (pumps > 0.01) {
    let col = null, n = 0;
    for (const [k, v] of Object.entries(c.syrups)) { col = col ? mix(col, SYRUPS[k].color, v / (n + v)) : SYRUPS[k].color; n += v; }
    layer(pumps * 7, col);
  }
  const espReal = c.shots.length * 30 + (c.shotting ? Math.min(30, c.shotT) : 0);
  const esp = A ? A.esp : espReal, milkK = A ? A.milk : 1;
  // gently rocking surface line for crema / foam
  const wave = (top, fill) => {
    g.fillStyle = fill; g.beginPath(); g.moveTo(X0, top + 8);
    for (let i = 0; i <= 10; i++) { const xx = X0 + XW * i / 10; g.lineTo(xx, top + (reduceMotion ? 0 : Math.sin(T * (slosh ? 9 : 3) + i * 0.9) * (slosh ? 2.6 : 1.6))); }
    g.lineTo(X0 + XW, top + 8); g.closePath(); g.fill();
  };
  if (c.milkPoured && milkK > 0.01) {
    const foamMl = { none: cap * 0.03, light: cap * 0.1, thick: cap * 0.24 }[c.foamUsed] * milkK;
    const milkMl = Math.max(40, cap * 0.9 - foamMl - esp - pumps * 7) * milkK;
    const y0 = yy, total = px(esp + milkMl);
    let latte = mix(C.milk, C.espresso, clamp(esp / (esp + milkMl) * 1.4, 0, 0.6));
    // cocoa stirred in (hot chocolate, issue #21)
    if (c.choc) latte = mix(latte, '#6b3b26', 0.55);
    const gr = g.createLinearGradient(0, y0, 0, y0 - total);
    gr.addColorStop(0, esp ? C.espresso : C.milk); gr.addColorStop(esp ? 0.25 : 0, latte); gr.addColorStop(1, latte);
    g.fillStyle = gr; g.fillRect(X0, y0 - total, XW, total + 0.6 + below()); yy -= total;
    const fh = px(foamMl);
    g.fillStyle = C.foam; g.fillRect(X0, yy - fh, XW, fh + 0.6);
    wave(yy - fh - 1, C.foam);
    g.fillStyle = 'rgba(201,139,79,.18)';
    for (let i = 0; i < 9; i++) { circle(g, -ht + 8 + i * (d.t - 16) / 8, yy - fh * ((i * 37) % 10) / 10, 2 + (i % 3)); g.fill(); }
    yy -= fh;
  } else if (esp > 0.3) {
    layer(Math.max(0, esp - 6), C.espresso);
    layer(Math.min(6, esp), C.crema);
    wave(yy - 1, C.crema);
  } else if (c.choc) {
    layer(14, '#6b3b26');
  }
  // ice cubes (iced latte, issue #21): floating at the top of the drink, or piled at the bottom of an empty cup
  if (c.ice) {
    const top = yy < -12 ? yy + 6 : -4, sz = Math.min(26, d.t * 0.2);
    g.lineWidth = 2; g.strokeStyle = 'rgba(110,160,185,.85)';
    [[-0.42, 0.1, -0.2], [0.05, -0.1, 0.25], [0.4, 0.15, 0.1], [-0.15, 0.85, -0.35], [0.3, 0.95, 0.4]].forEach(([u, v, a]) => {
      g.save(); g.translate(u * (ht - 10), top - sz * (0.3 + v)); g.rotate(a);
      g.fillStyle = 'rgba(232,246,252,.78)'; g.beginPath(); g.roundRect(-sz / 2, -sz / 2, sz, sz, 5); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(-sz / 2 + 4, -sz / 2 + 4, sz * 0.28, 3);
      g.restore();
    });
  }
  g.restore();
  if (A) A.levelPx = -yy;

  const surf = Math.max(-h, Math.min(yy, -2)), w = halfAt(surf) - 6;
  if (c.tops.includes('whip')) {
    g.fillStyle = '#ffffff'; g.lineWidth = 2.5;
    const r = w * 0.36;
    for (const [dx, dy] of [[-0.55, 0], [0.55, 0], [0, -0.1], [-0.28, -0.55], [0.28, -0.55], [0, -1]]) {
      circle(g, dx * w, surf - r * 0.4 + dy * r, r); g.fill(); g.stroke();
    }
  }
  const sprinkle = (col, seed, topY) => {
    g.fillStyle = col;
    for (let i = 0; i < 16; i++) {
      const u = ((i * 73 + seed) % 100) / 100 - 0.5, v = ((i * 41 + seed * 3) % 100) / 100;
      circle(g, u * w * 1.6, topY - v * 6, 1.8); g.fill();
    }
  };
  const topY = c.tops.includes('whip') ? surf - w * 0.36 * 1.6 : surf - 2;
  if (c.tops.includes('cocoa')) sprinkle('#6b3b26', 11, topY);
  if (c.tops.includes('cinnamon')) sprinkle('#b5652e', 29, topY);

  // glass shading: lit on the left, darker on the right, so the cup reads round (issue #9)
  const sh = g.createLinearGradient(-ht, 0, ht, 0);
  sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.75, 'rgba(40,20,10,0)'); sh.addColorStop(1, 'rgba(40,20,10,.22)');
  g.fillStyle = sh; g.fill(body);
  g.lineWidth = 3; g.strokeStyle = C.ink; g.stroke(body);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(-ht + 10, -h + 12); g.lineTo(-hb + 8, -14); g.stroke();
  g.fillStyle = 'rgba(75,46,43,.55)'; g.font = `800 ${Math.round(h * 0.13)}px Grandstander, system-ui, sans-serif`;
  g.textAlign = 'center'; g.fillText('C&B', 0, -h * 0.32);

  if (c.milkPoured && c.milkTemp > 45 && !reduceMotion) {
    g.strokeStyle = 'rgba(133,103,95,.45)'; g.lineWidth = 3;
    for (let k = -1; k <= 1; k++) {
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const py = -h - 8 - i * 3.2, pxx = k * 18 + Math.sin(T * 3 + i * 0.55 + k * 2) * 5;
        i ? g.lineTo(pxx, py) : g.moveTo(pxx, py);
      }
      g.stroke();
    }
  }
  g.restore();
}

// The bar counter in front of the customers: a marble top seen slightly from above (2.5D) over a walnut front.
// Cached; redrawn only on resize.
let counterCache = null;
const counterArt = { top: new Image(), front: new Image() };
for (const [k, f] of [['top', 'counter-top'], ['front', 'counter-front']]) {
  counterArt[k].onload = () => { counterCache = null; };
  counterArt[k].src = `assets/cafe/${f}.webp?v=39`;
}
function counterImage(W, H, cy, topD) {
  const dpr = pxRatio(), ready = counterArt.top.complete && counterArt.front.complete && counterArt.top.naturalWidth > 0;
  const key = W + 'x' + H + 'x' + topD + 'x' + dpr + ready;
  if (counterCache && counterCache.key === key) return counterCache.cv;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(W * dpr); cv.height = Math.ceil((H - cy + 4) * dpr);
  const g = cv.getContext('2d');
  g.scale(dpr, dpr); g.translate(0, -cy + 4);
  const front = cy + topD;            // front edge of the marble top
  if (ready) {
    // the Blender renders (tools/blender/cafe.py): the marble top, then the walnut front, tiled sideways
    g.drawImage(counterArt.top, 0, cy - 2, W, topD + 2);
    const fh = H - front, fw = fh * counterArt.front.naturalWidth / counterArt.front.naturalHeight;
    for (let x = 0; x < W; x += fw) g.drawImage(counterArt.front, x, front, fw + 1, fh);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, front, W, 3);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, cy - 2, W, 2);
  }
  counterCache = { key, cv };
  return cv;
}

// coins and notes the customer leaves on the bar after paying; they drop in one by one
function drawPayment(g, x, y, amount, t, k) {
  const n = clamp(Math.round(amount / 1.25), 1, 8);
  for (let i = 0; i < n; i++) {
    const at = t - 0.2 - i * 0.08;
    if (at < 0) continue;
    const fall = reduceMotion ? 0 : Math.max(0, 1 - at / 0.25), bounce = reduceMotion ? 0 : Math.abs(Math.sin(Math.min(at, 0.5) * 12)) * Math.exp(-at * 9) * 6;
    const cx = x + (i % 4) * 15 * k + (i >= 4 ? 7 * k : 0), cy = y - (i >= 4 ? 5 * k : 0) - fall * 40 - bounce;
    g.save(); g.translate(cx, cy); g.scale(k, k);
    g.fillStyle = 'rgba(40,20,10,.22)'; g.beginPath(); g.ellipse(1, 4 + fall * 40 / k, 9, 3, 0, 0, TAU); g.fill();
    g.fillStyle = '#e0a52c'; g.strokeStyle = C.ink; g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, 2, 8, 3.6, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#f6cf5a'; g.beginPath(); g.ellipse(0, 0, 8, 3.6, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
}

function drawScene() {
  const g = sceneG, W = dims.sw, H = dims.sh, k = dims.k;
  if (!W) return;
  g.clearRect(0, 0, W, H);
  const cy = H - dims.counterH, topD = dims.topD, c = G.cust;
  // soft floor shadow where the customer stands
  if (c) {
    g.fillStyle = 'rgba(40,20,10,.18)';
    g.beginPath(); g.ellipse(c.x, cy + 2, 70 * k, 10 * k, 0, 0, TAU); g.fill();
    g.save(); g.translate(c.x, cy); g.scale(k, k); drawCustomer(g, c, 0, 0); g.restore();
  }
  g.drawImage(counterImage(W, H, cy, topD), 0, cy - 4, W, H - cy + 4);
  if (G.served && c) {
    const surf = cy + topD * 0.45;
    if (G.result && c.state === 'wait' && G.result.pay + G.result.tip > 0) drawPayment(g, c.x - 52 * k, surf + 4, G.result.pay + G.result.tip, c.reactT || 0, k);
    drawCup(g, G.served, c.x + 86 * k, surf, 0.42 * k);
  }
}
