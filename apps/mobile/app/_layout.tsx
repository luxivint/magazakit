import 'react-native-gesture-handler';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/context/AuthContext';
import { CatalogProvider } from '@/context/CatalogContext';
import { MappingProvider } from '@/context/MappingContext';
import { ShopProvider } from '@/context/ShopContext';
import { PushRegistrar } from '@/components/shell/PushRegistrar';
import { colors } from '@/theme/tokens';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ShopProvider>
            <MappingProvider>
              <CatalogProvider>
                <PushRegistrar />
                <View style={styles.frame}>
                  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.graphite } }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="urun/[id]" />
                    <Stack.Screen name="urun/yeni" />
                    <Stack.Screen name="urun/duzenle/[id]" />
                    <Stack.Screen name="siparis/[id]" />
                  </Stack>
                </View>
              </CatalogProvider>
            </MappingProvider>
          </ShopProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.graphite,
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 390,
          width: '100%',
          alignSelf: 'center',
          minHeight: '100%',
          boxShadow: '0 18px 60px rgba(0,0,0,0.28)',
        }
      : null),
  },
});
