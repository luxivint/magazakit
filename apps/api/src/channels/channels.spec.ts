import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';
import { AmazonReadAdapter, BlockedChannelAdapter, ShopifyReadAdapter } from './adapters';
import { assertPublicHttps } from './http';
import { createChannelAdapters } from './registry';
import { MockTrendyolReadAdapter } from '../trendyol/mock-trendyol-read.adapter';

describe('channel adapters', () => {
  it('rejects private Woo/Shopify hosts', () => {
    expect(() => assertPublicHttps('https://127.0.0.1/wp-json', 'WooCommerce')).toThrow(HttpException);
    expect(() => assertPublicHttps('http://example.com', 'WooCommerce')).toThrow(HttpException);
    const url = assertPublicHttps('https://shop.example.com/admin', 'Shopify');
    expect(url.hostname).toBe('shop.example.com');
  });

  it('gates live adapters on Nest env; Pazarama/Ticimax/IdeaSoft stay blocked', () => {
    delete process.env.HEPSIBURADA_API_KEY;
    delete process.env.HEPSIBURADA_API_SECRET;
    delete process.env.N11_APP_KEY;
    delete process.env.N11_APP_SECRET;
    delete process.env.SHOPIFY_SHOP;
    delete process.env.SHOPIFY_ACCESS_TOKEN;
    delete process.env.WOOCOMMERCE_HOST;
    delete process.env.CICEKSEPETI_API_KEY;
    delete process.env.IKAS_ACCESS_TOKEN;
    delete process.env.IKAS_CLIENT_ID;
    delete process.env.IKAS_CLIENT_SECRET;
    delete process.env.AMAZON_LWA_CLIENT_ID;
    const map = createChannelAdapters(new MockTrendyolReadAdapter());
    expect(map.hepsiburada).toBeInstanceOf(BlockedChannelAdapter);
    expect(map.n11).toBeInstanceOf(BlockedChannelAdapter);
    expect(map.shopify).toBeInstanceOf(BlockedChannelAdapter);
    expect(map.woocommerce).toBeInstanceOf(BlockedChannelAdapter);
    expect(map.ciceksepeti).toBeInstanceOf(BlockedChannelAdapter);
    expect(map.ikas).toBeInstanceOf(BlockedChannelAdapter);
    expect(map.amazon).toBeInstanceOf(BlockedChannelAdapter);
    expect(map.pazarama).toBeInstanceOf(BlockedChannelAdapter);
    expect(map.ticimax).toBeInstanceOf(BlockedChannelAdapter);
    expect(map.ideasoft).toBeInstanceOf(BlockedChannelAdapter);
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
    const previous = {
      id: process.env.AMAZON_LWA_CLIENT_ID,
      secret: process.env.AMAZON_LWA_CLIENT_SECRET,
      refresh: process.env.AMAZON_REFRESH_TOKEN,
      seller: process.env.AMAZON_SELLER_ID,
    };
    process.env.AMAZON_LWA_CLIENT_ID = 'id';
    process.env.AMAZON_LWA_CLIENT_SECRET = 'secret';
    process.env.AMAZON_REFRESH_TOKEN = 'refresh';
    process.env.AMAZON_SELLER_ID = 'seller';
    const urls: string[] = [];
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      urls.push(url);
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
      const feed = await new AmazonReadAdapter().pullFeed();
      expect(feed.listings[0]).toMatchObject({ id: 'amz-SKU-1', marketplaceStock: 7 });
      expect(feed.orders).toHaveLength(2);
      expect(feed.orders[0]).toMatchObject({ status: 'shipped', totalTry: 99.9, totalCurrency: 'TRY' });
      expect(feed.orders[0].lines[0]).toMatchObject({ listingId: 'amz-SKU-1', qty: 2 });
      expect(feed.orders[1]).toMatchObject({ status: 'created', orderNumber: 'ORDER-2' });
      expect(urls.some((u) => u.includes('includedData=PROCEEDS%2CFULFILLMENT') || u.includes('includedData=PROCEEDS,FULFILLMENT'))).toBe(true);
      expect(urls.some((u) => u.includes('paginationToken=page-2'))).toBe(true);
    } finally {
      fetchMock.mockRestore();
      for (const [key, value] of Object.entries(previous)) {
        const envKey = {
          id: 'AMAZON_LWA_CLIENT_ID', secret: 'AMAZON_LWA_CLIENT_SECRET',
          refresh: 'AMAZON_REFRESH_TOKEN', seller: 'AMAZON_SELLER_ID',
        }[key] as string;
        if (value === undefined) delete process.env[envKey];
        else process.env[envKey] = value;
      }
    }
  });

  it('keeps Shopify products when orders GraphQL errors (missing read_orders)', async () => {
    const previousShop = process.env.SHOPIFY_SHOP;
    const previousToken = process.env.SHOPIFY_ACCESS_TOKEN;
    process.env.SHOPIFY_SHOP = 'owner-store.myshopify.com';
    process.env.SHOPIFY_ACCESS_TOKEN = 'token';
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
      const feed = await new ShopifyReadAdapter().pullFeed();
      expect(feed.listings).toHaveLength(1);
      expect(feed.listings[0].sku).toBe('SH-1');
      expect(feed.orders).toEqual([]);
    } finally {
      fetchMock.mockRestore();
      if (previousShop === undefined) delete process.env.SHOPIFY_SHOP;
      else process.env.SHOPIFY_SHOP = previousShop;
      if (previousToken === undefined) delete process.env.SHOPIFY_ACCESS_TOKEN;
      else process.env.SHOPIFY_ACCESS_TOKEN = previousToken;
    }
  });
});
