// Renders every building tier, unit and enemy model in rows, by day.
import { open } from './harness.mjs';
const t = await open({ width: 1600, height: 900 });
const { page } = t;
await page.evaluate(() => { DH.buildLevel(0, { weapon: 'bow', perks: [], muts: [] }); });
const rows = {
  a: ['castle1', 'castle2', 'castle3a', 'castle3b', 'castle3c'],
  b: ['cottage1', 'cottage2', 'cottage3a', 'cottage3b', 'cottage3c', 'farm1', 'farm2', 'farm3', 'farm3b', 'farm3c'],
  c: ['mine1', 'mine2', 'mine3a', 'mine3b', 'mine3c', 'tower1', 'tower2', 'tower3a', 'tower3b', 'tower3c'],
  d: ['archers1', 'archers2', 'archers3', 'knights1', 'knights2', 'knights3', 'flail1', 'flail2', 'flail3'],
  f: ['fish1', 'fish2', 'fish3', 'wall1', 'wall2', 'wall3', 'shrine_spring', 'shrine_locked', 'plot_fishing'],
  e: ['hero_bow', 'ally_archer', 'ally_knight', 'ally_flail', 'foe_gnawling', 'foe_raider', 'foe_slinger', 'foe_javelineer', 'foe_howler', 'foe_shieldbearer', 'foe_sapper', 'foe_gloomwing'],
  h: ['castle4a', 'castle4b', 'castle4c', 'cottage4a', 'cottage4b', 'cottage4c', 'farm4a', 'farm4b', 'farm4c'],
  i: ['mine4a', 'mine4b', 'mine4c', 'tower4a', 'tower4b', 'tower4c', 'plot_wall', 'plot_castle'],
  g: ['foe_wraith', 'foe_hexer', 'foe_splitter', 'foe_brute', 'foe_troll', 'foe_ram', 'foe_catapult', 'foe_warlord', 'foe_colossus'],
};
for (const [name, list] of Object.entries(rows)) {
  await page.evaluate(({ list, name }) => {
    const { G, makeModel, scene, camera } = DH;
    G.mode = 'gallery';
    for (const c of [...G.ent.children]) G.ent.remove(c);
    const sp = name === 'a' ? 9 : name === 'h' || name === 'i' ? 6.6 : name === 'e' ? 2.4 : name === 'g' ? 3.6 : 5.2;
    list.forEach((k, i) => { const o = makeModel(k), x = (i - (list.length - 1) / 2) * sp; o.position.set(x, DH.World.height(x, 0), 0); if (name === 'e' || name === 'g') o.rotation.y = -0.6; else o.scale.setScalar(0.85); G.ent.add(o); });
    window.__galleryCam = { d: name === 'a' ? 32 : name === 'h' || name === 'i' ? 58 : name === 'e' ? 20 : name === 'g' ? 26 : 34, y: name === 'a' || name === 'h' ? 3 : 1.2 };
  }, { list, name });
  await page.evaluate(() => {
    DH.Cam.update = function () { const c = window.__galleryCam, h = DH.World.height(0, 0); DH.camera.position.set(0, h + c.d * 0.55, c.d); DH.camera.lookAt(0, h + c.y, 0); };
  });
  await t.frames(3);
  await t.shot('gallery-' + name);
}
console.log(t.errors.length ? 'CONSOLE:\n' + [...new Set(t.errors)].slice(0, 20).join('\n') : 'no console errors');
await t.close();
