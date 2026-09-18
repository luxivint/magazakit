import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';
import { BlockedChannelAdapter } from './adapters';
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
});
