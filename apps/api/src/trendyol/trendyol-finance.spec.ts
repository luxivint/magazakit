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
    serviceFeeTry: null,
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
    cargoProvider: 'Aras',
    cargoTrackingNumber: null,
    cargoDeci: 1,
    cargoPayer: 'seller',
    ...over,
  };
}

describe('trendyol-finance', () => {
  it('nets the same as Trendyol panel: tutar - komisyon - kargo - platform hizmet', () => {
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
    expect(cargoInvoiceSerials({
      content: [{ id: 'INV-1', transactionType: 'Kargo Faturası' }],
    })).toEqual(['INV-1']);
    const next = applyFinanceAcc(baseMoney(), map.get('11512925676') ?? emptyFinance());
    expect(next.commissionTry).toBe(18.4);
    expect(next.cargoFeeTry).toBe(57.99);
    expect(next.serviceFeeTry).toBe(13.19);
    expect(next.cargoFeeRate).toBe(50.4);
    expect(next.estimatedEarningsTry).toBe(25.42);
    expect(next.earningsEstimated).toBe(false);
  });
});
