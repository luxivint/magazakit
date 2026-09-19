import type { OrderLine, OrderListItem, OrderStatus, ProductStatus } from '@magazakit/contracts';
import { allHttpImages, firstHttpImage } from '../channels/map';
import type { MockListingSeed } from './mock-feed';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pageContent(payload: unknown): unknown[] {
  const rec = asRecord(payload);
  const content = rec?.content;
  return Array.isArray(content) ? content : [];
}

export function trendyolPageMeta(payload: unknown): {
  nextPageToken?: string;
  totalElements: number;
  page: number;
} {
  const rec = asRecord(payload);
  return {
    nextPageToken: rec?.nextPageToken ? str(rec.nextPageToken) : undefined,
    totalElements: num(rec?.totalElements),
    page: num(rec?.page),
  };
}

function listingFromVariant(
  content: Record<string, unknown>,
  variant: Record<string, unknown>,
): MockListingSeed | null {
  const barcode = str(variant.barcode) || str(content.barcode);
  if (!barcode) return null;
  const stock = asRecord(variant.stock);
  const price = asRecord(variant.price);
  const qty = num(stock?.quantity ?? variant.quantity);
  const sale = num(price?.salePrice ?? variant.salePrice ?? content.salePrice);
  const onSale = variant.onSale === true || str(variant.onSale) === 'true';
  const archived = variant.archived === true;
  const status: ProductStatus = onSale && !archived ? 'active' : 'passive';
  const sku = str(variant.stockCode) || str(content.stockCode) || barcode;
  const imageUrls = allHttpImages(
    variant.images,
    variant.imageUrl,
    variant.listImageUrl,
    content.images,
    content.imageUrl,
    content.listImageUrl,
    content.imagesUrl,
  );
  return {
    id: `ty-${barcode}`,
    sku,
    barcode,
    title: str(content.title) || sku,
    channel: 'trendyol',
    priceTry: sale,
    marketplaceStock: qty,
    physicalStock: 0,
    reservedStock: 0,
    sellableStock: 0,
    critical: qty > 0 && qty <= 3,
    status,
    statusLabel: status === 'active' ? 'Aktif' : 'Pasif',
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
  };
}

/** Official V2 approved-products content (variants[]) plus flat barcode rows. */
export function mapApprovedProducts(payload: unknown): MockListingSeed[] {
  const out: MockListingSeed[] = [];
  const seen = new Set<string>();
  for (const row of pageContent(payload)) {
    const content = asRecord(row);
    if (!content) continue;
    const variants = Array.isArray(content.variants) ? content.variants : null;
    if (variants && variants.length > 0) {
      for (const raw of variants) {
        const variant = asRecord(raw);
        if (!variant) continue;
        const item = listingFromVariant(content, variant);
        if (item && !seen.has(item.id)) {
          seen.add(item.id);
          out.push(item);
        }
      }
      continue;
    }
    const item = listingFromVariant(content, content);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

function mapPackageStatus(raw: string): { status: OrderStatus; statusLabel: string } {
  const s = raw.trim();
  if (s === 'Shipped') return { status: 'shipped', statusLabel: 'Kargoda' };
  if (s === 'Delivered') return { status: 'delivered', statusLabel: 'Teslim' };
  if (s === 'Cancelled' || s === 'UnSupplied' || s === 'UnDelivered') {
    return { status: 'cancelled', statusLabel: 'İptal' };
  }
  if (s === 'Returned') return { status: 'cancelled', statusLabel: 'İade' };
  if (s === 'Picking') return { status: 'picking', statusLabel: 'Hazırlanacak' };
  return { status: 'created', statusLabel: s || 'Oluşturuldu' };
}

function customerLabel(pkg: Record<string, unknown>): string {
  const first = str(pkg.customerFirstName);
  const last = str(pkg.customerLastName);
  if (first && last) return `${first} ${last.charAt(0)}.`;
  if (first) return first;
  return 'Müşteri';
}

function isoFromMillis(value: unknown): string | null {
  const n = num(value);
  if (n <= 0) return null;
  return new Date(n).toISOString();
}

/** Official getShipmentPackages / v2/orders content[]. */
export function mapShipmentPackages(payload: unknown): Omit<OrderListItem, 'organizationId'>[] {
  const out: Omit<OrderListItem, 'organizationId'>[] = [];
  for (const row of pageContent(payload)) {
    const pkg = asRecord(row);
    if (!pkg) continue;
    const packageId = str(pkg.shipmentPackageId ?? pkg.id);
    const orderNumber = str(pkg.orderNumber) || packageId;
    if (!packageId) continue;
    const rawStatus = str(pkg.status ?? pkg.shipmentPackageStatus);
    const mapped = mapPackageStatus(rawStatus);
    const linesRaw = Array.isArray(pkg.lines) ? pkg.lines : [];
    const lines: OrderLine[] = [];
    let itemCount = 0;
    for (const lineRaw of linesRaw) {
      const line = asRecord(lineRaw);
      if (!line) continue;
      const barcode = str(line.barcode);
      const qty = Math.max(1, Math.floor(num(line.quantity)));
      itemCount += qty;
      const title = str(line.productName) || str(line.productTitle) || barcode;
      lines.push({
        listingId: barcode ? `ty-${barcode}` : `ty-line-${str(line.lineId) || lines.length}`,
        qty,
        scannedQty: 0,
        title: title || undefined,
        imageUrl: firstHttpImage(line.productImage, line.imageUrl, line.images),
      });
    }
    const deadline = isoFromMillis(pkg.agreedDeliveryDate ?? pkg.estimatedDeliveryEndDate);
    const warn =
      deadline != null && new Date(deadline).getTime() - Date.now() < 4 * 60 * 60 * 1000;
    const productTitle =
      lines.map((l) => l.title).filter(Boolean).join(', ') || `${itemCount} adet`;
    out.push({
      id: `ty-${packageId}`,
      orderNumber,
      channel: 'trendyol',
      customerName: customerLabel(pkg),
      status: mapped.status,
      statusLabel: mapped.statusLabel,
      itemCount,
      productTitle,
      imageUrl: lines.find((l) => l.imageUrl)?.imageUrl ?? null,
      totalTry: num(pkg.packageTotalPrice ?? pkg.packageGrossAmount),
      cargoDeadlineAt: deadline,
      cargoWarning: warn,
      createdAt: isoFromMillis(pkg.orderDate) ?? new Date().toISOString(),
      lines,
      reserved: false,
      reservationKey: null,
      packed: mapped.status === 'shipped' || mapped.status === 'delivered',
      labeled: false,
      shipped: mapped.status === 'shipped' || mapped.status === 'delivered',
      labelUrl: null,
    });
  }
  return out;
}
