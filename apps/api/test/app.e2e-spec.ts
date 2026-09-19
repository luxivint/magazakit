import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { FirebaseAuthService } from '../src/auth/firebase-auth.service';
import type { AuthUser } from '../src/auth/current-user.decorator';

describe('public API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.TRENDYOL_USE_MOCK = 'true';
    process.env.OUTBOX_DRAIN_INTERVAL_MS = '0';
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.DATABASE_URL;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health is public and defaults to magazam-app', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.auth.provider).toBe('firebase');
    expect(res.body.auth.projectId).toBe('magazam-app');
    expect(res.body.auth.configured).toBe(true);
    expect(res.body.persistence).toBe('memory');
    expect(res.body.outbox.pending).toBe(0);
    expect(res.body.outbox.mock).toBe(true);
    expect(res.body.channels).toHaveLength(11);
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /v1/docs is public', async () => {
    const res = await request(app.getHttpServer()).get('/v1/docs').expect(200);
    expect(res.body.auth.projectId).toBe('magazam-app');
  });

  it('GET /v1/products is 401 UNAUTHENTICATED without Bearer', async () => {
    const res = await request(app.getHttpServer()).get('/v1/products').expect(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('explicit empty FIREBASE_PROJECT_ID → AUTH_NOT_CONFIGURED', async () => {
    await app.close();
    process.env.FIREBASE_PROJECT_ID = '';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    const res = await request(app.getHttpServer()).get('/v1/me').expect(401);
    expect(res.body.error.code).toBe('AUTH_NOT_CONFIGURED');
  });
});

describe('authenticated mock Firebase (e2e)', () => {
  let app: INestApplication<App>;
  let uid = 'uid-1';

  beforeEach(async () => {
    process.env.TRENDYOL_USE_MOCK = 'true';
    process.env.FIREBASE_PROJECT_ID = 'magazam-app';
    process.env.OUTBOX_DRAIN_INTERVAL_MS = '0';
    delete process.env.DATABASE_URL;
    const firebaseAuth: Pick<
      FirebaseAuthService,
      'isConfigured' | 'verifyBearer' | 'projectId' | 'usesAdc'
    > = {
      isConfigured: () => true,
      projectId: () => 'magazam-app',
      usesAdc: () => false,
      verifyBearer: async (authorization?: string): Promise<AuthUser> => {
        if (authorization === 'Bearer test') {
          return { uid, email: 'dev@example.com' };
        }
        if (authorization === 'Bearer other') {
          return { uid: 'uid-other', email: 'other@example.com' };
        }
        throw new HttpException(
          { code: 'UNAUTHENTICATED', message: 'bad token' },
          HttpStatus.UNAUTHORIZED,
        );
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseAuthService)
      .useValue(firebaseAuth)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    uid = 'uid-1';
  });

  afterEach(async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    await app.close();
  });

  it('rejects missing bearer', async () => {
    const res = await request(app.getHttpServer()).get('/v1/me').expect(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('me, create org, products, devices', async () => {
    const auth = { Authorization: 'Bearer test' };
    const me = await request(app.getHttpServer()).get('/v1/me').set(auth).expect(200);
    expect(me.body.uid).toBe('uid-1');
    expect(me.body.organization).toBeNull();

    const org = await request(app.getHttpServer())
      .post('/v1/organizations')
      .set(auth)
      .send({ name: 'Atakan Mağaza' })
      .expect(201);
    expect(org.body.ownerUid).toBe('uid-1');

    const empty = await request(app.getHttpServer())
      .get('/v1/products?pageSize=1')
      .set(auth)
      .expect(200);
    expect(empty.body.items).toHaveLength(0);

    const device = await request(app.getHttpServer())
      .post('/v1/devices')
      .set(auth)
      .send({ fcmToken: 'fcm-test' })
      .expect(201);
    expect(device.body.stored).toBe(true);
    expect(device.body.durable).toBe(false);

    const connectFail = await request(app.getHttpServer())
      .post('/v1/shops/trendyol/connect')
      .set({ Authorization: 'Bearer other' })
      .send({})
      .expect(400);
    expect(connectFail.body.error.code).toBe('VALIDATION');

    await request(app.getHttpServer())
      .post('/v1/organizations')
      .set({ Authorization: 'Bearer other' })
      .send({ name: 'Diğer' })
      .expect(201);

    const shop = await request(app.getHttpServer())
      .post('/v1/shops/trendyol/connect')
      .set(auth)
      .send({ sellerId: '123', apiKey: 'should-not-be-stored' })
      .expect(201);
    expect(shop.body.channel).toBe('trendyol');
    expect(shop.body.mock).toBe(true);
    expect(JSON.stringify(shop.body)).not.toContain('should-not-be-stored');

    const sync = await request(app.getHttpServer())
      .post(`/v1/shops/${shop.body.id}/sync`)
      .set(auth)
      .expect(201);
    expect(sync.body.productsUpserted).toBe(3);
    await request(app.getHttpServer())
      .post(`/v1/shops/${shop.body.id}/sync`)
      .set(auth)
      .expect(201);

    const products = await request(app.getHttpServer()).get('/v1/products').set(auth).expect(200);
    expect(products.body.total).toBe(3);
    expect(products.body.items[0].mapped).toBe(false);
    expect(products.body.items[0].stockSource).toBe('none');
    expect(products.body.items[0].sellableStock).toBe(0);

    const listingId = products.body.items[0].listingId as string;
    const mapping = await request(app.getHttpServer())
      .post('/v1/mappings')
      .set(auth)
      .send({ listingId, sku: 'MASTER-1' })
      .expect(201);
    expect(mapping.body.stockSource).toBe('master_sku');

    const mappedPage = await request(app.getHttpServer()).get('/v1/products').set(auth).expect(200);
    const mapped = mappedPage.body.items.find((p: { listingId: string }) => p.listingId === listingId);
    expect(mapped.mapped).toBe(true);
    expect(mapped.sku).toBe('MASTER-1');
    expect(mapped.sellableStock).toBe(0);

    const preview = await request(app.getHttpServer())
      .get('/api/preview/orders?pageSize=1')
      .set(auth)
      .expect(200);
    expect(preview.body.items[0].orderNumber).toBeDefined();
    expect(preview.body.items[0].organizationId).toBe(org.body.id);

    const otherCatalog = await request(app.getHttpServer())
      .get('/v1/products')
      .set({ Authorization: 'Bearer other' })
      .expect(200);
    expect(otherCatalog.body.items).toHaveLength(0);

    const shops = await request(app.getHttpServer()).get('/v1/shops').set(auth).expect(200);
    expect(shops.body.items).toHaveLength(1);

    await request(app.getHttpServer())
      .get(`/v1/products?organizationId=${org.body.id}`)
      .set({ Authorization: 'Bearer other' })
      .expect(403);
  });

  it('F3 reserve / pack / label / ship / ledger / operations', async () => {
    const auth = { Authorization: 'Bearer test' };
    await request(app.getHttpServer()).post('/v1/organizations').set(auth).send({ name: 'Pilot' }).expect(201);
    const shop = await request(app.getHttpServer())
      .post('/v1/shops/trendyol/connect')
      .set(auth)
      .send({})
      .expect(201);
    await request(app.getHttpServer()).post(`/v1/shops/${shop.body.id}/sync`).set(auth).expect(201);
    await request(app.getHttpServer())
      .post('/v1/mappings')
      .set(auth)
      .send({ listingId: 'ty-p-1001', sku: 'MASTER-TSHIRT' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/v1/mappings')
      .set(auth)
      .send({ listingId: 'ty-p-1002', sku: 'MASTER-HOODIE' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/v1/stock/adjust')
      .set(auth)
      .send({ sku: 'MASTER-TSHIRT', deltaPhysical: 10, idempotencyKey: 'e2e-t' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/v1/stock/adjust')
      .set(auth)
      .send({ sku: 'MASTER-HOODIE', deltaPhysical: 4, idempotencyKey: 'e2e-h' })
      .expect(201);

    const unmapped = await request(app.getHttpServer())
      .post('/v1/orders/ty-o-5003/reserve')
      .set(auth)
      .send({})
      .expect(400);
    expect(unmapped.body.error.code).toBe('UNMAPPED_SKU');

    const reserved = await request(app.getHttpServer())
      .post('/v1/orders/ty-o-5001/reserve')
      .set(auth)
      .send({ idempotencyKey: 'e2e-res' })
      .expect(201);
    expect(reserved.body.reserved).toBe(true);

    const again = await request(app.getHttpServer())
      .post('/v1/orders/ty-o-5001/reserve')
      .set(auth)
      .send({ idempotencyKey: 'e2e-other' })
      .expect(409);
    expect(again.body.error.code).toBe('CONFLICT');

    await request(app.getHttpServer())
      .post('/v1/orders/ty-o-5001/pack/scan')
      .set(auth)
      .send({ sku: 'MASTER-TSHIRT' })
      .expect(201);
    const label = await request(app.getHttpServer())
      .post('/v1/orders/ty-o-5001/label')
      .set(auth)
      .expect(201);
    expect(label.body.labeled).toBe(true);
    expect(label.body.shipped).toBe(false);

    const incomplete = await request(app.getHttpServer())
      .post('/v1/orders/ty-o-5001/ship')
      .set(auth)
      .send({})
      .expect(400);
    expect(incomplete.body.error.code).toBe('PACK_INCOMPLETE');

    await request(app.getHttpServer())
      .post('/v1/orders/ty-o-5001/pack/scan')
      .set(auth)
      .send({ barcode: '8680001001002' })
      .expect(201);

    const shipped = await request(app.getHttpServer())
      .post('/v1/orders/ty-o-5001/ship')
      .set(auth)
      .send({})
      .expect(201);
    expect(shipped.body.shipped).toBe(true);

    const stock = await request(app.getHttpServer()).get('/v1/stock/MASTER-TSHIRT').set(auth).expect(200);
    expect(stock.body.physicalStock).toBe(9);
    expect(stock.body.sellableStock).toBe(9);

    const ops = await request(app.getHttpServer()).get('/v1/operations').set(auth).expect(200);
    expect(ops.body.items.length).toBeGreaterThan(0);
    const movements = await request(app.getHttpServer()).get('/v1/stock/movements').set(auth).expect(200);
    expect(movements.body.items.some((m: { reason: string }) => m.reason === 'ship')).toBe(true);
  });

  it('F4 returns/team/reports/draft and F5 offering without charging', async () => {
    const auth = { Authorization: 'Bearer test' };
    await request(app.getHttpServer()).post('/v1/organizations').set(auth).send({ name: 'F4' }).expect(201);
    const shop = await request(app.getHttpServer())
      .post('/v1/shops/trendyol/connect')
      .set(auth)
      .send({})
      .expect(201);
    await request(app.getHttpServer()).post(`/v1/shops/${shop.body.id}/sync`).set(auth).expect(201);

    const returns = await request(app.getHttpServer()).get('/v1/returns').set(auth).expect(200);
    expect(returns.body.tyWrite).toBe(false);
    expect(returns.body.items[0].id).toBe('ty-r-9001');
    const reviewed = await request(app.getHttpServer())
      .patch('/v1/returns/ty-r-9001/review')
      .set(auth)
      .send({ decision: 'reject', note: 'stub' })
      .expect(200);
    expect(reviewed.body.tyWrite).toBe(false);
    expect(reviewed.body.status).toBe('rejected');

    const invite = await request(app.getHttpServer())
      .post('/v1/team/invites')
      .set(auth)
      .send({ email: 'a@b.co' })
      .expect(201);
    expect(invite.body.emailSent).toBe(false);
    const team = await request(app.getHttpServer()).get('/v1/team/members').set(auth).expect(200);
    expect(team.body.members.length).toBeGreaterThan(0);

    const report = await request(app.getHttpServer()).get('/v1/reports/summary').set(auth).expect(200);
    expect(report.body.orderCounts.total).toBeGreaterThan(0);
    expect(report.body.profit).toBeUndefined();

    const draft = await request(app.getHttpServer())
      .post('/v1/listings/ty-p-1001/draft')
      .set(auth)
      .send({ title: 'Draft' })
      .expect(201);
    expect(draft.body.liveTyWrite).toBe(false);
    const live = await request(app.getHttpServer())
      .post('/v1/listings/ty-p-1001/publish')
      .set(auth)
      .send({ mock: true })
      .expect(201);
    expect(live.body.state).toBe('mock_live');
    expect(live.body.liveTyWrite).toBe(false);

    const offering = await request(app.getHttpServer()).get('/v1/billing/offering').set(auth).expect(200);
    expect(offering.body.chargeable).toBe(false);
    expect(offering.body.processor).toBeNull();
    expect(offering.body.items.map((p: { priceTry: number }) => p.priceTry)).toEqual([499, 999, 1999]);
  });

  it('F6 suppliers, warehouses, einvoice, printer stubs', async () => {
    const auth = { Authorization: 'Bearer test' };
    await request(app.getHttpServer()).post('/v1/organizations').set(auth).send({ name: 'F6' }).expect(201);
    const sup = await request(app.getHttpServer())
      .post('/v1/suppliers')
      .set(auth)
      .send({ name: 'Tedarikçi' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/v1/purchase-orders')
      .set(auth)
      .send({ supplierId: sup.body.id, qty: 3 })
      .expect(201);
    const wh = await request(app.getHttpServer()).get('/v1/warehouses').set(auth).expect(200);
    expect(wh.body.items[0].isDefault).toBe(true);
    const xfer = await request(app.getHttpServer())
      .post('/v1/warehouses/transfers')
      .set(auth)
      .send({ sku: 'SKU', qty: 1 })
      .expect(201);
    expect(xfer.body.stub).toBe(true);
    const inv = await request(app.getHttpServer()).post('/v1/einvoices').set(auth).send({}).expect(201);
    expect(inv.body.gibLive).toBe(false);
    const print = await request(app.getHttpServer()).post('/v1/printer/test-print').set(auth).expect(201);
    expect(print.body.printed).toBe(false);
  });

  it('GET /v1/channels lists 11; BLOKE connect is 503 not connected', async () => {
    const auth = { Authorization: 'Bearer test' };
    const listed = await request(app.getHttpServer()).get('/v1/channels').expect(200);
    expect(listed.body.items).toHaveLength(11);
    expect(listed.body.write).toBe(false);
    const pazarama = listed.body.items.find((c: { channel: string }) => c.channel === 'pazarama');
    expect(pazarama.mode).toBe('blocked');
    expect(listed.body.items.every((c: { write: boolean }) => c.write === false)).toBe(true);

    await request(app.getHttpServer()).post('/v1/organizations').set(auth).send({ name: 'Kanal' }).expect(201);
    const blocked = await request(app.getHttpServer())
      .post('/v1/shops/pazarama/connect')
      .set(auth)
      .send({})
      .expect(503);
    expect(blocked.body.error.code).toBe('CHANNEL_UNAVAILABLE');
    const shops = await request(app.getHttpServer()).get('/v1/shops').set(auth).expect(200);
    expect(shops.body.items).toHaveLength(0);
  });
});
