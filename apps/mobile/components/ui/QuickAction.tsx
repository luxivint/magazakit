import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export function QuickAction({
  label,
  icon,
  lime = false,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  lime?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.wrap} onPress={onPress}>
      <View style={[styles.circle, lime ? styles.lime : styles.dark]}>
        <Ionicons name={icon} size={20} color={lime ? colors.graphite : colors.white} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: 92, gap: 8 },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lime: { backgroundColor: colors.lime },
  dark: { backgroundColor: '#2A2F30' },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.mutedOnDark,
    textAlign: 'center',
  },
});
