import type { OrganizationSummary, ShopStatus } from '@magazakit/contracts';
import { K01_NOTE } from '../config/trendyol-env';
import type { IdentityRepository } from './identity.repository';

function mockShop(org: OrganizationSummary): ShopStatus {
  return {
    id: `shop_ty_${org.id}`,
    organizationId: org.id,
    channel: 'trendyol',
    status: 'mock_connected',
    statusLabel: 'Bağlı (mock — K01)',
    sellerLabel: 'Trendyol test mağazası (mock)',
    connectedAt: new Date().toISOString(),
    k01: K01_NOTE,
    mock: true,
  };
}

/**
 * TODO(F2): replace with Postgres-required org + shop tables once DATABASE_URL
 * is always available. In-memory is lost on process restart.
 */
export class MemoryIdentityRepository implements IdentityRepository {
  readonly backend = 'memory' as const;
  private readonly orgsByOwner = new Map<string, OrganizationSummary>();
  private readonly orgsById = new Map<string, OrganizationSummary>();
  private readonly fcmByUid = new Map<string, string>();
  private readonly shopsByOrg = new Map<string, ShopStatus>();
  private seq = 0;

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
    const shop = mockShop(org);
    this.shopsByOrg.set(org.id, shop);
    return shop;
  }

  async listShopsForUid(uid: string): Promise<ShopStatus[]> {
    const org = this.orgsByOwner.get(uid);
    if (!org) {
      return [];
    }
    const shop = this.shopsByOrg.get(org.id);
    return shop ? [shop] : [];
  }
}
