export type OrderLine = {
  listingId: string;
  qty: number;
  scannedQty: number;
  title?: string;
  imageUrl?: string | null;
};

export type Channel =
  | 'trendyol'
  | 'hepsiburada'
  | 'n11'
  | 'shopify'
  | 'woocommerce'
  | 'ciceksepeti'
  | 'ikas'
  | 'amazon'
  | 'pazarama'
  | 'ticimax'
  | 'ideasoft';

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
  /** ISO 4217 currency reported by the channel. `priceTry` is retained for API compatibility. */
  priceCurrency?: string;
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
  imageUrls?: string[];
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
  productTitle?: string;
  imageUrl?: string | null;
  totalTry: number;
  /** ISO 4217 currency reported by the channel. `totalTry` is retained for API compatibility. */
  totalCurrency?: string;
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

export type ShopSyncWarning = {
  scope: 'products' | 'orders';
  message: string;
};

export type ShopSyncResult = {
  shopId: string;
  organizationId: string;
  productsUpserted: number;
  ordersUpserted: number;
  checkpoint: string;
  lastSyncAt: string;
  mock: boolean;
  partial: boolean;
  checkpointUpdated: boolean;
  warnings: ShopSyncWarning[];
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
  status: 'pending' | 'unknown' | 'reconciling' | 'sent' | 'failed';
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
