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

describe('IdentityStore F3 fulfillment', () => {
  async function ready() {
    const s = new IdentityStore(new MemoryIdentityRepository(), new MockTrendyolReadAdapter());
    await s.createOrg('uid-a', 'Mağazam');
    const shop = await s.connectTrendyolMock('uid-a');
    await s.syncShop('uid-a', shop.id);
    await s.upsertMapping('uid-a', 'ty-p-1001', 'MASTER-TSHIRT');
    await s.upsertMapping('uid-a', 'ty-p-1002', 'MASTER-HOODIE');
    return s;
  }

  function code(err: unknown): string {
    return ((err as HttpException).getResponse() as { code: string }).code;
  }

  it('adjust is idempotent; sellable = physical − reserved; outbox is intended write', async () => {
    const s = await ready();
    const first = await s.adjustStock('uid-a', {
      sku: 'MASTER-TSHIRT',
      deltaPhysical: 10,
      reason: 'adjust',
      idempotencyKey: 'adj-1',
    });
    expect(first.balance.physicalStock).toBe(10);
    expect(first.balance.sellableStock).toBe(10);
    expect(first.outbox.kind).toBe('channel_stock_write');
    expect(first.outbox.intendedQty).toBe(10);
    expect(first.outbox.status).toBe('pending');

    const replay = await s.adjustStock('uid-a', {
      sku: 'MASTER-TSHIRT',
      deltaPhysical: 10,
      reason: 'adjust',
      idempotencyKey: 'adj-1',
    });
    expect(replay.movement.id).toBe(first.movement.id);
    expect(replay.balance.physicalStock).toBe(10);
    expect((await s.listMovements('uid-a')).items.filter((m) => m.idempotencyKey === 'adj-1')).toHaveLength(
      1,
    );

    await s.adjustStock('uid-a', {
      sku: 'MASTER-HOODIE',
      deltaPhysical: 5,
      reason: 'count',
      idempotencyKey: 'adj-h',
    });
  });

  it('rejects a second reserve; same key is a no-op; unmapped cannot ship', async () => {
    const s = await ready();
    await s.adjustStock('uid-a', {
      sku: 'MASTER-TSHIRT',
      deltaPhysical: 10,
      reason: 'adjust',
      idempotencyKey: 't-stock',
    });
    await s.adjustStock('uid-a', {
      sku: 'MASTER-HOODIE',
      deltaPhysical: 5,
      reason: 'adjust',
      idempotencyKey: 'h-stock',
    });

    const reserved = await s.reserveOrder('uid-a', 'ty-o-5001', 'res-a');
    expect(reserved.reserved).toBe(true);
    expect(reserved.reservationKey).toBe('res-a');
    const tshirt = await s.getSkuStock('uid-a', 'MASTER-TSHIRT');
    expect(tshirt.reservedStock).toBe(1);
    expect(tshirt.sellableStock).toBe(9);

    const replay = await s.reserveOrder('uid-a', 'ty-o-5001', 'res-a');
    expect(replay.reserved).toBe(true);
    expect((await s.getSkuStock('uid-a', 'MASTER-TSHIRT')).reservedStock).toBe(1);

    try {
      await s.reserveOrder('uid-a', 'ty-o-5001', 'res-other');
      throw new Error('expected');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect(code(err)).toBe('CONFLICT');
    }
  });

  it('unmapped order cannot reserve; pack scan; label does not ship; ship writes ledger', async () => {
    const s = await ready();
    await s.adjustStock('uid-a', {
      sku: 'MASTER-TSHIRT',
      deltaPhysical: 10,
      reason: 'adjust',
      idempotencyKey: 't2',
    });
    await s.adjustStock('uid-a', {
      sku: 'MASTER-HOODIE',
      deltaPhysical: 5,
      reason: 'adjust',
      idempotencyKey: 'h2',
    });

    try {
      await s.reserveOrder('uid-a', 'ty-o-5003');
      throw new Error('expected unmapped');
    } catch (err) {
      expect(code(err)).toBe('UNMAPPED_SKU');
    }

    await s.reserveOrder('uid-a', 'ty-o-5001', 'k1');
    try {
      await s.scanPackSku('uid-a', 'ty-o-5001', { sku: 'UNKNOWN' });
      throw new Error('expected wrong');
    } catch (err) {
      expect(code(err)).toBe('WRONG_SKU');
    }

    await s.scanPackSku('uid-a', 'ty-o-5001', { barcode: '8680001001001' });
    try {
      await s.shipOrder('uid-a', 'ty-o-5001');
      throw new Error('expected pack incomplete');
    } catch (err) {
      expect(code(err)).toBe('PACK_INCOMPLETE');
    }

    const packed = await s.scanPackSku('uid-a', 'ty-o-5001', { sku: 'MASTER-HOODIE' });
    expect(packed.packed).toBe(true);

    const label = await s.createLabel('uid-a', 'ty-o-5001');
    expect(label.labeled).toBe(true);
    expect(label.shipped).toBe(false);
    expect(label.pdfUrl).toContain('/v1/orders/ty-o-5001/label.pdf');
    expect((await s.getOrder('uid-a', 'ty-o-5001')).shipped).toBe(false);

    const shipped = await s.shipOrder('uid-a', 'ty-o-5001');
    expect(shipped.shipped).toBe(true);
    expect(shipped.status).toBe('shipped');
    const after = await s.getSkuStock('uid-a', 'MASTER-TSHIRT');
    expect(after.physicalStock).toBe(9);
    expect(after.reservedStock).toBe(0);
    expect(after.sellableStock).toBe(9);

    const again = await s.shipOrder('uid-a', 'ty-o-5001');
    expect(again.shipped).toBe(true);

    const ops = await s.listOperations('uid-a');
    expect(ops.items.some((e) => e.type === 'channel_stock_write' && e.status === 'pending')).toBe(true);
    expect(ops.items.some((e) => e.type === 'ship')).toBe(true);
  });
});
