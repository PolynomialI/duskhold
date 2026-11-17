// End-to-end flow with real input: title -> hub -> shrine -> loadout -> level -> build/upgrade -> night -> pause -> victory/defeat.
import { open } from './harness.mjs';

const t = await open();
const { page } = t;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) process.exitCode = 1; };
const sim = (sec, fn = '') => page.evaluate(([sec, fn]) => { const f = fn ? new Function(fn) : null; for (let i = 0; i < Math.round(sec * 60); i++) { if (f) f(); DH.update(1 / 60); } }, [sec, fn]);
await page.evaluate(() => localStorage.clear());

// title -> hub
await t.frames(2);
await page.keyboard.press('Enter');
await t.frames(3);
ok(await page.evaluate(() => DH.G.mode === 'hub' && !DH.UI.modal), 'Play on the title screen leads to the hub');

// ride (teleport) to the first shrine and open the loadout with Space
await page.evaluate(() => { const s = DH.G.shrines[0]; DH.G.hero.x = s.x + 2.5; DH.G.hero.z = s.z + 2.5; });
await t.frames(3);
ok(await page.evaluate(() => !document.getElementById('hub-panel').classList.contains('hidden')), 'shrine panel shows near a shrine');
await page.keyboard.press('Space');
await t.frames(3);
ok(await page.evaluate(() => DH.UI.screenKind === 'loadout'), 'Space at the shrine opens the loadout');
ok(await page.evaluate(() => document.querySelectorAll('#screen .tile.locked').length >= 30), 'later weapons, perks and modifiers start locked');
ok(await page.evaluate(() => document.querySelectorAll('#screen .quest').length === 6), 'the land shows its six quests');
await t.shot('20-loadout');
await page.click('#screen .tile[data-key="perk:steed"]');
await page.hover('#screen .tile[data-key="perk:eagle"]');
ok(await page.evaluate(() => document.querySelector('#info h3').textContent === 'Eagle Eyes'), 'hovering a perk shows its description on the right');
await page.click('#screen .tile[data-key="mut:ironhide"]');
ok(await page.evaluate(() => DH.UI.loadoutState.perks.has('steed') && DH.UI.loadoutState.muts.has('ironhide')), 'clicking a perk and a modifier selects them');
await page.keyboard.press('Enter');
await page.waitForFunction(() => DH.G.mode === 'level', null, { timeout: 60000 });
await t.frames(3);
ok(await page.evaluate(() => DH.G.L.id === 'mossmere' && DH.G.loadout.perks.has('steed') && DH.G.loadout.muts.has('ironhide') && DH.G.hero.weapon === 'bow'), 'Enter sets out into Mossmere with the bow, the perk and the modifier');

// stop the real-time loop: drive the simulation by hand from here
await page.evaluate(() => { DH.renderer.setAnimationLoop(null); DH.G.paused = true; });

// the keep comes first: until it stands nothing else can be bought and the night cannot start
const keep0 = await page.evaluate(() => {
  const G = DH.G, c = G.plots.find(p => p.type === 'cottage');
  G.hero.x = c.x + c.fp + 0.6; G.hero.z = c.z; for (let i = 0; i < 5; i++) DH.update(1 / 60);
  const r = { coins: G.coins, focus: G.focus, keep: G.castle.alive };
  DH.callNight(); r.phase = G.phase;
  G.hero.x = 0; G.hero.z = 4.4; for (let i = 0; i < 5; i++) DH.update(1 / 60);
  r.keepFocus = G.focus === G.castle;
  DH.Input.keys.add('Space'); for (let i = 0; i < 90; i++) DH.update(1 / 60); DH.Input.keys.delete('Space'); for (let i = 0; i < 40; i++) DH.update(1 / 60);
  r.built = G.castle.alive; r.after = G.coins;
  return r;
});
ok(keep0.coins === 15 && !keep0.keep && keep0.focus === null && keep0.phase === 'day', 'a land starts with 15 coins, no keep, nothing else to buy and no night');
ok(keep0.keepFocus && keep0.built && keep0.after === 10, `the keep costs 5 and is bought like any spot (${keep0.coins} -> ${keep0.after})`);

// hold-to-build: stand at a cottage spot and hold Space
const before = await page.evaluate(() => {
  const G = DH.G, p = G.plots.find(p => p.type === 'cottage');
  G.hero.x = p.x + p.fp + 0.6; G.hero.z = p.z; G.coins = 20; window.__p = p;
  DH.Input.keys.add('Space');
  return { coins: G.coins, tier: p.tier };
});
await sim(1.5);
const mid = await page.evaluate(() => ({ coins: DH.G.coins, tier: __p.tier, focus: DH.G.focus === __p, flying: DH.Coins.list.filter(c => c.st === 'spend').length, slots: __p.fillT.filter(x => x !== undefined).length + (__p.tier ? 4 : 0) }));
await sim(1.0, "DH.Input.keys.delete('Space')");
const built = await page.evaluate(() => ({ coins: DH.G.coins, tier: __p.tier, alive: __p.alive, model: __p.obj && __p.obj.parent != null }));
ok(mid.focus, 'standing at the spot focuses it');
ok(mid.slots >= 1, 'paid coins land in the coin slots above the spot');
ok(built.tier === 1 && built.alive && built.model, `holding Space paid ${before.coins - built.coins} coins and built a cottage`);
ok(before.coins - built.coins === 2, 'the cottage cost exactly its price (2)');

// a hold that finishes one tier does not run straight on into the next
const held = await page.evaluate(() => {
  const G = DH.G, p = G.plots.filter(p => p.type === 'cottage')[1];
  G.hero.x = p.x + p.fp + 0.6; G.hero.z = p.z; G.coins = 30; DH.Input.keys.add('Space');
  for (let i = 0; i < 180; i++) DH.update(1 / 60);
  DH.Input.keys.delete('Space'); for (let i = 0; i < 30; i++) DH.update(1 / 60);
  const r = { tier: p.tier, paid: p.paid, coins: G.coins };
  G.hero.x = __p.x + __p.fp + 0.6; G.hero.z = __p.z; for (let i = 0; i < 10; i++) DH.update(1 / 60);
  return r;
});
ok(held.tier === 1 && held.paid === 0 && held.coins === 28, 'one long hold builds a single tier, then waits for a fresh press');
await page.evaluate(() => DH.Input.keys.add('Space'));
await sim(1.5);
await page.evaluate(() => DH.Input.keys.delete('Space'));
await sim(1.0);
ok(await page.evaluate(() => __p.tier === 2 && __p.def.name === 'Homestead'), 'second hold upgrades to Homestead');

// tier three: the spot just says "Next Upgrade"; paying it opens the path menu, D steps to the second card, Space builds it
await page.evaluate(() => { DH.G.coins = 30; for (let i = 0; i < 3; i++) DH.update(1 / 60); });
ok(await page.evaluate(() => DH.tierOptions(__p).length === 3 && document.querySelector('#plot-ui .name').textContent === 'Next Upgrade'), 'a tier-two house offers three paths behind a single "Next Upgrade"');
await page.evaluate(() => DH.Input.keys.add('Space'));
await sim(2.0);
await page.evaluate(() => DH.Input.keys.delete('Space'));
await sim(0.3);
ok(await page.evaluate(() => DH.UI.screenKind === 'paths' && document.querySelectorAll('#paths .card').length === 3 && __p.tier === 2), 'paying it in full opens the menu of three paths');
await page.evaluate(() => { DH.G.paused = false; DH.renderFrame(0.016); DH.G.paused = true; });
await t.shot('21-path-menu');
await page.evaluate(() => { DH.Input.pressed.add('KeyD'); DH.UI.keys(); DH.Input.pressed.add('Space'); DH.UI.keys(); DH.update(1 / 60); });
ok(await page.evaluate(() => __p.tier === 3 && __p.def.name === 'Chapel' && !DH.UI.modal), 'D then Space picks the second path (Chapel)');
ok(await page.evaluate(() => { const o = DH.tierOptions(__p); return o.length === 1 && o[0].key === 'cottage4b' && !DH.tierOptions({ ...__p, tier: 4, def: o[0] }).length; }), 'each path has one fourth tier, the last (Chapel -> Abbey)');
await page.evaluate(() => { DH.G.paused = false; DH.renderFrame(0.016); });
await t.shot('21-built-panel');

// troop carriers: pick knights, get six; upgrading adds six more
const troops = await page.evaluate(() => {
  const G = DH.G, p = G.plots.find(p => p.type === 'barracks');
  G.coins = 200; const opts = DH.tierOptions(p);
  DH.instantBuild(p, 1); const a = p.units.length, kind = p.units[0] && p.units[0].unit;
  DH.instantBuild(p, 0); const b = p.units.length, next = DH.tierOptions(p).length;
  return { n: opts.length, a, b, kind, line: p.line, next };
});
ok(troops.n === 3 && troops.kind === 'knight' && troops.line === 'knight', 'a troop carrier offers archers, knights or flailmen');
ok(troops.a === 6 && troops.b === 12 && troops.next === 1, `knights come six at a time (${troops.a} then ${troops.b})`);

// walking away from a half-paid spot brings every coin back
const refund = await page.evaluate(() => {
  const G = DH.G, p = G.plots.filter(p => p.type === 'tower' && p.tier === 0)[1];
  G.hero.x = p.x + p.fp + 0.6; G.hero.z = p.z; G.coins = 3; DH.Input.keys.add('Space');
  for (let i = 0; i < 90; i++) DH.update(1 / 60);
  DH.Input.keys.delete('Space'); const paid = p.paid, mid = G.coins;
  G.hero.x += 10; for (let i = 0; i < 180; i++) DH.update(1 / 60);
  return { paid, mid, coins: G.coins, after: p.paid };
});
ok(refund.paid === 3 && refund.mid === 0 && refund.after === 0 && refund.coins === 3, 'walking away from a half-paid tower returns all 3 coins');

// not enough coins: payment stops, nothing is lost
const deny = await page.evaluate(() => {
  const G = DH.G, p = G.plots.find(p => p.type === 'tower' && p.tier === 0);
  G.hero.x = p.x + p.fp + 0.6; G.hero.z = p.z; G.coins = 3; window.__t = p; DH.Input.keys.add('Space');
  for (let i = 0; i < 120; i++) DH.update(1 / 60);
  DH.Input.keys.delete('Space'); for (let i = 0; i < 60; i++) DH.update(1 / 60);
  return { coins: G.coins, paid: p.paid, tier: p.tier };
});
ok(deny.coins === 0 && deny.paid === 3 && deny.tier === 0, 'with too few coins, paid coins stay in the slots while you stand there');
const resume = await page.evaluate(() => { const G = DH.G; G.coins = 10; DH.Input.keys.add('Space'); for (let i = 0; i < 90; i++) DH.update(1 / 60); DH.Input.keys.delete('Space'); for (let i = 0; i < 60; i++) DH.update(1 / 60); return { coins: G.coins, tier: __t.tier }; });
ok(resume.tier === 1 && resume.coins === 7, 'topping up later finishes the tower for the remaining 3 coins');

// walls: three pieces to a spot; the shadows walk round the lowland ones but must break the ones sealing the ramp
const walls = await page.evaluate(() => {
  const G = DH.G, w = G.plots.filter(p => p.type === 'wall'), rf = G.rifts[0];
  DH.Nav.update(); const open = DH.Nav.sample(rf.x, rf.z);
  G.coins = 100; const low = w.find(p => !p.seal); DH.instantBuild(low, 0); DH.Nav.update(); const funnel = DH.Nav.sample(rf.x, rf.z);
  for (const p of w) if (p.tier === 0) DH.instantBuild(p, 0); DH.Nav.update(); const sealed = DH.Nav.sample(rf.x, rf.z);
  return { pieces: w.every(p => p.pieces.length === 3), cost: DH.BUILD.wall.tiers[0].cost, open, funnel, sealed };
});
ok(walls.pieces && walls.cost === 3, 'every wall spot buys three joined pieces for 3 coins');
ok(walls.funnel - walls.open < 30 && walls.sealed - walls.open > 200, `foes path round the lowland wall (+${Math.round(walls.funnel - walls.open)}) and must break through the ramp wall (+${Math.round(walls.sealed - walls.open)})`);

// sprinting drains stamina
const st = await page.evaluate(() => { const G = DH.G; G.hero.x = 0; G.hero.z = 6; G.autopilot = () => [1, 0]; G.autoSprint = true; for (let i = 0; i < 60; i++) DH.update(1 / 60); const r = { stamina: G.hero.stamina, sprint: G.hero.sprinting }; G.autopilot = null; G.autoSprint = false; return r; });
ok(st.sprint && st.stamina < 0.85, `sprinting drains stamina (${st.stamina.toFixed(2)})`);

// call the night by holding B for three seconds, then check enemies spawn and drop collectable coins
await page.evaluate(() => { DH.G.hero.x = 0; DH.G.hero.z = 6; DH.G.hero.vx = DH.G.hero.vz = 0; for (let i = 0; i < 30; i++) DH.update(1 / 60); DH.Input.keys.add('KeyB'); });
await sim(1.5);
const early = await page.evaluate(() => DH.G.phase);
await page.evaluate(() => DH.Input.keys.delete('KeyB'));
await sim(0.2);
ok(early === 'day' && await page.evaluate(() => DH.G.holdNight === 0 && DH.G.phase === 'day'), 'letting go of B early cancels the countdown');
await page.evaluate(() => DH.Input.keys.add('KeyB'));
await sim(3.1);
await page.evaluate(() => DH.Input.keys.delete('KeyB'));
ok(await page.evaluate(() => DH.G.phase === 'dusk' || DH.G.phase === 'night'), 'holding B for three seconds calls the night');
await sim(6);
ok(await page.evaluate(() => DH.G.enemies.length > 0), 'enemies come out of the rift');
const drop = await page.evaluate(() => {
  const G = DH.G, e = G.enemies.find(e => e.alive);
  const c0 = G.coins; DH.Coins.drop(e.x, e.y, e.z, 3);
  G.hero.x = e.x + 1; G.hero.z = e.z; for (let i = 0; i < 120; i++) { G.hero.x = e.x + 1; G.hero.z = e.z; DH.update(1 / 60); }
  return G.coins - c0;
});
ok(drop >= 3, `dropped coins fly to the rider when close (+${drop})`);
await page.evaluate(() => { DH.G.paused = false; DH.renderFrame(0.016); });
await t.shot('22-night-fight');

// finish the night: survivors die, dawn pays income and rebuilds
const dawn = await page.evaluate(() => {
  const G = DH.G;
  for (let k = 0; k < 6000 && G.phase !== 'day'; k++) { G.schedule.length = 0; G.spawners.length = 0; for (const e of G.enemies) if (e.alive) { e.hp = 0; e.alive = false; e.dying = 0.01; } DH.update(1 / 60); }
  return { phase: G.phase, day: G.day };
});
ok(dawn.phase === 'day' && dawn.day === 2, 'clearing the night brings dawn and day 2');

// pause / settings via keyboard
await page.evaluate(() => { DH.G.paused = false; DH.renderer.setAnimationLoop(null); });
await page.keyboard.press('Escape');
await page.evaluate(() => DH.UI.keys());
ok(await page.evaluate(() => DH.UI.screenKind === 'pause' && DH.G.paused), 'Esc pauses');
ok(await page.evaluate(() => /Units:/.test(document.getElementById('screen').textContent) && document.querySelectorAll('#screen .tile[data-key^="perk:"]').length === 1), 'the pause screen lists the loadout and units');
await page.evaluate(() => DH.UI.act('settings'));
await page.evaluate(() => DH.UI.act('quality', 'medium'));
ok(await page.evaluate(() => DH.Save.data.settings.quality === 'medium'), 'quality setting changes and is saved');
await page.evaluate(() => { DH.UI.act('quality', 'high'); DH.UI.act('settings-back'); DH.UI.act('resume'); });
ok(await page.evaluate(() => !DH.UI.modal && !DH.G.paused), 'settings return to pause, then resume');

// victory on the last night
const win = await page.evaluate(() => {
  const G = DH.G; G.day = G.L.nights; DH.callNight();
  for (let k = 0; k < 9000 && G.phase !== 'won'; k++) { G.schedule.length = 0; G.spawners.length = 0; for (const e of G.enemies) if (e.alive) { e.hp = 0; e.alive = false; e.dying = 0.01; } DH.update(1 / 60); }
  for (let k = 0; k < 120; k++) DH.update(1 / 60);
  return { phase: G.phase, screen: DH.UI.screenKind, unlocked: DH.Save.data.unlocked, xp: DH.Save.data.xp };
});
ok(win.phase === 'won' && win.screen === 'victory', 'surviving the last night shows the victory screen');
ok(win.unlocked === 2 && win.xp > 0, `victory unlocks the next land and grants XP (${win.xp})`);
ok(await page.evaluate(() => DH.Save.data.unlocks.includes('weapon:lance') && DH.Save.data.quests.mossmere[0] && DH.Save.data.quests.mossmere[2]), 'quests complete and unlock their rewards (the Lance, Heavy Draw)');
await page.evaluate(() => DH.renderFrame(0.016));
await t.shot('23-victory');

// defeat
await page.evaluate(() => { DH.UI.closeScreen(); DH.G.paused = false; DH.buildLevel(1, { weapon: 'bow', perks: [], muts: [] }); DH.G.paused = true; });
const lose = await page.evaluate(() => {
  const G = DH.G; DH.instantBuild(G.castle, 0); DH.callNight();
  for (let k = 0; k < 300; k++) DH.update(1 / 60);
  DH.damage(G.castle, 1e6);
  for (let k = 0; k < 400; k++) DH.update(1 / 60);
  return { phase: G.phase, screen: DH.UI.screenKind };
});
ok(lose.phase === 'lost' && lose.screen === 'defeat', 'losing the hold shows the defeat screen');
await page.evaluate(() => DH.renderFrame(0.016));
await t.shot('24-defeat');
await page.evaluate(() => DH.UI.act('hub'));
await page.waitForFunction(() => DH.G.mode === 'hub', null, { timeout: 60000 });
ok(await page.evaluate(() => DH.G.shrines[1].open && !DH.G.shrines[2].open), 'back at the hub the second shrine is open');
console.log(t.errors.length ? 'CONSOLE:\n' + [...new Set(t.errors)].slice(0, 20).join('\n') : 'no console errors');
await t.close();
