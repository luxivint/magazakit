import { HealthController } from './health.controller';
import { FirebaseAuthService } from '../auth/firebase-auth.service';
import { testIdentityStore } from '../identity/test-identity-store';

describe('HealthController', () => {
  it('stays public and reports magazam-app', async () => {
    delete process.env.TRENDYOL_USE_MOCK;
    const firebaseAuth = {
      isConfigured: () => true,
      projectId: () => 'magazam-app',
      usesAdc: () => false,
    } as FirebaseAuthService;
    const identity = testIdentityStore();
    const body = await new HealthController(firebaseAuth, identity).getHealth();
    expect(body.status).toBe('ok');
    expect(body.persistence).toBe('memory');
    expect(body.outbox?.pending).toBe(0);
    expect(body.outbox?.mock).toBe(true);
    expect(body.auth.projectId).toBe('magazam-app');
    expect(body.channels).toHaveLength(11);
  });
});
