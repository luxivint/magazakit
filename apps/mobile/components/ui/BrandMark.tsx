import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons name="storefront" size={compact ? 16 : 18} color={colors.graphite} />
      </View>
      <Text style={[styles.word, compact && { fontSize: 16 }]}>mağazam</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.white,
    letterSpacing: -0.4,
  },
});
