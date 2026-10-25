// Renders the PNG app icons (home screen, Android, PWA manifest, favicon) from the owner's logo (issues #26, #27).
// The logo's black corners are made transparent first by tools/logo.py -> assets/cover/logo.png.
// Run: node tools/icons.js   (needs playwright-core and Microsoft Edge, like the tests)
const path = require('path');
const fs = require('fs');
const pw = require(process.env.PW_CORE || 'playwright-core');

const ROOT = path.resolve(__dirname, '..');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets', 'cover', 'logo.png')).toString('base64');
const RED = '#F10301'; // the logo's red (issue #26)
// scale: logo size relative to the icon. bg: what shows around/under it.
// apple-touch-icon: square on the logo red, zoomed a little so the logo's own rounded corners fall outside the
//   square (iOS rounds the icon itself, with a larger radius than the logo's).
// icon-512 (maskable): the cup and the name inside the central 80 % safe zone, padded with the logo red.
// icon-192 / icon-512-any / favicon: the rounded logo itself on transparency.
const OUT = [
  { file: 'apple-touch-icon.png', size: 180, scale: 1.04, bg: RED },
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512-any.png', size: 512, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 0.68, bg: RED },
  { file: 'favicon-64.png', size: 64, scale: 1 },
];

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  for (const o of OUT) {
    const page = await browser.newPage({ viewport: { width: o.size, height: o.size } });
    const inner = o.size * o.scale;
    await page.setContent(`<html><body style="margin:0;overflow:hidden;position:relative;width:${o.size}px;height:${o.size}px;background:${o.bg || 'transparent'}">
      <img id="l" src="${logo}" style="position:absolute;width:${inner}px;height:${inner}px;left:${(o.size - inner) / 2}px;top:${(o.size - inner) / 2}px"></body></html>`);
    await page.waitForFunction(() => document.getElementById('l').complete);
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(ROOT, 'assets', o.file), omitBackground: !o.bg });
    await page.close();
    console.log('wrote assets/' + o.file);
  }
  await browser.close();
})();
