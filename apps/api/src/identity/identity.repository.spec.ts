import type { OrderListItem } from '@magazakit/contracts';
import { withOrderDefaults } from './identity.repository';

describe('withOrderDefaults', () => {
  it('refreshes marketplace state while preserving local scan progress', () => {
    const existing: OrderListItem = {
      id: 'o1', organizationId: 'org', orderNumber: '1', channel: 'shopify',
      customerName: 'Old', status: 'created', statusLabel: 'Yeni', itemCount: 1,
      totalTry: 10, totalCurrency: 'USD', cargoDeadlineAt: null, cargoWarning: false,
      createdAt: '2026-01-01T00:00:00Z',
      lines: [{ listingId: 'sh-A', qty: 1, scannedQty: 1 }],
      reserved: true, reservationKey: 'r1', packed: false, labeled: false,
      shipped: false, labelUrl: null,
    };
    const incoming = {
      ...existing,
      organizationId: undefined as never,
      status: 'shipped' as const,
      statusLabel: 'Gönderildi',
      totalTry: 12,
      lines: [{ listingId: 'sh-A', qty: 2, scannedQty: 0 }],
      shipped: true,
    };
    const merged = withOrderDefaults('org', incoming, existing);
    expect(merged.status).toBe('shipped');
    expect(merged.totalTry).toBe(12);
    expect(merged.lines[0]).toEqual({ listingId: 'sh-A', qty: 2, scannedQty: 1 });
    expect(merged.reserved).toBe(true);
    expect(merged.shipped).toBe(true);
  });
});
