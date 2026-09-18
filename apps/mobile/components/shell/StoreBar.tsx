import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, space } from '@/theme/tokens';

export function StoreBar() {
  return (
    <View style={styles.row}>
      <Pressable style={styles.store} accessibilityRole="button" accessibilityLabel="Mağaza seç">
        <View style={styles.logoMark}>
          <Ionicons name="storefront" size={14} color={colors.graphite} />
        </View>
        <Text style={styles.storeName}>Mağazam</Text>
        <Ionicons name="chevron-down" size={14} color={colors.mutedOnDark} />
      </Pressable>
      <View style={styles.actions}>
        <Pressable style={styles.bell} accessibilityLabel="Bildirimler — F3 sonrası">
          <Ionicons name="notifications-outline" size={20} color={colors.white} />
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AY</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  store: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.graphite,
  },
});
