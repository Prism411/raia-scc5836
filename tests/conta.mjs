import assert from 'node:assert/strict';
import fs from 'node:fs';
import { abrirNavegador, esperarPronta } from './navegador.mjs';

const url = process.argv[2] || 'http://127.0.0.1:8481/';
const saida = process.argv[3] || '.tmp/capturas/conta';
fs.mkdirSync(saida, { recursive: true });
const nome = 'Teste ' + Math.random().toString(36).slice(2, 7);
const browser = await abrirNavegador();
const erros = [];
const vigiar = p => { p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()); }); };
const ok = msg => console.log('  ✔ ' + msg);

const A = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pa = await A.newPage(); vigiar(pa);
await pa.goto(url); await esperarPronta(pa);
const chip = pa.locator('[data-raia-conta]');
assert.equal((await chip.innerText()).trim().toUpperCase(), 'ENTRAR'); ok('chip mostra ENTRAR para visitante anônimo');

await chip.click();
await pa.locator('#raia-conta-nome').fill(nome);
await pa.screenshot({ path: `${saida}/modal.png` });
await pa.locator('form[aria-label="Entrar na RAIA"] button[type=submit]').click();
await pa.waitForFunction(n => window.__raia.state.conta === n, nome);
assert.equal((await chip.innerText()).trim().toUpperCase(), 'SAIR');
assert.equal(await pa.evaluate(() => window.__raia.state.avatar.name), nome); ok('entrou; o nome virou o nome do nadador');

await pa.evaluate(() => { const r = window.__raia; r.setState({ avatar: { ...r.state.avatar, suitColor: '#7A5CFF', sigla: 'TST' } }); r.persistAvatar(); });
await pa.waitForTimeout(1500);
const eu = await pa.evaluate(() => fetch('/api/eu').then(r => r.json()));
assert.equal(eu.avatar.suitColor, '#7A5CFF'); ok('avatar salvo no servidor');

await pa.evaluate(() => window.__raia.go('arena')); await pa.waitForTimeout(1200);
await pa.evaluate(() => { const r = window.__raia; r.setState({ aCode: '50L', aSex: 'M', aPool: 50, aMode: 'final', aComp: 'InterUSP', aYear: 2026, aTime: '25.80', aNoise: false }); r.after(() => { r.prepareRace(); r.arena.setSpeed(4); r.startRace(); }); });
await pa.waitForFunction(() => window.__raia.state.raceState === 'finished', null, { timeout: 90000 });
await pa.waitForTimeout(1200);
await pa.evaluate(() => window.__raia.setDockTab('rank'));
await pa.waitForFunction(n => document.body.innerText.includes(n + ' (você)') && document.body.innerText.includes('RANKING DOS VISITANTES'), nome, { timeout: 10000 }).catch(async e => { await pa.screenshot({ path: `${saida}/ranking-falhou.png` }); throw e; });
await pa.screenshot({ path: `${saida}/ranking.png` });
const rk = await pa.evaluate(() => fetch('/api/ranking?code=50L&sex=M&pool=50').then(r => r.json()));
assert.ok(rk.eu && Math.abs(rk.eu.time - 25.8) < 0.05, 'tempo no ranking: ' + JSON.stringify(rk.eu)); ok(`corrida entrou no ranking (${rk.eu.pos}º, ${rk.eu.time})`);

await pa.reload(); await esperarPronta(pa);
assert.equal(await pa.evaluate(() => window.__raia.state.conta), nome);
assert.equal(await pa.evaluate(() => window.__raia.state.avatar.suitColor), '#7A5CFF'); ok('recarregar mantém sessão e nadador');

const B = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pb = await B.newPage(); vigiar(pb);
await pb.goto(url); await esperarPronta(pb);
await pb.locator('[data-raia-conta]').click();
await pb.locator('#raia-conta-nome').fill(nome.toUpperCase());
await pb.locator('form[aria-label="Entrar na RAIA"] button[type=submit]').click();
await pb.waitForFunction(() => /dono/.test(document.querySelector('[role=alert]')?.textContent || ''));
await pb.screenshot({ path: `${saida}/nome-tomado-celular.png` });
ok('outro aparelho recebe "nome já tem dono"');
await pb.keyboard.press('Escape');

await pa.locator('[data-raia-conta]').click();
await pa.waitForFunction(() => window.__raia.state.conta === null);
await pa.locator('[data-raia-conta]').click();
await pa.locator('#raia-conta-nome').fill(nome);
await pa.locator('form[aria-label="Entrar na RAIA"] button[type=submit]').click();
await pa.waitForFunction(n => window.__raia.state.conta === n, nome);
ok('sair e voltar com o mesmo nome no mesmo aparelho');

await browser.close();
const relevantes = erros.filter(e => !/status of 409/.test(e));
if (relevantes.length) { console.log('erros:', relevantes); process.exit(1); }
console.log(`conta ok (${nome})`);
