// Shared Playwright harness: serves dist/duskhold.html, maps the Three.js CDN to node_modules, collects console errors.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export async function open({ width = 1400, height = 860, query = '?noauto' } = {}) {
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end(fs.readFileSync(path.join(root, 'dist', 'duskhold.html')));
  });
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GPU stall due to ReadPixels')) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + (e.stack || e)));
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', route => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.160.0/', '');
    route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'application/javascript' });
  });
  // fonts come from a local copy (tools/fonts) so screenshots show the real typefaces without network access
  const fontDir = path.join(root, 'tools/fonts');
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ path: path.join(fontDir, 'fonts.css'), contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', route => {
    const f = path.join(fontDir, new URL(route.request().url()).pathname.split('/').pop());
    if (fs.existsSync(f)) route.fulfill({ path: f, contentType: 'font/woff2' }); else route.fulfill({ status: 404, body: '' });
  });
  await page.goto(`http://127.0.0.1:${port}/${query}`);
  await page.waitForFunction(() => window.DH, null, { timeout: 120000 });
  return {
    page, errors,
    async frames(n = 3) {
      await page.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
    },
    async shot(name) { await page.screenshot({ path: path.join(root, 'shots', name + '.png') }); },
    async close() { await browser.close(); server.close(); },
  };
}
