import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';
import { ApiError, fetchMappings, upsertMapping, type ListingMapping } from '@/lib/apiClient';

type MappingContextValue = {
  ready: boolean;
  error: string | null;
  items: ListingMapping[];
  skuOf: (listingId: string) => string | undefined;
  saveSku: (listingId: string, sku: string) => Promise<ListingMapping>;
  refresh: () => Promise<void>;
  mappedCount: number;
};

const MappingContext = createContext<MappingContextValue | null>(null);

export function MappingProvider({ children }: { children: ReactNode }) {
  const { idToken, org } = useAuth();
  const [items, setItems] = useState<ListingMapping[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idToken || !org) {
      setItems([]);
      setError(null);
      setReady(true);
      return;
    }
    try {
      const page = await fetchMappings();
      setItems(page.items);
      setError(null);
    } catch (e) {
      setItems([]);
      setError(e instanceof ApiError ? e.message : 'Eşleştirmeler yüklenemedi.');
    } finally {
      setReady(true);
    }
  }, [idToken, org]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<MappingContextValue>(
    () => ({
      ready,
      error,
      items,
      skuOf: (listingId) => items.find((m) => m.listingId === listingId)?.sku,
      saveSku: async (listingId, sku) => {
        const saved = await upsertMapping(listingId, sku.trim());
        setItems((prev) => {
          const rest = prev.filter((m) => m.listingId !== saved.listingId);
          return [...rest, saved];
        });
        setError(null);
        return saved;
      },
      refresh: load,
      mappedCount: items.length,
    }),
    [ready, error, items, load],
  );

  return <MappingContext.Provider value={value}>{children}</MappingContext.Provider>;
}

export function useMappings() {
  const ctx = useContext(MappingContext);
  if (!ctx) throw new Error('useMappings MappingProvider dışında');
  return ctx;
}
