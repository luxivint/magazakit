import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { BillingController } from './billing.controller';

@Module({
  imports: [IdentityModule],
  controllers: [BillingController],
})
export class F5Module {}
