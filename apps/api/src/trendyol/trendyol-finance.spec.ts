import type { OrderListItem, OrderMoney } from '@magazakit/contracts';
import {
  allocatePhb,
  applyFinanceAcc,
  applyFinanceMap,
  cargoInvoiceSerials,
  emptyFinance,
  ingestCargoInvoiceItems,
  ingestOtherFinancials,
  ingestSettlementDeliveryFee,
  ingestSettlementSale,
} from './trendyol-finance';
import { emptyTrendyolTariff, normalizeTariff } from './trendyol-tariff';

function baseMoney(over: Partial<OrderMoney> = {}): OrderMoney {
  return {
    grossTry: 115,
    sellerDiscountTry: 0,
    tyDiscountTry: 0,
    customerTry: 115,
    commissionRate: 16,
    commissionTry: 18.4,
    commissionSource: 'package_rate',
    sgrFeeTry: 0,
    cargoFeeTry: null,
    cargoFeeLabel: null,
    cargoFeeSource: 'none',
    serviceFeeTry: null,
    serviceFeeSource: 'none',
    storeFeeTry: null,
    stoppageTry: null,
    sellerRevenueTry: null,
    cancelTry: 0,
    returnTry: 0,
    returnCargoTry: 0,
    intlReturnOpTry: 0,
    intlServiceTry: 0,
    penaltyTry: 0,
    paymentMethod: 'Kredi Kartı',
    cargoFeeRate: null,
    financeLoaded: false,
    estimatedEarningsTry: null,
    earningsEstimated: true,
    earningsStatus: 'eksik',
    cargoProvider: 'Aras',
    cargoTrackingNumber: null,
    cargoDeci: 1,
    cargoPayer: 'seller',
    ...over,
  };
}

function order(over: Partial<OrderListItem> = {}): OrderListItem {
  return {
    id: 'ty-9',
    organizationId: 'org',
    orderNumber: '11512925676',
    channel: 'trendyol',
    customerName: 'A',
    status: 'delivered',
    statusLabel: 'Tamamlandı',
    itemCount: 1,
    totalTry: 115,
    cargoDeadlineAt: null,
    cargoWarning: false,
    createdAt: '2026-02-10T12:00:00.000Z',
    lines: [],
    money: baseMoney(),
    ...over,
  };
}

describe('trendyol-finance', () => {
  it('nets the same as Trendyol panel: 115 − 18.40 − 57.99 − 13.19 = 25.42 and kesinleşti', () => {
    const map = new Map();
    ingestSettlementSale(map, {
      content: [
        {
          orderNumber: '11512925676',
          shipmentPackageId: 9,
          commissionAmount: 18.4,
          sellerRevenue: 96.6,
        },
      ],
    });
    ingestCargoInvoiceItems(map, {
      content: [
        {
          orderNumber: '11512925676',
          amount: 57.99,
          shipmentPackageType: 'Gönderi Kargo Bedeli',
        },
      ],
    });
    ingestOtherFinancials(map, {
      content: [
        {
          orderNumber: '11512925676',
          transactionType: 'DeductionInvoices',
          transactionSubType: 'PlatformServiceFee',
          description: 'Platform Hizmet Bedeli',
          debt: 13.19,
        },
      ],
    });
    expect(
      cargoInvoiceSerials({
        content: [{ id: 'INV-1', transactionType: 'Kargo Faturası' }],
      }),
    ).toEqual(['INV-1']);
    const next = applyFinanceAcc(baseMoney(), map.get('11512925676') ?? emptyFinance());
    expect(next.commissionTry).toBe(18.4);
    expect(next.cargoFeeTry).toBe(57.99);
    expect(next.cargoFeeSource).toBe('fatura');
    expect(next.serviceFeeTry).toBe(13.19);
    expect(next.serviceFeeSource).toBe('fatura');
    expect(next.cargoFeeRate).toBe(50.4);
    expect(next.estimatedEarningsTry).toBe(25.42);
    expect(next.earningsEstimated).toBe(false);
    expect(next.earningsStatus).toBe('kesinleşti');
    expect(next.financeLoaded).toBe(false);
  });

  it('does not double-count cargo when orderNumber and parcelUniqueId alias the same line', () => {
    const map = new Map();
    ingestCargoInvoiceItems(map, {
      content: [
        {
          orderNumber: '11512925676',
          parcelUniqueId: 7260001,
          amount: 57.99,
          shipmentPackageType: 'Gönderi Kargo Bedeli',
        },
      ],
    });
    const [row] = applyFinanceMap(
      [order({ money: baseMoney({ cargoTrackingNumber: '7260001' }) })],
      map,
    );
    expect(row.money?.cargoFeeTry).toBe(57.99);
    expect(row.money?.cargoFeeSource).toBe('fatura');
  });

  it('matches cargo invoice by shipmentPackageId', () => {
    const map = new Map();
    ingestCargoInvoiceItems(map, {
      content: [
        {
          shipmentPackageId: 9,
          amount: 57.99,
          shipmentPackageType: 'Gönderi Kargo Bedeli',
        },
      ],
    });
    const [row] = applyFinanceMap([order({ id: 'ty-9', money: baseMoney() })], map);
    expect(row.money?.cargoFeeTry).toBe(57.99);
  });

  it('skips PHB period split when n delivered orders do not match the invoice', () => {
    const map = new Map();
    const createdAt = '2026-02-10T12:00:00.000Z';
    const orders = [1, 2, 3, 4, 5, 6].map((n) =>
      order({
        id: `ty-${n}`,
        orderNumber: `o${n}`,
        createdAt,
      }),
    );
    allocatePhb(
      map,
      orders,
      [{ id: 'DDF', debt: 13.19, at: Date.parse('2026-02-20T00:00:00.000Z'), orderNumber: '', shipmentPackageId: '' }],
      13.19,
    );
    expect(map.get('o1')?.serviceFeeSource).toBeUndefined();
  });

  it('allocates PHB as fatura-tahsis when the period invoice is a single delivered order', () => {
    const map = new Map();
    allocatePhb(
      map,
      [order()],
      [
        {
          id: 'DDF2026021147851',
          debt: 13.19,
          at: Date.parse('2026-02-20T00:00:00.000Z'),
          orderNumber: '',
          shipmentPackageId: '',
        },
      ],
      13.19,
    );
    );
    const acc = map.get('11512925676');
    expect(acc?.serviceFeeTry).toBe(13.19);
    expect(acc?.serviceFeeSource).toBe('fatura-tahsis');
    const [row] = applyFinanceMap([order()], map);
    expect(row.money?.earningsStatus).toBe('eksik');
    expect(row.money?.serviceFeeSource).toBe('fatura-tahsis');
  });

  it('shows seller tariff as tahmini then replaces with fatura', () => {
    const tariff = normalizeTariff({
      cargoBands: [{ maxCustomerTry: 199.99, amountTry: 57.99 }],
      phbGrossTry: 13.19,
    });
    const estimated = applyFinanceMap([order()], new Map(), tariff)[0].money;
    expect(estimated?.cargoFeeTry).toBe(57.99);
    expect(estimated?.cargoFeeSource).toBe('tarife');
    expect(estimated?.cargoFeeLabel).toBe('tahmini (tarife)');
    expect(estimated?.serviceFeeTry).toBe(13.19);
    expect(estimated?.serviceFeeSource).toBe('tarife');
    expect(estimated?.estimatedEarningsTry).toBe(25.42);
    expect(estimated?.earningsStatus).toBe('tahmini');

    const map = new Map();
    ingestCargoInvoiceItems(map, {
      content: [{ orderNumber: '11512925676', amount: 57.99, shipmentPackageType: 'Gönderi Kargo Bedeli' }],
    });
    ingestOtherFinancials(map, {
      content: [
        {
          orderNumber: '11512925676',
          transactionType: 'DeductionInvoices',
          transactionSubType: 'PlatformServiceFee',
          debt: 13.19,
        },
      ],
    });
    const billed = applyFinanceMap([order({ money: estimated })], map, emptyTrendyolTariff())[0].money;
    expect(billed?.cargoFeeSource).toBe('fatura');
    expect(billed?.serviceFeeSource).toBe('fatura');
    expect(billed?.earningsStatus).toBe('kesinleşti');
    expect(billed?.estimatedEarningsTry).toBe(25.42);
  });

  it('keeps net empty when cargo invoice has no line for that order', () => {
    const map = new Map();
    ingestSettlementSale(map, {
      content: [{ orderNumber: '11512925676', commissionAmount: 18.4, sellerRevenue: 96.6 }],
    });
    const next = applyFinanceAcc(baseMoney(), map.get('11512925676') ?? emptyFinance());
    expect(next.commissionTry).toBe(18.4);
    expect(next.cargoFeeTry).toBeNull();
    expect(next.serviceFeeTry).toBeNull();
    expect(next.estimatedEarningsTry).toBeNull();
    expect(next.earningsEstimated).toBe(true);
    expect(next.earningsStatus).toBe('eksik');
  });

  it('uses DeliveryFee settlements when cargo-invoice items are missing', () => {
    const map = new Map();
    ingestSettlementDeliveryFee(map, {
      content: [{ orderNumber: '11512925676', debt: 57.99, description: 'Teslimat Ücreti' }],
    });
    expect(map.get('11512925676')?.cargoFeeTry).toBe(57.99);
    expect(map.get('11512925676')?.cargoFeeSource).toBe('settlement');
  });
});
