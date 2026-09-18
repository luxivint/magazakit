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

    const products = await request(app.getHttpServer())
      .get('/v1/products?pageSize=1')
      .set(auth)
      .expect(200);
    expect(products.body.mock).toBe(true);
    expect(products.body.items[0].sku).toBeDefined();

    const preview = await request(app.getHttpServer())
      .get('/api/preview/orders?pageSize=1')
      .set(auth)
      .expect(200);
    expect(preview.body.mock).toBe(true);

    await request(app.getHttpServer())
      .post('/v1/devices')
      .set(auth)
      .send({ fcmToken: 'fcm-test' })
      .expect(201);

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
      .send({ sellerId: '123', apiKey: 'should-not-be-stored', apiSecret: 'nope' })
      .expect(201);
    expect(shop.body.channel).toBe('trendyol');
    expect(shop.body.mock).toBe(true);
    expect(JSON.stringify(shop.body)).not.toContain('should-not-be-stored');

    const shops = await request(app.getHttpServer()).get('/v1/shops').set(auth).expect(200);
    expect(shops.body.items).toHaveLength(1);

    await request(app.getHttpServer())
      .get(`/v1/products?organizationId=${org.body.id}`)
      .set({ Authorization: 'Bearer other' })
      .expect(403);
  });
});
