import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [a, b, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const linhas = [];
for (const f of fs.readdirSync(a).filter(f => f.endsWith('.png')).sort()) {
  if (!fs.existsSync(path.join(b, f))) { linhas.push([f, 'faltando']); continue; }
  const A = PNG.sync.read(fs.readFileSync(path.join(a, f)));
  const B = PNG.sync.read(fs.readFileSync(path.join(b, f)));
  if (A.width !== B.width || A.height !== B.height) { linhas.push([f, 'tamanho diferente']); continue; }
  const D = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, D.data, A.width, A.height, { threshold: 0.1 });
  fs.writeFileSync(path.join(out, f), PNG.sync.write(D));
  linhas.push([f, (100 * n / (A.width * A.height)).toFixed(2) + '%']);
}
for (const [f, v] of linhas) console.log(v.padStart(9), f);
