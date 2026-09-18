import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { syncPushDevice } from '@/lib/push';

/** Requests notification permission and registers FCM with Nest when signed in. */
export function PushRegistrar() {
  const { idToken, user } = useAuth();

  useEffect(() => {
    if (!idToken || !user) return;
    let cancelled = false;
    void (async () => {
      await syncPushDevice();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [idToken, user?.uid]);

  return null;
}
