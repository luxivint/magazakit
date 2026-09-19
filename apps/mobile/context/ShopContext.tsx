import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { ApiError, connectShop, fetchShops, type ShopStatus } from '@/lib/apiClient';
import type { Channel, ShopConnectRequest } from '@/lib/api';

type ShopContextValue = {
  shops: ShopStatus[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  connectMock: (sellerId?: string) => Promise<ShopStatus>;
  connectChannel: (channel: Channel, body?: ShopConnectRequest | string) => Promise<ShopStatus>;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { idToken, org } = useAuth();
  const [shops, setShops] = useState<ShopStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async (silent = false) => {
    if (!idToken || !org) {
      setShops([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const page = await fetchShops();
      setShops(page.items);
      setError(null);
    } catch (e) {
      setShops([]);
      setError(e instanceof ApiError ? e.message : 'Mağazalar yüklenemedi.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [idToken, org, tick]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!idToken || !org) return;
    const id = setInterval(() => void load(true), 60_000);
    return () => clearInterval(id);
  }, [idToken, org, load]);

  const value = useMemo<ShopContextValue>(
    () => ({
      shops,
      loading,
      error,
      refresh: () => setTick((n) => n + 1),
      connectMock: async (sellerId) => {
        const shop = await connectShop('trendyol', sellerId ? { sellerId } : {});
        setShops((prev) => [...prev.filter((s) => s.id !== shop.id), shop]);
        setError(null);
        return shop;
      },
      connectChannel: async (channel, body) => {
        const payload: ShopConnectRequest = typeof body === 'string' ? { sellerId: body } : (body ?? {});
        const shop = await connectShop(channel, payload);
        setShops((prev) => [...prev.filter((s) => s.id !== shop.id), shop]);
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
