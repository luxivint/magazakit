import type { OrderListItem, OrderMoney } from '@magazakit/contracts';
import type { TrendyolLiveConfig } from '../config/trendyol-env';
import { trendyolGetJson, type TrendyolQuery } from './trendyol-http';

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
  serviceFeeTry: number;
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
    serviceFeeTry: 0,
    stoppageTry: 0,
    cancelTry: 0,
    returnTry: 0,
    returnCargoTry: 0,
    intlReturnOpTry: 0,
    intlServiceTry: 0,
    penaltyTry: 0,
  };
}

function bump(map: Map<string, FinanceAcc>, key: string): FinanceAcc {
  const k = key.trim();
  if (!k) return emptyFinance();
  const cur = map.get(k) ?? emptyFinance();
  map.set(k, cur);
  return cur;
}

function keysOf(row: Record<string, unknown>): string[] {
  return [str(row.orderNumber), str(row.shipmentPackageId)].filter(Boolean);
}

export function ingestSettlementSale(map: Map<string, FinanceAcc>, payload: unknown): void {
  for (const row of pageContent(payload)) {
    const commission = num(row.commissionAmount);
    const revenue = num(row.sellerRevenue);
    const kind = `${str(row.transactionType)} ${str(row.description)}`;
    for (const key of keysOf(row)) {
      const acc = bump(map, key);
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
    const orderNumber = str(row.orderNumber);
    if (!orderNumber) continue;
    const acc = bump(map, orderNumber);
    const amount = Math.abs(num(row.amount));
    const label = str(row.shipmentPackageType);
    if (/iade/i.test(label)) acc.returnCargoTry = round2(acc.returnCargoTry + amount);
    else {
      acc.cargoFeeTry = round2(acc.cargoFeeTry + amount);
      acc.cargoFeeLabel = label || acc.cargoFeeLabel || 'Kargo bedeli';
    }
  }
}

export function ingestOtherFinancials(map: Map<string, FinanceAcc>, payload: unknown): void {
  for (const row of pageContent(payload)) {
    const kind = `${str(row.transactionType)} ${str(row.description)} ${str(row.transactionSubType)}`;
    const amount = Math.abs(num(row.debt) || num(row.credit) || num(row.amount));
    if (amount <= 0) continue;
    const targets = keysOf(row);
    if (targets.length === 0) continue;
    for (const key of targets) {
      const acc = bump(map, key);
      if (/stopaj|stoppage/i.test(kind)) acc.stoppageTry = round2(acc.stoppageTry + amount);
      else if (/iade kargo|return cargo/i.test(kind)) acc.returnCargoTry = round2(acc.returnCargoTry + amount);
      else if (/yurtdışı|yurtdisi/i.test(kind)) acc.intlReturnOpTry = round2(acc.intlReturnOpTry + amount);
      else if (/uluslararası|international/i.test(kind)) acc.intlServiceTry = round2(acc.intlServiceTry + amount);
      else if (/ceza|penalty/i.test(kind)) acc.penaltyTry = round2(acc.penaltyTry + amount);
      else if (/iptal|cancel/i.test(kind)) acc.cancelTry = round2(acc.cancelTry + amount);
      else if (/hizmet|platformservicefee|platform/i.test(kind)) {
        acc.serviceFeeTry = round2(acc.serviceFeeTry + amount);
      } else if (/kargo/i.test(kind)) {
        acc.cargoFeeTry = round2(acc.cargoFeeTry + amount);
        acc.cargoFeeLabel = str(row.description) || acc.cargoFeeLabel || 'Kargo bedeli';
      }
    }
  }
}

export function applyFinanceAcc(money: OrderMoney, acc: FinanceAcc | undefined): OrderMoney {
  if (!acc) return { ...money, financeLoaded: money.financeLoaded };
  const commissionSettled = acc.commissionSettledTry > 0 ? acc.commissionSettledTry : null;
  const sellerRevenue = acc.sellerRevenueTry > 0 ? acc.sellerRevenueTry : null;
  const cargoFee = acc.cargoFeeTry > 0 ? acc.cargoFeeTry : money.cargoFeeTry;
  const serviceFee = acc.serviceFeeTry > 0 ? acc.serviceFeeTry : money.serviceFeeTry;
  const stoppage = acc.stoppageTry > 0 ? acc.stoppageTry : money.stoppageTry;
  const commissionTry = commissionSettled ?? money.commissionTry;
  const cancelTry = acc.cancelTry || money.cancelTry || 0;
  const returnTry = acc.returnTry || money.returnTry || 0;
  const returnCargoTry = acc.returnCargoTry || money.returnCargoTry || 0;
  const intlReturnOpTry = acc.intlReturnOpTry || money.intlReturnOpTry || 0;
  const intlServiceTry = acc.intlServiceTry || money.intlServiceTry || 0;
  const penaltyTry = acc.penaltyTry || money.penaltyTry || 0;
  const complete = commissionTry != null && cargoFee != null && serviceFee != null;
  const net = complete
    ? round2(
        money.customerTry -
          commissionTry -
          (money.sgrFeeTry || 0) -
          cargoFee -
          serviceFee -
          (stoppage ?? 0) -
          cancelTry -
          returnTry -
          returnCargoTry -
          intlReturnOpTry -
          intlServiceTry -
          penaltyTry,
      )
    : null;
  const cargoFeeRate =
    cargoFee != null && money.customerTry > 0
      ? Math.round((cargoFee / money.customerTry) * 1000) / 10
      : null;
  return {
    ...money,
    commissionTry,
    commissionSource: commissionSettled != null ? 'settlement' : money.commissionSource,
    cargoFeeTry: cargoFee,
    cargoFeeLabel: acc.cargoFeeLabel ?? money.cargoFeeLabel,
    cargoFeeRate,
    serviceFeeTry: serviceFee,
    stoppageTry: stoppage,
    sellerRevenueTry: sellerRevenue,
    cancelTry,
    returnTry,
    returnCargoTry,
    intlReturnOpTry,
    intlServiceTry,
    penaltyTry,
    financeLoaded: true,
    estimatedEarningsTry: net,
    earningsEstimated: !complete,
  };
}

function lookup(map: Map<string, FinanceAcc>, order: Omit<OrderListItem, 'organizationId'>): FinanceAcc | undefined {
  const keys = [order.orderNumber, order.id.replace(/^ty-/, '')];
  for (const key of keys) {
    const hit = map.get(key);
    if (hit) return hit;
  }
  return undefined;
}

export function applyFinanceMap(
  orders: Omit<OrderListItem, 'organizationId'>[],
  map: Map<string, FinanceAcc>,
): Omit<OrderListItem, 'organizationId'>[] {
  return orders.map((order) => {
    if (!order.money) return order;
    return { ...order, money: applyFinanceAcc(order.money, lookup(map, order) ?? emptyFinance()) };
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
    const payload = await getJson(config, path, { ...query, page, size: PAGE_SIZE });
    const rows = pageContent(payload);
    onPage(payload);
    if (rows.length < PAGE_SIZE) break;
  }
}

/** Read-only current-account + cargo invoice items. Failures leave package estimates. */
export async function enrichOrdersWithFinance(
  config: TrendyolLiveConfig,
  orders: Omit<OrderListItem, 'organizationId'>[],
  getJson: GetJson = trendyolGetJson,
): Promise<Omit<OrderListItem, 'organizationId'>[]> {
  if (orders.length === 0) return orders;
  const map = new Map<string, FinanceAcc>();
  const serials = new Set<string>();
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
        (payload) => ingestOtherFinancials(map, payload),
      );
      await eachFinancePage(
        getJson,
        config,
        `${sellerPath}/otherfinancials`,
        { transactionType: 'Stoppage', startDate, endDate },
        (payload) => ingestOtherFinancials(map, payload),
      );
    }
    for (const serial of serials) {
      await eachFinancePage(
        getJson,
        config,
        `${sellerPath}/cargo-invoice/${serial}/items`,
        {},
        (payload) => ingestCargoInvoiceItems(map, payload),
      );
    }
  } catch {
    return applyFinanceMap(orders, map);
  }
  return applyFinanceMap(orders, map);
}
