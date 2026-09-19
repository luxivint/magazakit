import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
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
  ShopStatusCode,
  StockBalance,
  StockMovement,
  Supplier,
  TrendyolTariff,
  Warehouse,
  WarehouseTransfer,
} from '@magazakit/contracts';
import { decryptJson, encryptJson } from '../channels/crypto';
import type { ChannelSecrets } from '../channels/shop-secrets';
import { K01_NOTE } from '../config/trendyol-env';
import { shopRecordId } from '../channels/registry';
import { SHOP_CHANNELS } from '../channels/types';
import type { Channel } from '@magazakit/contracts';
import type { MockListingSeed } from '../trendyol/mock-feed';
import {
  emptyStock,
  mergeListingDims,
  sellableOf,
  withOrderDefaults,
  withReturnDefaults,
  type IdentityRepository,
  type StoredListing,
} from './identity.repository';
import { applySqlMigrations } from './run-migrations';

type QueryResult = { rows: Record<string, unknown>[] };
type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>;
};
type Pool = Queryable & {
  connect: () => Promise<Queryable & { release: () => void }>;
  end?: () => Promise<void>;
};

function asIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value == null) {
    return new Date().toISOString();
  }
  return String(value);
}

function rowToOrg(row: Record<string, unknown>): OrganizationSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    ownerUid: String(row.owner_uid),
  };
}

function parseChannel(raw: unknown): Channel {
  const v = String(raw ?? 'trendyol');
  return (SHOP_CHANNELS as string[]).includes(v) ? (v as Channel) : 'trendyol';
}

function rowToShop(row: Record<string, unknown>): ShopStatus {
  const status =
    (String(row.status ?? 'mock_connected') as ShopStatusCode) ||
    'mock_connected';
  const live = status === 'live_connected';
  const channel = parseChannel(row.channel);
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    channel,
    status,
    statusLabel: String(
      row.status_label ?? (live ? 'Bağlı (okuma)' : 'Bağlı (mock — K01)'),
    ),
    sellerLabel: String(row.seller_label ?? channel),
    connectedAt: asIso(row.connected_at),
    lastSyncAt: row.last_sync_at ? asIso(row.last_sync_at) : null,
    checkpoint: row.checkpoint ? String(row.checkpoint) : null,
    k01: K01_NOTE,
    mock: !live,
  };
}

export class PostgresIdentityRepository implements IdentityRepository {
  readonly backend = 'postgres' as const;

  private constructor(private readonly pool: Pool) {}

  static async connect(
    databaseUrl: string,
  ): Promise<PostgresIdentityRepository> {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl, max: 4 });
    try {
      await applySqlMigrations(pool);
    } catch (err) {
      await pool.end();
      throw err;
    }
    return new PostgresIdentityRepository(pool);
  }

  async close(): Promise<void> {
    await this.pool.end?.();
  }

  async getOrgForUid(uid: string): Promise<OrganizationSummary | null> {
    const res = await this.pool.query(
      'SELECT id, name, owner_uid FROM organizations WHERE owner_uid = $1',
      [uid],
    );
    const row = res.rows[0];
    return row ? rowToOrg(row) : null;
  }

  async getOrgById(id: string): Promise<OrganizationSummary | null> {
    const res = await this.pool.query(
      'SELECT id, name, owner_uid FROM organizations WHERE id = $1',
      [id],
    );
    const row = res.rows[0];
    return row ? rowToOrg(row) : null;
  }

  async createOrg(uid: string, name: string): Promise<OrganizationSummary> {
    const existing = await this.getOrgForUid(uid);
    if (existing) {
      return existing;
    }
    const id = `org_${randomUUID()}`;
    const res = await this.pool.query(
      'INSERT INTO organizations (id, name, owner_uid) VALUES ($1, $2, $3) RETURNING id, name, owner_uid',
      [id, name, uid],
    );
    const org = rowToOrg(res.rows[0]);
    await this.pool.query(
      `INSERT INTO org_members (organization_id, uid, email, role, status)
       VALUES ($1, $2, '', 'owner', 'active')
       ON CONFLICT (organization_id, uid) DO NOTHING`,
      [org.id, uid],
    );
    return org;
  }

  async saveDevice(uid: string, fcmToken: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO devices (uid, fcm_token) VALUES ($1, $2)
       ON CONFLICT (uid) DO UPDATE SET fcm_token = EXCLUDED.fcm_token, updated_at = now()`,
      [uid, fcmToken],
    );
  }

  async getDeviceToken(uid: string): Promise<string | null> {
    const res = await this.pool.query(
      'SELECT fcm_token FROM devices WHERE uid = $1',
      [uid],
    );
    const row = res.rows[0];
    return row ? String(row.fcm_token) : null;
  }

  async upsertShop(
    org: OrganizationSummary,
    channel: ShopStatus['channel'],
    overlay?: Partial<
      Pick<
        ShopStatus,
        'status' | 'statusLabel' | 'sellerLabel' | 'mock' | 'k01'
      >
    >,
  ): Promise<ShopStatus> {
    return this.upsertShopOn(this.pool, org, channel, overlay);
  }

  private async upsertShopOn(
    db: Queryable,
    org: OrganizationSummary,
    channel: ShopStatus['channel'],
    overlay?: Partial<
      Pick<ShopStatus, 'status' | 'statusLabel' | 'sellerLabel' | 'mock' | 'k01'>
    >,
  ): Promise<ShopStatus> {
    const id = shopRecordId(org.id, channel);
    const live =
      overlay?.status === 'live_connected' || overlay?.mock === false;
    const status =
      overlay?.status ?? (live ? 'live_connected' : 'mock_connected');
    const statusLabel =
      overlay?.statusLabel ?? (live ? 'Bağlı (okuma)' : 'Bağlı (mock — K01)');
    const sellerLabel = overlay?.sellerLabel ?? channel;
    const res = await db.query(
      `INSERT INTO shops (id, organization_id, channel, status, status_label, seller_label)
       VALUES ($1, $2, $6, $5, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         channel = EXCLUDED.channel,
         status = EXCLUDED.status,
         status_label = EXCLUDED.status_label,
         seller_label = EXCLUDED.seller_label
       RETURNING id, organization_id, channel, status, status_label, seller_label, connected_at, last_sync_at, checkpoint`,
      [id, org.id, statusLabel, sellerLabel, status, channel],
    );
    return rowToShop(res.rows[0]);
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
    const res = await this.pool.query(
      `SELECT s.id, s.organization_id, s.channel, s.status, s.status_label, s.seller_label,
              s.connected_at, s.last_sync_at, s.checkpoint
       FROM shops s
       JOIN organizations o ON o.id = s.organization_id
       WHERE o.owner_uid = $1`,
      [uid],
    );
    return res.rows.map(rowToShop);
  }

  async getShopById(shopId: string): Promise<ShopStatus | null> {
    const res = await this.pool.query(
      `SELECT id, organization_id, channel, status, status_label, seller_label,
              connected_at, last_sync_at, checkpoint
       FROM shops WHERE id = $1`,
      [shopId],
    );
    const row = res.rows[0];
    return row ? rowToShop(row) : null;
  }

  async connectShopWithSecrets(
    org: OrganizationSummary,
    channel: ShopStatus['channel'],
    overlay: Partial<Pick<ShopStatus, 'status' | 'statusLabel' | 'sellerLabel' | 'mock' | 'k01'>>,
    secrets: ChannelSecrets,
  ): Promise<ShopStatus> {
    const ciphertext = encryptJson(secrets);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const shop = await this.upsertShopOn(client, org, channel, overlay);
      await client.query(
        `INSERT INTO shop_credentials (shop_id, organization_id, ciphertext)
         VALUES ($1, $2, $3)
         ON CONFLICT (shop_id) DO UPDATE SET
           organization_id = EXCLUDED.organization_id,
           ciphertext = EXCLUDED.ciphertext,
           updated_at = now()`,
        [shop.id, org.id, ciphertext],
      );
      await client.query('COMMIT');
      return shop;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async saveShopSecrets(shopId: string, orgId: string, secrets: ChannelSecrets): Promise<void> {
    await this.pool.query(
      `INSERT INTO shop_credentials (shop_id, organization_id, ciphertext)
       VALUES ($1, $2, $3)
       ON CONFLICT (shop_id) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         ciphertext = EXCLUDED.ciphertext,
         updated_at = now()`,
      [shopId, orgId, encryptJson(secrets)],
    );
  }

  async getShopSecrets(shopId: string, orgId: string): Promise<ChannelSecrets | null> {
    const res = await this.pool.query(
      `SELECT ciphertext FROM shop_credentials WHERE shop_id = $1 AND organization_id = $2`,
      [shopId, orgId],
    );
    const blob = res.rows[0]?.ciphertext;
    if (!blob) return null;
    return decryptJson<ChannelSecrets>(String(blob));
  }

  async markShopSynced(
    shopId: string,
    checkpoint: string,
    lastSyncAt: string,
  ): Promise<ShopStatus> {
    const res = await this.pool.query(
      `UPDATE shops SET last_sync_at = $2::timestamptz, checkpoint = $3
       WHERE id = $1
       RETURNING id, organization_id, channel, status, status_label, seller_label,
                 connected_at, last_sync_at, checkpoint`,
      [shopId, lastSyncAt, checkpoint],
    );
    return rowToShop(res.rows[0]);
  }

  async upsertListings(
    orgId: string,
    shopId: string,
    listings: MockListingSeed[],
  ): Promise<number> {
    for (const listing of listings) {
      const existing = await this.getListing(orgId, listing.id);
      const merged = mergeListingDims(existing ?? undefined, listing);
      await this.pool.query(
        `INSERT INTO listings (organization_id, listing_id, shop_id, payload)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (organization_id, listing_id)
         DO UPDATE SET shop_id = EXCLUDED.shop_id, payload = EXCLUDED.payload`,
        [orgId, listing.id, shopId, JSON.stringify(merged)],
      );
    }
    // Treat an empty feed as ambiguous: some marketplace APIs return HTTP 200
    // with an error-shaped payload. Avoid deleting the last known catalog then.
    if (listings.length > 0) {
      const ids = listings.map((listing) => listing.id);
      await this.pool.query(
        `DELETE FROM listings
         WHERE organization_id = $1 AND shop_id = $2
           AND NOT (listing_id = ANY($3::text[]))`,
        [orgId, shopId, ids],
      );
      await this.pool.query(
        `DELETE FROM listing_mappings m
         WHERE m.organization_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM listings l
             WHERE l.organization_id = m.organization_id AND l.listing_id = m.listing_id
           )`,
        [orgId],
      );
    }
    return listings.length;
  }

  async upsertOrders(
    orgId: string,
    orders: Omit<OrderListItem, 'organizationId'>[],
  ): Promise<number> {
    for (const order of orders) {
      const existing = await this.getOrder(orgId, order.id);
      const merged = withOrderDefaults(orgId, order, existing ?? undefined);
      await this.pool.query(
        `INSERT INTO org_orders (organization_id, order_id, payload)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (organization_id, order_id)
         DO UPDATE SET payload = EXCLUDED.payload`,
        [orgId, order.id, JSON.stringify(merged)],
      );
    }
    return orders.length;
  }

  async listListings(orgId: string): Promise<StoredListing[]> {
    const res = await this.pool.query(
      'SELECT shop_id, payload FROM listings WHERE organization_id = $1',
      [orgId],
    );
    return res.rows.map((row) => ({
      ...(row.payload as MockListingSeed),
      shopId: String(row.shop_id),
    }));
  }

  async listOrgOrders(orgId: string): Promise<OrderListItem[]> {
    const res = await this.pool.query(
      'SELECT payload FROM org_orders WHERE organization_id = $1',
      [orgId],
    );
    return res.rows.map((row) => ({
      ...(row.payload as Omit<OrderListItem, 'organizationId'>),
      organizationId: orgId,
    }));
  }

  async getListing(
    orgId: string,
    listingId: string,
  ): Promise<StoredListing | null> {
    const res = await this.pool.query(
      'SELECT shop_id, payload FROM listings WHERE organization_id = $1 AND listing_id = $2',
      [orgId, listingId],
    );
    const row = res.rows[0];
    if (!row) {
      return null;
    }
    return { ...(row.payload as MockListingSeed), shopId: String(row.shop_id) };
  }

  async upsertMapping(
    orgId: string,
    listingId: string,
    sku: string,
  ): Promise<ListingMapping> {
    await this.pool.query(
      `INSERT INTO listing_mappings (organization_id, listing_id, sku)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, listing_id) DO UPDATE SET sku = EXCLUDED.sku`,
      [orgId, listingId, sku],
    );
    return { organizationId: orgId, listingId, sku, stockSource: 'master_sku' };
  }

  async listMappings(orgId: string): Promise<ListingMapping[]> {
    const res = await this.pool.query(
      'SELECT organization_id, listing_id, sku FROM listing_mappings WHERE organization_id = $1',
      [orgId],
    );
    return res.rows.map((row) => ({
      organizationId: String(row.organization_id),
      listingId: String(row.listing_id),
      sku: String(row.sku),
      stockSource: 'master_sku' as const,
    }));
  }

  async getOrder(
    orgId: string,
    orderId: string,
  ): Promise<OrderListItem | null> {
    const res = await this.pool.query(
      'SELECT payload FROM org_orders WHERE organization_id = $1 AND order_id = $2',
      [orgId, orderId],
    );
    const row = res.rows[0];
    if (!row) {
      return null;
    }
    return { ...(row.payload as OrderListItem), organizationId: orgId };
  }

  async saveOrder(order: OrderListItem): Promise<OrderListItem> {
    await this.pool.query(
      `INSERT INTO org_orders (organization_id, order_id, payload)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (organization_id, order_id)
       DO UPDATE SET payload = EXCLUDED.payload`,
      [order.organizationId, order.id, JSON.stringify(order)],
    );
    return order;
  }

  async getSkuStock(orgId: string, sku: string): Promise<StockBalance> {
    const res = await this.pool.query(
      'SELECT physical, reserved FROM sku_stock WHERE organization_id = $1 AND sku = $2',
      [orgId, sku],
    );
    const row = res.rows[0];
    if (!row) {
      return emptyStock(orgId, sku);
    }
    const physicalStock = Number(row.physical);
    const reservedStock = Number(row.reserved);
    return {
      organizationId: orgId,
      sku,
      physicalStock,
      reservedStock,
      sellableStock: sellableOf(physicalStock, reservedStock),
    };
  }

  async setSkuStock(balance: StockBalance): Promise<StockBalance> {
    await this.pool.query(
      `INSERT INTO sku_stock (organization_id, sku, physical, reserved)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, sku)
       DO UPDATE SET physical = EXCLUDED.physical, reserved = EXCLUDED.reserved`,
      [
        balance.organizationId,
        balance.sku,
        balance.physicalStock,
        balance.reservedStock,
      ],
    );
    return {
      ...balance,
      sellableStock: sellableOf(balance.physicalStock, balance.reservedStock),
    };
  }

  async findMovementByKey(
    orgId: string,
    idempotencyKey: string,
  ): Promise<StockMovement | null> {
    const res = await this.pool.query(
      `SELECT id, organization_id, sku, delta_physical, delta_reserved, reason, idempotency_key, created_at
       FROM stock_movements WHERE organization_id = $1 AND idempotency_key = $2`,
      [orgId, idempotencyKey],
    );
    const row = res.rows[0];
    return row ? rowToMovement(row) : null;
  }

  async appendMovement(movement: StockMovement): Promise<StockMovement> {
    await this.pool.query(
      `INSERT INTO stock_movements
        (id, organization_id, sku, delta_physical, delta_reserved, reason, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
       ON CONFLICT (organization_id, idempotency_key) DO NOTHING`,
      [
        movement.id,
        movement.organizationId,
        movement.sku,
        movement.deltaPhysical,
        movement.deltaReserved,
        movement.reason,
        movement.idempotencyKey,
        movement.createdAt,
      ],
    );
    return (
      (await this.findMovementByKey(
        movement.organizationId,
        movement.idempotencyKey,
      )) ?? movement
    );
  }

  async listMovements(orgId: string): Promise<StockMovement[]> {
    const res = await this.pool.query(
      `SELECT id, organization_id, sku, delta_physical, delta_reserved, reason, idempotency_key, created_at
       FROM stock_movements WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId],
    );
    return res.rows.map(rowToMovement);
  }

  async appendOutbox(entry: OutboxEntry): Promise<OutboxEntry> {
    await this.pool.query(
      `INSERT INTO stock_outbox (id, organization_id, sku, intended_qty, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
      [
        entry.id,
        entry.organizationId,
        entry.sku,
        entry.intendedQty,
        entry.status,
        entry.createdAt,
      ],
    );
    return entry;
  }

  async listOutbox(orgId: string): Promise<OutboxEntry[]> {
    const res = await this.pool.query(
      `SELECT id, organization_id, sku, intended_qty, status, created_at
       FROM stock_outbox WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId],
    );
    return res.rows.map((row) => ({
      id: String(row.id),
      organizationId: String(row.organization_id),
      kind: 'channel_stock_write' as const,
      channel: 'trendyol' as const,
      sku: String(row.sku),
      intendedQty: Number(row.intended_qty),
      status: row.status as OutboxEntry['status'],
      createdAt: asIso(row.created_at),
    }));
  }

  async listPendingOutbox(): Promise<OutboxEntry[]> {
    const res = await this.pool.query(
      `SELECT id, organization_id, sku, intended_qty, status, created_at
       FROM stock_outbox WHERE status = 'pending' ORDER BY created_at ASC`,
    );
    return res.rows.map((row) => ({
      id: String(row.id),
      organizationId: String(row.organization_id),
      kind: 'channel_stock_write' as const,
      channel: 'trendyol' as const,
      sku: String(row.sku),
      intendedQty: Number(row.intended_qty),
      status: 'pending' as const,
      createdAt: asIso(row.created_at),
    }));
  }

  async countPendingOutbox(): Promise<number> {
    const res = await this.pool.query(
      `SELECT count(*)::int AS n FROM stock_outbox WHERE status = 'pending'`,
    );
    return Number(res.rows[0]?.n ?? 0);
  }

  async updateOutboxStatus(
    id: string,
    status: OutboxEntry['status'],
  ): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE stock_outbox SET status = $2 WHERE id = $1 AND status = 'pending'`,
      [id, status],
    );
    return ((res as { rowCount?: number }).rowCount ?? 0) > 0;
  }

  async appendOperation(event: OperationEvent): Promise<OperationEvent> {
    await this.pool.query(
      `INSERT INTO operations (id, organization_id, type, title, status, ref_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)`,
      [
        event.id,
        event.organizationId,
        event.type,
        event.title,
        event.status,
        event.refId,
        event.createdAt,
      ],
    );
    return event;
  }

  async listOperations(orgId: string): Promise<OperationEvent[]> {
    const res = await this.pool.query(
      `SELECT id, organization_id, type, title, status, ref_id, created_at
       FROM operations WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId],
    );
    return res.rows.map((row) => ({
      id: String(row.id),
      organizationId: String(row.organization_id),
      type: String(row.type),
      title: String(row.title),
      status: row.status as OperationEvent['status'],
      refId: row.ref_id ? String(row.ref_id) : null,
      createdAt: asIso(row.created_at),
    }));
  }

  async upsertReturns(
    orgId: string,
    returns: Omit<ReturnListItem, 'organizationId'>[],
  ): Promise<number> {
    for (const item of returns) {
      const existing = await this.getReturn(orgId, item.id);
      const merged = withReturnDefaults(orgId, item, existing ?? undefined);
      await this.pool.query(
        `INSERT INTO org_returns (organization_id, return_id, payload)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (organization_id, return_id)
         DO UPDATE SET payload = EXCLUDED.payload`,
        [orgId, item.id, JSON.stringify(merged)],
      );
    }
    return returns.length;
  }

  async listReturns(orgId: string): Promise<ReturnListItem[]> {
    const res = await this.pool.query(
      'SELECT payload FROM org_returns WHERE organization_id = $1',
      [orgId],
    );
    return res.rows.map((row) => ({
      ...(row.payload as ReturnListItem),
      organizationId: orgId,
      tyWrite: false as const,
    }));
  }

  async getReturn(
    orgId: string,
    returnId: string,
  ): Promise<ReturnListItem | null> {
    const res = await this.pool.query(
      'SELECT payload FROM org_returns WHERE organization_id = $1 AND return_id = $2',
      [orgId, returnId],
    );
    const row = res.rows[0];
    if (!row) {
      return null;
    }
    return {
      ...(row.payload as ReturnListItem),
      organizationId: orgId,
      tyWrite: false,
    };
  }

  async saveReturn(item: ReturnListItem): Promise<ReturnListItem> {
    const stored = { ...item, tyWrite: false as const };
    await this.pool.query(
      `INSERT INTO org_returns (organization_id, return_id, payload)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (organization_id, return_id)
       DO UPDATE SET payload = EXCLUDED.payload`,
      [item.organizationId, item.id, JSON.stringify(stored)],
    );
    return stored;
  }

  async listMembers(orgId: string): Promise<OrgMember[]> {
    const res = await this.pool.query(
      'SELECT organization_id, uid, email, role, status FROM org_members WHERE organization_id = $1',
      [orgId],
    );
    return res.rows.map((row) => ({
      organizationId: String(row.organization_id),
      uid: String(row.uid),
      email: String(row.email ?? ''),
      role: row.role as OrgMember['role'],
      status: row.status as OrgMember['status'],
    }));
  }

  async upsertMember(member: OrgMember): Promise<OrgMember> {
    const uid = member.uid ?? member.email;
    await this.pool.query(
      `INSERT INTO org_members (organization_id, uid, email, role, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (organization_id, uid)
       DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, status = EXCLUDED.status`,
      [member.organizationId, uid, member.email, member.role, member.status],
    );
    return { ...member, uid };
  }

  async listInvites(orgId: string): Promise<OrgInvite[]> {
    const res = await this.pool.query(
      `SELECT id, organization_id, email, role, status, created_at
       FROM org_invites WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId],
    );
    return res.rows.map((row) => ({
      id: String(row.id),
      organizationId: String(row.organization_id),
      email: String(row.email),
      role: 'staff' as const,
      status: 'pending' as const,
      emailSent: false as const,
      createdAt: asIso(row.created_at),
    }));
  }

  async findInviteByEmail(
    orgId: string,
    email: string,
  ): Promise<OrgInvite | null> {
    const res = await this.pool.query(
      `SELECT id, organization_id, email, role, status, created_at
       FROM org_invites WHERE organization_id = $1 AND lower(email) = lower($2)`,
      [orgId, email],
    );
    const row = res.rows[0];
    if (!row) {
      return null;
    }
    return {
      id: String(row.id),
      organizationId: String(row.organization_id),
      email: String(row.email),
      role: 'staff',
      status: 'pending',
      emailSent: false,
      createdAt: asIso(row.created_at),
    };
  }

  async saveInvite(invite: OrgInvite): Promise<OrgInvite> {
    await this.pool.query(
      `INSERT INTO org_invites (id, organization_id, email, role, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
       ON CONFLICT (organization_id, email)
       DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status`,
      [
        invite.id,
        invite.organizationId,
        invite.email,
        invite.role,
        invite.status,
        invite.createdAt,
      ],
    );
    return { ...invite, emailSent: false };
  }

  async getListingDraft(
    orgId: string,
    listingId: string,
  ): Promise<ListingDraft | null> {
    const res = await this.pool.query(
      'SELECT payload FROM listing_drafts WHERE organization_id = $1 AND listing_id = $2',
      [orgId, listingId],
    );
    const row = res.rows[0];
    if (!row) {
      return null;
    }
    return {
      ...(row.payload as ListingDraft),
      organizationId: orgId,
      liveTyWrite: false,
    };
  }

  async saveListingDraft(draft: ListingDraft): Promise<ListingDraft> {
    const stored = { ...draft, liveTyWrite: false as const };
    await this.pool.query(
      `INSERT INTO listing_drafts (organization_id, listing_id, payload)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (organization_id, listing_id)
       DO UPDATE SET payload = EXCLUDED.payload`,
      [draft.organizationId, draft.listingId, JSON.stringify(stored)],
    );
    return stored;
  }

  async saveListing(orgId: string, listing: StoredListing): Promise<StoredListing> {
    const { shopId, ...payload } = listing;
    await this.pool.query(
      `INSERT INTO listings (organization_id, listing_id, shop_id, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (organization_id, listing_id)
       DO UPDATE SET shop_id = EXCLUDED.shop_id, payload = EXCLUDED.payload`,
      [orgId, listing.id, shopId, JSON.stringify(payload)],
    );
    return listing;
  }

  async listSuppliers(orgId: string): Promise<Supplier[]> {
    return this.listJson<Supplier>('org_suppliers', 'supplier_id', orgId);
  }

  async getSupplier(
    orgId: string,
    supplierId: string,
  ): Promise<Supplier | null> {
    return this.getJson<Supplier>(
      'org_suppliers',
      'supplier_id',
      orgId,
      supplierId,
    );
  }

  async saveSupplier(supplier: Supplier): Promise<Supplier> {
    return this.saveJson(
      'org_suppliers',
      'supplier_id',
      supplier.organizationId,
      supplier.id,
      supplier,
    );
  }

  async listPurchaseOrders(orgId: string): Promise<PurchaseOrderStub[]> {
    return this.listJson<PurchaseOrderStub>('purchase_orders', 'po_id', orgId);
  }

  async savePurchaseOrder(po: PurchaseOrderStub): Promise<PurchaseOrderStub> {
    return this.saveJson(
      'purchase_orders',
      'po_id',
      po.organizationId,
      po.id,
      po,
    );
  }

  async listWarehouses(orgId: string): Promise<Warehouse[]> {
    return this.listJson<Warehouse>('warehouses', 'warehouse_id', orgId);
  }

  async saveWarehouse(warehouse: Warehouse): Promise<Warehouse> {
    return this.saveJson(
      'warehouses',
      'warehouse_id',
      warehouse.organizationId,
      warehouse.id,
      warehouse,
    );
  }

  async listTransfers(orgId: string): Promise<WarehouseTransfer[]> {
    const res = await this.pool.query(
      'SELECT payload FROM warehouse_transfers WHERE organization_id = $1 ORDER BY id DESC',
      [orgId],
    );
    return res.rows.map((row) => ({
      ...(row.payload as WarehouseTransfer),
      stub: true as const,
    }));
  }

  async saveTransfer(transfer: WarehouseTransfer): Promise<WarehouseTransfer> {
    await this.pool.query(
      'INSERT INTO warehouse_transfers (id, organization_id, payload) VALUES ($1, $2, $3::jsonb)',
      [
        transfer.id,
        transfer.organizationId,
        JSON.stringify({ ...transfer, stub: true }),
      ],
    );
    return { ...transfer, stub: true };
  }

  async listEinvoices(orgId: string): Promise<EinvoiceDraft[]> {
    const items = await this.listJson<EinvoiceDraft>(
      'einvoice_drafts',
      'invoice_id',
      orgId,
    );
    return items.map((i) => ({ ...i, gibLive: false as const }));
  }

  async saveEinvoice(draft: EinvoiceDraft): Promise<EinvoiceDraft> {
    const stored = { ...draft, gibLive: false as const };
    return this.saveJson(
      'einvoice_drafts',
      'invoice_id',
      draft.organizationId,
      draft.id,
      stored,
    );
  }

  async getPrinter(orgId: string): Promise<PrinterSettings | null> {
    const res = await this.pool.query(
      'SELECT payload FROM printer_settings WHERE organization_id = $1',
      [orgId],
    );
    const row = res.rows[0];
    return row ? (row.payload as PrinterSettings) : null;
  }

  async savePrinter(settings: PrinterSettings): Promise<PrinterSettings> {
    await this.pool.query(
      `INSERT INTO printer_settings (organization_id, payload)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (organization_id) DO UPDATE SET payload = EXCLUDED.payload`,
      [settings.organizationId, JSON.stringify(settings)],
    );
    return settings;
  }

  async getTrendyolTariff(orgId: string): Promise<TrendyolTariff | null> {
    const row = await this.pool.query(
      'SELECT payload FROM printer_settings WHERE organization_id = $1',
      [`${orgId}:ty-tariff`],
    );
    return row.rows[0] ? (row.rows[0].payload as TrendyolTariff) : null;
  }

  async saveTrendyolTariff(orgId: string, tariff: TrendyolTariff): Promise<TrendyolTariff> {
    await this.pool.query(
      `INSERT INTO printer_settings (organization_id, payload)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (organization_id) DO UPDATE SET payload = EXCLUDED.payload`,
      [`${orgId}:ty-tariff`, JSON.stringify(tariff)],
    );
    return tariff;
  }

  private async listJson<T>(
    table: string,
    idCol: string,
    orgId: string,
  ): Promise<T[]> {
    const res = await this.pool.query(
      `SELECT payload FROM ${table} WHERE organization_id = $1`,
      [orgId],
    );
    void idCol;
    return res.rows.map((row) => row.payload as T);
  }

  private async getJson<T>(
    table: string,
    idCol: string,
    orgId: string,
    id: string,
  ): Promise<T | null> {
    const res = await this.pool.query(
      `SELECT payload FROM ${table} WHERE organization_id = $1 AND ${idCol} = $2`,
      [orgId, id],
    );
    const row = res.rows[0];
    return row ? (row.payload as T) : null;
  }

  private async saveJson<T>(
    table: string,
    idCol: string,
    orgId: string,
    id: string,
    payload: T,
  ): Promise<T> {
    await this.pool.query(
      `INSERT INTO ${table} (organization_id, ${idCol}, payload)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (organization_id, ${idCol})
       DO UPDATE SET payload = EXCLUDED.payload`,
      [orgId, id, JSON.stringify(payload)],
    );
    return payload;
  }
}

function rowToMovement(row: Record<string, unknown>): StockMovement {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    sku: String(row.sku),
    deltaPhysical: Number(row.delta_physical),
    deltaReserved: Number(row.delta_reserved),
    reason: row.reason as StockMovement['reason'],
    idempotencyKey: String(row.idempotency_key),
    createdAt: asIso(row.created_at),
  };
}

export async function tryPostgresRepository(
  databaseUrl: string,
): Promise<PostgresIdentityRepository | null> {
  const log = new Logger('PostgresIdentityRepository');
  try {
    const repo = await PostgresIdentityRepository.connect(databaseUrl);
    log.log(
      'persistence: postgres (migrations applied; connection string not logged)',
    );
    return repo;
  } catch {
    log.warn(
      'DATABASE_URL set but Postgres is unreachable; falling back to in-memory orgs. Connection string is not logged.',
    );
    return null;
  }
}
