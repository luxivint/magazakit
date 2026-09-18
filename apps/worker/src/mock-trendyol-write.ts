/**
 * K01 mock Trendyol stock write. Never reads marketplace secrets.
 */
export function mockTrendyolOutboxStatus(intendedQty: number): 'unknown' | 'failed' {
  return intendedQty < 0 ? 'failed' : 'unknown';
}
