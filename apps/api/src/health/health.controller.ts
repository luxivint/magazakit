import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@magazakit/contracts';
import { FirebaseAuthService } from '../auth/firebase-auth.service';
import { Public } from '../auth/public.decorator';
import { K01_NOTE, trendyolMode } from '../config/trendyol-env';

@Controller()
export class HealthController {
  constructor(private readonly firebaseAuth: FirebaseAuthService) {}

  @Public()
  @Get('health')
  getHealth(): HealthResponse {
    const mode = trendyolMode();
    const configured = this.firebaseAuth.isConfigured();
    const projectId = this.firebaseAuth.projectId();
    return {
      status: 'ok',
      service: 'api',
      mock: mode === 'mock',
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
        k01: K01_NOTE,
      },
    };
  }
}
