import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { colors, fonts, radii } from '@/theme/tokens';

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  hint,
  keyboardType,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error ? styles.fieldError : null]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.input}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((v) => !v)} accessibilityLabel="Şifreyi göster">
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  field: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldError: { borderColor: '#C45C4A' },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 10,
  },
  error: { fontFamily: fonts.medium, fontSize: 12, color: '#C45C4A' },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
