import { trendyolMode } from '../config/trendyol-env';
import type { Channel } from '@magazakit/contracts';
import type { TrendyolReadAdapter } from '../trendyol/trendyol-read.adapter';
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
import { envTriple } from './map';
import type { ChannelAdapterMap, ChannelCatalogRow, ChannelMode, ChannelReadAdapter } from './types';
import { SHOP_CHANNELS } from './types';

class TrendyolBridge implements ChannelReadAdapter {
  readonly channel = 'trendyol' as const;
  constructor(private readonly inner: TrendyolReadAdapter) {}
  get mock() {
    return this.inner.mock;
  }
  probe() {
    return this.inner.probe?.() ?? Promise.resolve();
  }
  pullFeed() {
    return this.inner.pullFeed();
  }
  listProducts(query: Parameters<ChannelReadAdapter['listProducts']>[0]) {
    return this.inner.listProducts(query);
  }
  listOrders(query: Parameters<ChannelReadAdapter['listOrders']>[0]) {
    return this.inner.listOrders(query);
  }
}

const BLOCKED: Record<Exclude<Channel, 'trendyol'>, string> = {
  hepsiburada: 'Hepsiburada merchantId + Basic key/secret (listing-external + oms-external) Nest .env’de yok. User-Agent yalın integrator adı.',
  n11: 'n11 appKey/appSecret yok. developer.n11.com REST: product-query + shipmentPackages.',
  shopify: 'SHOPIFY_SHOP + SHOPIFY_ACCESS_TOKEN yok. Admin GraphQL.',
  woocommerce: 'WOOCOMMERCE_HOST + consumer key/secret yok.',
  ciceksepeti: 'CICEKSEPETI_API_KEY yok. GET /Products + POST /Order/GetOrders.',
  ikas: 'IKAS_CLIENT_ID/IKAS_CLIENT_SECRET yok. V2 GraphQL listProduct.',
  amazon: 'Amazon LWA client/secret/refresh yok. SP-API EU searchOrders 2026-01-01, marketplace A33AVAJ2PDY3EV.',
  pazarama: 'Pazarama partner OpenAPI yok (isortagimapi.pazarama.com/docs 404). Path uydurulmadı; bağlı sayılmaz.',
  ticimax: 'Ticimax resmi SOAP/WSDL (UrunServis/SiparisServis). REST yok; SOAP bu dilimde yok.',
  ideasoft: 'IdeaSoft Admin OAuth (apidoc.ideasoft.dev) var; ürün/sipariş şeması doğrulanmadan path yok.',
};

export function createChannelAdapters(trendyol: TrendyolReadAdapter): ChannelAdapterMap {
  const hb = envTriple('HEPSIBURADA');
  const n11 = envTriple('N11');
  return {
    trendyol: new TrendyolBridge(trendyol),
    hepsiburada: hb?.id ? new HepsiburadaReadAdapter(hb) : new BlockedChannelAdapter('hepsiburada', BLOCKED.hepsiburada),
    n11: n11 ? new N11ReadAdapter(n11) : new BlockedChannelAdapter('n11', BLOCKED.n11),
    shopify:
      process.env.SHOPIFY_SHOP?.trim() && process.env.SHOPIFY_ACCESS_TOKEN?.trim()
        ? new ShopifyReadAdapter()
        : new BlockedChannelAdapter('shopify', BLOCKED.shopify),
    woocommerce:
      process.env.WOOCOMMERCE_HOST?.trim() &&
      process.env.WOOCOMMERCE_CONSUMER_KEY?.trim() &&
      process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim()
        ? new WooCommerceReadAdapter()
        : new BlockedChannelAdapter('woocommerce', BLOCKED.woocommerce),
    ciceksepeti: process.env.CICEKSEPETI_API_KEY?.trim()
      ? new CiceksepetiReadAdapter()
      : new BlockedChannelAdapter('ciceksepeti', BLOCKED.ciceksepeti),
    ikas:
      (process.env.IKAS_CLIENT_ID?.trim() && process.env.IKAS_CLIENT_SECRET?.trim()) ||
      process.env.IKAS_ACCESS_TOKEN?.trim()
      ? new IkasReadAdapter()
      : new BlockedChannelAdapter('ikas', BLOCKED.ikas),
    amazon:
      process.env.AMAZON_LWA_CLIENT_ID?.trim() &&
      process.env.AMAZON_LWA_CLIENT_SECRET?.trim() &&
      process.env.AMAZON_REFRESH_TOKEN?.trim()
        ? new AmazonReadAdapter()
        : new BlockedChannelAdapter('amazon', BLOCKED.amazon),
    pazarama: new BlockedChannelAdapter('pazarama', BLOCKED.pazarama),
    ticimax: new BlockedChannelAdapter('ticimax', BLOCKED.ticimax),
    ideasoft: new BlockedChannelAdapter('ideasoft', BLOCKED.ideasoft),
  };
}

export function channelMode(adapters: ChannelAdapterMap, channel: Channel): ChannelMode {
  if (channel === 'trendyol') {
    return trendyolMode();
  }
  if (adapters[channel] instanceof BlockedChannelAdapter) return 'blocked';
  return 'live';
}

const LABELS: Record<Channel, string> = {
  trendyol: 'Trendyol',
  hepsiburada: 'Hepsiburada',
  n11: 'n11',
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  ciceksepeti: 'Çiçeksepeti',
  ikas: 'ikas',
  amazon: 'Amazon TR',
  pazarama: 'Pazarama',
  ticimax: 'Ticimax',
  ideasoft: 'IdeaSoft',
};

export function channelCatalog(adapters: ChannelAdapterMap): ChannelCatalogRow[] {
  return SHOP_CHANNELS.map((channel) => {
    const mode = channelMode(adapters, channel);
    const blockedNote = channel === 'trendyol' ? undefined : BLOCKED[channel];
    return {
      channel,
      label: LABELS[channel],
      mode,
      read: mode === 'live' ? 'live' : mode === 'mock' ? 'mock' : 'blocked',
      write: false as const,
      note:
        mode === 'blocked' && blockedNote
          ? blockedNote
          : mode === 'live'
            ? `${LABELS[channel]} salt okuma. Yazma kapalı.`
            : mode === 'mock'
              ? `${LABELS[channel]} mock okuma.`
              : `${LABELS[channel]} Nest .env anahtarı yok.`,
    };
  });
}

export function shopRecordId(orgId: string, channel: Channel): string {
  return channel === 'trendyol' ? `shop_ty_${orgId}` : `shop_${channel}_${orgId}`;
}

export { LABELS as CHANNEL_LABELS };
