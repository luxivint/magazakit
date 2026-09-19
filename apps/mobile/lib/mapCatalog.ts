import type { Order, Product, ProductThumbKind } from '@/data/mock';
import type { Channel, OrderListItem, ProductListItem } from '@/lib/api';

const THUMBS: ProductThumbKind[] = ['mug', 'towel', 'thermos', 'lamp'];

const CHANNEL_LABELS: Record<Channel, string> = {
  trendyol: 'Trendyol',
  hepsiburada: 'Hepsiburada',
  n11: 'n11',
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  ciceksepeti: 'Çiçeksepeti',
  ikas: 'ikas',
  amazon: 'Amazon TR',
  pazarama: 'Pazarama',
  ticimax: 'Ticimax',
  ideasoft: 'IdeaSoft',
};

export function mapStatus(status: string, label: string): Pick<Order, 'status' | 'statusLabel'> {
  const raw = status.trim().toLowerCase();
  const text = label.trim().toLowerCase();
  if (
    raw === 'delivered' ||
    text === 'teslim' ||
    text === 'tamamlandı' ||
    text === 'tamamlandi'
  ) {
    return { status: 'tamamlandi', statusLabel: label && label !== 'Kargoda' ? label : 'Teslim' };
  }
  if (raw === 'shipped' || text === 'kargoda' || text === 'teslim noktasında') {
    return { status: 'kargoda', statusLabel: label || 'Kargoda' };
  }
  if (raw === 'cancelled' || text === 'iade' || text === 'iptal' || text === 'teslim edilemedi') {
    return { status: 'iade', statusLabel: label || 'İade' };
  }
  return { status: 'hazirlanacak', statusLabel: label || 'Hazırlanacak' };
}

function dueLabel(
  iso: string | null,
  warn: boolean,
  status?: Order['status'],
  cargoProvider?: string | null,
): { due: string; dueTone: 'warn' | 'idle' } {
  if (status === 'tamamlandi') {
    return { due: cargoProvider ? `Teslim · ${cargoProvider}` : 'Teslim edildi', dueTone: 'idle' };
  }
  if (status === 'kargoda') {
    return { due: cargoProvider ? `Kargo · ${cargoProvider}` : 'Kargoya verildi', dueTone: 'idle' };
  }
  if (status === 'iade') {
    return { due: 'İade / iptal', dueTone: 'idle' };
  }
  if (!iso) return { due: warn ? 'Kargo süresi doluyor' : 'Termin yok', dueTone: warn ? 'warn' : 'idle' };
  const d = new Date(iso);
  const clock = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day - start) / 86_400_000);
  if (diff === 0) return { due: `Bugün ${clock}'ye kadar`, dueTone: warn ? 'warn' : 'idle' };
  if (diff === 1) return { due: `Yarın ${clock}'ye kadar`, dueTone: warn ? 'warn' : 'idle' };
  return {
    due: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
    dueTone: warn ? 'warn' : 'idle',
  };
}

export function mapApiProduct(item: ProductListItem, index: number): Product {
  return {
    id: item.id,
    listingId: item.listingId || item.id,
    name: item.title,
    sku: item.sku,
    listingSku: item.sku,
    barcode: item.barcode,
    price: item.priceTry,
    physical: item.physicalStock,
    reserved: item.reservedStock,
    sellable: item.sellableStock,
    stock: item.sellableStock,
    marketplaceStock: item.marketplaceStock,
    mapped: item.mapped,
    listing: item.mapped ? item.statusLabel : 'Eşleşmedi',
    channels: { trendyol: item.channel === 'trendyol' },
    channel: item.channel,
    thumb: THUMBS[index % THUMBS.length],
    imageUrl: item.imageUrl,
    imageUrls: item.imageUrls?.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [],
    critical: item.critical,
    statusLabel: item.statusLabel,
  };
}

export function catalogSourceLabel(reachable: boolean, apiMock: boolean | null): string {
  if (!reachable) return 'bağlı değil';
  return apiMock ? 'test mağazası' : 'mağaza';
}

export function shopStatusLabel(status: string, fallback: string): string {
  if (status === 'live_connected') return fallback || 'Bağlı (okuma)';
  if (status === 'mock_connected') return 'Bağlı (test)';
  return fallback;
}

function fold(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9ğüşöçı\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function productPhoto(p: Product): string | null {
  return p.imageUrl || p.imageUrls[0] || null;
}

export function catalogImageForLine(
  products: Product[],
  listingId: string,
  title?: string,
): string | null {
  const exact = products.find((p) => {
    if (!listingId) return false;
    if (p.id === listingId || p.listingId === listingId) return true;
    if (p.barcode && (p.barcode === listingId || `ty-${p.barcode}` === listingId)) return true;
    if (p.sku && (p.sku === listingId || listingId.endsWith(p.sku))) return true;
    return false;
  });
  const exactPhoto = exact ? productPhoto(exact) : null;
  if (exactPhoto) return exactPhoto;
  const needle = title ? fold(title).slice(0, 28) : '';
  if (needle.length >= 8) {
    const fuzzy = products.find((p) => {
      const photo = productPhoto(p);
      if (!photo) return false;
      const name = fold(p.name);
      return name.includes(needle) || needle.includes(name.slice(0, 28));
    });
    if (fuzzy) return productPhoto(fuzzy);
  }
  return null;
}

export function attachOrderCatalogImages(orders: Order[], products: Product[]): Order[] {
  return orders.map((order) => {
    const lines = order.lines.map((line) => ({
      ...line,
      imageUrl: line.imageUrl || catalogImageForLine(products, line.listingId, line.title),
    }));
    return {
      ...order,
      lines,
      imageUrl:
        order.imageUrl ||
        lines.find((l) => l.imageUrl)?.imageUrl ||
        catalogImageForLine(products, '', order.product) ||
        null,
    };
  });
}

export function mapApiOrder(item: OrderListItem, index: number): Order {
  const mapped = mapStatus(item.status, item.statusLabel);
  const closed = mapped.status !== 'hazirlanacak';
  const due = dueLabel(
    item.cargoDeadlineAt,
    item.cargoWarning && !closed,
    mapped.status,
    item.money?.cargoProvider,
  );
  const lines = (item.lines ?? []).map((l) => ({
    listingId: l.listingId,
    qty: l.qty,
    title: l.title,
    imageUrl: l.imageUrl ?? null,
    unitPriceTry: l.unitPriceTry,
    commissionRate: l.commissionRate,
  }));
  return {
    id: item.id,
    channel: item.channel,
    channelLabel: CHANNEL_LABELS[item.channel] ?? item.channel,
    number: item.orderNumber.startsWith('#') ? item.orderNumber : `#${item.orderNumber}`,
    product: item.productTitle || lines[0]?.title || `${item.itemCount} adet`,
    customer: item.customerName,
    qty: item.itemCount,
    amount: item.totalTry,
    time: new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    createdAt: item.createdAt,
    due: due.due,
    dueTone: due.dueTone,
    ...mapped,
    thumb: THUMBS[index % THUMBS.length],
    imageUrl: item.imageUrl ?? lines.find((l) => l.imageUrl)?.imageUrl ?? null,
    lines,
    reserved: !!item.reserved,
    packed: !!item.packed,
    labeled: !!item.labeled,
    shipped: mapped.status === 'kargoda',
    money: item.money,
  };
}
