# Duskhold – request history

A record of what the user asked for and what was built, in order. Newest at the bottom.

## Origins

- The user asked for a full recreation of Thronefall from their installed copy. Declined: no decompiling or
  extracting another game's code or assets. Instead built Duskhold, an original game inspired by Thronefall,
  as a single HTML file (the same approach as their `nodebuster-remake` repo).
- Big overhaul (with screenshots): Thronefall-like camera and readability, a hub island where the rider picks
  a land at gates, 5 biome lands (Mossmere, Twin Fords, Amberwood, Frostpine Reach, Cinderreach).
  Answers given: Shift sprints, right-click uses the weapon ability, 36 perks influenced by the Thronefall wiki,
  XP bonus per modifier, Thronefall-like levelling, quests unlock weapons, perks and modifiers.
- "Space is used for nearly anything" (interact at a spot, otherwise the ability).
- Smooth lighting: no visible boxes or bands of light on the ground (smooth toon ramp, no hard shadow edges).

## Look and feel

- Icons: first darker one-colour circles; final spec = simple low-detail shapes in one muted tan, muted circle
  backgrounds (perks green, weapons blue, punishments/modifiers red), thick darkish ring on every icon.
- Enemy indicators: no translucent backing, no arrow; black circle, red outline, tan enemy glyph inside.
- "Realistic but gloomy" Thronefall feeling: muted palettes, more landscape contrast, no chimes, no bright icons.
- Rider: circular horse legs, whole asset rounded with no hard edges.
- Chest in the bottom-right: open, lid angled to the right, much higher quality; smaller coin-count text.
- Removed: minimap; the day/night counter top-left; the top "boss bar" (it was the keep's health) – the keep's
  bar now shows only once it is damaged.
- Health bars for every building and enemy: rounded rectangle with a red fill.
- Lock-on indicator for bow aim (Alt); enemies coloured a muted red.
- Controls per the user's Thronefall controls screenshots; hold B for 3 s to start the night ("NIGHT IN Xs").
- Coin slots: closer together, thinner rings, outer two coins of each row droop, rows slightly closer.

## "Improve the game" pass

- Better map selection and HUD; much more enemy variety (17 foes) with better textures, behaviours and
  wind-up/strike attack animations for foes, troops and the rider.
- Thronefall-like towers and houses; tier 3 branches into 3 choices for every building except fishing huts,
  walls and troop carriers; menus not crowded with text.
- Troop carriers giving 6/12/18 troops: archers, knights, AOE spinning flailmen.
- Thorough pricing balance using the bot.

## Title screen and font

- Title screen modelled on Thronefall's (dark speckled field, own crown emblem, "Duskhold" in blackletter
  between ‹ › chevrons, Play / Settings / About / Quit row). Quit can't close a tab it didn't open, so it shows
  a farewell screen.
- Archaic medieval font across the game: blackletter for display text, Cormorant Garamond for body text (offered
  to switch everything to blackletter; not taken up).
- Hub level box top-right, small, no progress bar ("Level N ♛ done/total" quests). HUD shrunk ~10%.

## Plateau maps, pathfinding and economy (big batch)

Clarifications asked and answered: two waves "almost NEVER" at once; tier 3 = branch then tier 4 upgrades the
chosen path; walls make foes walk round, breaking through only when sealed; map shape "one front, then more".
- Early foes less tanky (raider 36→27, gnawling 14→11, slinger 26→20, javelineer 32→26, howler 44→34,
  shieldbearer 95→72); Mossmere shieldbearers from night 5, brutes night 6.
- Trees no longer collide. Flow-field pathfinding around walls and buildings.
- Walls: 3 pieces per spot, placed around the main area (ramp tops and lowland), cheaper (3/6/11).
  Cottages cheaper (2/5/10/15).
- Night a little brighter.
- One group at a time early, slightly more foes on nights 1–2; overlap only on later lands; simultaneous
  spawns only on the last lands.
- Maps more one-way: keep and town on a plateau with cliffs; short ramps; rider can drop off any edge.
- Horse shorter and stockier ("Thronefall's fat horse").
- Half-paid upgrades refund fully on walking away, with the dawn collection animation.
- "Next Upgrade" label from tier 3; paying opens a small menu of 3 path cards with short descriptions, no stats.
- Keep must be bought first; costs 5; start with 15.
- Tier 4 is the max for almost all buildings (15 new tier-4 models).
- Enemy edge markers were possibly pointing the wrong way; now placed by true world direction.
- Found along the way: camera now follows ground height; hexers no longer heal each other; stuck-foe safety net.

## Later

- Very Low graphics preset that doesn't blur: no particles, fewer trees, no grass, no shadows/post effects,
  coarser terrain, full resolution kept.
- Q: which fonts? Grenze Gotisch, Cormorant Garamond, Alegreya Sans.
- The same "plateau/pathfinding" request was sent again; it was already in the build, so the latest file was
  re-sent and the user was asked whether something specific had failed.
- The user created this repository and asked for everything plus the context to be pushed here. The session's
  container had been reset, losing the local working copy. The test tools were rebuilt from the session
  transcript (six test scripts could not be recovered); the game source is restored from the last built
  `dist/duskhold.html` (its `// ---- NN-name.js` markers split it back into `src/`).
