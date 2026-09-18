import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

type MessagingDefault = typeof import('@react-native-firebase/messaging').default;

/**
 * Native FCM (@react-native-firebase/messaging) is only in EAS / expo-dev-client.
 * Expo Go and web must not evaluate that module — it throws on import.
 */
export function canUseNativeFcm(): boolean {
  if (Platform.OS === 'web') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  const native = NativeModules as Record<string, unknown>;
  return Boolean(native.RNFBAppModule);
}

export function getNativeMessaging(): MessagingDefault | null {
  if (!canUseNativeFcm()) return null;
  try {
    // Static string so Metro bundles the native module for device builds,
    // but the factory only runs when RNFB is actually linked.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('@react-native-firebase/messaging') as {
      default?: MessagingDefault;
    };
    return loaded.default ?? null;
  } catch {
    return null;
  }
}
