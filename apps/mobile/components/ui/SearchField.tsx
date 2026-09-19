import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radii } from '@/theme/tokens';

export function SearchField({
  placeholder,
  variant = 'dark',
  value,
  onChangeText,
}: {
  placeholder: string;
  variant?: 'dark' | 'light';
  value?: string;
  onChangeText?: (text: string) => void;
}) {
  const dark = variant === 'dark';
  return (
    <View style={[styles.wrap, dark ? styles.dark : styles.light]}>
      <Ionicons name="search" size={16} color={dark ? colors.mutedOnDark : colors.muted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={dark ? '#8A908A' : colors.muted}
        style={[styles.input, { color: dark ? colors.white : colors.ink }]}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: radii.search,
  },
  dark: { backgroundColor: '#2A2F30' },
  light: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sheetLine },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingVertical: 0,
  },
});
