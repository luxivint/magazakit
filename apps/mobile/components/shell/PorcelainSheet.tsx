import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme/tokens';

export function PorcelainSheet({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.porcelain,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    marginTop: -6,
    overflow: 'hidden',
  },
});
