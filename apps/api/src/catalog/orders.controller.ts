import { Controller, Get, Inject, Query } from '@nestjs/common';
import { parsePageQuery, type OrderListItem, type PreviewList } from '@magazakit/contracts';
import {
  TRENDYOL_READ_ADAPTER,
  type TrendyolReadAdapter,
} from '../trendyol/trendyol-read.adapter';

@Controller()
export class OrdersController {
  constructor(
    @Inject(TRENDYOL_READ_ADAPTER)
    private readonly trendyol: TrendyolReadAdapter,
  ) {}

  @Get(['v1/orders', 'api/preview/orders'])
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PreviewList<OrderListItem>> {
    return this.trendyol.listOrders(parsePageQuery({ page, pageSize }));
  }
}
