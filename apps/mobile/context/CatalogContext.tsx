import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useShops } from '@/context/ShopContext';
import type { Order, Product } from '@/data/mock';
import type { OrderListItem, ProductListItem, ShopSyncResult } from '@/lib/api';
import { API_URL, ApiError, fetchHealth, fetchOrders, fetchProducts, syncShop } from '@/lib/apiClient';
import { attachOrderCatalogImages, mapApiOrder, mapApiProduct } from '@/lib/mapCatalog';

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
  lastIngest: ShopSyncResult | null;
  products: Product[];
  orders: Order[];
  refresh: () => void;
  ingest: () => Promise<ShopSyncResult>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

function clockFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { idToken, org } = useAuth();
  const { shops, loading: shopsLoading, refresh: refreshShops } = useShops();
  const [source, setSource] = useState<CatalogSource>('none');
  const [apiMock, setApiMock] = useState<boolean | null>(null);
  const [reachable, setReachable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawProducts, setRawProducts] = useState<ProductListItem[]>([]);
  const [rawOrders, setRawOrders] = useState<OrderListItem[]>([]);
  const [lastIngest, setLastIngest] = useState<ShopSyncResult | null>(null);

  const load = useCallback(async () => {
    if (!idToken || !org) {
      setRawProducts([]);
      setRawOrders([]);
      setSource('none');
      setReachable(false);
      setError(null);
      setLoading(false);
      return;
    }
    if (shopsLoading) {
      setLoading(true);
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
    } catch (e) {
      setReachable(false);
      setSource('none');
      setApiMock(null);
      setRawProducts([]);
      setRawOrders([]);
      setError(e instanceof Error ? e.message : 'Sunucu yanıt vermedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken, org, shopsLoading]);

  useEffect(() => {
    void load();
  }, [load, shops.length]);

  const products = useMemo(() => rawProducts.map(mapApiProduct), [rawProducts]);
  const orders = useMemo(
    () => attachOrderCatalogImages(rawOrders.map(mapApiOrder), products),
    [rawOrders, products],
  );
  const lastSync = clockFromIso(lastIngest?.lastSyncAt ?? shops[0]?.lastSyncAt);

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
      lastIngest,
      products,
      orders,
      refresh: () => {
        void load();
      },
      ingest: async () => {
        const shop = shops[0];
        if (!shop) {
          throw new ApiError('Önce mağaza bağla.', 400);
        }
        setIngesting(true);
        setError(null);
        try {
          const result = await syncShop(shop.id);
          setLastIngest(result);
          refreshShops();
          await load();
          return result;
        } catch (e) {
          const message = e instanceof Error ? e.message : 'İçeri alma tamamlanmış sayılmaz.';
          setError(message);
          throw e instanceof Error ? e : new Error(message);
        } finally {
          setIngesting(false);
        }
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
      shops,
      lastSync,
      lastIngest,
      products,
      orders,
      load,
      refreshShops,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog CatalogProvider dışında');
  return ctx;
}
