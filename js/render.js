/* Canvas drawing: customers, the cup and small shape helpers. */
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
const custTargetX = () => clamp(dims.sw * 0.17 + 20, 76, 220);

function drawCustomer(g, c, x, y) {
  const walking = c.state !== 'wait';
  const bob = reduceMotion ? 0 : walking ? -Math.abs(Math.sin(T * 9)) * 5 : Math.sin(T * 1.6 + c.seed) * 1.5;
  g.save(); g.translate(x, y + bob);
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
}

const CUPD = { S: { h: 92, t: 84, b: 64 }, M: { h: 116, t: 96, b: 70 }, L: { h: 140, t: 106, b: 76 } };
function mix(a, b, k) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
function drawCup(g, c, x, y, s) {
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
  const full = h * 0.97, px = ml => ml / cap * full;
  let yy = 0;
  const layer = (ml, fill) => { const hh = px(ml); g.fillStyle = fill; g.fillRect(-ht - 2, yy - hh, d.t + 4, hh + 0.6); yy -= hh; };
  const pumps = Object.values(c.syrups).reduce((a, b) => a + b, 0);
  if (pumps) {
    let col = null, n = 0;
    for (const [k, v] of Object.entries(c.syrups)) { col = col ? mix(col, SYRUPS[k].color, v / (n + v)) : SYRUPS[k].color; n += v; }
    layer(pumps * 7, col);
  }
  const esp = c.shots.length * 30 + (c.shotting ? Math.min(30, c.shotT) : 0);
  if (c.milkPoured) {
    const foamMl = { none: cap * 0.03, light: cap * 0.1, thick: cap * 0.24 }[c.foamUsed];
    const milkMl = Math.max(40, cap * 0.9 - foamMl - esp - pumps * 7);
    const y0 = yy, total = px(esp + milkMl);
    const latte = mix(C.milk, C.espresso, clamp(esp / (esp + milkMl) * 1.4, 0, 0.6));
    const gr = g.createLinearGradient(0, y0, 0, y0 - total);
    gr.addColorStop(0, esp ? C.espresso : C.milk); gr.addColorStop(esp ? 0.25 : 0, latte); gr.addColorStop(1, latte);
    g.fillStyle = gr; g.fillRect(-ht - 2, y0 - total, d.t + 4, total + 0.6); yy -= total;
    const fh = px(foamMl);
    g.fillStyle = C.foam; g.fillRect(-ht - 2, yy - fh, d.t + 4, fh + 0.6);
    g.fillStyle = 'rgba(201,139,79,.18)';
    for (let i = 0; i < 9; i++) { circle(g, -ht + 8 + i * (d.t - 16) / 8, yy - fh * ((i * 37) % 10) / 10, 2 + (i % 3)); g.fill(); }
    yy -= fh;
  } else if (esp) {
    layer(Math.max(0, esp - 6), C.espresso);
    layer(Math.min(6, esp), C.crema);
  }
  g.restore();

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

function drawScene() {
  const g = sceneG, W = dims.sw, H = dims.sh;
  if (!W) return;
  g.clearRect(0, 0, W, H);
  g.fillStyle = C.wall; g.fillRect(0, 0, W, H);
  g.fillStyle = C.wall2; for (let x = 0; x < W; x += 36) g.fillRect(x, 0, 14, H);
  const seg = 150, bulbs = [C.blush, C.butter, C.mint, C.sky];
  g.strokeStyle = C.ink; g.lineWidth = 1.5;
  let bi = 0;
  for (let x0 = -20; x0 < W; x0 += seg) {
    g.beginPath(); g.moveTo(x0, 6); g.quadraticCurveTo(x0 + seg / 2, 34, x0 + seg, 6); g.stroke();
    for (let k = 1; k < 4; k++) {
      const u = k / 4, bx = x0 + seg * u, by = 6 + 2 * u * (1 - u) * 28;
      const tw = reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(T * 2 + bi);
      g.globalAlpha = tw; g.fillStyle = bulbs[bi++ % 4];
      g.beginPath(); g.ellipse(bx, by + 6, 4, 6, 0, 0, TAU); g.fill(); g.stroke(); g.globalAlpha = 1;
    }
  }
  const cy = H - 44;
  if (W > 620) {
    const px = W - 46;
    g.fillStyle = '#7fb48f'; g.strokeStyle = C.ink; g.lineWidth = 2.5;
    for (const [dx, dy, r] of [[-14, -38, 13], [12, -42, 14], [0, -56, 14], [-4, -30, 12], [14, -26, 11]]) { circle(g, px + dx, cy + dy, r); g.fill(); g.stroke(); }
    g.fillStyle = C.blush; g.beginPath(); g.moveTo(px - 20, cy - 24); g.lineTo(px + 20, cy - 24); g.lineTo(px + 15, cy); g.lineTo(px - 15, cy); g.closePath(); g.fill(); g.stroke();
  }
  if (G.cust) drawCustomer(g, G.cust, G.cust.x, cy);
  g.fillStyle = C.wood; g.fillRect(0, cy, W, H - cy);
  g.fillStyle = C.woodTop; g.fillRect(0, cy, W, 10);
  g.strokeStyle = C.ink; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, cy); g.lineTo(W, cy); g.moveTo(0, cy + 10); g.lineTo(W, cy + 10); g.stroke();
  g.lineWidth = 1.5; g.globalAlpha = 0.35;
  for (let x = 30; x < W; x += 64) { g.beginPath(); g.moveTo(x, cy + 14); g.lineTo(x, H); g.stroke(); }
  g.globalAlpha = 1;
  if (G.served && G.cust) drawCup(g, G.served, G.cust.x + 86, cy + 7, 0.42);
}
