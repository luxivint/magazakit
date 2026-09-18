import { Controller, Get, Query } from '@nestjs/common';
import { type PreviewList, type ProductListItem } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller()
export class ProductsController {
  constructor(private readonly identity: IdentityStore) {}

  @Get(['v1/products', 'api/preview/products'])
  list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<PreviewList<ProductListItem>> {
    return this.identity.listProducts(user.uid, organizationId, page, pageSize);
  }
}
