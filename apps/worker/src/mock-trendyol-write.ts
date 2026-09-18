/**
 * K01 mock Trendyol stock write. Never reads marketplace secrets.
 */
export function mockTrendyolOutboxStatus(intendedQty: number): 'sent' | 'failed' {
  return intendedQty < 0 ? 'failed' : 'sent';
}
