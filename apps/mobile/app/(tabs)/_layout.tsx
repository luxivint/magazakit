import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { MagazamTabBar } from '@/components/shell/TabBar';

export default function TabLayout() {
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
      </Tabs>
    </>
  );
}
