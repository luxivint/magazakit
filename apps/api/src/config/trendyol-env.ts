export type TrendyolMode = 'mock' | 'live' | 'unconfigured';

export type TrendyolLiveConfig = {
  baseUrl: string;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  userAgent: string;
};

/** Catalog/health: mock demo vs “connect with shop keys”. Never reads marketplace env secrets. */
export function trendyolMode(): TrendyolMode {
  const useMock = (process.env.TRENDYOL_USE_MOCK ?? 'true').toLowerCase() !== 'false';
  return useMock ? 'mock' : 'unconfigured';
}

export const K01_NOTE =
  'Trendyol test mağazası kimliği yok (K01). F0 in-memory mock kullanır; gerçek anahtar yazılmaz.';

export const LIVE_READ_NOTE =
  'Canlı Trendyol V2 salt okuma: onaylı ürün + v2/orders. Stok/fiyat yazımı, etiket ve iade kapalı. Anahtar mağaza kaydında şifreli.';
