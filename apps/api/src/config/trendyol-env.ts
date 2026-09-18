export type TrendyolMode = 'mock' | 'unconfigured';

export function trendyolMode(): TrendyolMode {
  const useMock = (process.env.TRENDYOL_USE_MOCK ?? 'true').toLowerCase() !== 'false';
  if (useMock) {
    return 'mock';
  }
  return 'unconfigured';
}

export const K01_NOTE =
  'Trendyol test mağazası kimliği yok (K01). F0 in-memory mock kullanır; gerçek anahtar yazılmaz.';
