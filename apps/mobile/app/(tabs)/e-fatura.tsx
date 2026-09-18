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
import { ApiError, createEinvoice, fetchEinvoices, type EinvoiceDraft } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function EFaturaScreen() {
  const { idToken } = useAuth();
  const [items, setItems] = useState<EinvoiceDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await fetchEinvoices();
      setItems(page.items.map((item) => ({ ...item, gibLive: false })));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'E-fatura yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const draft = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const saved = await createEinvoice();
      void saved;
      setBanner('Taslak kaydedildi. GİB’e gönderilmedi.');
      await load();
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Taslak tamamlanmış sayılmaz.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>E-fatura</Text>
          <Text style={styles.sub}>Entegrasyon yok. GİB canlı değil.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
          </View>
        ) : error ? (
          <ErrorState title="E-fatura yüklenemedi" body={error} onRetry={() => void load()} />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            {banner ? <ConfigBanner text={banner} /> : null}
            <ConfigBanner text="Satış e-faturası stub. Abonelik faturası değil. GİB’e yazılmaz." />
            <Button label="Taslak oluştur" variant="ghost" loading={busy} onPress={() => void draft()} />
            {items.length === 0 ? (
              <Text style={styles.meta}>Fatura yok. Boş liste GİB onayı değildir.</Text>
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.name}>Taslak</Text>
                  <Text style={styles.meta}>GİB’e gönderilmedi · {item.orderId ?? 'sipariş yok'}</Text>
                </View>
              ))
            )}
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
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 4,
  },
});
