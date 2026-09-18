import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('F0 API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.TRENDYOL_USE_MOCK = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('api');
    expect(res.body.mock).toBe(true);
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /v1/products and /api/preview/products share shape', async () => {
    const v1 = await request(app.getHttpServer()).get('/v1/products').expect(200);
    const preview = await request(app.getHttpServer())
      .get('/api/preview/products')
      .expect(200);
    expect(v1.body.mock).toBe(true);
    expect(v1.body.items.length).toBeGreaterThan(0);
    expect(v1.body.items[0]).toEqual(
      expect.objectContaining({
        sku: expect.any(String),
        title: expect.any(String),
        sellableStock: expect.any(Number),
        channel: 'trendyol',
      }),
    );
    expect(preview.body).toEqual(v1.body);
  });

  it('GET /v1/orders and /api/preview/orders share shape', async () => {
    const v1 = await request(app.getHttpServer()).get('/v1/orders').expect(200);
    const preview = await request(app.getHttpServer())
      .get('/api/preview/orders')
      .expect(200);
    expect(v1.body.mock).toBe(true);
    expect(v1.body.items[0]).toEqual(
      expect.objectContaining({
        orderNumber: expect.any(String),
        statusLabel: expect.any(String),
        channel: 'trendyol',
      }),
    );
    expect(preview.body).toEqual(v1.body);
  });

  it('paginates', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/products?page=1&pageSize=1')
      .expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});
