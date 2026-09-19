import { testIdentityStore } from './test-identity-store';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';

describe('IdentityStore F2 catalog', () => {
  async function store() {
    return testIdentityStore();
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
    const s = testIdentityStore();
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
    expect(await s.countPendingOutbox()).toBeGreaterThan(0);
    const drained = await s.drainOutbox();
    expect(drained.unknown).toBeGreaterThan(0);
    expect(await s.countPendingOutbox()).toBe(0);
    expect((await s.listOutbox('uid-a')).items.some((e) => e.status === 'unknown')).toBe(true);

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

describe('IdentityStore F4 stubs', () => {
  it('reviews returns without TY write; team invite stub; report has no profit', async () => {
    const s = testIdentityStore();
    await s.createOrg('uid-a', 'Mağazam');
    const shop = await s.connectTrendyolMock('uid-a');
    await s.syncShop('uid-a', shop.id);

    const listed = await s.listReturns('uid-a');
    expect(listed.tyWrite).toBe(false);
    expect(listed.items[0].id).toBe('ty-r-9001');
    const reviewed = await s.reviewReturn('uid-a', 'ty-r-9001', { decision: 'approve', note: 'stub' });
    expect(reviewed.status).toBe('approved');
    expect(reviewed.tyWrite).toBe(false);

    const team = await s.listTeam('uid-a');
    expect(team.members.some((m) => m.role === 'owner')).toBe(true);
    const invite = await s.inviteMember('uid-a', 'staff@example.com');
    expect(invite.emailSent).toBe(false);
    const again = await s.inviteMember('uid-a', 'staff@example.com');
    expect(again.id).toBe(invite.id);

    await s.adjustStock('uid-a', {
      sku: 'MASTER-TSHIRT',
      deltaPhysical: 4,
      idempotencyKey: 'rep-1',
    });
    const report = await s.opsReport('uid-a');
    expect(report.orderCounts.total).toBeGreaterThan(0);
    expect(report.stockDeltaPhysical).toBe(4);
    expect(report).not.toHaveProperty('profit');
    expect(report).not.toHaveProperty('estimatedEarnings');

    const draft = await s.saveListingDraft('uid-a', 'ty-p-1001', { title: 'Taslak tişört' });
    expect(draft.state).toBe('draft');
    expect(draft.liveTyWrite).toBe(false);
    const unpublished = await s.publishListing('uid-a', 'ty-p-1001', false);
    expect(unpublished.state).toBe('draft');
    const mockLive = await s.publishListing('uid-a', 'ty-p-1001', true);
    expect(mockLive.state).toBe('mock_live');
    expect(mockLive.liveTyWrite).toBe(false);
  });
});

describe('IdentityStore F6 stubs', () => {
  it('suppliers, PO, default warehouse transfer, einvoice gibLive false, printer test', async () => {
    const s = testIdentityStore();
    await s.createOrg('uid-a', 'Mağazam');
    const sup = await s.saveSupplier('uid-a', { name: 'Tekstil A.Ş.' });
    const patched = await s.saveSupplier('uid-a', { id: sup.id, note: 'stub' });
    expect(patched.note).toBe('stub');
    const po = await s.createPurchaseOrder('uid-a', { supplierId: sup.id, sku: 'X', qty: 2 });
    expect(po.stub).toBe(true);
    const wh = await s.listWarehouses('uid-a');
    expect(wh.items.some((w) => w.isDefault)).toBe(true);
    const xfer = await s.transferStock('uid-a', { sku: 'X', qty: 1 });
    expect(xfer.stub).toBe(true);
    const invoice = await s.createEinvoice('uid-a', { orderId: 'ty-o-5001' });
    expect(invoice.gibLive).toBe(false);
    expect((await s.listEinvoices('uid-a')).gibLive).toBe(false);
    const test = await s.testPrint('uid-a');
    expect(test.printed).toBe(false);
    expect(test.mock).toBe(true);
  });
});

describe('IdentityStore multi-channel', () => {
  function code(err: unknown): string {
    return ((err as HttpException).getResponse() as { code: string }).code;
  }

  it('lists 11 channels and never marks blocked ones connected', async () => {
    const s = testIdentityStore();
    const catalog = s.listChannelCatalog();
    expect(catalog).toHaveLength(11);
    expect(catalog.every((c) => c.write === false)).toBe(true);
    expect(catalog.find((c) => c.channel === 'trendyol')?.mode).toBe('mock');
    expect(catalog.find((c) => c.channel === 'hepsiburada')?.mode).toBe('unconfigured');
    expect(catalog.find((c) => c.channel === 'pazarama')?.mode).toBe('blocked');
    expect(catalog.find((c) => c.channel === 'ticimax')?.mode).toBe('blocked');
    expect(catalog.find((c) => c.channel === 'ideasoft')?.mode).toBe('blocked');

    await s.createOrg('uid-a', 'Mağazam');
    await expect(s.connectChannel('uid-a', 'pazarama')).rejects.toBeInstanceOf(HttpException);
    try {
      await s.connectChannel('uid-a', 'hepsiburada');
    } catch (err) {
      expect(code(err)).toBe(ErrorCodes.VALIDATION);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
    expect(await s.listShops('uid-a')).toEqual([]);
  });

  it('keeps marketplace secrets on the org shop record, not in process env', async () => {
    process.env.SHOPIFY_ACCESS_TOKEN = 'env-leak';
    const s = testIdentityStore();
    await s.createOrg('uid-a', 'A');
    await s.createOrg('uid-b', 'B');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { shop: { name: 'A' } } }), { status: 200 }),
    );
    try {
      const shop = await s.connectChannel('uid-a', 'shopify', {
        shopDomain: 'a.myshopify.com',
        accessToken: 'tok-a',
      });
      expect(shop.mock).toBe(false);
      expect(JSON.stringify(shop)).not.toContain('tok-a');
      await expect(s.syncShop('uid-b', shop.id)).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
      await expect(s.connectChannel('uid-b', 'shopify')).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    } finally {
      fetchMock.mockRestore();
      delete process.env.SHOPIFY_ACCESS_TOKEN;
    }
  });
});
