import { Controller, Get, Inject, Query } from '@nestjs/common';
import { parsePageQuery, type OrderListItem, type PreviewList } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';
import {
  TRENDYOL_READ_ADAPTER,
  type TrendyolReadAdapter,
} from '../trendyol/trendyol-read.adapter';

@Controller()
export class OrdersController {
  constructor(
    @Inject(TRENDYOL_READ_ADAPTER)
    private readonly trendyol: TrendyolReadAdapter,
    private readonly identity: IdentityStore,
  ) {}

  @Get(['v1/orders', 'api/preview/orders'])
  list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<PreviewList<OrderListItem>> {
    this.identity.assertOrgAccess(user.uid, organizationId);
    return this.trendyol.listOrders(parsePageQuery({ page, pageSize }));
  }
}
