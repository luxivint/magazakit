import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radii } from '@/theme/tokens';

export function Button({
  label,
  onPress,
  variant = 'graphite',
  icon,
  trailing,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'graphite' | 'lime' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  trailing?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
}) {
  const fg = variant === 'lime' || variant === 'ghost' ? colors.graphite : colors.white;
  const ghostFg = variant === 'ghost' ? colors.ink : fg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        variant === 'graphite' && styles.graphite,
        variant === 'lime' && styles.lime,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={ghostFg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={16} color={ghostFg} /> : null}
          <Text style={[styles.label, { color: ghostFg }]}>{label}</Text>
          {trailing ? <Ionicons name={trailing} size={16} color={ghostFg} /> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radii.button,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  graphite: { backgroundColor: colors.graphite },
  lime: { backgroundColor: colors.lime },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.4,
    borderColor: colors.ink,
  },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
});
