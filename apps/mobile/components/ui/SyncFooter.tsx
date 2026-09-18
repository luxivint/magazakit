import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export function SyncFooter({
  stores,
  time,
}: {
  stores?: number;
  time: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.dot} />
        <Text style={styles.text}>
          {stores != null ? `${stores} mağaza bağlı · ` : ''}Son eşitleme {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
});
