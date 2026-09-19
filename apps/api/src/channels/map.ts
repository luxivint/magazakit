import type {
  Channel,
  OrderListItem,
  OrderStatus,
  ProductStatus,
} from '@magazakit/contracts';
import type { MockListingSeed } from '../trendyol/mock-feed';
import { num, rec, str } from './http';

export function listing(input: {
  channel: Channel;
  id: string;
  sku: string;
  barcode?: string;
  title: string;
  priceTry?: number;
  priceCurrency?: string;
  marketplaceStock?: number;
  active?: boolean;
  imageUrl?: string | null;
  imageUrls?: string[];
  weightKg?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  lengthCm?: number | null;
  dimensionalWeight?: number | null;
  cargoProvider?: string | null;
}): MockListingSeed {
  const qty = input.marketplaceStock ?? 0;
  const status: ProductStatus = input.active === false ? 'passive' : 'active';
  return {
    id: input.id,
    sku: input.sku,
    barcode: input.barcode || input.sku,
    title: input.title,
    channel: input.channel,
    priceTry: input.priceTry ?? 0,
    priceCurrency: input.priceCurrency || 'TRY',
    marketplaceStock: qty,
    physicalStock: 0,
    reservedStock: 0,
    sellableStock: 0,
    critical: qty > 0 && qty <= 3,
    status,
    statusLabel: status === 'active' ? 'Aktif' : 'Pasif',
    imageUrl: input.imageUrl ?? null,
    imageUrls: input.imageUrls,
    weightKg: input.weightKg ?? null,
    widthCm: input.widthCm ?? null,
    heightCm: input.heightCm ?? null,
    lengthCm: input.lengthCm ?? null,
    dimensionalWeight: input.dimensionalWeight ?? null,
    cargoProvider: input.cargoProvider ?? null,
  };
}

export function mapStatus(raw: string): {
  status: OrderStatus;
  statusLabel: string;
} {
  const s = raw.toLowerCase();
  if (s === 'unfulfilled' || s === 'unshipped' || s === 'pending') {
    return { status: 'created', statusLabel: raw || 'Oluşturuldu' };
  }
  if (s.includes('partially_fulfilled') || s.includes('partially fulfilled')) {
    return { status: 'picking', statusLabel: 'Kısmen hazırlandı' };
  }
  if (s.includes('partially_shipped') || s.includes('partially shipped')) {
    return { status: 'picking', statusLabel: 'Kısmen kargolandı' };
  }
  if (s.includes('unfulfillable')) {
    return { status: 'cancelled', statusLabel: 'Karşılanamaz' };
  }
  if (s === 'fulfilled') {
    return { status: 'shipped', statusLabel: 'Gönderildi' };
  }
  if (s.includes('ship') || s.includes('kargo') || s === 'invoiced') {
    return { status: 'shipped', statusLabel: 'Kargoda' };
  }
  if (s.includes('deliver') || s.includes('teslim') || s === 'completed') {
    return { status: 'delivered', statusLabel: 'Teslim' };
  }
  if (
    s.includes('cancel') ||
    s.includes('iptal') ||
    s.includes('refund') ||
    s.includes('return')
  ) {
    return { status: 'cancelled', statusLabel: 'İptal' };
  }
  if (s.includes('pick') || s.includes('hazır') || s === 'processing') {
    return { status: 'picking', statusLabel: 'Hazırlanacak' };
  }
  return { status: 'created', statusLabel: raw || 'Oluşturuldu' };
}

export function order(input: {
  channel: Channel;
  id: string;
  orderNumber: string;
  customerName?: string;
  statusRaw?: string;
  itemCount?: number;
  totalTry?: number;
  totalCurrency?: string;
  createdAt?: string;
  lines?: { listingId: string; qty: number }[];
}): Omit<OrderListItem, 'organizationId'> {
  const mapped = mapStatus(input.statusRaw ?? '');
  const lines = (input.lines ?? []).map((l) => ({ ...l, scannedQty: 0 }));
  return {
    id: input.id,
    orderNumber: input.orderNumber,
    channel: input.channel,
    customerName: input.customerName || 'Müşteri',
    status: mapped.status,
    statusLabel: mapped.statusLabel,
    itemCount: input.itemCount ?? lines.reduce((n, l) => n + l.qty, 0),
    totalTry: input.totalTry ?? 0,
    totalCurrency: input.totalCurrency || 'TRY',
    cargoDeadlineAt: null,
    cargoWarning: false,
    createdAt: input.createdAt || new Date().toISOString(),
    lines,
    reserved: false,
    reservationKey: null,
    packed: mapped.status === 'shipped' || mapped.status === 'delivered',
    labeled: false,
    shipped: mapped.status === 'shipped' || mapped.status === 'delivered',
    labelUrl: null,
  };
}

export function pageItems(
  payload: unknown,
  keys = [
    'content',
    'items',
    'data',
    'products',
    'orders',
    'listings',
    'supplierOrderListWithBranch',
    'Orders',
  ],
): unknown[] {
  const obj = rec(payload);
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    const v = obj?.[key];
    if (Array.isArray(v)) return v;
  }
  const nested = rec(obj?.content) ?? rec(obj?.data);
  if (nested && Array.isArray(nested.content)) return nested.content;
  return [];
}

export function httpImage(value: unknown): string | null {
  const url = str(value);
  return url.startsWith('http://') || url.startsWith('https://') ? url : null;
}

/** Trendyol/HB/n11 image envelopes: string, {url}, {imageUrl}, nested arrays. */
export function firstHttpImage(...sources: unknown[]): string | null {
  const all = allHttpImages(...sources);
  return all[0] ?? null;
}

export function allHttpImages(...sources: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (value: unknown): void => {
    if (value == null) return;
    if (typeof value === 'string') {
      const url = httpImage(value);
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    const obj = rec(value);
    if (!obj) return;
    walk(obj.url);
    walk(obj.imageUrl);
    walk(obj.listImageUrl);
    walk(obj.href);
    walk(obj.src);
    walk(obj.images);
    walk(obj.imageUrls);
    walk(obj.imagesUrl);
  };
  for (const source of sources) walk(source);
  return out;
}

export function envTriple(
  prefix: string,
): { id: string; key: string; secret: string } | null {
  const id =
    process.env[`${prefix}_SELLER_ID`]?.trim() ||
    process.env[`${prefix}_MERCHANT_ID`]?.trim() ||
    '';
  const key =
    process.env[`${prefix}_API_KEY`]?.trim() ||
    process.env[`${prefix}_APP_KEY`]?.trim() ||
    '';
  const secret =
    process.env[`${prefix}_API_SECRET`]?.trim() ||
    process.env[`${prefix}_APP_SECRET`]?.trim() ||
    '';
  if (!key || !secret) return null;
  return { id, key, secret };
}
