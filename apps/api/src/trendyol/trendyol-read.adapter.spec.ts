import { parsePageQuery, paginate } from '@magazakit/contracts';
import { MockTrendyolReadAdapter } from './mock-trendyol-read.adapter';
import { UnconfiguredTrendyolReadAdapter } from './unconfigured-trendyol-read.adapter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('Trendyol read adapters', () => {
  it('mock returns a product and order page', async () => {
    const adapter = new MockTrendyolReadAdapter();
    const products = await adapter.listProducts(parsePageQuery({ page: 1, pageSize: 20 }));
    const orders = await adapter.listOrders(parsePageQuery({ pageSize: 2 }));
    expect(adapter.mock).toBe(true);
    expect(products.mock).toBe(true);
    expect(products.items.length).toBeGreaterThan(0);
    expect(orders.items).toHaveLength(2);
    expect(orders.total).toBeGreaterThanOrEqual(2);
  });

  it('unconfigured throws K01 without reading secrets', async () => {
    const adapter = new UnconfiguredTrendyolReadAdapter();
    await expect(adapter.listProducts(parsePageQuery({}))).rejects.toBeInstanceOf(
      HttpException,
    );
    try {
      await adapter.listOrders(parsePageQuery({}));
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    }
  });

  it('paginate slices', () => {
    expect(paginate([1, 2, 3], { page: 2, pageSize: 1 })).toEqual({
      items: [2],
      page: 2,
      pageSize: 1,
      total: 3,
    });
  });
});
