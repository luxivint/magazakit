import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme/tokens';

export function Skeleton({ width, height, radius = 10 }: { width: number | `${number}%`; height: number; radius?: number }) {
  return (
    <View
      style={[
        styles.block,
        { width, height, borderRadius: radius },
      ]}
    />
  );
}

export function OrderSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={52} height={52} radius={radii.thumb} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="55%" height={12} />
        <Skeleton width="80%" height={10} />
        <Skeleton width="40%" height={10} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <Skeleton width={64} height={12} />
        <Skeleton width={72} height={28} radius={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.skeleton },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
