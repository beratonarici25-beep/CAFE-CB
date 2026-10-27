/* Service worker (issue #27): once the game has been opened it also plays offline, on an iPhone from the home screen
   too. The page itself is fetched from the network first (so a new version shows up at once) and from the cache when
   offline; everything else comes from the cache and is fetched only the first time. Bump VERSION with every release
   (together with the ?v= on the links in index.html): the old cache is then dropped. */
const VERSION = 'cafe-cb-24';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'style.css?v=24',
  'css/scene.css?v=24', 'css/fx.css?v=24', 'css/views.css?v=24', 'css/bar.css?v=24', 'css/theme.css?v=24', 'css/helper.css?v=24', 'css/stage.css?v=24', 'css/intro.css?v=24',
  'js/intro.js?v=24', 'js/util.js?v=24', 'js/i18n.js?v=24', 'js/audio.js?v=24', 'js/recipe.js?v=24', 'js/render.js?v=24', 'js/scene.js?v=24', 'js/fx.js?v=24',
  'js/station.js?v=24', 'js/camera.js?v=24', 'assets/helper/art.js?v=24', 'js/helper.js?v=24', 'js/tutorial.js?v=24', 'js/main.js?v=24',
  'assets/favicon-64.png', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-512-any.png', 'assets/apple-touch-icon.png',
  'assets/cover/logo-menu.webp', 'assets/intro/cup.webp', 'assets/intro/text.webp',
  'assets/backbar.svg', 'assets/bg-seating.svg', 'assets/bg-wall.svg',
  'assets/fonts/fonts.css?v=24', ...['courier-prime-400', 'courier-prime-700', 'grandstander-500-800', 'nunito-400-800', 'pacifico-400']
    .flatMap(f => [`assets/fonts/${f}-latin.woff2`, `assets/fonts/${f}-latin-ext.woff2`]),
  ...['bell', 'bin', 'binlid', 'cup-L', 'cup-M', 'cup-S', 'cust-beard', 'cust-collar-round', 'cust-collar-v', 'cust-hair-bun-front',
    'cust-hair-curly-back', 'cust-hair-curly-front', 'cust-hair-long-back', 'cust-hair-long-front', 'cust-hair-short-front',
    'cust-hair-straight-back', 'cust-hair-straight-front', 'cust-hat-beanie', 'cust-hat-cap', 'cust-hat-pom', 'cust-scarf', 'cust-skin',
    'cust-torso', 'gauge', 'grouphead', 'hopper', 'hotwater', 'knockbox', 'milk-almond', 'milk-oat', 'milk-whole', 'pf-empty', 'pf-ground',
    'pf-tamped', 'pitcher-empty', 'pitcher-foam', 'pitcher-milk', 'syrup-caramel', 'syrup-hazelnut', 'syrup-vanilla', 'tamper',
    'top-cinnamon', 'top-cocoa', 'top-whip', 'wand', 'warmer', 'icebucket', 'cocoatin', 'tipjar', 'stool'].map(n => `assets/models/${n}.webp`),
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const keep = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(keep).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(keep)));
});
