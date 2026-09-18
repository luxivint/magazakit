import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { OrganizationSummary, ShopStatus } from '@magazakit/contracts';
import { K01_NOTE } from '../config/trendyol-env';
import type { IdentityRepository } from './identity.repository';

type Pool = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  end: () => Promise<void>;
};

function rowToOrg(row: Record<string, unknown>): OrganizationSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    ownerUid: String(row.owner_uid),
  };
}

function rowToShop(row: Record<string, unknown>): ShopStatus {
  const connectedAt =
    row.connected_at instanceof Date
      ? row.connected_at.toISOString()
      : String(row.connected_at);
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    channel: 'trendyol',
    status: 'mock_connected',
    statusLabel: String(row.status_label ?? 'Bağlı (mock — K01)'),
    sellerLabel: String(row.seller_label ?? 'Trendyol test mağazası (mock)'),
    connectedAt,
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
        connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS devices (
        uid TEXT PRIMARY KEY,
        fcm_token TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
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
       ON CONFLICT (id) DO UPDATE SET status_label = EXCLUDED.status_label, seller_label = EXCLUDED.seller_label, connected_at = now()
       RETURNING id, organization_id, channel, status, status_label, seller_label, connected_at`,
      [id, org.id, statusLabel, sellerLabel],
    );
    return rowToShop(res.rows[0]);
  }

  async listShopsForUid(uid: string): Promise<ShopStatus[]> {
    const res = await this.pool.query(
      `SELECT s.id, s.organization_id, s.channel, s.status, s.status_label, s.seller_label, s.connected_at
       FROM shops s
       JOIN organizations o ON o.id = s.organization_id
       WHERE o.owner_uid = $1`,
      [uid],
    );
    return res.rows.map(rowToShop);
  }
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
      'DATABASE_URL set but Postgres is unreachable; falling back to in-memory orgs (TODO F2). Connection string is not logged.',
    );
    return null;
  }
}
