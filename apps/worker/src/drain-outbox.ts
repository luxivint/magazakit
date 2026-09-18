import { randomUUID } from 'node:crypto';
import { mockTrendyolOutboxStatus } from './mock-trendyol-write';

type Pg = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number }>;
};

export async function countPendingOutbox(pg: Pg): Promise<number> {
  const res = await pg.query(`SELECT count(*)::int AS n FROM stock_outbox WHERE status = 'pending'`);
  return Number(res.rows[0]?.n ?? 0);
}

export async function drainPendingOutbox(pg: Pg): Promise<{ sent: number; unknown: number; failed: number }> {
  const pending = await pg.query(
    `SELECT id, organization_id, sku, intended_qty FROM stock_outbox WHERE status = 'pending' ORDER BY created_at ASC`,
  );
  let sent = 0;
  let unknown = 0;
  let failed = 0;
  for (const row of pending.rows) {
    const id = String(row.id);
    const qty = Number(row.intended_qty);
    const status = mockTrendyolOutboxStatus(qty);
    const upd = await pg.query(`UPDATE stock_outbox SET status = $2 WHERE id = $1 AND status = 'pending'`, [
      id,
      status,
    ]);
    if ((upd.rowCount ?? 0) === 0) {
      continue;
    }
    if (status === 'unknown') {
      unknown += 1;
    } else {
      failed += 1;
    }
    const title =
      status === 'unknown'
        ? `Mock TY stok niyeti kaydedildi ${String(row.sku)} → ${qty} (pazaryeri teyidi yok)`
        : `Mock TY stok yazımı başarısız ${String(row.sku)}`;
    await pg.query(
      `INSERT INTO operations (id, organization_id, type, title, status, ref_id, created_at)
       VALUES ($1, $2, 'channel_stock_write', $3, $4, $5, now())`,
      [
        `op_${randomUUID()}`,
        String(row.organization_id),
        title,
        status === 'unknown' ? 'unknown' : 'error',
        id,
      ],
    );
  }
  return { sent, unknown, failed };
}
