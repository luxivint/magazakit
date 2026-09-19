import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';
import { AmazonReadAdapter, BlockedChannelAdapter, ShopifyReadAdapter } from './adapters';
import { assertPublicHttps, channelFetchJson, isBlockedIp } from './http';
import { createChannelAdapters } from './registry';
import { MockTrendyolReadAdapter } from '../trendyol/mock-trendyol-read.adapter';

describe('channel adapters', () => {
  it('rejects private Woo/Shopify hosts', () => {
    expect(() => assertPublicHttps('https://127.0.0.1/wp-json', 'WooCommerce')).toThrow(HttpException);
    expect(() => assertPublicHttps('http://example.com', 'WooCommerce')).toThrow(HttpException);
    expect(() => assertPublicHttps('https://169.254.1.1/wp-json', 'WooCommerce')).toThrow(HttpException);
    expect(() => assertPublicHttps('https://[fd00::1]/admin', 'Shopify')).toThrow(HttpException);
    expect(isBlockedIp('100.64.0.1')).toBe(true);
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    const url = assertPublicHttps('https://shop.example.com/admin', 'Shopify');
    expect(url.hostname).toBe('shop.example.com');
  });

  it('refuses HTTP redirects onto loopback', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('shop.example.com')) {
        return new Response(null, {
          status: 302,
          headers: { location: 'https://127.0.0.1/steal' },
        });
      }
      return new Response('nope', { status: 200 });
    });
    try {
      await expect(
        channelFetchJson('https://shop.example.com/wp-json/wc/v3', {}, 'WooCommerce'),
      ).rejects.toBeInstanceOf(HttpException);
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('does not bind marketplace secrets from process env', () => {
    process.env.SHOPIFY_ACCESS_TOKEN = 'env-should-not-bind';
    const map = createChannelAdapters(new MockTrendyolReadAdapter());
    expect(map.hepsiburada).toBeInstanceOf(BlockedChannelAdapter);
    expect((map.hepsiburada as BlockedChannelAdapter).kind).toBe('needs_credentials');
    expect(map.pazarama).toBeInstanceOf(BlockedChannelAdapter);
    expect((map.pazarama as BlockedChannelAdapter).kind).toBe('blocked');
    delete process.env.SHOPIFY_ACCESS_TOKEN;
  });

  it('blocked probe is CHANNEL_UNAVAILABLE not an empty success', async () => {
    const adapter = new BlockedChannelAdapter('pazarama', 'Pazarama partner OpenAPI yok.');
    await expect(adapter.probe()).rejects.toBeInstanceOf(HttpException);
    try {
      await adapter.pullFeed();
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(((err as HttpException).getResponse() as { code: string }).code).toBe(
        ErrorCodes.CHANNEL_UNAVAILABLE,
      );
    }
  });

  it('maps the Amazon Orders 2026 schema and listing pagination fields', async () => {
    const urls: string[] = [];
    const dates: string[] = [];
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      urls.push(url);
      const headers = init?.headers as Record<string, string> | undefined;
      if (headers?.['x-amz-date']) dates.push(headers['x-amz-date']);
      if (url.includes('/auth/o2/token')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 });
      }
      if (url.includes('/listings/')) {
        return new Response(JSON.stringify({
          items: [{
            sku: 'SKU-1',
            summaries: [{ itemName: 'Ürün' }],
            offers: [{ price: { amount: '42.50', currencyCode: 'TRY' } }],
            fulfillmentAvailability: [{ quantity: 7 }],
          }],
          pagination: {},
        }), { status: 200 });
      }
      if (url.includes('paginationToken=')) {
        return new Response(JSON.stringify({
          orders: [{
            orderId: 'ORDER-2',
            createdTime: '2026-09-19T11:00:00Z',
            fulfillment: { fulfillmentStatus: 'UNSHIPPED' },
            proceeds: { grandTotal: { amount: '10.00', currencyCode: 'TRY' } },
            orderItems: [{ orderItemId: 'I2', quantityOrdered: 1, product: { sellerSku: 'SKU-1' } }],
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        orders: [{
          orderId: 'ORDER-1',
          createdTime: '2026-09-19T10:00:00Z',
          fulfillment: { fulfillmentStatus: 'SHIPPED' },
          proceeds: { grandTotal: { amount: '99.90', currencyCode: 'TRY' } },
          orderItems: [{ orderItemId: 'I1', quantityOrdered: 2, product: { sellerSku: 'SKU-1' } }],
        }],
        pagination: { nextToken: 'page-2' },
      }), { status: 200 });
    });
    try {
      const feed = await new AmazonReadAdapter({
        lwaClientId: 'id',
        lwaClientSecret: 'secret',
        refreshToken: 'refresh',
        sellerId: 'seller',
      }).pullFeed();
      expect(feed.listings[0]).toMatchObject({ id: 'amz-SKU-1', marketplaceStock: 7 });
      expect(feed.orders).toHaveLength(2);
      expect(feed.orders[0]).toMatchObject({ status: 'shipped', totalTry: 99.9, totalCurrency: 'TRY' });
      expect(feed.orders[0].lines[0]).toMatchObject({ listingId: 'amz-SKU-1', qty: 2 });
      expect(feed.orders[1]).toMatchObject({ status: 'created', orderNumber: 'ORDER-2' });
      expect(urls.some((u) => u.includes('includedData=PROCEEDS%2CFULFILLMENT') || u.includes('includedData=PROCEEDS,FULFILLMENT'))).toBe(true);
      expect(urls.some((u) => u.includes('paginationToken=page-2'))).toBe(true);
      expect(dates.length).toBeGreaterThan(0);
      expect(dates.every((d) => /^\d{8}T\d{6}Z$/.test(d))).toBe(true);
    } finally {
      fetchMock.mockRestore();
    }
  });
  it('keeps Shopify products when orders GraphQL errors (missing read_orders)', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (_input, init) => {
      const body = String(init?.body ?? '');
      if (body.includes('productVariants')) {
        return new Response(JSON.stringify({
          data: {
            productVariants: {
              edges: [{ node: { id: 'gid://shopify/ProductVariant/1', sku: 'SH-1', inventoryQuantity: 3, price: '10.00', product: { title: 'Tee' } } }],
              pageInfo: { hasNextPage: false },
            },
          },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        errors: [{ message: 'Access denied for orders field.' }],
      }), { status: 200 });
    });
    try {
      const feed = await new ShopifyReadAdapter({
        shop: 'owner-store.myshopify.com',
        accessToken: 'token',
      }).pullFeed();
      expect(feed.listings).toHaveLength(1);
      expect(feed.listings[0].sku).toBe('SH-1');
      expect(feed.orders).toEqual([]);
      expect(feed.warnings).toEqual([
        expect.objectContaining({ scope: 'orders' }),
      ]);
    } finally {
      fetchMock.mockRestore();
    }
  });
});
