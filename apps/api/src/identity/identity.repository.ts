import type {
  EinvoiceDraft,
  ListingDraft,
  ListingMapping,
  OperationEvent,
  OrderListItem,
  OrgInvite,
  OrgMember,
  OrganizationSummary,
  OutboxEntry,
  PrinterSettings,
  ProductListItem,
  PurchaseOrderStub,
  ReturnListItem,
  ShopStatus,
  ShopChannel,
  StockBalance,
  StockMovement,
  Supplier,
  TrendyolTariff,
  Warehouse,
  WarehouseTransfer,
} from '@magazakit/contracts';
import type { ChannelSecrets } from '../channels/shop-secrets';
import type { MockListingSeed } from '../trendyol/mock-feed';

export type PersistenceBackend = 'memory' | 'postgres' | 'file';

export type StoredListing = MockListingSeed & { shopId: string };

export function mergeListingDims(existing: MockListingSeed | null | undefined, incoming: MockListingSeed): MockListingSeed {
  if (!existing) return incoming;
  const keep = (fresh: number | null | undefined, prev: number | null | undefined) =>
    fresh != null && fresh > 0 ? fresh : prev ?? null;
  return {
    ...existing,
    ...incoming,
    weightKg: keep(incoming.weightKg, existing.weightKg),
    widthCm: keep(incoming.widthCm, existing.widthCm),
    heightCm: keep(incoming.heightCm, existing.heightCm),
    lengthCm: keep(incoming.lengthCm, existing.lengthCm),
    dimensionalWeight: keep(incoming.dimensionalWeight, existing.dimensionalWeight),
    cargoProvider: incoming.cargoProvider || existing.cargoProvider || null,
  };
}

export function sellableOf(physical: number, reserved: number): number {
  return Math.max(0, physical - reserved);
}

export function emptyStock(organizationId: string, sku: string): StockBalance {
  return {
    organizationId,
    sku,
    physicalStock: 0,
    reservedStock: 0,
    sellableStock: 0,
  };
}

export interface IdentityRepository {
  readonly backend: PersistenceBackend;
  getOrgForUid(uid: string): Promise<OrganizationSummary | null>;
  getOrgById(id: string): Promise<OrganizationSummary | null>;
  createOrg(uid: string, name: string): Promise<OrganizationSummary>;
  saveDevice(uid: string, fcmToken: string): Promise<void>;
  getDeviceToken(uid: string): Promise<string | null>;
  upsertShop(
    org: OrganizationSummary,
    channel: ShopChannel,
    overlay?: Partial<Pick<ShopStatus, 'status' | 'statusLabel' | 'sellerLabel' | 'mock' | 'k01'>>,
  ): Promise<ShopStatus>;
  upsertTrendyolMockShop(
    org: OrganizationSummary,
    overlay?: Partial<Pick<ShopStatus, 'status' | 'statusLabel' | 'sellerLabel' | 'mock'>>,
  ): Promise<ShopStatus>;
  listShopsForUid(uid: string): Promise<ShopStatus[]>;
  getShopById(shopId: string): Promise<ShopStatus | null>;
  connectShopWithSecrets(
    org: OrganizationSummary,
    channel: ShopChannel,
    overlay: Partial<Pick<ShopStatus, 'status' | 'statusLabel' | 'sellerLabel' | 'mock' | 'k01'>>,
    secrets: ChannelSecrets,
  ): Promise<ShopStatus>;
  saveShopSecrets(shopId: string, orgId: string, secrets: ChannelSecrets): Promise<void>;
  getShopSecrets(shopId: string, orgId: string): Promise<ChannelSecrets | null>;
  markShopSynced(shopId: string, checkpoint: string, lastSyncAt: string): Promise<ShopStatus>;
  upsertListings(orgId: string, shopId: string, listings: MockListingSeed[]): Promise<number>;
  upsertOrders(orgId: string, orders: Omit<OrderListItem, 'organizationId'>[]): Promise<number>;
  listListings(orgId: string): Promise<StoredListing[]>;
  listOrgOrders(orgId: string): Promise<OrderListItem[]>;
  getOrder(orgId: string, orderId: string): Promise<OrderListItem | null>;
  saveOrder(order: OrderListItem): Promise<OrderListItem>;
  getListing(orgId: string, listingId: string): Promise<StoredListing | null>;
  upsertMapping(orgId: string, listingId: string, sku: string): Promise<ListingMapping>;
  listMappings(orgId: string): Promise<ListingMapping[]>;
  getSkuStock(orgId: string, sku: string): Promise<StockBalance>;
  setSkuStock(balance: StockBalance): Promise<StockBalance>;
  findMovementByKey(orgId: string, idempotencyKey: string): Promise<StockMovement | null>;
  appendMovement(movement: StockMovement): Promise<StockMovement>;
  listMovements(orgId: string): Promise<StockMovement[]>;
  appendOutbox(entry: OutboxEntry): Promise<OutboxEntry>;
  listOutbox(orgId: string): Promise<OutboxEntry[]>;
  listPendingOutbox(): Promise<OutboxEntry[]>;
  countPendingOutbox(): Promise<number>;
  updateOutboxStatus(id: string, status: OutboxEntry['status']): Promise<boolean>;
  appendOperation(event: OperationEvent): Promise<OperationEvent>;
  listOperations(orgId: string): Promise<OperationEvent[]>;
  upsertReturns(orgId: string, returns: Omit<ReturnListItem, 'organizationId'>[]): Promise<number>;
  listReturns(orgId: string): Promise<ReturnListItem[]>;
  getReturn(orgId: string, returnId: string): Promise<ReturnListItem | null>;
  saveReturn(item: ReturnListItem): Promise<ReturnListItem>;
  listMembers(orgId: string): Promise<OrgMember[]>;
  upsertMember(member: OrgMember): Promise<OrgMember>;
  listInvites(orgId: string): Promise<OrgInvite[]>;
  findInviteByEmail(orgId: string, email: string): Promise<OrgInvite | null>;
  saveInvite(invite: OrgInvite): Promise<OrgInvite>;
  getListingDraft(orgId: string, listingId: string): Promise<ListingDraft | null>;
  saveListingDraft(draft: ListingDraft): Promise<ListingDraft>;
  saveListing(orgId: string, listing: StoredListing): Promise<StoredListing>;
  listSuppliers(orgId: string): Promise<Supplier[]>;
  getSupplier(orgId: string, supplierId: string): Promise<Supplier | null>;
  saveSupplier(supplier: Supplier): Promise<Supplier>;
  listPurchaseOrders(orgId: string): Promise<PurchaseOrderStub[]>;
  savePurchaseOrder(po: PurchaseOrderStub): Promise<PurchaseOrderStub>;
  listWarehouses(orgId: string): Promise<Warehouse[]>;
  saveWarehouse(warehouse: Warehouse): Promise<Warehouse>;
  listTransfers(orgId: string): Promise<WarehouseTransfer[]>;
  saveTransfer(transfer: WarehouseTransfer): Promise<WarehouseTransfer>;
  listEinvoices(orgId: string): Promise<EinvoiceDraft[]>;
  saveEinvoice(draft: EinvoiceDraft): Promise<EinvoiceDraft>;
  getPrinter(orgId: string): Promise<PrinterSettings | null>;
  savePrinter(settings: PrinterSettings): Promise<PrinterSettings>;
  getTrendyolTariff(orgId: string): Promise<TrendyolTariff | null>;
  saveTrendyolTariff(orgId: string, tariff: TrendyolTariff): Promise<TrendyolTariff>;
}

export function toProductListItem(
  listing: StoredListing,
  orgId: string,
  mapping: ListingMapping | undefined,
  stock: StockBalance | undefined,
): ProductListItem {
  const mapped = Boolean(mapping);
  const physicalStock = mapped ? (stock?.physicalStock ?? 0) : 0;
  const reservedStock = mapped ? (stock?.reservedStock ?? 0) : 0;
  return {
    id: listing.id,
    listingId: listing.id,
    organizationId: orgId,
    sku: mapping?.sku ?? listing.sku,
    barcode: listing.barcode,
    title: listing.title,
    channel: listing.channel,
    priceTry: listing.priceTry,
    priceCurrency: listing.priceCurrency,
    marketplaceStock: listing.marketplaceStock,
    physicalStock,
    reservedStock,
    sellableStock: mapped ? sellableOf(physicalStock, reservedStock) : 0,
    critical: listing.critical,
    mapped,
    stockSource: mapped ? 'master_sku' : 'none',
    status: listing.status,
    statusLabel: listing.statusLabel,
    imageUrl: listing.imageUrl,
    imageUrls: listing.imageUrls,
    weightKg: listing.weightKg ?? null,
    widthCm: listing.widthCm ?? null,
    heightCm: listing.heightCm ?? null,
    lengthCm: listing.lengthCm ?? null,
    dimensionalWeight: listing.dimensionalWeight ?? null,
    cargoProvider: listing.cargoProvider ?? null,
  };
}

export function attachListingPhotos<T extends Pick<OrderListItem, 'lines' | 'imageUrl'>>(
  orders: T[],
  listings: Array<{
    id: string;
    barcode?: string;
    sku?: string;
    imageUrl?: string | null;
    imageUrls?: string[];
  }>,
): T[] {
  const byKey = new Map<string, string>();
  for (const listing of listings) {
    const url = listing.imageUrl || listing.imageUrls?.[0];
    if (!url) continue;
    byKey.set(listing.id, url);
    if (listing.barcode) {
      byKey.set(listing.barcode, url);
      byKey.set(`ty-${listing.barcode}`, url);
    }
    if (listing.sku) byKey.set(listing.sku, url);
  }
  return orders.map((order) => {
    const lines = order.lines.map((line) => {
      if (line.imageUrl) return line;
      const url = byKey.get(line.listingId);
      return url ? { ...line, imageUrl: url } : line;
    });
    return {
      ...order,
      lines,
      imageUrl: order.imageUrl || lines.find((line) => line.imageUrl)?.imageUrl || null,
    };
  });
}

export function withOrderDefaults(
  orgId: string,
  incoming: Omit<OrderListItem, 'organizationId'> | OrderListItem,
  existing?: OrderListItem,
): OrderListItem {
  const seedLines = (incoming.lines ?? []).map((line) => ({
    listingId: line.listingId,
    qty: line.qty,
    scannedQty: 0,
    ...(line.title ? { title: line.title } : {}),
    ...(line.imageUrl ? { imageUrl: line.imageUrl } : {}),
    ...(line.unitPriceTry != null ? { unitPriceTry: line.unitPriceTry } : {}),
    ...(line.grossTry != null ? { grossTry: line.grossTry } : {}),
    ...(line.sellerDiscountTry != null ? { sellerDiscountTry: line.sellerDiscountTry } : {}),
    ...(line.tyDiscountTry != null ? { tyDiscountTry: line.tyDiscountTry } : {}),
    ...(line.commissionRate != null ? { commissionRate: line.commissionRate } : {}),
    ...(line.commissionTry != null ? { commissionTry: line.commissionTry } : {}),
    ...(line.sgrFeeTry != null ? { sgrFeeTry: line.sgrFeeTry } : {}),
    ...(line.vatRate != null ? { vatRate: line.vatRate } : {}),
  }));
  if (!existing) {
    return {
      ...incoming,
      organizationId: orgId,
      lines: seedLines,
      reserved: false,
      reservationKey: null,
      packed: incoming.packed ?? false,
      labeled: incoming.labeled ?? false,
      shipped: incoming.shipped ?? false,
      labelUrl: incoming.labelUrl ?? null,
    };
  }
  return {
    ...existing,
    channel: incoming.channel,
    status: incoming.status,
    statusLabel: incoming.statusLabel,
    customerName: incoming.customerName,
    itemCount: incoming.itemCount,
    totalTry: incoming.totalTry,
    totalCurrency: incoming.totalCurrency,
    cargoDeadlineAt: incoming.cargoDeadlineAt,
    cargoWarning: incoming.cargoWarning,
    orderNumber: incoming.orderNumber,
    createdAt: incoming.createdAt,
    productTitle: incoming.productTitle ?? existing.productTitle,
    imageUrl: incoming.imageUrl ?? existing.imageUrl,
    money: incoming.money
      ? { ...existing?.money, ...incoming.money }
      : existing?.money,
    lines: seedLines.map((line) => {
      const old = existing.lines.find((row) => row.listingId === line.listingId);
      return {
        ...line,
        scannedQty: old?.scannedQty ?? 0,
        ...(line.imageUrl || old?.imageUrl ? { imageUrl: line.imageUrl ?? old?.imageUrl } : {}),
      };
    }),
    packed: existing.packed || incoming.packed,
    shipped: existing.shipped || incoming.shipped,
  };
}

export function withReturnDefaults(
  orgId: string,
  incoming: Omit<ReturnListItem, 'organizationId'> | ReturnListItem,
  existing?: ReturnListItem,
): ReturnListItem {
  if (!existing) {
    return {
      ...incoming,
      organizationId: orgId,
      tyWrite: false,
      reviewNote: incoming.reviewNote ?? null,
    };
  }
  return {
    ...existing,
    orderId: incoming.orderId,
    orderNumber: incoming.orderNumber,
    reason: incoming.reason,
    channel: 'trendyol',
    tyWrite: false,
  };
}
