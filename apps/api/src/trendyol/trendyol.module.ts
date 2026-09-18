import { Module } from '@nestjs/common';
import { trendyolMode } from '../config/trendyol-env';
import { MockTrendyolReadAdapter } from './mock-trendyol-read.adapter';
import { TRENDYOL_READ_ADAPTER } from './trendyol-read.adapter';
import { UnconfiguredTrendyolReadAdapter } from './unconfigured-trendyol-read.adapter';

@Module({
  providers: [
    {
      provide: TRENDYOL_READ_ADAPTER,
      useFactory: () =>
        trendyolMode() === 'mock'
          ? new MockTrendyolReadAdapter()
          : new UnconfiguredTrendyolReadAdapter(),
    },
  ],
  exports: [TRENDYOL_READ_ADAPTER],
})
export class TrendyolModule {}
