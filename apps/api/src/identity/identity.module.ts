import { Module } from '@nestjs/common';
import {
  TRENDYOL_READ_ADAPTER,
  type TrendyolReadAdapter,
} from '../trendyol/trendyol-read.adapter';
import { TrendyolModule } from '../trendyol/trendyol.module';
import { createIdentityRepository } from './create-identity-repository';
import { DevicesController } from './devices.controller';
import { IdentityStore } from './identity.store';
import { MappingsController } from './mappings.controller';
import { MeController } from './me.controller';
import { ShopsController } from './shops.controller';
import { OutboxDrainService } from '../outbox/outbox-drain.service';

@Module({
  imports: [TrendyolModule],
  controllers: [MeController, DevicesController, ShopsController, MappingsController],
  providers: [
    {
      provide: IdentityStore,
      useFactory: async (trendyol: TrendyolReadAdapter) =>
        new IdentityStore(await createIdentityRepository(), trendyol),
      inject: [TRENDYOL_READ_ADAPTER],
    },
    OutboxDrainService,
  ],
  exports: [IdentityStore],
})
export class IdentityModule {}
