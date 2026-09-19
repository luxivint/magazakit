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
};

export function emptyFinance(): FinanceAcc {
  return {
    commissionSettledTry: 0,
    sellerRevenueTry: 0,
    cargoFeeTry: 0,
    cargoFeeLabel: null,
    serviceFeeTry: 0,
    stoppageTry: 0,
  };
}

function bump(map: Map<string, FinanceAcc>, key: string): FinanceAcc {
  const k = key.trim();
  if (!k) return emptyFinance();
  const cur = map.get(k) ?? emptyFinance();
  map.set(k, cur);
  return cur;
}

export function ingestSettlementSale(map: Map<string, FinanceAcc>, payload: unknown): void {
  for (const row of pageContent(payload)) {
    const orderNumber = str(row.orderNumber);
    const packageId = str(row.shipmentPackageId);
    const commission = num(row.commissionAmount);
    const revenue = num(row.sellerRevenue);
    for (const key of [orderNumber, packageId]) {
      if (!key) continue;
      const acc = bump(map, key);
      acc.commissionSettledTry = round2(acc.commissionSettledTry + commission);
      acc.sellerRevenueTry = round2(acc.sellerRevenueTry + revenue);
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
    acc.cargoFeeTry = round2(acc.cargoFeeTry + num(row.amount));
    acc.cargoFeeLabel = str(row.shipmentPackageType) || acc.cargoFeeLabel || 'Kargo bedeli';
  }
}

export function ingestOtherFinancials(map: Map<string, FinanceAcc>, payload: unknown): void {
  for (const row of pageContent(payload)) {
    const orderNumber = str(row.orderNumber);
    if (!orderNumber) continue;
    const kind = `${str(row.transactionType)} ${str(row.description)} ${str(row.transactionSubType)}`;
    const amount = Math.abs(num(row.debt) || num(row.credit) || num(row.amount));
    if (amount <= 0) continue;
    const acc = bump(map, orderNumber);
    if (/stopaj|stoppage/i.test(kind)) acc.stoppageTry = round2(acc.stoppageTry + amount);
    else if (/hizmet|platformservicefee|platform/i.test(kind)) {
      acc.serviceFeeTry = round2(acc.serviceFeeTry + amount);
    }
  }
}

export function applyFinanceAcc(money: OrderMoney, acc: FinanceAcc | undefined): OrderMoney {
  if (!acc) return money;
  const commissionSettled = acc.commissionSettledTry > 0 ? acc.commissionSettledTry : null;
  const sellerRevenue = acc.sellerRevenueTry > 0 ? acc.sellerRevenueTry : null;
  const cargoFee = acc.cargoFeeTry > 0 ? acc.cargoFeeTry : money.cargoFeeTry;
  const serviceFee = acc.serviceFeeTry > 0 ? acc.serviceFeeTry : money.serviceFeeTry;
  const stoppage = acc.stoppageTry > 0 ? acc.stoppageTry : money.stoppageTry;
  const commissionTry = commissionSettled ?? money.commissionTry;
  const extra = (cargoFee ?? 0) + (serviceFee ?? 0) + (stoppage ?? 0);
  let estimated: number | null = null;
  if (sellerRevenue != null) {
    estimated = round2(sellerRevenue - extra);
  } else if (commissionTry != null) {
    estimated = round2(money.customerTry - commissionTry - (money.sgrFeeTry || 0) - extra);
  }
  return {
    ...money,
    commissionTry,
    commissionSource: commissionSettled != null ? 'settlement' : money.commissionSource,
    cargoFeeTry: cargoFee,
    cargoFeeLabel: acc.cargoFeeLabel ?? money.cargoFeeLabel,
    serviceFeeTry: serviceFee,
    stoppageTry: stoppage,
    sellerRevenueTry: sellerRevenue,
    estimatedEarningsTry: estimated,
    earningsEstimated: sellerRevenue == null || cargoFee == null,
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
    return { ...order, money: applyFinanceAcc(order.money, lookup(map, order)) };
  });
}

const WINDOW_MS = 13 * 24 * 60 * 60 * 1000;
const WINDOWS = 14;
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
  try {
    for (let w = 0; w < WINDOWS; w += 1) {
      const endDate = now - w * WINDOW_MS;
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
