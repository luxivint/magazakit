import {
  API_URL,
  type CurrentUserResponse,
  type HealthResponse,
  type ListingMapping,
  type OrganizationSummary,
  type PreviewList,
  type ProductListItem,
  type OrderListItem,
  type ShopStatus,
  type ShopSyncResult,
  type ReservationResult,
  type ScanResult,
  type LabelPreview,
  type PrintResult,
  type StockAdjustResult,
  type OperationItem,
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
  ReservationResult,
  ScanResult,
  LabelPreview,
  PrintResult,
  StockAdjustResult,
  OperationItem,
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
  if (res.status === 0 || res.status >= 500) {
    message = 'Nest API yanıt vermedi. İşlem tamamlanmış sayılmaz.';
  }
  if (res.status === 401) {
    message = message || 'Oturum doğrulanamadı. Tekrar giriş yap.';
  }
  if (res.status === 409) {
    message =
      message && message !== `API ${res.status}`
        ? message
        : 'Bu işlem zaten yapıldı. İkinci rezervasyon yok.';
  }
  throw new ApiError(message, res.status, code);
}

async function request<T>(path: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError('Nest API’ye bağlanılamadı. İşlem tamamlanmış sayılmaz.', 0);
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

export async function fetchShops(): Promise<{ items: ShopStatus[]; mock: true }> {
  return request('/v1/shops', { headers: await headers() });
}

/** K01 mock. Never send apiKey/apiSecret. */
export async function connectTrendyolShop(sellerId?: string): Promise<ShopStatus> {
  const body: { sellerId?: string } = {};
  if (sellerId?.trim()) body.sellerId = sellerId.trim();
  return request('/v1/shops/trendyol/connect', {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify(body),
  });
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

export async function reserveOrder(orderId: string, idempotencyKey = newKey()): Promise<ReservationResult> {
  try {
    return await request(`/v1/orders/${encodeURIComponent(orderId)}/reserve`, {
      method: 'POST',
      headers: await headers(true, { 'Idempotency-Key': idempotencyKey }),
      body: JSON.stringify({ idempotencyKey }),
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      return { orderId, reserved: true, alreadyReserved: true };
    }
    throw e;
  }
}

export async function scanOrderSku(orderId: string, sku: string): Promise<ScanResult> {
  return request(`/v1/orders/${encodeURIComponent(orderId)}/scan`, {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify({ sku: sku.trim() }),
  });
}

export async function fetchOrderLabel(orderId: string): Promise<LabelPreview> {
  return request(`/v1/orders/${encodeURIComponent(orderId)}/label`, { headers: await headers() });
}

export async function printOrderLabel(orderId: string): Promise<PrintResult> {
  return request(`/v1/orders/${encodeURIComponent(orderId)}/label/print`, {
    method: 'POST',
    headers: await headers(true),
    body: JSON.stringify({}),
  });
}

export async function adjustStock(sku: string, delta: number, idempotencyKey = newKey()): Promise<StockAdjustResult> {
  return request('/v1/stock/adjust', {
    method: 'POST',
    headers: await headers(true, { 'Idempotency-Key': idempotencyKey }),
    body: JSON.stringify({ sku, delta, idempotencyKey }),
  });
}

export async function fetchOperations(): Promise<{ items: OperationItem[] }> {
  return request('/v1/operations', { headers: await headers() });
}
