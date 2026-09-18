import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ListingPublishController } from './listing-publish.controller';
import { ReportsController } from './reports.controller';
import { ReturnsController } from './returns.controller';
import { TeamController } from './team.controller';

@Module({
  imports: [IdentityModule],
  controllers: [ReturnsController, TeamController, ReportsController, ListingPublishController],
})
export class F4Module {}
