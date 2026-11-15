import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirApp } from '../src/app.js';
import { validarNome, chaveNome, carregarLimites } from '../src/regras.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WEB = path.join(raiz, 'web');
let app;

before(async () => { app = await construirApp({ web: WEB, banco: ':memory:', cookieSeguro: false, limiteLogin: 1000, limiteEscrita: 1000 }); });
after(async () => { await app.close(); });

function guardar(pote, res) {
  for (const c of [].concat(res.headers['set-cookie'] || [])) {
    const [par] = c.split(';'); const i = par.indexOf('='); const k = par.slice(0, i), v = par.slice(i + 1);
    if (/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c) || v === '') delete pote[k]; else pote[k] = v;
  }
  return pote;
}
const cab = pote => ({ cookie: Object.entries(pote).map(([k, v]) => `${k}=${v}`).join('; ') });
async function req(pote, method, url, payload, extra = {}) {
  const res = await app.inject({ method, url, payload, headers: { ...cab(pote), ...extra } });
  guardar(pote, res); return res;
}

test('regras de nome', () => {
  assert.equal(validarNome('  Jader   Louis ').nome, 'Jader Louis');
  assert.ok(validarNome('a').erro);
  assert.ok(validarNome('x'.repeat(25)).erro);
  assert.ok(validarNome('<script>').erro);
  assert.ok(validarNome('Fulano porra').erro);
  assert.equal(chaveNome('João  Silva'), chaveNome('joao silva'));
});

test('limites de tempo vêm da base real', () => {
 const lim = carregarLimites(path.join(WEB, 'data', 'natacao.json'));
  assert.ok(lim['50L|M'] > 15 && lim['50L|M'] < 30, `50L M = ${lim['50L|M']}`);
  assert.ok(lim['400L|F'] > 200);
});

test('página, healthz e headers de segurança', async () => {
  const h = await app.inject({ url: '/healthz' });
  assert.equal(h.statusCode, 200);
  const r = await app.inject({ url: '/' });
  assert.equal(r.statusCode, 200);
  assert.match(r.body, /<x-dc>/);
  assert.match(r.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  const js = await app.inject({ url: '/js/core.js' });
  assert.match(js.headers['content-type'], /javascript/);
  const d = await app.inject({ url: '/data/natacao.json' });
  assert.equal(d.statusCode, 200);
  assert.equal((await app.inject({ url: '/../server/package.json' })).statusCode, 404);
});

test('sessão por nome: criar, reconhecer, sair e voltar no mesmo aparelho', async () => {
  const a = {};
  assert.equal((await req(a, 'GET', '/api/eu')).json().nome, null);
  const r = await req(a, 'POST', '/api/sessao', { nome: 'Marina Costa' });
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().nome, 'Marina Costa');
  assert.ok(a.raia_sid && a.raia_dev);
  assert.match([].concat(r.headers['set-cookie']).join('\n'), /HttpOnly/);
  assert.equal((await req(a, 'GET', '/api/eu')).json().nome, 'Marina Costa');
  await req(a, 'DELETE', '/api/sessao');
  assert.equal((await req(a, 'GET', '/api/eu')).json().nome, null);
  const volta = await req(a, 'POST', '/api/sessao', { nome: 'marina costa' });
  assert.equal(volta.statusCode, 200, 'o mesmo aparelho recupera o nome');
  assert.equal(volta.json().nome, 'Marina Costa');
});

test('nome tomado por outro aparelho devolve 409', async () => {
  const a = {}, b = {};
  assert.equal((await req(a, 'POST', '/api/sessao', { nome: 'Pedro' })).statusCode, 200);
  const r = await req(b, 'POST', '/api/sessao', { nome: 'PEDRO' });
  assert.equal(r.statusCode, 409);
  assert.match(r.json().erro, /dono/);
  assert.equal((await req(b, 'POST', '/api/sessao', { nome: 'Pédro' })).statusCode, 409, 'acento não burla');
  assert.equal((await req(b, 'POST', '/api/sessao', { nome: 'Pedro 2' })).statusCode, 200);
});

test('nome inválido devolve 400', async () => {
  const a = {};
  assert.equal((await req(a, 'POST', '/api/sessao', { nome: 'x' })).statusCode, 400);
  assert.equal((await req(a, 'POST', '/api/sessao', {})).statusCode, 400);
});

test('avatar e técnica salvos voltam no /api/eu', async () => {
  const a = {};
  await req(a, 'POST', '/api/sessao', { nome: 'Ana Lima' });
  const av = { name: 'Ana Lima', sigla: 'ANA', team: 'POLI', sex: 'F', suit: 'maio', headphones: true, height: 1.05 };
  assert.equal((await req(a, 'PUT', '/api/eu/avatar', { avatar: av })).statusCode, 200);
  const tec = { '50L': { rt: 0.7, boS: 3.1, split: [12.1, 13.4] } };
  assert.equal((await req(a, 'PUT', '/api/eu/tec', { tec })).statusCode, 200);
  const eu = (await req(a, 'GET', '/api/eu')).json();
  assert.deepEqual(eu.avatar, av);
  assert.deepEqual(eu.tec, tec);
  assert.equal((await req(a, 'PUT', '/api/eu/avatar', { avatar: { x: { y: { z: 1 } } } })).statusCode, 400, 'aninhado demais');
  assert.equal((await req(a, 'PUT', '/api/eu/tec', { tec: { '999X': {} } })).statusCode, 400, 'prova inexistente');
  assert.equal((await req({}, 'PUT', '/api/eu/avatar', { avatar: av })).statusCode, 401);
});

test('ranking: melhor tempo por visitante, posição e limites', async () => {
  const a = {}, b = {}, c = {};
  await req(a, 'POST', '/api/sessao', { nome: 'Rafa' });
  await req(b, 'POST', '/api/sessao', { nome: 'Bia' });
  await req(c, 'POST', '/api/sessao', { nome: 'Caio' });
  const base = { code: '50L', sex: 'M', pool: 50, comp: 'InterUSP', year: 2026, mode: 'final', place: 3, n: 10 };
  assert.equal((await req(a, 'POST', '/api/resultados', { ...base, time: 26.5 })).json().melhorou, true);
  assert.equal((await req(a, 'POST', '/api/resultados', { ...base, time: 27.9 })).json().melhorou, false);
  assert.equal((await req(a, 'POST', '/api/resultados', { ...base, time: 25.95 })).json().melhorou, true);
  await req(b, 'POST', '/api/resultados', { ...base, time: 24.4, place: 1 });
  await req(c, 'POST', '/api/resultados', { ...base, time: 30.12 });
  assert.equal((await req(a, 'POST', '/api/resultados', { ...base, time: 5 })).statusCode, 400, 'rápido demais');
  assert.equal((await req(a, 'POST', '/api/resultados', { ...base, time: 900 })).statusCode, 400, 'lento demais');
  assert.equal((await req(a, 'POST', '/api/resultados', { ...base, code: 'XX', time: 30 })).statusCode, 400);
  assert.equal((await req({}, 'POST', '/api/resultados', { ...base, time: 30 })).statusCode, 401);

  const r = (await req(c, 'GET', '/api/ranking?code=50L&sex=M&pool=50')).json();
  assert.deepEqual(r.top.map(l => [l.pos, l.nome, l.time]), [[1, 'Bia', 24.4], [2, 'Rafa', 25.95], [3, 'Caio', 30.12]]);
  assert.equal(r.eu.pos, 3);
  assert.equal(r.total, 3);
  const vazio = (await req({}, 'GET', '/api/ranking?code=50L&sex=F&pool=50')).json();
  assert.deepEqual(vazio.top, []);
  assert.equal(vazio.eu, null);
  assert.equal((await req({}, 'GET', '/api/ranking?code=50L&sex=X&pool=50')).statusCode, 400);
  assert.equal((await req({}, 'GET', '/api/ranking?code=50L&sex=M&pool=33')).statusCode, 400);
});

test('escrita de outra origem é recusada', async () => {
  const r = await app.inject({ method: 'POST', url: '/api/sessao', payload: { nome: 'Intruso' }, headers: { origin: 'https://malicioso.example', host: 'raia.jaderlouis.com.br' } });
  assert.equal(r.statusCode, 403);
  const ok = await app.inject({ method: 'POST', url: '/api/sessao', payload: { nome: 'Legitimo' }, headers: { origin: 'https://raia.jaderlouis.com.br', host: 'raia.jaderlouis.com.br' } });
  assert.equal(ok.statusCode, 200);
});

test('limite de tentativas de login', async () => {
  const app2 = await construirApp({ web: WEB, banco: ':memory:', cookieSeguro: false, limiteLogin: 3 });
  const codigos = [];
  for (let i = 0; i < 5; i++) codigos.push((await app2.inject({ method: 'POST', url: '/api/sessao', payload: { nome: 'Teste ' + i }, headers: { 'cf-connecting-ip': '203.0.113.9' } })).statusCode);
  await app2.close();
  assert.deepEqual(codigos, [200, 200, 200, 429, 429]);
});
