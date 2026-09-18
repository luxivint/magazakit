import type { OrganizationSummary, ShopStatus } from '@magazakit/contracts';

export type PersistenceBackend = 'memory' | 'postgres';

export interface IdentityRepository {
  readonly backend: PersistenceBackend;
  getOrgForUid(uid: string): Promise<OrganizationSummary | null>;
  getOrgById(id: string): Promise<OrganizationSummary | null>;
  createOrg(uid: string, name: string): Promise<OrganizationSummary>;
  saveDevice(uid: string, fcmToken: string): Promise<void>;
  upsertTrendyolMockShop(org: OrganizationSummary): Promise<ShopStatus>;
  listShopsForUid(uid: string): Promise<ShopStatus[]>;
}
