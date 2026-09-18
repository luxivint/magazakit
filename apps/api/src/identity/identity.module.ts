import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { IdentityStore } from './identity.store';
import { MeController } from './me.controller';

@Module({
  controllers: [MeController, DevicesController],
  providers: [IdentityStore],
  exports: [IdentityStore],
})
export class IdentityModule {}
