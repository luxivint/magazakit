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
  StockBalance,
  StockMovement,
  Supplier,
  Warehouse,
  WarehouseTransfer,
} from '@magazakit/contracts';
import type { MockListingSeed } from '../trendyol/mock-feed';

export type PersistenceBackend = 'memory' | 'postgres';

export type StoredListing = MockListingSeed & { shopId: string };

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
  upsertTrendyolMockShop(org: OrganizationSummary): Promise<ShopStatus>;
  listShopsForUid(uid: string): Promise<ShopStatus[]>;
  getShopById(shopId: string): Promise<ShopStatus | null>;
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
  };
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
  }));
  if (!existing) {
    return {
      ...incoming,
      organizationId: orgId,
      lines: seedLines,
      reserved: false,
      reservationKey: null,
      packed: false,
      labeled: false,
      shipped: false,
      labelUrl: null,
    };
  }
  return {
    ...existing,
    customerName: incoming.customerName,
    itemCount: incoming.itemCount,
    totalTry: incoming.totalTry,
    cargoDeadlineAt: incoming.cargoDeadlineAt,
    cargoWarning: incoming.cargoWarning,
    orderNumber: incoming.orderNumber,
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
