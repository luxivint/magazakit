import { Module } from '@nestjs/common';
import { ChannelsModule } from '../channels/channels.module';
import { CHANNEL_READ_ADAPTERS, type ChannelAdapterMap } from '../channels/types';
import { createIdentityRepository } from './create-identity-repository';
import { DevicesController } from './devices.controller';
import { IdentityStore } from './identity.store';
import { MappingsController } from './mappings.controller';
import { MeController } from './me.controller';
import { ShopsController } from './shops.controller';
import { OutboxDrainService } from '../outbox/outbox-drain.service';

@Module({
  imports: [ChannelsModule],
  controllers: [MeController, DevicesController, ShopsController, MappingsController],
  providers: [
    {
      provide: IdentityStore,
      useFactory: async (adapters: ChannelAdapterMap) =>
        new IdentityStore(await createIdentityRepository(), adapters),
      inject: [CHANNEL_READ_ADAPTERS],
    },
    OutboxDrainService,
  ],
  exports: [IdentityStore],
})
export class IdentityModule {}
