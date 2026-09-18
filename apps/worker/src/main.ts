import { createServer } from 'node:http';

const port = Number(process.env.WORKER_PORT ?? 43141);

const server = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'worker', mock: true }));
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }));
});

server.listen(port, '0.0.0.0', () => {
  process.stdout.write(`worker health on :${port}\n`);
});
