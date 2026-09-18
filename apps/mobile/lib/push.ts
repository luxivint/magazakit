import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

/** Request OS permission and persist Expo/FCM token. Does not send notifications. */
export async function registerForPush(): Promise<SavedPushToken> {
  if (Platform.OS === 'web') {
    const saved: SavedPushToken = {
      permission: 'denied',
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(saved));
    return saved;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }

  const saved: SavedPushToken = {
    permission: status,
    savedAt: new Date().toISOString(),
  };

  if (status === 'granted' && Device.isDevice) {
    try {
      const expo = await Notifications.getExpoPushTokenAsync();
      saved.expo = expo.data;
    } catch {
      // Expo projectId yoksa native token yine alınabilir
    }
    try {
      const device = await Notifications.getDevicePushTokenAsync();
      saved.device = typeof device.data === 'string' ? device.data : JSON.stringify(device.data);
    } catch {
      // google-services yoksa Expo Go'da FCM token gelmez
    }
  }

  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(saved));
  return saved;
}
