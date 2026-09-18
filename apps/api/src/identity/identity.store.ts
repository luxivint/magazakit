import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCodes, type OrganizationSummary } from '@magazakit/contracts';

@Injectable()
export class IdentityStore {
  private readonly orgsByOwner = new Map<string, OrganizationSummary>();
  private readonly orgsById = new Map<string, OrganizationSummary>();
  private readonly fcmByUid = new Map<string, string>();
  private seq = 0;

  getOrgForUid(uid: string): OrganizationSummary | null {
    return this.orgsByOwner.get(uid) ?? null;
  }

  createOrg(uid: string, name: string): OrganizationSummary {
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

  assertOrgAccess(uid: string, organizationId: string | undefined): void {
    if (!organizationId || organizationId.trim() === '') {
      return;
    }
    const org = this.orgsById.get(organizationId);
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

  saveDevice(uid: string, fcmToken: string): void {
    this.fcmByUid.set(uid, fcmToken);
  }
}
