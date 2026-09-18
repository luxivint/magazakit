import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { subscribeFcmTokenRefresh, syncPushDevice } from '@/lib/push';

/** Requests notification permission and registers FCM with Nest when signed in. */
export function PushRegistrar() {
  const { idToken, user } = useAuth();

  useEffect(() => {
    if (!idToken || !user) return;
    const timer = setTimeout(() => {
      void syncPushDevice();
    }, 2000);
    const unsub = subscribeFcmTokenRefresh();
    return () => {
      clearTimeout(timer);
      unsub?.();
    };
  }, [idToken, user?.uid]);

  return null;
}
