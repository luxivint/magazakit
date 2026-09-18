import AsyncStorage from '@react-native-async-storage/async-storage';

import { registerDevice } from '@/lib/apiClient';
import { getNativeMessaging } from '@/lib/fcm';

const TOKEN_KEY = 'magazam.push.token.v1';

export type SavedPushToken = {
  fcm?: string;
  permission: string;
  savedAt: string;
};

function persist(saved: SavedPushToken): Promise<void> {
  return AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(saved));
}

export async function loadSavedPushToken(): Promise<SavedPushToken | null> {
  const raw = await AsyncStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedPushToken;
  } catch {
    return null;
  }
}

function isPermissionGranted(
  messaging: NonNullable<ReturnType<typeof getNativeMessaging>>,
  status: number,
): boolean {
  const auth = messaging.AuthorizationStatus;
  return status === auth.AUTHORIZED || status === auth.PROVISIONAL || status === auth.EPHEMERAL;
}

/** Request OS permission and persist the FCM token. Does not open a ticket inbox. */
export async function registerForPush(): Promise<SavedPushToken> {
  const saved: SavedPushToken = {
    permission: 'undetermined',
    savedAt: new Date().toISOString(),
  };

  const messaging = getNativeMessaging();
  if (!messaging) {
    saved.permission = 'unavailable';
    await persist(saved);
    return saved;
  }

  try {
    const instance = messaging();
    if (!instance.isDeviceRegisteredForRemoteMessages) {
      await instance.registerDeviceForRemoteMessages();
    }
    const status = await instance.requestPermission();
    saved.permission = isPermissionGranted(messaging, status) ? 'granted' : 'denied';
    if (saved.permission === 'granted') {
      saved.fcm = await instance.getToken();
    }
  } catch {
    saved.permission = 'denied';
  }

  await persist(saved);
  return saved;
}

/** Ask permission, then POST /v1/devices { fcmToken } when a real FCM token exists. */
export async function syncPushDevice(): Promise<void> {
  const saved = await registerForPush();
  if (!saved.fcm) return;
  try {
    await registerDevice(saved.fcm);
  } catch {
    /* lite: kayıt olmazsa uygulama durmaz */
  }
}

/** Keep Nest in sync when FCM rotates the token. No-op in Expo Go / web. */
export function subscribeFcmTokenRefresh(): (() => void) | undefined {
  const messaging = getNativeMessaging();
  if (!messaging) return undefined;
  try {
    return messaging().onTokenRefresh((token) => {
      void (async () => {
        const prev = (await loadSavedPushToken()) ?? {
          permission: 'granted',
          savedAt: new Date().toISOString(),
        };
        prev.fcm = token;
        prev.savedAt = new Date().toISOString();
        await persist(prev);
        try {
          await registerDevice(token);
        } catch {
          /* lite */
        }
      })();
    });
  } catch {
    return undefined;
  }
}

(() => {
  const messaging = getNativeMessaging();
  if (!messaging) return;
  try {
    messaging().setBackgroundMessageHandler(async () => undefined);
  } catch {
    /* Expo Go / web */
  }
})();
