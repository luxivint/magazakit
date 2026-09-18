import { Module } from '@nestjs/common';
import { readTrendyolLiveConfig, trendyolMode } from '../config/trendyol-env';
import { LiveTrendyolReadAdapter } from './live-trendyol-read.adapter';
import { MockTrendyolReadAdapter } from './mock-trendyol-read.adapter';
import { TRENDYOL_READ_ADAPTER } from './trendyol-read.adapter';
import { UnconfiguredTrendyolReadAdapter } from './unconfigured-trendyol-read.adapter';

@Module({
  providers: [
    {
      provide: TRENDYOL_READ_ADAPTER,
      useFactory: () => {
        const mode = trendyolMode();
        if (mode === 'mock') {
          return new MockTrendyolReadAdapter();
        }
        const live = readTrendyolLiveConfig();
        if (mode === 'live' && live) {
          return new LiveTrendyolReadAdapter(live);
        }
        return new UnconfiguredTrendyolReadAdapter();
      },
    },
  ],
  exports: [TRENDYOL_READ_ADAPTER],
})
export class TrendyolModule {}
