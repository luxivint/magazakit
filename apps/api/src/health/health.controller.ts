import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@magazakit/contracts';
import { FirebaseAuthService } from '../auth/firebase-auth.service';
import { Public } from '../auth/public.decorator';
import { K01_NOTE, LIVE_READ_NOTE, trendyolMode } from '../config/trendyol-env';
import { IdentityStore } from '../identity/identity.store';

@Controller()
export class HealthController {
  constructor(
    private readonly firebaseAuth: FirebaseAuthService,
    private readonly identity: IdentityStore,
  ) {}

  @Public()
  @Get('health')
  async getHealth(): Promise<HealthResponse> {
    const mode = trendyolMode();
    const configured = this.firebaseAuth.isConfigured();
    const projectId = this.firebaseAuth.projectId();
    const pending = await this.identity.countPendingOutbox();
    return {
      status: 'ok',
      service: 'api',
      mock: mode === 'mock',
      persistence: this.identity.backend,
      outbox: { pending, channel: 'trendyol', mock: mode !== 'live' },
      auth: {
        provider: 'firebase',
        projectId,
        configured,
        credential: !configured
          ? 'none'
          : this.firebaseAuth.usesAdc()
            ? 'adc'
            : 'project-id-only',
      },
      trendyol: {
        mode,
        k01: mode === 'live' ? LIVE_READ_NOTE : K01_NOTE,
      },
      channels: this.identity.listChannelCatalog().map((row) => ({
        channel: row.channel,
        mode: row.mode,
        write: false as const,
      })),
    };
  }
}
