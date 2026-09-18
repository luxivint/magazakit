import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii } from '@/theme/tokens';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'stats-chart-outline',
  siparisler: 'cube-outline',
  urunler: 'grid-outline',
  hesap: 'person-outline',
};

const LABELS: Record<string, string> = {
  index: 'Özet',
  siparisler: 'Siparişler',
  urunler: 'Ürünler',
  hesap: 'Hesap',
};

type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

export function MagazamTabBar({
  state,
  descriptors,
  navigation,
}: {
  state: TabBarProps['state'];
  descriptors: TabBarProps['descriptors'];
  // Expo Router tab bar navigation is wider than the events we emit.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        if (!ICONS[route.name]) return null;
        const focused = state.index === index;
        const options = descriptors[route.key].options;
        const label = LABELS[route.name] ?? options.title ?? route.name;
        const icon = ICONS[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            style={[styles.item, focused && styles.itemActive]}>
            <Ionicons name={icon} size={18} color={focused ? colors.lime : colors.muted} />
            <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.porcelain,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.sheetLine,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  itemActive: {
    backgroundColor: colors.graphite,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  labelActive: {
    color: colors.white,
    fontFamily: fonts.semibold,
  },
});
