import path from 'node:path';
import { abrirBanco } from '../src/db.js';
import { chaveNome } from '../src/regras.js';

const [cmd, arg] = process.argv.slice(2);
const { db, q } = abrirBanco(process.env.RAIA_DB || path.resolve('dados/raia.db'));
const data = ms => new Date(ms).toISOString().replace('T', ' ').slice(0, 16);

if (cmd === 'listar') {
  for (const u of q.listarUsuarios.all(Number(arg) || 50)) console.log(`${u.nome.padEnd(26)} provas=${u.provas}  criado=${data(u.criado_em)}  visto=${data(u.visto_em)}`);
} else if (cmd === 'remover' && arg) {
  const r = q.removerUsuario.run(chaveNome(arg));
  console.log(r.changes ? `removido: ${arg} (sessões e resultados junto)` : `não encontrado: ${arg}`);
} else {
  console.log('uso: npm run admin -- listar [n] | remover "<nome>"');
  process.exitCode = 1;
}
db.close();
