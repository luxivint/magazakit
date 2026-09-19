import type { OrderListItem, PageQuery, PreviewList, ProductListItem, ReturnListItem } from '@magazakit/contracts';
import type { MockListingSeed } from './mock-feed';

export const TRENDYOL_READ_ADAPTER = Symbol('TRENDYOL_READ_ADAPTER');

export interface TrendyolReadAdapter {
  readonly mock: boolean;
  /** Live: GET approved products page 0. Mock: no-op. */
  probe?(): Promise<void>;
  pullFeed(): Promise<{
    listings: MockListingSeed[];
    orders: Omit<OrderListItem, 'organizationId'>[];
    returns: Omit<ReturnListItem, 'organizationId'>[];
    warnings?: { scope: 'products' | 'orders'; message: string }[];
  }>;
  listProducts(query: PageQuery): Promise<PreviewList<ProductListItem>>;
  listOrders(query: PageQuery): Promise<PreviewList<OrderListItem>>;
}
