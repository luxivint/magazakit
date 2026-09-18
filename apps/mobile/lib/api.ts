/** Web/emulator: http://127.0.0.1:43140. Physical device: LAN IP of the Nest host. */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:43140'
).replace(/\/$/, '');

export const API_BASE_URL = API_URL;

export type ProductListItem = {
  id: string;
  listingId: string;
  organizationId: string;
  sku: string;
  barcode: string;
  title: string;
  channel: 'trendyol';
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
};

export type OrderLine = {
  listingId: string;
  qty: number;
  scannedQty: number;
};

export type OrderListItem = {
  id: string;
  organizationId?: string;
  orderNumber: string;
  channel: 'trendyol';
  customerName: string;
  status: string;
  statusLabel: string;
  itemCount: number;
  totalTry: number;
  cargoDeadlineAt: string | null;
  cargoWarning: boolean;
  createdAt: string;
  lines?: OrderLine[];
  reserved?: boolean;
  reservationKey?: string | null;
  packed?: boolean;
  labeled?: boolean;
  shipped?: boolean;
  labelUrl?: string | null;
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

export type ShopStatusCode = 'mock_connected' | 'k01_blocked';

export type ShopStatus = {
  id: string;
  organizationId: string;
  channel: 'trendyol';
  status: ShopStatusCode;
  statusLabel: string;
  sellerLabel: string;
  connectedAt: string;
  lastSyncAt: string | null;
  checkpoint: string | null;
  k01: string;
  mock: true;
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
