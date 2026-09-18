import { LiveTrendyolReadAdapter } from './live-trendyol-read.adapter';
import type { TrendyolLiveConfig } from '../config/trendyol-env';
import type { TrendyolQuery } from './trendyol-http';

const cfg: TrendyolLiveConfig = {
  baseUrl: 'https://apigw.trendyol.com',
  sellerId: '999',
  apiKey: 'key',
  apiSecret: 'secret',
  userAgent: '999 - SelfIntegration',
};

describe('LiveTrendyolReadAdapter', () => {
  it('pulls approved products and v2 orders via injected GET', async () => {
    const calls: string[] = [];
    const getJson = async (_c: TrendyolLiveConfig, path: string) => {
      calls.push(path);
      if (path.includes('/products/approved')) {
        return {
          content: [
            {
              title: 'Tee',
              variants: [
                {
                  barcode: 'B1',
                  stockCode: 'SKU1',
                  onSale: true,
                  stock: { quantity: 9 },
                  price: { salePrice: 10 },
                },
              ],
            },
          ],
        };
      }
      return {
        content: [
          {
            shipmentPackageId: 1,
            orderNumber: 'TY-1',
            customerFirstName: 'A',
            customerLastName: 'B',
            status: 'Picking',
            packageTotalPrice: 10,
            orderDate: Date.now(),
            lines: [{ barcode: 'B1', quantity: 1 }],
          },
        ],
      };
    };
    const adapter = new LiveTrendyolReadAdapter(cfg, getJson);
    expect(adapter.mock).toBe(false);
    const feed = await adapter.pullFeed();
    expect(feed.listings).toHaveLength(1);
    expect(feed.orders).toHaveLength(1);
    expect(feed.returns).toEqual([]);
    expect(calls[0]).toContain('/products/approved');
    expect(calls[1]).toContain('/v2/orders');
    expect(calls.join(' ')).not.toContain('secret');
  });

  it('continues approved-product pagination with nextPageToken after 10,000 contents', async () => {
    let tokenUsed = false;
    const getJson = async (_c: TrendyolLiveConfig, path: string, query: TrendyolQuery = {}) => {
      if (!path.includes('/products/approved')) return { content: [] };
      if (query.nextPageToken) {
        tokenUsed = true;
        return {
          content: [{ title: 'Last', variants: [{ barcode: 'AFTER-10000', onSale: true }] }],
        };
      }
      const page = Number(query.page ?? 0);
      return {
        content: Array.from({ length: 100 }, (_, index) => ({
          title: `P${page}-${index}`,
          variants: [{ barcode: `B-${page}-${index}`, onSale: true }],
        })),
        nextPageToken: page === 99 ? 'next-10000' : undefined,
      };
    };
    const adapter = new LiveTrendyolReadAdapter(cfg, getJson);
    const result = await adapter.listProducts({ page: 1, pageSize: 1 });
    expect(tokenUsed).toBe(true);
    expect(result.total).toBe(10_001);
  });
});
