import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export function ChipTabs({
  items,
  value,
  onChange,
}: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} style={styles.chip}>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            {active ? <View style={styles.underline} /> : <View style={styles.spacer} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 18, paddingHorizontal: 4 },
  chip: { alignItems: 'center', paddingBottom: 6 },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mutedOnDark,
  },
  labelActive: {
    color: colors.white,
    fontFamily: fonts.semibold,
  },
  underline: {
    marginTop: 6,
    height: 3,
    width: '100%',
    borderRadius: 2,
    backgroundColor: colors.lime,
  },
  spacer: { marginTop: 6, height: 3 },
});
