import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Sayfa bulunamadı</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Özete dön</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  link: { marginTop: 16 },
  linkText: { fontFamily: fonts.semibold, color: colors.ink },
});
