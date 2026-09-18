import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
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

type Pool = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
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

function rowToShop(row: Record<string, unknown>): ShopStatus {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    channel: 'trendyol',
    status: 'mock_connected',
    statusLabel: String(row.status_label ?? 'Bağlı (mock — K01)'),
    sellerLabel: String(row.seller_label ?? 'Trendyol test mağazası (mock)'),
    connectedAt: asIso(row.connected_at),
    lastSyncAt: row.last_sync_at ? asIso(row.last_sync_at) : null,
    checkpoint: row.checkpoint ? String(row.checkpoint) : null,
    k01: K01_NOTE,
    mock: true,
  };
}

export class PostgresIdentityRepository implements IdentityRepository {
  readonly backend = 'postgres' as const;

  private constructor(private readonly pool: Pool) {}

  static async connect(databaseUrl: string): Promise<PostgresIdentityRepository> {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: databaseUrl, max: 4 });
    const repo = new PostgresIdentityRepository(pool);
    await repo.migrate();
    return repo;
  }

  private async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_uid TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS shops (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations (id),
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        status_label TEXT NOT NULL,
        seller_label TEXT NOT NULL,
        connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_sync_at TIMESTAMPTZ,
        checkpoint TEXT
      );
      CREATE TABLE IF NOT EXISTS devices (
        uid TEXT PRIMARY KEY,
        fcm_token TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS listings (
        organization_id TEXT NOT NULL REFERENCES organizations (id),
        listing_id TEXT NOT NULL,
        shop_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        PRIMARY KEY (organization_id, listing_id)
      );
      CREATE TABLE IF NOT EXISTS org_orders (
        organization_id TEXT NOT NULL REFERENCES organizations (id),
        order_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        PRIMARY KEY (organization_id, order_id)
      );
      CREATE TABLE IF NOT EXISTS listing_mappings (
        organization_id TEXT NOT NULL REFERENCES organizations (id),
        listing_id TEXT NOT NULL,
        sku TEXT NOT NULL,
        PRIMARY KEY (organization_id, listing_id)
      );
      CREATE TABLE IF NOT EXISTS sku_stock (
        organization_id TEXT NOT NULL REFERENCES organizations (id),
        sku TEXT NOT NULL,
        physical INTEGER NOT NULL DEFAULT 0,
        reserved INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (organization_id, sku)
      );
      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        sku TEXT NOT NULL,
        delta_physical INTEGER NOT NULL,
        delta_reserved INTEGER NOT NULL,
        reason TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (organization_id, idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS stock_outbox (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        sku TEXT NOT NULL,
        intended_qty INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS operations (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        ref_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await this.pool.query(`
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS checkpoint TEXT;
    `);
  }

  async getOrgForUid(uid: string): Promise<OrganizationSummary | null> {
    const res = await this.pool.query('SELECT id, name, owner_uid FROM organizations WHERE owner_uid = $1', [
      uid,
    ]);
    const row = res.rows[0];
    return row ? rowToOrg(row) : null;
  }

  async getOrgById(id: string): Promise<OrganizationSummary | null> {
    const res = await this.pool.query('SELECT id, name, owner_uid FROM organizations WHERE id = $1', [id]);
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
    return rowToOrg(res.rows[0]);
  }

  async saveDevice(uid: string, fcmToken: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO devices (uid, fcm_token) VALUES ($1, $2)
       ON CONFLICT (uid) DO UPDATE SET fcm_token = EXCLUDED.fcm_token, updated_at = now()`,
      [uid, fcmToken],
    );
  }

  async upsertTrendyolMockShop(org: OrganizationSummary): Promise<ShopStatus> {
    const id = `shop_ty_${org.id}`;
    const statusLabel = 'Bağlı (mock — K01)';
    const sellerLabel = 'Trendyol test mağazası (mock)';
    const res = await this.pool.query(
      `INSERT INTO shops (id, organization_id, channel, status, status_label, seller_label)
       VALUES ($1, $2, 'trendyol', 'mock_connected', $3, $4)
       ON CONFLICT (id) DO UPDATE SET status_label = EXCLUDED.status_label, seller_label = EXCLUDED.seller_label
       RETURNING id, organization_id, channel, status, status_label, seller_label, connected_at, last_sync_at, checkpoint`,
      [id, org.id, statusLabel, sellerLabel],
    );
    return rowToShop(res.rows[0]);
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

  async markShopSynced(shopId: string, checkpoint: string, lastSyncAt: string): Promise<ShopStatus> {
    const res = await this.pool.query(
      `UPDATE shops SET last_sync_at = $2::timestamptz, checkpoint = $3
       WHERE id = $1
       RETURNING id, organization_id, channel, status, status_label, seller_label,
                 connected_at, last_sync_at, checkpoint`,
      [shopId, lastSyncAt, checkpoint],
    );
    return rowToShop(res.rows[0]);
  }

  async upsertListings(orgId: string, shopId: string, listings: MockListingSeed[]): Promise<number> {
    for (const listing of listings) {
      await this.pool.query(
        `INSERT INTO listings (organization_id, listing_id, shop_id, payload)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (organization_id, listing_id)
         DO UPDATE SET shop_id = EXCLUDED.shop_id, payload = EXCLUDED.payload`,
        [orgId, listing.id, shopId, JSON.stringify(listing)],
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
    const res = await this.pool.query('SELECT payload FROM org_orders WHERE organization_id = $1', [orgId]);
    return res.rows.map((row) => ({
      ...(row.payload as Omit<OrderListItem, 'organizationId'>),
      organizationId: orgId,
    }));
  }

  async getListing(orgId: string, listingId: string): Promise<StoredListing | null> {
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

  async upsertMapping(orgId: string, listingId: string, sku: string): Promise<ListingMapping> {
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

  async getOrder(orgId: string, orderId: string): Promise<OrderListItem | null> {
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
      [balance.organizationId, balance.sku, balance.physicalStock, balance.reservedStock],
    );
    return { ...balance, sellableStock: sellableOf(balance.physicalStock, balance.reservedStock) };
  }

  async findMovementByKey(orgId: string, idempotencyKey: string): Promise<StockMovement | null> {
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
    return (await this.findMovementByKey(movement.organizationId, movement.idempotencyKey)) ?? movement;
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
      [entry.id, entry.organizationId, entry.sku, entry.intendedQty, entry.status, entry.createdAt],
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

  async appendOperation(event: OperationEvent): Promise<OperationEvent> {
    await this.pool.query(
      `INSERT INTO operations (id, organization_id, type, title, status, ref_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)`,
      [event.id, event.organizationId, event.type, event.title, event.status, event.refId, event.createdAt],
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
    log.log('org persistence: postgres');
    return repo;
  } catch {
    log.warn(
      'DATABASE_URL set but Postgres is unreachable; falling back to in-memory orgs. Connection string is not logged.',
    );
    return null;
  }
}
