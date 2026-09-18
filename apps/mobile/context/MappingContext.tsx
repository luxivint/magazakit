import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';

type MappingTable = Record<string, string>;

type MappingContextValue = {
  ready: boolean;
  skuOf: (listingId: string) => string | undefined;
  setSku: (listingId: string, sku: string) => void;
  mappedCount: number;
};

const MappingContext = createContext<MappingContextValue | null>(null);

function storageKey(orgId: string) {
  return `magazam.skuMap.${orgId}`;
}

export function MappingProvider({ children }: { children: ReactNode }) {
  const { org } = useAuth();
  const [table, setTable] = useState<MappingTable>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!org?.id) {
        setTable({});
        setReady(true);
        return;
      }
      setReady(false);
      try {
        const raw = await AsyncStorage.getItem(storageKey(org.id));
        if (!cancelled) setTable(raw ? (JSON.parse(raw) as MappingTable) : {});
      } catch {
        if (!cancelled) setTable({});
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [org?.id]);

  const persist = useCallback(
    async (next: MappingTable) => {
      if (!org?.id) return;
      await AsyncStorage.setItem(storageKey(org.id), JSON.stringify(next));
    },
    [org?.id],
  );

  const value = useMemo<MappingContextValue>(
    () => ({
      ready,
      skuOf: (listingId) => table[listingId],
      setSku: (listingId, sku) => {
        setTable((prev) => {
          const next = { ...prev };
          const trimmed = sku.trim();
          if (!trimmed) delete next[listingId];
          else next[listingId] = trimmed;
          void persist(next);
          return next;
        });
      },
      mappedCount: Object.keys(table).length,
    }),
    [ready, table, persist],
  );

  return <MappingContext.Provider value={value}>{children}</MappingContext.Provider>;
}

export function useMappings() {
  const ctx = useContext(MappingContext);
  if (!ctx) throw new Error('useMappings MappingProvider dışında');
  return ctx;
}
