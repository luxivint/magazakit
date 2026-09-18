import type { Order, Product, ProductThumbKind } from '@/data/mock';
import type { OrderListItem, ProductListItem } from '@/lib/api';

const THUMBS: ProductThumbKind[] = ['mug', 'towel', 'thermos', 'lamp'];

function mapStatus(status: string, label: string): Pick<Order, 'status' | 'statusLabel'> {
  if (status === 'shipped' || status === 'delivered' || label === 'Kargoda') {
    return { status: 'kargoda', statusLabel: label || 'Kargoda' };
  }
  if (status === 'cancelled' || label === 'İade') {
    return { status: 'iade', statusLabel: label || 'İade' };
  }
  return { status: 'hazirlanacak', statusLabel: label || 'Hazırlanacak' };
}

function dueLabel(iso: string | null, warn: boolean): { due: string; dueTone: 'warn' | 'idle' } {
  if (!iso) return { due: warn ? 'Kargo süresi doluyor' : 'Termin yok', dueTone: warn ? 'warn' : 'idle' };
  const d = new Date(iso);
  const clock = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return {
    due: sameDay ? `Bugün ${clock}'ye kadar` : `Yarın ${clock}'ye kadar`,
    dueTone: warn ? 'warn' : 'idle',
  };
}

export function mapApiProduct(item: ProductListItem, index: number, mappedSku?: string): Product {
  const sku = mappedSku?.trim() || item.sku;
  return {
    id: item.id,
    name: item.title,
    sku,
    listingSku: item.sku,
    barcode: item.barcode,
    price: item.priceTry,
    physical: item.physicalStock,
    reserved: item.reservedStock,
    sellable: item.sellableStock,
    stock: item.sellableStock,
    listing: item.statusLabel || (item.status === 'active' ? 'Yayında' : 'Pasif'),
    channels: { trendyol: true },
    thumb: THUMBS[index % THUMBS.length],
    critical: item.critical,
  };
}

export function mapApiOrder(item: OrderListItem, index: number): Order {
  const due = dueLabel(item.cargoDeadlineAt, item.cargoWarning);
  return {
    id: item.id,
    channel: 'trendyol',
    channelLabel: 'Trendyol',
    number: item.orderNumber.startsWith('#') ? item.orderNumber : `#${item.orderNumber}`,
    product: `${item.itemCount} adet`,
    customer: item.customerName,
    qty: item.itemCount,
    amount: item.totalTry,
    time: new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    due: due.due,
    dueTone: due.dueTone,
    ...mapStatus(item.status, item.statusLabel),
    thumb: THUMBS[index % THUMBS.length],
  };
}
