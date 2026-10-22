/* Canvas drawing: customers, the cup and small shape helpers. */
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
const custTargetX = () => clamp(dims.sw * 0.17 + 20, 64 * dims.k + 8, 240);

function drawCustomer(g, c, x, y) {
  const walking = c.state !== 'wait';
  const bob = reduceMotion ? 0 : walking ? -Math.abs(Math.sin(T * 9)) * 5 : Math.sin(T * 1.6 + c.seed) * 1.5;
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
  g.fillStyle = c.shirt; rrect(g, -56, -80, 112, 130, 42); g.fill(); g.stroke();
  g.fillStyle = c.skin; g.beginPath(); g.arc(0, -80, 14, 0, PI); g.fill(); g.stroke();
  if (c.hairStyle === 2) { g.fillStyle = c.hair; rrect(g, -47, -152, 94, 96, 30); g.fill(); g.stroke(); }
  if (c.hairStyle === 1) { g.fillStyle = c.hair; circle(g, 0, -162, 15); g.fill(); g.stroke(); }
  g.fillStyle = c.skin;
  circle(g, -39, -114, 8); g.fill(); g.stroke();
  circle(g, 39, -114, 8); g.fill(); g.stroke();
  circle(g, 0, -118, 39); g.fill(); g.stroke();
  g.fillStyle = c.hair;
  if (c.hairStyle === 3) {
    for (let i = 0; i <= 8; i++) { const a = PI + (i / 8) * PI; circle(g, Math.cos(a) * 36, -124 + Math.sin(a) * 34, 13); g.fill(); g.stroke(); }
  } else if (c.hairStyle === 4) {
    g.fillStyle = c.hat; g.beginPath(); g.arc(0, -122, 42, PI, 0); g.closePath(); g.fill(); g.stroke();
    rrect(g, -45, -130, 90, 15, 7); g.fill(); g.stroke();
    circle(g, 0, -167, 9); g.fillStyle = C.paper; g.fill(); g.stroke();
  } else {
    g.beginPath(); g.moveTo(-40, -110); g.bezierCurveTo(-48, -170, 48, -170, 40, -110);
    g.quadraticCurveTo(30, -138, 4, -137); g.quadraticCurveTo(-22, -135, -40, -110); g.closePath(); g.fill(); g.stroke();
  }
  const m = c.mood;
  g.fillStyle = C.ink;
  if (m === 'delighted') {
    g.beginPath(); g.arc(-14, -110, 6, PI * 1.15, PI * 1.85); g.stroke();
    g.beginPath(); g.arc(14, -110, 6, PI * 1.15, PI * 1.85); g.stroke();
  } else {
    const blink = !reduceMotion && (T + c.seed) % 4 < 0.12;
    if (blink) { g.beginPath(); g.moveTo(-18, -113); g.lineTo(-10, -113); g.moveTo(10, -113); g.lineTo(18, -113); g.stroke(); }
    else { circle(g, -14, -113, 3.8); g.fill(); circle(g, 14, -113, 3.8); g.fill(); }
  }
  if (m === 'annoyed' || m === 'upset') {
    g.beginPath(); g.moveTo(-21, -127); g.lineTo(-8, -122); g.moveTo(21, -127); g.lineTo(8, -122); g.stroke();
  }
  if (c.glasses) {
    g.lineWidth = 2.5; circle(g, -14, -113, 10); g.stroke(); circle(g, 14, -113, 10); g.stroke();
    g.beginPath(); g.moveTo(-4, -114); g.lineTo(4, -114); g.stroke(); g.lineWidth = 3;
  }
  g.globalAlpha = 0.7; g.fillStyle = C.blush;
  g.beginPath(); g.ellipse(-25, -100, 7, 4, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(25, -100, 7, 4, 0, 0, TAU); g.fill();
  g.globalAlpha = 1;
  g.beginPath();
  if (m === 'delighted') { g.arc(0, -101, 10, 0, PI); g.closePath(); g.fillStyle = C.ink; g.fill(); }
  else if (m === 'happy') { g.arc(0, -103, 8, PI * 0.15, PI * 0.85); g.stroke(); }
  else if (m === 'neutral') { g.moveTo(-7, -98); g.lineTo(7, -98); g.stroke(); }
  else if (m === 'annoyed') { g.moveTo(-7, -96); g.lineTo(7, -99); g.stroke(); }
  else { g.arc(0, -90, 8, PI * 1.15, PI * 1.85); g.stroke(); }
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
    const latte = mix(C.milk, C.espresso, clamp(esp / (esp + milkMl) * 1.4, 0, 0.6));
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
function counterImage(W, H, cy, topD) {
  const key = W + 'x' + H + 'x' + topD;
  if (counterCache && counterCache.key === key) return counterCache.cv;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(W * dpr); cv.height = Math.ceil((H - cy + 4) * dpr);
  const g = cv.getContext('2d');
  g.scale(dpr, dpr); g.translate(0, -cy + 4);
  const front = cy + topD;            // front edge of the marble top
  // walnut front with vertical panels
  const wood = g.createLinearGradient(0, front, 0, H);
  wood.addColorStop(0, '#7a4a2c'); wood.addColorStop(1, '#5a341f');
  g.fillStyle = wood; g.fillRect(0, front + 6, W, H - front);
  g.strokeStyle = 'rgba(30,15,8,.45)'; g.lineWidth = 2;
  for (let x = 40; x < W; x += 90) g.strokeRect(x - 34, front + 14, 68, H - front - 20);
  g.strokeStyle = 'rgba(255,220,180,.12)'; g.lineWidth = 1;
  for (let x = 6; x < W; x += 14) { g.beginPath(); g.moveTo(x, front + 8); g.bezierCurveTo(x + 3, front + 16, x - 3, H - 10, x + 2, H); g.stroke(); }
  // marble top: lighter at the back, a touch darker toward you, veins running across the depth
  const top = g.createLinearGradient(0, cy - 2, 0, front);
  top.addColorStop(0, '#fffdf9'); top.addColorStop(1, '#e9e2d8');
  g.fillStyle = top; g.fillRect(0, cy - 2, W, topD + 2);
  g.strokeStyle = 'rgba(150,140,130,.42)'; g.lineWidth = 1;
  for (let x = -30, k = 0; x < W; x += 70, k++) {
    g.beginPath(); g.moveTo(x, cy + (k % 3) * 2);
    g.bezierCurveTo(x + 22, cy + topD * 0.4, x + 30, cy + topD * 0.55, x + 58 + (k % 2) * 14, front - 1); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, cy, W, 2);
  // the thick front lip of the slab
  g.fillStyle = '#d9d0c4'; g.fillRect(0, front, W, 6);
  g.strokeStyle = C.ink; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, cy - 2); g.lineTo(W, cy - 2); g.moveTo(0, front); g.lineTo(W, front); g.moveTo(0, front + 6); g.lineTo(W, front + 6); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, front + 7, W, 7);
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
