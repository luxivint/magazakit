import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@magazakit/contracts';
import { K01_NOTE, trendyolMode } from '../config/trendyol-env';

@Controller()
export class HealthController {
  @Get('health')
  getHealth(): HealthResponse {
    const mode = trendyolMode();
    return {
      status: 'ok',
      service: 'api',
      mock: mode === 'mock',
      trendyol: {
        mode,
        k01: K01_NOTE,
      },
    };
  }
}
