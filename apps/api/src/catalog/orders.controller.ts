import { Controller, Get, Query } from '@nestjs/common';
import { type OrderListItem, type PreviewList } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller()
export class OrdersController {
  constructor(private readonly identity: IdentityStore) {}

  @Get(['v1/orders', 'api/preview/orders'])
  list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<PreviewList<OrderListItem>> {
    return this.identity.listOrders(user.uid, organizationId, page, pageSize);
  }
}
