import { IdentityStore } from './identity.store';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('IdentityStore', () => {
  it('maps org to firebase uid and rejects foreigners', () => {
    const store = new IdentityStore();
    const org = store.createOrg('uid-a', 'Mağazam');
    expect(store.createOrg('uid-a', 'Other')).toEqual(org);
    expect(store.getOrgForUid('uid-a')?.ownerUid).toBe('uid-a');
    store.assertOrgAccess('uid-a', org.id);
    expect(() => store.assertOrgAccess('uid-b', org.id)).toThrow(HttpException);
    try {
      store.assertOrgAccess('uid-b', org.id);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });
});
