import {
  API_URL,
  apiUrlAllowsSecrets,
  type CurrentUserResponse,
  type HealthResponse,
  type ListingMapping,
  type OrganizationSummary,
  type PreviewList,
  type ProductListItem,
  type OrderListItem,
  type ShopStatus,
  type ShopSyncResult,
  type LabelResult,
  type StockAdjustResult,
  type StockBalance,
  type StockMovement,
  type OperationItem,
  type ReturnItem,
  type OrgMember,
  type OrgInvite,
  type OpsReport,
  type ListingDraft,
  type BillingOffering,
  type BillingOfferingResponse,
  type Supplier,
  type PurchaseOrderStub,
  type Warehouse,
  type WarehouseTransfer,
  type EinvoiceDraft,
  type PrinterSettings,
  type PrinterTestResult,
  type Channel,
  type ChannelCatalogRow,
  type ShopConnectRequest,
} from '@/lib/api';
import { getIdToken } from '@/lib/firebase';

export { API_URL, API_URL as API_BASE_URL };
export type {
  CurrentUserResponse,
  HealthResponse,
  ListingMapping,
  OrganizationSummary,
  PreviewList,
  ProductListItem,
  OrderListItem,
  ShopStatus,
  ShopSyncResult,
  LabelResult,
  StockAdjustResult,
  StockBalance,
  StockMovement,
  OperationItem,
  ReturnItem,
  OrgMember,
  OrgInvite,
  OpsReport,
  ListingDraft,
  BillingOffering,
  BillingOfferingResponse,
  Supplier,
  PurchaseOrderStub,
  Warehouse,
  WarehouseTransfer,
  EinvoiceDraft,
  PrinterSettings,
  PrinterTestResult,
  Channel,
  ChannelCatalogRow,
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function headers(json = false, extra?: Record<string, string>): Promise<HeadersInit> {
  const token = await getIdToken();
  const h: Record<string, string> = { Accept: 'application/json', ...extra };
  if (json) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function cleanApiMessage(message: string): string {
  return message
    .replace(/\s*\((?:T|E)-?\d+\)/gi, '')
    .replace(/\bCONFLICT\b[:·.\s]*/gi, '')
    .replace(/\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/v1\/\S+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
}

async function parseError(res: Response): Promise<never> {
  let message = `API ${res.status}`;
  let code: string | undefined;
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
      message?: string;
    };
    code = body.error?.code;
    message = body.error?.message || body.message || message;
  } catch {
    /* ignore */
  }
  message = cleanApiMessage(message);
  if (res.status === 0 || res.status >= 500) {
    message = 'Sunucu yanıt vermedi. İşlem tamamlanmış sayılmaz.';
  }
  if (res.status === 401) {
    message = message || 'Oturum doğrulanamadı. Tekrar giriş yap.';
  }
  if (res.status === 409) {
    message =
      message && !message.startsWith('API ')
        ? message
        : 'Bu sipariş zaten rezerve. İkinci rezervasyon yok.';
  }
  throw new ApiError(message, res.status, code);
}

async function request<T>(path: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError('Sunucuya bağlanılamadı. İşlem tamamlanmış sayılmaz.', 0);
  }
  if (!res.ok) await parseError(res);
  return res.json() as Promise<T>;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request('/health', { signal, headers: { Accept: 'application/json' } });
}

export async function fetchMe(): Promise<CurrentUserResponse> {
  return request('/v1/me', { headers: await headers() });
}

export async function createOrganization(name: string): Promise<OrganizationSummary> {
  return request('/v1/organizations', {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify({ name }),
  });
}

export async function fetchCurrentOrganization(): Promise<OrganizationSummary | null> {
  const data = await request<{ organization: OrganizationSummary | null }>('/v1/organizations/current', {
    headers: await headers(),
  });
  return data.organization;
}

export async function fetchShops(): Promise<{ items: ShopStatus[]; mock: boolean }> {
  return request('/v1/shops', { headers: await headers() });
}

export async function fetchChannels(): Promise<{ items: ChannelCatalogRow[]; write: false }> {
  return request('/v1/channels', { headers: { Accept: 'application/json' } });
}

const CHANNELS: Channel[] = [
  'trendyol',
  'hepsiburada',
  'n11',
  'shopify',
  'woocommerce',
  'ciceksepeti',
  'ikas',
  'amazon',
  'pazarama',
  'ticimax',
  'ideasoft',
];

/** Connect a channel. Keys go to the API once; they are not stored on the phone. */
export async function connectShop(channel: Channel, body: ShopConnectRequest = {}): Promise<ShopStatus> {
  if (!apiUrlAllowsSecrets()) {
    throw new ApiError(
      'Mağaza anahtarları HTTP/LAN üzerinden gönderilmez. EXPO_PUBLIC_API_URL HTTPS veya 127.0.0.1 olmalı.',
      400,
      'VALIDATION',
    );
  }
  if (!CHANNELS.includes(channel)) {
    throw new ApiError('Bilinmeyen kanal.', 400, 'VALIDATION');
  }
  const payload: ShopConnectRequest = {};
  for (const [key, value] of Object.entries(body) as [keyof ShopConnectRequest, unknown][]) {
    if (typeof value === 'string' && value.trim()) {
      payload[key] = value.trim() as never;
    } else if (typeof value === 'boolean') {
      payload[key] = value as never;
    }
  }
  return request(`/v1/shops/${encodeURIComponent(channel)}/connect`, {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify(payload),
  });
}

export async function connectTrendyolShop(body?: ShopConnectRequest | string): Promise<ShopStatus> {
  if (typeof body === 'string') return connectShop('trendyol', { sellerId: body });
  return connectShop('trendyol', body);
}

export async function syncShop(shopId: string): Promise<ShopSyncResult> {
  return request(`/v1/shops/${encodeURIComponent(shopId)}/sync`, {
    method: 'POST',
    headers: await headers(),
  });
}

export async function fetchMappings(): Promise<{ items: ListingMapping[] }> {
  return request('/v1/mappings', { headers: await headers() });
}

export async function upsertMapping(listingId: string, sku: string): Promise<ListingMapping> {
  return request('/v1/mappings', {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify({ listingId, sku }),
  });
}

export async function fetchProducts(organizationId?: string): Promise<PreviewList<ProductListItem>> {
  const q = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
  return request(`/v1/products${q}`, { headers: await headers() });
}

export async function fetchOrders(organizationId?: string): Promise<PreviewList<OrderListItem>> {
  const q = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
  return request(`/v1/orders${q}`, { headers: await headers() });
}

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `idemp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export { newKey };

/** T07: same key replays; a second key on a reserved order is Nest 409 CONFLICT. Never swallow 409. */
export async function reserveOrder(orderId: string, idempotencyKey = newKey()): Promise<OrderListItem> {
  return request(`/v1/orders/${encodeURIComponent(orderId)}/reserve`, {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify({ idempotencyKey }),
  });
}

export async function scanPackSku(orderId: string, token: string): Promise<OrderListItem> {
  const value = token.trim();
  const body = /^\d+$/.test(value) ? { barcode: value } : { sku: value };
  return request(`/v1/orders/${encodeURIComponent(orderId)}/pack/scan`, {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify(body),
  });
}

/** POST label. Does not ship. */
export async function createOrderLabel(orderId: string): Promise<LabelResult> {
  return request(`/v1/orders/${encodeURIComponent(orderId)}/label`, {
    method: 'POST',
    headers: await headers(),
  });
}

/** GET mock PDF. Print uses this — never POST /ship. */
export async function fetchOrderLabelPdf(orderId: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/orders/${encodeURIComponent(orderId)}/label.pdf`, {
      headers: await headers(false, { Accept: 'application/pdf' }),
    });
  } catch {
    throw new ApiError('Sunucuya bağlanılamadı. İşlem tamamlanmış sayılmaz.', 0);
  }
  if (!res.ok) await parseError(res);
  return res.blob();
}

export async function fetchSkuStock(sku: string): Promise<StockBalance> {
  return request(`/v1/stock/${encodeURIComponent(sku)}`, { headers: await headers() });
}

export async function fetchStockMovements(): Promise<{ items: StockMovement[] }> {
  return request('/v1/stock/movements', { headers: await headers() });
}

export async function adjustStock(
  sku: string,
  deltaPhysical: number,
  reason: 'adjust' | 'count' = 'adjust',
  idempotencyKey = newKey(),
): Promise<StockAdjustResult> {
  return request('/v1/stock/adjust', {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify({ sku, deltaPhysical, reason, idempotencyKey }),
  });
}

export async function fetchOperations(): Promise<{ items: OperationItem[] }> {
  return request('/v1/operations', { headers: await headers() });
}

export async function registerDevice(fcmToken: string): Promise<{ uid: string; stored: true }> {
  return request('/v1/devices', {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify({ fcmToken }),
  });
}

export async function fetchReturns(): Promise<{ items: ReturnItem[]; tyWrite: false }> {
  return request('/v1/returns', { headers: await headers() });
}

export async function reviewReturn(
  id: string,
  body: { decision: 'approve' | 'reject'; note?: string },
): Promise<ReturnItem> {
  return request(`/v1/returns/${encodeURIComponent(id)}/review`, {
    method: 'PATCH',
    headers: await headers(true),
    body: JSON.stringify(body),
  });
}

export async function fetchTeam(): Promise<{ members: OrgMember[]; invites: OrgInvite[] }> {
  return request('/v1/team', { headers: await headers() });
}

export async function fetchTeamMembers(): Promise<{ members: OrgMember[]; invites: OrgInvite[] }> {
  return request('/v1/team/members', { headers: await headers() });
}

export async function inviteTeamMember(email: string): Promise<OrgInvite> {
  return request('/v1/team/invites', {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify({ email }),
  });
}

export async function fetchReportSummary(): Promise<OpsReport> {
  return request('/v1/reports/summary', { headers: await headers() });
}

export async function fetchBillingOffering(): Promise<BillingOfferingResponse> {
  return request('/v1/billing/offering', { headers: await headers() });
}

export async function fetchListingDraft(listingId: string): Promise<ListingDraft> {
  return request(`/v1/listings/${encodeURIComponent(listingId)}/draft`, { headers: await headers() });
}

export async function saveListingDraft(
  listingId: string,
  body: { title?: string; priceTry?: number },
): Promise<ListingDraft> {
  return request(`/v1/listings/${encodeURIComponent(listingId)}/draft`, {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify(body),
  });
}

export async function publishListing(listingId: string): Promise<ListingDraft> {
  return request(`/v1/listings/${encodeURIComponent(listingId)}/publish`, {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify({ mock: true }),
  });
}

export async function fetchSuppliers(): Promise<{ items: Supplier[] }> {
  return request('/v1/suppliers', { headers: await headers() });
}

export async function fetchSupplier(id: string): Promise<Supplier> {
  return request(`/v1/suppliers/${encodeURIComponent(id)}`, { headers: await headers() });
}

export async function createSupplier(body: { name: string; note?: string }): Promise<Supplier> {
  return request('/v1/suppliers', {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify(body),
  });
}

export async function patchSupplier(
  id: string,
  body: { name?: string; note?: string | null },
): Promise<Supplier> {
  return request(`/v1/suppliers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: await headers(true),
    body: JSON.stringify(body),
  });
}

export async function fetchPurchaseOrders(): Promise<{ items: PurchaseOrderStub[]; stub: true }> {
  return request('/v1/purchase-orders', { headers: await headers() });
}

export async function createPurchaseOrder(body: {
  supplierId: string;
  sku?: string;
  qty?: number;
}): Promise<PurchaseOrderStub> {
  return request('/v1/purchase-orders', {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify(body),
  });
}

export async function fetchWarehouses(): Promise<{ items: Warehouse[] }> {
  return request('/v1/warehouses', { headers: await headers() });
}

export async function createWarehouseTransfer(body: {
  sku: string;
  qty: number;
  fromWarehouseId?: string;
  toWarehouseId?: string;
}): Promise<WarehouseTransfer> {
  return request('/v1/warehouses/transfers', {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify(body),
  });
}

export async function fetchEinvoices(): Promise<{ items: EinvoiceDraft[]; gibLive: false }> {
  return request('/v1/einvoices', { headers: await headers() });
}

export async function createEinvoice(orderId?: string): Promise<EinvoiceDraft> {
  return request('/v1/einvoices', {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify(orderId ? { orderId } : {}),
  });
}

export async function fetchPrinter(): Promise<PrinterSettings> {
  return request('/v1/printer', { headers: await headers() });
}

export async function savePrinter(body: { name?: string; host?: string | null }): Promise<PrinterSettings> {
  return request('/v1/printer', {
    method: 'PUT',
    headers: await headers(true),
    body: JSON.stringify(body),
  });
}

export async function testPrinter(): Promise<PrinterTestResult> {
  return request('/v1/printer/test-print', {
    method: 'POST',
    headers: await headers(),
  });
}
