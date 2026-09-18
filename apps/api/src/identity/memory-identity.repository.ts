import type {
  ListingMapping,
  OperationEvent,
  OrderListItem,
  OrganizationSummary,
  OutboxEntry,
  ShopStatus,
  StockBalance,
  StockMovement,
} from '@magazakit/contracts';
import { K01_NOTE } from '../config/trendyol-env';
import type { MockListingSeed } from '../trendyol/mock-feed';
import {
  emptyStock,
  sellableOf,
  withOrderDefaults,
  type IdentityRepository,
  type StoredListing,
} from './identity.repository';

function mockShop(org: OrganizationSummary, extra?: Partial<ShopStatus>): ShopStatus {
  return {
    id: `shop_ty_${org.id}`,
    organizationId: org.id,
    channel: 'trendyol',
    status: 'mock_connected',
    statusLabel: 'Bağlı (mock — K01)',
    sellerLabel: 'Trendyol test mağazası (mock)',
    connectedAt: extra?.connectedAt ?? new Date().toISOString(),
    lastSyncAt: extra?.lastSyncAt ?? null,
    checkpoint: extra?.checkpoint ?? null,
    k01: K01_NOTE,
    mock: true,
  };
}

/**
 * TODO(F3): require Postgres when stock writes land.
 * In-memory is lost on process restart.
 */
export class MemoryIdentityRepository implements IdentityRepository {
  readonly backend = 'memory' as const;
  private readonly orgsByOwner = new Map<string, OrganizationSummary>();
  private readonly orgsById = new Map<string, OrganizationSummary>();
  private readonly fcmByUid = new Map<string, string>();
  private readonly shopsById = new Map<string, ShopStatus>();
  private readonly shopsByOrg = new Map<string, string>();
  private readonly listings = new Map<string, StoredListing>();
  private readonly orders = new Map<string, OrderListItem>();
  private readonly mappings = new Map<string, ListingMapping>();
  private readonly stock = new Map<string, StockBalance>();
  private readonly movements = new Map<string, StockMovement>();
  private readonly outbox: OutboxEntry[] = [];
  private readonly operations: OperationEvent[] = [];
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
    return org;
  }

  async saveDevice(uid: string, fcmToken: string): Promise<void> {
    this.fcmByUid.set(uid, fcmToken);
  }

  async upsertTrendyolMockShop(org: OrganizationSummary): Promise<ShopStatus> {
    const existingId = this.shopsByOrg.get(org.id);
    const existing = existingId ? this.shopsById.get(existingId) : undefined;
    const shop = mockShop(org, {
      connectedAt: existing?.connectedAt,
      lastSyncAt: existing?.lastSyncAt ?? null,
      checkpoint: existing?.checkpoint ?? null,
    });
    this.shopsById.set(shop.id, shop);
    this.shopsByOrg.set(org.id, shop.id);
    return shop;
  }

  async listShopsForUid(uid: string): Promise<ShopStatus[]> {
    const org = this.orgsByOwner.get(uid);
    if (!org) {
      return [];
    }
    const shopId = this.shopsByOrg.get(org.id);
    const shop = shopId ? this.shopsById.get(shopId) : undefined;
    return shop ? [shop] : [];
  }

  async getShopById(shopId: string): Promise<ShopStatus | null> {
    return this.shopsById.get(shopId) ?? null;
  }

  async markShopSynced(shopId: string, checkpoint: string, lastSyncAt: string): Promise<ShopStatus> {
    const shop = this.shopsById.get(shopId);
    if (!shop) {
      throw new Error('shop not found');
    }
    const next = { ...shop, checkpoint, lastSyncAt };
    this.shopsById.set(shopId, next);
    return next;
  }

  async upsertListings(orgId: string, shopId: string, listings: MockListingSeed[]): Promise<number> {
    for (const listing of listings) {
      this.listings.set(this.listingKey(orgId, listing.id), { ...listing, shopId });
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

  async getListing(orgId: string, listingId: string): Promise<StoredListing | null> {
    return this.listings.get(this.listingKey(orgId, listingId)) ?? null;
  }

  async upsertMapping(orgId: string, listingId: string, sku: string): Promise<ListingMapping> {
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
    return [...this.mappings.values()].filter((m) => m.organizationId === orgId);
  }

  async getOrder(orgId: string, orderId: string): Promise<OrderListItem | null> {
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

  async findMovementByKey(orgId: string, idempotencyKey: string): Promise<StockMovement | null> {
    return (
      [...this.movements.values()].find(
        (m) => m.organizationId === orgId && m.idempotencyKey === idempotencyKey,
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

  async appendOperation(event: OperationEvent): Promise<OperationEvent> {
    this.operations.push(event);
    return event;
  }

  async listOperations(orgId: string): Promise<OperationEvent[]> {
    return this.operations.filter((e) => e.organizationId === orgId).slice().reverse();
  }
}
