import { serve } from '@hono/node-server';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4173);
const { app, database } = createApp();

if (process.env.CAMPUSFLOW_SEED_DEMO === '1') database.seedDemo();

const server = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, (info) => {
  console.log(`CampusFlow AI listening on http://127.0.0.1:${info.port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
