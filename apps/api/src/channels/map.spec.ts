import { firstHttpImage, mapStatus, pageItems } from './map';

describe('pageItems', () => {
  it('reads Çiçeksepeti supplierOrderListWithBranch', () => {
    const rows = pageItems({ supplierOrderListWithBranch: [{ orderNo: '1' }] });
    expect(rows).toHaveLength(1);
  });

  it('reads Hepsiburada listings envelope', () => {
    expect(pageItems({ listings: [{ merchantSku: 'A' }], totalCount: 1 })).toHaveLength(1);
  });

  it('maps Shopify fulfillment states without treating unfulfilled as shipped', () => {
    expect(mapStatus('FULFILLED').status).toBe('shipped');
    expect(mapStatus('PARTIALLY_FULFILLED').status).toBe('picking');
    expect(mapStatus('UNFULFILLED').status).toBe('created');
    expect(mapStatus('SHIPPED').status).toBe('shipped');
    expect(mapStatus('PARTIALLY_SHIPPED').status).toBe('picking');
    expect(mapStatus('UNSHIPPED').status).toBe('created');
    expect(mapStatus('UNFULFILLABLE').status).toBe('cancelled');
  });

  it('picks the first http image from mixed envelopes', () => {
    expect(firstHttpImage(['https://cdn.example/a.jpg'], { url: 'https://cdn.example/b.jpg' })).toBe(
      'https://cdn.example/a.jpg',
    );
    expect(firstHttpImage({ listImageUrl: 'https://cdn.example/c.jpg' })).toBe(
      'https://cdn.example/c.jpg',
    );
  });
});
