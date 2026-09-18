import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerDevice } from '@/lib/apiClient';

const TOKEN_KEY = 'magazam.push.token.v1';

export type SavedPushToken = {
  expo?: string;
  device?: string;
  permission: string;
  savedAt: string;
};

export async function loadSavedPushToken(): Promise<SavedPushToken | null> {
  const raw = await AsyncStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedPushToken;
  } catch {
    return null;
  }
}

/** Request OS permission and persist Expo/FCM token. Does not open a ticket inbox. */
export async function registerForPush(): Promise<SavedPushToken> {
  const saved: SavedPushToken = {
    permission: 'undetermined',
    savedAt: new Date().toISOString(),
  };

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    saved.permission = status;

    if (status === 'granted') {
      if (Platform.OS !== 'web') {
        try {
          const expo = await Notifications.getExpoPushTokenAsync();
          saved.expo = expo.data;
        } catch {
          /* projectId yoksa native token yine denenebilir */
        }
      }
      if (Platform.OS === 'web' || Device.isDevice) {
        try {
          const device = await Notifications.getDevicePushTokenAsync();
          saved.device = typeof device.data === 'string' ? device.data : JSON.stringify(device.data);
        } catch {
          /* web / Expo Go’da FCM token gelmeyebilir */
        }
      }
    }
  } catch {
    saved.permission = 'denied';
  }

  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(saved));
  return saved;
}

/** Ask permission, then POST /v1/devices { fcmToken } when a token exists. */
export async function syncPushDevice(): Promise<void> {
  const saved = await registerForPush();
  const fcmToken = saved.device || saved.expo;
  if (!fcmToken) return;
  try {
    await registerDevice(fcmToken);
  } catch {
    /* lite: kayıt olmazsa uygulama durmaz */
  }
}
