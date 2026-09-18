import { HealthController } from './health.controller';
import { FirebaseAuthService } from '../auth/firebase-auth.service';

describe('HealthController', () => {
  it('stays public and reports magazam-app', () => {
    delete process.env.TRENDYOL_USE_MOCK;
    const firebaseAuth = {
      isConfigured: () => true,
      projectId: () => 'magazam-app',
      usesAdc: () => false,
    } as FirebaseAuthService;
    const body = new HealthController(firebaseAuth).getHealth();
    expect(body.status).toBe('ok');
    expect(body.mock).toBe(true);
    expect(body.auth).toEqual({
      provider: 'firebase',
      projectId: 'magazam-app',
      configured: true,
      credential: 'project-id-only',
    });
  });
});
