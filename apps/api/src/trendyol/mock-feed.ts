import type { OrderListItem, ProductListItem, ReturnListItem } from '@magazakit/contracts';

export type MockListingSeed = Omit<
  ProductListItem,
  'organizationId' | 'listingId' | 'mapped' | 'stockSource' | 'marketplaceStock'
> & { marketplaceStock: number };

const PRODUCTS: MockListingSeed[] = [
  {
    id: 'ty-p-1001',
    sku: 'MGM-TSHIRT-S',
    barcode: '8680001001001',
    title: 'Grafit basic tişört S',
    channel: 'trendyol',
    priceTry: 249.9,
    marketplaceStock: 24,
    physicalStock: 0,
    reservedStock: 0,
    sellableStock: 0,
    critical: false,
    status: 'active',
    statusLabel: 'Aktif',
    imageUrl: null,
  },
  {
    id: 'ty-p-1002',
    sku: 'MGM-HOODIE-M',
    barcode: '8680001001002',
    title: 'Lime hoodie M',
    channel: 'trendyol',
    priceTry: 899.9,
    marketplaceStock: 8,
    physicalStock: 0,
    reservedStock: 0,
    sellableStock: 0,
    critical: false,
    status: 'active',
    statusLabel: 'Aktif',
    imageUrl: null,
  },
  {
    id: 'ty-p-1003',
    sku: 'MGM-SOCK-3',
    barcode: '8680001001003',
    title: '3’lü çorap seti',
    channel: 'trendyol',
    priceTry: 79.9,
    marketplaceStock: 2,
    physicalStock: 0,
    reservedStock: 0,
    sellableStock: 0,
    critical: true,
    status: 'passive',
    statusLabel: 'Pasif',
    imageUrl: null,
  },
];

const ORDERS: Omit<OrderListItem, 'organizationId'>[] = [
  {
    id: 'ty-o-5001',
    orderNumber: 'TY-1048291',
    channel: 'trendyol',
    customerName: 'A. Yılmaz',
    status: 'picking',
    statusLabel: 'Hazırlanacak',
    itemCount: 2,
    totalTry: 1149.8,
    cargoDeadlineAt: '2026-09-18T16:00:00.000Z',
    cargoWarning: true,
    createdAt: '2026-09-18T08:12:00.000Z',
    lines: [
      { listingId: 'ty-p-1001', qty: 1, scannedQty: 0 },
      { listingId: 'ty-p-1002', qty: 1, scannedQty: 0 },
    ],
    reserved: false,
    reservationKey: null,
    packed: false,
    labeled: false,
    shipped: false,
    labelUrl: null,
  },
  {
    id: 'ty-o-5002',
    orderNumber: 'TY-1048302',
    channel: 'trendyol',
    customerName: 'M. Kaya',
    status: 'shipped',
    statusLabel: 'Kargoda',
    itemCount: 1,
    totalTry: 249.9,
    cargoDeadlineAt: null,
    cargoWarning: false,
    createdAt: '2026-09-17T19:40:00.000Z',
    lines: [{ listingId: 'ty-p-1001', qty: 1, scannedQty: 0 }],
    reserved: false,
    reservationKey: null,
    packed: false,
    labeled: false,
    shipped: false,
    labelUrl: null,
  },
  {
    id: 'ty-o-5003',
    orderNumber: 'TY-1048310',
    channel: 'trendyol',
    customerName: 'S. Demir',
    status: 'created',
    statusLabel: 'Yeni',
    itemCount: 2,
    totalTry: 429.7,
    cargoDeadlineAt: '2026-09-18T18:00:00.000Z',
    cargoWarning: true,
    createdAt: '2026-09-18T11:02:00.000Z',
    lines: [
      { listingId: 'ty-p-1001', qty: 1, scannedQty: 0 },
      { listingId: 'ty-p-1003', qty: 1, scannedQty: 0 },
    ],
    reserved: false,
    reservationKey: null,
    packed: false,
    labeled: false,
    shipped: false,
    labelUrl: null,
  },
];

const RETURNS: Omit<ReturnListItem, 'organizationId'>[] = [
  {
    id: 'ty-r-9001',
    orderId: 'ty-o-5002',
    orderNumber: 'TY-1048302',
    channel: 'trendyol',
    reason: 'Yanlış beden',
    status: 'open',
    statusLabel: 'Açık',
    reviewNote: null,
    tyWrite: false,
    createdAt: '2026-09-18T12:00:00.000Z',
  },
];

export function mockTrendyolFeed(): {
  listings: MockListingSeed[];
  orders: Omit<OrderListItem, 'organizationId'>[];
  returns: Omit<ReturnListItem, 'organizationId'>[];
} {
  return {
    listings: PRODUCTS.map((p) => ({ ...p })),
    orders: ORDERS.map((o) => ({ ...o })),
    returns: RETURNS.map((r) => ({ ...r })),
  };
}
