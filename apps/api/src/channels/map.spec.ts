import { pageItems } from './map';

describe('pageItems', () => {
  it('reads Çiçeksepeti supplierOrderListWithBranch', () => {
    const rows = pageItems({ supplierOrderListWithBranch: [{ orderNo: '1' }] });
    expect(rows).toHaveLength(1);
  });

  it('reads Hepsiburada listings envelope', () => {
    expect(pageItems({ listings: [{ merchantSku: 'A' }], totalCount: 1 })).toHaveLength(1);
  });
});
