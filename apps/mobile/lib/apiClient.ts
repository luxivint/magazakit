import { API_URL, type HealthResponse, type PreviewList, type ProductListItem, type OrderListItem } from '@/lib/api';
import { getIdToken } from '@/lib/firebase';

export { API_URL };
export type { HealthResponse, PreviewList, ProductListItem, OrderListItem };

async function headers(): Promise<HeadersInit> {
  const token = await getIdToken();
  const h: Record<string, string> = { Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { signal, headers: await headers() });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return getJson('/health', signal);
}

export async function fetchProducts(): Promise<PreviewList<ProductListItem>> {
  return getJson('/v1/products');
}

export async function fetchOrders(): Promise<PreviewList<OrderListItem>> {
  return getJson('/v1/orders');
}
