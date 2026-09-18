import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import type { ReturnListItem } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller('v1/returns')
export class ReturnsController {
  constructor(private readonly identity: IdentityStore) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<{ items: ReturnListItem[]; tyWrite: false }> {
    return this.identity.listReturns(user.uid);
  }

  @Patch(':id/review')
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') returnId: string,
    @Body() body: { decision?: string; note?: string },
  ): Promise<ReturnListItem> {
    return this.identity.reviewReturn(user.uid, returnId, body ?? {});
  }
}
