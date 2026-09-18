import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { HealthController } from './health.controller';

@Module({
  imports: [IdentityModule],
  controllers: [HealthController],
})
export class HealthModule {}
