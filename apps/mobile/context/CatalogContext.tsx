import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { Order, Product } from '@/data/mock';
import { API_URL, fetchHealth, fetchOrders, fetchProducts } from '@/lib/apiClient';
import { mapApiOrder, mapApiProduct } from '@/lib/mapCatalog';

export type CatalogSource = 'api' | 'none';

type CatalogContextValue = {
  source: CatalogSource;
  apiMock: boolean | null;
  apiUrl: string;
  reachable: boolean;
  loading: boolean;
  error: string | null;
  products: Product[];
  orders: Order[];
  refresh: () => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { idToken, org } = useAuth();
  const [source, setSource] = useState<CatalogSource>('none');
  const [apiMock, setApiMock] = useState<boolean | null>(null);
  const [reachable, setReachable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!idToken) {
      setProducts([]);
      setOrders([]);
      setSource('none');
      setReachable(false);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const health = await fetchHealth();
      const [productPage, orderPage] = await Promise.all([
        fetchProducts(org?.id),
        fetchOrders(org?.id),
      ]);
      setReachable(true);
      setSource('api');
      setApiMock(health.mock ?? productPage.mock);
      setProducts(productPage.items.map(mapApiProduct));
      setOrders(orderPage.items.map(mapApiOrder));
    } catch (e) {
      setReachable(false);
      setSource('none');
      setApiMock(null);
      setProducts([]);
      setOrders([]);
      setError(e instanceof Error ? e.message : 'Nest API yanıt vermedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken, org?.id, tick]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      source,
      apiMock,
      apiUrl: API_URL,
      reachable,
      loading,
      error,
      products,
      orders,
      refresh: () => setTick((n) => n + 1),
    }),
    [source, apiMock, reachable, loading, error, products, orders],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog CatalogProvider dışında');
  return ctx;
}
