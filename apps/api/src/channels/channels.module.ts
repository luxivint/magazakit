import { Module } from '@nestjs/common';
import { TrendyolModule } from '../trendyol/trendyol.module';
import { TRENDYOL_READ_ADAPTER, type TrendyolReadAdapter } from '../trendyol/trendyol-read.adapter';
import { createChannelAdapters } from './registry';
import { CHANNEL_READ_ADAPTERS } from './types';
import { ChannelsController } from './channels.controller';

@Module({
  imports: [TrendyolModule],
  controllers: [ChannelsController],
  providers: [
    {
      provide: CHANNEL_READ_ADAPTERS,
      useFactory: (trendyol: TrendyolReadAdapter) => createChannelAdapters(trendyol),
      inject: [TRENDYOL_READ_ADAPTER],
    },
  ],
  exports: [CHANNEL_READ_ADAPTERS, TrendyolModule],
})
export class ChannelsModule {}
