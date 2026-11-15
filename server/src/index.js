import { construirApp } from './app.js';

const porta = Number(process.env.PORT || 8080);
const app = await construirApp({ logger: { level: process.env.LOG_LEVEL || 'info' } });

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, async () => { await app.close(); process.exit(0); });
}

await app.listen({ host: '0.0.0.0', port: porta });
