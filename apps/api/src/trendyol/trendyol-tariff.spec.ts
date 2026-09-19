import { emptyTrendyolTariff, estimateCargoTry, estimatePhbTry, normalizeTariff } from './trendyol-tariff';

describe('trendyol-tariff', () => {
  it('does not invent 57.99 when band amounts are empty', () => {
    expect(estimateCargoTry({ customerTry: 115, cargoDeci: 1, cargoProvider: 'Aras' }, emptyTrendyolTariff())).toBeNull();
    expect(estimatePhbTry(emptyTrendyolTariff())).toBeNull();
  });

  it('uses seller-filled 0–199.99 band only', () => {
    const tariff = normalizeTariff({
      cargoBands: [
        { maxCustomerTry: 199.99, amountTry: 57.99 },
        { maxCustomerTry: 349.99, amountTry: null },
      ],
      phbGrossTry: 13.19,
    });
    expect(estimateCargoTry({ customerTry: 115, cargoDeci: 1, cargoProvider: 'Aras' }, tariff)).toBe(57.99);
    expect(estimatePhbTry(tariff)).toBe(13.19);
    expect(tariff.cargoRuleUrl).toContain('kargo-baremi');
    expect(tariff.phbRuleUrl).toContain('platform-hizmet-bedeli');
  });
});
