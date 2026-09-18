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
        { method: 'POST', path: '/v1/devices', body: { fcmToken: 'string' } },
        { method: 'GET', path: '/v1/products' },
        { method: 'GET', path: '/v1/orders' },
        { method: 'GET', path: '/api/preview/products' },
        { method: 'GET', path: '/api/preview/orders' },
      ],
      baseUrl: 'http://127.0.0.1:43140',
    };
  }
}
