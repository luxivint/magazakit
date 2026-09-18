import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { useAuth } from '@/context/AuthContext';
import { fetchBillingPlans, type BillingPlan } from '@/lib/apiClient';
import { formatMoney } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

const LOCAL_PLANS: BillingPlan[] = [
  { id: 'baslangic', name: 'Başlangıç', priceTry: 499, period: 'ay', blurb: 'Tek mağaza, paketleme.' },
  { id: 'buyume', name: 'Büyüme', priceTry: 999, period: 'ay', blurb: 'Ekip daveti, raporlar.' },
  { id: 'olcek', name: 'Ölçek', priceTry: 1999, period: 'ay', blurb: 'Çok mağaza, öncelikli destek.' },
];

export default function AbonelikScreen() {
  const { idToken } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>(LOCAL_PLANS);
  const [fromApi, setFromApi] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!idToken) return;
    void fetchBillingPlans()
      .then((page) => {
        if (page.source === 'api' && page.items.length) {
          setPlans(page.items);
          setFromApi(true);
        }
      })
      .catch(() => {
        /* paket kartları yerelde durur; ücret alınmaz */
      });
  }, [idToken]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>Abonelik</Text>
          <Text style={styles.sub}>Paketler. Ödeme yok, uygulama içi satın alma yok.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet}>
          {note ? <ConfigBanner text={note} /> : null}
          {fromApi ? <Text style={styles.meta}>Paketler sunucudan.</Text> : null}
          {plans.map((plan, i) => (
            <View key={plan.id} style={[styles.card, i === 1 && styles.featured]}>
              <Text style={styles.name}>{plan.name}</Text>
              <Text style={styles.price}>
                {formatMoney(plan.priceTry, 0)}
                <Text style={styles.period}>/{plan.period ?? 'ay'}</Text>
              </Text>
              <Text style={styles.meta}>{plan.blurb ?? 'Özellikler yakında.'}</Text>
              <Button
                label="Yakında · ödeme yok"
                variant={i === 1 ? 'lime' : 'ghost'}
                onPress={() => setNote('Ödeme alınmaz. Kart ve IAP yok.')}
              />
            </View>
          ))}
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
    padding: 18,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 8,
  },
  featured: { borderColor: colors.graphite, borderWidth: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  price: { fontFamily: fonts.bold, fontSize: 32, color: colors.ink, letterSpacing: -0.8 },
  period: { fontFamily: fonts.medium, fontSize: 16, color: colors.muted },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
});
