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
