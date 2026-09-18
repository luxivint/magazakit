import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mockTrendyolOutboxStatus } from './mock-trendyol-write';
import { drainPendingOutbox } from './drain-outbox';

describe('worker mock outbox drain', () => {
  it('marks non-negative qty sent and never needs secrets', () => {
    assert.equal(mockTrendyolOutboxStatus(8), 'sent');
    assert.equal(mockTrendyolOutboxStatus(-1), 'failed');
  });

  it('updates pending rows via pg stub', async () => {
    const rows = [
      { id: 'a', organization_id: 'org', sku: 'S', intended_qty: 3, status: 'pending' },
      { id: 'b', organization_id: 'org', sku: 'T', intended_qty: -2, status: 'pending' },
    ];
    const store = new Map(rows.map((r) => [r.id, r]));
    const pg = {
      async query(text: string, params?: unknown[]) {
        if (text.includes('FROM stock_outbox WHERE status')) {
          return { rows: [...store.values()].filter((r) => r.status === 'pending') };
        }
        if (text.startsWith('UPDATE')) {
          const id = String(params?.[0]);
          const status = String(params?.[1]);
          const row = store.get(id);
          if (!row || row.status !== 'pending') {
            return { rows: [], rowCount: 0 };
          }
          row.status = status;
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      },
    };
    const result = await drainPendingOutbox(pg);
    assert.deepEqual(result, { sent: 1, failed: 1 });
    assert.equal(store.get('a')?.status, 'sent');
    assert.equal(store.get('b')?.status, 'failed');
  });
});
