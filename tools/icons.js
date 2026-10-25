// Renders the PNG app icons (home screen, Android, PWA manifest) from assets/icon.svg (issue #27).
// Run: node tools/icons.js   (needs playwright-core and Microsoft Edge, like the tests)
const path = require('path');
const pw = require(process.env.PW_CORE || 'playwright-core');

const fs = require('fs');
const svg = 'data:image/svg+xml;base64,' + fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'icon.svg')).toString('base64');
// apple-touch-icon is square without its own rounded corners (iOS rounds it); the maskable 512 keeps a safe margin
const OUT = [
  { file: 'apple-touch-icon.png', size: 180, pad: 0, square: true },
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0.1, square: true },
];

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  for (const o of OUT) {
    const page = await browser.newPage({ viewport: { width: o.size, height: o.size } });
    const inner = Math.round(o.size * (1 - o.pad * 2));
    await page.setContent(`<html><body style="margin:0;display:grid;place-items:center;width:${o.size}px;height:${o.size}px;background:${o.square ? '#f4b9b2' : 'transparent'}">
      <img src="${svg}" width="${inner}" height="${inner}"></body></html>`);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.resolve(__dirname, '..', 'assets', o.file), omitBackground: !o.square });
    await page.close();
    console.log('wrote assets/' + o.file);
  }
  await browser.close();
})();
