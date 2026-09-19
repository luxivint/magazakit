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
  PurchaseOrderStub,
  ReturnListItem,
  ShopStatus,
  ShopChannel,
  StockBalance,
  StockMovement,
  Supplier,
  Warehouse,
  WarehouseTransfer,
} from '@magazakit/contracts';
import { decryptJson, encryptJson } from '../channels/crypto';
import type { ChannelSecrets } from '../channels/shop-secrets';
import { K01_NOTE } from '../config/trendyol-env';
import { shopRecordId } from '../channels/registry';
import type { MockListingSeed } from '../trendyol/mock-feed';
import {
  emptyStock,
  sellableOf,
  withOrderDefaults,
  withReturnDefaults,
  type IdentityRepository,
  type StoredListing,
} from './identity.repository';

function mockShop(
  org: OrganizationSummary,
  channel: ShopChannel,
  extra?: Partial<ShopStatus>,
): ShopStatus {
  const live = extra?.status === 'live_connected' || extra?.mock === false;
  return {
    id: shopRecordId(org.id, channel),
    organizationId: org.id,
    channel,
    status: extra?.status ?? (live ? 'live_connected' : 'mock_connected'),
    statusLabel:
      extra?.statusLabel ?? (live ? 'Bağlı (okuma)' : 'Bağlı (mock — K01)'),
    sellerLabel: extra?.sellerLabel ?? channel,
    connectedAt: extra?.connectedAt ?? new Date().toISOString(),
    lastSyncAt: extra?.lastSyncAt ?? null,
    checkpoint: extra?.checkpoint ?? null,
    k01: extra?.k01 ?? K01_NOTE,
    mock: extra?.mock ?? !live,
  };
}

/**
 * In-memory is lost on process restart. Set DATABASE_URL for Postgres.
 */
export class MemoryIdentityRepository implements IdentityRepository {
  readonly backend = 'memory' as const;
  private readonly orgsByOwner = new Map<string, OrganizationSummary>();
  private readonly orgsById = new Map<string, OrganizationSummary>();
  private readonly fcmByUid = new Map<string, string>();
  private readonly shopsById = new Map<string, ShopStatus>();
  private readonly shopsByOrgChannel = new Map<string, string>();
  private readonly shopSecrets = new Map<string, string>();
  private readonly listings = new Map<string, StoredListing>();
  private readonly orders = new Map<string, OrderListItem>();
  private readonly mappings = new Map<string, ListingMapping>();
  private readonly stock = new Map<string, StockBalance>();
  private readonly movements = new Map<string, StockMovement>();
  private readonly outbox: OutboxEntry[] = [];
  private readonly operations: OperationEvent[] = [];
  private readonly returns = new Map<string, ReturnListItem>();
  private readonly members = new Map<string, OrgMember>();
  private readonly invites = new Map<string, OrgInvite>();
  private readonly drafts = new Map<string, ListingDraft>();
  private readonly suppliers = new Map<string, Supplier>();
  private readonly purchaseOrders: PurchaseOrderStub[] = [];
  private readonly warehouses = new Map<string, Warehouse>();
  private readonly transfers: WarehouseTransfer[] = [];
  private readonly einvoices: EinvoiceDraft[] = [];
  private readonly printers = new Map<string, PrinterSettings>();
  private seq = 0;

  private listingKey(orgId: string, listingId: string): string {
    return `${orgId}:${listingId}`;
  }

  private orderKey(orgId: string, orderId: string): string {
    return `${orgId}:${orderId}`;
  }

  async getOrgForUid(uid: string): Promise<OrganizationSummary | null> {
    return this.orgsByOwner.get(uid) ?? null;
  }

  async getOrgById(id: string): Promise<OrganizationSummary | null> {
    return this.orgsById.get(id) ?? null;
  }

  async createOrg(uid: string, name: string): Promise<OrganizationSummary> {
    const existing = this.orgsByOwner.get(uid);
    if (existing) {
      return existing;
    }
    this.seq += 1;
    const org: OrganizationSummary = {
      id: `org_${this.seq}`,
      name,
      ownerUid: uid,
    };
    this.orgsByOwner.set(uid, org);
    this.orgsById.set(org.id, org);
    this.members.set(`${org.id}:${uid}`, {
      organizationId: org.id,
      uid,
      email: '',
      role: 'owner',
      status: 'active',
    });
    return org;
  }

  async saveDevice(uid: string, fcmToken: string): Promise<void> {
    this.fcmByUid.set(uid, fcmToken);
  }

  async getDeviceToken(uid: string): Promise<string | null> {
    return this.fcmByUid.get(uid) ?? null;
  }

  async upsertShop(
    org: OrganizationSummary,
    channel: ShopChannel,
    overlay?: Partial<
      Pick<
        ShopStatus,
        'status' | 'statusLabel' | 'sellerLabel' | 'mock' | 'k01'
      >
    >,
  ): Promise<ShopStatus> {
    const mapKey = `${org.id}:${channel}`;
    const existingId = this.shopsByOrgChannel.get(mapKey);
    const existing = existingId ? this.shopsById.get(existingId) : undefined;
    const shop = mockShop(org, channel, {
      connectedAt: existing?.connectedAt,
      lastSyncAt: existing?.lastSyncAt ?? null,
      checkpoint: existing?.checkpoint ?? null,
      ...overlay,
    });
    this.shopsById.set(shop.id, shop);
    this.shopsByOrgChannel.set(mapKey, shop.id);
    return shop;
  }

  async upsertTrendyolMockShop(
    org: OrganizationSummary,
    overlay?: Partial<
      Pick<ShopStatus, 'status' | 'statusLabel' | 'sellerLabel' | 'mock'>
    >,
  ): Promise<ShopStatus> {
    return this.upsertShop(org, 'trendyol', overlay);
  }

  async listShopsForUid(uid: string): Promise<ShopStatus[]> {
    const org = this.orgsByOwner.get(uid);
    if (!org) {
      return [];
    }
    return [...this.shopsById.values()].filter(
      (s) => s.organizationId === org.id,
    );
  }

  async getShopById(shopId: string): Promise<ShopStatus | null> {
    return this.shopsById.get(shopId) ?? null;
  }

  async connectShopWithSecrets(
    org: OrganizationSummary,
    channel: ShopChannel,
    overlay: Partial<Pick<ShopStatus, 'status' | 'statusLabel' | 'sellerLabel' | 'mock' | 'k01'>>,
    secrets: ChannelSecrets,
  ): Promise<ShopStatus> {
    const blob = encryptJson(secrets);
    const shop = await this.upsertShop(org, channel, overlay);
    this.shopSecrets.set(`${org.id}:${shop.id}`, blob);
    return shop;
  }

  async saveShopSecrets(shopId: string, orgId: string, secrets: ChannelSecrets): Promise<void> {
    this.shopSecrets.set(`${orgId}:${shopId}`, encryptJson(secrets));
  }

  async getShopSecrets(shopId: string, orgId: string): Promise<ChannelSecrets | null> {
    const blob = this.shopSecrets.get(`${orgId}:${shopId}`);
    if (!blob) return null;
    return decryptJson<ChannelSecrets>(blob);
  }

  async markShopSynced(
    shopId: string,
    checkpoint: string,
    lastSyncAt: string,
  ): Promise<ShopStatus> {
    const shop = this.shopsById.get(shopId);
    if (!shop) {
      throw new Error('shop not found');
    }
    const next = { ...shop, checkpoint, lastSyncAt };
    this.shopsById.set(shopId, next);
    return next;
  }

  async upsertListings(
    orgId: string,
    shopId: string,
    listings: MockListingSeed[],
  ): Promise<number> {
    const incoming = new Set(listings.map((listing) => listing.id));
    // An empty feed can also mean that a marketplace returned a malformed or
    // temporarily incomplete 200 response. Keep the last known catalog in that
    // ambiguous case instead of erasing it.
    if (listings.length > 0) {
      for (const [key, stored] of this.listings) {
        if (stored.shopId === shopId && !incoming.has(stored.id)) {
          this.listings.delete(key);
          this.mappings.delete(this.listingKey(orgId, stored.id));
        }
      }
    }
    for (const listing of listings) {
      this.listings.set(this.listingKey(orgId, listing.id), {
        ...listing,
        shopId,
      });
    }
    return listings.length;
  }

  async upsertOrders(
    orgId: string,
    orders: Omit<OrderListItem, 'organizationId'>[],
  ): Promise<number> {
    for (const order of orders) {
      const key = this.orderKey(orgId, order.id);
      const existing = this.orders.get(key);
      this.orders.set(key, withOrderDefaults(orgId, order, existing));
    }
    return orders.length;
  }

  async listListings(orgId: string): Promise<StoredListing[]> {
    return [...this.listings.entries()]
      .filter(([key]) => key.startsWith(`${orgId}:`))
      .map(([, v]) => v);
  }

  async listOrgOrders(orgId: string): Promise<OrderListItem[]> {
    return [...this.orders.values()].filter((o) => o.organizationId === orgId);
  }

  async getListing(
    orgId: string,
    listingId: string,
  ): Promise<StoredListing | null> {
    return this.listings.get(this.listingKey(orgId, listingId)) ?? null;
  }

  async upsertMapping(
    orgId: string,
    listingId: string,
    sku: string,
  ): Promise<ListingMapping> {
    const mapping: ListingMapping = {
      organizationId: orgId,
      listingId,
      sku,
      stockSource: 'master_sku',
    };
    this.mappings.set(this.listingKey(orgId, listingId), mapping);
    return mapping;
  }

  async listMappings(orgId: string): Promise<ListingMapping[]> {
    return [...this.mappings.values()].filter(
      (m) => m.organizationId === orgId,
    );
  }

  async getOrder(
    orgId: string,
    orderId: string,
  ): Promise<OrderListItem | null> {
    return this.orders.get(this.orderKey(orgId, orderId)) ?? null;
  }

  async saveOrder(order: OrderListItem): Promise<OrderListItem> {
    this.orders.set(this.orderKey(order.organizationId, order.id), order);
    return order;
  }

  private stockKey(orgId: string, sku: string): string {
    return `${orgId}:${sku}`;
  }

  async getSkuStock(orgId: string, sku: string): Promise<StockBalance> {
    return this.stock.get(this.stockKey(orgId, sku)) ?? emptyStock(orgId, sku);
  }

  async setSkuStock(balance: StockBalance): Promise<StockBalance> {
    const next = {
      ...balance,
      sellableStock: sellableOf(balance.physicalStock, balance.reservedStock),
    };
    this.stock.set(this.stockKey(balance.organizationId, balance.sku), next);
    return next;
  }

  async findMovementByKey(
    orgId: string,
    idempotencyKey: string,
  ): Promise<StockMovement | null> {
    return (
      [...this.movements.values()].find(
        (m) =>
          m.organizationId === orgId && m.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async appendMovement(movement: StockMovement): Promise<StockMovement> {
    this.movements.set(movement.id, movement);
    return movement;
  }

  async listMovements(orgId: string): Promise<StockMovement[]> {
    return [...this.movements.values()]
      .filter((m) => m.organizationId === orgId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async appendOutbox(entry: OutboxEntry): Promise<OutboxEntry> {
    this.outbox.push(entry);
    return entry;
  }

  async listOutbox(orgId: string): Promise<OutboxEntry[]> {
    return this.outbox.filter((e) => e.organizationId === orgId).reverse();
  }

  async listPendingOutbox(): Promise<OutboxEntry[]> {
    return this.outbox.filter((e) => e.status === 'pending');
  }

  async countPendingOutbox(): Promise<number> {
    return this.outbox.filter((e) => e.status === 'pending').length;
  }

  async updateOutboxStatus(
    id: string,
    status: OutboxEntry['status'],
  ): Promise<boolean> {
    const entry = this.outbox.find((e) => e.id === id);
    if (!entry || entry.status !== 'pending') {
      return false;
    }
    entry.status = status;
    return true;
  }

  async appendOperation(event: OperationEvent): Promise<OperationEvent> {
    this.operations.push(event);
    return event;
  }

  async listOperations(orgId: string): Promise<OperationEvent[]> {
    return this.operations
      .filter((e) => e.organizationId === orgId)
      .slice()
      .reverse();
  }

  async upsertReturns(
    orgId: string,
    returns: Omit<ReturnListItem, 'organizationId'>[],
  ): Promise<number> {
    for (const item of returns) {
      const key = this.orderKey(orgId, item.id);
      const existing = this.returns.get(key);
      this.returns.set(key, withReturnDefaults(orgId, item, existing));
    }
    return returns.length;
  }

  async listReturns(orgId: string): Promise<ReturnListItem[]> {
    return [...this.returns.values()].filter((r) => r.organizationId === orgId);
  }

  async getReturn(
    orgId: string,
    returnId: string,
  ): Promise<ReturnListItem | null> {
    return this.returns.get(this.orderKey(orgId, returnId)) ?? null;
  }

  async saveReturn(item: ReturnListItem): Promise<ReturnListItem> {
    this.returns.set(this.orderKey(item.organizationId, item.id), {
      ...item,
      tyWrite: false,
    });
    return item;
  }

  async listMembers(orgId: string): Promise<OrgMember[]> {
    return [...this.members.values()].filter((m) => m.organizationId === orgId);
  }

  async upsertMember(member: OrgMember): Promise<OrgMember> {
    const uid = member.uid ?? member.email;
    this.members.set(`${member.organizationId}:${uid}`, member);
    return member;
  }

  async listInvites(orgId: string): Promise<OrgInvite[]> {
    return [...this.invites.values()].filter((i) => i.organizationId === orgId);
  }

  async findInviteByEmail(
    orgId: string,
    email: string,
  ): Promise<OrgInvite | null> {
    const needle = email.trim().toLowerCase();
    return (
      [...this.invites.values()].find(
        (i) => i.organizationId === orgId && i.email.toLowerCase() === needle,
      ) ?? null
    );
  }

  async saveInvite(invite: OrgInvite): Promise<OrgInvite> {
    this.invites.set(invite.id, invite);
    return invite;
  }

  async getListingDraft(
    orgId: string,
    listingId: string,
  ): Promise<ListingDraft | null> {
    return this.drafts.get(this.listingKey(orgId, listingId)) ?? null;
  }

  async saveListingDraft(draft: ListingDraft): Promise<ListingDraft> {
    this.drafts.set(this.listingKey(draft.organizationId, draft.listingId), {
      ...draft,
      liveTyWrite: false,
    });
    return { ...draft, liveTyWrite: false };
  }

  async listSuppliers(orgId: string): Promise<Supplier[]> {
    return [...this.suppliers.values()].filter(
      (s) => s.organizationId === orgId,
    );
  }

  async getSupplier(
    orgId: string,
    supplierId: string,
  ): Promise<Supplier | null> {
    return this.suppliers.get(this.orderKey(orgId, supplierId)) ?? null;
  }

  async saveSupplier(supplier: Supplier): Promise<Supplier> {
    this.suppliers.set(
      this.orderKey(supplier.organizationId, supplier.id),
      supplier,
    );
    return supplier;
  }

  async listPurchaseOrders(orgId: string): Promise<PurchaseOrderStub[]> {
    return this.purchaseOrders.filter((p) => p.organizationId === orgId);
  }

  async savePurchaseOrder(po: PurchaseOrderStub): Promise<PurchaseOrderStub> {
    this.purchaseOrders.push(po);
    return po;
  }

  async listWarehouses(orgId: string): Promise<Warehouse[]> {
    return [...this.warehouses.values()].filter(
      (w) => w.organizationId === orgId,
    );
  }

  async saveWarehouse(warehouse: Warehouse): Promise<Warehouse> {
    this.warehouses.set(
      this.orderKey(warehouse.organizationId, warehouse.id),
      warehouse,
    );
    return warehouse;
  }

  async listTransfers(orgId: string): Promise<WarehouseTransfer[]> {
    return this.transfers
      .filter((t) => t.organizationId === orgId)
      .slice()
      .reverse();
  }

  async saveTransfer(transfer: WarehouseTransfer): Promise<WarehouseTransfer> {
    this.transfers.push(transfer);
    return transfer;
  }

  async listEinvoices(orgId: string): Promise<EinvoiceDraft[]> {
    return this.einvoices
      .filter((e) => e.organizationId === orgId)
      .slice()
      .reverse();
  }

  async saveEinvoice(draft: EinvoiceDraft): Promise<EinvoiceDraft> {
    const stored = { ...draft, gibLive: false as const };
    this.einvoices.push(stored);
    return stored;
  }

  async getPrinter(orgId: string): Promise<PrinterSettings | null> {
    return this.printers.get(orgId) ?? null;
  }

  async savePrinter(settings: PrinterSettings): Promise<PrinterSettings> {
    this.printers.set(settings.organizationId, settings);
    return settings;
  }
}
