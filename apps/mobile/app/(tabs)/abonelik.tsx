import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { ErrorState } from '@/components/ui/EmptyState';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { ApiError, fetchBillingOffering, type BillingOfferingResponse } from '@/lib/apiClient';
import { formatMoney } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function AbonelikScreen() {
  const { idToken } = useAuth();
  const [offering, setOffering] = useState<BillingOfferingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setOffering(await fetchBillingOffering());
      setError(null);
    } catch (e) {
      setOffering(null);
      setError(e instanceof ApiError ? e.message : 'Paketler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>Abonelik</Text>
          <Text style={styles.sub}>499 / 999 / 1999. Tahsilat yok.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
          </View>
        ) : error || !offering ? (
          <ErrorState title="Paketler yüklenemedi" body={error ?? 'Sunucu yanıtı yok.'} onRetry={() => void load()} />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            {note ? <ConfigBanner text={note} /> : null}
            <Text style={styles.meta}>{offering.note}</Text>
            {offering.items.map((plan, i) => (
              <View key={plan.id} style={[styles.card, i === 1 && styles.featured]}>
                <Text style={styles.name}>{plan.name}</Text>
                <Text style={styles.price}>
                  {formatMoney(plan.priceTry, 0)}
                  <Text style={styles.period}>/ay</Text>
                </Text>
                <Text style={styles.meta}>{plan.chargeable || offering.chargeable ? 'Ücret alınır' : 'Ödeme yok'}</Text>
                <Button
                  label="Yakında · ödeme yok"
                  variant={i === 1 ? 'lime' : 'ghost'}
                  onPress={() => setNote('Ödeme alınmaz. Kart ve IAP yok.')}
                />
              </View>
            ))}
          </ScrollView>
        )}
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
