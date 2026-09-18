import { Redirect, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { MagazamTabBar } from '@/components/shell/TabBar';
import { useAuth } from '@/context/AuthContext';

export default function TabLayout() {
  const { ready, user, orgName } = useAuth();
  if (!ready) return null;
  if (!user) return <Redirect href="/(auth)/giris" />;
  if (!orgName) return <Redirect href="/(auth)/isletme" />;
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        tabBar={(props) => (
          <MagazamTabBar
            state={props.state}
            descriptors={props.descriptors}
            navigation={props.navigation}
          />
        )}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen name="index" options={{ title: 'Özet' }} />
        <Tabs.Screen name="siparisler" options={{ title: 'Siparişler' }} />
        <Tabs.Screen name="urunler" options={{ title: 'Ürünler' }} />
        <Tabs.Screen name="hesap" options={{ title: 'Hesap' }} />
        <Tabs.Screen name="magazalar" options={{ href: null, title: 'Mağazalarım' }} />
        <Tabs.Screen name="magaza-bagla" options={{ href: null, title: 'Mağaza bağla' }} />
      </Tabs>
    </>
  );
}
