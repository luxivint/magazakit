export type TrendyolMode = 'mock' | 'live' | 'unconfigured';

export type TrendyolLiveConfig = {
  baseUrl: string;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  userAgent: string;
};

const PROD_HOST = 'https://apigw.trendyol.com';
const STAGE_HOST = 'https://stageapigw.trendyol.com';

export function readTrendyolLiveConfig(): TrendyolLiveConfig | null {
  const sellerId = process.env.TRENDYOL_SELLER_ID?.trim() ?? '';
  const apiKey = process.env.TRENDYOL_API_KEY?.trim() ?? '';
  const apiSecret = process.env.TRENDYOL_API_SECRET?.trim() ?? '';
  if (!sellerId || !apiKey || !apiSecret) {
    return null;
  }
  const stage = (process.env.TRENDYOL_ENV ?? 'prod').toLowerCase() === 'stage';
  const fromEnv = process.env.TRENDYOL_BASE_URL?.trim();
  const baseUrl = (fromEnv && fromEnv.length > 0 ? fromEnv : stage ? STAGE_HOST : PROD_HOST).replace(
    /\/$/,
    '',
  );
  const integrator = process.env.TRENDYOL_INTEGRATOR_NAME?.trim() || 'SelfIntegration';
  return {
    baseUrl,
    sellerId,
    apiKey,
    apiSecret,
    userAgent: `${sellerId} - ${integrator}`,
  };
}

export function trendyolMode(): TrendyolMode {
  const useMock = (process.env.TRENDYOL_USE_MOCK ?? 'true').toLowerCase() !== 'false';
  if (useMock) {
    return 'mock';
  }
  if (readTrendyolLiveConfig()) {
    return 'live';
  }
  return 'unconfigured';
}

export const K01_NOTE =
  'Trendyol test mağazası kimliği yok (K01). F0 in-memory mock kullanır; gerçek anahtar yazılmaz.';

export const LIVE_READ_NOTE =
  'Canlı Trendyol V2 salt okuma: onaylı ürün + v2/orders. Stok/fiyat yazımı, etiket ve iade kapalı.';
