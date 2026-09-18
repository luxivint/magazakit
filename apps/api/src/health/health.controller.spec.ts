import { HealthController } from './health.controller';
import { FirebaseAuthService } from '../auth/firebase-auth.service';
import { IdentityStore } from '../identity/identity.store';
import { MemoryIdentityRepository } from '../identity/memory-identity.repository';
import { MockTrendyolReadAdapter } from '../trendyol/mock-trendyol-read.adapter';

describe('HealthController', () => {
  it('stays public and reports magazam-app', async () => {
    delete process.env.TRENDYOL_USE_MOCK;
    const firebaseAuth = {
      isConfigured: () => true,
      projectId: () => 'magazam-app',
      usesAdc: () => false,
    } as FirebaseAuthService;
    const identity = new IdentityStore(new MemoryIdentityRepository(), new MockTrendyolReadAdapter());
    const body = await new HealthController(firebaseAuth, identity).getHealth();
    expect(body.status).toBe('ok');
    expect(body.persistence).toBe('memory');
    expect(body.outbox?.pending).toBe(0);
    expect(body.outbox?.mock).toBe(true);
    expect(body.auth.projectId).toBe('magazam-app');
  });
});
