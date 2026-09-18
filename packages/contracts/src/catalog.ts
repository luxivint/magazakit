export type OrderLine = {
  listingId: string;
  qty: number;
  scannedQty: number;
};

export type Channel = 'trendyol';

export type ProductStatus = 'active' | 'passive';

/** K02: marketplace listing qty is never physical stock. */
export type StockSource = 'none' | 'master_sku';

export type ProductListItem = {
  id: string;
  listingId: string;
  organizationId: string;
  sku: string;
  barcode: string;
  title: string;
  channel: Channel;
  priceTry: number;
  marketplaceStock: number;
  physicalStock: number;
  reservedStock: number;
  sellableStock: number;
  critical: boolean;
  mapped: boolean;
  stockSource: StockSource;
  status: ProductStatus;
  statusLabel: string;
  imageUrl: string | null;
};

export type OrderStatus = 'created' | 'picking' | 'shipped' | 'delivered' | 'cancelled';

export type OrderListItem = {
  id: string;
  organizationId: string;
  orderNumber: string;
  channel: Channel;
  customerName: string;
  status: OrderStatus;
  statusLabel: string;
  itemCount: number;
  totalTry: number;
  cargoDeadlineAt: string | null;
  cargoWarning: boolean;
  createdAt: string;
  lines: OrderLine[];
  reserved: boolean;
  reservationKey: string | null;
  packed: boolean;
  labeled: boolean;
  shipped: boolean;
  labelUrl: string | null;
};

export type ListingMapping = {
  organizationId: string;
  listingId: string;
  sku: string;
  stockSource: 'master_sku';
};

export type ShopSyncResult = {
  shopId: string;
  organizationId: string;
  productsUpserted: number;
  ordersUpserted: number;
  checkpoint: string;
  lastSyncAt: string;
  mock: true;
};

export type StockBalance = {
  organizationId: string;
  sku: string;
  physicalStock: number;
  reservedStock: number;
  sellableStock: number;
};

export type StockMovement = {
  id: string;
  organizationId: string;
  sku: string;
  deltaPhysical: number;
  deltaReserved: number;
  reason: 'adjust' | 'count' | 'reserve' | 'ship';
  idempotencyKey: string;
  createdAt: string;
};

export type OutboxEntry = {
  id: string;
  organizationId: string;
  kind: 'channel_stock_write';
  channel: 'trendyol';
  sku: string;
  intendedQty: number;
  status: 'pending' | 'unknown' | 'reconciling';
  createdAt: string;
};

export type OperationEvent = {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  status: 'ok' | 'pending' | 'unknown' | 'reconciling' | 'error';
  refId: string | null;
  createdAt: string;
};

export type LabelResult = {
  orderId: string;
  labeled: true;
  shipped: boolean;
  pdfUrl: string;
  mock: true;
};
