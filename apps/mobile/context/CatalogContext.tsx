import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { orders as localOrders, products as localProducts, type Order, type Product } from '@/data/mock';
import { API_URL, fetchHealth, fetchOrders, fetchProducts } from '@/lib/apiClient';
import { mapApiOrder, mapApiProduct } from '@/lib/mapCatalog';

export type CatalogSource = 'api' | 'local';

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
  const [source, setSource] = useState<CatalogSource>('local');
  const [apiMock, setApiMock] = useState<boolean | null>(null);
  const [reachable, setReachable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(localProducts);
  const [orders, setOrders] = useState<Order[]>(localOrders);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 2500);
    try {
      const health = await fetchHealth(ac.signal);
      const [productPage, orderPage] = await Promise.all([fetchProducts(), fetchOrders()]);
      setReachable(true);
      setSource('api');
      setApiMock(health.mock ?? productPage.mock);
      setProducts(productPage.items.map(mapApiProduct));
      setOrders(orderPage.items.map(mapApiOrder));
    } catch {
      setReachable(false);
      setSource('local');
      setApiMock(null);
      setProducts(localProducts);
      setOrders(localOrders);
      setError('Nest API yanıt vermedi; yerel örnek kullanılıyor.');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, tick]);

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
