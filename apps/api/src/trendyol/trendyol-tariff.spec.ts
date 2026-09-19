import {
  billedDesi,
  emptyTrendyolTariff,
  estimateCargoTry,
  estimatePhbTry,
  normalizeTariff,
  tariffVersionLabel,
  volumetricDesi,
} from './trendyol-tariff';

describe('trendyol-tariff', () => {
  it('seeds official Aras Tablo 1 48.33+KDV as 57.99 for desi 1 / 115 TL', () => {
    const tariff = emptyTrendyolTariff();
    expect(estimateCargoTry({ customerTry: 115, cargoDeci: 1, cargoProvider: 'Aras' }, tariff)).toBe(57.99);
    expect(estimatePhbTry(tariff)).toBe(13.19);
    expect(estimatePhbTry(tariff, true)).toBe(5.99);
    expect(tariffVersionLabel(tariff)).toBe('tahmini (tarife v1)');
    expect(tariff.cargoRuleUrl).toContain('kargo-baremi');
    expect(tariff.desiPdfUrl).toContain('trendyol_guncel_kargo_fiyatlari.pdf');
  });

  it('uses desi list when order is ≥350 TL', () => {
    const tariff = emptyTrendyolTariff();
    expect(estimateCargoTry({ customerTry: 400, cargoDeci: 1, cargoProvider: 'Aras' }, tariff)).toBe(106.75);
  });

  it('computes volumetric vs billed desi', () => {
    expect(volumetricDesi(30, 20, 10)).toBe(2);
    expect(billedDesi({ weightKg: 0.4, widthCm: 30, heightCm: 20, lengthCm: 10 })).toBe(2);
    expect(billedDesi({ dimensionalWeight: 1, weightKg: 5 })).toBe(1);
    expect(billedDesi({ cargoDeci: 1 })).toBe(1);
  });

  it('keeps seller edits on normalize', () => {
    const tariff = normalizeTariff(emptyTrendyolTariff());
    tariff.versions[0].defaultCarrier = 'TEX';
    const next = normalizeTariff(tariff);
    expect(next.versions[0].defaultCarrier).toBe('TEX');
  });
});
