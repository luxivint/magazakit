import { IdentityStore } from './identity.store';
import { MemoryIdentityRepository } from './memory-identity.repository';
import { MockTrendyolReadAdapter } from '../trendyol/mock-trendyol-read.adapter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('IdentityStore F2 catalog', () => {
  async function store() {
    return new IdentityStore(new MemoryIdentityRepository(), new MockTrendyolReadAdapter());
  }

  it('maps org to firebase uid and rejects foreigners', async () => {
    const s = await store();
    const org = await s.createOrg('uid-a', 'Mağazam');
    expect(await s.createOrg('uid-a', 'Other')).toEqual(org);
    expect((await s.getOrgForUid('uid-a'))?.ownerUid).toBe('uid-a');
    await s.assertOrgAccess('uid-a', org.id);
    await s.createOrg('uid-b', 'Diğer');
    await expect(s.assertOrgAccess('uid-b', org.id)).rejects.toBeInstanceOf(HttpException);
    try {
      await s.assertOrgAccess('uid-b', org.id);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });

  it('sync upserts listings once and mapping is the only stock source', async () => {
    const s = await store();
    await s.createOrg('uid-a', 'Mağazam');
    const shop = await s.connectTrendyolMock('uid-a');
    const first = await s.syncShop('uid-a', shop.id);
    const second = await s.syncShop('uid-a', shop.id);
    expect(first.productsUpserted).toBe(3);
    expect(second.productsUpserted).toBe(3);

    const page = await s.listProducts('uid-a', undefined);
    expect(page.total).toBe(3);
    expect(page.items.every((p) => p.mapped === false && p.stockSource === 'none')).toBe(true);
    expect(page.items.every((p) => p.sellableStock === 0)).toBe(true);

    const listingId = page.items[0].listingId;
    const mapping = await s.upsertMapping('uid-a', listingId, 'MASTER-TSHIRT');
    expect(mapping.stockSource).toBe('master_sku');

    const after = await s.listProducts('uid-a', undefined);
    const mapped = after.items.find((p) => p.listingId === listingId);
    expect(mapped?.mapped).toBe(true);
    expect(mapped?.stockSource).toBe('master_sku');
    expect(mapped?.sku).toBe('MASTER-TSHIRT');
    expect(mapped?.sellableStock).toBe(0);
    expect(mapped?.marketplaceStock).toBeGreaterThan(0);

    await expect(s.upsertMapping('uid-a', 'missing', 'X')).rejects.toBeInstanceOf(HttpException);
  });
});
