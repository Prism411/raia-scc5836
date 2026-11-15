import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export function abrirBanco(arquivo) {
  if (arquivo !== ':memory:') fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const db = new Database(arquivo);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 3000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY,
      nome       TEXT NOT NULL,
      nome_norm  TEXT NOT NULL UNIQUE,
      dono_hash  TEXT NOT NULL,
      avatar     TEXT,
      tec        TEXT,
      criado_em  INTEGER NOT NULL,
      visto_em   INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessoes (
      token_hash TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      criado_em  INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS resultados (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      code       TEXT NOT NULL,
      sex        TEXT NOT NULL,
      pool       INTEGER NOT NULL,
      time       REAL NOT NULL,
      place      INTEGER,
      n          INTEGER,
      comp       TEXT,
      year       INTEGER,
      mode       TEXT,
      team       TEXT,
      criado_em  INTEGER NOT NULL,
      PRIMARY KEY (usuario_id, code, sex, pool)
    );
    CREATE INDEX IF NOT EXISTS resultados_prova ON resultados (code, sex, pool, time);
  `);

  const q = {
    usuarioPorNorm: db.prepare('SELECT * FROM usuarios WHERE nome_norm = ?'),
    criarUsuario: db.prepare('INSERT INTO usuarios (nome, nome_norm, dono_hash, criado_em, visto_em) VALUES (?, ?, ?, ?, ?)'),
    tocarUsuario: db.prepare('UPDATE usuarios SET visto_em = ? WHERE id = ?'),
    criarSessao: db.prepare('INSERT INTO sessoes (token_hash, usuario_id, criado_em) VALUES (?, ?, ?)'),
    apagarSessao: db.prepare('DELETE FROM sessoes WHERE token_hash = ?'),
    usuarioDaSessao: db.prepare('SELECT u.* FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ?'),
    salvarAvatar: db.prepare('UPDATE usuarios SET avatar = ? WHERE id = ?'),
    salvarTec: db.prepare('UPDATE usuarios SET tec = ? WHERE id = ?'),
    resultadoAtual: db.prepare('SELECT time FROM resultados WHERE usuario_id = ? AND code = ? AND sex = ? AND pool = ?'),
    gravarResultado: db.prepare(`INSERT INTO resultados (usuario_id, code, sex, pool, time, place, n, comp, year, mode, team, criado_em)
      VALUES (@usuario_id, @code, @sex, @pool, @time, @place, @n, @comp, @year, @mode, @team, @criado_em)
      ON CONFLICT (usuario_id, code, sex, pool) DO UPDATE SET time = excluded.time, place = excluded.place, n = excluded.n,
        comp = excluded.comp, year = excluded.year, mode = excluded.mode, team = excluded.team, criado_em = excluded.criado_em`),
    top: db.prepare(`SELECT u.nome, r.time, r.place, r.comp, r.year, r.mode, r.team, r.criado_em
      FROM resultados r JOIN usuarios u ON u.id = r.usuario_id
      WHERE r.code = ? AND r.sex = ? AND r.pool = ? ORDER BY r.time ASC, r.criado_em ASC LIMIT ?`),
    posicao: db.prepare(`SELECT COUNT(*) + 1 AS pos FROM resultados r2 WHERE r2.code = ? AND r2.sex = ? AND r2.pool = ?
      AND (r2.time < ? OR (r2.time = ? AND r2.criado_em < ?))`),
    meuResultado: db.prepare(`SELECT u.nome, r.time, r.place, r.comp, r.year, r.mode, r.team, r.criado_em
      FROM resultados r JOIN usuarios u ON u.id = r.usuario_id WHERE r.usuario_id = ? AND r.code = ? AND r.sex = ? AND r.pool = ?`),
    totalProva: db.prepare('SELECT COUNT(*) AS n FROM resultados WHERE code = ? AND sex = ? AND pool = ?'),
    removerUsuario: db.prepare('DELETE FROM usuarios WHERE nome_norm = ?'),
    listarUsuarios: db.prepare('SELECT nome, criado_em, visto_em, (SELECT COUNT(*) FROM resultados r WHERE r.usuario_id = u.id) AS provas FROM usuarios u ORDER BY criado_em DESC LIMIT ?')
  };
  return { db, q };
}
