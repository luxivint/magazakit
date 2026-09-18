import { StyleSheet, Text } from 'react-native';

import { formatMoney } from '@/lib/money';
import { colors, fonts } from '@/theme/tokens';

export function MoneyText({
  value,
  size = 'body',
  onDark = false,
  digits,
}: {
  value: number;
  size?: 'display' | 'metric' | 'body';
  onDark?: boolean;
  digits?: number;
}) {
  const fraction = digits ?? (size === 'display' ? 0 : 2);
  return (
    <Text
      style={[
        size === 'display' && styles.display,
        size === 'metric' && styles.metric,
        size === 'body' && styles.body,
        { color: onDark ? colors.white : colors.ink },
      ]}>
      {formatMoney(value, fraction)}
    </Text>
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: fonts.extraBold,
    fontSize: 42,
    letterSpacing: -1.6,
    lineHeight: 46,
  },
  metric: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
