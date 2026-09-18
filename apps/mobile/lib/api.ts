export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:43140').replace(/\/$/, '');

export type ProductListItem = {
  id: string;
  sku: string;
  barcode: string;
  title: string;
  channel: 'trendyol';
  priceTry: number;
  physicalStock: number;
  reservedStock: number;
  sellableStock: number;
  critical: boolean;
  status: 'active' | 'passive';
  statusLabel: string;
  imageUrl: string | null;
};

export type OrderListItem = {
  id: string;
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

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`health ${res.status}`);
  return res.json() as Promise<HealthResponse>;
}

export async function fetchProducts(): Promise<PreviewList<ProductListItem>> {
  return getJson('/v1/products');
}

export async function fetchOrders(): Promise<PreviewList<OrderListItem>> {
  return getJson('/v1/orders');
}
