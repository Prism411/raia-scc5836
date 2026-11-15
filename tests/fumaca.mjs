import fs from 'node:fs';
import path from 'node:path';
import { abrirNavegador, esperarPronta } from './navegador.mjs';

const [url, saida, W = '1440', H = '900'] = process.argv.slice(2);
if (!url || !saida) { console.error('uso: node tests/fumaca.mjs <url> <pasta> [w] [h]'); process.exit(2); }
fs.mkdirSync(saida, { recursive: true });

const browser = await abrirNavegador();
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { let s = 42; Math.random = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; });
const page = await ctx.newPage();
const erros = [];
page.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
page.on('pageerror', e => erros.push('pageerror: ' + e.message));
page.on('response', r => { if (r.status() >= 400) erros.push(`http ${r.status()}: ${r.url()}`); });
page.on('requestfailed', r => erros.push('requestfailed: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));

const t0 = Date.now();
await page.goto(url, { waitUntil: 'load' });
await esperarPronta(page);
console.log(`carregou em ${Date.now() - t0} ms`);
const R2 = (await page.evaluate(() => Number(window.RAIA_RELEASE || 1))) >= 2;
console.log('release-' + (R2 ? 2 : 1));
const TABS = ['inicio', 'vestiario', 'arena', 'raiox', ...(R2 ? ['calc'] : []), 'obs', 'metodo'];
const SO_R2 = ['Calculadora', 'Perfis', 'Coordenadas', 'Combinações', 'Concentração'];

const foto = async nome => { await page.screenshot({ path: path.join(saida, nome + '.png') }); };
for (const t of TABS) {
  await page.evaluate(id => window.__raia.go(id), t);
  await page.waitForTimeout(t === 'obs' || t === 'raiox' ? 2500 : 1500);
  await foto(t);
}
const visoes = ['swarm', 'ridge', 'bump', 'matrix', ...(R2 ? ['pca', 'pc', 'chord', 'lorenz'] : [])];
await page.evaluate(() => window.__raia.go('obs')); await page.waitForTimeout(800);
if (!R2) {
  const txt = await page.evaluate(() => document.body.innerText);
  SO_R2.filter(l => txt.includes(l)).forEach(l => erros.push('release-1 mostra: ' + l));
  const vis = await page.evaluate(() => ['pca', 'pc', 'chord', 'lorenz'].filter(k => { const el = window.__raia.ref(k).current; return el && el.offsetParent !== null; }));
  vis.forEach(k => erros.push('release-1 mostra a visão: ' + k));
}
for (let i = 0; i < visoes.length; i += 2) {
  await page.evaluate(([a, b]) => { window.__raia.setState({ oA: a, oB: b }); window.__raia.after(() => window.__raia.activate('obs')); }, [visoes[i], visoes[i + 1]]);
  await page.waitForTimeout(2200);
  await foto(`obs-${visoes[i]}-${visoes[i + 1]}`);
}
const raio = ['fita', 'passagens', 'parciais', 'breakouts', 'velocidade', 'srdps', 'bracadas', 'perda'];
await page.evaluate(() => window.__raia.go('raiox')); await page.waitForTimeout(800);
for (let i = 0; i < raio.length; i += 2) {
  await page.evaluate(([a, b]) => { window.__raia.setState({ rA: a, rB: b }); window.__raia.after(() => window.__raia.activate('raiox')); }, [raio[i], raio[i + 1]]);
  await page.waitForTimeout(2200);
  await foto(`raiox-${raio[i]}-${raio[i + 1]}`);
}
if (R2) {
await page.evaluate(() => window.__raia.go('calc')); await page.waitForTimeout(1200);
for (const m of ['media', 'todos']) {
  await page.evaluate(m => { window.__raia.setState({ cMode: m }); window.__raia.after(() => window.__raia.activate('calc')); }, m);
  await page.waitForTimeout(2000);
  await foto('calc-' + m);
}
}
await page.evaluate(() => window.__raia.go('arena')); await page.waitForTimeout(1500);
await page.evaluate(() => { const r = window.__raia; r.arena.setSpeed(4); r.setState({ speed: 4 }); r.startRace(); });
await page.waitForFunction(() => window.__raia.state.raceState === 'finished', null, { timeout: 90000 });
await page.waitForTimeout(1500);
await foto('arena-final');
const resultado = await page.evaluate(() => (window.__raia.state.results || []).map(r => `${r.place} ${r.name} ${r.time}`));
console.log('resultado:', resultado.slice(0, 3).join(' | '));

fs.writeFileSync(path.join(saida, 'erros.txt'), erros.join('\n'));
console.log(`erros: ${erros.length}`); erros.slice(0, 15).forEach(e => console.log('  ' + e));
await browser.close();
process.exitCode = erros.length ? 1 : 0;
