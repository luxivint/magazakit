import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export function ChannelBadge({ channel = 'trendyol' }: { channel?: 'trendyol' }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <Text style={styles.letter}>t</Text>
      </View>
      <Text style={styles.label}>{channel === 'trendyol' ? 'Trendyol' : channel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.trendyol,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 10,
    marginTop: -1,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
});
