/**
 * K01 mock channel stock write. Never reads TRENDYOL_API_KEY / secrets.
 * Negative intended qty is marked failed; everything else is mock-sent.
 */
export function mockTrendyolOutboxStatus(intendedQty: number): 'unknown' | 'failed' {
  return intendedQty < 0 ? 'failed' : 'unknown';
}
