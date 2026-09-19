/** UI buckets must match apps/mobile/lib/mapCatalog.ts mapStatus. */
function uiBucket(status: string, label: string): 'hazirlanacak' | 'kargoda' | 'tamamlandi' | 'iade' {
  const raw = status.trim().toLowerCase();
  const text = label.trim().toLowerCase();
  if (raw === 'delivered' || text === 'teslim' || text === 'tamamlandı' || text === 'tamamlandi') {
    return 'tamamlandi';
  }
  if (raw === 'shipped' || text === 'kargoda' || text === 'teslim noktasında') {
    return 'kargoda';
  }
  if (raw === 'cancelled' || text === 'iade' || text === 'iptal' || text === 'teslim edilemedi') {
    return 'iade';
  }
  return 'hazirlanacak';
}

describe('ui order buckets', () => {
  it('does not count Teslim as kargoda', () => {
    expect(uiBucket('delivered', 'Teslim')).toBe('tamamlandi');
    expect(uiBucket('shipped', 'Teslim')).toBe('tamamlandi');
    expect(uiBucket('shipped', 'Kargoda')).toBe('kargoda');
    expect(uiBucket('picking', 'Hazırlanacak')).toBe('hazirlanacak');
  });
});
