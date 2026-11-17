// Stitches src/ into one self-contained page: dist/duskhold.html
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(root, 'src');
const parts = fs.readdirSync(src).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
const js = parts.map(f => `// ---- ${f}\n` + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
const html = fs.readFileSync(path.join(src, 'head.html'), 'utf8') + js + '\n' + fs.readFileSync(path.join(src, 'tail.html'), 'utf8');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'duskhold.html'), html);
console.log(`dist/duskhold.html  ${(html.length / 1024).toFixed(0)} KB  from ${parts.length} parts`);
