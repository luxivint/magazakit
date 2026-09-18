import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { ApiError, connectTrendyolShop, fetchShops, type ShopStatus } from '@/lib/apiClient';

type ShopContextValue = {
  shops: ShopStatus[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  connectMock: (sellerId?: string) => Promise<ShopStatus>;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { idToken, org } = useAuth();
  const [shops, setShops] = useState<ShopStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!idToken || !org) {
      setShops([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await fetchShops();
      setShops(page.items);
      setError(null);
    } catch (e) {
      setShops([]);
      setError(e instanceof ApiError ? e.message : 'Mağazalar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken, org, tick]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<ShopContextValue>(
    () => ({
      shops,
      loading,
      error,
      refresh: () => setTick((n) => n + 1),
      connectMock: async (sellerId) => {
        const shop = await connectTrendyolShop(sellerId);
        setShops([shop]);
        setError(null);
        return shop;
      },
    }),
    [shops, loading, error],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShops() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShops ShopProvider dışında');
  return ctx;
}
