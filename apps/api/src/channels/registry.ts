import { trendyolMode } from '../config/trendyol-env';
import type { Channel } from '@magazakit/contracts';
import type { TrendyolReadAdapter } from '../trendyol/trendyol-read.adapter';
import { BlockedChannelAdapter } from './adapters';
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
  hepsiburada: 'Mağaza bağla: merchantId + API key/secret. User-Agent yalın Magazam. Yazma kapalı.',
  n11: 'Mağaza bağla: appKey/appSecret. product-query + shipmentPackages.',
  shopify: 'Mağaza bağla: mağaza alanı + Admin access token (GraphQL 2026-07).',
  woocommerce: 'Mağaza bağla: HTTPS host + consumer key/secret (Basic Auth).',
  ciceksepeti: 'Mağaza bağla: API key. GET /Products + POST /Order/GetOrders.',
  ikas: 'Mağaza bağla: client_id/client_secret. Token sunucuda yenilenir.',
  amazon: 'Mağaza bağla: LWA client/secret/refresh. SP-API EU searchOrders 2026-01-01.',
  pazarama: 'Pazarama partner OpenAPI yok (isortagimapi.pazarama.com/docs 404). Path uydurulmadı; bağlı sayılmaz.',
  ticimax: 'Ticimax resmi SOAP/WSDL (UrunServis/SiparisServis). REST yok; SOAP bu dilimde yok.',
  ideasoft: 'IdeaSoft Admin OAuth (apidoc.ideasoft.dev) var; ürün/sipariş şeması doğrulanmadan path yok.',
};

const HARD_BLOCK: Exclude<Channel, 'trendyol'>[] = ['pazarama', 'ticimax', 'ideasoft'];

export function createChannelAdapters(trendyol: TrendyolReadAdapter): ChannelAdapterMap {
  return {
    trendyol: new TrendyolBridge(trendyol),
    hepsiburada: new BlockedChannelAdapter('hepsiburada', BLOCKED.hepsiburada, 'needs_credentials'),
    n11: new BlockedChannelAdapter('n11', BLOCKED.n11, 'needs_credentials'),
    shopify: new BlockedChannelAdapter('shopify', BLOCKED.shopify, 'needs_credentials'),
    woocommerce: new BlockedChannelAdapter('woocommerce', BLOCKED.woocommerce, 'needs_credentials'),
    ciceksepeti: new BlockedChannelAdapter('ciceksepeti', BLOCKED.ciceksepeti, 'needs_credentials'),
    ikas: new BlockedChannelAdapter('ikas', BLOCKED.ikas, 'needs_credentials'),
    amazon: new BlockedChannelAdapter('amazon', BLOCKED.amazon, 'needs_credentials'),
    pazarama: new BlockedChannelAdapter('pazarama', BLOCKED.pazarama),
    ticimax: new BlockedChannelAdapter('ticimax', BLOCKED.ticimax),
    ideasoft: new BlockedChannelAdapter('ideasoft', BLOCKED.ideasoft),
  };
}

export function channelMode(adapters: ChannelAdapterMap, channel: Channel): ChannelMode {
  if (channel === 'trendyol') {
    return trendyolMode();
  }
  const adapter = adapters[channel];
  if (adapter instanceof BlockedChannelAdapter) {
    return adapter.kind === 'needs_credentials' ? 'unconfigured' : 'blocked';
  }
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
          : mode === 'unconfigured'
            ? `${LABELS[channel]} anahtarı mağaza kaydına yazılır; .env ve telefonda tutulmaz.`
            : mode === 'mock'
              ? `${LABELS[channel]} mock okuma.`
              : `${LABELS[channel]} salt okuma. Yazma kapalı.`,
    };
  });
}

export function shopRecordId(orgId: string, channel: Channel): string {
  return channel === 'trendyol' ? `shop_ty_${orgId}` : `shop_${channel}_${orgId}`;
}

export { LABELS as CHANNEL_LABELS, HARD_BLOCK, BLOCKED };
