import type { FeeSource, OrderListItem, OrderMoney, TrendyolTariff } from '@magazakit/contracts';
import type { TrendyolLiveConfig } from '../config/trendyol-env';
import { trendyolGetJson, type TrendyolQuery } from './trendyol-http';
import { emptyTrendyolTariff, estimateCargoTry, estimatePhbTry } from './trendyol-tariff';

type GetJson = typeof trendyolGetJson;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pageContent(payload: unknown): Record<string, unknown>[] {
  const rec = asRecord(payload);
  const content = rec?.content;
  return Array.isArray(content)
    ? content.map(asRecord).filter((row): row is Record<string, unknown> => !!row)
    : [];
}

export type FinanceAcc = {
  commissionSettledTry: number;
  sellerRevenueTry: number;
  cargoFeeTry: number;
  cargoFeeLabel: string | null;
  cargoFeeSource: FeeSource | null;
  serviceFeeTry: number;
  serviceFeeSource: FeeSource | null;
  stoppageTry: number;
  cancelTry: number;
  returnTry: number;
  returnCargoTry: number;
  intlReturnOpTry: number;
  intlServiceTry: number;
  penaltyTry: number;
};

export function emptyFinance(): FinanceAcc {
  return {
    commissionSettledTry: 0,
    sellerRevenueTry: 0,
    cargoFeeTry: 0,
    cargoFeeLabel: null,
    cargoFeeSource: null,
    serviceFeeTry: 0,
    serviceFeeSource: null,
    stoppageTry: 0,
    cancelTry: 0,
    returnTry: 0,
    returnCargoTry: 0,
    intlReturnOpTry: 0,
    intlServiceTry: 0,
    penaltyTry: 0,
  };
}

/** Same object under every alias so lookup does not double-count. */
function bumpKeys(map: Map<string, FinanceAcc>, keys: string[]): FinanceAcc {
  const uniq = [...new Set(keys.map((k) => k.trim()).filter(Boolean))];
  if (uniq.length === 0) return emptyFinance();
  let acc: FinanceAcc | undefined;
  for (const key of uniq) {
    const cur = map.get(key);
    if (cur) {
      acc = cur;
      break;
    }
  }
  acc = acc ?? emptyFinance();
  for (const key of uniq) map.set(key, acc);
  return acc;
}

function keysOf(row: Record<string, unknown>): string[] {
  return [str(row.orderNumber), str(row.shipmentPackageId), str(row.parcelUniqueId)].filter(Boolean);
}

export function ingestSettlementSale(map: Map<string, FinanceAcc>, payload: unknown): void {
  for (const row of pageContent(payload)) {
    const commission = num(row.commissionAmount);
    const revenue = num(row.sellerRevenue);
    const kind = `${str(row.transactionType)} ${str(row.description)}`;
    const acc = bumpKeys(map, keysOf(row));
    if (keysOf(row).length === 0) continue;
    acc.commissionSettledTry = round2(acc.commissionSettledTry + commission);
    acc.sellerRevenueTry = round2(acc.sellerRevenueTry + revenue);
    if (/iade|return/i.test(kind) && !/kargo/i.test(kind)) {
      acc.returnTry = round2(acc.returnTry + Math.abs(num(row.debt) || num(row.credit)));
    }
    if (/ceza|penalty/i.test(kind)) {
      acc.penaltyTry = round2(acc.penaltyTry + Math.abs(num(row.debt) || num(row.credit)));
    }
  }
}

/** DeliveryFee is the official per-order teslimat kaydı. Cargo invoice items override later. */
export function ingestSettlementDeliveryFee(map: Map<string, FinanceAcc>, payload: unknown): void {
  for (const row of pageContent(payload)) {
    const amount = Math.abs(num(row.debt) || num(row.credit) || num(row.amount));
    if (amount <= 0) continue;
    if (keysOf(row).length === 0) continue;
    const acc = bumpKeys(map, keysOf(row));
    acc.cargoFeeTry = round2(acc.cargoFeeTry + amount);
    acc.cargoFeeLabel = str(row.description) || acc.cargoFeeLabel || 'Teslimat ücreti';
    acc.cargoFeeSource = 'settlement';
  }
}

export function cargoInvoiceSerials(payload: unknown): string[] {
  const out: string[] = [];
  for (const row of pageContent(payload)) {
    const kind = `${str(row.transactionType)} ${str(row.description)} ${str(row.transactionSubType)}`;
    if (!/kargo/i.test(kind)) continue;
    const id = str(row.id ?? row.invoiceSerialNumber);
    if (id) out.push(id);
  }
  return out;
}

export function ingestCargoInvoiceItems(map: Map<string, FinanceAcc>, payload: unknown): void {
  for (const row of pageContent(payload)) {
    const amount = Math.abs(num(row.amount));
    if (amount <= 0) continue;
    const label = str(row.shipmentPackageType);
    const acc = bumpKeys(map, [
      str(row.orderNumber),
      str(row.shipmentPackageId),
      str(row.parcelUniqueId),
    ]);
    if (/iade/i.test(label)) acc.returnCargoTry = round2(acc.returnCargoTry + amount);
    else {
      acc.cargoFeeTry = round2(acc.cargoFeeTry + amount);
      acc.cargoFeeLabel = label || acc.cargoFeeLabel || 'Kargo bedeli';
      acc.cargoFeeSource = 'fatura';
    }
  }
}

export function ingestOtherFinancials(map: Map<string, FinanceAcc>, payload: unknown): void {
  for (const row of pageContent(payload)) {
    const kind = `${str(row.transactionType)} ${str(row.description)} ${str(row.transactionSubType)}`;
    const amount = Math.abs(num(row.debt) || num(row.credit) || num(row.amount));
    if (amount <= 0) continue;
    if (keysOf(row).length === 0) continue;
    const acc = bumpKeys(map, keysOf(row));
    if (/stopaj|stoppage/i.test(kind)) acc.stoppageTry = round2(acc.stoppageTry + amount);
    else if (/iade kargo|return cargo/i.test(kind)) acc.returnCargoTry = round2(acc.returnCargoTry + amount);
    else if (/yurtdışı|yurtdisi/i.test(kind)) acc.intlReturnOpTry = round2(acc.intlReturnOpTry + amount);
    else if (/uluslararası|international/i.test(kind)) acc.intlServiceTry = round2(acc.intlServiceTry + amount);
    else if (/ceza|penalty/i.test(kind)) acc.penaltyTry = round2(acc.penaltyTry + amount);
    else if (/iptal|cancel/i.test(kind)) acc.cancelTry = round2(acc.cancelTry + amount);
    else if (/hizmet|platformservicefee|platform/i.test(kind)) {
      acc.serviceFeeTry = round2(acc.serviceFeeTry + amount);
      acc.serviceFeeSource = 'fatura';
    } else if (/kargo/i.test(kind)) {
      acc.cargoFeeTry = round2(acc.cargoFeeTry + amount);
      acc.cargoFeeLabel = str(row.description) || acc.cargoFeeLabel || 'Kargo bedeli';
      acc.cargoFeeSource = 'fatura';
    }
  }
}

export type PhbInvoice = {
  id: string;
  debt: number;
  at: number;
  orderNumber: string;
  shipmentPackageId: string;
};

export function collectPhbInvoices(payload: unknown): PhbInvoice[] {
  const out: PhbInvoice[] = [];
  for (const row of pageContent(payload)) {
    const kind = `${str(row.transactionType)} ${str(row.description)} ${str(row.transactionSubType)}`;
    if (!/hizmet|platformservicefee|platform/i.test(kind)) continue;
    const debt = Math.abs(num(row.debt) || num(row.credit) || num(row.amount));
    if (debt <= 0) continue;
    out.push({
      id: str(row.id),
      debt,
      at: num(row.transactionDate ?? row.date),
      orderNumber: str(row.orderNumber),
      shipmentPackageId: str(row.shipmentPackageId),
    });
  }
  return out;
}

/** Period invoice with no orderNumber: split only when eligible count matches the invoice (n=1 or n × seller PHB). */
export function allocatePhb(
  map: Map<string, FinanceAcc>,
  orders: Omit<OrderListItem, 'organizationId'>[],
  invoices: PhbInvoice[],
  unitTry: number | null,
): void {
  const period = invoices
    .filter((row) => !row.orderNumber && !row.shipmentPackageId)
    .sort((a, b) => a.at - b.at);
  for (let i = 0; i < period.length; i += 1) {
    const inv = period[i];
    const start = i > 0 ? period[i - 1].at : inv.at - 45 * 86_400_000;
    const eligible = orders.filter((order) => {
      if (order.status !== 'delivered' && order.status !== 'shipped') return false;
      const t = new Date(order.createdAt).getTime();
      return Number.isFinite(t) && t > start && t <= (inv.at || Date.now());
    });
    if (eligible.length === 0) continue;
    const n = eligible.length;
    const matchesUnit =
      unitTry != null && unitTry > 0 && Math.abs(round2(n * unitTry) - round2(inv.debt)) < 0.05;
    if (n !== 1 && !matchesUnit) continue;
    const share = round2(inv.debt / n);
    for (const order of eligible) {
      const acc = bumpKeys(map, [order.orderNumber, order.id.replace(/^ty-/, '')]);
      if (acc.serviceFeeSource === 'fatura') continue;
      acc.serviceFeeTry = round2(acc.serviceFeeTry + share);
      acc.serviceFeeSource = 'fatura-tahsis';
    }
  }
}

export function applyFinanceAcc(money: OrderMoney, acc: FinanceAcc | undefined): OrderMoney {
  if (!acc) return finalizeMoney({ ...money });
  const commissionSettled = acc.commissionSettledTry > 0 ? acc.commissionSettledTry : null;
  const sellerRevenue = acc.sellerRevenueTry > 0 ? acc.sellerRevenueTry : null;
  let cargoFee = money.cargoFeeTry;
  let cargoSource = money.cargoFeeSource;
  let cargoLabel = money.cargoFeeLabel;
  if (acc.cargoFeeTry > 0 && (acc.cargoFeeSource === 'fatura' || acc.cargoFeeSource === 'settlement')) {
    cargoFee = acc.cargoFeeTry;
    cargoSource = acc.cargoFeeSource;
    cargoLabel = acc.cargoFeeLabel ?? cargoLabel;
  }
  let serviceFee = money.serviceFeeTry;
  let serviceSource = money.serviceFeeSource;
  if (acc.serviceFeeTry > 0 && (acc.serviceFeeSource === 'fatura' || acc.serviceFeeSource === 'fatura-tahsis')) {
    serviceFee = acc.serviceFeeTry;
    serviceSource = acc.serviceFeeSource;
  }
  const stoppage = acc.stoppageTry > 0 ? acc.stoppageTry : money.stoppageTry;
  const commissionTry = commissionSettled ?? money.commissionTry;
  const cancelTry = acc.cancelTry || money.cancelTry || 0;
  const returnTry = acc.returnTry || money.returnTry || 0;
  const returnCargoTry = acc.returnCargoTry || money.returnCargoTry || 0;
  const intlReturnOpTry = acc.intlReturnOpTry || money.intlReturnOpTry || 0;
  const intlServiceTry = acc.intlServiceTry || money.intlServiceTry || 0;
  const penaltyTry = acc.penaltyTry || money.penaltyTry || 0;
  return finalizeMoney({
    ...money,
    commissionTry,
    commissionSource: commissionSettled != null ? 'settlement' : money.commissionSource,
    cargoFeeTry: cargoFee,
    cargoFeeLabel: cargoLabel,
    cargoFeeSource: cargoSource,
    cargoFeeRate:
      cargoFee != null && money.customerTry > 0
        ? Math.round((cargoFee / money.customerTry) * 1000) / 10
        : money.cargoFeeRate,
    serviceFeeTry: serviceFee,
    serviceFeeSource: serviceSource,
    stoppageTry: stoppage,
    sellerRevenueTry: sellerRevenue,
    cancelTry,
    returnTry,
    returnCargoTry,
    intlReturnOpTry,
    intlServiceTry,
    penaltyTry,
  });
}

function finalizeMoney(money: OrderMoney): OrderMoney {
  const complete = money.commissionTry != null && money.cargoFeeTry != null && money.serviceFeeTry != null;
  const net = complete
    ? round2(
        money.customerTry -
          money.commissionTry! -
          (money.sgrFeeTry || 0) -
          money.cargoFeeTry! -
          money.serviceFeeTry! -
          (money.stoppageTry ?? 0) -
          (money.cancelTry || 0) -
          (money.returnTry || 0) -
          (money.returnCargoTry || 0) -
          (money.intlReturnOpTry || 0) -
          (money.intlServiceTry || 0) -
          (money.penaltyTry || 0),
      )
    : null;
  const kesin =
    money.cargoFeeSource === 'fatura' && money.serviceFeeSource === 'fatura' && money.commissionTry != null;
  const status = !complete ? 'eksik' : kesin ? 'kesinleşti' : 'tahmini';
  return {
    ...money,
    estimatedEarningsTry: net,
    earningsEstimated: status !== 'kesinleşti',
    earningsStatus: status,
    financeLoaded: false,
  };
}

function applyTariff(
  money: OrderMoney,
  tariff: TrendyolTariff,
  status: OrderListItem['status'],
): OrderMoney {
  if (status !== 'delivered' && status !== 'shipped') return money;
  let next = { ...money };
  if (next.cargoFeeTry == null) {
    const cargo = estimateCargoTry(next, tariff);
    if (cargo != null) {
      next = {
        ...next,
        cargoFeeTry: cargo,
        cargoFeeSource: 'tarife',
        cargoFeeLabel: 'tahmini (tarife)',
        cargoFeeRate:
          next.customerTry > 0 ? Math.round((cargo / next.customerTry) * 1000) / 10 : null,
      };
    }
  }
  if (next.serviceFeeTry == null) {
    const phb = estimatePhbTry(tariff);
    if (phb != null) next = { ...next, serviceFeeTry: phb, serviceFeeSource: 'tarife' };
  }
  return next;
}

function lookup(map: Map<string, FinanceAcc>, order: Omit<OrderListItem, 'organizationId'>): FinanceAcc | undefined {
  const keys = [
    order.orderNumber,
    order.id.replace(/^ty-/, ''),
    order.money?.cargoTrackingNumber ?? '',
  ].filter(Boolean);
  const seen = new Set<FinanceAcc>();
  const merged = emptyFinance();
  let hit = false;
  for (const key of keys) {
    const row = map.get(key);
    if (!row || seen.has(row)) continue;
    seen.add(row);
    hit = true;
    merged.commissionSettledTry = round2(merged.commissionSettledTry + row.commissionSettledTry);
    merged.sellerRevenueTry = round2(merged.sellerRevenueTry + row.sellerRevenueTry);
    if (row.cargoFeeTry > 0) {
      merged.cargoFeeTry = round2(merged.cargoFeeTry + row.cargoFeeTry);
      merged.cargoFeeLabel = row.cargoFeeLabel ?? merged.cargoFeeLabel;
      merged.cargoFeeSource = row.cargoFeeSource ?? merged.cargoFeeSource;
    }
    if (row.serviceFeeTry > 0) {
      merged.serviceFeeTry = round2(merged.serviceFeeTry + row.serviceFeeTry);
      merged.serviceFeeSource = row.serviceFeeSource ?? merged.serviceFeeSource;
    }
    merged.stoppageTry = round2(merged.stoppageTry + row.stoppageTry);
    merged.cancelTry = round2(merged.cancelTry + row.cancelTry);
    merged.returnTry = round2(merged.returnTry + row.returnTry);
    merged.returnCargoTry = round2(merged.returnCargoTry + row.returnCargoTry);
    merged.intlReturnOpTry = round2(merged.intlReturnOpTry + row.intlReturnOpTry);
    merged.intlServiceTry = round2(merged.intlServiceTry + row.intlServiceTry);
    merged.penaltyTry = round2(merged.penaltyTry + row.penaltyTry);
  }
  return hit ? merged : undefined;
}

export function applyFinanceMap(
  orders: Omit<OrderListItem, 'organizationId'>[],
  map: Map<string, FinanceAcc>,
  tariff: TrendyolTariff = emptyTrendyolTariff(),
): Omit<OrderListItem, 'organizationId'>[] {
  return orders.map((order) => {
    if (!order.money) return order;
    const estimated = applyTariff(order.money, tariff, order.status);
    return { ...order, money: applyFinanceAcc(estimated, lookup(map, order) ?? emptyFinance()) };
  });
}

const WINDOW_MS = 13 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 500;
const MAX_PAGES = 4;

async function eachFinancePage(
  getJson: GetJson,
  config: TrendyolLiveConfig,
  path: string,
  query: TrendyolQuery,
  onPage: (payload: unknown) => void,
): Promise<void> {
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const size = Number(query.size) > 0 ? Number(query.size) : PAGE_SIZE;
    const payload = await getJson(config, path, { ...query, page, size });
    const rows = pageContent(payload);
    onPage(payload);
    if (rows.length < size) break;
  }
}

/** Read-only current-account + cargo invoice items. Failures leave package estimates. */
export async function enrichOrdersWithFinance(
  config: TrendyolLiveConfig,
  orders: Omit<OrderListItem, 'organizationId'>[],
  getJson: GetJson = trendyolGetJson,
  tariff: TrendyolTariff = emptyTrendyolTariff(),
): Promise<Omit<OrderListItem, 'organizationId'>[]> {
  if (orders.length === 0) return orders;
  const map = new Map<string, FinanceAcc>();
  const serials = new Set<string>();
  const phb: PhbInvoice[] = [];
  const sellerPath = `/integration/finance/che/sellers/${config.sellerId}`;
  const now = Date.now();
  const stamps = orders
    .map((o) => new Date(o.createdAt).getTime())
    .filter((n) => Number.isFinite(n) && n > 0);
  const from = (stamps.length ? Math.min(...stamps) : now) - 2 * 86_400_000;
  const until = Math.max(now, (stamps.length ? Math.max(...stamps) : now) + 45 * 86_400_000);
  try {
    for (let endDate = until; endDate > from; endDate -= WINDOW_MS) {
      const startDate = endDate - WINDOW_MS;
      await eachFinancePage(
        getJson,
        config,
        `${sellerPath}/settlements`,
        { transactionType: 'Sale', startDate, endDate },
        (payload) => ingestSettlementSale(map, payload),
      );
      await eachFinancePage(
        getJson,
        config,
        `${sellerPath}/otherfinancials`,
        { transactionType: 'DeductionInvoices', startDate, endDate },
        (payload) => {
          ingestOtherFinancials(map, payload);
          phb.push(...collectPhbInvoices(payload));
          for (const id of cargoInvoiceSerials(payload)) serials.add(id);
        },
      );
      await eachFinancePage(
        getJson,
        config,
        `${sellerPath}/otherfinancials`,
        {
          transactionType: 'DeductionInvoices',
          transactionSubType: 'PlatformServiceFee',
          startDate,
          endDate,
        },
        (payload) => {
          ingestOtherFinancials(map, payload);
          phb.push(...collectPhbInvoices(payload));
        },
      );
      await eachFinancePage(
        getJson,
        config,
        `${sellerPath}/otherfinancials`,
        { transactionType: 'Stoppage', startDate, endDate },
        (payload) => ingestOtherFinancials(map, payload),
      );
      await eachFinancePage(
        getJson,
        config,
        `${sellerPath}/settlements`,
        { transactionType: 'DeliveryFee', startDate, endDate },
        (payload) => ingestSettlementDeliveryFee(map, payload),
      );
      await eachFinancePage(
        getJson,
        config,
        `${sellerPath}/settlements`,
        { transactionType: 'DeliveryFeeCancel', startDate, endDate },
        (payload) => ingestSettlementDeliveryFee(map, payload),
      );
    }
    for (const serial of serials) {
      try {
        await eachFinancePage(
          getJson,
          config,
          `${sellerPath}/cargo-invoice/${serial}/items`,
          {},
          (payload) => ingestCargoInvoiceItems(map, payload),
        );
      } catch {
        await eachFinancePage(
          getJson,
          config,
          `${sellerPath}/cargo-invoice/${serial}/items`,
          { size: 1000 },
          (payload) => ingestCargoInvoiceItems(map, payload),
        );
      }
    }
    allocatePhb(map, orders, phb, tariff.phbGrossTry);
  } catch {
    return applyFinanceMap(orders, map, tariff);
  }
  return applyFinanceMap(orders, map, tariff);
}
