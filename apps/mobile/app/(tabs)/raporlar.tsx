import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { ErrorState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useCatalog } from '@/context/CatalogContext';
import { ApiError, fetchReports } from '@/lib/apiClient';
import { formatCount } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function RaporlarScreen() {
  const { idToken } = useAuth();
  const catalog = useCatalog();
  const [remote, setRemote] = useState<{ orderCount: number; stockGap: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const local = useMemo(() => {
    const orderCount = catalog.orders.length;
    const stockGap = catalog.products.reduce((sum, p) => {
      if (!p.mapped) return sum;
      return sum + Math.abs(p.marketplaceStock - p.sellable);
    }, 0);
    return { orderCount, stockGap };
  }, [catalog.orders, catalog.products]);

  const load = useCallback(async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await fetchReports();
      setRemote(page);
      setError(null);
    } catch (e) {
      setRemote(null);
      setError(e instanceof ApiError ? e.message : 'Rapor yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const orderCount = remote?.orderCount ?? local.orderCount;
  const stockGap = remote?.stockGap ?? local.stockGap;
  const fromApi = remote != null;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>Raporlar</Text>
          <Text style={styles.sub}>Sipariş adedi ve stok farkı. Kâr ve komisyon yok.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {error && !catalog.reachable ? (
          <ErrorState title="Rapor yüklenemedi" body={error} onRetry={() => void load()} />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            {loading ? <Text style={styles.meta}>Rapor kontrol ediliyor…</Text> : null}
            <View style={styles.card}>
              <Text style={styles.kicker}>Sipariş adedi</Text>
              <Text style={styles.metric}>{formatCount(orderCount)}</Text>
              <Text style={styles.meta}>{fromApi ? 'Sunucu özeti' : 'Katalogdaki siparişler'}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.kicker}>Stok farkı</Text>
              <Text style={styles.metric}>{formatCount(stockGap)}</Text>
              <Text style={styles.meta}>
                Pazaryeri adedi eksi satılabilir (eşli SKU). Tahmini kazanç yok.
              </Text>
            </View>
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
    gap: 6,
  },
  kicker: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  metric: { fontFamily: fonts.bold, fontSize: 40, color: colors.ink, letterSpacing: -1 },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
});
