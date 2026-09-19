import { parseShopConnect } from './shop-secrets';

describe('parseShopConnect', () => {
  it('requires Hepsiburada merchant + key/secret', () => {
    expect(() => parseShopConnect('hepsiburada', { sellerId: 'm1' })).toThrow();
    const secrets = parseShopConnect('hepsiburada', {
      merchantId: 'm1',
      apiKey: 'k',
      apiSecret: 's',
    });
    expect(secrets.sellerId).toBe('m1');
    expect(secrets.apiKey).toBe('k');
  });
});
