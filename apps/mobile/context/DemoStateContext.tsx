import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type DemoState = 'sample' | 'empty' | 'loading' | 'error';

type DemoStateContextValue = {
  state: DemoState;
  setState: (state: DemoState) => void;
};

const DemoStateContext = createContext<DemoStateContextValue | null>(null);

export function DemoStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>('sample');
  const value = useMemo(() => ({ state, setState }), [state]);
  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>;
}

export function useDemoState() {
  const ctx = useContext(DemoStateContext);
  if (!ctx) {
    throw new Error('useDemoState DemoStateProvider dışında kullanıldı');
  }
  return ctx;
}
