import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/theme/tokens';

export function PeachAlert({ text }: { text: string }) {
  return (
    <Pressable style={styles.row} accessibilityRole="button">
      <View style={styles.icon}>
        <Ionicons name="time-outline" size={16} color={colors.peachText} />
      </View>
      <Text style={styles.text}>{text}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.peachText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.peach,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  icon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.peachText,
  },
});
