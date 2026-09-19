import type { OrderMoney, TrendyolTariff } from '@magazakit/contracts';

export const CARGO_BAREM_URL =
  'https://akademi.trendyol.com/satici-bilgi-merkezi/detay/kargo-baremi-uygulamasi';
export const PHB_RULE_URL =
  'https://akademi.trendyol.com/satici-bilgi-merkezi/detay/platform-hizmet-bedeli';

/** Akademi: 0–199.99 and 200–349.99 are barem bands; ≥350 TL uses desi list. Amounts are not published on that page. */
export function emptyTrendyolTariff(): TrendyolTariff {
  return {
    cargoRuleUrl: CARGO_BAREM_URL,
    phbRuleUrl: PHB_RULE_URL,
    cargoBands: [
      { maxCustomerTry: 199.99, amountTry: null },
      { maxCustomerTry: 349.99, amountTry: null },
    ],
    cargoDesi: [],
    phbGrossTry: null,
  };
}

export function normalizeTariff(raw: Partial<TrendyolTariff> | null | undefined): TrendyolTariff {
  const base = emptyTrendyolTariff();
  if (!raw) return base;
  return {
    cargoRuleUrl: base.cargoRuleUrl,
    phbRuleUrl: base.phbRuleUrl,
    cargoBands:
      Array.isArray(raw.cargoBands) && raw.cargoBands.length > 0
        ? raw.cargoBands.map((row) => ({
            maxCustomerTry: Number(row.maxCustomerTry),
            amountTry: row.amountTry == null ? null : Number(row.amountTry),
          }))
        : base.cargoBands,
    cargoDesi: Array.isArray(raw.cargoDesi)
      ? raw.cargoDesi.map((row) => ({
          deci: Number(row.deci),
          amountTry: row.amountTry == null ? null : Number(row.amountTry),
        }))
      : [],
    phbGrossTry: raw.phbGrossTry == null ? null : Number(raw.phbGrossTry),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function estimateCargoTry(money: Pick<OrderMoney, 'customerTry' | 'cargoDeci' | 'cargoProvider'>, tariff: TrendyolTariff): number | null {
  const provider = (money.cargoProvider ?? '').toLowerCase();
  const desiOnly = /ceva|horoz/.test(provider) || (money.cargoDeci ?? 0) > 10;
  if (!desiOnly && money.customerTry < 350) {
    const band = [...tariff.cargoBands]
      .sort((a, b) => a.maxCustomerTry - b.maxCustomerTry)
      .find((row) => money.customerTry <= row.maxCustomerTry);
    if (band?.amountTry != null && band.amountTry > 0) return round2(band.amountTry);
    return null;
  }
  const deci = money.cargoDeci ?? 0;
  const hit = tariff.cargoDesi.find((row) => row.deci === deci);
  if (hit?.amountTry != null && hit.amountTry > 0) return round2(hit.amountTry);
  return null;
}

export function estimatePhbTry(tariff: TrendyolTariff): number | null {
  if (tariff.phbGrossTry == null || tariff.phbGrossTry <= 0) return null;
  return round2(tariff.phbGrossTry);
}
