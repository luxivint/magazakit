import { createServer } from 'node:http';
import { loadWorkerEnv } from './load-env';
import { countPendingOutbox, drainPendingOutbox } from './drain-outbox';

loadWorkerEnv();

const port = Number(process.env.WORKER_PORT ?? 43141);
const drainMs = Number(process.env.OUTBOX_DRAIN_INTERVAL_MS ?? 4000);

let pending = 0;
let persistence: 'memory' | 'postgres' = 'memory';
let pool: { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number }>; end?: () => Promise<void> } | null =
  null;

async function tick(): Promise<void> {
  if (!pool) {
    pending = 0;
    return;
  }
  try {
    await drainPendingOutbox(pool);
    pending = await countPendingOutbox(pool);
  } catch {
    /* never log connection string */
  }
}

const server = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'worker',
        mock: true,
        persistence,
        outbox: { pending, channel: 'trendyol', mock: true },
      }),
    );
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }));
});

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    const pg = await import('pg');
    const client = new pg.Pool({ connectionString: databaseUrl, max: 2 });
    try {
      await client.query('SELECT 1');
      pool = client;
      persistence = 'postgres';
      process.stdout.write('worker outbox drain: postgres (mock TY / K01; secrets not logged)\n');
    } catch {
      await client.end();
      process.stdout.write('worker: DATABASE_URL set but unreachable; drain idle. Connection string not logged.\n');
    }
  } else {
    process.stdout.write('worker: DATABASE_URL unset — health only (API in-memory outbox).\n');
  }

  server.listen(port, '0.0.0.0', () => {
    process.stdout.write(`worker health on :${port}\n`);
  });

  if (pool && Number.isFinite(drainMs) && drainMs > 0) {
    await tick();
    const timer = setInterval(() => {
      void tick();
    }, drainMs);
    timer.unref?.();
  }
}

void main();
