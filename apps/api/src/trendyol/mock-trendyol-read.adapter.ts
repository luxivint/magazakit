import { asPreviewList, paginate, type OrderListItem, type PageQuery, type PreviewList, type ProductListItem } from '@magazakit/contracts';
import { mockTrendyolFeed } from './mock-feed';
import type { TrendyolReadAdapter } from './trendyol-read.adapter';

export class MockTrendyolReadAdapter implements TrendyolReadAdapter {
  readonly mock = true;

  async probe(): Promise<void> {
    /* fixture; no network */
  }

  async pullFeed() {
    return mockTrendyolFeed();
  }

  async listProducts(query: PageQuery): Promise<PreviewList<ProductListItem>> {
    const { listings } = mockTrendyolFeed();
    const items: ProductListItem[] = listings.map((p) => ({
      ...p,
      listingId: p.id,
      organizationId: '',
      mapped: false,
      stockSource: 'none',
    }));
    return asPreviewList(paginate(items, query), true);
  }

  async listOrders(query: PageQuery): Promise<PreviewList<OrderListItem>> {
    const { orders } = mockTrendyolFeed();
    const items: OrderListItem[] = orders.map((o) => ({ ...o, organizationId: '' }));
    return asPreviewList(paginate(items, query), true);
  }
}
