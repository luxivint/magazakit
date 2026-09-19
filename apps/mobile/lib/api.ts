import { Platform } from 'react-native';

/** Native: Nest URL. Web: same origin (Metro proxies /v1 and /health). */
const ENV_API_URL = (
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:43140'
).replace(/\/$/, '');

export const API_URL = Platform.OS === 'web' ? '' : ENV_API_URL;

export const API_BASE_URL = API_URL || ENV_API_URL;

export function apiUrlAllowsSecrets(raw = API_URL): boolean {
  const candidate =
    raw ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : ENV_API_URL);
  try {
    const u = new URL(candidate);
    const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const loopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (u.protocol === 'https:') return true;
    return u.protocol === 'http:' && loopback;
  } catch {
    return false;
  }
}

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
  stockSource: 'none' | 'master_sku';
  status: 'active' | 'passive';
  statusLabel: string;
  imageUrl: string | null;
  imageUrls?: string[];
};

export type OrderLine = {
  listingId: string;
  qty: number;
  scannedQty: number;
  title?: string;
  imageUrl?: string | null;
  unitPriceTry?: number;
  commissionRate?: number;
};

export type OrderMoney = {
  grossTry: number;
  sellerDiscountTry: number;
  tyDiscountTry: number;
  customerTry: number;
  commissionRate: number | null;
  commissionTry: number | null;
  commissionSource?: 'package_rate' | 'settlement' | 'invoice' | 'none';
  sgrFeeTry: number;
  cargoFeeTry?: number | null;
  cargoFeeLabel?: string | null;
  serviceFeeTry?: number | null;
  storeFeeTry?: number | null;
  stoppageTry?: number | null;
  sellerRevenueTry?: number | null;
  estimatedEarningsTry: number | null;
  earningsEstimated: boolean;
  cargoProvider: string | null;
  cargoTrackingNumber?: string | null;
  cargoDeci?: number | null;
  cargoPayer?: 'seller' | 'marketplace' | null;
};

export type OrderListItem = {
  id: string;
  organizationId?: string;
  orderNumber: string;
  channel: Channel;
  customerName: string;
  status: string;
  statusLabel: string;
  itemCount: number;
  productTitle?: string;
  imageUrl?: string | null;
  totalTry: number;
  cargoDeadlineAt: string | null;
  cargoWarning: boolean;
  createdAt: string;
  lines: OrderLine[];
  reserved?: boolean;
  reservationKey?: string | null;
  packed?: boolean;
  labeled?: boolean;
  shipped?: boolean;
  labelUrl?: string | null;
  money?: OrderMoney;
};

export type PreviewList<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  mock: boolean;
};

export type HealthResponse = {
  status: string;
  service?: string;
  mock?: boolean;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  ownerUid: string;
};

export type CurrentUserResponse = {
  uid: string;
  email: string | null;
  organization: OrganizationSummary | null;
};

export type ShopStatusCode = 'mock_connected' | 'live_connected' | 'k01_blocked' | 'unverified';

export type ShopStatus = {
  id: string;
  organizationId: string;
  channel: Channel;
  status: ShopStatusCode;
  statusLabel: string;
  sellerLabel: string;
  connectedAt: string;
  lastSyncAt: string | null;
  checkpoint: string | null;
  k01: string;
  mock: boolean;
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
  mock: boolean;
  partial?: boolean;
  checkpointUpdated?: boolean;
  warnings?: { scope: 'products' | 'orders'; message: string }[];
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

export type LabelResult = {
  orderId: string;
  labeled: true;
  shipped: boolean;
  pdfUrl: string;
  mock: true;
};

export type StockAdjustResult = {
  balance: StockBalance;
  movement: StockMovement;
};

export type OperationItem = {
  id: string;
  organizationId?: string;
  type: string;
  title: string;
  status: 'ok' | 'pending' | 'unknown' | 'reconciling' | 'error';
  refId?: string | null;
  createdAt: string;
};

export type ReturnItem = {
  id: string;
  organizationId: string;
  orderId: string;
  orderNumber: string;
  channel: 'trendyol';
  reason: string;
  status: 'open' | 'reviewing' | 'approved' | 'rejected';
  statusLabel: string;
  reviewNote: string | null;
  tyWrite: false;
  createdAt: string;
};

export type OrgMember = {
  organizationId: string;
  uid: string | null;
  email: string;
  role: 'owner' | 'staff';
  status: 'active' | 'invited';
};

export type OrgInvite = {
  id: string;
  organizationId: string;
  email: string;
  role: 'staff';
  status: 'pending';
  emailSent: false;
  createdAt: string;
};

export type OpsReport = {
  organizationId: string;
  orderCounts: {
    total: number;
    created: number;
    picking: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  stockDeltaPhysical: number;
  note: 'Kâr hesaplanmaz; maliyet ve komisyon yok.';
};

export type ListingDraft = {
  listingId: string;
  organizationId: string;
  state: 'draft' | 'mock_live';
  title: string;
  priceTry: number;
  mock: boolean;
  liveTyWrite: false;
  updatedAt: string;
};

export type BillingOffering = {
  id: string;
  name: string;
  priceTry: number;
  period: 'month' | 'ay';
  chargeable: false;
};

export type BillingOfferingResponse = {
  items: BillingOffering[];
  chargeable: false;
  processor: null;
  note: string;
};

/** Nest F6 stubs. GİB / WMS / printer never claimed live. */
export type Supplier = {
  id: string;
  organizationId: string;
  name: string;
  note: string | null;
  createdAt: string;
};

export type PurchaseOrderStub = {
  id: string;
  organizationId: string;
  supplierId: string;
  sku: string | null;
  qty: number;
  status: 'draft';
  stub: true;
  createdAt: string;
};

export type Warehouse = {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
};

export type WarehouseTransfer = {
  id: string;
  organizationId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  sku: string;
  qty: number;
  stub: true;
  createdAt: string;
};

export type EinvoiceDraft = {
  id: string;
  organizationId: string;
  orderId: string | null;
  status: 'draft';
  gibLive: false;
  createdAt: string;
};

export type PrinterSettings = {
  organizationId: string;
  name: string;
  host: string | null;
};

export type PrinterTestResult = {
  ok: true;
  printed: false;
  mock: true;
  note: 'Termal yazıcıya gönderilmedi.';
};

export type ShopConnectRequest = {
  sellerId?: string;
  merchantId?: string;
  apiKey?: string;
  apiSecret?: string;
  appKey?: string;
  appSecret?: string;
  shopDomain?: string;
  accessToken?: string;
  host?: string;
  consumerKey?: string;
  consumerSecret?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  sandbox?: boolean;
};

export type ChannelCatalogRow = {
  channel: Channel;
  label: string;
  mode: 'mock' | 'live' | 'unconfigured' | 'blocked';
  read: 'live' | 'mock' | 'blocked';
  write: false;
  note: string;
};
