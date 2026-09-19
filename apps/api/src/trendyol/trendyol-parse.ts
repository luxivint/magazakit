import type {
  OrderLine,
  OrderListItem,
  OrderMoney,
  OrderStatus,
  ProductStatus,
} from '@magazakit/contracts';
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
  const s = raw.trim().toLowerCase();
  if (s === 'shipped' || s === 'atcollectionpoint') {
    return { status: 'shipped', statusLabel: s === 'atcollectionpoint' ? 'Teslim noktasında' : 'Kargoda' };
  }
  if (s === 'delivered') return { status: 'delivered', statusLabel: 'Teslim' };
  if (s === 'cancelled' || s === 'unsupplied' || s === 'undelivered') {
    return { status: 'cancelled', statusLabel: s === 'undelivered' ? 'Teslim edilemedi' : 'İptal' };
  }
  if (s === 'returned') return { status: 'cancelled', statusLabel: 'İade' };
  if (s === 'picking') return { status: 'picking', statusLabel: 'Hazırlanacak' };
  if (s === 'invoiced') return { status: 'picking', statusLabel: 'Faturalandı' };
  if (s === 'awaiting') return { status: 'created', statusLabel: 'Bekliyor' };
  return { status: 'created', statusLabel: raw.trim() || 'Oluşturuldu' };
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function closedStatus(status: OrderStatus): boolean {
  return status === 'shipped' || status === 'delivered' || status === 'cancelled';
}

function paymentLabel(pkg: Record<string, unknown>): string | null {
  const raw = str(pkg.paymentMethod ?? pkg.paymentType ?? pkg.paymentTypeName);
  if (!raw || raw === '-') return null;
  return raw;
}

function cargoPayer(pkg: Record<string, unknown>): OrderMoney['cargoPayer'] {
  const raw = pkg.whoPays;
  if (raw === 1 || raw === '1' || String(raw).toLowerCase() === 'seller') return 'seller';
  if (raw == null || raw === '') return null;
  return 'marketplace';
}

/** Commission on the package is a percent. Amount and sellerRevenue are settlement, not this feed. */
export function estimatePackageMoney(
  pkg: Record<string, unknown>,
  lines: OrderLine[],
  customerTry: number,
): OrderMoney {
  const commissionRates = lines
    .map((l) => l.commissionRate)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  const commissionTry = lines.every((l) => l.commissionTry != null)
    ? round2(lines.reduce((s, l) => s + (l.commissionTry ?? 0), 0))
    : null;
  const lineSgr = round2(lines.reduce((s, l) => s + (l.sgrFeeTry ?? 0), 0));
  const sgrFeeTry = lineSgr || round2(num(pkg.totalSgrFee));
  const sellerDiscountTry = round2(
    num(pkg.packageSellerDiscount) ||
      lines.reduce((s, l) => s + (l.sellerDiscountTry ?? 0), 0),
  );
  const tyDiscountTry = round2(
    num(pkg.packageTyDiscount) || lines.reduce((s, l) => s + (l.tyDiscountTry ?? 0), 0),
  );
  const grossTry = round2(
    num(pkg.packageGrossAmount) ||
      lines.reduce((s, l) => s + (l.grossTry ?? 0), 0) ||
      customerTry + sellerDiscountTry + tyDiscountTry,
  );
  const rate =
    commissionRates.length === 0
      ? null
      : round2(commissionRates.reduce((s, n) => s + n, 0) / commissionRates.length);
  const estimatedEarningsTry = null;
  const deci = num(pkg.cargoDeci);
  return {
    grossTry,
    sellerDiscountTry,
    tyDiscountTry,
    customerTry,
    commissionRate: rate,
    commissionTry,
    commissionSource: commissionTry == null ? 'none' : 'package_rate',
    sgrFeeTry,
    cargoFeeTry: null,
    cargoFeeLabel: null,
    serviceFeeTry: null,
    storeFeeTry: null,
    stoppageTry: null,
    sellerRevenueTry: null,
    cancelTry: 0,
    returnTry: 0,
    returnCargoTry: 0,
    intlReturnOpTry: 0,
    intlServiceTry: 0,
    penaltyTry: 0,
    paymentMethod: paymentLabel(pkg),
    cargoFeeRate: null,
    financeLoaded: false,
    estimatedEarningsTry,
    earningsEstimated: true,
    cargoProvider: str(pkg.cargoProviderName) || null,
    cargoTrackingNumber: str(pkg.cargoTrackingNumber) || null,
    cargoDeci: deci > 0 ? deci : null,
    cargoPayer: cargoPayer(pkg),
  };
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
    let mapped = mapPackageStatus(rawStatus);
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
      const unit = num(line.lineUnitPrice || line.price);
      const grossUnit = num(line.lineGrossAmount) || unit;
      const sellerDisc = num(line.lineSellerDiscount);
      const tyDisc = num(line.lineTyDiscount);
      const commissionRate = num(line.commission);
      const lineNet = round2((unit || grossUnit) * qty);
      const commissionTry =
        commissionRate > 0 ? round2(lineNet * (commissionRate / 100)) : undefined;
      const sgrUnit = num(line.lineSgrFee);
      lines.push({
        listingId: barcode ? `ty-${barcode}` : `ty-line-${str(line.lineId) || lines.length}`,
        qty,
        scannedQty: 0,
        title: title || undefined,
        imageUrl: firstHttpImage(
          line.productImage,
          line.imageUrl,
          line.images,
          line.productImages,
          line.listImageUrl,
          line.thumbnailUrl,
        ),
        unitPriceTry: unit || undefined,
        grossTry: round2(grossUnit * qty) || undefined,
        sellerDiscountTry: sellerDisc || undefined,
        tyDiscountTry: tyDisc || undefined,
        commissionRate: commissionRate || undefined,
        commissionTry,
        sgrFeeTry: sgrUnit ? round2(sgrUnit * qty) : undefined,
        vatRate: num(line.vatRate) || undefined,
      });
    }
    if (!closedStatus(mapped.status)) {
      const lineStates = linesRaw
        .map((raw) => asRecord(raw))
        .filter(Boolean)
        .map((line) => mapPackageStatus(str(line?.orderLineItemStatusName)).status);
      const allGone =
        lineStates.length > 0 &&
        lineStates.every((s) => s === 'shipped' || s === 'delivered' || s === 'cancelled');
      if (allGone) {
        mapped = lineStates.every((s) => s === 'delivered')
          ? mapPackageStatus('Delivered')
          : lineStates.every((s) => s === 'cancelled')
            ? mapPackageStatus('Cancelled')
            : mapPackageStatus('Shipped');
      } else if (str(pkg.cargoTrackingNumber)) {
        mapped = mapPackageStatus('Shipped');
      }
    }
    const customerTry = num(pkg.packageTotalPrice ?? pkg.packageGrossAmount);
    const money = estimatePackageMoney(pkg, lines, customerTry);
    const closed = closedStatus(mapped.status);
    const deadline = isoFromMillis(pkg.agreedDeliveryDate ?? pkg.estimatedDeliveryEndDate);
    const warn =
      !closed &&
      deadline != null &&
      new Date(deadline).getTime() - Date.now() < 4 * 60 * 60 * 1000;
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
      totalTry: customerTry,
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
      money,
    });
  }
  return out;
}
