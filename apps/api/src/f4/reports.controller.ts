import { Controller, Get } from '@nestjs/common';
import type { OpsReport } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly identity: IdentityStore) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser): Promise<OpsReport> {
    return this.identity.opsReport(user.uid);
  }
}
