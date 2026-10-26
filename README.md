# CAFE C&B

A cozy drag-and-drop barista simulator (Turkish / English).
Sürükle-bırak barista simülatörü (Türkçe / İngilizce).

## ▶ [Oyna / Play](https://beratonarici25-beep.github.io/CAFE-CB/)

How a customer goes: they order in the **customer view** (an order ticket pins to the corner), you press
**Go to the barista bench** and the view slides to the **barista bench**. Every control is on the machines
themselves (grinder keys and grind button, the espresso machine's brew/steam buttons and foam keys, syrup pump heads).
Put the finished cup on the **serving tray**, ring the **Serve** bell, and back at the bar drag the cup onto the customer.
Game states: `ORDER_PENDING → PREPARING → READY_TO_SERVE → COMPLETED`.

The bar is laid out like a real café bar, left to right in working order: paper cup stacks → grinder with tamp
station and knock box → two-group espresso machine on a rubber mat → milk fridge and steel pitcher → syrup pumps and
toppings → the pass with the serving tray and bell, with shelves and a chalk menu behind.
The whole game shares one look, "cartoon but realistic": soft thick outlines, real proportions and materials, one warm
light from the upper left. New players get a short tutorial (one latte, start to finish) from the head barista,
**Jesica** (EN) / **Ülkü** (TR); it can be skipped and replayed from the main menu.

A new café only serves espresso and latte. The other drinks are bought with the café's money in the **recipe shop**
(main menu and the day-end screen): cappuccino, hot chocolate, flat white, iced latte, mocha. The next day the new drink
is announced, its first guest orders it and the head barista shows what is new about it. Hot chocolate (a spoon of
cocoa, no coffee) and iced latte (ice and cold milk straight from the bottle) bring their own equipment to the bench.
Prices are in `RECIPE_COST` (`js/recipe.js`); `node tools/balance.js` simulates what a good and an average player can
unlock in the 7-day demo. Bought upgrades show in the café (stools, the tip jar, a brass dial on the grinder and gauge).

Development will continue. Open to contributions.
Geliştirmeye devam edicem, katkılara açığım.

## Project layout

| Path | What it holds |
| --- | --- |
| `index.html` | Page structure: the two views (customer scene, barista counter), overlays |
| `style.css` | Base UI and the counter layout |
| `css/scene.css` | Layered café background (parallax, bulbs, neon) |
| `css/fx.css` | Hover, drop-target and pop animations |
| `css/views.css` | View switching, machine buttons/keys/displays, serving tray, contact shadows |
| `css/bar.css` | The barista bar: back shelves, rubber mats, steel machine, grinder, fridge, bottles (2.5D shading) |
| `css/theme.css` | Shared theme: walnut top bar, paper cards, notebook recipe book, main menu café backdrop |
| `css/helper.css` | Helper character poses and the tutorial spotlight |
| `css/stage.css` | The stage: the views laid out at one design height and scaled to the window (no scrolling), the wide bench layout, the "turn your phone" screen |
| `js/util.js` | Helpers, palette, save file |
| `js/i18n.js` | All text (`STR` UI, `PH` customer phrases); every key needs `en` and `tr` |
| `js/audio.js` | Synthesised sound effects |
| `js/recipe.js` | Drinks, orders, scoring, bench state and the `Rules` for each move |
| `js/render.js` | Canvas drawing: customers, cups, the bar |
| `js/scene.js` | Edison bulbs and parallax |
| `js/fx.js` | Particles (espresso, steam, grounds, drops) and one-shot animations |
| `js/station.js` | Drag & drop / tap-to-place interactions on the counter |
| `js/camera.js` | Phones: the close-up camera that pans along the bench (swipe, follows a drag at the edge, the tutorial pans to its step) |
| `js/helper.js` | The helper character module: `Helper.say(key, { pose, target, buttons })`, reusable outside the tutorial |
| `js/tutorial.js` | First-run tutorial: fixed latte order, step checks, highlights and hints |
| `js/main.js` | Game flow and states, view switching, HUD, overlays, frame loop |
| `assets/models/` | 3D models rendered in Blender (WebP, @2x): bench equipment and the customer layers |
| `sw.js`, `manifest.webmanifest` | Offline play and the home-screen app (PWA) |
| `assets/cover/` | The game's logo: `cafecb-logo-orijinal.jpg` (the owner's master, untouched), `logo.png` (black corners made transparent), `logo-menu.webp` (main menu) |
| `tools/logo.py` | Cleans the logo master into `logo.png` and `logo-menu.webp` (Python, Pillow + NumPy) |
| `tools/icons.js` | Renders the PNG app icons and the favicon from `assets/cover/logo.png` |
| `tools/blender/models.py` | Builds every 3D model from primitives in Blender and renders them (toon shading, ink outline, one upper-left light) |
| `assets/` | Background SVGs (café wall, seating, back bar), the app icons and favicon; `assets/helper/art.js` is the helper's SVG; `assets/CREDITS.md` lists sources |
| `tests/e2e.js` | End-to-end test that brews real orders by dragging, through both views |
| `tests/fuzz.js` | Random-play monkey test with state invariants |
| `tests/tutorial.js` | Plays the tutorial with drags (desktop) and taps (phone); skip, replay, language, old saves |
| `tests/sizes.js` | Drag ghosts keep their size, machine keys fit their label, a phone held upright asks to be turned |
| `tests/recipes.js` | Recipe shop: locked drinks never ordered, buying, intros, the two new drinks brewed, old saves, reset |
| `tools/balance.js` | Recipe shop balance: what a good and an average player unlock over the demo |
| `tests/layout.js` | At every window size (1280×720 to 3440×1440, phones held sideways) the game fits without scrolling (phones: every station once the camera pans to it, and a swipe pans) and an order can be brewed |

Plain scripts, no build step: open `index.html` directly or serve the folder.

### On phones

The game is played sideways and fits any window: the views are laid out at one design size and scaled
(`css/stage.css`). On a phone the whole bench would be too small, so it is drawn about 1.4x bigger with the stations in
one long row, and a close-up camera (`js/camera.js`) shows about half of it: swipe to pan, or drag an object to the
screen edge and the camera follows. On an iPhone the link opens straight in Safari and
plays there. Added to the home screen (optional) it opens full screen and, once opened, works offline:
`manifest.webmanifest` + `sw.js` (the service worker caches every file; bump its `VERSION` together with the `?v=` on
the links in `index.html` when releasing). `python tools/logo.py` then `node tools/icons.js` make the menu logo and the PNG icons from the logo in `assets/cover/`.
The fonts are bundled in `assets/fonts/` (SIL Open Font License, licence texts beside them), so nothing is loaded
from outside.
`CAFECB.html` redirects to `index.html` for old links.

Run the tests (needs `playwright-core` and Microsoft Edge):

```
node tests/e2e.js
node tests/fuzz.js 3000   # random play, checks for errors and broken state
FUZZ_TUT=1 node tests/fuzz.js 1500   # the same while the tutorial runs
node tests/tutorial.js
node tests/sizes.js
node tests/layout.js   # every window size; screenshots to tests/layout-*.png
node tests/recipes.js   # the recipe shop and the new drinks
```

## Credits

All artwork is original. The bench equipment and the customers are 3D models built from primitives in Blender by
`tools/blender/models.py` and rendered with toon shading to `assets/models/`; backgrounds, the back bar and the helper
character are SVG. No third-party models, textures or brand logos are used. Re-render the models with:

```
blender -b -P tools/blender/models.py -- assets/models
``` See [`assets/CREDITS.md`](assets/CREDITS.md).
