import type { OrderListItem, PageQuery, PreviewList, ProductListItem } from '@magazakit/contracts';

export const TRENDYOL_READ_ADAPTER = Symbol('TRENDYOL_READ_ADAPTER');

export interface TrendyolReadAdapter {
  readonly mock: boolean;
  listProducts(query: PageQuery): Promise<PreviewList<ProductListItem>>;
  listOrders(query: PageQuery): Promise<PreviewList<OrderListItem>>;
}
