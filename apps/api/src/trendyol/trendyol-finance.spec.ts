import {
  applyFinanceAcc,
  cargoInvoiceSerials,
  emptyFinance,
  ingestCargoInvoiceItems,
  ingestOtherFinancials,
  ingestSettlementSale,
} from './trendyol-finance';
import type { OrderMoney } from '@magazakit/contracts';

function baseMoney(over: Partial<OrderMoney> = {}): OrderMoney {
  return {
    grossTry: 100,
    sellerDiscountTry: 0,
    tyDiscountTry: 0,
    customerTry: 100,
    commissionRate: 16,
    commissionTry: 16,
    commissionSource: 'package_rate',
    sgrFeeTry: 0,
    cargoFeeTry: null,
    cargoFeeLabel: null,
    serviceFeeTry: null,
    storeFeeTry: null,
    stoppageTry: null,
    sellerRevenueTry: null,
    estimatedEarningsTry: 84,
    earningsEstimated: true,
    cargoProvider: 'Aras',
    cargoTrackingNumber: null,
    cargoDeci: 1,
    cargoPayer: 'seller',
    ...over,
  };
}

describe('trendyol-finance', () => {
  it('matches Sale settlements by order number and cargo invoice items', () => {
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
          amount: 34.24,
          shipmentPackageType: 'Gönderi Kargo Bedeli',
        },
      ],
    });
    ingestOtherFinancials(map, {
      content: [
        {
          orderNumber: '11512925676',
          transactionType: 'Stopaj',
          debt: 2.1,
        },
      ],
    });
    expect(cargoInvoiceSerials({
      content: [{ id: 'INV-1', transactionType: 'Kargo Faturası' }],
    })).toEqual(['INV-1']);
    const next = applyFinanceAcc(baseMoney(), map.get('11512925676') ?? emptyFinance());
    expect(next.commissionSource).toBe('settlement');
    expect(next.commissionTry).toBe(18.4);
    expect(next.sellerRevenueTry).toBe(96.6);
    expect(next.cargoFeeTry).toBe(34.24);
    expect(next.cargoFeeLabel).toBe('Gönderi Kargo Bedeli');
    expect(next.stoppageTry).toBe(2.1);
    expect(next.estimatedEarningsTry).toBe(60.26);
  });
});
