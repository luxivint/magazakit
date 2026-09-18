import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/theme/tokens';

export function Button({
  label,
  onPress,
  variant = 'graphite',
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'graphite' | 'lime' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        variant === 'graphite' && styles.graphite,
        variant === 'lime' && styles.lime,
        variant === 'ghost' && styles.ghost,
      ]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={variant === 'lime' ? colors.graphite : variant === 'ghost' ? colors.ink : colors.white}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          variant === 'lime' && { color: colors.graphite },
          variant === 'ghost' && { color: colors.ink },
        ]}>
        {label}
      </Text>
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
  label: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.white,
  },
});
