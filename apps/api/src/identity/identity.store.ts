import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCodes, type OrganizationSummary, type ShopStatus } from '@magazakit/contracts';
import type { IdentityRepository, PersistenceBackend } from './identity.repository';

@Injectable()
export class IdentityStore {
  constructor(private readonly repo: IdentityRepository) {}

  get backend(): PersistenceBackend {
    return this.repo.backend;
  }

  getOrgForUid(uid: string): Promise<OrganizationSummary | null> {
    return this.repo.getOrgForUid(uid);
  }

  createOrg(uid: string, name: string): Promise<OrganizationSummary> {
    return this.repo.createOrg(uid, name);
  }

  async assertOrgAccess(uid: string, organizationId: string | undefined): Promise<void> {
    if (!organizationId || organizationId.trim() === '') {
      return;
    }
    const org = await this.repo.getOrgById(organizationId);
    if (!org || org.ownerUid !== uid) {
      throw new HttpException(
        {
          code: ErrorCodes.FORBIDDEN,
          message: 'Bu organization_id bu kullanıcıya ait değil.',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  saveDevice(uid: string, fcmToken: string): Promise<void> {
    return this.repo.saveDevice(uid, fcmToken);
  }

  async connectTrendyolMock(uid: string): Promise<ShopStatus> {
    const org = await this.repo.getOrgForUid(uid);
    if (!org) {
      throw new HttpException(
        {
          code: ErrorCodes.VALIDATION,
          message: 'Önce işletme oluşturun (POST /v1/organizations).',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.repo.upsertTrendyolMockShop(org);
  }

  listShops(uid: string): Promise<ShopStatus[]> {
    return this.repo.listShopsForUid(uid);
  }
}
