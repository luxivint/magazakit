import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/theme/tokens';

export function ConfigBanner({ text }: { text: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FBDFD1',
    borderRadius: radii.card,
    padding: 12,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#7A4A32',
    lineHeight: 18,
  },
});
