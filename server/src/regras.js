import fs from 'node:fs';

export const PROVAS = ['50L', '50C', '50P', '50B', '100L', '100M', '200L', '400L', '4x50L', '4x50M'];
const COMPETICOES = ['InterUSP', 'TUSCA'];

const BLOQUEADOS = ['porra', 'caralho', 'buceta', 'cuzao', 'viado', 'puta', 'merda', 'fdp', 'nazi', 'hitler', 'arrombad', 'piroca', 'xoxota', 'retardad', 'macaco'];

export function normalizarNome(nome) {
  return String(nome || '').normalize('NFC').replace(/\s+/g, ' ').trim();
}
export function chaveNome(nome) {
  return normalizarNome(nome).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function validarNome(bruto) {
  const nome = normalizarNome(bruto);
  if (nome.length < 2) return { erro: 'Use pelo menos 2 caracteres.' };
  if (nome.length > 24) return { erro: 'Use no máximo 24 caracteres.' };
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u.test(nome)) return { erro: 'Use só letras, números, espaço e . _ \' -' };
  const chave = chaveNome(nome).replace(/[^a-z0-9]/g, '');
  if (BLOQUEADOS.some(b => chave.includes(b))) return { erro: 'Escolha outro nome.' };
  return { nome, chave: chaveNome(nome) };
}

function objetoSimples(v, maxChaves, profundidade = 0) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const chaves = Object.keys(v);
  if (chaves.length > maxChaves) return false;
  return chaves.every(k => {
    if (k.length > 40 || k === '__proto__' || k === 'constructor' || k === 'prototype') return false;
    const x = v[k];
    if (x === null || typeof x === 'boolean') return true;
    if (typeof x === 'number') return Number.isFinite(x);
    if (typeof x === 'string') return x.length <= 120;
    if (Array.isArray(x)) return x.length <= 64 && x.every(e => (typeof e === 'number' && Number.isFinite(e)) || (typeof e === 'string' && e.length <= 40));
    if (typeof x === 'object' && profundidade < 1) return objetoSimples(x, 40, profundidade + 1);
    return false;
  });
}
export function validarAvatar(av) {
  if (!objetoSimples(av, 80)) return null;
  const s = JSON.stringify(av);
  return s.length <= 8192 ? s : null;
}
export function validarTec(tec) {
  if (!tec || typeof tec !== 'object' || Array.isArray(tec)) return null;
  const chaves = Object.keys(tec);
  if (chaves.length > PROVAS.length || !chaves.every(k => PROVAS.includes(k) && objetoSimples(tec[k], 40))) return null;
  const s = JSON.stringify(tec);
  return s.length <= 16384 ? s : null;
}

export function carregarLimites(arquivoDados) {
  const d = JSON.parse(fs.readFileSync(arquivoDados, 'utf8'));
  const melhor = {};
  for (const r of d.results) {
    const ev = d.events[r.e];
    if (!ev || !(r.tm > 0) || (r.st && r.st !== 'OK')) continue;
    const k = ev.cd + '|' + ev.s;
   if (!(k in melhor) || r.tm < melhor[k]) melhor[k] = r.tm;
  }
  const min = {};
  for (const [k, v] of Object.entries(melhor)) min[k] = Math.floor(v * 0.9 * 100) / 100;
  return min;
}

export function validarResultado(r, limites) {
  if (!r || typeof r !== 'object') return { erro: 'Resultado inválido.' };
  const code = String(r.code || ''), sex = String(r.sex || ''), pool = Number(r.pool);
  if (!PROVAS.includes(code)) return { erro: 'Prova inválida.' };
  if (sex !== 'M' && sex !== 'F') return { erro: 'Sexo inválido.' };
  if (pool !== 25 && pool !== 50) return { erro: 'Piscina inválida.' };
  const time = Math.round(Number(r.time) * 100) / 100;
  const minimo = limites[code + '|' + sex] ?? 10;
  if (!Number.isFinite(time) || time < minimo || time > 600) return { erro: 'Tempo fora do plausível para esta prova.' };
  const inteiro = (v, a, b) => { const n = Number(v); return Number.isInteger(n) && n >= a && n <= b ? n : null; };
  const comp = COMPETICOES.includes(r.comp) ? r.comp : null;
  const mode = typeof r.mode === 'string' && /^[a-z]{2,12}$/.test(r.mode) ? r.mode : null;
  const team = typeof r.team === 'string' ? r.team.slice(0, 24) : null;
  return { ok: { code, sex, pool, time, place: inteiro(r.place, 1, 20), n: inteiro(r.n, 1, 20), comp, year: inteiro(r.year, 2000, 2100), mode, team } };
}
