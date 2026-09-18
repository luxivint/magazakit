import { IdentityStore } from './identity.store';
import { MemoryIdentityRepository } from './memory-identity.repository';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('IdentityStore', () => {
  it('maps org to firebase uid and rejects foreigners', async () => {
    const store = new IdentityStore(new MemoryIdentityRepository());
    const org = await store.createOrg('uid-a', 'Mağazam');
    expect(await store.createOrg('uid-a', 'Other')).toEqual(org);
    expect((await store.getOrgForUid('uid-a'))?.ownerUid).toBe('uid-a');
    await store.assertOrgAccess('uid-a', org.id);
    await expect(store.assertOrgAccess('uid-b', org.id)).rejects.toBeInstanceOf(HttpException);
    try {
      await store.assertOrgAccess('uid-b', org.id);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });

  it('connects a mock Trendyol shop after org exists', async () => {
    const store = new IdentityStore(new MemoryIdentityRepository());
    await expect(store.connectTrendyolMock('uid-a')).rejects.toBeInstanceOf(HttpException);
    await store.createOrg('uid-a', 'Mağazam');
    const shop = await store.connectTrendyolMock('uid-a');
    expect(shop.channel).toBe('trendyol');
    expect(shop.mock).toBe(true);
    expect(shop.status).toBe('mock_connected');
  });
});
