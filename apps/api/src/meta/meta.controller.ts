import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { DEFAULT_FIREBASE_PROJECT_ID } from '../config/firebase-env';

@Controller('v1')
export class MetaController {
  @Public()
  @Get('docs')
  docs() {
    return {
      auth: {
        provider: 'firebase',
        projectId: DEFAULT_FIREBASE_PROJECT_ID,
        header: 'Authorization: Bearer <Firebase ID token from magazam-app>',
        note: 'Homemade register/login yok. Nest Admin SDK verifyIdToken (aud = magazam-app). Service account JSON commit edilmez. Cloud/prod: GOOGLE_APPLICATION_CREDENTIALS.',
      },
      public: [{ method: 'GET', path: '/health' }, { method: 'GET', path: '/v1/docs' }],
      authenticated: [
        { method: 'GET', path: '/v1/me' },
        { method: 'POST', path: '/v1/organizations', body: { name: 'string' } },
        { method: 'GET', path: '/v1/organizations/current' },
        { method: 'POST', path: '/v1/devices', body: { fcmToken: 'string' }, note: 'durable when DATABASE_URL is set' },
        { method: 'GET', path: '/v1/shops' },
        {
          method: 'POST',
          path: '/v1/shops/trendyol/connect',
          body: { sellerId: 'optional; apiKey/apiSecret ignored and never stored' },
        },
        { method: 'POST', path: '/v1/shops/:id/sync' },
        { method: 'POST', path: '/v1/mappings', body: { listingId: 'string', sku: 'string' } },
        { method: 'GET', path: '/v1/mappings' },
        { method: 'GET', path: '/v1/products' },
        { method: 'GET', path: '/v1/orders' },
        { method: 'GET', path: '/v1/orders/:id' },
        {
          method: 'POST',
          path: '/v1/orders/:id/reserve',
          body: { idempotencyKey: 'optional; default reserve:{orderId}' },
        },
        { method: 'POST', path: '/v1/orders/:id/pack/scan', body: { sku: 'or barcode' } },
        { method: 'POST', path: '/v1/orders/:id/label', note: 'mock PDF; print ≠ shipped' },
        { method: 'GET', path: '/v1/orders/:id/label.pdf' },
        { method: 'POST', path: '/v1/orders/:id/ship' },
        {
          method: 'POST',
          path: '/v1/stock/adjust',
          body: { sku: 'string', deltaPhysical: 1, reason: 'adjust|count', idempotencyKey: 'required' },
        },
        { method: 'GET', path: '/v1/stock/movements' },
        { method: 'GET', path: '/v1/stock/outbox' },
        { method: 'GET', path: '/v1/stock/:sku' },
        { method: 'GET', path: '/v1/operations' },
        { method: 'GET', path: '/api/preview/products' },
        { method: 'GET', path: '/api/preview/orders' },
      ],
      baseUrl: 'http://127.0.0.1:43140',
    };
  }
}
