import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  parsePageQuery,
  type PreviewList,
  type ProductListItem,
} from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';
import {
  TRENDYOL_READ_ADAPTER,
  type TrendyolReadAdapter,
} from '../trendyol/trendyol-read.adapter';

@Controller()
export class ProductsController {
  constructor(
    @Inject(TRENDYOL_READ_ADAPTER)
    private readonly trendyol: TrendyolReadAdapter,
    private readonly identity: IdentityStore,
  ) {}

  @Get(['v1/products', 'api/preview/products'])
  async list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<PreviewList<ProductListItem>> {
    await this.identity.assertOrgAccess(user.uid, organizationId);
    return this.trendyol.listProducts(parsePageQuery({ page, pageSize }));
  }
}
