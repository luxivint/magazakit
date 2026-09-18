import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { useDemoState, type DemoState } from '@/context/DemoStateContext';
import { colors, fonts, radii, space } from '@/theme/tokens';

const STATES: { key: DemoState; label: string; hint: string }[] = [
  { key: 'sample', label: 'Örnek veri', hint: 'PDF telefonlarındaki Trendyol örnekleri' },
  { key: 'empty', label: 'Boş', hint: 'E-34 — sipariş/ürün yok' },
  { key: 'loading', label: 'Yükleniyor', hint: 'E-35 — iskelet' },
  { key: 'error', label: 'Hata', hint: 'E-36 — yükleme hatası, sipariş yok değil' },
];

export default function HesapScreen() {
  const { state, setState } = useDemoState();

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>Hesap</Text>
          <Text style={styles.sub}>F0 iskelet — ekip, abonelik ve Pro gizli</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        <View style={styles.sheet}>
          <Text style={styles.section}>Önizleme durumları</Text>
          <Text style={styles.body}>
            API bağlanmadan Özet, Siparişler ve Ürünler ekranlarının örnek / boş / yükleniyor / hata hallerini buradan değiştir.
          </Text>
          {STATES.map((item) => {
            const active = item.key === state;
            return (
              <Pressable
                key={item.key}
                onPress={() => setState(item.key)}
                style={[styles.card, active && styles.cardOn]}>
                <Text style={[styles.cardTitle, active && styles.cardTitleOn]}>{item.label}</Text>
                <Text style={styles.cardHint}>{item.hint}</Text>
              </Pressable>
            );
          })}
        </View>
      </PorcelainSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite },
  heroPad: { paddingHorizontal: space.xl, paddingBottom: 24 },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.white, letterSpacing: -0.8 },
  sub: { fontFamily: fonts.medium, fontSize: 14, color: colors.mutedOnDark, marginTop: 6 },
  sheet: { padding: space.xl, gap: 10 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 8 },
  card: {
    borderRadius: radii.card,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
  cardOn: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  cardTitleOn: { color: colors.graphite },
  cardHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
});
