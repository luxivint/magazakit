import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { ErrorState } from '@/components/ui/EmptyState';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { ApiError, fetchReportSummary, type OpsReport } from '@/lib/apiClient';
import { formatCount } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function RaporlarScreen() {
  const { idToken } = useAuth();
  const [report, setReport] = useState<OpsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setReport(await fetchReportSummary());
      setError(null);
    } catch (e) {
      setReport(null);
      setError(e instanceof ApiError ? e.message : 'Rapor yüklenemedi.');
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
          <Text style={styles.title}>Raporlar</Text>
          <Text style={styles.sub}>Sipariş adedi ve stok farkı. Kâr yok.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
          </View>
        ) : error || !report ? (
          <ErrorState title="Rapor yüklenemedi" body={error ?? 'Özet yok.'} onRetry={() => void load()} />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            <View style={styles.card}>
              <Text style={styles.kicker}>Sipariş adedi</Text>
              <Text style={styles.metric}>{formatCount(report.orderCounts.total)}</Text>
              <Text style={styles.meta}>
                Hazırlık {report.orderCounts.picking} · kargo {report.orderCounts.shipped}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.kicker}>Stok farkı</Text>
              <Text style={styles.metric}>
                {report.stockDeltaPhysical > 0 ? '+' : ''}
                {formatCount(report.stockDeltaPhysical)}
              </Text>
              <Text style={styles.meta}>Fiziksel stok hareketleri toplamı. {report.note}</Text>
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
