import { HealthController } from './health.controller';
import { FirebaseAuthService } from '../auth/firebase-auth.service';

describe('HealthController', () => {
  it('stays public and reports firebase unconfigured', () => {
    delete process.env.TRENDYOL_USE_MOCK;
    const firebaseAuth = { isConfigured: () => false } as FirebaseAuthService;
    const body = new HealthController(firebaseAuth).getHealth();
    expect(body.status).toBe('ok');
    expect(body.mock).toBe(true);
    expect(body.auth.provider).toBe('firebase');
    expect(body.auth.configured).toBe(false);
  });
});
