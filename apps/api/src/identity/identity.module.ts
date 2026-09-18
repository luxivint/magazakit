import { Module } from '@nestjs/common';
import { createIdentityRepository } from './create-identity-repository';
import { DevicesController } from './devices.controller';
import { IdentityStore } from './identity.store';
import { MeController } from './me.controller';
import { ShopsController } from './shops.controller';

@Module({
  controllers: [MeController, DevicesController, ShopsController],
  providers: [
    {
      provide: IdentityStore,
      useFactory: async () => new IdentityStore(await createIdentityRepository()),
    },
  ],
  exports: [IdentityStore],
})
export class IdentityModule {}
