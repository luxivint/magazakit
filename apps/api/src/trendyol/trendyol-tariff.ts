import type { OrderMoney, TrendyolTariff, TrendyolTariffVersion } from '@magazakit/contracts';

export const CARGO_BAREM_URL =
  'https://akademi.trendyol.com/satici-bilgi-merkezi/detay/kargo-baremi-uygulamasi';
export const PHB_RULE_URL =
  'https://akademi.trendyol.com/satici-bilgi-merkezi/detay/platform-hizmet-bedeli';
export const CARGO_PDF_URL =
  'https://tymp.mncdn.com/prod/documents/engagement/kargo/trendyol_guncel_kargo_fiyatlari.pdf';

const VAT = 0.2;
const MISMATCH_TL = 0.05;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function grossOf(net: number, vat = VAT, forced?: number): number {
  if (forced != null) return round2(forced);
  return round2(net * (1 + vat));
}

function barem(
  carrier: string,
  bandMaxCustomerTry: number,
  table: 1 | 2,
  netTry: number,
  grossTry?: number,
) {
  return { carrier, bandMaxCustomerTry, table, netTry, grossTry: grossOf(netTry, VAT, grossTry) };
}

function desi(carrier: string, deci: number, netTry: number) {
  return { carrier, deci, netTry, grossTry: grossOf(netTry) };
}

/** 13 Temmuz 2026 PDF, KDV hariç, desi 0–15 (satıcı tablosu yok). */
const DESI_CARRIERS = [
  'Aras',
  'DHL eCommerce',
  'Kolay Gelsin',
  'PTT',
  'Sürat',
  'TEX',
  'Yurtiçi',
  'CEVA Tedarik',
  'CEVA',
  'Horoz',
] as const;

const DESI_NET: number[][] = [
  [88.96, 97.99, 96.59, 77.54, 95.54, 77.54, 121.75, 468.62, 651.74, 567.76],
  [88.96, 97.99, 96.59, 77.54, 95.54, 77.54, 121.75, 468.62, 651.74, 567.76],
  [88.96, 97.99, 96.59, 77.54, 95.54, 77.54, 121.75, 468.62, 651.74, 567.76],
  [100.84, 110.99, 107.09, 96.0, 106.45, 93.63, 132.56, 468.62, 651.74, 567.76],
  [109.9, 124.99, 118.64, 96.0, 116.4, 101.46, 135.41, 468.62, 651.74, 567.76],
  [117.85, 137.99, 128.09, 100.55, 122.41, 107.98, 157.16, 468.62, 651.74, 567.76],
  [128.39, 150.99, 138.59, 106.83, 134.48, 118.3, 164.75, 468.62, 651.74, 567.76],
  [136.17, 159.99, 148.04, 113.15, 143.61, 125.66, 186.34, 468.62, 651.74, 567.76],
  [145.27, 169.99, 158.54, 125.73, 152.6, 134.21, 193.5, 468.62, 651.74, 567.76],
  [153.6, 179.99, 167.99, 138.34, 161.73, 142.42, 205.5, 468.62, 651.74, 567.76],
  [164.23, 189.99, 179.54, 157.26, 170.86, 153.47, 214.59, 468.62, 651.74, 567.76],
  [173.09, 199.99, 190.04, 165.01, 182.99, 162.13, 228.48, 468.62, 651.74, 567.76],
  [179.47, 209.99, 201.59, 173.31, 193.34, 170.33, 242.84, 468.62, 651.74, 567.76],
  [187.61, 219.99, 212.09, 181.63, 201.11, 178.04, 250.52, 468.62, 651.74, 567.76],
  [194.84, 229.99, 223.64, 189.94, 206.02, 185.17, 270.13, 468.62, 651.74, 567.76],
  [202.03, 244.98, 235.19, 198.22, 213.51, 192.81, 284.54, 468.62, 651.74, 567.76],
];

function officialDesiRows() {
  return DESI_NET.flatMap((row, deci) => row.map((net, i) => desi(DESI_CARRIERS[i], deci, net)));
}

/** 10 Ağustos 2026 barem (KDV hariç) + 13 Temmuz 2026 desi 1 PDF. Aras T1 0–199,99 48,33 → 57,99 panel. */
function officialVersion(): TrendyolTariffVersion {
  return {
    version: 1,
    effectiveFrom: '2026-08-10',
    sourceUrl: CARGO_BAREM_URL,
    sourceDate: '2026-08-10',
    desiPdfUrl: CARGO_PDF_URL,
    desiEffectiveFrom: '2026-07-13',
    phbRuleUrl: PHB_RULE_URL,
    vatRate: VAT,
    phbNetTry: 10.99,
    phbSameDayNetTry: 4.99,
    baremThresholdTry: 350,
    maxBaremDesi: 10,
    defaultTable: 1,
    defaultCarrier: 'Aras',
    barem: [
      barem('TEX', 199.99, 1, 38.74, 46.49),
      barem('PTT', 199.99, 1, 38.74, 46.49),
      barem('Aras', 199.99, 1, 48.33, 57.99),
      barem('Sürat', 199.99, 1, 54.58, 65.5),
      barem('Kolay Gelsin', 199.99, 1, 55.83, 67),
      barem('DHL eCommerce', 199.99, 1, 57.08, 68.5),
      barem('Yurtiçi', 199.99, 1, 83.33, 100),
      barem('TEX', 199.99, 2, 73.33, 88),
      barem('PTT', 199.99, 2, 73.33, 88),
      barem('Aras', 199.99, 2, 80.83, 97),
      barem('Sürat', 199.99, 2, 87.08, 104.5),
      barem('Kolay Gelsin', 199.99, 2, 88.33, 106),
      barem('DHL eCommerce', 199.99, 2, 89.58, 107.5),
      barem('Yurtiçi', 199.99, 2, 114.16, 137),
      barem('TEX', 349.99, 1, 70.41),
      barem('PTT', 349.99, 1, 70.41),
      barem('Aras', 349.99, 1, 79.16),
      barem('Sürat', 349.99, 1, 85.41),
      barem('Kolay Gelsin', 349.99, 1, 86.66),
      barem('DHL eCommerce', 349.99, 1, 87.91),
      barem('Yurtiçi', 349.99, 1, 113.33),
      barem('TEX', 349.99, 2, 78.74),
      barem('PTT', 349.99, 2, 78.74),
      barem('Aras', 349.99, 2, 86.24),
      barem('Sürat', 349.99, 2, 92.49),
      barem('Kolay Gelsin', 349.99, 2, 93.74),
      barem('DHL eCommerce', 349.99, 2, 94.99),
      barem('Yurtiçi', 349.99, 2, 119.16),
    ],
    desi: officialDesiRows(),
  };
}

function emptyWatch(): TrendyolTariff['watch'] {
  return {
    pdfUrl: CARGO_PDF_URL,
    pdfLastModified: null,
    pdfEtag: null,
    pdfContentLength: null,
    akademiBaremHash: null,
    akademiPhbHash: null,
    checkedAt: null,
    sourceChanged: false,
  };
}

export function activeTariffVersion(tariff: TrendyolTariff): TrendyolTariffVersion {
  return (
    tariff.versions.find((row) => row.version === tariff.activeVersion) ??
    tariff.versions[tariff.versions.length - 1] ??
    officialVersion()
  );
}

export function emptyTrendyolTariff(): TrendyolTariff {
  const version = officialVersion();
  return {
    cargoRuleUrl: CARGO_BAREM_URL,
    phbRuleUrl: PHB_RULE_URL,
    desiPdfUrl: CARGO_PDF_URL,
    vatRate: version.vatRate,
    phbGrossTry: grossOf(version.phbNetTry, version.vatRate),
    phbSameDayGrossTry: grossOf(version.phbSameDayNetTry, version.vatRate),
    cargoBands: [
      { maxCustomerTry: 199.99, amountTry: 57.99 },
      { maxCustomerTry: 349.99, amountTry: grossOf(79.16) },
    ],
    cargoDesi: [{ deci: 1, amountTry: grossOf(88.96) }],
    versions: [version],
    activeVersion: 1,
    mismatchNotice: null,
    sourceCheckNotice: null,
    watch: emptyWatch(),
  };
}

export function normalizeTariff(raw: Partial<TrendyolTariff> | null | undefined): TrendyolTariff {
  const base = emptyTrendyolTariff();
  if (!raw) return base;
  const versions =
    Array.isArray(raw.versions) && raw.versions.length > 0
      ? raw.versions.map((row, i) => {
          const seed = officialVersion();
          return {
            ...seed,
            ...row,
            version: Number(row.version) || i + 1,
            vatRate: Number(row.vatRate) > 0 ? Number(row.vatRate) : seed.vatRate,
            phbNetTry: Number(row.phbNetTry) || seed.phbNetTry,
            phbSameDayNetTry: Number(row.phbSameDayNetTry) || seed.phbSameDayNetTry,
            baremThresholdTry: Number(row.baremThresholdTry) || seed.baremThresholdTry,
            maxBaremDesi: Number(row.maxBaremDesi) || seed.maxBaremDesi,
            defaultTable: row.defaultTable === 2 ? (2 as const) : (1 as const),
            defaultCarrier: row.defaultCarrier || seed.defaultCarrier,
            barem: seed.barem,
            desi: seed.desi,
          };
        })
      : base.versions;
  const activeVersion = Number(raw.activeVersion) || versions[versions.length - 1]?.version || 1;
  const current = versions.find((row) => row.version === activeVersion) ?? versions[0];
  return {
    cargoRuleUrl: current.sourceUrl || base.cargoRuleUrl,
    phbRuleUrl: current.phbRuleUrl || base.phbRuleUrl,
    desiPdfUrl: current.desiPdfUrl || base.desiPdfUrl,
    vatRate: current.vatRate,
    phbGrossTry: grossOf(current.phbNetTry, current.vatRate),
    phbSameDayGrossTry: grossOf(current.phbSameDayNetTry, current.vatRate),
    cargoBands: base.cargoBands,
    cargoDesi: base.cargoDesi,
    versions,
    activeVersion: current.version,
    mismatchNotice: raw.mismatchNotice ?? null,
    sourceCheckNotice: raw.sourceCheckNotice ?? null,
    watch: { ...emptyWatch(), ...(raw.watch ?? {}) },
  };
}

export function carrierKey(name: string | null | undefined): string {
  const n = (name ?? '').toLowerCase();
  if (/tex|trendyol express/.test(n)) return 'tex';
  if (/ptt/.test(n)) return 'ptt';
  if (/aras/.test(n)) return 'aras';
  if (/sürat|surat/.test(n)) return 'surat';
  if (/kolay/.test(n)) return 'kolay-gelsin';
  if (/dhl/.test(n)) return 'dhl';
  if (/yurtiçi|yurtici/.test(n)) return 'yurtici';
  if (/ceva tedarik/.test(n)) return 'ceva-tedarik';
  if (/ceva/.test(n)) return 'ceva';
  if (/horoz/.test(n)) return 'horoz';
  return n.replace(/\s+/g, '-');
}

function sameCarrier(a: string, b: string): boolean {
  return carrierKey(a) === carrierKey(b) && carrierKey(a) !== '';
}

export function volumetricDesi(
  widthCm: number | null | undefined,
  heightCm: number | null | undefined,
  lengthCm: number | null | undefined,
): number | null {
  if (!(widthCm && heightCm && lengthCm) || widthCm <= 0 || heightCm <= 0 || lengthCm <= 0) return null;
  return round2((widthCm * heightCm * lengthCm) / 3000);
}

export function billedDesi(input: {
  dimensionalWeight?: number | null;
  cargoDeci?: number | null;
  weightKg?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  lengthCm?: number | null;
}): number | null {
  if (input.cargoDeci != null && input.cargoDeci > 0) return Math.ceil(input.cargoDeci);
  if (input.dimensionalWeight != null && input.dimensionalWeight > 0) {
    return Math.ceil(input.dimensionalWeight);
  }
  const vol = volumetricDesi(input.widthCm, input.heightCm, input.lengthCm);
  const kg = input.weightKg != null && input.weightKg > 0 ? input.weightKg : 0;
  if (!vol && !kg) return null;
  return Math.max(1, Math.ceil(Math.max(vol ?? 0, kg)));
}

export function tariffVersionLabel(_tariff?: TrendyolTariff): string {
  return 'tahmini';
}

export function estimateCargoTry(
  money: Pick<OrderMoney, 'customerTry' | 'cargoDeci' | 'cargoProvider'>,
  tariff: TrendyolTariff,
): number | null {
  const v = officialVersion();
  void tariff;
  const provider = money.cargoProvider || v.defaultCarrier;
  const deci = Math.max(0, Math.ceil(money.cargoDeci ?? 1));
  const desiOnly =
    /ceva|horoz/.test(carrierKey(provider)) || deci > v.maxBaremDesi || money.customerTry >= v.baremThresholdTry;
  if (!desiOnly && money.customerTry < v.baremThresholdTry) {
    const band = [...v.barem]
      .filter((row) => row.table === v.defaultTable && sameCarrier(row.carrier, provider))
      .sort((a, b) => a.bandMaxCustomerTry - b.bandMaxCustomerTry)
      .find((row) => money.customerTry <= row.bandMaxCustomerTry);
    if (band) return round2(band.grossTry);
    return null;
  }
  const rows = v.desi.filter((row) => sameCarrier(row.carrier, provider));
  const exact = rows.find((row) => row.deci === deci);
  if (exact) return round2(exact.grossTry);
  const nearest = [...rows].sort((a, b) => Math.abs(a.deci - deci) - Math.abs(b.deci - deci))[0];
  return nearest ? round2(nearest.grossTry) : null;
}

export function estimatePhbTry(tariff?: TrendyolTariff, sameDay = false): number | null {
  const v = officialVersion();
  void tariff;
  const net = sameDay ? v.phbSameDayNetTry : v.phbNetTry;
  if (!(net > 0)) return null;
  return grossOf(net, v.vatRate);
}

export function cargoMismatchesEstimate(
  invoicedTry: number,
  estimatedTry: number | null,
): boolean {
  if (estimatedTry == null) return false;
  return Math.abs(round2(invoicedTry) - round2(estimatedTry)) > MISMATCH_TL;
}
