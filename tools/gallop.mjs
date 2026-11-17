// Close-up frame strip of the rider galloping and sprinting: shots/gallop.png
import { open, root } from './harness.mjs';
import path from 'node:path';
const t = await open({ width: 480, height: 360 });
const { page } = t;
await page.evaluate(() => { DH.renderer.setAnimationLoop(null); DH.applyQuality('medium'); });
await page.evaluate(() => { DH.UI.closeScreen(); DH.buildLevel(0, { weapon: 'bow', perks: [], muts: [] }); });
const shots = [];
for (const [label, sprint] of [['canter', false], ['sprint', true]]) {
  await page.evaluate(sprint => {
    const G = DH.G; G.hero.x = -5; G.hero.z = 6; G.autopilot = () => [1, 0.0001]; G.autoSprint = sprint; G.hero.stamina = 1;
    for (let i = 0; i < 50; i++) DH.update(1 / 60);
    DH.Cam.zoom = DH.Cam.goal = 0.32;
  }, sprint);
  for (let f = 0; f < 6; f++) {
    await page.evaluate(() => { for (let i = 0; i < 3; i++) DH.update(1 / 60); DH.Cam.snap(DH.G.hero.x, DH.G.hero.z); DH.renderFrame(1 / 20); });
    const file = path.join(root, 'shots', `gallop-${label}-${f}.png`);
    await page.screenshot({ path: file, clip: { x: 120, y: 60, width: 240, height: 240 } }); shots.push(file);
  }
}
console.log(t.errors.length ? 'CONSOLE:\n' + [...new Set(t.errors)].slice(0, 20).join('\n') : 'no console errors');
await t.close();
