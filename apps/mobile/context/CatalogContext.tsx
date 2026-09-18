import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useMappings } from '@/context/MappingContext';
import { useShops } from '@/context/ShopContext';
import type { Order, Product } from '@/data/mock';
import type { OrderListItem, ProductListItem } from '@/lib/api';
import { clockNow } from '@/lib/clock';
import { API_URL, fetchHealth, fetchOrders, fetchProducts } from '@/lib/apiClient';
import { mapApiOrder, mapApiProduct } from '@/lib/mapCatalog';

export type CatalogSource = 'api' | 'none';

type CatalogContextValue = {
  source: CatalogSource;
  apiMock: boolean | null;
  apiUrl: string;
  reachable: boolean;
  loading: boolean;
  ingesting: boolean;
  error: string | null;
  needsShop: boolean;
  lastSync: string | null;
  products: Product[];
  orders: Order[];
  refresh: () => void;
  ingest: () => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { idToken, org } = useAuth();
  const { shops, loading: shopsLoading } = useShops();
  const { skuOf } = useMappings();
  const [source, setSource] = useState<CatalogSource>('none');
  const [apiMock, setApiMock] = useState<boolean | null>(null);
  const [reachable, setReachable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawProducts, setRawProducts] = useState<ProductListItem[]>([]);
  const [rawOrders, setRawOrders] = useState<OrderListItem[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const load = useCallback(async (fromIngest = false) => {
    if (!idToken || !org) {
      setRawProducts([]);
      setRawOrders([]);
      setSource('none');
      setReachable(false);
      setError(null);
      setLoading(false);
      setIngesting(false);
      return;
    }
    if (shopsLoading) {
      setLoading(true);
      return;
    }
    if (fromIngest) setIngesting(true);
    if (shops.length === 0) {
      setRawProducts([]);
      setRawOrders([]);
      setSource('none');
      setReachable(false);
      setError(null);
      setLoading(false);
      setIngesting(false);
      setApiMock(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const health = await fetchHealth();
      const [productPage, orderPage] = await Promise.all([
        fetchProducts(org.id),
        fetchOrders(org.id),
      ]);
      setReachable(true);
      setSource('api');
      setApiMock(health.mock ?? productPage.mock);
      setRawProducts(productPage.items);
      setRawOrders(orderPage.items);
      setLastSync(clockNow());
    } catch (e) {
      setReachable(false);
      setSource('none');
      setApiMock(null);
      setRawProducts([]);
      setRawOrders([]);
      setError(e instanceof Error ? e.message : 'Nest API yanıt vermedi.');
    } finally {
      setLoading(false);
      setIngesting(false);
    }
  }, [idToken, org, shops.length, shopsLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  const products = useMemo(
    () => rawProducts.map((item, i) => mapApiProduct(item, i, skuOf(item.id))),
    [rawProducts, skuOf],
  );
  const orders = useMemo(() => rawOrders.map(mapApiOrder), [rawOrders]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      source,
      apiMock,
      apiUrl: API_URL,
      reachable,
      loading,
      ingesting,
      error,
      needsShop: !shopsLoading && shops.length === 0,
      lastSync,
      products,
      orders,
      refresh: () => {
        void load();
      },
      ingest: async () => {
        await load(true);
      },
    }),
    [
      source,
      apiMock,
      reachable,
      loading,
      ingesting,
      error,
      shopsLoading,
      shops.length,
      lastSync,
      products,
      orders,
      load,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog CatalogProvider dışında');
  return ctx;
}
