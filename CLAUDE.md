# Duskhold

An original base-defence game inspired by Thronefall (inspired by, not copied: no Thronefall code, assets, icons
or emblems were decompiled, extracted or reproduced). Build by day, hold by night, as a rider on horseback.
It ships as ONE self-contained HTML file: `dist/duskhold.html`.

## Build and run

- `node tools/build.mjs` concatenates `src/head.html` + every `src/NN-*.js` (sorted, each prefixed with a
  `// ---- NN-name.js` marker) + `src/tail.html` into `dist/duskhold.html`. Always rebuild after editing `src/`.
- Open `dist/duskhold.html` in a browser. Three.js r160 loads from cdn.jsdelivr.net through an importmap;
  fonts load from Google Fonts. Everything else is inline.
- Because of the markers, `src/` can be recovered exactly from any built `dist/duskhold.html`.

## Tests (Playwright, headless Chromium with swiftshader)

`npm install` (three@0.160.0, playwright), then run from the repo root:
- `node tools/flow.mjs` – end-to-end flow through real input, 42 checks: title, hub, loadout, keep first, build,
  "Next Upgrade" path menu, tier 4, refunds, 3-piece walls and pathing, troop carriers, night, pause, victory, defeat.
- `node tools/bot.mjs <levels> [bow|lance|hammer] [active|idle|stay]` – plays whole lands headlessly for balance.
  Reports min keep % per night, buildings lost, and a STALL line if a night runs past 300 s.
- `node tools/gallery.mjs` – renders every model in rows into `shots/`. `node tools/gallop.mjs` – rider frame strip.
- `tools/harness.mjs` serves the dist file, routes the three CDN to `node_modules/three`, and serves Google Fonts
  from `tools/fonts/` (a local cache; recreate it with fonts.css plus woff2 files named kN.woff2, or tests log 404s).
- Lost in a container reset and not yet rewritten: `tools/combat.mjs`, `smoke.mjs`, `showcase.mjs`, `chest.mjs`,
  `icons.mjs`, `ui.mjs`, and the `tools/fonts/` cache.
- The harness treats console errors AND warnings as failures. Keep every run at "no console errors".

## Source layout (`src/`)

- `head.html` – CSS (fonts, HUD, menus, title, path menu), HUD markup, importmap. `tail.html` closes the page.
- `01-core.js` – math helpers, `Path` (polyline with project/at/dist), seeded RNG, `Input`, `Sound` (WebAudio synth:
  hooves, coins, bells, horns, ambience; no chimes), `Save` (localStorage `duskhold-save-v2`).
- `02-render.js` – renderer, lights, post chain (ink outline, GTAO, bloom, tilt-shift, grade, FXAA), `QUALITY`
  presets (high, medium, low, verylow) and `applyQuality`, toon materials with a smooth 256-step light ramp.
- `03-models.js` – `MB` model builder (merged parts per material, named child pivots form rigs; `MB(true)` = smooth,
  rounded mode) and every model: castle/cottage/farm/mine/tower tiers 1–4, troop carriers, fishing huts,
  3-piece wall pieces, 17 foes, troops, hero (round, stocky horse), chest, hub gates.
- `04-world.js` – `BIOMES` (muted, gloomy palettes), heightfield terrain: island coast from an ellipse plus arms
  (`World.setShape`), raised plateau with cliffs, straight ramps (`World.ramp`), lakes, rivers, bridges.
  `canStep`/`grade` block walking onto cliff faces (the rider may ride down). Scatter of trees (no collision),
  rocks (collide), grass and flowers, trimmed live by the graphics setting (`World.applyDetail`).
- `05-data.js` – `BUILD` (tiers; tier 3 is a 3-way branch with `desc` lines for the path menu; tier 4 entries carry
  `from`), troop carriers (`lines`), `UNITS`, `FOES`, `WEAPONS`, 36 `PERKS`, 10 modifiers, `LEVELS`, quests,
  level track, `makeLane`, `wallArc`, `placePlots`, `generateNights`.
- `06-fx.js` – particles (`Fx`, skipped by `Q.fx`), coins (drop/income/spend/refund), coin slots, rounded health
  bars, bow reticle, projectiles, `Crowd` instancing for troops/foes/projectiles, `moveBody`.
- `07-game.js` – game state `G`, camera (follows ground height), plots and building, `Nav` flow-field
  pathfinding, hero, troops, foes, damage, towers, waves (`runWaves`), day/night, hub, main `update`.
- `08-icons.js` – SVG icon set: simple shapes in one muted tan (#d6c4a0) on category circles (perks green,
  weapons blue, modifiers red, foes black with a red ring) with a thick dark ring.
- `09-ui.js` – HUD, title screen, hub level box, loadout, pause, settings, path menu (`UI.pathMenu`), markers.
- `10-main.js` – frame loop, auto quality, boot, and `window.DH` handles used by the tests.

## How the game works now (as of the last session)

- **Start:** 15 coins (War Chest perk +8). The keep ("Stonekeeper") costs 5 and must be bought first; nothing
  else can be focused and the night cannot start until it stands.
- **Maps:** the keep and town sit on a plateau about 4.2–4.6 high, with short ramps (~11.5–12 long).
  Mossmere is one-way (one north ramp). Twin Fords adds an east ramp, Amberwood a west ramp, Frostpine and
  Cinderreach both. Side rifts open partway through a land.
- **Pathfinding:** `Nav` is a 1-unit grid Dijkstra from the keep. Cells too steep (`NAV_SLOPE` 0.55) or holding
  rocks or water are closed. Walls and buildings cost +220 to cross, so foes go round when there is any way round
  and break through only when sealed. Stuck foes fall back to cell-by-cell walking; after 25 s stuck they fade.
- **Walls:** each wall spot builds 3 joined pieces (`p.pieces`). Each ramp has a sealing wall across its top and
  a free-standing "funnel" wall in the lowland that foes walk around. Cost 3/6/11.
- **Upgrades:** tiers 1–2 show the building's name; from tier 2→3 the label says "Next Upgrade". Paying in full
  opens a 3-card menu (picture, name, one-line description, no stats; A/D, Space, Esc refunds). Troop carriers
  use the same menu to choose archers/knights/flailmen (all cost 13 at tier 1; 6/12/18 troops). Tier 4 (one
  upgrade of the chosen path) is the last tier; walls, fishing huts and carriers stop at tier 3.
- **Refunds:** walking away from a half-paid spot (or starting the night) sends every coin back to the rider
  with the dawn-income animation.
- **Waves:** a night is a queue of groups. Early on each group waits until the field is nearly clear.
  `diff.overlap` lets groups follow close behind on later lands; exact-same-moment groups only on Frostpine
  and Cinderreach late nights. Nights 1–2 have 15% more (weaker) foes.
- **Graphics:** High, Medium, Low, Very Low. Very Low keeps full resolution but turns off shadows, GTAO, bloom,
  tilt-shift, FXAA and particles, shows ~35% of trees and no grass, and uses a coarser terrain/water mesh.
- **Fonts:** Grenze Gotisch (blackletter: logo, banners, menu titles, land names, path-menu heading),
  Cormorant Garamond (everything else), Alegreya Sans (small key badges only).

## Balance reference (bot, last run)

- Idle (keep only) loses every land. Active bow wins all; keep dips to ~72–88% on lands 3–5.
- Defensive "stay" bow loses only Cinderreach's final night. Lance on Frostpine ~44% min keep.
- Rerun `node tools/bot.mjs 0,1,2,3,4 bow` (plus `idle` and `stay`) after any balance change.

## The user's working preferences

- State assumptions first; if a request could mean several things, lay out the options; ask when unclear.
- Push back if there is a simpler approach or a problem with the plan.
- Minimal solutions: no unrequested features, abstractions or "improvements".
- Change only what the task needs; don't refactor, reword or delete unrelated parts.
- For bigger tasks define "done" up front and check the result against it.
- Visual direction: Thronefall-like "realistic but gloomy" feel, muted colours, no chimes, no bright icons,
  rounded/no hard edges on the rider, smooth lighting (no banding), small unobtrusive HUD.

## Open questions for the user

- Controls not yet implemented and awaiting the user's description: Command Units (V) and its toggle, Select All
  Army / Melee / Ranged / Heroes (1–4), Command One Unit Type (F), control groups (5–8), Show Build Options (C),
  Switch Colorscheme, and which mouse buttons map to Interact/Weapon Ability and Start Night.
- Whether the **Low** preset should also stop lowering resolution (it still renders at pixel ratio 1).

See `docs/HISTORY.md` for the full log of requests and what was done for each.
