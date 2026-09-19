import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { type PreviewList, type ProductListItem } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

type ProductBody = {
  title?: string;
  sku?: string;
  barcode?: string;
  priceTry?: number;
  weightKg?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  lengthCm?: number | null;
};

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

  @Post('v1/products')
  create(@CurrentUser() user: AuthUser, @Body() body: ProductBody): Promise<ProductListItem> {
    return this.identity.createProduct(user.uid, body ?? {});
  }

  @Get('v1/products/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') productId: string): Promise<ProductListItem> {
    return this.identity.getProduct(user.uid, productId);
  }

  @Patch('v1/products/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') productId: string,
    @Body() body: ProductBody,
  ): Promise<ProductListItem> {
    return this.identity.updateProduct(user.uid, productId, body ?? {});
  }
}
