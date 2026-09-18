import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, space } from '@/theme/tokens';

const MAIL = 'mailto:luxivint@gmail.com?subject=Mağazam%20destek';
const WHATSAPP = 'https://wa.me/?text=Mağazam%20destek';

export default function YardimScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>Yardım</Text>
          <Text style={styles.sub}>WhatsApp veya e-posta. Destek kuyruğu yok.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet}>
          <View style={styles.card}>
            <Text style={styles.name}>WhatsApp</Text>
            <Text style={styles.meta}>Sohbet uygulamasında açılır. Ticket açılmaz.</Text>
            <Button label="WhatsApp ile yaz" variant="lime" onPress={() => void Linking.openURL(WHATSAPP)} />
          </View>
          <View style={styles.card}>
            <Text style={styles.name}>E-posta</Text>
            <Text style={styles.meta}>luxivint@gmail.com</Text>
            <Button label="E-posta gönder" variant="ghost" onPress={() => void Linking.openURL(MAIL)} />
          </View>
        </ScrollView>
      </PorcelainSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite },
  back: { marginLeft: space.lg, width: 36, height: 36, justifyContent: 'center' },
  heroPad: { paddingHorizontal: space.xl, paddingBottom: 22, gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.white, letterSpacing: -0.8 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 8,
  },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
});
