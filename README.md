# CAFE C&B

A cozy drag-and-drop barista simulator (Turkish / English).
Sürükle-bırak barista simülatörü (Türkçe / İngilizce).

## ▶ [Oyna / Play](https://beratonarici25-beep.github.io/CAFE-CB/)

How a customer goes: they order in the **customer view** (an order ticket pins to the corner), you press
**Go to the barista bench** and the view slides to the **barista bench**. Every control is on the machines
themselves (grinder keys and grind button, the espresso machine's brew/steam buttons and foam keys, syrup pump heads).
Put the finished cup on the **serving tray**, ring the **Serve** bell, and back at the bar drag the cup onto the customer.
Game states: `ORDER_PENDING → PREPARING → READY_TO_SERVE → COMPLETED`.

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
| `js/util.js` | Helpers, palette, save file |
| `js/i18n.js` | All text (`STR` UI, `PH` customer phrases); every key needs `en` and `tr` |
| `js/audio.js` | Synthesised sound effects |
| `js/recipe.js` | Drinks, orders, scoring, bench state and the `Rules` for each move |
| `js/render.js` | Canvas drawing: customers, cups, the bar |
| `js/scene.js` | Edison bulbs and parallax |
| `js/fx.js` | Particles (espresso, steam, grounds, drops) and one-shot animations |
| `js/station.js` | Drag & drop / tap-to-place interactions on the counter |
| `js/main.js` | Game flow and states, view switching, HUD, overlays, frame loop |
| `assets/` | Background SVGs and the icon |
| `tests/e2e.js` | End-to-end test that brews real orders by dragging, through both views |
| `tests/fuzz.js` | Random-play monkey test with state invariants |

Plain scripts, no build step: open `index.html` directly or serve the folder.
`CAFECB.html` redirects to `index.html` for old links.

Run the tests (needs `playwright-core` and Microsoft Edge):

```
node tests/e2e.js
node tests/fuzz.js 3000   # random play, checks for errors and broken state
```
