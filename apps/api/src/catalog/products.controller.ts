import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  parsePageQuery,
  type PreviewList,
  type ProductListItem,
} from '@magazakit/contracts';
import {
  TRENDYOL_READ_ADAPTER,
  type TrendyolReadAdapter,
} from '../trendyol/trendyol-read.adapter';

@Controller()
export class ProductsController {
  constructor(
    @Inject(TRENDYOL_READ_ADAPTER)
    private readonly trendyol: TrendyolReadAdapter,
  ) {}

  @Get(['v1/products', 'api/preview/products'])
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PreviewList<ProductListItem>> {
    return this.trendyol.listProducts(parsePageQuery({ page, pageSize }));
  }
}
