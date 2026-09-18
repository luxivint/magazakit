import {
  asPreviewList,
  paginate,
  type OrderListItem,
  type PageQuery,
  type PreviewList,
  type ProductListItem,
} from '@magazakit/contracts';
import type { TrendyolLiveConfig } from '../config/trendyol-env';
import type { MockListingSeed } from './mock-feed';
import type { TrendyolReadAdapter } from './trendyol-read.adapter';
import { trendyolGetJson } from './trendyol-http';
import {
  mapApprovedProducts,
  mapShipmentPackages,
  trendyolPageMeta,
} from './trendyol-parse';

type GetJson = typeof trendyolGetJson;

const PRODUCT_SIZE = 100;
const ORDER_SIZE = 50;
const MAX_OFFSET = 10_000;

export class LiveTrendyolReadAdapter implements TrendyolReadAdapter {
  readonly mock = false;

  constructor(
    private readonly config: TrendyolLiveConfig,
    private readonly getJson: GetJson = trendyolGetJson,
  ) {}

  async probe(): Promise<void> {
    await this.getJson(this.config, this.productsPath(), { page: 0, size: 1 });
  }

  async pullFeed() {
    const listings = await this.collectProducts();
    const orders = await this.collectOrders();
    return { listings, orders, returns: [] };
  }

  async listProducts(query: PageQuery): Promise<PreviewList<ProductListItem>> {
    const listings = await this.collectProducts();
    const items: ProductListItem[] = listings.map((p) => ({
      ...p,
      listingId: p.id,
      organizationId: '',
      mapped: false,
      stockSource: 'none',
    }));
    return asPreviewList(paginate(items, query), false);
  }

  async listOrders(query: PageQuery): Promise<PreviewList<OrderListItem>> {
    const orders = await this.collectOrders();
    const items: OrderListItem[] = orders.map((o) => ({
      ...o,
      organizationId: '',
    }));
    return asPreviewList(paginate(items, query), false);
  }

  private productsPath(): string {
    return `/integration/product/sellers/${this.config.sellerId}/products/approved`;
  }

  private ordersPath(): string {
    return `/integration/order/sellers/${this.config.sellerId}/v2/orders`;
  }

  private async collectProducts(): Promise<MockListingSeed[]> {
    const all: MockListingSeed[] = [];
    let page = 0;
    let nextPageToken: string | undefined;
    for (let requestCount = 0; requestCount < 10_000; requestCount += 1) {
      const payload = await this.getJson(this.config, this.productsPath(), {
        page: nextPageToken ? undefined : page,
        size: PRODUCT_SIZE,
        nextPageToken,
      });
      const batch = mapApprovedProducts(payload);
      all.push(...batch);
      const meta = trendyolPageMeta(payload);
      if (batch.length === 0) break;
      if (meta.nextPageToken) {
        nextPageToken = meta.nextPageToken;
        continue;
      }
      if (batch.length < PRODUCT_SIZE) break;
      if (nextPageToken) break;
      page += 1;
      if (page * PRODUCT_SIZE >= MAX_OFFSET) break;
    }
    return all;
  }

  private async collectOrders(): Promise<
    Omit<OrderListItem, 'organizationId'>[]
  > {
    const all: Omit<OrderListItem, 'organizationId'>[] = [];
    let page = 0;
    while (page * ORDER_SIZE < MAX_OFFSET) {
      const endDate = Date.now();
      const payload = await this.getJson(this.config, this.ordersPath(), {
        page,
        size: ORDER_SIZE,
        startDate: endDate - 7 * 24 * 60 * 60 * 1000,
        endDate,
        orderByField: 'PackageLastModifiedDate',
        orderByDirection: 'DESC',
      });
      const batch = mapShipmentPackages(payload);
      all.push(...batch);
      if (batch.length === 0 || batch.length < ORDER_SIZE) break;
      page += 1;
    }
    return all;
  }
}
