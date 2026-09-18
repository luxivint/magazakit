import { Body, Controller, Get, Post } from '@nestjs/common';
import type { EinvoiceDraft } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller('v1/einvoices')
export class EinvoicesController {
  constructor(private readonly identity: IdentityStore) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<{ items: EinvoiceDraft[]; gibLive: false }> {
    return this.identity.listEinvoices(user.uid);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { orderId?: string },
  ): Promise<EinvoiceDraft> {
    return this.identity.createEinvoice(user.uid, body ?? {});
  }
}
