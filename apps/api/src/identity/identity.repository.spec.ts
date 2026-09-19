import type { OrderListItem } from '@magazakit/contracts';
import { attachListingPhotos, withOrderDefaults } from './identity.repository';

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

  it('keeps line photos when finance upsert omits imageUrl', () => {
    const existing = withOrderDefaults('org', {
      id: 'ty-1',
      orderNumber: '11512925676',
      channel: 'trendyol',
      customerName: 'A',
      status: 'delivered',
      statusLabel: 'Teslim',
      itemCount: 1,
      totalTry: 115,
      cargoDeadlineAt: null,
      cargoWarning: false,
      createdAt: '2026-08-17T10:37:38.616Z',
      lines: [{ listingId: 'ty-ABF-TK-100', qty: 1, scannedQty: 0, imageUrl: 'https://cdn.example/takoz.jpg' }],
      reserved: false,
      reservationKey: null,
      packed: true,
      labeled: false,
      shipped: true,
      labelUrl: null,
    });
    const incoming = {
      ...existing,
      organizationId: undefined as never,
      lines: [{ listingId: 'ty-ABF-TK-100', qty: 1, scannedQty: 0 }],
    };
    const merged = withOrderDefaults('org', incoming, existing);
    expect(merged.lines[0].imageUrl).toBe('https://cdn.example/takoz.jpg');
  });
});

describe('attachListingPhotos', () => {
  it('copies catalog image onto the order line by listing id', () => {
    const next = attachListingPhotos(
      [
        {
          id: 'ty-1',
          organizationId: 'org',
          orderNumber: '11512925676',
          channel: 'trendyol',
          customerName: 'A',
          status: 'delivered',
          statusLabel: 'Teslim',
          itemCount: 1,
          totalTry: 115,
          cargoDeadlineAt: null,
          cargoWarning: false,
          createdAt: '2026-08-17T10:37:38.616Z',
          imageUrl: null,
          lines: [{ listingId: 'ty-ABF-TK-100', qty: 1, scannedQty: 0, title: 'Takoz' }],
          reserved: false,
          reservationKey: null,
          packed: true,
          labeled: false,
          shipped: true,
          labelUrl: null,
        },
      ],
      [{ id: 'ty-ABF-TK-100', imageUrl: 'https://cdn.example/takoz.jpg' }],
    );
    expect(next[0].lines[0].imageUrl).toBe('https://cdn.example/takoz.jpg');
    expect(next[0].imageUrl).toBe('https://cdn.example/takoz.jpg');
  });
});
