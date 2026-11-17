// Plays whole levels headlessly with a simple builder bot. Usage: node tools/bot.mjs <levels> [weapon] [idle]
import { open } from './harness.mjs';

const levels = (process.argv[2] || '0').split(',').map(Number);
const weapon = process.argv[3] || 'bow';
const mode = process.argv[4] || 'active', idle = mode === 'idle', stay = mode === 'stay';
const t = await open({ width: 800, height: 500 });
const { page } = t;
await page.evaluate(() => DH.renderer.setAnimationLoop(null));

for (const li of levels) {
  const t0 = Date.now();
  const res = await page.evaluate(({ li, weapon, idle, stay }) => {
    const { G, LEVELS, BUILD, FOES } = DH;
    DH.buildLevel(li, { weapon, perks: [], muts: [] });
    G.paused = true;
    const L = LEVELS[li], log = [];
    const pickBranch = (p, n) => (p.type === 'cottage' || p.type === 'farm' || p.type === 'mine' ? 0 : (G.plots.indexOf(p) + (p.type === 'barracks' ? 0 : 1)) % n);
    const laneDist = (p, li2) => G.lanes[li2].dist(p.x, p.z);
    function build() {
      if (!G.castle.alive && G.castle.tier === 0) DH.instantBuild(G.castle, 0);      // the keep comes first, even when idle
      if (idle) return;
      const nightsLeft = L.nights - G.day + 1;
      const next = G.nights[G.day - 1];
      const active = next ? next.lanes : [];
      for (let guard = 0; guard < 80; guard++) {
        let best = null, bs = -Infinity, bi = 0;
        for (const p of G.plots) {
          if (p.destroyed) continue;
          const opts = DH.tierOptions(p); if (!opts.length) continue;
          const oi = opts.length > 1 ? pickBranch(p, opts.length) : 0, o = opts[oi], cost = o.cost - p.paid;
          if (cost > G.coins) continue;
          let s = -1;
          const B = BUILD[p.type];
          if (B.eco) {
            const gain = o.income - (p.def ? p.def.income : 0);
            s = (gain * (nightsLeft - 1)) / o.cost - 0.9;
          } else {
            const near = active.length ? Math.min(...active.map(l => laneDist(p, l))) : 99;
            const onLane = near < 8 ? 1 : 0.3;
            const dc = Math.hypot(p.x, p.z);
            if (p.type === 'tower') s = (p.tier === 0 ? 1.4 : 0.8) * onLane - dc * 0.008;
            if (p.type === 'wall') s = (p.tier === 0 ? 1.0 : 0.55) * onLane - dc * 0.01;
            if (p.type === 'barracks') s = (p.tier === 0 ? 1.1 : 0.6) * onLane;
            if (p.type === 'castle') s = G.day > 2 ? 1.6 : 0.2;
            s += G.day * 0.05;
          }
          if (s > bs) { bs = s; best = p; bi = oi; }
        }
        if (!best || bs < 0) break;
        DH.instantBuild(best, bi);
      }
    }
    if (idle) G.autopilot = () => [0, 0];
    else {
      G.autoAbility = true;
      G.autopilot = h => {
        let tgt = null, bd = Infinity;
        for (const e of G.enemies) { if (!e.alive) continue; const d = Math.hypot(e.x, e.z); if (d < bd) { bd = d; tgt = e; } }
        if (stay && tgt && Math.hypot(tgt.x, tgt.z) > 12) tgt = null;
        let tx = tgt ? tgt.x : 0, tz = tgt ? tgt.z : 6;
        const wet = (ax, az, bx, bz) => { for (let k = 1; k < 20; k++) { const x = ax + (bx - ax) * k / 20, z = az + (bz - az) * k / 20; if (!DH.World.walkable(x, z)) return true; } return false; };
        if (wet(h.x, h.z, tx, tz) && DH.World.bridges.length) {
          let bb = null, bc = Infinity;
          for (const br of DH.World.bridges) for (const [ax, az, bx, bz] of [[br.x1, br.z1, br.x2, br.z2], [br.x2, br.z2, br.x1, br.z1]]) {
            const c = Math.hypot(ax - h.x, az - h.z) + Math.hypot(bx - tx, bz - tz); if (c < bc) { bc = c; bb = [ax, az, bx, bz]; }
          }
          const onBridge = DH.World.bridges.some(br => Math.hypot(h.x - (br.x1 + br.x2) / 2, h.z - (br.z1 + br.z2) / 2) < Math.hypot(br.x2 - br.x1, br.z2 - br.z1) / 2 + 0.5);
          if (onBridge || Math.hypot(bb[0] - h.x, bb[1] - h.z) < 1.2) { tx = bb[2]; tz = bb[3]; } else { tx = bb[0]; tz = bb[1]; }
        }
        const dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz);
        if (d < (tgt ? 1.2 : 1)) return [0, 0];
        return [dx / d, dz / d];
      };
    }
    const dt = 1 / 60;
    let steps = 0, minKeep = 1, nightMin = 1, lostAt = 0, stall = '';
    const nightLog = [];
    while (G.phase !== 'won' && G.phase !== 'lost' && steps < 60 * 60 * 60) {
      if (G.phase === 'day') {
        build();
        log.push({ day: G.day, coins: G.coins, keep: Math.round(G.castle.hp), built: G.plots.filter(p => p.tier > 0).length });
        if (G.day > 1) nightLog.push(`${Math.round(nightMin * 100)}%/${G.stats.lost - lostAt}`);
        nightMin = 1; lostAt = G.stats.lost;
        DH.callNight();
      }
      DH.update(dt); steps++;
      if (G.phase === 'night' && G.phaseT > 300 && !stall) {             // a night that never ends: report who is stuck where
        stall = G.enemies.filter(e => e.alive).slice(0, 8).map(e => `${e.type}@${e.x.toFixed(1)},${e.z.toFixed(1)} y${e.y.toFixed(1)} d${Math.round(DH.Nav.sample(e.x, e.z))} tg:${e.target ? e.target.kind + (e.target.type || '') : '-'} blk:${e.nav && e.nav.block ? e.nav.block.type : ''} dir:${e.nav ? e.nav.x.toFixed(2) + ',' + e.nav.z.toFixed(2) : ''} near:${G.blockers.filter(b => (b.wall ? DH.segDist(e.x, e.z, b.x1, b.z1, b.x2, b.z2) : Math.hypot(e.x - b.x, e.z - b.z) - b.r) < 1.6).map(b => b.plot.type).join('+')} rock:${DH.Coll.hits(e.x, e.z, e.r)} step:${e.nav ? DH.World.canStep(e.x, e.z, e.x + e.nav.x * 0.1, e.z + e.nav.z * 0.1) : ''}`).join(' | ') + ` sched ${G.schedule.length} spawners ${G.spawners.length}`;
      }
      const kf = G.castle.hp / G.castle.maxHp; if (kf < nightMin) nightMin = kf; if (kf < minKeep) minKeep = kf;
      for (const tm of G.timers) if (tm.t > 5) tm.t = 0;
    }
    const nightLen = [];
    nightLog.push(`${Math.round(nightMin * 100)}%/${G.stats.lost - lostAt}`);
    return { stall, minKeep, nightLog, phase: G.phase, night: G.night, steps, stats: G.stats, keep: Math.round(G.castle.hp), coins: G.coins, log,
      tiers: G.plots.map(p => p.type + p.tier).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {}), troops: G.allies.length };
  }, { li, weapon, idle, stay });
  console.log(`L${li} ${DH_name(li)} [${weapon}, ${mode}] -> ${res.phase} at night ${res.night}, min keep ${Math.round(res.minKeep * 100)}%, ${(res.steps / 60).toFixed(0)}s sim in ${((Date.now() - t0) / 1000).toFixed(1)}s, keep ${res.keep}, kills ${res.stats.kills}, built ${res.stats.built}, lost ${res.stats.lost}, earned ${res.stats.earned}, troops ${res.troops}`);
  console.log('   nights (min keep / buildings lost): ' + res.nightLog.join(' '));
  if (res.stall) console.log('   STALL: ' + res.stall);
}
function DH_name(li) { return ['Mossmere', 'Twin Fords', 'Amberwood', 'Frostpine', 'Cinderreach'][li]; }
console.log(t.errors.length ? 'CONSOLE:\n' + [...new Set(t.errors)].slice(0, 20).join('\n') : 'no console errors');
await t.close();
