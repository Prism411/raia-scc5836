import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import fastifyRateLimit from '@fastify/rate-limit';
import crypto from 'node:crypto';
import path from 'node:path';
import { abrirBanco } from './db.js';
import { PROVAS, validarNome, validarAvatar, validarTec, validarResultado, carregarLimites } from './regras.js';

const UM_ANO = 365 * 24 * 3600;
const COOKIE_SESSAO = 'raia_sid';
const COOKIE_APARELHO = 'raia_dev';

const hash = v => crypto.createHash('sha256').update(String(v)).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ');

export async function construirApp(opcoes = {}) {
  const cfg = {
    web: opcoes.web || process.env.RAIA_WEB || path.resolve('web'),
    banco: opcoes.banco || process.env.RAIA_DB || path.resolve('dados/raia.db'),
    cookieSeguro: opcoes.cookieSeguro ?? process.env.RAIA_COOKIE_SECURE !== '0',
    logger: opcoes.logger ?? false,
    limiteLogin: opcoes.limiteLogin ?? 10,
    limiteEscrita: opcoes.limiteEscrita ?? 60
  };
  const { db, q } = abrirBanco(cfg.banco);
  const limites = carregarLimites(path.join(cfg.web, 'data', 'natacao.json'));

  const app = Fastify({ logger: cfg.logger, bodyLimit: 32 * 1024, trustProxy: false });
  app.addHook('onClose', async () => db.close());

  const ipReal = req => String(req.headers['cf-connecting-ip'] || req.ip || '');

  await app.register(fastifyCookie);
  await app.register(fastifyRateLimit, { global: false, keyGenerator: ipReal, errorResponseBuilder: () => ({ statusCode: 429, erro: 'Muitas tentativas. Espere um minuto.' }) });

  app.addHook('onSend', async (req, reply, payload) => {
    reply.header('Content-Security-Policy', CSP);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (req.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
    return payload;
  });

  const opCookie = { path: '/', httpOnly: true, sameSite: 'lax', secure: cfg.cookieSeguro, maxAge: UM_ANO };

  function usuarioAtual(req) {
    const t = req.cookies[COOKIE_SESSAO];
    if (!t || t.length > 100) return null;
    return q.usuarioDaSessao.get(hash(t)) || null;
  }
  function exigirUsuario(req, reply) {
    const u = usuarioAtual(req);
    if (!u) { reply.code(401).send({ erro: 'Entre com seu nome primeiro.' }); return null; }
    return u;
  }
  const json = s => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
  const perfil = u => ({ nome: u.nome, avatar: json(u.avatar), tec: json(u.tec) });

  app.addHook('preHandler', async (req, reply) => {
    if (!req.url.startsWith('/api/') || req.method === 'GET' || req.method === 'HEAD') return;
    const origem = req.headers.origin;
    if (origem) {
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      try { if (new URL(origem).host !== host) return reply.code(403).send({ erro: 'Origem não permitida.' }); }
      catch { return reply.code(403).send({ erro: 'Origem não permitida.' }); }
    }
  });

  app.get('/healthz', async () => ({ ok: true }));

  app.get('/api/eu', async (req, reply) => {
    const u = usuarioAtual(req);
    if (!u) return { nome: null };
    q.tocarUsuario.run(Date.now(), u.id);
    return perfil(u);
  });

  app.post('/api/sessao', { config: { rateLimit: { max: cfg.limiteLogin, timeWindow: '1 minute' } } }, async (req, reply) => {
    const v = validarNome(req.body && req.body.nome);
    if (v.erro) return reply.code(400).send({ erro: v.erro });
    let aparelho = req.cookies[COOKIE_APARELHO];
    if (!aparelho || aparelho.length > 100) { aparelho = token(); reply.setCookie(COOKIE_APARELHO, aparelho, opCookie); }
    const dono = hash(aparelho);
    const agora = Date.now();
    let u = q.usuarioPorNorm.get(v.chave);
    if (u && u.dono_hash !== dono) return reply.code(409).send({ erro: 'Esse nome já tem dono. Escolha outro (por exemplo, com sobrenome ou número).' });
    if (!u) { const r = q.criarUsuario.run(v.nome, v.chave, dono, agora, agora); u = q.usuarioPorNorm.get(v.chave); if (!u) u = { id: r.lastInsertRowid, nome: v.nome }; }
    const antigo = req.cookies[COOKIE_SESSAO]; if (antigo) q.apagarSessao.run(hash(antigo));
    const t = token();
    q.criarSessao.run(hash(t), u.id, agora);
    q.tocarUsuario.run(agora, u.id);
    reply.setCookie(COOKIE_SESSAO, t, opCookie);
    return perfil(u);
  });

  app.delete('/api/sessao', async (req, reply) => {
    const t = req.cookies[COOKIE_SESSAO];
    if (t) q.apagarSessao.run(hash(t));
    reply.clearCookie(COOKIE_SESSAO, { path: '/' });
    return { ok: true };
  });

  const escrita = { config: { rateLimit: { max: cfg.limiteEscrita, timeWindow: '1 minute' } } };

  app.put('/api/eu/avatar', escrita, async (req, reply) => {
    const u = exigirUsuario(req, reply); if (!u) return;
    const s = validarAvatar(req.body && req.body.avatar);
    if (!s) return reply.code(400).send({ erro: 'Avatar inválido.' });
    q.salvarAvatar.run(s, u.id);
    return { ok: true };
  });

  app.put('/api/eu/tec', escrita, async (req, reply) => {
    const u = exigirUsuario(req, reply); if (!u) return;
    const s = validarTec(req.body && req.body.tec);
    if (!s) return reply.code(400).send({ erro: 'Técnica inválida.' });
    q.salvarTec.run(s, u.id);
    return { ok: true };
  });

  app.post('/api/resultados', escrita, async (req, reply) => {
    const u = exigirUsuario(req, reply); if (!u) return;
    const v = validarResultado(req.body, limites);
    if (v.erro) return reply.code(400).send({ erro: v.erro });
    const r = v.ok;
    const atual = q.resultadoAtual.get(u.id, r.code, r.sex, r.pool);
    const melhorou = !atual || r.time < atual.time;
    if (melhorou) q.gravarResultado.run({ ...r, usuario_id: u.id, criado_em: Date.now() });
    return { ok: true, melhorou };
  });

  app.get('/api/ranking', async (req, reply) => {
    const code = String(req.query.code || ''), sex = String(req.query.sex || ''), pool = Number(req.query.pool);
    if (!PROVAS.includes(code) || (sex !== 'M' && sex !== 'F')) return reply.code(400).send({ erro: 'Consulta inválida.' });
    if (pool !== 25 && pool !== 50) return reply.code(400).send({ erro: 'Piscina inválida.' });
    const linhas = q.top.all(code, sex, pool, 20).map((l, i) => ({ pos: i + 1, ...l }));
    const total = q.totalProva.get(code, sex, pool).n;
    let eu = null;
    const u = usuarioAtual(req);
    if (u) {
      const m = q.meuResultado.get(u.id, code, sex, pool);
      if (m) eu = { pos: q.posicao.get(code, sex, pool, m.time, m.time, m.criado_em).pos, ...m };
    }
    return { top: linhas, eu, total };
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ erro: 'Rota não encontrada.' });
    return reply.code(404).type('text/plain; charset=utf-8').send('Página não encontrada.');
  });

  await app.register(fastifyStatic, {
    root: path.resolve(cfg.web), index: false, wildcard: true, cacheControl: false,
      setHeaders(res, arquivo) {
      const imutavel = arquivo.includes(`${path.sep}vendor${path.sep}`);
      res.setHeader('Cache-Control', imutavel ? 'public, max-age=604800' : 'public, max-age=300');
    }
  });
  const release = Number(process.env.RAIA_RELEASE) === 2 ? 2 : 1;
  app.get('/config.js', (req, reply) => reply.type('application/javascript; charset=utf-8').header('Cache-Control', 'no-cache').send(`window.RAIA_RELEASE = ${release};\n`));
 app.get('/', (req, reply) => reply.sendFile('RAIA.dc.html'));

  return app;
}
