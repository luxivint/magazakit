import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes, type Channel, type ShopConnectRequest } from '@magazakit/contracts';
import type { TrendyolLiveConfig } from '../config/trendyol-env';
import {
  AmazonReadAdapter,
  BlockedChannelAdapter,
  CiceksepetiReadAdapter,
  HepsiburadaReadAdapter,
  IkasReadAdapter,
  N11ReadAdapter,
  ShopifyReadAdapter,
  WooCommerceReadAdapter,
} from './adapters';
import type { ChannelReadAdapter } from './types';
import { LiveTrendyolReadAdapter } from '../trendyol/live-trendyol-read.adapter';

export type ChannelSecrets = {
  channel: Channel;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  shopDomain: string;
  accessToken: string;
  host: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sandbox: boolean;
};

function pick(...values: Array<string | undefined>): string {
  for (const value of values) {
    const t = value?.trim();
    if (t) return t;
  }
  return '';
}

function missing(message: string): never {
  throw new HttpException({ code: ErrorCodes.VALIDATION, message }, HttpStatus.BAD_REQUEST);
}

export function parseShopConnect(channel: Channel, body: ShopConnectRequest | undefined): ChannelSecrets {
  const b = body ?? {};
  const secrets: ChannelSecrets = {
    channel,
    sellerId: pick(b.sellerId, b.merchantId),
    apiKey: pick(b.apiKey, b.appKey, b.consumerKey),
    apiSecret: pick(b.apiSecret, b.appSecret, b.consumerSecret),
    shopDomain: pick(b.shopDomain, b.host, b.sellerId),
    accessToken: pick(b.accessToken, b.apiKey),
    host: pick(b.host, b.shopDomain),
    clientId: pick(b.clientId, b.apiKey),
    clientSecret: pick(b.clientSecret, b.apiSecret),
    refreshToken: pick(b.refreshToken),
    sandbox: b.sandbox === true,
  };
  if (channel === 'trendyol') {
    if (!secrets.sellerId || !secrets.apiKey || !secrets.apiSecret) {
      missing('Trendyol satıcı ID, API key ve secret gerekli.');
    }
    return secrets;
  }
  if (channel === 'hepsiburada') {
    if (!secrets.sellerId || !secrets.apiKey || !secrets.apiSecret) {
      missing('Hepsiburada merchantId, API key ve secret gerekli.');
    }
    return secrets;
  }
  if (channel === 'n11') {
    if (!secrets.apiKey || !secrets.apiSecret) missing('n11 appKey ve appSecret gerekli.');
    return secrets;
  }
  if (channel === 'shopify') {
    secrets.shopDomain = pick(b.shopDomain, b.host, b.sellerId);
    secrets.accessToken = pick(b.accessToken, b.apiKey);
    if (!secrets.shopDomain || !secrets.accessToken) missing('Shopify mağaza alanı ve access token gerekli.');
    return secrets;
  }
  if (channel === 'woocommerce') {
    secrets.host = pick(b.host, b.shopDomain);
    secrets.apiKey = pick(b.consumerKey, b.apiKey);
    secrets.apiSecret = pick(b.consumerSecret, b.apiSecret);
    if (!secrets.host || !secrets.apiKey || !secrets.apiSecret) {
      missing('WooCommerce host, consumer key ve secret gerekli.');
    }
    return secrets;
  }
  if (channel === 'ciceksepeti') {
    secrets.apiKey = pick(b.apiKey);
    if (!secrets.apiKey) missing('Çiçeksepeti API key gerekli.');
    return secrets;
  }
  if (channel === 'ikas') {
    secrets.clientId = pick(b.clientId);
    secrets.clientSecret = pick(b.clientSecret);
    secrets.accessToken = pick(b.accessToken);
    if (!(secrets.clientId && secrets.clientSecret) && !secrets.accessToken) {
      missing('ikas client_id/client_secret veya access token gerekli.');
    }
    return secrets;
  }
  if (channel === 'amazon') {
    secrets.clientId = pick(b.clientId, b.apiKey);
    secrets.clientSecret = pick(b.clientSecret, b.apiSecret);
    if (!secrets.clientId || !secrets.clientSecret || !secrets.refreshToken) {
      missing('Amazon LWA client id, secret ve refresh token gerekli.');
    }
    return secrets;
  }
  throw new HttpException(
    { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'Bu kanal bağlanamaz.' },
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}

export function trendyolLiveFromSecrets(secrets: ChannelSecrets): TrendyolLiveConfig {
  return {
    baseUrl: 'https://apigw.trendyol.com',
    sellerId: secrets.sellerId,
    apiKey: secrets.apiKey,
    apiSecret: secrets.apiSecret,
    userAgent: `${secrets.sellerId} - SelfIntegration`,
  };
}

export function liveAdapterFromSecrets(secrets: ChannelSecrets): ChannelReadAdapter {
  switch (secrets.channel) {
    case 'trendyol':
      return new LiveTrendyolReadAdapter(trendyolLiveFromSecrets(secrets));
    case 'hepsiburada':
      return new HepsiburadaReadAdapter({
        id: secrets.sellerId,
        key: secrets.apiKey,
        secret: secrets.apiSecret,
        sit: secrets.sandbox,
      });
    case 'n11':
      return new N11ReadAdapter({ key: secrets.apiKey, secret: secrets.apiSecret });
    case 'shopify':
      return new ShopifyReadAdapter({ shop: secrets.shopDomain, accessToken: secrets.accessToken });
    case 'woocommerce':
      return new WooCommerceReadAdapter({
        host: secrets.host,
        consumerKey: secrets.apiKey,
        consumerSecret: secrets.apiSecret,
      });
    case 'ciceksepeti':
      return new CiceksepetiReadAdapter({
        apiKey: secrets.apiKey,
        sandbox: secrets.sandbox,
        sellerId: secrets.sellerId,
      });
    case 'ikas':
      return new IkasReadAdapter({
        clientId: secrets.clientId,
        clientSecret: secrets.clientSecret,
        accessToken: secrets.accessToken,
      });
    case 'amazon':
      return new AmazonReadAdapter({
        lwaClientId: secrets.clientId,
        lwaClientSecret: secrets.clientSecret,
        refreshToken: secrets.refreshToken,
        sellerId: secrets.sellerId,
      });
    default:
      return new BlockedChannelAdapter(secrets.channel, 'Bu kanal bağlanamaz.');
  }
}
